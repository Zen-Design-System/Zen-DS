// A Zen Studio project's theme (user, 2026-10-17: "tạo dự án như Figma … set theme cho Dự án … không đè vào codebase
// hiện tại mà chỉ sinh thêm 1 mode riêng cho dự án đó"). A project keeps its settings in
// `.zen-studio/projects/<id>/project.json`; this module turns them into ONE extra mode of the Base Colors (Project)
// collection — `[data-brand="p-<id>"]` — and picks the project's other modes from the ones Zen ships. Nothing in
// tokens/source or src/styles/tokens.css changes.
//
//   defaultProjectTheme()            the Zen look (Zen + Gray, Brand-S1, Compact, Rounded, Dashboard)
//   normalizeProject(input)          { project, errors }: a project.json made safe (unknown values → defaults)
//   PROJECT_LOCALES                  the languages a project's pages can be in (its `locale`, en-US by default)
//   projectBrand(id)                 "p-<id>": the project's data-brand value
//   projectPalettes(theme)           the Primary / Neutral ramps (12 solid + 12 alpha, Light and Dark) and On-Brand
//   projectThemeCss(id, theme)       the mode as CSS (what theme.css holds and Studio injects)
//   projectModes(theme)              the ZenProvider modes a project's frames render in
//
// Primary and Neutral either alias a shipped ramp (Zen, Indigo … exactly as the Zen mode aliases Zen and Gray, so high
// contrast still applies) or are a custom colour: then the Zen Figma plugin's own generator (zen-ramp.generated.mjs)
// makes the ramp, so Figma would get the same 48 values. Corner radius, component theme and size, typography and
// emphasis are the shipped modes (user, 2026-10-17: the four radius modes, no custom scale): no new token values.
// Typography is the exception (user, 2026-11-06: "vẫn không cho đổi typo như trong plugin"): `theme.type` picks a font
// per role and, optionally, a type scale (base size × ratio) — the Zen Figma plugin's Typeface and Type Scale tabs,
// with the plugin's own formula, so Figma would get the same sizes.
import { calculateOnBrandColor, calculateOnBrandStateColor, apcaContrast, generateExpectedPalette, hexToOklch, oklchToHex } from "./zen-ramp.generated.mjs";

export const PROJECT_ID = /^[a-z0-9][a-z0-9-]{0,47}$/;
export const PROJECT_FORMAT = 1;

/** The shipped ramps (Global Colors), Light step 9 = the colour the plugin generates each ramp from. Zen first. */
export const RAMPS = {
  Zen: "#F755C9", Tomato: "#E5532E", Crimson: "#E94E75", Pink: "#E854B2", Plum: "#BB4ABF", Purple: "#9141C3",
  Violet: "#7755E7", Indigo: "#4752F0", Blue: "#0F73FF", Cyan: "#12A2CE", Sky: "#4DCFEF", Teal: "#02B19C",
  Mint: "#40E7AD", Grass: "#3A9C4C", Yellow: "#FFBA1A", Golden: "#C99A2C", Orange: "#E37A02", Bronze: "#D76F37",
  Brown: "#9F6838", Gray: "#8D8D8D",
};
/** Ramps a Primary can alias (Gray is the neutral ramp). */
export const PRIMARY_RAMPS = Object.keys(RAMPS).filter((name) => name !== "Gray");

/** Support families (Color/Background/Support/<family>/…) a chart sector can take, as their CSS name. Brand and
 *  Neutral follow the project's Primary and Neutral; Red is Tomato, Green is Grass. */
export const SUPPORT_FAMILIES = ["brand", "neutral", "red", "crimson", "pink", "plum", "purple", "violet", "indigo", "blue", "cyan", "sky", "teal", "mint", "green", "yellow", "golden", "orange", "bronze", "brown"];
export const SUPPORT_LABELS = { brand: "Primary", neutral: "Neutral", red: "Red", crimson: "Crimson", pink: "Pink", plum: "Plum", purple: "Purple", violet: "Violet", indigo: "Indigo", blue: "Blue", cyan: "Cyan", sky: "Sky", teal: "Teal", mint: "Mint", green: "Green", yellow: "Yellow", golden: "Golden", orange: "Orange", bronze: "Bronze", brown: "Brown" };
export const SECTOR_TONES = ["solid", "soft"];
/** The Figma styles "Color Chart Sector/<name>": Primary and Secondary follow the Primary and Neutral (Component Theme
 *  Chart/Sector/*), the other five are the project's choice. */
