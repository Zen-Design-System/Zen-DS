import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { SelectField } from "../../../components/Input";
import { Segmented } from "../../../components/Segmented";
import { Toggle } from "../../../components/Toggle";
import { SCREEN_CHROME, screenChromeCode, screenLayout, type ScreenChromeLayout } from "../../../../tools/studio/screen-chrome.mjs";
import { Heading } from "../../../components/Text";
import type { IconName } from "../../../icons/generated/names";
import { typographyStyles } from "../../../tokens/typography.generated";
import { frameWidthPresets, isCustomFrameWidth } from "../board/frameLayout";
import { useStudioFrames } from "../board/frames";
import { presentFrame } from "../board/presentFrame";
import { pageKey, setFrameOverride, useStudio } from "../store";
import { applyEdit } from "../api";
import { DEVICE_WIDTH, type PageDevice, type ScreenCanvas } from "../builder/proto/runtime";
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

/** A Screen's background layer (Zen's Canvas roles, as AppShell's `canvas`). */
const CANVASES: Array<{ id: ScreenCanvas; label: string; token: string }> = [
  { id: "default", label: "Default", token: "Background/Canvas/Default" },
  { id: "alt", label: "Alt", token: "Background/Canvas/Alt (a white page)" },
  { id: "flat", label: "Flat", token: "Background/Canvas/Flat" },
];

/**
 * A builder page's Screen frame (Figma: a frame's device preset and fill): its Device and its Canvas (the background
 * layer, user 2026-10-09), each written on `<Screen>` as one edit (one undo step). The page starts on a desktop Screen and changes here as you work (user, 2026-10-09: nothing to pick
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
  const canvas = (literal(node, "canvas") as ScreenCanvas | undefined) ?? "default";
  const write = (next: PageDevice) => {
    if (next === device) return;
    void applyEdit({ file: pageFile(localPage), loc: node.loc, name: node.name, ops: [{ op: "setProp", name: "device", value: { kind: "string", value: next } }] }, `Screen device → ${next}`);
  };
  // The app frame (user, 2026-10-09): the parts of the layout the Screen shows, each switched on (its component
  // written into the prop, imported) or off (the prop taken away). A tablet is laid out as a phone (mobile) or a desktop.
  const layout = screenLayout(device, literal(node, "layout") as string | undefined);
  const title = String(literal(node, "title") ?? page?.title ?? "Untitled");
  const writeLayout = (next: ScreenChromeLayout) => {
    if (next === layout) return;
    const op = next === "mobile" ? { op: "removeProp" as const, name: "layout" } : { op: "setProp" as const, name: "layout", value: { kind: "string" as const, value: next } };
    void applyEdit({ file: pageFile(localPage), loc: node.loc, name: node.name, ops: [op] }, `Tablet laid out as ${next}`);
  };
  const writePart = (part: (typeof SCREEN_CHROME)[number], on: boolean) => {
    const op = on ? { op: "insertChild" as const, prop: part.prop, code: screenChromeCode(part.prop, title) } : { op: "removeProp" as const, name: part.prop };
    void applyEdit({ file: pageFile(localPage), loc: node.loc, name: node.name, ops: [op] }, `${part.label} ${on ? "on" : "off"}`);
  };
  // Default is no prop at all, as the device's desktop default.
  const writeCanvas = (next: ScreenCanvas) => {
    if (next === canvas) return;
    const op = next === "default" ? { op: "removeProp" as const, name: "canvas" } : { op: "setProp" as const, name: "canvas", value: { kind: "string" as const, value: next } };
    void applyEdit({ file: pageFile(localPage), loc: node.loc, name: node.name, ops: [op] }, `Screen canvas → ${next}`);
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
      {device === "tablet" ? (
        <InspectorFields
          name="layout"
          labels={["Layout"]}
          code="Screen layout"
          fields={[(
            <Segmented
              key="layout"
              aria-label="Tablet layout"
              size="sm"
              fullWidth
              disabled={!admin}
              value={layout}
              onValueChange={(next) => writeLayout(next as ScreenChromeLayout)}
              options={[
                { id: "mobile", label: "Mobile", leading: "icon-mobile-line", "aria-label": "Laid out as mobile: top and bottom navigation" },
                { id: "desktop", label: "Desktop", leading: "icon-monitor-01-line", "aria-label": "Laid out as desktop: sidebar and page header" },
              ]}
            />
          )]}
        />
      ) : null}
      {/* One Toggle per part (user, 2026-10-09: "nó là toggle"): the label takes the field's whole width, the switch
          ends the row (a label column wrapped "Bottom navigation" onto two lines). */}
      {SCREEN_CHROME.filter((part) => part.layout === layout).map((part) => (
        <InspectorFields
          key={part.prop}
          name={part.prop}
          code={`Screen ${part.prop}`}
          fields={[<Toggle key={part.prop} label={part.label} checked={node.props[part.prop]?.kind === "element"} disabled={!admin} onCheckedChange={(next) => writePart(part, next)} />]}
        />
      ))}
      <InspectorFields
        name="canvas"
        labels={["Canvas"]}
        code="Screen canvas"
        fields={[(
          <Segmented
            key="canvas"
            aria-label="Canvas"
            size="sm"
            fullWidth
            disabled={!admin}
            value={canvas}
            onValueChange={(next) => writeCanvas(next as ScreenCanvas)}
            options={CANVASES.map((item) => ({ id: item.id, label: item.label, "aria-label": `${item.label} canvas, ${item.token}` }))}
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
