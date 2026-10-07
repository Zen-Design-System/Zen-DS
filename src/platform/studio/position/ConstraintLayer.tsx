import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { typographyStyles } from "../../../tokens/typography.generated";
import { canvasApi } from "../canvas/viewport";
import { onSourceUpdate, type FiberHit } from "../select/picker";
import { ChromeScope } from "../shell/ChromeScope";
import { selectedHit } from "../slots/dom";
import { studioStore, useStudio } from "../store";
import "./constraint-layer.css";

/*
 * Constraints on the canvas (spec docs/research/studio-position-effects-radius-spec-2026-10-03.md §4.4; Figma's blue
 * dotted constraint lines). For a selected floating layer (Stack, Grid or Box with position="absolute"): a dashed line
 * from the containing block's padding edge to each pinned edge, along the layer's centre line, named by a pill beside it
 * ("right · sm · 12"); a centred axis gets a tick on the parent's centre line and a "center" pill. The parent gets the
 * dashed owner outline. Read from the DOM (data-constraint-x/y, the rendered rects) and the rendered inset props, so
 * it shows what renders now. Decorative: no pointer events, aria-hidden (the inspector's Position section is the
 * accessible path). Measured like SlotLayer: pan, zoom and scrolling read the rects again.
 */

type Box = { x: number; y: number; w: number; h: number };
type Line = Box & { axis: "x" | "y" };
/** A pill's anchor: `below` hangs it under the point (centred), `after` puts it right of the point (centred). */
type Pill = { x: number; y: number; text: string; place: "below" | "after" };
type Marks = { src: string; owner: Box | null; lines: Line[]; pills: Pill[] };

const EMPTY: Marks = { src: "", owner: null, lines: [], pills: [] };
/** How far (screen px) a centre tick reaches past the layer on each side. */
const TICK = 8;
/** Space (screen px) between a pill and its line or the label it steps aside for. */
const GAP = 4;
/** The selection's own labels a pill steps aside for: the name tag above it and the size pill below it. */
const CHROME_LABELS = '.studio-selection__outline[data-kind="selected"] > .studio-selection__tag, .studio-resize__pill';

const round = (value: number) => Math.round(value * 2) / 2;
const keyOf = (marks: Marks) => JSON.stringify([marks.src, marks.owner && [round(marks.owner.x), round(marks.owner.y), round(marks.owner.w), round(marks.owner.h)], marks.lines.map((l) => [l.axis, round(l.x), round(l.y), round(l.w), round(l.h)]), marks.pills.map((p) => [p.text, p.place, round(p.x), round(p.y)])]);

/** The floating primitive the selection renders (ActionBar's and Stepper's own data-position never match). */
function floatingHost(hit: FiberHit | null): HTMLElement | null {
  const host = hit?.hosts[0];
  return host instanceof HTMLElement && host.matches(':is(.zen-stack, .zen-grid, .zen-box)[data-position="absolute"]') ? host : null;
}

/** "right · sm · 12": the edge, the token the source renders (none when unset) and its CSS px. */
function edgeLabel(edge: string, token: unknown, px: number) {
  // Measured through the zoom: rounded to the half pixel, so 11.9997 reads 12.
  const value = Math.max(0, Math.round(px * 2) / 2);
  return `${edge} · ${typeof token === "string" && token ? token : "none"} · ${Number.isInteger(value) ? value : value.toFixed(1)}`;
}

