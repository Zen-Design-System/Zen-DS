import type { PlaceBox } from "./insertPlace";

/*
 * A frame without auto layout, Figma's: a Box whose layers all float, or that has none, and a Screen with no layout root
 * (an Empty page's) whose layers all float, or that has none. A layer put there floats at px (`position="absolute"
 * insetLeft insetTop`; a component in a Box of its own, the Studio's floating wrapper). Read by the clipboard (⌘V, Paste
 * here, an insert from Assets or Quick insert: edit/clipboard.ts) and the library target (builder/library/target.ts).
 */

/** Layers that float themselves; any other floats in a Box of its own (the server's floatAt, edit/autoLayoutPlan.ts floatingCode). */
export const FLOATS = new Set(["Stack", "Grid", "Box", "Shape"]);
export const floats = (element: Element) => element instanceof HTMLElement && element.dataset.position === "absolute";

/** Chrome a Screen draws beside its layers (a phone's system bars, the Add Navigation placeholders, an Overlay's portal). */
const SCREEN_CHROME = ".studio-device-status, .studio-device-home, .studio-device-duo, .studio-builder-screen__pin, [data-studio-placeholder], .studio-builder-overlay__portal, .studio-builder-screen__side, .studio-builder-screen__main";

/** The elements a page's JSX draws directly in `box` (the Screen's chrome left out). */
export function layerKidsOf(box: Element): HTMLElement[] {
  return Array.from(box.children).filter((child): child is HTMLElement => child instanceof HTMLElement && !child.matches(SCREEN_CHROME));
}

/**
 * The block a layer put into `host` floats in: a Box whose layers all float, or that has none (never a layer's own
 * floating Box), or a Screen without a layout root (its content box, or itself without an app frame) whose layers all
 * float, or that has none. Null: a layout's flow (a Stack, a Card, a Screen holding a Stack or an AppShell).
 */
export function freeBlock(host: Element | undefined | null): HTMLElement | null {
  if (!(host instanceof HTMLElement)) return null;
  const screen = host.matches(".studio-builder-screen");
  const box = screen ? host.querySelector<HTMLElement>(".studio-builder-screen__content") ?? host : host;
  if (!screen && !box.matches(".zen-box")) return null;
  if (!screen && box.dataset.position === "absolute" && box.children.length === 1) return null;
  const kids = layerKidsOf(box);
  if (!kids.every(floats)) return null;
  // The insets measure from the layers' containing block (a Box is one: position.css makes it relative; a Screen too).
  // Empty: the block a layer put there would measure from (a Screen's content box is not one: the Screen is).
  const block = kids[0]?.offsetParent ?? (getComputedStyle(box).position === "static" ? box.offsetParent : box);
  return block instanceof HTMLElement ? block : box;
}

/** What a Screen draws over its top edge (the status bar, a Top Navigation, the canvas's "Add Top Navigation"). */
const SCREEN_TOP = ".studio-device-status, .studio-builder-screen__pin[data-edge='top'], .studio-builder-screen__top, [data-studio-placeholder][data-edge='top']";

/**
 * Where a layer may start in `block`'s own px (walk 2026-10-29 W-28): under the status bar, the Top Navigation and the
 * canvas's "Add Top Navigation" of the Screen it belongs to (that placeholder stands where a Top Navigation would go);
 * 0 outside a Screen and on a desktop one.
 */
export function topClearIn(block: HTMLElement): number {
  const screen = screenOfBlock(block);
  if (!screen) return 0;
  let clear = 0;
  for (const bar of screen.querySelectorAll(SCREEN_TOP)) {
    if (bar.closest(".studio-builder-screen") !== screen) continue;
    const box = boxIn(block, bar.getBoundingClientRect());
    if (box.height > 0) clear = Math.max(clear, box.y + box.height);
  }
  return clear;
}

/** A client point in `block`'s own px (the canvas zoom undone), and its scale. */
export function localTo(block: HTMLElement, x: number, y: number) {
  const outer = block.getBoundingClientRect();
  const scale = block.offsetWidth ? outer.width / block.offsetWidth || 1 : 1;
  return { x: (x - outer.left) / scale - block.clientLeft, y: (y - outer.top) / scale - block.clientTop, scale };
}

/** A client rect as a box in `block`'s own px. */
export function boxIn(block: HTMLElement, rect: DOMRect): PlaceBox {
  const at = localTo(block, rect.left, rect.top);
  return { x: at.x, y: at.y, width: rect.width / at.scale, height: rect.height / at.scale };
}

/** The floating layers of `block`, as boxes in its own px, in document order. */
export function layerBoxesIn(block: HTMLElement): PlaceBox[] {
  return layerKidsOf(block).filter(floats).map((kid) => boxIn(block, kid.getBoundingClientRect()));
}

/** The Screen `block` belongs to, for its device (the page margin differs on a phone), or null outside a Screen. */
export const screenOfBlock = (block: Element) => block.closest<HTMLElement>(".studio-builder-screen");
