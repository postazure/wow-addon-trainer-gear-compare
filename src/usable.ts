import type { ItemData } from "./items";
import { debug } from "./log";

const ITEM_CLASS_WEAPON = 2;
const ITEM_CLASS_ARMOR = 4;
const WEAPON_FISHING_POLE = 20;

/** Proficiency spell per subclass. Classic spell ids; Forever keeps Classic data. */
const ARMOR_SPELL: Record<number, number> = {
  1: 9078, // Cloth
  2: 9077, // Leather
  3: 8737, // Mail
  4: 750, // Plate
  6: 9116, // Shield
};

const WEAPON_SPELL: Record<number, number> = {
  0: 196, // One-Handed Axes
  1: 197, // Two-Handed Axes
  2: 264, // Bows
  3: 266, // Guns
  4: 198, // One-Handed Maces
  5: 199, // Two-Handed Maces
  6: 200, // Polearms
  7: 201, // One-Handed Swords
  8: 202, // Two-Handed Swords
  10: 227, // Staves
  13: 15590, // Fist Weapons
  15: 1180, // Daggers
  16: 2567, // Thrown
  18: 5011, // Crossbows
  19: 5009, // Wands
};

/** Relics are class locked. */
const RELIC_CLASS: Record<number, string> = {
  7: "PALADIN", // Libram
  8: "DRUID", // Idol
  9: "SHAMAN", // Totem
};

const CLOTH_SPELL = 9078;

export type MainStat = "STR" | "AGI" | "INT" | "SPI";

export const MAIN_STAT_KEYS: Record<MainStat, string> = {
  STR: "ITEM_MOD_STRENGTH_SHORT",
  AGI: "ITEM_MOD_AGILITY_SHORT",
  INT: "ITEM_MOD_INTELLECT_SHORT",
  SPI: "ITEM_MOD_SPIRIT_SHORT",
};

/** Main stats that are useful for each class. Stamina is fine for everyone. */
const CLASS_MAIN_STATS: Record<string, MainStat[]> = {
  WARRIOR: ["STR", "AGI"],
  ROGUE: ["AGI", "STR"],
  HUNTER: ["AGI", "INT"],
  PALADIN: ["STR", "AGI", "INT"],
  SHAMAN: ["STR", "AGI", "INT"],
  DRUID: ["STR", "AGI", "INT", "SPI"],
  MAGE: ["INT", "SPI"],
  PRIEST: ["INT", "SPI"],
  WARLOCK: ["INT", "SPI"],
};

export function playerClass(): string {
  return UnitClass("player")[1];
}

let proficiencyChecked = false;
let proficiencyWorks = false;

/**
 * Every class knows Cloth. If IsPlayerSpell says no, proficiency spells do
 * not work in this client, so skip that check instead of hiding everything.
 */
function canCheckProficiency(): boolean {
  if (!proficiencyChecked) {
    proficiencyChecked = true;
    proficiencyWorks = IsPlayerSpell(CLOTH_SPELL);
    if (!proficiencyWorks) debug("IsPlayerSpell(Cloth) is false; skipping proficiency checks");
  }
  return proficiencyWorks;
}

/** Spells change when you train a weapon skill. */
export function resetUsableCache(): void {
  proficiencyChecked = false;
}

export function isFishingPole(item: ItemData): boolean {
  return item.classID === ITEM_CLASS_WEAPON && item.subclassID === WEAPON_FISHING_POLE;
}

/** Reason the player can't use this item, or undefined if they can. */
export function unusableReason(item: ItemData): string | undefined {
  if (item.minLevel > UnitLevel("player")) return `Requires level ${item.minLevel}`;

  const cls = playerClass();
  if (item.classID === ITEM_CLASS_ARMOR) {
    const relicClass = RELIC_CLASS[item.subclassID];
    if (relicClass !== undefined && relicClass !== cls) return `${item.subType} is for another class`;
  }

  const spell = item.classID === ITEM_CLASS_ARMOR ? ARMOR_SPELL[item.subclassID]
    : item.classID === ITEM_CLASS_WEAPON ? WEAPON_SPELL[item.subclassID]
    : undefined;
  if (spell !== undefined && canCheckProficiency() && !IsPlayerSpell(spell)) {
    return `${item.subType} not learned`;
  }

  const wanted = CLASS_MAIN_STATS[cls];
  if (wanted !== undefined) {
    let hasMain = false;
    let hasWanted = false;
    for (const stat of ["STR", "AGI", "INT", "SPI"] as MainStat[]) {
      if ((item.stats[MAIN_STAT_KEYS[stat]] ?? 0) > 0) {
        hasMain = true;
        if (wanted.includes(stat)) hasWanted = true;
      }
    }
    if (hasMain && !hasWanted) return "No main stats for your class";
  }
  return undefined;
}
