/*
 * Pure model of the Appearance and Effects sections (WP-D of docs/research/studio-builder-plan-2026-10-05.md; spec
 * docs/research/studio-position-effects-radius-spec-2026-10-03.md §3.2–3.3, §4.2–4.3). Type-only imports, so the node
 * selftest (appearanceModel.selftest.mjs) imports it directly.
 *
 * Corner radius, canonical form: all four corners equal → `radius` only; otherwise `radius` plus only the corners that
 * differ from it. Effects: one Figma effect style per Box (`effectStyle`); drop shadows only on the Surface fill, the
 * background blur only on a translucent fill (Subtle, Pale).
 */
import type { EditOp } from "../types";

/** Corner-Radius steps (px in the default radius mode): none · 2xs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 · 3xl 28 · full. */
export const RADIUS_STEPS = ["none", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "full"] as const;
/** The per-corner props in Figma / CSS order (TL TR BR BL). */
export const CORNERS = ["radiusTopLeft", "radiusTopRight", "radiusBottomRight", "radiusBottomLeft"] as const;
export type Corner = (typeof CORNERS)[number];
export const cornerLabels: Readonly<Record<Corner, string>> = { radiusTopLeft: "Top left", radiusTopRight: "Top right", radiusBottomRight: "Bottom right", radiusBottomLeft: "Bottom left" };

/** What the source writes: `radius` and the corners that are set (literal token values only). */
export type WrittenRadius = { radius?: string; corners: Partial<Record<Corner, string>> };

const setProp = (name: string, value: string): EditOp => ({ op: "setProp", name, value: { kind: "string", value } });
const removeProp = (name: string): EditOp => ({ op: "removeProp", name });
const written = (w: WrittenRadius) => CORNERS.filter((corner) => w.corners[corner] !== undefined);

/** The token each corner renders with (a set corner, else `radius`, else undefined: the component's default). */
export function effectiveCorners(w: WrittenRadius): Record<Corner, string | undefined> {
  return Object.fromEntries(CORNERS.map((corner) => [corner, w.corners[corner] ?? w.radius])) as Record<Corner, string | undefined>;
}

/** Whether the corners differ (the uniform field then reads "Mixed"). */
export function isMixed(w: WrittenRadius): boolean {
  return new Set(Object.values(effectiveCorners(w))).size > 1;
}

/** Uniform pick: `radius=k` and every written corner removed (one apply). */
export function uniformPick(w: WrittenRadius, k: string): EditOp[] {
  return [setProp("radius", k), ...written(w).map(removeProp)];
}

/** Uniform reset: `radius` and every written corner removed (back to the component's default). */
export function uniformClear(w: WrittenRadius): EditOp[] {
  return [...(w.radius !== undefined ? [removeProp("radius")] : []), ...written(w).map(removeProp)];
}

/**
 * One corner set to `k`, kept canonical: when all four corners would now be k, `radius=k` and no corners; when k is
 * what `radius` already gives, that corner is removed; else the corner is written.
 */
export function cornerPick(w: WrittenRadius, corner: Corner, k: string): EditOp[] {
  const next = { ...effectiveCorners(w), [corner]: k };
  if (CORNERS.every((name) => next[name] === k)) return [...(w.radius === k ? [] : [setProp("radius", k)]), ...written(w).map(removeProp)];
  if (k === w.radius) return w.corners[corner] !== undefined ? [removeProp(corner)] : [];
  return [setProp(corner, k)];
}

/** One corner reset: it falls back to `radius`. */
export const cornerClear = (w: WrittenRadius, corner: Corner): EditOp[] => (w.corners[corner] !== undefined ? [removeProp(corner)] : []);

/* ── effects ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type EffectStyle = {
  name: string;
  group: "Shadow / Bottom" | "Shadow / Top" | "Effect";
  kind: "shadow" | "blur";
  /** What it is for (picker caption). */
  usage: string;
};

