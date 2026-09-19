# vscode-ide-mcp

Ponte tra gli strumenti nativi di VS Code e qualsiasi agente AI con
supporto MCP (Kilo, Cursor, Cline, ecc.): espone la navigazione LSP
(definizioni, riferimenti, outline) e il debug nativo (breakpoint, stepping,
stack frame, variabili, evaluate) come **server MCP standard** (protocollo
MCP su stdio). Funziona con qualsiasi client MCP, non solo Kilo.

Architettura:

- Un'**estensione VS Code** (TypeScript) parte, all'avvio, di un listener
  TCP (host 127.0.0.1, porta **47810**) nel processo extension host, dove il
  modulo `vscode` è disponibile.
- Un **server MCP** (`out/mcp-server.js`) gira come processo figlio lanciato
  dal tuo agente (stdio) e si collega al bridge per eseguire le chiamate
  `vscode.*`. Essendo un server MCP standard, lo stesso file funziona con
  qualsiasi client MCP, non solo Kilo.

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

## Registra il server MCP nel tuo agente

Il server è standard: lo stesso `out/mcp-server.js` si registra nella
configurazione MCP del tuo agente (Kilo, Cursor, Cline, ecc.). Di seguito
l'esempio per Kilo; gli altri agenti usano il proprio formato di
configurazione (es. Cursor: `mcp.json`, Cline: pannello MCP). Due scelte
per Kilo:

**Livello progetto** — in `kilo.json` nella radice del progetto corrente:

```jsonc
{
  "mcp": {
    "vscode-ide": {
      "type": "local",
      "command": ["node", "<dir_estensione>/out/mcp-server.js"]
    }
  }
}
```

**Livello globale** — in `~/.config/kilo/kilo.json` (Windows:
`%USERPROFILE%\.config\kilo\kilo.json`), così funziona in tutti i progetti:

```jsonc
{
  "mcp": {
    "vscode-ide": {
      "type": "local",
      "command": ["node", "<dir_estensione>/out/mcp-server.js"]
    }
  }
}
```

Dopo aver installato l'estensione, `dir_estensione` è
`~/.vscode/extensions/RiccardoStatuto.vscode-ide-mcp-<versione>/out/mcp-server.js`
(oppure `Code --list-extensions` + percorso installato).

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
| `execute_command` | Esegue un comando VS Code per ID, con argomenti opzionali |
| `get_hover` | Informazioni hover del simbolo sotto il cursore (LSP) |
| `get_diagnostics` | Errori/avvisi del file attivo (max 200 righe) |
| `read_file` | Legge il contenuto di un file del workspace |
| `write_file` | Crea o sovrascrive un file del workspace |

## Soluzione globale

Per coprire tutti i progetti (anche non-Dart), l'approccio è **language-agnostic**:
la navigazione usa l'LSP di VS Code e il debug usa le configurazioni di
`launch.json` del progetto (node, python, go, dart, ecc.). Questo progetto è
indipendente dal linguaggio.

## Troubleshooting

- **"nessun IDE bridge raggiungibile"** → l'estensione non è caricata o il
  bridge non è avviato. Carica l'estensione (F5) e verifica che il comando
  `IDE MCP: Avvia bridge` funzioni.
- **Porta 47810 occupata** → il bridge prova automaticamente le porte
  47811–47814; il server MCP prova lo stesso elenco nella stessa ordine.
  Se vuoi cambiare la porta base, modifica `PORT` in `src/ide/bridge.ts` e
  `PORTS` in `src/mcp/server.ts`, poi `npm run build`.
- **Stack/variabili tornano "DebugAdapterTracker non disponibile"** → la versione
  di VS Code non espone l'API proposta; aggiorna VS Code all'ultima versione.

## Fonti (ricerca web)

- https://code.visualstudio.com/api/references/vscode-api
- https://code.visualstudio.com/api/extension-guides/debugger-extension
- https://kilo.ai/docs/code-with-ai/platforms/vscode
