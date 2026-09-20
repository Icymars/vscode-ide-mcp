import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as net from "net";
import { TOOLS } from "./tools";

const HOST = "127.0.0.1";
const PORTS = [47810, 47811, 47812, 47813, 47814];
const RETRY_DELAY_MS = 500;

function callIDE(method: string, args: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let portIdx = 0;

    function tryPort() {
      if (settled) return;
      if (portIdx >= PORTS.length) {
        settled = true;
        reject(new Error("nessun IDE bridge raggiungibile: nessuna porta disponibile"));
        return;
      }
      const id = Math.random().toString(36).slice(2);
      const socket = net.connect(PORTS[portIdx], HOST, () => {
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
        portIdx += 1;
        setTimeout(tryPort, RETRY_DELAY_MS);
      });
    }

    tryPort();
  });
}

async function main(): Promise<void> {
  // API corrente: McpServer + registerTool sostituisce la classe Server
  // (deprecata) e i due setRequestHandler per tools/list e tools/call.
  const mcp = new McpServer(
    { name: "vscode-ide-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  for (const t of TOOLS) {
    mcp.registerTool(
      t.name,
      {
        description: t.description,
        inputSchema: t.inputSchema
      },
      async (args: any) => {
        const result = await callIDE(t.name, (args as Record<string, unknown>) || {});
        const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
        return { content: [{ type: "text" as const, text }] };
      }
    );
  }

  const transport = new StdioServerTransport();
  await mcp.connect(transport);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
