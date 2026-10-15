# Changelog

## Unreleased

- A gold arrow points from the recipe tooltip to the item it makes.
- The compare header now says "Equipped". "Currently Equipped" didn't fit.
- Hovering a recipe now shows the normal recipe tooltip and, beside it,
  the real item it makes, like any item tooltip.
- The compare now shows right of the item, lined up with it, so it no
  longer covers the recipe list.
- The compare is always on at the trainer. No need to hold Shift.
- Trainer Compare's own item level and stat lines are gone. Blizzard's
  compare shows the same facts.

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
