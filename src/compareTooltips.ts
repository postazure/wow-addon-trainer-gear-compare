import { evaluate } from "./compare";
import { lookupItem } from "./items";
import { debug, safe } from "./log";
import { craftLines, type TooltipLine } from "./prices";
import { field, isRegion, keysOf } from "./widgets";

/** The trainer service GameTooltip is showing, if any. */
let hoveredIndex: number | undefined;

/** Which compare we are showing: Blizzard's own, our filled-in copy, or none. */
let compareShown: "native" | "manual" | undefined;

/** Our recipe box, left of the item. Made on first use; false if it can't be made. */
let recipeBox: GameTooltip | false | undefined;

/** A gold arrow in the gap from the recipe box to the item. Made on first use; false if it can't be made. */
let arrow: Frame | false | undefined;

/** The gap between the recipe box and the item, and the arrow in it. */
const ARROW_GAP = 20;
const ARROW_SIZE = 16;
/** The chat frame's expand arrow: gold, pointing right, in the game files since Classic. */
const ARROW_TEXTURE = "Interface\\ChatFrame\\ChatFrameExpandArrow";

let lastCompareLog = "";
let loggedHeader = false;

/** Blizzard's two compare tooltips, if this client has them. */
function shoppingTooltips(): GameTooltip[] {
  const tips: GameTooltip[] = [];
  for (const name of ["ShoppingTooltip1", "ShoppingTooltip2"]) {
    const tip = _G[name];
    if (typeof tip === "object" && typeof field(tip, "SetInventoryItem") === "function") tips.push(tip as GameTooltip);
  }
  return tips;
}

/** Hide the compare tooltips, but only if we are the ones showing them. */
function hideCompare(): void {
  const mode = compareShown;
  if (mode === undefined) return;
  compareShown = undefined;
  if (mode === "native" && TooltipComparisonManager?.Clear) {
    TooltipComparisonManager.Clear(GameTooltip);
  }
  for (const tip of shoppingTooltips()) {
    const header = field(tip, "CompareHeader");
    if (mode === "manual" && isRegion(header)) header.Hide();
    tip.Hide();
  }
}

/**
 * Blizzard's own compare, fed the crafted item, for when it doesn't start
 * by itself. Returns true if it showed.
 */
function nativeCompare(tooltip: GameTooltip, link: string): boolean {
  const manager = TooltipComparisonManager;
  const getHyperlink = C_TooltipInfo?.GetHyperlink;
  if (!manager?.CompareItem || !getHyperlink) return false;
  const data = getHyperlink(link);
  if (data?.guid === undefined) return false;
  const item = manager.CreateComparisonItem ? manager.CreateComparisonItem(data) : { guid: data.guid };
  if (item === undefined) return false;
  manager.CompareItem(item, tooltip);
  return shoppingTooltips()[0]?.IsShown() ?? false;
}

/**
 * The header text we set when Blizzard leaves it empty. Short on purpose:
 * "Currently Equipped" overflowed the header in game.
 */
const EQUIPPED_TEXT = "Equipped";

/** The header's font string: a named field if Blizzard gave it one, else any font string in it. */
function headerLabel(header: Region): FontString | undefined {
  for (const key of ["Label", "Text", "label", "text", "HeaderText"]) {
    const value = field(header, key);
    if (typeof value === "object" && typeof field(value, "SetText") === "function") return value as FontString;
  }
  if (typeof field(header, "GetRegions") === "function") {
    for (const region of [...(header as Frame).GetRegions()]) {
      if (region.GetObjectType() === "FontString") return region as FontString;
    }
  }
  return undefined;
}

/**
 * Show the compare tooltip's "Equipped" header with its text.
 * Blizzard fills the text in its own compare code, so set it if it's empty.
 * Text that is already there is never replaced.
 */
function showEquippedHeader(tip: GameTooltip): void {
  const header = field(tip, "CompareHeader");
  if (!isRegion(header)) return;
  header.Show();
  const label = headerLabel(header);
  if (!label) {
    if (!loggedHeader) {
      loggedHeader = true;
      debug(`CompareHeader has no font string; fields: ${keysOf(header)}`);
    }
    return;
  }
  const text = label.GetText();
  if (text === undefined || text === "") label.SetText(EQUIPPED_TEXT);
}

