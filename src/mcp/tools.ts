import * as z from "zod/v4-mini";
import type { AnySchema } from "@modelcontextprotocol/sdk/server/zod-compat.js";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: AnySchema;
}

export const TOOLS: McpTool[] = [
  {
    name: "get_active_editor",
    description: "Restituisce il file attivo nel VS Code: percorso, lingua, posizione cursore, testo selezionato.",
    inputSchema: z.strictObject({}),
  },
  {
    name: "show_document",
    description: "Apre un documento in un editor e porta il cursore sulla riga/colonna specificate.",
    inputSchema: z.strictObject({
      uri: z.string(),
      line: z.optional(z.int()),
      col: z.optional(z.int()),
    }),
  },
  {
    name: "go_to_definition",
    description: "Trova le definizioni del simbolo nella posizione specificata (LSP).",
    inputSchema: z.strictObject({
      uri: z.string(),
      line: z.int(),
      col: z.int(),
    }),
  },
  {
    name: "find_references",
    description: "Trova tutti i riferimenti del simbolo nella posizione specificata (LSP).",
    inputSchema: z.strictObject({
      uri: z.string(),
      line: z.int(),
      col: z.int(),
    }),
  },
  {
    name: "get_outline",
    description: "Restituisce l'outline dei simboli di un documento (funzioni, classi, metodi).",
    inputSchema: z.strictObject({
      uri: z.string(),
    }),
  },
  {
    name: "start_debug",
    description: "Avvia una sessione di debug per nome di configurazione o con un oggetto di configurazione.",
    inputSchema: z.object({
      name: z.optional(z.string()),
      config: z.optional(z.record(z.string(), z.unknown())),
    }),
  },
  {
    name: "stop_debug",
    description: "Ferma la sessione di debug attiva.",
    inputSchema: z.strictObject({}),
  },
  {
    name: "add_breakpoints",
    description: "Imposta punti di interruzione su un file. 'lines' è una lista di righe (0-based).",
    inputSchema: z.strictObject({
      uri: z.string(),
      lines: z.array(z.int()),
      condition: z.optional(z.string()),
    }),
  },
  {
    name: "debug_step",
    description: "Esegue un passo di stepping: over (default), into, out oppure continue.",
    inputSchema: z.object({
      kind: z.optional(z.enum(["over", "into", "out", "continue"])),
    }),
  },
  {
    name: "get_stack_frames",
    description: "Restituisce gli stack frame della sessione di debug attiva (richiede l'API proposta DebugAdapterTracker).",
    inputSchema: z.strictObject({}),
  },
  {
    name: "get_variables",
    description: "Legge le variabili di uno scope della sessione di debug attiva (variabile di riferimento opzionale).",
    inputSchema: z.object({
      variablesReference: z.optional(z.int()),
    }),
  },
  {
    name: "debug_evaluate",
    description: "Valuta un'espressione nella console di debug attiva.",
    inputSchema: z.strictObject({
      expression: z.string(),
      frameId: z.optional(z.int()),
    }),
  },
  {
    name: "execute_command",
    description: "Esegue un comando VS Code per ID, con argomenti opzionali.",
    inputSchema: z.object({
      command: z.string(),
      args: z.optional(z.array(z.unknown())),
    }),
  },
  {
    name: "get_hover",
    description: "Restituisce le informazioni hover (tipo, documentazione) del simbolo sotto il cursore (LSP).",
    inputSchema: z.strictObject({}),
  },
  {
    name: "get_diagnostics",
    description: "Restituisce i diagnostics (errori/avvisi) del file attivo (max 200 righe).",
    inputSchema: z.strictObject({}),
  },
  {
    name: "read_file",
    description: "Legge il contenuto di un file del workspace.",
    inputSchema: z.strictObject({
      uri: z.string(),
    }),
  },
  {
    name: "write_file",
    description: "Scrive (crea o sovrascrive) il contenuto di un file del workspace.",
    inputSchema: z.strictObject({
      uri: z.string(),
      content: z.string(),
    }),
  },
];

/** Il nome del tool è identico al metodo IDE: mappatura identità. */
export function methodForTool(_name: string): string {
  return _name;
}
