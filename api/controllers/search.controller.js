import SearchService from '../services/search.service.js';

class SearchController {
    static async search(req, res) {
        try {
            if (req.method !== 'GET') {
                return res.status(405).json({ error: 'Method not allowed' });
            }

            const { name } = req.query;
            const results = await SearchService.searchTokens(name);
            return res.json(results);
        } catch (error) {
            const status = error.message.includes("Missing") ? 400 : 500;
            return res.status(status).json({ error: error.message });
        }
    }

    static async searchDex(req, res) {
        try {
            const { q } = req.query;
            if (!q) {
                return res.status(400).json({ error: "Missing 'q' query parameter" });
            }
            const results = await SearchService.searchDexScreener(q);
            return res.json(results);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}

export default SearchController;
