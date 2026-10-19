import { announceEditStatus } from "../api";
import { placePictureAt } from "../draw/drawTool";
import { picturesOf } from "../draw/placeImage";
import { setImagePaste } from "../edit/clipboard";
import { canEdit, studioStore } from "../store";
import { canvasApi, getViewport } from "./viewport";

/*
 * Pictures from the computer onto the canvas (Studio parity F8), as Figma takes them: files dropped on a frame of a page
 * you made are uploaded and placed where they fell, side by side; pasted ones go in the middle of the selected frame
 * (or the frame in view). Each is a Rectangle with the image fill (draw/drawTool.ts placePictureAt), one edit each.
 */

const GAP = 16;
const say = (message: string) => announceEditStatus({ kind: "error", message, at: Date.now() });
const hasFiles = (event: DragEvent) => [...(event.dataTransfer?.types ?? [])].includes("Files");

/** Places `files`' pictures from the screen point `at`, each beside the last (or each centred there: a paste). */
async function placeFiles(files: readonly File[], at: { x: number; y: number }, center: boolean, where: string) {
  if (!canEdit()) { say("View only"); return; }
  const pictures = await picturesOf(files);
  let x = at.x;
  for (const picture of pictures) {
    const placed = await placePictureAt(picture, { x, y: at.y }, center);
    if (!placed) { say(`${where} on a frame · F draws a frame`); return; }
    x += (picture.width + GAP) * (center ? 0 : getViewport().zoom || 1);
  }
}

/**
 * Listens for files dragged over the canvas (and pasted pictures) while a page is open; returns the cleanup. On the
 * window, so it holds however the canvas mounts; only a drag over the canvas is taken.
 */
export function installFileDrop(localPage: string | null): () => void {
  setImagePaste(localPage ? pastePictures : null);
  const overCanvas = (event: DragEvent) => {
    const viewport = canvasApi.getViewportElement();
    return hasFiles(event) && event.target instanceof Node && Boolean(viewport?.contains(event.target));
  };
  const onOver = (event: DragEvent) => {
    if (!overCanvas(event)) return;
    // Taken, so the browser does not open the file instead.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = localPage ? "copy" : "none";
  };
  const onDrop = (event: DragEvent) => {
    if (!overCanvas(event)) return;
    event.preventDefault();
    if (!localPage) { say("Pictures go on pages you made"); return; }
    void placeFiles([...(event.dataTransfer?.files ?? [])], { x: event.clientX, y: event.clientY }, false, "Drop pictures");
  };
  window.addEventListener("dragover", onOver);
  window.addEventListener("drop", onDrop);
  return () => {
    setImagePaste(null);
    window.removeEventListener("dragover", onOver);
    window.removeEventListener("drop", onDrop);
  };
}

type Rect = { left: number; top: number; right: number; bottom: number };
const overlap = (a: Rect, b: Rect): Rect => ({ left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom) });
const area = (rect: Rect) => Math.max(0, rect.right - rect.left) * Math.max(0, rect.bottom - rect.top);

/**
 * Where a pasted picture goes: the middle of what shows of the selected layer's frame, else of the frame that shows the
 * most in the canvas (Figma's frame in view); null when no frame shows.
 */
function pastePoint(): { x: number; y: number } | null {
  const view = canvasApi.getViewportElement()?.getBoundingClientRect();
  if (!view) return null;
  const frameId = studioStore.getState().selection?.frameId;
  const selected = frameId ? document.querySelector(`[data-studio-frame="${CSS.escape(frameId)}"]`) : null;
  const frames = selected ? [selected] : [...document.querySelectorAll('[data-studio-frame^="screen:"], [data-studio-frame^="overlay:"]')];
  let best: Rect | null = null;
  for (const frame of frames) {
    const shown = overlap(view, frame.getBoundingClientRect());
    if (area(shown) > (best ? area(best) : 0)) best = shown;
  }
  return best ? { x: (best.left + best.right) / 2, y: (best.top + best.bottom) / 2 } : null;
}

/**
 * ⌘V with pictures on the clipboard (a copied image, a screenshot) on a page you made: they go in the middle of the
 * selected frame or the frame in view. False when there is no picture to take (the caller pastes as before).
 */
export function pastePictures(files: readonly File[]): boolean {
  const pictures = files.filter((file) => file.type.startsWith("image/"));
  if (!pictures.length || !studioStore.getState().localPage) return false;
  const at = pastePoint();
  if (!at) { say("Paste pictures on a frame · F draws a frame"); return true; }
  void placeFiles(pictures, at, true, "Paste pictures");
  return true;
}
