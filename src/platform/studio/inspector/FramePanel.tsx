import { Badge } from "../../../components/Badge";
import { ExportSection } from "./ExportSection";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Segmented } from "../../../components/Segmented";
import { Toggle } from "../../../components/Toggle";
import { FRAME_PARTS, SCREEN_CHROME, screenChromeCode, screenFrameCode, screenLayout, type ScreenChromeLayout } from "../../../../tools/studio/screen-chrome.mjs";
import { Heading } from "../../../components/Text";
import type { IconName } from "../../../icons/generated/names";
import { typographyStyles } from "../../../tokens/typography.generated";
import { frameWidthPresets, isCustomFrameWidth } from "../board/frameLayout";
import { useStudioFrames } from "../board/frames";
import { presentFrame } from "../board/presentFrame";
import { pageKey, setFrameOverride, useStudio } from "../store";
import { applyEdit } from "../api";
import { DEVICE_WIDTH, pageOsOf, type PageDevice, type ScreenCanvas } from "../builder/proto/runtime";
import type { PageChild, PageNode } from "../builder/render/renderPage";
import { pageFile, usePage } from "../builder/store/pageStore";
import { usePageTree } from "../builder/usePageTree";
import type { StudioFrameWidth } from "../types";
import { newPageFromFrame } from "../builder/starters/newPageFromFrame";
import { copyText, exampleOf, frameKind, frameLabel, isBuilderFrame } from "./frames";
import { FrameGeometry } from "../builder/FrameGeometry";
import { LayoutGuidePanel } from "../canvas/LayoutGuidePanel";
import { SectionPanel } from "../builder/SectionPanel";
import { InspectorFields, InspectorRow, InspectorSection } from "./Section";
import { RowSelectField } from "./rowFields";
import { SlotHost, useSlotFilled } from "./SlotHost";
import { presentKeys } from "../shell/modKey";
import { setLayerHidden, slotSwitchOp } from "../edit/visibility";
import { HIDDEN_PROP, HIDDEN_SLOTS_PROP, hiddenSlotsOf, hiddenValueOf } from "../../../../tools/studio/visibility.mjs";
import { FRAME_DEVICES, deviceOfScreen, deviceOfSize, deviceSize, screenDevice } from "../../../../tools/studio/screen-devices.mjs";

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

