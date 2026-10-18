import { Badge } from "../../../components/Badge";
import { Icon } from "../../../components/Icon";
import { Heading } from "../../../components/Text";
import { findFrame, useStudioFrames } from "../board/frames";
import { FrameGeometry } from "./FrameGeometry";

/*
 * The right panel of a selected Section (Figma's section, F4): its name, then Position (X, Y) and Layout (W, H). Its
 * frames stay where they are when it resizes; a drag on its name moves them with it (frameMove.ts).
 */
export function SectionPanel({ frameId }: { frameId: string }) {
  useStudioFrames();
  const label = findFrame(frameId)?.label ?? "Section";
  return (
    <div className="studio-inspector__panel">
      <header className="studio-inspector__head-block">
        <div className="studio-inspector__title-row">
          <span className="studio-inspector__kind-icon" aria-hidden="true"><Icon name="icon-browser-line" size={16} /></span>
          <Heading level={2} textStyle="Body/Small/Bold" truncate title={label}>{label}</Heading>
          {!label.startsWith("Section") ? <Badge size="sm" theme="neutral" background="subtle" leadingIcon={false}>Section</Badge> : null}
        </div>
      </header>
      <FrameGeometry frameId={frameId} />
    </div>
  );
}
