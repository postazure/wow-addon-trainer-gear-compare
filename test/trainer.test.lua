-- Main suite: the client as the probe found it (Menu API and native compare present).
-- Setup is in fixtures.lua.

-- Settings ------------------------------------------------------------------
check(TrainerCompareDB.scoring == "itemLevel", "scoring defaults to itemLevel")
check(TrainerCompareDB.onlyUsable == false, "filter defaults off")
check(TrainerCompareDB.tooltipLines == nil, "removed settings drop out of the saved file")

-- Old name ----------------------------------------------------------------
output = {}
fire("ADDON_LOADED", "TrainerUpgrades")
local warned = false
for _, l in ipairs(output) do if l:find("old TrainerUpgrades addon", 1, true) then warned = true end end
check(warned, "warns when the old TrainerUpgrades addon is also loaded")
check(SLASH_TRAINERCOMPARE1 == "/tc", "slash command is /tc")

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

SlashCmdList.TRAINERCOMPARE("filter")
flush()
check(TrainerCompareDB.onlyUsable == true and axe.button.alpha < 1, "/tc filter turns it on")
SlashCmdList.TRAINERCOMPARE("filter")
flush()
check(TrainerCompareDB.onlyUsable == false and axe.button.alpha == 1, "/tc filter turns it off")

-- Markers: facts only. A red X on gear you can't use; nothing else is marked.
check(marker(mace) == "none", "usable gear: no marker")
check(marker(bracers) == "none", "usable gear with a lower item level: no marker")
check(marker(maul) == "none", "usable two-hander: no marker")
check(marker(ring) == "none", "usable ring: no marker")
check(marker(axe) == "unusable", "X: Paladin can't use axes")
check(marker(sword) == "unusable", "X: Paladin has not learned swords")
check(marker(spiritGloves) == "unusable", "X: spirit-only gloves on a Paladin")
check(marker(highHelm) == "unusable", "X: level 20 helm at level 17")
check(marker(belt) == "none", "no marker while belt data loads")
check(requested[2851], "belt data requested")
check(marker(enchant) == "none", "enchant has no item: no marker")
check(marker(shirt) == "none", "shirts are not gear here: no marker")
check(marker(category) == "none", "category row gets no marker")
check(marker(mismatch) == "none", "row with a mismatched label gets no marker")

-- Late item data ------------------------------------------------------------
hover(4)
check(tooltipHas("Loading item data..."), "tooltip says the item is loading")
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

-- Stat weights (opt-in) ---------------------------------------------------------
equippedLinks[16] = wornMace
fire("PLAYER_EQUIPMENT_CHANGED", 16, false)
hover(1)
check(not tooltipHas("Score"), "no score line by default")
SlashCmdList.TRAINERCOMPARE("scoring statweights")
flush()
check(TrainerCompareDB.scoring == "statWeights", "/tc scoring switches scorer")
hover(1)
check(tooltipHas("(stat weights)"), "tooltip shows the weighted score once picked")
SlashCmdList.TRAINERCOMPARE("scoring nope")
check(TrainerCompareDB.scoring == "statWeights", "unknown scorer ignored")
SlashCmdList.TRAINERCOMPARE("scoring itemlevel")

-- Proficiency fallback --------------------------------------------------------
-- If IsPlayerSpell can't see Cloth, proficiency spells don't work: don't hide gear.
knownSpells[9078] = nil
fire("SPELLS_CHANGED")
flush()
check(marker(axe) == "none", "proficiency check skipped when spells are unreliable")
knownSpells[9078] = true
fire("SPELLS_CHANGED")
flush()
check(marker(axe) == "unusable", "proficiency check back once Cloth is known")

-- Nothing failed so far (debug has been on the whole time).
for _, l in ipairs(output) do
  check(not l:find("failed", 1, true), "no hidden failure: " .. l)
end

-- Silent failures ---------------------------------------------------------------
output = {}
TrainerCompareDB.debug = false
SlashCmdList.TRAINERCOMPARE("debug") -- on
local realInfo = GetTrainerServiceInfo
GetTrainerServiceInfo = function() error("boom") end
ClassTrainerFrame_Update()
flush()
GetTrainerServiceInfo = realInfo
check(marker(axe) == "unusable", "marker kept when a later refresh fails")
local sawFailure = false
for _, l in ipairs(output) do if l:find("failed", 1, true) then sawFailure = true end end
check(sawFailure, "failures reported with debug on")

SlashCmdList.TRAINERCOMPARE("debug") -- off
output = {}
GetTrainerServiceInfo = function() error("boom") end
ClassTrainerFrame_Update()
flush()
GetTrainerServiceInfo = realInfo
check(#output == 0, "failures silent with debug off")

-- Dump runs without errors.
output = {}
SlashCmdList.TRAINERCOMPARE("dump")
check(#output > 0, "/tc dump prints")
local dumpFailed = false
for _, l in ipairs(output) do if l:find("failed", 1, true) then dumpFailed = true end end
check(not dumpFailed, "/tc dump has no failures")

-- Menu diagnostic runs, watches, and finishes in a copy window.
output = {}
openMenuTag = "MENU_TRAINER_FILTER"
SlashCmdList.TRAINERCOMPARE("menus")
flush()
local copy = TrainerCompareCopyWindow
check(copy ~= nil and copy.shown, "/tc menus opens the copy window")
local copyText = lastEditBox and lastEditBox.text or ""
check(copyText:find("menu API present", 1, true) ~= nil, "copy window has our report")
check(copyText:find("MENU_TRAINER_FILTER", 1, true) ~= nil, "copy window has Blizzard's printed menu tag")
check(copyText:find("done.", 1, true) ~= nil, "copy window has the whole run")
check(lastEditBox.highlighted, "copy window text is selected")
local _, prefixCount = copyText:gsub("Trainer Compare|", "")
check(prefixCount == 0, "our lines are not doubled by the chat capture")
SlashCmdList.TRAINERCOMPARE("copy")
check(copy.shown, "/tc copy reopens it")
local menuFailed = false
for _, l in ipairs(output) do if l:find("failed", 1, true) then menuFailed = true end end
check(not menuFailed, "/tc menus has no failures")

report("main")
