import { settings } from "./db";
import { type ItemData, lookupItem } from "./items";
import { itemLevelScorer, findScorer, type Scorer } from "./scoring";
import { PLACEMENT, type Placement, type SlotKey, slotInfo } from "./slots";
import { isFishingPole, unusableReason } from "./usable";

export type Verdict = "upgrade" | "same" | "none" | "pending";

/** What the new item is compared against. */
export interface Versus {
  label: string;
  /** Undefined when the slot is empty. */
  score: number | undefined;
  /** Equipped items in play: 0, 1, or 2 (main hand + off hand). */
  items: ItemData[];
}

export interface Evaluation {
  verdict: Verdict;
  /** Set when the item is gear but the player can't use it. */
  reason?: string;
  item?: ItemData;
  scorer?: Scorer;
  newScore?: number;
  versus?: Versus;
}

const PENDING: Evaluation = { verdict: "pending" };
const NONE: Evaluation = { verdict: "none" };

// Results depend on gear, level, spells and scoring. invalidate() on change.
const results = new Map<string, Evaluation>();

export function invalidate(): void {
  results.clear();
}

export function currentScorer(): Scorer {
  return findScorer(settings().scoring) ?? itemLevelScorer;
}

export function evaluate(link: string): Evaluation {
  const hit = results.get(link);
  if (hit) return hit;
  const result = compute(link);
  // Never cache pending: it must be looked at again once data arrives.
  if (result.verdict !== "pending") results.set(link, result);
  return result;
}

function compute(link: string): Evaluation {
  const look = lookupItem(link);
  if (look.state === "pending") return PENDING;
  if (look.state === "missing") return NONE;
  const item = look.item;

  const placement = PLACEMENT[item.equipLoc];
  if (!placement || isFishingPole(item)) return NONE;

  const reason = unusableReason(item);
  if (reason !== undefined) return { verdict: "none", reason, item };

  const scorer = currentScorer();
  const versus = findVersus(placement, scorer);
  if (versus === "pending") return PENDING;

  const newScore = scorer.score(item);
  const better = versus.score === undefined || newScore > versus.score;
  return { verdict: better ? "upgrade" : "same", item, scorer, newScore, versus };
}

type Equipped =
  | { state: "empty" }
  | { state: "pending" }
  | { state: "ready"; item: ItemData };

function equipped(key: SlotKey): Equipped {
  const link = GetInventoryItemLink("player", slotInfo(key).id);
  if (link === undefined) return { state: "empty" };
  const look = lookupItem(link);
  if (look.state === "ready") return { state: "ready", item: look.item };
  if (look.state === "pending") return { state: "pending" };
  return { state: "empty" };
}

function single(key: SlotKey, scorer: Scorer): Versus | "pending" {
  const e = equipped(key);
  if (e.state === "pending") return "pending";
  const label = slotInfo(key).label;
  if (e.state === "empty") return { label, score: undefined, items: [] };
  return { label, score: scorer.score(e.item), items: [e.item] };
}

/** Two slots that take the same item: compare against the weaker one. */
function weaker(a: SlotKey, b: SlotKey, scorer: Scorer): Versus | "pending" {
  const va = single(a, scorer);
  const vb = single(b, scorer);
  if (va === "pending" || vb === "pending") return "pending";
  if (va.score === undefined) return va;
  if (vb.score === undefined) return vb;
  return vb.score < va.score ? vb : va;
}

function canDualWield(): boolean {
  if (typeof CanDualWield === "function") return CanDualWield();
  return IsPlayerSpell(674); // Dual Wield
}

function findVersus(placement: Placement, scorer: Scorer): Versus | "pending" {
  if (placement.type === "single") return single(placement.slot, scorer);
  if (placement.type === "either") return weaker(placement.slots[0], placement.slots[1], scorer);

  // Weapons. A two-hander in the main hand blocks the off hand.
  const main = equipped("MAINHAND");
  if (main.state === "pending") return "pending";
  const wieldingTwoHander = main.state === "ready" && main.item.equipLoc === "INVTYPE_2HWEAPON";

  if (placement.type === "mainHand" || wieldingTwoHander) return single("MAINHAND", scorer);
  if (placement.type === "offHand") return single("SECONDARYHAND", scorer);
  if (placement.type === "oneHand") {
    return canDualWield() ? weaker("MAINHAND", "SECONDARYHAND", scorer) : single("MAINHAND", scorer);
  }

  // Two-hander against main hand + off hand.
  const off = equipped("SECONDARYHAND");
  if (off.state === "pending") return "pending";
  const items: ItemData[] = [];
  if (main.state === "ready") items.push(main.item);
  if (off.state === "ready") items.push(off.item);
  const label = `${slotInfo("MAINHAND").label} + ${slotInfo("SECONDARYHAND").label}`;
  if (items.length === 0) return { label, score: undefined, items };
  const score = scorer.pair(
    main.state === "ready" ? scorer.score(main.item) : undefined,
    off.state === "ready" ? scorer.score(off.item) : undefined,
  );
  return { label, score, items };
}
