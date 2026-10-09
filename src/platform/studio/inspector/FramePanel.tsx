import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { SelectField } from "../../../components/Input";
import { Segmented } from "../../../components/Segmented";
import { Heading } from "../../../components/Text";
import type { IconName } from "../../../icons/generated/names";
import { typographyStyles } from "../../../tokens/typography.generated";
import { frameWidthPresets, isCustomFrameWidth } from "../board/frameLayout";
import { useStudioFrames } from "../board/frames";
import { presentFrame } from "../board/presentFrame";
import { pageKey, setFrameOverride, useStudio } from "../store";
import { applyEdit } from "../api";
import { DEVICE_WIDTH, type PageDevice } from "../builder/proto/runtime";
import type { PageNode } from "../builder/render/renderPage";
import { pageFile, usePage } from "../builder/store/pageStore";
import { usePageTree } from "../builder/usePageTree";
import type { StudioFrameWidth } from "../types";
import { newPageFromFrame } from "../builder/starters/newPageFromFrame";
import { copyText, exampleOf, frameKind, frameLabel } from "./frames";
import { InspectorFields, InspectorRow, InspectorSection } from "./Section";
import { SlotHost, useSlotFilled } from "./SlotHost";

/*
 * Inspector for a selected frame (spec §6): width, theme, Present (examples) or Zoom to frame (page-sized frames), and
 * for examples the description and Copy code. Widths are the frame toolbar's: Auto (the rule width) and the presets.
 */

/** A Screen's device, each with its Zen icon (user, 2026-10-09: Mobile, Tablet, Monitor). */
const DEVICES: Array<{ id: PageDevice; label: string; icon: IconName }> = [
  { id: "phone", label: "Phone", icon: "icon-mobile-line" },
  { id: "tablet", label: "Tablet", icon: "icon-tablet-line" },
  { id: "desktop", label: "Desktop", icon: "icon-monitor-01-line" },
];

/**
 * A builder page's Screen frame (Figma: a frame's device preset): its Device, written on `<Screen device>` as one edit
 * (one undo step). The page starts on a desktop Screen and changes here as you work (user, 2026-10-09: nothing to pick
 * when the page is made).
 */
function ScreenSection({ frameId }: { frameId: string }) {
  const localPage = useStudio((state) => state.localPage);
  const admin = useStudio((state) => state.role === "admin");
  const page = usePage(localPage);
  const tree = usePageTree(page?.text);
  const screenId = frameId.split(":")[1];
  const literal = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };
  const node = tree?.board?.children.find((child): child is PageNode => child.kind === "element" && child.name === "Screen" && literal(child, "id") === screenId);
  if (!localPage || !node) return null;
  const device = (literal(node, "device") as PageDevice | undefined) ?? "desktop";
  const write = (next: PageDevice) => {
    if (next === device) return;
    void applyEdit({ file: pageFile(localPage), loc: node.loc, name: node.name, ops: [{ op: "setProp", name: "device", value: { kind: "string", value: next } }] }, `Screen device → ${next}`);
  };
  return (
    <InspectorSection title="Screen" fieldGrid>
      <InspectorFields
        name="device"
        labels={["Device"]}
        code="Screen device"
        fields={[(
          <Segmented
            key="device"
            aria-label="Device"
            size="sm"
            fullWidth
            disabled={!admin}
            value={device}
            onValueChange={(next) => write(next as PageDevice)}
            options={DEVICES.map((item) => ({ id: item.id, label: "", leading: item.icon, "aria-label": `${item.label}, ${DEVICE_WIDTH[item.id]} px` }))}
          />
        )]}
      />
    </InspectorSection>
  );
}

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

      {frameId.startsWith("screen:") ? <ScreenSection frameId={frameId} /> : null}
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