export const SECTOR_NAMES = ["primary", "secondary", "tertiary", "quaternary", "quinary", "senary", "septenary"];

/** Base Colors (Project) status roles and the ramps they alias in the Zen mode. */
export const STATUS_ROLES = { positive: "Grass", negative: "Tomato", warning: "Yellow", info: "Blue" };

export const MODE_VALUES = {
  componentTheme: ["brand-s1", "brand-s2", "neutral-s1", "neutral-s2", "neutral-s3", "neutral-s4", "neutral-s5", "neutral-s6", "neutral-s7"],
  density: ["compact", "comfortable"],
  radius: ["rounded", "smooth", "standard", "luxury"],
  typography: ["dashboard", "popular", "mobile"],
  emphasis: ["medium", "strong", "light"],
};

const HEX = /^#[0-9a-f]{6}$/i;

/* ── typography ─────────────────────────────────────────────────────────────────────────────────────────────── */

/** The fonts a role can take: Inter (bundled, Zen's own) and Google Fonts families that have 400, 500, 600 and 700 —
 *  the weights the Emphasis modes read (450 and 550 fall to the nearest). */
export const FONT_FAMILIES = [
  "Inter", "Be Vietnam Pro", "Roboto", "Open Sans", "Noto Sans", "Montserrat", "Plus Jakarta Sans", "Manrope", "DM Sans",
  "IBM Plex Sans", "Source Sans 3", "Nunito Sans", "Work Sans", "Poppins", "Lexend", "Outfit", "Figtree", "Sora",
  "Space Grotesk", "Raleway", "Lora", "Playfair Display", "Fraunces", "Noto Serif", "Source Serif 4",
];
/** The roles Typography Configuration names a family for (the plugin's Sans, Heading, Display, Button). */
export const TYPE_ROLES = ["sans", "heading", "display", "button"];
export const TYPE_SCALE_LIMITS = { base: { min: 10, max: 24 }, ratio: { min: 1, max: 1.62 } };
/* The plugin's Type Scale rows (zen-ds-figma-plugin src/ui/main.js TYPESCALE_PREVIEW_ROWS): token, steps from the base,
   line-height ratio, and the curated sizes / line heights it keeps at base 14 and 16 with ratio 1.14. */
const TYPE_SCALE_ROWS = [
  ["display-extra-1", 13, 1.128, 78, 88, 88, 100], ["display-extra-2", 12, 1.059, 68, 72, 78, 88], ["display-extra-3", 11, 1.133, 60, 68, 68, 72],
  ["display-1", 10, 1.154, 52, 60, 60, 68], ["display-2", 9, 1.13, 46, 52, 52, 60], ["display-3", 8, 1.2, 40, 48, 46, 52], ["display-4", 7, 1.222, 36, 44, 40, 48],
  ["heading-1", 6, 1.25, 32, 40, 36, 44], ["heading-2", 5, 1.286, 28, 36, 32, 40], ["heading-3", 4, 1.333, 24, 32, 28, 36], ["heading-4", 3, 1.4, 20, 28, 24, 32],
  ["subheading", 2, 1.444, 18, 26, 20, 28], ["body-extra", 1, 1.5, 16, 24, 18, 26], ["body-base", 0, 1.429, 14, 20, 16, 24],
  ["body-small", -1, 1.333, 12, 16, 14, 20], ["caption", -2, 1.6, 10, 16, 12, 16], ["label-small", -4, 1.5, 8, 12, 10, 16],
];

