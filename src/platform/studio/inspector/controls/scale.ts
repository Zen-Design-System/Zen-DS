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

/**
 * A step under the name its Figma variable has (user, 2026-10-17: Figma's words, not the code's): Spacing/Gap and
 * Spacing/Padding Medium, XLarge…; Corner-Radius Base for md, Rounded for full. The code still writes the short key.
 */
const SPACING_NAMES: Readonly<Record<string, string>> = { none: "None", "3xs": "3XSmall", "2xs": "2XSmall", xs: "XSmall", sm: "Small", md: "Medium", lg: "Large", xl: "XLarge", "2xl": "2XLarge", "3xl": "3XLarge", "4xl": "4XLarge", giant: "Giant", xgiant: "XGiant", "2xgiant": "2XGiant" };
const RADIUS_NAMES: Readonly<Record<string, string>> = { ...SPACING_NAMES, md: "Base", full: "Rounded" };
export function tokenName(key: string, scale: TokenScale | "card" = "gap"): string {
  return MARGIN_TOKENS[key] ?? (scale === "radius" ? RADIUS_NAMES : SPACING_NAMES)[key] ?? key;
}

/*
 * How an option reads when no Figma name is known for it (UX writing audit 2026-10-18: raw code values such as
 * "surface-alt", "2xs", "inside" were shown): a spacing step by its Figma variable name ("2XSmall"), anything else in
 * sentence case with spaces ("Surface alt", "Danger secondary", "Inside"). HTML element names and values that are not
 * plain words stay as written. The E2E helpers read options the same way.
 */
const TAG_NAMES = new Set(["a", "p", "div", "span", "section", "article", "aside", "header", "footer", "main", "nav", "ul", "ol", "li", "label", "button", "form", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "small", "code", "pre", "figure", "img", "input", "textarea", "select", "table", "td", "th", "tr"]);
export function optionLabel(value: string): string {
  if (value in SPACING_NAMES) return SPACING_NAMES[value];
  if (TAG_NAMES.has(value) || !/^[a-z][a-z0-9-]*$/.test(value)) return value;
  const words = value.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * A written value as a status line names it (plan F0: "Gap 2XLarge", not "gap 2xl"): a key by its Figma name (a radius
 * step by Corner-Radius's), other text in quotes, cut at 24 characters.
 */
export function valueWords(value: unknown, prop = ""): string {
  if (typeof value !== "string") return String(value);
  if (/radius/i.test(prop) && value in RADIUS_NAMES) return RADIUS_NAMES[value];
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 24) return optionLabel(value);
  return `"${value.length > 24 ? `${value.slice(0, 24)}…` : value}"`;
}

/** A px value as the canvas pills write it: whole pixels, else one decimal. */
export const pxText = (px: number) => (Number.isInteger(px) ? String(px) : px.toFixed(1));

/**
 * How a step reads in its list (user, 2026-10-09: "token name + value", one line, as the canvas spacing pill's menu): the
 * token on the left ("md"), the pixels it measures where the layer renders on the right ("16px"). The field shows the
 * token with its pixels beside it. A key with no measure ("full", or no element yet) has no value.
 */
export function scaleStep(key: string, px: number | null, scale: TokenScale = "gap"): { label: string; meta?: string } {
  const label = tokenName(key, scale);
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

/**
 * A typed px value snapped to the nearest step (decision 1 of docs/research/studio-figma-design-parity-2026-10-18.md: Zen
 * writes variables, so 13 in a gap field becomes Small · 12). `steps` carry the px each measures where the layer renders
 * (null: unknown, skipped). A tie takes the smaller step; null when nothing is measured.
 */
export function nearestStep(steps: ReadonlyArray<{ key: string; px: number | null }>, px: number): { key: string; px: number } | null {
  let best: { key: string; px: number } | null = null;
  for (const step of steps) {
    if (step.px === null || !Number.isFinite(step.px)) continue;
    if (!best || Math.abs(step.px - px) < Math.abs(best.px - px) || (Math.abs(step.px - px) === Math.abs(best.px - px) && step.px < best.px)) best = { key: step.key, px: step.px };
  }
  return best;
}
