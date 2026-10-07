import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { SelectField } from "../../../components/Input";
import { Segmented } from "../../../components/Segmented";
import { Heading } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { frameWidthPresets, isCustomFrameWidth } from "../board/frameLayout";
import { useStudioFrames } from "../board/frames";
import { presentFrame } from "../board/Present";
import { pageKey, setFrameOverride, useStudio } from "../store";
import type { StudioFrameWidth } from "../types";
import { newPageFromFrame } from "../builder/starters/newPageFromFrame";
import { copyText, exampleOf, frameKind, frameLabel } from "./frames";
import { InspectorRow, InspectorSection } from "./Section";
import { SlotHost, useSlotFilled } from "./SlotHost";

/*
 * Inspector for a selected frame (spec §6): width, theme, Present (examples) or Zoom to frame (page-sized frames), and
 * for examples the description and Copy code. Widths are the frame toolbar's: Auto (the rule width) and the presets.
 */

export function FramePanel({ frameId, controlsSlot }: { frameId: string; controlsSlot: HTMLElement }) {
  const page = useStudio((state) => state.page);
  const collection = useStudio((state) => state.collection);
  const key = pageKey(page, collection);
  const override = useStudio((state) => state.frameOverrides[key]?.[frameId]);
  const frames = useStudioFrames();
  const frame = frames.find((candidate) => candidate.id === frameId);
  const example = exampleOf(page, frameId);
  const controlsFilled = useSlotFilled(controlsSlot);
  const kind = frameKind(frameId);
  const label = frameLabel(frameId, page);
  const presentable = frame?.kind === "example" && Boolean(frame.example);
  const base = frame?.baseWidth;
  // A preset equal to the rule width would do what Auto does: only widths that change the frame are offered.
  const presetOptions = frameWidthPresets
    .filter((preset) => preset.value === "auto" || preset.value !== base)
    .map((preset) => ({ value: String(preset.value), label: preset.value === "auto" ? (base ? `Auto (${base}px)` : "Auto") : preset.label }));
  // A width dragged on the frame's right edge is offered too, in order, so the field shows it.
  const custom = isCustomFrameWidth(override?.width) && override.width !== base ? override.width : null;
  const customAt = custom === null ? -1 : presetOptions.findIndex((option, index) => index > 0 && Number(option.value) > custom);
  const widthOptions = custom === null ? presetOptions : [
    ...presetOptions.slice(0, customAt < 0 ? presetOptions.length : customAt),
    { value: String(custom), label: `${custom} (custom)` },
    ...(customAt < 0 ? [] : presetOptions.slice(customAt)),
  ];
  const width = override?.width === undefined || override.width === base ? "auto" : String(override.width);

  return (
    <div className="studio-inspector__panel">
      <header className="studio-inspector__head-block">
        <div className="studio-inspector__title-row">
          <span className="studio-inspector__kind-icon" aria-hidden="true"><Icon name="icon-layout-alt-01-line" size={16} /></span>
          <Heading level={2} textStyle="Body/Small/Bold" truncate title={label}>{label}</Heading>
          {!label.startsWith(kind) ? <Badge size="sm" theme="neutral" background="subtle" leadingIcon={false}>{kind}</Badge> : null}
        </div>
        {example?.description ? <p className={`studio-inspector__description ${typographyStyles["Body/Small/Regular"]}`}>{example.description}</p> : null}
      </header>

      <InspectorSection title="Frame">
        <InspectorRow label="Width">
          <SelectField
            aria-label="Frame width"
            size="sm"
            value={width}
            onValueChange={(value) => setFrameOverride(key, frameId, { width: value === "auto" ? "auto" : (Number(value) as StudioFrameWidth) })}
            options={widthOptions}
          />
        </InspectorRow>
        <InspectorRow label="Theme">
          <Segmented
            aria-label="Frame theme"
            size="sm"
            fullWidth
            value={override?.theme ?? "page"}
            onValueChange={(value) => setFrameOverride(key, frameId, { theme: value === "page" ? undefined : (value as "light" | "dark") })}
            options={[{ id: "page", label: "Page" }, { id: "light", label: "Light" }, { id: "dark", label: "Dark" }]}
          />
        </InspectorRow>
        <div className="studio-inspector__actions">
          <Button
            level={presentable ? "primary" : "tertiary"}
            size="sm"
            startIcon={presentable ? "icon-play-line" : "icon-zoom-in-line"}
            aria-keyshortcuts="F"
            disabled={!frame}
            onClick={() => presentFrame(frameId)}
          >
            {presentable ? "Present" : "Zoom to frame"}
          </Button>
          {example ? <Button level="tertiary" size="sm" startIcon="icon-copy-line" onClick={() => copyText(example.code, "the example code")}>Copy code</Button> : null}
          {/* GĐ3b: a builder page that starts as this example (the canvas menu has it too). */}
          {example && frame ? <Button level="tertiary" size="sm" startIcon="icon-file-plus-line" onClick={() => { void newPageFromFrame({ element: frame.element, label }); }}>New page from this frame</Button> : null}
        </div>
      </InspectorSection>

      {frameId === "playground" ? (
        <div hidden={!controlsFilled}>
          <InspectorSection title="Playground properties">
            <SlotHost node={controlsSlot} className="studio-inspector__slot" />
          </InspectorSection>
        </div>
      ) : null}
    </div>
  );
}
