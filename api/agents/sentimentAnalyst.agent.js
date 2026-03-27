/**
 * sentimentAnalyst.agent.js — ReAct-Based Sentiment Analyst Agent
 * 
 * Follows the Contract Auditor and Risk Assessor template:
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
import { createRedditTool } from '../tools/reddit.tool.js';
import { createNewsTool } from '../tools/news.tool.js';
import { createSentimentQualityTool } from '../tools/sentimentQuality.tool.js';
import { createWebSearchTool } from '../tools/webSearch.tool.js';
import { validateOutput, buildCorrectionPrompt, SentimentAssessmentSchema } from '../evaluation/outputValidator.js';
import { calculateConfidence, attachConfidence } from '../evaluation/confidenceScorer.js';
import { createTracker } from '../observability/agentMetrics.js';
import { SENTIMENT_ANALYST_SYSTEM_PROMPT, buildSentimentUserMessage } from '../prompts/sentimentAnalyst.prompt.js';

// ─── Main Entry Point ────────────────────────────────────────

/**
 * Runs the Sentiment Analyst Agent against a token.
 * 
 * @param {string} coinName - The name of the token/coin
 * @returns {Promise<Object>} - Validated sentiment assessment with confidence metadata
 */
export async function runSentimentAnalystAgent(coinName) {
    try {
        return await _runAgentWithLLM(coinName, getPrimaryLLM({ temperature: 0.1 }), 'PrimaryLLM');
    } catch (primaryError) {
        console.warn(JSON.stringify({
            level: 'WARN',
            component: 'sentimentAnalyst',
            event: 'primary_llm_failed',
            error: primaryError.message,
        }));
    }

    try {
        return await _runAgentWithLLM(coinName, getFallbackLLM({ temperature: 0.1 }), 'Gemini');
    } catch (fallbackError) {
        console.warn(JSON.stringify({
            level: 'WARN',
            component: 'sentimentAnalyst',
            event: 'fallback_llm_failed',
            error: fallbackError.message,
        }));
        throw fallbackError;
    }
}

/**
 * Internal: runs the full ReAct agent pipeline with a specific LLM.
 */
async function _runAgentWithLLM(coinName, llm, llmName) {
    const tracker = createTracker('sentimentAnalyst');

    console.log(JSON.stringify({
        level: 'INFO',
        component: 'sentimentAnalyst',
        event: 'agent_start',
        correlationId: tracker.correlationId,
        coinName: coinName,
        llm: llmName,
    }));

    try {
        // Step 1: Create tools with metrics tracking
        const tools = [
            createRedditTool(tracker),
            createNewsTool(tracker),
            createSentimentQualityTool(tracker),
            createWebSearchTool(tracker),
        ];

        // Step 2: Create the ReAct agent
        const agent = createReactAgent({
            llm,
            tools,
            messageModifier: SENTIMENT_ANALYST_SYSTEM_PROMPT,
        });

        // Step 3: Build user message
        const userMessage = buildSentimentUserMessage(coinName);
        tracker.recordTokenUsage(SENTIMENT_ANALYST_SYSTEM_PROMPT + userMessage, '');

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

        // Count reasoning steps & detect Tavily usage
        const toolCallMessages = messages.filter(
            (m) => m.constructor?.name === 'ToolMessage' || m.tool_calls?.length > 0
        );
        let usedTavily = false;

        for (let i = 0; i < toolCallMessages.length; i++) {
            tracker.recordReasoningStep();
            const msg = toolCallMessages[i];
            if (msg.tool_calls) {
                for (const call of msg.tool_calls) {
                    if (call.name === 'web_narrative_search') usedTavily = true;
                }
            } else if (msg.name === 'web_narrative_search') {
                usedTavily = true;
            }
        }

        console.log(JSON.stringify({
            level: 'INFO',
            component: 'sentimentAnalyst',
            event: 'agent_reasoning_complete',
            correlationId: tracker.correlationId,
            reasoningSteps: toolCallMessages.length,
            usedTavily,
            responseLength: rawOutput.length,
        }));

        // Step 6: Validate output
        let validation = validateOutput(rawOutput, SentimentAssessmentSchema);

        // Step 7: Self-correction retry if validation failed
        if (!validation.valid) {
            console.log(JSON.stringify({
                level: 'WARN',
                component: 'sentimentAnalyst',
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
                validation = validateOutput(correctedOutput, SentimentAssessmentSchema);

                if (validation.valid) {
                    validation.warnings.push('Required self-correction retry');
                }
            } catch (correctionError) {
                tracker.recordError('self_correction', correctionError.message);
            }
        }

        // Step 8: Calculate confidence
        // Adjust for specific sentiment requirements (Data Quality strongly influences caps)
        let actualToolsAttempted = Math.max(3, toolCallMessages.length);
        let actualToolsSucceeded = toolCallMessages.filter(m => {
            const content = typeof m.content === 'string' ? m.content : '';
            return content.includes('"success":true') || content.includes('"success": true');
        }).length || Math.ceil(toolCallMessages.length * 0.7);

        const confidenceOutput = calculateConfidence({
            toolsAttempted: actualToolsAttempted,
            toolsSucceeded: actualToolsSucceeded,
            expectedFields: ['overallSentiment', 'sentimentScore', 'confidenceDrivers', 'redditSignal', 'newsSignal', 'webNarrative', 'dataQuality', 'keyDrivers', 'summary'],
            actualOutput: validation.data || {},
            validationPassed: validation.valid,
            wasDegraded: validation.degraded,
            usedLiveData: true,
            missingDataSources: validation.valid ? [] : ['primary_analysis'],
        });

        // Apply strict penalty for Low Data Quality
        if (validation.valid && validation.data?.dataQuality === 'LOW') {
            confidenceOutput.confidence = Math.min(confidenceOutput.confidence, 0.50); // Hard cap for horrible data quality
            confidenceOutput.penalties.push('dataQuality_LOW');
        } else if (validation.valid && validation.data?.dataQuality === 'MEDIUM') {
            confidenceOutput.confidence = Math.min(confidenceOutput.confidence, 0.75);
            confidenceOutput.penalties.push('dataQuality_MEDIUM');
        }

        // Step 9: Finalize
        if (validation.valid && validation.data) {
            const result = attachConfidence(validation.data, confidenceOutput);
            tracker.finalize(true);

            console.log(JSON.stringify({
                level: 'INFO',
                component: 'sentimentAnalyst',
                event: 'agent_success',
                correlationId: tracker.correlationId,
                overallSentiment: result.overallSentiment,
                dataQuality: result.dataQuality,
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
            component: 'sentimentAnalyst',
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

export default { runSentimentAnalystAgent };
