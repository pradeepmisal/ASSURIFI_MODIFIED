import express from 'express';
import cors from 'cors';
import logger from './middlewares/logger.js';

// Import Routes
import contractRoutes from './routes/contract.routes.js';
import searchRoutes from './routes/search.routes.js';
import sentimentRoutes from './routes/sentiment.routes.js';
import riskRoutes from './routes/risk.routes.js';
import authRoutes from './routes/auth.routes.js';

// Initialize Express App
const app = express();

// Middleware Stack
app.use(cors({ origin: '*' })); // CORS first
app.use(express.json({ limit: '10mb' })); // Body parser
app.use(logger); // Logger app-level middleware (after bodyParser)

// Routes
// Mount routes to match original API behavior
app.use('/auth', authRoutes);
app.use('/analyze-contract', contractRoutes);
app.use('/search', searchRoutes);
app.use('/', sentimentRoutes); // /analyze
app.use('/', riskRoutes);      // /risk-analysis AND /get_token (Liquidity)

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'AssureFi API is running' });
});

export default app;
