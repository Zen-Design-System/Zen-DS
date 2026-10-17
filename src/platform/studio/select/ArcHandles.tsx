import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ellipsePath, normalizeArc, type ShapeArc } from "../../../components/Shape/geometry";
import { typographyStyles } from "../../../tokens/typography.generated";
import { applyEdit, parseSrc, studioApi } from "../api";
import { getViewport } from "../canvas/viewport";
import { canEdit, useStudio } from "../store";
import type { EditOp } from "../types";
import { hitForHost, type FiberHit } from "./picker";
import type { Box } from "./spacing";
import "./arc-handles.css";

/*
 * Figma's arc handles on a selected ellipse (Shape type="ellipse"): Sweep at the arc's end on the rim (drag it around:
 * a pie), Start at its beginning once the arc is open (drag it: the arc turns, its sweep kept), Ratio at the centre, or
 * on the inner rim along the start once there is a hole (drag it out: a ring). The shape follows the pointer live and a
 * pill says the value ("Sweep 75%"); ⇧ steps angles by 15° and the ratio by 5 %; Esc puts it back. Release writes once
 * (one edit, one ⌘Z); a value back at its default (Start 0°, Sweep 100 %, Ratio 0 %) leaves the code.
 * The ellipse's own px and its rotation map the pointer into the shape's plane, so a turned ellipse works too.
 */

type Kind = "sweep" | "start" | "ratio";
type Frame = { cx: number; cy: number; w: number; h: number; zoom: number; turn: number };
type Drag = { kind: Kind; pointerId: number; arc0: ShapeArc; arc: ShapeArc; last: number; swept: number; paths: Array<{ path: SVGPathElement; d: string; rule: string | null; clip: string | null }>; stopKeys: () => void };

const HANDLE_INSET = 10;
const toRad = (degrees: number) => (degrees * Math.PI) / 180;
const wrap = (degrees: number) => ((degrees % 360) + 360) % 360;
const round1 = (value: number) => Math.round(value * 10) / 10;

/** The ellipse's frame on the screen (viewport px): centre, own px size, zoom and turn (CSS radians, clockwise). */
function frameOf(host: HTMLElement, viewport: HTMLElement, rotation: number): Frame {
  const rect = host.getBoundingClientRect();
  const view = viewport.getBoundingClientRect();
  return { cx: rect.left + rect.width / 2 - view.left, cy: rect.top + rect.height / 2 - view.top, w: host.offsetWidth, h: host.offsetHeight, zoom: getViewport().zoom || 1, turn: toRad(-rotation) };
}

/** A point of the ellipse's own px (0,0 … w,h) on the screen. */
function toScreen(frame: Frame, x: number, y: number) {
  const vx = (x - frame.w / 2) * frame.zoom;
  const vy = (y - frame.h / 2) * frame.zoom;
  return { x: frame.cx + vx * Math.cos(frame.turn) - vy * Math.sin(frame.turn), y: frame.cy + vx * Math.sin(frame.turn) + vy * Math.cos(frame.turn) };
}
/** A screen point in the ellipse's own px. */
function toLocal(frame: Frame, x: number, y: number) {
  const dx = x - frame.cx;
  const dy = y - frame.cy;
  const ux = (dx * Math.cos(-frame.turn) - dy * Math.sin(-frame.turn)) / frame.zoom;
  const uy = (dx * Math.sin(-frame.turn) + dy * Math.cos(-frame.turn)) / frame.zoom;
  return { x: ux + frame.w / 2, y: uy + frame.h / 2 };
}
/** The angle (degrees clockwise from 3 o'clock) and rim scale of a local point, on the ellipse's own (stretched) circle. */
function polar(frame: Frame, local: { x: number; y: number }) {
  const nx = (local.x - frame.w / 2) / Math.max(frame.w / 2, 1e-6);
  const ny = (local.y - frame.h / 2) / Math.max(frame.h / 2, 1e-6);
  return { angle: wrap((Math.atan2(ny, nx) * 180) / Math.PI), scale: Math.hypot(nx, ny) };
}
/** Where a handle sits: on the rim at `angle`, `scale` of the radius, pulled `inset` screen px towards the centre. */
function handleAt(frame: Frame, angle: number, scale: number, inset = 0) {
  const rx = frame.w / 2;
  const ry = frame.h / 2;
  const radiusPx = Math.hypot(rx * Math.cos(toRad(angle)), ry * Math.sin(toRad(angle))) * frame.zoom * scale;
  const pull = radiusPx > inset * 3 ? Math.max(0, 1 - inset / Math.max(radiusPx, 1e-6)) : 1;
  return toScreen(frame, rx + rx * scale * pull * Math.cos(toRad(angle)), ry + ry * scale * pull * Math.sin(toRad(angle)));
}

