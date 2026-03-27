/**
 * etherscan.tool.js — LangChain Tool: Fetch Contract Source from Etherscan
 * 
 * Wraps ContractService.getEthereumContractSource() as a LangChain DynamicTool.
 * All calls go through resilientToolExecutor for retries and timeouts.
 * The agent autonomously decides when to call this tool.
 */

import { DynamicTool } from '@langchain/core/tools';
import ContractService from '../services/contract.service.js';
import { resilientExecute } from '../utils/resilientToolExecutor.js';

/**
 * Creates the Etherscan fetch tool for the Contract Auditor agent.
 * 
 * @param {Object} metricsTracker - Optional metrics tracker from agentMetrics
 * @returns {DynamicTool}
 */
export function createEtherscanTool(metricsTracker = null) {
    return new DynamicTool({
        name: 'etherscan_fetch',
        description:
            'Fetches the verified Solidity source code of an Ethereum smart contract from Etherscan. ' +
            'Input must be a valid Ethereum address (0x followed by 40 hex characters). ' +
            'Returns the contract name, source code, compiler version, and address. ' +
            'Use this tool FIRST when analyzing a contract by address. ' +
            'If the contract is unverified, this tool will return an error.',

        func: async (address) => {
            const trimmed = (address || '').trim();

            // Input validation
            if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
                return JSON.stringify({
                    success: false,
                    error: `Invalid Ethereum address format: "${trimmed}". Must be 0x followed by 40 hex characters.`,
                });
            }

            const result = await resilientExecute(
                () => ContractService.getEthereumContractSource(trimmed),
                {
                    toolName: 'etherscan_fetch',
                    maxRetries: 2,
                    timeoutMs: 15000,
                    fallbackValue: null,
                }
            );

            // Record in metrics if tracker provided
            if (metricsTracker) {
                metricsTracker.recordToolCall(
                    'etherscan_fetch',
                    result.success,
                    result.latencyMs,
                    result.attempts
                );
            }

            if (result.success && result.data) {
                let code = result.data.sourceCode || '';

                // Extremely aggressive cleanup to save tokens for Groq API limits
                code = code.replace(/\/\*\*[\s\S]+?\*\//g, ''); // Remove block comments
                code = code.replace(/\/\/.*/g, ''); // Remove line comments
                code = code.replace(/\s+/g, ' '); // Compress whitespace

                if (code.length > 15000) {
                    code = code.substring(0, 15000) + '\n//... [TRUNCATED FOR LLM CONTEXT LIMITS]';
                }

                return JSON.stringify({
                    success: true,
                    contractName: result.data.name,
                    address: result.data.address,
                    compiler: result.data.compiler,
                    sourceCodeLength: result.data.sourceCode?.length || 0,
                    sourceCode: code,
                });
            }

            return JSON.stringify({
                success: false,
                error: result.error?.message || 'Failed to fetch contract source code',
            });
        },
    });
}

export default { createEtherscanTool };
