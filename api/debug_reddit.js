
import RedditService from './services/data_access/reddit.service.js';

async function debugReddit() {
    console.log("Debugging Reddit Service...");

    // Test with the coin from the screenshot
    const coin = "Polkadot";
    console.log(`Fetching for: ${coin}`);

    try {
        const posts = await RedditService.fetchPosts(coin);
        console.log(`Found ${posts.length} posts.`);

        if (posts.length === 0) {
            console.log("No posts found. Checking raw response requires service modification or manual URL check.");
            // We can try a wider search in the script to see if it's the query
            console.log("Trying alternative query 'DOT'...");
            const posts2 = await RedditService.fetchPosts("DOT");
            console.log(`Found ${posts2.length} posts for 'DOT'.`);
        } else {
            posts.forEach(p => console.log(`- ${p.title}`));
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

debugReddit();
