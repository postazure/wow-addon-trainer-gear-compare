const DEFAULTS: TrainerUpgradesSaved = {
  debug: false,
  onlyUpgrades: false,
  scoring: "itemLevel",
};

let current: TrainerUpgradesSaved = { ...DEFAULTS };

/** Merge saved settings over defaults and write the result back. */
export function loadDB(): TrainerUpgradesSaved {
  const saved: Partial<TrainerUpgradesSaved> = TrainerUpgradesDB ?? {};
  current = { ...DEFAULTS, ...saved };
  TrainerUpgradesDB = current;
  return current;
}

/** Current settings. Defaults until ADDON_LOADED. */
export function settings(): TrainerUpgradesSaved {
  return current;
}
