/**
 * riskAssessor.agent.js — ReAct-Based Risk Assessor Agent
 * 
 * Follows the exact Contract Auditor template:
 * - createReactAgent with dynamic tool selection
 * - LLM failover (Groq → Gemini)
 * - Output validation (Zod schema + self-correction)
 * - Confidence scoring with calibration caps
 * - Observability metrics with correlation IDs
 * - Graceful degradation to legacy path
 */

import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage } from '@langchain/core/messages';
import { getPrimaryLLM, getFallbackLLM } from '../config/llm.config.js';
import { createDexScreenerTool } from '../tools/dexscreener.tool.js';
import { createTokenHoldersTool } from '../tools/tokenHolders.tool.js';
import { createContractRiskLookupTool } from '../tools/contractRiskLookup.tool.js';
import { validateOutput, buildCorrectionPrompt, RiskAssessmentSchema } from '../evaluation/outputValidator.js';
import { calculateConfidence, attachConfidence } from '../evaluation/confidenceScorer.js';
import { createTracker } from '../observability/agentMetrics.js';
import { RISK_ASSESSOR_SYSTEM_PROMPT, buildRiskUserMessage } from '../prompts/riskAssessor.prompt.js';

// ─── Main Entry Point ────────────────────────────────────────

/**
 * Runs the Risk Assessor Agent against a token.
 * Tries Groq LLM first, then Gemini if Groq fails entirely.
 * 
 * @param {Object} tokenData - { token_name, token_address, smart_contract_address, chainId }
 * @returns {Promise<Object>} - Validated risk assessment with confidence metadata
 */
export async function runRiskAssessorAgent(tokenData) {
    // Try primary LLM (Groq) first
    try {
        return await _runAgentWithLLM(tokenData, getPrimaryLLM({ temperature: 0.1 }), 'PrimaryLLM');
    } catch (primaryError) {
        console.warn(JSON.stringify({
            level: 'WARN',
            component: 'riskAssessor',
            event: 'primary_llm_failed',
            error: primaryError.message,
        }));
    }

    // Try fallback LLM (Gemini)
    try {
        return await _runAgentWithLLM(tokenData, getFallbackLLM({ temperature: 0.1 }), 'Gemini');
    } catch (fallbackError) {
        console.warn(JSON.stringify({
            level: 'WARN',
            component: 'riskAssessor',
            event: 'fallback_llm_failed',
            error: fallbackError.message,
        }));
        throw fallbackError;
    }
}

/**
 * Internal: runs the full ReAct agent pipeline with a specific LLM.
 */
async function _runAgentWithLLM(tokenData, llm, llmName) {
    const tracker = createTracker('riskAssessor');

    console.log(JSON.stringify({
        level: 'INFO',
        component: 'riskAssessor',
        event: 'agent_start',
        correlationId: tracker.correlationId,
        tokenName: tokenData.token_name || 'Unknown',
        tokenAddress: tokenData.token_address || 'N/A',
        llm: llmName,
    }));

    try {
        // Step 1: Create tools with metrics tracking
        const tools = [
            createDexScreenerTool(tracker),
            createTokenHoldersTool(tracker),
            createContractRiskLookupTool(tracker),
        ];

        // Step 2: Create the ReAct agent
        const agent = createReactAgent({
            llm,
            tools,
            messageModifier: RISK_ASSESSOR_SYSTEM_PROMPT,
        });

        // Step 3: Build user message
        const userMessage = buildRiskUserMessage(tokenData);
        tracker.recordTokenUsage(RISK_ASSESSOR_SYSTEM_PROMPT + userMessage, '');

        // Step 4: Run agent (multi-step reasoning)
        const agentResponse = await runWithTimeout(
            agent.invoke({
                messages: [new HumanMessage(userMessage)],
            }),
            60000
        );

        // Step 5: Extract final answer
        const messages = agentResponse.messages || [];
        const rawOutput = extractFinalAnswer(messages);
        tracker.recordTokenUsage('', rawOutput);

        // Count reasoning steps
        const toolCallMessages = messages.filter(
            (m) => m.constructor?.name === 'ToolMessage' || m.tool_calls?.length > 0
        );
        for (let i = 0; i < toolCallMessages.length; i++) {
            tracker.recordReasoningStep();
        }

        console.log(JSON.stringify({
            level: 'INFO',
            component: 'riskAssessor',
            event: 'agent_reasoning_complete',
            correlationId: tracker.correlationId,
            reasoningSteps: toolCallMessages.length,
            responseLength: rawOutput.length,
        }));

        // Step 6: Validate output
        let validation = validateOutput(rawOutput, RiskAssessmentSchema);

        // Step 7: Self-correction retry if validation failed
        if (!validation.valid) {
            console.log(JSON.stringify({
                level: 'WARN',
                component: 'riskAssessor',
                event: 'output_validation_failed',
                correlationId: tracker.correlationId,
                errors: validation.errors,
            }));

            const correctionPrompt = buildCorrectionPrompt(rawOutput, validation.errors);

            try {
                const correctionResponse = await agent.invoke({
                    messages: [
                        new HumanMessage(userMessage),
                        ...messages.slice(1),
                        new HumanMessage(correctionPrompt),
                    ],
                });

                const correctedOutput = extractFinalAnswer(correctionResponse.messages || []);
                tracker.recordTokenUsage(correctionPrompt, correctedOutput);
                validation = validateOutput(correctedOutput, RiskAssessmentSchema);

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
                const content = typeof m.content === 'string' ? m.content : '';
                return content.includes('"success":true') || content.includes('"success": true');
            }).length || Math.ceil(toolCallMessages.length * 0.7),
            expectedFields: ['riskScore', 'riskLevel', 'liquidityRisk', 'holderRisk', 'contractRiskInfluence', 'keyWarnings', 'summary'],
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
                component: 'riskAssessor',
                event: 'agent_success',
                correlationId: tracker.correlationId,
                riskScore: result.riskScore,
                riskLevel: result.riskLevel,
                confidence: result._meta.confidence,
            }));

            return result;
        }

        throw new Error(
            `Agent output failed validation: ${validation.errors.join('; ')}`
        );

    } catch (error) {
        tracker.recordError('agent_run', error.message);
        tracker.finalize(false);

        console.log(JSON.stringify({
            level: 'ERROR',
            component: 'riskAssessor',
            event: 'agent_failure',
            correlationId: tracker.correlationId,
            error: error.message,
        }));

        throw error;
    }
}

// ─── Helpers (same as Contract Auditor) ──────────────────────

function extractFinalAnswer(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const name = msg.constructor?.name || '';

        if (name === 'AIMessage' || name === 'AIMessageChunk') {
            if (typeof msg.content === 'string' && msg.content.trim().length > 0) {
                if (msg.tool_calls && msg.tool_calls.length > 0 && msg.content.trim().length < 10) {
                    continue;
                }
                return msg.content;
            }
        }
    }

    const aiContents = messages
        .filter((m) => (m.constructor?.name || '').includes('AI'))
        .map((m) => (typeof m.content === 'string' ? m.content : ''))
        .filter((c) => c.length > 10);

    return aiContents[aiContents.length - 1] || '';
}

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

export default { runRiskAssessorAgent };
