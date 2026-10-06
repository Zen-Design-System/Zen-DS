import type { PlatformPage } from "../../PlatformExamples";
import type { StudioFrameWidth } from "../types";

/* Frame widths on the board (spec §4). Frames take their real width, so desktop playgrounds are never squeezed. */

/** Playgrounds of whole screens or wide components get a desktop-wide frame. */
const desktopPlaygrounds = new Set<PlatformPage | string>(["app-shell", "sidebar", "table", "page-header", "side-panel", "chart", "top-navigation", "templates"]);
/** Playgrounds whose specimen needs room for an open surface or a wide field. */
const widePlaygrounds = new Set<PlatformPage | string>(["dialog", "date-picker", "popover", "input", "metric", "card"]);

export const DOCS_WIDTH = 880;
export const DOCUMENT_WIDTH = 1200;
/** The Examples section holds two 1440 screens side by side (+ the 64px gap). */
export const SECTION_WIDTH = 2944;
/** World px between the frames of a section, across and down (boardLayout.ts places them). */
export const FRAME_GAP = 64;

export function playgroundWidth(page: PlatformPage): number {
  if (desktopPlaygrounds.has(page)) return 1440;
  if (widePlaygrounds.has(page)) return 1200;
  return 960;
}

export function exampleWidth(example: { screen?: boolean; wide?: boolean }): number {
  if (example.screen) return 1440;
  if (example.wide) return 1200;
  return 640;
}

/** Width presets of the frame toolbar; Auto is the rule above. */
export const frameWidthPresets: ReadonlyArray<{ value: StudioFrameWidth; label: string; caption?: string }> = [
  { value: "auto", label: "Auto" },
  { value: 390, label: "390", caption: "Phone" },
  { value: 768, label: "768", caption: "Tablet" },
  { value: 1024, label: "1024", caption: "Small desktop" },
  { value: 1280, label: "1280", caption: "Desktop" },
  { value: 1440, label: "1440", caption: "Wide desktop" },
];

/** A free width dragged on a frame's right edge stays within these (px). */
export const FRAME_MIN_WIDTH = 200;
export const FRAME_MAX_WIDTH = 4096;

/** A width set by dragging the frame's edge: a number none of the presets has. */
export const isCustomFrameWidth = (width: StudioFrameWidth | undefined): width is number =>
  typeof width === "number" && !frameWidthPresets.some((preset) => preset.value === width);

/** The width a frame renders at: its override, else the rule. */
export const resolveFrameWidth = (base: number, override?: StudioFrameWidth) => (override && override !== "auto" ? override : base);
