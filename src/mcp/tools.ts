/**
 * Definisce i tool MCP esposti a Kilo. Il nome del tool coincide col metodo
 * IDE invocato nel bridge (mappatura identità).
 */

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const base = (props: Record<string, unknown>, required: string[] = []): Record<string, unknown> => ({
  type: "object",
  properties: props,
  required,
  additionalProperties: false,
});

export const TOOLS: McpTool[] = [
  {
    name: "get_active_editor",
    description: "Restituisce il file attivo nel VS Code: percorso, lingua, posizione cursore, testo selezionato.",
    inputSchema: base({}),
  },
  {
    name: "show_document",
    description: "Apre un documento in un editor e porta il cursore sulla riga/colonna specificate.",
    inputSchema: base(
      {
        uri: { type: "string", description: "URI del file (es. file:///path/oppure percorso)" },
        line: { type: "integer", description: "Riga (0-based) da rivelare" },
        col: { type: "integer", description: "Colonna (0-based) da rivelare" },
      },
      ["uri"]
    ),
  },
  {
    name: "go_to_definition",
    description: "Trova le definizioni del simbolo nella posizione specificata (LSP).",
    inputSchema: base(
      {
        uri: { type: "string" },
        line: { type: "integer", description: "Riga 0-based" },
        col: { type: "integer", description: "Colonna 0-based" },
      },
      ["uri", "line", "col"]
    ),
  },
  {
    name: "find_references",
    description: "Trova tutti i riferimenti del simbolo nella posizione specificata (LSP).",
    inputSchema: base(
      {
        uri: { type: "string" },
        line: { type: "integer" },
        col: { type: "integer" },
      },
      ["uri", "line", "col"]
    ),
  },
  {
    name: "get_outline",
    description: "Restituisce l'outline dei simboli di un documento (funzioni, classi, metodi).",
    inputSchema: base({ uri: { type: "string" }}, ["uri"]),
  },
  {
    name: "start_debug",
    description: "Avvia una sessione di debug per nome di configurazione o con un oggetto di configurazione.",
    inputSchema: base(
      {
        name: { type: "string", description: "Nome della configurazione launch.json" },
        config: { type: "object", description: "Oggetto di configurazione debug completa" },
      }
    ),
  },
  {
    name: "stop_debug",
    description: "Ferma la sessione di debug attiva.",
    inputSchema: base({}),
  },
  {
    name: "add_breakpoints",
    description: "Imposta punti di interruzione su un file. 'lines' è una lista di righe (0-based).",
    inputSchema: base(
      {
        uri: { type: "string" },
        lines: { type: "array", items: { type: "integer" } },
        condition: { type: "string", description: "Condizione opzionale per breakpoint condizionale" },
      },
      ["uri", "lines"]
    ),
  },
  {
    name: "debug_step",
    description: "Esegue un passo di stepping: over (default), into, out oppure continue.",
    inputSchema: base(
      {
        kind: { type: "string", enum: ["over", "into", "out", "continue"], description: "Tipo di passo (default: over)" },
      }
    ),
  },
  {
    name: "get_stack_frames",
    description: "Restituisce gli stack frame della sessione di debug attiva (richiede l'API proposta DebugAdapterTracker).",
    inputSchema: base({}),
  },
  {
    name: "get_variables",
    description: "Legge le variabili di uno scope della sessione di debug attiva (variabile di riferimento opzionale).",
    inputSchema: base({
      variablesReference: { type: "integer", description: "Riferimento variabile (default: 1 = scope locale)" },
    }),
  },
  {
    name: "debug_evaluate",
    description: "Valuta un'espressione nella console di debug attiva.",
    inputSchema: base(
      {
        expression: { type: "string" },
        frameId: { type: "integer", description: "ID dello stack frame (default: 0)" },
      },
      ["expression"]
    ),
  },
  {
    name: "execute_command",
    description: "Esegue un comando VS Code per ID, con argomenti opzionali.",
    inputSchema: base(
      {
        command: { type: "string", description: "ID del comando (es. 'workbench.action.closeActiveEditor')" },
        args: { type: "array", description: "Argomenti opzionali da passare al comando" },
      },
      ["command"]
    ),
  },
  {
    name: "get_hover",
    description: "Restituisce le informazioni hover (tipo, documentazione) del simbolo sotto il cursore (LSP).",
    inputSchema: base({}),
  },
  {
    name: "get_diagnostics",
    description: "Restituisce i diagnostics (errori/avvisi) del file attivo (max 200 righe).",
    inputSchema: base({}),
  },
  {
    name: "read_file",
    description: "Legge il contenuto di un file del workspace.",
    inputSchema: base({ uri: { type: "string" }}, ["uri"]),
  },
  {
    name: "write_file",
    description: "Scrive (crea o sovrascrive) il contenuto di un file del workspace.",
    inputSchema: base(
      {
        uri: { type: "string" },
        content: { type: "string" },
      },
      ["uri", "content"]
    ),
  },
];

/** Il nome del tool è identico al metodo IDE: mappatura identità. */
export function methodForTool(_name: string): string {
  return _name;
}
