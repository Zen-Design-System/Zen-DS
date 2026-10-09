import { useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "../../../components/Button";
import { typographyStyles } from "../../../tokens/typography.generated";
import { parseSrc, studioApi } from "../api";
import { canvasApi } from "../canvas/viewport";
import { onSourceUpdate, rectOf, type FiberHit } from "../select/picker";
import { ChromePortalContext, ChromeScope } from "../shell/ChromeScope";
import { canEdit, studioStore, useStudio } from "../store";
import type { SourceElement, StudioSelection } from "../types";
import { canStructurallyEdit, editDataItem, inPlayground, slotPickerRequests, useSlotRunning, useSlotServer } from "./actions";
import { slotContentOf } from "./content";
import { itemParts, sourceItems } from "./dataItems";
import { dataSlotOf, dataSlotsOf } from "./dataSlots";
import { containerOf, hostRootOf, isConcealed, selectedHit } from "./dom";
import { InsertPicker } from "./InsertPicker";
import { activeSlotsOf, isLayoutPrimitive, slotContentElements, slotFlowOf, slotGhostAnchor, slotOf, type ContentSlot, type HostProps } from "./registry";
import "./slots.css";

/*
 * Slots on the canvas (spec "Client", SlotLayer; Figma: selecting a slot component outlines each slot, dashed, and an
 * empty slot shows a "+"). For the selected instance: each active slot outlined dashed in Border/Accent/Solid with its
 * name, and a + chip on the slot's end edge (the bottom of a column, the right of a row) that opens the insert picker.
 * A slot that renders nothing while empty gets a thin ghost where its content would go (after its anchor, or at the
 * component's edge). In a playground the docs' empty slot (.platform-slot) is tagged "{Name} · empty".
 *
 * Drawn in canvas-viewport coordinates like SelectionLayer, re-measured on pan/zoom, scrolling inside frames, resizes,
 * DOM changes and source updates. The selected instance and its component root are found once (a walk over every
 * frame's fibers) and kept until the selection, the source or the DOM changes: pan, zoom and scrolling only read the
 * rects again. Overlays rendered in the page portal (a modal Dialog, ModalForm, SidePanel) sit above
 * the canvas: their slots are edited from the inspector's Slots section. The chips are pointer-only (the inspector's
 * "Add to {Slot}" is the keyboard path), like the resize handles.
 * A data slot (dataSlots.ts: TopNavigation's Top-Trailing, whose items the code writes as objects) is outlined around the
 * items it draws, with its name, and its + chip adds an item (editDataItem "add", as the Slots section's +); an empty
 * list slot shows a ghost at the component's end edge. A slot at its most items (`max`) offers no chip.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;
type Box = { x: number; y: number; w: number; h: number };
/** One slot of the selected instance: its outline (none for a layout primitive: the selection outline is it) and chip point. */
/** `tagBelow`: a ghost just below its anchor names itself under the strip, not over the anchor (TopNavigation's title).
 *  `tagEnd`: a narrow ghost at the end of a row ends its tag at its right edge, over the row, not past the component. */
/** `data`: a data slot's mark (its chip adds an item instead of opening the insert picker); `count`: items it holds. */
type SlotMark = Box & { prop: string; tag: string; ghost: boolean; outline: boolean; chip: { x: number; y: number } | null; tagBelow?: boolean; tagEnd?: boolean; data?: boolean; count?: number };
type Marks = { src: string; slots: SlotMark[]; playground: Array<Box & { tag: string }> };

const EMPTY: Marks = { src: "", slots: [], playground: [] };
/** Thickness (screen px) of a ghost: where an empty slot that renders nothing would show its content. */
const GHOST = 16;
/** The + chip (an xs IconButton) in screen px: its centre sits this far past a filled slot's end edge, halved. */
const CHIP = 24;
/** A slot smaller than this (screen px) carries its tag above it, not inside. */
const TAG_ROOM = { w: 72, h: 24 };

const round = (value: number) => Math.round(value * 2) / 2;
const keyOf = (marks: Marks) => JSON.stringify([marks.src, marks.slots.map((m) => [m.prop, m.tag, m.ghost, m.outline, Boolean(m.tagBelow), Boolean(m.tagEnd), round(m.x), round(m.y), round(m.w), round(m.h), m.chip ? [round(m.chip.x), round(m.chip.y)] : null]), marks.playground.map((m) => [m.tag, round(m.x), round(m.y), round(m.w), round(m.h)])]);

/** A ghost beside `base` on the side `place` names: a strip across a column, a bar along a row. */
function ghostAt(base: Box, place: "before" | "after" | "first-child" | "last-child", row: boolean): Box {
  if (row) {
    const x = place === "before" ? base.x - GHOST : place === "after" ? base.x + base.w : place === "first-child" ? base.x : base.x + base.w - GHOST;
    return { x, y: base.y, w: GHOST, h: base.h };
  }
  const y = place === "before" ? base.y - GHOST : place === "after" ? base.y + base.h : place === "first-child" ? base.y : base.y + base.h - GHOST;
  return { x: base.x, y, w: base.w, h: GHOST };
}

/** The selected instance on the canvas and its component root (portals included), as SlotLayer keeps them between frames. */
type Resolved = { key: string; hit: FiberHit | null; root: Element | null };

/** The slot marks of the selected instance (`resolved`), in layer coordinates (`origin`: the layer's client rect). */
function marksFor(selection: NodeSelection, { hit, root: hostRoot }: Resolved, world: Element, origin: DOMRect): Marks {
  if (!hit) return EMPTY;
  const toBox = (rect: DOMRect): Box => ({ x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height });
  if (inPlayground(selection)) {
    // The main component: its slots are the docs' empty markers (PlaygroundSlot renders .platform-slot).
    const markers = hit.hosts.flatMap((host) => [...(host.matches(".platform-slot") ? [host] : []), ...host.querySelectorAll(".platform-slot")]);
    const playground = markers.flatMap((marker) => {
      const rect = rectOf([marker]);
      return rect ? [{ ...toBox(rect), tag: `${marker.textContent?.trim() || "Slot"} · empty` }] : [];
    });
    return { src: selection.src, slots: [], playground };
  }
  const props = hit.props as HostProps;
  const slots = activeSlotsOf(hit.name, props);
  const dataSlots = dataSlotsOf(hit.name);
  const root = slots.length || dataSlots.length ? hostRoot : null;
  // Not on the canvas (closed), or in the page portal above it (a modal overlay): edited from the inspector.
  if (!root || !world.contains(root)) return EMPTY;
  const layout = isLayoutPrimitive(hit.name);
  const marks: SlotMark[] = [];
  for (const slot of dataSlots) {
    const parts = itemParts(hit, slot);
    const drawn = parts.flatMap((part) => (part ? part.hosts : []));
    const rect = drawn.length ? rectOf(drawn) : null;
    let box: Box | null = rect ? toBox(rect) : null;
    // An empty list slot: a ghost at the component's end edge (where TopNavigation draws its trailing actions).
    if (!box && slot.form === "array" && !parts.length) {
      const base = rectOf([root]);
      box = base ? ghostAt(toBox(base), "last-child", true) : null;
    }
    if (!box) continue;
    const count = parts.length;
    const past = CHIP / 2 + 2;
    const chip = !count ? { x: box.x + box.w / 2, y: box.y + box.h / 2 } : { x: box.x + box.w / 2, y: box.y + box.h + past };
    const full = slot.form === "object" ? count > 0 : count >= slot.max;
    marks.push({ ...box, prop: slot.prop, tag: count ? slot.name : `${slot.name} · Empty`, ghost: !count, outline: true, chip: full ? null : chip, data: true, count });
  }
  for (const slot of slots) {
    const row = slotFlowOf(slot, props) === "row";
    const container = containerOf(root, slot);
    if (container && isConcealed(container, root)) continue;
    let box: Box | null = null;
    let ghost = false;
    let tagBelow = false;
    let tagEnd = false;
    let empty = true;
    if (container) {
      const content = slotContentElements(container, slot);
      empty = content.length === 0;
      // A container shared with the component's own parts (ChartCard's header) outlines its slot content only.
      const rect = slot.parts && content.length ? rectOf(content) : rectOf([container]);
      box = rect ? toBox(rect) : null;
      if (box && empty && (row ? box.w < GHOST : box.h < GHOST)) {
        // Mounted but empty, so (nearly) no size: a ghost where the content goes.
        ghost = true;
        box = row ? { ...box, w: GHOST } : { ...box, h: GHOST, w: Math.max(box.w, GHOST) };
      }
    } else {
      ghost = true;
      const anchor = slotGhostAnchor(root, slot);
      const base = rectOf([anchor?.element ?? root]);
      const ghostFlow = anchor?.flow ?? slot.ghostFlow;
      const ghostRow = ghostFlow ? ghostFlow === "row" : row;
      box = base ? ghostAt(toBox(base), anchor?.place ?? "last-child", ghostRow) : null;
      tagBelow = anchor?.place === "after" && !ghostRow;
      tagEnd = ghostRow && (anchor?.place ?? "last-child") !== "before" && anchor?.place !== "first-child";
    }
    if (!box) continue;
    // Empty: the chip sits in the slot (Figma's "+" in an empty slot). Filled: just past its end edge, clear of the content.
    const past = CHIP / 2 + 2;
    const chip = empty ? { x: box.x + box.w / 2, y: box.y + box.h / 2 }
      : row ? { x: box.x + box.w + past, y: box.y + box.h / 2 } : { x: box.x + box.w / 2, y: box.y + box.h + past };
    // A full atom slot (ListItem leading takes one layer) offers no chip on the canvas: the inspector's add still warns.
    const full = slot.max !== undefined && container !== null && slotContentElements(container, slot).length >= slot.max;
    marks.push({ ...box, prop: slot.prop, tag: empty ? `${slot.name} · Empty` : slot.name, ghost, outline: !layout, chip: full ? null : chip, ...(tagBelow ? { tagBelow } : {}), ...(tagEnd ? { tagEnd } : {}) });
  }
  return { src: selection.src, slots: marks, playground: [] };
}

/**
 * A chip on the selection's size pill (ResizeLayer centres it under the layer: a small Box's column slot puts its chip
 * there too) moves just below the pill, so the size stays readable.
 */
function clearOfPill(marks: Marks, viewport: Element | null, origin: DOMRect): Marks {
  const rect = viewport?.querySelector(".studio-resize__pill")?.getBoundingClientRect();
  if (!rect?.width) return marks;
  const pill = { x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height };
  const half = CHIP / 2;
  const onPill = (chip: { x: number; y: number }) => chip.x + half > pill.x && chip.x - half < pill.x + pill.w && chip.y + half > pill.y && chip.y - half < pill.y + pill.h;
  if (!marks.slots.some((mark) => mark.chip && onPill(mark.chip))) return marks;
  return { ...marks, slots: marks.slots.map((mark) => (mark.chip && onPill(mark.chip) ? { ...mark, chip: { x: mark.chip.x, y: pill.y + pill.h + 4 + half } } : mark)) };
}

/** The selected element's source while it is a slot host in example content (the picker builds its palette from it). */
function useHostSource(selection: NodeSelection | null, enabled: boolean): SourceElement | null {
  const undo = useStudio((state) => state.undo.length);
  const redo = useStudio((state) => state.redo.length);
  const [version, setVersion] = useState(0);
  const [read, setRead] = useState<{ src: string; element: SourceElement | null } | null>(null);
  const src = enabled && selection ? selection.src : null;
  useEffect(() => onSourceUpdate(() => setVersion((value) => value + 1)), []);
  useEffect(() => {
    const parsed = src ? parseSrc(src) : null;
    if (!parsed || !src) return undefined;
    let alive = true;
    void studioApi.element(parsed.file, parsed.loc).then((element) => { if (alive) setRead({ src, element }); });
    return () => { alive = false; };
  }, [src, version, undo, redo]);
  return read && read.src === src ? read.element : null;
}

type Picker = { src: string; prop: string; anchor: Box; fromChip: boolean };

/** Slot outlines, tags and + chips for the selected instance (mounted in the canvas viewport, after SelectionLayer). */
export function SlotLayer({ viewport, world }: { viewport: HTMLElement | null; world: HTMLElement | null }) {
  const tool = useStudio((state) => state.tool);
  const presenting = useStudio((state) => state.presenting);
  const selection = useStudio((state) => state.selection);
  const role = useStudio((state) => state.role);
  const server = useSlotServer();
  const running = useSlotRunning();
  const chromePortal = useContext(ChromePortalContext);
  const rootRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<Marks>(EMPTY);
  const marksRef = useRef(marks);
  const [picker, setPicker] = useState<Picker | null>(null);
  const frameRequest = useRef(0);
  const settleUntil = useRef(0);
  // The selected instance found by the last full walk; null forces a new one (selection, source or DOM changed).
  const resolvedRef = useRef<Resolved | null>(null);
  const shown = tool === "select" && !presenting;
  const node = selection?.kind === "node" && !selection.part ? selection : null;
  const writable = canEdit() && role === "admin" && server.writable;
  const check = node ? canStructurallyEdit(node) : null;
  const editable = writable && Boolean(check?.ok);
  const hasSlots = Boolean(node && (activeSlotsOf(node.name).length || dataSlotsOf(node.name).length || inPlayground(node)));
  const element = useHostSource(node, shown && editable && hasSlots);

  // Read through a ref: a frame requested before the world mounted must still measure with it (like SelectionLayer).
  const worldRef = useRef(world);
  worldRef.current = world;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const measure = useCallback(() => {
    frameRequest.current = 0;
    const root = rootRef.current;
    const current = studioStore.getState().selection;
    const canvas = worldRef.current;
    let next = EMPTY;
    try {
      if (root && canvas && current?.kind === "node" && !current.part) {
        const key = `${current.src}#${current.instance}`;
        let resolved = resolvedRef.current;
        const gone = (node: Element | null | undefined) => Boolean(node && !node.isConnected);
        if (!resolved || resolved.key !== key || resolved.hit?.hosts.some(gone) || gone(resolved.root)) {
          const hit = selectedHit(current, canvas);
          resolved = { key, hit, root: hit ? hostRootOf(hit) : null };
          resolvedRef.current = resolved;
        }
        const origin = root.getBoundingClientRect();
        next = clearOfPill(marksFor(current, resolved, canvas, origin), viewportRef.current, origin);
      }
    } catch {
      // A node went away mid-measure: nothing this frame.
    }
    if (keyOf(next) !== keyOf(marksRef.current)) {
      marksRef.current = next;
      setMarks(next);
    }
    // Keep following for a moment after a change (CSS transitions, layout settling).
    if (performance.now() < settleUntil.current) frameRequest.current = requestAnimationFrame(measure);
  }, []);

  const schedule = useCallback((settle = 240) => {
    settleUntil.current = Math.max(settleUntil.current, performance.now() + settle);
    if (!frameRequest.current) frameRequest.current = requestAnimationFrame(measure);
  }, [measure]);

  const selectionKey = node ? `${node.src}#${node.instance}` : "";
  useEffect(() => { schedule(600); }, [selectionKey, shown, world, schedule]);
  // A new selection or tool closes the picker.
  useEffect(() => { setPicker(null); }, [selectionKey, shown]);
  // Pan or zoom moves its anchor away: the picker closes, like the spacing picker.
  useEffect(() => (picker ? canvasApi.onChange(() => setPicker(null)) : undefined), [picker]);

  // Re-measure on pan/zoom, scrolling inside frames, resizes, DOM changes (throttled) and source updates.
  useEffect(() => {
    if (!shown) return undefined;
    // Pan, zoom and scrolling move the same nodes: their rects are read again, the instance is not looked up again.
    const offCanvas = canvasApi.onChange(() => schedule(0));
    const offUpdate = onSourceUpdate(() => { resolvedRef.current = null; schedule(600); });
    const onScroll = () => schedule(0);
    const onResize = () => schedule();
    world?.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onResize);
    let mutationTimer = 0;
    const mutations = new MutationObserver(() => {
      if (mutationTimer) return;
      mutationTimer = window.setTimeout(() => { mutationTimer = 0; resolvedRef.current = null; schedule(); }, 150);
    });
    if (world) mutations.observe(world, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "hidden", "open", "inert", "data-state"] });
    const resizes = new ResizeObserver(() => schedule());
    if (viewport) resizes.observe(viewport);
    if (world) resizes.observe(world);
    return () => {
      offCanvas();
      offUpdate();
      world?.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onResize);
      window.clearTimeout(mutationTimer);
      mutations.disconnect();
      resizes.disconnect();
    };
  }, [shown, viewport, world, schedule]);

  useEffect(() => () => {
    // StrictMode re-runs effects: reset the handle so the next schedule() requests a frame again.
    cancelAnimationFrame(frameRequest.current);
    frameRequest.current = 0;
  }, []);

  // "Add to {Slot}…" from the canvas menu: the picker opens at the pointer (else at the slot's chip).
  const request = useSyncExternalStore(slotPickerRequests.subscribe, slotPickerRequests.get, () => null);
  useEffect(() => {
    if (!request) return;
    slotPickerRequests.clear();
    if (!node || request.src !== node.src || !shown) return;
    const origin = rootRef.current?.getBoundingClientRect();
    const mark = marksRef.current.slots.find((candidate) => candidate.prop === request.prop);
    const anchor: Box = request.point && origin ? { x: request.point.x - origin.left, y: request.point.y - origin.top, w: 1, h: 1 }
      : mark?.chip ? { x: mark.chip.x - CHIP / 2, y: mark.chip.y - CHIP / 2, w: CHIP, h: CHIP }
        : { x: 16, y: 16, w: 1, h: 1 };
    setPicker({ src: node.src, prop: request.prop, anchor, fromChip: false });
  }, [request, node, shown]);

  // Which slots take an insert right now (not while the source computes their content, as for a bound prop).
  const insertable = useMemo(() => {
    const out = new Set<string>();
    if (!element || !node || element.name !== node.name) return out;
    for (const slot of activeSlotsOf(element.name)) if (!slotContentOf(element, slot).insertBlock) out.add(slot.prop);
    // A data slot whose items the source writes as a literal (or not at all): the add writes one more.
    for (const slot of dataSlotsOf(element.name)) if (sourceItems(element, slot).state !== "computed") out.add(slot.prop);
    return out;
  }, [element, node]);

  if (!shown || !node) return null;
  const style = (box: Box): CSSProperties => ({ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h });
  const slots = marks.src === node.src ? marks.slots : [];
  const playground = marks.src === node.src ? marks.playground : [];
  const chips = editable && !running && element ? slots.flatMap((mark) => (mark.chip && insertable.has(mark.prop) ? [{ ...mark, chip: mark.chip }] : [])) : [];
  // The open picker's anchor follows its chip while the slot moves (scrolling inside a frame, re-renders).
  const live = picker?.fromChip ? slots.find((mark) => mark.prop === picker.prop) : undefined;
  const anchor = picker ? (live?.chip ? { x: live.chip.x - CHIP / 2, y: live.chip.y - CHIP / 2, w: CHIP, h: CHIP } : picker.anchor) : null;
  const pickerSlot: ContentSlot | null = picker && element ? slotOf(element.name, picker.prop) : null;

  return (
    <ChromeScope className="studio-slots-layer">
      <div ref={rootRef} className="studio-slots__frame">
        {slots.filter((mark) => mark.outline).map((mark) => (
          <div key={mark.prop} className="studio-slots__outline" data-ghost={mark.ghost || undefined} style={style(mark)} aria-hidden="true">
            <span className={`studio-slots__tag ${typographyStyles["Caption/Medium"]}`} data-place={mark.tagBelow ? "below" : mark.w < TAG_ROOM.w || mark.h < TAG_ROOM.h ? "above" : undefined} data-align={mark.tagEnd ? "end" : undefined}>{mark.tag}</span>
          </div>
        ))}
        {playground.map((mark, index) => (
          <div key={`p${index}`} className="studio-slots__outline" style={style(mark)} aria-hidden="true">
            <span className={`studio-slots__tag ${typographyStyles["Caption/Medium"]}`} data-place={mark.w < TAG_ROOM.w || mark.h < TAG_ROOM.h ? "above" : undefined}>{mark.tag}</span>
          </div>
        ))}
        {chips.map((mark) => {
          const data = mark.data ? dataSlotOf(node.name, mark.prop) : null;
          if (data) {
            return (
              <div key={`c${mark.prop}`} className="studio-slots__chip" style={{ transform: `translate(${mark.chip.x}px, ${mark.chip.y}px)` }} onPointerDown={(event) => event.stopPropagation()}>
                {/* zen-allow-filter-button: the data slot's "Add item" chip on the canvas (it adds an item), not a filter or sort control */}
                {/* zen-allow-accent: the add-to-slot chip is promoted so it stands out on any canvas content (user, 2026-10-04) */}
                <IconButton level="accent" size="xs" icon="icon-plus-line" aria-label={`Add ${data.itemName} to ${data.name}`} tabIndex={-1} onClick={() => { void editDataItem(node, data, "add"); }} />
              </div>
            );
          }
          const slot = slotOf(node.name, mark.prop);
          return (
            <div key={`c${mark.prop}`} className="studio-slots__chip" style={{ transform: `translate(${mark.chip.x}px, ${mark.chip.y}px)` }} onPointerDown={(event) => event.stopPropagation()}>
              {/* zen-allow-filter-button: the slot's "Add instances" chip on the canvas (it inserts a component), not a filter or sort control */}
              {/* zen-allow-accent: the add-to-slot chip is promoted so it stands out on any canvas content (user, 2026-10-04) */}
              <IconButton
                level="accent"
                size="xs"
                icon="icon-plus-line"
                aria-label={`Add to ${slot?.name ?? "the slot"}`}
                aria-haspopup="listbox"
                aria-expanded={picker?.prop === mark.prop}
                tabIndex={-1}
                onClick={() => setPicker((current) => (current?.prop === mark.prop ? null : { src: node.src, prop: mark.prop, anchor: { x: mark.chip.x - CHIP / 2, y: mark.chip.y - CHIP / 2, w: CHIP, h: CHIP }, fromChip: true }))}
              />
            </div>
          );
        })}
        {anchor ? <div ref={anchorRef} className="studio-slots__anchor" style={style(anchor)} /> : null}
      </div>
      {picker && pickerSlot && element && anchor && chromePortal ? createPortal(
        <ChromeScope className="studio-slots__picker-scope">
          <InsertPicker
            open
            // Escape (or a press elsewhere) closes it; the canvas takes the focus back from the picker's search.
            onOpenChange={(open) => { if (!open) { setPicker(null); viewport?.focus({ preventScroll: true }); } }}
            anchorRef={anchorRef}
            selection={node}
            element={element}
            slot={pickerSlot}
            onPicked={() => viewport?.focus({ preventScroll: true })}
          />
        </ChromeScope>,
        chromePortal,
      ) : null}
    </ChromeScope>
  );
}
