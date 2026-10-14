import type { ItemData } from "./items";
import { debug } from "./log";

/** Item class ids (C_Item.GetItemInfo, 12th value). */
const ITEM_CLASS_WEAPON = 2;
const ITEM_CLASS_ARMOR = 4;

/** Weapon subclass id of fishing poles: not compared. */
const WEAPON_FISHING_POLE = 20;

/** An item subclass and the spell that lets you use it. */
interface Proficiency {
  subclass: number;
  name: string;
  spell: number;
}

/** Index a list by subclass id. */
function bySubclass<T extends { subclass: number }>(list: T[]): Record<number, T> {
  const map: Record<number, T> = {};
  for (const entry of list) map[entry.subclass] = entry;
  return map;
}

/** Armor proficiency spells. Classic spell ids; Forever keeps Classic data. */
const ARMOR_PROFICIENCY = bySubclass<Proficiency>([
  { subclass: 1, name: "Cloth", spell: 9078 },
  { subclass: 2, name: "Leather", spell: 9077 },
  { subclass: 3, name: "Mail", spell: 8737 },
  { subclass: 4, name: "Plate", spell: 750 },
  { subclass: 6, name: "Shield", spell: 9116 },
]);

/** Weapon proficiency spells. Classic spell ids. */
const WEAPON_PROFICIENCY = bySubclass<Proficiency>([
  { subclass: 0, name: "One-Handed Axes", spell: 196 },
  { subclass: 1, name: "Two-Handed Axes", spell: 197 },
  { subclass: 2, name: "Bows", spell: 264 },
  { subclass: 3, name: "Guns", spell: 266 },
  { subclass: 4, name: "One-Handed Maces", spell: 198 },
  { subclass: 5, name: "Two-Handed Maces", spell: 199 },
  { subclass: 6, name: "Polearms", spell: 200 },
  { subclass: 7, name: "One-Handed Swords", spell: 201 },
  { subclass: 8, name: "Two-Handed Swords", spell: 202 },
  { subclass: 10, name: "Staves", spell: 227 },
  { subclass: 13, name: "Fist Weapons", spell: 15590 },
  { subclass: 15, name: "Daggers", spell: 1180 },
  { subclass: 16, name: "Thrown", spell: 2567 },
  { subclass: 18, name: "Crossbows", spell: 5011 },
  { subclass: 19, name: "Wands", spell: 5009 },
]);

/** Relics are armor subclasses locked to one class. */
const RELIC_CLASS = bySubclass([
  { subclass: 7, name: "Libram", playerClass: "PALADIN" },
  { subclass: 8, name: "Idol", playerClass: "DRUID" },
  { subclass: 9, name: "Totem", playerClass: "SHAMAN" },
]);

/** Every class knows Cloth, so it tells us whether IsPlayerSpell works for proficiencies. */
const CLOTH_SPELL = ARMOR_PROFICIENCY[1].spell;

type MainStat = "STR" | "AGI" | "INT" | "SPI";

const MAIN_STAT_KEYS: Record<MainStat, string> = {
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

function playerClass(): string {
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
    const relic = RELIC_CLASS[item.subclassID];
    if (relic !== undefined && relic.playerClass !== cls) return `${item.subType} is for another class`;
  }

  const proficiency = item.classID === ITEM_CLASS_ARMOR ? ARMOR_PROFICIENCY[item.subclassID]
    : item.classID === ITEM_CLASS_WEAPON ? WEAPON_PROFICIENCY[item.subclassID]
    : undefined;
  const spell = proficiency?.spell;
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
