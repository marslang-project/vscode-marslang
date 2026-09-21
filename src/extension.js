// Marslang support: run `marslang check` over a file and show what it reports.
//
// The interpreter prints one error and stops, as `error: line N: message` when
// the parser knows where it is, and as `error: message` when it does not (name
// resolution has no positions yet). A message that names something in quotes is
// placed on the first line that uses that name, so the squiggle is where the
// author can act on it, rather than always on line 1.

const vscode = require("vscode");
const { execFile } = require("child_process");
const { parseError } = require("./diagnostics");
const { find, markdown, inCommentOrString } = require("./hover");
const fs = require("fs");
const os = require("os");
const path = require("path");

const LANGUAGE = "marslang";
const EMPTY = { functions: [], families: [], variables: [] };
let diagnostics;
/// The last symbols read for each document: { version, symbols }.
const symbolCache = new Map();

function activate(context) {
    diagnostics = vscode.languages.createDiagnosticCollection(LANGUAGE);
    context.subscriptions.push(diagnostics);

    context.subscriptions.push(
        vscode.commands.registerCommand("marslang.runFile", runFile),
        vscode.commands.registerCommand("marslang.checkFile", () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) check(editor.document, true);
        }),
        vscode.workspace.onDidSaveTextDocument((document) => check(document)),
        vscode.workspace.onDidOpenTextDocument((document) => check(document)),
        vscode.workspace.onDidCloseTextDocument((document) => {
            diagnostics.delete(document.uri);
            symbolCache.delete(document.uri.toString());
        }),
        vscode.languages.registerHoverProvider(LANGUAGE, { provideHover })
    );

    vscode.workspace.textDocuments.forEach((document) => check(document));
}

function deactivate() {}

/// The configured interpreter, else one on PATH, else where the installer puts it.
function interpreter() {
    const configured = vscode.workspace.getConfiguration(LANGUAGE).get("path");
    if (configured) return configured;

    const windows = process.platform === "win32";
    const installed = windows
        ? path.join(process.env.LOCALAPPDATA || "", "Programs", "marslang", "bin", "marslang.exe")
        : path.join(os.homedir(), ".marslang", "bin", "marslang");
    if (fs.existsSync(installed)) return installed;
    return windows ? "marslang.exe" : "marslang";
}

function check(document, forced = false) {
    if (document.languageId !== LANGUAGE || document.uri.scheme !== "file") return;
    if (!forced && vscode.workspace.getConfiguration(LANGUAGE).get("check") === "off") return;

    // check reads the file, so unsaved edits are reported once they are saved.
    execFile(interpreter(), ["check", document.uri.fsPath], { timeout: 15000 }, (error, stdout, stderr) => {
        if (error && error.code === "ENOENT") {
            diagnostics.delete(document.uri);
            missingInterpreter();
            return;
        }
        const message = (stderr || stdout || "").trim();
        if (!error || !message) {
            diagnostics.delete(document.uri);
            return;
        }
        const diagnostic = toDiagnostic(document, message);
        diagnostics.set(document.uri, diagnostic ? [diagnostic] : []);
    });
}

/// Turn what the interpreter reported into a diagnostic somewhere useful.
function toDiagnostic(document, message) {
    const error = parseError(message);
    if (!error) return null;

    let range;
    if (error.line !== null) {
        range = lineRange(document, error.line - 1);
    } else if (error.name) {
        // "unknown name 'nope'": point at where that name is used.
        range = findWord(document, error.name);
    } else {
        range = lineRange(document, 0);
    }

    const diagnostic = new vscode.Diagnostic(range, error.detail, vscode.DiagnosticSeverity.Error);
    diagnostic.source = "marslang check";
    return diagnostic;
}

/// The text of a line, without its indentation, clamped to the document.
function lineRange(document, line) {
    const index = Math.min(Math.max(line, 0), Math.max(document.lineCount - 1, 0));
    const { text, range, firstNonWhitespaceCharacterIndex: start } = document.lineAt(index);
    if (!text.trim()) return range;
    return new vscode.Range(index, start, index, text.length);
}

/// The first whole-word use of `word`, or the first line when it is not found.
function findWord(document, word) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`);
    for (let line = 0; line < document.lineCount; line += 1) {
        const found = document.lineAt(line).text.match(pattern);
        if (found) return new vscode.Range(line, found.index, line, found.index + word.length);
    }
    return lineRange(document, 0);
}

/// What the document declares, from `marslang symbols` over its current text,
/// unsaved edits included. While the text does not parse, the last result that
/// did is kept, so hovers keep working mid-edit.
function symbolsFor(document) {
    const key = document.uri.toString();
    const cached = symbolCache.get(key);
    if (cached && cached.version === document.version) return Promise.resolve(cached.symbols);
    return new Promise((resolve) => {
        const fallback = () => resolve(cached ? cached.symbols : EMPTY);
        const child = execFile(interpreter(), ["symbols", document.uri.fsPath, "--stdin"],
            { timeout: 5000, maxBuffer: 16 * 1024 * 1024 }, (error, stdout) => {
                if (error) return fallback();
                try {
                    const symbols = JSON.parse(stdout);
                    symbolCache.set(key, { version: document.version, symbols });
                    resolve(symbols);
                } catch {
                    fallback();
                }
            });
        child.on("error", fallback);
        child.stdin.on("error", () => {});
        child.stdin.end(document.getText());
    });
}

async function provideHover(document, position) {
    const range = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
    if (!range) return null;
    if (inCommentOrString(document.getText(), document.offsetAt(range.start))) return null;
    const word = document.getText(range);
    // `receiver.word`: the name before the dot, or "" when it is not a plain name.
    const before = document.lineAt(position.line).text.slice(0, range.start.character);
    const dotted = before.match(/([A-Za-z_][A-Za-z0-9_]*)?\s*\.\s*$/);
    const receiver = dotted ? (dotted[1] || "") : null;
    const symbols = await symbolsFor(document);
    const text = markdown(symbols, find(symbols, word, position.line + 1, receiver));
    return text ? new vscode.Hover(new vscode.MarkdownString(text), range) : null;
}

function runFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== LANGUAGE) {
        vscode.window.showInformationMessage("Open a .mars file to run it.");
        return;
    }
    editor.document.save().then(() => {
        const terminal = vscode.window.terminals.find((t) => t.name === "Marslang")
            || vscode.window.createTerminal("Marslang");
        terminal.show(true);
        terminal.sendText(`${quote(interpreter())} ${quote(editor.document.uri.fsPath)}`);
    });
}

function quote(value) {
    return /[\s"']/.test(value) ? `"${value}"` : value;
}

let warned = false;
function missingInterpreter() {
    if (warned) return;
    warned = true;
    const install = "Installation instructions";
    vscode.window.showWarningMessage(
        "marslang was not found, so files are not checked. Install it, or set marslang.path.",
        install,
        "Open settings"
    ).then((choice) => {
        if (choice === install) {
            vscode.env.openExternal(vscode.Uri.parse("https://marslang.kevin-z.com/#install"));
        } else if (choice === "Open settings") {
            vscode.commands.executeCommand("workbench.action.openSettings", "marslang.path");
        }
    });
}

module.exports = { activate, deactivate };
