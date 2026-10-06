/**
 * Figma effect styles and "Clip content" on Box. Spec: docs/research/studio-position-effects-radius-spec-2026-10-03.md
 * §3.2 and §7a (Q3).
 *
 * The whole Figma effect style is the token, one per layer as in Figma (Text `textStyle` precedent): no effect offset,
 * blur or spread is bound to a variable in the Figma file, so there are no free shadow values. Rendering:
 * `data-effect-style` = the kebab-cased style name (the same suffix as the generated `.zen-effect-*` classes in
 * src/styles/style-effects.css) and `data-clip="true"`; effects.css paints them. Unset props render nothing.
 */
import "./effects.css";

/**
 * Figma effect styles a Box may carry (file 9nZv4uW2LT21yuHabMTCh1, doc page "Effect & Shadow" 7063:62025):
 * Shadow/Bottom/Level-1…4 (04a115e4, 04b5ccf8, 81497aed, a965f689), Shadow/Top/Level-1…4 (d945346d, 16aacbdd,
 * 93743b16, 1fc7dd0c) and Effect/Overlay (3379daa2, background blur). Effect/Container and Effect/Popover belong to
 * layers 4 and 5 (Dialog, Popover), Effect/Input to fields and Shadow/Action/* to controls, so they are not offered.
 */
export const boxEffectStyles = [
  "Shadow/Bottom/Level-1", "Shadow/Bottom/Level-2", "Shadow/Bottom/Level-3", "Shadow/Bottom/Level-4",
  "Shadow/Top/Level-1", "Shadow/Top/Level-2", "Shadow/Top/Level-3", "Shadow/Top/Level-4",
  "Effect/Overlay",
] as const;
export type BoxEffectStyle = (typeof boxEffectStyles)[number];

/** The `data-effect-style` value: kebab(name), e.g. "Shadow/Bottom/Level-1" → "shadow-bottom-level-1". Unknown names → undefined. */
export const effectStyleKey = (style?: BoxEffectStyle | string): string | undefined =>
  style && (boxEffectStyles as readonly string[]).includes(style) ? style.toLowerCase().replace(/\//g, "-") : undefined;

export interface BoxEffectProps {
  /**
   * Figma effect style (the whole style is the token, one per layer as in Figma). Drop shadows
   * (`Shadow/Bottom/Level-1…4`, `Shadow/Top/Level-1…4`) render only on `surface="surface"`, never on Subtle, Pale or
   * Surface-Alt (component-usage-rules §9) nor without a fill, and a shadowed surface takes no border (elevation follows
   * the Sidebar). `Shadow/Bottom/Level-1` is the Card (Theme=Shadow 7063:62203) and Sidebar elevation; the Top levels
   * cast upward for bottom-pinned bars (Bottom-Sheet 4059:14162 uses Top/Level-2). `Effect/Overlay` is the background
   * blur behind a translucent fill and renders only on `surface="subtle"` or `"pale"`. The shadows use the spread
   * tokens, which Figma draws on a filled, clipped frame: pair them with `clip` when children could overflow.
   */
  effectStyle?: BoxEffectStyle;
  /**
   * Figma "Clip content" (frame clipsContent): children are clipped to the box's padding box and its corner radius, so
   * full-bleed media or an absolute layer keeps the box's rounded corners. Uses `overflow: clip`, which makes no scroll
   * container (a sticky child still sticks to the page scroller). Default false (content may overflow).
   */
  clip?: boolean;
}

/** Prop names owned by the Effects section and the "Clip content" toggle (Studio filters these out of Properties). */
export const effectPropNames: ReadonlySet<string> = new Set(["effectStyle", "clip"]);

/** Data attributes for the Box effect props; every key is undefined when its prop is unset. */
export function boxEffects({ effectStyle, clip }: BoxEffectProps): Record<`data-${string}`, string | undefined> {
  return { "data-effect-style": effectStyleKey(effectStyle), "data-clip": clip ? "true" : undefined };
}
