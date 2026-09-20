// Check that what the interpreter prints becomes the right squiggle.
//
// The unit cases pin the parsing. The end-to-end cases run the real `marslang
// check` over broken programs, so a change to the interpreter's messages shows
// up here rather than in someone's editor. Set MARSLANG to point at a build.
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { parseError } = require("../src/diagnostics");

let failed = 0;

function check(description, actual, expected) {
    const same = JSON.stringify(actual) === JSON.stringify(expected);
    if (!same) failed += 1;
    console.log(`  ${same ? "ok  " : "FAIL"} ${description}`);
    if (!same) console.log(`       expected ${JSON.stringify(expected)}\n       got      ${JSON.stringify(actual)}`);
}

console.log("reading interpreter output");
check("a located parser error", parseError("error: line 9: expected expression, got End"),
    { line: 9, name: null, detail: "expected expression, got End" });
check("an unlocated error names what it could not find", parseError("error: unknown name 'nope'"),
    { line: null, name: "nope", detail: "unknown name 'nope'" });
check("a quoted phrase is not treated as a name", parseError("error: in package util: bad 'a b'"),
    { line: null, name: null, detail: "in package util: bad 'a b'" });
check("trailing output is ignored", parseError("error: line 2: bad\nnote: something\n"),
    { line: 2, name: null, detail: "bad" });
check("silence is not an error", parseError("   \n"), null);

const interpreter = process.env.MARSLANG
    || path.join(__dirname, "../../Marslang/target/debug/marslang" + (process.platform === "win32" ? ".exe" : ""));

if (!fs.existsSync(interpreter)) {
    console.log(`\nskipped the end-to-end cases: no interpreter at ${interpreter}`);
} else {
    console.log(`\nrunning ${path.basename(interpreter)} over broken programs`);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "marslang-diagnostics-"));
    const cases = [
        ["a syntax error inside a function", "func m{\n    out(\"ok\");\n    out(1 +;\n}\n", { line: 3 }],
        ["a syntax error inside a method", "family C{\n    func init(){\n        me.r = 1;\n    }\n\n    func size(){\n        ret me.r *;\n    }\n}\nfunc m{}\n", { line: 7 }],
        ["a top-level import", "takepkg ;\nfunc m{}\n", { line: 1 }],
        ["an unknown name", "func m{\n    out(nope);\n}\n", { name: "nope" }],
    ];

    for (const [description, source, expected] of cases) {
        const file = path.join(directory, `${description.replace(/\W+/g, "-")}.mars`);
        fs.writeFileSync(file, source);
        let printed = "";
        try {
            execFileSync(interpreter, ["check", file], { encoding: "utf8" });
        } catch (error) {
            printed = `${error.stderr || ""}${error.stdout || ""}`;
        }
        const parsed = parseError(printed);
        if (!parsed) {
            failed += 1;
            console.log(`  FAIL ${description}: check reported nothing`);
            continue;
        }
        const actual = "line" in expected ? { line: parsed.line } : { name: parsed.name };
        check(`${description} -> ${JSON.stringify(expected)}`, actual, expected);
    }
    fs.rmSync(directory, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} checks failed` : "\nall diagnostic checks passed");
process.exitCode = failed ? 1 : 0;
