-- Main suite: the client as the probe found it (Menu API and native compare present).
-- Setup is in fixtures.lua.

-- Settings ------------------------------------------------------------------
check(TrainerCompareDB.onlyUsable == false, "filter defaults off")
check(TrainerCompareDB.tooltipLines == nil and TrainerCompareDB.scoring == nil, "removed settings drop out of the saved file")

-- Name ----------------------------------------------------------------------
check(next(SlashCmdList) == nil and SLASH_TRAINERCOMPARE1 == nil, "no slash commands")
local first = output[1] or ""
check(first:find("|cff33ff99Trainer Compare|r", 1, true) == 1, "chat prefix reads Trainer Compare")
check(first:find("loaded v0.6.0", 1, true) ~= nil, "debug load line shows the version from the TOC")

-- Settings dropdown -----------------------------------------------------------
check(menuCallbacks["MENU_TRAINER_FILTER"] ~= nil, "added to the trainer's Settings dropdown")
check(TrainerCompareUsableFilter == nil, "no separate checkbox when the menu works")
local entry
local menuItems = openMenu("MENU_TRAINER_FILTER")
for _, item in ipairs(menuItems) do
  if item.kind == "checkbox" then entry = item end
end
check(#menuItems == 1 and menuItems[1].kind == "checkbox", "just the toggle: no header, no divider")
check(entry ~= nil and entry.text == "Only show usable gear", "menu has the usable-gear toggle")
check(entry.isSelected() == false, "menu toggle starts off")
entry.setSelected()
flush()
check(TrainerCompareDB.onlyUsable == true, "menu toggle turns the filter on")
check(entry.isSelected() == true, "menu toggle shows on")
check(axe.button.alpha < 1, "gear you can't use is faded")
check(highHelm.button.alpha < 1, "gear above your level is faded")
check(mace.button.alpha == 1, "usable gear stays visible")
check(bracers.button.alpha == 1, "usable gear stays visible even if not better")
check(enchant.button.alpha == 1, "non-gear recipes stay visible")
check(shirt.button.alpha == 1, "shirts stay visible")
check(category.button.alpha == 1, "category rows stay visible")
entry.setSelected()
flush()
check(TrainerCompareDB.onlyUsable == false, "menu toggle turns the filter off")
check(axe.button.alpha == 1, "faded rows restored")

local function toggleFilter()
  entry.setSelected()
  flush()
end

-- Rows: no marks of any kind. With the filter on, only gear you can't use fades.
local anyTexture = false
for _, r in ipairs(rows) do if #r.button.textures > 0 then anyTexture = true end end
check(not anyTexture, "nothing is drawn on recipe rows")

toggleFilter() -- on
check(rowState(mace) == "shown", "usable gear shown")
check(rowState(bracers) == "shown", "usable gear with a lower item level shown")
check(rowState(maul) == "shown", "usable two-hander shown")
check(rowState(ring) == "shown", "usable ring shown")
check(rowState(axe) == "faded", "faded: Paladin can't use axes")
check(rowState(sword) == "faded", "faded: Paladin has not learned swords")
check(rowState(spiritGloves) == "faded", "faded: spirit-only gloves on a Paladin")
check(rowState(highHelm) == "faded", "faded: level 20 helm at level 17")
check(rowState(belt) == "shown", "not faded while belt data loads")
check(requested[2851], "belt data requested")
check(rowState(enchant) == "shown", "enchant shown")
check(rowState(shirt) == "shown", "shirt shown")
check(rowState(category) == "shown", "category row shown")
check(rowState(mismatch) == "shown", "row with a mismatched label is never faded")
toggleFilter() -- off

-- Layout: [recipe list] [recipe box] [item] [equipped] ----------------------------
hover(1)
local box = recipeBox()
check(GameTooltip.link == items[2844].link and GameTooltip.lines[1] == "item 2844",
  "GameTooltip shows the crafted item, so Blizzard and other addons treat it as an item")
check(box.shown and box.lines[1] == "service 1" and #box.lines == 1,
  "the recipe box is Blizzard's own recipe tooltip, with nothing added (no Auctionator)")
check(box.anchor == "ANCHOR_NONE" and box.point[1] == "TOPLEFT" and box.point[2] == UIParent
  and box.point[3] == "TOPRIGHT", "recipe box right of the hovered row")
check(GameTooltip.anchor == "ANCHOR_NONE", "GameTooltip re-owned with ANCHOR_NONE so it can be placed")
local gp = GameTooltip.point
check(gp[1] == "TOPLEFT" and gp[2] == box and gp[3] == "TOPRIGHT" and gp[5] == 0, "item right of the recipe box, tops aligned")
check(not tooltipHas("Item level") and not tooltipHas("upgrade"), "no lines of ours besides reagents and profit")
hover(4)
check(GameTooltip.link == items[2851].link and box.shown, "an item still loading shows too")
hover(12)
check(GameTooltip.link == items[2862].link and box.shown and box.lines[1] == "service 12", "non-gear: recipe box and item")
hover(6)
check(GameTooltip.link == nil and GameTooltip.lines[1] == "service 6" and not box.shown,
  "recipe with no item: Blizzard's tooltip as it is")
hover(1)
GameTooltip:Hide()
check(not box.shown, "the recipe box hides with the tooltip")

-- Prices --------------------------------------------------------------------------
-- Auctionator, shaped like its source (not probed). Bad input raises, like the
-- real one; that would show up as a hidden "failed" line at the end.
local ahPrices = { [2844] = 1234, [2862] = 30, [2902] = 5000, [2903] = 777, [2900] = 100,
  [COPPER_BAR] = 10, [WEAK_FLUX] = 50, [ROUGH_STONE] = 3 }
local ahAges = { [2844] = 2, [2862] = 0 }
local vendorPrices = { [WEAK_FLUX] = 1 }
local function ahItem(caller, link)
  if type(caller) ~= "string" or caller == "" then error("Invalid callerID. Use the name of your add-on.") end
  if type(link) ~= "string" then error("Usage Auctionator.API.v1.GetAuctionPriceByItemLink(string, string)") end
  return tonumber(link:match("item:(%d+)"))
end
local function ahID(caller, id)
  if type(caller) ~= "string" or caller == "" then error("Invalid callerID. Use the name of your add-on.") end
  if type(id) ~= "number" then error("Usage Auctionator.API.v1.GetAuctionPriceByItemID(string, number)") end
  return id
end
Auctionator = { API = { v1 = {
  GetAuctionPriceByItemLink = function(caller, link) return ahPrices[ahItem(caller, link)] end,
  GetAuctionAgeByItemLink = function(caller, link) return ahAges[ahItem(caller, link)] end,
  GetAuctionPriceByItemID = function(caller, id) return ahPrices[ahID(caller, id)] end,
  GetVendorPriceByItemID = function(caller, id) return vendorPrices[ahID(caller, id)] end,
} } }

hover(1)
-- Reagents: 6 bars at 10 (auction) + 2 flux at 1 (merchant beats auction's 50) = 62.
-- The optional slot isn't counted. Profit: floor(1234 * 0.95 - 62) = 1110.
local reagentLine = lineIndex("Reagents: native:62")
check(reagentLine == 3 and rawLine(1) == "service 1" and rawLine(2) == " ",
  "reagent cost under the recipe tooltip, after a blank line; merchant price first, optional slots skipped")
check(lineIndex("Profit: +native:1110 after AH cut (5%)") == reagentLine + 1, "profit after the 5% cut")
check(rawLine(reagentLine + 1):find("|cff20ff20+|r", 1, true) ~= nil, "profit sign is green")
check(not tooltipHas("Auction house") and not tooltipHas("Vendor price"), "the item's own prices are left to the item tooltip")
hover(12)
check(recipeBox().shown and rawLine(3) == "Reagents: native:3 (makes 2)", "non-gear gets reagents too")
-- Makes 2 at 30: floor(60 * 0.95 - 3) = 54.
check(tooltipHas("Profit: +native:54 after"), "profit counts every item made")
hover(10)
check(tooltipHas("Reagents: no price for 1 of 2"), "says when a reagent has no price")
check(not tooltipHas("Profit"), "no profit when a reagent has no price")
hover(5)
local noSale = lineIndex("Profit: no auction price for the item yet")
check(tooltipHas("Reagents: native:20") and noSale ~= nil, "reagents shown; profit waits for a sale price")
check(lineColor(noSale)[1] == 0.6, "no sale price yet is gray")
hover(9)
check(tooltipHas("Reagents: native:10") and not tooltipHas("Profit"), "bind on pickup: reagent cost, no profit")
hover(7)
-- 20 bars = 200 against floor(100 * 0.95) = 95.
local lossLine = lineIndex("Profit: -native:105 after AH cut (5%)")
check(lossLine ~= nil, "a loss shows as a negative profit")
check(rawLine(lossLine):find("|cffff4040-|r", 1, true) ~= nil, "loss sign is red")
GameTooltip:Hide()

-- Native compare ------------------------------------------------------------------
-- Always on: no Shift, no "always compare items".
hover(1)
check(ShoppingTooltip1.native == "Item-2844", "Blizzard's compare for the crafted item shows without Shift")
local p = ShoppingTooltip1.point
check(p[1] == "TOPLEFT" and p[2] == GameTooltip and p[3] == "TOPRIGHT", "equipped right of the item, clear of the recipe list")
check(p[5] == 0, "compare top lines up with the item; its Equipped header sits above")
TooltipComparisonManager:AnchorShoppingTooltips() -- Blizzard places it again, on the left
p = ShoppingTooltip1.point
check(p[1] == "TOPLEFT" and p[2] == GameTooltip and p[3] == "TOPRIGHT", "moved back right when Blizzard places it")
check(ShoppingTooltip1.CompareHeader.Label.text == "Equipped", "empty native header gets its text")
-- Blizzard may hide its compare when Shift is released. Ours comes back a frame later.
ShoppingTooltip1:Hide()
fire("MODIFIER_STATE_CHANGED", "LSHIFT", 0)
check(not ShoppingTooltip1.shown, "waits a frame after a key change, so Blizzard goes first")
flush()
check(ShoppingTooltip1.native == "Item-2844", "then the compare comes back")

hover(2)
check(ShoppingTooltip1.native == "Item-2845", "compare shows for gear you can't use, too")
hover(9)
check(not ShoppingTooltip1.shown, "no compare when nothing is equipped in that slot")
equippedLinks[1] = addItem(104, { name = "Old Cap", ilvl = 4, minLevel = 1, subType = "Leather",
  equipLoc = "INVTYPE_HEAD", classID = ARMOR, subclassID = 2, stats = {} })
fire("PLAYER_EQUIPMENT_CHANGED", 1, false)
flush()
hover(9)
check(ShoppingTooltip1.native == "Item-2902", "compare shows for gear above your level")
hover(6)
check(not ShoppingTooltip1.shown, "no compare for a recipe with no item")
hover(11)
check(not ShoppingTooltip1.shown, "no compare for non-gear (shirt)")

GameTooltip.right = 1950 -- no room on the right
hover(1)
p = ShoppingTooltip1.point
check(p[1] == "TOPRIGHT" and p[2] == recipeBox() and p[3] == "TOPLEFT", "flips left of the recipe box only when the right has no room")
GameTooltip.right = nil

-- Blizzard starts the compare by itself for the item: we only move it.
GameTooltip:Hide()
blizzardAutoCompare = true
hover(1)
p = ShoppingTooltip1.point
check(ShoppingTooltip1.native == "Blizzard" and p[1] == "TOPLEFT" and p[2] == GameTooltip,
  "Blizzard's own compare is kept and moved right of the item")
GameTooltip:Hide()
check(ShoppingTooltip1.native == "Blizzard", "and left for Blizzard to hide")
blizzardAutoCompare = false
ShoppingTooltip1:Hide()

-- Native compare can't start (no GUID): fill the compare tooltips ourselves.
-- Text Blizzard already set is left alone.
GameTooltip:Hide()
ShoppingTooltip1.CompareHeader.Label.text = "Equipped (set by Blizzard)"
hover(1)
check(ShoppingTooltip1.CompareHeader.Label.text == "Equipped (set by Blizzard)", "never overwrites header text")
ShoppingTooltip1.CompareHeader.Label.text = nil

noGuid[2844] = true
hover(1)
check(ShoppingTooltip1.native == nil and ShoppingTooltip1.slot == 16, "falls back to showing the equipped main hand")
check(ShoppingTooltip1.CompareHeader.shown, "fallback shows the Equipped header")
check(ShoppingTooltip1.CompareHeader.Label.text == "Equipped", "fallback header has its text")

-- No Label field: find the font string among the header's regions.
GameTooltip:Hide()
local header = ShoppingTooltip1.CompareHeader
local savedLabel = header.Label
header.Label = nil
local bg = { GetObjectType = function() return "Texture" end }
local text = { objectType = "FontString" }
function text:GetObjectType() return self.objectType end
function text:SetText(t) self.text = t end
function text:GetText() return self.text end
function header:GetRegions() return bg, text end
hover(1)
check(text.text == "Equipped", "header text found through GetRegions")
header.Label = savedLabel
header.GetRegions = nil
GameTooltip:Hide()
check(not ShoppingTooltip1.shown and not ShoppingTooltip1.CompareHeader.shown, "fallback compare and header hidden with the tooltip")
noGuid[2844] = nil

hover(1)
GameTooltip:SetOwner(UIParent, "ANCHOR_RIGHT") -- moved to something else
check(not ShoppingTooltip1.shown, "compare hidden when the tooltip gets a new owner")

-- Blizzard's own compare (a bag item, say) is never hidden by us.
GameTooltip:Hide()
ShoppingTooltip1.shown = true
ShoppingTooltip1.slot = 5
GameTooltip:SetOwner(UIParent, "ANCHOR_RIGHT")
GameTooltip:Hide()
check(ShoppingTooltip1.shown and ShoppingTooltip1.slot == 5, "Blizzard's own compare left alone")
ShoppingTooltip1:Hide()

-- Gear changes --------------------------------------------------------------
local goodMace = addItem(103, { name = "Good Mace", ilvl = 20, minLevel = 10, subType = "Two-Handed Maces",
  equipLoc = "INVTYPE_2HWEAPON", classID = WEAPON, subclassID = 5, stats = { [DPS] = 9 } })
equippedLinks[16] = goodMace
fire("PLAYER_EQUIPMENT_CHANGED", 16, false)
flush()
noGuid[2844], noGuid[2900] = true, true -- our filled-in compare, which records the slots
hover(1)
check(compareSlots() == "16", "1H mace compared against the equipped 2H")
hover(7)
check(compareSlots() == "16", "2H maul compared against the equipped 2H")
noGuid[2844], noGuid[2900] = nil, nil
GameTooltip:Hide()

equippedLinks[16] = wornMace
fire("PLAYER_EQUIPMENT_CHANGED", 16, false)

-- Proficiency fallback --------------------------------------------------------
-- If IsPlayerSpell can't see Cloth, proficiency spells don't work: don't hide gear.
toggleFilter() -- on
knownSpells[9078] = nil
fire("SPELLS_CHANGED")
flush()
check(rowState(axe) == "shown", "proficiency check skipped when spells are unreliable")
knownSpells[9078] = true
fire("SPELLS_CHANGED")
flush()
check(rowState(axe) == "faded", "proficiency check back once Cloth is known")

-- Nothing failed so far (debug has been on the whole time).
for _, l in ipairs(output) do
  check(not l:find("failed", 1, true), "no hidden failure: " .. l)
end

-- Silent failures ---------------------------------------------------------------
output = {}
-- Debug is a saved setting (/run TrainerCompareDB.debug = true) and takes effect at once.
TrainerCompareDB.debug = true
local realInfo = GetTrainerServiceInfo
GetTrainerServiceInfo = function() error("boom") end
ClassTrainerFrame_Update()
flush()
GetTrainerServiceInfo = realInfo
check(rowState(axe) == "faded", "fading kept when a later refresh fails")
local sawFailure = false
for _, l in ipairs(output) do if l:find("failed", 1, true) then sawFailure = true end end
check(sawFailure, "failures reported with debug on")

TrainerCompareDB.debug = false
output = {}
GetTrainerServiceInfo = function() error("boom") end
ClassTrainerFrame_Update()
flush()
GetTrainerServiceInfo = realInfo
check(#output == 0, "failures silent with debug off")

report("main")
