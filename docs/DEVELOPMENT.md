# Developing Trainer Compare

TypeScript, compiled to one Lua 5.1 file by TypeScriptToLua (TSTL). Working
rules for Claude sessions are in [CLAUDE.md](../CLAUDE.md).

## Build from source

1. `npm install && npm run build`
2. Copy `dist/TrainerCompare` into `<WoW Forever>/Interface/AddOns/`.
   Or set `WOW_ADDONS_DIR` and run `npm run deploy`.
3. If the addon list says "Out of date", tick **Load out of date AddOns**.
4. Run the [in-game test checklist](TEST-CHECKLIST.md).

## Layout

```
addon/TrainerCompare.toc      TOC, copied into the build output
src/main.ts                   Entry point: registers the events
src/trainerUI.ts              Installs the trainer hooks
src/rows.ts                   Matches rows to recipes; fades the ones you can't use
src/settingsMenu.ts           The filter toggle (Settings dropdown, or a fallback checkbox)
src/compareTooltips.ts        Item in GameTooltip, the recipe box, and the compare
src/tooltip.ts                Recipe box lines: item level and stat changes
src/prices.ts                 Reagent cost and profit (Auctionator)
src/recipes.ts                A recipe's reagents and count made (GetRecipeSchematic)
src/compare.ts                What a recipe's item would replace (cached)
src/usable.ts                 Level, proficiency, relic and main-stat checks
src/items.ts                  Item data cache; handles late-loading items
src/slots.ts                  Equip slot ids and placement rules
src/widgets.ts                Helpers for reading Blizzard frames safely
src/db.ts, src/log.ts         Saved settings; debug log and safe() wrapper
types/wow-forever.d.ts        Hand-written WoW API types
test/                         Mock client, fixtures, main + fallback suites
probe/TrainerCompareProbe/    Debug addon (plain Lua) that found the API
scripts/                      Post-build, package, deploy, icon, and release scripts
.github/workflows/            Test (every PR), release (tag) and CurseForge upload
dist/TrainerCompare/          Build output. This folder is the addon.
release/                      Zips from npm run package (not committed)
docs/                         How it works, development, probe findings,
                              in-game checklist, CurseForge guide and description
assets/                       Icon source (SVG), CurseForge logo, screenshots
addon/icon.tga                In-game addon list icon (from assets/icon.svg)
CHANGELOG.md, LICENSE         Release notes; MIT license
CLAUDE.md                     Working rules and lessons for Claude sessions
.claude/skills/release/       Release skill (/release): notes, version, tag
```

## Commands

Changes go through a pull request to `main`. `npm test` must pass before you
push. The **Test** workflow (`.github/workflows/test.yml`) runs it again on
every PR and on `main`; merge only when it's green.

```sh
npm run build       # TypeScript -> one Lua 5.1 file in dist/TrainerCompare
npm test            # build, 125+ checks in two mock clients, and the release-script tests
npm run typecheck
npm run watch       # rebuild on save (does not copy the TOC)
npm run package     # build, test, zip for CurseForge
```

## Notes

- TypeScriptToLua 1.37 needs **TypeScript 6.0.2** exactly. TypeScript 7
  (the native Go port) doesn't work with it. Both are pinned.
- The build fails if the output isn't valid Lua 5.1.
- **Readable output.** The Lua is not minified. The build puts a header on
  it that explains how it's generated and where the source is. TSTL keeps
  only `/** */` doc comments that sit right above a declaration, so explain
  things there; plain `//` comments don't reach the Lua.
- No maintained TypeScript types exist for Classic-based clients, so
  `types/wow-forever.d.ts` is hand-written from the probe output. Anything not
  confirmed is typed as possibly `undefined`.
- **Watch the call style.** In TSTL, methods in an interface or object type
  compile to `obj:Method()`. Plain library functions (`C_Timer.After`,
  `C_Item.*`) must be declared in a `namespace` or with `this: void`, or they
  compile to colon calls and break.
- The tests run the built Lua in fengari, with a mock seeded from real probe
  values. They prove the logic, not the look. Use the manual checklist for
  that.

## Releasing

Releases are cut by tagging `main` with an **annotated** tag whose message is
the release notes. Run the release skill in Claude Code on your machine:
`/release` (`.claude/skills/release/SKILL.md`). It drafts the notes from the
commits since the last tag, opens a release PR with the version bump, and
after you merge it, tags `main`. It pushes the tag only when you say yes. No
AI runs in the workflows.

The tag must match `"version"` in `package.json`, which is the only place the
version lives (the build writes it into the TOC).

The tag starts the **Release** workflow (`.github/workflows/release.yml`):

1. **Build and test**: `scripts/check-release.mjs` checks the tag is annotated
   with notes, and that it, `package.json` and `CHANGELOG.md` agree; then
   `npm run package`. `scripts/tag-notes.mjs` reads the notes from the tag.
2. **GitHub release** with the zip and the notes.
3. **CurseForge**: `.github/workflows/curseforge.yml` uploads the release's zip
   and notes with `scripts/curseforge-upload.mjs`, tagged with the Forever game
   versions from the zip's own TOC. It's a separate workflow, so it can be run
   by hand for any existing release, and it's skipped until its secret and
   variable are set.

To tag by hand: `git tag -a v<version> -F <notes-file> --cleanup=verbatim`.
Without `--cleanup=verbatim`, git drops lines starting with `#`, so Markdown
headings vanish.

Before tagging, go through [CURSEFORGE.md](CURSEFORGE.md): the
release testing checklist, the assets checklist (screenshots, description,
icons), and the one-time automation setup. Player-facing changes go under
`## Unreleased` in [CHANGELOG.md](../CHANGELOG.md) as they're made.

```sh
npm run package     # build, test, then release/TrainerCompare-<version>.zip
```

The zip holds one `TrainerCompare/` folder: the TOC, the Lua, the icon, and the
license. After changing `assets/icon.svg`, run `scripts/render-icon.sh` to
rebuild the logo and the in-game icon.
