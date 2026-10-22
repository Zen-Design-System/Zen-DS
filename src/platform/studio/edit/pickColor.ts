import { shapeFills } from "../../../components/Shape/paint";
import { announceEditStatus, parseSrc, studioApi } from "../api";
import { canvasApi, getViewportBox } from "../canvas/viewport";
import type { Rgb } from "../inspector/controls/colorMatch";
import { colorKey, colorTokensFor } from "../inspector/partInfo";
import { fillPalette, surfacePalette, tonePalette, type SwatchPalette } from "../inspector/palettes";
import { componentSchema, splitUnion } from "../inspector/propSchema";
import { annotatedAt, rectOf } from "../select/picker";
import { selectedLayers, type ExtraLayer } from "../select/multiSelection";
import { canEdit, studioStore } from "../store";
import type { EditOp } from "../types";
import { publishDragView } from "./drag";
import { setOwnPropsOnLayers } from "./multi";
import { chooseOption, pickOps, pickTargetOf, rgbOfHex, type PickOption, type PickPalette, type PickTarget } from "./pickColorModel";
import { providePickColor, type PickRow } from "./pickColorRequest";

/*
 * Figma's Pick color (I), on a page you made (spec docs/research/studio-fill-gradient-smoothing-eyedropper-spec-2026-10-22.md
 * §3; user 2026-10-22: the layer's own colour variable first, then the pixel): while it is on, the pointer over the
 * canvas outlines the layer it would pick from and names the colour; a click paints the selected layers' fill with it
 * (a Shape's fill, a frame's surface, a text's tone: pickColorModel.ts), one edit, one ⌘Z, and Move is back. A colour
 * row's own Pick color (SwatchControl's list) gives that row the colour instead. The picked colour is a variable: the
 * layer's own when the target's palette has it, else the nearest of that palette. A picture (or a gradient) has no one
 * variable: the click opens the browser's eyedropper (Chromium) for the pixel. Esc, or a press on the panels, stops it.
 */

type Picking = { row: PickRow | null };
let picking: Picking | null = null;

const say = (message: string, kind: "unchanged" | "error" = "unchanged") => announceEditStatus({ kind, message, at: Date.now() });

const PALETTES: Record<PickPalette, SwatchPalette> = { fill: fillPalette, surface: surfacePalette, tone: tonePalette };
const FILL_OPTIONS: readonly string[] = shapeFills.filter((fill) => fill !== "none");
const SURFACE_OPTIONS: readonly string[] = ["surface", "surface-alt", "subtle", "pale", "canvas"];
const baseName = (name: string) => name.slice(name.lastIndexOf(".") + 1);

/** A component's text-colour tones (its API's `tone` union, when every value is a Color/Content tone), else null. */
function toneOptionsOf(name: string): string[] | null {
  const tone = componentSchema(baseName(name))?.props.find((prop) => prop.name === "tone");
  const options = tone ? splitUnion(tone.type).filter((option) => option !== "inherit") : [];
  return options.length && options.every((option) => tonePalette.has(option)) ? options : null;
}

let probe: CanvasRenderingContext2D | null | undefined;
/** A CSS colour as RGB 0–255 (over white, as a swatch shows it), or null. */
function rgbOfColor(value: string): Rgb | null {
  const key = colorKey(value);
  if (!key) return null;
  probe ??= typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe) return null;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "#fff";
  probe.fillRect(0, 0, 1, 1);
  probe.fillStyle = value;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return { r, g, b };
}
/** A palette's options with their variables and colours, read under `at` (its colour mode). */
function optionsUnder(at: Element, palette: SwatchPalette, options: readonly string[]): PickOption[] {
  const style = getComputedStyle(at);
  return options.flatMap((option) => {
    const cssVar = palette.colorOf(option);
    if (!cssVar) return [];
    const value = style.getPropertyValue(cssVar).trim();
    return [{ option, cssVar, rgb: value ? rgbOfColor(value) : null }];
  });
}

