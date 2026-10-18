import { useEffect, useState } from "react";
import { onFramesMoved } from "../board/frames";
import { InspectorSection } from "../inspector/Section";
import { ScrubNumberField } from "../inspector/controls/ScrubNumberField";
import { onSourceUpdate } from "../select/picker";
import { canEdit, useStudio } from "../store";
import { setFrameBoxes, type FrameBoxChange } from "./frameEdit";

/*
 * A frame's or Section's X, Y, W and H on a page you made (Figma's Position and Layout fields for a top-level frame, F4):
 * Figma's number fields (drag the label, ↑ / ↓, type a number or a sum), each written as one edit. X / Y are its place on
 * the board; W / H a Screen's or Section's size (a Screen's H is the least it takes: its content may make it taller,
 * as an auto-height frame). An Overlay takes its content's size: its W / H show it, read only. The handles on the
 * canvas resize the same way (board/FrameHandles.tsx).
 */

const FRAMES = ".studio-builder-board__frames";
type Box = { x: number; y: number; width: number; height: number };

const elementOf = (frameId: string) => document.querySelector<HTMLElement>(`${FRAMES} > [data-studio-frame="${CSS.escape(frameId)}"]`);
const boxOf = (frameId: string): Box | null => {
  const element = elementOf(frameId);
  return element ? { x: element.offsetLeft, y: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight } : null;
};

/** The frame's box on the board now (board frame px), kept up to date as it moves, resizes or the page changes. */
export function useFrameBox(frameId: string): Box | null {
  const [box, setBox] = useState<Box | null>(() => boxOf(frameId));
  useEffect(() => {
    const update = () => setBox((before) => {
      const next = boxOf(frameId);
      return before && next && before.x === next.x && before.y === next.y && before.width === next.width && before.height === next.height ? before : next;
    });
    update();
    const element = elementOf(frameId);
    const observer = new ResizeObserver(update);
    if (element) observer.observe(element);
    const offMoved = onFramesMoved(update);
    const offSource = onSourceUpdate(update);
    return () => { observer.disconnect(); offMoved(); offSource(); };
  }, [frameId]);
  return box;
}

export function FrameGeometry({ frameId }: { frameId: string }) {
  const localPage = useStudio((state) => state.localPage);
  const editable = useStudio((state) => canEdit(state));
  const box = useFrameBox(frameId);
  const sized = !frameId.startsWith("overlay:");
  const write = (change: FrameBoxChange, label: string) => { if (localPage) void setFrameBoxes(localPage, new Map([[frameId, change]]), label); };
  const off = !editable || !localPage;
  return (
    <>
      <InspectorSection title="Position">
        <div className="studio-frame-geometry__pair" data-prop="frame-position">
          <ScrubNumberField label="X" name="X" value={box?.x ?? null} disabled={off} onCommit={(x) => write({ x }, "Move frame")} />
          <ScrubNumberField label="Y" name="Y" value={box?.y ?? null} disabled={off} onCommit={(y) => write({ y }, "Move frame")} />
        </div>
      </InspectorSection>
      <InspectorSection title="Layout">
        <div className="studio-frame-geometry__pair" data-prop="frame-size">
          <ScrubNumberField label="W" name="Width" value={box?.width ?? null} min={100} disabled={off || !sized} onCommit={(width) => write({ width }, "Resize frame")} />
          <ScrubNumberField label="H" name="Height" value={box?.height ?? null} min={100} disabled={off || !sized} onCommit={(height) => write({ height }, "Resize frame")} />
        </div>
      </InspectorSection>
    </>
  );
}
