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

-- Late item data ------------------------------------------------------------
hover(4)
check(tooltipHas("Loading item data..."), "tooltip says the item is loading")
check(not tooltipHas("Cost to learn") and not tooltipHas("Vendor price"), "no prices while the item loads")
items[2851].cached = true
fire("GET_ITEM_INFO_RECEIVED", 2851, true)
flush()
hover(4)
check(tooltipHas("Item level 9 vs empty (Waist)"), "belt facts shown once its data arrives")

-- Tooltip lines (always on) -----------------------------------------------------
local DELTA = "If you replace this item, the following stat changes will occur:"
hover(1)
check(not tooltipHas("upgrade"), "no upgrade claims in the tooltip")
check(tooltipHas("Item level 9 vs 2 (Main Hand)"), "mace tooltip shows item levels")
check(lineIndex(DELTA) ~= nil, "stat changes use the built-in heading")
local dpsLine = lineIndex("+2.2 Damage Per Second")
check(dpsLine == lineIndex(DELTA) + 1, "each stat on its own line, under the heading")
check(rawLine(dpsLine) == "|cff20ff20+2.2|r Damage Per Second", "gain: green number, white stat name")
local c = lineColor(dpsLine)
check(c[1] == 1 and c[2] == 1 and c[3] == 1, "stat line base color is white")

hover(7)
local h = lineIndex(DELTA)
check(h ~= nil
  and lineIndex("+4.4 Damage Per Second") == h + 1
  and lineIndex("+3 Strength") == h + 2
  and lineIndex("+2 Stamina") == h + 3, "stats ordered like an item tooltip: DPS, Strength, Stamina")
check(tooltipHas("Item level 11 vs 2 (Main Hand + Off Hand)"), "maul tooltip compares against both hands")

hover(5)
local staLine = lineIndex("-2 Stamina")
check(staLine ~= nil, "a lost stat shows as its own negative line")
check(rawLine(staLine) == "|cffff4040-2|r Stamina", "loss: red number, white stat name")

