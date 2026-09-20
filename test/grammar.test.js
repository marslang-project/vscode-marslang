// Tokenize a sample program with the real TextMate engine VS Code uses, and
// check that the scopes the themes colour are the ones we intend.
const fs = require("fs");
const path = require("path");
const oniguruma = require("vscode-oniguruma");
const textmate = require("vscode-textmate");

const ROOT = path.join(__dirname, "..");
const SAMPLE = path.join(__dirname, "sample.mars");

async function registry() {
    const wasm = fs.readFileSync(path.join(ROOT, "node_modules/vscode-oniguruma/release/onig.wasm"));
    await oniguruma.loadWASM(wasm.buffer);
    return new textmate.Registry({
        onigLib: Promise.resolve({
            createOnigScanner: (sources) => new oniguruma.OnigScanner(sources),
            createOnigString: (text) => new oniguruma.OnigString(text),
        }),
        loadGrammar: async (scope) => {
            if (scope !== "source.mars") return null;
            const file = path.join(ROOT, "syntaxes/marslang.tmLanguage.json");
            return textmate.parseRawGrammar(fs.readFileSync(file, "utf8"), file);
        },
    });
}

/// Every token of the sample, as { text, line, scopes }.
function tokenize(grammar, source) {
    const tokens = [];
    let state = textmate.INITIAL;
    source.split(/\r?\n/).forEach((text, line) => {
        const result = grammar.tokenizeLine(text, state);
        for (const token of result.tokens) {
            const slice = text.slice(token.startIndex, token.endIndex);
            if (slice.trim()) tokens.push({ text: slice, line: line + 1, scopes: token.scopes });
        }
        state = result.ruleStack;
    });
    return tokens;
}

const checks = [
    ["takepkg", "keyword.control.import.mars", "the import keyword"],
    ["std.math", "entity.name.namespace.mars", "the imported package name"],
    ["//", "comment.line.double-slash.mars", "a line comment"],
    ["fixed", "storage.modifier.mars", "a binding modifier"],
    ["float", "support.type.mars", "a type in an annotation"],
    ["family", "keyword.declaration.family.mars", "the family keyword"],
    ["Circle", "entity.name.type.family.mars", "a family name"],
    ["@", "punctuation.definition.decorator.mars", "a decorator marker"],
    ["private", "entity.name.function.decorator.mars", "a decorator name"],
    ["func", "keyword.declaration.function.mars", "the func keyword"],
    ["size", "entity.name.function.mars", "a method name"],
    ["ret", "keyword.control.mars", "a control keyword"],
    ["me", "variable.language.me.mars", "the receiver"],
    ["out", "support.function.builtin.mars", "a builtin call"],
    ["TypeError", "support.class.error.mars", "an error family"],
    ["a family of func in a string", "string.quoted.double.mars", "keywords inside a string"],
    ["3.14159", "constant.numeric.float.mars", "a float literal"],
    ["42", "constant.numeric.integer.mars", "an integer literal"],
    ["=>", "keyword.operator.arrow.mars", "the expression-body arrow"],
];

async function main() {
    const grammar = await (await registry()).loadGrammar("source.mars");
    const tokens = tokenize(grammar, fs.readFileSync(SAMPLE, "utf8"));

    let failed = 0;
    for (const [text, scope, description] of checks) {
        const matches = tokens.filter((token) => token.text === text);
        const scoped = matches.find((token) => token.scopes.includes(scope));
        if (scoped) {
            console.log(`  ok   ${description}: ${text} -> ${scope}`);
        } else {
            failed += 1;
            const seen = matches.length
                ? matches.map((token) => `line ${token.line}: ${token.scopes.join(" ")}`).join("; ")
                : "token never produced";
            console.log(`  FAIL ${description}: ${text} is not ${scope} (${seen})`);
        }
    }

    // A comment must not swallow the rest of the file, and a string must end.
    const last = tokens[tokens.length - 1];
    if (last.scopes.some((scope) => scope.startsWith("comment") || scope.startsWith("string"))) {
        failed += 1;
        console.log(`  FAIL the last token is still inside a comment or string: ${last.scopes.join(" ")}`);
    }

    console.log(`\n${checks.length - failed} of ${checks.length} scope checks passed`);
    process.exitCode = failed ? 1 : 0;
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
