import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function testGroq() {
    console.log("--- Groq Connectivity Test ---");
    console.log(`API Key detected: ${GROQ_API_KEY ? "YES (" + GROQ_API_KEY.substring(0, 5) + "...)" : "NO"}`);

    if (!GROQ_API_KEY) {
        console.error("ERROR: No GROQ_API_KEY found in .env");
        return;
    }

    try {
        console.log("Sending test prompt: 'Hello, identify yourself.'...");

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: [{ role: "user", content: "Hello, are you functional? Reply with 'Groq is operational'." }],
                model: "llama-3.3-70b-versatile",
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API Error ${response.status}: ${text}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        console.log("\n✅ SUCCESS: Groq Responded!");
        console.log(`Response: "${content}"`);

    } catch (error) {
        console.error("\n❌ FAILED: Groq API Error");
        console.error(`Error Message: ${error.message}`);
    }
}

testGroq();
