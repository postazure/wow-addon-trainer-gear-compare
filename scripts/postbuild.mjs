// Write the TOC next to the bundle with the version from package.json,
// then check the Lua parses as Lua 5.1.
import { readFileSync, writeFileSync } from "node:fs";
import luaparse from "luaparse";

const outDir = "dist/TrainerCompare";
const { version } = JSON.parse(readFileSync("package.json", "utf8"));

// package.json is the one place the version lives.
const toc = readFileSync("addon/TrainerCompare.toc", "utf8").replaceAll("@project-version@", version);
writeFileSync(`${outDir}/TrainerCompare.toc`, toc);

const file = `${outDir}/TrainerCompare.lua`;
try {
  luaparse.parse(readFileSync(file, "utf8"), { luaVersion: "5.1" });
} catch (e) {
  console.error(`${file} is not valid Lua 5.1: ${e.message}`);
  process.exit(1);
}
console.log(`built ${outDir} v${version}`);
