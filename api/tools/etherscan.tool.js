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

                if (code.length > 8000) {
                    code = code.substring(0, 8000) + '\n//... [TRUNCATED FOR LLM CONTEXT LIMITS]';
                }

                return JSON.stringify({
                    success: true,
                    contractName: result.data.name,
                    address: result.data.address,
                    compiler: result.data.compiler,
                    isProxy: result.data.isProxy || false,
                    implementationAddress: result.data.implementationAddress || "",
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

/**
 * Tool to retrieve the implementation source code of a proxy contract.
 */
export function createGetImplementationTool(metricsTracker = null) {
    return new DynamicTool({
        name: 'etherscan_get_implementation',
        description:
            'Fetches the logic contract source code behind a proxy address. ' +
            'Input: The 42-character Ethereum proxy contract address. ' +
            'Returns: Source code and metadata of the underlying logic/implementation contract.',
        func: async (address) => {
            const trimmed = (address || '').trim();
            if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
                return JSON.stringify({ success: false, error: 'Invalid Ethereum address format.' });
            }

            const result = await resilientExecute(
                () => ContractService.getEthereumContractSource(trimmed),
                { toolName: 'etherscan_get_implementation', maxRetries: 2, timeoutMs: 15000, fallbackValue: null }
            );

            if (metricsTracker) {
                metricsTracker.recordToolCall('etherscan_get_implementation', result.success, result.latencyMs, result.attempts);
            }

            if (result.success && result.data) {
                let code = result.data.sourceCode || '';
                code = code.replace(/\/\*\*[\s\S]+?\*\//g, '');
                code = code.replace(/\/\/.*/g, '');
                code = code.replace(/\s+/g, ' ');

                if (code.length > 8000) {
                    code = code.substring(0, 8000) + '\n//... [TRUNCATED]';
                }

                return JSON.stringify({
                    success: true,
                    contractName: result.data.name,
                    address: result.data.address,
                    compiler: result.data.compiler,
                    sourceCode: code
                });
            }

            return JSON.stringify({
                success: false,
                error: result.error?.message || 'Failed to fetch implementation contract.'
            });
        }
    });
}

/**
 * Tool to map contracts deployed by the creator.
 */
export function createGetDeployerContractsTool(metricsTracker = null) {
    return new DynamicTool({
        name: 'etherscan_get_deployer_contracts',
        description:
            'Retrieves the list of other smart contracts directly deployed by the creator of a given contract. ' +
            'Input: The 42-character Ethereum contract address. ' +
            'Returns: Deployer address, deploy transaction hash, and lists of other deployed contracts and dates.',
        func: async (address) => {
            const trimmed = (address || '').trim();
            if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
                return JSON.stringify({ success: false, error: 'Invalid Ethereum address format.' });
            }

            const creationResult = await resilientExecute(
                () => ContractService.getContractCreation(trimmed),
                { toolName: 'etherscan_get_deployer_contracts', maxRetries: 2, timeoutMs: 15000, fallbackValue: null }
            );

            if (!creationResult.success || !creationResult.data) {
                return JSON.stringify({
                    success: false,
                    error: creationResult.error?.message || 'Failed to retrieve contract creation details.'
                });
            }

            const creator = creationResult.data.contractCreator;
            const txHash = creationResult.data.txHash;

            const contractsResult = await resilientExecute(
                () => ContractService.getDeployerContracts(creator),
                { toolName: 'etherscan_get_deployer_contracts', maxRetries: 2, timeoutMs: 15000, fallbackValue: [] }
            );

            if (metricsTracker) {
                metricsTracker.recordToolCall('etherscan_get_deployer_contracts', contractsResult.success, contractsResult.latencyMs, contractsResult.attempts);
            }

            return JSON.stringify({
                success: true,
                deployerAddress: creator,
                deploymentTxHash: txHash,
                deployedContractsCount: contractsResult.data?.length || 0,
                relatedContracts: (contractsResult.data || []).map(c => ({
                    address: c.address,
                    txHash: c.txHash,
                    date: c.date
                })).slice(0, 10)
            });
        }
    });
}

/**
 * Tool to fetch the implementation upgrade history of a proxy.
 */
export function createGetUpgradeHistoryTool(metricsTracker = null) {
    return new DynamicTool({
        name: 'etherscan_get_upgrade_history',
        description:
            'Retrieves the list of implementation upgrade logs for a proxy contract. ' +
            'Input: The 42-character Ethereum proxy contract address. ' +
            'Returns: Previous implementation addresses, block numbers, and dates.',
        func: async (address) => {
            const trimmed = (address || '').trim();
            if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
                return JSON.stringify({ success: false, error: 'Invalid Ethereum address format.' });
            }

            const result = await resilientExecute(
                () => ContractService.getProxyUpgradeHistory(trimmed),
                { toolName: 'etherscan_get_upgrade_history', maxRetries: 2, timeoutMs: 15000, fallbackValue: [] }
            );

            if (metricsTracker) {
                metricsTracker.recordToolCall('etherscan_get_upgrade_history', result.success, result.latencyMs, result.attempts);
            }

            return JSON.stringify({
                success: true,
                versionsCount: result.data?.length || 0,
                upgradeHistory: (result.data || []).slice(0, 10)
            });
        }
    });
}

export default {
    createEtherscanTool,
    createGetImplementationTool,
    createGetDeployerContractsTool,
    createGetUpgradeHistoryTool
};
