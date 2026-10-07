import type { SourceAttr } from "../types";

/*
 * Reset all overrides (Studio builder GĐ4 M1, spec docs/research/studio-builder-instance-spec-2026-10-07.md §3a, user's
 * Q4 answer: keep the content). Figma's "Reset all changes" for a Zen instance: every design prop the source writes as a
 * fixed value (a variant, a boolean, an icon, a text style) goes back to the component's default, in one request, so one
 * ⌘Z brings them all back. What the instance says and does stays: children and text props, required props, handlers,
 * data (objects, lists, numbers), values and open state, and anything bound to code (a variable, state, a spread).
 *
 * Pure: a type-only import, so resetAll.selftest.mjs imports it directly.
 */

/** The editors of design props: what Figma shows as variants, booleans and instance swaps. */
const DESIGN_EDITORS = new Set(["enum", "number-enum", "boolean", "icon", "icon-toggle", "typography", "truncate", "text-align"]);

/** Props that hold what the instance shows, does or is (its element, its heading level), never reset although their
 *  editor is a choice or a switch. */
const KEEP = new Set(["value", "defaultValue", "defaultChecked", "open", "defaultOpen", "required", "id", "name", "href", "target", "rel", "type", "role", "tabIndex", "htmlFor", "form", "key", "as", "headingLevel"]);

/** A literal written in braces: `{false}`, `{3}`, `{"md"}`. */
const BRACED_LITERAL = /^\s*(true|false|-?\d+(\.\d+)?|"[^"]*"|'[^']*')\s*$/;

/** Whether the source writes this attribute as a fixed value (`size="lg"`, `disabled`, `level={"primary"}`). */
export function isFixedValue(attr: SourceAttr): boolean {
  if (attr.kind === "true" || attr.kind === "string") return true;
  if (attr.kind !== "expression" || attr.shape || attr.state) return false;
  return BRACED_LITERAL.test(attr.value ?? "");
}

export type ResetSpec = { name: string; editor: string };

/**
 * The props Reset all overrides removes, in source order: written as a fixed value, documented with a design editor
 * (`specs`), not required and not content (KEEP, aria-*, data-*). The last write of a prop is the one that counts.
 */
export function resetAllProps(attributes: readonly SourceAttr[], specs: readonly ResetSpec[], required: ReadonlySet<string>): string[] {
  const editors = new Map(specs.map((spec) => [spec.name, spec.editor]));
  const names: string[] = [];
  for (const attr of attributes) {
    if (attr.kind === "spread" || names.includes(attr.name)) continue;
    const last = attributes.filter((other) => other.kind !== "spread" && other.name === attr.name).at(-1)!;
    const editor = editors.get(attr.name);
    if (!editor || !DESIGN_EDITORS.has(editor) || required.has(attr.name) || KEEP.has(attr.name) || /^(aria|data)-/.test(attr.name)) continue;
    if (isFixedValue(last)) names.push(attr.name);
  }
  return names;
}
