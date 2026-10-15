import { evaluate } from "./compare";
import { lookupItem } from "./items";
import { debug, safe } from "./log";
import { priceLines } from "./prices";
import { tooltipLines } from "./tooltip";
import { field, isRegion, keysOf } from "./widgets";

/** The trainer service GameTooltip is showing, if any. */
let hoveredIndex: number | undefined;

/** Which compare we are showing: Blizzard's own, our filled-in copy, or none. */
let compareShown: "native" | "manual" | undefined;

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

/** Same trigger as the built-in compare: "always compare items", or the compare modifier (Shift). */
function wantsCompare(): boolean {
  if (typeof GetCVarBool === "function" && GetCVarBool("alwaysCompareItems")) return true;
  if (typeof IsModifiedClick === "function") return IsModifiedClick("COMPAREITEMS");
  if (typeof IsShiftKeyDown === "function") return IsShiftKeyDown();
  return true;
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
 * Blizzard's own compare, fed the crafted item. The trainer tooltip is a
 * spell tooltip, so it never starts by itself. Returns true if it showed.
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

/**
 * Equipped item(s) on the left, recipe tooltip on the right.
 * Flips to the right only when there's no room on the left of the screen.
 */
function placeCompare(tooltip: GameTooltip): string {
  const shown = shoppingTooltips().filter((t) => t.IsShown());
  if (shown.length === 0) return "none";
  let width = 0;
  for (const t of shown) width += t.GetWidth() * t.GetEffectiveScale();
  const room = (tooltip.GetLeft() ?? 0) * tooltip.GetEffectiveScale();
  const side = room >= width ? "left" : "right";
  let anchor: Region = tooltip;
  for (let i = 0; i < shown.length; i++) {
    const t = shown[i];
    const y = i === 0 ? -10 : 0;
    t.ClearAllPoints();
    if (side === "left") t.SetPoint("TOPRIGHT", anchor, "TOPLEFT", 0, y);
    else t.SetPoint("TOPLEFT", anchor, "TOPRIGHT", 0, y);
    anchor = t;
  }
  return side;
}

/**
 * Compare the recipe's item with what is equipped. Any gear, usable or not,
 * like the built-in compare; never for non-gear or an empty slot. Tries
 * Blizzard's native compare first, then our own.
 */
function showCompare(tooltip: GameTooltip, index: number): void {
  hideCompare();
  if (!wantsCompare()) return;
  const link = GetTrainerServiceItemLink(index);
  if (link === undefined) return;
  const ev = evaluate(link);
  const slots = ev.versus?.compareSlots ?? [];
  if (ev.item === undefined || slots.length === 0) return;
  if (shoppingTooltips().length === 0) return;

  if (safe("native compare", () => nativeCompare(tooltip, link)) === true) {
    compareShown = "native";
    for (const tip of shoppingTooltips()) {
      const header = field(tip, "CompareHeader");
      if (tip.IsShown() && isRegion(header) && header.IsShown()) showEquippedHeader(tip);
    }
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

/**
 * Add our lines to the recipe tooltip: item level vs equipped and stat
 * changes for gear, then prices for any item. Then Show() it again so it
 * resizes to fit them.
 */
function addTooltipLines(tooltip: GameTooltip, index: number): void {
  const link = GetTrainerServiceItemLink(index);
  if (link === undefined) return;
  const lines = tooltipLines(evaluate(link));
  const look = lookupItem(link);
  const prices = look.state === "ready" ? priceLines(index, link, look.item) : [];
  if (lines.length > 0 && prices.length > 0) lines.push({ text: " ", r: 1, g: 1, b: 1 });
  lines.push(...prices);
  if (lines.length === 0) return;
  tooltip.AddLine(" ");
  for (const line of lines) tooltip.AddLine(line.text, line.r, line.g, line.b, true);
  tooltip.Show();
}

/** Shift pressed or released, or data arrived, while a recipe is hovered. */
export function refreshHover(): void {
  if (hoveredIndex !== undefined && GameTooltip.IsShown()) showCompare(GameTooltip, hoveredIndex);
}

/** GameTooltip:SetTrainerService ran: a recipe is hovered. */
export function onTrainerTooltip(tooltip: GameTooltip, index: number): void {
  hoveredIndex = index;
  addTooltipLines(tooltip, index);
  showCompare(tooltip, index);
}

/** A new tooltip owner, or the tooltip hid: the recipe is no longer hovered. */
export function onTooltipCleared(): void {
  hoveredIndex = undefined;
  hideCompare();
}
