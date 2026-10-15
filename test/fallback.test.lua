-- Fallback suite: a client with no Menu API, no native compare, no
-- GetCoinTextureString, and no GameTooltipTemplate (so no recipe box).
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
hover(1)
check(compareSlots() == "16", "shows the equipped main hand")
check(ShoppingTooltip1.CompareHeader.shown, "shows the Equipped header")
check(ShoppingTooltip1.CompareHeader.Label.text == "Equipped", "header has its text")
local p = ShoppingTooltip1.point
check(p[1] == "TOPLEFT" and p[2] == GameTooltip and p[3] == "TOPRIGHT", "equipped right of the item, clear of the recipe list")
local gp = GameTooltip.point
check(GameTooltip.anchor == "ANCHOR_NONE" and gp[1] == "TOPLEFT" and gp[2] == UIParent and gp[3] == "TOPRIGHT",
  "no recipe box: the item sits right of the hovered row")

hover(10)
check(compareSlots() == "11,12", "rings: both equipped rings")
local p2 = ShoppingTooltip2.point
check(p2[1] == "TOPLEFT" and p2[2] == ShoppingTooltip1 and p2[3] == "TOPRIGHT", "second one further right")

hover(7)
check(compareSlots() == "16", "two-hander: main hand (off hand empty)")
hover(2)
check(compareSlots() == "16", "gear you can't use still shows what it would replace")
hover(6)
check(compareSlots() == "", "no compare for a recipe with no item")

GameTooltip:Hide()
check(compareSlots() == "" and not ShoppingTooltip1.CompareHeader.shown, "hidden with the tooltip")

-- No recipe box: our lines go under the item --------------------------------
hover(1)
check(recipeBox() == nil and GameTooltip.link == items[2844].link, "the item still shows without a recipe box")
check(GameTooltip.lines[1] == "item 2844" and #GameTooltip.lines == 1, "without Auctionator, nothing is added")
-- Minimal Auctionator, for our own money format. 20 bars at 617 = 12340.
-- Profit: floor(20000 * 0.95 - 12340) = 6660.
Auctionator = { API = { v1 = {
  GetAuctionPriceByItemLink = function(_, link) return ({ [2900] = 20000 })[tonumber(link:match("item:(%d+)"))] end,
  GetAuctionPriceByItemID = function(_, id) return ({ [COPPER_BAR] = 617 })[id] end,
} } }
hover(7)
check(GameTooltip.lines[1] == "item 2900" and tooltipHas("Reagents: 1g 23s 40c"),
  "our lines go under the item; our money format: gold, silver, copper")
check(tooltipHas("Profit: +66s 60c after the 5% auction house cut"), "profit in our money format")
Auctionator = nil
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
