import { vectorBounds, vectorPathData, type PathCommand, type Point } from "../../../components/Shape/geometry";
import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../api";
import { canvasApi, getViewport } from "../canvas/viewport";
import { multiSelection } from "../select/multiSelection";
import { expectRender, renderedNow } from "../select/remap";
import { canEdit, flushStudioStore, studioStore } from "../store";
import type { EditOp, StudioSelection } from "../types";
import { localOf, screenOf, targetAt, type DrawTarget } from "./drawTool";
import { pencilCommands, penCommands, smoothPoint, snap45, vectorCode, vectorLayer, type PenPoint } from "./penModel";
import "./pen.css";

/*
 * Figma's Pen (P) and Pencil (⇧P) on the canvas (plan docs/research/studio-f9-vectors-spec-2026-10-19.md F9a; model:
 * penModel.ts). The first press picks the frame, as the shape tools do (drawTool.ts targetAt: a free frame takes the
 * vector at its X / Y, an auto layout frame in its flow).
 * - Pen: a click adds a corner, a press-drag a smooth point (⌥ breaks its handles, ⇧ 45° steps); a click on the first
 *   point closes the path; Enter or Esc ends an open one; ⌫ takes the last point back. The path writes one vector (one
 *   edit, one ⌘Z), selected, and the tool goes back to Move.
 * - Pencil: a drag draws; the release writes the stroke smoothed into curves (closed when it ends on its start). The
 *   Pencil stays on for the next stroke, as Figma's; Esc goes back to Move.
 */

const CHROME = ".studio-chrome, .studio-chrome-portal";
/** Screen px: a click this near the first point closes the path; a press that travels further is a drag. */
const CLOSE_PX = 8;
const DRAG_PX = 3;
const SVG = "http://www.w3.org/2000/svg";

const fail = (message: string) => announceEditStatus({ kind: "error", message, at: Date.now() });
const say = (message: string) => announceEditStatus({ kind: "unchanged", message, at: Date.now() });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** The path being drawn, in screen space over the canvas: its segments, the next one to the pointer, its points and handles. */
class PenOverlay {
  readonly root = document.createElement("div");
  private readonly svg = document.createElementNS(SVG, "svg");
  private readonly path = document.createElementNS(SVG, "path");
  private readonly next = document.createElementNS(SVG, "path");
  private readonly marks = document.createElementNS(SVG, "g");

  constructor(kind: "pen" | "pencil") {
    this.root.className = "studio-pen";
    this.root.dataset.kind = kind;
    this.root.setAttribute("aria-hidden", "true");
    this.svg.setAttribute("class", "studio-pen__svg");
    this.path.setAttribute("class", "studio-pen__path");
    this.next.setAttribute("class", "studio-pen__next");
    this.svg.append(this.path, this.next, this.marks);
    this.root.append(this.svg);
    canvasApi.getViewportElement()?.append(this.root);
  }

  private onScreen(host: HTMLElement, commands: readonly PathCommand[]) {
    return vectorPathData(commands.map((entry) => ({ command: entry.command, points: entry.points.map((point) => screenOf(host, point)) })));
  }

