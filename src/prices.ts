import type { ItemData } from "./items";
import { safe } from "./log";
import { type Recipe, recipeFor } from "./recipes";

interface PriceLine {
  text: string;
  r: number;
  g: number;
  b: number;
}

/** Auctionator wants a caller id: the name of the addon asking. */
const CALLER_ID = "TrainerCompare";

/** What's left of a sale after the auction house's 5% cut. Auctionator uses the same. */
const AFTER_AH_CUT = 0.95;

const GREEN = "|cff20ff20";
const RED = "|cffff4040";

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

/** Auctionator's API, if it's loaded. */
function auctionator(): AuctionatorAPIv1 | undefined {
  return Auctionator?.API?.v1;
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

/** Auctionator's last scanned price for one item, and how many days ago it was seen. */
function auctionPrice(api: AuctionatorAPIv1, link: string): { price?: number; days?: number } {
  const getPrice = api.GetAuctionPriceByItemLink;
  if (getPrice === undefined) return {};
  const price = copperOrNone(safe("auction price", () => getPrice(CALLER_ID, link)));
  if (price === undefined) return {};
  const getAge = api.GetAuctionAgeByItemLink;
  const age = getAge !== undefined ? safe("auction age", () => getAge(CALLER_ID, link)) : undefined;
  return { price, days: typeof age === "number" && age >= 0 ? Math.floor(age) : undefined };
}

/** One reagent's price, like Auctionator's own crafting info: the merchant price if known, else the auction price. */
function unitCost(api: AuctionatorAPIv1, itemID: number): number | undefined {
  const getVendor = api.GetVendorPriceByItemID;
  const vendor = getVendor !== undefined ? copperOrNone(safe("reagent vendor price", () => getVendor(CALLER_ID, itemID))) : undefined;
  if (vendor !== undefined) return vendor;
  const getAuction = api.GetAuctionPriceByItemID;
  return getAuction !== undefined ? copperOrNone(safe("reagent auction price", () => getAuction(CALLER_ID, itemID))) : undefined;
}

/** Total reagent cost for one craft, and how many reagent slots have no price. */
function reagentCost(api: AuctionatorAPIv1, recipe: Recipe): { total: number; missing: number } {
  let total = 0;
  let missing = 0;
  for (const slot of recipe.slots) {
    let cheapest: number | undefined;
    for (const itemID of slot.itemIDs) {
      const cost = unitCost(api, itemID);
      if (cost !== undefined && (cheapest === undefined || cost < cheapest)) cheapest = cost;
    }
    if (cheapest === undefined) missing += 1;
    else total += cheapest * slot.quantity;
  }
  return { total, missing };
}

/** Green with a plus, red with a minus, white for nothing either way. */
function signedMoney(copper: number): string {
  if (copper > 0) return `${GREEN}+|r${money(copper)}`;
  if (copper < 0) return `${RED}-|r${money(-copper)}`;
  return money(0);
}

/**
 * Auction house lines: the item's last price, what the reagents cost, and
 * the profit after the 5% cut. Only with Auctionator. No sale price for
 * items that bind on pickup, so no profit either.
 */
function auctionLines(api: AuctionatorAPIv1, index: number, link: string, item: ItemData, each: string): PriceLine[] {
  const lines: PriceLine[] = [];
  const sale = item.bindOnPickup ? {} : auctionPrice(api, link);
  if (!item.bindOnPickup) {
    lines.push(sale.price !== undefined
      ? WHITE(`Auction house: ${money(sale.price)}${each}${ageText(sale.days)}`)
      : GRAY("Auction house: no price yet"));
  }

  const recipe = recipeFor(index);
  if (recipe === undefined) return lines;
  const makes = recipe.makes > 1 ? ` (makes ${recipe.makes})` : "";
  const cost = reagentCost(api, recipe);
  if (cost.missing > 0) {
    lines.push(GRAY(`Reagents: no price for ${cost.missing} of ${recipe.slots.length}`));
    return lines;
  }
  lines.push(WHITE(`Reagents: ${money(cost.total)}${makes}`));
  if (sale.price !== undefined) {
    const profit = Math.floor(sale.price * recipe.makes * AFTER_AH_CUT - cost.total);
    lines.push(WHITE(`Profit: ${signedMoney(profit)} after the 5% auction house cut`));
  }
  return lines;
}

/**
 * Money facts for any crafted item, gear or not: the cost to learn, the
 * auction house lines (with Auctionator), and what a vendor pays.
 */
export function priceLines(index: number, link: string, item: ItemData): PriceLine[] {
  const each = item.maxStack > 1 ? " each" : "";
  const lines: PriceLine[] = [];
  const cost = learnCost(index);
  if (cost !== undefined) lines.push(WHITE(`Cost to learn: ${money(cost)}`));
  const api = auctionator();
  if (api !== undefined) lines.push(...auctionLines(api, index, link, item, each));
  if (item.sellPrice > 0) lines.push(WHITE(`Vendor price: ${money(item.sellPrice)}${each}`));
  return lines;
}
