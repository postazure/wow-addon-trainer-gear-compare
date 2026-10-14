import { loadDB } from "./db";
import { debug, safe, say, setDebug } from "./log";

const ADDON_NAME = "TrainerUpgrades";
const VERSION = "0.1.0";

let db: TrainerUpgradesSaved | undefined;

function onEvent(event: string, args: any[]): void {
  if (event === "ADDON_LOADED") {
    if (args[0] !== ADDON_NAME) return;
    db = loadDB();
    setDebug(db.debug);
    const [, , , iface] = GetBuildInfo();
    debug(`loaded v${VERSION}, client interface ${iface}`);
  } else if (event === "TRAINER_SHOW") {
    // Trainer hooks land here once the probe output confirms the API.
    debug("trainer opened");
  } else if (event === "TRAINER_CLOSED") {
    debug("trainer closed");
  }
}

function onSlash(msg: string): void {
  const cmd = msg.trim().toLowerCase();
  if (cmd === "debug" && db) {
    db.debug = !db.debug;
    setDebug(db.debug);
    say(`debug ${db.debug ? "on" : "off"}`);
  } else {
    say(`v${VERSION}`);
    say("/tu debug - toggle debug messages");
  }
}

const events = CreateFrame("Frame");
events.RegisterEvent("ADDON_LOADED");
events.RegisterEvent("TRAINER_SHOW");
events.RegisterEvent("TRAINER_CLOSED");
events.SetScript("OnEvent", (_frame, event, ...args: any[]) => {
  safe(`event ${event}`, () => onEvent(event, args));
});

SLASH_TRAINERUPGRADES1 = "/tu";
SlashCmdList["TRAINERUPGRADES"] = (msg) => {
  safe("slash command", () => onSlash(msg));
};
