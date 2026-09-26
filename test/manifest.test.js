// Check the manifest settings that keep an untrusted folder from choosing the
// program this extension runs: its .vscode/settings.json could otherwise set
// marslang.path to a program of its own, which runs when a .mars file opens.
const manifest = require("../package.json");

let failed = 0;
function check(description, ok) {
    if (!ok) failed += 1;
    console.log(`  ${ok ? "ok  " : "FAIL"} ${description}`);
}

const trust = (manifest.capabilities || {}).untrustedWorkspaces || {};
check("untrusted folders are supported only in part", trust.supported === "limited");
check("marslang.path is restricted in untrusted folders", (trust.restrictedConfigurations || []).includes("marslang.path"));

console.log(failed ? `\n${failed} manifest check(s) failed` : "\nall manifest checks passed");
process.exit(failed ? 1 : 0);
