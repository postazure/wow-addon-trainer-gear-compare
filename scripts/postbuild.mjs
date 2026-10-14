// Finish the build in dist/TrainerCompare:
// - copy addon/ files (icon) and write the TOC with the version from package.json,
// - put a header on the Lua bundle that says how to read it,
// - check the Lua parses as Lua 5.1.
import { copyFileSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import luaparse from "luaparse";

const outDir = "dist/TrainerCompare";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const { version } = pkg;
const sourceUrl = pkg.repository.url;

for (const name of readdirSync("addon")) {
  if (!name.endsWith(".toc")) copyFileSync(`addon/${name}`, `${outDir}/${name}`);
}

// package.json is the one place the version lives.
const toc = readFileSync("addon/TrainerCompare.toc", "utf8").replaceAll("@project-version@", version);
writeFileSync(`${outDir}/TrainerCompare.toc`, toc);

const file = `${outDir}/TrainerCompare.lua`;
const bundle = readFileSync(file, "utf8");
const modules = [...bundle.matchAll(/^\["(src\.[^"]+)"\]/gm)].map((m) => m[1]);

const header = `-- Trainer Compare ${version}
--
-- This file is generated from TypeScript by TypeScriptToLua (TSTL). It is not
-- minified or obfuscated; it is meant to be read. The original source, tests
-- and build are at:
--   ${sourceUrl}
--
-- How to read it:
--   * "lualib_bundle" holds TSTL's small runtime helpers (__TS__ArrayIncludes, ...).
--   * Each "src.<name>" module is the file src/<name>.ts in the repo.
--   * "src.main" is the entry point: events and the /tc slash commands.
--   * Comments starting with "---" come from the TypeScript source.
--   * Names like ____exports or ____opt_1 are TSTL temporaries.
--
-- Modules: ${modules.join(", ")}

`;
writeFileSync(file, header + bundle);

try {
  luaparse.parse(header + bundle, { luaVersion: "5.1" });
} catch (e) {
  console.error(`${file} is not valid Lua 5.1: ${e.message}`);
  process.exit(1);
}
console.log(`built ${outDir} v${version}`);
