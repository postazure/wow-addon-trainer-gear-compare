-- Fallback suite: a client with no Menu API, no native compare, no
-- GetTrainerServiceCost or GetCoinTextureString, and no Auctionator.
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
TrainerCompareUsableFilter.checked = false
TrainerCompareUsableFilter.scripts.OnClick(TrainerCompareUsableFilter)
flush()
check(TrainerCompareDB.onlyUsable == false and axe.button.alpha == 1, "checkbox turns it off; faded rows restored")

-- Compare filled in by us ---------------------------------------------------------
alwaysCompare = true
hover(1)
check(compareSlots() == "16", "shows the equipped main hand")
check(ShoppingTooltip1.CompareHeader.shown, "shows the Currently Equipped header")
check(ShoppingTooltip1.CompareHeader.Label.text == "Currently Equipped", "header has its text")
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

-- Prices without the client's helpers or Auctionator -------------------------
hover(1)
check(tooltipHas("Vendor price: 41c"), "vendor price in our own money format")
check(not tooltipHas("Cost to learn"), "no learn cost without GetTrainerServiceCost")
check(not tooltipHas("Auction house"), "no auction line without Auctionator")
hover(7)
check(tooltipHas("Vendor price: 1g 23s 45c"), "our money format: gold, silver, copper")
hover(12)
check(tooltipHas("Vendor price: 2c each"), "stackable items are priced each")
GameTooltip:Hide()

for _, l in ipairs(output) do
  check(not l:find("failed", 1, true), "no hidden failure: " .. l)
end

-- No metadata API: the version shows as "?" instead of failing.
C_AddOns.GetAddOnMetadata = nil
output = {}
fire("ADDON_LOADED", "TrainerCompare")
check(output[1] ~= nil and output[1]:find("loaded v?", 1, true) ~= nil, "unknown version shows as v?")

report("fallback")
