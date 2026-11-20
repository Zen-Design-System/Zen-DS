import { typographyStyles } from "../../../tokens/typography.generated";
import { ellipsePath, pointsPath, polygonPoints, starPoints } from "../../../components/Shape/geometry";
import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../api";
import { snapBox, SNAP_PX, type FrameBox, type SnapGuide } from "../builder/render/framePlace";
import { canvasApi, getViewport, getViewportBox, getSafeBox, panBy } from "../canvas/viewport";
import type { DropTarget } from "../edit/arrange";
import { refusalFor } from "../edit/assets/assets";
import { dropTargetAt, isDropContainer, type DropContext } from "../edit/drag";
import { barBoxesIn, layerHolderOf, layerKidsOf } from "../edit/freeBlock";
import { multiSelection } from "../select/multiSelection";
import { annotatedAt, childHits, frameOf, panelOf, parentHit, type FiberHit } from "../select/picker";
import { expectRender, renderedNow } from "../select/remap";
import { canStructurallyEdit } from "../slots/actions";
import { canEdit, flushStudioStore, studioStore } from "../store";
import type { EditOp, StudioSelection } from "../types";
import { CLICK_TRAVEL, clickBox, drawBox, drawCode, drawLabels, drawLine, isLineKind, lineBox, pictureBox, pictureCode, pictureDragBox, type Box, type DrawKind, type DrawPlacement, type PlacedPicture, type Point } from "./drawModel";
import { dropPictures, nextPicture, picturesLeft, placingHint, tookPicture } from "./placeImage";
import { editNewText, editTextAt } from "../edit/textCreate";
import { holdKeysForText } from "../edit/textEdit";
import { addLooseLayers, looseLayerLoc } from "../builder/looseLayer";
import "./draw.css";

/*
 * The canvas half of Figma's drawing tools (model: drawModel.ts). A press on a Screen of a page you made starts a draw:
 * the frame under the start point is the parent (a Screen or a Box: Figma's frame without auto layout, the layer sits at
 * its X / Y in px; a Stack, Grid, Card…: auto layout, the layer joins the flow where the insertion line shows). The
 * shape follows the pointer (⇧ equal sides / 45° lines, ⌥ from the centre, Space held moves it, ⌘ held: no snapping),
 * its size under it; Esc cancels. Release writes it (one edit, one ⌘Z), selects it, and the tool goes back to Move.
 * A press on the empty canvas of a page you made draws a layer on the canvas there, outside any frame (Figma's; a
 * <Layer> of the Board, builder/looseLayer.ts; user 2026-11-20, loose layers PR3), its corner snapping to the frames'
 * edges. Elsewhere (a component page's board) a press says where to draw and keeps the tool (the Frame tool draws a
 * Screen on the empty canvas instead: builder/frameMove.ts).
 */

/** The largest a picture is placed on the canvas (a frame's largest side, dialect FRAME_SIZE). */
const FRAME_LIMIT = 4096;
const NOTHING: DropContext = { hosts: [], frame: undefined, parentHost: null, origin: null, layerSrc: null, copy: false };
const CHROME = ".studio-chrome, .studio-chrome-portal";
const EDGE = 32;
/** Props a Box that only floats one layer has (position/float.ts): such a Box is a layer's wrapper, not a frame. */
const FLOAT_PROPS = new Set(["position", "constraintX", "constraintY", "insetTop", "insetRight", "insetBottom", "insetLeft", "children", "key"]);

export type DrawTarget = {
  /** `board`: the empty canvas of a page you made: the layer goes on the canvas (no parent; `host` the board's frames). */
  mode: "free" | "flow" | "board";
  /** The frame the layer goes into (none on the canvas). */
  parent: FiberHit | null;
  /** Its first DOM node: a free layer's X / Y count from its padding box. */
  host: HTMLElement;
  frameId: string | null;
  panelId: string | null;
  /** Flow: where among the frame's layers (the insertion line's place). */
  flow: DropTarget | null;
};

const nameOfHit = (hit: FiberHit) => hit.name.slice(hit.name.lastIndexOf(".") + 1);

/** A Box with nothing but position props around one layer (Ignore auto layout's wrapper): not a frame to draw into. */
function floatsOneLayer(hit: FiberHit): boolean {
  if (hit.props.position !== "absolute") return false;
  const own = Object.keys(hit.props).filter((key) => !key.startsWith("data-") && !FLOAT_PROPS.has(key));
  return own.length === 0 && childHits(hit).length === 1;
}

