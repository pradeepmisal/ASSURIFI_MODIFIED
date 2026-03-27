/**
 * supervisor.agent.js — The Central Intelligence Layer
 * 
 * Orchestrates the Contract Auditor, Risk Assessor, and Sentiment Analyst.
 * Enforces strict safety limits to prevent runaway autonomous behavior.
 */

import { getPrimaryLLM } from '../config/llm.config.js';
import { runContractAuditAgent } from './contractAuditor.agent.js';
import { runRiskAssessorAgent } from './riskAssessor.agent.js';
import { runSentimentAnalystAgent } from './sentimentAnalyst.agent.js';
import { detectConflicts } from '../evaluation/contradictionChecker.js';
import { findSimilarRiskPatterns, saveMemory } from '../memory/vectorMemory.js';
import { validateOutput, buildCorrectionPrompt, SupervisorSynthesisSchema } from '../evaluation/outputValidator.js';
import { SUPERVISOR_PLANNER_PROMPT, buildSynthesisUserMessage } from '../prompts/supervisor.prompt.js';
import { HumanMessage } from '@langchain/core/messages';

const AGENT_MAP = {
    contractAuditor: runContractAuditAgent,
    riskAssessor: runRiskAssessorAgent,
    sentimentAnalyst: runSentimentAnalystAgent
};

/**
 * Executes the Autonomous Supervisor Pipeline
 * 
 * @param {string} tokenName - The token to analyze
 * @param {string} query - The user's specific request context
 * @param {Function} emitEvent - SSE Streaming callback
 */
