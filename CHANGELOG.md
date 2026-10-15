# Changelog

## Unreleased

- Recipe tooltips show prices for any crafted item, not just gear: the
  cost to learn and the vendor price, each item for stackable items.

## 0.6.0

First public release, for WoW Forever 1.60.1.

- Hover a recipe at any profession trainer to see Blizzard's normal item
  compare: your equipped item(s) on the left, with "Currently Equipped".
  Hold Shift, or turn on "Always compare items".
- The recipe tooltip adds item level vs what you wear, then the stat
  changes, one per line: green or red numbers, white stat names.
- Works for gear you can't use, too.
- "Only show usable gear" in the trainer's Settings dropdown fades gear you
  can't use (armor type, weapon skill, level, class). Recipe rows are never
  changed otherwise.
- Nothing to set up: no slash commands, and no other addons needed.
- Icon in the addon list.
- The shipped Lua starts with a header explaining how it's generated and
  where the TypeScript source lives, and keeps the source's doc comments.
