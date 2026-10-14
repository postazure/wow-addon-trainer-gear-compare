/**
 * Hand-written types for the WoW Forever client.
 *
 * Rules:
 * - Only declare what the addon uses.
 * - If the probe has not confirmed an API exists in Forever, type it as
 *   possibly undefined. The compiler then forces a check before use.
 * - Note the source of each group, so it is easy to re-check later.
 */

// ---------------------------------------------------------------------------
// Lua and core globals. Safe in every WoW client.
// ---------------------------------------------------------------------------

declare function print(...args: unknown[]): void;
declare function date(format?: string): string;
declare function hooksecurefunc(globalName: string, hook: (...args: any[]) => void): void;
declare function hooksecurefunc<T extends object>(table: T, method: keyof T & string, hook: (...args: any[]) => void): void;

/** Slash command handlers, keyed by command id. */
declare const SlashCmdList: Record<string, (msg: string) => void>;
declare let SLASH_TRAINERUPGRADES1: string;

/** SavedVariables. Nil on first load, before ADDON_LOADED fills it in. */
declare let TrainerUpgradesDB: TrainerUpgradesSaved | undefined;

interface TrainerUpgradesSaved {
  debug: boolean;
  onlyUpgrades: boolean;
  scoring: string;
}

/** Fourth value is the TOC interface number. */
declare function GetBuildInfo(): LuaMultiReturn<[string, string, string, number]>;

// Not yet confirmed in Forever.
declare const C_Timer: { After(seconds: number, callback: () => void): void } | undefined;

// ---------------------------------------------------------------------------
// Widgets. Only the methods in use.
// ---------------------------------------------------------------------------

type WowEvent = string;

interface UIObject {
  GetName(): string | undefined;
  GetObjectType(): string;
}

interface Region extends UIObject {
  Show(): void;
  Hide(): void;
  IsShown(): boolean;
  SetPoint(point: string, relativeTo?: Region | string, relativePoint?: string, x?: number, y?: number): void;
  SetPoint(point: string, x: number, y: number): void;
  ClearAllPoints(): void;
  SetSize(width: number, height: number): void;
}

interface Frame extends Region {
  RegisterEvent(event: WowEvent): void;
  UnregisterEvent(event: WowEvent): void;
  SetScript(handler: "OnEvent", fn: ((frame: Frame, event: WowEvent, ...args: any[]) => void) | undefined): void;
  SetScript(handler: "OnUpdate", fn: ((frame: Frame, elapsed: number) => void) | undefined): void;
  SetScript(handler: string, fn: ((...args: any[]) => void) | undefined): void;
}

declare function CreateFrame(frameType: "Frame", name?: string, parent?: Frame, template?: string): Frame;

declare const UIParent: Frame;
