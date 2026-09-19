# Changelog

## 0.1.0 (2026-09-19)
- Rilascio iniziale dell'estensione: all'avvio parte un listener TCP (127.0.0.1:47810) nel processo extension host.
- Server MCP (`out/mcp-server.js`, incluso nel pacchetto) che espone 12 tool: navigazione LSP (definizioni, riferimenti, outline) e debug nativo (breakpoint, stepping, stack frame, variabili, evaluate).
- Compatibile con qualsiasi client MCP (Kilo, Cursor, Cline, ecc.).
- `get_stack_frames`, `get_variables`, `debug_evaluate` richiedono l'API proposta `DebugAdapterTracker` (VS Code recenti).
