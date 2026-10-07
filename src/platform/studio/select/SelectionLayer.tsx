import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { typographyStyles } from "../../../tokens/typography.generated";
import { canvasApi } from "../canvas/viewport";
import { inspectorStatus } from "../inspector/status";
import { studioStore, useStudio } from "../store";
import type { StudioSelection } from "../types";
import { annotatedAt, childHits, findBySrc, frameOfFiber, hitForHost, isTypingTarget, layerHover, nestedHitAt, onSourceUpdate, parentHit, publishSelectionInfo, rectOf, selectHit, shortSrc, type FiberHit } from "./picker";
import { chainHas, deepPartAt, drillPart, partChildren, partForElement, pathOf, resolvePart, selectedPartStore, selectPart, withoutPart, type PartHit } from "./parts";
import { openCanvasMenu, openEmptyCanvasMenu, openFrameMenu } from "../shell/CanvasMenu";
import { awaitedRender, awaitedRenderShown, awaitingWriteRender, remapPart, remapSelection, sameSelectedElement, writeRendered } from "./remap";
import { ResizeLayer } from "./ResizeLayer";
import { SpacingLayer } from "./SpacingLayer";
import { layerOfHit, multiSelection, toggleLayer, useExtraSelection, type ExtraLayer } from "./multiSelection";
import { isOffCanvasSelection } from "../slots/actions";
import { startTextEditOnSelection, tryStartTextEdit } from "../edit/textEdit";
import { pressLayer } from "../edit/drag";
import { pressDataItem } from "../edit/itemDrag";
import { startMarquee } from "../edit/marquee";
import { sameAreas, sameOwner, spacingAreas, type Box, type SpacingArea, type SpacingOwner } from "./spacing";
import "./select.css";

/*
 * Select tool (spec §5): a transparent capture layer over the canvas viewport takes every pointer event, so the
 * examples never see hover, focus or clicks; document.elementsFromPoint finds what lies under the cursor. Outlines are
 * drawn here in viewport coordinates and follow pan/zoom, scrolling inside frames, resizes and re-renders.
 */

/** An outline with its name tag: `meta` is the file:line of an element, "in <Owner>" for a part. */
type Tagged = Box & { name: string; src: string; meta: string };
/** `spacing`: the selection's padding and gap areas; `spacingOwner`: the element they belong to. */
type Overlay = { hover: Tagged | null; selected: Tagged | null; owner: Box | null; instances: Box[]; extras: Box[]; spacing: SpacingArea[]; spacingOwner: SpacingOwner | null };
type Pick =
  /** `element`: the topmost DOM node under the pointer (deep select starts there). */
  | { kind: "node"; hit: FiberHit; frame: Element; element: Element }
  | { kind: "frame"; frame: Element }
  | { kind: "chrome"; element: Element }
  | { kind: "empty" };

const emptyOverlay: Overlay = { hover: null, selected: null, owner: null, instances: [], extras: [], spacing: [], spacingOwner: null };

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

/*
 * The selected element followed through re-renders by its first DOM node (React keeps host nodes when it re-renders
 * after a source edit), with the annotation the canvas showed and the selection's location when they last agreed.
 */
type Tracked = { host: WeakRef<Element>; name: string; domSrc: string; selSrc: string; selection: StudioSelection };
/* The selected part, followed through re-renders by its first DOM node (its path is recomputed from it). */
type TrackedPart = { element: WeakRef<Element>; name: string; selection: StudioSelection };

function selectionKey(selection: StudioSelection | null) {
  if (!selection) return "";
  if (selection.kind === "frame") return `frame:${selection.frameId}`;
  return `node:${selection.src}#${selection.instance}${selection.part ? `/${selection.part.path.join(".")}:${selection.part.name}` : ""}`;
}

/*
 * The deepest DOM node at a point, below `element` (the topmost hit): icons and labels often take no pointer events
 * (pointer-events: none), so elementsFromPoint stops at their button. An icon's drawing (inside its svg) is not a part.
 */
