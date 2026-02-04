import ContractService from '../services/contract.service.js';
import Analysis from '../models/Analysis.js';

class ContractController {
    // GET logic
    static async analyzeByAddress(req, res) {
        try {
            // req.contractAddress comes from validateContractAddress middleware
            const contractData = await ContractService.getEthereumContractSource(req.contractAddress);
            const analysis = await ContractService.analyzeContractWithGemini(contractData);

            // SAVE HISTORY if user is authenticated
            if (req.user && req.user.id) {
                try {
                    const record = new Analysis({
                        type: 'AUDIT',
                        tokenName: contractData.name || "Unknown Contract",
                        tokenAddress: req.contractAddress,
                        contractAddress: req.contractAddress,
                        chainId: 'ethereum',
                        overallRiskScore: analysis.overallScore,
                        geminiAnalysis: analysis,
                        createdBy: req.user.id
                    });
                    await record.save();
                } catch (saveErr) {
                    console.error("Failed to save audit history:", saveErr);
                }
            }

            return res.json(analysis);
        } catch (error) {
            console.error("Request error:", error);
            return res.status(500).json({ error: error.message || "Failed to analyze smart contract" });
        }
    }

    // POST logic
    static async analyzeBySourceCode(req, res) {
        try {
            const { smart_contract_address, token_address, chain_id, sourceCode } = req.body;

            let finalSourceCode = sourceCode;
            let name = "Direct Analysis";
            let addr = smart_contract_address || token_address || "Not provided";

            // If no source code but we have an address, fetch it!
            if (!finalSourceCode && (smart_contract_address || token_address)) {
                try {
                    const fetchResult = await ContractService.getEthereumContractSource(smart_contract_address || token_address);
                    finalSourceCode = fetchResult.sourceCode;
                    name = fetchResult.name;
                    addr = fetchResult.address;
                } catch (err) {
                    return res.status(400).json({ error: `Failed to fetch source code for ${addr}: ${err.message}` });
                }
            }

            if (!finalSourceCode) {
                return res.status(400).json({ error: "Missing source code. Please provide 'sourceCode' or a valid 'smart_contract_address'." });
            }

            // Build contract data
            const contractData = {
                address: addr,
                name: name,
                sourceCode: finalSourceCode,
                compiler: "Not provided"
            };

            const analysis = await ContractService.analyzeContractWithGemini(contractData);

            // SAVE HISTORY if user is authenticated
            if (req.user && req.user.id) {
                try {
                    const record = new Analysis({
                        type: 'AUDIT',
                        tokenName: name || "Custom Code",
                        tokenAddress: token_address || smart_contract_address || "N/A",
                        contractAddress: smart_contract_address || "N/A",
                        chainId: chain_id || 'ethereum',
                        overallRiskScore: analysis.overallScore,
                        geminiAnalysis: analysis,
                        createdBy: req.user.id
                    });
                    await record.save();
                } catch (saveErr) {
                    console.error("Failed to save source code audit history:", saveErr);
                }
            }

            return res.json(analysis);
        } catch (error) {
            console.error("Request error:", error);
            return res.status(500).json({ error: error.message || "Failed to analyze smart contract" });
        }
    }

    // DEBUG logic
    static async getRawEtherscanData(req, res) {
        try {
            const { address } = req.query;
            if (!address) {
                return res.status(400).json({ error: "Missing 'address' query parameter" });
            }
            const contractData = await ContractService.getEthereumContractSource(address);
            return res.json(contractData);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}

export default ContractController;
