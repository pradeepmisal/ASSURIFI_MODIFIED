
import { GoogleGenerativeAI } from "@google/generative-ai";
import RedditService from './data_access/reddit.service.js';
import NewsService from './data_access/news.service.js';

class SentimentService {
    static async analyzeSentiment(coin_name) {
        let redditPosts = [];
        let newsArticles = [];

        try {
            console.log(`[SentimentService] Starting analysis for: ${coin_name}`);

            // 1. Fetch Real Data
            try {
                [redditPosts, newsArticles] = await Promise.all([
                    RedditService.fetchPosts(coin_name),
                    NewsService.fetchNews(coin_name)
                ]);
                console.log(`[SentimentService] Fetched ${redditPosts.length} Reddit posts and ${newsArticles.length} News articles.`);
            } catch (fetchErr) {
                console.error("Data Fetch Error:", fetchErr);
            }

            // 2. Prepare Context for Gemini
            const combinedText = `
                REDDIT POSTS (Community Sentiment):
                ${redditPosts.limit(8).map(p => `- [Score: ${p.score}] ${p.title}: ${p.content}`).join('\n')}

                NEWS HEADLINES (Market Context):
                ${newsArticles.map(n => `- (${n.source}) ${n.title}`).join('\n')}
            `;

            // 3. Try Gemini First, then Groq
            let aiAnalysis = null;

            // Attempt 1: Gemini
            try {
                console.log("[SentimentService] Attempting Gemini analysis...");
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

                const prompt = `
                    You are a sophisticated Crypto Sentiment Analysis Engine. Analyze the following real-time data for the coin: "${coin_name}".
                    
                    Data:
                    ${combinedText}

                    Task:
                    1. Determine a Sentiment Score from -1 (Extremely Negative) to +1 (Extremely Positive).
                    2. Explain the Key Drivers (Why is the sentiment this way?).
                    3. Extract "Latest News" summaries with simulated impact scores.

                    Return ONLY raw JSON (no markdown) in this format:
                    {
                        "average_sentiment": number, // Float between -1 and 1
                        "sentiment_distribution": { "Positive": %, "Neutral": %, "Negative": % },
                        "summary": "Brief executive summary...",
                        "latest_news": [
                            { "content": "Headline/Summary", "sentiment": "positive/negative/neutral", "date": "ISO String" }
                        ]
                    }
                `;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
                aiAnalysis = JSON.parse(cleanJson);
                console.log("[SentimentService] ✓ Gemini analysis successful");

            } catch (geminiError) {
                console.warn("[SentimentService] Gemini failed:", geminiError.message);

                // Attempt 2: Groq Fallback
                try {
                    console.log("[SentimentService] Attempting Groq fallback...");
                    const groqApiKey = process.env.GROQ_API_KEY;

                    if (!groqApiKey) {
                        throw new Error("Groq API key not configured");
                    }

                    const prompt = `You are a Crypto Sentiment Analysis Engine. Analyze this real-time data for ${coin_name}:

${combinedText}

Provide a sentiment score (-1 to 1), distribution percentages, executive summary, and latest news insights.

Return ONLY valid JSON:
{
  "average_sentiment": <number>,
  "sentiment_distribution": {"Positive": <number>, "Neutral": <number>, "Negative": <number>},
  "summary": "<text>",
  "latest_news": [{"content": "<text>", "sentiment": "<positive/negative/neutral>", "date": "<ISO>"}]
}`;

                    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${groqApiKey}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            messages: [{ role: "user", content: prompt }],
                            model: "llama-3.3-70b-versatile",
                            temperature: 0.3
                        })
                    });

                    if (!groqResponse.ok) {
                        throw new Error(`Groq API Error: ${groqResponse.status}`);
                    }