hover(2)
check(not tooltipHas("Can't use"), "no can't-use line; the item's own red text says it")
check(tooltipHas("Item level 9 vs 2 (Main Hand)"), "unusable gear still shows the item level")
check(lineIndex("+2.2 Damage Per Second") ~= nil, "unusable gear still shows the stat changes")
check(not tooltipHas("Score"), "no score line for unusable gear")
hover(9)
check(tooltipHas("Item level 25 vs empty (Head)"), "unusable gear in an empty slot still shows its item level")
hover(8)
check(tooltipHas("Item level 12 vs empty (Hands)"), "spirit gloves show their item level")
hover(10)
check(tooltipHas("Item level 8 vs 5 (Finger)"), "ring tooltip compares against the weaker ring")
hover(6)
check(not tooltipHas("Item level"), "enchant tooltip unchanged")

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
local costLine = lineIndex("Cost to learn: native:50")
check(costLine ~= nil and costLine > lineIndex("+2.2 Damage Per Second"), "gear: prices come after the stat changes")
check(rawLine(costLine - 1) == " ", "a blank line before the prices")
check(lineIndex("Auction house: native:1234, seen 2 days ago") == costLine + 1, "auction price and its age from Auctionator")
-- Reagents: 6 bars at 10 (auction) + 2 flux at 1 (merchant beats auction's 50) = 62.
-- The optional slot isn't counted. Profit: floor(1234 * 0.95 - 62) = 1110.
check(lineIndex("Reagents: native:62") == costLine + 2, "reagent cost: merchant price first, optional slots skipped")
check(lineIndex("Profit: +native:1110 after the 5% auction house cut") == costLine + 3, "profit after the 5% cut")
check(rawLine(costLine + 3):find("|cff20ff20+|r", 1, true) ~= nil, "profit sign is green")
check(lineIndex("Vendor price: native:41") == costLine + 4, "vendor price from the item")
hover(12)
check(not tooltipHas("Item level"), "non-gear: no item level line")
check(rawLine(2) == " " and lineIndex("Cost to learn: native:100") == 3, "non-gear: prices right under the recipe")
check(tooltipHas("Auction house: native:30 each, seen today"), "stackable items are priced each; age 0 is today")
check(tooltipHas("Vendor price: native:2 each"), "vendor price each")
-- Makes 2 at 30: floor(60 * 0.95 - 3) = 54.
check(tooltipHas("Reagents: native:3 (makes 2)"), "reagents say how many one craft makes")
check(tooltipHas("Profit: +native:54 after"), "profit counts every item made")
hover(10)
check(tooltipHas("Auction house: native:777") and not tooltipHas("seen"), "no age when Auctionator has none")
check(tooltipHas("Reagents: no price for 1 of 2"), "says when a reagent has no price")
check(not tooltipHas("Profit"), "no profit when a reagent has no price")
hover(5)
local noPrice = lineIndex("Auction house: no price yet")
check(noPrice ~= nil, "Auctionator has no price yet")
check(tooltipHas("Reagents: native:20") and not tooltipHas("Profit"), "reagents shown, but no profit without a sale price")
check(lineColor(noPrice)[1] == 0.6, "no price yet is gray")
check(not tooltipHas("Vendor price"), "no vendor line when vendors pay nothing")
check(not tooltipHas("Cost to learn"), "no learn cost when the trainer charges nothing")
hover(9)
check(not tooltipHas("Auction house"), "no auction line for items that bind on pickup")
check(tooltipHas("Reagents: native:10") and not tooltipHas("Profit"), "bind on pickup: reagent cost, no profit")
hover(7)
check(tooltipHas("Vendor price: native:12345"), "money goes through the client's GetCoinTextureString")
-- 20 bars = 200 against floor(100 * 0.95) = 95.
check(tooltipHas("Profit: -native:105 after"), "a loss shows as a negative profit")
check(rawLine(lineIndex("Profit: -native:105 after the 5% auction house cut")):find("|cffff4040-|r", 1, true) ~= nil, "loss sign is red")
GameTooltip:Hide()

-- Native compare ------------------------------------------------------------------
-- Built-in trigger: Shift, or "always compare items".
hover(1)
check(not ShoppingTooltip1.shown, "no compare without Shift")
shiftDown = true
fire("MODIFIER_STATE_CHANGED", "LSHIFT", 1)
check(ShoppingTooltip1.native == "Item-2844", "Shift starts Blizzard's own compare for the crafted item")
local p = ShoppingTooltip1.point
check(p[1] == "TOPRIGHT" and p[2] == GameTooltip and p[3] == "TOPLEFT", "equipped item on the left, recipe on the right")
check(ShoppingTooltip1.CompareHeader.Label.text == "Currently Equipped", "empty native header gets its text")
shiftDown = false
local cleared = compareCleared
fire("MODIFIER_STATE_CHANGED", "LSHIFT", 0)
check(not ShoppingTooltip1.shown and compareCleared == cleared + 1, "releasing Shift clears the native compare")

alwaysCompare = true
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

GameTooltip.left = 100 -- no room on the left
hover(1)
p = ShoppingTooltip1.point
check(p[1] == "TOPLEFT" and p[3] == "TOPRIGHT", "flips to the right only when the left has no room")
GameTooltip.left = nil

-- Native compare can't start (no GUID): fill the compare tooltips ourselves.
-- Text Blizzard already set is left alone.
GameTooltip:Hide()
ShoppingTooltip1.CompareHeader.Label.text = "Equipped (set by Blizzard)"
alwaysCompare = true
hover(1)
check(ShoppingTooltip1.CompareHeader.Label.text == "Equipped (set by Blizzard)", "never overwrites header text")
ShoppingTooltip1.CompareHeader.Label.text = nil

noGuid[2844] = true
hover(1)
check(ShoppingTooltip1.native == nil and ShoppingTooltip1.slot == 16, "falls back to showing the equipped main hand")
check(ShoppingTooltip1.CompareHeader.shown, "fallback shows the Currently Equipped header")
check(ShoppingTooltip1.CompareHeader.Label.text == "Currently Equipped", "fallback header has its text")

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
check(text.text == "Currently Equipped", "header text found through GetRegions")
header.Label = savedLabel
header.GetRegions = nil
GameTooltip:Hide()
check(not ShoppingTooltip1.shown and not ShoppingTooltip1.CompareHeader.shown, "fallback compare and header hidden with the tooltip")
noGuid[2844] = nil

hover(1)
GameTooltip:SetOwner(UIParent, "ANCHOR_RIGHT") -- moved to something else
check(not ShoppingTooltip1.shown, "compare hidden when the tooltip gets a new owner")
alwaysCompare = false

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
hover(1)
check(tooltipHas("Item level 9 vs 20 (Main Hand)"), "1H mace compared against the equipped 2H")
hover(7)
check(tooltipHas("Item level 11 vs 20 (Main Hand)"), "2H maul compared against the equipped 2H")

equippedLinks[16] = wornMace
fire("PLAYER_EQUIPMENT_CHANGED", 16, false)
hover(1)
check(not tooltipHas("Score"), "no score line, even from an old saved scoring setting")

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
