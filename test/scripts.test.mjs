// Tests for the release scripts (node --test). No network: the Claude API is
// either missing or pointed at a closed port, and CurseForge is never called.
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

test("check-release passes for the current version and fails for a wrong tag", () => {
  const { version } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const ok = spawnSync("node", [join(SCRIPTS, "check-release.mjs"), `v${version}`], { cwd: ROOT, encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  const bad = spawnSync("node", [join(SCRIPTS, "check-release.mjs"), "v99.0.0"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /package\.json says/);
  assert.match(bad.stderr, /no "## 99\.0\.0" section/);
});

/** A throwaway git repo with a changelog and two tags. */
function repoWithTags() {
  const dir = mkdtempSync(join(tmpdir(), "tc-release-"));
  const git = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "Test");
  writeFileSync(join(dir, "CHANGELOG.md"), "# Changelog\n\n## 0.2.0\n\n- Shows item level on recipes.\n\n## 0.1.0\n\n- First.\n");
  git("add", ".");
  git("commit", "-q", "-m", "First release");
  git("tag", "v0.1.0");
  git("commit", "-q", "--allow-empty", "-m", "Show item level on recipes");
  git("tag", "v0.2.0");
  return dir;
}

function runNotes(dir, env) {
  const out = join(dir, "notes.md");
  const res = spawnSync("node", [join(SCRIPTS, "release-notes.mjs"), "--tag", "v0.2.0", "--out", out], {
    cwd: dir, encoding: "utf8", env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env },
  });
  return { ...res, notes: readFileSync(out, "utf8") };
}

test("release notes fall back to the CHANGELOG section without an API key", () => {
  const res = runNotes(repoWithTags(), {});
  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.notes, "- Shows item level on recipes.\n");
  assert.match(res.stdout, /ANTHROPIC_API_KEY is not set/);
  assert.match(res.stdout, /commits since v0\.1\.0/);
  assert.equal(res.stderr, "", "no git noise in the log");
});

test("release notes fall back when the Claude API can't be reached", () => {
  // Port 9 (discard) refuses connections, so every attempt fails fast.
  const res = runNotes(repoWithTags(), { ANTHROPIC_API_KEY: "test-key", ANTHROPIC_BASE_URL: "http://127.0.0.1:9" });
  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.notes, "- Shows item level on recipes.\n");
  assert.match(res.stdout, /Could not reach the Claude API/);
  assert.doesNotMatch(res.stdout, /error undefined/);
});
