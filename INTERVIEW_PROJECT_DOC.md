# AssureFi - Intelligent Crypto Security Platform
## Project Documentation & Interview Guide

---

### **1. Executive Summary**
**AssureFi** is a comprehensive Web3 security platform designed to protect investors from crypto scams, rug pulls, and vulnerable smart contracts. It combines **real-time data analysis** (Liquidity, Market Cap, News) with **multi-model AI Agents** (Google Gemini, Llama 3 via Groq) to provide a unified "Risk Score" for any token or smart contract.

**Core Mission:** To democratize smart contract auditing and make high-level security insights accessible to non-technical retail investors.

---

### **2. Technology Stack**
The project follows a **Microservices-aided Monolithic Architecture** (MERN Stack + Specialized Python Microservices).

#### **Frontend (Client-Side)**
*   **Framework:** React 18 + Vite (for high performance and fast HMR).
*   **Language:** TypeScript (for type safety and reducing runtime errors).
*   **UI Library:** Tailwind CSS (Styling), Radix UI (Accessible Components), Framer Motion (Animations).
*   **State Management:** React Query (Server state), Context API (Auth state).
*   **Charting:** Recharts (Liquidity/Sentiment visualization).

#### **Backend (Server-Side)**
*   **Runtime:** Node.js.
*   **Framework:** Express.js (REST API).
*   **Database:** MongoDB + Mongoose (User profiles, Analysis History, Caching).
*   **Authentication:** JWT (JSON Web Tokens) + BCrypt (Password Hashing).

#### **AI & Data Layer (The Brains)**
*   **Primary AI Engine:** Google Gemini Pro 1.5/2.0 (Context-heavy analysis).
*   **High-Speed AI:** Groq (Llama 3-70b) for ultra-fast initial scans.
*   **Blockchain Data:** Etherscan V2 API (Source Code), Solscan (via microservice).
*   **Sentiment Sources:** Reddit API, Crypto News Feeds.
*   **Liquidity Service:** Python Microservice (FastAPI/Flask) hosted on Render (handles pandas/numpy number crunching for liquidity pools).

---

### **3. System Architecture**

```mermaid
graph TD
    User[User (React Frontend)] <-->|REST API| API_GW[Node.js/Express Backend]
    
    subgraph "Core Backend Services"
        API_GW --> AuthService[Auth Service (JWT)]
        API_GW --> AuditService[Audit Service]
        API_GW --> SentimentService[Sentiment Service]
        API_GW --> RiskService[Risk Aggregator]
    end
    
    subgraph "Data & AI Layer"
        AuditService -->|Source Code| Etherscan[Etherscan/BscScan]
        AuditService -->|Analysis| Groq[Groq (Llama 3)]
        AuditService -->|Fallback| Gemini[Google Gemini]
        
        SentimentService -->|Social Data| Reddit[Reddit API]
        SentimentService -->|News| NewsAPI[News API]
        
        RiskService -->|Liquidity Metrics| PyService[Python Microservice]
    end
    
    subgraph "Database"
        AuthService --> MongoDB[(MongoDB)]
        RiskService --> MongoDB
    end
```

---

### **4. "Behind The Scenes": Module Deep Dives**
*Here is exactly how the system works, step-by-step, for the interviewer.*

#### **Module A: Smart Contract Audit (`contract.service.js`)**
**The "Scanner"**
1.  **Input:** User provides a contract address (e.g., `0x123...`).
2.  **Source Extraction:** The backend calls **Etherscan V2 API**. It doesn't just get the ABI; it fetches the full *verified source code*.
3.  **Preprocessing:**
    *   The code is cleaned (comments removed, whitespace minimized) to fit into AI context windows.
    *   If the code is too large (>30k chars), it is efficiently truncated while preserving the core logic functions.
4.  **The "AI Pipeline" (Failover System):**
    *   **Attempt 1 Analysis (Speed):** Code is sent to **Groq (Llama 3)**. It's extremely fast and good at reading code patterns.
    *   **Attempt 2 Analysis (Depth):** If Groq fails or rate limits, we switch to **Google Gemini**.
    *   **Attempt 3 Analysis (Static Guard):** If both AIs fail (which happens in production!), we have a custom `analyzeContractStatic` method. It uses **Regular Expressions (Regex)** to hunt for dangerous keywords like `selfdestruct`, `tx.origin`, or `delegatecall`.
5.  **Scoring:** The AI returns a JSON object with a score (0-100), vulnerability list, and an "Investor Impact" summary (plain English explanation).

#### **Module B: Market Sentiment Analysis (`sentiment.service.js`)**
**The "Vibe Checker"**
1.  **Data Harvesting:** In parallel (`Promise.all`), we fetch:
    *   **Reddit:** Top posts from `r/cryptocurrency`, `r/bitcoin`, etc., related to the token.
    *   **News:** Recent headlines from crypto news aggregators.
2.  **Prompt Engineering:** We construct a massive text block: *"Here are 10 reddit posts and 5 news articles. Analyze the general emotion."*
3.  **AI Judgment:** Gemini/Groq processes this text and outputs:
    *   **Score:** -1 (Bearish) to +1 (Bullish).
    *   **Key Drivers:** "Why are people happy/sad?" (e.g., "Mainnet launch delayed").
