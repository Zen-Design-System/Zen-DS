import { useCallback, useContext, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../../components/Icon";
import { Popover, useAnchoredPosition, type PopoverItemData } from "../../../components/Popover";
import { gapValue, paddingValue, type ZenGap, type ZenPadding } from "../../../components/_shared/scale";
import { typographyStyles } from "../../../tokens/typography.generated";
import { applyEdit, parseSrc, studioApi, useStudioServer } from "../api";
import { canvasApi } from "../canvas/viewport";
import { inspectorStatus, undoShortcut } from "../inspector/status";
import { ChromePortalContext, ChromeScope } from "../shell/ChromeScope";
import { canEdit, studioStore, useStudio } from "../store";
import type { EditOp, SourceElement } from "../types";
import { onSourceUpdate } from "./picker";
import { liveSrc, noteEditTarget } from "./remap";
import { areaLabel, areaState, dragProp, fitColumn, freeLabel, spacingWords, tokenPx, type AreaState, type Box, type SpacingArea, type SpacingOwner } from "./spacing";
import { breakpointOf, primaryBreakpointOf } from "./gridTracks";
import { responsiveOps } from "../inspector/responsiveModel";
import { DRAG_LAYOUTS, DRAG_START, dragAxis, draggedPx, everySide, nearestStep, previewProperties } from "./spacingDrag";
import { useSpacingHover } from "./spacingHover";
import { tokenName } from "../inspector/controls/scale";
import { propLabel } from "../inspector/propSchema";

/*
 * The selected layout's padding and gap areas on the canvas (Figma-like). Each area is tinted; above the capture layer
 * it takes the pointer: hover shows its token ("gap · md · 16"), a click opens the spacing scale right there and writes
 * the choice to the source (setProp / removeProp through applyEdit). Alt+click on a padding edits `padding` on every
 * side. A value bound to an expression or a spread shows a read-only note; Viewer, or no writable dev server, gets the
 * label only. The areas are not tab stops: keyboard users edit spacing in the inspector's Layout section.
 * A Grid column wider than its only item shows its free space ("column 1 · 80 free", only where the source sizes that
 * column in px): a click offers Fit column to content, which writes the column at the item's width.
 * A spacing field hovered or focused in the inspector (spacingHover) emphasises the areas its prop sets, labelled with
 * the step it names; a 0 side or gap (`none`) is a thin band that shows only while hovered (spacing.ts ZERO_BAND).
 * An auto layout frame's (Stack, Grid) gap and padding also drag, as Figma's handles: hovered, the area turns Figma's
 * pink with a handle at its centre; a press that moves DRAG_START px drags the length (spacingDrag.ts), snapped to the
 * prop's token ladder and previewed on the frame, the pill naming the variable ("Gap · 2XLarge · 40"); the release
 * writes once (one ⌘Z), Escape cancels. ⇧ (or ⇧⌥) held sets `padding` on every side; ⌥ and a plain drag set the side's
 * own prop, which in Zen is both opposite sides. A press that does not move is a click (the scale opens on release).
 */

type Props = {
  areas: SpacingArea[];
  owner: SpacingOwner | null;
  /** Select tool, not presenting: the areas take the pointer. */
  interactive: boolean;
  viewport: HTMLElement | null;
  /** A press the areas do not use (⌘/Ctrl/Shift, read-only areas) goes to the capture layer's selection logic. */
  onPassPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPassPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  /** A double-click on a read-only area drills in as it would on the canvas. */
  onPassDoubleClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  /** A right-click on an area opens the canvas menu as it would on the canvas: the gap and padding are the owner's. */
  onPassContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => void;
  /** A drag's preview moved the frame's layout: the overlay measures the areas again. */
  onPreview: () => void;
};

/**
 * A press on a draggable area (an auto layout frame's gap or padding): a drag once it moved DRAG_START px, else a click.
 * `plain` is the area as a plain or ⌥ drag sets it, `every` as ⇧ sets every side (null: not a padding, or bound).
 */
type Press = {
  pointerId: number; index: number; area: SpacingArea; owner: SpacingOwner; host: HTMLElement;
  start: { x: number; y: number }; last: { x: number; y: number; shift: boolean; alt: boolean };
  scale: number; axis: "x" | "y"; sign: 1 | -1; plain: AreaState; every: AreaState | null;
  /** The press itself: a ⇧ click that never moved goes on to the canvas's selection logic on release. */
  down: ReactPointerEvent<HTMLDivElement>; captor: HTMLElement; root: DOMRect | null;
  active: boolean; step: { key: string; px: number } | null; all: boolean;
  /** Inline values the preview replaced on the host (CSS property → value, "" when none was set). */
  saved: Map<string, string>;
};

/** What the canvas shows of a drag: the area dragged, the prop it sets and the step reached. */
type DragView = { index: number; kind: SpacingArea["kind"]; side: SpacingArea["side"]; axis: "x" | "y"; prop: string; key: string; px: number; all: boolean };

/** A step as its prop's value on the frame ("var(--zen-spacing-gap-large)", "0"). */
const stepValue = (prop: string, key: string) => (/gap/i.test(prop) ? gapValue(key as ZenGap) : paddingValue(key as ZenPadding)) ?? "0px";

/** The open picker (or read-only note): which area, which prop, and a small anchor box inside the area (at the click). */
type OpenState = { src: string; index: number; kind: SpacingArea["kind"]; side: SpacingArea["side"]; prop: string; alt: boolean; mode: "picker" | "note" | "fit"; area: Box; anchor: Box };

const RESET = "__reset";
const FIT = "__fit";
const ANCHOR = 16;

const formatPx = (px: number) => (Number.isInteger(px) ? String(px) : px.toFixed(1));
const boxStyle = (box: Box) => ({ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h });

/** The owner's JSX element as the dev server reads it, refreshed after source updates, undo and redo. */
function useOwnerSource(src: string | null, enabled: boolean): SourceElement | null {
  const [read, setRead] = useState<{ src: string; element: SourceElement | null } | null>(null);
  const [version, setVersion] = useState(0);
  const undo = useStudio((state) => state.undo.length);
  const redo = useStudio((state) => state.redo.length);
  useEffect(() => onSourceUpdate(() => setVersion((value) => value + 1)), []);
  useEffect(() => {
    const parsed = enabled && src ? parseSrc(src) : null;
    if (!parsed || !src) return undefined;
    // Right after a write (an undo, a slot Clear) the canvas still shows the render before it, so a `src` read from it
    // may name a place the file no longer has (GET /element 404 on a cleared host): it is read where the write put it.
    const live = liveSrc(src);
    const at = live ? parseSrc(live) : null;
    if (!at) return undefined;
    let alive = true;
    void studioApi.element(at.file, at.loc).then((element) => { if (alive) setRead({ src, element }); });
    return () => { alive = false; };
  }, [src, enabled, version, undo, redo]);
  return read && read.src === src ? read.element : null;
}

export function SpacingLayer({ areas: measured, owner, interactive, viewport, onPassPointerDown, onPassPointerMove, onPassDoubleClick, onPassContextMenu, onPreview }: Props) {
  const role = useStudio((state) => state.role);
  const server = useStudioServer();
  const writable = canEdit() && role === "admin" && server.writable;
  const chromePortal = useContext(ChromePortalContext);
  const element = useOwnerSource(owner?.src ?? null, Boolean(owner?.editable));
  const attributes = element && owner && element.name === owner.name ? element.attributes : null;
  // Free space shows only where Fit column to content can write the column (the source sizes it in px).
  const areas = useMemo(() => (owner ? measured.filter((area) => area.kind !== "free" || fitColumn(area, owner, attributes)) : measured), [measured, owner, attributes]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [alt, setAlt] = useState(false);
  const [open, setOpen] = useState<OpenState | null>(null);
  const fieldHover = useSpacingHover();
  const anchorRef = useRef<HTMLDivElement>(null);
  const src = owner?.src ?? null;
  const [drag, setDrag] = useState<DragView | null>(null);
  const pressRef = useRef<Press | null>(null);
  const stopListening = useRef<() => void>(() => undefined);
  /** A preview held after its write until the re-render shows the new step (or 3 s). */
  const heldRef = useRef<(() => void) | null>(null);
  const previewRef = useRef(onPreview);
  previewRef.current = onPreview;

  const close = useCallback((focusCanvas = false) => {
    setOpen(null);
    if (focusCanvas) viewport?.focus({ preventScroll: true });
  }, [viewport]);

  /** Puts back the host's inline values the preview replaced. */
  const restorePreview = useCallback((press: Press) => {
    for (const [property, value] of press.saved) {
      if (value) press.host.style.setProperty(property, value);
      else press.host.style.removeProperty(property);
    }
    press.saved.clear();
    previewRef.current();
  }, []);

  const releaseHeld = useCallback(() => {
    const release = heldRef.current;
    heldRef.current = null;
    release?.();
  }, []);

  /** Keeps the preview until Vite re-rendered the write (or 3 s), so the frame never jumps back in between. */
  const holdPreview = useCallback((press: Press) => {
    releaseHeld();
    let frame = 0;
    const clear = () => {
      off();
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      restorePreview(press);
      if (heldRef.current === clear) heldRef.current = null;
    };
    const off = onSourceUpdate(() => { frame = requestAnimationFrame(() => { frame = requestAnimationFrame(clear); }); });
    const timer = window.setTimeout(clear, 3000);
    heldRef.current = clear;
  }, [releaseHeld, restorePreview]);

  /** Ends a press: the listeners and the pill go, the preview stays only when its write is on its way. */
  const finish = useCallback((keepPreview: boolean) => {
    const press = pressRef.current;
    pressRef.current = null;
    stopListening.current();
    stopListening.current = () => undefined;
    setDrag(null);
    if (!press) return null;
    try { if (press.captor.hasPointerCapture(press.pointerId)) press.captor.releasePointerCapture(press.pointerId); } catch { /* already released */ }
    if (keepPreview) holdPreview(press);
    else restorePreview(press);
    return press;
  }, [holdPreview, restorePreview]);

  // A new selection, another tool, a pan or zoom: the picker and the hover go away (a drag is cancelled, nothing written).
  useEffect(() => { setHovered(null); setOpen(null); if (pressRef.current) finish(false); }, [src, interactive, finish]);
  useEffect(() => () => { if (pressRef.current) finish(false); releaseHeld(); }, [finish, releaseHeld]);
  useEffect(() => (open ? canvasApi.onChange(() => setOpen(null)) : undefined), [open]);

  // Alt pressed or released while hovering an area: the label follows (padding on every side).
  useEffect(() => {
    if (hovered === null) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Alt") setAlt(event.type === "keydown"); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey); };
  }, [hovered]);

  // The open area as rendered now (it follows scrolling and re-renders), else where it was when opened.
  const openArea = open && open.src === src ? areas[open.index] : undefined;
  const liveArea = openArea && open && openArea.kind === open.kind && openArea.side === open.side ? openArea : null;
  const anchor: Box | null = open ? (liveArea ? { ...open.anchor, x: liveArea.x + (open.anchor.x - open.area.x), y: liveArea.y + (open.anchor.y - open.area.y) } : open.anchor) : null;
  const openState: AreaState | null = useMemo(() => {
    if (!open || !owner || open.src !== owner.src || open.mode === "fit") return null;
    const area = liveArea ?? areas.find((candidate) => candidate.kind === open.kind && candidate.side === open.side) ?? null;
    return area ? areaState(area, owner, attributes, open.alt) : null;
  }, [open, owner, liveArea, areas, attributes]);
  const openScale = (liveArea ?? (open ? areas.find((candidate) => candidate.kind === open.kind && candidate.side === open.side) : undefined))?.scale ?? "gap";

  /** Writes `ops` on the owner; true when the file changed. */
  const writeOps = useCallback(async (ops: EditOp[], label: string): Promise<boolean> => {
    const parsed = owner ? parseSrc(owner.src) : null;
    if (!parsed || !owner) return false;
    const done = noteEditTarget(`${parsed.file}:${parsed.loc}`);
    try {
      // Read the element again: the write carries the file's current hash, and a moved element is never written.
      const fresh = await studioApi.element(parsed.file, parsed.loc);
      if (!fresh || fresh.name !== owner.name) {
        inspectorStatus.set("negative", `${owner.name} moved before the change was saved; nothing was written`);
        return false;
      }
      // A per-breakpoint prop (or a frame narrower than desktop) writes the frame breakpoint's key (responsiveModel.ts).
      const breakpoint = breakpointOf(owner.host);
      const primary = primaryBreakpointOf(owner.host);
      const planned = responsiveOps(ops, { component: fresh.name, attributes: fresh.attributes, breakpoint, primary });
      const response = await applyEdit({ file: parsed.file, loc: parsed.loc, name: fresh.name, ops: planned, hash: fresh.hash }, breakpoint === primary ? label : `${label} on ${breakpoint[0].toUpperCase()}${breakpoint.slice(1)}`);
      return response.ok && response.before !== response.after;
    } finally {
      done();
    }
  }, [owner]);

  // The open free area's fix (Fit column to content), as the source reads now.
  const openFit = useMemo(() => {
    if (!open || open.mode !== "fit" || !owner || open.src !== owner.src) return null;
    return liveArea ? fitColumn(liveArea, owner, attributes) : null;
  }, [open, owner, liveArea, attributes]);

  const choose = useCallback((item: PopoverItemData) => {
    if (open?.mode === "fit") {
      close(true);
      if (item.id === FIT && openFit && owner) void writeOps(openFit.ops, openFit.label);
      return;
    }
    if (!open || !openState || !owner) return;
    const prop = open.prop;
    close(true);
    if (item.id === RESET) {
      void writeOps([{ op: "removeProp", name: prop }], `${owner.name} reset ${spacingWords(prop)}`);
      return;
    }
    // The step it already has (written, or the default it shows) is no change.
    if (!openState.clears.length && !openState.mixed && item.id === openState.key) return;
    // Alt: `padding` on every side, so the side props written beside it are removed in the same edit (one undo step).
    const ops: EditOp[] = [{ op: "setProp", name: prop, value: { kind: "string", value: item.id } }, ...openState.clears.map((name): EditOp => ({ op: "removeProp", name }))];
    // Figma's words in the undo line ("Undid “Stack Gap → XLarge”"), never the code's "gap → xl".
    const label = `${owner.name} ${spacingWords(prop)} → ${tokenName(item.id, openScale)}${openState.clears.length ? " (all sides)" : ""}`;
    void writeOps(ops, label);
  }, [open, openState, openFit, owner, openScale, close, writeOps]);

  const onPickerKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" && event.key !== "Tab") return;
    // Escape (and Tab out of the list) closes it and gives the canvas its focus back; no parent selection step.
    event.preventDefault();
    event.stopPropagation();
    close(true);
  }, [close]);

  /** Opens the area's scale (or its note, or Fit column to content) at a point of the overlay. */
  const openAt = (index: number, area: SpacingArea, state: AreaState, alt: boolean, pointX: number, pointY: number) => {
    if (!owner) return;
    if (open && open.src === owner.src && open.index === index && open.prop === (area.kind === "free" ? "columns" : state.prop)) return;
    const w = Math.min(ANCHOR, area.w);
    const h = Math.min(ANCHOR, area.h);
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));
    const anchorBox = { x: clamp(pointX - w / 2, area.x, area.x + area.w - w), y: clamp(pointY - h / 2, area.y, area.y + area.h - h), w, h };
    const mode = area.kind === "free" ? "fit" : state.bound ? "note" : "picker";
    setOpen({ src: owner.src, index, kind: area.kind, side: area.side, prop: area.kind === "free" ? "columns" : state.prop!, alt, mode, area: { x: area.x, y: area.y, w: area.w, h: area.h }, anchor: anchorBox });
  };

  /** Previews `key` of `prop` on the frame (the previous preview goes first: ⇧ let go is back to one axis). */
  const previewStep = (press: Press, prop: string, key: string) => {
    const style = press.host.style;
    for (const [property, value] of press.saved) {
      if (value) style.setProperty(property, value);
      else style.removeProperty(property);
    }
    press.saved.clear();
    for (const property of previewProperties(prop)) {
      press.saved.set(property, style.getPropertyValue(property));
      style.setProperty(property, stepValue(prop, key));
    }
    previewRef.current();
  };

  /** The pointer at `x`, `y` with ⇧ / ⌥ as held: past DRAG_START the press drags, to the nearest step of the ladder. */
  const dragTo = (press: Press, x: number, y: number, shift: boolean, alt: boolean) => {
    press.last = { x, y, shift, alt };
    if (!press.active) {
      if (Math.max(Math.abs(x - press.start.x), Math.abs(y - press.start.y)) < DRAG_START) return;
      press.active = true;
      setOpen(null);
      setHovered(null);
    }
    const all = Boolean(press.every) && everySide({ shift, alt });
    const state = all && press.every ? press.every : press.plain;
    const prop = state.prop;
    if (!prop) return;
    const travel = press.axis === "x" ? x - press.start.x : y - press.start.y;
    const step = nearestStep(state.options, draggedPx(press.area.px, travel, press.sign, press.scale));
    if (!step) return;
    if (!press.step || press.step.key !== step.key || press.all !== all) previewStep(press, prop, step.key);
    press.step = step;
    press.all = all;
    setDrag({ index: press.index, kind: press.area.kind, side: press.area.side, axis: press.axis, prop, key: step.key, px: step.px, all });
  };

  /** The release: a press that never moved is a click (the scale opens; ⇧ goes on to the selection), a drag writes once. */
  const release = async (press: Press) => {
    if (!press.active) {
      finish(false);
      if (press.down.shiftKey) {
        onPassPointerDown(press.down);
        return;
      }
      const state = areaState(press.area, press.owner, attributes, press.down.altKey);
      openAt(press.index, press.area, state, press.down.altKey, press.start.x - (press.root?.left ?? 0), press.start.y - (press.root?.top ?? 0));
      return;
    }
    const state = press.all && press.every ? press.every : press.plain;
    const step = press.step;
    const prop = state.prop;
    // The step it already has (written, or the default it shows) is no change.
    if (!step || !prop || (step.key === state.key && !state.clears.length && !state.mixed)) {
      finish(false);
      return;
    }
    // ⇧: `padding` on every side, so the side props written beside it are removed in the same edit (one undo step).
    const ops: EditOp[] = [{ op: "setProp", name: prop, value: { kind: "string", value: step.key } }, ...state.clears.map((name): EditOp => ({ op: "removeProp", name }))];
    const name = tokenName(step.key, press.area.scale);
    finish(true);
    const written = await writeOps(ops, `${press.owner.name} ${spacingWords(prop)} → ${name}${state.clears.length ? " (all sides)" : ""}`);
    if (!written) {
      releaseHeld();
      return;
    }
    // The status line names the variable as Figma does ("Gap 2XLarge"), with its length here.
    inspectorStatus.set("positive", `${spacingWords(prop)} ${name} · ${formatPx(step.px)} · ${undoShortcut} to undo`);
  };

  /** A press on an auto layout frame's gap or padding: listens until the release (or Escape, a cancel, a blur). */
  const startPress = (event: ReactPointerEvent<HTMLDivElement>, index: number, area: SpacingArea, plain: AreaState) => {
    if (!owner || area.kind === "free" || !(owner.host instanceof HTMLElement)) return;
    releaseHeld();
    const host = owner.host;
    const { axis, sign } = dragAxis(area.kind, area.side);
    const every = area.kind === "padding" ? areaState(area, owner, attributes, true) : null;
    const captor = event.currentTarget;
    const pointerId = event.pointerId;
    try { captor.setPointerCapture(pointerId); } catch { /* the pointer may already be gone */ }
    const press: Press = {
      pointerId, index, area, owner, host, captor, down: event, root: captor.parentElement?.getBoundingClientRect() ?? null,
      start: { x: event.clientX, y: event.clientY }, last: { x: event.clientX, y: event.clientY, shift: event.shiftKey, alt: event.altKey },
      scale: host.offsetWidth ? host.getBoundingClientRect().width / host.offsetWidth || 1 : 1, axis, sign, plain,
      every: every?.prop && !every.bound ? every : null, active: false, step: null, all: false, saved: new Map(),
    };
    pressRef.current = press;
    const onMove = (move: PointerEvent) => { if (move.pointerId === pointerId) dragTo(press, move.clientX, move.clientY, move.shiftKey, move.altKey); };
    const onUp = (up: PointerEvent) => {
      if (up.pointerId !== pointerId) return;
      dragTo(press, up.clientX, up.clientY, up.shiftKey, up.altKey);
      void release(press);
    };
    const onCancel = (cancel: PointerEvent) => { if (cancel.pointerId === pointerId) finish(false); };
    const onKey = (key: KeyboardEvent) => {
      if (pressRef.current !== press) return;
      if (key.key === "Escape" && key.type === "keydown") {
        // Escape cancels the drag only (no parent selection step); nothing is written.
        key.preventDefault();
        key.stopPropagation();
        finish(false);
      } else if ((key.key === "Shift" || key.key === "Alt") && press.active) {
        // ⇧ / ⌥ pressed or let go mid-drag (Figma reads them while dragging).
        key.preventDefault();
        dragTo(press, press.last.x, press.last.y, key.shiftKey, key.altKey);
      }
    };
    const onBlur = () => finish(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    window.addEventListener("blur", onBlur);
    stopListening.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      window.removeEventListener("blur", onBlur);
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>, index: number) => {
    const area = areas[index];
    if (event.button !== 0 || !area || !owner) return;
    // The second press of a double-click goes on into the layer under the pointer, as Figma's double-click always does
    // (a 0 gap's band lies over its neighbours' edges): the picker the first press opened closes.
    if (event.detail >= 2) {
      if (open) close();
      onPassPointerDown(event);
      return;
    }
    const fit = area.kind === "free" ? fitColumn(area, owner, attributes) : null;
    const state = areaState(area, owner, attributes, event.altKey);
    const usable = writable && interactive && Boolean(attributes) && (area.kind === "free" ? Boolean(fit) : Boolean(state.prop));
    // An auto layout frame's gap or padding drags (⇧ held too: Figma's every side); a click on it still opens the scale.
    const plain = usable && area.kind !== "free" && DRAG_LAYOUTS.has(owner.name) && !event.metaKey && !event.ctrlKey ? areaState(area, owner, attributes, false) : null;
    const draggable = Boolean(plain?.prop && !plain.bound);
    if (!usable || event.metaKey || event.ctrlKey || (event.shiftKey && !draggable)) {
      onPassPointerDown(event);
      return;
    }
    // The press is the area's: no selection change, no pan, no light dismiss of the picker it opens.
    event.preventDefault();
    event.stopPropagation();
    if (draggable && plain) {
      startPress(event, index, area, plain);
      return;
    }
    const root = event.currentTarget.parentElement?.getBoundingClientRect();
    openAt(index, area, state, event.altKey, event.clientX - (root?.left ?? 0), event.clientY - (root?.top ?? 0));
  };

  if (!areas.length || !owner) return null;
  // The inspector's hovered spacing field: the areas its prop sets (a side prop, or `padding` on every side via Alt).
  const emphasis = fieldHover && fieldHover.src === owner.src ? fieldHover : null;
  const emphasised = (area: SpacingArea) => Boolean(emphasis && area.kind !== "free" && (area.props.includes(emphasis.prop) || area.altProp === emphasis.prop));
  const fieldArea = emphasis && hovered === null && !open ? areas.find(emphasised) : undefined;
  // A drag: the area dragged as rendered now (the preview re-lays the frame out), and every area its prop sets.
  const dragArea = drag ? (areas[drag.index]?.kind === drag.kind && areas[drag.index]?.side === drag.side ? areas[drag.index] : areas.find((area) => area.kind === drag.kind && area.side === drag.side)) : undefined;
  const dragged = (area: SpacingArea) => Boolean(drag && area.kind === drag.kind && (drag.all || area.props.includes(drag.prop)));
  // The axis an area drags along: an auto layout frame's gap or padding the source writes as a step.
  const dragAxisOf = (area: SpacingArea) => (writable && interactive && area.kind !== "free" && DRAG_LAYOUTS.has(owner.name) && dragProp(area, owner, attributes) ? dragAxis(area.kind, area.side).axis : undefined);
  const pillArea = drag ? dragArea : hovered !== null && !(open && open.index === hovered) ? areas[hovered] : fieldArea;
  const pillState = pillArea && !drag ? areaState(pillArea, owner, attributes, alt) : null;
  const pillText = drag
    ? [spacingWords(drag.prop), tokenName(drag.key, dragArea?.scale ?? "gap"), formatPx(drag.px)].join(" · ")
    : pillArea === fieldArea && fieldArea && emphasis
      ? fieldLabel(fieldArea, owner, emphasis.prop, emphasis.key ?? null, pillState)
      : pillArea && pillState ? (pillArea.kind === "free" ? freeLabel(pillArea) : areaLabel(pillArea, pillState)) : null;
  const pillAxis = pillArea ? (drag ? drag.axis : dragAxisOf(pillArea)) : undefined;
  // Figma's variable pill on an auto layout frame: the hexagon before a value that is a token step (a drag lands on one).
  const pillVariable = Boolean(pillAxis && (drag || (pillState?.key && !pillState.mixed)));
  // The handle at the centre of the hovered (or dragged) area of an auto layout frame.
  const handleArea = drag ? dragArea : hovered !== null && !(open && open.index === hovered) && areas[hovered] && dragAxisOf(areas[hovered]) ? areas[hovered] : undefined;
  const openIndex = open && open.src === owner.src ? open.index : null;

  const items: PopoverItemData[] = openState && open?.mode === "picker" ? [
    ...openState.options.map((option) => ({
      id: option.key,
      label: (
        <span className="studio-spacing__option">
          <span>{tokenName(option.key, openScale)}</span>
          <span className={`studio-spacing__px ${typographyStyles["Body/Small/Regular"]}`}>{option.px === null ? "" : ` ${formatPx(option.px)}px`}</span>
        </span>
      ),
      selected: option.key === openState.key,
    })),
    ...(openState.value?.state === "literal" ? [{ id: RESET, label: "Reset to default" }] : []),
  ] : openFit && open?.mode === "fit" ? [{
    id: FIT,
    label: (
      <span className="studio-spacing__option">
        <span>Fit column to content</span>
        <span className={`studio-spacing__px ${typographyStyles["Body/Small/Regular"]}`}>{` ${formatPx(openFit.px)}px`}</span>
      </span>
    ),
  }] : [];

  return (
    <>
      {areas.map((area, index) => (
        <div
          key={`t${index}`}
          className={area.kind === "gap" ? "studio-selection__gap" : area.kind === "free" ? "studio-selection__free" : "studio-selection__padding"}
          data-hover={(!drag && hovered === index) || openIndex === index || dragged(area) ? "true" : undefined}
          data-drag={dragAxisOf(area)}
          data-zero={area.zero ? "true" : undefined}
          data-emphasis={emphasised(area) ? "true" : undefined}
          style={boxStyle(area)}
        />
      ))}
      {interactive ? areas.map((area, index) => (
        <div
          key={`h${index}`}
          className="studio-selection__spacing-hit"
          data-editable={writable && owner.editable && (area.props.length || area.kind === "free") ? "true" : undefined}
          data-drag={dragAxisOf(area)}
          style={boxStyle(area)}
          onPointerEnter={(event) => { setHovered(index); setAlt(event.altKey); }}
          onPointerLeave={() => setHovered((current) => (current === index ? null : current))}
          onPointerMove={(event) => { if (event.altKey !== alt) setAlt(event.altKey); onPassPointerMove(event); }}
          onPointerDown={(event) => onPointerDown(event, index)}
          onDoubleClick={onPassDoubleClick}
          onContextMenu={onPassContextMenu}
        />
      )) : null}
      {handleArea && pillAxis ? <span className="studio-selection__spacing-handle" data-axis={pillAxis} style={{ transform: `translate(${handleArea.x + handleArea.w / 2}px, ${handleArea.y + handleArea.h / 2}px) translate(-50%, -50%)` }} /> : null}
      {pillArea && pillText ? (
        <span className={`studio-selection__spacing-label ${typographyStyles["Caption/Medium"]}`} data-drag={pillAxis} style={{ transform: `translate(${pillArea.x + pillArea.w / 2}px, ${pillArea.y + pillArea.h / 2}px) translate(-50%, -50%)` }}>
          {pillVariable ? <Icon name="icon-hexagon-01-line" size={12} decorative /> : null}
          {pillText}
        </span>
      ) : null}
      {/* While dragging: the resize cursor everywhere and no hover underneath (window listeners follow the pointer). */}
      {drag ? <div className="studio-selection__spacing-cover" data-axis={drag.axis} /> : null}
      {anchor ? <div ref={anchorRef} className="studio-selection__spacing-anchor" style={boxStyle(anchor)} /> : null}
      {open && (openState || openFit) && anchor && chromePortal ? createPortal(
        <ChromeScope className="studio-spacing-scope">
          {open.mode === "fit" && openFit ? (
            <Popover
              open
              onOpenChange={(next) => { if (!next) close(); }}
              anchorRef={anchorRef}
              className="studio-spacing-picker"
              label={`${owner.name} · column ${(liveArea?.column?.index ?? 0) + 1}`}
              items={items}
              autoFocus
              onSelect={choose}
              onKeyDown={onPickerKeyDown}
            />
          ) : open.mode === "picker" && openState ? (
            <Popover
              open
              onOpenChange={(next) => { if (!next) close(); }}
              anchorRef={anchorRef}
              className="studio-spacing-picker"
              label={`${owner.name} · ${propLabel(open.prop, owner.name)}${openState.clears.length || (open.alt && openState.mixed) ? " (all sides)" : ""}`}
              items={items}
              autoFocus
              onSelect={choose}
              onKeyDown={onPickerKeyDown}
            />
          ) : openState ? (
            <SpacingNote owner={owner} state={openState} anchorRef={anchorRef} onClose={close} />
          ) : null}
        </ChromeScope>,
        chromePortal,
      ) : null}
    </>
  );
}

