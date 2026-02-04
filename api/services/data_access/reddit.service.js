
class RedditService {
    /**
     * Fetches recent relevant posts from Reddit.
     * @param {string} coinName - The name of the coin to search for.
     * @returns {Promise<Array>} - List of standardized post objects.
     */
    static async fetchPosts(coinName) {
        try {
            console.log(`[RedditService] Fetching posts for: ${coinName}`);
            // Strategy Switch: Search endpoint is strictly rate-limited/blocked (403).
            // Fallback: Fetch 'new' posts from r/CryptoCurrency and filter locally.
            const subreddit = "CryptoCurrency";
            const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=50`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn(`[RedditService] Failed to fetch. Status: ${response.status}`);
                return [];
            }

            const data = await response.json();

            if (!data.data || !data.data.children) {
                return [];
            }

            const searchTerms = [coinName.toLowerCase(), coinName.substring(0, 3).toLowerCase()]; // e.g. "bitcoin", "bit" (risky for short tickers), let's stick to name if possible or symbol if length > 3

            // Map and Filter
            const posts = data.data.children.map(child => {
                const post = child.data;
                return {
                    source: 'Reddit',
                    title: post.title,
                    content: post.selftext ? post.selftext.substring(0, 500) : post.title,
                    url: `https://white.reddit.com${post.permalink}`, // Use non-old for links
                    score: post.score,
                    comments: post.num_comments,
                    date: new Date(post.created_utc * 1000).toISOString(),
                    author: post.author
                };
            }).filter(post => {
                const text = (post.title + " " + post.content).toLowerCase();
                return text.includes(coinName.toLowerCase());
            });

            return posts.slice(0, 10);

        } catch (error) {
            console.error("[RedditService] Error:", error.message);
            return [];
        }
    }
}

export default RedditService;
