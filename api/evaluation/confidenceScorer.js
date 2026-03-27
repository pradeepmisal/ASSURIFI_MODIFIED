/**
 * confidenceScorer.js — Agent Confidence Scoring Utility
 * 
 * Calculates a confidence score (0–1) for every agent output.
 * Considers: tool success rate, data completeness, validation results, data freshness.
 * Transparent and explainable — every factor contributes visibly.
 */

// ─── Confidence Factors & Weights ────────────────────────────

const WEIGHTS = {
    toolSuccessRate: 0.35,      // How many tools succeeded vs attempted
    dataCompleteness: 0.25,     // How many expected data fields are present
    validationSuccess: 0.20,    // Did output pass schema validation cleanly?
    sourceFreshness: 0.10,      // Is the data from live sources?
    sourceAgreement: 0.10,      // Do multiple sources agree?
};

// ─── Main Scorer ─────────────────────────────────────────────

/**
 * Calculates confidence for an agent's output.
 * 
 * @param {Object} params
 * @param {number} params.toolsAttempted - Number of tools the agent attempted to call
 * @param {number} params.toolsSucceeded - Number of tools that returned valid data
 * @param {string[]} params.expectedFields - Fields the output should have
 * @param {Object} params.actualOutput - The agent's output object
 * @param {boolean} params.validationPassed - Did Zod schema validation pass?
 * @param {boolean} params.wasDegraded - Was auto-repair needed?
 * @param {boolean} params.usedLiveData - Was data fetched live (not cached/fallback)?
 * @param {string[]} params.missingDataSources - Data sources that failed
 * @returns {ConfidenceResult}
 */
export function calculateConfidence(params) {
    const {
        toolsAttempted = 0,
        toolsSucceeded = 0,
        expectedFields = [],
        actualOutput = {},
        validationPassed = true,
        wasDegraded = false,
        usedLiveData = true,
        missingDataSources = [],
    } = params;

    const factors = {};
    const penalties = [];

    // Factor 1: Tool Success Rate
    if (toolsAttempted > 0) {
        factors.toolSuccessRate = toolsSucceeded / toolsAttempted;
    } else {
        factors.toolSuccessRate = 0;
        penalties.push('No tools were called');
    }

    // Factor 2: Data Completeness
    if (expectedFields.length > 0) {
        let presentCount = 0;
        for (const field of expectedFields) {
            const value = getNestedValue(actualOutput, field.split('.'));
            if (value !== undefined && value !== null && value !== '') {
                presentCount++;
            }
        }
        factors.dataCompleteness = presentCount / expectedFields.length;

        if (factors.dataCompleteness < 1) {
            const missing = expectedFields.filter((f) => {
                const v = getNestedValue(actualOutput, f.split('.'));
                return v === undefined || v === null || v === '';
            });
            penalties.push(`Missing fields: ${missing.join(', ')}`);
        }
    } else {
        factors.dataCompleteness = 1; // No expectations = no penalty
    }

    // Factor 3: Validation Success
    if (validationPassed && !wasDegraded) {
        factors.validationSuccess = 1.0;
    } else if (validationPassed && wasDegraded) {
        factors.validationSuccess = 0.6;
        penalties.push('Output required auto-repair');
    } else {
        factors.validationSuccess = 0.2;
        penalties.push('Schema validation failed');
    }

    // Factor 4: Source Freshness
    factors.sourceFreshness = usedLiveData ? 1.0 : 0.5;
    if (!usedLiveData) {
        penalties.push('Using fallback/cached data');
    }

    // Factor 5: Source Agreement
    if (missingDataSources.length === 0) {
        factors.sourceAgreement = 1.0;
    } else {
        factors.sourceAgreement = Math.max(0, 1 - (missingDataSources.length * 0.3));
        penalties.push(`Missing data sources: ${missingDataSources.join(', ')}`);
    }

    // Calculate weighted confidence
    let confidence = 0;
    for (const [factor, weight] of Object.entries(WEIGHTS)) {
        confidence += (factors[factor] || 0) * weight;
    }

    // ─── Calibration Caps ────────────────────────────────────
    // Prevent over-inflation in degraded scenarios.

    // Cap 1: Zero tools succeeded but tools were attempted → max 0.25
    // No evidence = cannot be confident regardless of other factors
    if (toolsAttempted > 0 && toolsSucceeded === 0) {
        confidence = Math.min(confidence, 0.25);
        penalties.push('HARD CAP: No tools returned data — confidence capped at 0.25');
    }

    // Cap 2: Tool success rate < 50% → max 0.60
    // Less than half the evidence → limited confidence
    if (toolsAttempted > 0 && (toolsSucceeded / toolsAttempted) < 0.5) {
        confidence = Math.min(confidence, 0.60);
        if (toolsSucceeded > 0) {
            penalties.push('PARTIAL CAP: <50% tool success — confidence capped at 0.60');
        }
    }

    // Cap 3: Validation failed AND degraded → max 0.30
    if (!validationPassed && wasDegraded) {
        confidence = Math.min(confidence, 0.30);
        penalties.push('HARD CAP: Validation failed with degradation — confidence capped at 0.30');
    }

    // Clamp to [0, 1]
    confidence = Math.max(0, Math.min(1, confidence));

    // Round to 2 decimal places
    confidence = Math.round(confidence * 100) / 100;

    // Determine evidence count (tools that actually provided data)
    const evidenceCount = toolsSucceeded;

    // Determine risk level based on confidence
    const riskLevel = confidence >= 0.8 ? 'LOW'
        : confidence >= 0.5 ? 'MEDIUM'
            : 'HIGH';

    return {
        confidence,
        evidenceCount,
        riskLevel,
        factors,
        penalties,
    };
}

/**
 * Attaches confidence metadata to an agent's output.
 * Returns a new object with _meta.confidence added.
 * 
 * @param {Object} agentOutput - The agent's analysis result
 * @param {Object} confidenceResult - Output from calculateConfidence()
 * @returns {Object} agentOutput with _meta field added
 */
export function attachConfidence(agentOutput, confidenceResult) {
    return {
        ...agentOutput,
        _meta: {
            confidence: confidenceResult.confidence,
            evidenceCount: confidenceResult.evidenceCount,
            riskLevel: confidenceResult.riskLevel,
            penalties: confidenceResult.penalties,
            factors: confidenceResult.factors,
        },
    };
}

// ─── Helpers ─────────────────────────────────────────────────

function getNestedValue(obj, pathArray) {
    let current = obj;
    for (const key of pathArray) {
        if (current === undefined || current === null) return undefined;
        current = current[key];
    }
    return current;
}

export default { calculateConfidence, attachConfidence };
