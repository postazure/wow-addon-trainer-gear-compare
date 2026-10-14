// Smoke test: run the built bundle in a mock WoW client (fengari = Lua in JS).
// Checks load, slash commands, saved settings, and that errors stay silent.
import fengari from "fengari";
import { readFileSync } from "node:fs";

const { lua, lauxlib, lualib, to_luastring } = fengari;

const MOCK = String.raw`
output = {}
function print(...)
  local parts = {}
  for i = 1, select("#", ...) do parts[#parts + 1] = tostring((select(i, ...))) end
  output[#output + 1] = table.concat(parts, " ")
end
function date() return "now" end
SlashCmdList = {}
handlers = {}
function CreateFrame()
  local f = {}
  function f:RegisterEvent() end
  function f:SetScript(name, fn) handlers[name] = fn end
  return f
end
buildFails = false
function GetBuildInfo()
  if buildFails then error("boom") end
  return "1.6.0", "1", "today", 16001
end
function fire(event, ...) handlers.OnEvent(nil, event, ...) end
function saw(text)
  for _, line in ipairs(output) do
    if line:find(text, 1, true) then return true end
  end
  return false
end
function check(cond, msg) if not cond then error("FAIL: " .. msg, 2) end end
`;

const TESTS = String.raw`
-- First load: no saved settings yet.
fire("ADDON_LOADED", "TrainerUpgrades")
check(TrainerUpgradesDB ~= nil, "DB created on load")
check(TrainerUpgradesDB.debug == false, "debug defaults off")
check(TrainerUpgradesDB.scoring == "itemLevel", "scoring defaults to itemLevel")
check(#output == 0, "silent load when debug is off")

-- Other addons loading must be ignored.
TrainerUpgradesDB.onlyUpgrades = true
fire("ADDON_LOADED", "SomeOtherAddon")
check(TrainerUpgradesDB.onlyUpgrades == true, "other ADDON_LOADED ignored")

-- Slash commands.
SlashCmdList.TRAINERUPGRADES("")
check(saw("/tu debug"), "help lists /tu debug")
SlashCmdList.TRAINERUPGRADES("  DEBUG ")
check(TrainerUpgradesDB.debug == true, "/tu debug turns debug on")
check(saw("debug on"), "/tu debug reports on")

-- Errors: silent with debug off, reported with debug on.
SlashCmdList.TRAINERUPGRADES("debug")
output = {}
buildFails = true
fire("ADDON_LOADED", "TrainerUpgrades")
check(#output == 0, "error is silent with debug off")
TrainerUpgradesDB.debug = true
fire("ADDON_LOADED", "TrainerUpgrades")
check(saw("failed"), "error reported with debug on")
buildFails = false

-- Saved settings survive a reload.
fire("ADDON_LOADED", "TrainerUpgrades")
check(TrainerUpgradesDB.onlyUpgrades == true, "saved settings kept")

fire("TRAINER_SHOW")
fire("TRAINER_CLOSED")
`;

function run(L, code, name) {
  if (lauxlib.luaL_loadbuffer(L, to_luastring(code), null, to_luastring(name)) !== lua.LUA_OK ||
      lua.lua_pcall(L, 0, 0, 0) !== lua.LUA_OK) {
    throw new Error(lua.lua_tojsstring(L, -1));
  }
}

const L = lauxlib.luaL_newstate();
lualib.luaL_openlibs(L);
run(L, MOCK, "mock");

// Load the bundle with the same varargs WoW passes: addon name, private table.
const bundle = readFileSync("dist/TrainerUpgrades/TrainerUpgrades.lua", "utf8");
if (lauxlib.luaL_loadbuffer(L, to_luastring(bundle), null, to_luastring("TrainerUpgrades.lua")) !== lua.LUA_OK) {
  throw new Error(lua.lua_tojsstring(L, -1));
}
lua.lua_pushstring(L, to_luastring("TrainerUpgrades"));
lua.lua_newtable(L);
if (lua.lua_pcall(L, 2, 0, 0) !== lua.LUA_OK) throw new Error(lua.lua_tojsstring(L, -1));

try {
  run(L, TESTS, "smoke");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
console.log("smoke test passed");