/** The first element named `name` among `children` and their children (props not searched), depth first. */
function firstElementNamed(children: PageChild[], name: string): PageNode | null {
  for (const child of children) {
    const node = child.kind === "element" ? child : child.kind === "map" ? child.node : null;
    if (!node) continue;
    if (node.name === name) return node;
    const inner = firstElementNamed(node.children, name);
    if (inner) return inner;
  }
  return null;
}

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
  // Size (Figma's frame presets, user 2026-10-18): a device's size, device and layout in one edit; a drawn or typed size
  // that no device has reads Custom.
  const width = literal(node, "width") as number | undefined;
  const heightPx = literal(node, "height") as number | undefined;
  const sized = deviceOfSize(width, heightPx);
  const write = (next: PageDevice) => {
    if (next === device) return;
    // A Screen at a device's size takes the new device's (its type's on the page's OS: iPhone or Android phone, iPad or
    // Android tablet, or Desktop), as a Figma frame preset does; a drawn or typed size stays.
    const resized = sized ? (next === "desktop" ? screenDevice("desktop") : deviceOfScreen(next, literal(node, "layout") as string | undefined, undefined, undefined, pageOsOf(tree?.header))) : undefined;
    const size = resized ? [
      { op: "setProp" as const, name: "width", value: { kind: "number" as const, value: resized.width } },
      { op: "setProp" as const, name: "height", value: { kind: "number" as const, value: resized.height } },
    ] : [];
    void applyEdit({ file: pageFile(localPage), loc: node.loc, name: node.name, ops: [{ op: "setProp", name: "device", value: { kind: "string", value: next } }, ...size] }, `Screen device → ${next}`);
  };
  // The app frame (user, 2026-10-09): the parts of the layout the Screen shows, each switched on (its component
  // written into the prop, imported) or off (the prop taken away). A tablet is laid out as a phone (mobile) or a desktop.
  const layout = screenLayout(device, literal(node, "layout") as string | undefined);
  const title = String(literal(node, "title") ?? page?.title ?? "Untitled");
  const writeSize = (id: string) => {
    const entry = screenDevice(id);
    if (!entry || entry === sized) return;
    const ops = [
      { op: "setProp" as const, name: "device", value: { kind: "string" as const, value: entry.device } },
      entry.device === "tablet" && entry.layout === "desktop" ? { op: "setProp" as const, name: "layout", value: { kind: "string" as const, value: "desktop" } } : { op: "removeProp" as const, name: "layout" },
      { op: "setProp" as const, name: "width", value: { kind: "number" as const, value: entry.width } },
      { op: "setProp" as const, name: "height", value: { kind: "number" as const, value: entry.height } },
    ];
    void applyEdit({ file: pageFile(localPage), loc: node.loc, name: node.name, ops }, `Screen size → ${entry.label}`);
  };
  const writeLayout = (next: ScreenChromeLayout) => {
    if (next === layout) return;
    const op = next === "mobile" ? { op: "removeProp" as const, name: "layout" } : { op: "setProp" as const, name: "layout", value: { kind: "string" as const, value: next } };
    void applyEdit({ file: pageFile(localPage), loc: node.loc, name: node.name, ops: [op] }, `Tablet laid out as ${next}`);
  };
  // Off hides a part and keeps its layers (`hiddenSlots`, Figma's boolean; edit/visibility.ts): on brings them back as
  // they were. A part never written gets its starting component.
  const screenOff = hiddenSlotsOf(node.props[HIDDEN_SLOTS_PROP]);
  // The phone parts drawn from the desktop header (tools/studio/responsive-header.mjs): Reset to desktop links one again,
  // and the page's next write draws it.
  const phoneLinked = hiddenSlotsOf(node.props.phoneLinked);
  const resetToDesktop = (prop: string) => {
    const next = [...new Set([...phoneLinked, prop])];
    void applyEdit({ file: pageFile(localPage), loc: node.loc, name: node.name, ops: [{ op: "setProp", name: "phoneLinked", value: { kind: "expression", code: JSON.stringify(next) } }] }, `${prop === "topNavigation" ? "Top" : "Bottom"} navigation follows the desktop`);
  };
  const writePart = (part: (typeof SCREEN_CHROME)[number], on: boolean) => {
    const label = `${part.label} ${on ? "on" : "off"}`;
    const keep = (on && screenOff.includes(part.prop)) || (!on && node.props[part.prop]?.kind === "element") ? slotSwitchOp(screenOff, part.prop, on) : null;
    if (keep) { void applyEdit({ file: pageFile(localPage), loc: node.loc, name: node.name, ops: [keep] }, label); return; }
    const op = on ? { op: "insertChild" as const, prop: part.prop, code: screenChromeCode(part.prop, title) } : { op: "removeProp" as const, name: part.prop };
    void applyEdit({ file: pageFile(localPage), loc: node.loc, name: node.name, ops: [op] }, label);
  };
  // The desktop layout's frame is the master layout (user, 2026-10-15): one AppShell at the Screen's root, as a page
  // from a template has it. Each part is a prop of that AppShell; the first part on wraps the content in it, the last off
  // takes it away (op screenFrame, tools/studio/screen-frame.mjs).
  const content = node.children.filter((child) => !(child.kind === "text" && !child.value.trim()));
  const shell = content.length === 1 && content[0].kind === "element" && content[0].name === "AppShell" ? content[0] : null;
  // The header's parts (Top bar, its center and actions, the Page header) are props of the AppShellHeader in the
  // AppShell's `header` (Header/AppShell; the AppShell rebuilt on Figma's patterns 2026-10-19).
  const headerValue = shell?.props.header;
  const headerNode = headerValue?.kind === "element" && headerValue.node.name === "AppShellHeader" ? headerValue.node : null;
  // A Page header in the content, not the header's `main`: Page header reads it, so switching it on never adds a second
  // one, and off takes that one away.
  const contentHeader = shell ? firstElementNamed(shell.children, "PageHeader") : null;
  // A part holds one layer or several (a fragment: the template's header actions).
  const holds = (value: { kind: string } | undefined) => value?.kind === "element" || value?.kind === "fragment";
  // Off hides a part (the root AppShell's `hiddenSlots`; the content's Page header by its own `hidden`) and keeps its layers,
  // as Figma's boolean does: on brings back what the template or you put there (user, 2026-10-16).
  const shellOff = hiddenSlotsOf(shell?.props[HIDDEN_SLOTS_PROP]);
  const headerOff = hiddenSlotsOf(headerNode?.props[HIDDEN_SLOTS_PROP]);
  const headerHidden = Boolean(contentHeader && hiddenValueOf(contentHeader.props[HIDDEN_PROP]) === true);
  type FramePart = (typeof FRAME_PARTS)[number];
  const hostOf = (part: FramePart) => (part.host === "header" ? headerNode : shell);
  const offOf = (part: FramePart) => (part.host === "header" ? headerOff : shellOff);
  const partOn = (part: FramePart) => (holds(hostOf(part)?.props[part.prop]) && !offOf(part).includes(part.prop)) || (part.prop === "main" && Boolean(contentHeader) && !headerHidden && !holds(headerNode?.props.main));
  const writeFramePart = (part: FramePart, on: boolean) => {
    const label = `${part.label} ${on ? "on" : "off"}`;
    const file = pageFile(localPage);
    if (part.prop === "main" && contentHeader && !holds(headerNode?.props.main)) {
      void setLayerHidden(`${file}:${contentHeader.loc}`, contentHeader.name, on ? null : true);
      return;
    }
    const host = hostOf(part);
    const off = offOf(part);
    const keep = host && ((on && off.includes(part.prop)) || (!on && holds(host.props[part.prop]))) ? slotSwitchOp(off, part.prop, on) : null;
    if (host && keep) { void applyEdit({ file, loc: host.loc, name: host.name, ops: [keep] }, label); return; }
    const op = { op: "screenFrame" as const, prop: part.prop, on, code: screenFrameCode(part.prop, title) };
    void applyEdit({ file: pageFile(localPage), loc: node.loc, name: node.name, ops: [op] }, label);
  };
  // Default is no prop at all, as the device's desktop default.
  const writeCanvas = (next: ScreenCanvas) => {
    if (next === canvas) return;
    const op = next === "default" ? { op: "removeProp" as const, name: "canvas" } : { op: "setProp" as const, name: "canvas", value: { kind: "string" as const, value: next } };
    void applyEdit({ file: pageFile(localPage), loc: node.loc, name: node.name, ops: [op] }, `Screen canvas → ${next}`);
  };
  return (
    <InspectorSection title="Screen" fieldGrid>
      <InspectorRow label="Size" name="screen-size">
        <RowSelectField
          aria-label="Screen size"
          size="sm"
          disabled={!admin}
          value={sized?.id ?? "custom"}
          onValueChange={(value) => writeSize(value)}
          options={[
            ...FRAME_DEVICES.map((entry) => ({ value: entry.id, label: entry.label, meta: deviceSize(entry) })),
            ...(sized ? [] : [{ value: "custom", label: "Custom", meta: width && heightPx ? `${width} × ${heightPx}` : undefined, disabled: true }]),
          ]}
        />
      </InspectorRow>
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
      {layout === "desktop" ? FRAME_PARTS.map((part) => (
        <InspectorFields
          key={part.prop}
          name={part.prop}
          code={part.host === "header" ? `AppShellHeader ${part.prop}` : `AppShell ${part.prop}`}
          fields={[<Toggle key={part.prop} label={part.label} checked={partOn(part)} disabled={!admin} onCheckedChange={(next) => writeFramePart(part, next)} />]}
        />
      )) : SCREEN_CHROME.filter((part) => part.layout === layout).map((part) => (
        <InspectorFields
          key={part.prop}
          name={part.prop}
          code={`Screen ${part.prop}`}
          fields={[
            <Toggle key={part.prop} label={part.label} checked={node.props[part.prop]?.kind === "element" && !screenOff.includes(part.prop)} disabled={!admin} onCheckedChange={(next) => writePart(part, next)} />,
            // With a desktop AppShell the phone parts follow its header (component-usage-rules §17) until edited here.
            ...(shell ? [phoneLinked.includes(part.prop)
              ? <span key="linked" className={`studio-inspector__note ${typographyStyles["Caption/Regular"]}`}>Follows the desktop header</span>
              : <Button key="reset" level="tertiary" size="sm" disabled={!admin} onClick={() => resetToDesktop(part.prop)}>Reset to desktop</Button>] : []),
          ]}
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
  // A Section of a page you made (F4, Session C): its own panel (name, X / Y / W / H).
  if (frameId.startsWith("section:")) return <SectionPanel frameId={frameId} />;
  return <FramePanelBody frameId={frameId} controlsSlot={controlsSlot} />;
}

function FramePanelBody({ frameId, controlsSlot }: { frameId: string; controlsSlot: HTMLElement }) {
  const page = useStudio((state) => state.page);
  // The board's key (StudioFrame, FrameChrome): a builder page keeps its frames' width and theme under local:<id>, so a
  // width dragged on its frame's edge shows here and a width or theme set here reaches the frame.
  const key = useStudio((state) => pageKey(state.page, state.collection, state.localPage));
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

      {/* A frame of a page you made: Figma's X / Y / W / H, written in the page (builder/FrameGeometry.tsx, F4). */}
      {isBuilderFrame(frameId) ? <FrameGeometry frameId={frameId} /> : null}
      {frameId.startsWith("screen:") ? <ScreenSection frameId={frameId} /> : null}
      {/* Figma's Layout grid on a frame of a page you made (canvas/LayoutGuidePanel.tsx, F10). */}
      {isBuilderFrame(frameId) && frameId.startsWith("screen:") ? <LayoutGuidePanel frameId={frameId} /> : null}
      <InspectorSection title="Frame">
        {/* A view setting for example frames; a frame of a page you made has its own width (Layout › W). */}
        {isBuilderFrame(frameId) ? null : <InspectorRow label="Width">
          <RowSelectField
            aria-label="Frame width"
            size="sm"
            value={width}
            onValueChange={(value) => setFrameOverride(key, frameId, { width: value === "auto" ? "auto" : (Number(value) as StudioFrameWidth) })}
            options={widthOptions}
          />
        </InspectorRow>}
        {/* The label above and the Segmented across the fields, as a Screen's Canvas (user, 2026-10-15): beside a label
            its three options were cut ("P… L… D…"). */}
        <InspectorFields
          name="theme"
          labels={["Theme"]}
          code="Frame theme"
          fields={[(
            <Segmented
              key="theme"
              aria-label="Frame theme"
              size="sm"
              fullWidth
              value={override?.theme ?? "page"}
              onValueChange={(value) => setFrameOverride(key, frameId, { theme: value === "page" ? undefined : (value as "light" | "dark") })}
              options={[{ id: "page", label: "Page" }, { id: "light", label: "Light" }, { id: "dark", label: "Dark" }]}
            />
          )]}
        />
        <div className="studio-inspector__actions">
          <Button
            level={presentable ? "primary" : "tertiary"}
            size="sm"
            startIcon={presentable ? "icon-play-line" : "icon-zoom-in-line"}
            aria-keyshortcuts={presentKeys}
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

      {/* Figma UI3 ends a frame's panel with Export too: the frame's body as PNG, JPG or SVG. */}
      {frame ? <ExportSection src={`frame:${key}:${frameId}`} layer={label} host={frame.element} /> : null}
    </div>
  );
}
