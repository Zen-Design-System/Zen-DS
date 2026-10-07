/**
 * Color/Content tones for text and icons (Text, Heading and Icon `tone`). A tone is its token's path in lower case with
 * `/` → `-`: Content/Support/Blue/Light → "support-blue-light", Content/On-Black-Overlay/Base → "on-black-overlay-base".
 * Neutral, the default family, drops its name ("strongest", "base", "light"), and a single resting token drops
 * "/Default" ("hyperlink", "on-accent"). Every resting Color/Content token has a tone; the state tokens (Hover, Pressed,
 * Visited, Placeholder, the Overlay and Inverse Disabled) belong to the components that change state. `disabled` stays for
 * text that is switched off, `inherit` takes the parent's colour.
 *
 * Which level to use is a role (docs/guidelines/content-colors.md): Neutral Strongest/Base/Light = primary, secondary,
 * tertiary text; colour families Strongest/Base for text on their Subtle background and Light, sparingly, for short text
 * that must stand out (help or error text, a condition, a delta); the Lights group (Accent, Warning, Support/Yellow,
 * Support/Sky and Support/Mint today) never takes Light for text — the harness flags it.
 *
 * Older short names stay as aliases: primary/secondary/tertiary and neutral-* → the Neutral levels, accent / info /
 * positive / negative / warning → that family's Base, inverse → inverse-strongest.
 */
export const contentTones = [
  "strongest", "base", "light",
  "accent-strongest", "accent-base", "accent-light",
  "info-strongest", "info-base", "info-light",
  "positive-strongest", "positive-base", "positive-light",
  "negative-strongest", "negative-base", "negative-light",
  "warning-strongest", "warning-base", "warning-light",
  "support-blue-strongest", "support-blue-base", "support-blue-light",
  "support-bronze-strongest", "support-bronze-base", "support-bronze-light",
  "support-brown-strongest", "support-brown-base", "support-brown-light",
  "support-crimson-strongest", "support-crimson-base", "support-crimson-light",
  "support-cyan-strongest", "support-cyan-base", "support-cyan-light",
  "support-golden-strongest", "support-golden-base", "support-golden-light",
  "support-green-strongest", "support-green-base", "support-green-light",
  "support-indigo-strongest", "support-indigo-base", "support-indigo-light",
  "support-mint-strongest", "support-mint-base", "support-mint-light",
  "support-orange-strongest", "support-orange-base", "support-orange-light",
  "support-pink-strongest", "support-pink-base", "support-pink-light",
  "support-plum-strongest", "support-plum-base", "support-plum-light",
  "support-purple-strongest", "support-purple-base", "support-purple-light",
  "support-red-strongest", "support-red-base", "support-red-light",
  "support-sky-strongest", "support-sky-base", "support-sky-light",
  "support-teal-strongest", "support-teal-base", "support-teal-light",
  "support-violet-strongest", "support-violet-base", "support-violet-light",
  "support-yellow-strongest", "support-yellow-base", "support-yellow-light",
  "inverse-strongest", "inverse-base", "inverse-light",
  "on-black-overlay-strongest", "on-black-overlay-base", "on-black-overlay-light",
  "on-white-overlay-strongest", "on-white-overlay-base", "on-white-overlay-light",
  "on-colors", "on-brights", "on-accent", "hyperlink", "disabled", "inherit",
  "primary", "secondary", "tertiary", "neutral-strongest", "neutral-base", "neutral-light",
  "accent", "info", "positive", "negative", "warning", "inverse",
] as const;
export type ContentTone = (typeof contentTones)[number];

/** Older and long spellings → the tone they paint with (the value written to `data-tone`). */
export const contentToneAliases: Partial<Record<ContentTone, ContentTone>> = {
  primary: "strongest", secondary: "base", tertiary: "light",
  "neutral-strongest": "strongest", "neutral-base": "base", "neutral-light": "light",
  accent: "accent-base", info: "info-base", positive: "positive-base", negative: "negative-base", warning: "warning-base",
  inverse: "inverse-strongest",
};

/** The tone a value paints with: aliases resolved. */
export const resolveContentTone = (tone: ContentTone): ContentTone => contentToneAliases[tone] ?? tone;

/** The tones in picker order, grouped by token family (aliases left out). */
export const contentToneGroups: ReadonlyArray<{ name: string; tones: readonly ContentTone[] }> = [
  { name: "Neutral", tones: ["strongest", "base", "light"] },
  ...(["accent", "info", "positive", "negative", "warning"] as const).map((family) => ({
    name: family[0].toUpperCase() + family.slice(1),
    tones: contentTones.filter((tone) => tone.startsWith(`${family}-`)),
  })),
  { name: "Support", tones: contentTones.filter((tone) => tone.startsWith("support-")) },
  { name: "Inverse", tones: ["inverse-strongest", "inverse-base", "inverse-light"] },
  { name: "On overlays", tones: contentTones.filter((tone) => /^on-(black|white)-overlay-/.test(tone)) },
  { name: "On fills", tones: ["on-colors", "on-brights", "on-accent"] },
  { name: "Other", tones: ["hyperlink", "disabled", "inherit"] },
];

const neutralLevels = new Set<string>(["strongest", "base", "light"]);
const defaultTokens = new Set<string>(["hyperlink", "on-accent"]);

/** The CSS variable suffix after `--zen-color-content-`, or null for `inherit`. */
function tokenSuffix(tone: ContentTone): string | null {
  const key = resolveContentTone(tone);
  if (key === "inherit") return null;
  if (neutralLevels.has(key)) return `neutral-${key}`;
  return defaultTokens.has(key) ? `${key}-default` : key;
}

/** The CSS variable a tone paints with (`--zen-color-content-support-blue-light`), or null for `inherit`. */
export function contentToneVar(tone: ContentTone): string | null {
  const suffix = tokenSuffix(tone);
  return suffix ? `--zen-color-content-${suffix}` : null;
}

const title = (part: string) => part.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("-");

/** The Figma variable a tone paints with ("Content/Support/Blue/Light"), or null for `inherit`. */
export function contentToneToken(tone: ContentTone): string | null {
  const suffix = tokenSuffix(tone);
  if (!suffix) return null;
  const level = /-(strongest|base|light|default)$/.exec(suffix)?.[1];
  const family = level ? suffix.slice(0, -level.length - 1) : suffix;
  const familyPath = family.startsWith("support-") ? `Support/${title(family.slice("support-".length))}` : title(family);
  return `Content/${familyPath}${level ? `/${title(level)}` : ""}`;
}
