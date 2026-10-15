import type { ItemData } from "./items";
import { safe } from "./log";
import { type Recipe, recipeFor } from "./recipes";

/** One tooltip line: text and its base color. */
export interface TooltipLine {
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

const WHITE = (text: string): TooltipLine => ({ text, r: 1, g: 1, b: 1 });
const GRAY = (text: string): TooltipLine => ({ text, r: 0.6, g: 0.6, b: 0.6 });

/** Gold, silver and copper, like the rest of the UI. Our own format if the client has no helper. */
function money(copper: number): string {
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

/** Auctionator's last scanned price for one item. */
function auctionPrice(api: AuctionatorAPIv1, link: string): number | undefined {
  const getPrice = api.GetAuctionPriceByItemLink;
  if (getPrice === undefined) return undefined;
  return copperOrNone(safe("auction price", () => getPrice(CALLER_ID, link)));
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
 * What one craft's reagents cost and the profit after the 5% auction house
 * cut. Only with Auctionator, and only when the client gives the recipe's
 * reagents. The item's own auction and vendor prices are left to the item
 * tooltip (Auctionator and Blizzard show them there). No profit for items
 * that bind on pickup: they can't be sold at the auction house.
 */
export function craftLines(index: number, link: string, item: ItemData): TooltipLine[] {
  const api = auctionator();
  if (api === undefined) return [];
  const recipe = recipeFor(index);
  if (recipe === undefined) return [];
  const cost = reagentCost(api, recipe);
  if (cost.missing > 0) return [GRAY(`Reagents: no price for ${cost.missing} of ${recipe.slots.length}`)];
  const makes = recipe.makes > 1 ? ` (makes ${recipe.makes})` : "";
  const lines = [WHITE(`Reagents: ${money(cost.total)}${makes}`)];
  if (item.bindOnPickup) return lines;
  const sale = auctionPrice(api, link);
  if (sale === undefined) {
    lines.push(GRAY("Profit: no auction price for the item yet"));
  } else {
    const profit = Math.floor(sale * recipe.makes * AFTER_AH_CUT - cost.total);
    lines.push(WHITE(`Profit: ${signedMoney(profit)} after the 5% auction house cut`));
  }
  return lines;
}
