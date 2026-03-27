/**
 * riskAssessor.test.js — Test Suite for Risk Assessor Agent Pipeline
 * 
 * Follows Contract Auditor test template.
 * Tests: happy path, failure cases, calibration checks.
 * 
 * Run: node api/tests/riskAssessor.test.js
 */

import { validateOutput, buildCorrectionPrompt, RiskAssessmentSchema } from '../evaluation/outputValidator.js';
import { calculateConfidence, attachConfidence } from '../evaluation/confidenceScorer.js';
import { resilientExecute } from '../utils/resilientToolExecutor.js';
import { createTracker } from '../observability/agentMetrics.js';
import dotenv from 'dotenv';
dotenv.config();

// ─── Test Framework ──────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];
const failures = [];

function test(name, fn) {
    results.push({ name, fn });
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

async function runTests() {
    const origWarn = console.warn;
    const origError = console.error;
    const origLog = console.log;

    console.log('\n═══════════════════════════════════════════════════');
    console.log(' Risk Assessor Agent — Test Suite');
    console.log('═══════════════════════════════════════════════════\n');

    for (const { name, fn } of results) {
        console.warn = () => { };
        console.error = () => { };
        console.log = () => { };

        try {
            await fn();
            passed++;
            console.log = origLog;
            console.log(`  ✅ ${name}`);
        } catch (err) {
            failed++;
            console.log = origLog;
            console.log(`  ❌ ${name}`);
            console.log(`     → ${err.message}`);
            failures.push({ name, error: err.message });
        }

        console.warn = origWarn;
        console.error = origError;
        console.log = origLog;
    }

    console.log('\n───────────────────────────────────────────────────');
    console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
    if (failures.length > 0) {
        console.log('\n  FAILURES:');
        for (const f of failures) {
            console.log(`  • ${f.name}`);
            console.log(`    ${f.error}`);
        }
    }
    console.log('───────────────────────────────────────────────────\n');

    process.exit(failed > 0 ? 1 : 0);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: OUTPUT SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════════

test('Schema: accepts valid risk assessment output', () => {
    const valid = {
        riskScore: 65,
        riskLevel: 'HIGH',
        liquidityRisk: 'Liquidity is critically low at $3,200 — high exit risk',
        holderRisk: 'Top holder concentration estimated at HIGH due to low liquidity-to-cap ratio',
        contractRiskInfluence: 'No prior contract audit found — treating as elevated risk',
        keyWarnings: ['Liquidity under $5K', 'No contract audit available'],
        summary: 'This token shows significant risk due to low liquidity, concentrated holder base, and unaudited contract.',
    };

    const result = validateOutput(valid, RiskAssessmentSchema);
    assert(result.valid === true, `Expected valid=true, got ${result.valid}. Errors: ${result.errors}`);
    assert(result.data !== null, 'Data should not be null');
});

test('Schema: accepts full output with backward-compatible fields', () => {
    const full = {
        riskScore: 35,
        riskLevel: 'MEDIUM',
        liquidityRisk: 'Moderate liquidity at $50K — sufficient for small trades',
        holderRisk: 'Moderate concentration risk detected',
        contractRiskInfluence: 'Contract audit score: 75 — minor issues only',
        keyWarnings: ['Moderate holder concentration'],
        summary: 'This well-established token has moderate risk markers across categories.',
        ai_insights_panel: {
            liquidityHealth: 'Liquidity is adequate relative to market cap',
            liquidityTrend: 'Stable',
            exitRiskSignal: 'LOW',
            investorInterpretation: 'You can likely sell small amounts without significant price impact.',
        },
        riskData: [
            { category: 'Contract Risk', risk: 25 },
            { category: 'Liquidity Risk', risk: 35 },
            { category: 'Market Sentiment', risk: 40 },
        ],
        contractAnalysis: {
            overallScore: 75,
            summary: 'Contract is well-written with minor issues.',
        },
    };

    const result = validateOutput(full, RiskAssessmentSchema);
    assert(result.valid === true, `Expected valid=true, got ${result.valid}. Errors: ${result.errors}`);
});

test('Schema: rejects output missing critical fields', () => {
    const invalid = {
        riskScore: 50,
        // missing: riskLevel, liquidityRisk, holderRisk, contractRiskInfluence, summary
    };

    const result = validateOutput(invalid, RiskAssessmentSchema);
    assert(result.degraded === true || result.valid === false, 'Should be degraded or invalid');
});

test('Schema: handles string input (JSON in markdown)', () => {
    const wrapped = '```json\n{"riskScore":75,"riskLevel":"HIGH","liquidityRisk":"Very low liquidity detected","holderRisk":"High whale concentration","contractRiskInfluence":"No audit available","keyWarnings":["Low liquidity"],"summary":"High risk token with multiple red flags across all categories."}\n```';
    const result = validateOutput(wrapped, RiskAssessmentSchema);
    assert(result.valid === true, `Expected valid=true for wrapped JSON, got ${result.valid}. Errors: ${result.errors}`);
});

test('Schema: rejects invalid riskLevel enum', () => {
    const badEnum = {
        riskScore: 50,
        riskLevel: 'EXTREME', // not in enum
        liquidityRisk: 'Some risk here',
        holderRisk: 'Some holder risk',
        contractRiskInfluence: 'Some contract risk',
        keyWarnings: [],
        summary: 'This is the summary of the risk assessment.',
    };

    const result = validateOutput(badEnum, RiskAssessmentSchema);
    assert(result.valid === false, 'Should reject invalid riskLevel enum');
});

test('Schema: clamps out-of-range riskScore', () => {
    const outOfRange = {
        riskScore: 150,
        riskLevel: 'CRITICAL',
        liquidityRisk: 'Extremely dangerous liquidity levels',
        holderRisk: 'Extreme concentration risk identified',
        contractRiskInfluence: 'Contract is flagged as high risk',
        keyWarnings: [],
        summary: 'This token is extremely high risk and should be avoided entirely.',
    };

    const result = validateOutput(outOfRange, RiskAssessmentSchema);
    if (result.valid) {
        assert(result.data.riskScore <= 100, `Score should be clamped, got ${result.data.riskScore}`);
    }
});

// ═══════════════════════════════════════════════════════════════
// SECTION 2: CONFIDENCE SCORING FOR RISK DOMAIN
// ═══════════════════════════════════════════════════════════════

test('Confidence: perfect risk data gives high confidence', () => {
    const result = calculateConfidence({
        toolsAttempted: 3,
        toolsSucceeded: 3,
        expectedFields: ['riskScore', 'riskLevel', 'liquidityRisk', 'holderRisk', 'contractRiskInfluence', 'keyWarnings', 'summary'],
        actualOutput: {
            riskScore: 65, riskLevel: 'HIGH',
            liquidityRisk: 'Low', holderRisk: 'High',
            contractRiskInfluence: 'None', keyWarnings: ['Warning'], summary: 'Summary',
        },
        validationPassed: true,
        wasDegraded: false,
        usedLiveData: true,
        missingDataSources: [],
    });

    assert(result.confidence >= 0.9, `Expected high confidence, got ${result.confidence}`);
    assert(result.riskLevel === 'LOW', `Expected LOW risk level for high confidence, got ${result.riskLevel}`);
});

test('Confidence: DexScreener failure reduces confidence', () => {
    const result = calculateConfidence({
        toolsAttempted: 3,
        toolsSucceeded: 2,
        expectedFields: ['riskScore', 'riskLevel', 'liquidityRisk', 'holderRisk', 'summary'],
        actualOutput: {
            riskScore: 50, riskLevel: 'MEDIUM',
            liquidityRisk: 'Unknown', holderRisk: 'Partial',
            summary: 'Partial analysis',
        },
        validationPassed: true,
        wasDegraded: false,
        usedLiveData: true,
        missingDataSources: ['dexscreener'],
    });

    assert(result.confidence <= 0.85, `Should drop to ≤0.85, got ${result.confidence}`);
    assert(result.penalties.some(p => p.includes('dexscreener')), 'Should have dexscreener penalty');
});

test('Confidence: all tools fail → hard cap', () => {
    const result = calculateConfidence({
        toolsAttempted: 3,
        toolsSucceeded: 0,
        expectedFields: ['riskScore', 'riskLevel', 'summary'],
        actualOutput: { riskScore: 50 },
        validationPassed: true,
        wasDegraded: true,
        usedLiveData: false,
        missingDataSources: ['dexscreener', 'token_holders', 'contract_risk'],
    });

    assert(result.confidence <= 0.25, `Zero-tool cap should apply, got ${result.confidence}`);
    assert(result.riskLevel === 'HIGH', `Should be HIGH risk, got ${result.riskLevel}`);
});

test('Confidence: partial tools → mid cap', () => {
    const result = calculateConfidence({
        toolsAttempted: 3,
        toolsSucceeded: 1,
        expectedFields: ['riskScore', 'riskLevel', 'liquidityRisk', 'summary'],
        actualOutput: {
            riskScore: 60, riskLevel: 'HIGH',
            liquidityRisk: 'Low liquidity', summary: 'High risk',
        },
        validationPassed: true,
        wasDegraded: false,
        usedLiveData: true,
        missingDataSources: [],
    });

    assert(result.confidence <= 0.60, `<50% tools cap at 0.60, got ${result.confidence}`);
});

// ═══════════════════════════════════════════════════════════════
// SECTION 3: FAILURE SIMULATION
// ═══════════════════════════════════════════════════════════════

test('FailSim: DexScreener timeout → resilient handling', async () => {
    const result = await resilientExecute(
        () => new Promise((resolve) => setTimeout(resolve, 10000)),
        { toolName: 'dexscreener_fetch', maxRetries: 1, timeoutMs: 1000, fallbackValue: null }
    );

    assert(result.success === false, 'Should fail on timeout');
    assert(result.error !== null, 'Should have error details');
});

test('FailSim: holder data API error → structured result', async () => {
    const result = await resilientExecute(
        () => Promise.reject(new Error('Network error: ECONNREFUSED')),
        { toolName: 'token_holders', maxRetries: 2, timeoutMs: 5000, fallbackValue: { fallback: true } }
    );

    assert(result.success === false, 'Should fail');
    assert(result.data.fallback === true, 'Should return fallback');
    assert(result.error.tool === 'token_holders', 'Should tag the tool');
});

test('FailSim: malformed risk LLM output → validator handles', () => {
    const malformed = '{"riskScore": "high", "riskLevel": 42}';
    const result = validateOutput(malformed, RiskAssessmentSchema);

    assert(result.degraded === true || result.valid === false, 'Should handle gracefully');
});

test('FailSim: contract lookup missing → confidence drops', () => {
    const result = calculateConfidence({
        toolsAttempted: 3,
        toolsSucceeded: 2,
        expectedFields: ['riskScore', 'riskLevel', 'contractRiskInfluence', 'summary'],
        actualOutput: {
            riskScore: 55, riskLevel: 'HIGH',
            contractRiskInfluence: 'Unknown — no audit data',
            summary: 'Assessment limited due to missing contract audit',
        },
        validationPassed: true,
        wasDegraded: false,
        usedLiveData: true,
        missingDataSources: ['contract_risk'],
    });

    assert(result.confidence <= 0.85, `Missing contract lookup should lower confidence, got ${result.confidence}`);
});

// ═══════════════════════════════════════════════════════════════
// SECTION 4: METRICS TRACKER
// ═══════════════════════════════════════════════════════════════

test('Metrics: riskAssessor tracker works correctly', () => {
    const tracker = createTracker('riskAssessor');

    tracker.recordToolCall('dexscreener_fetch', true, 2000, 1);
    tracker.recordToolCall('token_holders_analysis', true, 50, 1);
    tracker.recordToolCall('contract_risk_lookup', false, 500, 2);
    tracker.recordReasoningStep();
    tracker.recordReasoningStep();
    tracker.recordReasoningStep();

    const metrics = tracker.finalize(true);

    assert(metrics.agentName === 'riskAssessor', `Agent name should be riskAssessor, got ${metrics.agentName}`);
    assert(metrics.toolCalls.total === 3, `Expected 3 tool calls, got ${metrics.toolCalls.total}`);
    assert(metrics.toolCalls.succeeded === 2, `Expected 2 successes, got ${metrics.toolCalls.succeeded}`);
    assert(metrics.reasoningSteps === 3, `Expected 3 reasoning steps, got ${metrics.reasoningSteps}`);
    assert(metrics.correlationId !== undefined, 'Should have correlation ID');
});

// ═══════════════════════════════════════════════════════════════
// SECTION 5: INTEGRATION CHECKS
// ═══════════════════════════════════════════════════════════════

test('Integration: buildCorrectionPrompt works for risk errors', () => {
    const prompt = buildCorrectionPrompt('{"riskScore": "abc"}', [
        'riskScore: Expected number, received string',
        'riskLevel: Required',
    ]);

    assert(typeof prompt === 'string', 'Should return a string');
    assert(prompt.includes('riskScore'), 'Should reference failing field');
    assert(prompt.includes('riskLevel'), 'Should reference missing field');
});

test('Integration: confidence attaches _meta correctly', () => {
    const conf = calculateConfidence({
        toolsAttempted: 3, toolsSucceeded: 3,
        expectedFields: [], actualOutput: {},
        validationPassed: true, wasDegraded: false,
        usedLiveData: true, missingDataSources: [],
    });

    const output = { riskScore: 50, riskLevel: 'MEDIUM' };
    const result = attachConfidence(output, conf);

    assert(result._meta !== undefined, '_meta should exist');
    assert(typeof result._meta.confidence === 'number', 'confidence should be a number');
    assert(result._meta.factors !== undefined, 'factors should exist');
    assert(result.riskScore === 50, 'Original data preserved');
});

// ═══════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════

runTests();
