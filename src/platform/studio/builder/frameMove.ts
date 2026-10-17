import { typographyStyles } from "../../../tokens/typography.generated";
import { announceEditStatus } from "../api";
import { notifyFramesMoved } from "../board/frames";
import { canvasApi, getSafeBox, getViewport, getViewportBox, notifyCanvas, panBy } from "../canvas/viewport";
import { canEdit, studioStore } from "../store";
import { startDraw } from "../draw/drawTool";
import { addFrame } from "./proto/addFrame";
import { copyFrame, moveFrames } from "./frameEdit";
import { snapBox, SNAP_PX, type FrameBox, type FramePlace, type SnapGuide } from "./render/framePlace";

/*
 * Free frames on a builder page, Figma-like (user, 2026-10-15: "canvas tự do hơn… vẽ frame, kéo frame đi mọi nơi", "cho
 * phép copy", "bấm option và hold kéo để duplicate frame"):
 * - Move: a drag on a frame's name label, or on a selected frame, moves it anywhere (3 px before it starts). It snaps to
 *   the other frames' edges and centres with red guides (⌘ / Ctrl held: no snapping); ⇧ keeps one axis; Esc puts it back.
 * - ⌥ (Option / Alt) held while dragging leaves the frame where it is and drops a copy there (pressed or released
 *   mid-drag, it switches as in Figma).
 * - Draw: the Frame tool (CanvasTools): drag a box on the canvas for a Screen of that size (⇧ square, ⌥ from the
 *   centre), or click for a Screen on the page's device at that point.
 * One edit per gesture (frameEdit.ts), so one ⌘Z takes it back. The live place shows by left / top on the frame element
 * until the page renders it (BuilderBoard reads livePlace).
 */

const THRESHOLD = 3;
/** Screen px from the visible canvas's edges where a drag pans the canvas. */
const EDGE = 32;
const FRAMES = ".studio-builder-board__frames";

type Point = { x: number; y: number };
type Keys = { shift: boolean; alt: boolean; mod: boolean };

/** Places shown while a frame is dragged or written (frame id → place in the board's frame px). */
const live = new Map<string, FramePlace>();
export const livePlace = (frameId: string) => live.get(frameId);
/** Shows `place` for the frame now (a nudge), until the page has it. */
export function showLivePlace(frameId: string, element: HTMLElement, place: FramePlace) {
  live.set(frameId, place);
  element.style.left = `${place.x}px`;
  element.style.top = `${place.y}px`;
  notifyFramesMoved();
  notifyCanvas();
}
/** The write was refused: the frame goes back to `place`, where the page still has it. */
export function dropLivePlace(frameId: string, element: HTMLElement, place: FramePlace) {
  live.delete(frameId);
  element.style.left = `${place.x}px`;
  element.style.top = `${place.y}px`;
  notifyFramesMoved();
  notifyCanvas();
}
/** BuilderBoard: the page now shows `place` for the frame, so the live place has done its job. */
export function settleLivePlace(frameId: string, place: FramePlace) {
  const shown = live.get(frameId);
  if (shown && Math.round(shown.x) === Math.round(place.x) && Math.round(shown.y) === Math.round(place.y)) live.delete(frameId);
}

function toWorld(point: Point): Point {
  const box = getViewportBox();
  const { x, y, zoom } = getViewport();
  return { x: (point.x - box.left - x) / zoom, y: (point.y - box.top - y) / zoom };
}

/** The board's frame origin in world px (the box free frames are placed in). */
function originOf(container: HTMLElement): Point {
  let x = 0;
  let y = 0;
  const world = canvasApi.getWorldElement();
  for (let node: HTMLElement | null = container; node && node !== world; node = node.offsetParent as HTMLElement | null) {
    x += node.offsetLeft;
    y += node.offsetTop;
  }
  return { x, y };
}

