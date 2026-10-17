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
export type ProjectTheme = {
  primary: ColourSource;
  neutral: NeutralSource;
  status: Record<StatusRole, RampName>;
  chart: Array<{ family: SupportFamily; tone: SectorTone }>;
  modes: ProjectModes;
};
export type Project = { format: 1; id: string; name: string; createdAt: number; updatedAt: number; theme: ProjectTheme };
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
export function defaultProjectTheme(): ProjectTheme;
export function projectBrand(id: string): string;
export function projectIdFor(name: string, taken?: Set<string>): string;
export function normalizeTheme(input: unknown, errors?: string[]): ProjectTheme;
export function normalizeProject(input: unknown): { project: Project | null; errors: string[] };
export function tintedNeutralAnchor(primaryHex: string): string;
export function projectPalettes(theme: ProjectTheme): { primary: Palette; neutral: Palette; onBrand: { light: OnBrand; dark: OnBrand } };
export function projectThemeCss(id: string, theme: ProjectTheme, options?: { name?: string; brand?: string }): string;
export function projectModes(theme: ProjectTheme): ProjectModes;
export function projectBaseValues(theme: ProjectTheme): Record<string, string>;
