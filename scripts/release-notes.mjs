// Write player-facing release notes for a tag.
//
// Claude writes them from the version's CHANGELOG.md section (the source of
// truth) and the commit messages since the previous tag. If there is no API
// key, or the API fails or declines, the CHANGELOG section is used as is.
// This script never fails the release because of the API.
//
// Usage: node scripts/release-notes.mjs --tag v0.6.0 --out release-notes.md
// Needs ANTHROPIC_API_KEY for the Claude-written version.
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { changelogSection, versionFromTag } from "./lib/release.mjs";

const MODEL = "claude-opus-5-5";
/** Commit text sent to Claude is capped so a huge history can't blow up the request. */
const MAX_COMMIT_CHARS = 40_000;

const SYSTEM = `You write release notes for Trainer Compare, a World of Warcraft addon for WoW Forever.
At a profession trainer it shows how a recipe's gear compares to what the player wears.

Write for players, not developers. Plain English, short sentences, everyday words.

Rules:
- The CHANGELOG section is the source of truth. Use the commit messages only to understand it better.
- Only describe changes that are in the CHANGELOG section. Never invent features, fixes, or numbers.
- Leave out internal work players can't see (tests, build, refactors, docs, CI).
- Never call gear an "upgrade". The addon shows facts; players decide.
- Never claim it works with other addons unless the CHANGELOG says so.
- Format: Markdown. One short opening sentence, then "### What's new" and, only if there are any,
  "### Fixes" and "### Good to know", each a bullet list. No other headings, no emoji, no sign-off.
- Output only the release notes.`;

/** Run git and return its output. Its own error text is not shown; callers handle failures. */
function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

/** The tag before this one, or undefined for the first release. */
function previousTag(tag) {
  try {
    return git("describe", "--tags", "--abbrev=0", `${tag}^`);
  } catch {
    return undefined;
  }
}

function commitsSince(prev, tag) {
  const range = prev === undefined ? tag : `${prev}..${tag}`;
  const log = git("log", "--no-merges", "--format=%s%n%n%b%n----", range);
  return log.length > MAX_COMMIT_CHARS ? `${log.slice(0, MAX_COMMIT_CHARS)}\n[truncated]` : log;
}

/** Ask Claude for the notes. Returns undefined (and logs why) on any failure. */
async function claudeNotes(version, section, commits) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("::notice::ANTHROPIC_API_KEY is not set; using the CHANGELOG section as the release notes.");
    return undefined;
  }
  const client = new Anthropic({ timeout: 120_000, maxRetries: 2 });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium" },
      // On a safety decline, retry on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{
        role: "user",
        content: `Version ${version}\n\n<changelog>\n${section}\n</changelog>\n\n<commits>\n${commits}\n</commits>`,
      }],
    });
    if (response.stop_reason === "refusal") {
      console.log("::warning::Claude declined to write the notes; using the CHANGELOG section.");
      return undefined;
    }
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();
    if (text === "") {
      console.log("::warning::Claude returned no text; using the CHANGELOG section.");
      return undefined;
    }
    return text;
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.log("::warning::ANTHROPIC_API_KEY was rejected; using the CHANGELOG section.");
    } else if (error instanceof Anthropic.RateLimitError) {
      console.log("::warning::Claude API rate limit; using the CHANGELOG section.");
    } else if (error instanceof Anthropic.APIConnectionError) {
      console.log(`::warning::Could not reach the Claude API (${error.message}); using the CHANGELOG section.`);
    } else if (error instanceof Anthropic.APIError) {
      console.log(`::warning::Claude API error ${error.status}; using the CHANGELOG section.`);
    } else {
      console.log(`::warning::Could not reach the Claude API (${error?.message ?? error}); using the CHANGELOG section.`);
    }
    return undefined;
  }
}

async function main() {
  const { values } = parseArgs({ options: { tag: { type: "string" }, out: { type: "string" } } });
  if (!values.tag || !values.out) {
    console.error("Usage: node scripts/release-notes.mjs --tag v<version> --out <file>");
    process.exit(1);
  }
  const version = versionFromTag(values.tag);
  const section = changelogSection(readFileSync("CHANGELOG.md", "utf8"), version);
  if (section === undefined) {
    console.error(`::error::CHANGELOG.md has no "## ${version}" section.`);
    process.exit(1);
  }

  const prev = previousTag(values.tag);
  const commits = commitsSince(prev, values.tag);
  const written = await claudeNotes(version, section, commits);
  const notes = written ?? section;
  writeFileSync(values.out, `${notes}\n`);

  const source = written !== undefined ? `written by ${MODEL}` : "the CHANGELOG section";
  console.log(`Release notes for ${values.tag} (${source}, commits since ${prev ?? "the start"}):\n\n${notes}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Release notes (${source})\n\n${notes}\n`);
  }
}

await main();