const framesIn = (container: HTMLElement) => Array.from(container.children).filter((child): child is HTMLElement => child instanceof HTMLElement && Boolean(child.dataset.studioFrame));
const boxOf = (element: HTMLElement): FrameBox => ({ x: element.offsetLeft, y: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight });
const keysOf = (event: { shiftKey: boolean; altKey: boolean; metaKey: boolean; ctrlKey: boolean }): Keys => ({ shift: event.shiftKey, alt: event.altKey, mod: event.metaKey || event.ctrlKey });

/** The screen-space layer of a gesture: snap guides, the ghost of a copy or a drawn frame, and its size tag. */
class Overlay {
  readonly root = document.createElement("div");
  private readonly ghost = document.createElement("div");
  private readonly size = document.createElement("div");
  private guides: HTMLElement[] = [];

  constructor() {
    this.root.className = "studio-frame-move";
    this.root.setAttribute("aria-hidden", "true");
    this.ghost.className = "studio-frame-move__ghost";
    this.size.className = `studio-frame-move__size ${typographyStyles["Caption/Medium"]}`;
    this.root.append(this.ghost, this.size);
    canvasApi.getViewportElement()?.append(this.root);
  }

  /** Boxes and guides in the board's frame px, drawn at `origin` (world px) with the current zoom and pan. */
  draw(origin: Point, { ghost, guides, size }: { ghost: FrameBox | null; guides: readonly SnapGuide[]; size: FrameBox | null }) {
    const { x, y, zoom } = getViewport();
    const screen = (worldX: number, worldY: number) => ({ left: (origin.x + worldX) * zoom + x, top: (origin.y + worldY) * zoom + y });
    this.ghost.hidden = !ghost;
    if (ghost) {
      const at = screen(ghost.x, ghost.y);
      Object.assign(this.ghost.style, { transform: `translate(${at.left}px, ${at.top}px)`, width: `${ghost.width * zoom}px`, height: `${ghost.height * zoom}px` });
    }
    this.size.hidden = !size;
    if (size) {
      const at = screen(size.x + size.width / 2, size.y + size.height);
      this.size.textContent = `${Math.round(size.width)} × ${Math.round(size.height)}`;
      this.size.style.transform = `translate(${at.left}px, ${at.top}px)`;
    }
    while (this.guides.length < guides.length) {
      const line = document.createElement("div");
      line.className = "studio-frame-move__guide";
      this.root.append(line);
      this.guides.push(line);
    }
    this.guides.forEach((line, index) => {
      const guide = guides[index];
      line.hidden = !guide;
      if (!guide) return;
      const from = guide.axis === "x" ? screen(guide.at, guide.from) : screen(guide.from, guide.at);
      const length = (guide.to - guide.from) * zoom;
      Object.assign(line.style, guide.axis === "x"
        ? { transform: `translate(${from.left}px, ${from.top}px)`, width: "1px", height: `${length}px` }
        : { transform: `translate(${from.left}px, ${from.top}px)`, width: `${length}px`, height: "1px" });
    });
  }

  remove() {
    this.root.remove();
  }
}

