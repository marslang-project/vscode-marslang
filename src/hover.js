// What to show when hovering a name, from `marslang symbols` output.
//
// Kept free of the VS Code API so it can be tested with plain Node: it takes
// the parsed symbols, the word, the 1-based line, and what precedes the word,
// and returns Markdown, or null when there is nothing to say.

/// Built-in names that no program declares.
const BUILTINS = {
    out: ["func out(...values)", "Writes the values separated by spaces, then a newline."],
    slout: ["func slout(...values)", "Writes the values without a newline."],
    in: ["func in() -> string", "Reads all of standard input, to the end, as one string."],
    inln: ["func inln() -> string", "Reads the next line of standard input; `\"\"` once input runs out."],
    arr: ["func arr(...items) -> array", "An array of the items, in order."],
    set: ["func set(...items) -> set", "A set of the items."],
    pair: ["func pair(first, second) -> pair", "A pair of two values."],
    map: ["func map() -> map", "An empty map; `dict` is the same."],
    dict: ["func dict() -> map", "An empty map; `map` is the same."],
    err: ["func err(Family, message)", "Raises a new error of that family, or `err(e)` raises a caught one again."],
    lasterr: ["func lasterr()", "The most recently handled error, or `null`."],
    int: ["func int(value) -> int", "Converts to an int."],
    longint: ["func longint(value) -> longint", "Converts to a longint."],
    float: ["func float(value) -> float", "Converts to a float."],
    string: ["func string(value) -> string", "Converts to a string."],
    ord: ["func ord(text) -> int", "The Unicode code point of a one-character string: `ord(\"a\")` is 97."],
    chr: ["func chr(number) -> string", "The one-character string for a Unicode code point: `chr(97)` is `\"a\"`."],
    date: ["func date(year, month, day) -> date", "A calendar day. Also `date(\"2026-09-24\")`, `date(text, format)`, or `date(a_datetime)`."],
    datetime: ["func datetime(year, month, day, hour, minute, second, zone) -> datetime", "A moment in a time zone, such as `\"Asia/Shanghai\"`. Also `datetime(\"2026-09-24T14:30:00+08:00\")` or `datetime(text, format)`."],
    duration: ["func duration(seconds) -> duration", "An exact length of time. Also `duration(\"2h 30m\")` or ISO 8601, `duration(\"PT2H30M\")`."],
    Error: ["family Error", "The base error family. With `takepkg std.Error;`, it is `Error.Base`."],
    Base: ["family Error.Base", "The base error family: every error inherits from it."],
    TypeError: ["family TypeError(Error)", "A value of the wrong type, or a call with the wrong arguments."],
    RangeError: ["family RangeError(Error)", "A number out of range: integer overflow, division by zero, a math domain error."],
    OutOfBoundsError: ["family OutOfBoundsError(Error)", "A position or length outside a string or collection."],
    SyntaxError: ["family SyntaxError(Error)", "Text that does not parse, such as `longint(\"12x\")`."],
};

/// Markers of std.Decorator, shown when hovering `@Decorator.name`.
const DECORATORS = {
    docstring: ["@Decorator.docstring(text)", "Documentation for the func, family, or method below it, shown here on hover. A triple-quoted string may span lines; its indentation is removed."],
    private: ["@Decorator.private", "The method below can only be called from methods of its own family."],
    subclass: ["@Decorator.subclass", "The method below can be called from its family and from families inheriting from it."],
    static: ["@Decorator.static", "Planned, not implemented yet."],
    class: ["@Decorator.class", "Planned, not implemented yet."],
    overload: ["@Decorator.overload", "Planned, not implemented yet."],
};

/// Every function and method, each with the family it belongs to (or null).
function allFunctions(symbols) {
    const methods = symbols.families.flatMap((family) => family.methods);
    return symbols.functions.concat(methods);
}

/// The innermost function or method whose lines contain `line`.
function enclosing(symbols, line) {
    return allFunctions(symbols)
        .filter((fn) => fn.line <= line && line <= fn.end)
        .sort((a, b) => (a.end - a.line) - (b.end - b.line))[0] || null;
}

function scopeOf(fn) {
    return fn ? (fn.family ? `${fn.family}.${fn.name}` : fn.name) : null;
}

