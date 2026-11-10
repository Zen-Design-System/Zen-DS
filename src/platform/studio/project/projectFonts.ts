import { authorized } from "../api";
import { assetBlob, assetIdWith, loadUploads, putAsset, uploadOf } from "../builder/assets/uploads";
import {
  FONT_TYPES, FONT_WEIGHTS, MAX_FONT_BYTES, MAX_FONT_FACES, MAX_FONT_FAMILIES, fontKindOf, freeFontFamily,
  type FontFace as ProjectFontFace, type Project, type ProjectTheme, type UploadedFont,
} from "../../../../tools/studio/project-theme.mjs";

/*
 * A project's own fonts (user, 2026-11-10: "làm upload font riêng từng project"): Project settings › Typography › Upload
 * font takes WOFF2, WOFF, TTF or OTF files of up to 5 MB. The browser checks each one itself (FontFace loads it), names
 * it by its name and a hash of its bytes, and keeps it with the uploaded photos (builder/assets/uploads.ts: IndexedDB, a
 * linked folder's assets/). The dev server keeps a copy in the project's fonts/ folder (projects-folder.mjs), where
 * another browser gets it. Files of one family (AcmeSans-Regular, AcmeSans-Bold) join one font; the weight and the style
 * come from the file name, and a variable font is told by drawing it at two weights.
 */

export const FONT_ACCEPT = ".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf";

/** The weights' names, as type foundries and Figma's font picker say them. */
export const WEIGHT_NAMES: Record<number, string> = { 100: "Thin", 200: "Extra Light", 300: "Light", 400: "Regular", 500: "Medium", 600: "Semi Bold", 700: "Bold", 800: "Extra Bold", 900: "Black" };
/** The weights Zen's text styles read (Regular, Medium, Semi Bold, Bold): the Emphasis modes' 450 and 550 take the nearest. */
const ZEN_WEIGHTS = [400, 500, 600, 700];

/* ── what a file name says ────────────────────────────────────────────────────────────────────────────────────── */

const WEIGHT_WORDS: Array<[RegExp, number]> = [
  [/hairline|thin/, 100], [/(extra|ultra)light/, 200], [/light/, 300], [/(semi|demi)bold/, 600], [/(extra|ultra)bold/, 800],
  [/black|heavy/, 900], [/bold/, 700], [/medium/, 500],
];
const STYLE_WORDS = /^(hairline|thin|extra|ultra|semi|demi|light|regular|normal|book|roman|medium|bold|black|heavy|italic|oblique|variable|var|vf|wght|static|[1-9]00)$/i;

/** The family, weight and style a font file's name says ("AcmeSans-SemiBoldItalic.woff2" → Acme Sans, 600, italic). */
export function faceOfName(name: string): { family: string; weight: number; style: "normal" | "italic" } {
  const stem = name.replace(/\.[a-z0-9]+$/i, "");
  const words = stem.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[\s_\-.[\],]+/).filter(Boolean);
  const flat = words.join("").toLowerCase();
  const number = words.find((word) => /^[1-9]00$/.test(word));
  const weight = number ? Number(number) : WEIGHT_WORDS.find(([pattern]) => pattern.test(flat))?.[1] ?? 400;
  const kept = words.filter((word) => !STYLE_WORDS.test(word));
  const family = kept.map((word) => (word === word.toLowerCase() ? word.charAt(0).toUpperCase() + word.slice(1) : word)).join(" ").slice(0, 60).trim();
  return { family: family || "Font", weight, style: /italic|oblique/i.test(stem) ? "italic" : "normal" };
}

/* ── what the browser reads in a file ─────────────────────────────────────────────────────────────────────────── */

const VIETNAMESE = "ĂÂĐÊÔƠƯăâđêôơư ẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ";

/**
 * Whether the browser can draw the file (null when not), whether it is a variable font (it draws wider at weight 800
 * than at 200: a static file draws the same, its face spanning both weights so nothing is made bold), and whether it
 * has the Vietnamese letters (they draw the same width whatever the fallback after it).
 */
