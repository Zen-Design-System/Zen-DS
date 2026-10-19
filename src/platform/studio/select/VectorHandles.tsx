import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type ReactElement } from "react";
import { fitVectorPath, parseVectorPath, parseViewBox, vectorBounds, vectorPathData, type PathCommand, type Point, type ViewBox } from "../../../components/Shape/geometry";
import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../api";
import { getViewport } from "../canvas/viewport";
import { moveHandle, movePoint, removePoint, subpathCommands, subpathsOf, type PointRef, type Subpath } from "../draw/penModel";
import { canEdit, studioStore } from "../store";
import type { EditOp } from "../types";
import type { FiberHit } from "./picker";
import "./vector-handles.css";

/*
 * Figma's vertex edit on a vector (plan docs/research/studio-f9-vectors-spec-2026-10-19.md F9a): Enter (or a
 * double-click) on a selected `Shape type="vector"` shows its points and handles; drag a point (its handles come along)
 * or a handle (the other one turns with it on a smooth point; ⌥ breaks it); Delete takes the selected point out; Esc or
 * Enter leaves. The shape follows the pointer live (its drawn paths), and a release writes once (one edit, one ⌘Z): the
 * new path from its new bounds, the layer's box moved with them when it floats unturned (else the path only, in its
 * viewBox). The ArcHandles pattern.
 */

type Editing = { src: string; instance: number } | null;
let editing: Editing = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** The vector being edited (vertex edit), or null. */
export const vectorEditing = { get: () => editing, subscribe };
const useEditing = () => useSyncExternalStore(subscribe, () => editing, () => null);

/** Enter on the selection: true when it is a vector, now in vertex edit. */
export function startVectorEdit(hit: FiberHit | null, instance = 0): boolean {
  if (!hit || hit.name !== "Shape" || hit.props.type !== "vector" || !canEdit()) return false;
  editing = { src: hit.src, instance };
  notify();
  return true;
}
export function stopVectorEdit() {
  if (!editing) return;
  editing = null;
  notify();
}
// Another selection ends vertex edit (Figma: a click elsewhere leaves it).
studioStore.subscribe(() => {
  if (!editing) return;
  const selection = studioStore.getState().selection;
  if (selection?.kind !== "node" || selection.src !== editing.src) stopVectorEdit();
});

type Frame = { cx: number; cy: number; w: number; h: number; zoom: number; turn: number; box: ViewBox; sx: number; sy: number };
type Grab = { pointerId: number; ref: PointRef; side: "at" | "in" | "out"; from: Point; start: Subpath[]; now: Subpath[] };

const toRad = (degrees: number) => (degrees * Math.PI) / 180;
const round2 = (value: number) => Math.round(value * 100) / 100;

/** A point of the path (viewBox units) on the screen (viewport px), through the layer's size, zoom and turn. */
function toScreen(frame: Frame, point: Point): Point {
  const vx = ((point.x - frame.box.x) * frame.sx - frame.w / 2) * frame.zoom;
  const vy = ((point.y - frame.box.y) * frame.sy - frame.h / 2) * frame.zoom;
  return { x: frame.cx + vx * Math.cos(frame.turn) - vy * Math.sin(frame.turn), y: frame.cy + vx * Math.sin(frame.turn) + vy * Math.cos(frame.turn) };
}
/** A screen move (px) in viewBox units. */
function toPath(frame: Frame, dx: number, dy: number): Point {
  const ux = (dx * Math.cos(-frame.turn) - dy * Math.sin(-frame.turn)) / frame.zoom;
  const uy = (dx * Math.sin(-frame.turn) + dy * Math.cos(-frame.turn)) / frame.zoom;
  return { x: ux / (frame.sx || 1), y: uy / (frame.sy || 1) };
}

type Attributes = Array<{ kind: string; name: string; value?: string }>;
const writtenPx = (attributes: Attributes, prop: string) => {
  const attr = attributes.find((candidate) => candidate.kind === "expression" && candidate.name === prop);
  const value = attr?.value !== undefined ? Number(attr.value) : NaN;
  return Number.isFinite(value) ? value : null;
};

/** The ops a vertex edit writes: the path from its new bounds and the layer's box with them (unturned), else the path in its viewBox. */
function vertexOps(commands: PathCommand[], frame: Frame, attributes: Attributes, rotation: number): EditOp[] {
  const set = (name: string, value: string | number): EditOp => ({ op: "setProp", name, value: typeof value === "number" ? { kind: "number", value } : { kind: "string", value } } as EditOp);
  if (rotation % 360 !== 0) return [set("d", vectorPathData(commands))];
  const local = parseVectorPath(fitVectorPath(commands, frame.box, frame.w, frame.h)) ?? [];
  const bounds = vectorBounds(local);
  if (!bounds) return [];
  const moved = local.map((entry) => ({ command: entry.command, points: entry.points.map((point) => ({ x: point.x - bounds.x, y: point.y - bounds.y })) }));
  const width = round2(bounds.width);
  const height = round2(bounds.height);
  const ops = [set("d", vectorPathData(moved)), set("viewBox", `0 0 ${width} ${height}`), set("width", width), set("height", height)];
  const left = writtenPx(attributes, "insetLeft");
  const top = writtenPx(attributes, "insetTop");
  if (left !== null && bounds.x) ops.push(set("insetLeft", round2(left + bounds.x)));
  if (top !== null && bounds.y) ops.push(set("insetTop", round2(top + bounds.y)));
  return ops;
}