                    const groqData = await groqResponse.json();
                    const textResponse = groqData.choices[0]?.message?.content || "";
                    const jsonMatch = textResponse.match(/({[\s\S]*})/);
                    const jsonString = jsonMatch ? jsonMatch[0] : textResponse;
                    aiAnalysis = JSON.parse(jsonString);
                    console.log("[SentimentService] ✓ Groq analysis successful");

                } catch (groqError) {
                    console.error("[SentimentService] Both AI providers failed:", groqError.message);
                    throw new Error("All AI providers unavailable");
                }
            }

            // 4. Merge Source Data
            aiAnalysis.reddit_posts = redditPosts;
            aiAnalysis.news_articles = newsArticles;
            aiAnalysis.analysis_time = new Date().toISOString();

            return aiAnalysis;

        } catch (error) {
            console.error("[SentimentService] AI Error:", error.message);

            // AI Failed? Use manual keyword scoring on the fetched data
            const allItems = [...newsArticles, ...redditPosts];
            const localScore = calculateLocalScore(allItems);

            let sentimentLabel = "Neutral";
            if (localScore > 0.2) sentimentLabel = "Positive";
            else if (localScore < -0.2) sentimentLabel = "Negative";

            // Dynamic Summary
            const keywords = extractTopKeywords(allItems);
            const keywordText = keywords.length > 0 ? `Headlines mention terms like "${keywords.join('", "')}".` : "No specific trends detected.";

            return {
                average_sentiment: localScore,
                sentiment_distribution: {
                    Positive: localScore > 0 ? 60 : 20,
                    Neutral: 20,
                    Negative: localScore < 0 ? 60 : 20
                },
                summary: `AI unavailable (Rate Limit). Local Keyword Analysis: Market sentiment appears ${sentimentLabel} based on ${allItems.length} sources. ${keywordText}`,
                latest_news: newsArticles.map(n => ({ content: n.title, sentiment: 'neutral', date: n.date })),
                reddit_posts: redditPosts,
                news_articles: newsArticles,
                error_details: error.toString()
            };
        }
    }
}

// Helper to limit array map
Array.prototype.limit = function (n) {
    return this.slice(0, n);
};

// Helper for local sentiment if AI fails
function calculateLocalScore(items) {
    if (!items || items.length === 0) return 0;

    const positiveWords = ["surge", "bull", "up", "high", "gain", "record", "growth", "adoption", "partnership", "good", "underrated", "buy", "spring", "rally"];
    const negativeWords = ["drop", "bear", "down", "low", "loss", "crash", "ban", "hack", "scam", "bad", "winter", "sell", "fear"];

    let score = 0;
    let count = 0;

    items.forEach(item => {
        const text = (item.title + " " + (item.content || "")).toLowerCase();
        let itemScore = 0;

        positiveWords.forEach(w => { if (text.includes(w)) itemScore += 1; });
        negativeWords.forEach(w => { if (text.includes(w)) itemScore -= 1; });

        if (itemScore !== 0) {
            score += (itemScore > 0 ? 1 : -1); // Normalize item impact
            count++;
        }
    });

    if (count === 0) return 0;
    // Normalize total average to -1 to 1 range usually
    return Math.max(-1, Math.min(1, score / count));
}


function extractTopKeywords(items) {
    const stopWords = new Set(["the", "is", "at", "which", "on", "and", "a", "an", "of", "to", "in", "for", "with", "by", "from", "up", "down", "it", "this", "that", "are", "was", "be", "has", "have", "had", "will", "would", "could", "should", "not", "no", "yes", "but", "or", "as", "if", "when", "than", "then", "so", "crypto", "bitcoin", "ethereum", "price", "market", "coin", "token", "new", "top", "why", "how", "what", "where", "who", "more", "over", "under", "all", "any", "some", "just", "now", "out", "about", "into", "year", "years", "time", "day", "days", "week", "weeks", "month", "months"]);
    const wordCounts = {};

    items.forEach(item => {
        const text = (item.title + " " + (item.content || "")).toLowerCase();
        const words = text.match(/\b[a-z]{4,}\b/g) || []; // Only words >= 4 chars to skip trivial ones

        words.forEach(w => {
            if (!stopWords.has(w)) {
                wordCounts[w] = (wordCounts[w] || 0) + 1;
            }
        });
    });

    return Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1]) // Sort by frequency desc
        .slice(0, 3) // Top 3
        .map(entry => entry[0]);
}

export default SentimentService;


