import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { registerFrame } from "../board/frames";
import { useStudio } from "../store";

/*
 * A Slice on a builder page's board (Figma's slice, dialect `<Slice>`): an area exported as a picture of what is under
 * it (SlicePanel.tsx's Export). Drawn above the frames as a dashed outline only, so a click inside it reaches the layers
 * under it, as in Figma; its name above it selects it and drags it (frameMove.ts), its handles resize it
 * (board/FrameHandles.tsx). It is a frame of the board to the rest of the Studio (`slice:<id>`, kind "slice").
 */
export function SliceFrame({ id, label, width, height }: { id: string; label: string; width: number; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const selected = useStudio((state) => state.selection?.kind === "frame" && state.selection.frameId === id);
  useLayoutEffect(() => {
    const element = ref.current;
    return element ? registerFrame({ id, kind: "slice", label, element, baseWidth: width }) : undefined;
  }, [id, label, width]);
  const style = { width: `${width}px`, height: `${height}px` } as CSSProperties;
  return <div ref={ref} role="group" aria-label={label} className="studio-board-slice" data-studio-frame={id} data-kind="slice" data-selected={selected ? "true" : undefined} style={style} />;
}
