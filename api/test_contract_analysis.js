import ContractService from './services/contract.service.js';
import dotenv from 'dotenv';
dotenv.config();

// Test with 3 different real contracts
const TEST_CONTRACTS = [
    {
        name: "USDT (Tether)",
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        expectedRisk: "Should be LOW - audited stablecoin"
    },
    {
        name: "Tornado Cash (Sanctioned)",
        address: "0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936",
        expectedRisk: "Should be HIGH - has selfdestruct, complex logic"
    },
    {
        name: "Simple Token",
        address: "0x744d70fdbe2ba4cf95131626614a1763df805b9e",
        expectedRisk: "Should be MEDIUM - basic ERC20"
    }
];

async function runDiagnostics() {
    console.log("=".repeat(80));
    console.log("CONTRACT ANALYSIS DIAGNOSTIC TEST");
    console.log("=".repeat(80));
    console.log(`Groq API Key: ${process.env.GROQ_API_KEY ? "✓ Present" : "✗ MISSING"}`);
    console.log(`Etherscan Key: ${process.env.ETHERSCAN_API_KEY ? "✓ Present" : "✗ MISSING"}`);
    console.log("=".repeat(80));

    for (const test of TEST_CONTRACTS) {
        console.log(`\n📊 Testing: ${test.name}`);
        console.log(`   Address: ${test.address}`);
        console.log(`   Expected: ${test.expectedRisk}`);
        console.log("-".repeat(80));

        try {
            // Step 1: Fetch source code
            console.log("   [1/2] Fetching source code from Etherscan...");
            const contractData = await ContractService.getEthereumContractSource(test.address);
            console.log(`   ✓ Got ${contractData.sourceCode.length} chars of code`);

            // Step 2: Analyze with AI
            console.log("   [2/2] Analyzing with AI...");
            const analysis = await ContractService.analyzeContractWithGemini(contractData);

            // Display results
            console.log(`\n   📈 RESULTS:`);
            console.log(`   Score: ${analysis.overallScore}/100`);
            console.log(`   AI Model: ${analysis.aiModelUsed || "FALLBACK (Static)"}`);
            console.log(`   Summary: ${analysis.summary || "No summary"}`);
            console.log(`   Vulnerabilities: ${analysis.vulnerabilities ? analysis.vulnerabilities.length : 0}`);

            if (analysis.vulnerabilities && analysis.vulnerabilities.length > 0) {
                console.log(`   Top Issues:`);
                analysis.vulnerabilities.slice(0, 3).forEach((v, i) => {
                    console.log(`      ${i + 1}. [${v.severity}] ${v.name}`);
                });
            }

        } catch (error) {
            console.error(`   ✗ FAILED: ${error.message}`);
        }

        console.log("=".repeat(80));
    }
}

runDiagnostics().catch(console.error);
