// Zip the built addon for CurseForge: release/TrainerCompare-<version>.zip
// with a single top-level TrainerCompare/ folder (TOC, Lua, license).
// Run with `npm run package`, which builds and tests first.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { zipSync } from "fflate";

const ADDON = "TrainerCompare";
const built = join("dist", ADDON);
const { version } = JSON.parse(readFileSync("package.json", "utf8"));

const files = {};
for (const name of readdirSync(built)) {
  files[`${ADDON}/${name}`] = readFileSync(join(built, name));
}
files[`${ADDON}/LICENSE.txt`] = readFileSync("LICENSE");

const toc = files[`${ADDON}/${ADDON}.toc`]?.toString("utf8") ?? "";
if (!toc.includes(`## Version: ${version}`)) {
  console.error(`TOC version does not match package.json (${version}). Run npm run build.`);
  process.exit(1);
}

mkdirSync("release", { recursive: true });
const out = join("release", `${ADDON}-${version}.zip`);
writeFileSync(out, zipSync(files, { level: 9 }));
console.log(`packaged ${out}`);
for (const name of Object.keys(files).sort()) console.log(`  ${name}`);
