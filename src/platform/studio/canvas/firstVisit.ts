import { getStudioFrames } from "../board/frames";
import type { StudioViewport } from "../types";
import { FIRST_VIEW_MARGIN, firstViewOf, readsFromTop, type ViewFrame, type ViewRect } from "./firstView";
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

/** The viewport for the first view in the visible canvas: `fit` whole, or a frame whole, or read from its top when it
 *  is much taller than wide for the canvas. With height to spare the view starts at the board's title block (`title`,
 *  above the frames) at the margin, instead of centring the frames under an empty band (user 2026-11-01, B4 chrome:
 *  "bị trống phía trên" — the narrower canvas between the panes fits a desktop Screen by its width). */
export function firstVisitViewport(frames: readonly ViewFrame[], title: ViewRect | null = null): StudioViewport | null {
  const box = getSafeBox();
  const view = firstViewOf(frames, box);
  if (!view) return null;
  if (view.kind === "frame" && readsFromTop(view.rect, box, FIRST_VIEW_MARGIN)) return viewportReading(view.rect, FIRST_VIEW_MARGIN, 1);
  const fit = viewportFitting(view.rect, FIRST_VIEW_MARGIN, 1);
  const top = title ? Math.min(title.y, view.rect.y) : view.rect.y;
  const bottom = view.rect.y + view.rect.height;
  if ((bottom - top) * fit.zoom + FIRST_VIEW_MARGIN * 2 > box.height) return fit;
  return { ...fit, y: box.y + FIRST_VIEW_MARGIN - top * fit.zoom };
}

/** The board's title block (the page's name above its frames) in world px, when it is drawn. */
function titleRect(world: HTMLElement): ViewRect | null {
  const title = world.querySelector<HTMLElement>(".studio-board__title");
  if (!title) return null;
  const rect = toWorldRect(title.getBoundingClientRect());
  return rect.width > 0 && rect.height > 0 ? rect : null;
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
      const viewport = firstVisitViewport(frames, titleRect(world));
      if (viewport) apply(viewport);
      return;
    }
    if (performance.now() - started < DEADLINE) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => { if (frame) cancelAnimationFrame(frame); frame = 0; };
}
