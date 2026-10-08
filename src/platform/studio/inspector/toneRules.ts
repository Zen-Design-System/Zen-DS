/**
 * Inline warnings for the Studio's tone picker: what the harness would flag for a tone on a Text or Heading
 * (tools/usage-guard/check-usage.mjs content/lights-no-light-text, heading/title-not-light,
 * content/colour-light-is-highlight), said in the option's caption before the pick instead of at Save.
 */

/** Families whose Light level resolves to the Sky, Mint, Yellow or Zen scales: as text it fails contrast. The harness
 *  derives them from tokens.css; toneRules.selftest.mjs fails when this list and the harness disagree. */
export const LIGHTS_FAMILIES: ReadonlySet<string> = new Set(["accent", "warning", "support-yellow", "support-sky", "support-mint"]);
const COLOUR_FAMILY = /^(accent|info|positive|negative|warning|support-[a-z]+)$/;

/** The warning for `tone` (a resolved tone name: aliases already mapped) on `component`, or null. */
export function toneWarning(tone: string, component: string | undefined): string | null {
  if (component !== "Text" && component !== "Heading") return null;
  const family = /^(.+)-light$/.exec(tone)?.[1];
  if (tone !== "light" && !family) return null;
  if (family && LIGHTS_FAMILIES.has(family)) return "Not for text (fails contrast)";
  if (component === "Heading") return "Not for titles";
  return family && COLOUR_FAMILY.test(family) ? "Short status or help text only" : null;
}
