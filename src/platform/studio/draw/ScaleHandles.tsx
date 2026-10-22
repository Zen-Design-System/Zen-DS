import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { typographyStyles } from "../../../tokens/typography.generated";
import { canEdit, useStudio } from "../store";
import type { Box } from "../select/spacing";
import { scaleSelection } from "./scaleLayers";
import { anchorOfCorner, anchoredBox, dragFactor, factorText } from "./scaleModel";

/*
 * The Scale tool's corners on the selected layer (Figma's K): drag one and the layer scales by one factor, its ratio
 * kept, the opposite corner still. While dragging an outline shows the new box with the factor and size under it (the
 * layer itself is not stretched: a text keeps its style, so a live stretch would show what the edit does not write);
 * the release writes once (scaleLayers.ts, one ⌘Z), Esc puts it back. The right panel's field does the same by typing.
 */

type Corner = { x: 0 | 1; y: 0 | 1 };
const CORNERS: Corner[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
/** Half the corner's 12px hit area: the square sits on the corner. */
const HALF = 6;
type Drag = { pointerId: number; corner: Corner; box: { x: number; y: number; width: number; height: number }; factor: number };

export function ScaleHandles({ box, interactive, viewport }: { box: Box | null; interactive: boolean; viewport: HTMLElement | null }) {
  const editable = useStudio((state) => canEdit(state) && Boolean(state.localPage));
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  useEffect(() => {
    if (!drag) return undefined;
    // Esc while dragging puts the layer back (nothing was written).
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      dragRef.current = null;
      setDrag(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [drag]);
  if (!box || !interactive || !editable || !viewport) return null;

  const pointerAt = (event: { clientX: number; clientY: number }) => {
    const view = viewport.getBoundingClientRect();
    return { x: event.clientX - view.left, y: event.clientY - view.top };
  };
  const start = (event: ReactPointerEvent<HTMLSpanElement>, corner: Corner) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = { pointerId: event.pointerId, corner, box: { x: box.x, y: box.y, width: box.w, height: box.h }, factor: 1 };
    dragRef.current = next;
    setDrag(next);
  };
  const move = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const factor = dragFactor(current.box, anchorOfCorner(current.corner), pointerAt(event));
    if (factor === current.factor) return;
    const next = { ...current, factor };
    dragRef.current = next;
    setDrag(next);
  };
  const end = (event: ReactPointerEvent<HTMLSpanElement>, keep: boolean) => {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDrag(null);
    if (keep && current.factor !== 1) void scaleSelection(current.factor, anchorOfCorner(current.corner));
  };

  const ghost = drag ? anchoredBox(drag.box, drag.factor, anchorOfCorner(drag.corner)) : null;
  return (
    <div className="studio-scale-handles">
      {ghost ? (
        <div className="studio-scale-ghost" style={{ transform: `translate(${ghost.x}px, ${ghost.y}px)`, width: ghost.width, height: ghost.height }}>
          <span className={`studio-scale-ghost__pill ${typographyStyles["Caption/Medium"]}`}>{`${factorText(drag!.factor)} · ${Math.round(ghost.width)} × ${Math.round(ghost.height)}`}</span>
        </div>
      ) : null}
      {CORNERS.map((corner) => (
        <span
          key={`${corner.x}${corner.y}`}
          className="studio-scale-handle"
          data-corner={`${corner.y ? "bottom" : "top"}-${corner.x ? "right" : "left"}`}
          style={{ transform: `translate(${box.x + box.w * corner.x - HALF}px, ${box.y + box.h * corner.y - HALF}px)` }}
          onPointerDown={(event) => start(event, corner)}
          onPointerMove={move}
          onPointerUp={(event) => end(event, true)}
          onPointerCancel={(event) => end(event, false)}
        />
      ))}
    </div>
  );
}
