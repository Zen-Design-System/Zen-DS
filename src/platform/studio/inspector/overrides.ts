/*
 * Writing Figma instance overrides (src/components/_shared/nested.tsx): a part the owner draws itself is edited by
 * rewriting the owner's `overrides` prop, `{ "<layer path>": { <prop>: <value> } }`, as one setProp (one undo step).
 * Pure (no React, no DOM, no value imports), so overrides.selftest.mjs imports it directly.
 */

import type { EditOp } from "../types";

type Literal = string | number | boolean;
export type OverrideTable = Record<string, Record<string, Literal>>;

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const isLiteral = (value: unknown): value is Literal => typeof value === "string" || (typeof value === "number" && Number.isFinite(value)) || typeof value === "boolean";

/** The owner's rendered `overrides` as a table of literals (anything else in it is dropped; Studio writes literals only). */
export function overrideTable(value: unknown): OverrideTable {
  const out: OverrideTable = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [path, props] of Object.entries(value as Record<string, unknown>)) {
    if (!props || typeof props !== "object" || Array.isArray(props)) continue;
    const own: Record<string, Literal> = {};
    for (const [prop, literal] of Object.entries(props as Record<string, unknown>)) if (isLiteral(literal)) own[prop] = literal;
    if (Object.keys(own).length) out[path] = own;
  }
  return out;
}

/** `table` with `prop` of layer `path` set to `value`, or removed (null); a layer left with nothing is dropped. */
export function withOverride(table: OverrideTable, path: string, prop: string, value: Literal | null): OverrideTable {
  const next: OverrideTable = {};
  for (const [key, props] of Object.entries(table)) next[key] = { ...props };
  const layer = { ...next[path] };
  if (value === null) delete layer[prop];
  else layer[prop] = value;
  if (Object.keys(layer).length) next[path] = layer;
  else delete next[path];
  return next;
}

/** `table` without any override of layer `path` (Figma's Reset all overrides on a nested instance). */
export function withoutLayer(table: OverrideTable, path: string): OverrideTable {
  const next: OverrideTable = { ...table };
  delete next[path];
  return next;
}

const literalCode = (value: Literal) => (typeof value === "string" ? JSON.stringify(value) : String(value));

/** The table as the JS object the source holds: `{ "Sub-Action": { level: "danger" } }`. */
export function overridesCode(table: OverrideTable): string {
  const layers = Object.entries(table).map(([path, props]) => {
    const fields = Object.entries(props).map(([prop, value]) => `${IDENTIFIER.test(prop) ? prop : JSON.stringify(prop)}: ${literalCode(value)}`);
    return `${JSON.stringify(path)}: { ${fields.join(", ")} }`;
  });
  return layers.length ? `{ ${layers.join(", ")} }` : "{}";
}

/** The ops that make the owner's `overrides` hold `next` (removed when empty), none when nothing changes. */
export function overrideOps(current: OverrideTable, next: OverrideTable): EditOp[] {
  if (overridesCode(current) === overridesCode(next)) return [];
  if (!Object.keys(next).length) return [{ op: "removeProp", name: "overrides" }];
  return [{ op: "setProp", name: "overrides", value: { kind: "expression", code: overridesCode(next) } }];
}
