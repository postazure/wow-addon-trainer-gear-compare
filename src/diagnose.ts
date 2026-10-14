import { safe } from "./log";

/** Resolve "Name" or "Table.Func" from _G. */
function lookup(path: string): unknown {
  let value: unknown = _G;
  for (const part of path.split(".")) {
    if (typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

function field(obj: unknown, name: string): unknown {
  return (obj as Record<string, unknown>)[name];
}

function isWidget(value: unknown): boolean {
  return typeof value === "object" && typeof field(value, "GetObjectType") === "function";
}

function looksLikeMenu(name: string): boolean {
  const lower = name.toLowerCase();
  return ["drop", "filter", "setting", "menu"].some((word) => lower.includes(word));
}

const MENU_API = [
  "Menu.ModifyMenu", "Menu.PrintOpenMenuTags", "Menu.GetManager", "MenuUtil.CreateContextMenu",
  "UIDropDownMenu_Initialize", "UIDropDownMenu_AddButton", "UIDropDownMenu_CreateInfo",
];

const DROPDOWN_METHODS = ["SetupMenu", "OpenMenu", "GenerateMenu", "SetMenuTag", "GetMenuDescription", "IsMenuOpen", "SetDefaultText"];

function describe(name: string, widget: unknown): string {
  const methods = DROPDOWN_METHODS.filter((m) => typeof field(widget, m) === "function");
  const tag = field(widget, "menuTag");
  const type = (widget as UIObject).GetObjectType();
  return `${name} (${type}) methods={${methods.join(",")}}${tag !== undefined ? ` menuTag=${tag}` : ""}`;
}

/**
 * Find how the trainer's dropdowns are built, then watch while the user
 * opens one. Used to add our filter to the Settings dropdown safely.
 */
export function diagnoseMenus(say: (msg: string) => void): void {
  const have = MENU_API.filter((p) => typeof lookup(p) === "function");
  const missing = MENU_API.filter((p) => typeof lookup(p) !== "function");
  say(`menu API present: ${have.length > 0 ? have.join(", ") : "none"}`);
  say(`menu API missing: ${missing.length > 0 ? missing.join(", ") : "none"}`);

  const frame = ClassTrainerFrame;
  if (!frame) {
    say("open a trainer first, then run /tu menus again");
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
  if (seconds === 10) say("done. Paste everything from \"menu API present\" down.");
}
