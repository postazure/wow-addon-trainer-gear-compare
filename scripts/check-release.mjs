// Before anything is published: the tag must be annotated with release notes,
// and it must agree with package.json and CHANGELOG.md.
// Usage: node scripts/check-release.mjs v0.6.0
import { readFileSync } from "node:fs";
import { changelogSection, readPackageVersion, versionFromTag } from "./lib/release.mjs";
import { readTagNotes } from "./tag-notes.mjs";

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

const { annotated, notes } = readTagNotes(tag);
if (!annotated) {
  problems.push(`${tag} is not an annotated tag. Release notes live in the tag's message: tag with the release skill.`);
} else if (notes === "") {
  problems.push(`${tag} has an empty message. Its message must be the release notes.`);
}

if (problems.length > 0) {
  for (const p of problems) console.error(`::error::${p}`);
  process.exit(1);
}
console.log(`${tag} is ready: annotated with notes, and package.json and CHANGELOG.md match.`);