/** What the canvas paints at a point: the colour and its variables, a picture or gradient (no one variable), or nothing. */
type Paint = { at: Element; value: string; tokens: string[]; rgb: Rgb | null } | { at: Element; picture: true } | null;
function paintAt(x: number, y: number): Paint {
  const top = document.elementsFromPoint(x, y).find((element) => element.closest(".studio-world") && !element.matches(".studio-world")) ?? null;
  const hasOwnText = (node: Element) => Array.from(node.childNodes).some((child) => child.nodeType === 3 && Boolean(child.textContent?.trim()));
  for (let node: Element | null = top; node && !node.matches(".studio-world"); node = node.parentElement) {
    if (node instanceof HTMLImageElement || node instanceof HTMLVideoElement || node instanceof HTMLCanvasElement) return { at: node, picture: true };
    const style = getComputedStyle(node);
    const found = (value: string, role: "content" | "background") => ({ at: node as Element, value, tokens: colorTokensFor(node as Element, value, role), rgb: rgbOfColor(value) });
    if (node instanceof SVGElement && !(node instanceof SVGSVGElement)) {
      if (style.fill.startsWith("url(")) return { at: node, picture: true };
      if (style.fill && style.fill !== "none" && !/,0$/.test(colorKey(style.fill) ?? ",0")) return found(style.fill, node.closest(".zen-shape") ? "background" : "content");
      continue;
    }
    if (hasOwnText(node)) return found(style.color, "content");
    if (style.backgroundImage && style.backgroundImage !== "none") return { at: node, picture: true };
    if (!/,0$/.test(colorKey(style.backgroundColor) ?? ",0")) return found(style.backgroundColor, "background");
  }
  return null;
}

