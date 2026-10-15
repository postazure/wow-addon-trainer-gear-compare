import { invalidate } from "./compare";
import { loadDB } from "./db";
import { onItemInfoReceived } from "./items";
import { debug, safe } from "./log";
import { refreshHover } from "./compareTooltips";
import { recheck, scheduleRefresh } from "./rows";
import { installTrainerHooks } from "./trainerUI";
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
      loadDB();
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
    /** Next frame, after Blizzard: it may hide its own compare when Shift is released. */
    C_Timer.After(0, () => safe("refresh hover", refreshHover));
  } else if (STALE_EVENTS.includes(event)) {
    resetUsableCache();
    recheck();
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

