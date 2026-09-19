const { spawn } = require("child_process");
const net = require("net");

const HOST = "127.0.0.1";
const PORT = 47810;

// Risultati mock: ricalcano le forme restituite da src/ide/calls.ts
const MOCK_RESULTS = {
  get_active_editor: {
    active: true,
    uri: "file:///mock/extension.ts",
    fileName: "extension.ts",
    languageId: "typescript",
    cursorLine: 10,
    cursorCol: 5,
    selectedText: "foo",
    isDirty: false,
  },
  show_document: {
    uri: "file:///mock/extension.ts",
    revealedLine: 3,
    revealedCol: 1,
    editorActive: true,
  },
  go_to_definition: {
    navigated: true,
    file: "file:///mock/calls.ts",
    line: 55,
    col: 12,
  },
  find_references: {
    openedReferencesView: true,
    file: "file:///mock/extension.ts",
    note: "La vista Riferimenti è aperta nella sidebar; i riferimenti sono visibili lì.",
  },
  get_outline: {
    openedOutlineView: true,
    file: "file:///mock/extension.ts",
    note: "L'outline del file è aperto nella vista Simboli.",
  },
  start_debug: { started: true, byName: "Node" },
  stop_debug: { stopped: true },
  add_breakpoints: { uri: "file:///mock/extension.ts", breakpointsSet: 2 },
  debug_step: { step: "over", command: "workbench.action.debugStepOver" },
  get_stack_frames: {
    active: true,
    count: 2,
    frames: [
      { id: 1, name: "main", file: "extension.ts", line: 12 },
      { id: 2, name: "activate", file: "extension.ts", line: 4 },
    ],
  },
  get_variables: {
    active: true,
    count: 1,
    variables: [{ name: "x", value: "42", type: "number", ref: 7 }],
  },
  debug_evaluate: { active: true, expression: "2+2", value: "4", isError: false },
};

const CALLS = [
  ["get_active_editor", {}],
  ["show_document", { uri: "file:///mock/extension.ts", line: 3, col: 1 }],
  ["go_to_definition", { uri: "file:///mock/extension.ts", line: 10, col: 5 }],
  ["find_references", { uri: "file:///mock/extension.ts", line: 10, col: 5 }],
  ["get_outline", { uri: "file:///mock/extension.ts" }],
  ["start_debug", { name: "Node" }],
  ["stop_debug", {}],
  ["add_breakpoints", { uri: "file:///mock/extension.ts", lines: [12, 40] }],
  ["debug_step", { kind: "over" }],
  ["get_stack_frames", {}],
  ["get_variables", { variablesReference: 1 }],
  ["debug_evaluate", { expression: "2+2" }],
];

let server;
let buf = "";
const pending = new Map();

function startServer() {
  server = spawn("node", ["out/mcp-server.js"], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "inherit"],
  });
  server.stdout.on("data", (d) => {
    buf += d.toString();
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) return;
      const msg = JSON.parse(line);
      if (msg.id !== undefined && pending.has(msg.id)) {
        const cb = pending.get(msg.id);
        pending.delete(msg.id);
        cb(msg);
      }
    }
  });
  return new Promise((resolve) => {
    setTimeout(resolve, 400);
  });
}

function rpc(id, method, params) {
  return new Promise((resolve, reject) => {
    pending.set(id, (msg) => {
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg);
    });
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error("timeout attesa risposta " + method));
      }
    }, 15000);
  });
}

function startMockBridge() {
  return new Promise((resolve) => {
    const server = net.createServer((socket) => {
      let data = "";
      socket.on("data", (d) => {
        data += d.toString();
        let idx;
        while ((idx = data.indexOf("\n")) >= 0) {
          const line = data.slice(0, idx);
          data = data.slice(idx + 1);
          if (!line.trim()) continue;
          const req = JSON.parse(line);
          const result = MOCK_RESULTS[req.method];
          socket.write(JSON.stringify({ id: req.id, result }) + "\n");
          socket.destroy();
        }
      });
      socket.on("error", () => {});
    });
    server.on("error", (e) => {
      if (e.code === "EADDRINUSE") resolve(null);
      else {
        console.error("mock bridge error:", e.message);
        resolve(null);
      }
    });
    server.listen(PORT, HOST, () => resolve(server));
  });
}

