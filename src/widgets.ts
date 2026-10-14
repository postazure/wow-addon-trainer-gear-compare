/** Read a field from a Blizzard table or frame without TypeScript knowing its shape. */
export function field(obj: unknown, name: string): unknown {
  return (obj as Record<string, unknown>)[name];
}

/** True for anything that can be shown and hidden (frames, textures, font strings). */
export function isRegion(value: unknown): value is Region {
  return typeof value === "object" && typeof field(value, "Show") === "function";
}

/** True for any UI object (it has GetObjectType). */
export function isWidget(value: unknown): value is UIObject {
  return typeof value === "object" && typeof field(value, "GetObjectType") === "function";
}

/** The string keys of a table, sorted and comma-joined. For debug output. */
export function keysOf(obj: unknown): string {
  return Object.keys(obj as object).filter((k) => typeof k === "string").sort().join(",");
}
