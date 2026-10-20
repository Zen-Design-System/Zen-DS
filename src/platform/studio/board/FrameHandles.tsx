import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { typographyStyles } from "../../../tokens/typography.generated";
import { setFrameBoxes } from "../builder/frameEdit";
import { dropLivePlace, showLivePlace } from "../builder/frameMove";
import { SNAP_PX, type FrameBox } from "../builder/render/framePlace";
import { canvasApi, getViewport } from "../canvas/viewport";
import { guidesOn, publishDragView } from "../edit/drag";
import { resizeGuides, snapResize } from "../select/resizeSnap";
import { notifyFramesMoved, onFramesMoved } from "./frames";

/*
 * Figma's resize handles on a selected top-level frame or Section of a page you made (F4): four corners and four edges.
 * A drag sets the frame's width / height (and its X / Y from the left or top), shown live with its size under it, then
 * written as one edit (builder/frameEdit.ts setFrameBoxes, one ⌘Z). ⇧ keeps the ratio, ⌥ resizes from the centre,
 * ⌘ / Ctrl turns snapping off; the moving edges snap to the other frames' edges and centres, with Figma's red guides
 * (edit/DragLayer draws them in client px). Esc puts it back. A
 * Screen's height is the least it takes (its content may keep it taller); a frame is at least 100 × 100 (Zen's
 * smallest frame). Pointer-only: the right panel's X / Y / W / H are the keyboard path (builder/FrameGeometry.tsx).
 */

type Handle = { id: string; sx: -1 | 0 | 1; sy: -1 | 0 | 1 };
const HANDLES: readonly Handle[] = [
  { id: "nw", sx: -1, sy: -1 }, { id: "n", sx: 0, sy: -1 }, { id: "ne", sx: 1, sy: -1 }, { id: "e", sx: 1, sy: 0 },
  { id: "se", sx: 1, sy: 1 }, { id: "s", sx: 0, sy: 1 }, { id: "sw", sx: -1, sy: 1 }, { id: "w", sx: -1, sy: 0 },
];
/** Screen px of the hit areas: corner squares and edge strips, as the layer handles (select/ResizeLayer.tsx). */
const STRIP = 8;
const CORNER = 12;
const MIN = 100;
const FRAMES = ".studio-builder-board__frames";

type Rect = { x: number; y: number; width: number; height: number };

const elementOf = (frameId: string) => document.querySelector<HTMLElement>(`${FRAMES} > [data-studio-frame="${CSS.escape(frameId)}"]`);

/** The inline sizes a resize shows through, as they were before it (put back exactly when it is canceled). */
function sizeStyles(element: HTMLElement) {
  const screen = element.querySelector<HTMLElement>(".studio-builder-screen");
  const before = { width: element.style.width, height: element.style.height, frame: element.style.getPropertyValue("--studio-frame-width"), screen: screen?.style.getPropertyValue("--studio-screen-height") ?? "" };
  const put = (target: HTMLElement | null | undefined, name: string, value: string) => { if (!target) return; if (value) target.style.setProperty(name, value); else target.style.removeProperty(name); };
  return () => {
    put(element, "width", before.width);
    put(element, "height", before.height);
    put(element, "--studio-frame-width", before.frame);
    put(screen, "--studio-screen-height", before.screen);
  };
}

/** The live size of a frame being resized: a Screen through its frame width and least height, a Section by its box. */
function showSize(element: HTMLElement, width: number, height: number) {
  if (element.dataset.kind === "section") {
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    return;
  }
  element.style.setProperty("--studio-frame-width", `${width}px`);
  element.querySelector<HTMLElement>(".studio-builder-screen")?.style.setProperty("--studio-screen-height", `${height}px`);
}

