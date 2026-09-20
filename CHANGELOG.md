# Changelog

## 0.1.2 (2026-09-20)
- Deprecated API migration: the MCP server now uses the current high-level `McpServer.registerTool` (the low-level `Server` class and per-method request handlers are deprecated in SDK 1.30).
- Tool input schemas rewritten in Zod v4-mini (JSON schemas are rejected by the current `registerTool`; zod added as a direct dependency).
- Fixed `getDiagnostics`: the no-argument overload (legacy `Diagnostic[][]` shape) replaced by the stable per-document `getDiagnostics(uri)`.
- Fixed a bridge bug: the request line was missing its `\n` terminator, causing every tool call to time out.
- Migrated `tsconfig.json` to the non-deprecated `module`/`moduleResolution` `node16` (the legacy `node10`/"commonjs" values stop working in TypeScript 7.0).
- Bumped MCP protocol version in tests to `2025-11-25`.

## 0.1.1 (2026-09-20)
- Fixed `write_file`: files that do not exist are now created via `WorkspaceEdit.createFile` and the content is written in a second step (on VS Code 1.138, `createFile` has no `content` option, so the file was left empty).
- Added release pipeline: the GitHub Actions `release.yml` workflow builds the `.vsix`, creates a GitHub Release and publishes to the VS Code Marketplace.
- Added versioning scripts (`version:major` / `version:minor` / `version:patch`) that update `package.json`, create the `chore(release)` commit and the version tag.

## 0.1.0 (2026-09-19)
- Initial release of the extension: on startup a TCP listener (host 127.0.0.1, port 47810) starts in the extension host process.
- MCP server (`out/mcp-server.js`, bundled in the package) that exposes 17 tools: LSP navigation (definitions, references, outline, hover, diagnostics), workspace files (read/write), VS Code commands and native debugging (breakpoints, stepping, stack frames, variables, evaluate).
- If the base port 47810 is in use, the bridge and the MCP server automatically try ports 47811–47814.
- Compatible with any MCP client (Kilo, Cursor, Cline, etc.).
- `get_stack_frames`, `get_variables`, `debug_evaluate` require the proposed API `DebugAdapterTracker` (recent VS Code versions).
