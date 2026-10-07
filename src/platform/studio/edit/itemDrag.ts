import { canvasApi, getViewport } from "../canvas/viewport";
import type { PartHit } from "../select/parts";
import { dataItemBlock, editDataItem } from "../slots/actions";
import { dataItemOfPart, itemParts, renderedItems, renderedItemTitle, slotGroupsAt, type DataItemHit } from "../slots/dataItems";
import { currentFiber } from "../select/picker";
import { canEdit, studioStore } from "../store";
import type { StudioSelection } from "../types";
import { publishDragView } from "./drag";

/*
 * Drag a data-slot item on the canvas (TopNavigation's trailing actions, slots/dataSlots.ts), Figma-like: the action
 * follows the pointer; over another action's edge a 2 px line shows where it lands (drop: it moves there, joining the
 * group it lands inside and leaving one it is dragged out of), over its middle that action is outlined (drop: the two
 * share one pill, op groupItem). Items without groups (`slot.groups` off, or off for the owner's state: the compact
 * TopNavigation's Flat actions) only reorder. Esc cancels; one undo step.
 * SelectionLayer arms it on a press on an item: inside the selected item's owner, or on the selected host itself.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

type Place = { verb: "drop" | "group"; to: number; label: string };

type Session = {
  item: DataItemHit;
  /** What a click without moving does (select the host, or nothing when the press already chose the part). */
  click: (() => void) | null;
  /** Selects the item's own part once the drag starts (the inspector then shows the item). */
  choose: (part: PartHit) => void;
  element: HTMLElement;
  saved: string;
  start: { x: number; y: number };
  pointer: { x: number; y: number };
  dragging: boolean;
  refusal: string | null;
  place: Place | null;
  /** The drawn items' rects when the drag started (the dragged one then follows the pointer). */
  rects: Array<{ index: number; rect: DOMRect }>;
};

let session: Session | null = null;

const THRESHOLD = 4;
/** The share of an action's width, at each end, where a drop goes beside it rather than onto it. */
const EDGE = 0.3;

const box = (rect: DOMRect) => ({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });

/** The rendered `group` of each item (the owner's props as drawn now). */
function groupsOf(item: DataItemHit): Array<string | null> {
  const fiber = item.part.owner.fiber;
  const props = fiber ? currentFiber(fiber).memoizedProps : null;
  return renderedItems(item.slot, props).map((value) => {
    const group = value && typeof value === "object" ? (value as Record<string, unknown>).group : null;
    return typeof group === "string" && group ? group : null;
  });
}

/** Where a drop at the pointer goes among the slot's drawn items, or null (on itself, or off the row). */
function placeAt(current: Session): { place: Place | null; line: ReturnType<typeof box> | null; into: ReturnType<typeof box> | null } {
  const { item, pointer } = current;
  const parts = itemParts(item.part.owner, item.slot);
  const drawn = current.rects;
  if (!drawn.length) return { place: null, line: null, into: null };
  const top = Math.min(...drawn.map((entry) => entry.rect.top));
  const bottom = Math.max(...drawn.map((entry) => entry.rect.bottom));
  // Off the row (above or below it, with some slack): no place.
  const slack = (bottom - top) / 2;
  if (pointer.y < top - slack || pointer.y > bottom + slack) return { place: null, line: null, into: null };
  const from = item.index;
  const grouping = slotGroupsAt(item.part.owner, item.slot);
  const groups = grouping ? groupsOf(item) : [];
  // The action under the pointer, else the nearest one along the row.
  let target = drawn.find((entry) => entry.index !== from && pointer.x >= entry.rect.left && pointer.x <= entry.rect.right)
    ?? drawn.find((entry) => pointer.x >= entry.rect.left && pointer.x <= entry.rect.right) ?? null;
  let side: "before" | "after" | "onto";
  if (target) {
    const at = (pointer.x - target.rect.left) / Math.max(1, target.rect.width);
    side = at < EDGE ? "before" : at > 1 - EDGE ? "after" : grouping ? "onto" : at < 0.5 ? "before" : "after";
  } else {
    target = drawn.reduce((best, entry) => (Math.abs(entry.rect.left + entry.rect.width / 2 - pointer.x) < Math.abs(best.rect.left + best.rect.width / 2 - pointer.x) ? entry : best));
    side = pointer.x < target.rect.left ? "before" : "after";
  }
  if (target.index === from) return { place: null, line: null, into: null };
  const targetPart = parts[target.index];
  const name = targetPart ? renderedItemTitle({ ...item, index: target.index, part: targetPart }) : `${item.slot.itemName} ${target.index + 1}`;
  if (side === "onto") {
    if (groups[from] && groups[from] === groups[target.index]) return { place: null, line: null, into: box(target.rect) };
    return { place: { verb: "group", to: target.index, label: groups[target.index] ? `Join ${name}'s group` : `Group with ${name}` }, line: null, into: box(target.rect) };
  }
  const slot = side === "before" ? target.index : target.index + 1;
  const to = slot > from ? slot - 1 : slot;
  // The line sits in the gap: half way to the neighbour on that side, else just outside the action.
  const neighbour = drawn.find((entry) => entry.index === (side === "before" ? target!.index - 1 : target!.index + 1));
  const x = neighbour
    ? (side === "before" ? (neighbour.rect.right + target.rect.left) / 2 : (target.rect.right + neighbour.rect.left) / 2)
    : side === "before" ? target.rect.left - 2 : target.rect.right + 2;
  const line = { x: x - 1, y: target.rect.top, w: 2, h: target.rect.height };
  if (to === from) return { place: null, line: null, into: null };
  return { place: { verb: "drop", to, label: "Move" }, line, into: null };
}

