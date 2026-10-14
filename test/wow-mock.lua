-- Minimal WoW Forever mock. Shapes and return orders come from the probe.
unpack = unpack or table.unpack

output = {}
DEFAULT_CHAT_FRAME = {}
function DEFAULT_CHAT_FRAME:AddMessage(text) output[#output + 1] = text end
function print(...)
  local parts = {}
  for i = 1, select("#", ...) do parts[#parts + 1] = tostring((select(i, ...))) end
  DEFAULT_CHAT_FRAME:AddMessage(table.concat(parts, " "))
end
UISpecialFrames = {}
ChatFontNormal = {}
BackdropTemplateMixin = {}
-- Modern menu API: prints open menu tags to chat, like Blizzard's.
openMenuTag = nil
menuCallbacks = {}
Menu = {
  ModifyMenu = function(tag, fn) menuCallbacks[tag] = fn end,
  PrintOpenMenuTags = function() if openMenuTag then print(openMenuTag) end end,
}
-- Generate a menu the way Blizzard does on open; returns what was added.
function openMenu(tag)
  local items = {}
  local root = {}
  function root:CreateDivider() items[#items + 1] = { kind = "divider" } end
  function root:CreateTitle(text) items[#items + 1] = { kind = "title", text = text } end
  function root:CreateCheckbox(text, isSelected, setSelected)
    items[#items + 1] = { kind = "checkbox", text = text, isSelected = isSelected, setSelected = setSelected }
  end
  if menuCallbacks[tag] then menuCallbacks[tag](nil, root, nil) end
  return items
end
function date() return "now" end

-- Localized strings the addon reads from _G.
ITEM_MOD_STRENGTH_SHORT = "Strength"
ITEM_MOD_AGILITY_SHORT = "Agility"
ITEM_MOD_INTELLECT_SHORT = "Intellect"
ITEM_MOD_SPIRIT_SHORT = "Spirit"
ITEM_MOD_STAMINA_SHORT = "Stamina"
ITEM_MOD_DAMAGE_PER_SECOND_SHORT = "Damage Per Second"
MAINHANDSLOT = "Main Hand"
SECONDARYHANDSLOT = "Off Hand"
FINGER0SLOT = "Finger"
FINGER1SLOT = "Finger"
WAISTSLOT = "Waist"
WRISTSLOT = "Wrist"
HANDSSLOT = "Hands"

-- Timers run when the test calls flush().
local timers = {}
C_Timer = { After = function(s, fn) timers[#timers + 1] = fn end }
function flush()
  while #timers > 0 do
    local t = timers
    timers = {}
    for _, fn in ipairs(t) do fn() end
  end
end

SlashCmdList = {}
function hooksecurefunc(a, b, c)
  if type(a) == "table" then
    local orig = a[b]
    a[b] = function(...) local r = { orig(...) }; c(...); return unpack(r) end
  else
    local orig = _G[a]
    _G[a] = function(...) local r = { orig(...) }; b(...); return unpack(r) end
  end
end

-- Widgets ------------------------------------------------------------------

local function newRegion()
  local r = { shown = true, alpha = 1 }
  function r:Show() self.shown = true end
  function r:Hide() self.shown = false end
  function r:IsShown() return self.shown end
  function r:SetPoint(point, rel, relPoint, x, y) self.point = { point, rel, relPoint, x, y } end
  function r:ClearAllPoints() self.point = nil end
  function r:GetRight() return self.right or 700 end
  function r:GetLeft() return self.left or 500 end
  function r:GetWidth() return self.width or 200 end
  function r:GetEffectiveScale() return self.scale or 1 end
  function r:SetSize() end
  function r:SetAlpha(a) self.alpha = a end
  function r:GetAlpha() return self.alpha end
  function r:SetTexture(p) self.texture = p end
  function r:SetColorTexture() self.texture = "color" end
  function r:SetVertexColor() end
  function r:SetTexCoord() end
  function r:SetText(t) self.text = t end
  function r:GetText() return self.text end
  return r
end

handlers = {}
function CreateFrame(kind, name, parent)
  local f = newRegion()
  f.kind = kind
  function f:GetObjectType() return kind end
  f.scripts = {}
  function f:RegisterEvent() end
  function f:SetScript(n, fn) self.scripts[n] = fn; if kind == "Frame" and n == "OnEvent" then handlers.OnEvent = fn end end
  f.textures = {}
  function f:CreateTexture() local t = newRegion(); self.textures[#self.textures + 1] = t; return t end
  function f:CreateFontString() return newRegion() end
  function f:GetID() return 0 end
  function f:SetChecked(v) self.checked = v end
  for _, m in ipairs({ "SetFrameStrata", "SetMovable", "EnableMouse", "RegisterForDrag", "StartMoving",
    "StopMovingOrSizing", "SetWidth", "SetMultiLine", "SetAutoFocus", "SetFontObject", "SetFocus",
    "SetScrollChild", "SetBackdrop" }) do f[m] = function() end end
  function f:HighlightText() self.highlighted = true end
  function f:GetChecked() return self.checked end
  if name then _G[name] = f end
  if kind == "EditBox" then lastEditBox = f end
  return f
end
UIParent = CreateFrame("Frame")

GameTooltip = CreateFrame("Frame")
GameTooltip.lines = {}
function GameTooltip:SetOwner() self.lines = {}; self.shown = true end
function GameTooltip:HookScript(name, fn)
  local prev = self.scripts[name]
  self.scripts[name] = function(...) if prev then prev(...) end fn(...) end
end
function GameTooltip:Hide() self.shown = false; if self.scripts.OnHide then self.scripts.OnHide(self) end end
UIParent.right = 1000

-- Built-in compare tooltips. Record which equipped slot each one shows.
for i = 1, 2 do
  local tip = CreateFrame("Frame", "ShoppingTooltip" .. i)
  tip.shown = false
  function tip:SetOwner() end
  function tip:SetInventoryItem(unit, slot) self.slot = slot end
  function tip:Hide() self.shown = false; self.slot = nil; self.native = nil end
  tip.CompareHeader = newRegion()
  tip.CompareHeader.shown = false
end

-- Native compare. Shows the item's GUID in ShoppingTooltip1, like Blizzard would.
nativeWorks = true
noGuid = {}
compareCleared = 0
TooltipComparisonManager = {}
function TooltipComparisonManager:CreateComparisonItem(data) return { guid = data.guid } end
function TooltipComparisonManager:CompareItem(item, tooltip)
  if not nativeWorks then return end
  ShoppingTooltip1.native = item.guid
  ShoppingTooltip1.shown = true
end
function TooltipComparisonManager:Clear() compareCleared = compareCleared + 1 end
C_TooltipInfo = {
  GetHyperlink = function(link)
    local id = tonumber(link:match("item:(%d+)"))
    if noGuid[id] then return {} end
    return { guid = "Item-" .. id }
  end,
}
shiftDown = false
alwaysCompare = false
function IsModifiedClick(action) return action == "COMPAREITEMS" and shiftDown end
function GetCVarBool(name) return name == "alwaysCompareItems" and alwaysCompare end
-- Hover a trainer row the way Blizzard does: SetOwner, then SetTrainerService.
function hover(index)
  GameTooltip:SetOwner(UIParent, "ANCHOR_RIGHT")
  GameTooltip:SetTrainerService(index)
end
function compareSlots()
  local slots = {}
  for i = 1, 2 do
    local tip = _G["ShoppingTooltip" .. i]
    if tip.shown and tip.slot then slots[#slots + 1] = tip.slot end
  end
  return table.concat(slots, ",")
end
function GameTooltip:SetText(t) self.lines = { t } end
function GameTooltip:AddLine(t) self.lines[#self.lines + 1] = t end
function GameTooltip:SetTrainerService(i) self.lines = { "service " .. i } end
function lineIndex(text)
  for i, l in ipairs(GameTooltip.lines) do if l == text then return i end end
  return nil
end
function tooltipHas(text)
  for _, l in ipairs(GameTooltip.lines) do if l:find(text, 1, true) then return true end end
  return false
end

-- Items -------------------------------------------------------------------
-- itemID -> { name, ilvl, minLevel, subType, equipLoc, classID, subclassID, stats, cached }
items = {}
local function idOf(item)
  if type(item) == "number" then return item end
  return tonumber(item:match("item:(%d+)"))
end
local function itemLink(id, name)
  return "|cnIQ1:|Hitem:" .. id .. "::::::::17:1486:::1:3524::::::|h[" .. name .. "]|h|r"
end
function addItem(id, def)
  def.link = itemLink(id, def.name)
  if def.cached == nil then def.cached = true end
  items[id] = def
  return def.link
end
requested = {}
C_Item = {
  GetItemInfoInstant = function(item)
    local d = items[idOf(item)]
    if not d then return nil end
    return idOf(item), "Type", d.subType, d.equipLoc, 1, d.classID, d.subclassID
  end,
  GetItemInfo = function(item)
    local d = items[idOf(item)]
    if not d or not d.cached then return nil end
    return d.name, d.link, 1, d.ilvl, d.minLevel, "Type", d.subType, 1, d.equipLoc, 1, 1, d.classID, d.subclassID
  end,
  GetDetailedItemLevelInfo = function(item)
    local d = items[idOf(item)]
    return d and d.cached and d.ilvl or nil
  end,
  GetItemStats = function(link)
    local d = items[idOf(link)]
    local copy = {}
    for k, v in pairs(d and d.stats or {}) do copy[k] = v end
    return copy
  end,
  RequestLoadItemDataByID = function(id) requested[id] = true end,
}

-- Player ------------------------------------------------------------------
playerClass = "PALADIN"
playerLevel = 17
knownSpells = { [9078] = true, [9077] = true, [8737] = true, [9116] = true, [198] = true, [199] = true }
equippedLinks = {}
function UnitClass() return "Paladin", playerClass, 2 end
function UnitLevel() return playerLevel end
function IsPlayerSpell(id) return knownSpells[id] == true end
function GetInventoryItemLink(unit, slot) return equippedLinks[slot] end
local SLOT_IDS = { HEADSLOT = 1, NECKSLOT = 2, SHOULDERSLOT = 3, CHESTSLOT = 5, WAISTSLOT = 6, LEGSSLOT = 7,
  FEETSLOT = 8, WRISTSLOT = 9, HANDSSLOT = 10, FINGER0SLOT = 11, FINGER1SLOT = 12, TRINKET0SLOT = 13,
  TRINKET1SLOT = 14, BACKSLOT = 15, MAINHANDSLOT = 16, SECONDARYHANDSLOT = 17, RANGEDSLOT = 18 }
function GetInventorySlotInfo(name) return SLOT_IDS[name] end
function GetBuildInfo() return "1.60.1", "70374", "Oct 12 2026", 16001 end

-- Trainer -----------------------------------------------------------------
-- services[i] = { name, type, link or nil, category }
services = {}
function GetNumTrainerServices() return #services end
function GetTrainerServiceInfo(i)
  local s = services[i]
  if not s then return nil end
  return s.name, s.type, 133476, 0, "", s.category  -- Forever order, from the probe
end
function GetTrainerServiceItemLink(i) return services[i] and services[i].link end

local trainerLoaded = false
C_AddOns = { IsAddOnLoaded = function(name) return name == "Blizzard_TrainerUI" and trainerLoaded, true end }

-- Rows: list of { button, data }. Mirrors a ScrollBox with ForEachFrame.
rows = {}
function makeRow(data, label)
  local b = CreateFrame("Button")
  b.name = newRegion()
  b.name.text = label
  b.icon = newRegion()
  return { button = b, data = data }
end

function loadTrainerUI()
  ClassTrainerFrame = CreateFrame("Frame", "ClassTrainerFrame")
  ClassTrainerFrame.ScrollBox = CreateFrame("Frame")
  if withTrainButton ~= false then CreateFrame("Button", "ClassTrainerTrainButton", ClassTrainerFrame) end
  function ClassTrainerFrame.ScrollBox:ForEachFrame(fn)
    for _, r in ipairs(rows) do fn(r.button, r.data) end
  end
  function ClassTrainerFrame.ScrollBox:RegisterCallback() end
  function ClassTrainerFrame_InitServiceButton(button, data) end
  function ClassTrainerFrame_InitCategoryButton(button, data) end
  -- Like Blizzard: lay out each row through the global init functions.
  function ClassTrainerFrame_Update()
    for _, r in ipairs(rows) do
      if r.data.categoryName then ClassTrainerFrame_InitCategoryButton(r.button, r.data)
      else ClassTrainerFrame_InitServiceButton(r.button, r.data) end
    end
  end
  trainerLoaded = true
end

function fire(event, ...) handlers.OnEvent(nil, event, ...) end

-- Assertions --------------------------------------------------------------
local passed = 0
function check(cond, msg)
  if not cond then error("FAIL: " .. msg, 2) end
  passed = passed + 1
end
function passCount() return passed end

-- Marker state for a row: "upgrade", "same", or "none".
function marker(row)
  for _, t in ipairs(row.button.textures) do
    if t.shown and t.texture == "Interface\\Buttons\\UI-MicroStream-Green" then return "upgrade" end
    if t.shown and t.texture == "color" then return "same" end
  end
  return "none"
end

function report(suite)
  io.write(suite .. ": " .. passCount() .. " checks passed\n")
end
