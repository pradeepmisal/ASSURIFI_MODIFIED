/**
 * sentimentQuality.tool.js — LangChain Tool: Credibility Engine
 * 
 * Evaluates the reliability of collected sentiment data.
 * Computes dataQuality (HIGH/MEDIUM/LOW), bot risk, source diversity, and freshness.
 * Directly influences the agent's final confidence score.
 */

import { DynamicTool } from '@langchain/core/tools';

/**
 * @param {Object} metricsTracker - Optional metrics tracker
 * @returns {DynamicTool}
 */
export function createSentimentQualityTool(metricsTracker = null) {
    return new DynamicTool({
        name: 'evaluate_sentiment_quality',
        description:
            'Evaluates the credibility and reliability of the fetched sentiment data. ' +
            'Input: JSON string containing data from reddit_sentiment_fetch and news_sentiment_fetch. ' +
            'Example: {"redditPostCount": 10, "redditEngagement": 500, "newsArticleCount": 5, "newsSourceDiversity": 3}. ' +
            'Returns: dataQuality rating, botRisk score, and sourceDiversity evaluation. ' +
            'You MUST use this tool AFTER fetching primary signals before making your final assessment.',

        func: async (input) => {
            const startTime = Date.now();
            let parsed;

            try {
                parsed = JSON.parse(input);
            } catch {
                return JSON.stringify({
                    success: false,
                    error: 'Input must be a valid JSON string containing reddit and news metrics.'
                });
            }

            const {
                redditPostCount = 0,
                redditEngagement = 0,
                newsArticleCount = 0,
                newsSourceDiversity = 0
            } = parsed;

            // ─── Heuristics Engine ──────────────────────────────────

            let dataQuality = 'LOW';
            let botRisk = 'LOW';
            const warnings = [];

            // 1. Bot Risk (High volume, low sources)
            if (redditPostCount > 20 && newsArticleCount === 0) {
                botRisk = 'HIGH';
                warnings.push('High social volume with zero news coverage indicates potential bot manipulation or coordinated shill campaign.');
            } else if (redditPostCount >= 5 && redditEngagement < (redditPostCount * 2)) {
                botRisk = 'MEDIUM';
                warnings.push('Multiple social posts but very low engagement suggests spam or low-quality chatter.');
            }

            // 2. Source Diversity
            let diversityScore = 'POOR';
            if (newsSourceDiversity >= 3 && redditPostCount >= 3) {
                diversityScore = 'EXCELLENT';
            } else if ((newsSourceDiversity >= 1 && redditPostCount >= 1) || newsSourceDiversity >= 2) {
                diversityScore = 'MODERATE';
            } else {
                warnings.push('Relying on a single signal type (only Reddit or only News) reduces reliability.');
            }

            // 3. Overall Data Quality
            const totalSignals = (redditPostCount > 0 ? 1 : 0) + (newsArticleCount > 0 ? 1 : 0);

            if (totalSignals === 2 && botRisk === 'LOW' && diversityScore === 'EXCELLENT') {
                dataQuality = 'HIGH';
            } else if (totalSignals >= 1 && botRisk !== 'HIGH') {
                dataQuality = 'MEDIUM';
            } else {
                dataQuality = 'LOW';
            }

            if (metricsTracker) {
                metricsTracker.recordToolCall('evaluate_sentiment_quality', true, Date.now() - startTime, 1);
            }

            return JSON.stringify({
                success: true,
                dataQuality,
                botRisk,
                sourceDiversity: diversityScore,
                totalSignalsDetected: totalSignals,
                reliabilityWarnings: warnings,
                instruction: dataQuality === 'LOW' || botRisk === 'HIGH'
                    ? 'WARNING: You MUST reduce your final confidence score due to low data quality or high bot risk. Consider cross-referencing with Web Search (Tavily).'
                    : 'Data is sufficient for standard analysis.'
            });
        },
    });
}

export default { createSentimentQualityTool };
