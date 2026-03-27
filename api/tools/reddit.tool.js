/**
 * reddit.tool.js — LangChain Tool: Retail Sentiment Signal
 * 
 * Wraps RedditService.fetchPosts() as a LangChain DynamicTool.
 * Fetches recent posts and returns volume, sentiment indicators, and top discussions.
 */

import { DynamicTool } from '@langchain/core/tools';
import RedditService from '../services/data_access/reddit.service.js';
import { resilientExecute } from '../utils/resilientToolExecutor.js';

/**
 * @param {Object} metricsTracker - Optional metrics tracker
 * @returns {DynamicTool}
 */
export function createRedditTool(metricsTracker = null) {
    return new DynamicTool({
        name: 'reddit_sentiment_fetch',
        description:
            'Fetches recent Reddit posts for a cryptocurrency to gauge retail sentiment and community hype. ' +
            'Input: The name or ticker of the coin (e.g., "Bitcoin", "ETH"). ' +
            'Returns: Post count, aggregate score, and recent post summaries. ' +
            'Use this tool FIRST to understand retail and community momentum.',

        func: async (coinName) => {
            const trimmed = (coinName || '').trim();
            if (!trimmed) {
                return JSON.stringify({ success: false, error: 'Coin name is required.' });
            }

            const result = await resilientExecute(
                () => RedditService.fetchPosts(trimmed),
                { toolName: 'reddit_sentiment_fetch', maxRetries: 2, timeoutMs: 15000, fallbackValue: [] }
            );

            if (metricsTracker) {
                metricsTracker.recordToolCall('reddit_sentiment_fetch', result.success, result.latencyMs, result.attempts);
            }

            if (!result.success || !result.data || result.data.length === 0) {
                return JSON.stringify({
                    success: false,
                    message: 'No recent Reddit data available or fetch failed.',
                    retailSignal: 'UNKNOWN'
                });
            }

            const posts = result.data;
            const totalScore = posts.reduce((sum, p) => sum + (p.score || 0), 0);
            const totalComments = posts.reduce((sum, p) => sum + (p.comments || 0), 0);

            // Compute an extremely basic heuristic to guide the LLM
            let retailSignal = 'NEUTRAL';
            if (totalScore > 500 && totalComments > 100) retailSignal = 'HIGH_HYPE';
            else if (totalScore > 100) retailSignal = 'ACTIVE';
            else if (posts.length < 3) retailSignal = 'DEAD';

            return JSON.stringify({
                success: true,
                postCount: posts.length,
                engagement: {
                    totalScore,
                    totalComments
                },
                retailSignal,
                topPosts: posts.slice(0, 5).map(p => ({
                    title: p.title,
                    score: p.score,
                    contentPreview: p.content ? p.content.substring(0, 150) + '...' : ''
                }))
            });
        },
    });
}

export default { createRedditTool };
