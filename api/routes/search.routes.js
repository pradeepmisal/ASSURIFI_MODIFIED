import express from 'express';
import SearchController from '../controllers/search.controller.js';

const router = express.Router();

// GET /search?name=...
router.get('/', SearchController.search);

// GET /search/dex?q=...
router.get('/dex', SearchController.searchDex);

export default router;
