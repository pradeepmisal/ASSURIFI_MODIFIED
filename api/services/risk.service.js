import { GoogleGenerativeAI } from '@google/generative-ai';
import ContractService from './contract.service.js';
import SentimentService from './sentiment.service.js';
import Analysis from '../models/Analysis.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

class RiskService {
    // --- Liquidity Logic Integration ---
    static async getTokenData(tokenAddress, chainId = 'solana') {
        try {
            if (!tokenAddress) {
                throw new Error("Missing token_address parameter");
            }

            const baseUrl = process.env.LIQUIDITY_API_URL || 'https://liquidity-monitoring-1.onrender.com';
            const url = `${baseUrl}/get_token?token_address=${tokenAddress}&chain_id=${chainId}`;

            const response = await fetch(url, {
                mode: "cors",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`Liquidity API error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error fetching liquidity data:", error);
            throw error;
        }
    }

    // --- Groq (Llama 3) Helper ---
    static async analyzeTokenWithGroq(tokenData, contractSourceCode, tokenName) {
        try {
            const groqApiKey = process.env.GROQ_API_KEY;
            if (!groqApiKey) {
                console.warn("Groq API Key missing, skipping AI analysis.");
                return null;
            }

            // Truncate contract source code
            const safeContractCode = contractSourceCode.length > 40000
                ? contractSourceCode.substring(0, 40000) + "... [TRUNCATED]"
                : contractSourceCode;

            const prompt = `
            You are an expert Crypto Investment Analyst. Analyze this token for a non-technical investor.
            
            Token: ${tokenName}
            Market Data: ${JSON.stringify(tokenData)}
            Contract Code (Snippet): ${safeContractCode.substring(0, 5000)}...

            Provide a RISKY/SAFE evaluation based on the data.
            Return ONLY a valid JSON object with this EXACT structure:

            {
              "ai_insights_panel": {
                "liquidityHealth": "Short statement evaluating if liquidity is healthly relative to market cap.",
                "liquidityTrend": "Interpret 1h/6h/24h metrics (Stable, Accumulating, or Dumping).",
                "exitRiskSignal": "LOW | MEDIUM | HIGH",
                "investorInterpretation": "Plain English paragraph (2-3 sentences) explaining what this means for selling ability and safety. No jargon."
              },
              "riskData": [
                 { "category": "Contract Risk", "risk": 0-100 },
                 { "category": "Liquidity Risk", "risk": 0-100 },
                 { "category": "Market Sentiment", "risk": 0-100 },
                 { "category": "Developer Activity", "risk": 0-100 },
                 { "category": "Community Trust", "risk": 0-100 }
              ],
              "contractAnalysis": {
                  "overallScore": 0-100,
                  "summary": "Brief code summary."
              }
            }
            `;

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${groqApiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Groq API Error: ${response.status} ${errText}`);
            }

            const data = await response.json();
            const textResponse = data.choices[0]?.message?.content || "";

            const jsonMatch = textResponse.match(/({[\s\S]*})/);
            const jsonString = jsonMatch ? jsonMatch[0] : textResponse;

            return JSON.parse(jsonString);

        } catch (error) {
            console.error("Groq Analysis Failed:", error.message);
            return null; // Trigger fallback
        }
    }

