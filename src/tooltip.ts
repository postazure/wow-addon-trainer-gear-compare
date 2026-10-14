import type { Evaluation } from "./compare";

export interface TooltipLine {
  text: string;
  r: number;
  g: number;
  b: number;
}

const GREEN = "|cff20ff20";
const RED = "|cffff4040";

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

  /** Sorted in display order, then by name. No `||` on numbers here: 0 is truthy in Lua. */
  const keys = Object.keys(diff).sort((a, b) => {
    const byOrder = orderOf(a) - orderOf(b);
    if (byOrder !== 0) return byOrder;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const lines: TooltipLine[] = [];
  for (const key of keys) {
    const d = Math.floor(diff[key] * 10 + 0.5) / 10;
    if (d === 0) continue;
    /** Like the built-in compare: the number is green or red, the stat name white. */
    const color = d > 0 ? GREEN : RED;
    lines.push({ text: `${color}${signed(d)}|r ${statName(key)}`, r: 1, g: 1, b: 1 });
  }
  if (lines.length === 0) return [];

  const heading = ev.versus.items.length > 1
    ? globalString("ITEM_DELTA_MULTIPLE_COMPARISON_DESCRIPTION", "If you replace these items, the following stat changes will occur:")
    : globalString("ITEM_DELTA_DESCRIPTION", "If you replace this item, the following stat changes will occur:");
  return [{ text: " ", r: 1, g: 1, b: 1 }, { text: heading, r: 1, g: 0.82, b: 0 }, ...lines];
}

/**
 * Facts only: item level vs equipped, and the stat changes. Shown for gear
 * you can't use, too; the item's own red text already says why.
 */
export function tooltipLines(ev: Evaluation): TooltipLine[] {
  if (ev.verdict === "pending") return [GRAY_LINE("Loading item data...")];
  const lines: TooltipLine[] = [];
  if (!ev.item || !ev.versus) return lines;

  const item = ev.item;
  const versus = ev.versus;
  const oldLevels = versus.items.length > 0
    ? versus.items.map((i) => num(i.itemLevel)).join(" / ")
    : "empty";
  lines.push({ text: `Item level ${num(item.itemLevel)} vs ${oldLevels} (${versus.label})`, r: 1, g: 1, b: 1 });
  return [...lines, ...statLines(ev)];
}
