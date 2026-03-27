/**
 * outputValidator.js — AI Output Schema Validation Guard
 * 
 * Validates every LLM response against Zod schemas.
 * Detects: malformed output, empty responses, low-information answers.
 * On failure: allows ONE self-correction retry, then degrades confidence.
 * Never throws uncaught errors.
 */

import { z } from 'zod';

// ─── Contract Audit Output Schema ────────────────────────────

export const ContractAuditSchema = z.object({
    vulnerabilities: z.array(
        z.object({
            id: z.number(),
            name: z.string().min(1),
            description: z.string().min(1),
            severity: z.enum(['critical', 'high', 'medium', 'low']),
            lineNumber: z.number().optional(),
            code: z.string().optional(),
            recommendation: z.string().min(1),
        })
    ).default([]),
    overallScore: z.number().min(0).max(100),
    summary: z.string().min(10),
    investorImpactSummary: z.string().min(10),
});

// ─── Risk Assessment Output Schema ───────────────────────────

export const RiskAssessmentSchema = z.object({
    riskScore: z.number().min(0).max(100),
    riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    liquidityRisk: z.string().min(5),
    holderRisk: z.string().min(5),
    contractRiskInfluence: z.string().min(5),
    keyWarnings: z.array(z.string()).default([]),
    summary: z.string().min(10),
    ai_insights_panel: z.object({
        liquidityHealth: z.string().min(5),
        liquidityTrend: z.string().min(3),
        exitRiskSignal: z.enum(['LOW', 'MEDIUM', 'HIGH']),
        investorInterpretation: z.string().min(10),
    }).optional(),
    riskData: z.array(
        z.object({
            category: z.string(),
            risk: z.number().min(0).max(100),
        })
    ).optional(),
    contractAnalysis: z.object({
        overallScore: z.number().min(0).max(100),
        summary: z.string(),
    }).optional(),
});

// ─── Sentiment Assessment Output Schema ──────────────────────

export const SentimentAssessmentSchema = z.object({
    overallSentiment: z.enum(['BULLISH', 'NEUTRAL', 'BEARISH']),
    sentimentScore: z.number().min(-1).max(1),
    confidenceDrivers: z.array(z.string()).min(1),
    redditSignal: z.string().min(5),
    newsSignal: z.string().min(5),
    webNarrative: z.string().min(5),
    dataQuality: z.enum(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']).optional(),
    keyDrivers: z.array(z.string()).min(1),
});

// ─── Supervisor Final Synthesis Schema ─────────────────────────

export const SupervisorSynthesisSchema = z.object({
    overallRisk: z.number().min(0).max(100),
    overallRating: z.enum(['SAFE', 'CAUTION', 'HIGH_RISK', 'CRITICAL']),
    confidence: z.number().min(0).max(1),
    keyFindings: z.array(z.string()).min(1),
    agentBreakdown: z.object({
        contract: z.any().optional(),
        risk: z.any().optional(),
        sentiment: z.any().optional()
    }),
    conflictsDetected: z.array(z.string()).default([]),
    _meta: z.object({
        supervisorLoops: z.number(),
        agentsExecuted: z.number(),
        usedTavily: z.boolean(),
        memoryHits: z.number()
    })
});

// ─── Validation Result Type ──────────────────────────────────

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the output passed schema validation
 * @property {Object|null} data - Parsed and validated data (null if invalid)
 * @property {string[]} errors - List of validation error messages
 * @property {boolean} degraded - Whether the output was force-corrected or partially valid
 * @property {string[]} warnings - Non-fatal quality issues
 */

// ─── Main Validator ──────────────────────────────────────────

/**
 * Validates LLM output against a Zod schema.
 * 
 * @param {string|Object} rawOutput - Raw LLM response (string or parsed object)
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {ValidationResult}
 */
export function validateOutput(rawOutput, schema = ContractAuditSchema) {
    const warnings = [];
    let parsed = rawOutput;

    // Step 1: Parse string to object if needed
    if (typeof rawOutput === 'string') {
        parsed = extractJSON(rawOutput);
        if (parsed === null) {
            return {
                valid: false,
                data: null,
                errors: ['Failed to extract JSON from LLM response'],
                degraded: true,
                warnings: ['Raw output was not valid JSON'],
            };
        }
    }

    // Step 2: Check for empty/low-information responses
    const qualityIssues = detectLowQuality(parsed);
    if (qualityIssues.length > 0) {
        warnings.push(...qualityIssues);
    }

    // Step 3: Validate against schema
    const result = schema.safeParse(parsed);

    if (result.success) {
        return {
            valid: true,
            data: result.data,
            errors: [],
            degraded: warnings.length > 0,
            warnings,
        };
    }

    // Step 4: Schema validation failed — try to repair
    const repaired = attemptRepair(parsed, result.error);
    const retryResult = schema.safeParse(repaired);

    if (retryResult.success) {
        warnings.push('Output required auto-repair to pass validation');
        return {
            valid: true,
            data: retryResult.data,
            errors: [],
            degraded: true,
            warnings,
        };
    }

    // Step 5: Even repair failed
    return {
        valid: false,
        data: null,
        errors: result.error.issues.map(
            (issue) => `${issue.path.join('.')}: ${issue.message}`
        ),
        degraded: true,
        warnings,
    };
}

/**
 * Generates a self-correction prompt for the LLM to fix its own output.
 * Used when the first attempt fails validation.
 * 
 * @param {string} originalOutput - The failed output
 * @param {string[]} errors - Validation errors
 * @returns {string} correction prompt
 */
export function buildCorrectionPrompt(originalOutput, errors) {
    return `Your previous response failed validation. Fix these errors and return ONLY valid JSON:

ERRORS:
${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

YOUR PREVIOUS OUTPUT:
${typeof originalOutput === 'string' ? originalOutput.substring(0, 2000) : JSON.stringify(originalOutput).substring(0, 2000)}

Return ONLY the corrected JSON object. No markdown, no explanations.`;
}

// ─── JSON Extraction ─────────────────────────────────────────

/**
 * Extracts JSON from LLM text that may contain markdown or extra text.
 * More robust than regex — handles nested objects.
 */
function extractJSON(text) {
    if (!text || typeof text !== 'string') return null;

    // Strip markdown code fences
    let cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

    // Try direct parse first
    try {
        return JSON.parse(cleaned);
    } catch { /* continue */ }

    // Find the outermost { ... } block
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        return null;
    }

    try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
    } catch {
        return null;
    }
}