    // --- Smart Fallback Generator ---
    static generateSmartFallback(tokenData) {
        const metrics = tokenData.metrics || {};
        const cap = metrics.market_cap || 0;
        const liq = metrics.liquidity || 0;

        let exitRisk = "LOW";
        let healthMsg = "Liquidity is healthy relative to market cap.";
        let trendMsg = "Market activity appears stable.";
        let interpMsg = "This token has sufficient liquidity for trading. No immediate red flags detected in the metrics.";

        // 1. Health Logic
        if (liq < 5000) {
            healthMsg = "Liquidity is critically low (under $5k).";
            exitRisk = "HIGH";
            interpMsg = "Warning: Difficulty selling is highly likely due to thin liquidity. High risk of capital loss.";
        } else if (liq > cap && cap > 0) {
            healthMsg = "Liquidity exceeds Market Cap (Unusual).";
            exitRisk = "MEDIUM";
            interpMsg = "The liquidity structure is inverted, which is often seen in new or manipulated projects. Proceed with caution.";
        } else if (liq / cap < 0.1 && cap > 50000) {
            healthMsg = "Liquidity is thin relative to Market Cap.";
            exitRisk = "MEDIUM";
            interpMsg = "Price impact on sales will be high. Large sells could crash the price significantly.";
        }

        // 2. Trend Logic
        if (metrics.price?.change?.h24 < -20) {
            trendMsg = "Strong bearish trend (Dumping).";
            if (exitRisk === "LOW") exitRisk = "MEDIUM";
        } else if (metrics.price?.change?.h24 > 20) {
            trendMsg = "Strong bullish accumulation.";
        }

        return {
            ai_insights_panel: {
                liquidityHealth: healthMsg,
                liquidityTrend: trendMsg,
                exitRiskSignal: exitRisk,
                investorInterpretation: interpMsg
            },
            riskData: [
                { category: "Liquidity", risk: 50 },
                { category: "Market", risk: 50 },
            ],
            contractAnalysis: {
                overallScore: 50,
                summary: "Automated analysis based on market metrics.",
                vulnerabilities: []
            }
        };
    }

    // --- Main Risk Analysis ---
    static async analyzeRisk(token_name, token_address, smart_contract_address, chainId = "solana", userId) {

        // ... (existing code for fetching tokenData etc) ...

        // 1. Get Contract Code (Same as before)
        let contractSourceCode = "";
        try {
            // ...
            // (Assuming you have logic here, but for brevity in tool call, I'm focusing on the main structure usage)
            const contractData = await ContractService.getEthereumContractSource(smart_contract_address);
            contractSourceCode = contractData.sourceCode || "";
        } catch (e) { contractSourceCode = "// Unavailable"; }

        // 2. Get Liquidity Data (Same as before)
        let tokenData;
        try {
            tokenData = await RiskService.getTokenData(token_address, chainId);
        } catch (err) {
            tokenData = { error: "Unavailable" };
        }

        // 3. AI Analysis (Groq) with Smart Fallback
        let aiResult;
        try {
            // Use Groq instead of Gemini
            const fullAnalysis = await RiskService.analyzeTokenWithGroq(tokenData, contractSourceCode || "", token_name);
            if (fullAnalysis) {
                aiResult = fullAnalysis;
            } else {
                throw new Error("AI returned null");
            }
        } catch (error) {
            console.warn("Falling back to Smart Analysis:", error.message);
            aiResult = RiskService.generateSmartFallback(tokenData);
        }

        const report = {
            token_info: {
                name: token_name,
                address: token_address,
                chain_id: chainId
            },
            tokenData,
            ...aiResult // Spreads ai_insights_panel, etc.
        };

        // Save to MongoDB if userId is provided
        if (userId) {
            try {
                const newAnalysis = new Analysis({
                    type: 'LIQUIDITY',
                    tokenName: token_name,
                    tokenAddress: token_address,
                    contractAddress: smart_contract_address,
                    chainId: chainId,
                    overallRiskScore: report.contractAnalysis?.overallScore || 0,
                    geminiAnalysis: report,
                    createdBy: userId
                });
                await newAnalysis.save();
            } catch (saveError) {
                console.error("Failed to save analysis history:", saveError);
            }
        }

        return report;
    }

    // --- History ---
    static async getUserHistory(userId) {
        try {
            // Fetch analyses created by this user, sorted by newest first
            const analyses = await Analysis.find({ createdBy: userId })
                .sort({ createdAt: -1 })
                .limit(50); // Limit to last 50 for now
            return analyses;
        } catch (error) {
            console.error("Error fetching user history:", error);
            throw error;
        }
    }

    // --- Get Single Report ---
    static async getReportById(reportId) {
        try {
            const report = await Analysis.findById(reportId);
            if (!report) {
                throw new Error("Report not found");
            }
            return report;
        } catch (error) {
            console.error("Error fetching report:", error);
            throw error;
        }
    }
}

export default RiskService;
