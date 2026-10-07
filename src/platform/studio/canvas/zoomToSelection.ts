import { findFrame } from "../board/frames";
import { findBySrc, rectOf } from "../select/picker";
import { studioStore } from "../store";
import { canvasApi } from "./viewport";

/** Zoom so the selected frame or layer fills the canvas (Shift+2). False when nothing is selected or it is not rendered. */
export function zoomToSelection() {
  const selection = studioStore.getState().selection;
  const world = canvasApi.getWorldElement();
  if (!selection || !world) return false;
  let rect: DOMRect | null = null;
  if (selection.kind === "frame") rect = findFrame(selection.frameId)?.element.getBoundingClientRect() ?? null;
  else {
    const hits = findBySrc(world, selection.src);
    const hit = hits[selection.instance] ?? hits[0];
    rect = hit ? rectOf(hit.hosts) : null;
  }
  if (!rect || (!rect.width && !rect.height)) return false;
  canvasApi.zoomToRect(rect, { padding: 64 });
  return true;
}
