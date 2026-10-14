/* Generated from styles/source/figma/figma-styles.full.json by scripts/build-style-manifest.mjs. Do not edit directly. */

/** A Figma GLASS effect: frost (background blur radius), refraction (0–1), depth (px the bend reaches in from the edge),
 *  dispersion (0–1, colour fringes), light angle (degrees) and intensity, splay. */
export type GlassParams = { frost: number; refraction: number; depth: number; dispersion: number; lightAngle: number; lightIntensity: number; splay: number };

/** Every effect style with a GLASS effect, by its token (zen-effect-<token>). */
export const glassStyles = {
  "glass-floating": { frost: 8, refraction: 0.8, depth: 28, dispersion: 0.5, lightAngle: -45, lightIntensity: 0.8, splay: 0 },
  "liquid-glass-normal": { frost: 4, refraction: 0.8, depth: 20, dispersion: 0.5, lightAngle: -45, lightIntensity: 0.8, splay: 0 },
  "liquid-glass-large": { frost: 8, refraction: 0.8, depth: 30, dispersion: 0.6, lightAngle: -45, lightIntensity: 0.8, splay: 0 },
} as const satisfies Record<string, GlassParams>;

export type GlassStyleName = keyof typeof glassStyles;
