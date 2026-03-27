/**
 * llm.config.js — Centralized LLM Configuration
 * 
 * Provides a single, reusable LLM interface for all agents.
 * Uses ChatGroq (Llama 3) as primary, ChatGoogleGenerativeAI (Gemini) as fallback.
 * Replaces scattered raw fetch() calls throughout the codebase.
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatGroq } from '@langchain/groq';

// ─── LLM Instances ───────────────────────────────────────────

/**
 * Primary LLM: Groq (Llama 3.3 70B)
 * Fast inference, suitable for agentic reasoning loops.
 */
function createPrimaryLLM(options = {}) {
    return new ChatGroq({
        model: options.model || 'llama-3.3-70b-versatile',
        temperature: options.temperature ?? 0.1,
        maxTokens: options.maxTokens || 4096,
        timeout: options.timeout || 30000,
        maxRetries: 1, // Add 1 retry in case of free Groq API 503s
        apiKey: process.env.GROQ_API_KEY
    });
}

/**
 * Fallback LLM: Google Gemini (2.0 Flash)
 * Used when Groq is unavailable or rate-limited.
 */
function createFallbackLLM(options = {}) {
    return new ChatOpenAI({
        model: options.model || 'gpt-4o-mini',
        temperature: options.temperature ?? 0.1,
        maxTokens: options.maxTokens || 4096,
        timeout: options.timeout || 30000,
        maxRetries: 0,
        apiKey: process.env.GITHUB_MODELS_TOKEN,
        configuration: {
            baseURL: "https://models.inference.ai.azure.com",
        }
    });
}

/**
 * Returns LLM with automatic fallback chain.
 * If Groq fails (rate limit, error), Gemini takes over transparently.
 * 
 * @param {Object} options - { temperature, maxTokens, timeout, model }
 * @returns {import('@langchain/core/language_models/chat_models').BaseChatModel}
 */
export function getLLM(options = {}) {
    const primary = createPrimaryLLM(options);
    const fallback = createFallbackLLM(options);

    // withFallbacks: if primary throws, fallback is used automatically
    return primary.withFallbacks({
        fallbacks: [fallback],
    });
}

/**
 * Returns primary LLM only (no fallback).
 * Useful when you want explicit control over error handling.
 */
export function getPrimaryLLM(options = {}) {
    return createPrimaryLLM(options);
}

/**
 * Returns fallback LLM only.
 */
export function getFallbackLLM(options = {}) {
    return createFallbackLLM(options);
}

// ─── Token Usage Estimation ──────────────────────────────────

/**
 * Rough token estimation (4 chars ≈ 1 token for English text).
 * Not exact, but sufficient for cost tracking and observability.
 * 
 * @param {string} text
 * @returns {number} estimated token count
 */
export function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

export default { getLLM, getPrimaryLLM, getFallbackLLM, estimateTokens };
