import 'dotenv/config'; // Load env vars before anything else
import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 3002;

// Connect to Database
connectDB();

app.listen(PORT, () => {
    console.log(`\n🚀 AssureFi Unified Backend running on port ${PORT}`);
    console.log(`\nEndpoints:`);
    console.log(`- Contract Analysis: http://localhost:${PORT}/analyze-contract`);
    console.log(`- Risk Analysis:     http://localhost:${PORT}/risk-analysis`);
    console.log(`- Liquidity Check:   http://localhost:${PORT}/get_token`);
    console.log(`- Sentiment Check:   http://localhost:${PORT}/analyze`);
    console.log(`- Token Search:      http://localhost:${PORT}/search`);
    console.log(`\nHealth Check:      http://localhost:${PORT}/health`);
});
