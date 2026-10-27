import { getStudioFrames } from "../board/frames";
import type { StudioViewport } from "../types";
import { FIRST_VIEW_MARGIN, firstViewOf, readsFromTop, type ViewFrame } from "./firstView";
import { getSafeBox, toWorldRect, viewportFitting, viewportReading } from "./viewport";

/*
 * The first visit of a page you made (UX review 2026-10-27 §2.3, §7.3): its frames render after the page's document is
 * read and parsed, so the viewport cannot be set when the page key changes; this watches the board until the frames
 * are registered, placed (BuilderBoard's layout effect writes each frame's `left` / `top`) and drawn, then applies the
 * first view once (canvas/firstView.ts: one row fits, else the first Screen). StudioCanvas calls it with no viewport
 * saved for the page and stops it when the page changes.
 */

/** A builder page's frames: Screens, Overlays, Sections and Slices (the docs board's frames never wait). */
const BUILDER_FRAME = /^(?:screen|overlay|section|slice):/;
/** How long the board gets to draw its frames before the provisional view stays (a page in the Trash, an empty one). */
const DEADLINE = 8000;

/** The viewport for the first view in the visible canvas: `fit` whole and centred; a frame whole and centred, or read
 *  from its top when it is much taller than wide for the canvas. */
export function firstVisitViewport(frames: readonly ViewFrame[]): StudioViewport | null {
  const box = getSafeBox();
  const view = firstViewOf(frames, box);
  if (!view) return null;
  if (view.kind === "frame" && readsFromTop(view.rect, box, FIRST_VIEW_MARGIN)) return viewportReading(view.rect, FIRST_VIEW_MARGIN, 1);
  return viewportFitting(view.rect, FIRST_VIEW_MARGIN, 1);
}

/** The board's builder frames as drawn now, or null while any is still unplaced or unmeasured (or none is there). */
function drawnFrames(world: HTMLElement): ViewFrame[] | null {
  const entries = getStudioFrames().filter((entry) => BUILDER_FRAME.test(entry.id) && world.contains(entry.element));
  if (!entries.length) return null;
  const frames: ViewFrame[] = [];
  for (const entry of entries) {
    // Placed: BuilderBoard wrote where it sits; drawn: it has a size (the page's content rendered inside it).
    if (!entry.element.style.left) return null;
    const rect = toWorldRect(entry.element.getBoundingClientRect());
    if (!(rect.width > 0 && rect.height > 0)) return null;
    frames.push({ kind: entry.id.slice(0, entry.id.indexOf(":")), rect });
  }
  return frames;
}

/**
 * Applies the page's first view through `apply` once its frames are drawn (polled each animation frame, at most
 * DEADLINE ms). Returns the stop function (the page changed, the canvas unmounted).
 */
export function watchFirstVisit(world: HTMLElement, apply: (viewport: StudioViewport) => void): () => void {
  let frame = 0;
  const started = performance.now();
  const tick = () => {
    frame = 0;
    const frames = drawnFrames(world);
    if (frames) {
      const viewport = firstVisitViewport(frames);
      if (viewport) apply(viewport);
      return;
    }
    if (performance.now() - started < DEADLINE) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => { if (frame) cancelAnimationFrame(frame); frame = 0; };
}
