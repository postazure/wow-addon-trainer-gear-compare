import { safe, say } from "./log";

const NAME = "TrainerCompareCopyWindow";

let edit: EditBox | undefined;
let frame: Frame | undefined;
let lastText = "";

function build(): void {
  const template = BackdropTemplateMixin !== undefined ? "BackdropTemplate" : undefined;
  const f = CreateFrame("Frame", NAME, UIParent, template) as BackdropFrame;
  f.SetSize(760, 420);
  f.SetPoint("CENTER");
  f.SetFrameStrata("DIALOG");
  f.SetMovable(true);
  f.EnableMouse(true);
  f.RegisterForDrag("LeftButton");
  f.SetScript("OnDragStart", (self: Frame) => self.StartMoving());
  f.SetScript("OnDragStop", (self: Frame) => self.StopMovingOrSizing());
  if (f.SetBackdrop) {
    f.SetBackdrop({
      bgFile: "Interface\\DialogFrame\\UI-DialogBox-Background",
      edgeFile: "Interface\\DialogFrame\\UI-DialogBox-Border",
      tile: true, tileSize: 32, edgeSize: 32,
      insets: { left: 8, right: 8, top: 8, bottom: 8 },
    });
  }

  const title = f.CreateFontString(undefined, "OVERLAY", "GameFontNormal");
  title.SetPoint("TOP", 0, -14);
  title.SetText("Trainer Compare  -  press Ctrl+C to copy, Esc to close");

  const close = CreateFrame("Button", undefined, f, "UIPanelCloseButton");
  close.SetPoint("TOPRIGHT", -4, -4);

  const scroll = CreateFrame("ScrollFrame", `${NAME}Scroll`, f, "UIPanelScrollFrameTemplate");
  scroll.SetPoint("TOPLEFT", 16, -36);
  scroll.SetPoint("BOTTOMRIGHT", -34, 16);

  const box = CreateFrame("EditBox", undefined, scroll);
  box.SetMultiLine(true);
  box.SetAutoFocus(false);
  box.SetFontObject(ChatFontNormal);
  box.SetWidth(700);
  box.SetScript("OnEscapePressed", () => f.Hide());
  scroll.SetScrollChild(box);

  UISpecialFrames.push(NAME);
  frame = f;
  edit = box;
}

/** Show the window with all text selected, ready for Ctrl+C. */
function open(): void {
  if (!edit) {
    safe("copy window", build);
    if (!edit) {
      say("copy window failed to open. Take a screenshot of chat instead.");
      return;
    }
  }
  edit.SetText(lastText);
  frame!.Show();
  edit.SetFocus();
  edit.HighlightText();
}

/**
 * Show lines in a box the user can copy from. Pipes are doubled so raw
 * color and link codes stay visible instead of being drawn.
 */
export function showCopyWindow(lines: string[]): void {
  lastText = lines.map((l) => l.replaceAll("|", "||")).join("\n");
  open();
}

/** Reopen the last copy window. */
export function reopenCopyWindow(): void {
  if (lastText === "") {
    say("nothing to copy yet. Run /tc menus first.");
    return;
  }
  open();
}
