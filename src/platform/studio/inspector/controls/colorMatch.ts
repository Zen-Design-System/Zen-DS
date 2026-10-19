/*
 * A colour typed into a colour field (Figma: a hex in the fill row), matched to Zen's colour variables (decision 1 of
 * docs/research/studio-figma-design-parity-2026-10-18.md: Zen paints with variables, so a hex offers the nearest ones and
 * Local variables to make a new one). Pure: colorMatch.selftest.mjs imports it directly.
 */

export type Rgb = { r: number; g: number; b: number };

/** "#F2F2F2", "f2f2f2", "#fff" → its RGB (0–255); anything else → null. */
export function parseHex(text: string): Rgb | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!match) return null;
  const hex = match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join("") : match[1];
  return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
}

/** "#F2F2F2" for an RGB, as Figma writes a hex. */
export const hexOf = ({ r, g, b }: Rgb) => `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("").toUpperCase()}`;

/** How far apart two colours look ("redmean" weighted RGB, cheap and close to perception for UI greys and tints). */
export function colorDistance(a: Rgb, b: Rgb): number {
  const mean = (a.r + b.r) / 2;
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return Math.sqrt((2 + mean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - mean) / 256) * db * db);
}

/** The `count` options whose colour is nearest to `target` (options without a colour are left out), nearest first. */
export function nearestColors<T extends { color: Rgb | null }>(options: readonly T[], target: Rgb, count = 3): T[] {
  return options
    .filter((option): option is T & { color: Rgb } => option.color !== null)
    .map((option) => ({ option, distance: colorDistance(option.color, target) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map((entry) => entry.option);
}
