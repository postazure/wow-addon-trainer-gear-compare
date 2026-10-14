const DEFAULTS: TrainerUpgradesSaved = {
  debug: false,
  onlyUsable: false,
  scoring: "itemLevel",
};

let current: TrainerUpgradesSaved = { ...DEFAULTS };

/**
 * Load saved settings over defaults and write the result back.
 * Only known keys are kept, so settings removed in later versions drop out.
 */
export function loadDB(): TrainerUpgradesSaved {
  const saved = (TrainerUpgradesDB ?? {}) as Record<string, unknown>;
  const merged = { ...DEFAULTS } as Record<string, unknown>;
  for (const key of Object.keys(DEFAULTS)) {
    if (typeof saved[key] === typeof merged[key]) merged[key] = saved[key];
  }
  current = merged as unknown as TrainerUpgradesSaved;
  TrainerUpgradesDB = current;
  return current;
}

/** Current settings. Defaults until ADDON_LOADED. */
export function settings(): TrainerUpgradesSaved {
  return current;
}
