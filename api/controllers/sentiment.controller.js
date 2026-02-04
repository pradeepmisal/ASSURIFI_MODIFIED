import SentimentService from '../services/sentiment.service.js';
import Analysis from '../models/Analysis.js';

class SentimentController {
    static async analyze(req, res) {
        try {
            // Expecting POST with body { coin: "name" } or maybe query?
            // backend-risk calls logic calls POST { coin: "name" } to sentiment service.
            // backend-risk invokes sentiment service.
            // But we likely want an endpoint for direct access too, mirroring the original agent structure.

            const { coin } = req.body;
            const data = await SentimentService.analyzeSentiment(coin);

            // SAVE HISTORY if user is authenticated
            if (req.user && req.user.id) {
                try {
                    // Map sentiment (-1 to 1) to Risk Score (0-100)
                    // -1 = 0 (Max Risk/Negative), 1 = 100 (Safe/Positive)
                    // Formula: ((score + 1) / 2) * 100
                    const rawScore = data.average_sentiment || 0;
                    const normalizedScore = Math.round(((rawScore + 1) / 2) * 100);

                    const record = new Analysis({
                        type: 'SENTIMENT',
                        tokenName: coin,
                        // Sentiment often doesn't have specific addresses
                        tokenAddress: "N/A",
                        contractAddress: "N/A",
                        chainId: 'N/A',
                        overallRiskScore: normalizedScore,
                        geminiAnalysis: data,
                        createdBy: req.user.id
                    });
                    await record.save();
                } catch (saveErr) {
                    console.error("Failed to save sentiment history:", saveErr);
                }
            }

            return res.json(data);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}

export default SentimentController;
