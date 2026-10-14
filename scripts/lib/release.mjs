// Shared helpers for the release scripts. Pure functions, so they can be tested.
import { readFileSync } from "node:fs";

/** "v0.6.0" -> "0.6.0". */
export function versionFromTag(tag) {
  return tag.replace(/^v/, "");
}

/** CurseForge and GitHub release type from the version: 1.0.0-beta.1 is a beta. */
export function releaseType(version) {
  if (/-alpha/i.test(version)) return "alpha";
  if (/-(beta|rc)/i.test(version)) return "beta";
  return "release";
}

/** The body of "## <version>" in CHANGELOG.md, or undefined if there is none. */
export function changelogSection(changelog, version) {
  const lines = changelog.split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${version}`);
  if (start === -1) return undefined;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith("## "));
  const body = (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
  return body === "" ? undefined : body;
}

/** WoW interface number to game version: 16001 -> "1.60.1", 11504 -> "1.15.4". */
export function interfaceToVersion(iface) {
  const n = Number(iface);
  return `${Math.floor(n / 10000)}.${Math.floor((n % 10000) / 100)}.${n % 100}`;
}

/** Interface numbers from a TOC's "## Interface:" line (comma-separated). */
export function tocInterfaces(toc) {
  const line = toc.split(/\r?\n/).find((l) => /^##\s*Interface\s*:/i.test(l));
  if (!line) return [];
  return line.replace(/^##\s*Interface\s*:/i, "").split(",").map((s) => s.trim()).filter((s) => /^\d+$/.test(s));
}

export function readPackageVersion() {
  return JSON.parse(readFileSync("package.json", "utf8")).version;
}
