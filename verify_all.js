
const API_BASE_URL = "http://localhost:3002";

async function verifyEndpoint(name, url, method = 'GET', body = null) {
    console.log(`\n--- Testing ${name} ---`);
    try {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) options.body = JSON.stringify(body);

        console.log(`Request: ${method} ${url}`);
        if (body) console.log(`Body: ${JSON.stringify(body)}`);

        const start = Date.now();
        const res = await fetch(url, options);
        const duration = Date.now() - start;

        console.log(`Status: ${res.status} (${res.statusText})`);
        console.log(`Duration: ${duration}ms`);

        const text = await res.text();
        try {
            const data = JSON.parse(text);
            if (res.ok) {
                console.log("Response (Success):", JSON.stringify(data).substring(0, 200) + "...");
                return true;
            } else {
                console.error("Response (Error):", JSON.stringify(data));
                return false;
            }
        } catch (e) {
            console.log("Response (Text):", text.substring(0, 200));
            return res.ok;
        }
    } catch (error) {
        console.error("Request Failed:", error.message);
        return false;
    }
}

async function runVerification() {
    console.log("Starting Pre-Push Verification...");

    // 1. Health Check
    await verifyEndpoint("Health Check", `${API_BASE_URL}/health`);

    // 2. Search
    await verifyEndpoint("Token Search (Bitcoin)", `${API_BASE_URL}/search?query=bitcoin`);

    // 3. Sentiment Analysis
    await verifyEndpoint("Sentiment Analysis", `${API_BASE_URL}/analyze`, 'POST', { coin: 'Bitcoin' });

    // 4. Contract Analysis
    // 4. Contract Analysis (Mocked or Real?)
    // Controller: analyzeBySourceCode expects smart_contract_address or token_address OR sourceCode
    // BUT we are likely hitting analyzeByAddress logic for simple contract check or analyzeBySourceCode?
    // Let's assume hitting the route mapped to analyzeByAddress first or check routes.
    // However, let's try a standard payload that works for RiskController too.
    await verifyEndpoint("Contract Analysis (USDT)", `${API_BASE_URL}/analyze-contract`, 'POST', {
        address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
        smart_contract_address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
        chain: "ethereum",
        chainId: "1"
    });

    // 5. Risk Analysis
    // RiskController.js:19 expects { token_name, token_address, smart_contract_address, chain_id }
    await verifyEndpoint("Risk Analysis", `${API_BASE_URL}/risk-analysis`, 'POST', {
        token_name: "Tether USD",
        token_address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
        smart_contract_address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
        chain_id: "ethereum"
    });

    console.log("\nVerification Complete.");
}

runVerification();
