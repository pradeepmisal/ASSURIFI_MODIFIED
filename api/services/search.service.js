// Simple in-memory cache
const searchCache = new Map();

class SearchService {
    static async searchTokens(name) {
        try {
            if (!name) {
                throw new Error("Missing 'name' query parameter");
            }

            // USE DEXSCREENER INSTEAD OF COINGECKO
            // It's faster, has higher rate limits, and provides contract addresses directly.
            const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(name)}`;
            const response = await fetch(url);

            if (!response.ok) {
                // Fallback to empty if fails
                console.warn(`DexScreener search failed: ${response.statusText}`);
                return [];
            }

            const data = await response.json();
            const pairs = data.pairs || [];

            // Filter and Map results to match the format expected by SearchBar.tsx
            // Format: { id, name, symbol, contract_address, thumb }

            // Use a Map to ensure unique tokens (Dedup by address)
            const uniqueTokens = new Map();

            for (const pair of pairs) {
                // FILTER: Only allow Ethereum tokens because our Auditor currently only supports Etherscan.
                // This fulfills user request to "Show only those coins... which can be audit".
                if (pair.chainId === 'ethereum' && pair.baseToken && pair.baseToken.address) {
                    const addr = pair.baseToken.address;
                    if (!uniqueTokens.has(addr)) {
                        uniqueTokens.set(addr, {
                            id: addr, // Use address as ID since we don't have CG ID
                            name: pair.baseToken.name,
                            symbol: pair.baseToken.symbol,
                            contract_address: addr,
                            thumb: pair.info?.imageUrl || null // DexScreener sometimes has images
                        });
                    }
                }
                // Limit to top 10 unique results
                if (uniqueTokens.size >= 10) break;
            }

            return Array.from(uniqueTokens.values());

        } catch (error) {
            console.error("Error fetching from DexScreener (Search):", error);
            // If completely failed, empty array instead of crash
            return [];
        }
    }

    // Kept for backward compatibility if any other controller uses it directly
    static async searchDexScreener(query) {
        try {
            if (!query) throw new Error("Missing 'q' query parameter");

            const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
            const response = await fetch(url);

            if (!response.ok) return [];

            const data = await response.json();
            const pairs = data.pairs || [];

            // FOR MONITOR: Return FULL PAIR OBJECTS without chain filter.
            // Monitor shows market data (price/volume) which works for all chains.
            // Only Audit needs the Ethereum filter (for Etherscan source code).
            return pairs.slice(0, 20); // Limit to 20 for performance

        } catch (error) {
            console.error("Error fetching from DexScreener (Monitor):", error);
            return [];
        }
    }
}

export default SearchService;