/** The pill for an inspector field's hover: "gap · lg · 24" for the step it names, else the area as it is now. */
function fieldLabel(area: SpacingArea, owner: SpacingOwner, prop: string, key: string | null, state: AreaState | null): string | null {
  if (!key) return state ? areaLabel(area, state) : null;
  const px = tokenPx(owner.host, area.scale, key);
  return [spacingWords(prop), tokenName(key, area.scale), px === null ? null : formatPx(px)].filter(Boolean).join(" · ");
}

/** A bound value: what the source passes, instead of the picker. Escape or a press elsewhere closes it. */
function SpacingNote({ owner, state, anchorRef, onClose }: { owner: SpacingOwner; state: AreaState; anchorRef: RefObject<HTMLDivElement | null>; onClose: (focusCanvas?: boolean) => void }) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const placement = useAnchoredPosition(surfaceRef, true, { anchor: () => anchorRef.current });
  const inPlayground = studioStore.getState().selection?.kind === "node" && Boolean((studioStore.getState().selection as { panelId?: string | null }).panelId);
  useEffect(() => {
    const onDown = (event: PointerEvent) => { if (!surfaceRef.current?.contains(event.target as Node)) onClose(); };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
    };
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("pointerdown", onDown, true); window.removeEventListener("keydown", onKey, true); };
  }, [onClose]);
  const prop = state.boundBy?.prop ?? state.prop ?? "";
  // One line in design words (UX review 2026-10-27 §6 #28): the property's Figma name, no expression, no "source".
  return (
    <div ref={surfaceRef} className="studio-spacing-note" role="status" style={placement.style} data-side={placement.side}>
      <p className={typographyStyles["Body/Small/Medium"]}>
        {`${owner.name} · ${propLabel(prop, owner.name)} is set in code${inPlayground ? "" : " — change it in the Code tab"}`}
      </p>
      {inPlayground ? (
        <p className={`studio-spacing-note__hint ${typographyStyles["Caption/Regular"]}`}>Change it with the Playground properties.</p>
      ) : null}
    </div>
  );
}