function follow(current: Session) {
  const { zoom } = getViewport();
  const dx = (current.pointer.x - current.start.x) / zoom;
  const dy = (current.pointer.y - current.start.y) / zoom;
  if (!current.refusal) current.element.style.setProperty("translate", `${dx}px ${dy}px`);
  const found = current.refusal ? { place: null, line: null, into: null } : placeAt(current);
  current.place = found.place;
  publishDragView({
    line: found.line,
    into: found.into,
    pointer: current.pointer,
    label: current.refusal ?? found.place?.label ?? null,
    tone: current.refusal ? "negative" : "info",
  });
}

function lift(current: Session) {
  const element = current.element;
  current.saved = element.getAttribute("style") ?? "";
  element.style.setProperty("pointer-events", "none");
  element.style.setProperty("opacity", "0.85");
  element.style.setProperty("transition", "none");
  element.style.setProperty("z-index", "2147483000");
  if (getComputedStyle(element).position === "static") element.style.setProperty("position", "relative");
  canvasApi.getViewportElement()?.setAttribute("data-studio-dragging", "");
}

function land(current: Session) {
  if (current.saved) current.element.setAttribute("style", current.saved);
  else current.element.removeAttribute("style");
  canvasApi.getViewportElement()?.removeAttribute("data-studio-dragging");
}

function end(commit: boolean) {
  const current = session;
  if (!current) return;
  session = null;
  window.removeEventListener("pointermove", onMove, true);
  window.removeEventListener("pointerup", onUp, true);
  window.removeEventListener("pointercancel", onCancel, true);
  window.removeEventListener("keydown", onKey, true);
  window.removeEventListener("blur", onCancel);
  publishDragView(null);
  if (!current.dragging) {
    if (commit) current.click?.();
    return;
  }
  land(current);
  const place = current.place;
  const selection = studioStore.getState().selection;
  if (!commit || !place || current.refusal || selection?.kind !== "node") return;
  void editDataItem(selection as NodeSelection, current.item.slot, place.verb, current.item.index, place.to);
}

function onMove(event: PointerEvent) {
  const current = session;
  if (!current) return;
  current.pointer = { x: event.clientX, y: event.clientY };
  if (!current.dragging) {
    if (Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y) < THRESHOLD) return;
    current.dragging = true;
    current.rects = itemParts(current.item.part.owner, current.item.slot)
      .map((part, index) => ({ index, rect: part?.element.getBoundingClientRect() ?? null }))
      .filter((entry): entry is { index: number; rect: DOMRect } => Boolean(entry.rect?.width));
    current.choose(current.item.part);
    const selection = studioStore.getState().selection;
    current.refusal = selection?.kind === "node" ? dataItemBlock(selection as NodeSelection) : "Select the action first";
    if (!current.refusal) lift(current);
  }
  // The capture layer's hover stays out of the gesture.
  event.stopPropagation();
  event.preventDefault();
  follow(current);
}

function onUp(event: PointerEvent) {
  if (!session) return;
  if (session.dragging) { event.stopPropagation(); event.preventDefault(); }
  end(true);
}

function onCancel() { end(false); }

function onKey(event: KeyboardEvent) {
  if (!session?.dragging || event.key !== "Escape") return;
  event.preventDefault();
  event.stopImmediatePropagation();
  end(false);
}

/**
 * A press on `part` (SelectionLayer): when it is a data-slot item of an array slot (or a part inside one) and the
 * Studio may edit, arms a drag of that item and returns true. `click` runs at release when the pointer did not move;
 * `choose` selects the item's own part when the drag starts.
 */
export function pressDataItem(event: PointerEvent, part: PartHit, choose: (part: PartHit) => void, click: (() => void) | null = null): boolean {
  if (event.button !== 0 || event.shiftKey || event.altKey || event.detail > 1 || session) return false;
  const state = studioStore.getState();
  if (state.tool !== "select" || state.presenting || !canEdit(state)) return false;
  const item = dataItemOfPart(part);
  if (!item || item.slot.form === "object") return false;
  const element = item.part.element;
  if (!(element instanceof HTMLElement) || !element.isConnected) return false;
  const start = { x: event.clientX, y: event.clientY };
  session = { item, click, choose, element, saved: "", start, pointer: start, dragging: false, refusal: null, place: null, rects: [] };
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onCancel, true);
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("blur", onCancel);
  return true;
}

/** True while a data item drag is under way. */
export const isDraggingItem = () => Boolean(session?.dragging);