function marksFor(src: string, hit: FiberHit | null, world: Element, origin: DOMRect): Marks {
  const host = floatingHost(hit);
  const parent = host?.offsetParent;
  if (!hit || !host || !(parent instanceof HTMLElement) || !world.contains(host)) return EMPTY;
  const outer = parent.getBoundingClientRect();
  const layer = host.getBoundingClientRect();
  // Screen px per CSS px (the canvas zoom), from the parent's own size.
  const scale = parent.offsetWidth ? outer.width / parent.offsetWidth : 1;
  const style = getComputedStyle(parent);
  const border = (side: string) => (parseFloat(style.getPropertyValue(`border-${side}-width`)) || 0) * scale;
  // Absolute insets are measured from the containing block's padding edge (inside its border).
  const pad = { left: outer.left + border("left"), top: outer.top + border("top"), right: outer.right - border("right"), bottom: outer.bottom - border("bottom") };
  const x = (value: number) => value - origin.left;
  const y = (value: number) => value - origin.top;
  const midX = layer.left + layer.width / 2;
  const midY = layer.top + layer.height / 2;
  const props = hit.props;
  const lines: Line[] = [];
  const pills: Pill[] = [];
  const along = (from: number, to: number, axis: "x" | "y", edge: string, token: unknown) => {
    const start = Math.min(from, to);
    const length = Math.abs(to - from);
    if (length >= 1) lines.push(axis === "x" ? { axis, x: x(start), y: y(midY), w: length, h: 0 } : { axis, x: x(midX), y: y(start), w: 0, h: length });
    // Beside the line, so a short line stays visible: under a horizontal one, right of a vertical one.
    const centre = start + length / 2;
    pills.push(axis === "x" ? { x: x(centre), y: y(midY), text: edgeLabel(edge, token, length / scale), place: "below" } : { x: x(midX), y: y(centre), text: edgeLabel(edge, token, length / scale), place: "after" });
  };

  const cx = host.dataset.constraintX ?? "left";
  if (cx === "left" || cx === "left-right") along(pad.left, layer.left, "x", "left", props.insetLeft);
  if (cx === "right" || cx === "left-right") along(layer.right, pad.right, "x", "right", props.insetRight);
  if (cx === "center") {
    const axis = (pad.left + pad.right) / 2;
    lines.push({ axis: "y", x: x(axis), y: y(layer.top - TICK), w: 0, h: layer.height + TICK * 2 });
    pills.push({ x: x(axis), y: y(layer.bottom + TICK), text: "center", place: "below" });
  }
  const cy = host.dataset.constraintY ?? "top";
  if (cy === "top" || cy === "top-bottom") along(pad.top, layer.top, "y", "top", props.insetTop);
  if (cy === "bottom" || cy === "top-bottom") along(layer.bottom, pad.bottom, "y", "bottom", props.insetBottom);
  if (cy === "center") {
    const axis = (pad.top + pad.bottom) / 2;
    lines.push({ axis: "x", x: x(layer.left - TICK), y: y(axis), w: layer.width + TICK * 2, h: 0 });
    pills.push({ x: x(layer.right + TICK), y: y(axis), text: "center", place: "after" });
  }
  return { src, owner: { x: x(outer.left), y: y(outer.top), w: outer.width, h: outer.height }, lines, pills };
}

/**
 * Pills that would cover the selection's name tag or size pill move to the right of it, on the same row. Sizes come
 * from the pills rendered last frame (same order and text), so the settle loop converges in a frame or two.
 */
function clearOfLabels(pills: Pill[], root: HTMLElement, origin: DOMRect): Pill[] {
  const scope = root.closest(".studio-viewport") ?? document;
  const labels = [...scope.querySelectorAll(CHROME_LABELS)].map((label) => label.getBoundingClientRect()).filter((rect) => rect.width > 0)
    .map((rect) => ({ left: rect.left - origin.left, top: rect.top - origin.top, right: rect.right - origin.left, bottom: rect.bottom - origin.top }));
  if (!labels.length) return pills;
  const rendered = [...root.querySelectorAll<HTMLElement>("[data-constraint-pill]")];
  return pills.map((pill, index) => {
    const element = rendered[index];
    if (!element || element.textContent !== pill.text) return pill;
    const { width, height } = element.getBoundingClientRect();
    const left = pill.place === "below" ? pill.x - width / 2 : pill.x + GAP;
    const top = pill.place === "below" ? pill.y + GAP : pill.y - height / 2;
    const hit = labels.find((label) => left < label.right && left + width > label.left && top < label.bottom && top + height > label.top);
    return hit ? { ...pill, x: hit.right, y: top + height / 2, place: "after" } : pill;
  });
}

