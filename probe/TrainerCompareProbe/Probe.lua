-- Trainer Compare Probe
--
-- A throwaway debug addon. It reports what this client's trainer API really
-- returns, so the real Trainer Compare addon is built on facts, not guesses.
--
-- Safe by design: it only calls read-only getters, wraps every call in pcall,
-- and never buys, selects, expands, or changes filters on the trainer.
--
-- Quiet in chat: it records on its own (each trainer open), but only shows
-- the result when asked (/tcprobe, /tcprobe show).

local ADDON_NAME = ...
local PREFIX = "|cff33ff99TCProbe|r "
local DETAIL_COUNT = 3      -- non-header services to dump in full
local MAX_ROWS_SCANNED = 40 -- stop looking for non-header rows after this

local lines = {}
local pending = {}          -- [itemID] = service name, waiting on GET_ITEM_INFO_RECEIVED
local trainerOpen = false
local updateCount = 0
local eventErrors = {}

---------------------------------------------------------------------------
-- Output
---------------------------------------------------------------------------

-- Record a line for the copy window. Never printed: chat stays quiet.
local function out(text)
  text = tostring(text):gsub("\r?\n", " / ")
  lines[#lines + 1] = text
end

local function save()
  TrainerCompareProbeDB = TrainerCompareProbeDB or {}
  TrainerCompareProbeDB.lines = lines
  TrainerCompareProbeDB.savedAt = date("%Y-%m-%d %H:%M:%S")
end

local function fmt(v)
  if type(v) == "string" then return '"' .. v .. '"' end
  return tostring(v)
end

---------------------------------------------------------------------------
-- Safe calls
---------------------------------------------------------------------------

local function pack(...)
  return { n = select("#", ...), ... }
end

-- Resolve "Name" or "C_Namespace.Func" from _G.
local function lookup(path)
  local v = _G
  for part in path:gmatch("[^%.]+") do
    if type(v) ~= "table" then return nil end
    v = v[part]
  end
  return v
end

-- Call fn safely. Result: r.ok, r.err, and return values in r[1..r.n].
local function try(fn, ...)
  if type(fn) ~= "function" then
    return { ok = false, err = "missing", n = 0 }
  end
  local p = pack(pcall(fn, ...))
  if not p[1] then
    return { ok = false, err = tostring(p[2]), n = 0 }
  end
  local r = { ok = true, n = p.n - 1 }
  for i = 2, p.n do r[i - 1] = p[i] end
  return r
end

local function show(r)
  if not r.ok then return "<" .. (r.err or "error") .. ">" end
  if r.n == 0 then return "<no values>" end
  local parts = {}
  for i = 1, r.n do parts[i] = fmt(r[i]) end
  return table.concat(parts, ", ")
end

local function after(seconds, fn)
  if C_Timer and C_Timer.After then
    C_Timer.After(seconds, fn)
    return
  end
  local f, elapsed = CreateFrame("Frame"), 0
  f:SetScript("OnUpdate", function(self, e)
    elapsed = elapsed + e
    if elapsed >= seconds then
      self:SetScript("OnUpdate", nil)
      fn()
    end
  end)
end

---------------------------------------------------------------------------
-- API inventory
---------------------------------------------------------------------------

local TRAINER_API = {
  "GetNumTrainerServices", "GetTrainerServiceInfo", "GetTrainerServiceItemLink",
  "GetTrainerServiceLink", "GetTrainerServiceSpellID", "GetTrainerServiceIcon",
  "GetTrainerServiceCost", "GetTrainerServiceDescription", "GetTrainerServiceLevelReq",
  "GetTrainerServiceSkillReq", "GetTrainerServiceNumAbilityReq", "GetTrainerServiceAbilityReq",
  "GetTrainerServiceSkillLine", "GetTrainerServiceTypeFilter", "SetTrainerServiceTypeFilter",
  "GetTrainerSkillLineFilter", "SetTrainerSkillLineFilter", "GetTrainerSkillLines",
  "GetTrainerSelectionIndex", "SelectTrainerService", "BuyTrainerService",
  "ExpandTrainerSkillLine", "CollapseTrainerSkillLine", "IsTradeskillTrainer",
  "GetTrainerGreetingText", "CloseTrainer", "C_TooltipInfo.GetTrainerService",
}

local HELPER_API = {
  "GetItemInfo", "C_Item.GetItemInfo", "GetItemInfoInstant", "C_Item.GetItemInfoInstant",
  "C_Item.RequestLoadItemDataByID", "C_Item.IsItemDataCachedByID", "C_Item.GetItemInventoryTypeByID",
  "GetItemStats", "C_Item.GetItemStats", "GetDetailedItemLevelInfo", "C_Item.GetDetailedItemLevelInfo",
  "GetItemSpell", "C_Item.GetItemSpell", "IsEquippableItem", "C_Item.IsEquippableItem",
  "IsUsableItem", "C_Item.IsUsableItem", "GetInventoryItemLink", "GetInventorySlotInfo",
  "GetSpellInfo", "C_Spell.GetSpellInfo", "GetSpellLink", "C_Spell.GetSpellLink",
  "GetSpellDescription", "C_Spell.GetSpellDescription", "IsPlayerSpell", "IsSpellKnown",
  "GetNumSkillLines", "GetSkillLineInfo", "C_Timer.After", "hooksecurefunc",
  "C_AddOns.IsAddOnLoaded", "IsAddOnLoaded", "TooltipDataProcessor.AddTooltipPostCall",
  "Item.CreateFromItemID", "GetCoinTextureString", "C_CurrencyInfo.GetCoinTextureString",
  "GetMoneyString", "GetCoinText", "C_TradeSkillUI.GetRecipeSchematic",
}

local function reportNames(title, names)
  local have, missing = {}, {}
  for _, name in ipairs(names) do
    if type(lookup(name)) == "function" then
      have[#have + 1] = name
    else
      missing[#missing + 1] = name
    end
  end
  out(("%s present (%d): %s"):format(title, #have, table.concat(have, ", ")))
  out(("%s missing (%d): %s"):format(title, #missing, #missing > 0 and table.concat(missing, ", ") or "none"))
end

local function isInteresting(lowerName)
  return lowerName:find("trainer", 1, true) or lowerName:find("tradeskill", 1, true)
    or lowerName:find("craft", 1, true) or lowerName:find("recipe", 1, true)
    or lowerName:find("profession", 1, true)
end

-- Find trainer functions and namespaces we did not think to ask about.
local function scanGlobals()
  local known = {}
  for _, n in ipairs(TRAINER_API) do known[n] = true end
  for _, n in ipairs(HELPER_API) do known[n] = true end

  local extra, namespaces, frames = {}, {}, {}
  for k, v in pairs(_G) do
    if type(k) == "string" then
      local lk = k:lower()
      if type(v) == "function" then
        if lk:find("trainer", 1, true) and not known[k] then extra[#extra + 1] = k end
      elseif type(v) == "table" and k:sub(1, 2) == "C_" then
        local listAll = isInteresting(lk)
        pcall(function()
          local fns = {}
          for fk, fv in pairs(v) do
            if type(fk) == "string" and type(fv) == "function" then
              if listAll then fns[#fns + 1] = fk end
              local full = k .. "." .. fk
              if fk:lower():find("trainer", 1, true) and not known[full] then extra[#extra + 1] = full end
            end
          end
          if listAll then
            table.sort(fns)
            namespaces[#namespaces + 1] = k .. " {" .. table.concat(fns, ", ") .. "}"
          end
        end)
      elseif type(v) == "table" and lk:find("trainer", 1, true) and type(v.GetObjectType) == "function" then
        frames[#frames + 1] = k
      end
    end
  end
  table.sort(extra)
  table.sort(namespaces)
  table.sort(frames)

  out("Other *Trainer* functions: " .. (#extra > 0 and table.concat(extra, ", ") or "none"))
  if #namespaces == 0 then
    out("Trainer/TradeSkill/Craft/Recipe/Profession C_ namespaces: none")
  end
  for _, ns in ipairs(namespaces) do out("Namespace " .. ns) end
  local shownFrames = {}
  for i = 1, math.min(#frames, 40) do shownFrames[i] = frames[i] end
  out(("Trainer frames in _G (%d): %s"):format(#frames, table.concat(shownFrames, ", ")))
end

local function reportFrame()
  local isLoaded = lookup("C_AddOns.IsAddOnLoaded") or _G.IsAddOnLoaded
  out("Blizzard_TrainerUI loaded: " .. show(try(isLoaded, "Blizzard_TrainerUI")))

  local ctf = _G.ClassTrainerFrame
  out("ClassTrainerFrame: " .. (ctf and ("exists, shown=" .. tostring(ctf:IsShown())) or "nil"))

  local hooks = {}
  for _, name in ipairs({ "ClassTrainerFrame_Update", "ClassTrainer_SetSelection",
                          "ClassTrainerSkillButton_OnClick", "ClassTrainerFrame_OnEvent" }) do
    hooks[#hooks + 1] = name .. "=" .. (type(_G[name]) == "function" and "yes" or "no")
  end
  out("Hookable globals: " .. table.concat(hooks, ", "))

  out(("CLASS_TRAINER_SKILLS_DISPLAYED=%s, ClassTrainerListScrollFrame=%s, ClassTrainerFrame.ScrollBox=%s")
    :format(fmt(_G.CLASS_TRAINER_SKILLS_DISPLAYED), fmt(_G.ClassTrainerListScrollFrame ~= nil),
            fmt(ctf ~= nil and ctf.ScrollBox ~= nil)))

  local b = _G.ClassTrainerSkill1
  if b then
    out(("ClassTrainerSkill1: type=%s id=%s text=%s shown=%s")
      :format(fmt(b:GetObjectType()), show(try(b.GetID, b)), show(try(b.GetText, b)), fmt(b:IsShown())))
  else
    out("ClassTrainerSkill1: nil")
  end
end

local function reportOtherAddons()
  local getNum = lookup("C_AddOns.GetNumAddOns") or _G.GetNumAddOns
  local getInfo = lookup("C_AddOns.GetAddOnInfo") or _G.GetAddOnInfo
  local isLoaded = lookup("C_AddOns.IsAddOnLoaded") or _G.IsAddOnLoaded

  local found = {}
  local n = try(getNum)
  if n.ok and type(n[1]) == "number" then
    for i = 1, n[1] do
      local info = try(getInfo, i)
      local name = info.ok and info[1]
      if type(name) == "string" then
        local ln = name:lower()
        if ln:find("gear", 1, true) or ln:find("forever", 1, true) then
          local l = try(isLoaded, name)
          found[#found + 1] = name .. ((l.ok and l[1]) and " (loaded)" or " (not loaded)")
        end
      end
    end
  end
  out("Gear/Forever addons: " .. (#found > 0 and table.concat(found, ", ") or "none"))

  -- Look for a public API we could read later.
  local globals = {}
  for k, v in pairs(_G) do
    if type(k) == "string" then
      local lk = k:lower()
      if lk:find("forevergear", 1, true) or lk:find("gearset", 1, true) then
        local desc = k .. ":" .. type(v)
        if type(v) == "table" then
          local fns = {}
          pcall(function()
            for fk, fv in pairs(v) do
              if type(fk) == "string" and type(fv) == "function" and #fns < 15 then fns[#fns + 1] = fk end
            end
          end)
          table.sort(fns)
          desc = desc .. " {" .. table.concat(fns, ", ") .. "}"
        end
        globals[#globals + 1] = desc
      end
    end
  end
  table.sort(globals)
  out("Gear addon globals: " .. (#globals > 0 and table.concat(globals, "; ") or "none"))
end

---------------------------------------------------------------------------
-- Price addons
---------------------------------------------------------------------------

-- Auctionator's public API, from its source (Source/API/v1). Each function
-- takes (callerID, itemLink) and raises a Lua error on bad input, so every
-- call goes through try().
local AUCTIONATOR_FNS = {
  "GetAuctionPriceByItemLink", "GetAuctionAgeByItemLink", "IsAuctionDataExactByItemLink",
  "GetAuctionPriceByItemID", "GetVendorPriceByItemID",
  "GetVendorPriceByItemLink", "GetDisenchantPriceByItemLink", "RegisterForDBUpdate",
}

local function auctionatorAPI()
  local api = lookup("Auctionator.API.v1")
  if type(api) == "table" then return api end
  return nil
end

local function addonState(name)
  local isLoaded = lookup("C_AddOns.IsAddOnLoaded") or _G.IsAddOnLoaded
  local getMeta = lookup("C_AddOns.GetAddOnMetadata") or _G.GetAddOnMetadata
  local loaded = try(isLoaded, name)
  local version = try(getMeta, name, "Version")
  return ("%s loaded=%s version=%s"):format(name, show(loaded), show(version))
end

-- Money as the player would see it, with every formatter this client has.
local function money(copper)
  if type(copper) ~= "number" then return fmt(copper) end
  local parts = { tostring(copper) .. "c" }
  for _, name in ipairs({ "GetCoinTextureString", "C_CurrencyInfo.GetCoinTextureString", "GetMoneyString" }) do
    local fn = lookup(name)
    if type(fn) == "function" then parts[#parts + 1] = name .. "=" .. show(try(fn, copper)) end
  end
  return table.concat(parts, " ")
end

local function reportPriceAddons()
  out(addonState("Auctionator"))
  out(addonState("Disenchantry"))
  local api = auctionatorAPI()
  if not api then
    out("Auctionator.API.v1: " .. (type(_G.Auctionator) == "table" and "missing (Auctionator table exists)" or "missing"))
  else
    local have, missing = {}, {}
    for _, fn in ipairs(AUCTIONATOR_FNS) do
      if type(api[fn]) == "function" then have[#have + 1] = fn else missing[#missing + 1] = fn end
    end
    out(("Auctionator.API.v1 present: %s; missing: %s")
      :format(table.concat(have, ", "), #missing > 0 and table.concat(missing, ", ") or "none"))
  end
  out("Sample money 123456 -> " .. money(123456))
end

-- One line of Auctionator data for an item link. Read-only calls.
local function auctionatorLine(link)
  local api = auctionatorAPI()
  if not api then return "no Auctionator API" end
  if type(link) ~= "string" then return "no link" end
  local function call(fn)
    return show(try(api[fn], ADDON_NAME, link))
  end
  return ("ah=%s age=%s exact=%s vendor=%s de=%s")
    :format(call("GetAuctionPriceByItemLink"), call("GetAuctionAgeByItemLink"),
            call("IsAuctionDataExactByItemLink"), call("GetVendorPriceByItemLink"),
            call("GetDisenchantPriceByItemLink"))
end

-- What C_TradeSkillUI.GetRecipeSchematic says about a recipe spell: how many
-- it makes and each reagent slot (type, count, item ids), plus reagent prices.
local function schematicLine(spellID)
  local fn = lookup("C_TradeSkillUI.GetRecipeSchematic")
  if type(fn) ~= "function" then return "GetRecipeSchematic missing" end
  if type(spellID) ~= "number" then return "no spell id" end
  local r = try(fn, spellID, false)
  if not r.ok then return "<" .. tostring(r.err) .. ">" end
  local s = r[1]
  if type(s) ~= "table" then return "returned " .. fmt(s) end
  local slots = {}
  local api = auctionatorAPI()
  if type(s.reagentSlotSchematics) == "table" then
    for i, slot in ipairs(s.reagentSlotSchematics) do
      local ids = {}
      if type(slot.reagents) == "table" then
        for _, reagent in ipairs(slot.reagents) do
          local id = reagent.itemID
          local price = ""
          if api and type(id) == "number" then
            price = ("(ah=%s vendor=%s)"):format(show(try(api.GetAuctionPriceByItemID, ADDON_NAME, id)),
              show(try(api.GetVendorPriceByItemID, ADDON_NAME, id)))
          end
          ids[#ids + 1] = fmt(id) .. price
        end
      end
      slots[#slots + 1] = ("%d:type=%s x%s [%s]"):format(i, fmt(slot.reagentType), fmt(slot.quantityRequired),
        table.concat(ids, ","))
    end
  end
  return ("made=%s-%s slots: %s"):format(fmt(s.quantityMin), fmt(s.quantityMax), table.concat(slots, "; "))
end

---------------------------------------------------------------------------
-- Per-service inspection
---------------------------------------------------------------------------

local function itemIDFromLink(link)
  if type(link) ~= "string" then return nil end
  local id = tonumber(link:match("item:(%d+)"))
  if id and id > 0 then return id end
  return nil
end

local function spellIDFromLink(link)
  if type(link) ~= "string" then return nil end
  return tonumber(link:match("spell:(%d+)") or link:match("enchant:(%d+)"))
end

local tip -- hidden scanning tooltip, false if it could not be made

local function scanTooltip(index)
  if tip == nil then
    local r = try(CreateFrame, "GameTooltip", "TrainerCompareProbeTip", UIParent, "GameTooltipTemplate")
    tip = r.ok and r[1] or false
  end
  if not tip then return nil, "could not create tooltip" end
  if type(tip.SetTrainerService) ~= "function" then return nil, "tooltip:SetTrainerService missing" end

  try(tip.SetOwner, tip, UIParent, "ANCHOR_NONE")
  try(tip.ClearLines, tip)
  local res = {
    set = try(tip.SetTrainerService, tip, index),
    item = try(tip.GetItem, tip),
    spell = try(tip.GetSpell, tip),
    text = {},
  }
  res.numLines = tip:NumLines() or 0
  for l = 1, math.min(res.numLines, 8) do
    local left = _G["TrainerCompareProbeTipTextLeft" .. l]
    local right = _G["TrainerCompareProbeTipTextRight" .. l]
    local lt = left and left:GetText() or ""
    local rt = right and right:IsShown() and right:GetText() or nil
    res.text[#res.text + 1] = rt and (lt .. " <> " .. rt) or lt
  end
  tip:Hide()
  return res
end

local function tooltipTypeName(v)
  local e = Enum and Enum.TooltipDataType
  if type(e) == "table" then
    for k, ev in pairs(e) do
      if ev == v then return k end
    end
  end
  return tostring(v)
end

local function tooltipInfo(index)
  local fn = lookup("C_TooltipInfo.GetTrainerService")
  if type(fn) ~= "function" then return nil end
  local r = try(fn, index)
  if not r.ok then return { err = r.err } end
  if type(r[1]) ~= "table" then return { err = "returned " .. fmt(r[1]) } end
  return r[1]
end

-- Gather everything we can learn about one service row.
local function collect(index)
  local c = { index = index }
  c.info = try(_G.GetTrainerServiceInfo, index)
  c.name = c.info.ok and c.info[1] or nil
  -- Classic puts the service type 3rd; WoW Forever puts it 2nd.
  local TYPES = { available = true, unavailable = true, used = true, header = true }
  if c.info.ok then
    c.kind = TYPES[c.info[2]] and c.info[2] or c.info[3]
  end
  if c.kind == "header" then return c end

  c.itemLink = try(_G.GetTrainerServiceItemLink, index)
  c.tip, c.tipErr = scanTooltip(index)
  c.tipInfo = tooltipInfo(index)

  -- Route 1: the trainer gives an item link directly.
  local link = c.itemLink.ok and c.itemLink[1] or nil
  local id = itemIDFromLink(link)
  if id then c.itemID, c.via = id, "GetTrainerServiceItemLink" end

  -- Route 2: the trainer tooltip is an item tooltip.
  if not c.itemID and c.tip and c.tip.item.ok then
    id = itemIDFromLink(c.tip.item[2])
    if id then c.itemID, c.via = id, "tooltip:GetItem" end
  end

  -- Route 3: structured tooltip data says it is an item.
  local itemType = Enum and Enum.TooltipDataType and Enum.TooltipDataType.Item
  if not c.itemID and c.tipInfo and not c.tipInfo.err and itemType ~= nil
     and c.tipInfo.type == itemType and type(c.tipInfo.id) == "number" then
    c.itemID, c.via = c.tipInfo.id, "C_TooltipInfo.GetTrainerService"
  end

  -- Spell ID, for rows where we only learn the spell.
  c.spellID = spellIDFromLink(link)
  if not c.spellID and c.tip and c.tip.spell.ok then
    for i = 1, c.tip.spell.n do
      if type(c.tip.spell[i]) == "number" then c.spellID = c.tip.spell[i] end
    end
  end
  local spellType = Enum and Enum.TooltipDataType and Enum.TooltipDataType.Spell
  if not c.spellID and c.tipInfo and not c.tipInfo.err and spellType ~= nil
     and c.tipInfo.type == spellType and type(c.tipInfo.id) == "number" then
    c.spellID = c.tipInfo.id
  end
  return c
end

local function getInstant()
  return lookup("C_Item.GetItemInfoInstant") or _G.GetItemInfoInstant
end

local function itemDetails(id, label, isRetry)
  local getInfo = lookup("C_Item.GetItemInfo") or _G.GetItemInfo
  out("    GetItemInfoInstant -> " .. show(try(getInstant(), id)))

  local info = try(getInfo, id)
  if not (info.ok and info[1]) then
    if isRetry then
      out("    GetItemInfo -> still nil after GET_ITEM_INFO_RECEIVED")
      return
    end
    pending[id] = label
    try(lookup("C_Item.RequestLoadItemDataByID"), id)
    out("    GetItemInfo -> not cached yet. Waiting for GET_ITEM_INFO_RECEIVED.")
    return
  end
  out("    GetItemInfo -> " .. show(info))
  out("    sellPrice (GetItemInfo 11th) -> " .. money(info[11]))
  out("    Auctionator: " .. auctionatorLine(info[2]))

  local getStats = lookup("C_Item.GetItemStats") or _G.GetItemStats
  local stats = try(getStats, info[2])
  if stats.ok and type(stats[1]) == "table" then
    local parts = {}
    for k, v in pairs(stats[1]) do parts[#parts + 1] = tostring(k) .. "=" .. tostring(v) end
    table.sort(parts)
    out("    GetItemStats -> " .. (#parts > 0 and table.concat(parts, ", ") or "<empty>"))
  else
    out("    GetItemStats -> " .. show(stats))
  end
end

local function printDetail(c)
  out(("[%d] GetTrainerServiceInfo -> %s"):format(c.index, show(c.info)))
  if c.kind == "header" then return end

  out("  GetTrainerServiceItemLink -> " .. show(c.itemLink))
  for _, fnName in ipairs({ "GetTrainerServiceIcon", "GetTrainerServiceCost", "GetTrainerServiceLevelReq",
                            "GetTrainerServiceSkillReq", "GetTrainerServiceSkillLine",
                            "GetTrainerServiceNumAbilityReq" }) do
    if type(_G[fnName]) == "function" then
      out("  " .. fnName .. " -> " .. show(try(_G[fnName], c.index)))
    end
  end
  local desc = try(_G.GetTrainerServiceDescription, c.index)
  if desc.ok and type(desc[1]) == "string" then
    out("  GetTrainerServiceDescription -> " .. fmt(desc[1]:sub(1, 160)))
  else
    out("  GetTrainerServiceDescription -> " .. show(desc))
  end

  if c.tip then
    out(("  tooltip:SetTrainerService -> %s; lines=%d"):format(show(c.tip.set), c.tip.numLines))
    out("  tooltip:GetItem -> " .. show(c.tip.item))
    out("  tooltip:GetSpell -> " .. show(c.tip.spell))
    out("  tooltip text: " .. table.concat(c.tip.text, " // "))
  else
    out("  tooltip scan: " .. tostring(c.tipErr))
  end

  local t = c.tipInfo
  if t and t.err then
    out("  C_TooltipInfo.GetTrainerService -> <" .. t.err .. ">")
  elseif t then
    local keys, texts = {}, {}
    for k in pairs(t) do keys[#keys + 1] = tostring(k) end
    table.sort(keys)
    if type(t.lines) == "table" then
      for li = 1, math.min(#t.lines, 4) do
        texts[#texts + 1] = tostring(type(t.lines[li]) == "table" and t.lines[li].leftText)
      end
    end
    out(("  C_TooltipInfo.GetTrainerService -> keys={%s} type=%s id=%s hyperlink=%s lines: %s")
      :format(table.concat(keys, ","), tooltipTypeName(t.type), fmt(t.id), fmt(t.hyperlink),
              table.concat(texts, " // ")))
  end

  out("  spell id " .. fmt(c.spellID) .. ", GetRecipeSchematic -> " .. schematicLine(c.spellID))
  if c.itemID then
    out(("  => OUTPUT ITEM FOUND via %s: itemID %d"):format(c.via, c.itemID))
    itemDetails(c.itemID, c.name)
  elseif c.spellID then
    out(("  => NO OUTPUT ITEM. Only a spell: spellID %d"):format(c.spellID))
    local getSpell = lookup("C_Spell.GetSpellInfo") or _G.GetSpellInfo
    out("    GetSpellInfo -> " .. show(try(getSpell, c.spellID)))
    local getLink = lookup("C_Spell.GetSpellLink") or _G.GetSpellLink
    out("    GetSpellLink -> " .. show(try(getLink, c.spellID)))
  else
    out("  => NO OUTPUT ITEM and no spell ID")
  end
end

local function printCompact(c)
  if c.kind == "header" then
    out(("[%d] header %s"):format(c.index, fmt(c.name)))
    return
  end
  local equipLoc = "-"
  if c.itemID then
    local r = try(getInstant(), c.itemID)
    equipLoc = r.ok and fmt(r[4]) or "?"
  end
  local prices = ""
  local link = c.itemLink.ok and c.itemLink[1] or nil
  if type(link) == "string" then
    local getInfo = lookup("C_Item.GetItemInfo") or _G.GetItemInfo
    local info = try(getInfo, link)
    local sell = info.ok and info[11] or nil
    local api = auctionatorAPI()
    local ah = api and show(try(api.GetAuctionPriceByItemLink, ADDON_NAME, link)) or "-"
    local age = api and show(try(api.GetAuctionAgeByItemLink, ADDON_NAME, link)) or "-"
    prices = (" sell=%s ah=%s age=%s"):format(fmt(sell), ah, age)
  end
  prices = prices .. " recipe: " .. schematicLine(c.spellID)
  out(("[%d] %s (%s) item=%s via=%s spell=%s equipLoc=%s%s")
    :format(c.index, fmt(c.name), fmt(c.kind), fmt(c.itemID), fmt(c.via), fmt(c.spellID), equipLoc, prices))
end

---------------------------------------------------------------------------
-- Probe run
---------------------------------------------------------------------------

local function run(mode)
  lines, pending = {}, {}
  save()
  out("==== Trainer Compare probe" .. (mode == "all" and " (all services)" or "") .. " ====")

  if mode ~= "all" then
    out("GetBuildInfo -> " .. show(try(GetBuildInfo)))
    out(("WOW_PROJECT_ID=%s GetExpansionLevel -> %s GetLocale -> %s")
      :format(fmt(_G.WOW_PROJECT_ID), show(try(_G.GetExpansionLevel)), show(try(GetLocale))))
    out(("Player: %s, level %s"):format(show(try(UnitClass, "player")), show(try(UnitLevel, "player"))))
    if #eventErrors > 0 then out("Event registration failed: " .. table.concat(eventErrors, ", ")) end
    reportNames("Trainer API", TRAINER_API)
    reportNames("Helper API", HELPER_API)
    scanGlobals()
    reportFrame()
    reportOtherAddons()
    reportPriceAddons()
  end

  out("IsTradeskillTrainer -> " .. show(try(_G.IsTradeskillTrainer)))
  local filters = {}
  for _, f in ipairs({ "available", "unavailable", "used" }) do
    filters[#filters + 1] = f .. "=" .. show(try(_G.GetTrainerServiceTypeFilter, f))
  end
  out("Type filters: " .. table.concat(filters, ", "))
  out("TRAINER_UPDATE events since open: " .. updateCount)

  local num = try(_G.GetNumTrainerServices)
  out("GetNumTrainerServices -> " .. show(num))
  local total = num.ok and tonumber(num[1]) or 0

  local detailed = 0
  for i = 1, total do
    if mode == "all" then
      printCompact(collect(i))
    else
      if detailed >= DETAIL_COUNT or i > MAX_ROWS_SCANNED then break end
      local c = collect(i)
      printDetail(c)
      if c.kind ~= "header" then detailed = detailed + 1 end
    end
  end

  out("==== end. /tcprobe show = copy window. /reload saves it to SavedVariables. ====")
end

local function safeRun(mode)
  local ok, err = pcall(run, mode)
  if not ok then out("probe crashed: " .. tostring(err)) end
  save()
end

---------------------------------------------------------------------------
-- Copy window
---------------------------------------------------------------------------

local copyFrame

local function buildWindow()
  local template = BackdropTemplateMixin and "BackdropTemplate" or nil
  local f = CreateFrame("Frame", "TrainerCompareProbeCopy", UIParent, template)
  f:SetSize(760, 440)
  f:SetPoint("CENTER")
  f:SetFrameStrata("DIALOG")
  f:SetMovable(true)
  f:EnableMouse(true)
  f:RegisterForDrag("LeftButton")
  f:SetScript("OnDragStart", f.StartMoving)
  f:SetScript("OnDragStop", f.StopMovingOrSizing)
  if f.SetBackdrop then
    f:SetBackdrop({
      bgFile = "Interface\\DialogFrame\\UI-DialogBox-Background",
      edgeFile = "Interface\\DialogFrame\\UI-DialogBox-Border",
      tile = true, tileSize = 32, edgeSize = 32,
      insets = { left = 8, right = 8, top = 8, bottom = 8 },
    })
  end

  local title = f:CreateFontString(nil, "OVERLAY", "GameFontNormal")
  title:SetPoint("TOP", 0, -14)
  title:SetText("Trainer Compare probe  -  Ctrl+A, then Ctrl+C")

  local close = CreateFrame("Button", nil, f, "UIPanelCloseButton")
  close:SetPoint("TOPRIGHT", -4, -4)

  local scroll = CreateFrame("ScrollFrame", "TrainerCompareProbeCopyScroll", f, "UIPanelScrollFrameTemplate")
  scroll:SetPoint("TOPLEFT", 16, -36)
  scroll:SetPoint("BOTTOMRIGHT", -34, 16)

  local edit = CreateFrame("EditBox", nil, scroll)
  edit:SetMultiLine(true)
  edit:SetAutoFocus(false)
  edit:SetFontObject(ChatFontNormal)
  edit:SetWidth(700)
  edit:SetScript("OnEscapePressed", function() f:Hide() end)
  scroll:SetScrollChild(edit)

  f.edit = edit
  tinsert(UISpecialFrames, "TrainerCompareProbeCopy")
  return f
end

local function showWindow()
  if not copyFrame then
    local ok, f = pcall(buildWindow)
    if not ok then
      print(PREFIX .. "copy window failed: " .. tostring(f) .. ". Use SavedVariables after /reload.")
      return
    end
    copyFrame = f
  end
  -- Double the pipes so raw link and color codes stay visible.
  local escaped = {}
  for i, l in ipairs(lines) do escaped[i] = (l:gsub("|", "||")) end
  copyFrame.edit:SetText(table.concat(escaped, "\n"))
  copyFrame:Show()
  copyFrame.edit:HighlightText()
  copyFrame.edit:SetFocus()
end

---------------------------------------------------------------------------
-- Events and slash command
---------------------------------------------------------------------------

local events = CreateFrame("Frame")
for _, e in ipairs({ "TRAINER_SHOW", "TRAINER_CLOSED", "TRAINER_UPDATE", "GET_ITEM_INFO_RECEIVED" }) do
  if not pcall(events.RegisterEvent, events, e) then eventErrors[#eventErrors + 1] = e end
end

events:SetScript("OnEvent", function(_, event, ...)
  if event == "TRAINER_SHOW" then
    trainerOpen = true
    updateCount = 0
    -- Give the trainer UI time to load and fill its list.
    after(0.5, function() safeRun("detail") end)
  elseif event == "TRAINER_CLOSED" then
    trainerOpen = false
  elseif event == "TRAINER_UPDATE" then
    updateCount = updateCount + 1
  elseif event == "GET_ITEM_INFO_RECEIVED" then
    local itemID, success = ...
    local label = pending[itemID]
    if label then
      pending[itemID] = nil
      out(("Late load: item %s for %s, success=%s"):format(fmt(itemID), fmt(label), fmt(success)))
      if success ~= false then itemDetails(itemID, label, true) end
      save()
    end
  end
end)

SLASH_TRAINERCOMPAREPROBE1 = "/tcprobe"
SlashCmdList.TRAINERCOMPAREPROBE = function(msg)
  msg = (msg or ""):lower():match("^%s*(.-)%s*$")
  if msg == "show" then
    showWindow()
  elseif msg == "all" or msg == "" then
    if trainerOpen then
      safeRun(msg == "all" and "all" or "detail")
    else
      print(PREFIX .. "No trainer open. Showing the last result.")
    end
    showWindow()
  else
    print(PREFIX .. "/tcprobe - run again (trainer open) and show copy window")
    print(PREFIX .. "/tcprobe all - one line per service, for the whole list")
    print(PREFIX .. "/tcprobe show - show the last result")
  end
end
