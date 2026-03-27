/**
 * tokenHolders.tool.js — LangChain Tool: Token Holder Distribution Analysis
 * 
 * NEW tool providing holder concentration signals.
 * Analyzes: top holder dominance, whale concentration, holder count distribution.
 * Uses DexScreener data + heuristics when on-chain API is unavailable.
 */

import { DynamicTool } from '@langchain/core/tools';

/**
 * @param {Object} metricsTracker - Optional metrics tracker
 * @returns {DynamicTool}
 */
export function createTokenHoldersTool(metricsTracker = null) {
    return new DynamicTool({
        name: 'token_holders_analysis',
        description:
            'Analyzes token holder distribution to assess concentration risk. ' +
            'Input: JSON string with "tokenAddress" and optionally "liquidity", "marketCap", "volume24h" from dexscreener_fetch. ' +
            'Estimates: top holder concentration, whale dominance, holder count risk level. ' +
            'Use this tool AFTER fetching market data to evaluate holder-based risk signals.',

        func: async (input) => {
            const startTime = Date.now();

            try {
                let parsed;
                try {
                    parsed = JSON.parse(input);
                } catch {
                    return JSON.stringify({
                        success: false,
                        error: 'Input must be JSON with "tokenAddress" and optionally market data fields.',
                    });
                }

                const { tokenAddress, liquidity, marketCap, volume24h } = parsed;

                if (!tokenAddress) {
                    return JSON.stringify({ success: false, error: 'tokenAddress is required.' });
                }

                // ─── Holder Concentration Analysis ────────────────
                // Uses market signal heuristics since on-chain holder APIs
                // are chain-specific and often rate-limited.
                const analysis = analyzeHolderConcentration({
                    liquidity: liquidity || 0,
                    marketCap: marketCap || 0,
                    volume24h: volume24h || 0,
                });

                if (metricsTracker) {
                    metricsTracker.recordToolCall('token_holders_analysis', true, Date.now() - startTime, 1);
                }

                return JSON.stringify({
                    success: true,
                    tokenAddress,
                    ...analysis,
                });

            } catch (error) {
                if (metricsTracker) {
                    metricsTracker.recordToolCall('token_holders_analysis', false, Date.now() - startTime, 1);
                }
                return JSON.stringify({ success: false, error: `Holder analysis failed: ${error.message}` });
            }
        },
    });
}

/**
 * Estimates holder concentration risk from market signals.
 * 
 * Heuristics logic:
 * - Low liquidity relative to market cap → likely concentrated holders
 * - Low volume relative to market cap → few active traders → whale-dominated
 * - Very low total liquidity → micro-cap with likely team control
 */
function analyzeHolderConcentration({ liquidity, marketCap, volume24h }) {
    const liqToCapRatio = marketCap > 0 ? liquidity / marketCap : 0;
    const volToCapRatio = marketCap > 0 ? volume24h / marketCap : 0;

    let concentrationRisk = 'UNKNOWN';
    let whaleRisk = 'UNKNOWN';
    let estimatedHolderProfile = 'Unable to determine';
    const warnings = [];

    // ─── Concentration Risk ──────────────────────────────────

    if (liquidity < 5000) {
        concentrationRisk = 'CRITICAL';
        whaleRisk = 'HIGH';
        estimatedHolderProfile = 'Likely controlled by 1-5 wallets (micro-liquidity)';
        warnings.push('Liquidity under $5K — likely team/insider controlled');
    } else if (liqToCapRatio < 0.05 && marketCap > 100000) {
        concentrationRisk = 'HIGH';
        whaleRisk = 'HIGH';
        estimatedHolderProfile = 'Low liquidity-to-cap ratio suggests whales hold unlocked supply';
        warnings.push('Liquidity is <5% of market cap — heavy sell pressure possible');
    } else if (liqToCapRatio < 0.15 && marketCap > 50000) {
        concentrationRisk = 'MEDIUM';
        whaleRisk = 'MEDIUM';
        estimatedHolderProfile = 'Moderate concentration — some whale risk exists';
    } else if (liqToCapRatio >= 0.15) {
        concentrationRisk = 'LOW';
        whaleRisk = 'LOW';
        estimatedHolderProfile = 'Healthy liquidity-to-cap ratio suggests distributed holdings';
    }

    // ─── Volume-Based Signals ────────────────────────────────

    if (volToCapRatio < 0.01 && marketCap > 50000) {
        warnings.push('Daily volume <1% of market cap — illiquid, few active traders');
        if (concentrationRisk === 'LOW') concentrationRisk = 'MEDIUM';
    } else if (volToCapRatio > 0.5) {
        warnings.push('Extremely high volume-to-cap ratio — possible wash trading');
    }

    // ─── Inverted Liquidity Detection ────────────────────────

    if (liquidity > marketCap && marketCap > 0) {
        warnings.push('Liquidity exceeds market cap — anomalous, often seen in manipulated tokens');
        concentrationRisk = 'HIGH';
    }

    // ─── Holder Count Estimate ───────────────────────────────
    let estimatedHolderCount = 'Unknown';
    if (marketCap > 10_000_000) {
        estimatedHolderCount = '10,000+';
    } else if (marketCap > 1_000_000) {
        estimatedHolderCount = '1,000-10,000';
    } else if (marketCap > 100_000) {
        estimatedHolderCount = '100-1,000';
    } else if (marketCap > 10_000) {
        estimatedHolderCount = '10-100';
    } else {
        estimatedHolderCount = '<10 (likely)';
    }

    return {
        concentrationRisk,
        whaleRisk,
        estimatedHolderProfile,
        estimatedHolderCount,
        warnings,
        signals: {
            liquidityToCapRatio: Math.round(liqToCapRatio * 10000) / 100, // percentage
            volumeToCapRatio: Math.round(volToCapRatio * 10000) / 100,
        },
    };
}

export default { createTokenHoldersTool };
