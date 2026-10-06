import { Fragment, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { typographyStyles } from "../../../tokens/typography.generated";
import { applyEdit, parseSrc, studioApi, subscribeStudioWrites, useStudioServer } from "../api";
import { canvasApi, getViewport } from "../canvas/viewport";
import { componentSchema } from "../inspector/propSchema";
import { inspectorStatus } from "../inspector/status";
import { ChromePortalContext } from "../shell/ChromeScope";
import { canEdit, flushStudioStore, studioStore, useStudio } from "../store";
import type { SourceElement, StudioSelection } from "../types";
import cloning from "../cloning.json";
import { childHits, nameOf, onSourceUpdate, selectionInstances, type FiberHit } from "./picker";
import { expectRender, mapSrc, noteEditTarget, renderedNow, sameSelectedElement } from "./remap";
import { breakpointOf, columnsSource, pxTrack, soleColumn, splitTracks, withTrackPx } from "./gridTracks";
import { axisText, cloneReason, cloningParent, cloningProp, contentWidth, currentMode, layoutParent, lockBound, MIN_SIZE, noCross, pillReason, planHug, planResize, reachesParent, refuseWrap, resizeTarget, snapSize, specimenOnly, stackAxes, stackFill, studioWrapper, withColumn, withoutAxes, withWrapper, wrappedChildLoc, wrapperCandidate, wrapRefusal, type AxisMode, type CloningList, type CrossFits, type ResizeAxis, type ResizePlan, type ResizeTarget } from "./resize";
import type { Box } from "./spacing";

/*
 * Resize handles on the selected element (Figma-like): 4 corner squares and 4 edge strips on its outline (Text and
 * Heading: the left and right edges only). A drag previews the size live (a transient inline size on the DOM node: the
 * component itself, also when the write wraps it in a Stack it fills) with a size pill under it; Shift snaps to 8 px,
 * Escape cancels, release writes once (one applyEdit, one undo step, one draft change). A double-click on a handle sets
 * Hug on its axes. Handles are pointer-only and not in the accessibility tree: the inspector's Layout section is the
 * keyboard path; the outcome of a resize is announced through a live region in the chrome portal.
 * At the press the element's minimum size (a drag stops there) and what it fills (what a wrap keeps) are read with
 * transient inline styles, restored before anything paints. At selection an axis that would wrap is probed once
 * (and after each source update): when a larger element does not make what it shows larger, that axis has no handle
 * and the pill says why. An element rendered several times (a .map row) says that every instance changes.
 * An element that the component right above it in the React tree clones or reads by type (cloning.json, the list the
 * dev server's wrap guard reads), or holds in a listed prop (an AppShell's sidebar, also through a variable), is never
 * wrapped, also when a helper returned it (the source cannot see that); a Tooltip keeps the handles its probe passes
 * (an anchor whose CSS gives its child the size). A library component drawn by one <svg> has no handles. Every missing
 * axis is explained in the pill.
 * The only item of a Zen Grid column that the source sizes in px, filling it without a Fixed width of its own, resizes
 * that column (resize.ts withColumn): the preview sets the Grid's track list, so its neighbours move with the edge.
 */

type Props = {
  /** The selected element's outline in layer coordinates, or null. */
  box: Box | null;
  /** The selected element when exactly one element (not a part, no Shift extras) is selected. */
  hit: FiberHit | null;
  /** Select tool, not presenting. */
  interactive: boolean;
  viewport: HTMLElement | null;
};

type HandleId = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
type Handle = { id: HandleId; sx: -1 | 0 | 1; sy: -1 | 0 | 1 };
const handles: Handle[] = [
  { id: "n", sx: 0, sy: -1 }, { id: "s", sx: 0, sy: 1 }, { id: "w", sx: -1, sy: 0 }, { id: "e", sx: 1, sy: 0 },
  { id: "nw", sx: -1, sy: -1 }, { id: "ne", sx: 1, sy: -1 }, { id: "sw", sx: -1, sy: 1 }, { id: "se", sx: 1, sy: 1 },
];

/** Hit sizes in screen px: edge strips are this thick (half outside the outline), corners this square. */
const STRIP = 8;
const CORNER = 12;
/** Pointer travel (screen px) before a press on a handle becomes a resize. */
const DRAG_START = 3;

type Values = { width?: number; height?: number };
type Saved = Map<string, { value: string; priority: string }>;
type Drag = {
  pointerId: number;
  /** The handle that holds the pointer capture. */
  captor: Element;
  handle: Handle;
  start: { x: number; y: number };
  last: { x: number; y: number; shift: boolean };
  /** Screen px per CSS px of the element at the press, and the canvas zoom then (a wheel zoom mid-drag rescales). */
  scale: number;
  zoom: number;
  w0: number;
  h0: number;
  host: HTMLElement;
  hit: FiberHit;
  element: SourceElement;
  target: ResizeTarget;
  selection: Extract<StudioSelection, { kind: "node" }>;
  parentWidth: number | null;
  /** The parent lays the element out along this axis (flex): the preview also stops it growing or shrinking. */
  mainAxis: ResizeAxis | null;
  values: Values;
  active: boolean;
  /** Inline styles the preview replaced. */
  saved: Saved;
  /** The write wraps the component in a Stack, or edits the Stack the Studio wrapped it in: the pill says so. */
  stack: boolean;
  /** A `column` width: the Grid whose track list the preview sets, and the inline styles it replaced there. */
  grid: { element: HTMLElement; saved: Saved } | null;
  /** The smallest size the element renders on each axis (its content, padding; MIN_SIZE at least): a drag stops there. */
  min: Record<ResizeAxis, number>;
  /** What the element (or its Studio wrap Stack) fills, for the axis a wrap does not size. */
  cross: CrossFits;
  /** How many times the element renders (a .map row): every instance changes. */
  count: number;
};

/** What the pill shows while dragging: the values, Fill (fullWidth), in a Stack (a wrap or its Stack), all N. */
type Live = { values: Values; fill: boolean; stack: boolean; count: number; column: number | null };

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

/*
 * The newest wrap. Its undo gives the file back exactly as it was before the wrap, so the wrapped element is selected
 * again (the Stack is gone); its redo selects the Stack again. Same pattern as Detach (inspector/detach.ts): the texts
 * before and after the wrap are remembered as length + hash, in sessionStorage too (Vite may reload the page after a
 * write). `child`: the wrapped element's src inside the Stack (selected there when the wrap is undone, it is the same
 * element too).
 */
type Print = { size: number; hash: string };
type WrapRecord = { file: string; before: Print; after: Print; original: NodeSelection; wrapper: NodeSelection; child: string | null };
const WRAP_KEY = "zen-studio:last-wrap";

/** FNV-1a of the text (with its length, how a wrap's texts are told apart). */
function fingerprint(text: string): Print {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return { size: text.length, hash: (hash >>> 0).toString(16) };
}
const matches = (text: string, known: Print) => text.length === known.size && fingerprint(text).hash === known.hash;

let lastWrap: WrapRecord | null = (() => {
  try {
    const raw = window.sessionStorage.getItem(WRAP_KEY);
    const record = raw ? (JSON.parse(raw) as WrapRecord) : null;
    return record && typeof record.file === "string" && record.before && record.after && record.original?.kind === "node" && record.wrapper?.kind === "node" ? record : null;
  } catch {
    return null;
  }
})();

function rememberWrap(record: WrapRecord) {
  lastWrap = record;
  try {
    window.sessionStorage.setItem(WRAP_KEY, JSON.stringify(record));
  } catch {
    // Private mode or a full quota: undo still restores the source, the selection may not follow after a reload.
  }
}

const offWrites = subscribeStudioWrites((write) => {
  const last = lastWrap;
  if (!last || write.file !== last.file || write.kind === "edit") return;
  // Both sides: the wrap's undo goes from its result back to the text before it, its redo the other way. Another edit
  // undone back to the same text (a prop set and undone after the wrap was undone) is not the wrap.
  const undo = write.kind === "undo" && matches(write.before, last.after) && matches(write.after, last.before);
  const redo = write.kind === "redo" && matches(write.before, last.before) && matches(write.after, last.after);
  if (!undo && !redo) return;
  // What the canvas shows now is the render before this write (read synchronously, before Vite applies it).
  const before = renderedNow(canvasApi.getWorldElement());
  // After every other write listener (the selection remap).
  queueMicrotask(() => {
    const current = studioStore.getState().selection;
    const from = undo ? last.wrapper : last.original;
    // That element at `src` (or moved there by the remap), read back or picked again.
    const at = (name: string, src: string | null) => Boolean(src && current?.kind === "node" && !current.part && current.name === name
      && current.instance === from.instance && (current.src === src || current.src === mapSrc(src, write)));
    // The selection it left (the Stack, or the element inside it), or none (dropped): never another pick.
    const same = !current || sameSelectedElement(from, current) || at(from.name, from.src) || (undo && at(last.original.name, last.child));
    if (!same) return;
    const next = undo ? last.original : last.wrapper;
    // The element renders only after Vite applied the write: the canvas waits for it (never drops it).
    expectRender(next, before, () => undefined);
    studioStore.setState({ selection: next });
    flushStudioStore();
  });
});
import.meta.hot?.dispose(offWrites);

const fiberHost = (hit: FiberHit | null) => (hit && hit.hosts.length === 1 && hit.hosts[0] instanceof HTMLElement ? hit.hosts[0] : null);

/**
 * The JSX element at `src` as the dev server reads it, refreshed after source updates, undo and redo; undefined until
 * read, null when it is not there.
 */
function useSourceElement(src: string | null, enabled: boolean): SourceElement | null | undefined {
  const [read, setRead] = useState<{ src: string; element: SourceElement | null } | null>(null);
  const [version, setVersion] = useState(0);
  const undo = useStudio((state) => state.undo.length);
  const redo = useStudio((state) => state.redo.length);
  useEffect(() => onSourceUpdate(() => setVersion((value) => value + 1)), []);
  useEffect(() => {
    const parsed = enabled && src ? parseSrc(src) : null;
    if (!parsed || !src) return undefined;
    let alive = true;
    void studioApi.element(parsed.file, parsed.loc).then((element) => { if (alive) setRead({ src, element }); });
    return () => { alive = false; };
  }, [src, enabled, version, undo, redo]);
  return read && read.src === src ? read.element : undefined;
}

function restore(host: HTMLElement, saved: Saved) {
  for (const [property, before] of saved) {
    if (before.value) host.style.setProperty(property, before.value, before.priority);
    else host.style.removeProperty(property);
  }
  // No empty style attribute left on an element that had none.
  if (saved.size && host.getAttribute("style") === "") host.removeAttribute("style");
  saved.clear();
}

function setStyle(host: HTMLElement, saved: Saved, property: string, value: string) {
  if (!saved.has(property)) saved.set(property, { value: host.style.getPropertyValue(property), priority: host.style.getPropertyPriority(property) });
  host.style.setProperty(property, value, "important");
}

/** One axis of the element at a Fixed `value` as the write renders it (border-box, no flex growing or shrinking). */
function fixAxis(host: HTMLElement, saved: Saved, axis: ResizeAxis, value: string, mainAxis: ResizeAxis | null) {
  setStyle(host, saved, axis, value);
  setStyle(host, saved, "box-sizing", "border-box");
  if (mainAxis === axis) {
    setStyle(host, saved, "flex-grow", "0");
    setStyle(host, saved, "flex-shrink", "0");
    setStyle(host, saved, "flex-basis", "auto");
  }
  // Inline Text becomes an inline box with a width (layout.css does the same for data-w).
  if (axis === "width" && getComputedStyle(host).display === "inline") setStyle(host, saved, "display", "inline-block");
}

/**
 * Sizes the element as the write will (Fixed is border-box and stops growing / shrinking along its flex parent). An
 * axis a Stack will size (a wrap, the Studio wrap Stack, fullWidth) drops the element's own percentage max size too: in
 * the Stack it fills the Stack's size, so a cap such as max-width: 100% (a Tooltip anchor in a column) does not hold
 * there (a px cap does, and stays).
 */
function preview(drag: Drag, values: Values) {
  restoreDrag(drag);
  for (const axis of ["width", "height"] as const) {
    const value = values[axis];
    if (value === undefined) continue;
    if (axis === "width" && drag.target.width?.kind === "column") {
      // The column takes the width; the element keeps filling its cell.
      const column = drag.target.column;
      const list = column ? withTrackPx(column.source.list, column.index, value) : null;
      if (list && drag.grid) setStyle(drag.grid.element, drag.grid.saved, "grid-template-columns", list);
      continue;
    }
    fixAxis(drag.host, drag.saved, axis, `${value}px`, drag.mainAxis);
    const rule = drag.target[axis];
    const cap = axis === "width" ? "max-width" : "max-height";
    // Only a cap relative to the parent (max-width: 100%): a px cap (a number Chip's 40px) also holds in the Stack.
    if (rule && (rule.kind === "wrap" || rule.kind === "wrapper" || rule.kind === "fullWidth") && /%$/.test(drag.host.style.getPropertyValue(cap) || getComputedStyle(drag.host).getPropertyValue(cap))) setStyle(drag.host, drag.saved, cap, "none");
  }
}

/** The drag's preview styles go: the element's, and the Grid's track list. */
function restoreDrag(drag: Pick<Drag, "host" | "saved" | "grid">) {
  restore(drag.host, drag.saved);
  if (drag.grid) restore(drag.grid.element, drag.grid.saved);
}

/**
 * Reads the element under transient inline styles, restored before returning: one synchronous task, so nothing paints
 * in between (no flash). Its own inline styles (a held preview) come back as they were.
 */
function measureWith<T>(host: HTMLElement, apply: (saved: Saved) => void, read: () => T): T {
  const saved: Saved = new Map();
  try {
    apply(saved);
    return read();
  } finally {
    restore(host, saved);
  }
}

const sizeOf = (element: HTMLElement, axis: ResizeAxis) => (axis === "width" ? element.offsetWidth : element.offsetHeight);

/** The axis the element's flex parent lays it out along, or null (not a flex item). */
function mainAxisOf(element: HTMLElement): ResizeAxis | null {
  const parent = layoutParent(element);
  try {
    const style = parent ? getComputedStyle(parent) : null;
    if (style?.display.includes("flex")) return style.flexDirection.startsWith("column") ? "height" : "width";
  } catch {
    return null;
  }
  return null;
}

/**
 * The smallest size the element renders on each axis when the write fixes it (at 0: its CSS minimum such as a Button's
 * min-width: max-content, its padding and border), MIN_SIZE at least: a drag below it would only be written, never shown.
 * `intrinsic` (a library component): the width also keeps its min-content width, read in the same probe (width:
 * min-content), so a label component (Badge, Tag, Chip) keeps its whole label instead of clipping it to a letter. One
 * already narrower than that (it ellipsizes: a ListItem whose title is cut) has what it still needs at 0 (its scroll
 * width there: the trailing content beside the cut title) as its floor, so it stays draggable both ways.
 */
function minimumSize(host: HTMLElement, mainAxis: ResizeAxis | null, intrinsic: boolean): Record<ResizeAxis, number> {
  const at = (axis: ResizeAxis) => {
    try {
      const now = sizeOf(host, axis);
      return Math.max(MIN_SIZE, measureWith(host, (saved) => fixAxis(host, saved, axis, "0px", mainAxis), () => {
        const zero = sizeOf(host, axis);
        if (axis !== "width" || !intrinsic) return zero;
        // Still inside the probe: its fixAxis saved the inline width, which the restore puts back.
        // What still overflows at 0 (a ListItem's trailing Badge beside its cut title) is its floor too: below it the
        // trailing content spills out and nothing visible grows when it is widened again, so the handles would go.
        // scrollWidth leaves out the end padding and border, which the trailing content needs as well.
        const own = getComputedStyle(host);
        const spill = host.scrollWidth + (parseFloat(own.paddingInlineEnd) || 0) + (parseFloat(own.borderInlineEndWidth) || 0);
        host.style.setProperty("width", "min-content", "important");
        const content = sizeOf(host, axis);
        return content > now + 1 ? Math.max(zero, Math.min(spill, now)) : Math.max(zero, Math.min(content, now));
      }));
    } catch {
      return MIN_SIZE;
    }
  };
  return { width: at("width"), height: at("height") };
}

/** cloning.json: what a wrap Stack would break (the dev server's wrap guard reads the same list). */
const cloningList: CloningList = cloning;

// React work tags of components that render (function, class, forwardRef, memo, simple memo).
const COMPOSITE_TAGS = new Set([0, 1, 11, 14, 15]);

type ElementLike = { type: unknown; props?: Record<string, unknown> | null };
const isElementLike = (node: unknown): node is ElementLike => typeof node === "object" && node !== null && "$$typeof" in node && "type" in node;

/**
 * Whether `children` (a component's children prop) is the element at `src` as that component sees it: itself, or inside
 * fragments / arrays when the list's `through` says the component reaches in there (a Tooltip with two children clones
 * neither).
 */
function handsOn(children: unknown, src: string, through: string[], depth = 0): boolean {
  if (depth > 8) return false;
  if (Array.isArray(children)) return through.includes("array") && children.some((child) => handsOn(child, src, through, depth + 1));
  if (!isElementLike(children)) return false;
  if (children.type === Fragment) return through.includes("fragment") && handsOn(children.props?.children, src, through, depth + 1);
  return children.props?.["data-zen-src"] === src;
}

/**
 * Why the element cannot be wrapped where it renders (cloning.json's reason), or null. The fibers' return chain is
 * walked as the picker walks it (DOM elements, fragments and context providers skipped): the nearest component above
 * it is a listed parent that gets it as its child, also when a helper returned it (a ChatCall from bodyOf as a
 * ChatMessage's child); or that component, or one further up before the first library component (past the page's own
 * components, such as a template's shell), holds it in a listed prop, also through a variable (AppShell
 * `sidebar={sidebar}`, Menu `trigger={trigger}`) or as the page's own component that renders it. The source cannot see
 * either.
 */
function clonedWhere(hit: FiberHit): string | null {
  try {
    // The element and the page's own components between it and the owner: what a listed prop may hold.
    const srcs = new Set([hit.src]);
    let nearest = true;
    for (let fiber = hit.fiber?.return ?? null, guard = 0; fiber && guard < 2000; fiber = fiber.return, guard++) {
      if (!COMPOSITE_TAGS.has(fiber.tag)) continue;
      const owner = nameOf(fiber);
      if (nearest) {
        nearest = false;
        const entry = cloningParent(cloningList, owner, hit.name);
        if (entry && handsOn(fiber.memoizedProps?.children, hit.src, entry.through ?? [])) return cloneReason(entry, `<${hit.name}>`, owner);
      }
      const held = cloningProp(cloningList, owner, fiber.memoizedProps, srcs);
      if (held) return cloneReason(held, `<${hit.name}>`, owner);
      if (componentSchema(owner)) return null;
      const src: unknown = fiber.memoizedProps?.["data-zen-src"];
      if (typeof src === "string") srcs.add(src);
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Components whose own box is an anchor around the child they clone (Tooltip.tsx: an inline-flex span): when the probe
 * finds that a larger anchor does not resize what it shows, the pill says so in cloning.json's words. One whose anchor
 * CSS passes a size on (a class that makes the child fill it) keeps those handles.
 */
const anchorParents = new Set(["Tooltip"]);

/**
 * Why an anchor parent has no handles on the probed `axes`: one axis, where it comes from ("Height comes from <Link>
 * inside the Tooltip"); both, cloning.json's reason for the child it clones ("<Button> keeps its size…").
 */
function anchorReason(hit: FiberHit, axes: ResizeAxis[]): string {
  const child = childHits(hit)[0]?.name;
  if (axes.length === 1) return `${axes[0] === "width" ? "Width" : "Height"} comes from ${child ? `<${child}>` : "its child"} inside the ${hit.name}`;
  const entry = cloningParent(cloningList, hit.name, child ?? "");
  const element = child ? `<${child}>` : "Its child";
  return entry ? cloneReason(entry, element, hit.name) : `The ${hit.name} does not pass a size to ${child ? element : "its child"}; resize it in code`;
}

/** How much larger (CSS px) the element is made on a probed axis. */
const PROBE = 24;

/** The content box of `parent` on one axis (CSS px). */
function contentSize(parent: HTMLElement, axis: ResizeAxis): number {
  const style = getComputedStyle(parent);
  return axis === "width"
    ? parent.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0)
    : parent.clientHeight - (parseFloat(style.paddingTop) || 0) - (parseFloat(style.paddingBottom) || 0);
}

/**
 * What the element fills on each axis (CrossFit), never overriding its own CSS size: its parent stretches or grows it
 * there (it is smaller at align-self / justify-self start, or with no flex growing), or it takes the parent's whole
 * content size (within 2 px, a width of 100%) while the parent's size does not come from it (a parent that hugs it
 * grows when it is made larger: a row of 40 px buttons is 40 px because of them); then how a Stack in its place does too.
 */
function crossFits(element: HTMLElement): CrossFits {
  const parent = layoutParent(element);
  if (!parent) return noCross;
  const mainAxis = mainAxisOf(element);
  let display = "";
  try { display = getComputedStyle(parent).display; } catch { return noCross; }
  const fills = (axis: ResizeAxis) => {
    const now = sizeOf(element, axis);
    const loose = measureWith(element, (saved) => {
      if (mainAxis === axis) {
        setStyle(element, saved, "flex-grow", "0");
        setStyle(element, saved, "flex-basis", "auto");
      } else if (mainAxis) setStyle(element, saved, "align-self", "flex-start");
      else if (display.includes("grid")) setStyle(element, saved, axis === "width" ? "justify-self" : "align-self", "start");
    }, () => sizeOf(element, axis));
    if (now - loose > 1) return true;
    const style = getComputedStyle(element);
    const margins = axis === "width" ? (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0) : (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
    const before = contentSize(parent, axis);
    if (Math.abs(now + margins - before) > 2) return false;
    const after = measureWith(element, (saved) => fixAxis(element, saved, axis, `${now + PROBE}px`, mainAxis), () => contentSize(parent, axis));
    return after - before < PROBE / 2;
  };
  const fit = (axis: ResizeAxis) => {
    try {
      return fills(axis) ? stackFill(element, axis) : null;
    } catch {
      return null;
    }
  };
  return { width: fit("width"), height: fit("height") };
}

type Rect = { left: number; top: number; right: number; bottom: number };
const TRANSPARENT = /^(transparent|rgba\(.*,\s*0\)|.*\/\s*0\))$/;
const REPLACED = new Set(["IMG", "SVG", "VIDEO", "CANVAS", "INPUT", "TEXTAREA", "SELECT", "IFRAME", "PROGRESS", "METER", "OBJECT", "EMBED"]);

/** A background, a border or a shadow in `style`. */
function paints(style: CSSStyleDeclaration): boolean {
  if (!TRANSPARENT.test(style.backgroundColor) || style.backgroundImage !== "none" || style.boxShadow !== "none") return true;
  return ["top", "right", "bottom", "left"].some((side) =>
    parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0
    && style.getPropertyValue(`border-${side}-style`) !== "none"
    && !TRANSPARENT.test(style.getPropertyValue(`border-${side}-color`)));
}

/**
 * Whether the element paints a box of its own: a background, a border, a shadow (its own or a ::before / ::after
 * layer's, as an input control draws its field), or replaced content.
 */
function paintsBox(element: Element, style: CSSStyleDeclaration): boolean {
  if (REPLACED.has(element.tagName.toUpperCase()) || paints(style)) return true;
  return (["::before", "::after"] as const).some((pseudo) => {
    const layer = getComputedStyle(element, pseudo);
    return layer.content !== "none" && layer.content !== "normal" && layer.display !== "none" && paints(layer);
  });
}

/**
 * The union rect (screen px) of what the element shows: its painted box when it paints one, else its children's (and
 * its text's); hidden, transparent and fixed-position content does not count. Null when it shows nothing.
 */
function visibleRect(element: Element, budget: { nodes: number }, depth = 0, clip: Rect | null = null): Rect | null {
  if (--budget.nodes < 0) return null;
  const style = getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0" || style.position === "fixed") return null;
  // What a clipping box (overflow other than visible: an ellipsized title, a scroller) cuts off is not shown: a text
  // run's range rect is its full extent, wider than the cut title, so every rect is clipped to it.
  const cut = (rect: Rect | null): Rect | null => {
    if (!rect || !clip) return rect;
    const next = { left: Math.max(rect.left, clip.left), top: Math.max(rect.top, clip.top), right: Math.min(rect.right, clip.right), bottom: Math.min(rect.bottom, clip.bottom) };
    return next.right > next.left && next.bottom > next.top ? next : null;
  };
  const box = (rect: DOMRect | null): Rect | null => cut(rect && (rect.width > 0 || rect.height > 0) ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } : null);
  if (style.display !== "contents" && (paintsBox(element, style) || depth > 6)) return box(element.getBoundingClientRect());
  if (style.display !== "contents" && (style.overflowX !== "visible" || style.overflowY !== "visible")) {
    const own = element.getBoundingClientRect();
    const mine = { left: own.left, top: own.top, right: own.right, bottom: own.bottom };
    clip = clip ? { left: Math.max(clip.left, mine.left), top: Math.max(clip.top, mine.top), right: Math.min(clip.right, mine.right), bottom: Math.min(clip.bottom, mine.bottom) } : mine;
  }
  let union: Rect | null = null;
  const add = (rect: Rect | null) => {
    if (!rect) return;
    union = union ? { left: Math.min(union.left, rect.left), top: Math.min(union.top, rect.top), right: Math.max(union.right, rect.right), bottom: Math.max(union.bottom, rect.bottom) } : rect;
  };
  for (const child of Array.from(element.childNodes)) {
    if (child instanceof Element) add(visibleRect(child, budget, depth + 1, clip));
    else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      const range = document.createRange();
      range.selectNodeContents(child);
      add(box(range.getBoundingClientRect()));
    }
  }
  return union;
}

const extent = (rect: Rect, axis: ResizeAxis) => (axis === "width" ? rect.right - rect.left : rect.bottom - rect.top);

/**
 * Whether a larger element (PROBE px on `axis`, as the write fixes it) shows a larger component: false when what it
 * shows keeps its size (an InputField's control inside a taller field root, a Chip's pill inside a taller trigger);
 * null when the element itself does not grow (nothing to tell).
 */
function growsVisibly(host: HTMLElement, axis: ResizeAxis, mainAxis: ResizeAxis | null): boolean | null {
  try {
    const before = visibleRect(host, { nodes: 400 });
    const hostBefore = host.getBoundingClientRect();
    const size = sizeOf(host, axis);
    return measureWith(host, (saved) => fixAxis(host, saved, axis, `${size + PROBE}px`, mainAxis), () => {
      const hostAfter = host.getBoundingClientRect();
      const grown = axis === "width" ? hostAfter.width - hostBefore.width : hostAfter.height - hostBefore.height;
      const after = visibleRect(host, { nodes: 400 });
      if (grown < 1 || !before || !after) return null;
      // At least half of it: pieces that only move apart (a field's label and control) do not resize it.
      return extent(after, axis) - extent(before, axis) >= grown / 2;
    });
  } catch {
    return null;
  }
}

/** Whether the component has a `size` prop of its own (not deprecated). */
const hasSize = (name: string) => Boolean(componentSchema(name)?.props.some((prop) => prop.name === "size" && !prop.deprecated));

/**
 * The single host of a library component drawn by one <svg> (Icon, FileIcon, Flag), or null: it has no handles (an
 * <svg> takes its size from its attributes, which the component sets), only the pill saying where its size comes from.
 */
const svgRoot = (hit: FiberHit | null) => (hit && hit.isComponent && hit.hosts.length === 1 && hit.hosts[0] instanceof SVGElement && componentSchema(hit.name) ? hit.hosts[0] : null);

/** The target of an svgRoot component: no axes, and why. */
const svgTarget = (name: string): ResizeTarget => ({
  kind: "component",
  width: null,
  height: null,
  corners: false,
  why: [hasSize(name) ? "Takes its size from size; change it in code" : `The ${name} draws its own size; change it in code`],
});

/** An element's rendered CSS size (used width / height; the screen rect at the canvas zoom when unreadable). */
function cssSize(element: Element): Record<ResizeAxis, number> {
  try {
    const style = getComputedStyle(element);
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);
    if (Number.isFinite(width) && Number.isFinite(height)) return { width, height };
  } catch {
    // Read from its rect below.
  }
  const rect = element.getBoundingClientRect();
  const zoom = getViewport().zoom || 1;
  return { width: rect.width / zoom, height: rect.height / zoom };
}

