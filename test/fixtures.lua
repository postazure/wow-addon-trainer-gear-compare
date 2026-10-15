-- Shared setup. A level 17 Paladin (as in the probe) at a Blacksmithing trainer.
-- Paladin here knows: Cloth, Leather, Mail, Shield, 1H Maces, 2H Maces.

ARMOR, WEAPON = 4, 2
DPS = "ITEM_MOD_DAMAGE_PER_SECOND_SHORT"

-- Equipped gear ---------------------------------------------------------------
wornMace = addItem(36, { name = "Worn Mace", ilvl = 2, minLevel = 1, subType = "One-Handed Maces",
  equipLoc = "INVTYPE_WEAPON", classID = WEAPON, subclassID = 4, stats = { [DPS] = 1.6 } })
oldBracers = addItem(100, { name = "Old Bracers", ilvl = 15, minLevel = 10, subType = "Mail",
  equipLoc = "INVTYPE_WRIST", classID = ARMOR, subclassID = 3, stats = { ITEM_MOD_STAMINA_SHORT = 2 } })
ringA = addItem(101, { name = "Ring A", ilvl = 10, minLevel = 5, subType = "Miscellaneous",
  equipLoc = "INVTYPE_FINGER", classID = ARMOR, subclassID = 0, stats = {} })
ringB = addItem(102, { name = "Ring B", ilvl = 5, minLevel = 1, subType = "Miscellaneous",
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

mace = service("Copper Mace", addItem(2844, { name = "Copper Mace", ilvl = 9, minLevel = 4,
  subType = "One-Handed Maces", equipLoc = "INVTYPE_WEAPON", classID = WEAPON, subclassID = 4,
  stats = { [DPS] = 3.8461537361145 } }), "One-Handed Maces")
axe = service("Copper Axe", addItem(2845, { name = "Copper Axe", ilvl = 9, minLevel = 4,
  subType = "One-Handed Axes", equipLoc = "INVTYPE_WEAPON", classID = WEAPON, subclassID = 0,
  stats = { [DPS] = 3.75 } }), "One-Handed Axes")
sword = service("Copper Shortsword", addItem(2847, { name = "Copper Shortsword", ilvl = 10, minLevel = 4,
  subType = "One-Handed Swords", equipLoc = "INVTYPE_WEAPON", classID = WEAPON, subclassID = 7,
  stats = { [DPS] = 5.4000000953674, ITEM_MOD_STRENGTH_SHORT = 1 } }), "One-Handed Swords")
belt = service("Copper Chain Belt", addItem(2851, { name = "Copper Chain Belt", ilvl = 9, minLevel = 4,
  subType = "Mail", equipLoc = "INVTYPE_WAIST", classID = ARMOR, subclassID = 3, stats = {}, cached = false }))
bracers = service("Copper Bracers", addItem(2853, { name = "Copper Bracers", ilvl = 7, minLevel = 2,
  subType = "Mail", equipLoc = "INVTYPE_WRIST", classID = ARMOR, subclassID = 3, stats = {} }))
enchant = service("Enchant Bracer - Minor Health", nil)
maul = service("Copper Maul", addItem(2900, { name = "Copper Maul", ilvl = 11, minLevel = 6,
  subType = "Two-Handed Maces", equipLoc = "INVTYPE_2HWEAPON", classID = WEAPON, subclassID = 5,
  stats = { [DPS] = 6, ITEM_MOD_STAMINA_SHORT = 2, ITEM_MOD_STRENGTH_SHORT = 3 } }))
spiritGloves = service("Spirit Gloves", addItem(2901, { name = "Spirit Gloves", ilvl = 12, minLevel = 5,
  subType = "Cloth", equipLoc = "INVTYPE_HAND", classID = ARMOR, subclassID = 1,
  stats = { ITEM_MOD_SPIRIT_SHORT = 3 } }))
highHelm = service("Iron Helm", addItem(2902, { name = "Iron Helm", ilvl = 25, minLevel = 20,
  subType = "Mail", equipLoc = "INVTYPE_HEAD", classID = ARMOR, subclassID = 3, stats = {} }))
ring = service("Copper Ring", addItem(2903, { name = "Copper Ring", ilvl = 8, minLevel = 4,
  subType = "Miscellaneous", equipLoc = "INVTYPE_FINGER", classID = ARMOR, subclassID = 0, stats = {} }))
shirt = service("Linen Shirt", addItem(2904, { name = "Linen Shirt", ilvl = 5, minLevel = 1,
  subType = "Miscellaneous", equipLoc = "INVTYPE_BODY", classID = ARMOR, subclassID = 0, stats = {} }))

stone = service("Rough Sharpening Stone", addItem(2862, { name = "Rough Sharpening Stone", ilvl = 5,
  minLevel = 1, subType = "Trade Goods", equipLoc = "", classID = 7, subclassID = 0, stats = {},
  stack = 20, sellPrice = 2 }))

-- Prices. Not probed: made-up costs and sell prices.
services[1].cost = 50          -- Copper Mace
services[12].cost = 100        -- Rough Sharpening Stone
items[2844].sellPrice = 41     -- Copper Mace
items[2900].sellPrice = 12345  -- Copper Maul
items[2902].bind = 1           -- Iron Helm binds on pickup

-- A category row, and a row whose label does not match its service.
category = makeRow({ categoryName = "Maces" }, "Maces")
rows[#rows + 1] = category
mismatch = makeRow({ skillIndex = 1 }, "Something Else")
rows[#rows + 1] = mismatch

-- Load ----------------------------------------------------------------------
-- An old saved file: tooltipLines and scoring were settings in earlier versions.
TrainerCompareDB = { debug = true, tooltipLines = false, scoring = "statWeights" }
fire("ADDON_LOADED", "TrainerCompare")
loadTrainerUI()
fire("ADDON_LOADED", "Blizzard_TrainerUI")
fire("TRAINER_SHOW")
ClassTrainerFrame_Update()
flush()
