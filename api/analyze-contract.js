import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';

// API Keys (use env vars in production)
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'JZ6J8YIBP8HN3S53NJRCDUAWEZ26XE5UZQ';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyC6wRXNEP1EQ6ItrFDtOx2rJEKrLX2dr9I';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Validates if a string is a valid Ethereum address
 * @param {string} address - The address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidEthereumAddress(address) {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Fetches an Ethereum contract's source code from Etherscan
 * @param {string} contractAddress - Ethereum contract address
 * @returns {Promise<Object>} - Contract source code and metadata
 */
async function getEthereumContractSource(contractAddress) {
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

/**
 * Uses Gemini to generate an analysis based on a prompt
 * @param {string} prompt - The analysis prompt
 * @param {string} modelName - (Optional) Gemini model to use
 * @returns {Promise<string>} - The generated text response
 */
async function geminiAnalyze(prompt, modelName = "gemini-2.5-pro") {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    // Hardened fallback: if gemini-pro does not work, show a meaningful error
    console.error("Error generating content with Gemini (gemini-2.5-pro):", error);
    throw new Error("Gemini AI model 'gemini-2.5-pro' is not accessible with your API key or project setup. See https://ai.google.dev/gemini-api/docs/models for eligibility.");
  }
}

/**
 * Analyzes a smart contract using Gemini API
 * @param {Object} contractData - Contract data with source code
 * @returns {Promise<Object>} - Security analysis
 */
async function analyzeContractWithGemini(contractData) {
    try {
      let codeForAnalysis = contractData.sourceCode;
      if (codeForAnalysis.length > 30000) {
        codeForAnalysis = codeForAnalysis.substring(0, 30000) + "... [truncated for length]";
      }

      // Use JSON.stringify() to escape the source code so that any special characters are handled.
      const escapedCode = JSON.stringify(codeForAnalysis);

      const prompt = `
        Analyze this Ethereum smart contract and identify potential security vulnerabilities.
        Contract name: ${contractData.name}

        Return your analysis in JSON format with the following structure:
        {
          "vulnerabilities": [
            {
              "id": number,
              "name": string,
              "description": string,
              "severity": string,
              "lineNumber": number,
              "code": string,
              "recommendation": string
            }
          ],
          "overallScore": number,
          "summary": string
        }

        Contract address: ${contractData.address}
        Contract source code: ${escapedCode}
      `;

      let responseText = await geminiAnalyze(prompt);
      responseText = responseText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

      const jsonMatch = responseText.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        throw new Error("No JSON object found in Gemini response");
      }
      const jsonStr = jsonMatch[0];

      try {
        const analysisResult = JSON.parse(jsonStr);
        return analysisResult;
      } catch (parseError) {
        throw new Error(`Failed to parse Gemini JSON: ${parseError.message}`);
      }
    } catch (error) {
      throw new Error(`Error analyzing with Gemini: ${error.message}`);
    }
  }

// Vercel handler (supports GET/POST)
export default async function handler(req, res) {
  // Enable CORS
  const corsMiddleware = cors({ origin: '*' });
  corsMiddleware(req, res, async () => {
    try {
      if (req.method === 'GET') {
        const contractAddress = req.headers['contract-address'];

        if (!contractAddress) {
          return res.status(400).json({ error: "Missing contract-address in request header" });
        }

        if (!isValidEthereumAddress(contractAddress)) {
          return res.status(400).json({ error: "Invalid Ethereum address format" });
        }

        const contractData = await getEthereumContractSource(contractAddress);
        const analysis = await analyzeContractWithGemini(contractData);
        return res.json(analysis);
      } else if (req.method === 'POST') {
        const { code } = req.body;
        if (!code) {
          return res.status(400).json({ error: "Missing contract source code in request body" });
        }

        // Build contract data using provided code
        const contractData = {
          address: "Not provided",
          name: "Direct Analysis",
          sourceCode: code,
          compiler: "Not provided"
        };

        const analysis = await analyzeContractWithGemini(contractData);
        return res.json(analysis);
      } else {
        return res.status(405).json({ error: "Method not allowed" });
      }
    } catch (error) {
      console.error("Request error:", error);
      return res.status(500).json({ error: error.message || "Failed to analyze smart contract" });
    }
  });
}

// Export config for Vercel
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'  // For large source code
    }
  }
};