/** Why the probed axes have no handle: "Height comes from the InputField size" (its size prop sets it), … */
function fixedReason(name: string, axes: ResizeAxis[]): string {
  if (axes.length === 2) return `The ${name} keeps its own size`;
  if (axes[0] === "width") return `Width comes from the ${name}'s content`;
  return hasSize(name) ? `Height comes from the ${name} size` : `Height comes from the ${name} itself`;
}

/**
 * The Zen Grid column the element is the only item of and fills: the Grid's src and element, the column (0-based). The
 * grid item is the element, or the Studio wrap Stack candidate it sits in. Null when the parent is no Zen Grid, the item
 * shares or spans columns, leaves free space in its cell, or has a Fixed width of its own (that width would stay).
 */
function gridCell(host: HTMLElement, wrapperSrc: string | null, props: Record<string, unknown>): { src: string; element: HTMLElement; index: number } | null {
  const item = wrapperSrc && host.parentElement ? host.parentElement : host;
  const grid = layoutParent(item);
  const src = grid?.classList.contains("zen-grid") ? grid.getAttribute("data-zen-src") : null;
  if (!grid || !src) return null;
  if (item.getAttribute("data-w") === "fixed" || (item === host && typeof props.width === "number")) return null;
  const sole = soleColumn(grid, item);
  if (!sole || Math.abs(sole.column.to - sole.column.from - sole.rect.width) > 1.5) return null;
  return { src, element: grid, index: sole.index };
}

