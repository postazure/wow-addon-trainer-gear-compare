import { settings } from "./db";
import { debug, safe } from "./log";
import { scheduleRefresh } from "./rows";
import { field, isWidget } from "./widgets";

/** The trainer's Settings dropdown, found with /tc menus on 1.60.1. */
const FILTER_MENU_TAG = "MENU_TRAINER_FILTER";

/** The fallback checkbox, when the client has no Menu API. */
let checkbox: CheckButton | undefined;

/** Turn the usable filter on or off, keep the checkbox in step, and refresh the rows. */
export function setOnlyUsable(on: boolean): void {
  settings().onlyUsable = on;
  checkbox?.SetChecked(on);
  scheduleRefresh();
}

/**
 * Add "Only show usable gear" to the trainer's Settings dropdown with
 * Menu.ModifyMenu, Blizzard's supported, taint-safe hook. No header, no divider.
 */
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
    if (isWidget(candidate)) return candidate as Region;
  }
  return undefined;
}

/** Fallback toggle: a "Usable" checkbox just left of the Train button, laid out [label][box][Train]. */
function createCheckbox(parent: Frame): void {
  const cb = CreateFrame("CheckButton", "TrainerCompareUsableFilter", parent, "UICheckButtonTemplate");
  cb.SetSize(24, 24);
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

/** Put the usable-filter toggle in the Settings dropdown, or a checkbox if that's not possible. */
export function installFilterToggle(frame: Frame): "menu" | "checkbox" {
  if (addToSettingsMenu()) return "menu";
  createCheckbox(frame);
  return "checkbox";
}
