import { evaluate, type Evaluation, invalidate } from "./compare";
import { settings } from "./db";
import { debug, safe } from "./log";
import { tooltipLines } from "./tooltip";

const DIM_ALPHA = 0.35;
const OWNER = {}; // callback registry owner token

// Rows we faded, keyed by Blizzard's row buttons. We never write fields on them.
const dimmed = new Set<Frame>();

let installed = false;
let checkbox: CheckButton | undefined;
const hookStatus: string[] = [];
const counters = { initRow: 0, initCategory: 0, refresh: 0, tooltip: 0, compare: 0 };
let loggedUnresolved = false;

function field(obj: unknown, name: string): unknown {
  return (obj as Record<string, unknown>)[name];
}

// ---------------------------------------------------------------------------
// Which trainer service does a row show?
// ---------------------------------------------------------------------------

type DataNode = { GetData(this: DataNode): unknown };

function keysOf(obj: unknown): string {
  return Object.keys(obj as object).sort().join(",");
}

/** Service index for a row, or undefined for category rows and unknown shapes. */
function resolveIndex(button: Frame, elementData: unknown): number | undefined {
  let data = elementData;
  if (data === undefined && button.GetElementData) data = button.GetElementData();
  // Tree views wrap the data in a node.
  if (typeof data === "object" && typeof field(data, "GetData") === "function") {
    data = (data as DataNode).GetData();
  }
  if (typeof data === "number") return data;
  if (typeof data === "object") {
    for (const key of ["skillIndex", "serviceIndex", "index", "trainerIndex"]) {
      const v = field(data, key);
      if (typeof v === "number") return v;
    }
    if (!loggedUnresolved) {
      loggedUnresolved = true;
      debug(`row data has no index; keys: ${keysOf(data)}`);
    }
    return undefined;
  }
  const id = button.GetID();
  return id > 0 ? id : undefined;
}

