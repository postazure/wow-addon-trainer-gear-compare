// Before anything is published: the tag, package.json and CHANGELOG.md must agree.
// Usage: node scripts/check-release.mjs v0.6.0
import { readFileSync } from "node:fs";
import { changelogSection, readPackageVersion, versionFromTag } from "./lib/release.mjs";

const tag = process.argv[2];
if (!tag || !tag.startsWith("v")) {
  console.error("Usage: node scripts/check-release.mjs v<version>");
  process.exit(1);
}

const version = versionFromTag(tag);
const problems = [];
const pkgVersion = readPackageVersion();
if (pkgVersion !== version) {
  problems.push(`package.json says ${pkgVersion}, but the tag is ${tag}. Bump package.json, commit, and tag that commit.`);
}
if (changelogSection(readFileSync("CHANGELOG.md", "utf8"), version) === undefined) {
  problems.push(`CHANGELOG.md has no "## ${version}" section (or it is empty).`);
}

if (problems.length > 0) {
  for (const p of problems) console.error(`::error::${p}`);
  process.exit(1);
}
console.log(`${tag} is ready: package.json and CHANGELOG.md match.`);