/** A type scale's sizes, as the plugin computes them: `{ "heading-1": { size, lineHeight, letterSpacing } … }` (px). */
export function projectTypeScale({ base, ratio }) {
  const preset = (base === 14 || base === 16) && Math.abs(ratio - 1.14) < 0.000001;
  return Object.fromEntries(TYPE_SCALE_ROWS.map(([token, offset, lhRatio, fs14, lh14, fs16, lh16]) => {
    let size;
    let lineHeight;
    if (preset) [size, lineHeight] = base === 14 ? [fs14, lh14] : [fs16, lh16];
    else {
      size = Math.round(base * ratio ** offset);
      lineHeight = Math.round(size * lhRatio);
      if (lineHeight % 4 === 1) lineHeight -= 1; else if (lineHeight % 4 === 3) lineHeight += 1;
      if (lineHeight % 2 !== 0) lineHeight += 1;
    }
    const scale = size / base;
    const letterSpacing = scale >= 2 ? Math.round(-0.02 * Math.log2(scale) * size * 100) / 100 : scale < 1 ? Math.round(0.01 * (1 / scale) * size * 100) / 100 : 0;
    return [token, { size, lineHeight, letterSpacing }];
  }));
}

/** The Google Fonts stylesheet for the theme's fonts other than Inter, or null. */
export function projectFontsUrl(theme) {
  const families = [...new Set(TYPE_ROLES.map((role) => theme.type?.fonts?.[role]).filter((family) => family && family !== "Inter"))];
  if (!families.length) return null;
  return `https://fonts.googleapis.com/css2?${families.map((family) => `family=${family.replace(/ /g, "+")}:wght@400;500;600;700`).join("&")}&display=swap`;
}

export function defaultProjectTheme() {
  return {
    primary: { ramp: "Zen" },
    neutral: { ramp: "Gray" },
    status: { ...STATUS_ROLES },
    // Slots 3–7: the Zen chart palette (Cyan, Violet, Yellow, Orange Solid, Green Soft).
    chart: [{ family: "cyan", tone: "solid" }, { family: "violet", tone: "solid" }, { family: "yellow", tone: "solid" }, { family: "orange", tone: "solid" }, { family: "green", tone: "soft" }],
    modes: { componentTheme: "brand-s1", density: "compact", radius: "rounded", typography: "dashboard", emphasis: "medium" },
    // Inter for every role; `scale` null: the Typography mode's own sizes.
    type: { fonts: { sans: "Inter", heading: "Inter", display: "Inter", button: "Inter" }, scale: null },
  };
}

export const projectBrand = (id) => `p-${id}`;

