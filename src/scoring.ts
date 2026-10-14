import type { ItemData } from "./items";
import { playerClass } from "./usable";

/**
 * A way to score an item. Higher is better.
 * To add one: write a Scorer and add it to SCORERS.
 */
export interface Scorer {
  id: string;
  label: string;
  score(item: ItemData): number;
  /** Score for main hand + off hand, compared against a two-hander. Undefined = empty slot. */
  pair(mainHand: number | undefined, offHand: number | undefined): number;
}

export const itemLevelScorer: Scorer = {
  id: "itemLevel",
  label: "item level",
  score: (item) => item.itemLevel,
  // Average, with an empty hand counted as 0.
  pair: (a, b) => ((a ?? 0) + (b ?? 0)) / 2,
};

type Weights = Record<string, number>;

const DPS = "ITEM_MOD_DAMAGE_PER_SECOND_SHORT";
const STR = "ITEM_MOD_STRENGTH_SHORT";
const AGI = "ITEM_MOD_AGILITY_SHORT";
const INT = "ITEM_MOD_INTELLECT_SHORT";
const SPI = "ITEM_MOD_SPIRIT_SHORT";
const STA = "ITEM_MOD_STAMINA_SHORT";
const ARMOR = "RESISTANCE0_NAME";

const CASTER: Weights = { [INT]: 1, [SPI]: 0.7, [STA]: 0.5, [ARMOR]: 0.01, [DPS]: 0.1 };

/** Simple per-class weights. Rough on purpose: a tie-breaker, not a sim. */
const CLASS_WEIGHTS: Record<string, Weights> = {
  WARRIOR: { [STR]: 1, [AGI]: 0.7, [STA]: 0.5, [ARMOR]: 0.03, [DPS]: 2.5 },
  ROGUE: { [AGI]: 1, [STR]: 0.5, [STA]: 0.4, [ARMOR]: 0.02, [DPS]: 2.5 },
  HUNTER: { [AGI]: 1, [INT]: 0.4, [STA]: 0.4, [ARMOR]: 0.02, [DPS]: 2 },
  PALADIN: { [STR]: 1, [INT]: 0.6, [AGI]: 0.4, [STA]: 0.5, [SPI]: 0.2, [ARMOR]: 0.03, [DPS]: 2 },
  SHAMAN: { [STR]: 0.8, [INT]: 0.8, [AGI]: 0.4, [STA]: 0.5, [SPI]: 0.3, [ARMOR]: 0.02, [DPS]: 1.5 },
  DRUID: { [INT]: 0.8, [STR]: 0.6, [AGI]: 0.6, [SPI]: 0.5, [STA]: 0.5, [ARMOR]: 0.02, [DPS]: 0.5 },
  MAGE: CASTER,
  PRIEST: CASTER,
  WARLOCK: CASTER,
};

export const statWeightScorer: Scorer = {
  id: "statWeights",
  label: "stat weights",
  score: (item) => {
    const weights = CLASS_WEIGHTS[playerClass()] ?? {};
    let total = 0;
    for (const [key, value] of Object.entries(item.stats)) {
      total += value * (weights[key] ?? 0);
    }
    return total;
  },
  pair: (a, b) => (a ?? 0) + (b ?? 0),
};

export const SCORERS: Scorer[] = [itemLevelScorer, statWeightScorer];

export function findScorer(id: string): Scorer | undefined {
  const wanted = id.toLowerCase();
  return SCORERS.find((s) => s.id.toLowerCase() === wanted);
}
