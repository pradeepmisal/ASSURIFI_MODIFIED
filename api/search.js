// Vercel handler for CoinGecko search
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ error: "Missing 'name' query parameter" });
  }

  try {
    const coingeckoUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(name)}`;
    const response = await fetch(coingeckoUrl);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.statusText}`);
    }

    // For each coin, fetch detailed info to get platforms (limit to top 10 to avoid rate limits and show more results)
    const tokensWithAddresses = [];
    for (const coin of (data.coins || []).slice(0, 10)) {
      let contract_address = null;
      try {
        const detailResponse = await fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}`);
        const detailData = await detailResponse.json();
        if (detailResponse.ok && detailData.platforms && Object.keys(detailData.platforms).length > 0) {
          const platforms = detailData.platforms;
          // Prefer Ethereum if available, else first available
          const preferredPlatform = platforms.ethereum ? 'ethereum' : Object.keys(platforms)[0];
          if (platforms[preferredPlatform]) {
            contract_address = platforms[preferredPlatform];
          }
        }
      } catch (detailError) {
        console.warn(`Failed to fetch details for ${coin.id}:`, detailError.message);
      }
      // Always add the coin, even if no contract address
      tokensWithAddresses.push({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        contract_address: contract_address || null,
        thumb: coin.thumb
      });
    }

    return res.json(tokensWithAddresses);

  } catch (error) {
    console.error("Error fetching from CoinGecko:", error);
    return res.status(500).json({ error: `Failed to fetch token data: ${error.message}` });
  }
}
