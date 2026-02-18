import express from 'express';
import PortfolioController from '../controllers/portfolio.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All portfolio routes require authentication
router.get('/', protect, PortfolioController.getPortfolio);
router.post('/pin', protect, PortfolioController.pinContract);
router.delete('/pin/:id', protect, PortfolioController.unpinContract);
router.patch('/pin/:id/note', protect, PortfolioController.updateNote);

export default router;
