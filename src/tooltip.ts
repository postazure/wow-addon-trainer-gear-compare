import type { Evaluation } from "./compare";
import { itemLevelScorer } from "./scoring";

export interface TooltipLine {
  text: string;
  r: number;
  g: number;
  b: number;
}

const GREEN = "|cff20ff20";
const RED = "|cffff4040";
const END = "|r";

const TITLE = "TrainerUpgrades";
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

/** New item stats minus the equipped item(s) stats, non-zero only. */
function statDiff(ev: Evaluation): string | undefined {
  if (!ev.item || !ev.versus) return undefined;
  const diff: Record<string, number> = {};
  for (const [k, v] of Object.entries(ev.item.stats)) diff[k] = (diff[k] ?? 0) + v;
  for (const old of ev.versus.items) {
    for (const [k, v] of Object.entries(old.stats)) diff[k] = (diff[k] ?? 0) - v;
  }
  const parts: string[] = [];
  for (const key of Object.keys(diff).sort()) {
    const d = Math.floor(diff[key] * 10 + 0.5) / 10;
    if (d !== 0) parts.push(`${d > 0 ? GREEN : RED}${signed(d)} ${statName(key)}${END}`);
  }
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export function tooltipLines(ev: Evaluation): TooltipLine[] {
  if (ev.verdict === "pending") return [GRAY_LINE(`${TITLE}: loading item data...`)];
  if (ev.verdict === "none") {
    return ev.reason !== undefined ? [GRAY_LINE(`${TITLE}: can't use (${ev.reason})`)] : [];
  }

  const item = ev.item!;
  const versus = ev.versus!;
  const lines: TooltipLine[] = [];
  lines.push(ev.verdict === "upgrade"
    ? { text: `${TITLE}: upgrade`, r: 0.1, g: 1, b: 0.1 }
    : GRAY_LINE(`${TITLE}: not an upgrade`));

  const oldLevels = versus.items.length > 0
    ? versus.items.map((i) => num(i.itemLevel)).join(" / ")
    : "empty";
  lines.push({ text: `Item level ${num(item.itemLevel)} vs ${oldLevels} (${versus.label})`, r: 1, g: 1, b: 1 });

  if (ev.scorer && ev.scorer.id !== itemLevelScorer.id && ev.newScore !== undefined) {
    const old = versus.score === undefined ? "empty" : num(Math.floor(versus.score * 10 + 0.5) / 10);
    lines.push({ text: `Score ${num(Math.floor(ev.newScore * 10 + 0.5) / 10)} vs ${old} (${ev.scorer.label})`, r: 1, g: 1, b: 1 });
  }

  const diff = statDiff(ev);
  if (diff !== undefined) lines.push({ text: diff, r: 1, g: 1, b: 1 });
  return lines;
}
