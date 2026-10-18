import { contentToneGroups, contentTones, contentToneToken, contentToneVar, resolveContentTone, type ContentTone } from "../../../components/_shared/contentTone";
import { cssVarOf, shapeFills, shapeFillTokens, shapeStrokes, shapeStrokeTokens, shapeSupportHues } from "../../../components/Shape/paint";

/*
 * The colour lists the Inspector's swatch control offers (PropField SwatchControl, Figma's Inline-Field Type=Color with
 * its variable list): Text / Heading / Icon `tone` (Color/Content), a Shape's `fill` (Color/Background) and `stroke`
 * (Color/Border), and a frame's `surface` and `border`. Every option is a token, named by its path; its swatch paints with
 * that token.
 */

export type SwatchPalette = {
  /** The option belongs to this palette. */
  has: (option: string) => boolean;
  /** The custom property it paints with, or null (inherit, none). */
  colorOf: (option: string) => string | null;
  /** Its token path ("Color/Background/Support/Blue/Soft"), or what it means. */
  caption: (option: string) => string;
  /** The option it paints as (an alias resolved), for "selected". */
  resolve: (option: string) => string;
  /** Families in list order. */
  groups: ReadonlyArray<{ name: string; options: readonly string[] }>;
};

const toneSet = new Set<string>(contentTones);
export const tonePalette: SwatchPalette = {
  has: (option) => toneSet.has(option),
  colorOf: (option) => (toneSet.has(option) ? contentToneVar(option as ContentTone) : null),
  caption: (option) => contentToneToken(option as ContentTone) ?? "Parent's color",
  resolve: (option) => resolveContentTone(option as ContentTone),
  groups: contentToneGroups.map(({ name, tones }) => ({ name, options: tones })),
};

function paintPalette(options: readonly string[], variables: Readonly<Record<string, string>>, families: ReadonlyArray<{ name: string; test: (option: string) => boolean }>): SwatchPalette {
  const set = new Set(options);
  const placed = new Set<string>();
  const groups = families.map(({ name, test }) => {
    const members = options.filter((option) => !placed.has(option) && test(option));
    members.forEach((option) => placed.add(option));
    return { name, options: members };
  }).filter(({ options: members }) => members.length);
  return {
    has: (option) => set.has(option),
    colorOf: (option) => (variables[option] ? cssVarOf(variables[option]) : null),
    // Its Figma variable, as Figma's list names it.
    caption: (option) => variables[option] ?? "No color",
    resolve: (option) => option,
    groups,
  };
}

const startsWith = (prefix: string) => (option: string) => option.startsWith(prefix);
const commonFamilies = [
  { name: "None", test: (option: string) => option === "none" },
  { name: "Neutral", test: startsWith("neutral-") },
  { name: "Accent", test: startsWith("accent-") },
  { name: "Info", test: startsWith("info-") },
  { name: "Positive", test: startsWith("positive-") },
  { name: "Negative", test: startsWith("negative-") },
  { name: "Warning", test: startsWith("warning-") },
  { name: "Inverse", test: startsWith("inverse") },
  { name: "Surface and canvas", test: (option: string) => /^(surface|canvas)/.test(option) },
  { name: "White and black", test: (option: string) => /^(white|black)/.test(option) },
  { name: "Container", test: startsWith("container-") },
];
const supportFamilies = shapeSupportHues.map((hue) => ({ name: `Support · ${hue[0].toUpperCase()}${hue.slice(1)}`, test: startsWith(`support-${hue}-`) }));

/** A Shape's fill: Color/Background tokens. */
export const fillPalette = paintPalette(shapeFills, shapeFillTokens, [...commonFamilies, ...supportFamilies]);
/** A Shape's stroke: Color/Border tokens. */
export const strokePalette = paintPalette(shapeStrokes, shapeStrokeTokens, [...commonFamilies, ...supportFamilies]);

/** A frame's fill (Box, Stack, Grid `surface`): the background layers, by their Color/Background variable. */
export const surfacePalette = paintPalette(["none", "surface", "surface-alt", "subtle", "pale", "canvas"], {
  surface: "Color/Background/Surface/Default", "surface-alt": "Color/Background/Surface/Alt", subtle: "Color/Background/Neutral/Subtle/Default",
  pale: "Color/Background/Neutral/Pale/Default", canvas: "Color/Background/Canvas/Default",
}, [{ name: "None", test: (option) => option === "none" }, { name: "Surface", test: (option) => option.startsWith("surface") }, { name: "Neutral", test: (option) => option === "subtle" || option === "pale" }, { name: "Canvas", test: (option) => option === "canvas" }]);
/** A frame's stroke (Box, Stack, Grid `border`): the closed borders, Pale (static) and Subtle (actionable). */
export const borderPalette = paintPalette(["none", "pale", "subtle"], { pale: "Color/Border/Neutral/Pale/Default", subtle: "Color/Border/Neutral/Subtle/Default" },
  [{ name: "None", test: (option) => option === "none" }, { name: "Neutral", test: (option) => option !== "none" }]);

/** The swatch list a prop's options belong to, or null (a plain select). */
export function paletteFor(prop: string, options: readonly string[]): SwatchPalette | null {
  if (!options.length) return null;
  const fits = (palette: SwatchPalette) => options.every((option) => palette.has(option));
  if (prop === "tone" && fits(tonePalette)) return tonePalette;
  if (prop === "fill" && fits(fillPalette)) return fillPalette;
  if (prop === "stroke" && fits(strokePalette)) return strokePalette;
  if (prop === "surface" && fits(surfacePalette)) return surfacePalette;
  if (prop === "border" && fits(borderPalette)) return borderPalette;
  return null;
}
