import Analysis from '../models/Analysis.js';
import Watchlist from '../models/Watchlist.js';

class PortfolioController {

    // ─── GET /portfolio ─────────────────────────────────────
    // Returns: { stats, pinnedContracts, history }
    static async getPortfolio(req, res) {
        try {
            const userId = req.user.id;

            // Run all queries in parallel for speed
            const [history, pinnedContracts, totalScans, scansByType, avgScore] = await Promise.all([
                // 1. Full history (last 50)
                Analysis.find({ createdBy: userId })
                    .sort({ createdAt: -1 })
                    .limit(50)
                    .lean(),

                // 2. Pinned contracts
                Watchlist.find({ userId })
                    .sort({ pinnedAt: -1 })
                    .lean(),

                // 3. Total scan count
                Analysis.countDocuments({ createdBy: userId }),

                // 4. Scans by type
                Analysis.aggregate([
                    { $match: { createdBy: req.user._id } },
                    { $group: { _id: '$type', count: { $sum: 1 } } }
                ]),

                // 5. Average risk score
                Analysis.aggregate([
                    { $match: { createdBy: req.user._id } },
                    { $group: { _id: null, avg: { $avg: '$overallRiskScore' } } }
                ])
            ]);

            // Format scan breakdown
            const scanBreakdown = { AUDIT: 0, SENTIMENT: 0, LIQUIDITY: 0 };
            scansByType.forEach(s => {
                if (scanBreakdown.hasOwnProperty(s._id)) {
                    scanBreakdown[s._id] = s.count;
                }
            });

            // Most-scanned token
            let mostScanned = null;
            if (history.length > 0) {
                const tokenCounts = {};
                history.forEach(h => {
                    const name = h.tokenName || 'Unknown';
                    tokenCounts[name] = (tokenCounts[name] || 0) + 1;
                });
                const sorted = Object.entries(tokenCounts).sort((a, b) => b[1] - a[1]);
                mostScanned = { name: sorted[0][0], count: sorted[0][1] };
            }

            // Last scan date
            const lastScan = history.length > 0 ? history[0].createdAt : null;

            return res.json({
                stats: {
                    totalScans,
                    averageRiskScore: avgScore.length > 0 ? Math.round(avgScore[0].avg) : 0,
                    pinnedCount: pinnedContracts.length,
                    scanBreakdown,
                    mostScanned,
                    lastScan
                },
                pinnedContracts,
                history
            });
        } catch (error) {
            console.error('Error fetching portfolio:', error);
            return res.status(500).json({ error: 'Failed to fetch portfolio data' });
        }
    }

    // ─── POST /portfolio/pin ────────────────────────────────
    static async pinContract(req, res) {
        try {
            const userId = req.user.id;
            const { contractAddress, tokenName, chainId, lastRiskScore, analysisType, notes } = req.body;

            if (!contractAddress || !tokenName) {
                return res.status(400).json({ error: 'contractAddress and tokenName are required' });
            }

            // Check if already pinned
            const existing = await Watchlist.findOne({ userId, contractAddress });
            if (existing) {
                return res.status(409).json({ error: 'Contract already pinned', item: existing });
            }

            const pin = new Watchlist({
                userId,
                contractAddress,
                tokenName,
                chainId: chainId || 'ethereum',
                lastRiskScore: lastRiskScore || null,
                analysisType: analysisType || 'AUDIT',
                notes: notes || ''
            });

            await pin.save();
            return res.status(201).json(pin);
        } catch (error) {
            // Handle duplicate key error gracefully
            if (error.code === 11000) {
                return res.status(409).json({ error: 'Contract already pinned' });
            }
            console.error('Error pinning contract:', error);
            return res.status(500).json({ error: 'Failed to pin contract' });
        }
    }

    // ─── DELETE /portfolio/pin/:id ──────────────────────────
    static async unpinContract(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const result = await Watchlist.findOneAndDelete({ _id: id, userId });
            if (!result) {
                return res.status(404).json({ error: 'Pinned contract not found' });
            }

            return res.json({ message: 'Contract unpinned successfully' });
        } catch (error) {
            console.error('Error unpinning contract:', error);
            return res.status(500).json({ error: 'Failed to unpin contract' });
        }
    }

    // ─── PATCH /portfolio/pin/:id/note ──────────────────────
    static async updateNote(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { notes } = req.body;

            const item = await Watchlist.findOneAndUpdate(
                { _id: id, userId },
                { notes: notes || '' },
                { new: true }
            );

            if (!item) {
                return res.status(404).json({ error: 'Pinned contract not found' });
            }

            return res.json(item);
        } catch (error) {
            console.error('Error updating note:', error);
            return res.status(500).json({ error: 'Failed to update note' });
        }
    }
}

export default PortfolioController;
