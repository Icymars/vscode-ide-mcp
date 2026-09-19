# vscode-ide-mcp

Ponte tra gli strumenti nativi di VS Code e l'agente Kilo: espone la
navigazione LSP (definizioni, riferimenti, outline) e il debug nativo
(breakpoint, stepping, stack frame, variabili, evaluate) come **server MCP**.

Architettura:

- Un'**estensione VS Code** (TypeScript) parte, all'avvio, di un listener
  TCP (host 127.0.0.1, porta **47810**) nel processo extension host, dove il
  modulo `vscode` è disponibile.
- Un **server MCP** (`out/mcp-server.js`) gira come processo figlio lanciato da
  Kilo (stdio) e si collega al bridge per eseguire le chiamate `vscode.*`.

## Installazione e build

```bash
npm install
npm run build        # genera out/extension.js e out/mcp-server.js
```

Per sviluppare l'estensione in locale:

```bash
npm run watch         # watch esbuild
```

Carica l'estensione:

- In VS Code: apri questa cartella, premi F5 (Extension Development Host).
- Oppure genera un `.vsix` (`npm run package` richiede `@vscode/vsce`) e
  installalo con `code --install-extension`.

## Registra il server MCP in Kilo

Il server MCP va dichiarato nel file di configurazione di Kilo, così l'agente
vede i tool. Due scelte:

**Livello progetto** — in `E:\Aidiatech\app\aidiafit\kilo.json` (o questo
progetto):

```jsonc
{
  "mcp": {
    "vscode-ide": {
      "type": "local",
      "command": ["node", "E:/Aidiatech/app/vscode-ide-mcp/out/mcp-server.js"]
    }
  }
}
```

**Livello globale** — in `~/.config/kilo/kilo.json` (su questo PC:
`C:\Users\icyma\.config\kilo\kilo.json`), così funziona in tutti i progetti:

```jsonc
{
  "mcp": {
    "vscode-ide": {
      "type": "local",
      "command": ["node", "E:/Aidiatech/app/vscode-ide-mcp/out/mcp-server.js"]
    }
  }
}
```

I tool risultano disponibili come `vscode-ide_<tool>` (es.
`vscode-ide_go_to_definition`).

## Tool disponibili

| Tool | Descrizione |
|---|---|
| `get_active_editor` | File attivo: percorso, lingua, cursore, selezione |
| `show_document` | Apre un documento e porta il cursore su riga/colonna |
| `go_to_definition` | Definizione del simbolo (LSP) |
| `find_references` | Riferimenti del simbolo (LSP) |
| `get_outline` | Outline dei simboli di un file |
| `start_debug` | Avvia una sessione di debug (per nome o config) |
| `stop_debug` | Ferma la sessione di debug |
| `add_breakpoints` | Imposta breakpoint su righe date |
| `debug_step` | Stepping: over/into/out/continue |
| `get_stack_frames` | Stack frame (richiede API proposta `DebugAdapterTracker`) |
| `get_variables` | Variabili di uno scope di debug |
| `debug_evaluate` | Evaluate un'espressione nella console di debug |

## Soluzione globale

Per coprire tutti i progetti (anche non-Dart), l'approccio è **language-agnostic**:
la navigazione usa l'LSP di VS Code e il debug usa le configurazioni di
`launch.json` del progetto (node, python, go, dart, ecc.). Questo progetto è
indipendente dal linguaggio.

## Troubleshooting

- **"nessun IDE bridge raggiungibile"** → l'estensione non è caricata o il
  bridge non è avviato. Carica l'estensione (F5) e verifica che il comando
  `IDE MCP: Avvia bridge` funzioni.
- **Porta 47810 già occupata** → cambia `PORT` in `src/ide/bridge.ts` (e
  `src/mcp/server.ts`) poi rifai `npm run build`.
- **Stack/variabili tornano "DebugAdapterTracker non disponibile"** → la versione
  di VS Code non espone l'API proposta; aggiorna VS Code all'ultima versione.

## Fonti (ricerca web)

- https://code.visualstudio.com/api/references/vscode-api
- https://code.visualstudio.com/api/extension-guides/debugger-extension
- https://kilo.ai/docs/code-with-ai/platforms/vscode