/** Swallows the click a drag's release would send (the label's own click selects; this gesture already did). */
function swallowClick() {
  const swallow = (click: MouseEvent) => { click.stopPropagation(); click.preventDefault(); };
  window.addEventListener("click", swallow, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
}

/** Pans the canvas while the pointer stays near the visible canvas's edges, calling `follow` after each step. */
function edgePan(pointer: () => Point, follow: () => void) {
  let frame = 0;
  const tick = () => {
    const client = getViewportBox();
    const safe = getSafeBox();
    const box = { left: client.left + safe.x, top: client.top + safe.y, right: client.left + safe.x + safe.width, bottom: client.top + safe.y + safe.height };
    const { x, y } = pointer();
    const speed = (distance: number) => (distance < EDGE ? Math.ceil((EDGE - Math.max(distance, 0)) / 3) : 0);
    // panBy moves the camera: towards the edge the pointer is near.
    const dx = speed(x - box.left) ? -speed(x - box.left) : speed(box.right - x);
    const dy = speed(y - box.top) ? -speed(y - box.top) : speed(box.bottom - y);
    if (dx || dy) {
      panBy(dx, dy);
      follow();
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

/** Listens on the window for one gesture; returns the function that stops listening. */
function listen(handlers: { move: (event: PointerEvent) => void; up: (event: PointerEvent) => void; key: (event: KeyboardEvent) => void; cancel: () => void }) {
  const cancel = () => handlers.cancel();
  window.addEventListener("pointermove", handlers.move, true);
  window.addEventListener("pointerup", handlers.up, true);
  window.addEventListener("pointercancel", cancel, true);
  window.addEventListener("keydown", handlers.key, true);
  window.addEventListener("keyup", handlers.key, true);
  window.addEventListener("blur", cancel);
  return () => {
    window.removeEventListener("pointermove", handlers.move, true);
    window.removeEventListener("pointerup", handlers.up, true);
    window.removeEventListener("pointercancel", cancel, true);
    window.removeEventListener("keydown", handlers.key, true);
    window.removeEventListener("keyup", handlers.key, true);
    window.removeEventListener("blur", cancel);
  };
}

/** The builder frame `frameId` and its board, when it can move: a page you made, the Select tool, an admin. */
function movable(frameId: string) {
  const state = studioStore.getState();
  if (!state.localPage || state.tool !== "select" || state.presenting || !canEdit(state)) return null;
  const element = document.querySelector<HTMLElement>(`${FRAMES} > [data-studio-frame="${CSS.escape(frameId)}"]`);
  const container = element?.parentElement;
  return element && container ? { localPage: state.localPage, element, container } : null;
}

/**
 * A press that may move (or, with ⌥, copy) the frame `frameId`: true when it is a free frame and the gesture is taken.
 * `onClick` runs when the press ends without a drag (the caller's click: select the frame, start a marquee instead…).
 */
export function pressFrame(event: PointerEvent, frameId: string, onClick?: () => void): boolean {
  if (event.button !== 0) return false;
  const found = movable(frameId);
  if (!found) return false;
  const { localPage, element, container } = found;
  const viewport = canvasApi.getViewportElement();
  const startClient = { x: event.clientX, y: event.clientY };
  const startWorld = toWorld(startClient);
  const start = { x: element.offsetLeft, y: element.offsetTop };
  const size = { width: element.offsetWidth, height: element.offsetHeight };
  const siblings = framesIn(container).filter((other) => other !== element);
  const others = siblings.map(boxOf);
  const heights = new Map(framesIn(container).map((frame) => [frame.dataset.studioFrame ?? "", frame.offsetHeight]));
  let pointer = startClient;
  let keys = keysOf(event);
  let dragging = false;
  let target: FramePlace = start;
  let copy = false;
  let overlay: Overlay | null = null;
  let origin = originOf(container);
  let stopPan = () => {};
  let offCanvas = () => {};

  const show = (place: FramePlace) => {
    element.style.left = `${place.x}px`;
    element.style.top = `${place.y}px`;
    notifyFramesMoved();
    notifyCanvas();
  };
  // show() tells the canvas, whose change listeners include this update (a pan or zoom mid-drag): never re-entered.
  let updating = false;
  const update = () => {
    if (updating) return;
    updating = true;
    try { place(); } finally { updating = false; }
  };
  const place = () => {
    const world = toWorld(pointer);
    let dx = world.x - startWorld.x;
    let dy = world.y - startWorld.y;
    // ⇧ keeps the axis the drag went furthest along (Figma).
    const lock = keys.shift ? (Math.abs(dx) >= Math.abs(dy) ? "y" : "x") : null;
    if (lock === "y") dy = 0;
    if (lock === "x") dx = 0;
    const box = { x: start.x + dx, y: start.y + dy, ...size };
    let guides: SnapGuide[] = [];
    if (!keys.mod) {
      // A copy also lines up with the frame it copies (which stays).
      const snap = snapBox(box, keys.alt ? [...others, { ...start, ...size }] : others, SNAP_PX / getViewport().zoom);
      if (lock !== "x") box.x += snap.dx;
      if (lock !== "y") box.y += snap.dy;
      guides = snap.guides.filter((guide) => guide.axis !== lock);
    }
    target = { x: Math.round(box.x), y: Math.round(box.y) };
    copy = keys.alt;
    if (copy) {
      live.delete(frameId);
      show(start);
    } else {
      live.set(frameId, target);
      show(target);
    }
    overlay?.draw(origin, { ghost: copy ? { ...target, ...size } : null, guides, size: null });
  };
  const finish = () => {
    stop();
    stopPan();
    offCanvas();
    overlay?.remove();
    viewport?.removeAttribute("data-studio-dragging");
  };
  const cancel = () => {
    finish();
    if (dragging) dropLivePlace(frameId, element, start);
  };
  const stop = listen({
    move: (move) => {
      pointer = { x: move.clientX, y: move.clientY };
      keys = keysOf(move);
      if (!dragging) {
        if (Math.hypot(pointer.x - startClient.x, pointer.y - startClient.y) < THRESHOLD) return;
        dragging = true;
        // Figma selects what it moves.
        studioStore.setState({ selection: { kind: "frame", frameId } });
        overlay = new Overlay();
        viewport?.setAttribute("data-studio-dragging", "");
        origin = originOf(container);
        stopPan = edgePan(() => pointer, update);
        offCanvas = canvasApi.onChange(update);
      }
      move.preventDefault();
      update();
    },
    up: (up) => {
      if (up.button !== 0) return;
      finish();
      if (!dragging) { onClick?.(); return; }
      swallowClick();
      if (copy) {
        void copyFrame(localPage, frameId, target, { label: "Duplicate frame", heights });
        return;
      }
      if (target.x === start.x && target.y === start.y) { live.delete(frameId); return; }
      void moveFrames(localPage, new Map([[frameId, target]]), "Move frame").then((ok) => { if (!ok) dropLivePlace(frameId, element, start); });
    },
    key: (key) => {
      if (key.key === "Escape" && key.type === "keydown") {
        key.preventDefault();
        key.stopImmediatePropagation();
        cancel();
        return;
      }
      // ⌥, ⇧ and ⌘ change the gesture mid-drag (copy, one axis, no snapping).
      if (!dragging || !["Alt", "Shift", "Meta", "Control"].includes(key.key)) return;
      keys = keysOf(key);
      key.preventDefault();
      update();
    },
    cancel,
  });
  return true;
}

/* ── the Frame tool: draw a Screen ───────────────────────────────────────────────────────────────────────────── */

/** A drawn Screen's device: the narrowest whose layout its width reads as (a phone up to 600, a tablet up to 1024). */
const deviceFor = (width: number) => (width < 600 ? "phone" : width < 1024 ? "tablet" : "desktop");
const FRAME_MIN = 120;
const FRAME_MAX = 4096;
/** The chrome over the canvas (toolbar, side panels, their menus and tooltips) keeps its own presses (edit/place.ts). */
const CHROME = ".studio-chrome, .studio-chrome-portal";

let drawing: (() => void) | null = null;

/** Puts the Frame tool away (another tool, another page). */
export function disarmFrameDraw() {
  drawing?.();
  drawing = null;
}

/** Arms the Frame tool on the page `localPage`: a press on the canvas draws (or, a click, places) a Screen. */
export function armFrameDraw(localPage: string): boolean {
  disarmFrameDraw();
  if (!canEdit()) {
    announceEditStatus({ kind: "error", message: "View only — switch to Admin to edit", at: Date.now() });
    return false;
  }
  const viewport = canvasApi.getViewportElement();
  viewport?.setAttribute("data-studio-placing", "");
  const onDown = (event: PointerEvent) => {
    if (event.button !== 0 || !(event.target instanceof Element) || !viewport?.contains(event.target) || event.target.closest(CHROME)) return;
    const container = document.querySelector<HTMLElement>(FRAMES);
    if (!container) return;
    event.preventDefault();
    event.stopPropagation();
    // Inside a Screen the Frame tool draws a frame there (Figma's nested frame: draw/drawTool.ts); on the canvas, a Screen.
    if (startDraw("frame", event)) return;
    draw(event, container);
  };
  window.addEventListener("pointerdown", onDown, true);
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    studioStore.setState({ tool: "select" });
  };
  window.addEventListener("keydown", onKey, true);
  drawing = () => {
    window.removeEventListener("pointerdown", onDown, true);
    window.removeEventListener("keydown", onKey, true);
    viewport?.removeAttribute("data-studio-placing");
  };
  return true;

  function draw(event: PointerEvent, container: HTMLElement) {
    const origin = originOf(container);
    const startClient = { x: event.clientX, y: event.clientY };
    const world = toWorld(startClient);
    const start = { x: world.x - origin.x, y: world.y - origin.y };
    const others = framesIn(container).map(boxOf);
    const overlay = new Overlay();
    let pointer = startClient;
    let keys = keysOf(event);
    let dragged = false;
    let box: FrameBox = { ...start, width: 0, height: 0 };
    const update = () => {
      const at = toWorld(pointer);
      const corner = { x: at.x - origin.x, y: at.y - origin.y };
      let dx = corner.x - start.x;
      let dy = corner.y - start.y;
      // ⇧ draws a square.
      if (keys.shift) {
        const side = Math.max(Math.abs(dx), Math.abs(dy));
        dx = Math.sign(dx || 1) * side;
        dy = Math.sign(dy || 1) * side;
      }
      // ⌥ draws from the centre.
      const from = keys.alt ? { x: start.x - dx, y: start.y - dy } : start;
      box = { x: Math.min(from.x, start.x + dx), y: Math.min(from.y, start.y + dy), width: Math.abs(start.x + dx - from.x), height: Math.abs(start.y + dy - from.y) };
      let guides: SnapGuide[] = [];
      if (!keys.mod && !keys.shift && !keys.alt) {
        // The edges under the pointer snap to the other frames.
        const snap = snapBox(box, others, SNAP_PX / getViewport().zoom, { x: [dx < 0 ? 0 : 2], y: [dy < 0 ? 0 : 2] });
        if (dx < 0) { box.x += snap.dx; box.width -= snap.dx; } else box.width += snap.dx;
        if (dy < 0) { box.y += snap.dy; box.height -= snap.dy; } else box.height += snap.dy;
        guides = snap.guides;
      }
      box = { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
      overlay.draw(origin, { ghost: box, guides, size: box });
    };
    const finish = () => {
      stop();
      stopPan();
      offCanvas();
      overlay.remove();
    };
    let stopPan = () => {};
    let offCanvas = () => {};
    const stop = listen({
      move: (move) => {
        pointer = { x: move.clientX, y: move.clientY };
        keys = keysOf(move);
        if (!dragged && Math.hypot(pointer.x - startClient.x, pointer.y - startClient.y) < THRESHOLD) return;
        if (!dragged) {
          dragged = true;
          stopPan = edgePan(() => pointer, update);
          offCanvas = canvasApi.onChange(update);
        }
        update();
      },
      up: (up) => {
        if (up.button !== 0) return;
        up.preventDefault();
        up.stopPropagation();
        finish();
        swallowClick();
        studioStore.setState({ tool: "select" });
        if (!dragged) {
          // A click: a Screen on the page's device, its top-left at the point (Figma's click with the Frame tool).
          void addFrame(localPage, "screen", { place: { x: Math.round(start.x), y: Math.round(start.y) } });
          return;
        }
        const width = Math.min(FRAME_MAX, Math.max(FRAME_MIN, box.width));
        const height = Math.min(FRAME_MAX, Math.max(FRAME_MIN, box.height));
        void addFrame(localPage, "screen", { place: { x: box.x, y: box.y }, width, height, device: deviceFor(width) });
      },
      key: (key) => {
        if (key.key === "Escape" && key.type === "keydown") {
          key.preventDefault();
          key.stopImmediatePropagation();
          finish();
          return;
        }
        if (!dragged || !["Alt", "Shift", "Meta", "Control"].includes(key.key)) return;
        keys = keysOf(key);
        update();
      },
      cancel: finish,
    });
  }
}
