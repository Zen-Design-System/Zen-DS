// Figma's layer blend (Appearance › blend mode) ↔ Zen's `blendMode` (Box, Stack, Grid, Shape; spec
// docs/research/studio-blend-mode-spec-2026-10-20.md). The Plugin API names Plus darker and Plus lighter LINEAR_BURN and
// LINEAR_DODGE. A frame's default is Pass through, any other layer's Normal: the push leaves the default out and the
// pull reads it back as no prop. Pure: no imports.

/** Zen's blend mode → the Plugin API's `blendMode`. */
export const FIGMA_BLEND = {
  "pass-through": "PASS_THROUGH",
  normal: "NORMAL",
  darken: "DARKEN",
  multiply: "MULTIPLY",
  "plus-darker": "LINEAR_BURN",
  "color-burn": "COLOR_BURN",
  lighten: "LIGHTEN",
  screen: "SCREEN",
  "plus-lighter": "LINEAR_DODGE",
  "color-dodge": "COLOR_DODGE",
  overlay: "OVERLAY",
  "soft-light": "SOFT_LIGHT",
  "hard-light": "HARD_LIGHT",
  difference: "DIFFERENCE",
  exclusion: "EXCLUSION",
  hue: "HUE",
  saturation: "SATURATION",
  color: "COLOR",
  luminosity: "LUMINOSITY",
};

/** The Plugin API's `blendMode` → Zen's. */
export const ZEN_BLEND = Object.fromEntries(Object.entries(FIGMA_BLEND).map(([zen, figma]) => [figma, zen]));

/** A layer's Figma blend from its code, or null at the layer's default (`frame`: Pass through, else Normal). */
export function figmaBlendOf(value, frame) {
  const figma = typeof value === "string" ? FIGMA_BLEND[value] : undefined;
  if (!figma) return null;
  const fallback = frame ? "PASS_THROUGH" : "NORMAL";
  // A shape has no Pass through: it draws as Normal.
  if (figma === fallback || (!frame && figma === "PASS_THROUGH")) return null;
  return figma;
}

/** A layer's code blend from Figma's, or null at the layer's default. */
export function zenBlendOf(value, frame) {
  const zen = typeof value === "string" ? ZEN_BLEND[value] : undefined;
  if (!zen) return null;
  if (zen === (frame ? "pass-through" : "normal") || (!frame && zen === "pass-through")) return null;
  return zen;
}
