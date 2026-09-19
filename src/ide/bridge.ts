import * as net from "net";
import { executeIDECall } from "./calls";

const HOST = "127.0.0.1";
const PORT = 47810;

let server: net.Server | null = null;

/**
 * Avvia un listener TCP dentro l'estensione. Ogni connessione riceve righe
 * JSON: {id, method, args} e risponde con {id, result} oppure {id, error}.
 */
export function startBridge(): number {
  if (server) {
    return PORT;
  }
  server = net.createServer((socket) => {
    let buf = "";
    socket.on("data", (data: Buffer) => {
      buf += data.toString();
      let idx: number;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) {
          continue;
        }
        let req: { id: string | number; method: string; args?: Record<string, unknown> };
        try {
          req = JSON.parse(line);
        } catch {
          socket.write(JSON.stringify({ id: null, error: "json non valido" }) + "\n");
          continue;
        }
        void handleRequest(socket, req);
      }
    });
    socket.on("error", () => {});
    socket.on("close", () => {});
  });
  server.listen(PORT, HOST);
  return PORT;
}

async function handleRequest(
  socket: net.Socket,
  req: { id: string | number; method: string; args?: Record<string, unknown> }
): Promise<void> {
  try {
    const result = await executeIDECall(req.method, req.args || {});
    socket.write(JSON.stringify({ id: req.id, result }) + "\n");
  } catch (e) {
    socket.write(JSON.stringify({ id: req.id, error: (e as Error).message }) + "\n");
  }
}

export function stopBridge(): void {
  if (server) {
    server.close();
    server = null;
  }
}

export function isBridgeRunning(): boolean {
  return server !== null;
}
