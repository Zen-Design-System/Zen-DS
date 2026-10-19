import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { typographyStyles } from "../../../tokens/typography.generated";
import { announceEditStatus } from "../api";
import { headerGuides, type PageGuide } from "../builder/store/pageModel";
import { setPageGuides, usePage } from "../builder/store/pageStore";
import { canEdit, useStudio } from "../store";
import { canvasApi, getSafeBox, getViewport } from "./viewport";
import { useViewOptions } from "./viewOptions";
import "./rulers.css";

/*
 * Figma's rulers and guides (⇧R, Studio parity F10), on a page you made. The rulers run along the top and left of the
 * canvas that shows between the panels; their 0 is the selected layer's frame's top-left (else the canvas origin, the
 * board's 0, 0 that the frames' X / Y count from), as Figma's. Drag from a ruler onto the canvas for a guide: dropped on a frame it belongs to that frame (from its
 * top-left), else to the canvas. Drag a guide to move it, back onto its ruler to delete it. Guides are the page's (its
 * header `guides`, builder/store/pageModel.ts), shown while the rulers are.
 */

const RULER = 20;
/** Label steps: the smallest that leaves this much room between labels. */
const LABEL_ROOM = 56;
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];

type Drag = { axis: "x" | "y"; index: number | null; pointerId: number; at: { x: number; y: number } };

/** A frame's box on the canvas, in world px (from its element on the screen). */
function frameWorldBox(frameId: string, view: DOMRect) {
  const element = document.querySelector(`[data-studio-frame="${CSS.escape(frameId)}"]`);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const { x, y, zoom } = getViewport();
  return { left: (rect.left - view.left - x) / zoom, top: (rect.top - view.top - y) / zoom, width: rect.width / zoom, height: rect.height / zoom };
}

/**
 * Where the board's 0, 0 sits in the world (the frames' container: its offsets up to the world): the canvas coordinates
 * the rulers and the canvas's guides use are the board's, as the frames' X / Y in the right panel.
 */
function boardOrigin(): { x: number; y: number } {
  const world = canvasApi.getWorldElement();
  const container = document.querySelector(".studio-world [data-studio-frame]")?.parentElement ?? null;
  let x = 0;
  let y = 0;
  for (let node: HTMLElement | null = container; node && node !== world; node = node.offsetParent as HTMLElement | null) {
    x += node.offsetLeft;
    y += node.offsetTop;
  }
  return { x, y };
}

/** The frame (Screen or Overlay) under a screen point, or null. */
function frameAt(clientX: number, clientY: number): string | null {
  for (const element of document.elementsFromPoint(clientX, clientY)) {
    const frame = element.closest("[data-studio-frame]")?.getAttribute("data-studio-frame");
    if (frame && /^(screen|overlay):/.test(frame)) return frame;
  }
  return null;
}

