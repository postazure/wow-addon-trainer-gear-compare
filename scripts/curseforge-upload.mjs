// Upload a release zip to CurseForge.
//
// The game versions come from the zip's own TOC: each "## Interface:" number
// (16001 -> 1.60.1) is matched to CurseForge's Forever game versions, so the
// upload is tagged with exactly what the addon says it supports.
//
// Usage:
//   node scripts/curseforge-upload.mjs --zip release/TrainerCompare-0.6.0.zip \
//     --notes release-notes.md [--dry-run]
// Needs CURSEFORGE_TOKEN and CURSEFORGE_PROJECT_ID. --dry-run reads the zip and
// prints what it would send, without calling CurseForge.
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { unzipSync } from "fflate";
import { interfaceToVersion, releaseType, tocInterfaces } from "./lib/release.mjs";

const API = "https://wow.curseforge.com/api";
const ADDON = "TrainerCompare";

/** The TOC inside the release zip. */
export function tocFromZip(zipBytes) {
  const files = unzipSync(zipBytes);
  const toc = files[`${ADDON}/${ADDON}.toc`];
  if (!toc) throw new Error(`${ADDON}/${ADDON}.toc is not in the zip`);
  return new TextDecoder().decode(toc);
}

/** The "## Version:" value from a TOC. */
export function tocVersion(toc) {
  const line = toc.split(/\r?\n/).find((l) => /^##\s*Version\s*:/i.test(l));
  return line?.replace(/^##\s*Version\s*:/i, "").trim();
}

/** CurseForge's game version type for WoW Forever. */
export function findForeverType(types) {
  return types.find((t) => /forever/i.test(`${t.name ?? ""} ${t.slug ?? ""}`));
}

/** Game version ids for the wanted names, within one version type. */
export function pickGameVersions(versions, typeId, wantedNames) {
  const ofType = versions.filter((v) => v.gameVersionTypeID === typeId);
  const picked = ofType.filter((v) => wantedNames.includes(v.name));
  return { ids: picked.map((v) => v.id), found: picked.map((v) => v.name), available: ofType.map((v) => v.name) };
}

async function getJson(path, token) {
  const res = await fetch(`${API}${path}`, { headers: { "X-Api-Token": token } });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const { values } = parseArgs({
    options: { zip: { type: "string" }, notes: { type: "string" }, "dry-run": { type: "boolean", default: false } },
  });
  if (!values.zip || !values.notes) {
    console.error("Usage: node scripts/curseforge-upload.mjs --zip <file> --notes <file> [--dry-run]");
    process.exit(1);
  }

  const zip = readFileSync(values.zip);
  const toc = tocFromZip(zip);
  const version = tocVersion(toc);
  if (!version) throw new Error("The zip's TOC has no ## Version line");
  const wanted = tocInterfaces(toc).map(interfaceToVersion);
  if (wanted.length === 0) throw new Error("The zip's TOC has no ## Interface line");

  const metadata = {
    changelog: readFileSync(values.notes, "utf8"),
    changelogType: "markdown",
    displayName: `Trainer Compare ${version}`,
    releaseType: releaseType(version),
  };

  if (values["dry-run"]) {
    console.log(`Dry run. Would upload ${basename(values.zip)} for game versions ${wanted.join(", ")} with:`);
    console.log(JSON.stringify({ ...metadata, gameVersions: `<ids for ${wanted.join(", ")}>` }, null, 2));
    return;
  }

  const token = process.env.CURSEFORGE_TOKEN;
  const projectId = process.env.CURSEFORGE_PROJECT_ID;
  if (!token || !projectId) {
    console.error("::error::Set CURSEFORGE_TOKEN and CURSEFORGE_PROJECT_ID.");
    process.exit(1);
  }

  const forever = findForeverType(await getJson("/game/version-types", token));
  if (!forever) throw new Error("CurseForge has no Forever game version type");
  const { ids, found, available } = pickGameVersions(await getJson("/game/versions", token), forever.id, wanted);
  const missing = wanted.filter((name) => !found.includes(name));
  if (missing.length > 0) {
    console.log(`::warning::CurseForge has no Forever version ${missing.join(", ")} yet; tagging ${found.join(", ") || "none"}.`);
  }
  if (ids.length === 0) {
    throw new Error(`None of ${wanted.join(", ")} are CurseForge Forever versions. Available: ${available.join(", ")}`);
  }

  const form = new FormData();
  form.append("metadata", JSON.stringify({ ...metadata, gameVersions: ids }));
  form.append("file", new Blob([zip], { type: "application/zip" }), basename(values.zip));
  const res = await fetch(`${API}/projects/${projectId}/upload-file`, {
    method: "POST",
    headers: { "X-Api-Token": token },
    body: form,
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${body}`);
  console.log(`Uploaded ${basename(values.zip)} to CurseForge (${metadata.releaseType}, ${found.join(", ")}): ${body}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`::error::${error.message}`);
    process.exit(1);
  });
}
