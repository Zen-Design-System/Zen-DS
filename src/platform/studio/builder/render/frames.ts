import { DEVICE_WIDTH, type PageDevice } from "../proto/runtime";
import type { PageNode } from "./renderPage";

/*
 * A builder page's frames (spec docs/research/studio-builder-pages-spec-2026-10-06.md §3 2b): one per Screen
 * ("screen:<id>[:<state>]") and Overlay ("overlay:<id>") at its device width. The board and the HTML export read them.
 */

export const literalOf = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };

export type PageFrame = { id: string; label: string; width: number; kind: "screen" | "overlay"; device: PageDevice };

/** A frame's id, its label and its device width. */
export function frameOf(node: PageNode): PageFrame {
  const id = String(literalOf(node, "id") ?? "untitled");
  if (node.name === "Overlay") return { id: `overlay:${id}`, label: `Overlay · ${id}`, width: DEVICE_WIDTH.desktop / 2, kind: "overlay", device: "desktop" };
  const state = literalOf(node, "state");
  const device = (literalOf(node, "device") as PageDevice | undefined) ?? "desktop";
  const title = String(literalOf(node, "title") ?? id);
  return { id: `screen:${id}${typeof state === "string" ? `:${state}` : ""}`, label: title, width: DEVICE_WIDTH[device] ?? DEVICE_WIDTH.desktop, kind: "screen", device };
}
