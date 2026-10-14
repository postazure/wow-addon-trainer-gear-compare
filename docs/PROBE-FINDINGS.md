# Probe findings

What the WoW Forever client actually returns. WoW Forever is Classic data
on a modern, retail-style engine, so Classic and retail docs are both wrong
in places. Build from what's here, and extend the probe
(`probe/TrainerCompareProbe`) before using anything new.

From WoW Forever 1.60.1 (70374), interface 16001, `WOW_PROJECT_ID` 18.
Classic data on a modern engine:

- `GetTrainerServiceItemLink` returns the crafted item's link.
- `GetTrainerServiceInfo` order: name, **type**, icon, ?, "", category.
  Classic puts the type 3rd.
- Only `C_Item.*` item functions exist. `GetItemInfo` and the other old
  globals are gone.
- No `GetSkillLineInfo` / `GetNumSkillLines`. `IsPlayerSpell` exists.
- The trainer list is a ScrollBox. Hookable: `ClassTrainerFrame_InitServiceButton`,
  `ClassTrainerFrame_InitCategoryButton`, `ClassTrainerFrame_Update`.
- The trainer tooltip is a spell tooltip with the item embedded.
  `C_TooltipInfo.GetTrainerService` reports type Spell.

From a menu diagnostic on the same client (since removed; the probe is
the place for new ones):

- Modern `Menu` API is present. The trainer's Settings dropdown is
  `ClassTrainerFrame.FilterDropdown`, tag `MENU_TRAINER_FILTER`.
- Native compare is present: `TooltipComparisonManager.CompareItem`,
  `C_TooltipComparison.GetItemComparisonInfo`. `ShoppingTooltip1` has a
  `CompareHeader`. `ShoppingTooltip1:SetCompareItem` (Classic) is gone.

To run the probe again: copy `probe/TrainerCompareProbe` into AddOns, open
a trainer, then `/tcprobe all` and `/tcprobe show` (Ctrl+A, Ctrl+C).
