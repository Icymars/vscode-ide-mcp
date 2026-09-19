import * as vscode from "vscode";
import { startBridge, stopBridge } from "./ide/bridge";

export function activate(context: vscode.ExtensionContext): void {
  const start = vscode.commands.registerCommand("vscodeIdeMcp.startBridge", () => {
    startBridge();
    vscode.window.showInformationMessage("IDE MCP: bridge avviato (porta 47810)");
  });
  const stop = vscode.commands.registerCommand("vscodeIdeMcp.stopBridge", () => {
    stopBridge();
    vscode.window.showInformationMessage("IDE MCP: bridge fermato");
  });
  context.subscriptions.push(start, stop);
  startBridge();
}

export function deactivate(): void {
  stopBridge();
}
