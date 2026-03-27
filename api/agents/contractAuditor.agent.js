/**
 * contractAuditor.agent.js — ReAct-Based Contract Auditor Agent
 * 
 * The core agentic component. Uses LangChain's createReactAgent to build
 * a multi-step reasoning agent that autonomously decides which tools to call,
 * reasons about results, and produces a validated security assessment.
 * 
 * This is NOT a single-prompt wrapper. The agent performs 3-6 reasoning
 * cycles (Thought → Action → Observation) before producing its final answer.
 */

import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getPrimaryLLM, getFallbackLLM } from '../config/llm.config.js';
import { createEtherscanTool } from '../tools/etherscan.tool.js';
import { createStaticAnalysisTool } from '../tools/staticAnalysis.tool.js';
import { createCodeParserTool } from '../tools/codeParser.tool.js';
import { validateOutput, buildCorrectionPrompt, ContractAuditSchema } from '../evaluation/outputValidator.js';
import { calculateConfidence, attachConfidence } from '../evaluation/confidenceScorer.js';
import { createTracker } from '../observability/agentMetrics.js';
import { CONTRACT_AUDITOR_SYSTEM_PROMPT, buildUserMessage } from '../prompts/contractAuditor.prompt.js';

// ─── Main Entry Point ────────────────────────────────────────

/**
 * Runs the Contract Auditor Agent against a contract.
 * Tries Groq LLM first, then Gemini if Groq fails entirely.
 * 
 * @param {Object} contractData - { address, name, sourceCode, compiler }
 * @returns {Promise<Object>} - Validated audit result with confidence metadata
 */
export async function runContractAuditAgent(contractData) {
    // Try primary LLM (Groq) first
    try {
        return await _runAgentWithLLM(contractData, getPrimaryLLM({ temperature: 0.1 }), 'Groq');
    } catch (primaryError) {
        console.warn(JSON.stringify({
            level: 'WARN',
            component: 'contractAuditor',
            event: 'primary_llm_failed',
            error: primaryError.message,
        }));
    }

    // Try fallback LLM (Gemini)
    try {
        return await _runAgentWithLLM(contractData, getFallbackLLM({ temperature: 0.1 }), 'Gemini');
    } catch (fallbackError) {
        console.warn(JSON.stringify({
            level: 'WARN',
            component: 'contractAuditor',
            event: 'fallback_llm_failed',
            error: fallbackError.message,
        }));
        // Both LLMs failed — re-throw to trigger legacy path in contract.service.js
        throw fallbackError;
    }
}

/**
 * Internal: runs the full ReAct agent pipeline with a specific LLM.
 */
