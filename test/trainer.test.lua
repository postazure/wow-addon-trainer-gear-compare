-- Scenario tests. A level 17 Paladin (as in the probe) at a Blacksmithing trainer.
-- Paladin here knows: Cloth, Leather, Mail, Shield, 1H Maces, 2H Maces.

local ARMOR, WEAPON = 4, 2
local DPS = "ITEM_MOD_DAMAGE_PER_SECOND_SHORT"

-- Equipped gear ---------------------------------------------------------------
local wornMace = addItem(36, { name = "Worn Mace", ilvl = 2, minLevel = 1, subType = "One-Handed Maces",
  equipLoc = "INVTYPE_WEAPON", classID = WEAPON, subclassID = 4, stats = { [DPS] = 1.6 } })
local oldBracers = addItem(100, { name = "Old Bracers", ilvl = 15, minLevel = 10, subType = "Mail",
  equipLoc = "INVTYPE_WRIST", classID = ARMOR, subclassID = 3, stats = { ITEM_MOD_STAMINA_SHORT = 2 } })
local ringA = addItem(101, { name = "Ring A", ilvl = 10, minLevel = 5, subType = "Miscellaneous",
  equipLoc = "INVTYPE_FINGER", classID = ARMOR, subclassID = 0, stats = {} })
local ringB = addItem(102, { name = "Ring B", ilvl = 5, minLevel = 1, subType = "Miscellaneous",
  equipLoc = "INVTYPE_FINGER", classID = ARMOR, subclassID = 0, stats = {} })
equippedLinks[16] = wornMace
equippedLinks[9] = oldBracers
equippedLinks[11] = ringA
equippedLinks[12] = ringB

