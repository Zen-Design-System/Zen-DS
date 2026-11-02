import { useEffect } from "react";
import { announceEditStatus } from "../api";
import { CANVAS_BACKGROUNDS, headerCanvas, type CanvasBackground } from "../builder/store/pageModel";
import { setPageCanvas, usePage } from "../builder/store/pageStore";
import { RowSelectField } from "../inspector/rowFields";
import { canEdit, useStudio } from "../store";

/*
 * Figma's page Background (Studio parity F10): the canvas behind a page's frames, from Zen's background tokens only
 * (Canvas, Canvas Alt, Canvas Flat, Surface, Neutral, Dark). The page's (header `canvas`); the field is in the right
 * panel with nothing selected, the canvas reads it here.
 */

// "canvas" is the default key (no header): B4's Pale work area since 2026-11-01 (canvas.css), so it reads "Pale".
const LABELS: Readonly<Record<CanvasBackground, string>> = { canvas: "Pale", "canvas-alt": "Canvas Alt", "canvas-flat": "Canvas Flat", surface: "Surface", neutral: "Neutral", dark: "Dark" };
const OPTIONS = CANVAS_BACKGROUNDS.map((value) => ({ value, label: LABELS[value] }));

/** The right panel's Background field for a page you made. */
export function CanvasBackgroundField({ id, text }: { id: string; text: string }) {
  const editable = useStudio((state) => canEdit(state));
  return (
    <RowSelectField
      aria-label="Canvas background"
      size="sm"
      value={headerCanvas(text)}
      options={OPTIONS}
      disabled={!editable}
      onValueChange={(value) => {
        const next = (CANVAS_BACKGROUNDS as readonly string[]).includes(String(value)) ? (value as CanvasBackground) : "canvas";
        void setPageCanvas(id, next).then(() => announceEditStatus({ kind: "unchanged", message: `Canvas → ${LABELS[next]}`, at: Date.now() }));
      }}
    />
  );
}

/** Puts the open page's background on the canvas (a data attribute its CSS reads); renders nothing. */
export function CanvasBackgroundSync({ viewport }: { viewport: HTMLElement | null }) {
  const localPage = useStudio((state) => state.localPage);
  const page = usePage(localPage);
  const background = page ? headerCanvas(page.text) : "canvas";
  useEffect(() => {
    if (!viewport) return undefined;
    if (background === "canvas") viewport.removeAttribute("data-canvas-background");
    else viewport.setAttribute("data-canvas-background", background);
    return () => viewport.removeAttribute("data-canvas-background");
  }, [viewport, background]);
  return null;
}
