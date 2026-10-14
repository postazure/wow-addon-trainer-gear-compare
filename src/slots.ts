import { safe } from "./log";

export type SlotKey =
  | "HEAD" | "NECK" | "SHOULDER" | "CHEST" | "WAIST" | "LEGS" | "FEET" | "WRIST" | "HANDS"
  | "FINGER0" | "FINGER1" | "TRINKET0" | "TRINKET1" | "BACK"
  | "MAINHAND" | "SECONDARYHAND" | "RANGED";

/** Slot name for GetInventorySlotInfo, fallback slot id, fallback label. */
const DEFS: Record<SlotKey, [string, number, string]> = {
  HEAD: ["HEADSLOT", 1, "Head"],
  NECK: ["NECKSLOT", 2, "Neck"],
  SHOULDER: ["SHOULDERSLOT", 3, "Shoulder"],
  CHEST: ["CHESTSLOT", 5, "Chest"],
  WAIST: ["WAISTSLOT", 6, "Waist"],
  LEGS: ["LEGSSLOT", 7, "Legs"],
  FEET: ["FEETSLOT", 8, "Feet"],
  WRIST: ["WRISTSLOT", 9, "Wrist"],
  HANDS: ["HANDSSLOT", 10, "Hands"],
  FINGER0: ["FINGER0SLOT", 11, "Finger"],
  FINGER1: ["FINGER1SLOT", 12, "Finger"],
  TRINKET0: ["TRINKET0SLOT", 13, "Trinket"],
  TRINKET1: ["TRINKET1SLOT", 14, "Trinket"],
  BACK: ["BACKSLOT", 15, "Back"],
  MAINHAND: ["MAINHANDSLOT", 16, "Main Hand"],
  SECONDARYHAND: ["SECONDARYHANDSLOT", 17, "Off Hand"],
  RANGED: ["RANGEDSLOT", 18, "Ranged"],
};

interface SlotInfo {
  id: number;
  label: string;
}

const resolved = new Map<SlotKey, SlotInfo>();

/** Slot id from the client when it knows the name, else the Classic id. */
export function slotInfo(key: SlotKey): SlotInfo {
  const hit = resolved.get(key);
  if (hit) return hit;
  const [name, fallbackId, fallbackLabel] = DEFS[key];
  const id = safe(`GetInventorySlotInfo(${name})`, () => GetInventorySlotInfo(name)[0]);
  const label = _G[name];
  const info: SlotInfo = {
    id: typeof id === "number" ? id : fallbackId,
    label: typeof label === "string" ? label : fallbackLabel,
  };
  resolved.set(key, info);
  return info;
}

/**
 * Where an item can go.
 * - single: one slot
 * - either: two slots of the same kind (rings, trinkets)
 * - oneHand: main hand, or either hand when the player can dual wield
 * - mainHand / offHand / twoHand: weapon rules in compare.ts
 */
export type Placement =
  | { type: "single"; slot: SlotKey }
  | { type: "either"; slots: [SlotKey, SlotKey] }
  | { type: "oneHand" }
  | { type: "mainHand" }
  | { type: "offHand" }
  | { type: "twoHand" };

/** Shirts, tabards, bags, ammo and quivers are left out on purpose. */
export const PLACEMENT: Record<string, Placement> = {
  INVTYPE_HEAD: { type: "single", slot: "HEAD" },
  INVTYPE_NECK: { type: "single", slot: "NECK" },
  INVTYPE_SHOULDER: { type: "single", slot: "SHOULDER" },
  INVTYPE_CHEST: { type: "single", slot: "CHEST" },
  INVTYPE_ROBE: { type: "single", slot: "CHEST" },
  INVTYPE_WAIST: { type: "single", slot: "WAIST" },
  INVTYPE_LEGS: { type: "single", slot: "LEGS" },
  INVTYPE_FEET: { type: "single", slot: "FEET" },
  INVTYPE_WRIST: { type: "single", slot: "WRIST" },
  INVTYPE_HAND: { type: "single", slot: "HANDS" },
  INVTYPE_CLOAK: { type: "single", slot: "BACK" },
  INVTYPE_FINGER: { type: "either", slots: ["FINGER0", "FINGER1"] },
  INVTYPE_TRINKET: { type: "either", slots: ["TRINKET0", "TRINKET1"] },
  INVTYPE_WEAPON: { type: "oneHand" },
  INVTYPE_WEAPONMAINHAND: { type: "mainHand" },
  INVTYPE_WEAPONOFFHAND: { type: "offHand" },
  INVTYPE_SHIELD: { type: "offHand" },
  INVTYPE_HOLDABLE: { type: "offHand" },
  INVTYPE_2HWEAPON: { type: "twoHand" },
  INVTYPE_RANGED: { type: "single", slot: "RANGED" },
  INVTYPE_RANGEDRIGHT: { type: "single", slot: "RANGED" },
  INVTYPE_THROWN: { type: "single", slot: "RANGED" },
  INVTYPE_RELIC: { type: "single", slot: "RANGED" },
};
