# Releasing on CurseForge

## One-time setup (on curseforge.com)

- [ ] Create a CurseForge author account.
- [ ] Create a project: **World of Warcraft → Addons**, name **Trainer Compare**.
- [ ] Categories: Professions, Tooltip.
- [ ] License: **MIT License**.
- [ ] Summary (short line): see below.
- [ ] Description: paste the text below.
- [ ] Logo: square image (CurseForge shows it small; keep it simple).
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

Compare trainer recipe gear to what you wear, with Blizzard's own compare
tooltips. Made for WoW Forever.

## Description (paste into CurseForge)

**Trainer Compare** shows how the gear a profession trainer teaches compares
to what you're wearing, right in the trainer window.

**What it does**

- Hover a recipe to see Blizzard's normal item compare: your equipped item on
  the left, marked "Currently Equipped". Hold Shift, or turn on "Always
  compare items" in the game's options.
- The recipe tooltip adds the item level of the new item vs yours, then the
  stat changes, one per line, in green and red.
- Rings and trinkets compare against both of yours. Two-handers compare
  against your main hand and off hand.
- Works for gear you can't use yet, too.
- **Only show usable gear**: a new option in the trainer's Settings dropdown.
  It fades gear you can't use: wrong armor type, a weapon skill you don't
  have, too high level, another class's relic, or only stats your class
  doesn't use (like Spirit-only gear on a Paladin).

**What it doesn't do**

- It doesn't tell you what's an "upgrade". It shows the facts and lets you
  decide.
- It doesn't change the trainer window or the recipe rows. The filter fades
  rows; it never hides or removes them.

**Commands**

- `/tc` — help
- `/tc filter` — toggle "Only show usable gear"
- `/tc debug` — show what failed, if something looks wrong

No other addons needed. It only adds lines to the trainer's own tooltip,
so item tooltips used by other gear addons are left alone.

Source code: https://github.com/postazure/wow-addon-trainer-gear-compare
