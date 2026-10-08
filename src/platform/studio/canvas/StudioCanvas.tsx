import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PlatformTypographyContext } from "../../PlatformTemplate";
import { FrameChrome } from "../board/FrameChrome";
import { SelectionLayer } from "../select/SelectionLayer";
import { SlotLayer } from "../slots/SlotLayer";
import { ConstraintLayer } from "../position/ConstraintLayer";
import { EditLayer } from "../edit/EditLayer";
import { previewAttributes } from "../shell/modes";
import { setViewport, studioStore, useStudio } from "../store";
import type { StudioViewport } from "../types";
import { attachCanvas, canvasApi, compensateInset, FIRST_VISIT_MIN_ZOOM, notifyCanvas, panBy, setViewportNow, toWorldRect, viewportForWidth, zoomAtClient } from "./viewport";
import { CANVAS_STATUS_ID } from "./CanvasStatus";
import { useKeepSelectionInView } from "./keepInView";
import "./canvas.css";

/** Keys and controls that keep Space for themselves (a focused button presses on Space). */
const SPACE_OWNERS = "input, textarea, select, [contenteditable]:not([contenteditable='false']), button, a[href], [role='button'], [role='tab'], [role='menuitem'], [role='option'], [role='switch'], [role='checkbox'], [role='radio'], [role='slider'], [role='spinbutton']";
/** Chrome on the canvas (frame labels and toolbars, zoom pill) keeps its own pointer events. */
const CANVAS_CHROME = ".studio-frame-label, .studio-frame-toolbar";
/** What Tab can reach (the focus guard looks for the next stop after the world). */
const TABBABLE = "a[href], button, input, select, textarea, summary, iframe, [tabindex], [contenteditable]:not([contenteditable='false'])";
/** Keys that operate a focused control (a button presses, a list moves): swallowed inside the world outside Interact. */
const CONTROL_KEYS = new Set(["Enter", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"]);

/** The first Tab stop after `boundary` in document order that is outside it (frame labels, zoom pill, then the Inspector). */
function nextTabStopAfter(boundary: Element): HTMLElement | null {
  for (const element of Array.from(document.querySelectorAll<HTMLElement>(TABBABLE))) {
    if (boundary.contains(element) || !(boundary.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    if (element.tabIndex < 0 || element.closest("[inert], [hidden], [aria-hidden='true']") || (element as HTMLButtonElement).disabled) continue;
    if (!element.getClientRects().length || getComputedStyle(element).visibility === "hidden") continue;
    return element;
  }
  return null;
}

type WorldRect = { x: number; y: number; width: number; height: number };

/** "Zoom to fit" bounds (world coordinates): the Playground (or Document) frame and the Examples section under it. The
 * Docs reading column beside them is left out: thousands of pixels tall, it would shrink the fit to an unreadable zoom. */
/** What "Zoom to fit" (⇧1) fits: every frame on the board, the Docs frame too (Figma fits all; E2E S-04). */
function fitRect(world: HTMLElement): WorldRect {
  const parts = [...world.querySelectorAll<HTMLElement>("[data-studio-frame], [data-studio-section='examples']")];
  if (!parts.length) parts.push(world.querySelector<HTMLElement>(".studio-board") ?? world);
  const rects = parts.map((element) => toWorldRect(element.getBoundingClientRect()));
  const x = Math.min(...rects.map((rect) => rect.x));
  const y = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x, y, width: right - x, height: bottom - y };
}

/** Can `element` still scroll in the wheel's direction? (Interact: the wheel scrolls it before it pans the canvas.) */
function canScroll(element: Element, dx: number, dy: number) {
  const style = getComputedStyle(element);
  const scrollY = /(auto|scroll|overlay)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
  const scrollX = /(auto|scroll|overlay)/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1;
  if (Math.abs(dy) >= Math.abs(dx)) {
    if (!scrollY || dy === 0) return false;
    return dy > 0 ? element.scrollTop + element.clientHeight < element.scrollHeight - 1 : element.scrollTop > 0;
  }
  if (!scrollX) return false;
  return dx > 0 ? element.scrollLeft + element.clientWidth < element.scrollWidth - 1 : element.scrollLeft > 0;
}

/**
 * The canvas (spec §3): a viewport with a dot grid and the transformed world that holds the board. Wheel pans,
 * Ctrl/⌘ + wheel and pinch zoom around the cursor; Space + drag, the middle button and the Hand tool pan. The world
 * carries the preview modes; the Select layer (selection module) and the frame chrome sit above it in screen space.
 */
export function StudioCanvas({ label, viewKey, children }: { label: string; viewKey: string; children: ReactNode }) {
  const tool = useStudio((state) => state.tool);
  const preview = useStudio((state) => state.preview);
  const [viewport, setViewportElement] = useState<HTMLDivElement | null>(null);
  const [world, setWorld] = useState<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const keyRef = useRef(viewKey);
  const spaceRef = useRef(false);

  // Attach the controller; the viewport of each page is saved (debounced) under its key.
  useLayoutEffect(() => {
    if (!viewport || !world) return undefined;
    let timer = 0;
    const detach = attachCanvas({ viewport, world, grid: gridRef.current }, {
      persist: (next: StudioViewport) => {
        const key = keyRef.current;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => setViewport(key, next), 250);
      },
      bounds: () => fitRect(world),
    });
    return () => { window.clearTimeout(timer); detach(); };
  }, [viewport, world]);

  // A page opens where it was left. The first visit shows the board's top-left (title, then the Playground or the
  // document) 48px in, at the zoom that fits the Playground's width in the visible canvas — but never below 50%
  // (FIRST_VISIT_MIN_ZOOM) nor above 100%; the Docs frame beside it is one pan away.
  useLayoutEffect(() => {
    if (!viewport || !world) return;
    keyRef.current = viewKey;
    const saved = studioStore.getState().viewports[viewKey];
    if (saved) { setViewportNow(saved); return; }
    const row = ["[data-studio-frame='playground']", "[data-studio-frame='document']", ".studio-board"].map((selector) => world.querySelector<HTMLElement>(selector)).find(Boolean);
    const rect = row ? toWorldRect(row.getBoundingClientRect()) : { x: 0, y: 0, width: world.offsetWidth, height: world.offsetHeight };
    setViewportNow(viewportForWidth({ x: 0, y: 0, width: rect.x + rect.width, height: rect.y + rect.height }, 48, 1, FIRST_VISIT_MIN_ZOOM));
  }, [viewKey, viewport, world]);

  // Wheel and pinch. Non-passive, so the page itself never scrolls or zooms.
  useEffect(() => {
    if (!viewport || !world) return undefined;
    const onWheel = (event: WheelEvent) => {
      let dx = event.deltaX;
      let dy = event.deltaY;
      if (event.deltaMode === 1) { dx *= 16; dy *= 16; }
      if (event.deltaMode === 2) { dx *= viewport.clientWidth; dy *= viewport.clientHeight; }
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        // A pinch sends small fractional steps; a mouse wheel notch is ~100px and is eased.
        const notch = Math.abs(dy) >= 40;
        const step = notch ? Math.max(-120, Math.min(120, dy)) * 0.0025 : dy * 0.012;
        zoomAtClient(Math.exp(-step), event.clientX, event.clientY, notch);
        return;
      }
      if (event.shiftKey && dx === 0) { dx = dy; dy = 0; }
      if (studioStore.getState().tool === "interact") {
        for (let node = event.target instanceof Element ? event.target : null; node && node !== world && node !== viewport; node = node.parentElement) {
          if (canScroll(node, dx, dy)) return;
        }
      }
      event.preventDefault();
      panBy(dx, dy);
    };
    // Safari pinch (gesture events) instead of ctrl + wheel.
    let gestureScale = 1;
    const onGestureStart = (event: Event) => { event.preventDefault(); gestureScale = 1; };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const gesture = event as Event & { scale: number; clientX: number; clientY: number };
      zoomAtClient(gesture.scale / gestureScale, gesture.clientX, gesture.clientY);
      gestureScale = gesture.scale;
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("gesturestart", onGestureStart);
    viewport.addEventListener("gesturechange", onGestureChange);
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("gesturestart", onGestureStart);
      viewport.removeEventListener("gesturechange", onGestureChange);
    };
  }, [viewport, world]);

  // Pan drags: Space + drag, the middle button and the Hand tool everywhere (capture phase, before the examples see
  // it); in Interact, a drag on empty canvas (Select's capture layer starts its own pans).
  useEffect(() => {
    if (!viewport) return undefined;
    const onCapture = (event: PointerEvent) => {
      // Focus that a press gives the canvas shows no ring, even once shortcuts are typed (only Tab focus does).
      viewport.dataset.pointerFocus = "true";
      if (event.target instanceof Element && event.target.closest(CANVAS_CHROME)) return;
      const hand = event.button === 0 && (studioStore.getState().tool === "hand" || spaceRef.current);
      if (event.button !== 1 && !hand) return;
      event.preventDefault();
      event.stopPropagation();
      canvasApi.startPan(event);
    };
    const onBubble = (event: PointerEvent) => {
      if (event.button !== 0 || event.defaultPrevented || !(event.target instanceof Element)) return;
      if (event.target.closest(`[data-studio-frame], ${CANVAS_CHROME}`)) return;
      if (event.target === viewport || event.target.closest(".studio-world")) canvasApi.startPan(event);
    };
    const onBlur = (event: FocusEvent) => { if (!viewport.contains(event.relatedTarget as Node | null)) delete viewport.dataset.pointerFocus; };
    viewport.addEventListener("pointerdown", onCapture, true);
    viewport.addEventListener("pointerdown", onBubble);
    viewport.addEventListener("focusout", onBlur);
    return () => { viewport.removeEventListener("pointerdown", onCapture, true); viewport.removeEventListener("pointerdown", onBubble); viewport.removeEventListener("focusout", onBlur); };
  }, [viewport]);

  // Space held = temporary Hand (not while a field or a focused control owns the key).
  useEffect(() => {
    if (!viewport) return undefined;
    const set = (down: boolean) => {
      spaceRef.current = down;
      if (down) viewport.dataset.space = "true";
      else delete viewport.dataset.space;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement;
      if (active && active !== document.body && active !== viewport && active.closest(SPACE_OWNERS)) return;
      if (active?.closest(".zen-popover, [role='dialog'], [aria-modal='true']")) return;
      event.preventDefault();
      if (!spaceRef.current) set(true);
    };
    const onKeyUp = (event: KeyboardEvent) => { if (event.code === "Space" && spaceRef.current) set(false); };
    const onBlur = () => set(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", onBlur); };
  }, [viewport]);

  // Outlines and labels re-measure when the canvas itself changes size (window, drawers, side panels). A side panel
  // shown, hidden (⌘\) or resized also moves the canvas's left edge: the world pans back by as much in the same frame
  // (ResizeObserver runs before paint), so the content stays still on screen.
  useEffect(() => {
    if (!viewport) return undefined;
    let left = viewport.getBoundingClientRect().left;
    const observer = new ResizeObserver(() => {
      const next = viewport.getBoundingClientRect().left;
      const dx = next - left;
      left = next;
      notifyCanvas();
      compensateInset(dx);
    });
    observer.observe(viewport);
    // Focus moving to a control off screen (Tab in Interact) makes the browser scroll the clipped viewport, which would
    // shift the whole canvas under its chrome: turn that scroll into a pan instead.
    const onScroll = () => {
      const { scrollLeft, scrollTop } = viewport;
      if (!scrollLeft && !scrollTop) return;
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
      // A full-screen screen open in the world is fixed to the window: the scroll revealed nothing, so no pan.
      if (viewport.dataset.worldFullscreen === "true") return;
      panBy(scrollLeft, scrollTop);
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => { observer.disconnect(); viewport.removeEventListener("scroll", onScroll); };
  }, [viewport]);

  // The board laid out again (a frame above the selection grew, the Playground reflowed): a selection that was on the
  // canvas and went off it comes back with the smallest pan (keepInView.ts).
  useKeepSelectionInView(viewport, world);

  // A full-screen screen opened inside the world (the App Shell playground's own full screen): mirrored as
  // data-world-fullscreen on the viewport and the canvas area, so the CSS needs no :has() over the world (canvas.css).
  useEffect(() => {
    if (!viewport || !world) return undefined;
    const area = viewport.closest<HTMLElement>(".studio-canvas-area");
    const sync = () => {
      const open = world.querySelector('[data-fullscreen="true"]') ? "true" : null;
      for (const element of [viewport, area]) {
        if (!element || (element.dataset.worldFullscreen ?? null) === open) continue;
        if (open) element.dataset.worldFullscreen = open;
        else delete element.dataset.worldFullscreen;
      }
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(world, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-fullscreen"] });
    return () => { observer.disconnect(); delete viewport.dataset.worldFullscreen; if (area) delete area.dataset.worldFullscreen; };
  }, [viewport, world]);

  // Interact: Tab to a control off screen pans the canvas to it (the browser can only scroll the clipped viewport
  // toward positive offsets, and that scroll is turned into a pan above; this covers every direction).
  useEffect(() => {
    if (!viewport || !world || tool !== "interact") return undefined;
    let frame = 0;
    const onFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof Element) || !world.contains(event.target)) return;
      // A full-screen screen (fixed to the window) is always in view.
      if (event.target.closest('[data-fullscreen="true"]')) return;
      const target = event.target;
      cancelAnimationFrame(frame);
      // After the browser's own scroll (converted to a pan) has run.
      frame = requestAnimationFrame(() => {
        if (document.activeElement !== target) return;
        const rect = target.getBoundingClientRect();
        const box = viewport.getBoundingClientRect();
        if (rect.top >= box.top && rect.left >= box.left && rect.bottom <= box.bottom && rect.right <= box.right) return;
        canvasApi.ensureVisible(rect);
      });
    };
    world.addEventListener("focusin", onFocusIn);
    return () => { cancelAnimationFrame(frame); world.removeEventListener("focusin", onFocusIn); };
  }, [viewport, world, tool]);

  // Select and Hand promise no interaction (spec §5), so the examples are no Tab stops and take no keys. Not `inert`:
  // that would also remove them from hit-testing, which the Select picker relies on. Instead focus that Tab brings into
  // the world leaves it in the Tab direction (forward: the next stop after the world — frame labels, zoom, Inspector;
  // backward: the canvas itself), and Enter, Space and the arrows never reach a control inside. Interact is untouched.
  useEffect(() => {
    if (!viewport || !world || tool === "interact") return undefined;
    let tab: { at: number; backward: boolean } | null = null;
    const onTab = (event: KeyboardEvent) => { if (event.key === "Tab") tab = { at: performance.now(), backward: event.shiftKey }; };
    const onFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof Node) || !world.contains(event.target)) return;
      // Tab forward skips past the world; Shift+Tab, or focus a script moved in, lands on the canvas.
      const forward = tab && !tab.backward && performance.now() - tab.at < 1000;
      const next = forward ? nextTabStopAfter(world) : null;
      (next ?? viewport).focus({ preventScroll: true });
    };
    const onKey = (event: KeyboardEvent) => {
      if (!CONTROL_KEYS.has(event.key) || !(event.target instanceof Node) || !world.contains(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    // A control that kept focus from Interact hands it to the canvas.
    if (document.activeElement && world.contains(document.activeElement)) viewport.focus({ preventScroll: true });
    document.addEventListener("keydown", onTab, true);
    world.addEventListener("focusin", onFocusIn);
    world.addEventListener("keydown", onKey, true);
    world.addEventListener("keyup", onKey, true);
    return () => {
      document.removeEventListener("keydown", onTab, true);
      world.removeEventListener("focusin", onFocusIn);
      world.removeEventListener("keydown", onKey, true);
      world.removeEventListener("keyup", onKey, true);
    };
  }, [viewport, world, tool]);

  return (
    <div ref={setViewportElement} className="studio-viewport" role="application" aria-roledescription="canvas" aria-label={label} aria-describedby={CANVAS_STATUS_ID} tabIndex={0} data-tool={tool}>
      <div ref={gridRef} className="studio-grid" aria-hidden="true" />
      <div ref={setWorld} className="studio-world" {...previewAttributes(preview)}>
        <PlatformTypographyContext value={preview.typography}>{children}</PlatformTypographyContext>
      </div>
      <SelectionLayer viewport={viewport} world={world} />
      <SlotLayer viewport={viewport} world={world} />
      <ConstraintLayer viewport={viewport} world={world} />
      <EditLayer viewport={viewport} world={world} />
      <FrameChrome viewport={viewport} />
    </div>
  );
}
