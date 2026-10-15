# Trainer Compare

**Before you buy a recipe, see how its gear compares to what you wear.**

In WoW Forever, crafted gear can help at every stage of leveling. Every
trainer visit is a choice: which recipes make gear worth wearing? Trainer
Compare shows the item level and stat changes right in the trainer window.
You decide what each recipe is worth to you.

Hover a recipe that makes gear and hold **Shift**. See it next to what you
have on.

- **Side-by-side compare.** Like the game's item compare, now for trainer
  recipes. Your equipped item on one side, the recipe on the other.
- **Item level and stat changes at a glance.** *Item level 9 vs 2 (Main
  Hand)*, then each stat change with a green number for a gain and a red
  number for a loss.
- **Fade what's not for you.** One checkbox in the trainer's Settings menu
  fades gear you can't use yet, so the rest stands out.
- **No scores, no "upgrade" labels.** Just the numbers. You decide.

Nothing to install alongside it, and nothing to type. Made for **WoW
Forever**.

---

## How it works

**The compare.** Hover a recipe that makes gear, then hold **Shift**. If your
game is set to always compare items, it shows without Shift. Your equipped
item shows next to the recipe, marked **Currently Equipped**. It goes on the
left when there's room, and on the right when there isn't. If nothing is
equipped in that slot, there's nothing to compare against, so no compare
shows.

**The tooltip lines.** Under the recipe you'll see:

- the item's item level vs yours, with the slot (or *vs empty* if the slot
  is empty)
- *If you replace this item, the following stat changes will occur:*, then
  one stat per line, with a green number for a gain and a red number for a
  loss

**What it compares against.**

- Rings and trinkets: an empty slot if you have one, or else the one with
  the lower item level.
- One-hand weapons: your main hand. If you can dual wield, an empty hand if
  you have one, or else the hand with the lower item level.
- Main-hand weapons: your main hand.
- Off-hand weapons, shields and held items: your off hand.
- Two-handers: your main hand and off hand together.
- Anything else in your hands while you wield a two-hander: the two-hander.
- Shirts, tabards, bags, ammo and fishing poles aren't compared.

**Plan ahead.** Gear above your level, or for a weapon skill you haven't
learned, still gets the item level and stat lines, and the compare.

**Only show usable gear.** A checkbox in the trainer's **Settings** dropdown.
It's off until you tick it, and it's saved for your account. When it's on,
it fades:

- armor types you haven't learned to wear
- weapon types you haven't learned
- gear above your level, even by one level
- relics for another class
- gear with only stats your class doesn't use (like Spirit-only gear on a
  Paladin). This one is a judgment call: you might still want the item.

Faded rows stay in the list and you can still click them. Enchants and
other non-gear recipes are never faded. If your game client can't add to
the Settings dropdown, a small "Usable" checkbox shows next to the Train
button instead.

## Good to know

- Apart from the filter checkbox, the trainer window isn't changed. Recipe
  rows get no marks.
- Item data sometimes loads late. If a tooltip says *Loading item data...*,
  move the mouse off the recipe and back.
- The stat changes use each item's own stats. Enchants on your equipped
  gear may not be counted.
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