export function VectorHandles({ hit, viewport }: { hit: FiberHit | null; viewport: HTMLElement | null }) {
  const active = useEditing();
  const [, redraw] = useState(0);
  const [picked, setPicked] = useState<PointRef | null>(null);
  const grabRef = useRef<Grab | null>(null);
  const host = hit?.hosts[0] instanceof HTMLElement ? hit.hosts[0] : null;
  const on = Boolean(active && hit && host && active.src === hit.src && hit.props.type === "vector");
  const commands = on ? parseVectorPath(String(hit!.props.d ?? "")) : null;
  const paths = useRef<Subpath[]>([]);
  if (commands && !grabRef.current) paths.current = subpathsOf(commands);

  // Follow the canvas (pan, zoom, the layer's own re-render after a write).
  useEffect(() => {
    if (!on || !host) return undefined;
    let frame = 0;
    const tick = () => { redraw((n) => n + 1); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [on, host]);

  const frameNow = (): Frame | null => {
    if (!host || !viewport || !commands) return null;
    const rect = host.getBoundingClientRect();
    const view = viewport.getBoundingClientRect();
    const box = parseViewBox(String(hit!.props.viewBox ?? "")) ?? vectorBounds(commands);
    if (!box) return null;
    const w = host.offsetWidth;
    const h = host.offsetHeight;
    const rotation = Number(hit!.props.rotation ?? 0) || 0;
    return { cx: rect.left + rect.width / 2 - view.left, cy: rect.top + rect.height / 2 - view.top, w, h, zoom: getViewport().zoom || 1, turn: toRad(-rotation), box, sx: box.width ? w / box.width : 1, sy: box.height ? h / box.height : 1 };
  };
  const paint = (next: Subpath[], frame: Frame) => {
    const d = fitVectorPath(subpathCommands(next), frame.box, frame.w, frame.h);
    host?.querySelectorAll(".zen-shape__drawing path").forEach((path) => path.setAttribute("d", d));
  };
  const write = async (next: Subpath[], frame: Frame, label: string) => {
    const at = parseSrc(hit!.src);
    if (!at) return;
    const element = await studioApi.element(at.file, at.loc);
    if (!element) { announceEditStatus({ kind: "error", message: "The vector is no longer there — select it again", at: Date.now() }); return; }
    const ops = vertexOps(subpathCommands(next), frame, element.attributes as Attributes, Number(hit!.props.rotation ?? 0) || 0);
    if (ops.length) await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops, hash: element.hash }, label);
  };

  // Esc / Enter leave; Delete takes the picked point out (before the canvas's own Delete removes the layer).
  useEffect(() => {
    if (!on) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.isComposing || event.metaKey || event.ctrlKey) return;
      if (event.key === "Escape" || event.key === "Enter") { event.preventDefault(); event.stopImmediatePropagation(); stopVectorEdit(); return; }
      if ((event.key === "Delete" || event.key === "Backspace") && picked) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const frame = frameNow();
        const next = removePoint(paths.current, picked);
        setPicked(null);
        if (frame && next.length) void write(next, frame, "Delete point");
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  if (!on) return null;
  const frame = frameNow();
  if (!frame) return null;
  const view = viewport!.getBoundingClientRect();
  const down = (event: ReactPointerEvent<HTMLDivElement>, ref: PointRef, side: Grab["side"]) => {
    if (event.button !== 0 || !canEdit()) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setPicked(ref);
    grabRef.current = { pointerId: event.pointerId, ref, side, from: { x: event.clientX, y: event.clientY }, start: paths.current, now: paths.current };
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const grab = grabRef.current;
    if (!grab || grab.pointerId !== event.pointerId) return;
    const by = toPath(frame, event.clientX - grab.from.x, event.clientY - grab.from.y);
    const point = grab.start[grab.ref.path].points[grab.ref.index];
    let next: Subpath[];
    if (grab.side === "at") next = movePoint(grab.start, grab.ref, by);
    else {
      const handle = point[grab.side]!;
      next = moveHandle(grab.start, grab.ref, grab.side, { x: handle.x + by.x, y: handle.y + by.y }, !event.altKey && Boolean(point.in && point.out));
    }
    grab.now = next;
    paths.current = next;
    paint(next, frame);
  };
  const up = (event: ReactPointerEvent<HTMLDivElement>) => {
    const grab = grabRef.current;
    if (!grab || grab.pointerId !== event.pointerId) return;
    grabRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (grab.now === grab.start) return;
    void write(grab.now, frame, grab.side === "at" ? "Move point" : "Move handle");
  };

  const marks: ReactElement[] = [];
  const lines: ReactElement[] = [];
  paths.current.forEach((path, k) => path.points.forEach((point, i) => {
    const at = toScreen(frame, point.at);
    const ref = { path: k, index: i };
    const isPicked = picked?.path === k && picked.index === i;
    for (const side of ["in", "out"] as const) {
      const handle = point[side];
      if (!handle) continue;
      const to = toScreen(frame, handle);
      lines.push(<line key={`l${k}-${i}-${side}`} x1={at.x} y1={at.y} x2={to.x} y2={to.y} />);
      marks.push(<div key={`h${k}-${i}-${side}`} className="studio-vector__knob" style={{ left: to.x, top: to.y }} onPointerDown={(event) => down(event, ref, side)} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-hidden="true" />);
    }
    marks.push(<div key={`p${k}-${i}`} className="studio-vector__point" data-picked={isPicked || undefined} style={{ left: at.x, top: at.y }} onPointerDown={(event) => down(event, ref, "at")} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-hidden="true" />);
  }));
  return (
    <div className="studio-vector" data-e2e="vector-edit" style={{ width: view.width, height: view.height }}>
      <svg className="studio-vector__lines" width={view.width} height={view.height} aria-hidden="true">{lines}</svg>
      {marks}
    </div>
  );
}
