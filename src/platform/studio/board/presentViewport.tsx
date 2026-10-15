import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { NumberField } from "../../../components/Input";
import { Segmented } from "../../../components/Segmented";
import { Text } from "../../../components/Text";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import type { IconName } from "../../../icons/generated/names";
import { typographyStyles } from "../../../tokens/typography.generated";
import { fullScreenEscapeOwners } from "../../PlatformFullScreen";
import { DEVICE_WIDTH, type PageDevice } from "../builder/proto/runtime";
import { ChromeScope } from "../shell/ChromeScope";
import { FRAME_MAX_WIDTH, FRAME_MIN_WIDTH } from "./frameLayout";

/*
 * The viewport of Present and Play (user, 2026-10-15): Auto shows the example as before (a card at its frame width, a
 * desktop screen filling the window; a Play screen at its device's width); Desktop, Tablet, Phone or a typed W × H put it
 * in a box of that many CSS px. The box is the screen's overlay root (Dialog, SidePanel and Menu open inside it, at its
 * width) and holds its fixed layers; it scales down as a whole when the window is smaller, never up. Its right edge,
 * bottom edge and corner drag to a free size (ViewportHandles).
 */

/** A fixed viewport in CSS px (`height: null` fills the window's height), or `null` for Auto. */
export type PresentViewport = { width: number; height: number | null } | null;
export type ViewportPresetId = "auto" | PageDevice | "custom";

/** The device presets: Play's device widths (DEVICE_WIDTH) at a common screen height. */
export const VIEWPORT_PRESETS: ReadonlyArray<{ id: PageDevice; label: string; icon: IconName; width: number; height: number }> = [
  { id: "desktop", label: "Desktop", icon: "icon-monitor-01-line", width: DEVICE_WIDTH.desktop, height: 900 },
  { id: "tablet", label: "Tablet", icon: "icon-tablet-line", width: DEVICE_WIDTH.tablet, height: 1024 },
  { id: "phone", label: "Phone", icon: "icon-mobile-line", width: DEVICE_WIDTH.phone, height: 844 },
];

export function viewportPreset(viewport: PresentViewport): ViewportPresetId {
  if (!viewport) return "auto";
  return VIEWPORT_PRESETS.find((preset) => preset.width === viewport.width && preset.height === viewport.height)?.id ?? "custom";
}

/** The bar's label and icon: "Viewport" for Auto, the device's name, or the typed size ("1200 × 800", "1200 × Fill"). */
export function viewportButton(viewport: PresentViewport): { label: string; icon: IconName } {
  const preset = VIEWPORT_PRESETS.find((entry) => entry.id === viewportPreset(viewport));
  if (preset) return { label: preset.label, icon: preset.icon };
  if (!viewport) return { label: "Viewport", icon: "icon-maximize-01-line" };
  return { label: `${viewport.width} × ${viewport.height ?? "Fill"}`, icon: "icon-scale-01-line" };
}

/** `width` and `height` are the fixed box's CSS px (a Fill height is the window's room at this scale). */
type ViewportFit = { mode: "auto" | "fixed"; scale: number; width?: number; height?: number; fitStyle?: CSSProperties; boxStyle?: CSSProperties };

/**
 * Lays a fixed viewport out in the stage: `fitStyle` sizes the wrapper that takes the scaled box's room in the stage's
 * flow, `boxStyle` the box itself (its CSS px, scaled from its top-left corner). The room is the page under the bar (the
 * stage's parent, .studio-present__scroll) less the stage's padding.
 */
export function useViewportFit(viewport: PresentViewport, stageRef: RefObject<HTMLElement | null>): ViewportFit {
  const fixed = Boolean(viewport);
  const [room, setRoom] = useState<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const layer = stage?.parentElement;
    if (!fixed || !stage || !layer) return undefined;
    const measure = () => {
      const pad = getComputedStyle(stage);
      const width = Math.max(1, layer.clientWidth - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight));
      const height = Math.max(1, layer.clientHeight - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom));
      setRoom((last) => (last?.width === width && last.height === height ? last : { width, height }));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(layer);
    return () => observer.disconnect();
  }, [fixed, stageRef]);
  if (!viewport || !room) return { mode: "auto", scale: 1 };
  const scale = Math.min(1, room.width / viewport.width, viewport.height ? room.height / viewport.height : 1);
  const height = viewport.height ?? room.height / scale;
  return {
    mode: "fixed",
    scale,
    width: viewport.width,
    height,
    fitStyle: { width: Math.floor(viewport.width * scale), height: Math.floor(height * scale) },
    boxStyle: { width: viewport.width, height, transform: scale < 1 ? `scale(${scale})` : undefined },
  };
}

