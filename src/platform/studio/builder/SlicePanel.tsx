import { Badge } from "../../../components/Badge";
import { Icon } from "../../../components/Icon";
import { Heading } from "../../../components/Text";
import { findFrame, useStudioFrames } from "../board/frames";
import { boardBoxes, type BoardBox } from "../board/sections";
import { ExportSection, type ExportSetting } from "../inspector/ExportSection";
import { regionPicture } from "./export/htmlExport";
import { FrameGeometry } from "./FrameGeometry";

/*
 * The right panel of a selected Slice (Figma's slice): its name, Position (X, Y) and Layout (W, H), then Export, which
 * starts with Figma's 1x PNG: "Export <slice>" draws the area of the board under it (the frames there, cut at its edges;
 * htmlExport.ts regionPicture).
 */

const FRAMES = ".studio-builder-board__frames";
const FIRST: ExportSetting[] = [{ scale: 1, format: "png" }];
const overlaps = (a: BoardBox, b: BoardBox) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** The Slice's area and the frames under it (Screens and Overlays, not Sections or Slices), each with its board place. */
function underSlice(frameId: string) {
  const container = document.querySelector(FRAMES);
  const boxes = boardBoxes(container);
  const area = boxes.find((box) => box.id === frameId);
  if (!container || !area) return null;
  const frames = boxes
    .filter((box) => box.id !== frameId && /^(screen|overlay):/.test(box.id) && overlaps(box, area))
    .flatMap((box) => {
      const host = container.querySelector<HTMLElement>(`:scope > [data-studio-frame="${CSS.escape(box.id)}"]`);
      return host ? [{ host, x: box.x, y: box.y }] : [];
    });
  return { area, frames };
}

export function SlicePanel({ frameId }: { frameId: string }) {
  useStudioFrames();
  const label = findFrame(frameId)?.label ?? "Slice";
  const picture = async (setting: ExportSetting) => {
    const found = underSlice(frameId);
    if (!found) return { error: "The slice is not on the canvas right now" };
    return regionPicture(found.area, found.frames, setting);
  };
  return (
    <div className="studio-inspector__panel">
      <header className="studio-inspector__head-block">
        <div className="studio-inspector__title-row">
          <span className="studio-inspector__kind-icon" aria-hidden="true"><Icon name="icon-scissors-line" size={16} /></span>
          <Heading level={2} textStyle="Body/Small/Bold" truncate title={label}>{label}</Heading>
          {!label.startsWith("Slice") ? <Badge size="sm" theme="neutral" background="subtle" leadingIcon={false}>Slice</Badge> : null}
        </div>
      </header>
      <FrameGeometry frameId={frameId} />
      <ExportSection src={`frame:${frameId}`} layer={label} host={null} picture={picture} initial={FIRST} />
    </div>
  );
}