  /** The pen's path so far, the segment from its last point to `pointer`, and its points (the first one ringed to close). */
  pen(host: HTMLElement, points: readonly PenPoint[], pointer: Point | null, closing: boolean) {
    this.path.setAttribute("d", points.length ? this.onScreen(host, penCommands(points, false)) : "");
    const last = points[points.length - 1];
    this.next.setAttribute("d", last && pointer ? this.onScreen(host, last.out ? [{ command: "M", points: [last.at] }, { command: "C", points: [last.out, pointer, pointer] }] : [{ command: "M", points: [last.at] }, { command: "L", points: [pointer] }]) : "");
    this.marks.replaceChildren();
    points.forEach((point, index) => {
      for (const handle of [point.in, point.out]) {
        if (!handle) continue;
        const a = screenOf(host, point.at);
        const b = screenOf(host, handle);
        const line = document.createElementNS(SVG, "line");
        line.setAttribute("class", "studio-pen__handle");
        line.setAttribute("x1", String(a.x)); line.setAttribute("y1", String(a.y)); line.setAttribute("x2", String(b.x)); line.setAttribute("y2", String(b.y));
        const knob = document.createElementNS(SVG, "circle");
        knob.setAttribute("class", "studio-pen__knob");
        knob.setAttribute("cx", String(b.x)); knob.setAttribute("cy", String(b.y)); knob.setAttribute("r", "3");
        this.marks.append(line, knob);
      }
      const at = screenOf(host, point.at);
      const anchor = document.createElementNS(SVG, "rect");
      anchor.setAttribute("class", "studio-pen__point");
      if (index === 0 && closing) anchor.dataset.closing = "true";
      anchor.setAttribute("x", String(at.x - 3.5)); anchor.setAttribute("y", String(at.y - 3.5)); anchor.setAttribute("width", "7"); anchor.setAttribute("height", "7");
      this.marks.append(anchor);
    });
  }

  /** The pencil's trail as it is drawn. */
  pencil(host: HTMLElement, trail: readonly Point[]) {
    this.path.setAttribute("d", trail.length ? `M ${trail.map((point) => { const at = screenOf(host, point); return `${at.x} ${at.y}`; }).join(" L ")}` : "");
  }

  remove() {
    this.root.remove();
  }
}

/** Writes a drawn vector into its frame (one edit, "Draw vector") and selects it. */
async function writeVector(target: DrawTarget, code: string) {
  const from = target.flow ? target.flow.parentSrc : target.parent.src;
  const at = parseSrc(from);
  if (!at) return;
  const parent = await studioApi.element(at.file, at.loc);
  if (!parent) { fail("The frame is no longer there"); return; }
  const op: Extract<EditOp, { op: "pasteCode" }> = { op: "pasteCode", code };
  if (target.flow?.before) op.before = parseSrc(target.flow.before)?.loc;
  else if (target.flow?.after) op.after = parseSrc(target.flow.after)?.loc;
  const before = renderedNow(canvasApi.getWorldElement());
  const response = await applyEdit({ file: at.file, loc: at.loc, name: parent.name, ops: [op], hash: parent.hash }, "Draw vector");
  if (!response.ok || !response.inserted) return;
  const next: StudioSelection = { kind: "node", src: `${response.file}:${response.inserted.loc}`, name: "Shape", frameId: target.flow?.frameId ?? target.frameId, panelId: target.flow?.panelId ?? target.panelId, instance: 0 };
  multiSelection.clear();
  expectRender(next, before, () => undefined, 1500);
  studioStore.setState({ selection: next });
  flushStudioStore();
}

/** The code of `commands` drawn in `target`, or null when they draw nothing. */
function codeOf(commands: PathCommand[], target: DrawTarget): string | null {
  const layer = vectorLayer(commands, vectorBounds(commands));
  return layer && (layer.width > 0 || layer.height > 0) ? vectorCode(layer, vectorPathData(layer.commands), target.mode) : null;
}

let armed: { stop: () => void } | null = null;

/** Puts the Pen or Pencil away (another tool, another page). */
export function disarmPen() {
  armed?.stop();
  armed = null;
}