const clampSize = (value: number) => Math.min(FRAME_MAX_WIDTH, Math.max(FRAME_MIN_WIDTH, value));
const sizeOf = (value: number | null) => (value !== null && value >= FRAME_MIN_WIDTH && value <= FRAME_MAX_WIDTH ? value : null);

/**
 * The Viewport panel of the Present bar: Auto · Desktop · Tablet · Phone, then W and H in CSS px (a size no preset has
 * is a custom one; an empty H fills the window's height). A typed number applies once it is in range; Enter or leaving the
 * field clamps it.
 */
export function ViewportFields({ idPrefix, viewport, onChange, scale, autoWidth }: { idPrefix: string; viewport: PresentViewport; onChange: (viewport: PresentViewport) => void; scale: number; autoWidth: number }) {
  const preset = viewportPreset(viewport);
  return (
    <>
      <div className="studio-modes__head">
        <Text as="p" id={`${idPrefix}-title`} textStyle="Body/Small/Bold">Viewport</Text>
        {viewport ? <Text as="p" textStyle="Caption/Regular" tone="light">{viewport.width} × {viewport.height ?? "Fill"} at {Math.round(scale * 100)}%</Text> : null}
      </div>
      <Segmented
        aria-label="Device"
        size="sm"
        fullWidth
        value={preset}
        onValueChange={(next) => {
          const device = VIEWPORT_PRESETS.find((entry) => entry.id === next);
          onChange(device ? { width: device.width, height: device.height } : null);
        }}
        options={[{ id: "auto", label: "Auto" }, ...VIEWPORT_PRESETS.map((entry) => ({ id: entry.id, label: entry.label }))]}
      />
      <div className="studio-viewport-size">
        <NumberField
          aria-label="Viewport width"
          size="sm"
          layout="inline"
          label="W"
          min={FRAME_MIN_WIDTH}
          max={FRAME_MAX_WIDTH}
          value={viewport?.width ?? null}
          placeholder={String(autoWidth)}
          onValueChange={(next) => { const width = sizeOf(next); if (width !== null) onChange({ width, height: viewport?.height ?? null }); }}
        />
        <NumberField
          aria-label="Viewport height"
          size="sm"
          layout="inline"
          label="H"
          min={FRAME_MIN_WIDTH}
          max={FRAME_MAX_WIDTH}
          value={viewport?.height ?? null}
          placeholder={viewport ? "Fill" : "Auto"}
          onValueChange={(next) => {
            if (next === null) { if (viewport) onChange({ width: viewport.width, height: null }); return; }
            const height = sizeOf(next);
            if (height !== null) onChange({ width: viewport?.width ?? autoWidth, height });
          }}
        />
      </div>
    </>
  );
}

/** What owns Escape in Present and Play besides the full-screen owners: the bar's Viewport or Modes panel (Escape closes
 *  it first) and a viewport drag (Escape puts the size back). */
export const presentEscapeOwners = `${fullScreenEscapeOwners}, .studio-present-bar__panel, .studio-viewport-handles[data-dragging="true"]`;

/** Shift snaps a dragged size to this many px, as the canvas frame's edge does. */
const SIZE_STEP = 8;
/** px the pointer moves before a press on a handle becomes a drag. */
const DRAG_START = 2;
type Axis = "x" | "y" | "xy";

/**
 * Drag handles of a fixed viewport (user, 2026-10-15: grab the corner and drag), as a browser's responsive mode: the
 * right edge sets W, the bottom edge H, the bottom-right corner both. The box is centred across and pinned at the top,
 * so W grows by twice the pointer's move; px are the box's CSS px at the scale the drag started at (past the window, the
 * fit scales the box down instead). Hover and drag ring the box in Info blue, a tag at its bottom reads the size;
 * Shift snaps to 8, Escape puts the size back, a double-click goes back to Auto. A pointer affordance, hidden from
 * assistive tech: the W and H fields are the keyboard way, and the result is announced.
 */
