// Simple in-memory cache
const searchCache = new Map();
const detailsCache = new Map();

class SearchService {
    static async searchTokens(name) {
        try {
            if (!name) {
                throw new Error("Missing 'name' query parameter");
            }

            const cacheKey = `search_${name.toLowerCase()}`;
            if (searchCache.has(cacheKey)) {
                return searchCache.get(cacheKey);
            }

            const coingeckoUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(name)}`;
            const response = await fetch(coingeckoUrl);

            // If rate limited, return empty or cached if available (optimization)
            if (response.status === 429) {
                console.warn("CoinGecko Search Rate Limit Hit");
                return [];
            }

            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.statusText}`);
            }

            const data = await response.json();

            // OPTIMIZATION: Only fetch details for TOP 2 results instead of 10
            // This reduces API calls from 11 per search to 3 per search.
            const coinsToProcess = (data.coins || []).slice(0, 2);

            const results = await Promise.allSettled(coinsToProcess.map(async (coin) => {
                let contract_address = null;

                // Check details cache
                if (detailsCache.has(coin.id)) {
                    contract_address = detailsCache.get(coin.id);
                } else {
                    try {
                        const detailResponse = await fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}`);
                        if (detailResponse.ok) {
                            const detailData = await detailResponse.json();
                            if (detailData.platforms && Object.keys(detailData.platforms).length > 0) {
                                const platforms = detailData.platforms;
                                const preferredPlatform = platforms.ethereum ? 'ethereum' : Object.keys(platforms)[0];
                                if (platforms[preferredPlatform]) {
                                    contract_address = platforms[preferredPlatform];
                                    // Cache the address found
                                    detailsCache.set(coin.id, contract_address);
                                }
                            }
                        } else if (detailResponse.status === 429) {
                            console.warn(`Rate limit fetching details for ${coin.id}`);
                        }
                    } catch (detailError) {
                        console.warn(`Failed to fetch details for ${coin.id}:`, detailError.message);
                    }
                }

                return {
                    id: coin.id,
                    name: coin.name,
                    symbol: coin.symbol,
                    contract_address: contract_address || null,
                    thumb: coin.thumb
                };
            }));

            const finalResults = results
                .map(r => r.status === 'fulfilled' ? r.value : null)
                .filter(item => item && item.contract_address);

            // Cache the final list for this query
            searchCache.set(cacheKey, finalResults);

            // Clear cache after 5 minutes to prevent memory leaks/stale data
            setTimeout(() => searchCache.delete(cacheKey), 5 * 60 * 1000);

            return finalResults;

        } catch (error) {
            console.error("Error fetching from CoinGecko:", error);
            // If completely failed, empty array instead of crash
            return [];
        }
    }

    static async searchDexScreener(query) {
        try {
            if (!query) {
                throw new Error("Missing 'q' query parameter");
            }

            const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
            // DexScreener doesn't require an API key for public search
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`DexScreener API error: ${response.statusText}`);
            }

            const data = await response.json();
            // Return pairs directly
            return data.pairs || [];

        } catch (error) {
            console.error("Error fetching from DexScreener:", error);
            return [];
        }
    }
}

export default SearchService;
