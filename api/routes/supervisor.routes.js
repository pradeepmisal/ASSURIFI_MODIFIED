import express from 'express';
import { executeFullAnalysis } from '../services/supervisor.service.js';

const router = express.Router();

/**
 * GET /full-analysis/stream
 * Server-Sent Events (SSE) endpoint for real-time streaming of Supervisor reasoning.
 * Query Params:
 *  - token: string (required)
 *  - query: string (optional context)
 */
router.get('/full-analysis/stream', async (req, res) => {
    const { token, query } = req.query;

    if (!token) {
        return res.status(400).json({ error: 'Token parameter is required' });
    }

    // Initialize SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        const finalReport = await executeFullAnalysis(token, query || 'Full security scan', res);

        if (!res.writableEnded) {
            res.write(`event: complete\ndata: ${JSON.stringify(finalReport)}\n\n`);
        }
    } catch (e) {
        if (!res.writableEnded) {
            res.write(`event: error\ndata: ${JSON.stringify({ error: e.message })}\n\n`);
        }
    } finally {
        if (!res.writableEnded) {
            res.end();
        }
    }
});

/**
 * POST /full-analysis
 * Standard blocking JSON endpoint for the Supervisor.
 * Body:
 *  - token: string (required)
 *  - query: string (optional context)
 */
router.post('/full-analysis', async (req, res) => {
    const { token, query } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token payload is required' });
    }

    try {
        const finalReport = await executeFullAnalysis(token, query || 'Full security scan', null);
        res.status(200).json(finalReport);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
