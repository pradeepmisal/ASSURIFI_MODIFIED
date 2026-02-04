
import dotenv from 'dotenv';
import SentimentService from './services/sentiment.service.js';

// Load environment variables
dotenv.config();

async function testSentimentV2() {
    console.log("Starting Sentiment Analysis V2 (Real Data) Test...");
    const coin = "Bitcoin"; // Use a major coin to ensure Reddit/News hits
    console.log(`Analyzing coin: ${coin}`);

    try {
        const data = await SentimentService.analyzeSentiment(coin);

        console.log("\n--- Full Real Data Response ---");
        console.log(JSON.stringify(data, null, 2)); // Print everything first to debug

        console.log(`\nScore: ${data.average_sentiment}`);
        if (data.summary) console.log(`Summary: ${data.summary.substring(0, 100)}...`);
        else console.log("Summary: [MISSING]");

        console.log(`Reddit Posts Found: ${data.reddit_posts?.length || 0}`);
        console.log(`News Articles Found: ${data.news_articles?.length || 0}`);
        console.log(`News Articles (AI Extracted): ${data.latest_news?.length || 0}`);

        console.log("\n--- Reddit Samples ---");
        if (data.reddit_posts && data.reddit_posts.length > 0) {
            data.reddit_posts.slice(0, 2).forEach(p => console.log(`- [${p.score}] ${p.title}`));
        }

        console.log("\n--- JSON Output Check ---");
        // console.log(JSON.stringify(data, null, 2));

        if (data.average_sentiment === 0 && data.reddit_posts.length === 0) {
            console.error("WARNING: Result looks empty. Check network/service logic.");
        } else {
            console.log("SUCCESS: Real data fetched and analyzed.");
        }

    } catch (error) {
        console.error("Test Failed:", error);
    }
}

testSentimentV2();
