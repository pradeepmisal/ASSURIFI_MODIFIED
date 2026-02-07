
import NewsService from './api/services/data_access/news.service.js';
import RedditService from './api/services/data_access/reddit.service.js';

async function test() {

    console.log("\n--- Testing NewsService ---");
    try {
        const news = await NewsService.fetchNews("Bitcoin");
        console.log("News count:", news.length);
        if (news.length > 0) {
            console.log("First news item:", news[0]);
        } else {
            console.log("News fetch returned empty. (Likely blocked or parse error)");
        }
    } catch (e) {
        console.error("NewsService crashed:", e);
    }

    console.log("\n--- Testing RedditService ---");

    const posts = await RedditService.fetchPosts("Bitcoin");
    console.log("Posts count:", posts.length);
    if (posts.length > 0) {
        console.log("First post:", posts[0]);
    } else {
        console.log("Reddit fetch returned empty.");
    }
}

test();
