const DEFAULTS: TrainerUpgradesSaved = {
  debug: false,
  onlyUpgrades: false,
  scoring: "itemLevel",
};

/** Merge saved settings over defaults and write the result back. */
export function loadDB(): TrainerUpgradesSaved {
  const saved: Partial<TrainerUpgradesSaved> = TrainerUpgradesDB ?? {};
  const db: TrainerUpgradesSaved = { ...DEFAULTS, ...saved };
  TrainerUpgradesDB = db;
  return db;
}
