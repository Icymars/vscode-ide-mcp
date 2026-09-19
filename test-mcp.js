const { spawn } = require("child_process");

const server = spawn("node", ["out/mcp-server.js"], {
  cwd: process.cwd(),
  stdio: ["pipe", "pipe", "inherit"],
});

let buf = "";
const responses = [];
server.stdout.on("data", (d) => {
  buf += d.toString();
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (line) responses.push(line);
  }
});

const msgs = [
  JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "smoke", version: "0.0.0" },
    },
  }),
  JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
];

let i = 0;
function send() {
  if (i < msgs.length) {
    server.stdin.write(msgs[i] + "\n");
    i++;
    setTimeout(send, 200);
  }
}
send();

setTimeout(() => {
  console.log("Risposte MCP ricevute:", responses.length);
  for (const r of responses) {
    let obj;
    try {
      obj = JSON.parse(r);
    } catch {
      continue;
    }
    if (obj.id === 1) {
      console.log("initialize -> serverName:", obj.result?.serverInfo?.name, "version:", obj.result?.serverInfo?.version);
    }
    if (obj.id === 2) {
      const tools = (obj.result?.tools || []).map((t) => t.name);
      console.log("tools/list -> n.", tools.length, "tool:", tools.join(", "));
    }
  }
  server.kill();
  process.exit(0);
}, 2500);