/// A family and the families it inherits from that this file declares.
function lineage(symbols, name) {
    const chain = [];
    let family = symbols.families.find((f) => f.name === name);
    while (family && !chain.includes(family)) {
        chain.push(family);
        family = symbols.families.find((f) => f.name === family.parent);
    }
    return chain;
}

/// The package imported under `alias`, when `marslang symbols` describes packages.
function packageNamed(symbols, alias) {
    return (symbols.packages || []).find((p) => p.alias === alias) || null;
}

function method(symbols, familyName, name) {
    // `containers.stack`: a family exported by an imported package.
    const dot = familyName.indexOf(".");
    if (dot > 0) {
        const pkg = packageNamed(symbols, familyName.slice(0, dot));
        const family = pkg && pkg.families.find((f) => f.name === familyName.slice(dot + 1));
        const found = family && family.methods.find((m) => m.name === name);
        return found ? { ...found, family: familyName } : null;
    }
    for (const family of lineage(symbols, familyName)) {
        const found = family.methods.find((m) => m.name === name);
        if (found) return found;
    }
    return null;
}

/// Find what a name refers to.
/// `receiver` is the word before a `.` in front of the name, or null.
function find(symbols, word, line, receiver = null) {
    const here = enclosing(symbols, line);
    if (receiver !== null) {
        if (receiver === "Decorator" && DECORATORS[word]) return { kind: "decorator", symbol: word };
        const pkg = packageNamed(symbols, receiver);
        if (pkg) {
            const fn = pkg.functions.find((f) => f.name === word);
            if (fn) return { kind: "function", symbol: { ...fn, family: null }, package: pkg };
            const family = pkg.families.find((f) => f.name === word);
            if (family) return { kind: "family", symbol: family, package: pkg };
            // std.Error's members are the built-in families, described below.
            if (BUILTINS[word] && /^[A-Z]/.test(word)) return { kind: "builtin", symbol: word };
            const value = pkg.values.find((v) => v.name === word);
            if (value) return { kind: "value", symbol: value, package: pkg };
            return null;
        }
        if (receiver === "me" && here && here.family) {
            const found = method(symbols, here.family, word);
            if (found) return { kind: "function", symbol: found };
        }
        // A variable whose type is a family here: that family's method.
        const scope = scopeOf(here);
        const holder = symbols.variables.find((v) => v.name === receiver && v.scope === scope)
            || symbols.variables.find((v) => v.name === receiver && v.scope === null);
        if (holder && holder.type) {
            const found = method(symbols, holder.type, word);
            if (found) return { kind: "function", symbol: found };
        }
        // Another receiver: a method of that name in any family here.
        for (const family of symbols.families) {
            const found = family.methods.find((m) => m.name === word);
            if (found) return { kind: "function", symbol: found };
        }
        if (BUILTINS[word] && /^[A-Z]/.test(word)) return { kind: "builtin", symbol: word };
        return null;
    }
    const scope = scopeOf(here);
    const variable = symbols.variables.find((v) => v.name === word && v.scope === scope)
        || symbols.variables.find((v) => v.name === word && v.scope === null);
    if (variable) return { kind: "variable", symbol: variable };
    const pkg = packageNamed(symbols, word);
    if (pkg) return { kind: "package", symbol: pkg };
    const fn = symbols.functions.find((f) => f.name === word);
    if (fn) return { kind: "function", symbol: fn };
    const family = symbols.families.find((f) => f.name === word);
    if (family) return { kind: "family", symbol: family };
    if (BUILTINS[word]) return { kind: "builtin", symbol: word };
    return null;
}

function params(fn) {
    return fn.params.map((p) => (p.type ? `${p.type} ${p.name}` : p.name)).join(", ");
}

function code(text) {
    return "```marslang\n" + text + "\n```";
}

function withDoc(signature, doc, notes = []) {
    const parts = [code(signature)];
    if (doc) parts.push(doc);
    if (notes.length) parts.push(notes.join("  \n"));
    return parts.join("\n\n---\n\n");
}

