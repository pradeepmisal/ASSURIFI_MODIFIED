import express from 'express';
import RiskController from '../controllers/risk.controller.js';

import { protect, optionalProtect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// POST /risk-analysis
// Public route (Authentication optional at controller level if we want to save history)
router.post('/risk-analysis', optionalProtect, RiskController.analyzeRisk);
router.get('/history', protect, RiskController.getHistory);

// GET /get_token (Liquidity proxy - mounted at root via app.js if needed, or we explicitly mount this router to manage both)
// Since app.js mounts riskRoutes at '/', this allows '/get_token' to work.
router.get('/get_token', RiskController.getToken);

router.get('/report/:id', RiskController.getReport);

export default router;