/** The row's visible name, if we can find its font string. */
function rowLabel(button: Frame): string | undefined {
  for (const key of ["name", "Name", "text", "Text"]) {
    const region = field(button, key);
    if (typeof region === "object" && typeof field(region, "GetText") === "function") {
      const text = (region as FontString).GetText();
      if (typeof text === "string") return text;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Usable filter
// ---------------------------------------------------------------------------

/** Rows get no marks. With the filter on, gear you can't use is faded. */
function applyFilter(button: Frame, ev: Evaluation | undefined): void {
  const unusable = ev?.reason !== undefined;
  // Fade only what we know: gear you can't use. Non-gear and loading rows stay.
  const dim = settings().onlyUsable && unusable;
  if (dim) {
    button.SetAlpha(DIM_ALPHA);
    dimmed.add(button);
  } else if (dimmed.has(button)) {
    button.SetAlpha(1);
    dimmed.delete(button);
  }
}

/** Evaluate one service row. ev is undefined for category rows. */
function decorate(button: Frame, elementData: unknown): void {
  const index = resolveIndex(button, elementData);
  if (index === undefined) return applyFilter(button, undefined);

  const [name, kind] = GetTrainerServiceInfo(index);
  if (name === undefined || kind === "header") return applyFilter(button, undefined);

  // Safety net: never fade a row because of another recipe's result.
  const label = rowLabel(button);
  if (label !== undefined && !label.includes(name)) {
    debug(`row ${index} shows "${label}" but service is "${name}"; skipped`);
    return applyFilter(button, undefined);
  }

  const link = GetTrainerServiceItemLink(index);
  applyFilter(button, link !== undefined ? evaluate(link) : { verdict: "none" });
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

let refreshQueued = false;

export function refreshVisible(): void {
  const box = ClassTrainerFrame?.ScrollBox;
  if (!box || !box.ForEachFrame || !ClassTrainerFrame?.IsShown()) return;
  counters.refresh++;
  box.ForEachFrame((frame, data) => {
    safe("decorate", () => decorate(frame, data));
  });
}

/** Coalesce many triggers into one refresh on the next frame. */
export function scheduleRefresh(): void {
  if (refreshQueued) return;
  refreshQueued = true;
  C_Timer.After(0, () => {
    refreshQueued = false;
    safe("refresh", refreshVisible);
    safe("refresh hover", refreshHover);
  });
}

export function setOnlyUsable(on: boolean): void {
  settings().onlyUsable = on;
  checkbox?.SetChecked(on);
  scheduleRefresh();
}

export function rescore(): void {
  invalidate();
  scheduleRefresh();
}

// ---------------------------------------------------------------------------
// Tooltip: built-in compare tooltips, plus optional lines of our own
// ---------------------------------------------------------------------------

// The trainer service GameTooltip is showing, if any.
let hoveredIndex: number | undefined;
// Which compare we are showing: Blizzard's own, our filled-in copy, or none.
let compareShown: "native" | "manual" | undefined;
let lastCompareLog = "";

function shoppingTooltips(): GameTooltip[] {
  const tips: GameTooltip[] = [];
  for (const name of ["ShoppingTooltip1", "ShoppingTooltip2"]) {
    const tip = _G[name];
    if (typeof tip === "object" && typeof field(tip, "SetInventoryItem") === "function") tips.push(tip as GameTooltip);
  }
  return tips;
}

function isRegion(value: unknown): value is Region {
  return typeof value === "object" && typeof field(value, "Show") === "function";
}

/** Same trigger as the built-in compare: "always compare" or the compare modifier (Shift). */
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

function equippedText(): string {
  const text = _G["CURRENTLY_EQUIPPED"];
  return typeof text === "string" ? text : "Currently Equipped";
}

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

let loggedHeader = false;

/**
 * Show the compare tooltip's "Currently Equipped" header with its text.
 * Blizzard fills the text in its own compare code, so set it if it's empty.
 */
function showEquippedHeader(tip: GameTooltip): void {
  const header = field(tip, "CompareHeader");
  if (!isRegion(header)) return;
  header.Show();
  const label = headerLabel(header);
  if (!label) {
    if (!loggedHeader) {
      loggedHeader = true;
      debug(`CompareHeader has no font string; fields: ${Object.keys(header as object).sort().join(",")}`);
    }
    return;
  }
  const text = label.GetText();
  if (text === undefined || text === "") label.SetText(equippedText());
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

function showCompare(tooltip: GameTooltip, index: number): void {
  hideCompare();
  if (!wantsCompare()) return;
  const link = GetTrainerServiceItemLink(index);
  if (link === undefined) return;
  const ev = evaluate(link);
  const slots = ev.versus?.compareSlots ?? [];
  // Any gear, usable or not, like the built-in compare. Not for non-gear.
  if (ev.item === undefined || slots.length === 0) return;
  if (shoppingTooltips().length === 0) return;

  if (safe("native compare", () => nativeCompare(tooltip, link)) === true) {
    compareShown = "native";
    // Blizzard's compare normally sets this; fill it in if it came up empty.
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
  counters.compare++;
  const log = `compare: ${compareShown}, ${side}`;
  if (log !== lastCompareLog) {
    lastCompareLog = log;
    debug(log);
  }
}

/** Shift pressed or released, or data arrived, while a recipe is hovered. */
export function refreshHover(): void {
  if (hoveredIndex !== undefined && GameTooltip.IsShown()) showCompare(GameTooltip, hoveredIndex);
}

function onTrainerTooltip(tooltip: GameTooltip, index: number): void {
  hoveredIndex = index;
  addTooltipLines(tooltip, index);
  showCompare(tooltip, index);
}

function onTooltipCleared(): void {
  hoveredIndex = undefined;
  hideCompare();
}

function addTooltipLines(tooltip: GameTooltip, index: number): void {
  const link = GetTrainerServiceItemLink(index);
  if (link === undefined) return;
  const lines = tooltipLines(evaluate(link));
  if (lines.length === 0) return;
  counters.tooltip++;
  tooltip.AddLine(" ");
  for (const line of lines) tooltip.AddLine(line.text, line.r, line.g, line.b, true);
  tooltip.Show(); // resize to fit the new lines
}

// ---------------------------------------------------------------------------
// Settings dropdown entry (preferred), or a checkbox if the menu API is missing
// ---------------------------------------------------------------------------

const FILTER_MENU_TAG = "MENU_TRAINER_FILTER"; // from /tc menus on 1.60.1

/** Add our toggle to the trainer's Settings dropdown. Blizzard's supported, taint-safe hook. */
function addToSettingsMenu(): boolean {
  const modify = Menu?.ModifyMenu;
  if (!modify) return false;
  modify(FILTER_MENU_TAG, (_owner, root) => {
    safe("settings menu", () => {
      root.CreateCheckbox(
        "Only show usable gear",
        () => settings().onlyUsable,
        () => { safe("menu toggle", () => setOnlyUsable(!settings().onlyUsable)); },
      );
    });
  });
  return true;
}

/** The trainer's Train button. The probe found ClassTrainerTrainButton_OnClick. */
function trainButton(parent: Frame): Region | undefined {
  for (const candidate of [_G["ClassTrainerTrainButton"], field(parent, "TrainButton")]) {
    if (typeof candidate === "object" && typeof field(candidate, "GetObjectType") === "function") {
      return candidate as Region;
    }
  }
  return undefined;
}

function createCheckbox(parent: Frame): void {
  const cb = CreateFrame("CheckButton", "TrainerCompareUsableFilter", parent, "UICheckButtonTemplate");
  cb.SetSize(24, 24);
  // Sit just left of the Train button: [label][box][Train].
  const train = trainButton(parent);
  if (train) {
    cb.SetPoint("RIGHT", train, "LEFT", -4, 0);
  } else {
    debug("Train button not found; checkbox placed bottom right");
    cb.SetPoint("BOTTOMRIGHT", parent, "BOTTOMRIGHT", -110, 4);
  }
  const text = cb.CreateFontString(undefined, "OVERLAY", "GameFontNormalSmall");
  text.SetPoint("RIGHT", cb, "LEFT", 0, 1);
  text.SetText("Usable");
  cb.SetChecked(settings().onlyUsable);
  cb.SetScript("OnClick", (self: CheckButton) => {
    safe("checkbox", () => setOnlyUsable(self.GetChecked()));
  });
  cb.SetScript("OnEnter", (self: CheckButton) => {
    GameTooltip.SetOwner(self, "ANCHOR_TOP");
    GameTooltip.SetText("Only show usable gear");
    GameTooltip.AddLine("Fades gear you can't use: armor type, weapon skill, level, or class.", 1, 1, 1, true);
    GameTooltip.AddLine("Rows are faded, not removed, so the Blizzard trainer frame is never changed.", 0.7, 0.7, 0.7, true);
    GameTooltip.Show();
  });
  cb.SetScript("OnLeave", () => GameTooltip.Hide());
  checkbox = cb;
}

// ---------------------------------------------------------------------------
// Hooks. Each one is optional and installed on its own.
// ---------------------------------------------------------------------------

function tryHook(name: string, install: () => void): void {
  const ok = safe(`hook ${name}`, () => { install(); return true; });
  hookStatus.push(`${name}=${ok ? "yes" : "failed"}`);
}

function hookGlobal(name: string, fn: (...args: any[]) => void): void {
  if (typeof _G[name] !== "function") {
    hookStatus.push(`${name}=missing`);
    return;
  }
  tryHook(name, () => hooksecurefunc(name, fn));
}

/** Install once, as soon as Blizzard_TrainerUI is loaded. */
export function installTrainerHooks(): void {
  const frame = ClassTrainerFrame;
  if (installed || !frame) return;
  installed = true;

  // Fires for each service row the ScrollBox lays out.
  hookGlobal("ClassTrainerFrame_InitServiceButton", (button: Frame, elementData: unknown) => {
    counters.initRow++;
    safe("init row", () => decorate(button, elementData));
  });
  // Category rows reuse buttons; undo any fading on them.
  hookGlobal("ClassTrainerFrame_InitCategoryButton", (button: Frame) => {
    counters.initCategory++;
    safe("init category", () => applyFilter(button, undefined));
  });
  hookGlobal("ClassTrainerFrame_Update", () => scheduleRefresh());

  // Backup in case the ScrollBox holds a direct reference to the init function.
  const box = frame.ScrollBox;
  if (box && ScrollUtil?.AddInitializedFrameCallback) {
    tryHook("ScrollUtil.AddInitializedFrameCallback", () =>
      ScrollUtil!.AddInitializedFrameCallback!(box, (row, data) => {
        safe("init frame", () => decorate(row, data));
      }, OWNER, false));
  } else if (box?.RegisterCallback) {
    tryHook("ScrollBox OnScroll", () => box.RegisterCallback!("OnScroll", () => scheduleRefresh(), OWNER));
  } else {
    hookStatus.push("ScrollBox callbacks=missing");
  }

  tryHook("GameTooltip.SetTrainerService", () =>
    hooksecurefunc(GameTooltip, "SetTrainerService", (tooltip: GameTooltip, index: number) => {
      safe("tooltip", () => onTrainerTooltip(tooltip, index));
    }));
  // A new owner or a hidden tooltip means the recipe is no longer hovered.
  tryHook("GameTooltip.SetOwner", () =>
    hooksecurefunc(GameTooltip, "SetOwner", () => safe("tooltip owner", onTooltipCleared)));
  tryHook("GameTooltip OnHide", () =>
    GameTooltip.HookScript("OnHide", () => safe("tooltip hide", onTooltipCleared)));

  let inMenu = false;
  tryHook("settings menu", () => { inMenu = addToSettingsMenu(); });
  if (!inMenu) tryHook("checkbox", () => createCheckbox(frame));
  debug(`hooks: ${hookStatus.join(", ")}`);
}

/** For /tc dump: what is hooked and what each visible row resolved to. */
export function dumpState(say: (msg: string) => void): void {
  say(`hooks: ${hookStatus.length > 0 ? hookStatus.join(", ") : "not installed"}`);
  const tip = shoppingTooltips()[0];
  const header = tip !== undefined ? field(tip, "CompareHeader") : undefined;
  if (isRegion(header)) {
    const label = headerLabel(header);
    const keys = Object.keys(header as object).filter((k) => typeof k === "string").sort().join(",");
    say(`compare header: shown=${header.IsShown()} label=${label ? `"${label.GetText() ?? ""}"` : "none"} fields={${keys}}`);
  } else {
    say("compare header: none");
  }
  say(`calls: initRow=${counters.initRow} initCategory=${counters.initCategory} refresh=${counters.refresh} tooltip=${counters.tooltip} compare=${counters.compare}`);
  const box = ClassTrainerFrame?.ScrollBox;
  if (!box?.ForEachFrame || !ClassTrainerFrame?.IsShown()) {
    say("open a trainer to see rows");
    return;
  }
  box.ForEachFrame((frame, data) => {
    safe("dump row", () => {
      const raw = data ?? (frame.GetElementData ? frame.GetElementData() : undefined);
      const shape = typeof raw === "object" ? `{${keysOf(raw)}}` : `${raw}`;
      const index = resolveIndex(frame, data);
      if (index === undefined) return say(`row data=${shape} -> no index`);
      const [name] = GetTrainerServiceInfo(index);
      const link = GetTrainerServiceItemLink(index);
      const ev = link !== undefined ? evaluate(link) : undefined;
      say(`row data=${shape} -> [${index}] ${name}: ${ev ? ev.verdict : "no item"}${ev?.reason ? ` (${ev.reason})` : ""}`);
    });
  });
}
