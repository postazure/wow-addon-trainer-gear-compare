// Release notes are the message of the annotated release tag. The release
// skill writes them; CI only reads them, so no AI runs in the workflow.
//
// Usage: node scripts/tag-notes.mjs --tag v0.6.0 --out release-notes.md
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

/**
 * Read a tag's notes. annotated is false for a lightweight tag (no message)
 * or a missing tag. A signature block on a signed tag is removed.
 */
export function readTagNotes(tag, cwd = process.cwd()) {
  let type;
  try {
    type = git(["cat-file", "-t", `refs/tags/${tag}`], cwd).trim();
  } catch {
    return { annotated: false, notes: "" };
  }
  if (type !== "tag") return { annotated: false, notes: "" };
  const contents = git(["for-each-ref", `refs/tags/${tag}`, "--format=%(contents)"], cwd);
  const notes = contents.split(/^-----BEGIN (?:PGP|SSH) SIGNATURE-----$/m)[0].trim();
  return { annotated: true, notes };
}

function main() {
  const { values } = parseArgs({ options: { tag: { type: "string" }, out: { type: "string" } } });
  if (!values.tag || !values.out) {
    console.error("Usage: node scripts/tag-notes.mjs --tag v<version> --out <file>");
    process.exit(1);
  }
  const { annotated, notes } = readTagNotes(values.tag);
  if (!annotated || notes === "") {
    console.error(`::error::${values.tag} has no release notes. Tag with the release skill (an annotated tag whose message is the notes).`);
    process.exit(1);
  }
  writeFileSync(values.out, `${notes}\n`);
  console.log(`Release notes for ${values.tag}:\n\n${notes}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
