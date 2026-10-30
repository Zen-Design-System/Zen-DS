import { givenNameOf } from "../../../../../tools/studio/layer-meta.mjs";
import { overlayTitleOf } from "../proto/protoModel";
import { DEVICE_WIDTH, type PageDevice } from "../proto/runtime";
import type { PageNode } from "./renderPage";

/*
 * A builder page's frames (spec docs/research/studio-builder-pages-spec-2026-10-06.md §3 2b): one per Screen
 * ("screen:<id>[:<state>]") and Overlay ("overlay:<id>") at its device width, and one per Section ("section:<id>",
 * Figma's section, F4) at its own size. The board and the HTML export read them.
 */

export const literalOf = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };

/**
 * `place`: where the frame sits on the board (props `x`, `y`; none = in the row of unplaced frames, render/framePlace.ts).
 * `width`: a drawn Screen's own width, else its device's; `height`: a Section's (a Screen grows to its content past its
 * own). `loc`: the frame's element in the page text.
 */
export type PageFrame = { id: string; label: string; width: number; height?: number; kind: "screen" | "overlay" | "section" | "slice"; device: PageDevice; place: { x: number; y: number } | null; loc: string };

/** Whether a Board child is a Section (Figma's section: drawn behind the frames, never a frame of the flow). */
export const isSectionNode = (node: PageNode) => node.name === "Section";
/** Whether a Board child is a Slice (Figma's slice: an area exported as a picture, drawn above the frames, never a frame of the flow). */
export const isSliceNode = (node: PageNode) => node.name === "Slice";

const numberOf = (node: PageNode, prop: string) => { const value = literalOf(node, prop); return typeof value === "number" && Number.isFinite(value) ? value : undefined; };

/** The page's device: its first Screen's (an Overlay is drawn on it). */
export function pageDeviceOf(nodes: readonly PageNode[]): PageDevice {
  const screen = nodes.find((node) => node.name === "Screen");
  const device = screen ? literalOf(screen, "device") : undefined;
  return typeof device === "string" && device in DEVICE_WIDTH ? (device as PageDevice) : "desktop";
}

/** A frame's id, its label, its width and its place on the board. An Overlay is as wide as the page's `device` (a
 *  phone page's Dialog was drawn in a 720px desktop frame, walk 2026-10-29 W-39); half a desktop on a desktop page. */
export function frameOf(node: PageNode, device: PageDevice = "desktop"): PageFrame {
  const id = String(literalOf(node, "id") ?? "untitled");
  const x = numberOf(node, "x");
  const y = numberOf(node, "y");
  const place = x !== undefined && y !== undefined ? { x, y } : null;
  // Named by the person (data-name), else by what it shows (its Dialog's title, a Card's first text), as the Prototype tab
  // lists it; else by its id.
  if (node.name === "Slice") return { id: `slice:${id}`, label: givenNameOf(node) ?? String(literalOf(node, "title") ?? id), width: numberOf(node, "width") ?? 100, height: numberOf(node, "height") ?? 100, kind: "slice", device: "desktop", place: place ?? { x: 0, y: 0 }, loc: node.loc };
  if (node.name === "Section") return { id: `section:${id}`, label: givenNameOf(node) ?? String(literalOf(node, "title") ?? id), width: numberOf(node, "width") ?? 100, height: numberOf(node, "height") ?? 100, kind: "section", device: "desktop", place: place ?? { x: 0, y: 0 }, loc: node.loc };
  if (node.name === "Overlay") return { id: `overlay:${id}`, label: givenNameOf(node) ?? overlayTitleOf(node) ?? `Overlay · ${id}`, width: device === "desktop" ? DEVICE_WIDTH.desktop / 2 : DEVICE_WIDTH[device], kind: "overlay", device, place, loc: node.loc };
  const state = literalOf(node, "state");
  const own = (literalOf(node, "device") as PageDevice | undefined) ?? "desktop";
  const title = String(literalOf(node, "title") ?? id);
  const width = numberOf(node, "width") ?? DEVICE_WIDTH[own] ?? DEVICE_WIDTH.desktop;
  return { id: `screen:${id}${typeof state === "string" ? `:${state}` : ""}`, label: title, width, kind: "screen", device: own, place, loc: node.loc };
}
