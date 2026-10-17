/*
 * Token scales of the inspector's ScaleField (spec docs/research/studio-inspector-redesign-2026-10-03.md, Phase 2; plan
 * WP-D): which ladder a prop's type is on, how a step reads ("md · 16px"), and the ladder step ↑/↓ moves to. Pure (no JSON,
 * no DOM), so the node selftest (scale.selftest.mjs) imports it directly.
 */

/** Spacing/Gap, Spacing/Padding (also the floating insets) and Corner-Radius. */
export type TokenScale = "gap" | "padding" | "radius";

/**
 * The scale a prop's documented type is on, or null: ZenGap (`… | "giant" | "xgiant" | "2xgiant"`), ZenPadding
 * (`"none" | ZenScaleInput | "4xl"`), ZenCornerRadius (`… | "full"`).
 */
export function scaleOfType(type: string): TokenScale | null {
  if (!/\bZenScaleInput\b/.test(type)) return null;
  if (/"giant"/.test(type)) return "gap";
  if (/"full"/.test(type)) return "radius";
  if (/"4xl"/.test(type)) return "padding";
  return null;
}

/**
 * The page margins a padding may take besides its ladder (ZenPadding's ZenMargin; Figma Breakpoint & Grids), under the
 * names Figma's variable list gives them. They are not steps: ↑/↓ skip them and a px never reads as one.
 */
export const MARGIN_TOKENS: Readonly<Record<string, string>> = { "margin-comfortable": "Margin-Comfortable", "margin-compact": "Margin-Compact" };
export const isMarginKey = (key: string) => key in MARGIN_TOKENS;

/** A px value as the canvas pills write it: whole pixels, else one decimal. */
export const pxText = (px: number) => (Number.isInteger(px) ? String(px) : px.toFixed(1));

/**
 * How a step reads in its list (user, 2026-10-09: "token name + value", one line, as the canvas spacing pill's menu): the
 * token on the left ("md"), the pixels it measures where the layer renders on the right ("16px"). The field shows the
 * token with its pixels beside it. A key with no measure ("full", or no element yet) has no value.
 */
export function scaleStep(key: string, px: number | null): { label: string; meta?: string } {
  const label = MARGIN_TOKENS[key] ?? key;
  if (key === "full" || px === null) return { label };
  return { label, meta: `${pxText(px)}px` };
}

/** The key `steps` ladder steps from `from` (clamped to the ends); from an unknown key, the ladder's first or last. */
export function stepKey(ladder: readonly string[], from: string | undefined, steps: number): string | undefined {
  if (!ladder.length) return undefined;
  const at = from === undefined ? -1 : ladder.indexOf(from);
  if (at < 0) return steps > 0 ? ladder[0] : ladder[ladder.length - 1];
  return ladder[Math.max(0, Math.min(ladder.length - 1, at + steps))];
}
