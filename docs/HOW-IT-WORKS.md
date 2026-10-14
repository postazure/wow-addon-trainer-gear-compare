# How Trainer Compare works

What it checks, what it compares against, and what it can't do. For the
client API it's built on, see [PROBE-FINDINGS.md](PROBE-FINDINGS.md).

## What it does

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
