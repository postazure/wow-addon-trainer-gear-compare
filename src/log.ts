import { settings } from "./db";

export const PREFIX = "|cff33ff99Trainer Compare|r ";

/**
 * Prints only when debug is on. It's off by default; to turn it on, type
 * /run TrainerCompareDB.debug = true (and false to turn it off). It takes
 * effect at once and is saved.
 */
export function debug(msg: string): void {
  if (settings().debug) print(PREFIX + "|cff999999debug|r " + msg);
}

/**
 * Run fn. If it throws, return undefined and stay silent,
 * unless debug is on. Nothing from this addon should reach the error frame.
 */
export function safe<T>(label: string, fn: () => T): T | undefined {
  try {
    return fn();
  } catch (e) {
    debug(`${label} failed: ${e}`);
    return undefined;
  }
}
