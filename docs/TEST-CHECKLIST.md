# In-game test checklist

Run these with only TrainerUpgrades enabled first. Then run them again with
your usual addons. Turn on `/tu debug` for the first run, so silent failures
show up in chat.

Before you start, note your class, level, and what's in your main hand, off
hand, wrists, waist and both ring slots.

## 1. Load

- [ ] No Lua error on login or `/reload`.
- [ ] `/tu` prints the version and the command list.
- [ ] `/tu debug` prints "debug on". `/reload` keeps it on.

## 2. Hooks

Open a trainer that teaches gear (Blacksmithing, Leatherworking, Tailoring).

- [ ] With debug on, chat shows `hooks: ...`. Most entries say `yes`.
- [ ] `/tu dump` lists each visible row as `-> [n] <name>: <verdict>`.
      The names match what the window shows.
- [ ] No row says `no index` unless it is a category row.

If rows say `no index`, paste the `/tu dump` output back. It shows the row
data keys, which is what I need to fix it.

## 3. Markers

- [ ] A weapon type you haven't learned shows a **red X** on its icon.
- [ ] Armor you can't wear (for example plate before you learn it) shows a
      red X.
- [ ] Gear above your level shows a red X.
- [ ] Gear you can use shows **no marker**, whether it's better or worse.
- [ ] Enchants and other non-gear recipes show no marker.
- [ ] The X is easy to see and doesn't cover anything important.
      (Position is a guess. Tell me if it's off.)

## 4. Scrolling and categories

- [ ] Scroll the list. Markers stay on the right rows and don't smear onto
      other rows.
- [ ] Collapse and expand a category, if the UI has them. Category rows
      never get a marker.
- [ ] Change Blizzard's filter dropdown (available / unavailable). Markers
      update and match.

## 5. Compare and tooltips

- [ ] Hover a gear recipe. The tooltip ends with "Item level X vs Y (slot)",
      then the heading
      "If you replace this item, the following stat changes will occur:"
      with **one stat per line**. The number is green (gain) or red
      (loss); the stat name is white.
- [ ] Stats are in item tooltip order: DPS, Armor, Strength, Agility,
      Stamina, Intellect, Spirit.
- [ ] Hover gear you can't use. No extra "can't use" line (the item's own
      red text shows it). The item level and stat changes still show.
- [ ] No line anywhere says "upgrade".
- [ ] Hover an enchant or a non-gear recipe. No TrainerUpgrades lines.
- [ ] Without "Always compare items", the compare shows only while you hold
      Shift.
- [ ] The compare shows **"Currently Equipped"** and Blizzard's own stat
      summary, like a normal item compare.
- [ ] Your equipped item is on the **left**. The recipe tooltip is on the
      right.
- [ ] Gear you can't use (wrong weapon, too high level) still shows the
      compare.
- [ ] Rings and trinkets show both of yours. A two-hander shows both hands.
- [ ] Nothing equipped in that slot: no compare.
- [ ] Move from a recipe to a bag item: the normal Blizzard compare still
      works and nothing is left over from the recipe.
- [ ] With `/tu debug` on, chat says `compare: native, left`. If it says
      `manual`, the native compare didn't start; tell me.

## 6. Filter

- [ ] Open the trainer's **Settings** dropdown. At the bottom: a divider
      and an **"Only show usable gear"** checkbox. No header.
- [ ] There's no separate checkbox in the trainer window.
- [ ] Ticking it fades gear you can't use (wrong armor, unlearned weapon,
      level too high). Gear you can use stays bright.
- [ ] Enchants and other non-gear recipes are never faded.
- [ ] `/tu filter` toggles it, and the dropdown shows the new state.
- [ ] The setting is kept after `/reload`.
- [ ] Faded rows can still be selected, and you can still train them.

## 7. Late data

- [ ] Clear the cache (delete `<WoW Forever>/_<flavor>_/Cache`), log in,
      and open a trainer straight away. Rows may show no marker for a
      moment, then fill in. No row ever shows a wrong marker first.

## 8. Gear changes

- [ ] With the trainer open, swap your main hand weapon. Weapon markers
      update.
- [ ] Equip a two-hander. One-hand weapons and off hands now compare
      against it.

## 9. Scoring

- [ ] `/tu scoring` shows `itemLevel` and lists the options.
- [ ] `/tu scoring statWeights`: markers update, and tooltips add a
      "Score X vs Y (stat weights)" line.
- [ ] `/tu scoring itemLevel` switches back.

## 10. Other addons and taint

- [ ] With ForeverGear / GearSetImprover Forever enabled, their item
      tooltips still look right (bags, character sheet).
- [ ] The trainer tooltip shows their lines (if any) and ours, without
      duplicates or errors.
- [ ] Train a recipe with TrainerUpgrades on. No "action blocked" or
      "interface action failed" messages.
- [ ] `/tu debug` off: no TrainerUpgrades messages at all during normal use.
