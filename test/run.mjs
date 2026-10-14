// Runs the built addon inside a mock WoW client (fengari = Lua 5.3 in JS).
// The mock is seeded with real values from the probe on WoW Forever 1.60.1.
import fengari from "fengari";
import { readFileSync } from "node:fs";

const { lua, lauxlib, lualib, to_luastring } = fengari;
const L = lauxlib.luaL_newstate();
lualib.luaL_openlibs(L);

function load(path, args = []) {
  const code = readFileSync(path, "utf8");
  if (lauxlib.luaL_loadbuffer(L, to_luastring(code), null, to_luastring(path)) !== lua.LUA_OK) {
    throw new Error(lua.lua_tojsstring(L, -1));
  }
  for (const a of args) lua.lua_pushstring(L, to_luastring(a));
  if (lua.lua_pcall(L, args.length, 0, 0) !== lua.LUA_OK) throw new Error(lua.lua_tojsstring(L, -1));
}

try {
  load("test/wow-mock.lua");
  load("dist/TrainerUpgrades/TrainerUpgrades.lua", ["TrainerUpgrades"]);
  load("test/trainer.test.lua");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
