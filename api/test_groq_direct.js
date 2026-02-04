import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Test three different risk levels
const SAFE_CONTRACT = `pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SafeToken is ReentrancyGuard, Ownable {
    mapping(address => uint256) private balances;
    
    event Transfer(address indexed from, address indexed to, uint256 amount);
    
    function transfer(address to, uint256 amount) external nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
    }
}`;

const MEDIUM_RISK = `pragma solidity ^0.8.0;
contract BasicToken {
    mapping(address => uint) balances;
    
    function transfer(address to, uint amount) public {
        require(balances[msg.sender] >= amount);
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}`;

const HIGH_RISK = `pragma solidity ^0.5.0;
contract VulnerableContract {
    address owner;
    
    function destroy() public {
        selfdestruct(msg.sender);
    }
    
    function authenticate(address user) public view returns (bool) {
        return tx.origin == owner;
    }
    
    function withdrawAll(address payable target) public {
        require(tx.origin == owner);
        target.call.value(address(this).balance)("");
    }
}`;

async function testRealWorld() {
    const results = [];
    results.push("==== REAL-WORLD CONTRACT ANALYSIS TEST ====\n");

    const contracts = [
        { name: "🟢 Well-Designed Safe Contract (Expected: 80-95)", code: SAFE_CONTRACT },
        { name: "🟡 Basic Contract with Minor Issues (Expected: 50-70)", code: MEDIUM_RISK },
        { name: "🔴 Vulnerable Contract (Expected: 10-30)", code: HIGH_RISK }
    ];

    const scores = [];

    for (const contract of contracts) {
        results.push(`\n${"=".repeat(80)}`);
        results.push(`${contract.name}`);
        results.push("=".repeat(80));

        const prompt = `You are an expert Ethereum smart contract security auditor. Analyze the following contract and provide a detailed risk assessment.

IMPORTANT SCORING GUIDELINES:
- Contracts with critical vulnerabilities (selfdestruct, tx.origin, delegatecall to untrusted) = 0-30 points
- Contracts with high vulnerabilities only = 30-50 points  
- Contracts with medium vulnerabilities = 50-70 points
- Contracts with minor issues only = 70-85 points
- Well-written, safe contracts using security best practices = 85-100 points

Contract Name: ${contract.name}

Return ONLY a valid JSON object with this exact structure:
{
  "vulnerabilities": [{"id": 1, "name": "...", "description": "...", "severity": "critical|high|medium|low", "recommendation": "..."}],
  "overallScore": <number 0-100>,
  "summary": "..."
}

CONTRACT SOURCE CODE:
${JSON.stringify(contract.code)}`;

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.1
                })
            });

            const data = await response.json();
            const aiResponse = data.choices[0]?.message?.content || "";
            const jsonMatch = aiResponse.match(/{[\s\S]*}/);

            if (!jsonMatch) {
                results.push("❌ No JSON found");
                continue;
            }

            const analysis = JSON.parse(jsonMatch[0]);
            scores.push({ name: contract.name.split('(')[0].trim(), score: analysis.overallScore });

            const output = [
                `\n✅ SCORE: ${analysis.overallScore}/100`,
                `📝 SUMMARY: ${analysis.summary}`,
                `🔍 VULNERABILITIES: ${analysis.vulnerabilities?.length || 0}`,
            ];

            if (analysis.vulnerabilities && analysis.vulnerabilities.length > 0) {
                output.push('\nTOP ISSUES:');
                analysis.vulnerabilities.slice(0, 3).forEach((v, i) => {
                    output.push(`   ${i + 1}. [${v.severity.toUpperCase()}] ${v.name}`);
                });
            }

            results.push(...output);
            console.log(output.join('\n'));

        } catch (error) {
            results.push(`❌ Error: ${error.message}`);
        }
    }

    results.push("\n" + "=".repeat(80));
    results.push("📊 FINAL SCORE COMPARISON:");
    results.push("=".repeat(80));
    scores.forEach(s => results.push(`${s.name}: ${s.score}/100`));
    results.push("=".repeat(80));
    results.push("\n✅ SUCCESS CRITERIA:");
    results.push("   - Safe contract should score 80+");
    results.push("   - Medium risk should score 50-70");
    results.push("   - High risk should score below 30");
    results.push("   - All three scores should be DIFFERENT");
    results.push("=".repeat(80));

    fs.writeFileSync('api/test_results.txt', results.join('\n'));
    console.log('\n\n📄 Full results saved to: api/test_results.txt');
}

testRealWorld();
