import type { ItemData } from "./items";
import { safe } from "./log";

interface PriceLine {
  text: string;
  r: number;
  g: number;
  b: number;
}

/** Auctionator wants a caller id: the name of the addon asking. */
const CALLER_ID = "TrainerCompare";

const WHITE = (text: string): PriceLine => ({ text, r: 1, g: 1, b: 1 });
const GRAY = (text: string): PriceLine => ({ text, r: 0.6, g: 0.6, b: 0.6 });

/** Gold, silver and copper, like the rest of the UI. Our own format if the client has no helper. */
export function money(copper: number): string {
  const c = Math.floor(copper);
  const native = GetCoinTextureString;
  if (native !== undefined) {
    const text = safe("money", () => native(c));
    if (typeof text === "string" && text !== "") return text;
  }
  const gold = Math.floor(c / 10000);
  const silver = Math.floor(c / 100) % 100;
  const parts: string[] = [];
  if (gold > 0) parts.push(`${gold}|cffffd700g|r`);
  if (silver > 0) parts.push(`${silver}|cffc7c7cfs|r`);
  if (c % 100 > 0 || parts.length === 0) parts.push(`${c % 100}|cffeda55fc|r`);
  return parts.join(" ");
}

/** A positive number of copper, or undefined. 0 and junk mean "no price". */
function copperOrNone(value: unknown): number | undefined {
  return typeof value === "number" && value > 0 ? value : undefined;
}

/** What the trainer charges to learn the recipe. */
function learnCost(index: number): number | undefined {
  const getCost = GetTrainerServiceCost;
  if (getCost === undefined) return undefined;
  return copperOrNone(safe("learn cost", () => getCost(index)[0]));
}

function ageText(days: number | undefined): string {
  if (days === undefined) return "";
  if (days === 0) return ", seen today";
  if (days === 1) return ", seen 1 day ago";
  return `, seen ${days} days ago`;
}

/**
 * Auctionator's last scanned price. Undefined when Auctionator isn't
 * loaded; a gray "no price" line when it is but hasn't seen the item.
 */
function auctionLine(link: string, each: string): PriceLine | undefined {
  const api = Auctionator?.API?.v1;
  const getPrice = api?.GetAuctionPriceByItemLink;
  if (getPrice === undefined) return undefined;
  const price = copperOrNone(safe("auction price", () => getPrice(CALLER_ID, link)));
  if (price === undefined) return GRAY("Auction house: no price yet");
  const getAge = api?.GetAuctionAgeByItemLink;
  const age = getAge !== undefined ? safe("auction age", () => getAge(CALLER_ID, link)) : undefined;
  const days = typeof age === "number" && age >= 0 ? Math.floor(age) : undefined;
  return WHITE(`Auction house: ${money(price)}${each}${ageText(days)}`);
}

/**
 * Facts about money for any crafted item, gear or not: what it costs to
 * learn, what it last sold for at the auction house (Auctionator), and
 * what a vendor pays. No auction line for items that bind on pickup. No
 * profit: reagent costs aren't known at the trainer.
 */
export function priceLines(index: number, link: string, item: ItemData): PriceLine[] {
  const each = item.maxStack > 1 ? " each" : "";
  const lines: PriceLine[] = [];
  const cost = learnCost(index);
  if (cost !== undefined) lines.push(WHITE(`Cost to learn: ${money(cost)}`));
  const auction = item.bindOnPickup ? undefined : auctionLine(link, each);
  if (auction !== undefined) lines.push(auction);
  if (item.sellPrice > 0) lines.push(WHITE(`Vendor price: ${money(item.sellPrice)}${each}`));
  return lines;
}
