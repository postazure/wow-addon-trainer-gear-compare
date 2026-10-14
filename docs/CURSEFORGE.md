# Releasing on CurseForge

A release has four parts, in this order:

1. [Prepare](#1-prepare): version, changelog, zip.
2. [Release testing checklist](#2-release-testing-checklist): test the zip in game.
3. [Assets checklist](#3-assets-checklist): make sure screenshots, text and icons match this version.
4. [Release](#4-release): release PR, then tag `main`; CI checks, builds, and
   publishes the tag's notes.

Don't upload until 2 and 3 are fully ticked. Copy the checklists into the
release's notes (or a GitHub issue) and tick them there, so this file stays
clean.

## 1. Prepare

- [ ] Bump `"version"` in `package.json`. That is the only place the version
      lives; the build writes it into the TOC.
- [ ] Move the `## Unreleased` lines in `CHANGELOG.md` into a section for
      the version, written for players. Leave `## Unreleased` empty above it.
- [ ] Check the TOC's `## Interface:` line matches the live client. In game,
      `/run print((select(4, GetBuildInfo())))` prints the number. If the
      client moved on, add the new number (comma-separated).
- [ ] `npm run package`. It type-checks, builds, runs both test suites, and
      writes `release/TrainerCompare-<version>.zip`. It must finish with no
      warnings.

## 2. Release testing checklist

Test the **zip**, not `dist/`, so you test exactly what players get. Turn on
Lua errors first: `/console scriptErrors 1`.

**Install**

- [ ] The zip holds one `TrainerCompare/` folder with only:
      `TrainerCompare.toc`, `TrainerCompare.lua`, `icon.tga`, `LICENSE.txt`.
- [ ] Fresh install: delete `Interface/AddOns/TrainerCompare` and
      `WTF/Account/<ACCOUNT>/SavedVariables/TrainerCompare.lua`, unzip the
      release into AddOns, and log in. No Lua errors.
- [ ] The addon list shows **Trainer Compare** with its icon, and it isn't
      marked out of date.
- [ ] With debug on (`/run TrainerCompareDB.debug = true`), `/reload` prints
      `loaded v<version>` with the new version.
- [ ] Update install (skip for the first release): put the previous release
      back, set the filter on, then install this zip over it. The setting
      is kept.

**Core behavior** (the full list is [TEST-CHECKLIST.md](TEST-CHECKLIST.md); run
all of it for a big change, and at least this for a small one)

- [ ] A gear trainer (Blacksmithing, Leatherworking or Tailoring): hovering a
      recipe shows the compare with your equipped item on the **left**,
      headed **Currently Equipped** (with visible text).
- [ ] The recipe tooltip shows "Item level X vs Y (slot)" and the stat
      changes, one per line, green or red numbers with white names.
- [ ] Gear you can't use still shows the compare and the lines.
- [ ] A non-gear trainer (Enchanting or Alchemy): no Trainer Compare lines,
      no compare, no errors.
- [ ] Settings dropdown: **Only show usable gear** is there (no header, no
      divider). Ticking it fades only gear you can't use.
- [ ] No marks on any recipe row.
- [ ] Rings or trinkets: the compare shows both of yours.
- [ ] Train a recipe. No "action blocked" or "interface action failed".
- [ ] With debug on, chat says `compare: native, left`. (`manual` still
      works, but note it in the release notes.)
- [ ] With debug off (`/run TrainerCompareDB.debug = false`), Trainer Compare prints nothing
      during normal play.

**Coverage**

- [ ] Two characters if you can: one cloth wearer and one mail or plate
      wearer, so the usable filter is tested both ways.
- [ ] Once with only Trainer Compare enabled, once with your usual addons.
- [ ] Move from a recipe to a bag item: the normal Blizzard compare still
      works, and nothing from the recipe is left on screen.

If anything fails: fix it, bump the version again, and start over at 1.

## 3. Assets checklist

Everything players see on CurseForge must match this version. Go through
every line, even if you think nothing changed.

**Screenshots** (in `assets/screenshots/`; upload to the project's
Images tab)

Take them in game (Print Screen saves to `Screenshots/`), crop to the trainer
window and tooltips, and save as PNG with these names. Hide other addons'
frames and chat so the picture is clean. Retake a screenshot when anything in
it looks different from the current version.

| File | What it must show | Retake when |
| --- | --- | --- |
| `01-compare.png` | A gear recipe hovered at a trainer: the recipe tooltip on the right, the compare on the left with **Currently Equipped**, and our item level + stat lines. | The compare, its header, its side, or the tooltip lines change. |
| `02-stat-lines.png` | Close-up of the recipe tooltip's lines: "Item level X vs Y (slot)", the "If you replace this item..." heading, and a mix of green and red stat numbers. | Line wording, colors, or order change. |
| `03-two-slots.png` | A ring or trinket recipe with both equipped rings or trinkets in the compare. | Two-slot or weapon rules change. |
| `04-settings-menu.png` | The trainer's Settings dropdown open, showing **Only show usable gear**. | The menu entry's text or place changes. |
| `05-filter.png` | The recipe list with the filter on: some rows faded (gear you can't use), the rest normal. | Fading or the filter's rules change. |

- [ ] Every screenshot in the table exists and matches this version.
- [ ] The project's Images tab has the same set; remove old ones that no
      longer match.

**Text**

- [ ] [curseforge/description.md](curseforge/description.md) matches what
      the addon does now: features, commands, and the "What it doesn't do"
      list. Paste it into the project description.
- [ ] The one-line summary below is still true.
- [ ] `README.md` feature list and commands match.
- [ ] `CHANGELOG.md` has this version's section.

**Icons**

- [ ] If `assets/icon.svg` changed, run `scripts/render-icon.sh`, then check
      `assets/curseforge-logo.png` (400x400) and `addon/icon.tga` (64x64)
      look right, and upload the new logo.
- [ ] The in-game addon list shows the icon (checked in 2).

**Project settings**

- [ ] Categories are still right (Professions, Tooltip).
- [ ] Source link points to the public GitHub repo.

## 4. Release

Releases are cut by tagging `main` after a release PR merges. The tag is
**annotated**, and its message is the release notes. The workflow publishes
those notes as they are; no AI runs in it.

- [ ] Run the release skill in Claude Code on your machine: `/release`
      (`.claude/skills/release/SKILL.md`). It:
  1. checks you're on a clean, up-to-date `main` and the tests pass,
  2. drafts player-facing notes from the commits since the last tag,
  3. picks the version with you (`v1.0.0-beta.1` makes a pre-release and a
     CurseForge **Beta** file),
  4. bumps `package.json`, writes the `CHANGELOG.md` section, runs
     `npm run package`, and asks you to confirm sections 2 and 3 are done,
  5. opens a "Release v<version>" PR for you to merge,
  6. after the merge, makes the annotated tag on `main`, and pushes it only
     when you say yes.
- [ ] Watch **Actions → Release**. Its jobs run in order:
  1. **Build and test**: checks the tag is annotated with notes and agrees
     with `package.json` and `CHANGELOG.md`, then builds, tests and zips.
     Nothing is published if this fails.
  2. **GitHub release**: creates the release with the zip and the tag's
     notes, or updates it if it already exists.
  3. **CurseForge**: uploads the zip with the same notes, tagged with the
     Forever game versions from the TOC's Interface line. Skipped (not
     failed) until CurseForge is set up; see below.
- [ ] Read the notes on the GitHub release. If they need a change, edit the
      release on GitHub, then re-run the CurseForge upload (it uses the
      release's notes).
- [ ] After CurseForge moderation, install it from the CurseForge app on a
      clean AddOns folder, log in, and check the version as in section 2.

**Tagging by hand** (without the skill): write the notes to a file, then
`git tag -a v<version> -F <file> --cleanup=verbatim`. Without
`--cleanup=verbatim`, git drops every line starting with `#`, so Markdown
headings vanish. A plain `git tag v<version>` has no message, and the
release stops at the first check. `node scripts/check-release.mjs
v<version>` runs the same check locally.

**If a job fails:** fix the cause, then use **Re-run failed jobs** on the
run. To build a tag again from scratch, run **Actions → Release → Run
workflow** with the tag. To retry only the CurseForge upload for any existing
release, run **Actions → Upload to CurseForge → Run workflow** with the tag.

**Before the automation is set up** (or if CurseForge is down), upload by
hand: download the zip from the GitHub release, then on the project page
**Upload File** with display name `Trainer Compare <version>`, release type
**Release**, game version **Forever** (the versions in the TOC's Interface
line, 1.60.1 today), and the release's notes as the changelog.

## Automation setup (once)

Only CurseForge needs setup. In the GitHub repo, **Settings → Secrets and
variables → Actions**:

| Name | Kind | What it's for | Without it |
| --- | --- | --- | --- |
| `CURSEFORGE_TOKEN` | Secret | Upload to CurseForge (from CurseForge → API Tokens) | CurseForge job is skipped |
| `CURSEFORGE_PROJECT_ID` | Variable | Which CurseForge project (from the project page) | CurseForge job is skipped |

After adding the CurseForge ones, upload any release that was skipped with
**Actions → Upload to CurseForge → Run workflow**.

To check an upload without sending it:
`node scripts/curseforge-upload.mjs --zip release/TrainerCompare-<version>.zip --notes <file> --dry-run`.

## One-time setup (on curseforge.com)

- [ ] Create a CurseForge author account.
- [ ] Create a project: **World of Warcraft → Addons**, name **Trainer Compare**.
- [ ] Categories: Professions, Tooltip.
- [ ] License: **MIT License**.
- [ ] Summary: the one-line summary below.
- [ ] Description: paste `docs/curseforge/description.md`.
- [ ] Logo: upload `assets/curseforge-logo.png`.
- [ ] Screenshots: everything in `assets/screenshots/` (see the assets checklist).
- [ ] Source link: this GitHub repo. Blizzard wants add-on code public and
      readable, so make the repo public first.
- [ ] Copy the project ID from the project page into the `CURSEFORGE_PROJECT_ID`
      repo variable (see Automation setup).

The first file goes through moderation before it shows up.

## Summary (one line)

Compare trainer recipe gear to what you wear, with the game's compare tooltips. Made for WoW Forever.