/** The board's frames of a page you made (where its frames and layers on the canvas sit, in board px). */
const BOARD = ".studio-builder-board__frames";

/**
 * The empty canvas of a page you made at (x, y) (a Section's area too, or a layer on the canvas that takes no layer):
 * a draw there makes a layer on the canvas. Null elsewhere (a frame, a component page's board, outside the canvas).
 */
function boardAt(x: number, y: number): DrawTarget | null {
  const state = studioStore.getState();
  const world = canvasApi.getWorldElement();
  const board = document.querySelector<HTMLElement>(BOARD);
  if (!state.localPage || !canEdit(state) || !world || !board) return null;
  for (const element of document.elementsFromPoint(x, y)) {
    if (!world.contains(element) || element.closest(".studio-draw")) continue;
    if (element.closest("[data-studio-frame]:not([data-kind='section'], [data-kind='layer'])")) return null;
  }
  return { mode: "board", parent: null, host: board, frameId: null, panelId: null, flow: null };
}

/** The frame a draw starting at (x, y) goes into, the empty canvas (`board`), a reason it cannot, or null. */
export function targetAt(x: number, y: number): DrawTarget | string | null {
  return frameTargetAt(x, y) ?? boardAt(x, y);
}

function frameTargetAt(x: number, y: number): DrawTarget | string | null {
  const world = canvasApi.getWorldElement();
  let hit: FiberHit | null = null;
  for (const element of document.elementsFromPoint(x, y)) {
    if (!world?.contains(element) || element === world || element.closest(".studio-draw")) continue;
    hit = annotatedAt(element);
    if (hit) break;
  }
  if (!hit) return null;
  const frame = hit.hosts[0]?.closest("[data-studio-frame]") ?? null;
  // A Screen, or a layer on the canvas that is a frame (a Box) or auto layout (a Stack): it takes the layer as a frame does.
  if (!frame || !/^(screen|layer):/.test(frame.getAttribute("data-studio-frame") ?? "")) return null;
  for (let step: FiberHit | null = hit; step; step = parentHit(step, frame)) {
    const name = nameOfHit(step);
    if (name === "Board") break;
    const free = name === "Screen" || (name === "Box" && !floatsOneLayer(step));
    if (!free && !isDropContainer(step)) continue;
    const host = step.hosts[0];
    if (!(host instanceof HTMLElement)) continue;
    const base = { parent: step, host, frameId: frameOf(host), panelId: panelOf(host) };
    if (free) {
      const check = canStructurallyEdit({ kind: "node", src: step.src, name: step.name, frameId: base.frameId, panelId: base.panelId, instance: 0 });
      return check.ok ? { mode: "free", ...base, flow: null } : check.reason;
    }
    const { target, reason } = dropTargetAt(x, y, NOTHING);
    if (!target) return reason ?? null;
    const refusal = refusalFor(target);
    return refusal ?? { mode: "flow", ...base, flow: target };
  }
  return null;
}

/** A point on the screen in the frame's own px (from its padding box's top-left, its scroll included). */
export function localOf(host: HTMLElement, client: Point): Point {
  const rect = host.getBoundingClientRect();
  const { zoom } = getViewport();
  return { x: (client.x - rect.left) / zoom - host.clientLeft + host.scrollLeft, y: (client.y - rect.top) / zoom - host.clientTop + host.scrollTop };
}
/** The frame's own px back on the screen, relative to the canvas viewport's top-left. */
export function screenOf(host: HTMLElement, local: Point): Point {
  const rect = host.getBoundingClientRect();
  const view = getViewportBox();
  const { zoom } = getViewport();
  return { x: rect.left - view.left + (local.x + host.clientLeft - host.scrollLeft) * zoom, y: rect.top - view.top + (local.y + host.clientTop - host.scrollTop) * zoom };
}

/**
 * The frame's box, its layers' boxes and a Screen's bars (status bar, Top / Bottom Navigation) in its own px: what a
 * drawn corner snaps to (Figma's smart guides). A Screen with bars holds its layers in its content box.
 */
