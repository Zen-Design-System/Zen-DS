import { zoomToFrame } from "./presentFrame";
import { boardBoxes, isSectionId, readingOrder, type BoardBox } from "./sections";
import { getViewport, getViewportBox } from "../canvas/viewport";
import { studioStore } from "../store";

/*
 * Figma's Zoom to next frame N / Zoom to previous frame ⇧N on a page you made (F4): the board's frames in reading order
 * (rows top to bottom, each left to right; Sections are areas, not stops), from the selected frame (or the frame of the
 * selected layer, else the one nearest the middle of the view); the next one is selected and zoomed to, wrapping round.
 */

export function stepFrame(delta: 1 | -1): boolean {
  const container = document.querySelector<HTMLElement>(".studio-builder-board__frames");
  const frames = readingOrder(boardBoxes(container).filter((box) => !isSectionId(box.id)));
  if (!container || !frames.length) return false;
  const selection = studioStore.getState().selection;
  const current = selection?.kind === "frame" || selection?.kind === "node" ? selection.frameId : null;
  let index = frames.findIndex((box) => box.id === current);
  if (index < 0) {
    // Nothing of a frame selected: from the frame nearest the middle of the view (so N goes to the one after it).
    const { zoom } = getViewport();
    const view = getViewportBox();
    const origin = container.getBoundingClientRect();
    const middle = { x: (view.left + view.width / 2 - origin.left) / zoom, y: (view.top + view.height / 2 - origin.top) / zoom };
    const distance = (box: BoardBox) => Math.hypot(box.x + box.width / 2 - middle.x, box.y + box.height / 2 - middle.y);
    index = frames.reduce((best, box, at) => (distance(box) < distance(frames[best]) ? at : best), 0);
    if (delta > 0) index -= 1;
    else index += 1;
  }
  const next = frames[(index + delta + frames.length * 2) % frames.length];
  studioStore.setState({ selection: { kind: "frame", frameId: next.id } });
  const element = container.querySelector<HTMLElement>(`:scope > [data-studio-frame="${CSS.escape(next.id)}"]`);
  if (element) zoomToFrame(element);
  return true;
}
