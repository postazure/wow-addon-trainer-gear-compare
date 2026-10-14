import { headerLabel, onTooltipCleared, onTrainerTooltip, shoppingTooltips } from "./compareTooltips";
import { evaluate } from "./compare";
import { counters } from "./counters";
import { debug, safe } from "./log";
import { applyFilter, decorate, resolveIndex, scheduleRefresh } from "./rows";
import { installFilterToggle } from "./settingsMenu";
import { field, isRegion, keysOf } from "./widgets";

/** Owner token for Blizzard callback registries. */
const OWNER = {};

let installed = false;

/** One entry per hook: "name=yes", "name=missing", or "name=failed". Shown by /tc dump. */
const hookStatus: string[] = [];

/** Install one hook. A failure is recorded, never thrown. */
function tryHook(name: string, install: () => void): void {
  const ok = safe(`hook ${name}`, () => { install(); return true; });
  hookStatus.push(`${name}=${ok ? "yes" : "failed"}`);
}

/** Post-hook a Blizzard global function, if this client has it. */
function hookGlobal(name: string, fn: (...args: any[]) => void): void {
  if (typeof _G[name] !== "function") {
    hookStatus.push(`${name}=missing`);
    return;
  }
  tryHook(name, () => hooksecurefunc(name, fn));
}

/**
 * Install once, as soon as Blizzard_TrainerUI is loaded. Every hook is a
 * post-hook (hooksecurefunc) or a Blizzard-supported callback, and each is
 * optional: a missing one is skipped, so the trainer frame is never tainted.
 */
export function installTrainerHooks(): void {
  const frame = ClassTrainerFrame;
  if (installed || !frame) return;
  installed = true;

  hookGlobal("ClassTrainerFrame_InitServiceButton", (button: Frame, elementData: unknown) => {
    counters.initRow++;
    safe("init row", () => decorate(button, elementData));
  });
  hookGlobal("ClassTrainerFrame_InitCategoryButton", (button: Frame) => {
    counters.initCategory++;
    safe("init category", () => applyFilter(button, undefined));
  });
  hookGlobal("ClassTrainerFrame_Update", () => scheduleRefresh());

  /** Backup in case the ScrollBox holds a direct reference to the row init function. */
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
  tryHook("GameTooltip.SetOwner", () =>
    hooksecurefunc(GameTooltip, "SetOwner", () => safe("tooltip owner", onTooltipCleared)));
  tryHook("GameTooltip OnHide", () =>
    GameTooltip.HookScript("OnHide", () => safe("tooltip hide", onTooltipCleared)));

  tryHook("filter toggle", () => {
    const where = installFilterToggle(frame);
    hookStatus.push(`filter toggle in ${where}`);
  });
  debug(`hooks: ${hookStatus.join(", ")}`);
}

/** For /tc dump: what is hooked, the compare header, and what each visible row resolved to. */
export function dumpState(say: (msg: string) => void): void {
  say(`hooks: ${hookStatus.length > 0 ? hookStatus.join(", ") : "not installed"}`);
  const tip = shoppingTooltips()[0];
  const header = tip !== undefined ? field(tip, "CompareHeader") : undefined;
  if (isRegion(header)) {
    const label = headerLabel(header);
    say(`compare header: shown=${header.IsShown()} label=${label ? `"${label.GetText() ?? ""}"` : "none"} fields={${keysOf(header)}}`);
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