export function Rulers({ viewport }: { viewport: HTMLElement | null }) {
  const { rulers } = useViewOptions();
  const localPage = useStudio((state) => state.localPage);
  const editable = useStudio((state) => canEdit(state));
  const frameId = useStudio((state) => state.selection?.frameId ?? null);
  const page = usePage(localPage);
  const [, redraw] = useState(0);
  const dragRef = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<{ axis: "x" | "y"; screen: number; remove: boolean } | null>(null);
  useEffect(() => canvasApi.onChange(() => redraw((count) => count + 1)), []);
  if (!rulers || !viewport || !localPage) return null;

  const view = viewport.getBoundingClientRect();
  const safe = getSafeBox();
  const { x, y, zoom } = getViewport();
  const guides = page ? headerGuides(page.text) : [];
  const board = boardOrigin();
  const origin = (frameId && frameWorldBox(frameId, view)) || { left: board.x, top: board.y, width: 0, height: 0 };
  const step = STEPS.find((candidate) => candidate * zoom >= LABEL_ROOM) ?? STEPS[STEPS.length - 1];
  const labels = (axis: "x" | "y") => {
    const from = axis === "x" ? safe.x + RULER : safe.y + RULER;
    const to = axis === "x" ? safe.x + safe.width : safe.y + safe.height;
    const pan = axis === "x" ? x : y;
    const zero = axis === "x" ? origin.left : origin.top;
    const first = Math.ceil(((from - pan) / zoom - zero) / step) * step;
    const out: Array<{ value: number; at: number }> = [];
    for (let value = first; (zero + value) * zoom + pan <= to && out.length < 200; value += step) out.push({ value, at: (zero + value) * zoom + pan });
    return out;
  };
  // Where a guide sits on the screen (viewport px), and the span it draws over.
  const placed = (guide: PageGuide) => {
    const box = guide.frame ? frameWorldBox(guide.frame, view) : null;
    if (guide.frame && !box) return null;
    const world = guide.at + (box ? (guide.axis === "x" ? box.left : box.top) : guide.axis === "x" ? board.x : board.y);
    const screen = guide.axis === "x" ? world * zoom + x : world * zoom + y;
    const span = box
      ? guide.axis === "x" ? { from: box.top * zoom + y, size: box.height * zoom } : { from: box.left * zoom + x, size: box.width * zoom }
      : guide.axis === "x" ? { from: safe.y, size: safe.height } : { from: safe.x, size: safe.width };
    return { screen, span };
  };

  const write = (next: PageGuide[], message: string) => {
    void setPageGuides(localPage, next).then(() => announceEditStatus({ kind: "unchanged", message, at: Date.now() }), () => announceEditStatus({ kind: "error", message: "The guide was not saved", at: Date.now() }));
  };
  const onDown = (event: ReactPointerEvent<HTMLElement>, axis: "x" | "y", index: number | null) => {
    if (event.button !== 0 || !editable) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { axis, index, pointerId: event.pointerId, at: { x: event.clientX, y: event.clientY } };
  };
  const overRuler = (axis: "x" | "y", clientX: number, clientY: number) => (axis === "x" ? clientX - view.left < safe.x + RULER : clientY - view.top < safe.y + RULER);
  const onMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const screen = drag.axis === "x" ? event.clientX - view.left : event.clientY - view.top;
    setPreview({ axis: drag.axis, screen, remove: overRuler(drag.axis, event.clientX, event.clientY) });
  };
  const onUp = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setPreview(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const remove = overRuler(drag.axis, event.clientX, event.clientY);
    if (drag.index === null && remove) return;
    if (drag.index !== null && remove) { write(guides.filter((_, index) => index !== drag.index), "Guide deleted"); return; }
    // Whole px, in the frame it lands on (a moved guide keeps its frame).
    const kept = drag.index !== null ? guides[drag.index] : null;
    const frame = kept ? kept.frame ?? null : frameAt(event.clientX, event.clientY);
    const box = frame ? frameWorldBox(frame, view) : null;
    const world = drag.axis === "x" ? (event.clientX - view.left - x) / zoom : (event.clientY - view.top - y) / zoom;
    const at = Math.round(world - (box ? (drag.axis === "x" ? box.left : box.top) : drag.axis === "x" ? board.x : board.y));
    const guide: PageGuide = { axis: drag.axis, at, ...(frame && box ? { frame } : {}) };
    const next = drag.index !== null ? guides.map((old, index) => (index === drag.index ? guide : old)) : [...guides, guide];
    write(next, `${drag.axis === "x" ? "Vertical" : "Horizontal"} guide at ${at}`);
  };
  // Capture phase: the canvas's own pointer handling (select, marquee) listens on the viewport and would take the press.
  const handlers = { onPointerMoveCapture: onMove, onPointerUpCapture: onUp, onPointerCancelCapture: () => { dragRef.current = null; setPreview(null); } };

  return (
    <div className="studio-rulers" aria-hidden="true">
      {guides.map((guide, index) => {
        const where = placed(guide);
        if (!where) return null;
        const style = guide.axis === "x"
          ? { transform: `translate(${where.screen}px, ${where.span.from}px)`, height: where.span.size }
          : { transform: `translate(${where.span.from}px, ${where.screen}px)`, width: where.span.size };
        return <div key={`${guide.axis}-${guide.frame ?? ""}-${guide.at}-${index}`} className="studio-guide" data-axis={guide.axis} data-frame={guide.frame} style={style} onPointerDownCapture={(event) => onDown(event, guide.axis, index)} {...handlers} />;
      })}
      {preview ? (
        <div className="studio-guide" data-axis={preview.axis} data-preview={preview.remove ? "remove" : "add"} style={preview.axis === "x" ? { transform: `translate(${preview.screen}px, ${safe.y}px)`, height: safe.height } : { transform: `translate(${safe.x}px, ${preview.screen}px)`, width: safe.width }} />
      ) : null}
      <div className="studio-ruler" data-axis="x" style={{ transform: `translate(${safe.x + RULER}px, ${safe.y}px)`, width: Math.max(0, safe.width - RULER) }} onPointerDownCapture={(event) => onDown(event, "y", null)} {...handlers}>
        {labels("x").map(({ value, at }) => <span key={value} className={`studio-ruler__label ${typographyStyles["Caption/Regular"]}`} style={{ transform: `translateX(${at - safe.x - RULER}px)` }}>{value}</span>)}
      </div>
      <div className="studio-ruler" data-axis="y" style={{ transform: `translate(${safe.x}px, ${safe.y + RULER}px)`, height: Math.max(0, safe.height - RULER) }} onPointerDownCapture={(event) => onDown(event, "x", null)} {...handlers}>
        {labels("y").map(({ value, at }) => <span key={value} className={`studio-ruler__label ${typographyStyles["Caption/Regular"]}`} style={{ transform: `translateY(${at - safe.y - RULER}px) rotate(-90deg)` }}>{value}</span>)}
      </div>
      <div className="studio-ruler__corner" style={{ transform: `translate(${safe.x}px, ${safe.y}px)` }} />
    </div>
  );
}