async function readFont(bytes: ArrayBuffer): Promise<{ variable: boolean; vietnamese: boolean } | null> {
  const name = `zen-font-probe-${Math.random().toString(36).slice(2)}`;
  const face = new FontFace(name, bytes, { weight: "1 1000" });
  try {
    await face.load();
  } catch {
    return null;
  }
  document.fonts.add(face);
  try {
    const context = document.createElement("canvas").getContext("2d");
    if (!context) return { variable: false, vietnamese: true };
    const width = (weight: number, fallback: string, text: string) => { context.font = `${weight} 40px "${name}", ${fallback}`; return context.measureText(text).width; };
    const sample = "Hamburgefonstiv 0123456789";
    return {
      variable: Math.abs(width(200, "monospace", sample) - width(800, "monospace", sample)) > 0.5,
      vietnamese: Math.abs(width(400, "monospace", VIETNAMESE) - width(400, "serif", VIETNAMESE)) < 0.5,
    };
  } finally {
    document.fonts.delete(face);
  }
}

/* ── uploading ────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A font's family name that is free in `fonts`: its own, or with "Custom" after a name the list has. */
function freeName(family: string, fonts: UploadedFont[]): string {
  const taken = fonts.map((font) => font.family);
  if (freeFontFamily(family, taken)) return family;
  const custom = `${family.slice(0, 52)} Custom`;
  return freeFontFamily(custom, taken) ? custom : "Font";
}

/**
 * Uploads font files into `theme`: each a face of the font its name says, or of `into` (a font's Add files); a font
 * already there takes it, and a face at the same weight and style is replaced. Returns the theme with them, the fonts
 * they went into (in order) and the files refused, each with why.
 */
export async function uploadFonts(files: File[], theme: ProjectTheme, { into }: { into?: string } = {}): Promise<{ theme: ProjectTheme; added: number; families: string[]; refused: string[] }> {
  await loadUploads();
  let fonts = theme.type.uploads.map((font) => ({ ...font, faces: [...font.faces] }));
  const refused: string[] = [];
  const families: string[] = [];
  let added = 0;
  for (const file of files) {
    if (file.size > MAX_FONT_BYTES) { refused.push(`${file.name} (over 5 MB)`); continue; }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = fontKindOf(bytes);
    if (!kind) { refused.push(`${file.name} (not a WOFF2, WOFF, TTF or OTF font)`); continue; }
    const read = await readFont(bytes.slice().buffer);
    if (!read) { refused.push(`${file.name} (the browser cannot read this font)`); continue; }
    const named = faceOfName(file.name);
    const known = fonts.find((font) => font.family.toLowerCase() === (into ?? named.family).toLowerCase());
    if (!known && fonts.length >= MAX_FONT_FAMILIES) { refused.push(`${file.name} (a project has up to ${MAX_FONT_FAMILIES} fonts)`); continue; }
    const id = assetIdWith(file.name, kind, bytes, "font");
    if (!uploadOf(id)) await putAsset(id, new Blob([bytes], { type: FONT_TYPES[kind] }), file.name);
    const face: ProjectFontFace = { file: id, weight: read.variable ? [100, 900] : named.weight, style: named.style, vietnamese: read.vietnamese };
    const target = known ?? { family: freeName(named.family, fonts), faces: [] };
    const same = (other: ProjectFontFace) => other.file === id || (other.style === face.style && JSON.stringify(other.weight) === JSON.stringify(face.weight));
    const faces = [...target.faces.filter((other) => !same(other)), face];
    if (faces.length > MAX_FONT_FACES) { refused.push(`${file.name} (a font has up to ${MAX_FONT_FACES} files)`); continue; }
    fonts = known ? fonts.map((font) => (font === known ? { ...font, faces } : font)) : [...fonts, { ...target, faces }];
    if (!families.includes(target.family)) families.push(target.family);
    added += 1;
  }
  return { theme: { ...theme, type: { ...theme.type, uploads: fonts } }, added, families, refused };
}

/** The theme without `family`: the roles that took it go back to Inter. */
export function removeFont(theme: ProjectTheme, family: string): ProjectTheme {
  const fonts = Object.fromEntries(Object.entries(theme.type.fonts).map(([role, value]) => [role, value === family ? "Inter" : value])) as ProjectTheme["type"]["fonts"];
  return { ...theme, type: { ...theme.type, fonts, uploads: theme.type.uploads.filter((font) => font.family !== family) } };
}

/** The theme with `family` named `next` (the roles follow), or null when `next` is not a free name. */
export function renameFont(theme: ProjectTheme, family: string, next: string): ProjectTheme | null {
  const name = next.trim().replace(/\s+/g, " ");
  if (name === family) return theme;
  if (!freeFontFamily(name, theme.type.uploads.filter((font) => font.family !== family).map((font) => font.family))) return null;
  const fonts = Object.fromEntries(Object.entries(theme.type.fonts).map(([role, value]) => [role, value === family ? name : value])) as ProjectTheme["type"]["fonts"];
  return { ...theme, type: { ...theme.type, fonts, uploads: theme.type.uploads.map((font) => (font.family === family ? { ...font, family: name } : font)) } };
}