export function snapTargets(host: HTMLElement): FrameBox[] {
  // The empty canvas: the frames and layers on it (Figma's smart guides between top-level layers), not the board's edges.
  if (host.matches(BOARD)) return Array.from(host.children).flatMap((child) => (child instanceof HTMLElement && child.dataset.studioFrame ? [{ x: child.offsetLeft, y: child.offsetTop, width: child.offsetWidth, height: child.offsetHeight }] : []));
  const own: FrameBox = { x: 0, y: 0, width: host.clientWidth, height: host.clientHeight };
  const { zoom } = getViewport();
  const origin = host.getBoundingClientRect();
  const children = layerKidsOf(layerHolderOf(host)).map((child) => {
    const rect = child.getBoundingClientRect();
    return { x: (rect.left - origin.left) / zoom - host.clientLeft, y: (rect.top - origin.top) / zoom - host.clientTop, width: rect.width / zoom, height: rect.height / zoom };
  });
  return [own, ...children.filter((box) => box.width > 0 || box.height > 0), ...barBoxesIn(host)];
}

/** The live shape in screen space: its outline as Figma draws the node while you drag, its size under it, guides. */
class Ghost {
  readonly root = document.createElement("div");
  private readonly svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  private readonly path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  private readonly size = document.createElement("div");
  private guides: HTMLElement[] = [];

  constructor(private readonly kind: DrawKind) {
    this.root.className = "studio-draw";
    this.root.dataset.kind = kind;
    this.root.setAttribute("aria-hidden", "true");
    this.svg.setAttribute("class", "studio-draw__shape");
    this.svg.append(this.path);
    this.size.className = `studio-draw__size ${typographyStyles["Caption/Medium"]}`;
    this.root.append(this.svg, this.size);
    canvasApi.getViewportElement()?.append(this.root);
  }

