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
    // The 1-based line of the first line containing `needle`, so edits to the sample move the checks with it.
    const lineOf = (needle) => source.split(/\r?\n/).findIndex((l) => l.includes(needle)) + 1;
    check("a function with a docstring", hover("label", lineOf("out(label")),
        "func label(string name)", "A label for a name.\nIt mentions func and family, which stay part of the string.");
    check("a family, with its constructor", hover("Circle", lineOf("c = Circle")),
        "family Circle", "Construct with `Circle(float r)`", "Methods: `size`");
    check("a variable typed by its first value", hover("c", lineOf("out(c.size")),
        "c: Circle", "Type of its first value");
    check("a variable with a declared type", hover("counts", lineOf("counts.iget")), "counts: array[int]");
    check("a fixed binding", hover("pi", lineOf("ret pi *")), "fixed pi: float");
    check("a parameter", hover("r", lineOf("me.r = r")), "(parameter) r: float");
    check("a caught error", hover("e", lineOf("out(e)")), "(caught error) e: Error.TypeError");
    check("a method through a typed variable", hover("size", lineOf("out(c.size"), "c"), "func Circle.size()");
    check("a private method through me", hover("squared", lineOf("me.squared"), "me"), "func Circle.squared()", "*private to Circle*");
    check("an error family from std.Error", hover("TypeError", lineOf("handle(Error.TypeError"), "Error"), "family TypeError(Error)", "*built in*");
    check("a decorator marker", hover("docstring", lineOf("@Decorator.docstring"), "Decorator"), "@Decorator.docstring(text)");
    check("a built-in function", hover("out", lineOf("out(c.size")), "func out(...values)");
    check("a code point built-in", hover("ord", lineOf("chr(ord")), "func ord(text) -> int");
    check("a date constructor", hover("date", lineOf("day (date)")), "func date(year, month, day) -> date");
    check("a duration constructor", hover("duration", lineOf("duration(90)")), "func duration(seconds) -> duration");
    check("a variable annotated with a date", hover("day", lineOf("out(chr")), "day: date");
    // Interpreters before package descriptions skip these.
    if (!symbols.packages) {
        console.log("  skip the package cases: this interpreter's symbols do not describe imported packages");
    } else {
        check("a std function with its docstring", hover("sqrt", lineOf("math.PI"), "math"),
            "func math.sqrt([int,longint,float] x)", "Square root, as a float.", "*std.math*");
        check("a std value", hover("PI", lineOf("math.PI"), "math"), "fixed math.PI: float");
        check("a std family, with its constructor", hover("stack", lineOf("containers.stack"), "containers"),
            "family containers.stack", "Last in, first out", "Construct with `containers.stack()`");
        check("a method of a std family, through a variable", hover("push", lineOf("pile.push"), "pile"),
            "func containers.stack.push(any item)", "Put item on top.");
        check("an imported package's alias", hover("math", lineOf("math.PI")),
            "(package) std.math", "Imported as `math`: 51 functions, 6 values");
    }
    const nothing = hover("iget", lineOf("counts.iget"), "counts");
    check("no guess for a method it cannot know", String(nothing), "null");
}

console.log(failed ? `\n${failed} hover checks failed` : "\nall hover checks passed");
process.exitCode = failed ? 1 : 0;
