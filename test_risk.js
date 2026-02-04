
import dotenv from 'dotenv';
dotenv.config();

import RiskService from './api/services/risk.service.js';
import fs from 'fs';

async function testRiskAnalysis() {
    console.log("Starting Risk Analysis Test...");
    const results = {};

    const mockTokenData = {
        metrics: {
            liquidity: 100000,
            market_cap: 80000, // Liquidity > MC (Unusual)
            price: { change: { h24: -5 } }
        }
    };
    const mockSourceCode = "pragma solidity ^0.8.0; contract Test { function transfer() public {} }";

    console.log("\nTesting analyzeTokenWithGroq directly...");
    try {
        const aiResult = await RiskService.analyzeTokenWithGroq(mockTokenData, mockSourceCode, "TestToken");
        results.aiResult = aiResult;
    } catch (error) {
        console.error("analyzeTokenWithGroq Failed:", error);
        results.aiError = error.message;
    }

    console.log("\nTesting generateSmartFallback directly...");
    const fallbackResult = RiskService.generateSmartFallback(mockTokenData);
    results.fallbackResult = fallbackResult;

    fs.writeFileSync('test_result.json', JSON.stringify(results, null, 2));
    console.log("Results written to test_result.json");
}

testRiskAnalysis();
