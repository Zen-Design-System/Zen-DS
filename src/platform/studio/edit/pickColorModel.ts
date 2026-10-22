/*
 * Figma's Pick color (I), its pure part (spec docs/research/studio-fill-gradient-smoothing-eyedropper-spec-2026-10-22.md
 * §3; user 2026-10-22: "Token layer, rồi pixel"). A picked colour is a colour variable (decision 1 of the 2026-10-18
 * parity plan): the layer under the pointer paints with one, and the target takes it when its palette has it (exact);
 * otherwise (a picture's pixel, or a variable the target's palette lacks) the target takes the nearest colour of its own
 * palette: the fill palette for a Shape, the surfaces for a frame, the text tones for a Text, Heading or Icon. Type-only
 * imports, so pickColorModel.selftest.mjs imports it directly.
 */
import type { Rgb } from "../inspector/controls/colorMatch";
import type { EditOp } from "../types";

export type PickPalette = "fill" | "surface" | "tone";
export type PickTarget = { prop: "fill" | "surface" | "tone"; palette: PickPalette };
/** A palette option with the CSS variable it paints with and its colour under the layer (null: unreadable). */
export type PickOption = { option: string; cssVar: string; rgb: Rgb | null };

const FRAMES = new Set(["Box", "Stack", "Grid"]);

/**
 * What a picked colour paints on a layer (Figma's: its fill): a Shape's `fill`, a frame's `surface`, the `tone` of a
 * component whose tones are text colours (`toneOptions`, its API's: Text, Heading, Icon); null for the rest (a Button's
 * colours come from its theme).
 */
export function pickTargetOf(name: string, toneOptions: readonly string[] | null): PickTarget | null {
  const base = name.slice(name.lastIndexOf(".") + 1);
  if (base === "Shape") return { prop: "fill", palette: "fill" };
  if (FRAMES.has(base)) return { prop: "surface", palette: "surface" };
  if (toneOptions && toneOptions.length) return { prop: "tone", palette: "tone" };
  return null;
}

/** How far apart two colours look (colorMatch's redmean distance, kept here so the model stays type-only). */
function distance(a: Rgb, b: Rgb): number {
  const mean = (a.r + b.r) / 2;
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return Math.sqrt((2 + mean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - mean) / 256) * db * db);
}

/**
 * The option a picked colour takes: the one painted with one of `tokens` (the variables the picked layer's colour is,
 * its own role first), else the nearest to `rgb`; null when nothing can be matched.
 */
export function chooseOption(options: readonly PickOption[], tokens: readonly string[], rgb: Rgb | null): { option: string; exact: boolean } | null {
  for (const token of tokens) {
    const hit = options.find((candidate) => candidate.cssVar === token);
    if (hit) return { option: hit.option, exact: true };
  }
  if (!rgb) return null;
  let best: { option: string; gap: number } | null = null;
  for (const candidate of options) {
    if (!candidate.rgb) continue;
    const gap = distance(candidate.rgb, rgb);
    if (!best || gap < best.gap) best = { option: candidate.option, gap };
  }
  return best ? { option: best.option, exact: false } : null;
}

/**
 * The ops a pick writes on one layer: its prop set to the option; a fill or surface also takes the place of a gradient
 * written there (Figma's picked colour is a solid paint). Nothing when the layer already paints with it.
 */
export function pickOps(target: PickTarget, option: string, written: ReadonlyMap<string, string | null>): EditOp[] {
  const ops: EditOp[] = [];
  if (written.get(target.prop) !== option) ops.push({ op: "setProp", name: target.prop, value: { kind: "string", value: option } });
  if (target.prop !== "tone" && written.has("gradient")) ops.push({ op: "removeProp", name: "gradient" });
  return ops;
}

/** "#F2A0C4" from a browser EyeDropper's `sRGBHex` (or any 6-digit hex), else null. */
export function rgbOfHex(hex: unknown): Rgb | null {
  const match = typeof hex === "string" ? /^#?([0-9a-f]{6})$/i.exec(hex.trim()) : null;
  return match ? { r: parseInt(match[1].slice(0, 2), 16), g: parseInt(match[1].slice(2, 4), 16), b: parseInt(match[1].slice(4, 6), 16) } : null;
}
