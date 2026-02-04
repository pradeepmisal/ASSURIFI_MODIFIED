
import dotenv from 'dotenv';
import SentimentService from './services/sentiment.service.js';

// Load environment variables from the root .env file
dotenv.config();

async function testSentiment() {
    console.log("Starting Sentiment Analysis Test...");
    console.log(`Target URL: ${process.env.SENTIMENT_API_URL || "https://sentiment-agent-1.onrender.com"}/analyze`);

    const coin = "Infrared"; // The specific coin user is asking about
    console.log(`Analyzing coin: ${coin}`);

    try {
        const data = await SentimentService.analyzeSentiment(coin);

        console.log("\n--- Full Raw Response ---");
        console.log(JSON.stringify(data, null, 2));
        console.log("-------------------------\n");

        // Specific checks for "Genuine" markers
        console.log("--- Authenticity Checks ---");

        let hasInfraredT = JSON.stringify(data).includes("Infrared T deployment");
        console.log(`Contains "Infrared T deployment": ${hasInfraredT ? "YES" : "NO"}`);

        let hasTwitter = JSON.stringify(data).toLowerCase().includes("twitter") || JSON.stringify(data).toLowerCase().includes("x.com");
        console.log(`Contains Twitter/X references: ${hasTwitter ? "YES" : "NO"}`);

        if (data.news && Array.isArray(data.news)) {
            console.log(`News items count: ${data.news.length}`);
            data.news.forEach((item, index) => {
                console.log(`[${index}] Source: ${item.source || 'N/A'}, Date: ${item.date || 'N/A'}, Title: ${item.title || item.content?.substring(0, 50)}...`);
            });
        } else {
            console.log("No 'news' array found in response.");
        }

    } catch (error) {
        console.error("Test Failed:", error);
    }
}

testSentiment();
