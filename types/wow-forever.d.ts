/**
 * Hand-written types for the WoW Forever client.
 *
 * Source: probe run on build 1.60.1 (70374), interface 16001,
 * WOW_PROJECT_ID 18. Classic data on a modern (retail-style) engine.
 *
 * Rules:
 * - Only declare what the addon uses.
 * - Confirmed by the probe: typed as present.
 * - Not confirmed: typed as possibly undefined, so the compiler forces
 *   a check before use.
 *
 * TSTL call style:
 * - Interface/object methods compile to colon calls (obj:Method()).
 * - Plain library functions (C_Timer.After, C_Item.*) must be declared in a
 *   `namespace`, or with `this: void`, so they compile to dot calls.
 */

// ---------------------------------------------------------------------------
// Lua and core globals
// ---------------------------------------------------------------------------

declare function print(...args: unknown[]): void;
declare function hooksecurefunc(globalName: string, hook: (...args: any[]) => void): void;
declare function hooksecurefunc<T extends object>(table: T, method: keyof T & string, hook: (...args: any[]) => void): void;

/** Global table. Used for localized strings and feature detection. */
declare const _G: Record<string, unknown>;


/** SavedVariables. Nil on first load, before ADDON_LOADED fills it in. */
declare let TrainerCompareDB: TrainerCompareSaved | undefined;

interface TrainerCompareSaved {
  debug: boolean;
  /** Fade recipes for gear the player can't use. */
  onlyUsable: boolean;
}

/** Fourth value is the TOC interface number. Confirmed. */
declare function GetBuildInfo(): LuaMultiReturn<[string, string, string, number]>;