export function ResizeLayer({ box, hit, interactive, viewport }: Props) {
  const role = useStudio((state) => state.role);
  const server = useStudioServer();
  const writable = canEdit() && role === "admin" && server.writable;
  const chromePortal = useContext(ChromePortalContext);
  const selection = useStudio((state) => state.selection);
  const host = fiberHost(hit);
  const base = hit && host ? resizeTarget(hit.name, hit.isComponent) : null;
  const dragRef = useRef<Drag | null>(null);
  const inFrame = (node: Element | null) => Boolean(node && canvasApi.getWorldElement()?.contains(node) && node.closest("[data-studio-frame]"));
  const enabled = Boolean(base && inFrame(host) && interactive && writable);
  // A library component drawn by one <svg>: no handles, the pill says where its size comes from.
  const svg = host ? null : svgRoot(hit);
  const svgShown = Boolean(svg && inFrame(svg) && interactive && writable);
  // A playground specimen: its props come from the playground's state, so it is never wrapped (specimenOnly).
  const specimen = Boolean(hit && selection?.kind === "node" && selection.src === hit.src && selection.panelId);
  const element = useSourceElement(enabled && hit ? hit.src : null, enabled);
  // A component in a fillChildren Stack of its own may sit in the Stack a wrap made: then a drag edits that Stack.
  const wrapperSrc = enabled && !specimen && host && base?.kind === "component" ? wrapperCandidate(host) : null;
  const wrapperElement = useSourceElement(wrapperSrc, Boolean(wrapperSrc));
  const at = hit ? parseSrc(hit.src) : null;
  let target = base && element && hit && element.name === hit.name ? lockBound(base, element.attributes) : null;
  if (target && specimen) target = specimenOnly(target);
  else if (target && wrapperSrc) {
    // Until that Stack is read there is nothing to drag (a drag must never wrap a wrapped component again).
    if (wrapperElement === undefined) target = null;
    else if (wrapperElement && at && studioWrapper(wrapperElement, at.file, at.loc)) target = withWrapper(target, { src: wrapperSrc, attributes: wrapperElement.attributes });
  }
  // The only item of a Zen Grid column that it fills (no Fixed width of its own): measured once per selection and source
  // update; the Grid's source then says whether that column is sized in px, and a width drag resizes the column.
  const [updates, setUpdates] = useState(0);
  useEffect(() => onSourceUpdate(() => setUpdates((value) => value + 1)), []);
  const [cell, setCell] = useState<{ host: HTMLElement; key: string; grid: { src: string; element: HTMLElement; index: number } | null } | null>(null);
  const cellKey = `${hit?.src ?? ""}|${wrapperSrc ?? ""}|${updates}`;
  const cellOn = Boolean(enabled && !specimen && host && base);
  useLayoutEffect(() => {
    if (!cellOn || !host || dragRef.current) return;
    const grid = gridCell(host, wrapperSrc, hit?.props ?? {});
    setCell((last) => (last && last.host === host && last.key === cellKey && last.grid?.src === grid?.src && last.grid?.index === grid?.index ? last : { host, key: cellKey, grid }));
  }, [cellOn, host, wrapperSrc, hit, cellKey]);
  const gridCellNow = cellOn && cell && cell.host === host && cell.key === cellKey ? cell.grid : null;
  const gridElement = useSourceElement(gridCellNow?.src ?? null, Boolean(gridCellNow));
  if (target && gridCellNow) {
    // Until the Grid is read there is nothing to drag (a drag must never wrap what should resize its column).
    if (gridElement === undefined) target = null;
    else if (gridElement && gridElement.name === "Grid") {
      const source = columnsSource(gridElement.attributes, breakpointOf(gridCellNow.element));
      const track = source ? splitTracks(source.list)?.[gridCellNow.index] : undefined;
      if (source && track && pxTrack(track)) target = withColumn(target, { src: gridCellNow.src, index: gridCellNow.index, source });
    }
  }
  // The server cannot wrap it (a prop value, inside a paragraph…), or the component right above it in the React tree
  // clones it (cloning.json; also a helper's result, which the source cannot see): no wrap handles; own props, fullWidth
  // and its Stack stay.
  const wrapAxes = target && target.kind === "component" ? (["width", "height"] as const).filter((axis) => target![axis]?.kind === "wrap" || (axis === "width" && target!.width?.kind === "fullWidth")) : [];
  const refusal = hit && wrapAxes.length ? wrapRefusal(element) ?? clonedWhere(hit) : null;
  if (target && refusal) target = refuseWrap(target, refusal, pillReason(refusal));

  // An axis whose Stack would not resize what the component shows: probed once per selection and source update.
  const probeAxes = target && enabled && host ? stackAxes(target).join(",") : "";
  const [probe, setProbe] = useState<{ host: HTMLElement; key: string; fixed: ResizeAxis[] } | null>(null);
  const probeKey = `${hit?.src ?? ""}|${probeAxes}|${updates}`;
  useLayoutEffect(() => {
    if (!host || !probeAxes) return;
    // Never under a drag's preview (its sizes are the drag's, not the element's).
    if (dragRef.current) return;
    const mainAxis = mainAxisOf(host);
    const fixed = (probeAxes.split(",") as ResizeAxis[]).filter((axis) => growsVisibly(host, axis, mainAxis) === false);
    setProbe((last) => (last && last.host === host && last.key === probeKey && last.fixed.join(",") === fixed.join(",") ? last : { host, key: probeKey, fixed }));
  }, [host, probeAxes, probeKey]);
  const fixed = probe && probe.host === host && probe.key === probeKey ? probe.fixed : [];
  // A Tooltip's anchor passes no size to the child it clones unless its CSS does (a class that makes the child fill
  // it): the probe tells, cloning.json's words say why.
  if (target && fixed.length && hit) target = withoutAxes(target, fixed, anchorParents.has(hit.name) ? anchorReason(hit, fixed) : fixedReason(hit.name, fixed));
  // Why axes have no handle, whichever step removed them (the pill says it; a refused wrap goes to the status line too).
  const note = target?.why?.length ? target.why.join(" · ") : null;
  const statusKey = refusal && hit && enabled ? `${hit.src}|${refusal}` : "";
  const statusRef = useRef("");
  useEffect(() => {
    // Once per selection of the element (selected again later: said again).
    if (!statusKey) { statusRef.current = ""; return; }
    if (statusRef.current === statusKey || !hit) return;
    statusRef.current = statusKey;
    inspectorStatus.set("neutral", `${hit.name} cannot be wrapped in a Stack to resize it: ${refusal}`);
  }, [statusKey, hit, refusal]);

  // Every instance of a repeated element (a .map row) changes: counted as the inspector's Repeats line does.
  const instances = useSyncExternalStore(selectionInstances.subscribe, selectionInstances.get, selectionInstances.get);
  const count = selection?.kind === "node" && instances.src === selection.src ? Math.max(1, instances.count) : 1;
  const shown = enabled && box && target && (target.width || target.height) ? target : null;
  // No handle left, but the element would resize: the pill stays to say why.
  const explained = !shown && enabled && box && target && note ? target : null;

  const [live, setLive] = useState<Live | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const announceTimer = useRef(0);
  /** A preview held after its write until the re-render shows the new size. */
  const heldRef = useRef<(() => void) | null>(null);

  const announce = useCallback((text: string) => {
    // Cleared first, so the same words twice are read twice.
    setAnnouncement("");
    window.clearTimeout(announceTimer.current);
    announceTimer.current = window.setTimeout(() => setAnnouncement(text), 60);
  }, []);

  const releaseHeld = useCallback(() => {
    const release = heldRef.current;
    heldRef.current = null;
    release?.();
  }, []);

  /** Keeps the preview until Vite re-rendered the write (or 3 s), so the element never jumps back in between. */
  const hold = useCallback((drag: Drag) => {
    releaseHeld();
    let frame = 0;
    const clear = () => {
      off();
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      restoreDrag(drag);
      if (heldRef.current === clear) heldRef.current = null;
    };
    const off = onSourceUpdate(() => { frame = requestAnimationFrame(() => { frame = requestAnimationFrame(clear); }); });
    const timer = window.setTimeout(clear, 3000);
    heldRef.current = clear;
  }, [releaseHeld]);

  const stopListening = useRef<() => void>(() => undefined);

  /** Ends a drag: the preview goes (or is held for the write), the listeners and the pill go. */
  const finish = useCallback((keepPreview: boolean) => {
    const drag = dragRef.current;
    dragRef.current = null;
    stopListening.current();
    stopListening.current = () => undefined;
    setLive(null);
    if (!drag) return null;
    try { if (drag.captor.hasPointerCapture(drag.pointerId)) drag.captor.releasePointerCapture(drag.pointerId); } catch { /* already released */ }
    if (keepPreview) hold(drag);
    else restoreDrag(drag);
    return drag;
  }, [hold]);

  // Another selection, another tool, read-only: a drag in progress is cancelled (nothing written).
  const hostKey = hit && host ? `${hit.src}#${hit.name}` : "";
  useEffect(() => () => { if (dragRef.current) finish(false); }, [hostKey, enabled, finish]);
  useEffect(() => () => { releaseHeld(); window.clearTimeout(announceTimer.current); }, [releaseHeld]);

  /** The values a pointer position gives (only the handle's axes; a corner counts an axis once moved along it). */
  const valuesAt = useCallback((drag: Drag, x: number, y: number, shift: boolean): Values => {
    const zoomNow = getViewport().zoom || drag.zoom;
    const scale = drag.scale * (zoomNow / drag.zoom);
    const dx = (x - drag.start.x) / scale;
    const dy = (y - drag.start.y) / scale;
    const corner = drag.handle.sx !== 0 && drag.handle.sy !== 0;
    const values: Values = {};
    // Never below what the element renders at its smallest (the pill shows the clamped value).
    if (drag.handle.sx && drag.target.width && (!corner || Math.abs(x - drag.start.x) >= DRAG_START)) values.width = snapSize(drag.w0 + drag.handle.sx * dx, shift, drag.min.width);
    if (drag.handle.sy && drag.target.height && (!corner || Math.abs(y - drag.start.y) >= DRAG_START)) values.height = snapSize(drag.h0 + drag.handle.sy * dy, shift, drag.min.height);
    return values;
  }, []);

  const update = useCallback((x: number, y: number, shift: boolean) => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.last = { x, y, shift };
    if (!drag.active && Math.hypot(x - drag.start.x, y - drag.start.y) < DRAG_START) return;
    drag.active = true;
    const values = valuesAt(drag, x, y, shift);
    // fullWidth: near the parent's content width an edge drag snaps to it (Fill); anywhere else, and a corner, is a wrap.
    const corner = drag.handle.sx !== 0 && drag.handle.sy !== 0;
    const fullWidth = !corner && drag.target.width?.kind === "fullWidth" && values.width !== undefined && reachesParent(values.width, drag.parentWidth);
    if (fullWidth && drag.parentWidth !== null) values.width = Math.round(drag.parentWidth);
    const plan = planResize(drag.hit.name, drag.target, values, drag.parentWidth, { cross: drag.cross, count: drag.count, corner });
    drag.values = values;
    drag.stack = Boolean(plan && (plan.wrap || plan.wrapper));
    const column = plan?.grid && drag.target.column ? drag.target.column.index + 1 : null;
    // The component itself at the dragged size, also when a Stack takes the size (the component fills it).
    preview(drag, values);
    setLive({ values, fill: fullWidth, stack: drag.stack, count: drag.count, column });
  }, [valuesAt]);

  /** Sends one request: the plan's ops, to the element or to its Studio wrap Stack (a wrap selects the new Stack). */
  const write = useCallback(async (drag: Pick<Drag, "hit" | "element" | "selection">, plan: ResizePlan) => {
    const parsed = parseSrc(plan.grid ?? plan.wrapper ?? drag.hit.src);
    if (!parsed) return false;
    const fresh = await studioApi.element(parsed.file, parsed.loc);
    if (!fresh || fresh.name !== (plan.grid ? "Grid" : plan.wrapper ? "Stack" : drag.element.name)) {
      inspectorStatus.set("negative", `${drag.hit.name} moved before the change was saved; nothing was written`);
      return false;
    }
    const request = { file: parsed.file, loc: parsed.loc, name: fresh.name, ops: plan.ops, hash: fresh.hash };
    if (!plan.wrap) {
      const done = noteEditTarget(`${parsed.file}:${parsed.loc}`);
      try {
        const response = await applyEdit(request, plan.label);
        if (response.ok && response.before !== response.after) announce(plan.announce);
        return response.ok && response.before !== response.after;
      } finally {
        done();
      }
    }
    // Everything on the canvas before the write: the new Stack is a new element, never one of these.
    const before = renderedNow(canvasApi.getWorldElement());
    const response = await applyEdit(request, plan.label);
    if (!response.ok) {
      if (/Unknown op "wrap"/.test(response.error)) inspectorStatus.set("negative", "Restart the dev server to wrap components in a Stack");
      return false;
    }
    if (response.before === response.after) return false;
    announce(plan.announce);
    const wrapped = response.wrapped;
    if (wrapped && typeof wrapped.loc === "string") {
      const next: NodeSelection = { kind: "node", src: `${response.file}:${wrapped.loc}`, name: "Stack", frameId: drag.selection.frameId, panelId: drag.selection.panelId, instance: drag.selection.instance };
      const child = wrappedChildLoc(response.after, wrapped.loc);
      rememberWrap({ file: response.file, before: fingerprint(response.before), after: fingerprint(response.after), original: drag.selection, wrapper: next, child: child && `${response.file}:${child}` });
      if (sameSelectedElement(drag.selection, studioStore.getState().selection)) {
        // Synchronously (no request in between): Vite may reload the page as soon as it sees the write.
        expectRender(next, before, () => undefined);
        studioStore.setState({ selection: next });
        flushStudioStore();
      }
    }
    return true;
  }, [announce]);

  const commit = useCallback(async () => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.active) { finish(false); return; }
    // Out and back: a drag that ends at the size it started from writes nothing (no wrap at the same size).
    const start: Values = { width: Math.round(drag.w0), height: Math.round(drag.h0) };
    if ((["width", "height"] as const).every((axis) => drag.values[axis] === undefined || drag.values[axis] === start[axis])) { finish(false); return; }
    const corner = drag.handle.sx !== 0 && drag.handle.sy !== 0;
    const plan = planResize(drag.hit.name, drag.target, drag.values, drag.parentWidth, { cross: drag.cross, count: drag.count, corner });
    if (!plan) {
      finish(false);
      // A fullWidth axis of an element the server cannot wrap: only the parent's width (Fill) is written.
      if (drag.target.noWrap && drag.values.width !== undefined) inspectorStatus.set("neutral", `${drag.hit.name} cannot be wrapped in a Stack: ${drag.target.noWrap.replace(/\.$/, "")}. Drag to the parent's width to fill it.`);
      return;
    }
    finish(true);
    const written = await write(drag, plan);
    // Nothing written (refused, stale, no change): the preview goes at once.
    if (!written) releaseHeld();
  }, [finish, write, releaseHeld]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>, handle: Handle) => {
    if (event.button !== 0 || !shown || !hit || !host || !element) return;
    const selection = studioStore.getState().selection;
    if (selection?.kind !== "node" || selection.part || selection.src !== hit.src) return;
    // The press is the handle's: no selection change, no pan, no spacing picker.
    event.preventDefault();
    event.stopPropagation();
    releaseHeld();
    if (dragRef.current) finish(false);
    const rect = host.getBoundingClientRect();
    const zoom = getViewport().zoom || 1;
    // World px = screen px / zoom. offsetWidth is rounded, so it only tells a scaled context (a transformed frame)
    // apart from the canvas zoom; the start size is the exact rendered one.
    const measured = host.offsetWidth > 0 && rect.width > 0 ? rect.width / host.offsetWidth : zoom;
    const scale = Math.abs(measured - zoom) / zoom < 0.05 ? zoom : measured;
    const w0 = rect.width / scale;
    const h0 = rect.height / scale;
    const parent = layoutParent(host);
    const mainAxis = mainAxisOf(host);
    // Read now, before any preview: the smallest size it renders, and what a Stack around it (or the Studio wrap Stack
    // it sits in, which the drag edits) keeps on the axis it does not size.
    let min = minimumSize(host, mainAxis, shown.kind === "component");
    // A Studio wrap Stack (fillChildren, one child) never goes below what its child can render: its child fills it, so
    // a smaller Stack would only crush or clip the component.
    const only = host.matches('.zen-stack[data-fill-children="true"]') && host.children.length === 1 ? host.firstElementChild : null;
    if (only instanceof HTMLElement) {
      // The child's size while the Stack is at 0 on that axis: its own minimum along the Stack, its own size across it
      // (a Button keeps its 40px height in a row Stack the drag would otherwise make 8 tall).
      const childAt = (axis: ResizeAxis) => {
        try {
          return measureWith(host, (saved) => fixAxis(host, saved, axis, "0px", mainAxis), () => sizeOf(only, axis));
        } catch {
          return 0;
        }
      };
      // …and the child's own floor (a Button's label, a ListItem's trailing content beside its cut title).
      const inner = minimumSize(only, mainAxisOf(only), true);
      min = { width: Math.max(min.width, childAt("width"), inner.width), height: Math.max(min.height, childAt("height"), inner.height) };
    }
    const viaStack = stackAxes(shown).length > 0 || shown.width?.kind === "fullWidth";
    const filler = shown.wrapper ? host.parentElement : host;
    const cross = viaStack && filler instanceof HTMLElement ? crossFits(filler) : noCross;
    const pointerId = event.pointerId;
    const captor = event.currentTarget;
    try { captor.setPointerCapture(pointerId); } catch { /* the pointer may already be gone */ }
    dragRef.current = {
      pointerId, captor, handle, start: { x: event.clientX, y: event.clientY }, last: { x: event.clientX, y: event.clientY, shift: event.shiftKey },
      scale, zoom, w0, h0, host, hit, element, target: shown, selection, parentWidth: contentWidth(parent), mainAxis,
      values: {}, active: false, saved: new Map(), stack: false, min, cross, count,
      grid: shown.width?.kind === "column" && gridCellNow ? { element: gridCellNow.element, saved: new Map() } : null,
    };
    const onMove = (move: PointerEvent) => { if (move.pointerId === pointerId) update(move.clientX, move.clientY, move.shiftKey); };
    const onUp = (up: PointerEvent) => {
      if (up.pointerId !== pointerId) return;
      update(up.clientX, up.clientY, up.shiftKey);
      void commit();
    };
    const onCancel = (cancel: PointerEvent) => { if (cancel.pointerId === pointerId) finish(false); };
    const onKey = (key: KeyboardEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (key.key === "Escape" && key.type === "keydown") {
        // Escape cancels the resize only (no parent selection step).
        key.preventDefault();
        key.stopPropagation();
        finish(false);
        if (drag.active) announce("Resize cancelled");
      } else if (key.key === "Shift") update(drag.last.x, drag.last.y, key.type === "keydown");
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

  /** Double-click: Hug on the handle's axes (an edge: its axis; a corner: both). */
  const onDoubleClick = (event: ReactMouseEvent<HTMLDivElement>, handle: Handle) => {
    event.preventDefault();
    event.stopPropagation();
    if (!shown || !hit || !element) return;
    const selection = studioStore.getState().selection;
    if (selection?.kind !== "node" || selection.part || selection.src !== hit.src) return;
    const axes: ResizeAxis[] = [...(handle.sx && shown.width ? ["width" as const] : []), ...(handle.sy && shown.height ? ["height" as const] : [])];
    // Its Studio wrap Stack hugs on these axes: what that Stack fills keeps the other one.
    const stack = shown.wrapper && host?.parentElement instanceof HTMLElement ? host.parentElement : null;
    const plan = planHug(hit.name, shown, axes, element.attributes, { cross: stack ? crossFits(stack) : noCross, count });
    if ("none" in plan) {
      inspectorStatus.set("neutral", plan.none);
      return;
    }
    void write({ hit, element, selection }, plan);
  };

  // The pill's rendered width, so a long reason stays inside the canvas (read after each render; set only on a change).
  const pillRef = useRef<HTMLSpanElement>(null);
  const [pillWidth, setPillWidth] = useState(0);
  useLayoutEffect(() => {
    const width = pillRef.current?.offsetWidth ?? 0;
    setPillWidth((last) => (Math.abs(last - width) > 1 ? width : last));
  });

  const portal = chromePortal ? createPortal(<VisuallyHidden role="status" aria-live="polite">{announcement}</VisuallyHidden>, chromePortal) : null;
  const sized = shown ?? explained ?? (svgShown && hit ? svgTarget(hit.name) : null);
  const outlined = host ?? svg;
  if (!sized || !box || !hit || !outlined) return portal;

  const drag = dragRef.current;
  const visible = shown ? handles.filter((handle) => {
    const corner = handle.sx !== 0 && handle.sy !== 0;
    if (corner) return shown.corners;
    return handle.sx ? Boolean(shown.width) : Boolean(shown.height);
  }) : [];
  const half = STRIP / 2;
  const geometry = (handle: Handle): CSSProperties => {
    const left = handle.sx < 0 ? box.x : handle.sx > 0 ? box.x + box.w : box.x;
    const top = handle.sy < 0 ? box.y : handle.sy > 0 ? box.y + box.h : box.y;
    if (handle.sx && handle.sy) return { transform: `translate(${left - CORNER / 2}px, ${top - CORNER / 2}px)`, width: CORNER, height: CORNER };
    // Edge strips run between the corner squares (the whole edge when there are no corners).
    const inset = sized.corners ? CORNER / 2 : 0;
    if (handle.sx) return { transform: `translate(${left - half}px, ${box.y + inset}px)`, width: STRIP, height: Math.max(0, box.h - inset * 2) };
    return { transform: `translate(${box.x + inset}px, ${top - half}px)`, width: Math.max(0, box.w - inset * 2), height: STRIP };
  };

  // The pill: the size being dragged, else the element's size and modes ("Hug · 312 × 40").
  const measured = host ? { width: host.offsetWidth, height: host.offsetHeight } : cssSize(outlined);
  const modeOf = (axis: ResizeAxis): AxisMode => currentMode(sized, axis, outlined, hit.props);
  const axisLabel = (axis: ResizeAxis) => {
    const value = live?.values[axis];
    if (value !== undefined) return axisText(axis === "width" && live?.fill ? "fill" : "fixed", value);
    return axisText(modeOf(axis), measured[axis]);
  };
  const viewHeight = viewport?.clientHeight ?? Infinity;
  const viewWidth = viewport?.clientWidth ?? Infinity;
  // Centred under the element, kept inside the canvas by its own half width (48 px at least, as before).
  const pillHalf = Math.max(48, pillWidth / 2 + 8);
  const pillX = viewWidth < pillHalf * 2 ? viewWidth / 2 : Math.min(Math.max(box.x + box.w / 2, pillHalf), viewWidth - pillHalf);
  const below = box.y + box.h + 32 <= viewHeight;
  const cursor = drag?.active ? drag.handle.id : undefined;
  // Dragging: where the size goes and how many instances take it ("(in a Stack, all 4)"); else why an axis has no handle.
  const notes = live ? [live.stack ? "in a Stack" : "", live.column ? `Grid column ${live.column}` : "", live.count > 1 ? `all ${live.count}` : ""].filter(Boolean) : [];
  const why = sized.why?.length ? sized.why.join(" · ") : null;
  const suffix = live ? (notes.length ? ` (${notes.join(", ")})` : "") : why ? ` · ${why}` : "";

  return (
    <>
      {visible.map((handle) => (
        <div
          key={handle.id}
          className="studio-resize__handle"
          data-handle={handle.id}
          data-kind={handle.sx && handle.sy ? "corner" : "edge"}
          data-short={handle.sx && handle.sy ? undefined : (handle.sx ? box.h : box.w) - (sized.corners ? CORNER : 0) < 10 ? "true" : undefined}
          style={geometry(handle)}
          onPointerDown={(event) => onPointerDown(event, handle)}
          onDoubleClick={(event) => onDoubleClick(event, handle)}
          onContextMenu={(event) => event.preventDefault()}
        />
      ))}
      {cursor ? <div className="studio-resize__cover" data-handle={cursor} /> : null}
      <span
        ref={pillRef}
        className={`studio-resize__pill ${typographyStyles["Caption/Medium"]}`}
        data-place={below ? "below" : "inside"}
        data-dragging={live ? "true" : undefined}
        style={{ transform: `translate(${pillX}px, ${box.y + box.h}px)` }}
      >
        {`${axisLabel("width")} × ${axisLabel("height")}${suffix}`}
      </span>
      {portal}
    </>
  );
}