/** Fallback: fill the compare tooltips with the equipped items ourselves. */
function manualCompare(tooltip: GameTooltip, slots: number[]): void {
  const tips = shoppingTooltips();
  for (let i = 0; i < slots.length && i < tips.length; i++) {
    const tip = tips[i];
    tip.SetOwner(tooltip, "ANCHOR_NONE");
    tip.SetInventoryItem("player", slots[i]);
    showEquippedHeader(tip);
    tip.Show();
  }
}


/** The right edge of the screen, in the same units as GetRight() times scale. */
function screenRight(): number | undefined {
  const right = UIParent.GetRight();
  return right !== undefined ? right * UIParent.GetEffectiveScale() : undefined;
}

/**
 * Compare tooltips go right of the item, so nothing covers the trainer's
 * recipe list: [recipe box] [item] [equipped]. Only when there's no room on
 * the right do they go left of the whole group.
 */
function placeCompare(tooltip: GameTooltip): string {
  const shown = shoppingTooltips().filter((t) => t.IsShown());
  if (shown.length === 0) return "none";
  let width = 0;
  for (const t of shown) width += t.GetWidth() * t.GetEffectiveScale();
  const right = tooltip.GetRight();
  const screen = screenRight();
  const room = right !== undefined && screen !== undefined ? screen - right * tooltip.GetEffectiveScale() : width;
  const side = room >= width ? "right" : "left";
  const box = recipeBox !== undefined && recipeBox !== false && recipeBox.IsShown() ? recipeBox : undefined;
  let anchor: Region = side === "right" ? tooltip : box ?? tooltip;
  /** Tops line up with the recipe box and the item; the "Equipped" header sits above. */
  for (const t of shown) {
    t.ClearAllPoints();
    if (side === "right") t.SetPoint("TOPLEFT", anchor, "TOPRIGHT", 0, 0);
    else t.SetPoint("TOPRIGHT", anchor, "TOPLEFT", 0, 0);
    anchor = t;
  }
  return side;
}

/** Give each shown compare header its text, if Blizzard left it empty. */
function fillHeaders(): void {
  for (const tip of shoppingTooltips()) {
    const header = field(tip, "CompareHeader");
    if (tip.IsShown() && isRegion(header) && header.IsShown()) showEquippedHeader(tip);
  }
}

/** Blizzard showed a compare by itself, for the item now in GameTooltip. */
function blizzardCompareShown(): boolean {
  return compareShown === undefined && shoppingTooltips().some((t) => t.IsShown());
}

/**
 * Compare the recipe's item with what is equipped, always: no Shift needed.
 * Any gear, usable or not; never for non-gear or an empty slot. With the
 * item in GameTooltip, Blizzard may start its compare by itself; then we
 * only move it. Otherwise we start Blizzard's, then fall back to our own.
 */
function showCompare(tooltip: GameTooltip, index: number): void {
  hideCompare();
  if (blizzardCompareShown()) {
    fillHeaders();
    placeCompare(tooltip);
    return;
  }
  const link = GetTrainerServiceItemLink(index);
  if (link === undefined) return;
  const ev = evaluate(link);
  const slots = ev.versus?.compareSlots ?? [];
  if (ev.item === undefined || slots.length === 0) return;
  if (shoppingTooltips().length === 0) return;

  if (safe("native compare", () => nativeCompare(tooltip, link)) === true) {
    compareShown = "native";
    fillHeaders();
  } else {
    for (const tip of shoppingTooltips()) tip.Hide();
    manualCompare(tooltip, slots);
    compareShown = "manual";
  }
  const side = placeCompare(tooltip);
  const log = `compare: ${compareShown}, ${side}`;
  if (log !== lastCompareLog) {
    lastCompareLog = log;
    debug(log);
  }
}

/** Our recipe box, made once. GameTooltipTemplate gives it the normal tooltip look. */
function getRecipeBox(): GameTooltip | undefined {
  if (recipeBox === undefined) {
    recipeBox = safe("recipe box", () => CreateFrame("GameTooltip", "TrainerCompareRecipeTooltip", UIParent, "GameTooltipTemplate")) ?? false;
  }
  return recipeBox === false ? undefined : recipeBox;
}

function hideRecipeBox(): void {
  if (recipeBox !== undefined && recipeBox !== false) recipeBox.Hide();
  if (arrow !== undefined && arrow !== false) arrow.Hide();
}

