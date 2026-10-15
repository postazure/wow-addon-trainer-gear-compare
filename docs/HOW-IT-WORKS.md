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
3. **What does it replace?** The equip slot picks the equipped item(s) the
   compare shows (when Blizzard's compare doesn't start by itself):
   - Rings and trinkets: the one with the lower item level. The compare
     tooltips show both.
   - One-hand weapon: main hand. If you can dual wield, the hand with the
     lower item level.
   - Two-hander: your main hand and off hand together.
   - Anything while you wield a two-hander: the two-hander.
   - Shirts, tabards, bags, ammo and fishing poles: not compared.

## Tooltips

Hovering a recipe that makes an item:

1. GameTooltip switches from Blizzard's recipe (spell) tooltip to the item
   itself (`SetHyperlink`). It's now a normal item tooltip, so Blizzard's
   compare, its sell price, and other addons' item lines (Auctionator,
   Disenchantry) show the way they do on any item.
2. Our **recipe box** (a tooltip of our own) shows Blizzard's normal recipe
   tooltip (`SetTrainerService`). Our only additions are reagent cost and
   profit.
3. Left to right: recipe list, recipe box, a gold arrow, item, equipped.
   The arrow (Blizzard's own `ChatFrameExpandArrow` art) sits in a small
   gap and points from the recipe to what it makes. Their tops line up; the compare's "Equipped" header sits above it. Nothing covers the
   recipe list. Only when the screen has no room on the right does the
   compare go left of the recipe box.

Recipes with no item (enchants and so on) keep Blizzard's tooltip as it is.
If the client can't make the box, the item sits right of the row and our
lines go under it.

## Reagent cost and profit

Only with Auctionator, and only for recipes that make an item.

- **Reagents**: what one craft's reagents cost, and how many items it makes
  if more than one. The recipe's spell id comes from
  `C_TooltipInfo.GetTrainerService`, and its reagents from
  `C_TradeSkillUI.GetRecipeSchematic` (required slots only). Each reagent is
  priced like Auctionator's own crafting info: the merchant price if
  Auctionator has seen it at a merchant, else the auction price. If a
  reagent has no price, it says so in gray and there is no profit line.
- **Profit**: auction price x number made x 0.95 (the 5% auction house
  cut), minus the reagent cost. Green with a plus, or red with a minus.
  Gray "no auction price for the item yet" when Auctionator hasn't seen it.
  Never for items that bind on pickup.

Money shows with coin icons: the client's own formatter if it has one
(`GetCoinTextureString`, `C_CurrencyInfo.GetCoinTextureString` or
`GetMoneyString`), else the icons drawn by Trainer Compare. In game, the
first one was missing.

Profit doesn't count the auction deposit or the cost to learn. There's no
cost to learn line (the trainer window shows it), and no auction or vendor
price line (the item tooltip shows those).

Why no Disenchantry data in the recipe box: its data is private to the
addon (no public API). Its own lines show on the item tooltip.

None of this is confirmed in game yet. `SetHyperlink` on GameTooltip at the
trainer, `GetCoinTextureString`, `GetRecipeSchematic`,
`TooltipComparisonManager.AnchorShoppingTooltips` and the Auctionator calls
come from retail docs and Auctionator's source. Whether
`GetRecipeSchematic` works for recipes you haven't learned is the big
unknown. All are feature-checked, and every call runs inside `safe()`
(Auctionator's API raises errors on bad input).

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
- **The compare may be started by hand.** With the item in GameTooltip,
  Blizzard's compare may start by itself; then Trainer Compare only moves
  it right of the item (also each time Blizzard places it again). If it
  doesn't start, Trainer Compare feeds the item to
  `TooltipComparisonManager` itself. If that doesn't show anything, it
  fills `ShoppingTooltip1/2` with your equipped items and shows their
  header, with the text "Equipped" when Blizzard left it empty. With debug
  on, chat says which one ran (`compare: native, right` and so on).
- **No compare when the slot is empty.** There's nothing to show.
- **Loading lines don't update by themselves.** If an item is still
  loading, the tooltip says so. Move the mouse off and back on.
- **Gear above your level counts as not usable,** even if you'll reach that
  level soon.
- **ForeverGear and GearSetImprover:** neither was installed in the client
  the probe ran on, so their APIs couldn't be checked. There is no
  integration. Trainer Compare only uses the compare tooltips while a
  recipe is hovered, and never hides a compare it didn't show.
- Only the default Blizzard trainer UI is supported.
