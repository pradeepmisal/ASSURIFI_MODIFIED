/**
 * staticAnalysis.tool.js — LangChain Tool: Static Pattern Analysis
 * 
 * Wraps ContractService.analyzeContractStatic() as a LangChain DynamicTool.
 * Scans Solidity source code for known vulnerability patterns
 * (tx.origin, selfdestruct, delegatecall, unchecked external calls).
 */

import { DynamicTool } from '@langchain/core/tools';
import ContractService from '../services/contract.service.js';

/**
 * Creates the Static Analysis tool for the Contract Auditor agent.
 * 
 * @param {Object} metricsTracker - Optional metrics tracker from agentMetrics
 * @returns {DynamicTool}
 */
export function createStaticAnalysisTool(metricsTracker = null) {
    return new DynamicTool({
        name: 'static_analysis',
        description:
            'Runs static pattern analysis on Solidity source code to detect common vulnerabilities. ' +
            'Detects: tx.origin usage, selfdestruct, unchecked external calls, delegatecall, ' +
            'and checks for safety features like ReentrancyGuard and Pausable. ' +
            'Input: the raw Solidity source code as a string. ' +
            'Output: list of found vulnerabilities with severity, a preliminary risk score, and safety features detected. ' +
            'Use this tool AFTER fetching source code to get a quick vulnerability scan before deep AI analysis.',

        func: async (sourceCode) => {
            const startTime = Date.now();

            if (!sourceCode || typeof sourceCode !== 'string' || sourceCode.trim().length < 10) {
                const result = {
                    success: false,
                    error: 'Source code is empty or too short for analysis',
                };

                if (metricsTracker) {
                    metricsTracker.recordToolCall('static_analysis', false, Date.now() - startTime, 1);
                }

                return JSON.stringify(result);
            }

            try {
                const analysis = ContractService.analyzeContractStatic(sourceCode);

                if (metricsTracker) {
                    metricsTracker.recordToolCall('static_analysis', true, Date.now() - startTime, 1);
                }

                return JSON.stringify({
                    success: true,
                    preliminaryScore: analysis.overallScore,
                    vulnerabilitiesFound: analysis.vulnerabilities.length,
                    vulnerabilities: analysis.vulnerabilities,
                    safetyFeatures: {
                        modernSolidity: /pragma solidity \^?0\.8/.test(sourceCode),
                        reentrancyGuard: sourceCode.includes('ReentrancyGuard') || sourceCode.includes('nonReentrant'),
                        pausable: sourceCode.includes('Pausable') || sourceCode.includes('whenNotPaused'),
                        accessControl: sourceCode.includes('Ownable') || sourceCode.includes('onlyOwner'),
                    },
                    codeMetrics: {
                        totalLength: sourceCode.length,
                        estimatedLines: sourceCode.split('\n').length,
                        hasProxy: sourceCode.includes('delegatecall') || sourceCode.includes('Proxy'),
                        hasUpgradeable: sourceCode.includes('Upgradeable') || sourceCode.includes('initializer'),
                    },
                });
            } catch (error) {
                if (metricsTracker) {
                    metricsTracker.recordToolCall('static_analysis', false, Date.now() - startTime, 1);
                }

                return JSON.stringify({
                    success: false,
                    error: `Static analysis failed: ${error.message}`,
                });
            }
        },
    });
}

export default { createStaticAnalysisTool };
