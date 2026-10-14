# TrainerUpgrades (WoW Forever)

Shows, in the profession trainer window, how each recipe's item compares to
your equipped gear, and whether you can use it. Facts only: it doesn't
claim anything is an "upgrade".

- **Red X** on the recipe icon: gear you can't use. Nothing else is marked.
- **Compare**: hover a recipe and hold Shift (or turn on "Always compare
  items") to see Blizzard's normal compare: your equipped item(s) on the
  left, the recipe on the right. Works for gear you can't use, too.
- **Tooltip lines**: item level vs equipped, then the stat changes, one per
  line, under "If you replace this item, the following stat changes will
  occur:". For gear you can't use, it says why.
- **"Only show usable gear"** in the trainer's Settings dropdown: fades gear
  you can't use (armor type, weapon skill, level, class). Non-gear recipes
  are never faded.

Built for WoW Forever 1.60.1 (interface 16001), from what the client
actually returns. See [Probe findings](#probe-findings).

## Install

1. `npm install && npm run build`
2. Copy `dist/TrainerUpgrades` into `<WoW Forever>/Interface/AddOns/`.
   Or set `WOW_ADDONS_DIR` and run `npm run deploy`.
3. If the addon list says "Out of date", tick **Load out of date AddOns**.
4. Run the [in-game test checklist](docs/TEST-CHECKLIST.md).

No other addon is needed.

## Slash commands

| Command                     | What it does                                         |
| --------------------------- | ---------------------------------------------------- |
| `/tu`                       | Version and help                                     |
| `/tu filter`                | Toggle "Only show usable gear"                       |
| `/tu scoring`               | Show the current scoring method                      |
| `/tu scoring itemLevel`     | Item level only (default)                            |
| `/tu scoring statWeights`   | Add a rough per-class stat-weight score line         |
| `/tu debug`                 | Toggle debug messages (also shows silent failures)   |
| `/tu dump`                  | Hook status and what each visible row resolved to    |
| `/tu menus`                 | Diagnostic: how dropdowns and compare tooltips work  |
| `/tu copy`                  | Reopen the last `/tu menus` copy window              |

Settings are saved per account in `TrainerUpgradesDB`.

## How it works

1. The trainer gives the crafted item through `GetTrainerServiceItemLink`.
   No link means no item (enchants and similar): skipped quietly.
2. **Can you use it?** Gear gets a red X and a "Can't use: ..." line if:
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

`/tu scoring statWeights` is opt-in. It adds a "Score X vs Y" line from rough
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
- **The red X position is a best guess** (top-left corner of the recipe
  icon).
- **Rows are matched to recipes through the ScrollBox row data**
  (`skillIndex`, `index`, and so on). If a row's visible name does not match
  the recipe, it gets no marker. That way it fails safe and never shows a
  wrong result. `/tu dump` shows what each row resolved to.
- **The compare is started by hand.** Blizzard's compare only starts for
  item tooltips, and the trainer tooltip is a spell tooltip. So
  TrainerUpgrades feeds the crafted item to `TooltipComparisonManager`
  itself, then moves the compare to the left. If that doesn't show
  anything, it fills `ShoppingTooltip1/2` with your equipped items and
  shows their "Currently Equipped" header. `/tu debug` says which one ran.
- **No compare when the slot is empty.** There's nothing to show.
- **Loading lines don't update by themselves.** If an item is still
  loading, the tooltip says so. Move the mouse off and back on.
- **Stat weights are rough.** They are a tie-breaker, not a sim.
  Enchants on your equipped gear are not counted.
- **Gear above your level counts as not usable,** even if you'll reach that
  level soon.
- **ForeverGear and GearSetImprover:** neither was installed in the client
  the probe ran on, so their APIs couldn't be checked. There is no
  integration. TrainerUpgrades only uses the compare tooltips while a
  recipe is hovered, and never hides a compare it didn't show.
- Only the default Blizzard trainer UI is supported.

## Development

```
addon/TrainerUpgrades.toc     TOC, copied into the build output
src/main.ts                   Events and slash commands
src/trainerUI.ts              Hooks, markers, Settings menu entry, compare tooltips
src/compare.ts                Usable check, what it replaces, slot rules (cached)
src/items.ts                  Item data cache; handles late-loading items
src/usable.ts                 Level, proficiency, main-stat checks
src/scoring.ts                Swappable scoring methods
src/slots.ts                  Equip slot ids and placement rules
src/tooltip.ts                Tooltip lines and stat changes
src/diagnose.ts               /tu menus diagnostic
src/copyWindow.ts             Copy window for diagnostic output
src/db.ts, src/log.ts         Settings; debug log and safe() wrapper
types/wow-forever.d.ts        Hand-written WoW API types
test/                         Mock client, fixtures, main + fallback suites
probe/TrainerUpgradesProbe/   Debug addon (plain Lua) that found the API
dist/TrainerUpgrades/         Build output. This folder is the addon.
```

```sh
npm run build       # TypeScript -> one Lua 5.1 file in dist/TrainerUpgrades
npm test            # build, then 130+ checks in two mock clients (main + fallback)
npm run typecheck
npm run watch       # rebuild on save (does not copy the TOC)
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

From `/tu menus` on the same client:

- Modern `Menu` API is present. The trainer's Settings dropdown is
  `ClassTrainerFrame.FilterDropdown`, tag `MENU_TRAINER_FILTER`.
- Native compare is present: `TooltipComparisonManager.CompareItem`,
  `C_TooltipComparison.GetItemComparisonInfo`. `ShoppingTooltip1` has a
  `CompareHeader`. `ShoppingTooltip1:SetCompareItem` (Classic) is gone.

To run the probe again: copy `probe/TrainerUpgradesProbe` into AddOns, open
a trainer, then `/tuprobe all` and `/tuprobe show` (Ctrl+A, Ctrl+C).
