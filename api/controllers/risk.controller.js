import RiskService from '../services/risk.service.js';

class RiskController {

    // --- Liquidity Proxy ---
    static async getToken(req, res) {
        try {
            const { token_address, chain_id } = req.query;
            const data = await RiskService.getTokenData(token_address, chain_id || 'solana');
            return res.json(data);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // --- Risk Analysis ---
    static async analyzeRisk(req, res) {
        try {
            const { token_name, token_address, smart_contract_address, chain_id } = req.body;

            if (!token_address || !smart_contract_address) {
                return res.status(400).json({
                    error: 'Missing required parameters. Please provide token_address and smart_contract_address.'
                });
            }

            // Use provided chain_id or default to solana
            const chain = chain_id || 'solana';

            // Pass req.user.id (if authenticated) to enable saving history
            const userId = req.user ? req.user.id : null;
            const result = await RiskService.analyzeRisk(token_name, token_address, smart_contract_address, chain, userId);
            return res.json(result);

        } catch (error) {
            console.error('Error in risk analysis controller:', error);
            return res.status(500).json({ error: 'Internal server error', message: error.message });
        }
    }

    // --- History ---
    static async getHistory(req, res) {
        try {
            // req.user is populated by 'protect' middleware
            if (!req.user || !req.user.id) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const history = await RiskService.getUserHistory(req.user.id);
            return res.json(history);
        } catch (error) {
            console.error('Error fetching history:', error);
            return res.status(500).json({ error: 'Failed to fetch analysis history' });
        }
    }

    // --- Single Report ---
    static async getReport(req, res) {
        try {
            const { id } = req.params;
            const report = await RiskService.getReportById(id);
            return res.json(report);
        } catch (error) {
            console.error("Error fetching report:", error);
            if (error.message === "Report not found") {
                return res.status(404).json({ error: 'Report not found' });
            }
            return res.status(500).json({ error: 'Failed to fetch report' });
        }
    }
}

export default RiskController;
