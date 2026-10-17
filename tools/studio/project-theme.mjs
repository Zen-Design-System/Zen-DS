// A Zen Studio project's theme (user, 2026-10-17: "tạo dự án như Figma … set theme cho Dự án … không đè vào codebase
// hiện tại mà chỉ sinh thêm 1 mode riêng cho dự án đó"). A project keeps its settings in
// `.zen-studio/projects/<id>/project.json`; this module turns them into ONE extra mode of the Base Colors (Project)
// collection — `[data-brand="p-<id>"]` — and picks the project's other modes from the ones Zen ships. Nothing in
// tokens/source or src/styles/tokens.css changes.
//
//   defaultProjectTheme()            the Zen look (Zen + Gray, Brand-S1, Compact, Rounded, Dashboard)
//   normalizeProject(input)          { project, errors }: a project.json made safe (unknown values → defaults)
//   projectBrand(id)                 "p-<id>": the project's data-brand value
//   projectPalettes(theme)           the Primary / Neutral ramps (12 solid + 12 alpha, Light and Dark) and On-Brand
//   projectThemeCss(id, theme)       the mode as CSS (what theme.css holds and Studio injects)
//   projectModes(theme)              the ZenProvider modes a project's frames render in
//
// Primary and Neutral either alias a shipped ramp (Zen, Indigo … exactly as the Zen mode aliases Zen and Gray, so high
// contrast still applies) or are a custom colour: then the Zen Figma plugin's own generator (zen-ramp.generated.mjs)
// makes the ramp, so Figma would get the same 48 values. Corner radius, component theme and size, typography and
// emphasis are the shipped modes (user, 2026-10-17: the four radius modes, no custom scale): no new token values.
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

export function defaultProjectTheme() {
  return {
    primary: { ramp: "Zen" },
    neutral: { ramp: "Gray" },
    status: { ...STATUS_ROLES },
    // Slots 3–7: the Zen chart palette (Cyan, Violet, Yellow, Orange Solid, Green Soft).
    chart: [{ family: "cyan", tone: "solid" }, { family: "violet", tone: "solid" }, { family: "yellow", tone: "solid" }, { family: "orange", tone: "solid" }, { family: "green", tone: "soft" }],
    modes: { componentTheme: "brand-s1", density: "compact", radius: "rounded", typography: "dashboard", emphasis: "medium" },
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
  return {
    primary: colourSource(theme.primary, PRIMARY_RAMPS, base.primary, "theme.primary", errors),
    neutral: colourSource(theme.neutral, ["Gray"], base.neutral, "theme.neutral", errors, { tint: true }),
    status,
    chart,
    modes,
  };
}

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
  };
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
  return [
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
  ].join("\n");
}

/** The ZenProvider / data-* modes a project's frames render in (Light / Dark stays the canvas's own switch). */
export function projectModes(theme) {
  const { componentTheme, density, radius, typography, emphasis } = theme.modes;
  return { componentTheme, density, radius, typography, emphasis };
}
