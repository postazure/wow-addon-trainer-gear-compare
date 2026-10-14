// Copy the built addon into your WoW AddOns folder.
// Set WOW_ADDONS_DIR, for example:
//   WOW_ADDONS_DIR="/c/Program Files/World of Warcraft/_forever_/Interface/AddOns" npm run deploy
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const target = process.env.WOW_ADDONS_DIR;
if (!target || !existsSync(target)) {
  console.error("Set WOW_ADDONS_DIR to your Interface/AddOns folder.");
  process.exit(1);
}
cpSync("dist/TrainerUpgrades", join(target, "TrainerUpgrades"), { recursive: true, force: true });
console.log(`deployed to ${join(target, "TrainerUpgrades")}`);
