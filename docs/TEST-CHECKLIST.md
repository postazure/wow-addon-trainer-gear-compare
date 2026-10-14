# In-game test checklist

Run these with only Trainer Compare enabled first. Then run them again with
your usual addons. Turn debug on for the first run, so silent failures show
up in chat: `/run TrainerCompareDB.debug = true`. Turn it off with
`/run TrainerCompareDB.debug = false`. Either takes effect at once and is saved.

Before you start, note your class, level, and what's in your main hand, off
hand, wrists, waist and both ring slots.

## 1. Load

- [ ] No Lua error on login or `/reload`.
- [ ] With debug on, `/reload` prints `loaded v<version>` with the right
      version. Debug stays on after the reload.

## 2. Hooks

Open a trainer that teaches gear (Blacksmithing, Leatherworking, Tailoring).

- [ ] With debug on, chat shows `hooks: ...`. Most entries say `yes`.
- [ ] With debug on, chat shows no `row data has no index` and no
      `... but service is ...; skipped` lines.

If either shows up, send a screenshot of chat. Those lines name the row
data keys, which is what I need to fix it.

## 3. Rows

- [ ] Recipe rows look like Blizzard's: no icons or marks added.

## 4. Scrolling and categories

With "Only show usable gear" on:

- [ ] Scroll the list. The right rows stay faded, and fading doesn't smear
      onto other rows.
- [ ] Collapse and expand a category, if the UI has them. Category rows
      are never faded.
- [ ] Change Blizzard's filter dropdown (available / unavailable). Fading
      updates and matches.

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
- [ ] Hover an enchant or a non-gear recipe. No Trainer Compare lines.
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
- [ ] With debug on, chat says `compare: native, left`. If it says
      `manual`, the native compare didn't start; tell me.

## 6. Filter

- [ ] Open the trainer's **Settings** dropdown. At the bottom: an
      **"Only show usable gear"** checkbox. No header or divider.
- [ ] There's no separate checkbox in the trainer window.
- [ ] Ticking it fades gear you can't use (wrong armor, unlearned weapon,
      level too high). Gear you can use stays bright.
- [ ] Enchants and other non-gear recipes are never faded.
- [ ] The setting is kept after `/reload`.
- [ ] Faded rows can still be selected, and you can still train them.

## 7. Late data

- [ ] Clear the cache (delete `<WoW Forever>/_<flavor>_/Cache`), log in,
      and open a trainer straight away. Tooltips may say "Loading item
      data..." for a moment, then fill in. With the filter on, no row is
      ever faded by mistake while loading.

## 8. Gear changes

- [ ] With the trainer open, swap your main hand weapon. Weapon tooltips
      now compare against the new one.
- [ ] Equip a two-hander. One-hand weapons and off hands now compare
      against it.

## 9. Other addons and taint

- [ ] With ForeverGear / GearSetImprover Forever enabled, their item
      tooltips still look right (bags, character sheet).
- [ ] The trainer tooltip shows their lines (if any) and ours, without
      duplicates or errors.
- [ ] Train a recipe with Trainer Compare on. No "action blocked" or
      "interface action failed" messages.
- [ ] Debug off: no Trainer Compare messages at all during normal use.
