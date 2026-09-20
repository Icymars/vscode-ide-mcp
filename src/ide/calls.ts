import * as vscode from "vscode";

/**
 * Dispatcher che esegue le chiamate alle API di VS Code dall'estensione.
 * Ogni metodo corrisponde a un tool MCP esposto a Kilo.
 *
 * Nota: le funzioni LSP "smart" (definition/references/documentSymbol) non
 * fanno parte dell'API stabile attuale, quindi la navigazione usa i comandi
 * workbench (che restituiscono lo stato dell'editor), e il debug usa il
 * namespace stabile vscode.debug piů il tracker dell'adapter (API proposta)
 * per stack frame, variabili ed evaluate.
 */

type Args = Record<string, unknown>;

function toUri(u: unknown): vscode.Uri {
  if (typeof u === "string") {
    // Percorso file Windows (es. E:\...) → Uri.file; altrimenti URI standard
    if (/^[A-Za-z]:[\\/]/.test(u)) {
      return vscode.Uri.file(u);
    }
    return vscode.Uri.parse(u);
  }
  return u as vscode.Uri;
}

function activeEditorSnapshot(): Record<string, unknown> {
  const ed = vscode.window.activeTextEditor;
  if (!ed) {
    return { active: false };
  }
  const sel = ed.selection;
  return {
    active: true,
    uri: ed.document.uri.toString(),
    fileName: ed.document.uri.fsPath.split(/[\\/]/).pop(),
    languageId: ed.document.languageId,
    cursorLine: sel.active.line,
    cursorCol: sel.active.character,
    selectedText: ed.document.getText(sel),
    isDirty: ed.document.isDirty,
  };
}

async function openAt(uri: vscode.Uri, line: number, col: number): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument(uri);
  return await vscode.window.showTextDocument(doc, {
    selection: new vscode.Selection(line, col, line, col),
    preserveFocus: false,
    preview: false,
  });
}

async function goToDefinition(a: Args): Promise<Record<string, unknown>> {
  const uri = toUri(a.uri);
  const line = Number(a.line);
  const col = Number(a.col);
  await openAt(uri, line, col);
  await vscode.commands.executeCommand("editor.action.revealDefinition");
  const ed = vscode.window.activeTextEditor;
  return {
    navigated: true,
    file: ed ? ed.document.uri.toString() : null,
    line: ed ? ed.selection.active.line : null,
    col: ed ? ed.selection.active.character : null,
  };
}

async function findReferences(a: Args): Promise<Record<string, unknown>> {
  const uri = toUri(a.uri);
  const line = Number(a.line);
  const col = Number(a.col);
  await openAt(uri, line, col);
  await vscode.commands.executeCommand("references-view.findReferences");
  return {
    openedReferencesView: true,
    note: "La vista Riferimenti è aperta nella sidebar; i riferimenti sono visibili lì.",
  };
}

async function getOutline(a: Args): Promise<Record<string, unknown>> {
  const uri = toUri(a.uri);
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: false });
  await vscode.commands.executeCommand("workbench.action.showAllSymbols");
  return {
    openedOutlineView: true,
    file: doc.uri.toString(),
    note: "La vista Simboli è aperta nella sidebar; l'outline del file è visibile lì.",
  };
}

async function showDocument(a: Args): Promise<Record<string, unknown>> {
  const uri = toUri(a.uri);
  const line = a.line === undefined ? 0 : Number(a.line);
  const col = a.col === undefined ? 0 : Number(a.col);
  const ed = await openAt(uri, line, col);
  return {
    uri: ed.document.uri.toString(),
    revealedLine: line,
    revealedCol: col,
    editorActive: vscode.window.activeTextEditor === ed,
  };
}

async function startDebug(a: Args): Promise<Record<string, unknown>> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  const cfg = a.config as Record<string, unknown> | undefined;
  const name = a.name as string | undefined;
  const target = cfg ?? name;
  if (!target) {
    throw new Error("Servono 'name' oppure 'config'");
  }
  const configArg = target as unknown as (string | vscode.DebugConfiguration);
  const ok = await vscode.debug.startDebugging(folder, configArg);
  return { started: ok, byName: name || undefined, byConfig: !!cfg };
}