async function main() {
  const mockServer = await startMockBridge();
  const mockMode = mockServer !== null;
  console.log(mockMode ? "Modalità: mock bridge su 127.0.0.1:" + PORT : "Modalità: bridge live (porta già in uso da VS Code)");

  await startServer();

  const init = await rpc(1, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "e2e", version: "0.0.0" },
  });
  console.log("initialize -> serverName:", init.result.serverInfo.name, "version:", init.result.serverInfo.version);
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  const list = await rpc(2, "tools/list", {});
  const tools = (list.result.tools || []).map((t) => t.name);
  console.log("tools/list ->", tools.length, "tool:", tools.join(", "));
  const expectedTools = CALLS.map((c) => c[0]);
  const missingTools = expectedTools.filter((t) => !tools.includes(t));
  if (missingTools.length) {
    console.log("MANCANO tool attesi:", missingTools.join(", "));
  }

  let pass = 0;
  let fail = 0;

  for (let i = 0; i < CALLS.length; i++) {
    const [name, args] = CALLS[i];
    const id = 100 + i;
    let res;
    try {
      res = await rpc(id, "tools/call", { name, arguments: args });
    } catch (e) {
      fail++;
      console.log("FAIL", name, "-> errore protocollo:", e.message);
      continue;
    }
    if (res.error) {
      fail++;
      console.log("FAIL", name, "-> errore JSON-RPC:", JSON.stringify(res.error));
      continue;
    }
    const r = res.result || {};
    if (r.isError) {
      fail++;
      console.log("FAIL", name, "-> isError:", (r.content?.[0]?.text || "").slice(0, 120));
      continue;
    }
    const text = (r.content && r.content[0] && r.content[0].text) || "";
    if (mockMode) {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        fail++;
        console.log("FAIL", name, "-> testo non-JSON:", text.slice(0, 120));
        continue;
      }
      const expected = MOCK_RESULTS[name];
      let bad = false;
      for (const k of Object.keys(expected)) {
        if (!(k in parsed) || JSON.stringify(expected[k]) !== JSON.stringify(parsed[k])) {
          fail++;
          console.log("FAIL", name, "-> campo '" + k + "' atteso:", JSON.stringify(expected[k]), "ottenuto:", JSON.stringify(parsed[k]));
          bad = true;
          break;
        }
      }
      if (bad) continue;
    } else if (!text) {
      fail++;
      console.log("FAIL", name, "-> senza contenuto");
      continue;
    }
    pass++;
    console.log("OK", name);
  }

  if (mockMode && mockServer) {
    if (typeof mockServer.closeAllConnections === "function") mockServer.closeAllConnections();
    await new Promise((r) => mockServer.close(r));
    try {
      const res = await rpc(999, "tools/call", { name: "get_active_editor", arguments: {} });
      const errText = res.error ? JSON.stringify(res.error) : "";
      const r = res.result || {};
      const text = (r.content && r.content[0] && r.content[0].text) || "";
      if (errText.includes("nessun IDE bridge raggiungibile") || text.includes("nessun IDE bridge raggiungibile")) {
        pass++;
        console.log("OK percorso errore: bridge non raggiungibile");
      } else {
        fail++;
        console.log("FAIL percorso errore: ottenuto:", (errText || text || JSON.stringify(res)).slice(0, 150));
      }
    } catch (e) {
      if (e.message.includes("nessun IDE bridge raggiungibile")) {
        pass++;
        console.log("OK percorso errore: bridge non raggiungibile");
      } else {
        fail++;
        console.log("FAIL percorso errore (reject):", e.message.slice(0, 150));
      }
    }
  }

  console.log("\nRiepilogo:", pass, "ok,", fail, "falliti");
  server.kill();
  process.exit(fail === 0 && missingTools.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERRORE TEST:", e);
  if (server) server.kill();
  process.exit(1);
});
