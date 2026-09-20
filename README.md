# vscode-ide-mcp

A bridge between VS Code's native tools and any AI agent with MCP
support (Kilo, Cursor, Cline, etc.): it exposes LSP navigation
(definitions, references, outline) and native debugging (breakpoints,
stepping, stack frames, variables, evaluate) as a **standard MCP server**
(MCP protocol over stdio). It works with any MCP client, not just Kilo.

Architecture:

- A **VS Code extension** (TypeScript) starts a TCP listener (host
  127.0.0.1, port **47810**) in the extension host process on startup,
  where the `vscode` module is available.
- An **MCP server** (`out/mcp-server.js`) runs as a child process launched
  by your agent (stdio) and connects to the bridge to perform `vscode.*`
  calls. Being a standard MCP server, the same file works with any MCP
  client, not just Kilo.

## Why this project

- **Universal compatibility** — the server uses the **stdio** transport: it
  works with any MCP-capable agent (Kilo, Cursor, Cline, opencode,
  Claude Desktop, etc.), with no HTTP/SSE configuration and no tokens.
- **Simplicity** — only two components (extension + stdio server) and zero
  configuration: no auth, no TLS, no CORS/Origin issues.
- **Minimal footprint** — ~126 KB package; no HTTP server to maintain.
- **Secure by default** — communication is loopback-only (127.0.0.1);
  no exposed network surface.
- **Focused** — 17 tools for LSP navigation (definitions, references,
  outline, hover, diagnostics), VS Code commands, workspace files and
  native debugging: the essential core for letting an agent work inside the
  IDE.

### When to consider an alternative

If you need a broader toolkit (terminal, full-text search, advanced LSP
such as rename, call hierarchy, completions) or an HTTP/SSE endpoint with
auth/TLS, consider
[nabheet/vscode-mcp-server](https://github.com/nabheet/vscode-mcp-server)
(49 tools, HTTP transport with port retry and automatic publishing).
For the "navigation + commands + files + debugging" core with minimal
complexity, this project is the right choice.

## Installation and build

```bash
npm install
npm run build        # generates out/extension.js and out/mcp-server.js
```

To develop the extension locally:

```bash
npm run watch         # esbuild in watch mode
```

Load the extension:

- In VS Code: open this folder, press F5 (Extension Development Host).
- Or produce a `.vsix` (`npm run package` requires `@vscode/vsce`) and
  install it with `code --install-extension`.

## Registering the MCP server in your agent

The server is standard: the same `out/mcp-server.js` is registered in your
agent's MCP configuration (Kilo, Cursor, Cline, etc.). Below is the Kilo
example; other agents use their own configuration format (e.g. Cursor:
`mcp.json`, Cline: MCP panel). Two options for Kilo:

**Project level** — in `kilo.json` at the root of the current project:

```jsonc
{
  "mcp": {
    "vscode-ide": {
      "type": "local",
      "command": ["node", "<extension_dir>/out/mcp-server.js"]
    }
  }
}
```

**Global level** — in `~/.config/kilo/kilo.json` (Windows:
`%USERPROFILE%\.config\kilo\kilo.json`), so it works in all projects:

```jsonc
{
  "mcp": {
    "vscode-ide": {
      "type": "local",
      "command": ["node", "<extension_dir>/out/mcp-server.js"]
    }
  }
}
```

After installing the extension, `extension_dir` is
`~/.vscode/extensions/RiccardoStatuto.vscode-ide-mcp-<version>/out/mcp-server.js`
(see also `code --list-extensions` + installed path).

The tools become available as `vscode-ide_<tool>` (e.g.
`vscode-ide_go_to_definition`).

## Available tools

| Tool | Description |
|---|---|
| `get_active_editor` | Active file: path, language, cursor, selection |
| `show_document` | Opens a document and moves the cursor to a given line/column |
| `go_to_definition` | Definition of the symbol (LSP) |
| `find_references` | References of the symbol (LSP) |
| `get_outline` | Symbol outline of a file |
| `start_debug` | Starts a debug session (by name or config) |
| `stop_debug` | Stops the active debug session |
| `add_breakpoints` | Sets breakpoints on given lines |
| `debug_step` | Stepping: over/into/out/continue |
| `get_stack_frames` | Stack frames (requires the proposed API `DebugAdapterTracker`) |
| `get_variables` | Variables of a debug scope |
| `debug_evaluate` | Evaluates an expression in the debug console |
| `execute_command` | Runs a VS Code command by ID, with optional arguments |
| `get_hover` | Hover info (type, docs) for the symbol under the cursor (LSP) |
| `get_diagnostics` | Errors/warnings of the active file (up to 200 lines) |
| `read_file` | Reads the content of a workspace file |
| `write_file` | Creates or overwrites a workspace file |

## Global solution

To cover all projects (including non-Dart ones), the approach is
**language-agnostic**: navigation uses VS Code's LSP and debugging uses the
project's `launch.json` configurations (node, python, go, dart, etc.).
This project is independent from any language.

## Troubleshooting

- **"IDE bridge not reachable"** → the extension is not loaded or the
  bridge is not started. Load the extension (F5) and verify the
  `IDE MCP: Start bridge` command works.
- **Port 47810 in use** → the bridge automatically tries ports
  47811–47814; the MCP server tries the same list in the same order.
  To change the base port, edit `PORT` in `src/ide/bridge.ts` and
  `PORTS` in `src/mcp/server.ts`, then run `npm run build`.
- **Stack/variables return "DebugAdapterTracker not available"** → your
  VS Code version does not expose the proposed API; update VS Code to the
  latest version.

## References (web research)

- https://code.visualstudio.com/api/references/vscode-api
- https://code.visualstudio.com/api/extension-guides/debugger-extension
- https://kilo.ai/docs/code-with-ai/platforms/vscode