async function stopDebug(): Promise<Record<string, unknown>> {
  await vscode.debug.stopDebugging();
  return { stopped: true };
}

async function addBreakpoints(a: Args): Promise<Record<string, unknown>> {
  const uri = toUri(a.uri);
  const lines = (a.lines as number[]) || [];
  const bps = lines.map(
    (l) =>
      new vscode.SourceBreakpoint(
        new vscode.Location(uri, new vscode.Range(l, 0, l, 0)),
        true,
        a.condition as string | undefined
      )
  );
  await vscode.debug.addBreakpoints(bps);
  return { uri: uri.toString(), breakpointsSet: lines.length };
}

async function debugStep(a: Args): Promise<Record<string, unknown>> {
  const kind = (a.kind as string) || "over";
  const cmd =
    kind === "into" ? "workbench.action.debugStepInto" :
    kind === "out" ? "workbench.action.debugStepOut" :
    kind === "continue" ? "workbench.action.debugContinue" :
    "workbench.action.debugStepOver";
  await vscode.commands.executeCommand(cmd);
  return { step: kind, command: cmd };
}

function getTracker(): any {
  const anyVscode = vscode as unknown as Record<string, any>;
  const ctor = anyVscode.debug?.createDebugAdapterTracker;
  if (typeof ctor !== "function") {
    return undefined;
  }
  return ctor();
}

async function getStackFrames(): Promise<Record<string, unknown>> {
  const session = vscode.debug.activeDebugSession;
  if (!session) return { active: false };
  const tracker = getTracker();
  if (!tracker) {
    return { active: true, note: "DebugAdapterTracker (API proposta) non disponibile su questa versione di VS Code" };
  }
  const frames: Array<Record<string, unknown>> = [];
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout richiesta stackTrace")), 5000);
    tracker.onDidSendMessage((msg: any) => {
      if (msg.command === "stackTrace" && msg.type === "response") {
        clearTimeout(t);
        for (const f of (msg.body?.stackFrames || [])) {
          frames.push({ id: f.id, name: f.name, file: f.source?.path, line: f.line });
        }
        resolve();
      }
    });
    tracker.sendRequest("stackTrace", { threadId: 1 });
  });
  return { active: true, count: frames.length, frames };
}

async function getVariables(a: Args): Promise<Record<string, unknown>> {
  const session = vscode.debug.activeDebugSession;
  if (!session) return { active: false };
  const tracker = getTracker();
  if (!tracker) {
    return { active: true, note: "DebugAdapterTracker non disponibile" };
  }
  const ref = Number(a.variablesReference ?? 1);
  const vars: Array<Record<string, unknown>> = [];
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout richiesta variables")), 5000);
    tracker.onDidSendMessage((msg: any) => {
      if (msg.command === "variables" && msg.type === "response") {
        clearTimeout(t);
        for (const v of (msg.body?.variables || [])) {
          vars.push({ name: v.name, value: v.value, type: v.type, ref: v.variablesReference });
        }
        resolve();
      }
    });
    tracker.sendRequest("variables", { variablesReference: ref });
  });
  return { active: true, count: vars.length, variables: vars };
}

async function debugEvaluate(a: Args): Promise<Record<string, unknown>> {
  const session = vscode.debug.activeDebugSession;
  if (!session) return { active: false };
  const tracker = getTracker();
  if (!tracker) {
    return { active: true, note: "DebugAdapterTracker non disponibile" };
  }
  const expression = String(a.expression ?? "");
  const frameId = Number(a.frameId ?? 0);
  let result: Record<string, unknown> = { active: true, expression };
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout evaluate")), 5000);
    tracker.onDidSendMessage((msg: any) => {
      if (msg.command === "evaluate" && msg.type === "response") {
        clearTimeout(t);
        result = { active: true, expression, value: msg.body?.result, isError: msg.body?.isError };
        resolve();
      }
    });
    tracker.sendRequest("evaluate", { expression, frameId });
  });
  return result;
}