/** The browser's eyedropper (Chromium's EyeDropper API): the pixel the person clicks next, or null. */
async function pickPixel(): Promise<Rgb | null> {
  const EyeDropper = (window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
  if (!EyeDropper) return null;
  try { return rgbOfHex((await new EyeDropper().open()).sRGBHex); } catch { return null; }
}

/** The pointer is on the canvas itself (not on the chrome floating over it). */
const onCanvas = (event: PointerEvent) => {
  const box = getViewportBox();
  const { clientX: x, clientY: y } = event;
  if (x < box.left || x > box.left + box.width || y < box.top || y > box.top + box.height) return false;
  return !(event.target instanceof Element && event.target.closest(".studio-chrome, .studio-chrome-portal"));
};

function onMove(event: PointerEvent) {
  if (!picking) return;
  if (!onCanvas(event)) { publishDragView(null); return; }
  const paint = paintAt(event.clientX, event.clientY);
  const layer = paint ? annotatedAt(paint.at) : null;
  const rect = layer ? rectOf(layer.hosts) : null;
  publishDragView({ line: null, into: rect ? { x: rect.x, y: rect.y, w: rect.width, h: rect.height } : null, pointer: { x: event.clientX, y: event.clientY }, label: colorName(paint), tone: paint ? "info" : "negative" });
}
/**
 * The tag beside the pointer: the colour's variable as the fill list names it ("Accent / Solid"), another variable by
 * its path ("Content Neutral Base"), else its hex; a picture's pixel is picked by the browser's eyedropper.
 */
function colorName(paint: Paint): string {
  if (!paint) return "No color here";
  if ("picture" in paint) return "Pick the pixel";
  const fill = FILL_OPTIONS.find((option) => paint.tokens.includes(fillPalette.colorOf(option) ?? ""));
  if (fill) return fillPalette.label(fill);
  const token = paint.tokens[0];
  if (token) return token.replace(/^--zen-color-/, "").replace(/-default$/, "").split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
  return paint.rgb ? `#${[paint.rgb.r, paint.rgb.g, paint.rgb.b].map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase()}` : "No color here";
}

/** The press is the pick's own: the canvas neither selects nor starts a marquee under it. */
function onDown(event: PointerEvent) {
  if (!picking || event.button !== 0) return;
  // A press on the panels stops picking (they keep their click).
  if (!onCanvas(event)) { stopPickColor(); return; }
  event.preventDefault();
  event.stopPropagation();
}

function onUp(event: PointerEvent) {
  const current = picking;
  if (!current || event.button !== 0 || !onCanvas(event)) return;
  event.preventDefault();
  event.stopPropagation();
  // The click that follows this release is the pick's too.
  const swallow = (click: MouseEvent) => { click.stopPropagation(); click.preventDefault(); };
  window.addEventListener("click", swallow, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
  const paint = paintAt(event.clientX, event.clientY);
  stopPickColor();
  if (!paint) { say("No color here to pick"); return; }
  if ("picture" in paint) {
    // No one variable paints a picture or a gradient: the pixel, from the browser's eyedropper (this click opens it).
    say("Click the pixel to pick (the browser's eyedropper) · Esc to stop");
    void pickPixel().then((rgb) => {
      if (rgb) void apply(current, { at: paint.at, tokens: [], rgb });
      else say("This browser has no eyedropper for a picture's pixels: pick a layer with a color variable");
    });
    return;
  }
  void apply(current, paint);
}

function onKey(event: KeyboardEvent) {
  if (!picking || event.key !== "Escape") return;
  event.preventDefault();
  event.stopImmediatePropagation();
  stopPickColor();
  say("Pick color stopped");
}

/** The picked colour on the row being edited, or on the selected layers (one edit). */
async function apply(current: Picking, paint: { at: Element; tokens: string[]; rgb: Rgb | null }) {
  if (current.row) {
    const chosen = chooseOption(optionsUnder(paint.at, current.row.palette, current.row.options), paint.tokens, paint.rgb);
    if (!chosen) { say("No color variable matches here"); return; }
    current.row.onPick(chosen.option);
    say(`${current.row.label} → ${current.row.palette.label(chosen.option)}${chosen.exact ? "" : " (the nearest variable)"}`);
    return;
  }
  const layers = selectedLayers();
  const opsByLoc: Record<string, EditOp[]> = {};
  const targets: ExtraLayer[] = [];
  const skipped: string[] = [];
  let shown: { label: string; exact: boolean } | null = null;
  for (const layer of layers) {
    const at = parseSrc(layer.src);
    const element = at ? await studioApi.element(at.file, at.loc) : null;
    if (!at || !element) { say(`${layer.name} is no longer there — select it again`, "error"); return; }
    const target: PickTarget | null = pickTargetOf(element.name, toneOptionsOf(element.name));
    if (!target) { skipped.push(baseName(element.name)); continue; }
    const options = target.palette === "fill" ? FILL_OPTIONS : target.palette === "surface" ? SURFACE_OPTIONS : toneOptionsOf(element.name) ?? [];
    const chosen = chooseOption(optionsUnder(paint.at, PALETTES[target.palette], options), paint.tokens, paint.rgb);
    if (!chosen) { skipped.push(baseName(element.name)); continue; }
    const written = new Map(element.attributes.map((attr) => [attr.name, attr.kind === "string" ? attr.value : null] as [string, string | null]));
    const ops = pickOps(target, chosen.option, written);
    shown ??= { label: PALETTES[target.palette].label(chosen.option), exact: chosen.exact };
    if (!ops.length) continue;
    opsByLoc[at.loc] = ops;
    targets.push(layer);
  }
  if (!targets.length) {
    say(skipped.length ? `${[...new Set(skipped)].join(", ")}: no fill to pick a color for` : shown ? `Already ${shown.label}` : "Select the layers to color first");
    return;
  }
  const done = await setOwnPropsOnLayers(targets, opsByLoc, `Pick color → ${shown?.label ?? "color"}`);
  if (done && (skipped.length || (shown && !shown.exact))) {
    say([shown && !shown.exact ? `${shown.label}: the nearest variable` : null, skipped.length ? `${[...new Set(skipped)].join(", ")} kept its colors` : null].filter(Boolean).join(" · "));
  }
}

/**
 * Turns Pick color on, for the selected layers (I) or for `row` (a colour list's Pick color). False, with the reason
 * said, when there is nothing to pick for or the Studio cannot edit.
 */
export function startPickColor(row: PickRow | null = null): boolean {
  stopPickColor();
  if (!canEdit()) { say("View only", "error"); return false; }
  if (!row && !selectedLayers().length) { say("Pick color fills the selected layers: select one first"); return false; }
  picking = { row };
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerdown", onDown, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("keydown", onKey, true);
  const viewport = canvasApi.getViewportElement();
  viewport?.setAttribute("data-studio-placing", "");
  viewport?.setAttribute("data-studio-dragging", "");
  viewport?.setAttribute("data-studio-picking", "");
  say(`Pick color${row ? ` for ${row.label}` : ""} · click a color on the canvas · Esc to stop`);
  // Another tool, or another page, stops it; a row's pick also stops when the selection changes (the row is the old one's).
  const { tool, localPage, selection } = studioStore.getState();
  stopWatch = studioStore.subscribe(() => {
    const state = studioStore.getState();
    if (state.tool !== tool || state.localPage !== localPage || (row && state.selection !== selection)) stopPickColor();
  });
  return true;
}
let stopWatch: (() => void) | null = null;
providePickColor(startPickColor);

/** Whether Pick color is on (E2E and the canvas tip read it). */
export const isPickingColor = () => Boolean(picking);

/** Puts Pick color away (a pick, Esc, another tool). */
export function stopPickColor() {
  if (!picking) return;
  picking = null;
  stopWatch?.();
  stopWatch = null;
  window.removeEventListener("pointermove", onMove, true);
  window.removeEventListener("pointerdown", onDown, true);
  window.removeEventListener("pointerup", onUp, true);
  window.removeEventListener("keydown", onKey, true);
  const viewport = canvasApi.getViewportElement();
  viewport?.removeAttribute("data-studio-placing");
  viewport?.removeAttribute("data-studio-dragging");
  viewport?.removeAttribute("data-studio-picking");
  publishDragView(null);
}
