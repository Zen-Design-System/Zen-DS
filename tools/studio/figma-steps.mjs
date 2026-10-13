// The Spacing steps and value matching both directions of the Figma bridge share: figma-pull.mjs (Figma → page) and
// figma-push.mjs (page → Figma). Isomorphic: no Node imports.

/** Spacing/Gap and Spacing/Padding in px (src/components/_shared/scale.ts), for a value bound to no variable. */
export const GAP_PX = [[0, "none"], [2, "3xs"], [4, "2xs"], [8, "xs"], [12, "sm"], [16, "md"], [24, "lg"], [32, "xl"], [40, "2xl"], [48, "3xl"], [64, "giant"], [88, "xgiant"], [144, "2xgiant"]];
export const PADDING_PX = [[0, "none"], [2, "3xs"], [4, "2xs"], [8, "xs"], [12, "sm"], [16, "md"], [20, "lg"], [24, "xl"], [32, "2xl"], [40, "3xl"], [48, "4xl"]];
export const LONG_TO_SHORT = { "3-xsmall": "3xs", "3xsmall": "3xs", "2-xsmall": "2xs", "2xsmall": "2xs", xsmall: "xs", small: "sm", medium: "md", large: "lg", xlarge: "xl", "2-xlarge": "2xl", "2xlarge": "2xl", "3-xlarge": "3xl", "3xlarge": "3xl", "4-xlarge": "4xl", "4xlarge": "4xl" };

/** "medium" and "md" are one step; other values compare as they are. */
export const sameValue = (a, b) => a === b || (typeof a === "string" && typeof b === "string" && (LONG_TO_SHORT[a] ?? a) === (LONG_TO_SHORT[b] ?? b));

/** Box surface (layout.css) → the Color/Background variable that paints it (figma-push writes it, figma-pull reads it). */
export const BOX_SURFACE = { surface: "Background/Surface/Default", "surface-alt": "Background/Surface/Alt", subtle: "Background/Neutral/Subtle/Default", pale: "Background/Neutral/Pale/Default", canvas: "Background/Canvas/Default" };
