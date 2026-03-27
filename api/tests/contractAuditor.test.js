/**
 * contractAuditor.test.js — Deep Verification Tests for Contract Auditor Pipeline
 * 
 * Tests: happy path, tool failure, validator retry, legacy fallback,
 * confidence calibration, and failure simulation.
 * 
 * Run: node api/tests/contractAuditor.test.js
 */

import { validateOutput, buildCorrectionPrompt, ContractAuditSchema } from '../evaluation/outputValidator.js';
import { calculateConfidence, attachConfidence } from '../evaluation/confidenceScorer.js';
import { resilientExecute } from '../utils/resilientToolExecutor.js';
import { createTracker } from '../observability/agentMetrics.js';
import dotenv from 'dotenv';
dotenv.config();

// ─── Test Framework (minimal, no external deps) ─────────────

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
    results.push({ name, fn });
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

async function runTests() {
    // Suppress module logs during tests
    const origWarn = console.warn;
    const origError = console.error;
    const origLog = console.log;
    const failures = [];

    console.log('\n═══════════════════════════════════════════════════');
    console.log(' Contract Auditor Pipeline — Deep Verification');
    console.log('═══════════════════════════════════════════════════\n');

    for (const { name, fn } of results) {
        // Suppress noisy module logs during each test
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

        // Restore for between-test output
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
// SECTION 1: OUTPUT VALIDATOR TESTS
// ═══════════════════════════════════════════════════════════════

test('Validator: accepts valid contract audit output', () => {
    const validOutput = {
        vulnerabilities: [
            { id: 1, name: 'Reentrancy', description: 'Found reentrancy in transfer()', severity: 'high', recommendation: 'Use ReentrancyGuard' }
        ],
        overallScore: 45,
        summary: 'Contract has a critical reentrancy vulnerability in the transfer function.',
        investorImpactSummary: 'Your funds could be stolen through a reentrancy attack on the transfer function.',
    };

    const result = validateOutput(validOutput, ContractAuditSchema);
    assert(result.valid === true, `Expected valid=true, got ${result.valid}`);
    assert(result.data !== null, 'Data should not be null');
    assert(result.errors.length === 0, `Expected 0 errors, got ${result.errors.length}`);
});

test('Validator: rejects output with missing required fields', () => {
    const invalidOutput = {
        vulnerabilities: [],
        overallScore: 50,
        // missing: summary, investorImpactSummary
    };

    const result = validateOutput(invalidOutput, ContractAuditSchema);
    // Should either repair or fail
    assert(result.degraded === true || result.valid === false, 'Should be degraded or invalid');
});

test('Validator: handles malformed JSON string', () => {
    const malformed = 'This is not JSON at all, just random text from LLM';
    const result = validateOutput(malformed, ContractAuditSchema);
    assert(result.valid === false, 'Should be invalid for non-JSON');
    assert(result.errors.length > 0, 'Should have errors');
});

test('Validator: extracts JSON from markdown code block', () => {
    const wrapped = '```json\n{"vulnerabilities":[],"overallScore":75,"summary":"Contract looks safe with minor issues.","investorImpactSummary":"Low risk for investors."}\n```';
    const result = validateOutput(wrapped, ContractAuditSchema);
    assert(result.valid === true, `Expected valid=true for markdown-wrapped JSON, got ${result.valid}. Errors: ${result.errors}`);
});

test('Validator: clamps out-of-range scores', () => {
    const outOfRange = {
        vulnerabilities: [],
        overallScore: 150, // out of range
        summary: 'Everything is perfectly safe with no issues whatsoever.',
        investorImpactSummary: 'No risk at all for investors.',
    };

    const result = validateOutput(outOfRange, ContractAuditSchema);
    // Should either repair (clamp to 100) or reject
    if (result.valid) {
        assert(result.data.overallScore <= 100, `Score should be clamped, got ${result.data.overallScore}`);
    }
});

test('Validator: detects low-quality placeholder responses', () => {
    const lowQuality = {
        vulnerabilities: [],
        overallScore: 50,
        summary: 'Unable to analyze the contract, I don\'t have enough data to provide a meaningful assessment.',
        investorImpactSummary: 'Cannot determine impact.',
    };

    const result = validateOutput(lowQuality, ContractAuditSchema);
    assert(result.warnings.length > 0, 'Should flag low-quality responses with warnings');
});

test('Validator: buildCorrectionPrompt creates valid prompt', () => {
    const prompt = buildCorrectionPrompt('bad output', ['Missing field: summary']);
    assert(typeof prompt === 'string', 'Prompt should be a string');
    assert(prompt.includes('summary'), 'Prompt should reference the missing field');
    assert(prompt.length > 50, 'Prompt should be substantial');
});

// ═══════════════════════════════════════════════════════════════
// SECTION 2: CONFIDENCE SCORER TESTS
// ═══════════════════════════════════════════════════════════════

test('Confidence: perfect data gives high confidence', () => {
    const result = calculateConfidence({
        toolsAttempted: 3,
        toolsSucceeded: 3,
        expectedFields: ['vulnerabilities', 'overallScore', 'summary', 'investorImpactSummary'],
        actualOutput: { vulnerabilities: [], overallScore: 85, summary: 'Safe', investorImpactSummary: 'Low risk' },
        validationPassed: true,
        wasDegraded: false,
        usedLiveData: true,
        missingDataSources: [],
    });

    assert(result.confidence >= 0.9, `Expected high confidence, got ${result.confidence}`);
    assert(result.riskLevel === 'LOW', `Expected LOW risk, got ${result.riskLevel}`);
    assert(result.penalties.length === 0, 'Should have no penalties');
});

test('Confidence: partial tool failure reduces confidence', () => {
    const result = calculateConfidence({
        toolsAttempted: 3,
        toolsSucceeded: 1,
        expectedFields: ['vulnerabilities', 'overallScore', 'summary', 'investorImpactSummary'],
        actualOutput: { vulnerabilities: [], overallScore: 50, summary: 'Partial analysis', investorImpactSummary: 'Unclear' },
        validationPassed: true,
        wasDegraded: false,
        usedLiveData: true,
        missingDataSources: ['etherscan'],
    });

    assert(result.confidence < 0.8, `Expected reduced confidence, got ${result.confidence}`);
    assert(result.penalties.length > 0, 'Should have penalties for missing sources');
});

test('Confidence: zero tools gives very low confidence', () => {
    const result = calculateConfidence({
        toolsAttempted: 0,
        toolsSucceeded: 0,
        expectedFields: ['vulnerabilities', 'overallScore'],
        actualOutput: { overallScore: 50 },
        validationPassed: false,
        wasDegraded: true,
        usedLiveData: false,
        missingDataSources: ['etherscan', 'static_analysis'],
    });

    assert(result.confidence < 0.4, `Expected very low confidence, got ${result.confidence}`);
    assert(result.riskLevel === 'HIGH', `Expected HIGH risk, got ${result.riskLevel}`);
});

test('Confidence: degraded validation reduces confidence', () => {
    const clean = calculateConfidence({
        toolsAttempted: 3, toolsSucceeded: 3,
        expectedFields: [], actualOutput: {},
        validationPassed: true, wasDegraded: false,
        usedLiveData: true, missingDataSources: [],
    });

    const degraded = calculateConfidence({
        toolsAttempted: 3, toolsSucceeded: 3,
        expectedFields: [], actualOutput: {},
        validationPassed: true, wasDegraded: true,
        usedLiveData: true, missingDataSources: [],
    });

    assert(degraded.confidence < clean.confidence,
        `Degraded (${degraded.confidence}) should be lower than clean (${clean.confidence})`);
});

test('Confidence: attachConfidence adds _meta correctly', () => {
    const output = { overallScore: 70 };
    const conf = calculateConfidence({
        toolsAttempted: 2, toolsSucceeded: 2,
        expectedFields: [], actualOutput: {},
        validationPassed: true, wasDegraded: false,
        usedLiveData: true, missingDataSources: [],
    });

    const result = attachConfidence(output, conf);
    assert(result._meta !== undefined, '_meta should exist');
    assert(typeof result._meta.confidence === 'number', 'confidence should be a number');
    assert(result.overallScore === 70, 'Original data should be preserved');
});

// ═══════════════════════════════════════════════════════════════
// SECTION 3: CONFIDENCE CALIBRATION ANALYSIS
// ═══════════════════════════════════════════════════════════════

test('Calibration: confidence >0.9 should be rare without perfect data', () => {
    // Simulate a scenario where Etherscan is down (1 of 3 tools failed)
    const result = calculateConfidence({
        toolsAttempted: 3,
        toolsSucceeded: 2,
        expectedFields: ['vulnerabilities', 'overallScore', 'summary', 'investorImpactSummary'],
        actualOutput: { vulnerabilities: [], overallScore: 65, summary: 'Analysis based on static scan only', investorImpactSummary: 'Partial analysis' },
        validationPassed: true,
        wasDegraded: false,
        usedLiveData: true,
        missingDataSources: ['etherscan'],
    });

    assert(result.confidence < 0.90,
        `Confidence should be <0.90 when 1/3 tools fails, got ${result.confidence}`);
});

test('Calibration: cached/fallback data should lower confidence', () => {
    const live = calculateConfidence({
        toolsAttempted: 3, toolsSucceeded: 3,
        expectedFields: [], actualOutput: {},
        validationPassed: true, wasDegraded: false,
        usedLiveData: true, missingDataSources: [],
    });
    const cached = calculateConfidence({
        toolsAttempted: 3, toolsSucceeded: 3,
        expectedFields: [], actualOutput: {},
        validationPassed: true, wasDegraded: false,
        usedLiveData: false, missingDataSources: [],
    });

    assert(cached.confidence < live.confidence,
        `Cached (${cached.confidence}) should be lower than live (${live.confidence})`);
});

// ═══════════════════════════════════════════════════════════════
// SECTION 4: RESILIENT TOOL EXECUTOR TESTS
// ═══════════════════════════════════════════════════════════════

test('ResilientExecutor: successful call returns data', async () => {
    const result = await resilientExecute(
        () => Promise.resolve({ contractName: 'Test' }),
        { toolName: 'test_tool', maxRetries: 2, timeoutMs: 5000 }
    );

    assert(result.success === true, 'Should succeed');
    assert(result.data.contractName === 'Test', 'Data should be preserved');
    assert(result.attempts === 1, `Should take 1 attempt, got ${result.attempts}`);
});

test('ResilientExecutor: retries on transient failure then succeeds', async () => {
    let callCount = 0;
    const result = await resilientExecute(
        () => {
            callCount++;
            if (callCount < 3) throw new Error('Server error 500');
            return Promise.resolve({ recovered: true });
        },
        { toolName: 'retry_test', maxRetries: 3, timeoutMs: 5000 }
    );

    assert(result.success === true, 'Should eventually succeed');
    assert(result.attempts === 3, `Should take 3 attempts, got ${result.attempts}`);
});

test('ResilientExecutor: returns fallback after all retries exhausted', async () => {
    const result = await resilientExecute(
        () => Promise.reject(new Error('Permanent failure 500')),
        { toolName: 'fail_test', maxRetries: 2, timeoutMs: 5000, fallbackValue: { fallback: true } }
    );

    assert(result.success === false, 'Should report failure');
    assert(result.data.fallback === true, 'Should return fallback value');
    assert(result.error !== null, 'Should have error details');
    assert(result.error.tool === 'fail_test', 'Error should tag the tool');
});

test('ResilientExecutor: respects timeout', async () => {
    const start = Date.now();
    const result = await resilientExecute(
        () => new Promise((resolve) => setTimeout(resolve, 10000)), // 10s operation
        { toolName: 'timeout_test', maxRetries: 1, timeoutMs: 1000, fallbackValue: null }
    );
    const elapsed = Date.now() - start;

    assert(result.success === false, 'Should fail on timeout');
    assert(elapsed < 5000, `Should timeout quickly, took ${elapsed}ms`);
});

test('ResilientExecutor: does not retry on auth errors', async () => {
    let callCount = 0;
    const result = await resilientExecute(
        () => {
            callCount++;
            return Promise.reject(new Error('401 Unauthorized'));
        },
        { toolName: 'auth_test', maxRetries: 3, timeoutMs: 5000, fallbackValue: null }
    );

    assert(result.success === false, 'Should fail');
    assert(callCount === 1, `Should NOT retry auth errors, called ${callCount} times`);
});

// ═══════════════════════════════════════════════════════════════
// SECTION 5: FAILURE SIMULATION
// ═══════════════════════════════════════════════════════════════

test('FailSim: Etherscan failure → confidence adjusts down', () => {
    // Simulate: Etherscan tool failed, static analysis worked, code parser worked
    const result = calculateConfidence({
        toolsAttempted: 3,
        toolsSucceeded: 2,
        expectedFields: ['vulnerabilities', 'overallScore', 'summary', 'investorImpactSummary'],
        actualOutput: {
            vulnerabilities: [{ id: 1, name: 'Unverified', description: 'Source not available', severity: 'high', recommendation: 'Verify source' }],
            overallScore: 30,
            summary: 'Could not verify source code due to Etherscan failure',
            investorImpactSummary: 'Source code unverified',
        },
        validationPassed: true,
        wasDegraded: false,
        usedLiveData: true,
        missingDataSources: ['etherscan'],
    });

    assert(result.confidence <= 0.85, `Etherscan failure should drop confidence to ≤0.85, got ${result.confidence}`);
    assert(result.penalties.some(p => p.includes('etherscan')), 'Should have etherscan penalty');
});

test('FailSim: malformed LLM output → handled by validator', () => {
    const malformed = '{"vulnerabilities": "not an array", "overallScore": "high"}';
    const result = validateOutput(malformed, ContractAuditSchema);

    // Should either repair or report clean errors, but NEVER throw
    assert(result.degraded === true || result.valid === false, 'Should handle gracefully');
    if (!result.valid) {
        assert(result.errors.length > 0, 'Should have descriptive errors');
    }
});

test('FailSim: all tools fail → very low confidence', () => {
    const result = calculateConfidence({
        toolsAttempted: 3,
        toolsSucceeded: 0,
        expectedFields: ['vulnerabilities', 'overallScore', 'summary', 'investorImpactSummary'],
        actualOutput: { overallScore: 50, summary: 'No data', investorImpactSummary: 'Unknown' },
        validationPassed: true,
        wasDegraded: true,
        usedLiveData: false,
        missingDataSources: ['etherscan', 'static_analysis', 'code_parser'],
    });

    assert(result.confidence < 0.3, `All-fail scenario should give <0.3 confidence, got ${result.confidence}`);
    assert(result.riskLevel === 'HIGH', `Should flag as HIGH risk, got ${result.riskLevel}`);
});

// ═══════════════════════════════════════════════════════════════
// SECTION 6: METRICS TRACKER TESTS
// ═══════════════════════════════════════════════════════════════

test('Metrics: tracker records tool calls correctly', () => {
    const tracker = createTracker('test_agent');

    tracker.recordToolCall('etherscan_fetch', true, 1500, 1);
    tracker.recordToolCall('static_analysis', false, 500, 2);
    tracker.recordReasoningStep();
    tracker.recordReasoningStep();

    const metrics = tracker.finalize(true);

    assert(metrics.toolCalls.total === 2, `Expected 2 tool calls, got ${metrics.toolCalls.total}`);
    assert(metrics.toolCalls.succeeded === 1, `Expected 1 success, got ${metrics.toolCalls.succeeded}`);
    assert(metrics.toolCalls.failed === 1, `Expected 1 failure, got ${metrics.toolCalls.failed}`);
    assert(metrics.retryCount === 1, `Expected 1 retry, got ${metrics.retryCount}`);
    assert(metrics.reasoningSteps === 2, `Expected 2 reasoning steps, got ${metrics.reasoningSteps}`);
    assert(metrics.correlationId !== undefined, 'Should have correlation ID');
});

// ═══════════════════════════════════════════════════════════════
// RUN ALL TESTS
// ═══════════════════════════════════════════════════════════════

runTests();
