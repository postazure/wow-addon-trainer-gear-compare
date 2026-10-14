# Trainer Compare (WoW Forever)

Shows, in the profession trainer window, how each recipe's item compares to
your equipped gear, and whether you can use it. Facts only: it doesn't
claim anything is an "upgrade".

- **Compare**: hover a recipe and hold Shift (or turn on "Always compare
  items") to see Blizzard's normal compare: your equipped item(s) on the
  left, the recipe on the right. Works for gear you can't use, too.
- **Tooltip lines**: item level vs equipped, then the stat changes, one per
  line, under "If you replace this item, the following stat changes will
  occur:". The number is green or red; the stat name is white. Gear you
  can't use gets the same lines. The item's own red text already says why.
- **"Only show usable gear"** in the trainer's Settings dropdown: fades gear
  you can't use (armor type, weapon skill, level, class). Non-gear recipes
  are never faded.

Built for WoW Forever 1.60.1 (interface 16001), from what the client
actually returns. See [Probe findings](#probe-findings).

## Install

From CurseForge, or from source:

1. `npm install && npm run build`
2. Copy `dist/TrainerCompare` into `<WoW Forever>/Interface/AddOns/`.
   Or set `WOW_ADDONS_DIR` and run `npm run deploy`.
3. If the addon list says "Out of date", tick **Load out of date AddOns**.
4. Run the [in-game test checklist](docs/TEST-CHECKLIST.md).

No other addon is needed.

## Settings

There are no slash commands. "Only show usable gear" is in the trainer's
Settings dropdown. Settings are saved per account in `TrainerCompareDB`.

Debug messages (they also show silent failures) are off by default:

- On: `/run TrainerCompareDB.debug = true`
- Off: `/run TrainerCompareDB.debug = false`

Either takes effect at once and is saved. With debug on, `/reload` prints the
version.

## How it works

1. The trainer gives the crafted item through `GetTrainerServiceItemLink`.
   No link means no item (enchants and similar): skipped quietly.
2. **Can you use it?** With the filter on, gear is faded if:
   - the level requirement isn't met,
   - the armor type or weapon skill isn't known (checked with
     `IsPlayerSpell` and Classic proficiency spell ids),
   - it's a relic for another class, or
   - it has only main stats your class doesn't use (for example, only
     Spirit on a Paladin).
3. **What does it replace?** The equip slot picks the equipped item(s) for
   the item level line and the stat changes:
   - Rings and trinkets: the one with the lower item level. The compare
     tooltips show both.
   - One-hand weapon: main hand. If you can dual wield, the hand with the
     lower item level.
   - Two-hander: your main hand and off hand together.
   - Anything while you wield a two-hander: the two-hander.
   - Shirts, tabards, bags, ammo and fishing poles: not compared.

## Known limits

- **The filter fades rows. It doesn't remove them.** Removing rows means
  editing Blizzard's ScrollBox data, which taints the trainer frame. Faded
  rows stay clickable.
- **"Usable" includes a main-stat rule.** An item with only stats your class
  doesn't use (for example, only Spirit on a Paladin) counts as not usable.
  That's a judgment call, unlike the armor, weapon, level and class checks.
- **The filter lives in the Settings dropdown** (menu tag
  `MENU_TRAINER_FILTER`, added with `Menu.ModifyMenu`). If a client has no
  `Menu` API, a "Usable" checkbox appears left of the Train button instead.
- **Rows are matched to recipes through the ScrollBox row data**
  (`skillIndex`, `index`, and so on). If a row's visible name does not match
  the recipe, it is never faded. That way it fails safe and never shows a
  wrong result. With debug on, a skipped row is reported in chat.
- **The compare is started by hand.** Blizzard's compare only starts for
  item tooltips, and the trainer tooltip is a spell tooltip. So
  Trainer Compare feeds the crafted item to `TooltipComparisonManager`
  itself, then moves the compare to the left. If that doesn't show
  anything, it fills `ShoppingTooltip1/2` with your equipped items and
  shows their "Currently Equipped" header. With debug on, chat says which
  one ran.
- **No compare when the slot is empty.** There's nothing to show.
- **Loading lines don't update by themselves.** If an item is still
  loading, the tooltip says so. Move the mouse off and back on.
- **Enchants on your equipped gear are not counted** in the stat changes.
- **Gear above your level counts as not usable,** even if you'll reach that
  level soon.
