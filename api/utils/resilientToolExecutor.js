/**
 * resilientToolExecutor.js — Reliability Wrapper for All Tool Calls
 * 
 * Every LangChain tool call goes through this executor.
 * Provides: retries, timeouts, fallback data, structured error tagging.
 * Agents NEVER crash due to a single tool failure.
 */

// ─── Retry with Exponential Backoff ──────────────────────────

/**
 * Executes an async function with exponential backoff retry.
 * 
 * @param {Function} fn - Async function to execute
 * @param {Object} options
 * @param {number} options.maxRetries - Max retry attempts (default: 3)
 * @param {number} options.timeoutMs - Per-call timeout in ms (default: 15000)
 * @param {string} options.toolName - Name of the tool (for error tagging)
 * @param {*} options.fallbackValue - Value to return if all retries fail (default: null)
 * @returns {Promise<{success: boolean, data: *, error: object|null, attempts: number, latencyMs: number}>}
 */
export async function resilientExecute(fn, options = {}) {
    const {
        maxRetries = 3,
        timeoutMs = 15000,
        toolName = 'unknown_tool',
        fallbackValue = null,
    } = options;

    let lastError = null;
    let actualAttempts = 0;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        actualAttempts = attempt;
        try {
            const result = await withTimeout(fn(), timeoutMs);
            return {
                success: true,
                data: result,
                error: null,
                attempts: attempt,
                latencyMs: Date.now() - startTime,
            };
        } catch (error) {
            lastError = error;

            const errorTag = tagError(error, toolName, attempt);
            console.warn(
                JSON.stringify({
                    level: 'WARN',
                    component: 'resilientToolExecutor',
                    event: 'tool_retry',
                    tool: toolName,
                    attempt,
                    maxRetries,
                    errorType: errorTag.type,
                    message: error.message,
                })
            );

            // Don't retry on non-retryable errors
            if (errorTag.retryable === false) {
                break;
            }

            // Exponential backoff: 500ms, 1000ms, 2000ms
            if (attempt < maxRetries) {
                const delay = Math.min(500 * Math.pow(2, attempt - 1), 5000);
                await sleep(delay);
            }
        }
    }

    // All retries exhausted — return fallback
    console.error(
        JSON.stringify({
            level: 'ERROR',
            component: 'resilientToolExecutor',
            event: 'tool_exhausted',
            tool: toolName,
            totalAttempts: maxRetries,
            errorType: lastError?.name || 'UnknownError',
            message: lastError?.message || 'All retries failed',
            latencyMs: Date.now() - startTime,
        })
    );

    return {
        success: false,
        data: fallbackValue,
        error: {
            type: lastError?.name || 'UnknownError',
            message: lastError?.message || 'All retries exhausted',
            tool: toolName,
            attempts: actualAttempts,
        },
        attempts: actualAttempts,
        latencyMs: Date.now() - startTime,
    };
}

// ─── Timeout Wrapper ─────────────────────────────────────────

/**
 * Wraps a promise with a timeout. Rejects if promise doesn't resolve in time.
 */
function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new TimeoutError(`Operation timed out after ${ms}ms`));
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

// ─── Custom Timeout Error ────────────────────────────────────

class TimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TimeoutError';
    }
}

// ─── Error Classification ────────────────────────────────────

/**
 * Tags errors with type and retryability for structured logging.
 */
function tagError(error, toolName, attempt) {
    const message = (error.message || '').toLowerCase();

    // Rate limit — retryable
    if (message.includes('rate limit') || message.includes('429') || message.includes('too many')) {
        return { type: 'RATE_LIMIT', tool: toolName, attempt, retryable: true };
    }

    // Timeout — retryable
    if (error instanceof TimeoutError || message.includes('timeout') || message.includes('timed out')) {
        return { type: 'TIMEOUT', tool: toolName, attempt, retryable: true };
    }

    // Network error — retryable
    if (message.includes('fetch') || message.includes('econnrefused') || message.includes('network')) {
        return { type: 'NETWORK_ERROR', tool: toolName, attempt, retryable: true };
    }

    // Server error (5xx) — retryable
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
        return { type: 'SERVER_ERROR', tool: toolName, attempt, retryable: true };
    }

    // Auth/validation — NOT retryable
    if (message.includes('401') || message.includes('403') || message.includes('invalid') || message.includes('missing')) {
        return { type: 'AUTH_ERROR', tool: toolName, attempt, retryable: false };
    }

    // Unknown — retryable once more
    return { type: 'UNKNOWN_ERROR', tool: toolName, attempt, retryable: attempt < 2 };
}

// ─── Helpers ─────────────────────────────────────────────────

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export default { resilientExecute };
