import express from 'express';
import SentimentController from '../controllers/sentiment.controller.js';
import { optionalProtect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// POST /analyze (Body: { coin: "name" })
router.post('/analyze', optionalProtect, SentimentController.analyze);

export default router;
