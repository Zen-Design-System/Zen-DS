import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { studioStore } from "../store";
import { clampPanel, PANEL_LIMITS, PANEL_STEP } from "./layout";
import "./shell.css";

type Side = "left" | "right";

/**
 * The drag handle on a docked side panel's inner edge (APG Window Splitter): drag it, or focus it and press ←/→ (16px,
 * with Shift 64px), Home/End (narrowest/widest), Enter or a double-click (default width). The width is kept in the
 * Studio prefs. StudioApp places it on the panel's border line (a grid item over the panel, outside its scroller).
 */
export function PanelResizer({ side, width, label, controls, onResize }: { side: Side; width: number; label: string; controls: string; onResize?: () => void }) {
  const drag = useRef<{ pointer: number; startX: number; startWidth: number } | null>(null);
  const limits = PANEL_LIMITS[side];
  const set = (next: number) => {
    onResize?.();
    const value = clampPanel(side, next);
    studioStore.setState((state) => (state.panels[side] === value ? {} : { panels: { ...state.panels, [side]: value } }));
  };
  // The left panel grows to the right; the Inspector (handle on its left edge) grows to the left.
  const grow = side === "left" ? 1 : -1;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag.current = { pointer: event.pointerId, startX: event.clientX, startWidth: width };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.closest(".studio-app")?.setAttribute("data-resizing", "true");
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    set(current.startWidth + (event.clientX - current.startX) * grow);
  };
  const end = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.closest(".studio-app")?.removeAttribute("data-resizing");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? PANEL_STEP * 4 : PANEL_STEP;
    if (event.key === "ArrowLeft") set(width - step * grow);
    else if (event.key === "ArrowRight") set(width + step * grow);
    else if (event.key === "Home") set(limits.min);
    else if (event.key === "End") set(limits.max);
    else if (event.key === "Enter") set(limits.initial);
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className="studio-resizer"
      data-side={side}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-controls={controls}
      aria-valuenow={width}
      aria-valuemin={limits.min}
      aria-valuemax={limits.max}
      aria-valuetext={`${width} pixels`}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onDoubleClick={() => set(limits.initial)}
      onKeyDown={onKeyDown}
    />
  );
}
