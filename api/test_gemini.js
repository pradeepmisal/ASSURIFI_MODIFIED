import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testGemini() {
    console.log("--- Gemini Connectivity Test ---");
    console.log(`API Key detected: ${GEMINI_API_KEY ? "YES (" + GEMINI_API_KEY.substring(0, 5) + "...)" : "NO"}`);

    if (!GEMINI_API_KEY) {
        console.error("ERROR: No GEMINI_API_KEY found in .env");
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        console.log("Sending test prompt: 'Hello, are you working?'...");
        const result = await model.generateContent("Hello, are you working? Reply with 'Yes, I am operational'.");
        const response = await result.response;
        const text = response.text();

        console.log("\n✅ SUCCESS: Gemini Responded!");
        console.log(`Response: "${text}"`);

    } catch (error) {
        console.error("\n❌ FAILED: Gemini API Error");
        console.error(`Error Message: ${error.message}`);

        if (error.message.includes('429')) {
            console.log("\n⚠️ DIAGNOSIS: Rate Limit Exceeded (429).");
            console.log("The API key has hit its usage limit (Requests/Minute or Requests/Day).");
        } else if (error.message.includes('API key not valid')) {
            console.log("\n⚠️ DIAGNOSIS: Invalid API Key.");
        }
    }
}

testGemini();
