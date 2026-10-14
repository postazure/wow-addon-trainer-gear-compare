// Tests for the release scripts (node --test). No network: CurseForge is never
// called. Tag tests run in throwaway git repos.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { zipSync } from "fflate";
import {
  changelogSection, interfaceToVersion, releaseType, tocInterfaces, versionFromTag,
} from "../scripts/lib/release.mjs";
import { findForeverType, pickGameVersions, tocFromZip, tocVersion } from "../scripts/curseforge-upload.mjs";
import { readTagNotes } from "../scripts/tag-notes.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const SCRIPTS = join(ROOT, "scripts");

test("versions and release types come from the tag", () => {
  assert.equal(versionFromTag("v0.6.0"), "0.6.0");
  assert.equal(releaseType("0.6.0"), "release");
  assert.equal(releaseType("1.0.0-beta.2"), "beta");
  assert.equal(releaseType("1.0.0-rc.1"), "beta");
  assert.equal(releaseType("1.0.0-alpha"), "alpha");
});

test("changelog sections", () => {
  const log = "# Changelog\n\n## 0.7.0\n\n- New thing\n\n## 0.6.0\n\n- First\n- Second\n\n## 0.5.0\n\n";
  assert.equal(changelogSection(log, "0.7.0"), "- New thing");
  assert.equal(changelogSection(log, "0.6.0"), "- First\n- Second");
  assert.equal(changelogSection(log, "0.5.0"), undefined, "an empty section counts as missing");
  assert.equal(changelogSection(log, "0.4.0"), undefined);
  assert.equal(changelogSection(log, "0.6"), undefined, "no prefix matches");
});

test("interface numbers become game versions", () => {
  assert.equal(interfaceToVersion("16001"), "1.60.1");
  assert.equal(interfaceToVersion(16000), "1.60.0");
  assert.equal(interfaceToVersion("11504"), "1.15.4");
  const toc = readFileSync(join(ROOT, "addon/TrainerCompare.toc"), "utf8");
  assert.deepEqual(tocInterfaces(toc), ["16000", "16001"]);
});

test("the CurseForge game versions are picked from the Forever type only", () => {
  const types = [{ id: 1, name: "WoW Retail", slug: "wow_retail" }, { id: 88568, name: "Forever", slug: "wow-forever" }];
  const forever = findForeverType(types);
  assert.equal(forever.id, 88568);
  const versions = [
    { id: 10, gameVersionTypeID: 1, name: "1.60.1" }, // same name, wrong type
    { id: 20, gameVersionTypeID: 88568, name: "1.60.1" },
    { id: 21, gameVersionTypeID: 88568, name: "1.60.2" },
  ];
  const picked = pickGameVersions(versions, forever.id, ["1.60.0", "1.60.1"]);
  assert.deepEqual(picked.ids, [20]);
  assert.deepEqual(picked.found, ["1.60.1"]);
  assert.deepEqual(picked.available, ["1.60.1", "1.60.2"]);
});

test("the upload reads the TOC from inside the zip", () => {
  const toc = "## Interface: 16000, 16001\n## Title: Trainer Compare\n## Version: 9.9.9\n";
  const zip = zipSync({ "TrainerCompare/TrainerCompare.toc": new TextEncoder().encode(toc) });
  const read = tocFromZip(zip);
  assert.equal(tocVersion(read), "9.9.9");
  assert.deepEqual(tocInterfaces(read), ["16000", "16001"]);
  assert.throws(() => tocFromZip(zipSync({ "Other/Other.toc": new Uint8Array() })), /not in the zip/);
});

const NOTES = "### New\n\n- Shows item level on recipes.\n\n### Fixed\n\n- The equipped header has text.";

/** A throwaway git repo with package.json at 0.2.0, a changelog, and a tagged first commit. */
function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), "tc-release-"));
  const git = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "Test");
  git("config", "tag.gpgSign", "false");
  writeFileSync(join(dir, "package.json"), JSON.stringify({ version: "0.2.0" }));
  writeFileSync(join(dir, "CHANGELOG.md"), "# Changelog\n\n## 0.2.0\n\n- Shows item level on recipes.\n\n## 0.1.0\n\n- First.\n");
  git("add", ".");
  git("commit", "-q", "-m", "Release v0.2.0");
  const notesFile = join(dir, ".notes");
  writeFileSync(notesFile, `${NOTES}\n`);
  /** Tags the way the release skill does: annotated, message kept as written. */
  const tagAnnotated = (tag) => git("tag", "-a", tag, "-F", notesFile, "--cleanup=verbatim");
  return { dir, git, tagAnnotated, notesFile };
}

function run(script, args, cwd) {
  return spawnSync("node", [join(SCRIPTS, script), ...args], { cwd, encoding: "utf8" });
}

test("tag notes keep Markdown headings when tagged with --cleanup=verbatim", () => {
  const { dir, tagAnnotated } = makeRepo();
  tagAnnotated("v0.2.0");
  assert.deepEqual(readTagNotes("v0.2.0", dir), { annotated: true, notes: NOTES });
});

test("plain git tag -a -F drops the headings, which is why the skill uses verbatim", () => {
  const { dir, git, notesFile } = makeRepo();
  git("tag", "-a", "v0.2.0", "-F", notesFile);
  const { notes } = readTagNotes("v0.2.0", dir);
  assert.doesNotMatch(notes, /###/);
});

test("lightweight and missing tags have no notes", () => {
  const { dir, git } = makeRepo();
  git("tag", "v0.2.0");
  assert.deepEqual(readTagNotes("v0.2.0", dir), { annotated: false, notes: "" });
  assert.deepEqual(readTagNotes("v9.9.9", dir), { annotated: false, notes: "" });
});

test("a signature block is not part of the notes", () => {
  const { dir, git } = makeRepo();
  const signed = join(dir, ".signed");
  writeFileSync(signed, `${NOTES}\n-----BEGIN SSH SIGNATURE-----\nabc\n-----END SSH SIGNATURE-----\n`);
  git("tag", "-a", "v0.2.0", "-F", signed, "--cleanup=verbatim");
  assert.equal(readTagNotes("v0.2.0", dir).notes, NOTES);
});

test("tag-notes.mjs writes the notes, and fails for a lightweight tag", () => {
  const { dir, git, tagAnnotated } = makeRepo();
  tagAnnotated("v0.2.0");
  const out = join(dir, "notes.md");
  const ok = run("tag-notes.mjs", ["--tag", "v0.2.0", "--out", out], dir);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(readFileSync(out, "utf8"), `${NOTES}\n`);

  git("tag", "v0.2.0-light");
  const bad = run("tag-notes.mjs", ["--tag", "v0.2.0-light", "--out", out], dir);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /has no release notes/);
});

test("check-release passes for an annotated tag that matches", () => {
  const { dir, tagAnnotated } = makeRepo();
  tagAnnotated("v0.2.0");
  const res = run("check-release.mjs", ["v0.2.0"], dir);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /v0\.2\.0 is ready/);
});

test("check-release fails for a lightweight tag", () => {
  const { dir, git } = makeRepo();
  git("tag", "v0.2.0");
  const res = run("check-release.mjs", ["v0.2.0"], dir);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /is not an annotated tag/);
});

test("check-release fails for a tag that doesn't match package.json or the changelog", () => {
  const { dir, tagAnnotated } = makeRepo();
  tagAnnotated("v99.0.0");
  const res = run("check-release.mjs", ["v99.0.0"], dir);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /package\.json says 0\.2\.0/);
  assert.match(res.stderr, /no "## 99\.0\.0" section/);
  assert.doesNotMatch(res.stderr, /annotated/);
});
