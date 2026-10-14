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

- [ ] An item clearly better than what you wear shows a **green arrow** on
      its icon.
- [ ] An item worse than what you wear shows a **gray dash**.
- [ ] A weapon type you haven't learned shows **no marker**.
- [ ] Gear above your level shows **no marker**.
- [ ] An item for an empty slot shows a green arrow.
- [ ] The arrow and dash are easy to see and don't cover anything
      important. (Positions are a guess. Tell me if they're off.)

## 4. Scrolling and categories

- [ ] Scroll the list. Markers stay on the right rows and don't smear onto
      other rows.
- [ ] Collapse and expand a category, if the UI has them. Category rows
      never get a marker.
- [ ] Change Blizzard's filter dropdown (available / unavailable). Markers
      update and match.

## 5. Tooltips

- [ ] Hover an upgrade. The tooltip ends with "TrainerUpgrades: upgrade",
      "Item level X vs Y (slot)", and a line of stat changes.
- [ ] Hover a weapon you can't use. It says "can't use (...)" with the reason.
- [ ] Hover an enchant or a non-gear recipe. No TrainerUpgrades lines.
- [ ] Ring or trinket: it compares against your **weaker** one.
- [ ] Two-hander while you hold a one-hander and an off hand: it says
      "vs Main Hand + Off Hand".

## 6. Filter

- [ ] The "Only show upgrades" checkbox is visible and doesn't overlap
      anything. (Position is a guess.)
- [ ] Hovering it shows an explanation.
- [ ] Ticking it fades every non-upgrade row. Upgrades stay bright.
- [ ] `/tu filter` toggles it, and the checkbox follows.
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
