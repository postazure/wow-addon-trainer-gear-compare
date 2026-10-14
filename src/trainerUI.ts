import { evaluate, type Evaluation, invalidate } from "./compare";
import { settings } from "./db";
import { debug, safe } from "./log";
import { tooltipLines } from "./tooltip";

const DIM_ALPHA = 0.35;
const OWNER = {}; // callback registry owner token

interface Marker {
  arrow: Texture;
  dash: Texture;
}

// Our own tables, keyed by Blizzard's row buttons. We never write fields on them.
const markers = new Map<Frame, Marker>();
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
// Markers and dimming
// ---------------------------------------------------------------------------

function markerFor(button: Frame): Marker {
  const hit = markers.get(button);
  if (hit) return hit;

  const icon = field(button, "icon") ?? field(button, "Icon");
  const anchor = typeof icon === "object" ? (icon as Region) : button;

  const arrow = button.CreateTexture(undefined, "OVERLAY");
  arrow.SetTexture("Interface\\Buttons\\UI-MicroStream-Green");
  arrow.SetTexCoord(0, 1, 1, 0); // flip the down arrow so it points up
  arrow.SetSize(14, 14);
  arrow.SetPoint("TOPLEFT", anchor, "TOPLEFT", -3, 3);

  const dash = button.CreateTexture(undefined, "OVERLAY");
  dash.SetColorTexture(0.65, 0.65, 0.65, 1);
  dash.SetSize(8, 2);
  dash.SetPoint("TOPLEFT", anchor, "TOPLEFT", 1, -2);

  const marker = { arrow, dash };
  markers.set(button, marker);
  return marker;
}

function showVerdict(button: Frame, ev: Evaluation | undefined): void {
  const verdict = ev?.verdict;
  if (verdict === "upgrade" || verdict === "same") {
    const m = markerFor(button);
    if (verdict === "upgrade") { m.arrow.Show(); m.dash.Hide(); } else { m.arrow.Hide(); m.dash.Show(); }
  } else {
    const m = markers.get(button);
    if (m) { m.arrow.Hide(); m.dash.Hide(); }
  }

  const dim = settings().onlyUpgrades && ev !== undefined && verdict !== "upgrade";
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
  if (index === undefined) return showVerdict(button, undefined);

  const [name, kind] = GetTrainerServiceInfo(index);
  if (name === undefined || kind === "header") return showVerdict(button, undefined);

  // Safety net: never mark a row with another recipe's result.
  const label = rowLabel(button);
  if (label !== undefined && !label.includes(name)) {
    debug(`row ${index} shows "${label}" but service is "${name}"; skipped`);
    return showVerdict(button, undefined);
  }

  const link = GetTrainerServiceItemLink(index);
  showVerdict(button, link !== undefined ? evaluate(link) : { verdict: "none" });
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

export function setOnlyUpgrades(on: boolean): void {
  settings().onlyUpgrades = on;
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
// True only while the shopping tooltips show what we put there.
let compareShown = false;

function shoppingTooltips(): GameTooltip[] {
  const tips: GameTooltip[] = [];
  for (const name of ["ShoppingTooltip1", "ShoppingTooltip2"]) {
    const tip = _G[name];
    if (typeof tip === "object" && typeof field(tip, "SetInventoryItem") === "function") tips.push(tip as GameTooltip);
  }
  return tips;
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
  if (!compareShown) return;
  compareShown = false;
  for (const tip of shoppingTooltips()) tip.Hide();
}

/**
 * The trainer tooltip is a spell tooltip, so the built-in compare never
 * starts. Show the equipped item(s) in the built-in compare tooltips.
 */
function showCompare(tooltip: GameTooltip, index: number): void {
  hideCompare();
  if (!wantsCompare()) return;
  const link = GetTrainerServiceItemLink(index);
  if (link === undefined) return;
  const ev = evaluate(link);
  const slots = ev.versus?.compareSlots ?? [];
  if ((ev.verdict !== "upgrade" && ev.verdict !== "same") || slots.length === 0) return;
  const tips = shoppingTooltips();
  if (tips.length === 0) return;

  // Open to the left when there's no room on the right, like the built-in compare.
  const right = tooltip.GetRight() ?? 0;
  const screen = UIParent.GetRight() ?? 0;
  const toLeft = screen > 0 && right > screen * 0.6;
  let anchor: Region = tooltip;
  for (let i = 0; i < slots.length && i < tips.length; i++) {
    const tip = tips[i];
    tip.SetOwner(tooltip, "ANCHOR_NONE");
    tip.ClearAllPoints();
    const y = i === 0 ? -10 : 0;
    if (toLeft) tip.SetPoint("TOPRIGHT", anchor, "TOPLEFT", 0, y);
    else tip.SetPoint("TOPLEFT", anchor, "TOPRIGHT", 0, y);
    tip.SetInventoryItem("player", slots[i]);
    tip.Show();
    anchor = tip;
  }
  compareShown = true;
  counters.compare++;
}

/** Shift pressed or released, or data arrived, while a recipe is hovered. */
export function refreshHover(): void {
  if (hoveredIndex !== undefined && GameTooltip.IsShown()) showCompare(GameTooltip, hoveredIndex);
}

function onTrainerTooltip(tooltip: GameTooltip, index: number): void {
  hoveredIndex = index;
  if (settings().tooltipLines) addTooltipLines(tooltip, index);
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
// Checkbox
// ---------------------------------------------------------------------------

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
  const cb = CreateFrame("CheckButton", "TrainerUpgradesOnlyUpgrades", parent, "UICheckButtonTemplate");
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
  text.SetText("Upgrades");
  cb.SetChecked(settings().onlyUpgrades);
  cb.SetScript("OnClick", (self: CheckButton) => {
    safe("checkbox", () => setOnlyUpgrades(self.GetChecked()));
  });
  cb.SetScript("OnEnter", (self: CheckButton) => {
    GameTooltip.SetOwner(self, "ANCHOR_TOP");
    GameTooltip.SetText("Only show upgrades");
    GameTooltip.AddLine("Fades every recipe that is not a gear upgrade.", 1, 1, 1, true);
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
  // Category rows reuse buttons; clear our marker on them.
  hookGlobal("ClassTrainerFrame_InitCategoryButton", (button: Frame) => {
    counters.initCategory++;
    safe("init category", () => showVerdict(button, undefined));
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

  tryHook("checkbox", () => createCheckbox(frame));
  debug(`hooks: ${hookStatus.join(", ")}`);
}

/** For /tu dump: what is hooked and what each visible row resolved to. */
export function dumpState(say: (msg: string) => void): void {
  say(`hooks: ${hookStatus.length > 0 ? hookStatus.join(", ") : "not installed"}`);
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