export async function runSupervisor(tokenName, query = 'Full security scan', emitEvent = () => { }) {
    let loopCount = 0;
    const MAX_LOOPS = 2; // HARD LIMIT
    let requeryCount = 0;
    const MAX_REQUERY = 1; // HARD LIMIT
    const MAX_PARALLEL = 3; // HARD LIMIT
    let usedTavily = false;

    // ─── 1. Planning Phase ────────────────────────────────────────────────────────
    emitEvent('supervisor_plan', { status: 'analyzing', query });
    const llm = getPrimaryLLM({ temperature: 0.1 });

    let planStr = '';
    try {
        const planResponse = await llm.invoke([
            new HumanMessage(SUPERVISOR_PLANNER_PROMPT + `\n\nUSER QUERY: ${query}`)
        ]);
        planStr = planResponse.content || '';
    } catch (e) {
        console.warn('[Supervisor] Planner LLM failed, defaulting to all agents.', e.message);
        planStr = 'contractAuditor,riskAssessor,sentimentAnalyst';
    }

    // Parse plan, strictly cap parallel execution
    let targetAgents = planStr.split(',').map(s => s.trim()).filter(a => AGENT_MAP[a]);
    if (targetAgents.length === 0) targetAgents = ['contractAuditor', 'riskAssessor', 'sentimentAnalyst']; // Fallback
    if (targetAgents.length > MAX_PARALLEL) targetAgents = targetAgents.slice(0, MAX_PARALLEL);

    emitEvent('supervisor_plan', { status: 'planned', agents: targetAgents });

    let agentResults = {};

    // Helper: Enforce an absolute global timeout on any agent
    const runWithTimeout = (promise, ms, agentName) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`[${agentName}] timed out after ${ms}ms`)), ms))
        ]);
    };

    // ─── 2. Parallel Execution Setup ──────────────────────────────────────────────
    const executeAgent = async (agentName, isRequery = false) => {
        emitEvent(isRequery ? 'requery_started' : 'agent_started', { agent: agentName });
        const start = Date.now();
        try {
            let agentPayload = tokenName;
            const isAddress = tokenName.startsWith('0x') && tokenName.length >= 40;

            if (agentName === 'contractAuditor') {
                agentPayload = isAddress
                    ? { address: tokenName, name: 'Unknown Token' }
                    : { name: tokenName };
            } else if (agentName === 'riskAssessor') {
                agentPayload = isAddress
                    ? { token_address: tokenName, smart_contract_address: tokenName, token_name: 'Unknown Token', chainId: 'ethereum' }
                    : { token_name: tokenName };
            }

            // Using a strict 60s global timeout to prevent infinite SSE stalls
            const result = await runWithTimeout(
                AGENT_MAP[agentName](agentPayload),
                60000,
                agentName
            );

            // Sub-agents set this in their _meta
            if (result._meta?.usedTavily) usedTavily = true;

            emitEvent(isRequery ? 'requery_completed' : 'agent_completed', { agent: agentName, latency: Date.now() - start, success: true });
            return { agent: agentName, data: result };
        } catch (e) {
            emitEvent(isRequery ? 'requery_failed' : 'agent_failed', { agent: agentName, latency: Date.now() - start, success: false, error: e.message });
            return { agent: agentName, error: e.message };
        }
    };

    // Initial Execution using Promise.allSettled to isolate partial failures
    let initialPromises = targetAgents.map(a => executeAgent(a));
    let settled = await Promise.allSettled(initialPromises);

    settled.forEach(res => {
        if (res.status === 'fulfilled' && res.value.data) {
            agentResults[res.value.agent] = res.value.data;
        } else {
            // Store the error object for the synthesis engine to see
            const agentName = res.status === 'fulfilled' ? res.value.agent : 'unknown';
            agentResults[agentName] = { error: res.reason?.message || res.value?.error || 'Unknown Error' };
        }
    });

    let conflicts = [];

    // ─── 3. Conflict Resolution Loop ──────────────────────────────────────────────
    while (loopCount < MAX_LOOPS) {
        loopCount++;

        const check = detectConflicts(
            agentResults['contractAuditor']?.error ? null : agentResults['contractAuditor'],
            agentResults['riskAssessor']?.error ? null : agentResults['riskAssessor'],
            agentResults['sentimentAnalyst']?.error ? null : agentResults['sentimentAnalyst']
        );

        conflicts = check.reasons;

        if (check.hasConflict) {
            emitEvent('conflict_detected', { reasons: check.reasons, action: check.resolutionAction });

            // Strict Re-query limits
            if (check.resolutionAction === 'requery' && check.targetAgent && requeryCount < MAX_REQUERY) {
                requeryCount++;
                emitEvent('requery_triggered', { agent: check.targetAgent });

                // Re-run the conflicting agent sequentially
                const requeryRes = await executeAgent(check.targetAgent, true);
                if (requeryRes.data) {
                    agentResults[check.targetAgent] = requeryRes.data;
                } else {
                    agentResults[check.targetAgent] = { error: requeryRes.error || 'Requery failed' };
                }

                continue; // Loop again to re-check conflicts with new data
            }
        }

        break; // Exit loop if no conflicts, bounded action taken, or limits hit
    }

    // ─── 4. Vector Memory Search ──────────────────────────────────────────────────
    emitEvent('memory_lookup', { status: 'searching' });
    let memoryHits = [];
    try {
        const summaryArr = [
            agentResults.contractAuditor?.summary,
            agentResults.riskAssessor?.summary,
            agentResults.sentimentAnalyst?.summary
        ].filter(Boolean);

        if (summaryArr.length > 0) {
            memoryHits = await findSimilarRiskPatterns(summaryArr.join(' '), 3);
        }
        emitEvent('memory_lookup', { status: 'complete', hits: memoryHits.length });
    } catch (e) {
        emitEvent('memory_lookup', { status: 'failed', error: e.message });
    }

    // ─── 5. Final Intelligence Synthesis ──────────────────────────────────────────
    emitEvent('final_synthesis', { status: 'started' });

    const synthesisMsg = buildSynthesisUserMessage(tokenName, agentResults, conflicts, memoryHits, loopCount);
    let synthesisRaw;

    try {
        const rawRes = await llm.invoke([new HumanMessage(synthesisMsg)]);
        synthesisRaw = rawRes.content;
    } catch (e) {
        console.warn("[Supervisor] Final synthesis LLM crashed due to rate limits or API error. Falling back to static synthesis.", e.message);

        // Static Degraded Fallback to keep SSE stream alive
        const fallbackReport = {
            overallRiskScore: 75,
            securityLabel: "DEGRADED (HIGH RISK)",
            keyFindings: [
                "⚠️ LLM API Rate Limits Exceeded - Operating in degraded mode.",
                "Contract Auditor analysis was incomplete or timed out.",
                "Risk Assessor and Sentiment agents failed to reach consensus due to API constraints.",
                "Please proceed with extreme caution and manually verify this token."
            ],
            summary: "AssureFi Autonomous Supervisor entered degraded mode due to upstream API rate limits. Partial signals indicate potential high risk. Manual verification strongly advised.",
            agentBreakdown: agentResults,
            conflictsDetected: conflicts,
            _meta: {
                supervisorLoops: loopCount,
                agentsExecuted: targetAgents.length + requeryCount,
                usedTavily: usedTavily,
                memoryHits: memoryHits.length,
                degraded: true
            }
        };

        emitEvent('final_synthesis', { status: 'complete' });
        return fallbackReport;
    }

    let validation = validateOutput(synthesisRaw, SupervisorSynthesisSchema);

    // One-time self-correction retry
    if (!validation.valid) {
        emitEvent('final_synthesis', { status: 'retrying_validation' });
        try {
            const fixPrompt = buildCorrectionPrompt(synthesisRaw, validation.errors);
            const fixRaw = await llm.invoke([
                new HumanMessage(synthesisMsg),
                new HumanMessage(synthesisRaw),
                new HumanMessage(fixPrompt)
            ]);
            validation = validateOutput(fixRaw.content, SupervisorSynthesisSchema);
        } catch (e) { /* ignore retry error, fall through to schema failure */ }
    }

    if (!validation.valid) {
        console.warn(`[Supervisor] Final synthesis failed schema validation: ${validation.errors.join('; ')}. Using degraded fallback.`);

        const fallbackReport = {
            overallRiskScore: 60,
            securityLabel: "DEGRADED (MODERATE RISK)",
            keyFindings: [
                "⚠️ LLM produced malformed output. Operating in degraded mode.",
                "Contract Auditor analysis returned partial signals.",
                "Proceed with caution."
            ],
            summary: "Supervisor failed to format output correctly. Risk level is uncertain.",
            agentBreakdown: agentResults,
            conflictsDetected: conflicts,
            _meta: {
                supervisorLoops: loopCount,
                agentsExecuted: targetAgents.length + requeryCount,
                usedTavily: usedTavily,
                memoryHits: memoryHits.length,
                degraded: true
            }
        };

        emitEvent('final_synthesis', { status: 'complete' });
        return fallbackReport;
    }

    const finalReport = validation.data;

    // Inject exact state tracking into the final validated object
    finalReport.agentBreakdown = agentResults;
    finalReport.conflictsDetected = conflicts;
    finalReport._meta = {
        supervisorLoops: loopCount,
        agentsExecuted: targetAgents.length + requeryCount,
        usedTavily: usedTavily,
        memoryHits: memoryHits.length
    };

    emitEvent('final_synthesis', { status: 'complete' });

    // ─── 6. Save Vector Memory (Fire and forget) ──────────────────────────────────
    saveMemory(
        tokenName,
        agentResults.contractAuditor?.error ? null : agentResults.contractAuditor,
        agentResults.riskAssessor?.error ? null : agentResults.riskAssessor,
        agentResults.sentimentAnalyst?.error ? null : agentResults.sentimentAnalyst
    );

    return finalReport;
}

export default { runSupervisor };
