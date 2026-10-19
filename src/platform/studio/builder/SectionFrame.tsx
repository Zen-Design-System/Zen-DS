import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { registerFrame } from "../board/frames";
import { useStudio } from "../store";

/*
 * A Section on a builder page's board (Figma's section, F4; dialect `<Section>`): a named area drawn behind the frames,
 * at its own place and size. It is a frame of the board to the rest of the Studio (`section:<id>`, kind "section"): a
 * click on its empty area selects it, a drag on its name moves it with the frames inside it (frameMove.ts), its handles
 * resize it (board/FrameHandles.tsx). Which frames are inside is read from where they are (board/sections.ts).
 */
export function SectionFrame({ id, label, width, height }: { id: string; label: string; width: number; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const selected = useStudio((state) => state.selection?.kind === "frame" && state.selection.frameId === id);
  useLayoutEffect(() => {
    const element = ref.current;
    return element ? registerFrame({ id, kind: "section", label, element, baseWidth: width }) : undefined;
  }, [id, label, width]);
  const style = { width: `${width}px`, height: `${height}px` } as CSSProperties;
  return <div ref={ref} role="group" aria-label={label} className="studio-board-section" data-studio-frame={id} data-kind="section" data-selected={selected ? "true" : undefined} style={style} />;
}
