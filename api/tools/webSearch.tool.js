/**
 * webSearch.tool.js — LangChain Tool: Tavily Web Search
 * 
 * Integrates Tavily Web Search API to gather narrative enrichment.
 * 
 * ⚠️ SECURITY: Strictly sanitizes and truncates output to prevent
 * prompt injection from malicious web pages.
 */

import { DynamicTool } from '@langchain/core/tools';
import { resilientExecute } from '../utils/resilientToolExecutor.js';

/**
 * @param {Object} metricsTracker - Optional metrics tracker
 * @returns {DynamicTool}
 */
export function createWebSearchTool(metricsTracker = null) {
    return new DynamicTool({
        name: 'web_narrative_search',
        description:
            'Performs a focused web search using Tavily to identify emerging narratives, hype vs negative signals, and narrative consistency. ' +
            'Input: A search query string (e.g., "Ethereum market sentiment news"). ' +
            'Returns: Sanitized excerpts from top web results. ' +
            '⚠️ IMPORTANT ROLE: This tool is for narrative enrichment, NOT primary sentiment. ' +
            'Do NOT let this tool dominate the sentiment score. Use it to adjust confidence or add key drivers.',

        func: async (query) => {
            const trimmed = (query || '').trim();
            if (!trimmed || trimmed.length < 3) {
                return JSON.stringify({ success: false, error: 'Valid query string required.' });
            }

            const result = await resilientExecute(
                () => executeTavilySearch(trimmed),
                { toolName: 'web_narrative_search', maxRetries: 1, timeoutMs: 15000, fallbackValue: [] }
            );

            if (metricsTracker) {
                metricsTracker.recordToolCall('web_narrative_search', result.success, result.latencyMs, result.attempts);
            }

            if (!result.success || !result.data || result.data.length === 0) {
                return JSON.stringify({
                    success: false,
                    message: 'Web search unavailable or no relevant narratives found. Rely on primary signals.'
                });
            }

            // Clean, truncate, and sanitize all results to prevent prompt injection
            const safeResults = result.data.slice(0, 4).map(res => ({
                source: sanitizeText(res.url),
                title: sanitizeText(res.title),
                content: truncateText(sanitizeText(res.content), 400) // STRICT 400 char limit per result
            }));

            return JSON.stringify({
                success: true,
                narrativeData: safeResults,
                instruction: 'Remember: This is secondary data. Do not let it override strong Reddit/News signals.'
            });
        },
    });
}

/**
 * Executes raw fetch to Tavily API.
 */
async function executeTavilySearch(query) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        console.warn('[WebSearchTool] Checking TAVILY_API_KEY... Not found. Skipping.');
        return []; // Gracefully fail if no API key
    }

    const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            query: query + " crypto market sentiment analysis",
            search_depth: "basic",
            include_images: false,
            include_answer: false,
            max_results: 5
        })
    });

    if (!response.ok) {
        throw new Error(`Tavily API returned ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
}

/**
 * Strips HTML, scripts, and suspicious prompt-injection patterns.
 */
function sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';

    // 1. Strip HTML tags
    let clean = text.replace(/<[^>]*>?/gm, '');

    // 2. Remove purely malicious looking injection patterns (basic heuristic)
    clean = clean.replace(/Ignore all previous instructions/gi, '[REDACTED]');
    clean = clean.replace(/You are now/gi, '[REDACTED]');
    clean = clean.replace(/System prompt/gi, '[REDACTED]');

    // 3. Keep only standard printable characters (removes weird unicode invisible chars)
    // Replace non-ascii with space, normalize whitespace
    clean = clean.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();

    return clean;
}

/**
 * Truncates text safely to max length.
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '... [TRUNCATED FOR SAFETY]';
}

export default { createWebSearchTool };