/** A free id for a project name ("Acme CRM" → "acme-crm", then "acme-crm-2"…). */
export function projectIdFor(name, taken = new Set()) {
  const base = String(name ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "project";
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

const pick = (value, allowed, fallback, path, errors) => {
  if (value === undefined) return fallback;
  if (allowed.includes(value)) return value;
  errors.push(`${path}: ${JSON.stringify(value)} is not one of ${allowed.join(", ")}`);
  return fallback;
};

function colourSource(value, ramps, fallback, path, errors, { tint = false } = {}) {
  if (value && typeof value === "object") {
    if (typeof value.ramp === "string" && ramps.includes(value.ramp)) return { ramp: value.ramp };
    if (typeof value.hex === "string" && HEX.test(value.hex)) return { hex: value.hex.toUpperCase() };
    if (tint && value.tint === "primary") return { tint: "primary" };
  }
  if (value !== undefined) errors.push(`${path}: ${JSON.stringify(value)} is not a ramp name${tint ? ", a tint" : ""} or a #RRGGBB colour`);
  return { ...fallback };
}

/** A theme made safe: every field present, every value one Studio knows. */
export function normalizeTheme(input, errors = []) {
  const base = defaultProjectTheme();
  const theme = input && typeof input === "object" ? input : {};
  const status = {};
  for (const [role, ramp] of Object.entries(STATUS_ROLES)) status[role] = pick(theme.status?.[role], PRIMARY_RAMPS, ramp, `theme.status.${role}`, errors);
  const chart = base.chart.map((fallback, index) => {
    const slot = Array.isArray(theme.chart) ? theme.chart[index] : undefined;
    if (slot === undefined) return fallback;
    return { family: pick(slot?.family, SUPPORT_FAMILIES, fallback.family, `theme.chart[${index}].family`, errors), tone: pick(slot?.tone, SECTOR_TONES, fallback.tone, `theme.chart[${index}].tone`, errors) };
  });
  const modes = {};
  for (const [key, values] of Object.entries(MODE_VALUES)) modes[key] = pick(theme.modes?.[key], values, base.modes[key], `theme.modes.${key}`, errors);
  const fonts = {};
  for (const role of TYPE_ROLES) fonts[role] = pick(theme.type?.fonts?.[role], FONT_FAMILIES, base.type.fonts[role], `theme.type.fonts.${role}`, errors);
  let scale = null;
  const rawScale = theme.type?.scale;
  if (rawScale && typeof rawScale === "object") {
    const { base: size, ratio } = rawScale;
    const within = (value, { min, max }) => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
    if (within(size, TYPE_SCALE_LIMITS.base) && within(ratio, TYPE_SCALE_LIMITS.ratio)) scale = { base: Math.round(size), ratio: Math.round(ratio * 1000) / 1000 };
    else errors.push(`theme.type.scale: ${JSON.stringify(rawScale)} needs a base of 10–24 and a ratio of 1–1.62`);
  } else if (rawScale !== undefined && rawScale !== null) errors.push(`theme.type.scale: ${JSON.stringify(rawScale)} is not a scale`);
  return {
    primary: colourSource(theme.primary, PRIMARY_RAMPS, base.primary, "theme.primary", errors),
    neutral: colourSource(theme.neutral, ["Gray"], base.neutral, "theme.neutral", errors, { tint: true }),
    status,
    chart,
    modes,
    type: { fonts, scale },
  };
}

/**
 * The libraries a project's pages use (its Libraries dialog, Figma's ⌥⌘O; spec docs/research/studio-libraries-spec-
 * 2026-10-22.md): Zen, the project's own components and its theme, each on unless project.json says false.
 */
export const PROJECT_LIBRARIES = ["zen", "components", "theme"];
export const defaultLibraries = () => ({ zen: true, components: true, theme: true });
export function normalizeLibraries(input) {
  const value = input && typeof input === "object" ? input : {};
  return Object.fromEntries(PROJECT_LIBRARIES.map((key) => [key, value[key] !== false]));
}

/**
 * The language a project's pages are in (user, 2026-10-25, BACKLOG-user-and-later P3): ZenProvider's `locale` for its
 * frames on the canvas, in Play and Present, on a phone and in the exports (dates, the components' built-in labels, the
 * frames' `lang`), and the Figma push's text. The languages labels.ts ships; a project without one is US English, so
 * nothing changes until the person picks another. Each named in its own language.
 */
export const PROJECT_LOCALES = { "en-US": "English", "vi-VN": "Tiếng Việt" };
export const DEFAULT_LOCALE = "en-US";
export const normalizeLocale = (input) => (Object.hasOwn(PROJECT_LOCALES, input) ? input : DEFAULT_LOCALE);

/** project.json made safe. `errors` names what was replaced by a default; a bad id or name is fatal (project null). */
export function normalizeProject(input) {
  const errors = [];
  const value = input && typeof input === "object" ? input : {};
  if (typeof value.id !== "string" || !PROJECT_ID.test(value.id)) return { project: null, errors: [`id: ${JSON.stringify(value.id)} must match ${PROJECT_ID}`] };
  const name = typeof value.name === "string" ? value.name.trim().slice(0, 80) : "";
  if (!name) return { project: null, errors: ["name: a project needs a name"] };
  const now = Date.now();
  const project = {
    format: PROJECT_FORMAT,
    id: value.id,
    name,
    createdAt: Number.isFinite(value.createdAt) ? value.createdAt : now,
    updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : now,
    theme: normalizeTheme(value.theme, errors),
    libraries: normalizeLibraries(value.libraries),
    locale: normalizeLocale(value.locale),
  };
  if (value.locale !== undefined && project.locale !== value.locale) errors.push(`locale: ${JSON.stringify(value.locale)} is not one of ${Object.keys(PROJECT_LOCALES).join(", ")}`);
  return { project, errors };
}

/** The neutral a "tinted" Neutral starts from: Gray's lightness and a little of the Primary's hue. */
export function tintedNeutralAnchor(primaryHex) {
  const gray = hexToOklch(RAMPS.Gray);
  const primary = hexToOklch(primaryHex);
  return oklchToHex(gray.L, Math.min(0.02, primary.C), primary.H).toUpperCase();
}

const anchorOf = (source) => (source.ramp ? RAMPS[source.ramp] : source.hex);

/**
 * The project's Primary and Neutral ramps as the plugin makes them: Neutral first (its Dark step 1 is the dark canvas
 * every other dark ramp is generated against), then Primary. `alias` names a shipped ramp the CSS points at instead of
 * writing values. On-Brand: the text on the Primary's steps 9 / 10 / 11 (Default / Hover / Pressed), white or 86% black
 * by APCA, as the plugin decides it; `lc` is its APCA contrast on step 9.
 */
export function projectPalettes(theme) {
  const primaryHex = anchorOf(theme.primary);
  const neutralHex = theme.neutral.tint ? tintedNeutralAnchor(primaryHex) : anchorOf(theme.neutral);
  const neutral = { ...generateExpectedPalette(neutralHex, true), anchor: neutralHex, alias: theme.neutral.ramp ?? null };
  const primary = { ...generateExpectedPalette(primaryHex, false, neutral.darkBackground), anchor: primaryHex, alias: theme.primary.ramp ?? null };
  const on = (solid) => {
    const fill = solid[8];
    const text = calculateOnBrandColor(fill);
    return { default: text, hover: calculateOnBrandStateColor(solid[9], text), pressed: calculateOnBrandStateColor(solid[10], text), lc: Math.round(Math.abs(apcaContrast(text === "#ffffff" ? "#ffffff" : "#000000", fill))) };
  };
  return { primary, neutral, onBrand: { light: on(primary.lightSolid), dark: on(primary.darkSolid) } };
}

const kebab = (name) => name.toLowerCase();
const steps = (prefix, values) => values.map((value, index) => `  --zen-${prefix}-${index + 1}: ${value.toUpperCase()};`);
const aliasSteps = (prefix, side, ramp, alpha) => Array.from({ length: 12 }, (_, index) => `  --zen-${prefix}-${index + 1}: var(--zen-${side}-${kebab(ramp)}${alpha ? "-alpha" : ""}-${index + 1});`);

function rampLines(role, palette) {
  if (palette.alias) return ["light", "dark"].flatMap((side) => [...aliasSteps(`${side}-${role}`, side, palette.alias, false), ...aliasSteps(`${side}-${role}-alpha`, side, palette.alias, true)]);
  return [
    ...steps(`light-${role}`, palette.lightSolid), ...steps(`light-${role}-alpha`, palette.lightAlpha),
    ...steps(`dark-${role}`, palette.darkSolid), ...steps(`dark-${role}-alpha`, palette.darkAlpha),
  ];
}

const cssHex = (hex) => hex.toUpperCase();

/**
 * The project's mode as CSS. Two blocks:
 * - Base Colors (Project): Brand, Neutral, the status roles and On-Brand on `[data-brand="p-<id>"]`, again on a nested
 *   contrast scope (tokens.css re-declares the Zen aliases under `:where([data-contrast])`, which would reset a
 *   project's aliases to Zen).
 * - Chart sectors 3–7 on the project and on every `[data-theme]` inside it: they read semantic Support tokens, which
 *   each theme scope declares anew, so a dark frame on a light canvas gets the dark colours.
 * An element with its own data-brand inside the project (Studio's chrome) keeps its brand. `brand` names another
 * data-brand value (the theme editor's draft, "studio-draft").
 */
export function projectThemeCss(id, theme, { name, brand = projectBrand(id) } = {}) {
  const palettes = projectPalettes(theme);
  const base = [
    ...rampLines("brand", palettes.primary),
    ...rampLines("neutral", palettes.neutral),
    ...Object.entries(theme.status).flatMap(([role, ramp]) => rampLines(role, { alias: ramp })),
    ...["light", "dark"].flatMap((side) => ["default", "hover", "pressed"].map((state) => `  --zen-${side}-on-brand-${state}: ${cssHex(palettes.onBrand[side][state])};`)),
  ];
  const chart = theme.chart.flatMap((slot, index) => {
    const sector = SECTOR_NAMES[index + 2];
    return [
      `  --zen-chart-sector-${sector}: var(--zen-color-background-support-${slot.family}-${slot.tone});`,
      `  --zen-chart-sector-${sector}-subtle: var(--zen-color-background-support-${slot.family}-subtle);`,
    ];
  });
  const scope = `[data-brand="${brand}"]`;
  // Typography Configuration's values on every [data-typography] (ZenProvider writes it on each frame), so the project's
  // fonts and scale win over the shipped mode's whatever mode a frame takes. Code (dev) keeps JetBrains Mono.
  const fonts = theme.type?.fonts ?? {};
  const type = [
    ...TYPE_ROLES.filter((role) => fonts[role] && fonts[role] !== "Inter").map((role) => `  --zen-typography-font-family-${role}: "${fonts[role]}", "Inter", sans-serif;`),
    ...Object.entries(theme.type?.scale ? projectTypeScale(theme.type.scale) : {}).flatMap(([token, value]) => [
      `  --zen-typography-font-size-${token}: ${value.size}px;`,
      `  --zen-typography-line-height-${token}: ${value.lineHeight}px;`,
      `  --zen-typography-letter-spacing-${token}: ${value.letterSpacing}px;`,
    ]),
  ];
  const fontsUrl = projectFontsUrl(theme);
  return [
    // First in the sheet, as @import must be (projectStore lifts it above the other projects' modes).
    ...(fontsUrl ? [`@import url("${fontsUrl}");`] : []),
    `/* Zen Studio project ${JSON.stringify(name ?? id)}: Base Colors (Project) mode ${brand}. Generated from`,
    `   .zen-studio/projects/${id}/project.json by tools/studio/project-theme.mjs — edit the project's theme in Studio. */`,
    `${scope},`,
    `${scope} [data-contrast]:not([data-brand]) {`,
    ...base,
    "}",
    "",
    `${scope},`,
    `${scope} [data-theme]:not([data-brand]) {`,
    ...chart,
    "}",
    "",
    ...(type.length ? [`${scope}[data-typography],`, `${scope} [data-typography]:not([data-brand]) {`, ...type, "}", ""] : []),
  ].join("\n");
}

const capital = (word) => word[0].toUpperCase() + word.slice(1);
/**
 * The project's mode as Figma variable values of Base Colors (Project): `{ "Light/Brand/9": "{Light/Indigo/9}" | "#4F46E5",
 * … }` — the variables projectThemeCss declares, by their Figma names (Brand, Neutral, the status roles, each 12 solid +
 * 12 alpha steps per side; On-Brand Default / Hover / Pressed). The Variables window shows it as the project's column; a
 * Figma export writes it as the project's mode. Variables it leaves out keep the Zen mode's value.
 */
export function projectBaseValues(theme) {
  const palettes = projectPalettes(theme);
  const values = {};
  const ramp = (role, palette) => {
    for (const [side, solid, alpha] of [["Light", "lightSolid", "lightAlpha"], ["Dark", "darkSolid", "darkAlpha"]]) {
      for (let index = 0; index < 12; index += 1) {
        values[`${side}/${role}/${index + 1}`] = palette.alias ? `{${side}/${palette.alias}/${index + 1}}` : palette[solid][index].toUpperCase();
        values[`${side}/${role}-Alpha/${index + 1}`] = palette.alias ? `{${side}/${palette.alias}-Alpha/${index + 1}}` : palette[alpha][index].toUpperCase();
      }
    }
  };
  ramp("Brand", palettes.primary);
  ramp("Neutral", palettes.neutral);
  for (const [role, name] of Object.entries(theme.status)) ramp(capital(role), { alias: name });
  for (const side of ["light", "dark"]) for (const state of ["default", "hover", "pressed"]) values[`${capital(side)}/On-Brand-${capital(state)}`] = palettes.onBrand[side][state].toUpperCase();
  return values;
}

/** The ZenProvider / data-* modes a project's frames render in (Light / Dark stays the canvas's own switch). */
export function projectModes(theme) {
  const { componentTheme, density, radius, typography, emphasis } = theme.modes;
  return { componentTheme, density, radius, typography, emphasis };
}
