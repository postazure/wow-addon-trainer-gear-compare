# Trainer Compare

**Before you buy a recipe, see how its gear compares to what you wear.**

In WoW Forever, your professions level with you. Every trainer visit is a
choice: which recipes make gear you'll actually wear? Trainer Compare shows
you right in the trainer window, so you can spot the recipes that improve
your gear and skip the ones that don't.

Hover a recipe. See the item next to what you have on. That's it.

- **Side-by-side compare.** The game's own compare tooltip, now for trainer
  recipes. Your equipped item on the left, the recipe on the right.
- **Item level and stat changes at a glance.** *Item level 9 vs 2 (Main
  Hand)*, then each stat you gain in green and each stat you lose in red.
- **Fade what you can't use.** One checkbox in the trainer's Settings menu
  fades gear you can't wear or wield, so the useful recipes stand out.
- **Facts, not guesses.** No scores and no "upgrade" labels. You see the
  numbers and you decide.

No setup. No slash commands. No other addons needed. Made for **WoW Forever**.

---

## How it works

**The compare.** Hover a recipe that makes gear, then hold **Shift** (or turn
on *Always compare items* in the game's options). You get the same compare
you see on any item, with your gear marked **Currently Equipped**.

**The tooltip lines.** Under the recipe you'll see:

- the item's item level vs yours, with the slot
- *If you replace this item, the following stat changes will occur:*, then
  one stat per line, green for a gain and red for a loss

**Slots are handled for you.**

- Rings and trinkets: compared against the one with the lower item level.
  The compare shows both.
- Two-handers: compared against your main hand and off hand together.
- One-handers: compared against your main hand, or the hand with the lower
  item level if you can dual wield.

**Plan ahead.** Gear above your level, or for a weapon skill you haven't
learned, still gets the full compare. The item's own red text tells you why
you can't use it yet.

**Only show usable gear.** Find it at the bottom of the trainer's
**Settings** dropdown. It fades gear with:

- the wrong armor type
- a weapon skill you don't have
- a level above yours
- another class's relic
- only stats your class doesn't use (like Spirit-only gear on a Paladin)

Faded rows stay in the list and stay clickable. Enchants and other non-gear
recipes are never faded.

## Good to know

- The trainer window isn't changed otherwise. No marks on recipe rows.
- Item data sometimes loads late. If a tooltip says *Loading item data...*,
  move the mouse off the recipe and back.
- Enchants on your equipped gear aren't counted in the stat changes.
- Only the default Blizzard trainer window is supported.

## Feedback and source

Trainer Compare is open source under the MIT license. It's written in
TypeScript and compiled to plain, readable Lua.

- Source, issues and bug reports:
  https://github.com/postazure/wow-addon-trainer-gear-compare
- For a bug report, turn on debug messages with
  `/run TrainerCompareDB.debug = true`, reproduce the problem, and include a
  screenshot of what it prints. `/run TrainerCompareDB.debug = false` turns
  them off.
