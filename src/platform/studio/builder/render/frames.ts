import { overlayTitleOf } from "../proto/protoModel";
import { DEVICE_WIDTH, type PageDevice } from "../proto/runtime";
import type { PageNode } from "./renderPage";

/*
 * A builder page's frames (spec docs/research/studio-builder-pages-spec-2026-10-06.md §3 2b): one per Screen
 * ("screen:<id>[:<state>]") and Overlay ("overlay:<id>") at its device width. The board and the HTML export read them.
 */

export const literalOf = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };

/**
 * `place`: where the frame sits on the board (props `x`, `y`; none = in the row of unplaced frames, render/framePlace.ts).
 * `width`: a drawn Screen's own width, else its device's. `loc`: the frame's element in the page text.
 */
export type PageFrame = { id: string; label: string; width: number; kind: "screen" | "overlay"; device: PageDevice; place: { x: number; y: number } | null; loc: string };

const numberOf = (node: PageNode, prop: string) => { const value = literalOf(node, prop); return typeof value === "number" && Number.isFinite(value) ? value : undefined; };

/** A frame's id, its label, its width and its place on the board. */
export function frameOf(node: PageNode): PageFrame {
  const id = String(literalOf(node, "id") ?? "untitled");
  const x = numberOf(node, "x");
  const y = numberOf(node, "y");
  const place = x !== undefined && y !== undefined ? { x, y } : null;
  // Named by what it shows (its Dialog's title, a Card's first text), as the Prototype tab lists it; else by its id.
  if (node.name === "Overlay") return { id: `overlay:${id}`, label: overlayTitleOf(node) ?? `Overlay · ${id}`, width: DEVICE_WIDTH.desktop / 2, kind: "overlay", device: "desktop", place, loc: node.loc };
  const state = literalOf(node, "state");
  const device = (literalOf(node, "device") as PageDevice | undefined) ?? "desktop";
  const title = String(literalOf(node, "title") ?? id);
  const width = numberOf(node, "width") ?? DEVICE_WIDTH[device] ?? DEVICE_WIDTH.desktop;
  return { id: `screen:${id}${typeof state === "string" ? `:${state}` : ""}`, label: title, width, kind: "screen", device, place, loc: node.loc };
}
