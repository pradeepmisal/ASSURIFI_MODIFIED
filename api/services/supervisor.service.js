import { runSupervisor } from '../agents/supervisor.agent.js';

/**
 * Service wrapper for the Autonomous Supervisor Agent.
 * Handles passing the SSE stream context to the agentic pipeline.
 * 
 * @param {string} tokenName - The token to analyze
 * @param {string} query - Optional user context/query
 * @param {import('express').Response} streamRes - Express response object for SSE (optional)
 */
export async function executeFullAnalysis(tokenName, query, streamRes = null) {
    const emitEvent = (event, data) => {
        if (streamRes && !streamRes.writableEnded) {
            try {
                // Formatting according to SSE specification
                streamRes.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
            } catch (e) {
                console.error('[SupervisorService] Failed to emit SSE event:', e.message);
            }
        }
    };

    try {
        console.log(`[SupervisorService] Beginning full analysis for ${tokenName}`);
        const result = await runSupervisor(tokenName, query, emitEvent);
        console.log(`[SupervisorService] Analysis complete for ${tokenName}`);
        return result;
    } catch (e) {
        console.error(`[SupervisorService] Analysis failed: ${e.message}`);
        throw e;
    }
}

export default { executeFullAnalysis };
