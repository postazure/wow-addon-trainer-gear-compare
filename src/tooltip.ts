import type { Evaluation } from "./compare";
import { itemLevelScorer } from "./scoring";

export interface TooltipLine {
  text: string;
  r: number;
  g: number;
  b: number;
}

const GRAY_LINE = (text: string): TooltipLine => ({ text, r: 0.6, g: 0.6, b: 0.6 });

function num(n: number): string {
  return n === Math.floor(n) ? `${n}` : string.format("%.1f", n);
}

function signed(n: number): string {
  return n === Math.floor(n) ? string.format("%+d", n) : string.format("%+.1f", n);
}

function statName(key: string): string {
  const name = _G[key];
  return typeof name === "string" ? name : key;
}

/** Display order, like an item tooltip. Anything else follows, sorted. */
const STAT_ORDER = [
  "ITEM_MOD_DAMAGE_PER_SECOND_SHORT", "RESISTANCE0_NAME",
  "ITEM_MOD_STRENGTH_SHORT", "ITEM_MOD_AGILITY_SHORT", "ITEM_MOD_STAMINA_SHORT",
  "ITEM_MOD_INTELLECT_SHORT", "ITEM_MOD_SPIRIT_SHORT",
  "RESISTANCE1_NAME", "RESISTANCE2_NAME", "RESISTANCE3_NAME", "RESISTANCE4_NAME",
  "RESISTANCE5_NAME", "RESISTANCE6_NAME",
];

function orderOf(key: string): number {
  const i = STAT_ORDER.indexOf(key);
  return i >= 0 ? i : STAT_ORDER.length;
}

function globalString(name: string, fallback: string): string {
  const value = _G[name];
  return typeof value === "string" ? value : fallback;
}

/**
 * Stat changes if the new item replaces the equipped one(s), laid out like
 * the built-in compare: a heading, then one stat per line, green or red.
 */
function statLines(ev: Evaluation): TooltipLine[] {
  if (!ev.item || !ev.versus) return [];
  const diff: Record<string, number> = {};
  for (const [k, v] of Object.entries(ev.item.stats)) diff[k] = (diff[k] ?? 0) + v;
  for (const old of ev.versus.items) {
    for (const [k, v] of Object.entries(old.stats)) diff[k] = (diff[k] ?? 0) - v;
  }

  // No `||` on numbers here: 0 is truthy in Lua.
  const keys = Object.keys(diff).sort((a, b) => {
    const byOrder = orderOf(a) - orderOf(b);
    if (byOrder !== 0) return byOrder;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const lines: TooltipLine[] = [];
  for (const key of keys) {
    const d = Math.floor(diff[key] * 10 + 0.5) / 10;
    if (d === 0) continue;
    lines.push(d > 0
      ? { text: `${signed(d)} ${statName(key)}`, r: 0.1, g: 1, b: 0.1 }
      : { text: `${signed(d)} ${statName(key)}`, r: 1, g: 0.25, b: 0.25 });
  }
  if (lines.length === 0) return [];

  const heading = ev.versus.items.length > 1
    ? globalString("ITEM_DELTA_MULTIPLE_COMPARISON_DESCRIPTION", "If you replace these items, the following stat changes will occur:")
    : globalString("ITEM_DELTA_DESCRIPTION", "If you replace this item, the following stat changes will occur:");
  return [{ text: " ", r: 1, g: 1, b: 1 }, { text: heading, r: 1, g: 0.82, b: 0 }, ...lines];
}

/** Facts only: item level vs equipped, stat changes, or why you can't use it. */
export function tooltipLines(ev: Evaluation): TooltipLine[] {
  if (ev.verdict === "pending") return [GRAY_LINE("Loading item data...")];
  if (ev.reason !== undefined) return [{ text: `Can't use: ${ev.reason}`, r: 1, g: 0.25, b: 0.25 }];
  if (ev.verdict === "none" || !ev.item || !ev.versus) return [];

  const item = ev.item;
  const versus = ev.versus;
  const lines: TooltipLine[] = [];
  const oldLevels = versus.items.length > 0
    ? versus.items.map((i) => num(i.itemLevel)).join(" / ")
    : "empty";
  lines.push({ text: `Item level ${num(item.itemLevel)} vs ${oldLevels} (${versus.label})`, r: 1, g: 1, b: 1 });

  // Only when the player picked stat weights: a score is a judgment, not a fact.
  if (ev.scorer && ev.scorer.id !== itemLevelScorer.id && ev.newScore !== undefined) {
    const old = versus.score === undefined ? "empty" : num(Math.floor(versus.score * 10 + 0.5) / 10);
    lines.push({ text: `Score ${num(Math.floor(ev.newScore * 10 + 0.5) / 10)} vs ${old} (${ev.scorer.label})`, r: 1, g: 1, b: 1 });
  }
  return [...lines, ...statLines(ev)];
}