export function FrameHandles({ frameId, localPage }: { frameId: string; localPage: string }) {
  const handles = useRef(new Map<string, HTMLElement>());
  const pill = useRef<HTMLSpanElement>(null);
  const [live, setLive] = useState<{ width: number; height: number } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const stop = useRef<() => void>(() => undefined);

  // Screen boxes from the frame's element, on every pan, zoom, move or size change.
  useEffect(() => {
    let frame = 0;
    const place = () => {
      frame = 0;
      const element = elementOf(frameId);
      const viewport = canvasApi.getViewportElement();
      if (!element || !viewport) return;
      const view = viewport.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      const box: Rect = { x: rect.left - view.left, y: rect.top - view.top, width: rect.width, height: rect.height };
      for (const handle of HANDLES) {
        const node = handles.current.get(handle.id);
        if (!node) continue;
        const left = handle.sx < 0 ? box.x : handle.sx > 0 ? box.x + box.width : box.x;
        const top = handle.sy < 0 ? box.y : handle.sy > 0 ? box.y + box.height : box.y;
        if (handle.sx && handle.sy) Object.assign(node.style, { transform: `translate(${left - CORNER / 2}px, ${top - CORNER / 2}px)`, width: `${CORNER}px`, height: `${CORNER}px` });
        else if (handle.sx) Object.assign(node.style, { transform: `translate(${left - STRIP / 2}px, ${box.y + CORNER / 2}px)`, width: `${STRIP}px`, height: `${Math.max(0, box.height - CORNER)}px` });
        else Object.assign(node.style, { transform: `translate(${box.x + CORNER / 2}px, ${top - STRIP / 2}px)`, width: `${Math.max(0, box.width - CORNER)}px`, height: `${STRIP}px` });
        node.dataset.short = !handle.sx || !handle.sy ? ((handle.sx ? box.height : box.width) - CORNER < 10 ? "true" : "false") : "false";
      }
      if (pill.current) {
        // Under the frame, or inside its bottom when the canvas ends below it (as the layer handles' pill).
        const inside = box.y + box.height + 32 > view.height;
        pill.current.dataset.place = inside ? "inside" : "below";
        pill.current.style.transform = `translate(${Math.min(Math.max(box.x + box.width / 2, 48), view.width - 48)}px, ${inside ? Math.min(box.y + box.height, view.height) : box.y + box.height}px)`;
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(place); };
    place();
    const offCanvas = canvasApi.onChange(schedule);
    const offMoved = onFramesMoved(schedule);
    const element = elementOf(frameId);
    const observer = new ResizeObserver(schedule);
    if (element) observer.observe(element);
    window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); offCanvas(); offMoved(); observer.disconnect(); window.removeEventListener("resize", schedule); };
  }, [frameId]);
  useEffect(() => () => stop.current(), []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>, handle: Handle) => {
    if (event.button !== 0) return;
    const element = elementOf(frameId);
    const container = element?.parentElement;
    if (!element || !container) return;
    event.preventDefault();
    event.stopPropagation();
    stop.current();
    const captor = event.currentTarget;
    const pointerId = event.pointerId;
    try { captor.setPointerCapture(pointerId); } catch { /* the pointer may already be gone */ }
    const start: FrameBox = { x: element.offsetLeft, y: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight };
    const others = Array.from(container.children).flatMap((child) => (child instanceof HTMLElement && child !== element && child.dataset.studioFrame && child.dataset.kind !== "section"
      ? [{ x: child.offsetLeft, y: child.offsetTop, width: child.offsetWidth, height: child.offsetHeight }] : []));
    const startClient = { x: event.clientX, y: event.clientY };
    let keys = { shift: event.shiftKey, alt: event.altKey, mod: event.metaKey || event.ctrlKey };
    let pointer = startClient;
    let box = start;
    let active = false;
    let request = 0;
    let guidesShown = false;
    const clearGuides = () => {
      if (guidesShown) publishDragView(null);
      guidesShown = false;
    };
    const apply = () => {
      request = 0;
      const zoom = getViewport().zoom || 1;
      const dx = (pointer.x - startClient.x) / zoom;
      const dy = (pointer.y - startClient.y) / zoom;
      const grow = keys.alt ? 2 : 1;
      const corner = Boolean(handle.sx && handle.sy);
      const ratio = start.width / start.height;
      let width = handle.sx ? start.width + handle.sx * dx * grow : start.width;
      let height = handle.sy ? start.height + handle.sy * dy * grow : start.height;
      // ⇧ keeps the ratio (an edge drags the other side along).
      if (keys.shift) {
        if (corner) { if (Math.abs(width / start.width) > Math.abs(height / start.height)) height = width / ratio; else width = height * ratio; }
        else if (handle.sx) height = width / ratio;
        else width = height * ratio;
      }
      const axes = { x: { side: handle.sx, centred: keys.alt, min: MIN }, y: { side: handle.sy, centred: keys.alt, min: MIN } };
      if (!keys.mod) {
        // The moving edges snap to the other frames' edges and centres (Figma's smart guides while resizing), also from
        // the centre (⌥) and keeping the ratio (⇧ on a corner), as a layer does (select/resizeSnap.ts).
        const delta = { x: handle.sx ? (width - start.width) / (handle.sx * grow) : 0, y: handle.sy ? (height - start.height) / (handle.sy * grow) : 0 };
        const snap = snapResize({ box: start, axes, delta, others, threshold: SNAP_PX / zoom, ratio: keys.shift && corner });
        if (handle.sx) width = start.width + handle.sx * snap.delta.x * grow;
        if (handle.sy) height = start.height + handle.sy * snap.delta.y * grow;
        if (keys.shift && !corner) { if (handle.sx) height = width / ratio; else width = height * ratio; }
      }
      width = Math.max(MIN, width);
      height = Math.max(MIN, height);
      // Anchored at the opposite side, or the centre with ⌥.
      const x = keys.alt ? start.x + (start.width - width) / 2 : handle.sx < 0 ? start.x + start.width - width : start.x;
      const y = keys.alt ? start.y + (start.height - height) / 2 : handle.sy < 0 ? start.y + start.height - height : start.y;
      // The red guides where the moving edges meet another frame's line (read before rounding, as the snap left them).
      const guides = keys.mod ? [] : resizeGuides({ x, y, width, height }, axes, others);
      if (guides.length || guidesShown) {
        publishDragView(guides.length ? { line: null, into: null, pointer, label: null, tone: "info", guides: guidesOn(container, zoom, guides) } : null);
        guidesShown = guides.length > 0;
      }
      box = { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
      showSize(element, box.width, box.height);
      // The left or top edge (or ⌥) moves the frame's place too.
      if (handle.sx < 0 || handle.sy < 0 || keys.alt) showLivePlace(frameId, element, { x: box.x, y: box.y });
      else notifyFramesMoved();
      setLive({ width: box.width, height: box.height });
    };
    const schedule = () => { if (!request) request = requestAnimationFrame(apply); };
    const putBack = sizeStyles(element);
    const restore = () => {
      putBack();
      dropLivePlace(frameId, element, { x: start.x, y: start.y });
    };
    const end = (commit: boolean) => {
      stop.current();
      setDragging(null);
      setLive(null);
      if (!active) return;
      if (!commit) { restore(); return; }
      apply();
      clearGuides();
      const section = element.dataset.kind === "section";
      // Only what the drag changed is written (a width drag leaves a Screen's height to its content).
      const change = Object.fromEntries((["x", "y", "width", "height"] as const).filter((name) => box[name] !== start[name]).map((name) => [name, box[name]]));
      if (!Object.keys(change).length) { restore(); return; }
      void setFrameBoxes(localPage, new Map([[frameId, change]]), section ? "Resize section" : "Resize frame").then((ok) => { if (!ok) restore(); });
    };
    const onMove = (move: PointerEvent) => {
      if (move.pointerId !== pointerId) return;
      pointer = { x: move.clientX, y: move.clientY };
      keys = { shift: move.shiftKey, alt: move.altKey, mod: move.metaKey || move.ctrlKey };
      if (!active && Math.hypot(pointer.x - startClient.x, pointer.y - startClient.y) < 2) return;
      if (!active) { active = true; setDragging(handle.id); }
      schedule();
    };
    const onUp = (up: PointerEvent) => { if (up.pointerId === pointerId) { pointer = { x: up.clientX, y: up.clientY }; end(true); } };
    const onCancel = (cancel: PointerEvent) => { if (cancel.pointerId === pointerId) end(false); };
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape" && key.type === "keydown") { key.preventDefault(); key.stopPropagation(); end(false); return; }
      if (!active || !["Shift", "Alt", "Meta", "Control"].includes(key.key)) return;
      keys = { shift: key.shiftKey, alt: key.altKey, mod: key.metaKey || key.ctrlKey };
      schedule();
    };
    const onBlur = () => end(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    window.addEventListener("blur", onBlur);
    stop.current = () => {
      cancelAnimationFrame(request);
      request = 0;
      clearGuides();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      window.removeEventListener("blur", onBlur);
      try { if (captor.hasPointerCapture(pointerId)) captor.releasePointerCapture(pointerId); } catch { /* already released */ }
      stop.current = () => undefined;
    };
  };

  return (
    <>
      {HANDLES.map((handle) => (
        <div
          key={handle.id}
          ref={(node) => { if (node) handles.current.set(handle.id, node); else handles.current.delete(handle.id); }}
          className="studio-resize__handle studio-frame-handle"
          aria-hidden="true"
          data-handle={handle.id}
          data-kind={handle.sx && handle.sy ? "corner" : "edge"}
          onPointerDown={(event) => onPointerDown(event, handle)}
          onContextMenu={(event) => event.preventDefault()}
        />
      ))}
      {dragging ? <div className="studio-resize__cover" data-handle={dragging} /> : null}
      <span ref={pill} className={`studio-resize__pill studio-frame-handle__pill ${typographyStyles["Caption/Medium"]}`} hidden={!live}>{live ? `${live.width} × ${live.height}` : ""}</span>
    </>
  );
}