/** Confirmed. */
declare namespace C_Timer {
  function After(seconds: number, callback: () => void): void;
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

/** Returns localized name, class token (e.g. "PALADIN"), class id. */
declare function UnitClass(unit: string): LuaMultiReturn<[string, string, number]>;
declare function UnitLevel(unit: string): number;
/** Confirmed present. */
declare function IsPlayerSpell(spellID: number): boolean;
/** Not probed. */
declare const CanDualWield: (() => boolean) | undefined;
/** Not probed. Built-in compare uses the COMPAREITEMS modifier (Shift by default). */
declare const IsModifiedClick: ((action: string) => boolean) | undefined;
declare const IsShiftKeyDown: (() => boolean) | undefined;
declare const GetCVarBool: ((name: string) => boolean) | undefined;

// ---------------------------------------------------------------------------
// Trainer. All confirmed.
// ---------------------------------------------------------------------------

/**
 * Forever order differs from Classic:
 * name, serviceType ("available" | "unavailable" | "used" | "header"),
 * icon fileID, unknown number, unknown string, category name.
 */
declare function GetTrainerServiceInfo(index: number): LuaMultiReturn<[string | undefined, string | undefined, number | undefined, number | undefined, string | undefined, string | undefined]>;
/** Link to the crafted item. Nil when the recipe makes no item. */
declare function GetTrainerServiceItemLink(index: number): string | undefined;
/**
 * Not probed. Classic order: money cost in copper, then talent and
 * profession costs. Forever may order values differently (it does for
 * GetTrainerServiceInfo), so callers check the first value is a number.
 */
declare const GetTrainerServiceCost: ((this: void, index: number) => LuaMultiReturn<[unknown]>) | undefined;

/** Not probed. Money as text with gold, silver and copper icons. */
declare const GetCoinTextureString: ((this: void, copper: number) => string) | undefined;

// ---------------------------------------------------------------------------
// Items. Only C_Item exists; the old globals are gone. All confirmed.
// ---------------------------------------------------------------------------

declare namespace C_Item {
  /**
   * Retail order: name, link, quality, itemLevel, minLevel, type, subType,
   * stackCount, equipLoc, texture, sellPrice, classID, subclassID,
   * bindType (1 = binds when picked up), ... All nil while the item is not
   * cached. Values past subclassID are not probed.
   */
  function GetItemInfo(item: string | number): LuaMultiReturn<[
    string | undefined, string | undefined, number | undefined, number | undefined, number | undefined,
    string | undefined, string | undefined, number | undefined, string | undefined, number | undefined,
    number | undefined, number | undefined, number | undefined, number | undefined,
  ]>;
  /** id, type, subType, equipLoc, icon, classID, subclassID. Works before the item is cached. */
  function GetItemInfoInstant(item: string | number): LuaMultiReturn<[
    number | undefined, string | undefined, string | undefined, string | undefined,
    number | undefined, number | undefined, number | undefined,
  ]>;
  function GetDetailedItemLevelInfo(item: string | number): LuaMultiReturn<[number | undefined]>;
  /** Keys like ITEM_MOD_STRENGTH_SHORT and ITEM_MOD_DAMAGE_PER_SECOND_SHORT. */
  function GetItemStats(link: string): Record<string, number> | undefined;
  function RequestLoadItemDataByID(itemID: number): void;
}

declare function GetInventoryItemLink(unit: string, slot: number): string | undefined;
/** Returns slotID for names like "MAINHANDSLOT". Confirmed present. */
declare function GetInventorySlotInfo(slotName: string): LuaMultiReturn<[number]>;

// ---------------------------------------------------------------------------
// Widgets. Only the methods in use.
// ---------------------------------------------------------------------------

type WowEvent = string;

interface UIObject {
  GetObjectType(): string;
}

interface Region extends UIObject {
  Show(): void;
  Hide(): void;
  IsShown(): boolean;
  SetPoint(point: string, relativeTo?: Region | string, relativePoint?: string, x?: number, y?: number): void;
  SetPoint(point: string, x: number, y: number): void;
  ClearAllPoints(): void;
  SetSize(width: number, height: number): void;
  GetLeft(): number | undefined;
  SetAlpha(alpha: number): void;
}


interface FontString extends Region {
  SetText(text: string): void;
  GetText(): string | undefined;
}

interface Frame extends Region {
  /** All regions (textures, font strings) of this frame. */
  GetRegions(): LuaMultiReturn<Region[]>;
  RegisterEvent(event: WowEvent): void;
  SetScript(handler: "OnEvent", fn: ((frame: Frame, event: WowEvent, ...args: any[]) => void) | undefined): void;
  SetScript(handler: string, fn: ((...args: any[]) => void) | undefined): void;
  CreateFontString(name?: string, layer?: string, template?: string): FontString;
  GetID(): number;
  /** ScrollBox rows only. */
  GetElementData?(): unknown;
}

interface CheckButton extends Frame {
  SetChecked(checked: boolean): void;
  GetChecked(): boolean;
}

interface GameTooltip extends Frame {
  SetOwner(owner: Region, anchor: string): void;
  SetText(text: string, r?: number, g?: number, b?: number): void;
  AddLine(text: string, r?: number, g?: number, b?: number, wrap?: boolean): void;
  SetTrainerService(index: number): void;
  SetInventoryItem(unit: string, slot: number): void;
  HookScript(handler: string, fn: (...args: any[]) => void): void;
}

/** Blizzard ScrollBox. Shape inferred from retail; every method is feature-checked. */
interface ScrollBox extends Frame {
  ForEachFrame?(fn: (frame: Frame, elementData?: unknown) => void): void;
  RegisterCallback?(event: string, fn: (...args: any[]) => void, owner: unknown): void;
}

interface TrainerFrame extends Frame {
  ScrollBox?: ScrollBox;
}

declare function CreateFrame(frameType: "Frame", name?: string, parent?: Frame, template?: string): Frame;
declare function CreateFrame(frameType: "CheckButton", name?: string, parent?: Frame, template?: string): CheckButton;

declare const GameTooltip: GameTooltip;

/** Load-on-demand (Blizzard_TrainerUI). Nil until the first trainer opens. */
declare const ClassTrainerFrame: TrainerFrame | undefined;

declare namespace C_AddOns {
  function IsAddOnLoaded(name: string): LuaMultiReturn<[boolean, boolean]>;
  /** Not probed; modern clients have it. Feature-checked. */
  const GetAddOnMetadata: ((this: void, addon: string, field: string) => string | undefined) | undefined;
}
/** Older name for the same thing. Not probed. */
declare const GetAddOnMetadata: ((addon: string, field: string) => string | undefined) | undefined;

/** Not probed. Retail helper for ScrollBox frame callbacks. */
declare const ScrollUtil: {
  AddInitializedFrameCallback?: (this: void, scrollBox: ScrollBox, fn: (frame: Frame, elementData: unknown) => void, owner: unknown, iterateExisting?: boolean) => void;
} | undefined;

// ---------------------------------------------------------------------------
// Lua string library (subset)
// ---------------------------------------------------------------------------

declare namespace string {
  function format(fmt: string, ...args: unknown[]): string;
}

// ---------------------------------------------------------------------------
// Confirmed by the menu diagnostic on 1.60.1
// ---------------------------------------------------------------------------

interface Region {
  GetEffectiveScale(): number;
  GetWidth(): number;
}

/** Modern menu builder passed to Menu.ModifyMenu callbacks. */
interface MenuDescription {
  CreateCheckbox(text: string, isSelected: (data?: unknown) => boolean, setSelected: (data?: unknown) => void, data?: unknown): unknown;
}

/** Present. The trainer's Settings dropdown is tagged MENU_TRAINER_FILTER. */
declare const Menu: {
  ModifyMenu?: (this: void, tag: string, fn: (owner: unknown, root: MenuDescription, context: unknown) => void) => void;
} | undefined;

/** Present. CompareItem confirmed; the other two are retail names, feature-checked. */
declare const TooltipComparisonManager: {
  CompareItem?(comparisonItem: unknown, tooltip: GameTooltip, anchorFrame?: Region): void;
  CreateComparisonItem?(tooltipData: unknown): unknown;
  Clear?(tooltip: GameTooltip): void;
} | undefined;

/** Hyperlink tooltip data carries an item GUID the native compare can use. Not probed. */
declare const C_TooltipInfo: {
  GetHyperlink?: (this: void, link: string) => { guid?: string } | undefined;
  /**
   * Confirmed present; reports type Spell for trainer services. That the id
   * is the recipe's spell id is from retail, not probed.
   */
  GetTrainerService?: (this: void, index: number) => { type?: number; id?: number } | undefined;
} | undefined;

/** Not probed. Retail enums, read at run time instead of hard-coding numbers. */
declare const Enum: {
  TooltipDataType?: { Spell?: number };
  CraftingReagentType?: { Basic?: number };
} | undefined;

/** One reagent slot of a recipe. Retail shape, not probed. */
interface ReagentSlotSchematic {
  /** Items that fill the slot. Classic recipes have one. */
  reagents?: { itemID?: number }[];
  quantityRequired?: number;
  reagentType?: number;
}

/** Retail shape, not probed. */
interface RecipeSchematic {
  /** How many items one craft makes (the low end). */
  quantityMin?: number;
  reagentSlotSchematics?: ReagentSlotSchematic[];
}

/**
 * Not probed. Auctionator 341 loads its retail crafting code on Forever and
 * calls GetRecipeSchematic there, so it likely exists. Whether it works for
 * recipes the player hasn't learned is not known.
 */
declare const C_TradeSkillUI: {
  GetRecipeSchematic?: (this: void, recipeSpellID: number, isRecraft: boolean) => RecipeSchematic | undefined;
} | undefined;

// ---------------------------------------------------------------------------
// Other addons. Not probed: from reading their source.
// ---------------------------------------------------------------------------

/**
 * Auctionator's public API (Source/API/v1 in Auctionator 341, which lists
 * interface 16001). Prices are in copper, nil when unknown. Every function
 * raises a Lua error on bad input, so calls go through safe().
 */
interface AuctionatorAPIv1 {
  /** Last scanned auction price for one item. */
  GetAuctionPriceByItemLink?: (this: void, callerID: string, itemLink: string) => number | undefined;
  /** Days since the price was seen. Nil if never, or over 21 days ago. */
  GetAuctionAgeByItemLink?: (this: void, callerID: string, itemLink: string) => number | undefined;
  GetAuctionPriceByItemID?: (this: void, callerID: string, itemID: number) => number | undefined;
  /** What a merchant charges, from Auctionator's cache of merchants the player has seen. */
  GetVendorPriceByItemID?: (this: void, callerID: string, itemID: number) => number | undefined;
}
/** Nil unless Auctionator is installed and loaded. */
declare const Auctionator: { API?: { v1?: AuctionatorAPIv1 } } | undefined;
