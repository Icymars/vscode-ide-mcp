import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as net from "net";
import { TOOLS, methodForTool } from "./tools";

const HOST = "127.0.0.1";
const PORT = 47810;
const RETRIES = 3;
const RETRY_DELAY_MS = 500;

function callIDE(method: string, args: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    let settled = false;

    function tryConnect() {
      attempt += 1;
      const id = Math.random().toString(36).slice(2);
      const socket = net.connect(PORT, HOST, () => {
        socket.write(JSON.stringify({ id, method, args }) + "\n");
      });
      const timer = setTimeout(() => {
        socket.destroy();
        if (!settled) reject(new Error("timeout attesa risposta IDE bridge"));
      }, 8000);

      socket.on("data", (data: Buffer) => {
        const line = data.toString().trim();
        if (!line) return;
        const resp = JSON.parse(line);
        clearTimeout(timer);
        socket.end();
        if (settled) return;
        settled = true;
        if (resp.error) reject(new Error(resp.error));
        else resolve(resp.result);
      });
      socket.on("error", (e: Error) => {
        clearTimeout(timer);
        if (settled) return;
        if (attempt < RETRIES) {
          setTimeout(tryConnect, RETRY_DELAY_MS);
        } else {
          settled = true;
          reject(new Error("nessun IDE bridge raggiungibile: " + e.message));
        }
      });
    }

    tryConnect();
  });
}

async function main(): Promise<void> {
  const server = new Server(
    { name: "vscode-ide-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const args = (req.params.arguments as Record<string, unknown>) || {};
    const method = methodForTool(req.params.name);
    const result = await callIDE(method, args);
    const text =
      typeof result === "string" ? result : JSON.stringify(result, null, 2);
    return { content: [{ type: "text", text }] };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
