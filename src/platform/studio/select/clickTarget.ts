import { childHits, elementFiber, hitOf, parentHit, walkAnnotated, type FiberHit } from "./picker";
import { wrapperCandidate } from "./resize";

/*
 * Figma's click on the canvas (user, 2026-10-09: "Bấm như Figma: bấm chọn layer ngoài cùng, bấm đúp để đi vào một cấp,
 * ⌘-bấm để chọn layer sâu nhất"): a click selects the outermost layer under the pointer in the current context, a
 * double-click goes one level in, ⌘-click selects the deepest (the annotated element under the pointer, which every
 * click selected before).
 *
 * The layers under the pointer are the ones the Layers panel lists (LayersPanel collapseWrappers / simplify): the
 * platform's wrappers above a frame's content, a div or section holding one layer and the Studio's sizing Stack around
 * a component are left out. A frame's content root (its one first layer, and the elements of the same DOM node below
 * it: an example component and its root Stack) stands for the frame, as a Figma frame with auto layout does: a click
 * selects one of its children, or the root where no child is under the pointer. An overlay (a Dialog's portal) starts
 * at its owner. With a layer selected, a click inside that layer's parent selects the parent's child under the pointer:
 * a sibling, or the selected layer itself (a click inside it keeps it).
 */

const fileOf = (src: string) => src.replace(/:\d+:\d+$/, "");

/** Whether two hits are the same rendered element. */
export function sameElement(a: FiberHit, b: FiberHit): boolean {
  if (a.src !== b.src) return false;
  if (a.fiber && b.fiber && (a.fiber === b.fiber || a.fiber === b.fiber.alternate)) return true;
  return a.hosts.length > 0 && a.hosts[0] === b.hosts[0];
}

const sameHosts = (a: FiberHit, b: FiberHit) => a.hosts.length > 0 && a.hosts.length === b.hosts.length && a.hosts.every((host, index) => host === b.hosts[index]);

/** The layers directly inside `hit` that show something (the Layers panel lists no element that renders nothing). */
const shownChildren = (hit: FiberHit) => childHits(hit).filter((child) => child.hosts.length > 0);

/** A frame's first layers as the Layers panel lists them, read again at most every second (hover asks on every move). */
const firstCache = new WeakMap<Element, { at: number; layers: FiberHit[] }>();

function firstLayers(frame: Element): FiberHit[] {
  const cached = firstCache.get(frame);
  if (cached && performance.now() - cached.at < 1000 && cached.layers.every((layer) => layer.hosts.every((host) => host.isConnected))) return cached.layers;
  const tops: FiberHit[] = [];
  walkAnnotated(elementFiber(frame)?.child ?? null, (current) => {
    const hit = hitOf(current);
    if (hit && hit.hosts.length) tops.push(hit);
    return false;
  });
  // LayersPanel collapseWrappers: the single-child chain at the frame's top leads to its content; the links of that
  // chain written in another file than the content are the platform's wrappers.
  let layers = tops;
  if (tops.length === 1) {
    let end = tops[0];
    for (let children = shownChildren(end), guard = 0; children.length === 1 && guard < 40; children = shownChildren(end), guard++) end = children[0];
    const contentFile = fileOf(end.src);
    for (let guard = 0; layers.length === 1 && fileOf(layers[0].src) !== contentFile && guard < 40; guard++) {
      const children = shownChildren(layers[0]);
      if (children.length !== 1) break;
      layers = children;
    }
  }
  firstCache.set(frame, { at: performance.now(), layers });
  return layers;
}

/** LayersPanel simplify: a div or section holding one layer, and the Studio's sizing Stack, stand for their child. */
function folded(hit: FiberHit, next: FiberHit): boolean {
  if ((hit.name === "div" || hit.name === "section") && shownChildren(hit).length === 1) return true;
  const host = next.isComponent && next.hosts.length === 1 ? next.hosts[0] : null;
  return Boolean(host && hit.name === "Stack" && hit.isComponent && wrapperCandidate(host) === hit.src);
}

/**
 * The layers under the pointer, from the frame's first layer (or an overlay's owner) down to `deepest`, as Layers lists
 * them; `root`: the index of the content root that stands for the frame (-1 when there is none). Null when `deepest` is
 * outside the frame's content (a platform wrapper's own area).
 */
export function layersAt(deepest: FiberHit, frame: Element | null): { path: FiberHit[]; root: number } | null {
  const chain: FiberHit[] = [];
  for (let hit: FiberHit | null = deepest, guard = 0; hit && guard < 400; hit = parentHit(hit, frame), guard++) chain.unshift(hit);
  let start = 0;
  let root: FiberHit | null = null;
  // An overlay (a Dialog's portal content): its owner is the top layer, as Figma lists an overlay on its own.
  const overlay = frame ? chain.findIndex((hit) => hit.hosts.length > 0 && !hit.hosts.some((host) => frame.contains(host))) : -1;
  if (overlay >= 0) start = overlay;
  else if (frame) {
    const first = firstLayers(frame);
    start = chain.findIndex((hit) => first.some((layer) => sameElement(layer, hit)));
    if (start < 0) return null;
    if (first.length === 1) {
      let at = start;
      while (at < chain.length - 1 && sameHosts(chain[at], chain[at + 1])) at += 1;
      root = chain[at];
    }
  }
  const kept = chain.slice(start);
  const path = kept.filter((hit, index) => index === kept.length - 1 || hit === root || !folded(hit, kept[index + 1]));
  return { path, root: root ? path.indexOf(root) : -1 };
}

/**
 * The layer a click selects (no modifier): `deepest` is the annotated element under the pointer, `selected` the
 * selected element (null when nothing, or a part, is selected).
 */
export function clickTarget(deepest: FiberHit, frame: Element | null, selected: FiberHit | null): FiberHit {
  const layers = layersAt(deepest, frame);
  if (!layers || !layers.path.length) return deepest;
  const { path, root } = layers;
  // The top level: the content root's child under the pointer (the root itself where there is none), else the first layer.
  const top = root >= 0 ? path[Math.min(root + 1, path.length - 1)] : path[0];
  if (!selected) return top;
  const at = path.findIndex((hit) => sameElement(hit, selected));
  // Inside the selected layer (below the content root): it stays selected; a double-click goes in.
  if (at > root) return path[at];
  if (at >= 0) return top;
  // Inside the selected layer's parent: the parent's child under the pointer (the parent where none is).
  const own = layersAt(selected, frame)?.path ?? [];
  const parent = own.length > 1 ? own[own.length - 2] : null;
  const p = parent ? path.findIndex((hit) => sameElement(hit, parent)) : -1;
  if (p >= 0 && p >= root) return path[Math.min(p + 1, path.length - 1)];
  return top;
}

/** Figma's double-click: the layer one level inside `selected` under the pointer, or null when `selected` is not above it. */
export function layerInside(deepest: FiberHit, frame: Element | null, selected: FiberHit): FiberHit | null {
  const path = layersAt(deepest, frame)?.path ?? [];
  const at = path.findIndex((hit) => sameElement(hit, selected));
  return at >= 0 && at < path.length - 1 ? path[at + 1] : null;
}
