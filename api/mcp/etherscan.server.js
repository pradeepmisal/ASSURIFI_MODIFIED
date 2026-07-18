import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "JZ6J8YIBP8HN3S53NJRCDUAWEZ26XE5UZQ";
const BASE_URL = "https://api.etherscan.io/v2/api?chainid=1";

const server = new Server(
  {
    name: "AssureFi-Etherscan-MCP",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "etherscan_fetch",
        description: "Fetches verified smart contract Solidity source code and ABI from Etherscan.",
        inputSchema: {
          type: "object",
          properties: {
            address: { type: "string", description: "The Ethereum smart contract address to inspect." }
          },
          required: ["address"]
        }
      },
      {
        name: "etherscan_get_implementation",
        description: "Resolves the actual logic contract address if the target address is an upgradeable proxy.",
        inputSchema: {
          type: "object",
          properties: {
            proxyAddress: { type: "string", description: "The proxy contract address." }
          },
          required: ["proxyAddress"]
        }
      },
      {
        name: "etherscan_get_deployer_contracts",
        description: "Queries the oldest transactions of a creator wallet address to retrieve all smart contracts deployed by that wallet.",
        inputSchema: {
          type: "object",
          properties: {
            deployerAddress: { type: "string", description: "The deployer wallet address." }
          },
          required: ["deployerAddress"]
        }
      },
      {
        name: "etherscan_get_upgrade_history",
        description: "Scans Etherscan event logs to construct the chronological history of upgrades for a proxy contract.",
        inputSchema: {
          type: "object",
          properties: {
            proxyAddress: { type: "string", description: "The proxy contract address." }
          },
          required: ["proxyAddress"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "etherscan_fetch") {
      const address = args.address;
      const url = `${BASE_URL}&module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data || data.status !== "1" || !data.result || !data.result[0]) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "No source code found or unverified" }) }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data.result[0], null, 2) }] };
    }

    if (name === "etherscan_get_implementation") {
      const proxyAddress = args.proxyAddress;
      const url = `${BASE_URL}&module=contract&action=getsourcecode&address=${proxyAddress}&apikey=${ETHERSCAN_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.status === "1" && data.result && data.result[0]) {
        const impl = data.result[0].Implementation || "";
        return { content: [{ type: "text", text: JSON.stringify({ isProxy: !!impl && impl !== proxyAddress, implementationAddress: impl }) }] };
      }
      return { content: [{ type: "text", text: JSON.stringify({ isProxy: false, implementationAddress: "" }) }] };
    }

    if (name === "etherscan_get_deployer_contracts") {
      const deployerAddress = args.deployerAddress;
      const url = `${BASE_URL}&module=account&action=txlist&address=${deployerAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${ETHERSCAN_API_KEY}&page=1&offset=100`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data || data.status !== "1" || !data.result) {
        return { content: [{ type: "text", text: JSON.stringify([]) }] };
      }
      const creations = data.result
        .filter(tx => tx.contractAddress && tx.contractAddress.trim() !== "")
        .map(tx => ({
          address: tx.contractAddress,
          txHash: tx.hash,
          date: tx.timeStamp ? new Date(parseInt(tx.timeStamp) * 1000).toISOString() : null
        }));
      return { content: [{ type: "text", text: JSON.stringify(creations, null, 2) }] };
    }

    if (name === "etherscan_get_upgrade_history") {
      const proxyAddress = args.proxyAddress;
      const UPGRADED_TOPIC = "0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b";
      const url = `${BASE_URL}&module=logs&action=getLogs&address=${proxyAddress}&topic0=${UPGRADED_TOPIC}&apikey=${ETHERSCAN_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data || data.status !== "1" || !data.result) {
        return { content: [{ type: "text", text: JSON.stringify([]) }] };
      }
      const upgrades = data.result.map((log, index) => ({
        version: `v${index + 1}`,
        txHash: log.transactionHash,
        implementation: "0x" + log.data.slice(-40),
        date: log.timeStamp ? new Date(parseInt(log.timeStamp, 16) * 1000).toISOString() : null
      }));
      return { content: [{ type: "text", text: JSON.stringify(upgrades, null, 2) }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: error.message }) }],
      isError: true,
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AssureFi Etherscan MCP Server running on stdio");
}

runServer();
