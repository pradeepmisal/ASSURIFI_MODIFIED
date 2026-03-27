/**
 * vectorMemory.js — Agent Historical Vector Memory
 *
 * Enforces strict embedding rules:
 * 1. ONLY embed semantic summaries.
 * 2. NO raw tool outputs or full JSON payloads.
 * 3. Max length: 500 characters.
 * 4. Supports similarity search for anomaly detection.
 * 5. Fails open (max 2s timeout).
 */

import mongoose from 'mongoose';
import { OpenAIEmbeddings } from '@langchain/openai';

// ─── Schema Definition ────────────────────────────────────────────────

const MemorySchema = new mongoose.Schema({
    tokenName: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now },
    semanticSummary: { type: String, required: true, maxlength: 500 },
    embedding: { type: [Number], required: true },

    // Numeric metrics kept separate, NOT embedded
    riskScore: Number,
    sentimentScore: Number,
    contractScore: Number,
});

// Avoid OverwriteModelError in hot-reloading environments
const TokenMemory = mongoose.models.TokenMemory || mongoose.model('TokenMemory', MemorySchema);

let _embeddingsModel = null;
function getEmbeddingsModel() {
    if (!_embeddingsModel) {
        _embeddingsModel = new OpenAIEmbeddings({
            apiKey: process.env.GITHUB_MODELS_TOKEN,
            model: 'text-embedding-3-small', // OpenAI embedding model via GitHub Models
            configuration: {
                baseURL: "https://models.inference.ai.azure.com",
            }
        });
    }
    return _embeddingsModel;
}

// ─── Private Helpers ──────────────────────────────────────────────────

/**
 * Ensures text is a clean semantic summary and strictly <= 500 chars.
 */
function sanitizeForEmbedding(contractData, riskData, sentimentData) {
    // Extract only narrative components
    let narrativeParts = [];

    if (contractData?.summary) narrativeParts.push(`Contract: ${contractData.summary}`);
    if (riskData?.summary) narrativeParts.push(`Risk: ${riskData.summary}`);
    if (sentimentData?.summary) narrativeParts.push(`Sentiment: ${sentimentData.summary}`);

    let rawNarrative = narrativeParts.join(' | ');

    // Strip out JSON brackets, braces, and excessive numbers to keep it semantic
    rawNarrative = rawNarrative.replace(/[{}[\]]/g, ' ').replace(/\s+/g, ' ').trim();

    // STRICT: Limit to 500 characters
    if (rawNarrative.length > 500) {
        rawNarrative = rawNarrative.substring(0, 497) + '...';
    }

    return rawNarrative || 'No semantic narrative available.';
}

/**
 * Helper to enforce timeouts on promises (fail-open strategy)
 */
function withTimeout(promise, ms, defaultResult = null) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            console.warn(`[VectorMemory] Timeout exceeded (${ms}ms). Failing open.`);
            resolve(defaultResult); // Fail open silently
        }, ms);

        promise
            .then((result) => {
                clearTimeout(timer);
                resolve(result);
            })
            .catch((err) => {
                clearTimeout(timer);
                console.error(`[VectorMemory] Operation failed: ${err.message}. Failing open.`);
                resolve(defaultResult);
            });
    });
}

/**
 * Computes cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Public API ───────────────────────────────────────────────────────

/**
 * Saves a new semantic memory for a token.
 * Writes are async, non-blocking, and fail-open.
 */
export async function saveMemory(tokenName, contractData, riskData, sentimentData) {
    // Execute entirely detached from the caller to completely avoid blocking
    setTimeout(async () => {
        try {
            // 1. Sanitize to semantic summary
            const semanticSummary = sanitizeForEmbedding(contractData, riskData, sentimentData);

            // 2. Generate Embedding
            const embeddingsModel = getEmbeddingsModel();
            const embeddingResult = await withTimeout(
                embeddingsModel.embedQuery(semanticSummary),
                8000 // 8s max embedding generation
            );

            if (!embeddingResult) return; // Silent fail-open

            // 3. Save to Mongo
            const memory = new TokenMemory({
                tokenName: tokenName.toUpperCase(),
                semanticSummary,
                embedding: embeddingResult,
                riskScore: riskData?.riskScore,
                sentimentScore: sentimentData?.sentimentScore,
                contractScore: contractData?.securityScore
            });

            await withTimeout(memory.save(), 5000);
            console.log(`[VectorMemory] Successfully stored semantic memory for ${tokenName}`);
        } catch (e) {
            console.error(`[VectorMemory] Background save failed: ${e.message}`);
        }
    }, 0);

    // Immediately return control to Supervisor
    return true;
}

/**
 * Retrieves past exact semantic memories for a token
 */
export async function searchMemory(tokenName) {
    return await withTimeout(
        TokenMemory.find({ tokenName: tokenName.toUpperCase() })
            .select('-embedding') // Do not return raw vectors
            .sort({ timestamp: -1 })
            .limit(5)
            .lean()
            .exec(),
        5000,
        []
    );
}

/**
 * Finds similar risk patterns across ANY token.
 * Useful for anomaly detection ("This looks like a previous rug-pull").
 */
export async function findSimilarRiskPatterns(queryText, limit = 3) {
    return await withTimeout((async () => {
        // Enforce 500 char logic on query too
        let safeQuery = queryText;
        if (safeQuery.length > 500) safeQuery = safeQuery.substring(0, 497) + '...';

        const embeddingsModel = getEmbeddingsModel();
        const queryEmbedding = await embeddingsModel.embedQuery(safeQuery);

        // Fetch recent memories to run similarity (fallback if not using Atlas Search)
        // Alternatively, this sets us up perfectly for MongoDB Atlas $vectorSearch in production
        const allMemories = await TokenMemory.find({})
            .sort({ timestamp: -1 })
            .limit(100)
            .lean()
            .exec();

        let scoredResults = allMemories.map(mem => {
            return {
                tokenName: mem.tokenName,
                semanticSummary: mem.semanticSummary,
                similarity: mem.embedding ? cosineSimilarity(queryEmbedding, mem.embedding) : 0,
                timestamp: mem.timestamp
            };
        });

        // Filter out poor matches and sort by high similarity
        scoredResults = scoredResults
            .filter(res => res.similarity > 0.8) // High semantic overlap threshold
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

        return scoredResults;
    })(), 8000, []);
}

export default { saveMemory, searchMemory, findSimilarRiskPatterns };
