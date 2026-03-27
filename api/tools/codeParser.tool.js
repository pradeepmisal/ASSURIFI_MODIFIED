/**
 * codeParser.tool.js — LangChain Tool: Targeted Code Section Extraction
 * 
 * NEW tool (not wrapping existing code). Allows the agent to zoom into
 * specific parts of a smart contract without re-reading the entire source.
 * The agent can ask for: constructors, external functions, modifiers,
 * specific function names, or patterns.
 */

import { DynamicTool } from '@langchain/core/tools';

// ─── Parseable Queries ───────────────────────────────────────

const QUERY_HANDLERS = {
    'constructor': extractConstructor,
    'external_functions': extractExternalFunctions,
    'payable_functions': extractPayableFunctions,
    'modifiers': extractModifiers,
    'events': extractEvents,
    'imports': extractImports,
    'state_variables': extractStateVariables,
    'owner_functions': extractOwnerFunctions,
};

/**
 * Creates the Code Parser tool for the Contract Auditor agent.
 * 
 * @param {Object} metricsTracker - Optional metrics tracker
 * @returns {DynamicTool}
 */
export function createCodeParserTool(metricsTracker = null) {
    return new DynamicTool({
        name: 'code_parser',
        description:
            'Extracts specific sections from Solidity source code for targeted inspection. ' +
            'Input format: a JSON string with "sourceCode" and "query" fields. ' +
            'Supported queries: "constructor", "external_functions", "payable_functions", ' +
            '"modifiers", "events", "imports", "state_variables", "owner_functions". ' +
            'You can also pass a custom function name as the query (e.g., "transfer", "approve"). ' +
            'Use this tool to investigate specific areas of concern without re-reading the entire contract.',

        func: async (input) => {
            const startTime = Date.now();

            try {
                let parsed;
                try {
                    parsed = JSON.parse(input);
                } catch {
                    // If input isn't JSON, treat entire input as a query with no source
                    return JSON.stringify({
                        success: false,
                        error: 'Input must be a JSON string with "sourceCode" and "query" fields. Example: {"sourceCode": "...", "query": "constructor"}',
                    });
                }

                const { sourceCode, query } = parsed;

                if (!sourceCode || !query) {
                    return JSON.stringify({
                        success: false,
                        error: 'Both "sourceCode" and "query" fields are required.',
                    });
                }

                let result;
                const queryLower = query.toLowerCase().trim();

                // Check if it's a known query type
                if (QUERY_HANDLERS[queryLower]) {
                    result = QUERY_HANDLERS[queryLower](sourceCode);
                } else {
                    // Custom query — search for function by name
                    result = extractFunctionByName(sourceCode, query);
                }

                if (metricsTracker) {
                    metricsTracker.recordToolCall('code_parser', true, Date.now() - startTime, 1);
                }

                return JSON.stringify({
                    success: true,
                    query: queryLower,
                    matchCount: result.length,
                    matches: result.slice(0, 10), // Limit to 10 matches to avoid token bloat
                });

            } catch (error) {
                if (metricsTracker) {
                    metricsTracker.recordToolCall('code_parser', false, Date.now() - startTime, 1);
                }

                return JSON.stringify({
                    success: false,
                    error: `Code parser failed: ${error.message}`,
                });
            }
        },
    });
}

// ─── Extraction Functions ────────────────────────────────────

function extractConstructor(code) {
    const regex = /constructor\s*\([^)]*\)\s*(?:\w+\s*)*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/g;
    return matchAll(code, regex, 'constructor');
}

function extractExternalFunctions(code) {
    const regex = /function\s+(\w+)\s*\([^)]*\)\s*(?:external|public)[^{]*\{/g;
    return matchAll(code, regex, 'external_function');
}

function extractPayableFunctions(code) {
    const regex = /function\s+(\w+)\s*\([^)]*\)\s*[^{]*payable[^{]*\{/g;
    return matchAll(code, regex, 'payable_function');
}

function extractModifiers(code) {
    const regex = /modifier\s+(\w+)\s*\([^)]*\)\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/g;
    return matchAll(code, regex, 'modifier');
}

function extractEvents(code) {
    const regex = /event\s+(\w+)\s*\([^)]*\)\s*;/g;
    return matchAll(code, regex, 'event');
}

function extractImports(code) {
    const regex = /import\s+.*?[";]/g;
    return matchAll(code, regex, 'import');
}

function extractStateVariables(code) {
    // Match common state variable patterns: mapping, address, uint, bool, etc.
    const regex = /^\s*(mapping|address|uint\d*|int\d*|bool|string|bytes\d*)\s+(public|private|internal)?\s*(\w+)/gm;
    return matchAll(code, regex, 'state_variable');
}

function extractOwnerFunctions(code) {
    const regex = /function\s+(\w+)\s*\([^)]*\)\s*[^{]*(onlyOwner|onlyAdmin|onlyRole)[^{]*\{/g;
    return matchAll(code, regex, 'owner_function');
}

function extractFunctionByName(code, functionName) {
    const safeName = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
        `function\\s+${safeName}\\s*\\([^)]*\\)[^{]*\\{`,
        'gi'
    );
    const results = matchAll(code, regex, 'function');

    // If no function found, try searching for the term as a general pattern
    if (results.length === 0) {
        const lines = code.split('\n');
        const matches = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(functionName.toLowerCase())) {
                matches.push({
                    type: 'pattern_match',
                    lineNumber: i + 1,
                    content: lines[i].trim(),
                    context: lines.slice(Math.max(0, i - 1), i + 3).join('\n'),
                });
            }
        }
        return matches.slice(0, 10);
    }

    return results;
}

// ─── Helper ──────────────────────────────────────────────────

function matchAll(code, regex, type) {
    const results = [];
    let match;

    while ((match = regex.exec(code)) !== null) {
        // Find line number
        const beforeMatch = code.substring(0, match.index);
        const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;

        results.push({
            type,
            lineNumber,
            content: match[0].substring(0, 500), // Limit content length
            name: match[1] || null,
        });
    }

    return results;
}

export default { createCodeParserTool };