async function executeCommand(a: Args): Promise<Record<string, unknown>> {
  const command = String(a.command);
  const args = (a.args as unknown[]) || [];
  const result = await vscode.commands.executeCommand(command, ...args);
  return { command, result: result === undefined ? null : result };
}

async function getHover(): Promise<Record<string, unknown>> {
  const ed = vscode.window.activeTextEditor;
  if (!ed) return { active: false };
  await vscode.commands.executeCommand("editor.action.showHover");
  return {
    active: true,
    file: ed.document.uri.toString(),
    note: "L'hover del simbolo sotto il cursore è mostrato nell'editor.",
  };
}

async function getDiagnostics(): Promise<Record<string, unknown>> {
  const ed = vscode.window.activeTextEditor;
  if (!ed) return { active: false };
  const MAX = 200;
  // getDiagnostics() restituisce Diagnostic[][] (una lista per documento,
  // senza URI): prendiamo il primo documento con diagnostics.
  const lists = vscode.languages.getDiagnostics();
  const list = (lists && lists.length > 0 ? lists.find((l) => l.length > 0) : null) || [];
  const diagnostics = list.slice(0, MAX).map((d) => ({
    severity: d.severity,
    range: d.range
      ? { start: d.range.start.line, end: d.range.end.line }
      : null,
    source: d.source,
    message: d.message,
  }));
  return {
    active: true,
    file: ed.document.uri.toString(),
    count: list.length,
    truncated: list.length > MAX,
    approx: "primo documento con diagnostics (l'API non espone gli URI dei documenti)",
    diagnostics,
  };
}

async function readFile(a: Args): Promise<Record<string, unknown>> {
  const uri = toUri(a.uri);
  const doc = await vscode.workspace.openTextDocument(uri);
  const text = doc.getText();
  return { uri: doc.uri.toString(), length: text.length, content: text };
}

async function writeFile(a: Args): Promise<Record<string, unknown>> {
  const uri = toUri(a.uri);
  const content = String(a.content ?? "");
  let doc: vscode.TextDocument;
  try {
    doc = await vscode.workspace.openTextDocument(uri);
  } catch {
    // File inesistente: si crea con il contenuto via WorkspaceEdit
    const createEdit = new vscode.WorkspaceEdit();
    createEdit.createFile(uri, { content, overwrite: true });
    await vscode.workspace.applyEdit(createEdit);
    return { uri: uri.toString(), created: true, length: content.length };
  }
  const edit = new vscode.WorkspaceEdit();
  edit.replace(doc.uri, new vscode.Range(0, 0, doc.lineCount, 0), content);
  await vscode.workspace.applyEdit(edit);
  const saved = await doc.save();
  return { uri: uri.toString(), saved, length: content.length };
}

/** Cose le chiamate supportate e le spedisce al dispatcher. */
export async function executeIDECall(
  method: string,
  args: Args
): Promise<unknown> {
  switch (method) {
    case "get_active_editor":
      return activeEditorSnapshot();
    case "show_document":
      return showDocument(args);
    case "go_to_definition":
      return goToDefinition(args);
    case "find_references":
      return findReferences(args);
    case "get_outline":
      return getOutline(args);
    case "start_debug":
      return startDebug(args);
    case "stop_debug":
      return stopDebug();
    case "add_breakpoints":
      return addBreakpoints(args);
    case "debug_step":
      return debugStep(args);
    case "get_stack_frames":
      return getStackFrames();
    case "get_variables":
      return getVariables(args);
    case "debug_evaluate":
      return debugEvaluate(args);
    case "execute_command":
      return executeCommand(args);
    case "get_hover":
      return getHover();
    case "get_diagnostics":
      return getDiagnostics();
    case "read_file":
      return readFile(args);
    case "write_file":
      return writeFile(args);
    default:
      throw new Error(`metodo sconosciuto: ${method}`);
  }
}
