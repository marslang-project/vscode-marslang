// Reading what `marslang check` prints.
//
// The interpreter reports one error and stops. Parser errors carry the source
// line: `error: line 9: expected expression, got End`. Name resolution has no
// positions yet, so those arrive as `error: unknown name 'nope'` — for those the
// quoted name is returned, and the editor finds where it is used.

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
        return { line: Number(located[1]), name: null, detail: located[2] };
    }
    const quoted = detail.match(/'([^']+)'/);
    return { line: null, name: quoted && /^[A-Za-z_][A-Za-z0-9_]*$/.test(quoted[1]) ? quoted[1] : null, detail };
}

module.exports = { parseError };
