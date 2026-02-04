
// Standalone script - No external dependencies
const CONTRACT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT
const API_KEY = "N21U7284K834K1W58B8682226168661148"; // Hardcoded for verification script only
const BASE_URL = "https://api.etherscan.io/api";

async function verifyEtherscanRaw() {
    const url = `${BASE_URL}?module=contract&action=getsourcecode&address=${CONTRACT_ADDRESS}&apikey=${API_KEY}`;

    console.log(`\n🔍 Fetching Raw Data from: ${BASE_URL}`);
    console.log(`   Address: ${CONTRACT_ADDRESS}`);

    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log("\n✅ Etherscan API Response Status:", data.message);

        if (data.result && data.result[0]) {
            const rawSource = data.result[0].SourceCode;
            console.log("\n📜 RAW SOURCE CODE (First 500 chars):");
            console.log("-".repeat(60));
            console.log(rawSource.substring(0, 500));
            console.log("...");
            console.log("-".repeat(60));

            // Check for specific keywords to prove it's real
            if (rawSource.includes("TetherToken")) {
                console.log("✅ Verified: Contains 'TetherToken' (Correct for USDT)");
            }
            if (rawSource.includes("pragma solidity")) {
                console.log("✅ Verified: Contains Solidity Version Pragma");
            }
        } else {
            console.log("❌ No source code found.");
        }

    } catch (error) {
        console.error("❌ Request Failed:", error);
    }
}

verifyEtherscanRaw();
