import { showCopyWindow } from "./copyWindow";
import { PREFIX, safe } from "./log";
import { field, isWidget, keysOf } from "./widgets";

/** Resolve "Name" or "Table.Func" from _G. */
function lookup(path: string): unknown {
  let value: unknown = _G;
  for (const part of path.split(".")) {
    if (typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

/** Widget names worth reporting: anything that sounds like a dropdown or menu. */
function looksLikeMenu(name: string): boolean {
  const lower = name.toLowerCase();
  return ["drop", "filter", "setting", "menu"].some((word) => lower.includes(word));
}

const MENU_API = [
  "Menu.ModifyMenu", "Menu.PrintOpenMenuTags", "Menu.GetManager", "MenuUtil.CreateContextMenu",
  "UIDropDownMenu_Initialize", "UIDropDownMenu_AddButton", "UIDropDownMenu_CreateInfo",
];

const COMPARE_API = [
  "GameTooltip_ShowCompareItem", "TooltipComparisonManager.CompareItem", "C_TooltipComparison.GetItemComparisonInfo",
  "ShoppingTooltip1.SetInventoryItem", "ShoppingTooltip1.SetCompareItem", "ShoppingTooltip2.SetInventoryItem",
  "IsModifiedClick", "GetCVarBool",
];

const DROPDOWN_METHODS = ["SetupMenu", "OpenMenu", "GenerateMenu", "SetMenuTag", "GetMenuDescription", "IsMenuOpen", "SetDefaultText"];

function describe(name: string, widget: unknown): string {
  const methods = DROPDOWN_METHODS.filter((m) => typeof field(widget, m) === "function");
  const tag = field(widget, "menuTag");
  const type = (widget as UIObject).GetObjectType();
  return `${name} (${type}) methods={${methods.join(",")}}${tag !== undefined ? ` menuTag=${tag}` : ""}`;
}

/** Lines collected for the copy window while /tc menus runs. */
let captured: string[] | undefined;
let chatHooked = false;

/**
 * Blizzard's Menu.PrintOpenMenuTags prints straight to chat. A post-hook on
 * the chat frame catches those lines too. Our own lines are added directly.
 */
function startCapture(): void {
  captured = [];
  if (chatHooked) return;
  chatHooked = true;
  safe("chat capture", () =>
    hooksecurefunc(DEFAULT_CHAT_FRAME, "AddMessage", (_frame: unknown, text: unknown) => {
      if (captured && typeof text === "string" && !text.startsWith(PREFIX)) captured.push(text);
    }));
}

function finishCapture(): void {
  const lines = captured ?? [];
  captured = undefined;
  showCopyWindow(lines);
}

/**
 * Find how the trainer's dropdowns are built, then watch while the user
 * opens one. Used to add our filter to the Settings dropdown safely.
 * Everything printed ends up in a copy window.
 */
export function diagnoseMenus(print: (msg: string) => void): void {
  startCapture();
  const say = (msg: string): void => {
    captured?.push(msg);
    print(msg);
  };
  safe("menus", () => runDiagnosis(say));
}

function runDiagnosis(say: (msg: string) => void): void {
  const have = MENU_API.filter((p) => typeof lookup(p) === "function");
  const missing = MENU_API.filter((p) => typeof lookup(p) !== "function");
  say(`menu API present: ${have.length > 0 ? have.join(", ") : "none"}`);
  say(`menu API missing: ${missing.length > 0 ? missing.join(", ") : "none"}`);
  reportCompare(say);

  const frame = ClassTrainerFrame;
  if (!frame) {
    say("open a trainer first, then run /tc menus again");
    finishCapture();
    return;
  }

  const found: string[] = [];
  for (const [key, value] of Object.entries(frame as unknown as Record<string, unknown>)) {
    if (typeof key === "string" && looksLikeMenu(key) && isWidget(value)) found.push(describe(`ClassTrainerFrame.${key}`, value));
  }
  for (const [key, value] of Object.entries(_G)) {
    if (typeof key === "string" && key.startsWith("ClassTrainer") && looksLikeMenu(key) && isWidget(value)) {
      found.push(describe(key, value));
    }
  }
  if (found.length === 0) say("no dropdown-like widgets found on the trainer frame");
  for (const line of found.sort()) say(`dropdown: ${line}`);

  say("Now open the trainer's Settings dropdown and keep it open. Watching for 10 seconds...");
  for (const seconds of [2, 4, 6, 8, 10]) {
    C_Timer.After(seconds, () => safe("menu watch", () => watchTick(say, seconds)));
  }
}

/** How the built-in compare tooltips work in this client. */
function reportCompare(say: (msg: string) => void): void {
  const have = COMPARE_API.filter((p) => typeof lookup(p) === "function");
  const missing = COMPARE_API.filter((p) => typeof lookup(p) !== "function");
  say(`compare API present: ${have.length > 0 ? have.join(", ") : "none"}`);
  say(`compare API missing: ${missing.length > 0 ? missing.join(", ") : "none"}`);
  const cvar = lookup("GetCVarBool");
  if (typeof cvar === "function") {
    say(`alwaysCompareItems: ${(cvar as (this: void, name: string) => boolean)("alwaysCompareItems")}`);
  }
  const tip = lookup("ShoppingTooltip1");
  if (isWidget(tip)) {
    const keys = keysOf(tip);
    say(`ShoppingTooltip1 fields: ${keys !== "" ? keys : "none"}`);
  }
}

function watchTick(say: (msg: string) => void, seconds: number): void {
  const print = lookup("Menu.PrintOpenMenuTags");
  say(`${seconds}s: open menus:`);
  if (typeof print === "function") (print as (this: void) => void)();

  const list = lookup("DropDownList1");
  if (isWidget(list) && (list as Region).IsShown()) {
    const open = lookup("UIDROPDOWNMENU_OPEN_MENU");
    const name = isWidget(open) ? (open as UIObject).GetName() : open;
    say(`${seconds}s: old-style UIDropDownMenu open: ${name}`);
  }
  if (seconds === 10) {
    say("done. A copy window is open: press Ctrl+C, then paste it in chat with Claude.");
    finishCapture();
  }
}
