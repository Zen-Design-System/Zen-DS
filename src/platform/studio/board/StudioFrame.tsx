import { useFrameSelection } from "../select/frameSelection";
import { Fragment, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePortalContainer, ZenPortalProvider } from "../../../components/Portal";
import { pageKey, useStudio } from "../store";
import type { StudioFrameKind } from "../types";
import { resolveFrameWidth } from "./frameLayout";
import { registerFrame, type StudioExample } from "./frames";
import { useFrameEpoch } from "./remount";
import "./board.css";

/**
 * One frame on the board (spec §4): a fixed-width body in world coordinates. Its name label and toolbar are drawn by
 * the frame chrome in screen space (FrameChrome), so they stay one size at every zoom and sit above the selection layer.
 *
 * The frame holds its example's overlays (user, 2026-10-15: zoomed out, a Dialog opened at 100% in the middle of the
 * canvas and a Menu or Toast at 100% beside a 25% frame). It is the overlay root (`data-zen-overlay-root`): a Dialog,
 * Side Panel or Menu opens inside it and covers this frame only; and its own portal layer takes what goes through
 * ZenPortal (Popover, Tooltip, the toast stack). Both sit in the world, so they zoom with the frame and take its theme;
 * the components place them in the frame's own px (layer-space.ts, Menu, useAnchoredPosition).
 */
export function StudioFrame({ id, kind, label, width, example, breakpoint, view, children }: { id: string; kind: StudioFrameKind; label: string; width: number; example?: StudioExample; breakpoint?: string; view?: number; children: ReactNode }) {
  const key = useStudio((state) => pageKey(state.page, state.collection, state.localPage));
  const override = useStudio((state) => state.frameOverrides[key]?.[id]);
  const primary = useStudio((state) => state.selection?.kind === "frame" && state.selection.frameId === id);
  // One of several selected frames (select/frameSelection.ts) is outlined as the primary is.
  const selected = useFrameSelection().includes(id) || primary;
  // An initial-state edit remounts the content (./remount), so it starts from the new state.
  const epoch = useFrameEpoch(id);
  const ref = useRef<HTMLDivElement>(null);
  // Until the frame's layer is mounted, overlays keep the canvas's (never <body>).
  const canvasPortal = usePortalContainer();
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    return element ? registerFrame({ id, kind, label, element, baseWidth: width, example }) : undefined;
  }, [id, kind, label, width, example]);
  // A frame of a page you made has its own width in the page (F4: handles, Layout › W); a view width set on it before
  // that (the old width menu) no longer applies. A Screen shown on another breakpoint (builder/screenViews.ts) takes the
  // view's width (`view`), keeps its place and draws above the frames beside it until the view ends.
  const viewWidth = /^(screen|overlay):/.test(id) ? view : override?.width;
  const style = { "--studio-frame-width": `${resolveFrameWidth(width, viewWidth)}px` } as CSSProperties;
  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      className="studio-frame"
      data-kind={kind}
      data-studio-frame={id}
      data-selected={selected ? "true" : undefined}
      data-width-override={viewWidth && viewWidth !== "auto" ? "true" : undefined}
      data-view={view ? "" : undefined}
      // A Screen's breakpoint (its view's, else its own) on the frame too: what opens in the frame's portal and overlay
      // root (a Menu, a modal Side Panel, a Dialog) is outside the Screen and takes it from here.
      data-breakpoint={breakpoint}
      data-theme={override?.theme}
      data-zen-overlay-root=""
      style={style}
    >
      <ZenPortalProvider container={portal ?? canvasPortal}>
        <Fragment key={epoch}>{children}</Fragment>
      </ZenPortalProvider>
      <div ref={setPortal} className="studio-frame__portal official-portal-root" />
    </div>
  );
}
