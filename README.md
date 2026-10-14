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

## Slash commands

| Command                     | What it does                                         |
| --------------------------- | ---------------------------------------------------- |
| `/tc`                       | Version and help                                     |
| `/tc filter`                | Toggle "Only show usable gear"                       |
| `/tc scoring`               | Show the current scoring method                      |
| `/tc scoring itemLevel`     | Item level only (default)                            |
| `/tc scoring statWeights`   | Add a rough per-class stat-weight score line         |
| `/tc debug`                 | Toggle debug messages (also shows silent failures)   |
| `/tc dump`                  | Hook status and what each visible row resolved to    |
| `/tc menus`                 | Diagnostic: how dropdowns and compare tooltips work  |
| `/tc copy`                  | Reopen the last `/tc menus` copy window              |

Settings are saved per account in `TrainerCompareDB`.

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
   - Rings and trinkets: the weaker of your two (by item level). The compare
     tooltips show both.
   - One-hand weapon: main hand. If you can dual wield, the weaker hand.
   - Two-hander: your main hand and off hand together.
   - Anything while you wield a two-hander: the two-hander.
   - Shirts, tabards, bags, ammo and fishing poles: not compared.

`/tc scoring statWeights` is opt-in. It adds a "Score X vs Y" line from rough
per-class weights and uses those weights to pick the "weaker" ring or
trinket. To add a scoring method, write a `Scorer` in `src/scoring.ts` and
add it to `SCORERS`.

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
  wrong result. `/tc dump` shows what each row resolved to.
- **The compare is started by hand.** Blizzard's compare only starts for
  item tooltips, and the trainer tooltip is a spell tooltip. So
  Trainer Compare feeds the crafted item to `TooltipComparisonManager`
  itself, then moves the compare to the left. If that doesn't show
  anything, it fills `ShoppingTooltip1/2` with your equipped items and
  shows their "Currently Equipped" header. `/tc debug` says which one ran.
- **No compare when the slot is empty.** There's nothing to show.
- **Loading lines don't update by themselves.** If an item is still
  loading, the tooltip says so. Move the mouse off and back on.
- **Stat weights are rough.** They are a tie-breaker, not a sim.
  Enchants on your equipped gear are not counted.
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
src/main.ts                   Events and slash commands
src/trainerUI.ts              Hooks, usable filter, Settings menu entry, compare tooltips
src/compare.ts                Usable check, what it replaces, slot rules (cached)
src/items.ts                  Item data cache; handles late-loading items
src/usable.ts                 Level, proficiency, main-stat checks
src/scoring.ts                Swappable scoring methods
src/slots.ts                  Equip slot ids and placement rules
src/tooltip.ts                Tooltip lines and stat changes
src/diagnose.ts               /tc menus diagnostic
src/copyWindow.ts             Copy window for diagnostic output
src/db.ts, src/log.ts         Settings; debug log and safe() wrapper
types/wow-forever.d.ts        Hand-written WoW API types
test/                         Mock client, fixtures, main + fallback suites
probe/TrainerCompareProbe/    Debug addon (plain Lua) that found the API
scripts/                      Post-build (TOC version, Lua 5.1 check), deploy, package
dist/TrainerCompare/          Build output. This folder is the addon.
release/                      Zips from npm run package (not committed)
docs/                         In-game checklist, CurseForge release guide
CHANGELOG.md, LICENSE         Release notes; MIT license
```

```sh
npm run build       # TypeScript -> one Lua 5.1 file in dist/TrainerCompare
npm test            # build, then 130+ checks in two mock clients (main + fallback)
npm run typecheck
npm run watch       # rebuild on save (does not copy the TOC)
npm run package     # build, test, zip for CurseForge
```

Notes:

- TypeScriptToLua 1.37 needs **TypeScript 6.0.2** exactly. TypeScript 7
  (the native Go port) doesn't work with it. Both are pinned.
- The build fails if the output isn't valid Lua 5.1.
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

The version lives only in `package.json`; the build writes it into the TOC,
and `/tc` reads it from there.

```sh
npm run package     # build, test, then release/TrainerCompare-<version>.zip
```

The zip holds one `TrainerCompare/` folder: the TOC, the Lua, and the
license. Upload it on CurseForge by hand for now. Steps, the upload
settings, and a ready-to-paste project description are in
[docs/CURSEFORGE.md](docs/CURSEFORGE.md). Changes go in
[CHANGELOG.md](CHANGELOG.md).

### TODO: automatic uploads

Set up a GitHub Action that runs on a version tag (`v*`):

- [ ] Create the CurseForge project and add `## X-Curse-Project-ID` to the TOC.
- [ ] Create a CurseForge API token; add it as the repo secret `CURSEFORGE_TOKEN`.
- [ ] Workflow: checkout, `npm ci`, `npm run package`.
- [ ] Look up the Forever game version id from `GET /api/game/versions`
      (name `1.60.1`, Forever type).
- [ ] Upload with `POST /api/projects/<id>/upload-file` (header `X-Api-Token`;
      form fields `file` and `metadata` with `changelog`, `releaseType`,
      `gameVersions`, `displayName`). Changelog from `CHANGELOG.md`.
- [ ] Also attach the zip to a GitHub release.

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

From `/tc menus` on the same client:

- Modern `Menu` API is present. The trainer's Settings dropdown is
  `ClassTrainerFrame.FilterDropdown`, tag `MENU_TRAINER_FILTER`.
- Native compare is present: `TooltipComparisonManager.CompareItem`,
  `C_TooltipComparison.GetItemComparisonInfo`. `ShoppingTooltip1` has a
  `CompareHeader`. `ShoppingTooltip1:SetCompareItem` (Classic) is gone.

To run the probe again: copy `probe/TrainerCompareProbe` into AddOns, open
a trainer, then `/tcprobe all` and `/tcprobe show` (Ctrl+A, Ctrl+C).
