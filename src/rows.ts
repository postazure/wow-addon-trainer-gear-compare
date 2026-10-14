import { refreshHover } from "./compareTooltips";
import { evaluate, type Evaluation, invalidate } from "./compare";
import { settings } from "./db";
import { debug, safe } from "./log";
import { field, keysOf } from "./widgets";

/** How faded a row is when the usable filter hides it. */
const DIM_ALPHA = 0.35;

/** Rows we faded, keyed by Blizzard's row buttons. We never write fields on them. */
const dimmed = new Set<Frame>();

let loggedUnresolved = false;
let refreshQueued = false;

/** Tree views wrap a row's data in a node with GetData(). */
type DataNode = { GetData(this: DataNode): unknown };

/**
 * Which trainer service a row shows. Undefined for category rows and for
 * row data we don't recognize. Handles plain data, tree nodes, and numbers.
 */
function resolveIndex(button: Frame, elementData: unknown): number | undefined {
  let data = elementData;
  if (data === undefined && button.GetElementData) data = button.GetElementData();
  if (typeof data === "object" && typeof field(data, "GetData") === "function") {
    data = (data as DataNode).GetData();
  }
  if (typeof data === "number") return data;
  if (typeof data === "object") {
    for (const key of ["skillIndex", "serviceIndex", "index", "trainerIndex"]) {
      const value = field(data, key);
      if (typeof value === "number") return value;
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

/**
 * The usable filter. Rows get no marks; with the filter on, gear you can't
 * use is faded. Only what we know is faded: non-gear and loading rows stay.
 */
export function applyFilter(button: Frame, ev: Evaluation | undefined): void {
  const fade = settings().onlyUsable && ev?.reason !== undefined;
  if (fade) {
    button.SetAlpha(DIM_ALPHA);
    dimmed.add(button);
  } else if (dimmed.has(button)) {
    button.SetAlpha(1);
    dimmed.delete(button);
  }
}

/**
 * Evaluate one service row and apply the filter. If the row's visible name
 * doesn't match the service, leave it alone: never fade a row because of
 * another recipe's result.
 */
export function decorate(button: Frame, elementData: unknown): void {
  const index = resolveIndex(button, elementData);
  if (index === undefined) return applyFilter(button, undefined);

  const [name, kind] = GetTrainerServiceInfo(index);
  if (name === undefined || kind === "header") return applyFilter(button, undefined);

  const label = rowLabel(button);
  if (label !== undefined && !label.includes(name)) {
    debug(`row ${index} shows "${label}" but service is "${name}"; skipped`);
    return applyFilter(button, undefined);
  }

  const link = GetTrainerServiceItemLink(index);
  applyFilter(button, link !== undefined ? evaluate(link) : { verdict: "none" });
}

/** Re-check every row the trainer list is showing. */
export function refreshVisible(): void {
  const box = ClassTrainerFrame?.ScrollBox;
  if (!box || !box.ForEachFrame || !ClassTrainerFrame?.IsShown()) return;
  box.ForEachFrame((frame, data) => {
    safe("decorate", () => decorate(frame, data));
  });
}

/** Coalesce many triggers into one refresh of the rows and the hovered tooltip, next frame. */
export function scheduleRefresh(): void {
  if (refreshQueued) return;
  refreshQueued = true;
  C_Timer.After(0, () => {
    refreshQueued = false;
    safe("refresh", refreshVisible);
    safe("refresh hover", refreshHover);
  });
}

/** Gear, level or spells changed: drop cached results and refresh. */
export function recheck(): void {
  invalidate();
  scheduleRefresh();
}
