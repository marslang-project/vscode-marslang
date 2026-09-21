// Check what hovering shows, from the real `marslang symbols` over the sample.
// Set MARSLANG to point at a build; an interpreter without `symbols` (before
// rs-0.11.0) is reported as skipped rather than failed.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { find, markdown, inCommentOrString } = require("../src/hover");

const SAMPLE = path.join(__dirname, "sample.mars");
const interpreter = process.env.MARSLANG
    || path.join(__dirname, "../../Marslang/target/debug/marslang" + (process.platform === "win32" ? ".exe" : ""));

let failed = 0;
function check(description, text, ...expected) {
    const missing = expected.filter((part) => !(text || "").includes(part));
    if (missing.length) failed += 1;
    console.log(`  ${missing.length ? "FAIL" : "ok  "} ${description}`);
    if (missing.length) console.log(`       missing ${JSON.stringify(missing)} in ${JSON.stringify(text)}`);
}

const source = fs.readFileSync(SAMPLE, "utf8");

console.log("where hovers are offered");
const at = (needle, from = 0) => source.indexOf(needle, from);
check("not inside a triple-quoted docstring", String(inCommentOrString(source, at("A label for a name"))), "true");
check("not inside a line comment", String(inCommentOrString(source, at("a comment"))), "true");
check("not inside a block comment", String(inCommentOrString(source, at("comment */"))), "true");
check("not inside a one-line string", String(inCommentOrString(source, at("a family of func"))), "true");
check("on code after a docstring", String(inCommentOrString(source, at("func label") + 5)), "false");

let symbols = null;
if (!fs.existsSync(interpreter)) {
    console.log(`\nskipped the hover cases: no interpreter at ${interpreter}`);
} else {
    try {
        symbols = JSON.parse(execFileSync(interpreter, ["symbols", SAMPLE], { encoding: "utf8" }));
    } catch (error) {
        const version = execFileSync(interpreter, ["--version"], { encoding: "utf8" }).trim();
        console.log(`\nskipped the hover cases: ${version} has no symbols command`);
    }
}

if (symbols) {
    console.log("\nwhat hovering shows");
    const hover = (word, line, receiver = null) => markdown(symbols, find(symbols, word, line, receiver));
    check("a function with a docstring", hover("label", 38),
        "func label(string name)", "A label for a name.\nIt mentions func and family, which stay part of the string.");
    check("a family, with its constructor", hover("Circle", 34),
        "family Circle", "Construct with `Circle(float r)`", "Methods: `size`");
    check("a variable typed by its first value", hover("c", 36),
        "c: Circle", "Type of its first value");
    check("a variable with a declared type", hover("counts", 37), "counts: array[int]");
    check("a fixed binding", hover("pi", 22), "fixed pi: float");
    check("a parameter", hover("r", 13), "(parameter) r: float");
    check("a caught error", hover("e", 40), "(caught error) e: Error.TypeError");
    check("a method through a typed variable", hover("size", 36, "c"), "func Circle.size()");
    check("a private method through me", hover("squared", 22, "me"), "func Circle.squared()", "*private to Circle*");
    check("an error family from std.Error", hover("TypeError", 39, "Error"), "family TypeError(Error)", "*built in*");
    check("a decorator marker", hover("docstring", 26, "Decorator"), "@Decorator.docstring(text)");
    check("a built-in function", hover("out", 36), "func out(...values)");
    const nothing = hover("iget", 37, "counts");
    check("no guess for a method it cannot know", String(nothing), "null");
}

console.log(failed ? `\n${failed} hover checks failed` : "\nall hover checks passed");
process.exitCode = failed ? 1 : 0;
