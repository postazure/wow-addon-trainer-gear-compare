import { type ItemData, lookupItem } from "./items";
import { PLACEMENT, type Placement, type SlotKey, slotInfo } from "./slots";
import { isFishingPole, unusableReason } from "./usable";

/** compared: gear with something to compare against. none: not gear, or not compared (shirts, fishing poles). */
export type Verdict = "compared" | "none" | "pending";

/** What the new item is compared against. */
export interface Versus {
  label: string;
  /** Equipped items in play: 0, 1, or 2 (main hand + off hand). */
  items: ItemData[];
  /** Equipped slot ids to show in the compare tooltips. Can differ from items: rings show both. */
  compareSlots: number[];
}

export interface Evaluation {
  verdict: Verdict;
  /** Set when the item is gear but the player can't use it. */
  reason?: string;
  item?: ItemData;
  versus?: Versus;
}

const PENDING: Evaluation = { verdict: "pending" };
const NONE: Evaluation = { verdict: "none" };

/** Cached results. They depend on gear, level and spells: invalidate() on change. */
const results = new Map<string, Evaluation>();

/** Drop every cached result. */
export function invalidate(): void {
  results.clear();
}

/**
 * Compare a crafted item with what is equipped. Cached per link, except
 * "pending": that must be looked at again once item data arrives.
 */
export function evaluate(link: string): Evaluation {
  const hit = results.get(link);
  if (hit) return hit;
  const result = compute(link);
  if (result.verdict !== "pending") results.set(link, result);
  return result;
}

/**
 * The uncached comparison. Gear you can't use still gets what it would
 * replace (versus), so the compare tooltips can show it, plus the reason
 * it can't be used.
 */
function compute(link: string): Evaluation {
  const look = lookupItem(link);
  if (look.state === "pending") return PENDING;
  if (look.state === "missing") return NONE;
  const item = look.item;

  const placement = PLACEMENT[item.equipLoc];
  if (!placement || isFishingPole(item)) return NONE;

  const versus = findVersus(placement);
  if (versus === "pending") return PENDING;
  return { verdict: "compared", reason: unusableReason(item), item, versus };
}

type Equipped =
  | { state: "empty" }
  | { state: "pending" }
  | { state: "ready"; item: ItemData };

/** What the player wears in one slot. */
function equipped(key: SlotKey): Equipped {
  const link = GetInventoryItemLink("player", slotInfo(key).id);
  if (link === undefined) return { state: "empty" };
  const look = lookupItem(link);
  if (look.state === "ready") return { state: "ready", item: look.item };
  if (look.state === "pending") return { state: "pending" };
  return { state: "empty" };
}

/** Compare against the item in one slot. */
function single(key: SlotKey): Versus | "pending" {
  const e = equipped(key);
  if (e.state === "pending") return "pending";
  const { label, id } = slotInfo(key);
  if (e.state === "empty") return { label, items: [], compareSlots: [] };
  return { label, items: [e.item], compareSlots: [id] };
}

/** Two slots that take the same item: compare against an empty one, or else the one with the lower item level. */
function weaker(a: SlotKey, b: SlotKey): Versus | "pending" {
  const va = single(a);
  const vb = single(b);
  if (va === "pending" || vb === "pending") return "pending";
  /** Show both equipped items, like the built-in compare does. */
  const compareSlots = [...va.compareSlots, ...vb.compareSlots];
  const itemA = va.items[0];
  const itemB = vb.items[0];
  if (itemA === undefined) return { ...va, compareSlots };
  if (itemB === undefined) return { ...vb, compareSlots };
  return { ...(itemB.itemLevel < itemA.itemLevel ? vb : va), compareSlots };
}

/** Classic spell id for Dual Wield. */
const DUAL_WIELD_SPELL = 674;

function canDualWield(): boolean {
  if (typeof CanDualWield === "function") return CanDualWield();
  return IsPlayerSpell(DUAL_WIELD_SPELL);
}

/**
 * What a new item would replace, by where it can go: one slot, the weaker
 * of two (rings, trinkets), or the weapon rules for one-hand, off-hand and
 * two-hand items.
 */
function findVersus(placement: Placement): Versus | "pending" {
  if (placement.type === "single") return single(placement.slot);
  if (placement.type === "either") return weaker(placement.slots[0], placement.slots[1]);

  /** Weapons from here on. A two-hander in the main hand blocks the off hand. */
  const main = equipped("MAINHAND");
  if (main.state === "pending") return "pending";
  const wieldingTwoHander = main.state === "ready" && main.item.equipLoc === "INVTYPE_2HWEAPON";

  if (placement.type === "mainHand" || wieldingTwoHander) return single("MAINHAND");
  if (placement.type === "offHand") return single("SECONDARYHAND");
  if (placement.type === "oneHand") {
    return canDualWield() ? weaker("MAINHAND", "SECONDARYHAND") : single("MAINHAND");
  }

  /** A two-hander replaces both the main hand and the off hand. */
  const off = equipped("SECONDARYHAND");
  if (off.state === "pending") return "pending";
  const items: ItemData[] = [];
  const compareSlots: number[] = [];
  if (main.state === "ready") { items.push(main.item); compareSlots.push(slotInfo("MAINHAND").id); }
  if (off.state === "ready") { items.push(off.item); compareSlots.push(slotInfo("SECONDARYHAND").id); }
  const label = `${slotInfo("MAINHAND").label} + ${slotInfo("SECONDARYHAND").label}`;
  return { label, items, compareSlots };
}