4.  **Fallback:** If AI is down, we use a "Bag of Words" algorithm. We count positive words ("bull", "moon", "partnership") vs. negative words ("hack", "dump", "scam") to calculate a rough score locally.

#### **Module C: Liquidity & Risk Engine (`risk.service.js`)**
**The "Aggregator"**
1.  **Liquidity Fetching:** The Node.js backend calls our **Python Microservice**. This service scrapes DEX (Decentralized Exchange) data to find:
    *   Total Liquidity (USD).
    *   Market Cap.
    *   24h Volume.
2.  **Logic Checks (The "Smart Fallback"):**
    *   If `Liquidity < $5,000` → **Critical Risk flag**.
    *   If `Liquidity > Market Cap` → **Inverted Market Structure flag** (Sign of a scam).
3.  **Final Report:** The module combines the **Contract Audit Code**, **Sentiment Score**, and **Liquidity Health** into one final JSON response for the frontend.

#### **Module D: Authentication (`auth.controller.js`)**
**The "Gatekeeper"**
*   Standard industry practice: **Stateless JWT Authentication**.
*   **Register:** User/Email/Pass -> Password hashed with `bcrypt` (10 salt rounds) -> Saved to MongoDB.
*   **Login:** Password matches hash? -> specific **JWT Token** signed with `process.env.JWT_SECRET`.
*   **Protection:** Middleware checks the `Authorization: Bearer <token>` header for private routes (like "My History").

---

### **5. Key Code Snippets (For Whiteboard/Screen Share)**

**1. The "Safety Net" Static Analyzer (If AI Fails):**
```javascript
static analyzeContractStatic(sourceCode) {
    let score = 65; // Base Medium Risk

    // Bonus: Modern Solidity Version (Auto-overflow checks)
    if (/pragma solidity \^?0\.8/.test(sourceCode)) score += 15;

    // Penalty: Phishing Vulnerability
    if (sourceCode.includes('tx.origin')) {
         score -= 25;
         vulnerabilities.push({ name: "Phishing Risk (tx.origin)" });
    }

    // Penalty: Backdoor
    if (sourceCode.includes('selfdestruct')) {
         score -= 40; // Critical hit
    }

    return { overallScore: score, ... };
}
```

**2. The Robust AI Failover System:**
```javascript
// From ContractService
try {
    // Plan A: Fast & Cheap
    return await analyzeWithGroq(prompt);
} catch (e) {
    try {
        // Plan B: Powerful & Context-heavy
        return await geminiAnalyze(prompt);
    } catch (e2) {
        // Plan C: Reliable Algorithm
        return analyzeContractStatic(sourceCode);
    }
}
```

---

### **6. Interview Q&A (Prepare for these!)**

#### **Technical Questions**
**Q: Why did you use React over Next.js?**
**A:** "Since this is a dashboard-heavy application where user interaction happens entirely on the client side (SPA pattern) and SEO for individual dynamic analysis pages wasn't the primary priority, React with Vite offered the fastest development cycle and performance. However, for the landing page marketing SEO, we can easily migrate to Next.js in the future."
*(Note: If you want to sound more advanced, say: "We used Vite for its superior HMR speed compared to Webpack.")*

**Q: How do you handle proper error handling with external AI APIs?**
**A:** "Optimization and reliability are key. We implemented a **Tiered Fallback System**. We first try Groq for speed. If that fails (503/Rate Limit), we gracefully degrade to Gemini. If both AI services are down, we don't crash the app; we fall back to a deterministic 'Static Analysis' algorithm that scans for known vulnerability keywords using Regex. This ensures the user *always* gets a result."

**Q: Explain how the frontend talks to the backend.**
**A:** "We use a RESTful architecture. The frontend uses **React Query** (TanStack Query) to manage async state. It calls our Express API endpoints (e.g., `/analyze-contract`). We use an Axios/Fetch wrapper with an Interceptor to automatically attach the JWT token from LocalStorage to the `Authorization` header for every secure request."

**Q: How do you secure user passwords?**
**A:** "We never store plain text passwords. We use `bcrypt` to hash passwords with a salt factor of 10 before saving to MongoDB. During login, we compare the input password's hash against the database hash."

#### **Behavioral / Project Questions**
**Q: What was the most challenging part of this project?**
**A:** "Handling the variability of Smart Contract source code. Sometimes code is massive (50k+ lines) or not verified. We had to implement an intelligent 'Chunking and Truncation' logic to fit the code into the AI's context window without losing the critical logic functions."

**Q: How does this project scale?**
**A:** "Since the backend is stateless (JWT Auth) and uses a microservice architecture (Python separated from Node.js), we can horizontally scale the Node.js API instances behind a load balancer easily. The heavy lifting (AI analysis) is offloaded to external APIs, so our server load remains relatively low."

---

### **7. Deployment & Environment**
*   **Env Variables:** `.env` manages sensitive keys (`GEMINI_API_KEY`, `JWT_SECRET`, `MONGO_URI`).
*   **Database:** MongoDB Atlas (Cloud Cluster).
*   **Hosting:**
    *   Frontend: Vercel / Netlify.
    *   Backend: Render / Railway / AWS EC2.

---
*Created by AssureFi Engineering Team*