// ─── Low Quality Detection ───────────────────────────────────

/**
 * Detects responses that are technically valid JSON but contain
 * placeholder, generic, or suspiciously low-effort content.
 */
function detectLowQuality(parsed) {
    const warnings = [];

    if (!parsed || typeof parsed !== 'object') {
        warnings.push('Output is null or not an object');
        return warnings;
    }

    // Check for suspiciously generic summaries
    const summary = parsed.summary || '';
    const genericPhrases = [
        'i don\'t have enough',
        'unable to analyze',
        'no data available',
        'cannot determine',
        'n/a',
    ];

    for (const phrase of genericPhrases) {
        if (summary.toLowerCase().includes(phrase)) {
            warnings.push(`Summary contains low-information phrase: "${phrase}"`);
        }
    }

    // Check for placeholder scores
    if (parsed.overallScore === 50 && (!parsed.vulnerabilities || parsed.vulnerabilities.length === 0)) {
        warnings.push('Score is exactly 50 with no vulnerabilities — possible default/placeholder');
    }

    // Check for empty vulnerability details
    if (parsed.vulnerabilities && Array.isArray(parsed.vulnerabilities)) {
        for (const vuln of parsed.vulnerabilities) {
            if (vuln.description && vuln.description.length < 15) {
                warnings.push(`Vulnerability "${vuln.name}" has suspiciously short description`);
            }
        }
    }

    return warnings;
}

// ─── Auto-Repair ─────────────────────────────────────────────

/**
 * Attempts to fix common schema issues without re-calling the LLM.
 */
function attemptRepair(parsed, zodError) {
    if (!parsed || typeof parsed !== 'object') return parsed;

    const repaired = { ...parsed };

    for (const issue of zodError.issues) {
        const path = issue.path;

        // Missing required string fields — add placeholder
        if (issue.code === 'invalid_type' && issue.expected === 'string') {
            setNestedValue(repaired, path, 'Data unavailable');
        }

        // Missing required number fields — add 0
        if (issue.code === 'invalid_type' && issue.expected === 'number') {
            setNestedValue(repaired, path, 0);
        }

        // Missing array — add empty
        if (issue.code === 'invalid_type' && issue.expected === 'array') {
            setNestedValue(repaired, path, []);
        }

        // Score out of range — clamp
        if (issue.code === 'too_small' || issue.code === 'too_big') {
            const current = getNestedValue(repaired, path);
            if (typeof current === 'number') {
                setNestedValue(repaired, path, Math.max(0, Math.min(100, current)));
            }
        }
    }

    // Ensure investorImpactSummary exists
    if (!repaired.investorImpactSummary) {
        repaired.investorImpactSummary = repaired.summary || 'Impact assessment unavailable.';
    }

    return repaired;
}

// ─── Nested Value Helpers ────────────────────────────────────

function setNestedValue(obj, path, value) {
    if (path.length === 0) return;
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
        if (current[path[i]] === undefined) current[path[i]] = {};
        current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
}

function getNestedValue(obj, path) {
    let current = obj;
    for (const key of path) {
        if (current === undefined || current === null) return undefined;
        current = current[key];
    }
    return current;
}

export default { validateOutput, buildCorrectionPrompt, ContractAuditSchema, RiskAssessmentSchema, SentimentAssessmentSchema, SupervisorSynthesisSchema };
