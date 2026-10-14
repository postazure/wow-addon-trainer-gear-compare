-- Fallback suite: a client with no Menu API and no native compare.
-- run.mjs removes Menu and TooltipComparisonManager before fixtures.lua loads.

-- Checkbox instead of the Settings dropdown ----------------------------------
check(TrainerCompareUsableFilter ~= nil, "checkbox created when the menu API is missing")
local cbPoint = TrainerCompareUsableFilter.point
check(cbPoint[1] == "RIGHT" and cbPoint[2] == ClassTrainerTrainButton and cbPoint[3] == "LEFT",
  "checkbox sits left of the Train button")

TrainerCompareUsableFilter.checked = true
TrainerCompareUsableFilter.scripts.OnClick(TrainerCompareUsableFilter)
flush()
check(TrainerCompareDB.onlyUsable == true and axe.button.alpha < 1, "checkbox turns the usable filter on")
SlashCmdList.TRAINERCOMPARE("filter")
flush()
check(TrainerCompareUsableFilter.checked == false, "checkbox follows /tc filter")
check(axe.button.alpha == 1, "faded rows restored")

-- Compare filled in by us ---------------------------------------------------------
alwaysCompare = true
hover(1)
check(compareSlots() == "16", "shows the equipped main hand")
check(ShoppingTooltip1.CompareHeader.shown, "shows the Currently Equipped header")
local p = ShoppingTooltip1.point
check(p[1] == "TOPRIGHT" and p[2] == GameTooltip and p[3] == "TOPLEFT", "equipped item on the left")

hover(10)
check(compareSlots() == "11,12", "rings: both equipped rings")
local p2 = ShoppingTooltip2.point
check(p2[1] == "TOPRIGHT" and p2[2] == ShoppingTooltip1 and p2[3] == "TOPLEFT", "second one further left")

hover(7)
check(compareSlots() == "16", "two-hander: main hand (off hand empty)")
hover(2)
check(compareSlots() == "16", "gear you can't use still shows what it would replace")
hover(6)
check(compareSlots() == "", "no compare for a recipe with no item")

GameTooltip:Hide()
check(compareSlots() == "" and not ShoppingTooltip1.CompareHeader.shown, "hidden with the tooltip")
alwaysCompare = false

for _, l in ipairs(output) do
  check(not l:find("failed", 1, true), "no hidden failure: " .. l)
end

report("fallback")
