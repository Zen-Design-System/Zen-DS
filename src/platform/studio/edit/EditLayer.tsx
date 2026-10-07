import { useArrangeKeys } from "./arrange";
import { useClipboard } from "./clipboard";
import { DragLayer } from "./DragLayer";
import { useMeasure } from "./measure";
import { MarqueeLayer } from "./MarqueeLayer";
import { MeasureLayer } from "./MeasureLayer";
import { useNavigateKeys } from "./navigate";
import { QuickActions } from "./quick/QuickActions";
import { TextEditor } from "./TextEditor";
import "./edit.css";

/*
 * Direct editing on the canvas, Figma-like (docs/research/studio-figma-editing-plan-2026-10-03.md): the in-place text
 * editor, drag to reorder, the arrow-key reorder, the clipboard, Tab / ⇧Enter navigation, ⌥ measure, the marquee and
 * Quick actions (⌘/). Mounted by StudioCanvas over the world.
 */
export function EditLayer({ viewport }: { viewport: HTMLElement | null; world: HTMLElement | null }) {
  useArrangeKeys();
  useClipboard();
  useNavigateKeys();
  useMeasure();
  return (
    <div className="studio-edit">
      <MarqueeLayer viewport={viewport} />
      <MeasureLayer viewport={viewport} />
      <DragLayer viewport={viewport} />
      <TextEditor viewport={viewport} />
      <QuickActions />
    </div>
  );
}