- **ForeverGear and GearSetImprover:** neither was installed in the client
  the probe ran on, so their APIs couldn't be checked. There is no
  integration. Trainer Compare only uses the compare tooltips while a
  recipe is hovered, and never hides a compare it didn't show.
- Only the default Blizzard trainer UI is supported.

## Development

```
addon/TrainerCompare.toc      TOC, copied into the build output
src/main.ts                   Events
src/trainerUI.ts              Hooks, usable filter, Settings menu entry, compare tooltips
src/compare.ts                Usable check, what it replaces, slot rules (cached)
src/items.ts                  Item data cache; handles late-loading items
src/usable.ts                 Level, proficiency, main-stat checks
src/slots.ts                  Equip slot ids and placement rules
src/tooltip.ts                Tooltip lines and stat changes
src/db.ts, src/log.ts         Settings; debug log and safe() wrapper
types/wow-forever.d.ts        Hand-written WoW API types
test/                         Mock client, fixtures, main + fallback suites
probe/TrainerCompareProbe/    Debug addon (plain Lua) that found the API
scripts/                      Post-build, package, deploy, icon, and release scripts
.github/workflows/            Release (tag) and CurseForge upload workflows
dist/TrainerCompare/          Build output. This folder is the addon.
release/                      Zips from npm run package (not committed)
docs/                         In-game checklist, CurseForge guide and description
assets/                       Icon source (SVG), CurseForge logo, screenshots
addon/icon.tga                In-game addon list icon (from assets/icon.svg)
CHANGELOG.md, LICENSE         Release notes; MIT license
CLAUDE.md                     Working rules and lessons for Claude sessions
.claude/skills/release/       Release skill (/release): notes, version, tag
```

```sh
npm run build       # TypeScript -> one Lua 5.1 file in dist/TrainerCompare
npm test            # build, 125+ checks in two mock clients, and the release-script tests
npm run typecheck
npm run watch       # rebuild on save (does not copy the TOC)
npm run package     # build, test, zip for CurseForge
```

Notes:

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
commits since the last tag, bumps the version, commits, and tags. It pushes
only when you say yes. No AI runs in the workflows.

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

Before tagging, go through [docs/CURSEFORGE.md](docs/CURSEFORGE.md): the
release testing checklist, the assets checklist (screenshots, description,
icons), and the one-time automation setup. Player-facing changes go under
`## Unreleased` in [CHANGELOG.md](CHANGELOG.md) as they're made.

```sh
npm run package     # build, test, then release/TrainerCompare-<version>.zip
```

The zip holds one `TrainerCompare/` folder: the TOC, the Lua, the icon, and the
license. After changing `assets/icon.svg`, run `scripts/render-icon.sh` to
rebuild the logo and the in-game icon.

## License

MIT. See [LICENSE](LICENSE).

## Probe findings

From WoW Forever 1.60.1 (70374), interface 16001, `WOW_PROJECT_ID` 18.
Classic data on a modern engine:

- `GetTrainerServiceItemLink` returns the crafted item's link.
- `GetTrainerServiceInfo` order: name, **type**, icon, ?, "", category.
  Classic puts the type 3rd.
- Only `C_Item.*` item functions exist. `GetItemInfo` and the other old
  globals are gone.
- No `GetSkillLineInfo` / `GetNumSkillLines`. `IsPlayerSpell` exists.
- The trainer list is a ScrollBox. Hookable: `ClassTrainerFrame_InitServiceButton`,
  `ClassTrainerFrame_InitCategoryButton`, `ClassTrainerFrame_Update`.
- The trainer tooltip is a spell tooltip with the item embedded.
  `C_TooltipInfo.GetTrainerService` reports type Spell.

From a menu diagnostic on the same client (since removed; the probe is
the place for new ones):

- Modern `Menu` API is present. The trainer's Settings dropdown is
  `ClassTrainerFrame.FilterDropdown`, tag `MENU_TRAINER_FILTER`.
- Native compare is present: `TooltipComparisonManager.CompareItem`,
  `C_TooltipComparison.GetItemComparisonInfo`. `ShoppingTooltip1` has a
  `CompareHeader`. `ShoppingTooltip1:SetCompareItem` (Classic) is gone.

To run the probe again: copy `probe/TrainerCompareProbe` into AddOns, open
a trainer, then `/tcprobe all` and `/tcprobe show` (Ctrl+A, Ctrl+C).