const arcOf = (props: Record<string, unknown>) => normalizeArc({ start: props.arcStart as number, sweep: props.arcSweep as number, ratio: props.arcRatio as number });

/** The ops that write `arc` over `was` (defaults removed: Figma's plain ellipse keeps no arc props). */
function arcOps(arc: ShapeArc, was: ShapeArc): EditOp[] {
  const ops: EditOp[] = [];
  const put = (prop: string, value: number, before: number, fallback: number) => {
    if (Math.abs(value - before) < 0.05) return;
    ops.push(Math.abs(value - fallback) < 0.05 ? { op: "removeProp", name: prop } : ({ op: "setProp", name: prop, value: { kind: "number", value } } as EditOp));
  };
  put("arcStart", round1(arc.start), was.start, 0);
  put("arcSweep", round1(arc.sweep), was.sweep, 100);
  put("arcRatio", round1(arc.ratio), was.ratio, 0);
  return ops;
}

export function ArcHandles({ box, hit, interactive, viewport }: { box: Box | null; hit: FiberHit | null; interactive: boolean; viewport: HTMLElement | null }) {
  const editable = useStudio((state) => canEdit(state) && Boolean(state.localPage));
  const dragRef = useRef<Drag | null>(null);
  const [live, setLive] = useState<{ kind: Kind; arc: ShapeArc; x: number; y: number } | null>(null);
  const host = hit?.hosts[0];
  // The ellipse repaints when its arc is written (or undone): the handles read its props again then.
  const [, repaint] = useState(0);
  useEffect(() => {
    if (!(host instanceof HTMLElement)) return undefined;
    const observer = new MutationObserver(() => repaint((count) => count + 1));
    observer.observe(host, { subtree: true, attributes: true, attributeFilter: ["d"] });
    return () => observer.disconnect();
  }, [host]);
  // The props as rendered now (the selection's hit is from when it was picked: an arc written since is newer).
  const props = (host && hit ? hitForHost(host, hit.name)?.props : null) ?? hit?.props ?? {};
  if (!box || !hit || !interactive || !editable || !viewport || hit.name !== "Shape" || props.type !== "ellipse" || !(host instanceof HTMLElement)) return null;
  const rotation = typeof props.rotation === "number" ? props.rotation : 0;
  const frame = frameOf(host, viewport, rotation);
  // Too small on the screen to tell the handles apart from the resize handles: none (zoom in).
  if (Math.min(frame.w, frame.h) * frame.zoom < 24) return null;
  const arc = live?.arc ?? arcOf(props);
  const end = arc.start + (arc.sweep / 100) * 360;

  const paint = (next: ShapeArc) => {
    const drag = dragRef.current;
    if (!drag) return;
    const d = ellipsePath(frame.w, frame.h, next);
    for (const { path } of drag.paths) {
      path.setAttribute("d", d);
      path.setAttribute("fill-rule", "evenodd");
      if (path.parentElement?.tagName.toLowerCase() === "clippath") path.setAttribute("clip-rule", "evenodd");
    }
  };
  const restore = (drag: Drag) => {
    for (const { path, d, rule, clip } of drag.paths) {
      path.setAttribute("d", d);
      if (rule === null) path.removeAttribute("fill-rule"); else path.setAttribute("fill-rule", rule);
      if (clip === null) path.removeAttribute("clip-rule"); else path.setAttribute("clip-rule", clip);
    }
  };

  const onDown = (event: ReactPointerEvent<HTMLDivElement>, kind: Kind) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const paths = Array.from(host.querySelectorAll<SVGPathElement>(".zen-shape__drawing path")).map((path) => ({ path, d: path.getAttribute("d") ?? "", rule: path.getAttribute("fill-rule"), clip: path.getAttribute("clip-rule") }));
    const start = arcOf(props);
    const local = toLocal(frame, event.clientX - viewport.getBoundingClientRect().left, event.clientY - viewport.getBoundingClientRect().top);
    // Esc while dragging puts the arc back (the handle has no focus: the window hears it).
    const onEscape = (key: KeyboardEvent) => {
      const drag = dragRef.current;
      if (key.key !== "Escape" || !drag) return;
      key.preventDefault();
      key.stopImmediatePropagation();
      dragRef.current = null;
      drag.stopKeys();
      restore(drag);
      setLive(null);
    };
    window.addEventListener("keydown", onEscape, true);
    dragRef.current = { kind, pointerId: event.pointerId, arc0: start, arc: start, last: polar(frame, local).angle, swept: (start.sweep / 100) * 360, paths, stopKeys: () => window.removeEventListener("keydown", onEscape, true) };
  };
  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const view = viewport.getBoundingClientRect();
    const local = toLocal(frame, event.clientX - view.left, event.clientY - view.top);
    const { angle, scale } = polar(frame, local);
    const step = (value: number, size: number) => (event.shiftKey ? Math.round(value / size) * size : value);
    let next = drag.arc;
    if (drag.kind === "sweep") {
      // The handle is the arc's end (Figma): the sweep runs clockwise from the start to the pointer, so a full ellipse
      // dragged down opens as a growing pie and dragged up as one losing its last slice. Within 1° of the start it keeps
      // the side it came from (full or empty).
      const raw = wrap(angle - drag.arc.start);
      let swept = raw;
      if (raw < 1 || raw > 359) swept = drag.swept > 180 ? 360 : 0;
      drag.swept = swept;
      next = { ...drag.arc, sweep: round1((step(swept, 15) / 360) * 100) };
    } else if (drag.kind === "start") {
      next = { ...drag.arc, start: round1(wrap(step(angle, 15))) };
    } else {
      next = { ...drag.arc, ratio: round1(Math.min(99, Math.max(0, step(scale * 100, 5)))) };
    }
    drag.last = angle;
    drag.arc = next;
    paint(next);
    setLive({ kind: drag.kind, arc: next, x: event.clientX - view.left, y: event.clientY - view.top });
  };
  const finish = (event: ReactPointerEvent<HTMLDivElement>, keep: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    drag.stopKeys();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setLive(null);
    const ops = keep ? arcOps(drag.arc, drag.arc0) : [];
    if (!ops.length) { restore(drag); return; }
    const at = parseSrc(hit.src);
    if (!at) { restore(drag); return; }
    const what = drag.kind === "sweep" ? `Arc sweep → ${round1(drag.arc.sweep)}%` : drag.kind === "start" ? `Arc start → ${round1(drag.arc.start)}°` : `Arc ratio → ${round1(drag.arc.ratio)}%`;
    void studioApi.element(at.file, at.loc).then(async (element) => {
      if (!element) { restore(drag); return; }
      const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops, hash: element.hash }, what);
      if (!response.ok) restore(drag);
    });
  };
  const sweepAt = handleAt(frame, end, 1, HANDLE_INSET);
  const startAt = handleAt(frame, arc.start, 1, HANDLE_INSET);
  const ratioAt = arc.ratio > 0 ? handleAt(frame, arc.start, arc.ratio / 100) : toScreen(frame, frame.w / 2, frame.h / 2);
  const handle = (kind: Kind, at: { x: number; y: number }, label: string) => (
    <div
      key={kind}
      className="studio-arc__handle"
      data-kind={kind}
      data-active={live?.kind === kind || undefined}
      tabIndex={-1}
      title={label}
      aria-hidden="true"
      style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
      onPointerDown={(event) => onDown(event, kind)}
      onPointerMove={onMove}
      onPointerUp={(event) => finish(event, true)}
      onPointerCancel={(event) => finish(event, false)}
    />
  );
  const text = live ? (live.kind === "sweep" ? `Sweep ${round1(live.arc.sweep)}%` : live.kind === "start" ? `Start ${round1(live.arc.start)}°` : `Ratio ${round1(live.arc.ratio)}%`) : null;
  return (
    <>
      {arc.sweep < 100 ? handle("start", startAt, "Arc start") : null}
      {handle("sweep", sweepAt, "Arc sweep")}
      {handle("ratio", ratioAt, "Arc ratio")}
      {text && live ? <span className={`studio-arc__pill ${typographyStyles["Caption/Medium"]}`} style={{ transform: `translate(${live.x}px, ${live.y}px)` }}>{text}</span> : null}
    </>
  );
}
