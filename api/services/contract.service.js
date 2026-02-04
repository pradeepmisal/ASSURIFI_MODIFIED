import { GoogleGenerativeAI } from '@google/generative-ai';

// API Keys (use env vars in production)
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Cache for available models
let availableModelsCache = null;

class ContractService {
    /**
     * Validates if a string is a valid Ethereum address
     * @param {string} address - The address to validate
     * @returns {boolean} - True if valid, false otherwise
     */
    static isValidEthereumAddress(address) {
        return /^0x[0-9a-fA-F]{40}$/.test(address);
    }

    /**
     * Fetches an Ethereum contract's source code from Etherscan
     * @param {string} contractAddress - Ethereum contract address
     * @returns {Promise<Object>} - Contract source code and metadata
     */
    static async getEthereumContractSource(contractAddress) {
        try {
            // Etherscan V2 endpoint for contract source code
            const url = `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getsourcecode&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();
            if (!data || data.status !== "1" || !data.result || !data.result[0]) {
                throw new Error(`Etherscan V2 API error: ${data.message || JSON.stringify(data)}`);
            }
            const contractData = data.result[0];
            if (!contractData.SourceCode || contractData.SourceCode.trim().length === 0) {
                throw new Error("No verified source code available for this contract");
            }
            return {
                address: contractAddress,
                name: contractData.ContractName,
                sourceCode: contractData.SourceCode,
                compiler: contractData.CompilerVersion
            };
        } catch (error) {
            throw new Error(`Failed to retrieve contract source: ${error.message}`);
        }
    }



    static async geminiAnalyze(prompt, modelName = null) {
        // Use configured model or default to 2.0-flash
        const selectedModel = modelName || process.env.GEMINI_MODEL || "gemini-2.0-flash";

        console.log(`Attempting to use Gemini model: ${selectedModel}`);

        try {
            // Try SDK first
            const genModel = genAI.getGenerativeModel({ model: selectedModel });
            const result = await genModel.generateContent(prompt);
            console.log(`Successfully used model: ${selectedModel}`);
            return result.response.text();
        } catch (error) {
            console.error(`Error with model ${selectedModel}:`, error.message);
            throw new Error(`Gemini analysis failed with model ${selectedModel}: ${error.message}`);
        }
    }

    /**
     * Analyzes a smart contract using Gemini API
     * @param {Object} contractData - Contract data with source code
     * @returns {Promise<Object>} - Security analysis
     */
    /**
     * Fallback Static Analysis: Scans code for known patterns.
     * NOW OPTIMIZED: Defaults to "Caution" (65/100) instead of "Safe" (100/100).
     */
    static analyzeContractStatic(sourceCode) {
        const vulnerabilities = [];
        // Base score is 65 (Medium Risk) because static analysis is never perfect.
        // We only grant points for PROVEN safety features.
        let score = 65;

        // --- BONUSES (Safety Features) ---
        // Bonus 1: Modern Solidity (Automatic Overflow Checks)
        if (/pragma solidity \^?0\.8/.test(sourceCode)) {
            score += 15; // +15 for using version 0.8+
        }

        // Bonus 2: Reentrancy Guard
        if (sourceCode.includes('ReentrancyGuard') || sourceCode.includes('nonReentrant')) {
            score += 10; // +10 for protection
        }

        // Bonus 3: Pausable (Emergency Stop)
        if (sourceCode.includes('Pausable') || sourceCode.includes('whenNotPaused')) {
            score += 5; // +5 for safety controls
        }

        // --- PENALTIES (Vulnerabilities) ---
        // Pattern 1: tx.origin (Phishing)
        if (sourceCode.includes('tx.origin')) {
            vulnerabilities.push({
                id: 1,
                name: "Use of tx.origin",
                description: "Using tx.origin for authorization is insecure and can lead to phishing attacks.",
                severity: "high",
                recommendation: "Use msg.sender instead of tx.origin."
            });
            score -= 25;
        }

        // Pattern 2: selfdestruct (Destruction)
        if (sourceCode.includes('selfdestruct') || sourceCode.includes('suicide')) {
            vulnerabilities.push({
                id: 2,
                name: "Self-Destruct Capability",
                description: "Contract can be destroyed by the owner, potentially locking funds.",
                severity: "critical",
                recommendation: "Ensure selfdestruct is protected or remove it if not needed."
            });
            score -= 40;
        }

        // Pattern 3: Unchecked Return Values
        if (sourceCode.includes('.call') && !sourceCode.includes('require')) {
            vulnerabilities.push({
                id: 3,
                name: "Unchecked External Call",
                description: "Low-level .call() is used without checking the return value.",
                severity: "medium",
                recommendation: "Always check the boolean return value of .call()."
            });
            score -= 15;
        }

        // Pattern 4: Delegatecall (Unsafe Logic)
        if (sourceCode.includes('delegatecall')) {
            vulnerabilities.push({
                id: 4,
                name: "Unsafe Delegatecall",
                description: "Use of delegatecall can allow malicious libraries to manipulate contract storage.",
                severity: "high",
                recommendation: "Ensure the target address of delegatecall is trusted and constant."
            });
            score -= 20;
        }

        // Clamp score 0-95 (Never 100 for static)
        score = Math.min(Math.max(0, score), 95);

        const riskLevel = score >= 80 ? "Low" : score >= 60 ? "Medium" : "High";

        return {
            overallScore: score,
            summary: `⚠️ AI Service Rate Limited. Analysis based on Static Pattern Matching. Risk Level: ${riskLevel}.`,
            vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : [
                {
                    id: 0,
                    name: "Automated Check Passed",
                    description: "No specific vulnerable patterns (like tx.origin) found in static scan.",
                    severity: "low",
                    recommendation: "Manual audit required to verify business logic."
                }
            ],
            // Standardize output for UI
            oneLineSummary: `Static Scan: ${riskLevel} Risk. Found ${vulnerabilities.length} specific issues.`,
            whyThisScore: [
                "AI Service Unavailable (Rate Limit)",
                `Base Safety Score: 65/100`,
                `Vulnerabilities Found: ${vulnerabilities.length}`,
                "Score adjusted based on Solidity Version & Patterns"
            ]
        };
    }

    /**
     * Analyzes contract using Groq (Llama 3)
     */
    static async analyzeWithGroq(prompt) {
        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) throw new Error("No GROQ_API_KEY found.");

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
            throw new Error(`Groq API Error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";
    }


    /**
     * Main Analysis Entry Point: Tries Groq -> Gemini -> Static
     */

    static async analyzeContractWithGemini(contractData) {
        // NOTE: Method name kept as 'analyzeContractWithGemini' to avoid breaking existing callers
        // even though it now supports Groq.

        let codeForAnalysis = contractData.sourceCode;

        // LIGHT OPTIMIZATION: Only remove excessive multi-line comments, preserve structure
        // Remove large comment blocks but keep code readable for AI
        codeForAnalysis = codeForAnalysis.replace(/\/\*\*[\s\S]{200,}?\*\//g, '/* [long comment removed] */');

        // Normalize line breaks (Windows to Unix)
        codeForAnalysis = codeForAnalysis.replace(/\r\n/g, '\n');

        // Remove excessive blank lines (more than 2 consecutive)
        codeForAnalysis = codeForAnalysis.replace(/\n{3,}/g, '\n\n');

        if (codeForAnalysis.length > 30000) {
            codeForAnalysis = codeForAnalysis.substring(0, 30000) + "\n... [truncated for length]";
        }

        const escapedCode = JSON.stringify(codeForAnalysis);

        const prompt = `You are an expert Ethereum smart contract security auditor. Analyze the following contract and provide a detailed risk assessment.

IMPORTANT SCORING GUIDELINES:
- Contracts with critical vulnerabilities (selfdestruct, tx.origin, reentrancy) = 0-30 points
- Contracts with high vulnerabilities only = 30-50 points  
- Contracts with medium vulnerabilities = 50-70 points
- Contracts with minor issues only = 70-85 points
- Well-written, safe contracts = 85-100 points

Contract Name: ${contractData.name}
Contract Address: ${contractData.address}

Return ONLY a valid JSON object (no markdown, no explanations) with this exact structure:
{
  "vulnerabilities": [
    {
      "id": 1,
      "name": "Vulnerability Name",
      "description": "Detailed description of the issue",
      "severity": "critical|high|medium|low",
      "lineNumber": 0,
      "code": "affected code snippet",
      "recommendation": "How to fix it"
    }
  ],
  "overallScore": <number between 0-100 based on severity>,
  "summary": "Brief summary of findings",
  "investorImpactSummary": "Short, plain-English explanation for investors. Explain potential financial risks (e.g., 'Your funds could be stolen', 'Owner can freeze your tokens') without using technical jargon."
}

CONTRACT SOURCE CODE:
${escapedCode}
`;

        try {
            let responseText = "";
            let usedProvider = "";

            // PLAN A: Try Groq (Llama 3) - Preferred
            if (process.env.GROQ_API_KEY) {
                try {
                    console.log("Attempting analysis with Groq (Llama 3)...");
                    responseText = await ContractService.analyzeWithGroq(prompt);
                    usedProvider = "Groq (Llama 3)";
                    console.log("Groq Success!");
                } catch (groqError) {
                    console.warn(`Groq failed: ${groqError.message}. Falling back...`);
                }
            }

            // PLAN B: Try Gemini (if Groq failed or key missing)
            if (!responseText && process.env.GEMINI_API_KEY) {
                try {
                    console.log("Attempting analysis with Gemini...");
                    responseText = await ContractService.geminiAnalyze(prompt);
                    usedProvider = "Google Gemini";
                    console.log("Gemini Success!");
                } catch (geminiError) {
                    console.warn(`Gemini failed: ${geminiError.message}`);
                }
            }

            // If both failed, throw to trigger Plan C (Static)
            if (!responseText) {
                throw new Error("All AI providers failed or were rate limited.");
            }

            // Parse Response
            console.log(`[DEBUG] Raw AI Response Length: ${responseText.length} chars`);
            console.log(`[DEBUG] First 200 chars: ${responseText.substring(0, 200)}`);

            responseText = responseText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
            const jsonMatch = responseText.match(/{[\s\S]*}/);
            if (!jsonMatch) {
                console.error("[DEBUG] JSON NOT FOUND in response!");
                throw new Error("No JSON object found in AI response");
            }

            const result = JSON.parse(jsonMatch[0]);
            console.log(`[DEBUG] Parsed Result Score: ${result.overallScore}, Vulnerabilities: ${result.vulnerabilities?.length || 0}`);

            // Add metadata about which AI model was used
            result.aiModelUsed = usedProvider;
            return result;

        } catch (error) {
            console.error("AI Analysis Final Failure:", error.message);
            console.log("[DEBUG] ⚠️ FALLING BACK TO STATIC ANALYSIS");
            // PLAN C: Static Analysis
            return ContractService.analyzeContractStatic(contractData.sourceCode);
        }
    }
}

export default ContractService;
