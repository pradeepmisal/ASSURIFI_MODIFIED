import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { DynamicTool } from "@langchain/core/tools";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mcpClientInstance = null;

/**
 * Initializes and connects the Etherscan MCP Client.
 * Uses StdioClientTransport to spawn the standalone MCP Server process.
 */
export async function getMcpClient() {
  if (mcpClientInstance) {
    return mcpClientInstance;
  }

  const serverPath = path.join(__dirname, "etherscan.server.js");
  const transport = new StdioClientTransport({
    command: process.execPath, // node binary
    args: [serverPath],
  });

  const client = new Client(
    { name: "AssureFi-Auditor-Client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  mcpClientInstance = client;
  return mcpClientInstance;
}

/**
 * Discovers tools from the MCP Server and maps them into LangChain DynamicTool instances.
 * @param {Object} metricsTracker - Optional metrics tracker
 * @returns {Promise<Array<DynamicTool>>}
 */
export async function getMcpContractTools(metricsTracker = null) {
  const client = await getMcpClient();
  const { tools: mcpTools } = await client.listTools();

  return mcpTools.map((tool) => {
    return new DynamicTool({
      name: tool.name,
      description: tool.description,
      func: async (input) => {
        const start = Date.now();
        let parsedArgs = {};
        const trimmedInput = typeof input === "string" ? input.trim() : input;

        // Map input string to primary argument expected by tool schema
        if (tool.name === "etherscan_fetch") {
          parsedArgs = { address: trimmedInput };
        } else if (tool.name === "etherscan_get_implementation" || tool.name === "etherscan_get_upgrade_history") {
          parsedArgs = { proxyAddress: trimmedInput };
        } else if (tool.name === "etherscan_get_deployer_contracts") {
          parsedArgs = { deployerAddress: trimmedInput };
        } else {
          parsedArgs = typeof input === "object" ? input : { input: trimmedInput };
        }

        try {
          const response = await client.callTool({
            name: tool.name,
            arguments: parsedArgs,
          });

          const textResult = response.content && response.content[0] ? response.content[0].text : JSON.stringify(response);

          if (metricsTracker) {
            metricsTracker.recordToolExecution(tool.name, true, Date.now() - start);
          }

          return textResult;
        } catch (err) {
          if (metricsTracker) {
            metricsTracker.recordToolExecution(tool.name, false, Date.now() - start, err.message);
          }
          return JSON.stringify({ success: false, error: err.message });
        }
      },
    });
  });
}
