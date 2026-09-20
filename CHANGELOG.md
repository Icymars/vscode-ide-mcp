# Changelog

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
