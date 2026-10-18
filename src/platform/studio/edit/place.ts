import { announceEditStatus } from "../api";
import { canvasApi, getViewportBox } from "../canvas/viewport";
import { canEdit, studioStore } from "../store";
import type { DropTarget } from "./arrange";
import { dropAsset, refusalFor, type Insertable } from "./assets/assets";
import { dropTargetAt, publishDragView, type DropContext } from "./drag";

/*
 * Placing with the pointer (the toolbar's Stack, Text and Image tools; user, 2026-10-09: Figma's tools, placed with the
 * mouse): while a placement tool is on, the item follows the pointer over the canvas and the insertion line of a layer
 * drag shows where it would land; a click places it there (one edit, one undo step, the new layer selected) and the tool
 * goes back to Move, as Figma's do. The Screen tool adds a Screen with a click anywhere on the canvas. Escape, or another
 * tool, puts it away. A click where nothing can take the item says why and keeps the tool on. The canvas sees none of
 * these presses (capture on window, stopped).
 */

const NOTHING: DropContext = { hosts: [], frame: undefined, parentHost: null, origin: null, layerSrc: null, copy: false };

/** An item placed where the pointer's insertion line is, or (`run`: the Screen tool) an action a click anywhere on the
 *  canvas takes. */
type Placing = { label: string; item: Insertable | null; run: (() => void) | null; target: DropTarget | null; refusal: string | null };
let placing: Placing | null = null;

/** The pointer is on the canvas itself: inside its box and not on the chrome floating over it (the toolbar, the side
 *  panels, their menus and tooltips), which keeps its own clicks, so another tool can be picked while this one is on. */
const onCanvas = (event: PointerEvent) => {
  const box = getViewportBox();
  const { clientX: x, clientY: y } = event;
  if (x < box.left || x > box.left + box.width || y < box.top || y > box.top + box.height) return false;
  return !(event.target instanceof Element && event.target.closest(".studio-chrome, .studio-chrome-portal"));
};

function onMove(event: PointerEvent) {
  const current = placing;
  if (!current) return;
  const pointer = { x: event.clientX, y: event.clientY };
  if (!onCanvas(event)) {
    current.target = null;
    publishDragView(null);
    return;
  }
  if (current.run) {
    publishDragView({ line: null, into: null, pointer, label: current.label, tone: "info" });
    return;
  }
  const { target, reason } = dropTargetAt(pointer.x, pointer.y, NOTHING);
  current.target = target;
  current.refusal = reason ?? (target ? refusalFor(target) : null);
  publishDragView({
    line: target && !current.refusal ? target.line : null,
    into: target ? target.into : null,
    pointer,
    label: current.refusal ?? current.label,
    tone: current.refusal ? "negative" : "info",
  });
}

/** The press is the placement's own: the canvas neither selects nor starts a marquee under it. */
function onDown(event: PointerEvent) {
  if (!placing || event.button !== 0 || !onCanvas(event)) return;
  event.preventDefault();
  event.stopPropagation();
}

function onUp(event: PointerEvent) {
  const current = placing;
  if (!current || event.button !== 0 || !onCanvas(event)) return;
  event.preventDefault();
  event.stopPropagation();
  // The click that follows this release is the placement's too.
  const swallow = (click: MouseEvent) => { click.stopPropagation(); click.preventDefault(); };
  window.addEventListener("click", swallow, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
  if (current.run) {
    const { run } = current;
    studioStore.setState({ tool: "select" });
    run();
    return;
  }
  if (!current.item || !current.target || current.refusal) {
    announceEditStatus({ kind: "error", message: current.refusal ?? `Point inside a layout to place the ${current.label}`, at: Date.now() });
    return;
  }
  const { item, target } = current;
  studioStore.setState({ tool: "select" });
  void dropAsset(item, target);
}

function onKey(event: KeyboardEvent) {
  if (!placing || event.key !== "Escape") return;
  event.preventDefault();
  event.stopImmediatePropagation();
  studioStore.setState({ tool: "select" });
}

/**
 * Turns a placement tool on: `item` lands where the insertion line shows, or `run` runs on a click anywhere on the canvas
 * (the Screen tool). False, with the reason said, when the Studio cannot edit.
 */
export function armPlacement(tool: { label: string; item: Insertable } | { label: string; run: () => void }): boolean {
  disarmPlacement();
  if (!canEdit()) {
    announceEditStatus({ kind: "error", message: "View only", at: Date.now() });
    return false;
  }
  placing = { label: tool.label, item: "item" in tool ? tool.item : null, run: "run" in tool ? tool.run : null, target: null, refusal: null };
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerdown", onDown, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("keydown", onKey, true);
  const viewport = canvasApi.getViewportElement();
  viewport?.setAttribute("data-studio-placing", "");
  viewport?.setAttribute("data-studio-dragging", "");
  return true;
}

/** Puts placing away (another tool, or done). */
export function disarmPlacement() {
  if (!placing) return;
  placing = null;
  window.removeEventListener("pointermove", onMove, true);
  window.removeEventListener("pointerdown", onDown, true);
  window.removeEventListener("pointerup", onUp, true);
  window.removeEventListener("keydown", onKey, true);
  const viewport = canvasApi.getViewportElement();
  viewport?.removeAttribute("data-studio-placing");
  viewport?.removeAttribute("data-studio-dragging");
  publishDragView(null);
}
