/**
 * news.tool.js — LangChain Tool: Institutional Sentiment Signal
 * 
 * Wraps NewsService.fetchNews() as a LangChain DynamicTool.
 * Fetches recent articles and returns source diversity and headline summaries.
 */

import { DynamicTool } from '@langchain/core/tools';
import NewsService from '../services/data_access/news.service.js';
import { resilientExecute } from '../utils/resilientToolExecutor.js';

/**
 * @param {Object} metricsTracker - Optional metrics tracker
 * @returns {DynamicTool}
 */
export function createNewsTool(metricsTracker = null) {
    return new DynamicTool({
        name: 'news_sentiment_fetch',
        description:
            'Fetches recent news articles and headlines for a cryptocurrency to gauge institutional and broader market sentiment. ' +
            'Input: The name or ticker of the coin (e.g., "Ethereum", "SOL"). ' +
            'Returns: Article count, source diversity, and headline summaries. ' +
            'Use this tool after Reddit to contrast retail hype with institutional news.',

        func: async (coinName) => {
            const trimmed = (coinName || '').trim();
            if (!trimmed) {
                return JSON.stringify({ success: false, error: 'Coin name is required.' });
            }

            const result = await resilientExecute(
                () => NewsService.fetchNews(trimmed),
                { toolName: 'news_sentiment_fetch', maxRetries: 2, timeoutMs: 15000, fallbackValue: [] }
            );

            if (metricsTracker) {
                metricsTracker.recordToolCall('news_sentiment_fetch', result.success, result.latencyMs, result.attempts);
            }

            if (!result.success || !result.data || result.data.length === 0) {
                return JSON.stringify({
                    success: false,
                    message: 'No recent news available or fetch failed.',
                    institutionalSignal: 'UNKNOWN'
                });
            }

            const articles = result.data;
            const uniqueSources = new Set(articles.map(a => a.source));

            return JSON.stringify({
                success: true,
                articleCount: articles.length,
                sourceDiversity: uniqueSources.size,
                institutionalSignal: articles.length >= 3 ? 'ACTIVE_COVERAGE' : 'LOW_COVERAGE',
                headlines: articles.slice(0, 5).map(a => ({
                    source: a.source,
                    title: a.title,
                    date: a.date
                }))
            });
        },
    });
}

export default { createNewsTool };