function deepestAt(element: Element, x: number, y: number): Element {
  let current = element;
  try {
    for (let depth = 0; depth < 40 && current.localName !== "svg"; depth++) {
      let next: Element | null = null;
      for (let index = current.children.length - 1; index >= 0; index--) {
        const child = current.children[index];
        const rect = child.getBoundingClientRect();
        if (!rect.width || !rect.height || x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
        if (getComputedStyle(child).visibility === "hidden") continue;
        next = child;
        break;
      }
      if (!next) break;
      current = next;
    }
  } catch {
    // A node went away mid-walk: the deepest one found.
  }
  return current;
}

function frameElement(world: Element | null, frameId: string | null) {
  if (!world || !frameId) return null;
  return Array.from(world.querySelectorAll("[data-studio-frame]")).find((frame) => frame.getAttribute("data-studio-frame") === frameId) ?? null;
}

const sameBox = (a: Box | null, b: Box | null) => a === b || Boolean(a && b && Math.abs(a.x - b.x) < 0.25 && Math.abs(a.y - b.y) < 0.25 && Math.abs(a.w - b.w) < 0.25 && Math.abs(a.h - b.h) < 0.25);
const sameList = (a: Box[], b: Box[]) => a.length === b.length && a.every((box, index) => sameBox(box, b[index]));
const sameTagged = (a: Tagged | null, b: Tagged | null) => a === b || Boolean(a && b && a.src === b.src && a.name === b.name && a.meta === b.meta && sameBox(a, b));
const sameOverlay = (a: Overlay, b: Overlay) => sameTagged(a.hover, b.hover) && sameTagged(a.selected, b.selected) && sameBox(a.owner, b.owner) && sameList(a.instances, b.instances) && sameList(a.extras, b.extras) && sameAreas(a.spacing, b.spacing) && sameOwner(a.spacingOwner, b.spacingOwner);

/** Capture layer (Select tool) + hover/selection outlines, in canvas-viewport coordinates. */
export function SelectionLayer({ viewport, world }: { viewport: HTMLElement | null; world: HTMLElement | null }) {
  const tool = useStudio((state) => state.tool);
  const presenting = useStudio((state) => state.presenting);
  const selection = useStudio((state) => state.selection);
  // Shift multi-selection (select/multiSelection.ts): the other selected layers, outlined as extras.
  const extraLayers = useExtraSelection();
  const rootRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [overlay, setOverlay] = useState<Overlay>(emptyOverlay);
  const overlayRef = useRef(overlay);
  const selectedRef = useRef<FiberHit | null>(null);
  /** The selected part of selectedRef (deep select), or null. */
  const partRef = useRef<PartHit | null>(null);
  const trackedPartRef = useRef<TrackedPart | null>(null);
  /** The selection when the current click sequence began (a double-click acts on what was selected before it). */
  const pressSelectionRef = useRef<StudioSelection | null>(null);
  /** Cmd/Ctrl held: hover and click reach the parts inside components. */
  const deepRef = useRef(false);
  /** The stored part was not found yet (selection key, since when). */
  const partMissRef = useRef<{ key: string; at: number } | null>(null);
  /** The latest resolve(), for the part's grace-period retry. */
  const resolveRef = useRef<() => boolean>(() => true);
  const instancesRef = useRef<FiberHit[]>([]);
  const extrasRef = useRef<FiberHit[]>([]);
  const trackedRef = useRef<Tracked | null>(null);
  const hoverRef = useRef<FiberHit | null>(null);
  const hoverFrameRef = useRef<Element | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const passThroughRef = useRef(false);
  const spaceRef = useRef(false);
  const frameRequest = useRef(0);
  const settleUntil = useRef(0);
  const toolRef = useRef(tool);
  toolRef.current = tool;

  const measure = useCallback(() => {
    frameRequest.current = 0;
    const root = rootRef.current;
    if (!root) return;
    const origin = root.getBoundingClientRect();
    const toBox = (rect: DOMRect): Box => ({ x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height });
    const boxOf = (hit: FiberHit | null) => {
      const rect = hit ? rectOf(hit.hosts) : null;
      return rect ? toBox(rect) : null;
    };
    const tagged = (hit: FiberHit | null): Tagged | null => {
      const box = boxOf(hit);
      if (!hit || !box) return null;
      const owner = (hit as Partial<PartHit>).owner;
      return { ...box, name: hit.name, src: hit.src, meta: owner ? `in ${owner.name}` : shortSrc(hit.src) };
    };
    const part = partRef.current;
    const selected = part ?? selectedRef.current;
    const hover = layerHover.get() ?? (toolRef.current === "select" ? hoverRef.current : null);
    // Padding and gaps: a layout component's edit its props; a part's or a host element's are shown read-only.
    const layout = selected ? spacingAreas(selected, Boolean(part), toBox) : { owner: null, areas: [] };
    const next: Overlay = {
      hover: hover && (!selected || hover.fiber !== selected.fiber) ? tagged(hover) : null,
      selected: tagged(selected),
      owner: part ? boxOf(selectedRef.current) : null,
      instances: toolRef.current === "select" && !part ? instancesRef.current.flatMap((hit) => boxOf(hit) ?? []) : [],
      extras: extrasRef.current.flatMap((hit) => boxOf(hit) ?? []),
      spacing: layout.areas,
      spacingOwner: layout.owner,
    };
    if (!sameOverlay(next, overlayRef.current)) {
      overlayRef.current = next;
      setOverlay(next);
    }
    // Keep following for a moment after a change (CSS transitions, layout settling).
    if (performance.now() < settleUntil.current) frameRequest.current = requestAnimationFrame(measure);
  }, []);

  const schedule = useCallback((settle = 240) => {
    settleUntil.current = Math.max(settleUntil.current, performance.now() + settle);
    if (!frameRequest.current) frameRequest.current = requestAnimationFrame(measure);
  }, [measure]);

  /** The stored selection no longer matches what the canvas renders: drop it and say so, never move it silently. */
  const dropLost = useCallback(() => {
    // A selection the Studio's own write moved onto an element the next render shows (Detach) is never given up for the
    // render before it.
    if (awaitedRender(studioStore.getState().selection)) return;
    selectedRef.current = null;
    instancesRef.current = [];
    trackedRef.current = null;
    partRef.current = null;
    trackedPartRef.current = null;
    selectedPartStore.set(null);
    publishSelectionInfo("", 0);
    if (studioStore.getState().selection?.kind !== "node") return;
    inspectorStatus.set("negative", "Selection lost after the file changed");
    studioStore.setState({ selection: null });
  }, []);

  /**
   * The selected part of `owner`: followed by its first DOM node while that is still rendered (its path recomputed),
   * else found by its path. A part that is gone leaves the owner selected and says so.
   */
  const adoptPart = useCallback((owner: FiberHit, current: NodeSelection) => {
    const ref = current.part;
    if (!ref) {
      partRef.current = null;
      trackedPartRef.current = null;
      selectedPartStore.set(null);
      return;
    }
    const tracked = trackedPartRef.current && sameSelectedElement(trackedPartRef.current.selection, current) ? trackedPartRef.current : null;
    const element = tracked?.element.deref();
    let part = tracked && element?.isConnected ? partForElement(owner, element, tracked.name) : null;
    part ??= resolvePart(owner, ref);
    if (!part) {
      partRef.current = null;
      trackedPartRef.current = null;
      selectedPartStore.set(null);
      // Content that loads a moment later (lazy icons) gets a short grace period before the part is given up.
      const key = selectionKey(current);
      const miss = partMissRef.current;
      if (!miss || miss.key !== key) {
        partMissRef.current = { key, at: performance.now() };
        window.setTimeout(() => { if (partMissRef.current?.key === key) resolveRef.current(); }, 700);
        return;
      }
      if (performance.now() - miss.at < 600) return;
      partMissRef.current = null;
      inspectorStatus.set("neutral", `${ref.name} is not rendered any more: ${owner.name} is selected`);
      studioStore.setState({ selection: withoutPart(current) });
      return;
    }
    partMissRef.current = null;
    partRef.current = part;
    selectedPartStore.set(part);
    trackedPartRef.current = { element: new WeakRef(part.element), name: part.name, selection: current };
    if (part.path.join(".") !== ref.path.join(".")) {
      remapPart({ path: part.path, name: part.name });
      if (trackedPartRef.current) trackedPartRef.current.selection = studioStore.getState().selection ?? current;
    }
  }, []);

  /** Shows `hit` as the selection; `agreed` when the canvas and the stored location name the same place. */
  const adopt = useCallback((hit: FiberHit, current: NodeSelection, agreed: boolean) => {
    selectedRef.current = hit;
    // Other instances of the same JSX element, from the same render as the hit.
    const all = world ? findBySrc(world, hit.src) : [];
    instancesRef.current = all.filter((other) => other.fiber !== hit.fiber && other.hosts[0] !== hit.hosts[0]);
    publishSelectionInfo(current.src, Math.max(all.length, 1));
    const host = hit.hosts[0];
    const tracked = trackedRef.current;
    if (!agreed && tracked) tracked.selection = current;
    else trackedRef.current = host ? { host: new WeakRef(host), name: hit.name, domSrc: hit.src, selSrc: current.src, selection: current } : null;
    adoptPart(hit, current);
  }, [world, adoptPart]);

  /*
   * Resolve the stored selection (src + instance) to rendered DOM; retried while the page renders (reload, HMR).
   * 1. The element is followed by its first DOM node. While the canvas still shows the render before a write it stays
   *    put (the stored location may already be remapped for that write). After a re-render the node's new annotation is
   *    the truth when the Studio did not remap the selection (a change from another session or the editor).
   * 2. Else by source location, and a hit whose name differs from the selection is stale: the selection is dropped
   *    rather than silently moved to another element.
   */
  const resolve = useCallback(() => {
    const current = studioStore.getState().selection;
    if (!world || current?.kind !== "node") {
      selectedRef.current = null;
      instancesRef.current = [];
      trackedRef.current = null;
      partRef.current = null;
      trackedPartRef.current = null;
      selectedPartStore.set(null);
      publishSelectionInfo("", 0);
      return true;
    }
    const before = awaitedRender(current);
    if (before) {
      // Waiting for the element a Studio write creates (Detach, its undo): only an element of its name that was not on
      // the page before the write is it (React keeps the nodes of the rows a write did not change); until the
      // re-render shows it, nothing is adopted and nothing is dropped.
      const hit = findBySrc(world, current.src)[current.instance] ?? null;
      if (!hit || hit.name !== current.name || !hit.hosts.length || before.has(hit.hosts[0])) return false;
      trackedRef.current = null;
      adopt(hit, current, true);
      awaitedRenderShown(current);
      return true;
    }
    const tracked = trackedRef.current && sameSelectedElement(trackedRef.current.selection, current) ? trackedRef.current : null;
    const host = tracked?.host.deref();
    const followed = tracked && host?.isConnected ? hitForHost(host, tracked.name) : null;
    if (tracked && followed) {
      if (followed.src === current.src) {
        adopt(followed, current, true);
        return true;
      }
      if (followed.src === tracked.domSrc) {
        // Not re-rendered yet.
        adopt(followed, current, false);
        return true;
      }
      // The DOM moved and the selection did not follow yet. Not when a Studio write already remapped the selection since
      // it was tracked (`current` is then a newer object): until the re-render the node still carries the old line, and
      // following it would undo the write's remap (a nested edit above the owner, switched on then off).
      if (current.src === tracked.selSrc && current === tracked.selection) {
        remapSelection(followed.src);
        return true;
      }
      // Re-rendered somewhere other than where the Studio's own write put it: trust the write (React may have reused
      // the node for a sibling inserted before it).
    }
    const hits = findBySrc(world, current.src);
    const hit = hits[current.instance] ?? hits[0] ?? null;
    if (!hit) return false;
    if (hit.name !== current.name) {
      // The canvas may still show the render before a write: wait for the re-render before judging.
      if (awaitingWriteRender()) return false;
      dropLost();
      return true;
    }
    adopt(hit, current, true);
    return true;
  }, [world, adopt, dropLost]);
  resolveRef.current = () => {
    const found = resolve();
    schedule();
    return found;
  };

  const key = selectionKey(selection);
  useEffect(() => {
    let tries = 0;
    let timer = 0;
    let afterUpdate = false;
    const attempt = () => {
      const found = resolve();
      schedule();
      if (found) return;
      // An awaited element (Detach) keeps the retries going until it renders or its wait ends.
      if (tries++ < 20 || awaitedRender(studioStore.getState().selection)) timer = window.setTimeout(attempt, 100);
      // Still nowhere on the canvas after a source update: the file changed under it (another session, the editor) —
      // unless the inspector selected it from the source because the canvas cannot show it (an overlay's slot content).
      else if (afterUpdate && !isOffCanvasSelection(studioStore.getState().selection)) dropLost();
    };
    attempt();
    const offUpdate = onSourceUpdate(() => { writeRendered(); afterUpdate = true; tries = 0; window.clearTimeout(timer); attempt(); });
    return () => { window.clearTimeout(timer); offUpdate(); };
  }, [key, resolve, schedule, dropLost]);

  /** The extra layers on the canvas: each one's render (`instance`), dropped while the name there differs. */
  const resolveExtras = useCallback((layers: ExtraLayer[]) => {
    extrasRef.current = world ? layers.flatMap((layer) => {
      const hit = findBySrc(world, layer.src)[layer.instance] ?? null;
      return hit && hit.name === layer.name && hit.hosts.length ? [hit] : [];
    }) : [];
    schedule(0);
  }, [world, schedule]);
  useEffect(() => {
    resolveExtras(extraLayers);
    // After a source update the canvas re-renders: read them again once it settled.
    let timer = 0;
    const off = onSourceUpdate(() => { window.clearTimeout(timer); timer = window.setTimeout(() => resolveExtras(multiSelection.get()), 150); });
    return () => { window.clearTimeout(timer); off(); };
  }, [extraLayers, resolveExtras]);

  // Re-measure on pan/zoom, scrolling inside frames, resizes and DOM changes (throttled).
  useEffect(() => {
    const offCanvas = canvasApi.onChange(() => schedule(0));
    const offHover = layerHover.subscribe(() => schedule(0));
    const onScroll = () => schedule(0);
    const onResize = () => schedule();
    world?.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onResize);
    let mutationTimer = 0;
    const mutations = new MutationObserver(() => {
      if (mutationTimer) return;
      mutationTimer = window.setTimeout(() => {
        mutationTimer = 0;
        // Re-walk the fibers only when the rendered element went away (re-render, HMR) or is not found yet.
        const connected = (hit: FiberHit) => hit.hosts.length > 0 && hit.hosts.every((host) => host.isConnected);
        const selected = selectedRef.current;
        const stale = !selected || !connected(selected) || instancesRef.current.some((hit) => !connected(hit)) || Boolean(partRef.current && !connected(partRef.current));
        if (stale && studioStore.getState().selection?.kind === "node") resolve();
        if (extrasRef.current.some((hit) => !connected(hit))) resolveExtras(multiSelection.get());
        else if (partRef.current) {
          // The part is still rendered, but nodes before it may have come or gone: keep its stored path current.
          const part = partRef.current;
          const path = pathOf(part.owner, part.element);
          if (path && path.join(".") !== part.path.join(".")) {
            partRef.current = { ...part, path };
            selectedPartStore.set(partRef.current);
            remapPart({ path, name: part.name });
            if (trackedPartRef.current) trackedPartRef.current.selection = studioStore.getState().selection ?? trackedPartRef.current.selection;
          }
        }
        if (hoverRef.current && !hoverRef.current.hosts.every((host) => host.isConnected)) hoverRef.current = null;
        schedule();
      }, 150);
    });
    if (world) mutations.observe(world, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "hidden", "open", "data-state"] });
    const resizes = new ResizeObserver(() => schedule());
    if (viewport) resizes.observe(viewport);
    if (world) resizes.observe(world);
    return () => {
      offCanvas();
      offHover();
      world?.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onResize);
      window.clearTimeout(mutationTimer);
      mutations.disconnect();
      resizes.disconnect();
    };
  }, [viewport, world, resolve, resolveExtras, schedule]);

  // The selected element's own size changes (content edits, playground props).
  const selectedHosts = overlay.selected ? selectedRef.current?.hosts : undefined;
  useEffect(() => {
    if (!selectedHosts?.length) return undefined;
    const resizes = new ResizeObserver(() => schedule());
    selectedHosts.forEach((host) => resizes.observe(host));
    return () => resizes.disconnect();
  }, [selectedHosts, schedule]);

  const setHoverFrame = useCallback((frame: Element | null) => {
    if (hoverFrameRef.current === frame) return;
    hoverFrameRef.current?.removeAttribute("data-studio-hover");
    hoverFrameRef.current = frame;
    frame?.setAttribute("data-studio-hover", "true");
  }, []);

  const setPassThrough = useCallback((on: boolean) => {
    if (passThroughRef.current === on) return;
    passThroughRef.current = on;
    if (captureRef.current) captureRef.current.style.pointerEvents = on ? "none" : "";
  }, []);

  const pick = useCallback((x: number, y: number): Pick => {
    if (!world) return { kind: "empty" };
    const root = rootRef.current;
    // Overlays an example left open take no pointer events in Select (studio.css): hit-test them for this pick only.
    const portal = world.closest(".studio-canvas-area")?.querySelector<HTMLElement>(":scope > .studio-portal-root") ?? null;
    if (portal) portal.dataset.picking = "true";
    let elements: Element[];
    try {
      elements = document.elementsFromPoint(x, y);
    } finally {
      if (portal) delete portal.dataset.picking;
    }
    for (const element of elements) {
      if (root?.contains(element)) continue;
      // An overlay of an example (a Dialog it opened): the element that renders it, in the frame it renders from.
      if (portal?.contains(element)) {
        const hit = annotatedAt(element);
        const frame = hit ? frameOfFiber(hit.fiber, world) : null;
        if (hit && frame && hit.hosts.length) return { kind: "node", hit, frame, element };
        continue;
      }
      // Studio chrome over the canvas (frame labels, zoom, status) or the empty canvas: nothing of the world here.
      if (!world.contains(element)) return { kind: "empty" };
      const chrome = element.closest("[data-studio-frame-chrome]");
      if (chrome) return { kind: "chrome", element };
      const frame = element.closest("[data-studio-frame]");
      if (!frame) return { kind: "empty" };
      const hit = annotatedAt(element);
      if (hit && hit.hosts.length && frame.contains(hit.hosts[0])) return { kind: "node", hit, frame, element };
      return { kind: "frame", frame };
    }
    return { kind: "empty" };
  }, [world]);

  /**
   * A press on the selected element where an outer layer covers it on the canvas (a nested instance under a clickable
   * row's click target, reached by double-click): the selection stays, as in Figma, so the next double-click goes on
   * into its parts instead of back out to the outer layer.
   */
  const keepSelected = useCallback((picked: Pick, x: number, y: number): Pick => {
    const selected = selectedRef.current;
    if (picked.kind !== "node" || !selected || partRef.current || selected.src === picked.hit.src) return picked;
    const target = deepestAt(picked.element, x, y);
    const onSelected = selected.hosts.some((host) => host.contains(target));
    const coveredBy = picked.hit.hosts.some((outer) => selected.hosts.some((inner) => outer !== inner && outer.contains(inner)));
    return onSelected && coveredBy ? { ...picked, hit: selected } : picked;
  }, []);

  /** Whether a click at `picked` reaches the parts: Cmd/Ctrl held, or inside the owner of the selected part. */
  const deepAt = useCallback((picked: Pick, modifier: boolean) => {
    if (picked.kind !== "node") return false;
    if (modifier) return true;
    const owner = selectedRef.current;
    return Boolean(partRef.current && owner && picked.hit.src === owner.src && picked.hit.hosts[0] === owner.hosts[0]);
  }, []);

  /** The part a click at `picked` selects: the selected part when the cursor is on it, else the nearest internal component. */
  const partAt = useCallback((picked: Pick & { kind: "node" }, x: number, y: number) => {
    const target = deepestAt(picked.element, x, y);
    const current = partRef.current;
    if (current && current.owner.hosts[0] === picked.hit.hosts[0] && chainHas(picked.hit, target, current)) return current;
    return deepPartAt(picked.hit, target);
  }, []);

  const hoverAt = useCallback(() => {
    const point = pointerRef.current;
    if (!point || toolRef.current !== "select") return;
    const picked = pick(point.x, point.y);
    setPassThrough(picked.kind === "chrome");
    const hit = picked.kind === "node" ? (deepAt(picked, deepRef.current) ? partAt(picked, point.x, point.y) ?? picked.hit : picked.hit) : null;
    setHoverFrame(picked.kind === "node" || picked.kind === "frame" ? picked.frame : null);
    if (hit?.fiber !== hoverRef.current?.fiber || hit?.src !== hoverRef.current?.src) {
      hoverRef.current = hit;
      schedule(0);
    }
  }, [pick, schedule, setHoverFrame, setPassThrough, deepAt, partAt]);

  const hoverRequest = useRef(0);
  const trackPointer = useCallback((event: PointerEvent | ReactPointerEvent) => {
    pointerRef.current = { x: event.clientX, y: event.clientY };
    deepRef.current = event.metaKey || event.ctrlKey;
    if (hoverRequest.current) return;
    hoverRequest.current = requestAnimationFrame(() => { hoverRequest.current = 0; hoverAt(); });
  }, [hoverAt]);

  const clearHover = useCallback(() => {
    pointerRef.current = null;
    setHoverFrame(null);
    if (hoverRef.current) {
      hoverRef.current = null;
      schedule(0);
    }
  }, [schedule, setHoverFrame]);

  // While the pointer is over frame chrome (labels, frame toolbars) the capture layer lets events through; the
  // viewport listener (capture phase) sees every move and turns the layer back on once the pointer leaves the chrome.
  useEffect(() => {
    if (!viewport || tool !== "select") {
      setPassThrough(false);
      clearHover();
      return undefined;
    }
    const onMove = (event: PointerEvent) => { if (passThroughRef.current) trackPointer(event); };
    const onLeave = () => { setPassThrough(false); clearHover(); };
    viewport.addEventListener("pointermove", onMove, true);
    viewport.addEventListener("pointerleave", onLeave);
    return () => {
      viewport.removeEventListener("pointermove", onMove, true);
      viewport.removeEventListener("pointerleave", onLeave);
    };
  }, [viewport, tool, trackPointer, clearHover, setPassThrough]);

  const choose = useCallback((hit: FiberHit, additive: boolean) => {
    if (additive) {
      // Shift+click adds the layer to the selection or takes it out (the inspector then shows what they share).
      toggleLayer(layerOfHit(hit, world));
      schedule(0);
      return;
    }
    multiSelection.clear();
    selectedRef.current = hit;
    partRef.current = null;
    selectHit(hit, world);
    schedule(0);
  }, [schedule, world]);

  /** Selects a part (deep select): the overlay shows it at once, the store keeps its owner as `src`. */
  const choosePart = useCallback((part: PartHit) => {
    multiSelection.clear();
    selectedRef.current = part.owner;
    partRef.current = part;
    selectPart(part, world);
    schedule(0);
  }, [schedule, world]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || spaceRef.current) return;
    const picked = keepSelected(pick(event.clientX, event.clientY), event.clientX, event.clientY);
    if (picked.kind === "chrome") {
      // Normally unreachable (the layer lets chrome events through); forward the press to the control.
      picked.element.closest<HTMLElement>("button, a[href], [role='button'], [tabindex]")?.click();
      return;
    }
    if (picked.kind === "node") {
      if (event.detail <= 1) pressSelectionRef.current = studioStore.getState().selection;
      // Cmd/Ctrl+click anywhere, or a click inside the owner of the selected part: the part under the cursor.
      if (!event.shiftKey && deepAt(picked, event.metaKey || event.ctrlKey)) {
        const part = partAt(picked, event.clientX, event.clientY);
        if (part) {
          choosePart(part);
          // A data-slot item (TopNavigation's trailing action) can then be dragged: reorder it, or group it (edit/itemDrag.ts).
          pressDataItem(event.nativeEvent, part, choosePart);
          return;
        }
      }
      // On the selected host, a press on one of its data-slot items drags that item; a click still selects as before.
      const host = selectedRef.current;
      if (!event.shiftKey && !partRef.current && host && picked.hit.src === host.src && picked.hit.hosts[0] === host.hosts[0]) {
        const part = partAt(picked, event.clientX, event.clientY);
        if (part && pressDataItem(event.nativeEvent, part, choosePart, () => choose(picked.hit, false))) return;
      }
      // A press can drag the layer (Figma; edit/drag.ts): inside the selected layer it drags that one, and a click
      // without moving still selects what is under the pointer.
      if (pressLayer(event.nativeEvent, picked.hit, () => choose(picked.hit, event.shiftKey))) return;
      choose(picked.hit, event.shiftKey);
      return;
    }
    pressSelectionRef.current = null;
    if (picked.kind === "frame") {
      const selectFrame = () => {
        multiSelection.clear();
        const frameId = picked.frame.getAttribute("data-studio-frame");
        if (frameId) studioStore.setState({ selection: { kind: "frame", frameId } });
      };
      // A drag on a frame's background draws a marquee (Figma; edit/marquee.ts); a click selects the frame.
      if (startMarquee(event.nativeEvent, selectFrame)) return;
      selectFrame();
      return;
    }
    // Empty canvas: a drag draws a marquee (Figma; Space, the Hand tool and scrolling pan), a click clears the selection.
    if (startMarquee(event.nativeEvent, () => { multiSelection.clear(); studioStore.setState({ selection: null }); })) return;
    // Otherwise (never in the Select tool today): drag pans; a click without movement clears the selection.
    const start = { x: event.clientX, y: event.clientY };
    canvasApi.startPan(event.nativeEvent);
    const stop = () => {
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", stop, true);
      window.removeEventListener("blur", stop);
    };
    const onUp = (up: PointerEvent) => {
      stop();
      if (Math.hypot(up.clientX - start.x, up.clientY - start.y) < 4) {
        multiSelection.clear();
        studioStore.setState({ selection: null });
      }
    };
    window.addEventListener("pointerup", onUp, true);
    // A release outside the window or a cancelled pointer never reaches pointerup.
    window.addEventListener("pointercancel", stop, true);
    window.addEventListener("blur", stop);
  };

  /**
   * Right-click: the canvas menu for the selected element (kept when the pointer is on it, else the element there); on a
   * frame's empty area its frame menu, on the empty canvas the canvas menu (E2E ST-04).
   */
  const onContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const picked = pick(event.clientX, event.clientY);
    if (picked.kind === "frame") {
      const frameId = picked.frame.getAttribute("data-studio-frame");
      if (frameId) openFrameMenu(event.clientX, event.clientY, frameId);
      return;
    }
    if (picked.kind === "empty") { openEmptyCanvasMenu(event.clientX, event.clientY); return; }
    if (picked.kind !== "node") return;
    const current = studioStore.getState().selection;
    const selectedHost = selectedRef.current?.hosts;
    const onSelected = current?.kind === "node" && !current.part && Boolean(selectedHost?.some((host) => host.contains(picked.element)));
    const onExtra = extrasRef.current.some((extra) => extra.hosts.some((host) => host.contains(picked.element)));
    if (!onSelected && !onExtra) choose(picked.hit, false);
    const selection = studioStore.getState().selection;
    if (selection?.kind === "node") openCanvasMenu(event.clientX, event.clientY, selection);
  };

  const onDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const picked = keepSelected(pick(event.clientX, event.clientY), event.clientX, event.clientY);
    if (picked.kind !== "node" || event.shiftKey) return;
    // A resize handle's double-click (Hug) is ResizeLayer's.
    if (event.target instanceof Element && event.target.closest(".studio-resize__handle, .studio-resize__cover")) return;
    // On a component that was already selected (or one of its parts): one level in, like Figma — the nested instance
    // written in the source under the cursor first (editable), else its read-only parts.
    const before = pressSelectionRef.current;
    const owner = selectedRef.current;
    if (before?.kind === "node" && before.src === picked.hit.src && owner && owner.hosts[0] === picked.hit.hosts[0]) {
      const target = deepestAt(picked.element, event.clientX, event.clientY);
      const current = partRef.current;
      if (before.part && current) {
        const deeper = drillPart(picked.hit, target, current);
        if (deeper) choosePart(deeper);
        // The innermost part: its text (the owner's) is edited in place (edit/textEdit.ts).
        else tryStartTextEdit(event.clientX, event.clientY, picked.hit.src);
        return;
      }
      const nested = picked.hit.isComponent ? nestedHitAt(picked.hit, target) : null;
      if (nested) {
        choose(nested, false);
        studioStore.setState({ inspectorTab: "design" });
        return;
      }
      // Text the selected element writes itself (a text child or a string prop): edit it in place, Figma-like.
      if (tryStartTextEdit(event.clientX, event.clientY, picked.hit.src)) return;
      const part = picked.hit.isComponent ? deepPartAt(picked.hit, target) : null;
      if (part) {
        choosePart(part);
        return;
      }
    }
    choose(picked.hit, false);
    studioStore.setState({ inspectorTab: "design" });
    // The first click of the double-click already deep-selected the element: its own text is edited in place.
    if (tryStartTextEdit(event.clientX, event.clientY, picked.hit.src)) return;
    window.dispatchEvent(new CustomEvent("zen-studio:focus-content"));
  };

  // Escape → parent (then the frame, then nothing); Enter → first child. Space is tracked for Space+drag panning.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === " " && !isTypingTarget(event.target)) spaceRef.current = true;
      if ((event.key === "Meta" || event.key === "Control") && !deepRef.current) { deepRef.current = true; hoverAt(); }
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      const state = studioStore.getState();
      if (state.presenting || state.selection?.kind !== "node") return;
      const current = state.selection;
      if (event.key === "Escape" && current.part) {
        // A part → its owner.
        event.preventDefault();
        multiSelection.clear();
        partRef.current = null;
        studioStore.setState({ selection: withoutPart(current) });
        schedule(0);
      } else if (event.key === "Escape") {
        event.preventDefault();
        const hit = selectedRef.current;
        const frame = frameElement(world, current.frameId);
        const parent = hit ? parentHit(hit, frame) : null;
        if (parent && parent.hosts.length && (!frame || frame.contains(parent.hosts[0]))) choose(parent, false);
        else {
          multiSelection.clear();
          studioStore.setState({ selection: current.frameId ? { kind: "frame", frameId: current.frameId } : null });
        }
      } else if (event.key === "Enter") {
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest("button, a[href], [role='button'], [role='tab'], [role='treeitem'], [role='radio'], [role='option'], [role='menuitem']")) return;
        // A text layer (its source holds only text): Enter edits it, text selected (Figma).
        if (!partRef.current && startTextEditOnSelection()) { event.preventDefault(); return; }
        const hit = selectedRef.current;
        const part = partRef.current;
        // A part → its first part; an element → its first child element, else (a component) its first part.
        const child = hit && !part ? childHits(hit).find((candidate) => candidate.hosts.length) : null;
        if (child) {
          event.preventDefault();
          choose(child, false);
        } else if (hit && part?.fiber) {
          const first = partChildren(part.owner, part.fiber)[0];
          if (first) { event.preventDefault(); choosePart(first); }
        } else if (hit?.fiber && hit.isComponent) {
          const first = partChildren(hit, hit.fiber)[0];
          if (first) { event.preventDefault(); choosePart(first); }
        }
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === " ") spaceRef.current = false;
      if ((event.key === "Meta" || event.key === "Control") && deepRef.current) { deepRef.current = false; hoverAt(); }
    };
    const onBlur = () => { spaceRef.current = false; deepRef.current = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [world, choose, choosePart, schedule, hoverAt]);

  useEffect(() => () => {
    // StrictMode re-runs effects: reset the handles so the next schedule() requests a frame again.
    cancelAnimationFrame(frameRequest.current);
    cancelAnimationFrame(hoverRequest.current);
    frameRequest.current = 0;
    hoverRequest.current = 0;
    hoverFrameRef.current?.removeAttribute("data-studio-hover");
    hoverFrameRef.current = null;
  }, []);

  const style = (box: Box) => ({ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h });
  const { hover, selected } = overlay;
  return (
    <div ref={rootRef} className="studio-selection" aria-hidden="true">
      <SpacingLayer
        areas={overlay.spacing}
        owner={overlay.spacingOwner}
        interactive={tool === "select" && !presenting}
        viewport={viewport}
        onPassPointerDown={onPointerDown}
        onPassPointerMove={trackPointer}
        onPassDoubleClick={onDoubleClick}
      />
      <ResizeLayer
        box={overlay.selected}
        // One element: parts (deep select) are read-only and a Shift multi-selection has no one size.
        hit={overlay.selected && !partRef.current && !overlay.extras.length && selectedRef.current?.src === overlay.selected.src ? selectedRef.current : null}
        interactive={tool === "select" && !presenting}
        viewport={viewport}
      />
      {overlay.instances.map((box, index) => <div key={`i${index}`} className="studio-selection__outline" data-kind="instance" style={style(box)} />)}
      {overlay.extras.map((box, index) => <div key={`e${index}`} className="studio-selection__outline" data-kind="extra" style={style(box)} />)}
      {overlay.owner ? <div className="studio-selection__outline" data-kind="owner" style={style(overlay.owner)} /> : null}
      {hover ? (
        <div className="studio-selection__outline" data-kind="hover" style={style(hover)}>
          <span className="studio-selection__tag" data-place={hover.y < 24 ? "below" : "above"}>
            <span className={typographyStyles["Caption/Medium"]}>{hover.name}</span>
            {hover.meta.startsWith("in ") ? <span className={`studio-selection__tag-src ${typographyStyles["Caption/Regular"]}`}>{hover.meta}</span> : null}
          </span>
        </div>
      ) : null}
      {selected ? (
        <div className="studio-selection__outline" data-kind="selected" style={style(selected)}>
          <span className="studio-selection__tag" data-place={selected.y < 24 ? "below" : "above"}>
            <span className={typographyStyles["Caption/Medium"]}>{selected.name}</span>
            <span className={`studio-selection__tag-src ${typographyStyles["Caption/Regular"]}`}>{selected.meta}</span>
          </span>
        </div>
      ) : null}
      {tool === "select" && !presenting ? (
        <div
          ref={captureRef}
          className="studio-selection__capture"
          onPointerDown={onPointerDown}
          onPointerMove={trackPointer}
          // The pointer moved onto chrome over the canvas (frame labels, zoom, status, toolbars): no stale hover.
          onPointerLeave={() => { if (!passThroughRef.current) clearHover(); }}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
        />
      ) : null}
    </div>
  );
}
