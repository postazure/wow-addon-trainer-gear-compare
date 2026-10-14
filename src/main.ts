import { currentScorer, invalidate } from "./compare";
import { loadDB, settings } from "./db";
import { reopenCopyWindow } from "./copyWindow";
import { diagnoseMenus } from "./diagnose";
import { onItemInfoReceived } from "./items";
import { debug, safe, say, setDebug } from "./log";
import { findScorer, SCORERS } from "./scoring";
import { refreshHover } from "./compareTooltips";
import { rescore, scheduleRefresh } from "./rows";
import { setOnlyUsable } from "./settingsMenu";
import { dumpState, installTrainerHooks } from "./trainerUI";
import { resetUsableCache } from "./usable";

const ADDON_NAME = "TrainerCompare";
const TRAINER_UI = "Blizzard_TrainerUI";
/** From the TOC, which the build fills in from package.json. */
function addonVersion(): string {
  const read = C_AddOns.GetAddOnMetadata ?? GetAddOnMetadata;
  const version = read !== undefined ? safe("version", () => read(ADDON_NAME, "Version")) : undefined;
  return version ?? "?";
}

/** Gear, level, or known spells changed: results are stale. */
const STALE_EVENTS = ["PLAYER_EQUIPMENT_CHANGED", "PLAYER_LEVEL_UP", "SPELLS_CHANGED", "LEARNED_SPELL_IN_TAB"];

function onEvent(event: string, args: any[]): void {
  if (event === "ADDON_LOADED") {
    const name = args[0];
    if (name === ADDON_NAME) {
      const db = loadDB();
      setDebug(db.debug);
      const [, , , iface] = GetBuildInfo();
      debug(`loaded v${addonVersion()}, client interface ${iface}`);
      /** The trainer UI may already be loaded by another addon. */
      const trainerUILoaded = C_AddOns.IsAddOnLoaded(TRAINER_UI)[0];
      if (trainerUILoaded) installTrainerHooks();
    } else if (name === TRAINER_UI) {
      installTrainerHooks();
    }
  } else if (event === "TRAINER_SHOW") {
    installTrainerHooks();
    invalidate();
    scheduleRefresh();
  } else if (event === "TRAINER_UPDATE") {
    scheduleRefresh();
  } else if (event === "GET_ITEM_INFO_RECEIVED") {
    if (onItemInfoReceived(args[0], args[1])) scheduleRefresh();
  } else if (event === "MODIFIER_STATE_CHANGED") {
    refreshHover();
  } else if (STALE_EVENTS.includes(event)) {
    resetUsableCache();
    rescore();
  }
}

function onSlash(msg: string): void {
  const [cmd, arg] = msg.trim().toLowerCase().split(" ");
  const db = settings();

  if (cmd === "debug") {
    db.debug = !db.debug;
    setDebug(db.debug);
    say(`debug ${db.debug ? "on" : "off"}`);
  } else if (cmd === "filter") {
    setOnlyUsable(!db.onlyUsable);
    say(`only show usable gear: ${db.onlyUsable ? "on" : "off"}`);
  } else if (cmd === "scoring") {
    const ids = SCORERS.map((s) => s.id).join(", ");
    if (arg === undefined || arg === "") {
      say(`scoring: ${currentScorer().id} (options: ${ids})`);
      return;
    }
    const scorer = findScorer(arg);
    if (!scorer) {
      say(`unknown scoring "${arg}". Options: ${ids}`);
      return;
    }
    db.scoring = scorer.id;
    rescore();
    say(`scoring: ${scorer.id}`);
  } else if (cmd === "dump") {
    dumpState(say);
  } else if (cmd === "menus") {
    diagnoseMenus(say);
  } else if (cmd === "copy") {
    reopenCopyWindow();
  } else {
    say(`v${addonVersion()}`);
    say("/tc filter - toggle only show usable gear");
    say(`/tc scoring [${SCORERS.map((s) => s.id).join("|")}] - how gear is scored`);
    say("/tc debug - toggle debug messages");
    say("/tc dump - show hook status and what each visible row resolved to");
    say("/tc menus - find how the trainer's dropdowns and compare tooltips work");
    say("/tc copy - reopen the last copy window");
  }
}

/** Our event frame. Unknown events throw in some clients, so each is registered on its own and skipped quietly. */
const events = CreateFrame("Frame");
for (const event of ["ADDON_LOADED", "TRAINER_SHOW", "TRAINER_UPDATE", "GET_ITEM_INFO_RECEIVED", "MODIFIER_STATE_CHANGED", ...STALE_EVENTS]) {
  safe(`register ${event}`, () => events.RegisterEvent(event));
}
events.SetScript("OnEvent", (_frame, event, ...args: any[]) => {
  safe(`event ${event}`, () => onEvent(event, args));
});

SLASH_TRAINERCOMPARE1 = "/tc";
SlashCmdList["TRAINERCOMPARE"] = (msg) => {
  safe("slash command", () => onSlash(msg));
};
