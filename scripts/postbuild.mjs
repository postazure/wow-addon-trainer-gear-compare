// Copy the TOC next to the bundle, then check the Lua parses as Lua 5.1.
import { copyFileSync, readFileSync } from "node:fs";
import luaparse from "luaparse";

const outDir = "dist/TrainerCompare";
copyFileSync("addon/TrainerCompare.toc", `${outDir}/TrainerCompare.toc`);

const file = `${outDir}/TrainerCompare.lua`;
try {
  luaparse.parse(readFileSync(file, "utf8"), { luaVersion: "5.1" });
} catch (e) {
  console.error(`${file} is not valid Lua 5.1: ${e.message}`);
  process.exit(1);
}
console.log(`built ${outDir}`);
