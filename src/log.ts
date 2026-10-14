const PREFIX = "|cff33ff99TrainerUpgrades|r ";

let debugOn = false;

export function setDebug(on: boolean): void {
  debugOn = on;
}

/** Always prints. Use only for replies to slash commands. */
export function say(msg: string): void {
  print(PREFIX + msg);
}

/** Prints only when `/tu debug` is on. */
export function debug(msg: string): void {
  if (debugOn) print(PREFIX + "|cff999999debug|r " + msg);
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
