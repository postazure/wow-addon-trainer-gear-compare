# Releasing on CurseForge

## One-time setup (on curseforge.com)

- [ ] Create a CurseForge author account.
- [ ] Create a project: **World of Warcraft → Addons**, name **Trainer Compare**.
- [ ] Categories: Professions, Tooltip.
- [ ] License: **MIT License**.
- [ ] Summary (short line): see below.
- [ ] Description: paste `docs/curseforge/description.md`.
- [ ] Logo: upload `assets/curseforge-logo.png`.
- [ ] Screenshots: the compare at a trainer, the stat lines, the Settings
      dropdown with "Only show usable gear".
- [ ] Source link: this GitHub repo. Blizzard wants add-on code public and
      readable, so make the repo public first.
- [ ] Copy the project ID from the project page. Later it goes in the TOC as
      `## X-Curse-Project-ID: <id>` (needed for the GitHub Action).

## Each release

1. Update `CHANGELOG.md` and bump `"version"` in `package.json`. That is the
   only place the version lives; the build writes it into the TOC.
2. `npm run package`. It builds, runs the tests, and writes
   `release/TrainerCompare-<version>.zip`.
3. Run the in-game checklist (`docs/TEST-CHECKLIST.md`) with the zip's
   contents.
4. Commit, then tag: `git tag v<version> && git push origin v<version>`.
5. On the project page, **Upload File**:
   - File: the zip from step 2.
   - Display name: `Trainer Compare <version>`.
   - Release type: **Release**.
   - Game version: **Forever, 1.60.1** (also any newer Forever version the
     TOC supports).
   - Changelog: that version's section from `CHANGELOG.md`.
6. The first file goes through moderation before it shows up.

## Summary (one line)

Compare trainer recipe gear to what you wear, with Blizzard's own compare tooltips. Made for WoW Forever.

## Description

Paste [curseforge/description.md](curseforge/description.md) into the
project description. CurseForge's editor accepts Markdown.

## Images

- Logo: [assets/curseforge-logo.png](../assets/curseforge-logo.png) (400x400).
  The source is [assets/icon.svg](../assets/icon.svg); rebuild both icon files
  with `scripts/render-icon.sh` after changing it.
- Screenshots (take these in game): a gear recipe with the compare open, the
  stat lines up close, and the Settings dropdown showing "Only show usable
  gear".