/// Markdown for what `find` returned.
function markdown(symbols, found) {
    if (!found) return null;
    const { kind, symbol } = found;
    if (kind === "decorator") {
        const [signature, text] = DECORATORS[symbol];
        return withDoc(signature, text, ["*std.Decorator*"]);
    }
    if (kind === "builtin") {
        const [signature, text] = BUILTINS[symbol];
        return withDoc(signature, text, ["*built in*"]);
    }
    if (kind === "package") {
        const counts = [
            [symbol.functions.length, "function", "functions"],
            [symbol.families.length, "family", "families"],
            [symbol.values.length, "value", "values"],
        ].filter(([n]) => n > 0).map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);
        return withDoc(`(package) ${symbol.name}`, null, [`Imported as \`${symbol.alias}\`${counts.length ? ": " + counts.join(", ") : ""}`]);
    }
    if (kind === "value") {
        const prefix = symbol.kind === "fixed" || symbol.kind === "hot" ? `${symbol.kind} ` : "";
        const typed = symbol.type ? `: ${symbol.type}` : "";
        return withDoc(`${prefix}${found.package.alias}.${symbol.name}${typed}`, null, [`*${found.package.name}*`]);
    }
    if (kind === "function") {
        const owner = symbol.family || (found.package ? found.package.alias : null);
        const name = owner ? `${owner}.${symbol.name}` : symbol.name;
        const notes = found.package ? [`*${found.package.name}*`] : [];
        if (symbol.access === "private") notes.push(`*private to ${symbol.family}*`);
        if (symbol.access === "subclass") notes.push(`*for ${symbol.family} and families inheriting from it*`);
        return withDoc(`func ${name}(${params(symbol)})`, symbol.doc, notes);
    }
    if (kind === "family") {
        const full = found.package ? `${found.package.alias}.${symbol.name}` : symbol.name;
        const header = symbol.parent ? `family ${full}(${symbol.parent})` : `family ${full}`;
        const init = method(symbols, full, "init");
        const notes = [init ? `Construct with \`${full}(${params(init)})\`` : `Construct with \`${full}()\``];
        if (found.package) notes.push(`*${found.package.name}*`);
        const methods = symbol.methods.filter((m) => m.name !== "init" && m.access === "public").map((m) => `\`${m.name}\``);
        if (methods.length) notes.push(`Methods: ${methods.join(", ")}`);
        return withDoc(header, symbol.doc, notes);
    }
    // A variable.
    const labels = { parameter: "(parameter) ", loop: "(loop item) ", error: "(caught error) ", fixed: "fixed ", hot: "hot ", cold: "cold ", variable: "" };
    const label = labels[symbol.kind] ?? "";
    if (!symbol.type) {
        const why = symbol.kind === "loop"
            ? "Each item of the collection it loops over."
            : "No type is written, and its first value does not show one; Marslang checks values as the program runs.";
        return withDoc(`${label}${symbol.name}`, null, [why]);
    }
    const notes = symbol.inferred ? ["Type of its first value; nothing stops a later assignment from changing it."] : [];
    return withDoc(`${label}${symbol.name}: ${symbol.type}`, null, notes);
}

/// Whether `offset` in `text` is inside a comment or a string, where names are
/// not code and get no hover.
function inCommentOrString(text, offset) {
    let quote = null;
    let triple = false;
    for (let i = 0; i < offset; i += 1) {
        const ch = text[i];
        if (quote) {
            if (ch === "\\") { i += 1; continue; }
            if (triple ? text.startsWith('"""', i) : ch === quote) {
                if (triple) i += 2;
                quote = null;
                triple = false;
            }
            continue;
        }
        if (text.startsWith("//", i)) {
            const end = text.indexOf("\n", i);
            if (end === -1 || end >= offset) return true;
            i = end;
        } else if (text.startsWith("/*", i)) {
            const end = text.indexOf("*/", i + 2);
            if (end === -1 || end + 2 > offset) return true;
            i = end + 1;
        } else if (text.startsWith('"""', i)) {
            quote = '"';
            triple = true;
            i += 2;
        } else if (ch === '"' || ch === "'") {
            quote = ch;
        }
    }
    return quote !== null;
}

module.exports = { find, markdown, inCommentOrString, BUILTINS, DECORATORS };