  /** `host` frame px → screen. Box: the drawn box; ends: a line's two ends; guides in the frame's px. */
  draw(host: HTMLElement, box: Box, ends: { from: Point; to: Point } | null, guides: readonly SnapGuide[]) {
    const { zoom } = getViewport();
    const corner = screenOf(host, { x: box.x, y: box.y });
    const width = box.width * zoom;
    const height = box.height * zoom;
    let d = "";
    if (ends) {
      const a = screenOf(host, ends.from);
      const b = screenOf(host, ends.to);
      d = `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
      if (this.kind === "arrow") {
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const head = 10;
        const wing = (turn: number) => `L ${b.x - head * Math.cos(angle + turn)} ${b.y - head * Math.sin(angle + turn)}`;
        d += ` M ${b.x} ${b.y} ${wing(0.6)} M ${b.x} ${b.y} ${wing(-0.6)}`;
      }
    } else if (this.kind === "ellipse") d = translate(ellipsePath(width, height), corner);
    else if (this.kind === "polygon") d = translate(pointsPath(polygonPoints(width, height, 3)), corner);
    else if (this.kind === "star") d = translate(pointsPath(starPoints(width, height, 5)), corner);
    else d = `M ${corner.x} ${corner.y} h ${width} v ${height} h ${-width} Z`;
    this.path.setAttribute("d", d);
    // The size under the shape (a line: its length, under its lower end's middle).
    const tag = ends ? screenOf(host, { x: (ends.from.x + ends.to.x) / 2, y: Math.max(ends.from.y, ends.to.y) }) : { x: corner.x + width / 2, y: corner.y + height };
    this.size.textContent = ends ? `${Math.round(box.width)}` : `${Math.round(box.width)} × ${Math.round(box.height)}`;
    this.size.style.transform = `translate(${tag.x}px, ${tag.y}px)`;
    while (this.guides.length < guides.length) {
      const line = document.createElement("div");
      line.className = "studio-draw__guide";
      this.root.append(line);
      this.guides.push(line);
    }
    this.guides.forEach((line, index) => {
      const guide = guides[index];
      line.hidden = !guide;
      if (!guide) return;
      const from = guide.axis === "x" ? screenOf(host, { x: guide.at, y: guide.from }) : screenOf(host, { x: guide.from, y: guide.at });
      const length = (guide.to - guide.from) * zoom;
      Object.assign(line.style, guide.axis === "x"
        ? { transform: `translate(${from.x}px, ${from.y}px)`, width: "1px", height: `${length}px` }
        : { transform: `translate(${from.x}px, ${from.y}px)`, width: `${length}px`, height: "1px" });
    });
  }

  remove() {
    this.root.remove();
  }
}

/** Moves every coordinate pair of an SVG path (absolute commands, as geometry.ts writes them) by `by`. */
function translate(d: string, by: Point): string {
  return d.replace(/([ML]) (-?[\d.]+) (-?[\d.]+)/g, (_, cmd: string, x: string, y: string) => `${cmd} ${Number(x) + by.x} ${Number(y) + by.y}`)
    .replace(/A (-?[\d.]+) (-?[\d.]+) (\d) (\d) (\d) (-?[\d.]+) (-?[\d.]+)/g, (_, rx: string, ry: string, rot: string, large: string, sweep: string, x: string, y: string) => `A ${rx} ${ry} ${rot} ${large} ${sweep} ${Number(x) + by.x} ${Number(y) + by.y}`);
}

/** Pans the canvas while the pointer stays near the visible canvas's edges (as a frame draw does). */
function edgePan(pointer: () => Point, follow: () => void) {
  let frame = 0;
  const tick = () => {
    const client = getViewportBox();
    const safe = getSafeBox();
    const box = { left: client.left + safe.x, top: client.top + safe.y, right: client.left + safe.x + safe.width, bottom: client.top + safe.y + safe.height };
    const { x, y } = pointer();
    const speed = (distance: number) => (distance < EDGE ? Math.ceil((EDGE - Math.max(distance, 0)) / 3) : 0);
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

const fail = (message: string) => announceEditStatus({ kind: "error", message, at: Date.now() });

/** What a draw is called in History. */
const labelOf = (kind: DrawKind) => (kind === "text" ? "Add text" : kind === "image" ? "Place image" : `Draw ${drawLabels[kind].toLowerCase()}`);

/**
 * Writes what was drawn into `target` (one edit, labelled "Draw <shape>") and selects it. On the empty canvas
 * (`board`), `place` is where it goes: a layer on the canvas there.
 */
async function write(kind: DrawKind, target: DrawTarget, code: string, keys?: ReturnType<typeof holdKeysForText>, place?: Point) {
  if (target.mode === "board" || !target.parent) { await writeOnCanvas(kind, code, place ?? { x: 0, y: 0 }, keys); return; }
  const from = target.flow ? target.flow.parentSrc : target.parent.src;
  const at = parseSrc(from);
  if (!at) return;
  const parent = await studioApi.element(at.file, at.loc);
  if (!parent) { fail(`${nameOfHit(target.parent)} is no longer there`); return; }
  const op: Extract<EditOp, { op: "pasteCode" }> = { op: "pasteCode", code };
  if (target.flow?.before) op.before = parseSrc(target.flow.before)?.loc;
  else if (target.flow?.after) op.after = parseSrc(target.flow.after)?.loc;
  const before = renderedNow(canvasApi.getWorldElement());
  const response = await applyEdit({ file: at.file, loc: at.loc, name: parent.name, ops: [op], hash: parent.hash }, labelOf(kind));
  if (!response.ok || !response.inserted) return;
  const frameId = target.flow?.frameId ?? target.frameId;
  const panelId = target.flow?.panelId ?? target.panelId;
  // The Text tool: the new Text is edited at once (edit/textCreate.ts).
  if (kind === "text") { void editNewText(response.file, response.inserted.loc, target.mode === "free", { frameId, panelId }, before, keys); return; }
  const next: StudioSelection = { kind: "node", src: `${response.file}:${response.inserted.loc}`, name: kind === "frame" ? "Box" : "Shape", frameId, panelId, instance: 0 };
  multiSelection.clear();
  expectRender(next, before, () => undefined, 1500);
  studioStore.setState({ selection: next });
  flushStudioStore();
}

/** What was drawn on the empty canvas, a layer on the canvas at `place` (board px): selected, a Text edited at once. */
async function writeOnCanvas(kind: DrawKind, code: string, place: Point, keys?: ReturnType<typeof holdKeysForText>) {
  const { localPage } = studioStore.getState();
  if (!localPage) return;
  const before = renderedNow(canvasApi.getWorldElement());
  const [frameId] = (await addLooseLayers(localPage, [{ place, content: code }], labelOf(kind), undefined, { select: kind !== "text" })) ?? [];
  if (!frameId || kind !== "text") return;
  const layer = await looseLayerLoc(localPage, frameId);
  if (layer) void editNewText(layer.file, layer.loc, true, { frameId, panelId: null }, before, keys);
}

let armed: { kind: DrawKind; stop: () => void } | null = null;

/** Puts the drawing tool away (another tool, another page). */
export function disarmDraw() {
  armed?.stop();
  armed = null;
}

/**
 * Arms a drawing tool: `kind` a shape (Rectangle, Ellipse, Line, Arrow, Polygon, Star), "text" (Figma's Text tool T: a
 * click for Auto width text, a drag for a text box of that width, then typing; F6) or "frame" (a frame drawn inside a
 * Screen: builder/frameMove.ts hands the press over with `startDraw`). False, with the reason said, when the Studio
 * cannot edit.
 */
export function armDraw(kind: Exclude<DrawKind, "frame">): boolean {
  disarmDraw();
  if (!canEdit()) {
    fail("View only");
    return false;
  }
  const viewport = canvasApi.getViewportElement();
  viewport?.setAttribute("data-studio-placing", "");
  viewport?.setAttribute("data-studio-drawing", kind);
  const onDown = (event: PointerEvent) => {
    if (event.button !== 0 || !(event.target instanceof Element) || !viewport?.contains(event.target) || event.target.closest(CHROME)) return;
    event.preventDefault();
    event.stopPropagation();
    // The Text tool on the words of a text layer edits them there (Figma's), instead of making a new text.
    if (kind === "text" && editTextAt(event.clientX, event.clientY)) return;
    if (!startDraw(kind, event)) fail(kind === "text" ? "Type inside a frame · F draws a frame" : kind === "image" ? "Place it inside a frame · F draws a frame" : "Draw inside a frame · F draws a frame");
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    studioStore.setState({ tool: "select" });
  };
  window.addEventListener("pointerdown", onDown, true);
  window.addEventListener("keydown", onKey, true);
  armed = {
    kind,
    stop: () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
      // The pictures not placed are put away (they stay in Assets › Photos).
      if (kind === "image") dropPictures();
      viewport?.removeAttribute("data-studio-placing");
      viewport?.removeAttribute("data-studio-drawing");
    },
  };
  return true;
}

/**
 * Starts drawing `kind` from the press `event` when a Screen of a page you made is under it: true when the gesture is
 * taken (the release writes the layer), false when there is no frame there (the caller says why, or draws a Screen).
 * A frame there that cannot take a layer says why and takes the press.
 */
export function startDraw(kind: DrawKind, event: PointerEvent): boolean {
  const found = targetAt(event.clientX, event.clientY);
  // The Frame tool on the empty canvas draws a frame of the Board there (builder/frameMove.ts), not a layer on the canvas.
  if (found === null || (kind === "frame" && typeof found === "object" && found.mode === "board")) return false;
  if (typeof found === "string") { fail(found); return true; }
  const target = found;
  const { host } = target;
  // Place image: the picture waiting for this click (draw/placeImage.ts), sized to fit the frame.
  const picture = kind === "image" ? nextPicture() : null;
  if (kind === "image" && !picture) { studioStore.setState({ tool: "select" }); return true; }
  // A picture fits the frame it goes into; on the canvas it keeps its size (up to a frame's largest).
  const limit = target.mode === "board" ? { width: FRAME_LIMIT, height: FRAME_LIMIT } : { width: host.clientWidth, height: host.clientHeight };
  const clicked = (at: Point) => (picture ? pictureBox(picture, at, limit) : clickBox(kind, at));
  const startClient = { x: event.clientX, y: event.clientY };
  let start = localOf(host, startClient);
  let pointer = startClient;
  let keys = { shift: event.shiftKey, alt: event.altKey, mod: event.metaKey || event.ctrlKey };
  let dragged = false;
  let moving: Point | null = null;
  let box: Box = clicked(start);
  let ends: { from: Point; to: Point } | null = null;
  const others = target.mode === "free" || target.mode === "board" ? snapTargets(host) : [];
  const ghost = new Ghost(kind === "image" ? "rectangle" : kind);
  ghost.root.hidden = true;

  const update = () => {
    const at = localOf(host, pointer);
    if (moving) {
      // Space held: what is drawn moves with the pointer (Figma); the start point travels with it.
      start = { x: start.x + at.x - moving.x, y: start.y + at.y - moving.y };
      moving = at;
    }
    let guides: SnapGuide[] = [];
    if (isLineKind(kind)) {
      ends = drawLine(start, at, keys);
      box = lineBox(ends.from, ends.to).box;
    } else {
      box = picture ? pictureDragBox(start, at, picture, keys) : drawBox(start, at, keys);
      if (!picture && !keys.mod && !keys.shift && !keys.alt && others.length) {
        // The corner under the pointer snaps to the frame's and its layers' edges and centres.
        const dx = at.x - start.x;
        const dy = at.y - start.y;
        const snap = snapBox(box, others, SNAP_PX / getViewport().zoom, { x: [dx < 0 ? 0 : 2], y: [dy < 0 ? 0 : 2] });
        if (dx < 0) { box.x += snap.dx; box.width -= snap.dx; } else box.width += snap.dx;
        if (dy < 0) { box.y += snap.dy; box.height -= snap.dy; } else box.height += snap.dy;
        guides = snap.guides;
      }
    }
    ghost.root.hidden = false;
    ghost.draw(host, box, ends, guides);
  };

  const onMove = (move: PointerEvent) => {
    pointer = { x: move.clientX, y: move.clientY };
    keys = { shift: move.shiftKey, alt: move.altKey, mod: move.metaKey || move.ctrlKey };
    if (!dragged && Math.hypot(pointer.x - startClient.x, pointer.y - startClient.y) < CLICK_TRAVEL) return;
    if (!dragged) {
      dragged = true;
      stopPan = edgePan(() => pointer, update);
      offCanvas = canvasApi.onChange(update);
    }
    update();
  };
  const onUp = (up: PointerEvent) => {
    if (up.button !== 0) return;
    up.preventDefault();
    up.stopPropagation();
    finish();
    const swallow = (click: MouseEvent) => { click.stopPropagation(); click.preventDefault(); };
    window.addEventListener("click", swallow, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
    // Place image: the next picture waits for its click (Figma places several one by one); the last one ends the tool.
    if (picture) tookPicture();
    if (picture && picturesLeft()) announceEditStatus({ kind: "unchanged", message: placingHint(), at: Date.now() });
    else studioStore.setState({ tool: "select" });
    let rotation = 0;
    let drawn = box;
    if (!dragged) drawn = clicked(start);
    else if (isLineKind(kind) && ends) ({ box: drawn, rotation } = lineBox(ends.from, ends.to));
    if (!isLineKind(kind) && kind !== "text" && (drawn.width < 1 || drawn.height < 1)) drawn = { ...drawn, width: Math.max(1, drawn.width), height: Math.max(1, drawn.height) };
    // On the canvas the layer is in no frame's flow: its Layer takes its place (`board`).
    const placement: DrawPlacement = target.mode === "free" ? { mode: "free", x: drawn.x, y: drawn.y } : { mode: "flow" };
    // The Text tool: what is typed from now on goes into the new text (Figma's typing at once).
    const keys = kind === "text" ? holdKeysForText() : undefined;
    void write(kind, target, picture ? pictureCode(picture, drawn, placement) : drawCode(kind, drawn, placement, rotation), keys, { x: drawn.x, y: drawn.y });
  };
  const onKey = (key: KeyboardEvent) => {
    if (key.key === "Escape" && key.type === "keydown") {
      key.preventDefault();
      key.stopImmediatePropagation();
      finish();
      return;
    }
    if (key.code === "Space") {
      // Space moves the shape while it is drawn, instead of panning the canvas.
      key.preventDefault();
      key.stopImmediatePropagation();
      moving = key.type === "keydown" ? (moving ?? localOf(host, pointer)) : null;
      return;
    }
    if (!["Alt", "Shift", "Meta", "Control"].includes(key.key)) return;
    keys = { shift: key.shiftKey, alt: key.altKey, mod: key.metaKey || key.ctrlKey };
    if (dragged) update();
  };
  let stopPan = () => {};
  let offCanvas = () => {};
  const cancel = () => finish();
  const finish = () => {
    stopPan();
    offCanvas();
    ghost.remove();
    window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerup", onUp, true);
    window.removeEventListener("pointercancel", cancel, true);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("keyup", onKey, true);
    window.removeEventListener("blur", cancel);
  };
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", cancel, true);
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("keyup", onKey, true);
  window.addEventListener("blur", cancel);
  return true;
}

/**
 * Places `picture` at a point on the screen at once (a file dropped there, or pasted: `center` puts its middle at the
 * point), in the frame there as a click of the Image tool would: true when a frame took it (or said why not).
 */
export async function placePictureAt(picture: PlacedPicture, client: Point, center = false): Promise<boolean> {
  const found = targetAt(client.x, client.y);
  if (found === null) return false;
  if (typeof found === "string") { fail(found); return true; }
  const limit = found.mode === "board" ? { width: FRAME_LIMIT, height: FRAME_LIMIT } : { width: found.host.clientWidth, height: found.host.clientHeight };
  const box = pictureBox(picture, localOf(found.host, client), limit, center);
  const placement: DrawPlacement = found.mode === "free" ? { mode: "free", x: box.x, y: box.y } : { mode: "flow" };
  await write("image", found, pictureCode(picture, box, placement), undefined, { x: box.x, y: box.y });
  return true;
}
