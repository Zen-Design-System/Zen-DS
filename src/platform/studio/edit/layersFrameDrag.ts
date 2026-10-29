import { typographyStyles } from "../../../tokens/typography.generated";
import { orderFrame } from "../builder/frameEdit";
import { canEdit, studioStore } from "../store";

/*
 * Drag a frame's row in Layers to change the frames' order (walk 2026-10-29 W-33: the drag did nothing, silently). The
 * order is the Board's, the one the Flow list shows and Play starts from (its first Screen); no frame moves on the
 * canvas (frameEdit.ts orderFrame). Layer rows keep their own drag (layersDrag.ts); a frame row only goes before or after
 * another frame row of the same page.
 */

const FRAME_ROW = "[role='treeitem'][data-kind='frame']";
const BOARD_FRAME = /^frame:((?:screen|overlay|section|slice):.+)$/;

type Session = {
  tree: HTMLElement;
  row: Element;
  frameId: string;
  label: string;
  start: { x: number; y: number };
  dragging: boolean;
  marker: HTMLElement | null;
  place: { row: Element; mode: "before" | "after" } | null;
};
let session: Session | null = null;

const frameIdOf = (row: Element) => row.getAttribute("data-layer-id")?.match(BOARD_FRAME)?.[1] ?? null;

function placeAt(current: Session, x: number, y: number): Session["place"] {
  const row = document.elementFromPoint(x, y)?.closest(FRAME_ROW) ?? null;
  if (!row || row === current.row || !current.tree.contains(row) || !frameIdOf(row)) return null;
  const box = row.getBoundingClientRect();
  return { row, mode: y < box.top + box.height / 2 ? "before" : "after" };
}

function draw(current: Session) {
  const marker = current.marker;
  if (!marker) return;
  const place = current.place;
  marker.hidden = !place;
  if (!place) return;
  const tree = current.tree.getBoundingClientRect();
  const row = place.row.getBoundingClientRect();
  marker.dataset.mode = place.mode;
  marker.style.transform = `translate(${row.left - tree.left + 12}px, ${(place.mode === "before" ? row.top : row.bottom) - 1 - tree.top + current.tree.scrollTop}px)`;
  marker.style.width = `${row.width - 12}px`;
}

/** The frame that goes right after the dragged one in the Board once dropped (null: it goes last). */
function beforeInBoard(current: Session, place: NonNullable<Session["place"]>): string | null {
  const shown = [...current.tree.querySelectorAll(FRAME_ROW)].map(frameIdOf).filter((id): id is string => Boolean(id) && id !== current.frameId);
  const target = frameIdOf(place.row);
  const at = target ? shown.indexOf(target) : -1;
  if (at < 0) return null;
  shown.splice(place.mode === "before" ? at : at + 1, 0, current.frameId);
  // Layers lists the front-most frame first (Figma) when the tree says so: the Board's order is the list upside down.
  const board = current.tree.getAttribute("data-order") === "front" ? shown.reverse() : shown;
  return board[board.indexOf(current.frameId) + 1] ?? null;
}

function onMove(event: PointerEvent) {
  const current = session;
  if (!current) return;
  if (!current.dragging) {
    if (Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y) < 4) return;
    current.dragging = true;
    current.tree.setAttribute("data-dropping", "");
    const marker = document.createElement("div");
    marker.className = `studio-layers-drop ${typographyStyles["Caption/Medium"]}`;
    marker.setAttribute("aria-hidden", "true");
    current.tree.append(marker);
    current.marker = marker;
  }
  event.preventDefault();
  current.place = placeAt(current, event.clientX, event.clientY);
  draw(current);
}

function end(commit: boolean) {
  const current = session;
  if (!current) return;
  session = null;
  window.removeEventListener("pointermove", onMove, true);
  window.removeEventListener("pointerup", onUp, true);
  window.removeEventListener("pointercancel", onCancel, true);
  window.removeEventListener("keydown", onKey, true);
  current.marker?.remove();
  current.tree.removeAttribute("data-dropping");
  if (!current.dragging) return;
  // The click that ends a drag must not also select the row it is released on.
  const swallow = (event: MouseEvent) => { event.stopPropagation(); event.preventDefault(); };
  window.addEventListener("click", swallow, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
  const localPage = studioStore.getState().localPage;
  if (!commit || !current.place || !localPage) return;
  void orderFrame(localPage, current.frameId, beforeInBoard(current, current.place), `Move ${current.label}`);
}

const onUp = () => end(true);
const onCancel = () => end(false);
function onKey(event: KeyboardEvent) {
  if (event.key !== "Escape" || !session?.dragging) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  end(false);
}

/** A press on a frame's row in Layers (LayersPanel's onPointerDown): arms a drag that reorders the page's frames. */
export function pressFrameRow(event: PointerEvent, tree: HTMLElement) {
  if (event.button !== 0 || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey || session) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target || target.closest(".studio-layers__chevron, button, input")) return;
  const row = target.closest(FRAME_ROW);
  const frameId = row ? frameIdOf(row) : null;
  if (!row || !frameId || !tree.contains(row)) return;
  const state = studioStore.getState();
  if (!state.localPage || state.tool !== "select" || state.presenting || !canEdit(state)) return;
  const label = row.querySelector(".studio-layers__name")?.textContent?.trim() || frameId;
  session = { tree, row, frameId, label, start: { x: event.clientX, y: event.clientY }, dragging: false, marker: null, place: null };
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onCancel, true);
  window.addEventListener("keydown", onKey, true);
}