/** Arms the Pen (`pen`) or the Pencil (`pencil`); false, with the reason said, when the Studio cannot edit. */
export function armPen(kind: "pen" | "pencil"): boolean {
  disarmPen();
  if (!canEdit()) { fail("View only"); return false; }
  const viewport = canvasApi.getViewportElement();
  viewport?.setAttribute("data-studio-placing", "");
  viewport?.setAttribute("data-studio-drawing", kind);
  const overlay = new PenOverlay(kind);
  let target: DrawTarget | null = null;
  let points: PenPoint[] = [];
  let press: { client: Point; at: Point; dragged: boolean } | null = null;
  let pointer: Point | null = null;
  let trail: Point[] | null = null;

  const done = () => studioStore.setState({ tool: "select" });
  const redraw = () => {
    if (!target) return;
    const first = points[0];
    const closing = Boolean(first && points.length > 1 && pointer && distance(screenOf(target.host, first.at), screenOf(target.host, pointer)) <= CLOSE_PX);
    overlay.pen(target.host, points, press ? null : pointer, closing);
  };
  /** Ends the Pen's path: closed (back to its first point) or open; fewer than two points draw nothing. */
  const finish = (closed: boolean) => {
    const drawn = target && points.length > 1 ? codeOf(penCommands(points, closed), target) : null;
    const into = target;
    done();
    if (drawn && into) void writeVector(into, drawn);
  };
  const pick = (event: PointerEvent): boolean => {
    if (target) return true;
    const found = targetAt(event.clientX, event.clientY);
    if (found === null) { fail("Draw inside a frame · F draws a frame"); return false; }
    if (typeof found === "string") { fail(found); return false; }
    target = found;
    return true;
  };

  const onDown = (event: PointerEvent) => {
    if (event.button !== 0 || !(event.target instanceof Element) || !viewport?.contains(event.target) || event.target.closest(CHROME)) return;
    event.preventDefault();
    event.stopPropagation();
    if (!pick(event) || !target) return;
    const client = { x: event.clientX, y: event.clientY };
    let at = localOf(target.host, client);
    if (kind === "pencil") { trail = [at]; overlay.pencil(target.host, trail); return; }
    const first = points[0];
    if (first && points.length > 1 && distance(screenOf(target.host, first.at), screenOf(target.host, at)) <= CLOSE_PX) { finish(true); return; }
    if (points.length && event.shiftKey) at = snap45(points[points.length - 1].at, at);
    points = [...points, { at, in: null, out: null }];
    press = { client, at, dragged: false };
    redraw();
  };
  const onMove = (event: PointerEvent) => {
    if (!target) return;
    const client = { x: event.clientX, y: event.clientY };
    const at = localOf(target.host, client);
    if (kind === "pencil") {
      if (trail) { trail.push(at); overlay.pencil(target.host, trail); }
      return;
    }
    pointer = points.length && event.shiftKey && !press ? snap45(points[points.length - 1].at, at) : at;
    if (press && (press.dragged || distance(press.client, client) > DRAG_PX)) {
      press.dragged = true;
      const drag = event.shiftKey ? snap45(press.at, at) : at;
      const index = points.length - 1;
      points = [...points.slice(0, index), smoothPoint(press.at, drag, event.altKey, points[index].in)];
    }
    redraw();
  };
  const onUp = () => {
    if (kind === "pencil" && trail && target) {
      const zoom = getViewport().zoom || 1;
      const closed = trail.length > 10 && distance(trail[0], trail[trail.length - 1]) * zoom <= CLOSE_PX;
      const drawn = codeOf(pencilCommands(trail, 2 / zoom, closed), target);
      const into = target;
      trail = null;
      target = null;
      overlay.pencil(into.host, []);
      if (drawn) void writeVector(into, drawn);
      return;
    }
    press = null;
    redraw();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.isComposing) return;
    const own = event.key === "Escape" || event.key === "Enter" || ((event.key === "Backspace" || event.key === "Delete") && kind === "pen" && points.length > 0);
    if (!own) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key === "Backspace" || event.key === "Delete") {
      points = points.slice(0, -1);
      if (!points.length) target = null;
      redraw();
      return;
    }
    if (kind === "pencil" || points.length < 2) { done(); return; }
    finish(false);
  };
  window.addEventListener("pointerdown", onDown, true);
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("keydown", onKey, true);
  say(kind === "pen" ? "Pen · click for corners, drag for curves · click the first point to close · Enter to finish" : "Pencil · drag to draw · Esc for Move");
  armed = {
    stop: () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("keydown", onKey, true);
      viewport?.removeAttribute("data-studio-placing");
      viewport?.removeAttribute("data-studio-drawing");
      overlay.remove();
    },
  };
  return true;
}