/** The arrow frame, made once. TOOLTIP strata so it shows with the tooltips. */
function getArrow(): Frame | undefined {
  if (arrow === undefined) {
    arrow = safe("arrow", () => {
      const frame = CreateFrame("Frame", "TrainerCompareArrow", UIParent);
      frame.SetFrameStrata("TOOLTIP");
      frame.SetSize(ARROW_SIZE, ARROW_SIZE);
      const texture = frame.CreateTexture(undefined, "ARTWORK");
      texture.SetAllPoints();
      texture.SetTexture(ARROW_TEXTURE);
      return frame;
    }) ?? false;
  }
  return arrow === false ? undefined : arrow;
}

/** Our only lines: reagent cost and profit (with Auctionator). */
function recipeLines(index: number, link: string): TooltipLine[] {
  const look = lookupItem(link);
  return look.state === "ready" ? craftLines(index, link, look.item) : [];
}

/**
 * Show the recipe box right of the hovered row: Blizzard's own recipe
 * tooltip (SetTrainerService on our tooltip), plus reagent cost and profit.
 * GameTooltip (the item) goes right of it, past a gap with a gold arrow:
 * [recipe] > [item] [equipped]. If the box can't be made, the
 * item sits right of the row and our lines go under it.
 */
function showRecipeBox(tooltip: GameTooltip, index: number, link: string, owner: Region): void {
  const lines = recipeLines(index, link);
  const box = getRecipeBox();
  const target = box ?? tooltip;
  if (box === undefined) {
    tooltip.ClearAllPoints();
    tooltip.SetPoint("TOPLEFT", owner, "TOPRIGHT", 0, 0);
  } else {
    box.SetOwner(owner, "ANCHOR_NONE");
    box.SetTrainerService(index);
  }
  if (lines.length > 0) {
    target.AddLine(" ");
    for (const line of lines) target.AddLine(line.text, line.r, line.g, line.b, true);
  }
  if (box === undefined) return;
  box.ClearAllPoints();
  box.SetPoint("TOPLEFT", owner, "TOPRIGHT", 0, 0);
  box.Show();
  tooltip.ClearAllPoints();
  tooltip.SetPoint("TOPLEFT", box, "TOPRIGHT", ARROW_GAP, 0);
  const pointer = getArrow();
  if (pointer === undefined) return;
  pointer.ClearAllPoints();
  pointer.SetPoint("TOPLEFT", box, "TOPRIGHT", (ARROW_GAP - ARROW_SIZE) / 2, -8);
  pointer.Show();
}

/** A modifier key changed, or data arrived, while a recipe is hovered: show the compare again if it went away. */
export function refreshHover(): void {
  if (hoveredIndex !== undefined && GameTooltip.IsShown()) showCompare(GameTooltip, hoveredIndex);
}

/** Blizzard placed its compare tooltips. While a recipe is hovered, move them right of the item. */
export function onCompareAnchored(): void {
  if (hoveredIndex !== undefined && GameTooltip.IsShown()) placeCompare(GameTooltip);
}

/**
 * GameTooltip:SetTrainerService ran: a recipe is hovered. If it makes an
 * item, GameTooltip switches to that item (SetHyperlink), so it is a normal
 * item tooltip: Blizzard's compare, sell price, and other addons' lines
 * (Auctionator, Disenchantry) work as they do anywhere. The recipe tooltip
 * moves to our recipe box, on its left. Recipes with no item keep Blizzard's tooltip as it is.
 * GameTooltip is re-owned with ANCHOR_NONE so we can place it; that runs
 * our SetOwner hook, which clears the old state.
 */
export function onTrainerTooltip(tooltip: GameTooltip, index: number): void {
  hoveredIndex = index;
  const link = GetTrainerServiceItemLink(index);
  const owner = typeof field(tooltip, "GetOwner") === "function" ? tooltip.GetOwner() : undefined;
  if (link === undefined || owner === undefined || typeof field(tooltip, "SetHyperlink") !== "function") {
    hideRecipeBox();
    hideCompare();
    return;
  }
  tooltip.SetOwner(owner, "ANCHOR_NONE");
  hoveredIndex = index;
  tooltip.SetHyperlink(link);
  showRecipeBox(tooltip, index, link, owner);
  tooltip.Show();
  showCompare(tooltip, index);
}

/** A new tooltip owner, or the tooltip hid: the recipe is no longer hovered. */
export function onTooltipCleared(): void {
  hoveredIndex = undefined;
  hideCompare();
  hideRecipeBox();
}
