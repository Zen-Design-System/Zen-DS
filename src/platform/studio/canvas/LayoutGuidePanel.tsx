import { IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { typographyStyles } from "../../../tokens/typography.generated";
import { announceEditStatus } from "../api";
import { DEFAULT_GUIDE_COLUMNS, headerLayoutGuides, type LayoutGuide } from "../builder/store/pageModel";
import { setFrameLayoutGuides, usePage } from "../builder/store/pageStore";
import { ScrubNumberField } from "../inspector/controls/ScrubNumberField";
import { RowSelectField } from "../inspector/rowFields";
import { InspectorSection } from "../inspector/Section";
import { canEdit, useStudio } from "../store";
import { viewOptions } from "./viewOptions";
import "./layout-guides.css";

/*
 * The right panel's Layout guide for a frame of a page you made (Figma's Layout grid, Studio parity F10): "+" adds the
 * device's columns, each guide is Columns · Rows · Grid with its count or size, "−" removes it. Margin and gutter are
 * the frame's Breakpoint & Grids variables (never typed in). Guides are the page's (header `layoutGuides`); ⌃G shows or
 * hides them all.
 */

const TYPES = [{ value: "columns", label: "Columns" }, { value: "rows", label: "Rows" }, { value: "grid", label: "Grid" }];

/** The frame's device, from its Screen on the canvas (desktop when unknown). */
const deviceOf = (frameId: string) => document.querySelector(`[data-studio-frame="${CSS.escape(frameId)}"] .studio-builder-screen`)?.getAttribute("data-device") ?? "desktop";

export function LayoutGuidePanel({ frameId }: { frameId: string }) {
  const localPage = useStudio((state) => state.localPage);
  const editable = useStudio((state) => canEdit(state));
  const page = usePage(localPage);
  if (!localPage || !page) return null;
  const guides = headerLayoutGuides(page.text)[frameId] ?? [];
  const write = (next: LayoutGuide[], message: string) => {
    void setFrameLayoutGuides(localPage, frameId, next).then(() => announceEditStatus({ kind: "unchanged", message, at: Date.now() }), () => announceEditStatus({ kind: "error", message: "The layout guide was not saved", at: Date.now() }));
  };
  const add = () => {
    // A guide added shows (Figma turns layout guides on with it).
    if (!viewOptions.get().layoutGuides) viewOptions.set({ layoutGuides: true });
    write([...guides, { type: "columns", count: DEFAULT_GUIDE_COLUMNS[deviceOf(frameId)] ?? 12 }], "Layout guide added");
  };
  const change = (index: number, next: LayoutGuide) => write(guides.map((guide, at) => (at === index ? next : guide)), "Layout guide changed");
  const retype = (index: number, type: string) => {
    if (type === "grid") change(index, { type: "grid", size: 8 });
    else change(index, { type: type === "rows" ? "rows" : "columns", count: guides[index].type === "grid" ? DEFAULT_GUIDE_COLUMNS[deviceOf(frameId)] ?? 12 : (guides[index] as { count: number }).count });
  };
  return (
    <InspectorSection
      title="Layout guide"
      actions={<IconButton icon="icon-plus-line" aria-label="Add layout guide" appearance="flat" level="primary" size="xs" disabled={!editable} onClick={add} />}
    >
      {guides.map((guide, index) => (
        <div key={index} className="studio-layout-guide-row" data-prop="layout-guide">
          <RowSelectField aria-label="Layout guide type" size="sm" value={guide.type} options={TYPES} disabled={!editable} onValueChange={(value) => retype(index, String(value))} />
          <ScrubNumberField
            label={<Icon name={guide.type === "grid" ? "icon-grid-01-line" : guide.type === "rows" ? "icon-rows-01-line" : "icon-columns-01-line"} size="sm" decorative />}
            name={guide.type === "grid" ? "Grid size" : guide.type === "rows" ? "Row count" : "Column count"}
            suffix={guide.type === "grid" ? "px" : undefined}
            min={1}
            max={guide.type === "grid" ? 512 : 48}
            round={1}
            value={guide.type === "grid" ? guide.size : guide.count}
            disabled={!editable}
            onCommit={(value) => change(index, guide.type === "grid" ? { type: "grid", size: Math.max(1, Math.round(value)) } : { type: guide.type, count: Math.max(1, Math.round(value)) })}
          />
          <IconButton icon="icon-minus-line" aria-label="Remove layout guide" appearance="flat" level="primary" size="xs" disabled={!editable} onClick={() => write(guides.filter((_, at) => at !== index), "Layout guide removed")} />
        </div>
      ))}
      {guides.some((guide) => guide.type !== "grid") ? <p className={`studio-layout-guide-note ${typographyStyles["Caption/Regular"]}`}>Margin and gutter: Breakpoint &amp; Grids, by device</p> : null}
    </InspectorSection>
  );
}
