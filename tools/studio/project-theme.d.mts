// Types of tools/studio/project-theme.mjs for the Studio client (allowJs is off).
export type RampName = "Zen" | "Tomato" | "Crimson" | "Pink" | "Plum" | "Purple" | "Violet" | "Indigo" | "Blue" | "Cyan" | "Sky" | "Teal" | "Mint" | "Grass" | "Yellow" | "Golden" | "Orange" | "Bronze" | "Brown" | "Gray";
export type SupportFamily = "brand" | "neutral" | "red" | "crimson" | "pink" | "plum" | "purple" | "violet" | "indigo" | "blue" | "cyan" | "sky" | "teal" | "mint" | "green" | "yellow" | "golden" | "orange" | "bronze" | "brown";
export type SectorTone = "solid" | "soft";
export type ColourSource = { ramp: RampName; hex?: never; tint?: never } | { hex: string; ramp?: never; tint?: never };
export type NeutralSource = ColourSource | { tint: "primary"; ramp?: never; hex?: never };
export type StatusRole = "positive" | "negative" | "warning" | "info";
export type ProjectModes = {
  componentTheme: "brand-s1" | "brand-s2" | "neutral-s1" | "neutral-s2" | "neutral-s3" | "neutral-s4" | "neutral-s5" | "neutral-s6" | "neutral-s7";
  density: "compact" | "comfortable";
  radius: "rounded" | "smooth" | "standard" | "luxury";
  typography: "dashboard" | "popular" | "mobile";
  emphasis: "medium" | "strong" | "light";
};
export type TypeRole = "sans" | "heading" | "display" | "button";
/** A type scale: the Body/Base size and the ratio between steps (the Zen Figma plugin's Type Scale). */
export type TypeScale = { base: number; ratio: number };
/** One file of an uploaded font: its weight (a variable font's [min, max]), its style, whether it has Vietnamese letters. */
export type FontFace = { file: string; weight: number | [number, number]; style: "normal" | "italic"; vietnamese: boolean };
/** A font the project uploaded: its family name and files. */
export type UploadedFont = { family: string; faces: FontFace[] };
/** A font per role, an optional type scale (`scale` null keeps the Typography mode's sizes), the project's own fonts. */
export type ProjectType = { fonts: Record<TypeRole, string>; scale: TypeScale | null; uploads: UploadedFont[] };
export type ProjectTheme = {
  primary: ColourSource;
  neutral: NeutralSource;
  status: Record<StatusRole, RampName>;
  chart: Array<{ family: SupportFamily; tone: SectorTone }>;
  modes: ProjectModes;
  type: ProjectType;
};
/** The libraries a project's pages use (its Libraries dialog): Zen, the project's own components, its theme. */
export type ProjectLibraries = { zen: boolean; components: boolean; theme: boolean };
/** The language of a project's pages (ZenProvider `locale`). */
export type ProjectLocale = "en-US" | "vi-VN";
export type Project = { format: 1; id: string; name: string; createdAt: number; updatedAt: number; theme: ProjectTheme; libraries: ProjectLibraries; locale: ProjectLocale };
export type Palette = { lightSolid: string[]; darkSolid: string[]; lightAlpha: string[]; darkAlpha: string[]; darkBackground: string; anchor: string; alias: RampName | null };
export type OnBrand = { default: string; hover: string; pressed: string; lc: number };

export const PROJECT_ID: RegExp;
export const PROJECT_FORMAT: 1;
export const RAMPS: Record<RampName, string>;
export const PRIMARY_RAMPS: RampName[];
export const SUPPORT_FAMILIES: SupportFamily[];
export const SUPPORT_LABELS: Record<SupportFamily, string>;
export const SECTOR_TONES: SectorTone[];
export const SECTOR_NAMES: string[];
export const STATUS_ROLES: Record<StatusRole, RampName>;
export const MODE_VALUES: { [K in keyof ProjectModes]: Array<ProjectModes[K]> };
export const FONT_FAMILIES: string[];
export const FONT_FORMATS: Record<"woff2" | "woff" | "ttf" | "otf", string>;
export const FONT_TYPES: Record<"woff2" | "woff" | "ttf" | "otf", string>;
export const MAX_FONT_BYTES: number;
export const MAX_FONT_FAMILIES: number;
export const MAX_FONT_FACES: number;
export const FONT_WEIGHTS: number[];
export const FONT_FILE: RegExp;
export function fontKindOf(bytes: Uint8Array): "woff2" | "woff" | "ttf" | "otf" | null;
export function uploadedFontName(id: string, family: string): string;
export function freeFontFamily(family: string, taken?: string[]): boolean;
export function projectFontStack(id: string, theme: ProjectTheme, family: string): string;
export const TYPE_ROLES: TypeRole[];
export const TYPE_SCALE_LIMITS: { base: { min: number; max: number }; ratio: { min: number; max: number } };
export function projectTypeScale(scale: TypeScale): Record<string, { size: number; lineHeight: number; letterSpacing: number }>;
export function projectFontsUrl(theme: ProjectTheme): string | null;
export function defaultProjectTheme(): ProjectTheme;
export function projectBrand(id: string): string;
export function projectIdFor(name: string, taken?: Set<string>): string;
export function normalizeTheme(input: unknown, errors?: string[]): ProjectTheme;
export function normalizeProject(input: unknown): { project: Project | null; errors: string[] };
export const PROJECT_LIBRARIES: ReadonlyArray<keyof ProjectLibraries>;
export function defaultLibraries(): ProjectLibraries;
export function normalizeLibraries(input: unknown): ProjectLibraries;
export const PROJECT_LOCALES: Record<ProjectLocale, string>;
export const DEFAULT_LOCALE: ProjectLocale;
export function normalizeLocale(input: unknown): ProjectLocale;
export function tintedNeutralAnchor(primaryHex: string): string;
export function suggestedChart(primaryHex: string): ProjectTheme["chart"];
export function chartFollowsPrimary(theme: ProjectTheme): boolean;
export function projectPalettes(theme: ProjectTheme): { primary: Palette; neutral: Palette; onBrand: { light: OnBrand; dark: OnBrand } };
export function projectThemeCss(id: string, theme: ProjectTheme, options?: { name?: string; brand?: string; fontUrl?: (file: string) => string | null }): string;
export function projectModes(theme: ProjectTheme): ProjectModes;
export function projectBaseValues(theme: ProjectTheme): Record<string, string>;
