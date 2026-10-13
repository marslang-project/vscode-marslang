// Reading what `marslang check` prints.
//
// The interpreter reports one error and stops, with the source line:
// `error: line 9: expected expression, got End`. A name it quotes, as in
// `error: line 3: unknown name 'nope'`, is returned too, so the editor can
// underline just that name. Interpreters before rs-0.17 report unknown names
// with no line; then the editor looks for the name's first use.

/// Parse the interpreter's output into { line, name, detail }, or null when it
/// reported nothing. `line` is 1-based, and null when the error has no position.
function parseError(text) {
    const first = String(text || "")
        .split(/\r?\n/)
        .map((piece) => piece.trim())
        .find((piece) => piece.length > 0);
    if (!first) return null;

    const detail = first.replace(/^error:\s*/, "");
    const located = detail.match(/^line (\d+):\s*(.*)$/);
    if (located) {
        return { line: Number(located[1]), name: quotedName(located[2]), detail: located[2] };
    }
    return { line: null, name: quotedName(detail), detail };
}

/// The first quoted word, when it is a name: 'nope' in "unknown name 'nope'".
function quotedName(detail) {
    const quoted = detail.match(/'([^']+)'/);
    return quoted && /^[A-Za-z_][A-Za-z0-9_]*$/.test(quoted[1]) ? quoted[1] : null;
}

module.exports = { parseError };
