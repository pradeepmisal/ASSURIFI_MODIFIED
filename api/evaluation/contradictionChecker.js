/**
 * contradictionChecker.js — Cross-Agent Conflict Resolution
 * 
 * Detects conflicts between the three primary agents:
 * - Contract Auditor
 * - Risk Assessor
 * - Sentiment Analyst
 */

export function detectConflicts(contractOutput, riskOutput, sentimentOutput) {
    const conflicts = [];
    let resolutionAction = null;
    let targetAgent = null;

    // We only check if the outputs actually succeeded
    const contractValid = contractOutput && !contractOutput.degraded;
    const riskValid = riskOutput && !riskOutput.degraded;
    const sentimentValid = sentimentOutput && !sentimentOutput.degraded;

    // Helper functions
    const isCriticalRisk = (r) => r?.riskLevel === 'CRITICAL' || r?.riskScore > 80;
    const isCriticalContract = (c) => c?.vulnerabilityLevel === 'CRITICAL' || c?.securityScore < 30;
    const isBullishSentiment = (s) => s?.overallSentiment === 'BULLISH';
    const isLowQualityData = (s) => s?.dataQuality === 'LOW';

    // 1. Bullish Sentiment vs Critical Risk/Contract
    if (sentimentValid && isBullishSentiment(sentimentOutput)) {
        if (riskValid && isCriticalRisk(riskOutput)) {
            conflicts.push('Bullish Sentiment despite CRITICAL Market Risk.');
            // Re-eval sentiment to see if it's artificial
            resolutionAction = 'requery';
            targetAgent = 'sentimentAnalyst';
        } else if (contractValid && isCriticalContract(contractOutput)) {
            conflicts.push('Bullish Sentiment despite CRITICAL Contract Vulnerability.');
            resolutionAction = 'requery';
            targetAgent = 'sentimentAnalyst';
        }
    }

    // 2. High Quality Sentiment data vs Critical Contract Failure
    // A rug-pull often has hyped (high quantity) sentiment right before dumping
    if (contractValid && isCriticalContract(contractOutput) && sentimentValid && !isLowQualityData(sentimentOutput)) {
        conflicts.push('High social engagement despite critical smart contract flaws. Potential orchestrated hype/rug-pull.');
        if (!resolutionAction) {
            resolutionAction = 'synthesis_override'; // Supervisor just issues a warning
        }
    }

    // 3. Risk Assessor is low risk, but Contract Auditor found severe issues
    // (Risk Assessor should naturally consume contract data, but if there's a disconnect, we flag it)
    if (riskValid && riskOutput.riskScore < 30 && contractValid && isCriticalContract(contractOutput)) {
        conflicts.push('Low overall risk assigned, but contract is CRITICAL.');
        resolutionAction = 'requery';
        targetAgent = 'riskAssessor';
    }

    // Pick the most likely weak signal to requery based on confidence
    if (resolutionAction === 'requery' && targetAgent) {
        // Only requery if confidence is somewhat weak (< 0.85). If both are highly confident, it's a true anomaly, not an agent error.
        let targetConfidence = 1.0;
        if (targetAgent === 'sentimentAnalyst') targetConfidence = sentimentOutput._meta?.confidence || 1.0;
        if (targetAgent === 'riskAssessor') targetConfidence = riskOutput._meta?.confidence || 1.0;
        if (targetAgent === 'contractAuditor') targetConfidence = contractOutput._meta?.confidence || 1.0;

        // If the agent is actually very confident, don't waste the requery loop. Just override in synthesis.
        if (targetConfidence > 0.85) {
            resolutionAction = 'synthesis_override';
            targetAgent = null;
        }
    }

    return {
        hasConflict: conflicts.length > 0,
        reasons: conflicts,
        resolutionAction, // null, 'requery', or 'synthesis_override'
        targetAgent // e.g., 'sentimentAnalyst', 'riskAssessor'
    };
}

export default { detectConflicts };
