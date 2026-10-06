import { Fragment, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { pageKey, useStudio } from "../store";
import type { StudioFrameKind } from "../types";
import { resolveFrameWidth } from "./frameLayout";
import { registerFrame, type StudioExample } from "./frames";
import { useFrameEpoch } from "./remount";
import "./board.css";

/**
 * One frame on the board (spec §4): a fixed-width body in world coordinates. Its name label and toolbar are drawn by
 * the frame chrome in screen space (FrameChrome), so they stay one size at every zoom and sit above the selection layer.
 */
export function StudioFrame({ id, kind, label, width, example, children }: { id: string; kind: StudioFrameKind; label: string; width: number; example?: StudioExample; children: ReactNode }) {
  const key = useStudio((state) => pageKey(state.page, state.collection, state.localPage));
  const override = useStudio((state) => state.frameOverrides[key]?.[id]);
  const selected = useStudio((state) => state.selection?.kind === "frame" && state.selection.frameId === id);
  // An initial-state edit remounts the content (./remount), so it starts from the new state.
  const epoch = useFrameEpoch(id);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    return element ? registerFrame({ id, kind, label, element, baseWidth: width, example }) : undefined;
  }, [id, kind, label, width, example]);
  const style = { "--studio-frame-width": `${resolveFrameWidth(width, override?.width)}px` } as CSSProperties;
  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      className="studio-frame"
      data-kind={kind}
      data-studio-frame={id}
      data-selected={selected ? "true" : undefined}
      data-width-override={override?.width && override.width !== "auto" ? "true" : undefined}
      data-theme={override?.theme}
      style={style}
    >
      <Fragment key={epoch}>{children}</Fragment>
    </div>
  );
}