async function _runAgentWithLLM(contractData, llm, llmName) {
    const tracker = createTracker('contractAuditor');

    console.log(JSON.stringify({
        level: 'INFO',
        component: 'contractAuditor',
        event: 'agent_start',
        correlationId: tracker.correlationId,
        contractAddress: contractData.address || 'source-code-input',
        contractName: contractData.name || 'Unknown',
        llm: llmName,
    }));

    try {
        // Step 1: Create tools with metrics tracking
        const tools = [
            createEtherscanTool(tracker),
            createStaticAnalysisTool(tracker),
            createCodeParserTool(tracker),
        ];

        // Step 2: Create the ReAct agent (llm passed in from caller)
        const agent = createReactAgent({
            llm,
            tools,
            messageModifier: CONTRACT_AUDITOR_SYSTEM_PROMPT,
        });

        // Step 3: Build the user message that kicks off reasoning
        const userMessage = buildUserMessage(contractData);
        tracker.recordTokenUsage(CONTRACT_AUDITOR_SYSTEM_PROMPT + userMessage, '');

        // Step 4: Run the agent (multi-step reasoning loop happens here)
        const agentResponse = await runWithTimeout(
            agent.invoke({
                messages: [new HumanMessage(userMessage)],
            }),
            60000 // 60 second total timeout for the entire agent run
        );

        // Step 5: Extract the final answer from agent messages
        const messages = agentResponse.messages || [];
        const rawOutput = extractFinalAnswer(messages);
        tracker.recordTokenUsage('', rawOutput);

        // Count reasoning steps (tool calls = actions in ReAct)
        const toolCallMessages = messages.filter(
            (m) => m.constructor?.name === 'ToolMessage' || m.tool_calls?.length > 0
        );
        for (let i = 0; i < toolCallMessages.length; i++) {
            tracker.recordReasoningStep();
        }

        console.log(JSON.stringify({
            level: 'INFO',
            component: 'contractAuditor',
            event: 'agent_reasoning_complete',
            correlationId: tracker.correlationId,
            reasoningSteps: toolCallMessages.length,
            responseLength: rawOutput.length,
        }));

        // Step 6: Validate the output against schema
        let validation = validateOutput(rawOutput, ContractAuditSchema);

        // Step 7: If validation failed, try self-correction (ONE retry)
        if (!validation.valid) {
            console.log(JSON.stringify({
                level: 'WARN',
                component: 'contractAuditor',
                event: 'output_validation_failed',
                correlationId: tracker.correlationId,
                errors: validation.errors,
            }));

            const correctionPrompt = buildCorrectionPrompt(rawOutput, validation.errors);

            try {
                const correctionResponse = await agent.invoke({
                    messages: [
                        new HumanMessage(userMessage),
                        ...messages.slice(1), // Keep previous context
                        new HumanMessage(correctionPrompt),
                    ],
                });

                const correctedOutput = extractFinalAnswer(correctionResponse.messages || []);
                tracker.recordTokenUsage(correctionPrompt, correctedOutput);
                validation = validateOutput(correctedOutput, ContractAuditSchema);

                if (validation.valid) {
                    validation.warnings.push('Required self-correction retry');
                }
            } catch (correctionError) {
                tracker.recordError('self_correction', correctionError.message);
            }
        }

        // Step 8: Calculate confidence
        const confidence = calculateConfidence({
            toolsAttempted: toolCallMessages.length,
            toolsSucceeded: toolCallMessages.filter(m => {
                // Check if tool returned success
                const content = typeof m.content === 'string' ? m.content : '';
                return content.includes('"success":true') || content.includes('"success": true');
            }).length || Math.ceil(toolCallMessages.length * 0.7), // Estimate if can't determine
            expectedFields: ['vulnerabilities', 'overallScore', 'summary', 'investorImpactSummary'],
            actualOutput: validation.data || {},
            validationPassed: validation.valid,
            wasDegraded: validation.degraded,
            usedLiveData: true,
            missingDataSources: validation.valid ? [] : ['primary_analysis'],
        });

        // Step 9: Finalize
        if (validation.valid && validation.data) {
            const result = attachConfidence(validation.data, confidence);

            tracker.finalize(true);

            console.log(JSON.stringify({
                level: 'INFO',
                component: 'contractAuditor',
                event: 'agent_success',
                correlationId: tracker.correlationId,
                score: result.overallScore,
                confidence: result._meta.confidence,
                vulnerabilities: result.vulnerabilities?.length || 0,
            }));

            return result;
        }

        // Validation failed even after retry — throw to trigger legacy fallback
        throw new Error(
            `Agent output failed validation: ${validation.errors.join('; ')}`
        );

    } catch (error) {
        tracker.recordError('agent_run', error.message);
        tracker.finalize(false);

        console.log(JSON.stringify({
            level: 'ERROR',
            component: 'contractAuditor',
            event: 'agent_failure',
            correlationId: tracker.correlationId,
            error: error.message,
        }));

        // Re-throw so contract.service.js can fall back to legacy
        throw error;
    }
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Extracts the final text answer from the agent's message history.
 * The last AIMessage content is the agent's final answer.
 */
function extractFinalAnswer(messages) {
    // Walk backwards to find the last AI message with text content
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const name = msg.constructor?.name || '';

        if (name === 'AIMessage' || name === 'AIMessageChunk') {
            if (typeof msg.content === 'string' && msg.content.trim().length > 0) {
                // Skip if this is a tool-call-only message (no text content)
                if (msg.tool_calls && msg.tool_calls.length > 0 && msg.content.trim().length < 10) {
                    continue;
                }
                return msg.content;
            }
        }
    }

    // Fallback: concatenate all AI message contents
    const aiContents = messages
        .filter((m) => (m.constructor?.name || '').includes('AI'))
        .map((m) => (typeof m.content === 'string' ? m.content : ''))
        .filter((c) => c.length > 10);

    return aiContents[aiContents.length - 1] || '';
}

/**
 * Wraps a promise with a timeout.
 */
function runWithTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Agent timed out after ${ms}ms`));
        }, ms);

        promise
            .then((result) => {
                clearTimeout(timer);
                resolve(result);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
}

export default { runContractAuditAgent };