/** Constraint lines and pills for the selected floating layer (mounted in the canvas viewport, after SlotLayer). */
export function ConstraintLayer({ viewport, world }: { viewport: HTMLElement | null; world: HTMLElement | null }) {
  const tool = useStudio((state) => state.tool);
  const presenting = useStudio((state) => state.presenting);
  const selection = useStudio((state) => state.selection);
  const rootRef = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<Marks>(EMPTY);
  const marksRef = useRef(marks);
  const frameRequest = useRef(0);
  const settleUntil = useRef(0);
  // The selected instance found by the last full walk; null forces a new one (selection, source or DOM changed).
  const resolvedRef = useRef<{ key: string; hit: FiberHit | null } | null>(null);
  const shown = tool === "select" && !presenting;
  const node = selection?.kind === "node" && !selection.part ? selection : null;

  const worldRef = useRef(world);
  worldRef.current = world;
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
        if (!resolved || resolved.key !== key || resolved.hit?.hosts.some((host) => !host.isConnected)) {
          resolved = { key, hit: selectedHit(current, canvas) };
          resolvedRef.current = resolved;
        }
        const origin = root.getBoundingClientRect();
        next = marksFor(current.src, resolved.hit, canvas, origin);
        next = { ...next, pills: clearOfLabels(next.pills, root, origin) };
      }
    } catch {
      // A node went away mid-measure: nothing this frame.
    }
    if (keyOf(next) !== keyOf(marksRef.current)) {
      marksRef.current = next;
      setMarks(next);
    }
    if (performance.now() < settleUntil.current) frameRequest.current = requestAnimationFrame(measure);
  }, []);

  const schedule = useCallback((settle = 240) => {
    settleUntil.current = Math.max(settleUntil.current, performance.now() + settle);
    if (!frameRequest.current) frameRequest.current = requestAnimationFrame(measure);
  }, [measure]);

  const selectionKey = node ? `${node.src}#${node.instance}` : "";
  useEffect(() => { schedule(600); }, [selectionKey, shown, world, schedule]);

  useEffect(() => {
    if (!shown) return undefined;
    // A short settle: the selection's labels move in their own frame, and the pills step aside after them.
    const offCanvas = canvasApi.onChange(() => schedule(120));
    const offUpdate = onSourceUpdate(() => { resolvedRef.current = null; schedule(600); });
    const onScroll = () => schedule(120);
    const onResize = () => schedule();
    world?.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onResize);
    let mutationTimer = 0;
    const mutations = new MutationObserver(() => {
      if (mutationTimer) return;
      mutationTimer = window.setTimeout(() => { mutationTimer = 0; resolvedRef.current = null; schedule(); }, 150);
    });
    // data-constraint-* and the inset custom properties (style) change with an edit in place.
    if (world) mutations.observe(world, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "hidden", "data-position", "data-constraint-x", "data-constraint-y"] });
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
    cancelAnimationFrame(frameRequest.current);
    frameRequest.current = 0;
  }, []);

  if (!shown || !node) return null;
  const current = marks.src === node.src ? marks : EMPTY;
  const boxStyle = (box: Box): CSSProperties => ({ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h });
  const pillShift = { below: `translate(-50%, ${GAP}px)`, after: `translate(${GAP}px, -50%)` } as const;
  return (
    <ChromeScope className="studio-constraint-layer" aria-hidden="true">
      <div ref={rootRef} className="studio-constraint-layer__frame">
        {current.owner ? <div className="studio-selection__outline" data-kind="owner" style={boxStyle(current.owner)} /> : null}
        {current.lines.map((line, index) => <div key={`l${index}`} className="studio-constraint-layer__line" data-axis={line.axis} style={boxStyle(line)} />)}
        {current.pills.map((pill, index) => (
          <span key={`p${index}`} className={`studio-selection__spacing-label ${typographyStyles["Caption/Medium"]}`} data-constraint-pill="" style={{ transform: `translate(${pill.x}px, ${pill.y}px) ${pillShift[pill.place]}` }}>
            {pill.text}
          </span>
        ))}
      </div>
    </ChromeScope>
  );
}
