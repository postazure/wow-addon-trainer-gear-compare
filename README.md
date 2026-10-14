# TrainerUpgrades (WoW Forever)

Shows, in the profession trainer window, whether each recipe's item would be
an upgrade over your equipped gear.

- **Green arrow** on the recipe icon: upgrade.
- **Gray dash**: same or worse.
- **No marker**: not gear, no item (enchants), or you can't use it.
- **Tooltip**: item level vs your equipped item in that slot, and the stat
  changes. If you can't use the item, it says why.
- **"Upgrades"** checkbox next to the Train button: fades everything that isn't an upgrade.

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
| `/tu filter`                | Toggle the "Upgrades" filter                         |
| `/tu scoring`               | Show the current scoring method                      |
| `/tu scoring itemLevel`     | Higher item level wins (default)                     |
| `/tu scoring statWeights`   | Simple per-class stat weights                        |
| `/tu debug`                 | Toggle debug messages (also shows silent failures)   |
| `/tu dump`                  | Hook status and what each visible row resolved to    |

Settings are saved per account in `TrainerUpgradesDB`.

## How it decides

1. The trainer gives the crafted item through `GetTrainerServiceItemLink`.
   No link means no item (enchants and similar): skipped quietly.
2. The item's equip slot picks what to compare against:
   - Rings and trinkets: the weaker of your two.
   - One-hand weapon: main hand. If you can dual wield, the weaker hand.
   - Two-hander: the average (item level) or sum (stat weights) of your
     main hand and off hand. An empty hand counts as 0.
   - Anything while you wield a two-hander: compared against the two-hander.
   - An empty slot: always an upgrade.
   - Shirts, tabards, bags, ammo and fishing poles: not compared.
3. It must be gear you can use:
   - Level requirement met.
   - Armor type and weapon skill known (checked with `IsPlayerSpell` and
     Classic proficiency spell ids).
   - Not the wrong main stats for your class. For example, an item with
     only Spirit is hidden for a Paladin.
4. Higher score wins. Ties are "same or worse".

To add a scoring method, write a `Scorer` in `src/scoring.ts` and add it to
`SCORERS`. It shows up in `/tu scoring` by itself.

## Known limits

- **The filter fades rows. It doesn't remove them.** Removing rows means
  editing Blizzard's ScrollBox data, which taints the trainer frame. Faded
  rows stay clickable.
- **The marker position is a best guess** (top-left corner of the recipe
  icon). The checkbox sits left of the Train button
  (`ClassTrainerTrainButton`). If that button isn't found, it falls back to
  the bottom right of the frame.
- **Rows are matched to recipes through the ScrollBox row data**
  (`skillIndex`, `index`, and so on). If a row's visible name does not match
  the recipe, it gets no marker. That way it fails safe and never shows a
  wrong result. `/tu dump` shows what each row resolved to.
- **Loading tooltips don't update by themselves.** If an item is still
  loading, the tooltip says so. Move the mouse off and back on.
- **Stat weights are rough.** They are a tie-breaker, not a sim.
  Enchants on your equipped gear are not counted.
- **Gear above your level is hidden,** even if you'll reach that level soon.
- **ForeverGear and GearSetImprover:** neither was installed in the client
  the probe ran on, so their APIs couldn't be checked. There is no
  integration. TrainerUpgrades only adds lines to the trainer tooltip, which
  is a spell tooltip, so it doesn't touch item tooltips those addons use.
- Only the default Blizzard trainer UI is supported.

## Development

```
addon/TrainerUpgrades.toc     TOC, copied into the build output
src/main.ts                   Events and slash commands
src/trainerUI.ts              Hooks, row markers, checkbox, tooltip hook
src/compare.ts                Upgrade decision and slot rules (cached)
src/items.ts                  Item data cache; handles late-loading items
src/usable.ts                 Level, proficiency, main-stat checks
src/scoring.ts                Swappable scoring methods
src/slots.ts                  Equip slot ids and placement rules
src/tooltip.ts                Tooltip text
src/db.ts, src/log.ts         Settings; debug log and safe() wrapper
types/wow-forever.d.ts        Hand-written WoW API types
test/                         Mock client + scenario tests
probe/TrainerUpgradesProbe/   Debug addon (plain Lua) that found the API
dist/TrainerUpgrades/         Build output. This folder is the addon.
```

```sh
npm run build       # TypeScript -> one Lua 5.1 file in dist/TrainerUpgrades
npm test            # build, then 60+ scenario checks in a mock client
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

To run the probe again: copy `probe/TrainerUpgradesProbe` into AddOns, open
a trainer, then `/tuprobe all` and `/tuprobe show` (Ctrl+A, Ctrl+C).
