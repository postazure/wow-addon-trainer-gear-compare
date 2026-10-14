# Trainer Compare

**See how the gear a profession trainer teaches compares to what you wear, right in the trainer window.**

Made for **WoW Forever**.

## What it does

**Blizzard's normal item compare, for trainer recipes.** Hover a recipe that makes gear and you get the same compare tooltip you see on any item: your equipped item on the left, marked **Currently Equipped**. Hold **Shift**, or turn on *Always compare items* in the game's options.

**Item level and stat changes on the recipe tooltip.** Under the recipe you'll see:

- the new item's item level vs yours, with the slot (for example *Item level 9 vs 2 (Main Hand)*)
- *If you replace this item, the following stat changes will occur:*, then one stat per line, with the number in green (gain) or red (loss)

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

## Commands

| Command | What it does |
| --- | --- |
| `/tc` | Help and version |
| `/tc filter` | Turn *Only show usable gear* on or off |
| `/tc scoring statWeights` | Also show a rough per-class stat score (off by default; `/tc scoring itemLevel` turns it off) |
| `/tc debug` | Show what failed, if something looks wrong |
| `/tc dump` | Details for bug reports |

## Good to know

- Item data sometimes loads late. If a tooltip says *Loading item data...*, move the mouse off the recipe and back.
- Only the default Blizzard trainer window is supported.

## Feedback and source

Trainer Compare is open source under the MIT license. It's written in TypeScript and compiled to plain, readable Lua.

- Source, issues and bug reports: https://github.com/postazure/wow-addon-trainer-gear-compare
- For a bug report, run `/tc debug`, reproduce the problem, then `/tc dump`, and include what it prints.
