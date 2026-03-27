/**
 * dexscreener.tool.js — LangChain Tool: Token Market Data
 * 
 * Wraps RiskService.getTokenData() as a LangChain DynamicTool.
 * Fetches: liquidity, volume, price change, market cap from DexScreener/Liquidity API.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import RiskService from '../services/risk.service.js';
import { resilientExecute } from '../utils/resilientToolExecutor.js';

/**
 * @param {Object} metricsTracker - Optional metrics tracker
 * @returns {DynamicStructuredTool}
 */
export function createDexScreenerTool(metricsTracker = null) {
    return new DynamicStructuredTool({
        name: 'dexscreener_fetch',
        description:
            'Fetches real-time market data for a token from DexScreener/Liquidity API. ' +
            'Returns: liquidity (USD), market cap, volume, price changes (1h/6h/24h), pair info. ' +
            'Use this tool FIRST to assess the token\'s market health before deeper analysis.',
        schema: z.object({
            tokenAddress: z.string().describe("The token contract address to look up"),
            chainId: z.string().describe("The blockchain network, default to 'solana' or 'ethereum'")
        }),
        func: async ({ tokenAddress, chainId = 'solana' }) => {

            if (!tokenAddress || typeof tokenAddress !== 'string' || tokenAddress.trim().length < 5) {
                return JSON.stringify({
                    success: false,
                    error: 'Invalid token address. Provide a valid token address string.',
                });
            }

            const result = await resilientExecute(
                () => RiskService.getTokenData(tokenAddress.trim(), chainId),
                { toolName: 'dexscreener_fetch', maxRetries: 2, timeoutMs: 15000, fallbackValue: null }
            );

            if (metricsTracker) {
                metricsTracker.recordToolCall('dexscreener_fetch', result.success, result.latencyMs, result.attempts);
            }

            if (result.success && result.data) {
                const data = result.data;
                const metrics = data.metrics || data;

                return JSON.stringify({
                    success: true,
                    tokenName: data.name || data.token_name || metrics.name || 'Unknown',
                    liquidity: metrics.liquidity ?? metrics.reserveUsd ?? null,
                    marketCap: metrics.market_cap ?? metrics.marketCap ?? null,
                    volume24h: metrics.volume?.h24 ?? metrics.volume_24h ?? null,
                    priceChange: {
                        h1: metrics.price?.change?.h1 ?? metrics.priceChange?.h1 ?? null,
                        h6: metrics.price?.change?.h6 ?? metrics.priceChange?.h6 ?? null,
                        h24: metrics.price?.change?.h24 ?? metrics.priceChange?.h24 ?? null,
                    },
                    priceUsd: metrics.price?.current ?? metrics.priceUsd ?? null,
                    pairCount: data.pairs?.length ?? null,
                    chainId,
                    rawDataKeys: Object.keys(data),
                });
            }

            return JSON.stringify({
                success: false,
                error: result.error?.message || 'Failed to fetch token market data',
            });
        },
    });
}

export default { createDexScreenerTool };
