/*
 * What of a layer is visible on the canvas: its ancestors that clip their content (overflow other than visible: a
 * scroll box, a card with hidden overflow, the frame itself) cut its outline and spacing tints, so the selection never
 * draws over the part a scroll box hides (backlog: alert-banner.tsx Box after ⇧2). Client pixels, up to the world.
 */

export type ClipRect = { left: number; top: number; right: number; bottom: number };
/** One measure pass's answers per ancestor (the instances of a .map share theirs). */
export type ClipCache = Map<Element, ClipRect | null>;

/** The clip `node` gives its own content (its padding box on the axes it clips), or null when it clips nothing. */
function ownClip(node: Element): ClipRect | null {
  const style = getComputedStyle(node);
  if (style.display === "contents") return null;
  const paint = /paint|strict|content/.test(style.contain);
  if (!paint && style.overflowX === "visible" && style.overflowY === "visible") return null;
  const rect = node.getBoundingClientRect();
  const html = node as HTMLElement;
  // The padding box (inside the borders), at the canvas zoom.
  const scale = html.offsetWidth ? rect.width / html.offsetWidth : 1;
  const box = { left: rect.left + html.clientLeft * scale, top: rect.top + html.clientTop * scale, right: rect.left + (html.clientLeft + html.clientWidth) * scale, bottom: rect.top + (html.clientTop + html.clientHeight) * scale };
  if (!paint && style.overflowX === "visible") { box.left = -Infinity; box.right = Infinity; }
  if (!paint && style.overflowY === "visible") { box.top = -Infinity; box.bottom = Infinity; }
  return box;
}

/** The clip of everything inside `node` (its own and its ancestors', up to the world), or null for none. */
function contentClip(node: Element | null, cache: ClipCache): ClipRect | null {
  if (!node || node.classList.contains("studio-world")) return null;
  if (cache.has(node)) return cache.get(node)!;
  const outer = contentClip(node.parentElement, cache);
  const own = ownClip(node);
  const clip = own && outer ? { left: Math.max(own.left, outer.left), top: Math.max(own.top, outer.top), right: Math.min(own.right, outer.right), bottom: Math.min(own.bottom, outer.bottom) } : own ?? outer;
  cache.set(node, clip);
  return clip;
}

/** The client rect inside which `element` is visible (its clipping ancestors' padding boxes), or null when none clips. */
export function clipRectOf(element: Element | null | undefined, cache: ClipCache = new Map()): ClipRect | null {
  if (!element) return null;
  // An absolute layer is clipped only from its containing block out (the boxes between do not clip it); a fixed one by
  // none of the page's boxes.
  const position = element instanceof HTMLElement ? getComputedStyle(element).position : "static";
  if (position === "fixed") return null;
  const from = position === "absolute" && element instanceof HTMLElement ? element.offsetParent : element.parentElement;
  return contentClip(from, cache);
}

/** `box` (x, y, w, h in the overlay's coordinates, `origin` its client offset) cut to `clip`; null when nothing shows. */
export function clipBox<T extends { x: number; y: number; w: number; h: number }>(box: T, clip: ClipRect | null, origin: { left: number; top: number }): T | null {
  if (!clip) return box;
  const left = Math.max(box.x, clip.left - origin.left);
  const top = Math.max(box.y, clip.top - origin.top);
  const right = Math.min(box.x + box.w, clip.right - origin.left);
  const bottom = Math.min(box.y + box.h, clip.bottom - origin.top);
  if (right - left < 0.5 || bottom - top < 0.5) return null;
  if (left === box.x && top === box.y && right === box.x + box.w && bottom === box.y + box.h) return box;
  return { ...box, x: left, y: top, w: right - left, h: bottom - top };
}

/** The clip of what `element` draws inside itself (its spacing areas, its children): its own overflow and its ancestors'. */
export const clipInside = (element: Element | null | undefined, cache: ClipCache = new Map()): ClipRect | null => (element ? contentClip(element, cache) : null);
