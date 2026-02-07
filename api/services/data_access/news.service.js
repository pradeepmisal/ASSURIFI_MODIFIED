
class NewsService {
    /**
     * Fetches recent news headlines.
     * Note: Finding a free, auth-less News API is difficult. 
     * We will try a public RSS-to-JSON bridge if available, 
     * otherwise we might need to fallback or use a specific scraping method.
     * For stability in this demo, we will use a highly realistic "Live" simulator 
     * if the external fetch fails, but let's try a public crypto feed first.
     */
    static async fetchNews(coinName) {
        try {
            console.log(`[NewsService] Fetching news for: ${coinName}`);

            // STRATEGY: 
            // Query Google News RSS feed for the specific topic.
            // MUST include User-Agent to avoid 403 blocks.

            const query = encodeURIComponent(coinName);
            const url = `https://news.google.com/rss/search?q=${query}+crypto&hl=en-US&gl=US&ceid=US:en`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
                }
            });

            if (!response.ok) {
                console.warn(`[NewsService] Fetch failed with status: ${response.status}`);
                return [];
            }

            const xmlText = await response.text();

            // Simple Regex XML Parser for RSS items
            const itemRegex = /<item>[\s\S]*?<\/item>/g;
            const items = xmlText.match(itemRegex) || [];

            console.log(`[NewsService] Found ${items.length} news items.`);

            const news = items.slice(0, 5).map(item => {
                const titleMatch = item.match(/<title>(.*?)<\/title>/);
                const linkMatch = item.match(/<link>(.*?)<\/link>/);
                const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
                const sourceMatch = item.match(/<source url=".*?">(.*?)<\/source>/);

                return {
                    source: sourceMatch ? sourceMatch[1] : 'Google News',
                    title: titleMatch ? titleMatch[1].replace("<![CDATA[", "").replace("]]>", "") : 'News Update',
                    url: linkMatch ? linkMatch[1] : '#',
                    date: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
                    content: titleMatch ? titleMatch[1] : 'Click to read more...'
                };
            });

            return news;

        } catch (error) {
            console.error("[NewsService] Error:", error.message);
            return [];
        }
    }
}

export default NewsService;
