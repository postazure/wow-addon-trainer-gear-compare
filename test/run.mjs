// Runs the built addon inside a mock WoW client (fengari = Lua 5.3 in JS).
// The mock is seeded with real values from the probe on WoW Forever 1.60.1.
// Each suite gets a fresh Lua state.
import fengari from "fengari";
import { readFileSync } from "node:fs";

const { lua, lauxlib, lualib, to_luastring } = fengari;

function runChunk(L, code, name, args = []) {
  if (lauxlib.luaL_loadbuffer(L, to_luastring(code), null, to_luastring(name)) !== lua.LUA_OK) {
    throw new Error(lua.lua_tojsstring(L, -1));
  }
  for (const a of args) lua.lua_pushstring(L, to_luastring(a));
  if (lua.lua_pcall(L, args.length, 0, 0) !== lua.LUA_OK) throw new Error(lua.lua_tojsstring(L, -1));
}

const file = (path) => [readFileSync(path, "utf8"), path];

function suite(steps) {
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  runChunk(L, ...file("test/wow-mock.lua"));
  for (const [code, name] of steps.pre ?? []) runChunk(L, code, name);
  runChunk(L, ...file("dist/TrainerCompare/TrainerCompare.lua"), ["TrainerCompare"]);
  runChunk(L, ...file("test/fixtures.lua"));
  runChunk(L, ...file(steps.test));
}

try {
  suite({ test: "test/trainer.test.lua" });
  suite({
    pre: [[
      "Menu = nil; TooltipComparisonManager = nil; GetCoinTextureString = nil\n" +
      // No GameTooltipTemplate: our recipe box can't be made, so our lines go under the item.
      "local createFrame = CreateFrame\n" +
      "CreateFrame = function(kind, ...) if kind == 'GameTooltip' then return nil end return createFrame(kind, ...) end",
      "no modern APIs",
    ]],
    test: "test/fallback.test.lua",
  });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