/** The effect styles a Box takes (spec §3.2): the others belong to their components (Input, Popover, Action, Glass). */
export const EFFECT_STYLES: readonly EffectStyle[] = [
  { name: "Shadow/Bottom/Level-1", group: "Shadow / Bottom", kind: "shadow", usage: "Card and Sidebar elevation" },
  { name: "Shadow/Bottom/Level-2", group: "Shadow / Bottom", kind: "shadow", usage: "Raised on hover" },
  { name: "Shadow/Bottom/Level-3", group: "Shadow / Bottom", kind: "shadow", usage: "Floating panels" },
  { name: "Shadow/Bottom/Level-4", group: "Shadow / Bottom", kind: "shadow", usage: "Highest elevation" },
  { name: "Shadow/Top/Level-1", group: "Shadow / Top", kind: "shadow", usage: "Bars pinned to the bottom" },
  { name: "Shadow/Top/Level-2", group: "Shadow / Top", kind: "shadow", usage: "Bottom sheets" },
  { name: "Shadow/Top/Level-3", group: "Shadow / Top", kind: "shadow", usage: "Raised bottom panels" },
  { name: "Shadow/Top/Level-4", group: "Shadow / Top", kind: "shadow", usage: "Highest upward elevation" },
  { name: "Effect/Overlay", group: "Effect", kind: "blur", usage: "Background blur 50, behind a translucent fill" },
];
export const effectStyleOf = (name: string | undefined) => EFFECT_STYLES.find((style) => style.name === name) ?? null;
/** The generated effect class suffix (style-effects.css): "Shadow/Bottom/Level-1" → shadow-bottom-level-1. */
export const effectKey = (name: string) => name.toLowerCase().replace(/\//g, "-");

/** Whether a style can render on this fill, and why not (the picker's disabled caption). */
export function effectAvailability(style: EffectStyle, surface: string | undefined): { ok: true } | { ok: false; reason: string } {
  if (style.kind === "shadow") {
    if (surface === "surface") return { ok: true };
    if (surface === "subtle" || surface === "pale" || surface === "surface-alt") return { ok: false, reason: "Not on a tinted fill" };
    return { ok: false, reason: "Needs the Surface fill" };
  }
  return surface === "subtle" || surface === "pale" ? { ok: true } : { ok: false, reason: "Needs a Subtle or Pale fill" };
}

/** What "+ Add effect" applies (Figma adds a drop shadow at once), or why nothing can be added. */
export function defaultEffect(surface: string | undefined, constraintY: string | undefined): { style: string } | { reason: string } {
  if (surface === "surface") return { style: constraintY === "bottom" ? "Shadow/Top/Level-1" : "Shadow/Bottom/Level-1" };
  if (surface === "subtle" || surface === "pale") return { style: "Effect/Overlay" };
  if (surface === "surface-alt") return { reason: "Surface-Alt takes no effect: no shadow on a tinted fill, and blur needs a translucent fill." };
  return { reason: "Effects need a fill." };
}

/** Rule warnings for what the source writes now, each with the fix (one apply). They warn; nothing is blocked. */
export function effectWarnings(v: { effectStyle?: string; surface?: string; border?: string }): Array<{ text: string; fix: EditOp[]; fixLabel: string }> {
  const style = effectStyleOf(v.effectStyle);
  if (!style) return [];
  const out: Array<{ text: string; fix: EditOp[]; fixLabel: string }> = [];
  if (style.kind === "shadow" && (v.surface === "subtle" || v.surface === "pale" || v.surface === "surface-alt")) out.push({ text: "No drop shadow on Subtle, Pale or Surface-Alt fills.", fix: [removeProp("effectStyle")], fixLabel: "Remove" });
  else if (style.kind === "shadow" && v.surface !== "surface") out.push({ text: "A shadow needs the Surface fill.", fix: [setProp("surface", "surface")], fixLabel: "Use Surface" });
  if (style.kind === "blur" && v.surface !== "subtle" && v.surface !== "pale") out.push({ text: "Background blur does nothing behind an opaque fill.", fix: [removeProp("effectStyle")], fixLabel: "Remove" });
  if (style.kind === "shadow" && v.border && v.border !== "none") out.push({ text: "A shadowed surface takes no border (elevation follows the Sidebar).", fix: [removeProp("border")], fixLabel: "Remove border" });
  return out;
}
