import { debug } from "./log";

export interface ItemData {
  itemLevel: number;
  minLevel: number;
  subType: string;
  equipLoc: string;
  classID: number;
  subclassID: number;
  /** ITEM_MOD_* keys from C_Item.GetItemStats. Empty when the item has none. */
  stats: Record<string, number>;
  /** Vendor sell price in copper, per item. 0 when vendors won't buy it. */
  sellPrice: number;
  /** How many fit in one stack. 1 for gear. */
  maxStack: number;
  /** Binds when picked up, so it can't be sold at the auction house. */
  bindOnPickup: boolean;
}

type ItemLookup =
  | { state: "ready"; item: ItemData }
  | { state: "pending" }
  | { state: "missing" };

const PENDING: ItemLookup = { state: "pending" };
const MISSING: ItemLookup = { state: "missing" };

/** Item data never changes in a session, so ready items are cached for good. */
const cache = new Map<string, ItemData>();
const pendingIDs = new Set<number>();
const failedIDs = new Set<number>();

/**
 * Look up an item by link. Returns "pending" while the client has not
 * cached it yet; callers must show nothing in that case.
 */
export function lookupItem(link: string): ItemLookup {
  const hit = cache.get(link);
  if (hit) return { state: "ready", item: hit };

  const [itemID, , , equipLoc, , classID, subclassID] = C_Item.GetItemInfoInstant(link);
  if (itemID === undefined || failedIDs.has(itemID)) return MISSING;

  const [name, , , baseLevel, minLevel, , subType, maxStack, , , sellPrice, , , bindType] = C_Item.GetItemInfo(link);
  if (name === undefined) {
    if (!pendingIDs.has(itemID)) {
      pendingIDs.add(itemID);
      C_Item.RequestLoadItemDataByID(itemID);
      debug(`waiting on item ${itemID}`);
    }
    return PENDING;
  }

  const [detailedLevel] = C_Item.GetDetailedItemLevelInfo(link);
  const stats: Record<string, number> = {};
  const raw = C_Item.GetItemStats(link);
  if (raw) {
    for (const [key, value] of Object.entries(raw)) stats[key] = value;
  }

  const item: ItemData = {
    itemLevel: detailedLevel !== undefined && detailedLevel > 0 ? detailedLevel : baseLevel ?? 0,
    minLevel: minLevel ?? 0,
    subType: subType ?? "",
    equipLoc: equipLoc ?? "",
    classID: classID ?? -1,
    subclassID: subclassID ?? -1,
    stats,
    sellPrice: sellPrice ?? 0,
    maxStack: maxStack ?? 1,
    bindOnPickup: bindType === 1,
  };
  cache.set(link, item);
  return { state: "ready", item };
}

/** Returns true when we were waiting on this item. */
export function onItemInfoReceived(itemID: number, success: boolean | undefined): boolean {
  if (!pendingIDs.has(itemID)) return false;
  pendingIDs.delete(itemID);
  if (success === false) {
    failedIDs.add(itemID);
    debug(`item ${itemID} failed to load`);
  }
  return true;
}
