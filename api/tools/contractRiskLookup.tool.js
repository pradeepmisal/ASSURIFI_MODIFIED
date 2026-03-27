/**
 * contractRiskLookup.tool.js — LangChain Tool: Cross-Agent Contract Risk Signal
 * 
 * Enables Risk Assessor to query Contract Auditor results.
 * Looks up the latest AUDIT analysis for a contract address from MongoDB,
 * enabling cross-signal intelligence between agents.
 */

import { DynamicTool } from '@langchain/core/tools';
import Analysis from '../models/Analysis.js';
import { resilientExecute } from '../utils/resilientToolExecutor.js';

/**
 * @param {Object} metricsTracker - Optional metrics tracker
 * @returns {DynamicTool}
 */
export function createContractRiskLookupTool(metricsTracker = null) {
    return new DynamicTool({
        name: 'contract_risk_lookup',
        description:
            'Looks up the latest Contract Auditor security assessment for a smart contract. ' +
            'Input: the contract address as a string. ' +
            'Returns: security score (0-100), vulnerability count, severity breakdown, and summary. ' +
            'Use this tool to cross-reference contract security risk when evaluating token risk. ' +
            'If no prior audit exists, returns a clear "no_audit_found" response.',

        func: async (address) => {
            const trimmed = (address || '').trim();

            if (!trimmed || trimmed.length < 10) {
                return JSON.stringify({
                    success: false,
                    error: 'Invalid contract address. Provide a valid address string.',
                });
            }

            const result = await resilientExecute(
                () => lookupLatestAudit(trimmed),
                { toolName: 'contract_risk_lookup', maxRetries: 2, timeoutMs: 10000, fallbackValue: null }
            );

            if (metricsTracker) {
                metricsTracker.recordToolCall('contract_risk_lookup', result.success, result.latencyMs, result.attempts);
            }

            if (result.success && result.data) {
                return JSON.stringify(result.data);
            }

            return JSON.stringify({
                success: true,
                auditAvailable: false,
                message: 'No prior contract audit found for this address. Contract risk is unknown.',
                recommendation: 'Consider this as elevated risk — unaudited contracts carry higher uncertainty.',
            });
        },
    });
}

/**
 * Queries MongoDB for the latest AUDIT-type analysis for a contract address.
 */
async function lookupLatestAudit(contractAddress) {
    const audit = await Analysis.findOne({
        type: 'AUDIT',
        $or: [
            { contractAddress: contractAddress },
            { tokenAddress: contractAddress },
            { contractAddress: { $regex: contractAddress, $options: 'i' } },
        ],
    })
        .sort({ createdAt: -1 })
        .lean();

    if (!audit) {
        return {
            success: true,
            auditAvailable: false,
            message: 'No prior contract audit found.',
            recommendation: 'Unaudited contract — treat as elevated risk.',
        };
    }

    const report = audit.geminiAnalysis || {};

    return {
        success: true,
        auditAvailable: true,
        contractAddress,
        securityScore: report.overallScore ?? audit.overallRiskScore ?? null,
        vulnerabilityCount: report.vulnerabilities?.length ?? 0,
        severityBreakdown: countSeverities(report.vulnerabilities || []),
        summary: report.summary || 'Audit exists but summary unavailable.',
        investorImpact: report.investorImpactSummary || null,
        auditDate: audit.createdAt,
        confidence: report._meta?.confidence ?? null,
    };
}

function countSeverities(vulns) {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const v of vulns) {
        const sev = (v.severity || '').toLowerCase();
        if (counts[sev] !== undefined) counts[sev]++;
    }
    return counts;
}

export default { createContractRiskLookupTool };