-- Trainer services --------------------------------------------------------
-- 1-3 are exact values from the probe.
local function service(name, link, category)
  services[#services + 1] = { name = name, type = "available", link = link, category = category }
  local row = makeRow({ skillIndex = #services }, name)
  rows[#rows + 1] = row
  return row
end

local mace = service("Copper Mace", addItem(2844, { name = "Copper Mace", ilvl = 9, minLevel = 4,
  subType = "One-Handed Maces", equipLoc = "INVTYPE_WEAPON", classID = WEAPON, subclassID = 4,
  stats = { [DPS] = 3.8461537361145 } }), "One-Handed Maces")
local axe = service("Copper Axe", addItem(2845, { name = "Copper Axe", ilvl = 9, minLevel = 4,
  subType = "One-Handed Axes", equipLoc = "INVTYPE_WEAPON", classID = WEAPON, subclassID = 0,
  stats = { [DPS] = 3.75 } }), "One-Handed Axes")
local sword = service("Copper Shortsword", addItem(2847, { name = "Copper Shortsword", ilvl = 10, minLevel = 4,
  subType = "One-Handed Swords", equipLoc = "INVTYPE_WEAPON", classID = WEAPON, subclassID = 7,
  stats = { [DPS] = 5.4000000953674, ITEM_MOD_STRENGTH_SHORT = 1 } }), "One-Handed Swords")
local belt = service("Copper Chain Belt", addItem(2851, { name = "Copper Chain Belt", ilvl = 9, minLevel = 4,
  subType = "Mail", equipLoc = "INVTYPE_WAIST", classID = ARMOR, subclassID = 3, stats = {}, cached = false }))
local bracers = service("Copper Bracers", addItem(2853, { name = "Copper Bracers", ilvl = 7, minLevel = 2,
  subType = "Mail", equipLoc = "INVTYPE_WRIST", classID = ARMOR, subclassID = 3, stats = {} }))
local enchant = service("Enchant Bracer - Minor Health", nil)
local maul = service("Copper Maul", addItem(2900, { name = "Copper Maul", ilvl = 11, minLevel = 6,
  subType = "Two-Handed Maces", equipLoc = "INVTYPE_2HWEAPON", classID = WEAPON, subclassID = 5,
  stats = { [DPS] = 6 } }))
local spiritGloves = service("Spirit Gloves", addItem(2901, { name = "Spirit Gloves", ilvl = 12, minLevel = 5,
  subType = "Cloth", equipLoc = "INVTYPE_HAND", classID = ARMOR, subclassID = 1,
  stats = { ITEM_MOD_SPIRIT_SHORT = 3 } }))
local highHelm = service("Iron Helm", addItem(2902, { name = "Iron Helm", ilvl = 25, minLevel = 20,
  subType = "Mail", equipLoc = "INVTYPE_HEAD", classID = ARMOR, subclassID = 3, stats = {} }))
local ring = service("Copper Ring", addItem(2903, { name = "Copper Ring", ilvl = 8, minLevel = 4,
  subType = "Miscellaneous", equipLoc = "INVTYPE_FINGER", classID = ARMOR, subclassID = 0, stats = {} }))
local shirt = service("Linen Shirt", addItem(2904, { name = "Linen Shirt", ilvl = 5, minLevel = 1,
  subType = "Miscellaneous", equipLoc = "INVTYPE_BODY", classID = ARMOR, subclassID = 0, stats = {} }))

-- A category row, and a row whose label does not match its service.
local category = makeRow({ categoryName = "Maces" }, "Maces")
rows[#rows + 1] = category
local mismatch = makeRow({ skillIndex = 1 }, "Something Else")
rows[#rows + 1] = mismatch

-- Load ----------------------------------------------------------------------
TrainerUpgradesDB = { debug = true }
fire("ADDON_LOADED", "TrainerUpgrades")
check(TrainerUpgradesDB.scoring == "itemLevel", "scoring defaults to itemLevel")
check(TrainerUpgradesDB.onlyUpgrades == false, "filter defaults off")

loadTrainerUI()
fire("ADDON_LOADED", "Blizzard_TrainerUI")
check(TrainerUpgradesOnlyUpgrades ~= nil, "checkbox created")
local cbPoint = TrainerUpgradesOnlyUpgrades.point
check(cbPoint[1] == "RIGHT" and cbPoint[2] == ClassTrainerTrainButton and cbPoint[3] == "LEFT",
  "checkbox sits left of the Train button")

fire("TRAINER_SHOW")
ClassTrainerFrame_Update()
flush()

-- Markers -------------------------------------------------------------------
check(marker(mace) == "upgrade", "Copper Mace (ilvl 9) beats Worn Mace (ilvl 2)")
check(marker(axe) == "none", "no marker: Paladin can't use axes")
check(marker(sword) == "none", "no marker: Paladin has not learned swords")
check(marker(belt) == "none", "no marker while belt data loads")
check(requested[2851], "belt data requested")
check(marker(bracers) == "same", "Copper Bracers (7) not better than Old Bracers (15)")
check(marker(enchant) == "none", "enchant has no item: no marker")
check(marker(maul) == "upgrade", "2H maul (11) beats Worn Mace + empty off hand (avg 1)")
check(marker(spiritGloves) == "none", "spirit-only gloves hidden for Paladin")
check(marker(highHelm) == "none", "level 20 helm hidden at level 17")
check(marker(ring) == "upgrade", "ring (8) beats the weaker ring (5)")
check(marker(shirt) == "none", "shirts are not compared")
check(marker(category) == "none", "category row gets no marker")
check(marker(mismatch) == "none", "row with a mismatched label gets no marker")

-- Late item data ------------------------------------------------------------
items[2851].cached = true
fire("GET_ITEM_INFO_RECEIVED", 2851, true)
flush()
check(marker(belt) == "upgrade", "belt marked once its data arrives (waist slot empty)")

-- Tooltips ------------------------------------------------------------------
GameTooltip:SetTrainerService(1)
check(tooltipHas("TrainerUpgrades: upgrade"), "mace tooltip says upgrade")
check(tooltipHas("Item level 9 vs 2 (Main Hand)"), "mace tooltip shows item levels")
check(tooltipHas("+2.2 Damage Per Second"), "mace tooltip shows DPS change")

GameTooltip:SetTrainerService(2)
check(tooltipHas("can't use (you can't use One-Handed Axes)"), "axe tooltip gives the reason")

GameTooltip:SetTrainerService(7)
check(tooltipHas("Item level 11 vs 2 (Main Hand + Off Hand)"), "maul tooltip compares against both hands")

GameTooltip:SetTrainerService(10)
check(tooltipHas("Item level 8 vs 5 (Finger)"), "ring tooltip compares against the weaker ring")

GameTooltip:SetTrainerService(6)
check(not tooltipHas("TrainerUpgrades"), "enchant tooltip unchanged")

-- Filter --------------------------------------------------------------------
SlashCmdList.TRAINERUPGRADES("filter")
flush()
check(TrainerUpgradesDB.onlyUpgrades == true, "/tu filter turns the filter on")
check(TrainerUpgradesOnlyUpgrades.checked == true, "checkbox follows /tu filter")
check(mace.button.alpha == 1, "upgrade stays visible")
check(axe.button.alpha < 1, "non-upgrade is faded")
check(category.button.alpha == 1, "category row is never faded")

TrainerUpgradesOnlyUpgrades.checked = false
TrainerUpgradesOnlyUpgrades.scripts.OnClick(TrainerUpgradesOnlyUpgrades)
flush()
check(TrainerUpgradesDB.onlyUpgrades == false, "checkbox turns the filter off")
check(axe.button.alpha == 1, "faded rows restored")

-- Gear changes --------------------------------------------------------------
local goodMace = addItem(103, { name = "Good Mace", ilvl = 20, minLevel = 10, subType = "Two-Handed Maces",
  equipLoc = "INVTYPE_2HWEAPON", classID = WEAPON, subclassID = 5, stats = { [DPS] = 9 } })
equippedLinks[16] = goodMace
fire("PLAYER_EQUIPMENT_CHANGED", 16, false)
flush()
check(marker(mace) == "same", "1H mace compared against the equipped 2H (20)")
check(marker(maul) == "same", "2H maul (11) not better than 2H (20)")

-- Stat weights ----------------------------------------------------------------
equippedLinks[16] = wornMace
fire("PLAYER_EQUIPMENT_CHANGED", 16, false)
SlashCmdList.TRAINERUPGRADES("scoring statweights")
flush()
check(TrainerUpgradesDB.scoring == "statWeights", "/tu scoring switches scorer")
check(marker(mace) == "upgrade", "mace still an upgrade by stat weights (more DPS)")
check(marker(bracers) == "same", "bracers with no stats lose to Old Bracers (+2 Stamina)")
GameTooltip:SetTrainerService(1)
check(tooltipHas("(stat weights)"), "tooltip shows the weighted score")
SlashCmdList.TRAINERUPGRADES("scoring nope")
check(TrainerUpgradesDB.scoring == "statWeights", "unknown scorer ignored")
SlashCmdList.TRAINERUPGRADES("scoring itemlevel")

-- Proficiency fallback --------------------------------------------------------
-- If IsPlayerSpell can't see Cloth, proficiency spells don't work: don't hide gear.
knownSpells[9078] = nil
fire("SPELLS_CHANGED")
flush()
check(marker(axe) == "upgrade", "proficiency check skipped when spells are unreliable")
knownSpells[9078] = true
fire("SPELLS_CHANGED")
flush()
check(marker(axe) == "none", "proficiency check back once Cloth is known")

-- Nothing failed so far (debug has been on the whole time).
for _, l in ipairs(output) do
  check(not l:find("failed", 1, true), "no hidden failure: " .. l)
end

-- Silent failures ---------------------------------------------------------------
output = {}
TrainerUpgradesDB.debug = false
SlashCmdList.TRAINERUPGRADES("debug")  -- on
local realInfo = GetTrainerServiceInfo
GetTrainerServiceInfo = function() error("boom") end
ClassTrainerFrame_Update()
flush()
GetTrainerServiceInfo = realInfo
check(marker(mace) == "upgrade", "marker kept when a later refresh fails")
local sawFailure = false
for _, l in ipairs(output) do if l:find("failed", 1, true) then sawFailure = true end end
check(sawFailure, "failures reported with debug on")

SlashCmdList.TRAINERUPGRADES("debug")  -- off
output = {}
GetTrainerServiceInfo = function() error("boom") end
ClassTrainerFrame_Update()
flush()
GetTrainerServiceInfo = realInfo
check(#output == 0, "failures silent with debug off")

-- Dump runs without errors.
output = {}
SlashCmdList.TRAINERUPGRADES("dump")
check(#output > 0, "/tu dump prints")
local dumpFailed = false
for _, l in ipairs(output) do if l:find("failed", 1, true) then dumpFailed = true end end
check(not dumpFailed, "/tu dump has no failures")

-- Menu diagnostic runs, watches, and finishes without errors.
output = {}
SlashCmdList.TRAINERUPGRADES("menus")
flush()
local sawDone, menuFailed = false, false
for _, l in ipairs(output) do
  if l:find("done.", 1, true) then sawDone = true end
  if l:find("failed", 1, true) then menuFailed = true end
end
check(sawDone, "/tu menus finishes its watch")
check(not menuFailed, "/tu menus has no failures")

print = function(...) io.write(table.concat({ ... }, " "), "\n") end
print(passCount() .. " checks passed")
