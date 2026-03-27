/**
 * agentMetrics.js — Lightweight Observability for Agent Pipelines
 * 
 * Tracks per-request: correlation ID, latency, tool calls, retries,
 * failures, and estimated token usage.
 * All output is structured JSON via console (easy to pipe to log aggregators).
 */

import { randomUUID } from 'crypto';
import { estimateTokens } from '../config/llm.config.js';

// ─── Request Tracker ─────────────────────────────────────────

/**
 * Creates a metrics tracker for a single request/analysis.
 * Use one tracker per incoming API request.
 * 
 * @param {string} agentName - Name of the agent (e.g., 'contractAuditor')
 * @returns {MetricsTracker}
 */
export function createTracker(agentName) {
    const tracker = {
        correlationId: randomUUID(),
        agentName,
        startTime: Date.now(),
        toolCalls: [],
        retryCount: 0,
        failureCount: 0,
        estimatedInputTokens: 0,
        estimatedOutputTokens: 0,
        reasoningSteps: 0,
        errors: [],
    };

    return {
        /** Get the correlation ID for this request */
        get correlationId() {
            return tracker.correlationId;
        },

        /**
         * Record a tool call (success or failure).
         * @param {string} toolName
         * @param {boolean} success
         * @param {number} latencyMs
         * @param {number} attempts - Number of retry attempts used
         */
        recordToolCall(toolName, success, latencyMs, attempts = 1) {
            tracker.toolCalls.push({
                tool: toolName,
                success,
                latencyMs,
                attempts,
                timestamp: Date.now(),
            });

            if (attempts > 1) {
                tracker.retryCount += (attempts - 1);
            }

            if (!success) {
                tracker.failureCount++;
            }
        },

        /**
         * Record a reasoning step (Thought → Action → Observation).
         */
        recordReasoningStep() {
            tracker.reasoningSteps++;
        },

        /**
         * Record token usage for an LLM call.
         * @param {string} inputText - The prompt/input sent to LLM
         * @param {string} outputText - The response received from LLM
         */
        recordTokenUsage(inputText, outputText) {
            tracker.estimatedInputTokens += estimateTokens(inputText);
            tracker.estimatedOutputTokens += estimateTokens(outputText);
        },

        /**
         * Record an error that occurred during processing.
         * @param {string} context - Where the error occurred
         * @param {string} message - Error message
         */
        recordError(context, message) {
            tracker.errors.push({ context, message, timestamp: Date.now() });
        },

        /**
         * Finalize and emit the complete metrics report.
         * Call this at the end of request processing.
         * @param {boolean} success - Whether the overall request succeeded
         * @returns {Object} The complete metrics object
         */
        finalize(success = true) {
            const endTime = Date.now();
            const totalLatencyMs = endTime - tracker.startTime;

            const metrics = {
                level: 'INFO',
                component: 'agentMetrics',
                event: 'request_complete',
                correlationId: tracker.correlationId,
                agent: tracker.agentName,
                agentName: tracker.agentName,
                success,
                totalLatencyMs,
                reasoningSteps: tracker.reasoningSteps,
                toolCalls: {
                    total: tracker.toolCalls.length,
                    succeeded: tracker.toolCalls.filter((t) => t.success).length,
                    failed: tracker.toolCalls.filter((t) => !t.success).length,
                    details: tracker.toolCalls,
                },
                retryCount: tracker.retryCount,
                failureCount: tracker.failureCount,
                tokenEstimate: {
                    input: tracker.estimatedInputTokens,
                    output: tracker.estimatedOutputTokens,
                    total: tracker.estimatedInputTokens + tracker.estimatedOutputTokens,
                },
                errors: tracker.errors,
                timestamp: new Date().toISOString(),
            };

            // Emit structured log
            console.log(JSON.stringify(metrics));

            return metrics;
        },
    };
}

export default { createTracker };
