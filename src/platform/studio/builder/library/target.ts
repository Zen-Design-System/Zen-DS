import { canvasApi, getViewportBox } from "../../canvas/viewport";
import type { NodeSelection } from "../../edit/arrange";
import { isDropContainer } from "../../edit/drag";
import { findFrame } from "../../board/frames";
import { childHits, elementFiber, findBySrc, frameOf, hitOf, instanceOf, panelOf, walkAnnotated, type FiberHit } from "../../select/picker";
import { studioStore } from "../../store";

/*
 * Where a library item goes (Studio builder GĐ3 M1, spec docs/research/studio-builder-library-spec-2026-10-06.md §3d):
 * the selected layer (edit/clipboard.ts then puts it inside a layout, else right after it); with a frame selected, the
 * first layout of that frame; with nothing selected, the first layout of the frame most in view (E2E ST-02). On a builder
 * page that is a Screen's layout (the Board takes only Screens and Overlays). Example and Screen frames only: a
 * playground or a docs frame takes no structural edits.
 */

const EDITABLE_FRAME = /^(?:example|screen):/;

const frameElement = (id: string) => canvasApi.getWorldElement()?.querySelector(`[data-studio-frame="${CSS.escape(id)}"]`) ?? null;

/** The example or Screen frame with the largest visible area in the canvas viewport, or null. */
export function frameInView(): Element | null {
  const world = canvasApi.getWorldElement();
  if (!world) return null;
  const view = getViewportBox();
  let best: Element | null = null;
  let area = 0;
  for (const frame of world.querySelectorAll("[data-studio-frame]")) {
    if (!EDITABLE_FRAME.test(frame.getAttribute("data-studio-frame") ?? "")) continue;
    const r = frame.getBoundingClientRect();
    const w = Math.min(r.right, view.left + view.width) - Math.max(r.left, view.left);
    const h = Math.min(r.bottom, view.top + view.height) - Math.max(r.top, view.top);
    if (w > 0 && h > 0 && w * h > area) { area = w * h; best = frame; }
  }
  return best;
}

/** The frame's top-level layers, in document order. */
function rootLayers(frame: Element): FiberHit[] {
  const out: FiberHit[] = [];
  walkAnnotated(elementFiber(frame)?.child ?? null, (fiber) => {
    const hit = hitOf(fiber);
    if (hit?.hosts.length) out.push(hit);
    return false;
  });
  return out;
}

/**
 * The layer a library item goes into in `frame`: the first layout (a drop container: Stack, Grid, Box…) found from its
 * root layers down, breadth first, so an example whose root is its own component (`<LayoutFixture />`) takes the item
 * in the layout that component renders. A builder Screen's first layout, never the Board. No layout: the first root
 * layer (the item then goes right after it, or the paste says why it cannot).
 */
export function rootSelection(frame: Element): NodeSelection | null {
  const roots = rootLayers(frame);
  let hit: FiberHit | null = null;
  let level = roots;
  for (let depth = 0; depth < 6 && level.length && !hit; depth += 1) {
    hit = level.find((candidate) => candidate.name !== "Board" && candidate.name !== "Screen" && isDropContainer(candidate)) ?? null;
    level = level.flatMap((candidate) => childHits(candidate).filter((child) => child.hosts.length));
  }
  hit ??= roots[0] ?? null;
  if (!hit) return null;
  const host = hit.hosts[0];
  const world = canvasApi.getWorldElement();
  return { kind: "node", src: hit.src, name: hit.name, frameId: frameOf(host), panelId: panelOf(host), instance: world ? instanceOf(world, hit) : 0 };
}

/** Where to insert now: a layer, or why there is none. */
export function insertTarget(): NodeSelection | string {
  const selection = studioStore.getState().selection;
  if (selection?.kind === "node") {
    if (selection.part) return "That part belongs to its component: select the layer itself to add next to it";
    return selection;
  }
  const frame = selection?.kind === "frame" ? frameElement(selection.frameId) : frameInView();
  if (!frame || !EDITABLE_FRAME.test(frame.getAttribute("data-studio-frame") ?? "")) return "Nothing here takes new layers: bring an example or a screen into view, or select a layer";
  return rootSelection(frame) ?? "This frame has no layer to add into yet";
}

/** "Into Stack · Checkout", "After Button · Checkout": where `target` takes an item (edit/clipboard.ts's rule). */
export function describeTarget(target: NodeSelection): string {
  const world = canvasApi.getWorldElement();
  const hits = world ? findBySrc(world, target.src) : [];
  const hit = hits[target.instance] ?? hits[0] ?? null;
  const frame = findFrame(target.frameId)?.label;
  return `${hit && isDropContainer(hit) ? "Into" : "After"} ${target.name}${frame ? ` · ${frame}` : ""}`;
}