/** The theme with one face of `family` at `weight`. */
export function setFaceWeight(theme: ProjectTheme, family: string, file: string, weight: number): ProjectTheme {
  const uploads = theme.type.uploads.map((font) => (font.family !== family ? font : { ...font, faces: font.faces.map((face) => (face.file === file ? { ...face, weight } : face)) }));
  return { ...theme, type: { ...theme.type, uploads } };
}

/** What a font lacks: the Zen weights no face covers (they draw in the nearest), and the Vietnamese letters. */
export function fontGaps(font: UploadedFont): { weights: number[]; vietnamese: boolean } {
  const covers = (weight: number) => font.faces.some((face) => face.style === "normal" && (Array.isArray(face.weight) ? face.weight[0] <= weight && weight <= face.weight[1] : face.weight === weight));
  return { weights: ZEN_WEIGHTS.filter((weight) => !covers(weight)), vietnamese: font.faces.every((face) => face.vietnamese) };
}

export const weightOptions = FONT_WEIGHTS.map((weight) => ({ value: String(weight), label: `${WEIGHT_NAMES[weight]} ${weight}` }));

/* ── the font list's samples ──────────────────────────────────────────────────────────────────────────────────── */

let previews: Promise<void> | null = null;
/**
 * "Ag" in each Google font of the list, for the role fields' option samples: one request for those two letters of every
 * family (Google Fonts' text=), renamed "<family> Ag" so they never stand in for the whole font a theme loads.
 */
export function loadFontSamples(families: readonly string[]): void {
  if (previews || typeof document === "undefined") return;
  const url = `https://fonts.googleapis.com/css2?${families.map((family) => `family=${family.replace(/ /g, "+")}`).join("&")}&text=Ag&display=swap`;
  previews = fetch(url).then((reply) => (reply.ok ? reply.text() : "")).then((css) => {
    if (!css) return;
    const style = document.createElement("style");
    style.id = "zen-studio-font-samples";
    style.textContent = css.replace(/font-family: '([^']+)'/g, "font-family: '$1 Ag'");
    document.head.append(style);
  }).catch(() => undefined);
}
/** The font-family a sample of a listed font draws in: Inter itself, any other its "Ag" (loadFontSamples). */
export const listedSample = (family: string) => (family === "Inter" ? '"Inter", sans-serif' : `"${family} Ag", "Inter", sans-serif`);

/* ── the dev server's copy ────────────────────────────────────────────────────────────────────────────────────── */

const filesOf = (project: Project) => project.theme.type.uploads.flatMap((font) => font.faces.map((face) => face.file));

async function base64Of(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

/** Sends the project's font files the dev server lacks (`onServer`) to its fonts/ folder; returns the files it has now. */
export async function pushFonts(project: Project, onServer: ReadonlySet<string>): Promise<Set<string>> {
  const has = new Set(onServer);
  for (const file of filesOf(project)) {
    if (has.has(file)) continue;
    const blob = await assetBlob(file).catch(() => null);
    if (!blob) continue;
    const reply = await authorized<{ ok?: boolean }>("/projects/font", { project: project.id, file, data: await base64Of(blob) }, 30_000).catch(() => null);
    if (reply?.status === 200 && reply.body?.ok) has.add(file);
  }
  return has;
}

/** Brings the project's font files this browser lacks from the dev server's copy (another browser uploaded them). */
export async function pullFonts(project: Project, onServer: ReadonlySet<string>): Promise<number> {
  await loadUploads();
  let pulled = 0;
  for (const file of filesOf(project)) {
    if (uploadOf(file) || !onServer.has(file)) continue;
    const reply = await authorized<{ ok?: boolean; data?: string }>(`/projects/font?project=${encodeURIComponent(project.id)}&file=${encodeURIComponent(file)}`).catch(() => null);
    if (reply?.status !== 200 || typeof reply.body?.data !== "string") continue;
    const binary = atob(reply.body.data);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const kind = fontKindOf(bytes);
    if (!kind || !file.endsWith(`.${kind}`)) continue;
    await putAsset(file, new Blob([bytes], { type: FONT_TYPES[kind] }), file);
    pulled += 1;
  }
  return pulled;
}