export function ViewportHandles({ viewport, fit, onChange }: { viewport: PresentViewport; fit: ViewportFit; onChange: (viewport: PresentViewport) => void }) {
  const [live, setLive] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const stop = useRef<() => void>(() => undefined);
  useEffect(() => () => stop.current(), []);
  // The status stays mounted in Auto too, so "Viewport Auto" (a double-click) is still read out.
  const status = <VisuallyHidden role="status" aria-live="polite">{announcement}</VisuallyHidden>;
  const fixed = viewport && fit.mode === "fixed" && fit.width !== undefined && fit.height !== undefined ? viewport : null;
  if (!fixed) return status;

  const announce = (text: string) => {
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(text), 60);
  };
  const sizeLabel = (next: PresentViewport) => (next ? `${next.width} × ${next.height ?? "Fill"}` : "Auto");

  const onPointerDown = (axis: Axis) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    // The press is the handle's: the Viewport panel stays open (its W and H follow the drag), the example sees nothing.
    event.preventDefault();
    event.stopPropagation();
    stop.current();
    const captor = event.currentTarget;
    const pointerId = event.pointerId;
    try { captor.setPointerCapture(pointerId); } catch { /* the pointer may already be gone */ }
    const before = fixed;
    const origin = { x: event.clientX, y: event.clientY, width: fit.width ?? before.width, height: fit.height ?? before.height ?? 0, scale: fit.scale };
    let last = { x: event.clientX, y: event.clientY, shift: event.shiftKey };
    let active = false;
    let request = 0;
    let written: PresentViewport = before;
    const snap = (value: number) => clampSize(last.shift ? Math.round(value / SIZE_STEP) * SIZE_STEP : Math.round(value));
    const apply = () => {
      request = 0;
      const width = axis === "y" ? before.width : snap(origin.width + (2 * (last.x - origin.x)) / origin.scale);
      const height = axis === "x" ? before.height : snap(origin.height + (last.y - origin.y) / origin.scale);
      written = { width, height };
      onChange(written);
      setLive(sizeLabel(written));
    };
    const schedule = () => { if (!request) request = requestAnimationFrame(apply); };
    const end = (commit: boolean) => {
      stop.current();
      if (!active) return;
      if (commit) {
        apply();
        announce(`Viewport ${sizeLabel(written)}`);
      } else {
        onChange(before);
        announce(`Viewport back to ${sizeLabel(before)}`);
      }
      setLive(null);
    };
    const onMove = (move: PointerEvent) => {
      if (move.pointerId !== pointerId) return;
      last = { x: move.clientX, y: move.clientY, shift: move.shiftKey };
      if (!active && Math.max(Math.abs(move.clientX - origin.x), Math.abs(move.clientY - origin.y)) < DRAG_START) return;
      if (!active) setLive(sizeLabel(before));
      active = true;
      schedule();
    };
    const onUp = (up: PointerEvent) => { if (up.pointerId === pointerId) { last = { x: up.clientX, y: up.clientY, shift: up.shiftKey }; end(true); } };
    const onCancel = (cancel: PointerEvent) => { if (cancel.pointerId === pointerId) end(false); };
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape" && key.type === "keydown") {
        // Present and Play leave Escape to the drag (presentEscapeOwners).
        key.preventDefault();
        key.stopPropagation();
        end(false);
      } else if (key.key === "Shift" && active) {
        last = { ...last, shift: key.type === "keydown" };
        schedule();
      }
    };
    const onBlur = () => end(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    window.addEventListener("blur", onBlur);
    stop.current = () => {
      cancelAnimationFrame(request);
      request = 0;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      window.removeEventListener("blur", onBlur);
      try { if (captor.hasPointerCapture(pointerId)) captor.releasePointerCapture(pointerId); } catch { /* already released */ }
      stop.current = () => undefined;
    };
  };

  const onDoubleClick = () => {
    onChange(null);
    announce("Viewport Auto");
  };
  const handle = (axis: Axis) => (
    <div className="studio-viewport-handles__hit" data-axis={axis} onPointerDown={onPointerDown(axis)} onDoubleClick={onDoubleClick} onContextMenu={(event) => event.preventDefault()} />
  );

  return (
    <>
      <ChromeScope className="studio-viewport-handles" aria-hidden="true" data-dragging={live ? "true" : undefined}>
        {handle("x")}
        {handle("y")}
        {handle("xy")}
        {live ? <span className={`studio-viewport-handles__label ${typographyStyles["Caption/Medium"]}`}>{live}</span> : null}
      </ChromeScope>
      {status}
    </>
  );
}
