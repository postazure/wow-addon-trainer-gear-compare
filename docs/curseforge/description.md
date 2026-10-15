# Trainer Compare

**See how the gear a profession trainer teaches compares to what you wear, right in the trainer window.**

Made for **WoW Forever**.

## What it does

**The real item, for trainer recipes.** Hover a recipe and you see the normal recipe tooltip, then the item it makes, like any item tooltip. Blizzard's normal compare shows next to it, no Shift needed, marked **Equipped**, with the item level and stat changes. Nothing covers the recipe list.

**It knows how slots work.**

- Rings and trinkets: compared against the weaker of your two, and the compare shows both.
- Two-handers: compared against your main hand and off hand together.
- One-handers: compared against your main hand, or the weaker hand if you can dual wield.

**Works for gear you can't use yet, too.** Plan ahead for gear above your level or a weapon skill you haven't learned. The item's own red text tells you why you can't use it.

**Only show usable gear.** A new option at the bottom of the trainer's **Settings** dropdown. Turn it on to fade gear you can't use: the wrong armor type, a weapon skill you don't have, too high a level, another class's relic, or only stats your class doesn't use (like Spirit-only gear on a Paladin). Enchants and other recipes are never faded.

## What it doesn't do

- It doesn't tell you what's an "upgrade". It shows the facts and lets you decide.
- It doesn't change the trainer window. No marks are drawn on recipe rows, and the filter only fades rows; it never hides or removes them.
- It doesn't need any other addon.

## Good to know

- Item data sometimes loads late. If a tooltip says *Loading item data...*, move the mouse off the recipe and back.
- Only the default Blizzard trainer window is supported.

## Feedback and source

Trainer Compare is open source under the MIT license. It's written in TypeScript and compiled to plain, readable Lua.

- Source, issues and bug reports: https://github.com/postazure/wow-addon-trainer-gear-compare
- For a bug report, turn on debug messages with `/run TrainerCompareDB.debug = true`, reproduce the problem, and include a screenshot of what it prints. `/run TrainerCompareDB.debug = false` turns them off.
