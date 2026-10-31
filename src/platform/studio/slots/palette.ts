import { appShellPlaceholderCode, componentsOf } from "../../../../tools/studio/appshell-placeholder.mjs";
import type { StateDecl } from "../types";
import type { ContentSlot, HostProps } from "./registry";

/*
 * Zen Studio insert palette: the canonical snippets the InsertPicker writes into a content slot, and which of them a
 * given slot offers. Spec: docs/research/studio-slots-spec-2026-10-03.md, "Insert palette". Every snippet carries its
 * required props and real copy from examples/data.ts (Phin & Co, Loyalty app, Bao Nguyen…), never a "click/try" hint,
 * and passes tsc and the usage harness in every host it is offered in (palette.selftest.mjs --deep).
 *
 * Handlers are never no-ops (interaction/no-noop-handler): action items call `toast(…)` and declare `requires:
 * ["toast"]`, and the server adds `const { toast } = useToast();` to the enclosing component. Inputs go in
 * uncontrolled where the component allows it. Every DS component is offered (user, 2026-10-04: editing is free):
 * a controlled one declares its `state` (the server adds `const [name, setName] = useState(initial);` under fresh
 * names), an overlay comes with the Button that opens it, a data component with a few rows of real copy, and Image
 * reads platformMedia (`requires: ["media"]`: the server imports it; example pages only). Not offered: providers,
 * Portal, Motion and VisuallyHidden (infrastructure) and Toast (an action's toast(…) shows one). Popover comes with
 * the Button it anchors to: its `state` declares the anchor as a ref (StateDecl `ref`, 2026-10-08).
 *
 * Pure: no DOM, no React, type-only imports (besides the import-free tools/studio/appshell-placeholder.mjs) and erasable
 * TypeScript, so `node palette.selftest.mjs` imports it.
 */

export type PaletteGroup = "Text" | "Actions" | "Navigation" | "Data display" | "Charts" | "Widgets" | "Feedback" | "Inputs" | "Overlays" | "Layout" | "Page" | "Chat";

/** The picker's group order (after "Preferred for {slot}"). */
export const PALETTE_GROUPS: readonly PaletteGroup[] = ["Text", "Actions", "Navigation", "Data display", "Charts", "Widgets", "Feedback", "Inputs", "Overlays", "Layout", "Page", "Chat"];

export type PaletteContext = {
  /** The component whose slot takes the item (`slot.component`; a Stack / Grid / Box for layout children). */
  host: string;
  slot: ContentSlot;
  /** headingLevelFor(…) in registry.ts: the host title + 1, never 1. */
  headingLevel: number;
  /** Inside a BottomSheet or PlatformPhone: Toggle size lg, fields md or larger (mobile/full-size-controls). */
  mobile: boolean;
  /** The nearest surface around the slot is a Dialog, ModalForm, SidePanel or BottomSheet: a Card or ListBox there takes
   *  theme="on-container" (card/on-container-in-overlay, listbox/on-container-in-overlay). */
  overlay?: boolean;
  /** The slot is inside a Card or ListBox: a Table there is a widget the box names with its title (table/titled-box). */
  box?: boolean;
  /** Unique per insert ([a-z0-9]): radio group names, so groups in other example cards never merge. */
  uid: string;
};

export type PaletteItem = {
  id: string;
  label: string;
  group: PaletteGroup;
  caption?: string;
  /** The root element's component (what `accepts.only` / `deny` judge). */
  root: string;
  /** Every component the code uses, root first: the server imports them (COMPONENT_FOLDERS). */
  components: readonly string[];
  /** "toast": the code calls toast(…); the enclosing component needs `const { toast } = useToast();`. "media": the code
   * reads platformMedia (the server imports it; example pages only). */
  requires?: readonly ("toast" | "media")[];
  /** The useState values the code reads (`name`, `setName`): declared in the enclosing component under fresh names. */
  state?: readonly StateDecl[];
  /** A control: never inside a click target (card/clickable-no-nested-controls). */
  interactive: boolean;
  /** A form field or choice control. */
  input: boolean;
  /** The JSX, one element; lines after the first are indented 2 spaces per level from column 0 (reindent on insert). */
  build(ctx: PaletteContext): string;
  /** Its code on a builder page, which keeps no state or hooks: a static version of a stateful item (a Sidebar with its
   *  current item fixed). Without it, a stateful item cannot go on a builder page. */
  builder?(ctx: PaletteContext): string;
  /** The prototype variables its `builder` code reads ({ name: start value }): a page that lacks one declares it in
   *  `export const vars` with the insert (op pasteCode / insertChild `vars`, one undo step). */
  vars?: Readonly<Record<string, string | number | boolean>>;
};

export type PaletteHostContext = PaletteContext & {
  /** The host instance's props (hostPropsOf(element.attributes) in registry.ts). */
  hostProps: HostProps;
  /** Component names around the host, nearest first, the host left out (Card › Stack › [host]: ["Stack", "Card"]). */
  ancestors: readonly string[];
  /** The nearest ancestor that is one click target (isClickableHost), when the client knows its props. */
  clickableAncestor?: string;
  /** Component names of the layers the item lands between (insert index - 1 and index). */
  previousSibling?: string;
  nextSibling?: string;
  /** False when the insert point is not inside a function component (a lowercase helper, a .map callback, an inline
   * render): items that need `useToast` or state are hidden. Default true. */
  canUseToast?: boolean;
  /** False outside the example pages (templates): platformMedia cannot be imported there, so Image is hidden. */
  canUseMedia?: boolean;
  /** A builder page kept in this browser (Studio builder GĐ2): no hooks, so preset toast actions are dropped and items that
   * keep state are hidden. */
  builder?: boolean;
};

/**
 * An item's code for a builder page: its `() => toast({ … })` handlers are dropped, a prop (` onClick={…}`) or an item's
 * field (`, onSelect: …`) alike, so the layer arrives with no interaction, as a Figma asset does; its actions are added
 * in the Prototype tab (user, 2026-10-30, walk W-15: "Primary button" came with a "Changes saved" toast). Null when the
 * code holds other logic a page cannot have.
 */
export function builderCode(code: string): string | null {
  const next = dropToasts(code);
  return /(?<!\.)\btoast\(|=>|\buse[A-Z]/.test(next) ? null : next;
}

/** `code` without its toast handlers: ` prop={() => toast({ … })}` props and `, field: () => toast({ … })` fields. */
const dropToasts = (code: string) =>
  code.replace(/\s+\w+=\{\(\)\s*=>\s*toast\(\{[^{}]*\}\)\}/g, "").replace(/,\s*\w+:\s*\(\)\s*=>\s*toast\(\{[^{}]*\}\)/g, "");

/** Items the slot cannot take (the code could not be written there), by group and reason (`items`: their labels). */
export type PaletteHidden = { group: PaletteGroup; reason: string; items: string[] };
/** Why an item goes against the host rules here: `short` for the item's caption, `reason` in full. It still inserts. */
export type PaletteWarning = { short: string; reason: string };
/** `context`: what to pass to `item.build` (mobile also set when the chain holds a BottomSheet or PlatformPhone).
 * `warnings`: item id → why it is not recommended here (listed and insertable all the same). */
export type PaletteResult = { items: PaletteItem[]; warnings: Readonly<Record<string, PaletteWarning>>; hidden: PaletteHidden[]; context: PaletteContext };

/** src/components/<Folder> for every name a snippet uses, and useToast. Server: extend detach.mjs COMPONENT_FOLDER. */
export const COMPONENT_FOLDERS: Readonly<Record<string, string>> = {
  Heading: "Text", Text: "Text", Button: "Button", IconButton: "Button", Link: "Link", Avatar: "Avatar", Badge: "Badge", BadgeStatus: "BadgeStatus",
  PropertyField: "PropertyField", PropertyText: "PropertyField", PropertySelect: "PropertyField", PropertyStatus: "PropertyField", PropertyDate: "PropertyField", PropertyPeople: "PropertyField", PropertyTags: "PropertyField",
  Tag: "Tag", DockIcon: "DockIcon", List: "ListItem", ListItem: "ListItem", ListBox: "ListItem", DescriptionList: "DescriptionList",
  Metric: "MetricWidget", MetricCard: "MetricWidget", Card: "Card", ProgressBar: "Progress", ProgressCircle: "Progress", InlineMessage: "InlineMessage",
  EmptyState: "EmptyState", InputField: "Input", TextAreaField: "Input", SelectField: "Input", Checkbox: "Checkbox",
  Toggle: "Toggle", ChipGroup: "ChipGroup", FormFieldset: "Form", RadioButton: "RadioButton", Stack: "Layout", Grid: "Layout", Box: "Layout", Divider: "Divider", Shape: "Shape",
  Accordion: "Accordion", useToast: "Toast",
  Tabs: "Tabs", TabPanel: "Tabs", Segmented: "Segmented", Breadcrumbs: "Breadcrumbs", Pagination: "Pagination",
  Stepper: "Stepper", Menu: "Menu", Tooltip: "Tooltip", Icon: "Icon", FileIcon: "FileIcon", Flag: "Flag",
  AvatarStack: "Avatar", RatingDisplay: "Rating", Rating: "Rating", NpsScale: "Rating", Table: "Table", TableText: "Table", SheetTable: "SheetTable", SheetCode: "SheetTable", SheetKeys: "SheetTable", SheetKey: "SheetTable",
  Image: "Image", LineChart: "Chart", StackBarChart: "Chart", ChartCard: "Chart", BarChart: "Chart", DonutChart: "Chart", RadialChart: "Chart", HeatmapChart: "Chart",
  AreaChart: "Chart", GroupedBarChart: "Chart", ComboChart: "Chart", GaugeChart: "Chart", FunnelChart: "Chart", BarList: "Chart", BulletChart: "Chart", AlertBanner: "AlertBanner",
  SkeletonText: "Skeleton", SkeletonHeading: "Skeleton", Search: "Search", Chip: "Chip", Slider: "Slider",
  DateField: "Input", NumberField: "Input", AutocompleteField: "Input", RichTextField: "Input",
  ColorField: "Input", ColorPicker: "ColorPicker", ColorSwatch: "ColorSwatch", SliderField: "SliderField", CurvePreview: "CurvePreview",
  TimelineActivity: "Timeline", TimelineMilestones: "Timeline", TimelineGantt: "Timeline", TimelineItem: "Timeline",
  ScheduleResourceGrid: "Schedule", ScheduleItinerary: "Schedule", ScheduleSlotPicker: "Schedule", ScheduleDayPlanner: "Schedule",
  CalendarToolbar: "Calendar", CalendarMonth: "Calendar", CalendarTimeGrid: "Calendar", CalendarAgenda: "Calendar", CalendarWeekStrip: "Calendar",
  DatePicker: "DatePicker", ColorSelector: "ColorSelector", FileUpload: "Uploader", Dialog: "Dialog", ModalForm: "Dialog", SidePanel: "SidePanel",
  BottomSheet: "BottomSheet", Popover: "Popover", PageHeader: "PageHeader", DashboardHeader: "DashboardHeader", TopNavigation: "TopNavigation",
  BottomNavigation: "BottomNavigation", Sidebar: "Sidebar", SidebarMenuItem: "Sidebar", SidebarMenuSection: "Sidebar", AppShell: "AppShell", AppShellHeader: "AppShell", AppShellPane: "AppShell", AppShellAction: "AppShell", AppShellAccount: "AppShell", ActionBar: "ActionBar",
  ChatThread: "Chat", ChatMessage: "Chat", ChatComposer: "Chat", AiChatThread: "AiChat", AiChatBubble: "AiChat",
  AiChatField: "AiChat", VoiceRecorder: "Voice", AiVoiceConversation: "Voice",
};

/** The Calendar items' events (Wed 30 Sep 2026 and the days around it), as page code. */
const CALENDAR_EVENTS = `[{ id: "standup", title: "Daily standup", start: "2026-09-30T09:00", end: "2026-09-30T09:30" }, { id: "q4", title: "Q4 planning", start: "2026-09-30T10:30", end: "2026-09-30T12:00", color: "blue", meta: "Room 2" }, { id: "maya", title: "1:1 Maya Chen", start: "2026-09-30T14:00", end: "2026-09-30T14:45", color: "teal" }, { id: "kickoff", title: "Q4 kickoff", start: "2026-10-01", allDay: true }, { id: "review", title: "Design review", start: "2026-09-29T11:00", end: "2026-09-29T12:00", color: "violet" }]`;
/** The people the Assets people pickers list: each has a photo (platformMedia.avatars, `zen-media:avatar-<id>`). */
const PEOPLE = [{ id: "bao", name: "Bao Nguyen" }, { id: "chi", name: "Chi Tran" }, { id: "duy", name: "Duy Le" }] as const;
/** The Task properties item's rows; `photo(id)` writes a person's picture source. */
function taskProperties(photo: (id: string) => string) {
  return lines(
    `<Stack gap="2xs" align="stretch">`,
    `  <PropertyField label="Status" icon="icon-loading-02-line">`,
    `    <PropertyStatus defaultValue="in-progress" />`,
    `  </PropertyField>`,
    `  <PropertyField label="Priority" icon="icon-flag-01-line">`,
    `    <PropertySelect defaultValue="urgent" options={[{ value: "urgent", label: "Urgent", icon: "icon-flag-03-solid", tone: "negative" }, { value: "low", label: "Low", icon: "icon-flag-03-solid", tone: "neutral" }]} />`,
    `  </PropertyField>`,
    `  <PropertyField label="Due Date" icon="icon-calendar-line">`,
    `    <PropertyDate defaultValue="2026-06-07" />`,
    `  </PropertyField>`,
    `  <PropertyField label="Assignee" icon="icon-users-plus-line">`,
    `    <PropertyPeople defaultValue={["bao"]} options={[${PEOPLE.map(({ id, name }) => `{ value: "${id}", label: "${name}", photoSrc: ${photo(id)} }`).join(", ")}]} />`,
    `  </PropertyField>`,
    `  <PropertyField label="Labels" icon="icon-tag-line">`,
    `    <PropertyTags defaultValue={["ds"]} options={[{ value: "ds", label: "Design System", theme: "blue" }, { value: "ui", label: "UI Design", theme: "orange" }]} />`,
    `  </PropertyField>`,
    `</Stack>`,
  );
}

/** The Time slots item's open review times, as page code. */
const SLOTS = `[{ id: "a", start: "2026-09-30T14:00" }, { id: "b", start: "2026-09-30T15:00", disabled: true }, { id: "c", start: "2026-10-01T09:00" }, { id: "d", start: "2026-10-01T10:00" }, { id: "e", start: "2026-10-02T11:00" }]`;

const level = (ctx: PaletteContext) => Math.min(6, Math.max(2, Math.round(ctx.headingLevel) || 3));
const uidOf = (ctx: PaletteContext) => ctx.uid.toLowerCase().replace(/[^a-z0-9]/g, "") || "1";
/** A short id suffix for rows the owner keys by id (Sidebar rows): the end of the insert's uid, so two inserts differ. */
const rowId = (ctx: PaletteContext) => uidOf(ctx).slice(-4);
const lines = (...rows: string[]) => rows.join("\n");
const TOAST = ["toast"] as const;
const MEDIA = ["media"] as const;
/** A state entry (StateDecl): `name` and `setName` in the code. */
const state = (name: string, initial: string, type?: string): StateDecl => (type ? { name, initial, type } : { name, initial });
/** A ref entry (StateDecl `ref`): `const name = useRef<type>(null)`, e.g. the element a Popover anchors to. */
const ref = (name: string, type: string): StateDecl => ({ name, initial: "null", type, ref: true });

/*
 * Widgets (docs/research/widget-patterns-spec-2026-10-14.md): one whole dashboard widget each, the code the platform's
 * Widgets page shows (examples/pages/widgets.tsx renders the same JSX; palette.selftest.mjs compares the two). The data is
 * Đìzai Studio's (examples/data.ts: its months, teams, clients and projects). A `format` callback is code a builder page
 * cannot hold: there (`builder`) a money or percent callback becomes its text preset (`format="currency"`, `"percent"`),
 * any other the chart's own number format; Figma draws its own sample data.
 */
type WidgetSpec = Pick<PaletteItem, "id" | "label" | "caption" | "root" | "components" | "requires"> & {
  /** A control inside (the Hero's button): never in a click target. */
  interactive?: boolean;
  /** The JSX; `fmt(prop, fn)` writes ` prop={fn}` in the code and its PRESETS text (or nothing) on a builder page;
   *  `act(args)` an action that shows a toast: `() => toast(args)` in the code; dropped on a builder page (builderCode). */
  code: (ctx: PaletteContext, fmt: (prop: string, fn: string) => string, act: (args: string) => string) => string;
};
const widget = ({ code, interactive = false, ...item }: WidgetSpec): PaletteItem => ({
  ...item, group: "Widgets", interactive, input: false,
  build: (ctx) => code(ctx, (prop, fn) => ` ${prop}={${fn}}`, (args) => `() => toast(${args})`),
  builder: (ctx) => dropToasts(code(ctx, (prop, fn) => (PRESETS[fn] ? ` ${prop}="${PRESETS[fn]}"` : ""), (args) => `() => toast(${args})`)),
});
/** A ChartCard's headingLevel, written only when it is not its default 3. */
const cardLevel = (ctx: PaletteContext) => { const n = Math.min(4, level(ctx)); return n === 3 ? "" : ` headingLevel={${n}}`; };
/** Charts and KPI tiles may abbreviate ("$105.7K"), the figure over a chart never does ("$559,300"). */
const MONEY_K = '(value) => (value ? `$${value / 1000}K` : "$0")';
const MONEY = '(value) => `$${value.toLocaleString("en-US")}`';
const HOURS = '(value) => `${value.toLocaleString("en-US")} h`';
const PERCENT = '(value) => `${value}%`';
const GOALS = '(value, row) => (row.label === "Revenue" ? `$${value / 1000}K` : row.label === "Utilisation" ? `${value}%` : `${value}`)';
/** The text preset a builder page writes for a callback (chartCore ChartFormatPreset): money reads "$105.7K", a share "41%". */
const PRESETS: Readonly<Record<string, "currency" | "percent">> = { [MONEY_K]: "currency", [MONEY]: "currency", [PERCENT]: "percent" };

/** Everything the InsertPicker can add, in group order. */
export const PALETTE: readonly PaletteItem[] = [
  /* Text */
  {
    id: "heading", label: "Heading", group: "Text", caption: "Subheading title", root: "Heading", components: ["Heading"], interactive: false, input: false,
    build: (ctx) => `<Heading level={${level(ctx)}} textStyle="Heading/Subheading">Project details</Heading>`,
  },
  {
    id: "paragraph", label: "Paragraph", group: "Text", caption: "Body text", root: "Text", components: ["Text"], interactive: false, input: false,
    build: () => `<Text tone="base">Milestone 2 covers the rewards screens and the points ledger.</Text>`,
  },
  {
    id: "caption", label: "Caption", group: "Text", caption: "Small meta text", root: "Text", components: ["Text"], interactive: false, input: false,
    build: () => `<Text textStyle="Body/Small/Regular" tone="base">Updated Sep 30, 2026</Text>`,
  },
  /* Actions */
  {
    id: "button", label: "Button", group: "Actions", caption: "Tertiary", root: "Button", components: ["Button"], requires: TOAST, interactive: true, input: false,
    build: () => `<Button level="tertiary" onClick={() => toast({ title: "Report exported" })}>Export report</Button>`,
  },
  {
    id: "button-primary", label: "Primary button", group: "Actions", caption: "One per surface", root: "Button", components: ["Button"], requires: TOAST, interactive: true, input: false,
    build: () => `<Button level="primary" onClick={() => toast({ title: "Changes saved" })}>Save changes</Button>`,
  },
  {
    id: "button-row", label: "Button row", group: "Actions", caption: "Tertiary and Primary", root: "Stack", components: ["Stack", "Button"], requires: TOAST, interactive: true, input: false,
    build: () => lines(
      `<Stack direction="row" gap="sm" justify="end">`,
      `  <Button level="tertiary" onClick={() => toast({ title: "Invoice preview opened" })}>Preview invoice</Button>`,
      `  <Button level="primary" onClick={() => toast({ title: "Invoice sent" })}>Send invoice</Button>`,
      `</Stack>`,
    ),
  },
  {
    id: "icon-button", label: "Icon button", group: "Actions", caption: "Named, with tooltip", root: "IconButton", components: ["IconButton"], requires: TOAST, interactive: true, input: false,
    build: () => `<IconButton icon="icon-edit-02-line" aria-label="Edit details" onClick={() => toast({ title: "Editing details" })} />`,
  },
  {
    id: "link", label: "Link", group: "Actions", caption: "External", root: "Link", components: ["Link"], interactive: true, input: false,
    build: () => `<Link href="https://www.w3.org/WAI/WCAG22/quickref/" external>WCAG 2.2 quick reference</Link>`,
  },
  {
    id: "menu", label: "Menu", group: "Actions", caption: "More actions", root: "Menu", components: ["Menu", "IconButton"], requires: TOAST, interactive: true, input: false,
    build: () => lines(
      `<Menu align="end" trigger={<IconButton appearance="flat" level="primary" size="sm" icon="icon-dots-horizontal-line" aria-label="Actions for INV-0042" />}`,
      `  items={[`,
      `    { id: "remind", label: "Send reminder", icon: "icon-mail-01-line", onSelect: () => toast({ title: "Reminder sent" }) },`,
      `    { id: "pdf", label: "Download PDF", icon: "icon-download-01-line", onSelect: () => toast({ title: "Download started" }) },`,
      `  ]} />`,
    ),
  },
  /* Navigation */
  {
    id: "tabs", label: "Tabs", group: "Navigation", caption: "With panels", root: "Stack", components: ["Stack", "Tabs", "TabPanel", "Text"], state: [state("tab", '"overview"')], interactive: true, input: false,
    build: (ctx) => lines(
      `<Stack gap="md">`,
      `  <Tabs idPrefix="project-${uidOf(ctx)}" aria-label="Project sections" value={tab} onValueChange={setTab}`,
      `    items={[{ id: "overview", label: "Overview" }, { id: "files", label: "Files", badge: 3 }]} />`,
      `  <TabPanel idPrefix="project-${uidOf(ctx)}" id="overview" hidden={tab !== "overview"}>`,
      `    <Text tone="base">Milestone 2 covers the rewards screens and the points ledger.</Text>`,
      `  </TabPanel>`,
      `  <TabPanel idPrefix="project-${uidOf(ctx)}" id="files" hidden={tab !== "files"}>`,
      `    <Text tone="base">Kickoff deck, brand guide and the rewards flow.</Text>`,
      `  </TabPanel>`,
      `</Stack>`,
    ),
  },
  {
    id: "segmented", label: "Segmented", group: "Navigation", caption: "Secondary", root: "Segmented", components: ["Segmented"], interactive: true, input: false,
    // In a sheet or on a phone the items share the width (segmented/control-bar-full-width).
    build: (ctx) => `<Segmented aria-label="Billing period" defaultValue="monthly"${ctx.mobile ? " fullWidth" : ""} options={[{ id: "monthly", label: "Monthly" }, { id: "yearly", label: "Yearly" }]} />`,
  },
  {
    // The bar alone, switching by itself (no panels, no state): a PageHeader's Tabs slot, a page's section bar.
    id: "tab-bar", label: "Tab bar", group: "Navigation", caption: "Page sections", root: "Tabs", components: ["Tabs"], interactive: true, input: false,
    build: (ctx) => `<Tabs idPrefix="sections-${uidOf(ctx)}" aria-label="Page sections" defaultValue="overview" items={[{ id: "overview", label: "Overview" }, { id: "activity", label: "Activity" }]} />`,
  },
  {
    id: "breadcrumbs", label: "Breadcrumbs", group: "Navigation", root: "Breadcrumbs", components: ["Breadcrumbs"], requires: TOAST, interactive: true, input: false,
    build: () => lines(
      `<Breadcrumbs items={[{ id: "projects", label: "Projects", href: "#projects" }, { id: "loyalty", label: "Loyalty app" }]}`,
      `  onNavigate={(_, event) => { event.preventDefault(); toast({ title: "Projects opened" }); }} />`,
    ),
    // A builder page keeps no handlers that need code: the trail as the page shows it, no links to leave the canvas by.
    builder: () => `<Breadcrumbs items={[{ id: "projects", label: "Projects" }, { id: "loyalty", label: "Loyalty app" }]} />`,
  },
  /* Sidebar rows (Figma Menu-Item): what the Sidebar's Body-Content and Footer-Content slots hold. */
  {
    id: "menu-item", label: "Menu item", group: "Navigation", caption: "Sidebar row", root: "SidebarMenuItem", components: ["SidebarMenuItem"], interactive: true, input: false,
    // Each insert its own id (the Sidebar keys and selects rows by id: three "invoices" rows were one row to it).
    build: (ctx) => `<SidebarMenuItem id="invoices-${rowId(ctx)}" label="Invoices" icon="icon-receipt-line" />`,
  },
  {
    id: "menu-section", label: "Menu section", group: "Navigation", caption: "Titled Sidebar rows", root: "SidebarMenuSection", components: ["SidebarMenuSection", "SidebarMenuItem"], interactive: true, input: false,
    build: (ctx) => lines(
      `<SidebarMenuSection label="Projects">`,
      `  <SidebarMenuItem id="loyalty-app-${rowId(ctx)}" label="Loyalty app" icon="icon-cube-line" />`,
      `  <SidebarMenuItem id="online-banking-${rowId(ctx)}" label="Online banking redesign" icon="icon-cube-line" />`,
      `</SidebarMenuSection>`,
    ),
  },
  {
    id: "pagination", label: "Pagination", group: "Navigation", root: "Pagination", components: ["Pagination"], state: [state("page", "1")], interactive: true, input: false,
    build: () => `<Pagination aria-label="Invoice pages" page={page} onPageChange={setPage} pageCount={5} />`,
    // A builder page keeps no state: the page shown is fixed (2026-10-10 palette sweep: it was refused on pages you make).
    builder: () => `<Pagination aria-label="Invoice pages" page={1} pageCount={5} />`,
  },
  {
    id: "stepper", label: "Stepper", group: "Navigation", caption: "Step 2 of 3", root: "Stepper", components: ["Stepper"], interactive: false, input: false,
    build: () => lines(
      `<Stepper aria-label="New project steps" current={1} steps={[`,
      `  { id: "details", title: "Details" },`,
      `  { id: "team", title: "Team" },`,
      `  { id: "review", title: "Review" },`,
      `]} />`,
    ),
  },
  /* Data display */
  {
    id: "avatar", label: "Avatar", group: "Data display", caption: "Initials", root: "Avatar", components: ["Avatar"], interactive: false, input: false,
    build: () => `<Avatar size="md" theme="indigo" alt="Bao Nguyen">BN</Avatar>`,
  },
  {
    id: "badge", label: "Badge", group: "Data display", caption: "Status", root: "Badge", components: ["Badge"], interactive: false, input: false,
    build: () => `<Badge theme="green" background="subtle">Active</Badge>`,
  },
  {
    id: "badge-status", label: "Badge status", group: "Data display", caption: "Workflow step", root: "BadgeStatus", components: ["BadgeStatus"], interactive: false, input: false,
    build: () => `<BadgeStatus status="in-progress" />`,
  },
  {
    id: "tag-group", label: "Tag group", group: "Data display", root: "Stack", components: ["Stack", "Tag"], interactive: false, input: false,
    build: () => lines(
      `<Stack direction="row" gap="2xs" wrap>`,
      `  <Tag>Design</Tag>`,
      `  <Tag>Research</Tag>`,
      `</Stack>`,
    ),
  },
  {
    id: "dock-icon", label: "Dock icon", group: "Data display", caption: "Item icon", root: "DockIcon", components: ["DockIcon"], interactive: false, input: false,
    build: () => `<DockIcon icon="icon-mobile-line" theme="orange" background="subtle" />`,
  },
  {
    id: "list", label: "List", group: "Data display", caption: "One row", root: "List", components: ["List", "ListItem", "DockIcon"], interactive: false, input: false,
    build: () => lines(
      `<List>`,
      `  <ListItem title="Loyalty app" caption="Phin & Co · Due Oct 14"`,
      `    leading={<DockIcon icon="icon-mobile-line" theme="orange" background="subtle" />} />`,
      `</List>`,
    ),
  },
  {
    id: "list-box", label: "List box", group: "Data display", caption: "Box of rows", root: "ListBox", components: ["ListBox", "List", "ListItem", "DockIcon"], interactive: false, input: false,
    build: (ctx) => lines(
      ctx.overlay ? `<ListBox theme="on-container">` : `<ListBox>`,
      `  <List>`,
      `    <ListItem title="Loyalty app" caption="Phin & Co · Due Oct 14"`,
      `      leading={<DockIcon icon="icon-mobile-line" theme="orange" background="subtle" />} />`,
      `  </List>`,
      `</ListBox>`,
    ),
  },
  {
    id: "description-list", label: "Description list", group: "Data display", caption: "Terms and values", root: "DescriptionList", components: ["DescriptionList"], interactive: false, input: false,
    build: () => lines(
      `<DescriptionList items={[`,
      `  { term: "Client", description: "Phin & Co" },`,
      `  { term: "Due", description: "Oct 14, 2026" },`,
      `]} />`,
    ),
  },
  // Metric inside a card (concentric surfaces), MetricCard anywhere else: paletteFor offers exactly one of the two.
  {
    id: "metric", label: "Metric", group: "Data display", caption: "Value and trend", root: "Metric", components: ["Metric"], interactive: false, input: false,
    build: () => `<Metric label="Revenue" value="$21,000" icon={false} trend={{ direction: "positive", label: "12%", subLabel: "vs last month" }} />`,
  },
  {
    id: "metric-card", label: "Metric card", group: "Data display", caption: "Value and trend in a card", root: "MetricCard", components: ["MetricCard"], interactive: false, input: false,
    build: () => `<MetricCard label="Revenue" value="$21,000" icon={false} trend={{ direction: "positive", label: "12%", subLabel: "vs last month" }} />`,
  },
  {
    id: "card", label: "Card", group: "Data display", caption: "Nested surface", root: "Card", components: ["Card", "Stack", "Heading", "Text"], interactive: false, input: false,
    build: (ctx) => lines(
      `<Card theme="${ctx.overlay ? "on-container" : "border"}">`, // one card on its own: Spacing=Medium (card/spacing-by-count)
      `  <Stack gap="xs">`,
      `    <Heading level={${level(ctx)}} textStyle="Heading/Subheading">Milestone 2</Heading>`,
      `    <Text textStyle="Body/Small/Regular" tone="base">Rewards screens and the points ledger</Text>`,
      `  </Stack>`,
      `</Card>`,
    ),
  },
  {
    id: "progress", label: "Progress bar", group: "Data display", caption: "With label", root: "Stack", components: ["Stack", "Text", "ProgressBar"], interactive: false, input: false,
    build: () => lines(
      `<Stack gap="xs">`,
      `  <Text textStyle="Body/Small/Regular" tone="base">Profile completion</Text>`,
      `  <ProgressBar value={60} label aria-label="Profile completion" />`,
      `</Stack>`,
    ),
  },
  {
    // Figma Progress-Circle (1531:13954): a 20px ring that fills from 12 o'clock, its label beside it; 100 turns it into
    // the done check. The Studio's Main component frame draws its Theme × Done grid from this item.
    id: "progress-circle", label: "Progress circle", group: "Data display", caption: "Step status", root: "ProgressCircle", components: ["ProgressCircle"], interactive: false, input: false,
    build: () => lines(`<ProgressCircle value={60} theme="accent" label aria-label="Setup progress" />`),
  },
  {
    id: "avatar-stack", label: "Avatar group", group: "Data display", caption: "Team", root: "AvatarStack", components: ["AvatarStack"], interactive: false, input: false,
    build: () => lines(
      `<AvatarStack size="sm" items={[`,
      `  { alt: "Bao Nguyen", children: "BN", theme: "indigo" },`,
      `  { alt: "Trang Le", children: "TL", theme: "orange" },`,
      `  { alt: "Minh Pham", children: "MP", theme: "green" },`,
      `]} />`,
    ),
  },
  {
    id: "icon", label: "Icon", group: "Data display", caption: "Named", root: "Icon", components: ["Icon"], interactive: false, input: false,
    build: () => `<Icon name="icon-mobile-line" title="Mobile app" />`,
  },
  {
    id: "file-icon", label: "File icon", group: "Data display", caption: "PDF", root: "FileIcon", components: ["FileIcon"], interactive: false, input: false,
    build: () => `<FileIcon format="pdf" title="Brief.pdf" />`,
  },
  {
    id: "flag", label: "Flag", group: "Data display", root: "Flag", components: ["Flag"], interactive: false, input: false,
    build: () => `<Flag name="Vietnam" label="Vietnam" />`,
  },
  {
    id: "rating-display", label: "Rating", group: "Data display", caption: "Read-only stars", root: "RatingDisplay", components: ["RatingDisplay"], interactive: false, input: false,
    build: () => `<RatingDisplay value={4.5} label="Rated 4.5 out of 5" />`,
  },
  {
    // Each column's cell is a Figma Content (Table/Cell/Default) drawn from the row's fields, so the Inspector switches it
    // (Text, Avatar, Badge, Progress…) and a page you made can hold it (no cell functions). The status column holds a
    // BadgeStatus per value (`cells`: the Content slot's layer), so each step shows its ring (table/badge-column-icon).
    // In a Card or ListBox the table is a widget the box names: its Heading/Subheading title above it (table/titled-box).
    id: "table", label: "Table", group: "Data display", caption: "Two rows", root: "Table", components: ["Table", "BadgeStatus"], interactive: false, input: false,
    build: (ctx) => {
      const table = lines(
        `<Table ${ctx.box ? `aria-labelledby="projects-${uidOf(ctx)}"` : `aria-label="Projects"`}`,
        `  rows={[`,
        `    { id: "loyalty", name: "Loyalty app", client: "Phin & Co", lead: "Chi Tran", status: "In Progress", due: "Oct 14, 2026" },`,
        `    { id: "banking", name: "Online banking redesign", client: "Lumen Bank", lead: "Bao Nguyen", status: "In Review", due: "Nov 2, 2026" },`,
        `  ]}`,
        `  columns={[`,
        `    { id: "project", header: "Project", content: "text", field: "name", captionField: "client", bold: true },`,
        `    { id: "lead", header: "Lead", content: "avatar", field: "lead" },`,
        `    { id: "status", header: "Status", field: "status", cells: { "In Progress": <BadgeStatus status="in-progress" />, "In Review": <BadgeStatus status="in-review" /> } },`,
        `    { id: "due", header: "Due", width: "152px", field: "due" },`,
        `  ]} />`,
      );
      if (!ctx.box) return table;
      return lines(
        `<Stack gap="md">`,
        `  <Heading level={${level(ctx)}} id="projects-${uidOf(ctx)}" textStyle="Heading/Subheading">Projects</Heading>`,
        `  ${table.split("\n").join("\n  ")}`,
        `</Stack>`,
      );
    },
  },
  {
    id: "sheet-table", label: "Sheet table", group: "Data display", caption: "Long reference rows", root: "SheetTable", components: ["SheetTable"], interactive: false, input: false,
    build: () => lines(
      `<SheetTable aria-label="Keyboard"`,
      `  rows={[`,
      `    { id: "tab", keys: "Tab / Shift + Tab", action: "Moves focus to the next or the previous card that is one action." },`,
      `    { id: "enter", keys: "Enter / Space", action: "Opens the focused card." },`,
      `  ]}`,
      `  columns={[`,
      `    { id: "keys", header: "Key", width: "32%", content: "keys" },`,
      `    { id: "action", header: "Action" },`,
      `  ]} />`,
    ),
  },
  {
    id: "image", label: "Image", group: "Data display", caption: "4:3 photo", root: "Image", components: ["Image"], requires: MEDIA, interactive: false, input: false,
    build: () => `<Image src={platformMedia.site[5].src} alt={platformMedia.site[5].alt} ratio="4:3" />`,
    // A page you make takes the library's photo by key (builder/library/media.ts), not platformMedia.
    builder: () => `<Image src="zen-media:site-cafe" alt="Café table with a coffee" ratio="4:3" />`,
  },
  /* Charts */
  {
    id: "chart-card", label: "Chart card", group: "Charts", caption: "Line chart", root: "ChartCard", components: ["ChartCard", "LineChart"], interactive: false, input: false,
    build: (ctx) => lines(
      `<ChartCard title="Revenue" headingLevel={${Math.min(4, level(ctx))}} theme="border">`,
      `  <LineChart aria-label="Revenue invoiced per month, Jul – Sep 2026" height={200}`,
      `    data={[{ label: "Jul", value: 18400 }, { label: "Aug", value: 19650 }, { label: "Sep", value: 21000 }]} />`,
      `</ChartCard>`,
    ),
  },
  {
    id: "line-chart", label: "Line chart", group: "Charts", root: "LineChart", components: ["LineChart"], interactive: false, input: false,
    build: () => lines(
      `<LineChart aria-label="Revenue invoiced per month, Jul – Sep 2026" height={200}`,
      `  data={[{ label: "Jul", value: 18400 }, { label: "Aug", value: 19650 }, { label: "Sep", value: 21000 }]} />`,
    ),
  },
  {
    id: "bar-chart", label: "Stacked bar chart", group: "Charts", root: "StackBarChart", components: ["StackBarChart"], interactive: false, input: false,
    build: () => lines(
      `<StackBarChart aria-label="Billable hours per month by team, Jul – Sep 2026"`,
      `  series={[{ id: "design", label: "Design" }, { id: "engineering", label: "Engineering" }]}`,
      `  data={[`,
      `    { label: "Jul", values: { design: 120, engineering: 180 } },`,
      `    { label: "Aug", values: { design: 140, engineering: 170 } },`,
      `    { label: "Sep", values: { design: 110, engineering: 200 } },`,
      `  ]} />`,
    ),
  },
  {
    id: "column-chart", label: "Bar chart", group: "Charts", caption: "Forecast hatched", root: "BarChart", components: ["BarChart"], interactive: false, input: false,
    build: () => lines(
      `<BarChart aria-label="Revenue invoiced per month, Jul – Dec 2026, Oct – Dec forecast" height={220}`,
      `  data={[`,
      `    { label: "Jul", value: 94100 }, { label: "Aug", value: 97000 }, { label: "Sep", value: 105700 },`,
      `    { label: "Oct", value: 108000, projected: true }, { label: "Nov", value: 112500, projected: true }, { label: "Dec", value: 104000, projected: true },`,
      `  ]} />`,
    ),
  },
  {
    id: "horizontal-bar-chart", label: "Horizontal bar chart", group: "Charts", caption: "Against a target", root: "BarChart", components: ["BarChart"], interactive: false, input: false,
    build: () => lines(
      `<BarChart orientation="horizontal" aria-label="Billable hours per team against capacity, September 2026"`,
      `  data={[`,
      `    { label: "Design", value: 2650, target: 2800 }, { label: "Engineering", value: 1990, target: 2240 },`,
      `    { label: "Delivery", value: 750, target: 960 }, { label: "Client Services", value: 510, target: 640 },`,
      `  ]} />`,
    ),
  },
  {
    id: "multi-line-chart", label: "Line chart with comparison", group: "Charts", caption: "Dashed compare line", root: "LineChart", components: ["LineChart"], interactive: false, input: false,
    build: () => lines(
      `<LineChart aria-label="Invoiced and collected per month, Jul – Sep 2026" height={220} legendPosition="top" label="Invoiced"`,
      `  data={[{ label: "Jul", value: 94100 }, { label: "Aug", value: 97000 }, { label: "Sep", value: 105700 }]}`,
      `  compare={{ label: "Collected", values: [91700, 95800, 88300] }} />`,
    ),
  },
  {
    id: "donut-chart", label: "Donut chart", group: "Charts", caption: "Shares of a total", root: "DonutChart", components: ["DonutChart"], interactive: false, input: false,
    build: () => lines(
      `<DonutChart aria-label="Revenue by client, Q3 2026"`,
      `  data={[`,
      `    { id: "lumen", label: "Lumen Bank", value: 89000 }, { id: "phin", label: "Phin & Co", value: 68300 },`,
      `    { id: "mekong", label: "Mekong Freight", value: 53400 }, { id: "other", label: "Other clients", value: 86100 },`,
      `  ]} />`,
    ),
  },
  {
    id: "radial-chart", label: "Radial chart", group: "Charts", caption: "Ring gauges", root: "RadialChart", components: ["RadialChart"], interactive: false, input: false,
    build: () => lines(
      `<RadialChart aria-label="Budget used on client projects, September 30, 2026"`,
      `  data={[{ id: "lumen", label: "Online banking redesign", value: 36 }, { id: "phin", label: "Loyalty app", value: 61 }, { id: "mekong", label: "Shipment tracking", value: 23 }]} />`,
    ),
  },
  {
    id: "heatmap-chart", label: "Heatmap", group: "Charts", caption: "Day × hour", root: "HeatmapChart", components: ["HeatmapChart"], interactive: false, input: false,
    build: () => lines(
      `<HeatmapChart aria-label="Hours logged by weekday and hour of the day, September 2026"`,
      `  columns={["Mon", "Tue", "Wed", "Thu", "Fri"]} rows={["9 am", "11 am", "1 pm", "3 pm", "5 pm"]}`,
      `  values={[[38, 41, 40, 39, 35], [71, 74, 72, 70, 61], [52, 55, 53, 51, 44], [70, 75, 73, 71, 48], [42, 44, 43, 41, 22]]} />`,
    ),
  },
  {
    id: "area-chart", label: "Area chart", group: "Charts", caption: "One measure over time", root: "AreaChart", components: ["AreaChart"], interactive: false, input: false,
    build: () => lines(
      `<AreaChart aria-label="Billable hours logged per month, Apr – Sep 2026"`,
      `  series={[{ id: "hours", label: "Billable hours" }]}`,
      `  data={[`,
      `    { label: "Apr", values: { hours: 1720 } }, { label: "May", values: { hours: 1860 } }, { label: "Jun", values: { hours: 1790 } },`,
      `    { label: "Jul", values: { hours: 2010 } }, { label: "Aug", values: { hours: 1890 } }, { label: "Sep", values: { hours: 2210 } },`,
      `  ]} />`,
    ),
  },
  {
    id: "stacked-area-chart", label: "Stacked area chart", group: "Charts", caption: "Series that add up", root: "AreaChart", components: ["AreaChart"], interactive: false, input: false,
    build: () => lines(
      `<AreaChart type="stacked" aria-label="Billable hours per month by team, Apr – Sep 2026"`,
      `  series={[{ id: "design", label: "Design" }, { id: "engineering", label: "Engineering" }, { id: "delivery", label: "Delivery" }]}`,
      `  data={[`,
      `    { label: "Apr", values: { design: 620, engineering: 820, delivery: 280 } }, { label: "May", values: { design: 660, engineering: 900, delivery: 300 } },`,
      `    { label: "Jun", values: { design: 640, engineering: 850, delivery: 300 } }, { label: "Jul", values: { design: 720, engineering: 960, delivery: 330 } },`,
      `    { label: "Aug", values: { design: 680, engineering: 890, delivery: 320 } }, { label: "Sep", values: { design: 790, engineering: 1060, delivery: 360 } },`,
      `  ]} />`,
    ),
  },
  {
    id: "grouped-bar-chart", label: "Grouped bar chart", group: "Charts", caption: "Series side by side", root: "GroupedBarChart", components: ["GroupedBarChart"], interactive: false, input: false,
    build: () => lines(
      `<GroupedBarChart aria-label="Invoiced and collected per month, Apr – Sep 2026"`,
      `  series={[{ id: "invoiced", label: "Invoiced" }, { id: "collected", label: "Collected" }]}`,
      `  data={[`,
      `    { label: "Apr", values: { invoiced: 86200, collected: 81400 } }, { label: "May", values: { invoiced: 90500, collected: 84100 } },`,
      `    { label: "Jun", values: { invoiced: 88900, collected: 86700 } }, { label: "Jul", values: { invoiced: 94100, collected: 91700 } },`,
      `    { label: "Aug", values: { invoiced: 97000, collected: 95800 } }, { label: "Sep", values: { invoiced: 105700, collected: 88300 } },`,
      `  ]} />`,
    ),
  },
  {
    id: "combo-chart", label: "Combo chart", group: "Charts", caption: "Bars and a line", root: "ComboChart", components: ["ComboChart"], interactive: false, input: false,
    build: () => lines(
      `<ComboChart aria-label="Revenue and margin per month, Apr – Sep 2026" barLabel="Revenue" lineLabel="Margin (%)"`,
      `  data={[`,
      `    { label: "Apr", bar: 86200, line: 34 }, { label: "May", bar: 90500, line: 36 }, { label: "Jun", bar: 88900, line: 35 },`,
      `    { label: "Jul", bar: 94100, line: 38 }, { label: "Aug", bar: 97000, line: 39 }, { label: "Sep", bar: 105700, line: 41 },`,
      `  ]} />`,
    ),
  },
  {
    id: "gauge-chart", label: "Gauge", group: "Charts", caption: "One reading against a goal", root: "GaugeChart", components: ["GaugeChart"], interactive: false, input: false,
    build: () => `<GaugeChart aria-label="Billable share of logged hours, September 2026" value={82} target={85} actualLabel="Billable" />`,
  },
  {
    id: "funnel-chart", label: "Funnel", group: "Charts", caption: "Stages of a flow", root: "FunnelChart", components: ["FunnelChart"], interactive: false, input: false,
    build: () => lines(
      `<FunnelChart aria-label="Leads to signed projects, Q3 2026"`,
      `  data={[{ label: "Leads", value: 240 }, { label: "Qualified", value: 168 }, { label: "Proposals sent", value: 96 }, { label: "Signed", value: 62 }]} />`,
    ),
  },
  {
    id: "bar-list", label: "Bar list", group: "Charts", caption: "Ranked items", root: "BarList", components: ["BarList"], interactive: false, input: false,
    build: () => lines(
      `<BarList aria-label="Revenue by client, 2026 so far" headers={{ label: "Client", value: "Revenue" }}`,
      `  data={[`,
      `    { label: "Lumen Bank", value: 89000 }, { label: "Phin & Co", value: 68300 }, { label: "Mekong Freight", value: 53400 },`,
      `    { label: "Saigon Roast", value: 44200 }, { label: "Other clients", value: 41900 },`,
      `  ]} />`,
    ),
  },
  {
    id: "bullet-chart", label: "Bullet chart", group: "Charts", caption: "Goals against targets", root: "BulletChart", components: ["BulletChart"], interactive: false, input: false,
    build: () => lines(
      `<BulletChart aria-label="Quarter goals against target, Q3 2026"`,
      `  data={[`,
      `    { label: "Revenue", value: 612000, target: 600000 }, { label: "New clients", value: 7, target: 6 },`,
      `    { label: "Utilisation", value: 82, target: 85, max: 100 },`,
      `  ]} />`,
    ),
  },
  /* Widgets: metrics (Figma Metric-Card Type, 6643:64008) */
  widget({
    id: "widget-kpi", label: "KPI card", caption: "Icon, number and trend", root: "MetricCard", components: ["MetricCard"],
    code: () => lines(
      `<MetricCard theme="default" size="large" label="Billable hours" value="5,900 h" icon="icon-clock-line" iconTheme="blue"`,
      `  trend={{ direction: "positive", label: "4%", subLabel: "vs. August" }} />`,
    ),
  }),
  widget({
    id: "widget-kpi-sparkline", label: "KPI with sparkline", caption: "Metric card, sparkline", root: "MetricCard", components: ["MetricCard"],
    code: (_ctx, fmt) => lines(
      `<MetricCard theme="default" type="sparkline" label="Revenue" value="$105,700"${fmt("format", MONEY_K)}`,
      `  trend={{ direction: "positive", label: "9%", subLabel: "vs. August" }}`,
      `  series={[71200, 76500, 68900, 74300, 79600, 85100, 82300, 91800, 88400, 94100, 97000, 105700]} />`,
    ),
  }),
  widget({
    id: "widget-kpi-spark-bars", label: "KPI with spark bars", caption: "Metric card, spark bars", root: "MetricCard", components: ["MetricCard"],
    code: (_ctx, fmt) => lines(
      `<MetricCard theme="default" type="spark-bars" label="Hours logged" value="1,284 h"${fmt("format", HOURS)}`,
      `  trend={{ direction: "positive", label: "13%", subLabel: "vs. last week" }}`,
      `  series={[1012, 1086, 1048, 760, 1131, 1176, 1104, 640, 1153, 1067, 1132, 1284]} />`,
    ),
  }),
  widget({
    id: "widget-goal-progress", label: "Goal progress", caption: "Metric card, goal", root: "MetricCard", components: ["MetricCard"],
    code: (_ctx, fmt) => lines(
      `<MetricCard theme="default" type="goal-progress" label="Collected in Q3" value="$275,800"${fmt("format", MONEY)}`,
      `  trend={{ direction: "positive", label: "8%", subLabel: "vs. Q2" }}`,
      `  goal={{ value: 275800, target: 290000 }} />`,
    ),
  }),
  widget({
    id: "widget-period-comparison", label: "Period comparison", caption: "Metric card, columns", root: "MetricCard", components: ["MetricCard"],
    code: () => lines(
      `<MetricCard theme="default" type="comparison" label="Cash flow · September" comparison={[`,
      `  { id: "invoiced", label: "Invoiced", value: "$105,700", trend: { direction: "positive", label: "9%", subLabel: "vs. August" } },`,
      `  { id: "collected", label: "Collected", value: "$88,300", trend: { direction: "negative", label: "8%", subLabel: "vs. August" } },`,
      `  { id: "overdue", label: "Overdue", value: "$12,880", trend: { direction: "normal", label: "1", subLabel: "invoice" } },`,
      `]} />`,
    ),
  }),
  widget({
    id: "widget-category-split", label: "Category split", caption: "Metric card, category bar", root: "MetricCard", components: ["MetricCard"],
    code: (_ctx, fmt) => lines(
      `<MetricCard theme="default" type="category-bar" label="Billable hours · September" value="5,900 h"${fmt("format", HOURS)}`,
      `  categories={[`,
      `    { id: "design", label: "Design", value: 2650 }, { id: "engineering", label: "Engineering", value: 1990 },`,
      `    { id: "delivery", label: "Delivery", value: 750 }, { id: "client-services", label: "Client Services", value: 510 },`,
      `  ]} />`,
    ),
  }),
  widget({
    // The row's one stand-out: Card Solid Neutral (the dark widget), its button Overlay Inverse (Figma Button/Overlay).
    id: "widget-hero", label: "Hero metric", caption: "Solid stand-out", root: "MetricCard", components: ["MetricCard", "Button"], requires: TOAST, interactive: true,
    code: (_ctx, fmt, act) => lines(
      `<MetricCard type="hero" theme="solid" color="neutral" label="Invoiced this year" value="$798,300"${fmt("format", MONEY_K)}`,
      `  trend={{ direction: "positive", label: "12%", subLabel: "vs. 2025" }}`,
      `  series={[74300, 79600, 85100, 82300, 91800, 88400, 94100, 97000, 105700]}`,
      `  footer={<Button size="sm" appearance="overlay" level="inverse" onClick={${act('{ title: "Revenue report opened" }')}}>View report</Button>} />`,
    ),
  }),
  widget({
    // Figma Metric-Card Type=Tile: a phone stat tile whose content follows the card's fill (Solid Neutral: Inverse).
    id: "widget-metric-tile", label: "Stat tile", caption: "Number, trend and icon", root: "MetricCard", components: ["MetricCard"],
    code: () => lines(
      `<MetricCard theme="solid" color="neutral" type="tile" label="Success rate" value="56%"`,
      `  trend={{ direction: "positive", label: "24%", subLabel: "vs. last year" }} />`,
    ),
  }),
  /* Widgets: trends */
  widget({
    id: "widget-revenue-trend", label: "Revenue trend", caption: "Area chart, 12 months", root: "ChartCard", components: ["ChartCard", "AreaChart"],
    code: (ctx, fmt) => lines(
      `<ChartCard title="Revenue"${cardLevel(ctx)} metricLabel="Invoiced over the last 12 months" value="$1,014,900">`,
      `  <AreaChart aria-label="Revenue invoiced per month, Oct 2025 – Sep 2026" height={200}${fmt("format", MONEY_K)}`,
      `    series={[{ id: "invoiced", label: "Invoiced" }]}`,
      `    data={[`,
      `      { label: "Oct", values: { invoiced: 71200 } }, { label: "Nov", values: { invoiced: 76500 } }, { label: "Dec", values: { invoiced: 68900 } },`,
      `      { label: "Jan", values: { invoiced: 74300 } }, { label: "Feb", values: { invoiced: 79600 } }, { label: "Mar", values: { invoiced: 85100 } },`,
      `      { label: "Apr", values: { invoiced: 82300 } }, { label: "May", values: { invoiced: 91800 } }, { label: "Jun", values: { invoiced: 88400 } },`,
      `      { label: "Jul", values: { invoiced: 94100 } }, { label: "Aug", values: { invoiced: 97000 } }, { label: "Sep", values: { invoiced: 105700 } },`,
      `    ]} />`,
      `</ChartCard>`,
    ),
  }),
  widget({
    id: "widget-hours-by-team", label: "Hours by team", caption: "Stacked area", root: "ChartCard", components: ["ChartCard", "AreaChart"],
    code: (ctx, fmt) => lines(
      `<ChartCard title="Billable hours by team"${cardLevel(ctx)} metricLabel="Logged per month, Apr – Sep 2026" value="35,240 h">`,
      `  <AreaChart type="stacked" aria-label="Billable hours per month by team, Apr – Sep 2026" height={200}${fmt("format", HOURS)}`,
      `    series={[{ id: "design", label: "Design" }, { id: "engineering", label: "Engineering" }, { id: "delivery", label: "Delivery" }, { id: "client-services", label: "Client Services" }]}`,
      `    data={[`,
      `      { label: "Apr", values: { design: 2500, engineering: 1880, delivery: 700, "client-services": 480 } },`,
      `      { label: "May", values: { design: 2510, engineering: 1880, delivery: 700, "client-services": 480 } },`,
      `      { label: "Jun", values: { design: 2720, engineering: 2040, delivery: 770, "client-services": 520 } },`,
      `      { label: "Jul", values: { design: 2920, engineering: 2190, delivery: 820, "client-services": 560 } },`,
      `      { label: "Aug", values: { design: 2550, engineering: 1910, delivery: 720, "client-services": 490 } },`,
      `      { label: "Sep", values: { design: 2650, engineering: 1990, delivery: 750, "client-services": 510 } },`,
      `    ]} />`,
      `</ChartCard>`,
    ),
  }),
  widget({
    id: "widget-invoiced-collected", label: "Invoiced vs collected", caption: "Line with a comparison", root: "ChartCard", components: ["ChartCard", "LineChart"],
    code: (ctx, fmt) => lines(
      `<ChartCard title="Invoiced vs. collected"${cardLevel(ctx)} metricLabel="Collected of $559,300 invoiced, Apr – Sep 2026" value="$531,400">`,
      `  <LineChart aria-label="Invoiced and collected per month, Apr – Sep 2026" height={200} label="Invoiced" legendPosition="top"${fmt("format", MONEY_K)}`,
      `    data={[`,
      `      { label: "Apr", value: 82300 }, { label: "May", value: 91800 }, { label: "Jun", value: 88400 },`,
      `      { label: "Jul", value: 94100 }, { label: "Aug", value: 97000 }, { label: "Sep", value: 105700 },`,
      `    ]}`,
      `    compare={{ label: "Collected", values: [79500, 90100, 86000, 91700, 95800, 88300] }} />`,
      `</ChartCard>`,
    ),
  }),
  widget({
    id: "widget-forecast", label: "Forecast", caption: "Bars, forecast hatched", root: "ChartCard", components: ["ChartCard", "BarChart"],
    code: (ctx, fmt) => lines(
      `<ChartCard title="Revenue forecast"${cardLevel(ctx)} metricLabel="Invoiced and forecast for 2026" value="$1,122,800">`,
      `  <BarChart aria-label="Revenue invoiced per month, Jan – Dec 2026, Oct – Dec forecast" height={200} showAverage${fmt("format", MONEY_K)}`,
      `    data={[`,
      `      { label: "Jan", value: 74300 }, { label: "Feb", value: 79600 }, { label: "Mar", value: 85100 },`,
      `      { label: "Apr", value: 82300 }, { label: "May", value: 91800 }, { label: "Jun", value: 88400 },`,
      `      { label: "Jul", value: 94100 }, { label: "Aug", value: 97000 }, { label: "Sep", value: 105700 },`,
      `      { label: "Oct", value: 108000, projected: true }, { label: "Nov", value: 112500, projected: true }, { label: "Dec", value: 104000, projected: true },`,
      `    ]} />`,
      `</ChartCard>`,
    ),
  }),
  /* Widgets: comparisons */
  widget({
    id: "widget-year-over-year", label: "This year vs last", caption: "Grouped bars", root: "ChartCard", components: ["ChartCard", "GroupedBarChart"],
    code: (ctx, fmt) => lines(
      `<ChartCard title="This year vs last"${cardLevel(ctx)} metricLabel="Invoiced Apr – Sep 2026, up 12% on 2025" value="$559,300">`,
      `  <GroupedBarChart aria-label="Revenue invoiced per month, Apr – Sep, 2025 and 2026" height={200}${fmt("format", MONEY_K)}`,
      `    series={[{ id: "lastYear", label: "2025" }, { id: "thisYear", label: "2026" }]}`,
      `    data={[`,
      `      { label: "Apr", values: { lastYear: 74600, thisYear: 82300 } }, { label: "May", values: { lastYear: 81900, thisYear: 91800 } },`,
      `      { label: "Jun", values: { lastYear: 80300, thisYear: 88400 } }, { label: "Jul", values: { lastYear: 84200, thisYear: 94100 } },`,
      `      { label: "Aug", values: { lastYear: 86900, thisYear: 97000 } }, { label: "Sep", values: { lastYear: 90400, thisYear: 105700 } },`,
      `    ]} />`,
      `</ChartCard>`,
    ),
  }),
  widget({
    id: "widget-revenue-margin", label: "Revenue and margin", caption: "Bars and a line", root: "ChartCard", components: ["ChartCard", "ComboChart"],
    code: (ctx, fmt) => lines(
      `<ChartCard title="Revenue and margin"${cardLevel(ctx)} metricLabel="Invoiced and the share kept after costs, Apr – Sep 2026" value="$559,300">`,
      `  <ComboChart aria-label="Revenue and margin per month, Apr – Sep 2026" barLabel="Revenue" lineLabel="Margin" height={200}${fmt("format", MONEY_K)}${fmt("lineFormat", PERCENT)}`,
      `    data={[`,
      `      { label: "Apr", bar: 82300, line: 31 }, { label: "May", bar: 91800, line: 34 }, { label: "Jun", bar: 88400, line: 29 },`,
      `      { label: "Jul", bar: 94100, line: 36 }, { label: "Aug", bar: 97000, line: 38 }, { label: "Sep", bar: 105700, line: 41 },`,
      `    ]} />`,
      `</ChartCard>`,
    ),
  }),
  widget({
    id: "widget-busiest-hours", label: "Busiest hours", caption: "Heatmap, day × hour", root: "ChartCard", components: ["ChartCard", "HeatmapChart"],
    code: (ctx, fmt) => lines(
      `<ChartCard title="Busiest hours"${cardLevel(ctx)} metricLabel="Hours logged per hour of the day, September">`,
      `  <HeatmapChart aria-label="Hours logged by weekday and hour of the day, September 2026"${fmt("format", HOURS)}`,
      `    columns={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}`,
      `    rows={["9 am", "10 am", "11 am", "12 pm", "1 pm", "2 pm", "3 pm", "4 pm", "5 pm", "6 pm"]}`,
      `    values={[`,
      `      [38, 41, 40, 39, 35, 4, 0], [62, 66, 64, 63, 55, 6, 2], [71, 74, 72, 70, 61, 7, 2], [34, 36, 35, 33, 30, 5, 1], [52, 55, 53, 51, 44, 6, 1],`,
      `      [68, 72, 70, 69, 52, 5, 2], [70, 75, 73, 71, 48, 4, 1], [61, 64, 63, 60, 39, 3, 0], [42, 44, 43, 41, 22, 2, 0], [12, 14, 13, 12, 5, 0, 0],`,
      `    ]} />`,
      `</ChartCard>`,
    ),
  }),
  /* Widgets: goals */
  widget({
    id: "widget-utilisation", label: "Utilisation", caption: "Gauge against a target", root: "ChartCard", components: ["ChartCard", "GaugeChart"],
    code: (ctx) => lines(
      `<ChartCard title="Utilisation"${cardLevel(ctx)} metricLabel="Billable share of logged hours, September" value="5,900 of 7,564 h">`,
      `  <GaugeChart aria-label="Billable share of logged hours against the 85% target, September 2026" value={5900} max={7564} target={6429} actualLabel="Billable" />`,
      `</ChartCard>`,
    ),
  }),
  widget({
    id: "widget-quarter-goals", label: "Quarter goals", caption: "Bullet chart", root: "ChartCard", components: ["ChartCard", "BulletChart"],
    code: (ctx, fmt) => lines(
      `<ChartCard title="Quarter goals"${cardLevel(ctx)} metricLabel="Q3 2026 against target" value="1 of 3 met">`,
      `  <BulletChart aria-label="Quarter goals, Q3 2026"${fmt("format", GOALS)}`,
      `    data={[`,
      `      { label: "Revenue", value: 296800, target: 320000 },`,
      `      { label: "New clients", value: 5, target: 4 },`,
      `      { label: "Utilisation", value: 78, target: 80, max: 100 },`,
      `    ]} />`,
      `</ChartCard>`,
    ),
  }),
  widget({
    id: "widget-budget-rings", label: "Budget rings", caption: "Radial chart", root: "ChartCard", components: ["ChartCard", "RadialChart"],
    code: (ctx) => lines(
      `<ChartCard title="Budget used"${cardLevel(ctx)} metricLabel="Client projects, spent of budget">`,
      `  <RadialChart aria-label="Budget used on client projects, September 30, 2026"`,
      `    data={[{ id: "lumen", label: "Online banking redesign", value: 36 }, { id: "phin", label: "Loyalty app", value: 61 }, { id: "mekong", label: "Shipment tracking", value: 23 }]} />`,
      `</ChartCard>`,
    ),
  }),
  /* Widgets: shares and rankings */
  widget({
    id: "widget-sales-funnel", label: "Sales funnel", caption: "Funnel", root: "ChartCard", components: ["ChartCard", "FunnelChart"],
    code: (ctx) => lines(
      `<ChartCard title="Sales funnel"${cardLevel(ctx)} metricLabel="Leads to signed projects, Q3 2026" value="62 signed">`,
      `  <FunnelChart aria-label="Leads to signed projects, Q3 2026"`,
      `    data={[{ label: "Leads", value: 480 }, { label: "Qualified", value: 312 }, { label: "Proposal", value: 168 }, { label: "Negotiation", value: 94 }, { label: "Signed", value: 62 }]} />`,
      `</ChartCard>`,
    ),
  }),
  widget({
    id: "widget-top-clients", label: "Top clients", caption: "Bar list", root: "ChartCard", components: ["ChartCard", "BarList"],
    code: (ctx, fmt) => lines(
      `<ChartCard title="Top clients"${cardLevel(ctx)} metricLabel="Revenue in Q3 2026" value="$296,800">`,
      `  <BarList aria-label="Revenue by client, Q3 2026" headers={{ label: "Client", value: "Revenue" }}${fmt("format", MONEY)}`,
      `    data={[`,
      `      { label: "Lumen Bank", value: 89000 }, { label: "Phin & Co", value: 68300 }, { label: "Mekong Freight", value: 53400 },`,
      `      { label: "Hanoi Book Fair", value: 50500 }, { label: "Other clients", value: 35600 },`,
      `    ]} />`,
      `</ChartCard>`,
    ),
  }),
  widget({
    id: "widget-revenue-by-client", label: "Revenue by client", caption: "Donut chart", root: "ChartCard", components: ["ChartCard", "DonutChart"],
    code: (ctx, fmt) => lines(
      `<ChartCard title="Revenue by client"${cardLevel(ctx)} metricLabel="Invoiced in Q3 2026">`,
      `  <DonutChart aria-label="Revenue by client, Q3 2026" legendPosition="start"${fmt("format", MONEY_K)}`,
      `    data={[`,
      `      { id: "lumen", label: "Lumen Bank", value: 89000 }, { id: "phin", label: "Phin & Co", value: 68300 },`,
      `      { id: "mekong", label: "Mekong Freight", value: 53400 }, { id: "bookfair", label: "Hanoi Book Fair", value: 50500 },`,
      `      { id: "other", label: "Other clients", value: 35600 },`,
      `    ]} />`,
      `</ChartCard>`,
    ),
  }),
  /* Feedback */
  {
    id: "inline-message", label: "Inline message", group: "Feedback", caption: "Info", root: "InlineMessage", components: ["InlineMessage"], interactive: false, input: false,
    build: () => `<InlineMessage theme="info" title="Invoices go out on the 1st">The client gets a PDF by email.</InlineMessage>`,
  },
  {
    id: "empty-state", label: "Empty state", group: "Feedback", caption: "Small", root: "EmptyState", components: ["EmptyState"], interactive: false, input: false,
    build: (ctx) => `<EmptyState size="sm" icon="icon-folder-line" headingLevel={${level(ctx)}} title="No files yet">Files you add to this project appear here.</EmptyState>`,
  },
  {
    id: "alert-banner", label: "Alert banner", group: "Feedback", caption: "Info", root: "AlertBanner", components: ["AlertBanner"], interactive: false, input: false,
    build: () => `<AlertBanner theme="info">Zen is read-only tonight from 11:00 pm to 1:00 am while the studio moves to a new data center.</AlertBanner>`,
  },
  {
    id: "skeleton", label: "Skeleton", group: "Feedback", caption: "Loading text", root: "Stack", components: ["Stack", "SkeletonHeading", "SkeletonText"], interactive: false, input: false,
    build: () => lines(
      `<Stack gap="xs">`,
      `  <SkeletonHeading />`,
      `  <SkeletonText lines={3} />`,
      `</Stack>`,
    ),
  },
  /* Inputs: uncontrolled, default size md (never sm on a phone). */
  {
    id: "input-field", label: "Text field", group: "Inputs", root: "InputField", components: ["InputField"], interactive: true, input: true,
    build: () => `<InputField label="Project name" placeholder="e.g. Loyalty app" />`,
  },
  /*
   * Form · required field (walk W-58, docs/research/studio-prototype-variables-2026-10-31.md §5): Send stops while the
   * email is empty and says why, else goes on. On a builder page the field writes `vars.email` (two-way) and the
   * Button's Conditional tests it ("is empty"). The one Assets item that keeps its action on a builder page (since walk
   * W-15 items arrive without one): the action is what the template shows.
   */
  {
    id: "form-required-field", label: "Form · required field", group: "Inputs", caption: "Stops while empty", root: "Stack", components: ["Stack", "InputField", "Button"],
    requires: TOAST, state: [state("email", '""'), state("emailError", '""')], vars: { email: "", emailError: "" }, interactive: true, input: true,
    build: () => lines(
      `<Stack gap="md">`,
      `  <InputField label="Email" type="email" placeholder="name@company.com" value={email} onValueChange={(next) => { setEmail(next); setEmailError(""); }} error={emailError} />`,
      `  <Button level="primary" onClick={() => (email ? toast({ title: "Invites sent" }) : setEmailError("Enter an email"))}>Send invites</Button>`,
      `</Stack>`,
    ),
    builder: () => lines(
      `<Stack gap="md">`,
      `  <InputField label="Email" type="email" placeholder="name@company.com" value={vars.email} error={vars.emailError} />`,
      `  <Button level="primary" onClick={proto.if(vars.email === "", proto.set("emailError", "Enter an email"), proto.run(proto.set("emailError", ""), proto.toast({ title: "Invites sent" })))}>Send invites</Button>`,
      `</Stack>`,
    ),
  },
  {
    id: "property-field", label: "Property field", group: "Inputs", caption: "Edited in place", root: "PropertyField", components: ["PropertyField", "PropertyStatus"], interactive: true, input: true,
    build: () => lines(
      `<PropertyField label="Status" icon="icon-loading-02-line">`,
      `  <PropertyStatus defaultValue="to-do" />`,
      `</PropertyField>`,
    ),
  },
  {
    // The Assignee picker shows each person's photo (popover/people-have-avatars): platformMedia on an example page, the
    // library key on a builder page.
    id: "task-properties", label: "Task properties", group: "Inputs", caption: "Status, dates, people", root: "Stack", components: ["Stack", "PropertyField", "PropertyStatus", "PropertySelect", "PropertyDate", "PropertyPeople", "PropertyTags"], requires: MEDIA, interactive: true, input: true,
    build: () => taskProperties((id) => `platformMedia.avatars.${id}.src`),
    builder: () => taskProperties((id) => `"zen-media:avatar-${id}"`),
  },
  {
    id: "textarea-field", label: "Text area", group: "Inputs", root: "TextAreaField", components: ["TextAreaField"], interactive: true, input: true,
    build: () => `<TextAreaField label="Notes" />`,
  },
  {
    id: "select-field", label: "Select", group: "Inputs", root: "SelectField", components: ["SelectField"], interactive: true, input: true,
    build: () => lines(
      `<SelectField label="Owner" placeholder="Choose a person" options={[`,
      `  { label: "Bao Nguyen", value: "bao" },`,
      `  { label: "Trang Le", value: "trang" },`,
      `]} />`,
    ),
  },
  {
    id: "checkbox", label: "Checkbox", group: "Inputs", root: "Checkbox", components: ["Checkbox"], interactive: true, input: true,
    build: () => `<Checkbox label="Email me a copy" />`,
  },
  {
    id: "toggle", label: "Toggle", group: "Inputs", caption: "Applies at once", root: "Toggle", components: ["Toggle"], interactive: true, input: true,
    build: (ctx) => (ctx.mobile ? `<Toggle size="lg" label="Email notifications" />` : `<Toggle label="Email notifications" />`),
  },
  {
    id: "radio-group", label: "Radio group", group: "Inputs", root: "FormFieldset", components: ["FormFieldset", "RadioButton"], interactive: true, input: true,
    build: (ctx) => lines(
      `<FormFieldset legend="Billing cycle" kind="radio">`,
      `  <RadioButton name="billing-cycle-${uidOf(ctx)}" value="monthly" label="Monthly" defaultChecked />`,
      `  <RadioButton name="billing-cycle-${uidOf(ctx)}" value="yearly" label="Yearly" />`,
      `</FormFieldset>`,
    ),
  },
  {
    id: "search", label: "Search", group: "Inputs", root: "Search", components: ["Search"], interactive: true, input: true,
    build: () => `<Search aria-label="Search projects" placeholder="Search projects" />`,
  },
  {
    // One choice is a ChipGroup (radio group, its own state); a row of Normal chips is for several picks at once.
    id: "chip-group", label: "Chip group", group: "Inputs", caption: "Single choice", root: "ChipGroup", components: ["ChipGroup"], interactive: true, input: true,
    build: () => `<ChipGroup aria-label="Project status" defaultValue="all" options={[{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "done", label: "Done" }]} />`,
  },
  {
    id: "chip-row", label: "Chip row", group: "Inputs", caption: "Several picks", root: "Stack", components: ["Stack", "Chip"], state: [state("tags", '["design"]', "string[]")], interactive: true, input: true,
    build: () => lines(
      `<Stack direction="row" gap="xs" wrap role="group" aria-label="Project tags">`,
      `  <Chip variant="normal" level="primary" selected={tags.includes("design")} onClick={() => setTags(tags.includes("design") ? tags.filter((tag) => tag !== "design") : [...tags, "design"])}>Design</Chip>`,
      `  <Chip variant="normal" level="primary" selected={tags.includes("research")} onClick={() => setTags(tags.includes("research") ? tags.filter((tag) => tag !== "research") : [...tags, "research"])}>Research</Chip>`,
      `</Stack>`,
    ),
  },
  {
    id: "date-field", label: "Date field", group: "Inputs", root: "DateField", components: ["DateField"], interactive: true, input: true,
    build: () => `<DateField label="Due date" />`,
  },
  {
    id: "date-picker", label: "Calendar", group: "Inputs", caption: "Inline date picker", root: "DatePicker", components: ["DatePicker"], interactive: true, input: true,
    build: () => `<DatePicker aria-label="Due date" today={new Date(2026, 8, 30)} defaultValue={new Date(2026, 9, 14)} />`,
    // No Date code on a page you make: the calendar opens on this month.
    builder: () => `<DatePicker aria-label="Due date" />`,
  },
  // ❖ Calendar (16121:3): event views on fixed demo dates (Wed 30 Sep 2026), so the Today date and the now line show. Dates are ISO strings: a page holds only literals.
  {
    id: "calendar-month", label: "Month calendar", group: "Data display", caption: "Events by day", root: "CalendarMonth", components: ["CalendarMonth"], interactive: true, input: false,
    build: () => `<CalendarMonth month="2026-09-01" today="2026-09-30" events={${CALENDAR_EVENTS}} />`,
  },
  {
    id: "calendar-time-grid", label: "Week calendar", group: "Data display", caption: "Hours of a week or day", root: "CalendarTimeGrid", components: ["CalendarTimeGrid"], interactive: true, input: false,
    build: () => `<CalendarTimeGrid date="2026-09-30" now="2026-09-30T13:15" events={${CALENDAR_EVENTS}} />`,
  },
  {
    id: "calendar-agenda", label: "Agenda", group: "Data display", caption: "Events day by day", root: "CalendarAgenda", components: ["CalendarAgenda"], interactive: false, input: false,
    build: () => `<CalendarAgenda from="2026-09-30" days={3} today="2026-09-30" events={${CALENDAR_EVENTS}} />`,
  },
  {
    // Today, the arrows and the view switch all work (calendar/toolbar-navigation): the month view steps by month (to its
    // 1st), the others by their span, as shiftPeriod does (a slot cannot import it).
    id: "calendar-toolbar", label: "Calendar toolbar", group: "Navigation", caption: "Period and view", root: "CalendarToolbar", components: ["CalendarToolbar"],
    state: [state("calDate", "new Date(2026, 8, 30)", "Date"), state("calView", '"month"', '"month" | "week" | "day" | "3-day" | "agenda"')], interactive: true, input: false,
    build: () => {
      const step = (sign: "-" | "+") => `setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() ${sign} (calView === "month" ? 1 : 0), calView === "month" ? 1 : calDate.getDate() ${sign} (calView === "day" ? 1 : calView === "3-day" ? 3 : 7)))`;
      return lines(
        `<CalendarToolbar date={calDate} today="2026-09-30" view={calView} onViewChange={setCalView}`,
        `  onToday={() => setCalDate(new Date(2026, 8, 30))}`,
        `  onPrevious={() => ${step("-")}}`,
        `  onNext={() => ${step("+")}} />`,
      );
    },
    // A builder page keeps no state: the period shown is fixed; its Prototype tab adds the actions.
    builder: () => `<CalendarToolbar date="2026-09-30" today="2026-09-30" view="month" />`,
  },
  // ❖ Timeline (16121:9): the same demo day, ISO dates.
  {
    id: "timeline-activity", label: "Activity feed", group: "Data display", caption: "Who did what, by day", root: "TimelineActivity", components: ["TimelineActivity"], interactive: false, input: false,
    build: () => `<TimelineActivity today="2026-09-30" entries={[{ id: "approve", at: "2026-09-30T10:42", actor: "Maya Chen", title: "approved your leave request", description: "Annual leave · Oct 12 – Oct 16", marker: { kind: "avatar", avatarName: "Maya Chen", tone: "positive" } }, { id: "comment", at: "2026-09-30T09:15", actor: "Linh Tran", title: "commented on Q4 roadmap", attachment: "Can we move the review to Thursday?", marker: { kind: "icon", tone: "accent" } }, { id: "shared", at: "2026-09-29T17:30", actor: "Zen Studio", title: "shared the design file", marker: { kind: "icon", tone: "neutral" } }]} />`,
  },
  {
    id: "timeline-milestones", label: "Milestones", group: "Data display", caption: "Project phases", root: "TimelineMilestones", components: ["TimelineMilestones"], interactive: false, input: false,
    build: () => `<TimelineMilestones today="2026-09-30" milestones={[{ id: "kickoff", date: "2026-08-03", title: "Kickoff" }, { id: "signoff", date: "2026-09-25", title: "Design sign-off" }, { id: "beta", date: "2026-10-23", title: "Beta launch", description: "Invite 40 studio clients" }, { id: "launch", date: "2026-11-16", title: "Public launch" }]} />`,
  },
  {
    id: "timeline-gantt", label: "Gantt roadmap", group: "Data display", caption: "Tasks across weeks", root: "TimelineGantt", components: ["TimelineGantt"], interactive: true, input: false,
    build: () => `<TimelineGantt aria-label="Lotus banking redesign" start="2026-08-31" today="2026-09-30" groups={[{ id: "design", name: "Design", tasks: [{ id: "wire", name: "Wireframes", start: "2026-09-14", end: "2026-09-26" }, { id: "ui", name: "UI design", start: "2026-09-21", end: "2026-10-10" }, { id: "signoff", name: "Design sign-off", start: "2026-10-09", kind: "milestone" }] }, { id: "build", name: "Build", tasks: [{ id: "fe", name: "Frontend", start: "2026-09-28", end: "2026-10-17", color: "teal" }] }]} />`,
  },
  // ❖ Schedule (16121:6): the same demo day, ISO dates.
  {
    id: "schedule-resource-grid", label: "Resource schedule", group: "Data display", caption: "People and rooms by hour", root: "ScheduleResourceGrid", components: ["ScheduleResourceGrid"], interactive: false, input: false,
    build: () => `<ScheduleResourceGrid date="2026-09-30" now="2026-09-30T13:15" resources={[{ id: "alex", name: "Alex Duong", meta: "Designer" }, { id: "maya", name: "Maya Chen", meta: "Product lead" }, { id: "lotus", name: "Room 2 · Lotus", meta: "8 seats", kind: "room" }]} bookings={[{ id: "q4", resourceId: "alex", title: "Q4 planning", start: "2026-09-30T10:30", end: "2026-09-30T12:00", color: "blue" }, { id: "hiring", resourceId: "maya", title: "Hiring panel", start: "2026-09-30T15:00", end: "2026-09-30T17:00", color: "pink" }, { id: "room", resourceId: "lotus", title: "Design critique", start: "2026-09-30T16:00", end: "2026-09-30T17:00", color: "violet" }]} />`,
  },
  {
    id: "schedule-itinerary", label: "Itinerary", group: "Data display", caption: "A day's timed stops", root: "ScheduleItinerary", components: ["ScheduleItinerary"], interactive: false, input: false,
    build: () => `<ScheduleItinerary title="Wed, Sep 30 · Design Day" now="2026-09-30T13:15" stops={[{ id: "keynote", title: "Opening keynote", start: "2026-09-30T09:00", end: "2026-09-30T09:45", meta: "Hall A" }, { id: "workshop", title: "Workshop: prototyping", start: "2026-09-30T13:00", end: "2026-09-30T14:30", meta: "Room 2" }, { id: "closing", title: "Closing talk", start: "2026-09-30T15:00", end: "2026-09-30T15:45", meta: "Hall A" }]} />`,
  },
  {
    // The page keeps the chosen slot, for the Book action beside it to confirm (schedule/slot-picker-confirm).
    id: "schedule-slot-picker", label: "Time slots", group: "Inputs", caption: "Book a time", root: "ScheduleSlotPicker", components: ["ScheduleSlotPicker"],
    state: [state("slot", "null", "string | null")], interactive: true, input: true,
    build: () => `<ScheduleSlotPicker aria-label="Review times" today="2026-09-30" value={slot} onValueChange={setSlot} slots={${SLOTS}} />`,
    // A builder page keeps no state: the picker keeps the pick itself.
    builder: () => `<ScheduleSlotPicker aria-label="Review times" today="2026-09-30" slots={${SLOTS}} />`,
  },
  {
    id: "schedule-day-planner", label: "Day planner", group: "Data display", caption: "A person's day as cards", root: "ScheduleDayPlanner", components: ["ScheduleDayPlanner"], interactive: true, input: false,
    build: () => `<ScheduleDayPlanner defaultValue="2026-09-30" now="2026-09-30T13:15" events={[{ id: "a", title: "Wireframing and brainstorming", start: "2026-09-30T09:00", end: "2026-09-30T10:00", color: "violet", status: "Done" }, { id: "b", title: "Exploration phase", start: "2026-09-30T13:00", end: "2026-09-30T16:00", status: "In progress" }]} />`,
  },
  {
    id: "calendar-week-strip", label: "Week strip", group: "Navigation", caption: "Pick a day of the week", root: "CalendarWeekStrip", components: ["CalendarWeekStrip"], interactive: true, input: false,
    build: () => `<CalendarWeekStrip aria-label="Pick a day" today="2026-09-30" defaultValue="2026-09-30" events={${CALENDAR_EVENTS}} />`,
  },
  {
    id: "number-field", label: "Number field", group: "Inputs", root: "NumberField", components: ["NumberField"], interactive: true, input: true,
    build: () => `<NumberField label="Team size" defaultValue={4} min={1} max={20} />`,
  },
  {
    // People pickers show each person's photo (popover/people-have-avatars).
    id: "autocomplete-field", label: "Autocomplete", group: "Inputs", caption: "Several values", root: "AutocompleteField", components: ["AutocompleteField"], requires: MEDIA, interactive: true, input: true,
    build: () => lines(
      `<AutocompleteField label="Team" addLabel="Add member" popoverLabel="Studio members" searchPlaceholder="Search people" options={[`,
      ...PEOPLE.map(({ id, name }) => `  { id: "${id}", label: "${name}", photoSrc: platformMedia.avatars.${id}.src },`),
      `]} />`,
    ),
    builder: () => lines(
      `<AutocompleteField label="Team" addLabel="Add member" popoverLabel="Studio members" searchPlaceholder="Search people" options={[`,
      ...PEOPLE.map(({ id, name }) => `  { id: "${id}", label: "${name}", photoSrc: "zen-media:avatar-${id}" },`),
      `]} />`,
    ),
  },
  {
    id: "rich-text-field", label: "Rich text", group: "Inputs", caption: "With editor bar", root: "RichTextField", components: ["RichTextField"], interactive: true, input: true,
    build: () => `<RichTextField aria-label="Project brief" placeholder="What the client needs and by when" />`,
  },
  {
    id: "slider", label: "Slider", group: "Inputs", root: "Slider", components: ["Slider"], interactive: true, input: true,
    build: () => `<Slider aria-label="Budget alert at" defaultValue={80} showLimits />`,
  },
  {
    id: "rating", label: "Rating input", group: "Inputs", caption: "Stars", root: "Rating", components: ["Rating"], interactive: true, input: true,
    build: () => `<Rating aria-label="Rate the kickoff" defaultValue={4} />`,
  },
  {
    id: "nps-scale", label: "NPS scale", group: "Inputs", caption: "0 to 10", root: "NpsScale", components: ["NpsScale"], state: [state("score", "null", "number | null")], interactive: true, input: true,
    build: () => `<NpsScale aria-label="How likely are you to recommend Zen to a friend?" value={score} onValueChange={setScore} />`,
    builder: () => `<NpsScale aria-label="How likely are you to recommend Zen to a friend?" />`,
  },
  {
    id: "slider-field", label: "Slider field", group: "Inputs", caption: "A number to scrub or type", root: "SliderField", components: ["SliderField"], interactive: true, input: true,
    build: () => `<SliderField label="Opacity" defaultValue={0.6} min={0} max={1} step={0.01} />`,
  },
  {
    id: "color-field", label: "Color field", group: "Inputs", caption: "Hex with a swatch, opens the picker", root: "ColorField", components: ["ColorField"], interactive: true, input: true,
    build: () => `<ColorField label="Brand color" defaultValue="#1F6FEB" savedColors={["#1F6FEB", "#0E9F8E", "#E07B12", "#E5533D"]} />`,
  },
  {
    id: "color-picker", label: "Color picker", group: "Inputs", caption: "Inline picker", root: "ColorPicker", components: ["ColorPicker"], interactive: true, input: true,
    build: () => `<ColorPicker aria-label="Highlight color" defaultValue="#E07B12" />`,
  },
  {
    id: "color-swatch", label: "Color swatch", group: "Data display", caption: "Shows a color value", root: "ColorSwatch", components: ["ColorSwatch"], interactive: false, input: false,
    build: () => `<ColorSwatch color="#1F6FEB" aria-label="Brand color, #1F6FEB" />`,
  },
  {
    id: "curve-preview", label: "Curve preview", group: "Charts", caption: "A motion curve, above its settings", root: "CurvePreview", components: ["CurvePreview"], interactive: false, input: false,
    build: () => `<CurvePreview type="spring" bounce={0.3} />`,
  },
  {
    id: "inline-field", label: "Inline field", group: "Inputs", caption: "Label inside, for property panels", root: "InputField", components: ["InputField"], interactive: true, input: true,
    build: () => `<InputField layout="inline" label="Title" defaultValue="Japan" />`,
  },
  {
    id: "color-selector", label: "Color selector", group: "Inputs", root: "ColorSelector", components: ["ColorSelector"], state: [state("color", '"var(--zen-color-background-support-blue-solid)"')], interactive: true, input: true,
    build: () => lines(
      `<ColorSelector aria-label="Project color" value={color} onValueChange={setColor} colors={[`,
      `  { value: "var(--zen-color-background-support-blue-solid)", label: "Blue" },`,
      `  { value: "var(--zen-color-background-support-green-solid)", label: "Green" },`,
      `  { value: "var(--zen-color-background-support-orange-solid)", label: "Orange" },`,
      `]} />`,
    ),
    builder: () => lines(
      `<ColorSelector aria-label="Project color" value="var(--zen-color-background-support-blue-solid)" colors={[`,
      `  { value: "var(--zen-color-background-support-blue-solid)", label: "Blue" },`,
      `  { value: "var(--zen-color-background-support-green-solid)", label: "Green" },`,
      `  { value: "var(--zen-color-background-support-orange-solid)", label: "Orange" },`,
      `]} />`,
    ),
  },
  {
    id: "file-upload", label: "File upload", group: "Inputs", caption: "Dropzone", root: "FileUpload", components: ["FileUpload"], requires: TOAST, interactive: true, input: true,
    build: () => lines(
      `<FileUpload label="Kickoff files" multiple accept=".pdf,.png,.jpg,.jpeg"`,
      `  text="Drop files here or choose them" caption="PDF or images. Max size of 100 MB"`,
      `  onFilesAdd={(added) => toast({ title: added.length === 1 ? "1 file added" : \`\${added.length} files added\` })} />`,
    ),
    builder: () => lines(
      `<FileUpload label="Kickoff files" multiple accept=".pdf,.png,.jpg,.jpeg"`,
      `  text="Drop files here or choose them" caption="PDF or images. Max size of 100 MB" />`,
    ),
  },
  /* Overlays: each comes with the Button that opens it. */
  {
    id: "dialog", label: "Dialog", group: "Overlays", caption: "With its button", root: "Stack", components: ["Stack", "Button", "Dialog"], requires: TOAST, state: [state("shareOpen", "false")], interactive: true, input: false,
    build: () => lines(
      `<Stack direction="row">`,
      `  <Button level="tertiary" onClick={() => setShareOpen(true)}>Share project</Button>`,
      `  <Dialog open={shareOpen} onOpenChange={setShareOpen} title="Share Loyalty app?" icon={false}`,
      `    description="Phin & Co gets a view-only link to the rewards flow."`,
      `    primaryAction={{ label: "Share", onClick: () => { setShareOpen(false); toast({ title: "Link sent to Phin & Co" }); } }}`,
      `    secondaryAction={{ label: "Cancel" }} />`,
      `</Stack>`,
    ),
  },
  {
    id: "modal-form", label: "Modal form", group: "Overlays", caption: "With its button", root: "Stack", components: ["Stack", "Button", "ModalForm", "InputField"], requires: TOAST, state: [state("formOpen", "false")], interactive: true, input: false,
    build: () => lines(
      `<Stack direction="row">`,
      `  <Button level="tertiary" onClick={() => setFormOpen(true)}>New project</Button>`,
      `  <ModalForm open={formOpen} onOpenChange={setFormOpen} title="New project"`,
      `    primaryAction={{ label: "Create project", onClick: () => { setFormOpen(false); toast({ title: "Project created" }); } }}`,
      `    secondaryAction={{ label: "Cancel" }}>`,
      `    <InputField label="Project name" placeholder="e.g. Loyalty app" />`,
      `  </ModalForm>`,
      `</Stack>`,
    ),
  },
  {
    id: "side-panel", label: "Side panel", group: "Overlays", caption: "With its button", root: "Stack", components: ["Stack", "Button", "SidePanel", "DescriptionList"], state: [state("detailsOpen", "false")], interactive: true, input: false,
    build: () => lines(
      `<Stack direction="row">`,
      `  <Button level="tertiary" onClick={() => setDetailsOpen(true)}>View details</Button>`,
      `  <SidePanel type="modal" size="small" open={detailsOpen} onOpenChange={setDetailsOpen} title="Loyalty app" description="Phin & Co">`,
      `    <DescriptionList items={[`,
      `      { term: "Status", description: "Active" },`,
      `      { term: "Due", description: "Oct 14, 2026" },`,
      `    ]} />`,
      `  </SidePanel>`,
      `</Stack>`,
    ),
  },
  {
    id: "bottom-sheet", label: "Bottom sheet", group: "Overlays", caption: "Actions, with its button", root: "Stack", components: ["Stack", "Button", "BottomSheet"], requires: TOAST, state: [state("sheetOpen", "false")], interactive: true, input: false,
    build: () => lines(
      `<Stack direction="row">`,
      `  <Button level="tertiary" onClick={() => setSheetOpen(true)}>Change photo</Button>`,
      `  <BottomSheet type="action" open={sheetOpen} onOpenChange={setSheetOpen} title="Profile photo"`,
      `    items={[{ id: "library", label: "Choose from library", icon: "icon-image-line" }, { id: "camera", label: "Take photo", icon: "icon-camera-line" }]}`,
      `    onSelect={(item) => toast({ title: item.id === "camera" ? "Camera opened" : "Library opened" })} />`,
      `</Stack>`,
    ),
  },
  {
    // A choice list under a button is a Chip (button/filter-is-chip): the Popover anchors to a search field instead.
    id: "popover", label: "Popover", group: "Overlays", caption: "Results under a search field", root: "Stack", components: ["Stack", "Box", "Search", "Popover"], requires: TOAST, state: [state("findOpen", "false"), ref("findAnchor", "HTMLDivElement")], interactive: true, input: false,
    build: () => lines(
      `<Stack gap="xs">`,
      `  <Box ref={findAnchor}>`,
      `    <Search placeholder="Search projects" aria-label="Search projects" aria-expanded={findOpen} onClick={() => setFindOpen(true)} />`,
      `  </Box>`,
      `  <Popover open={findOpen} onOpenChange={setFindOpen} anchorRef={findAnchor} aria-label="Projects"`,
      `    items={[{ id: "loyalty", label: "Loyalty app" }, { id: "site", label: "Phin & Co website" }]}`,
      `    onSelect={(item) => { setFindOpen(false); toast({ title: item.id === "site" ? "Opened Phin & Co website" : "Opened Loyalty app" }); }} />`,
      `</Stack>`,
    ),
  },
  {
    id: "tooltip", label: "Tooltip", group: "Overlays", caption: "On an icon button", root: "Tooltip", components: ["Tooltip", "IconButton"], requires: TOAST, interactive: true, input: false,
    build: () => lines(
      `<Tooltip content="Export report · ⌘E" placement="bottom">`,
      `  <IconButton appearance="flat" size="sm" icon="icon-download-01-line" aria-label="Export report" onClick={() => toast({ title: "Report exported" })} />`,
      `</Tooltip>`,
    ),
  },
  /* Layout: a new frame comes with content (an empty Stack is invisible and examples have no placeholder chrome). */
  {
    id: "stack", label: "Stack", group: "Layout", caption: "Column, gap Medium", root: "Stack", components: ["Stack", "Text"], interactive: false, input: false,
    build: () => lines(
      `<Stack gap="md">`,
      `  <Text tone="base">Milestone 2 covers the rewards screens and the points ledger.</Text>`,
      `  <Text textStyle="Body/Small/Regular" tone="base">Updated Sep 30, 2026</Text>`,
      `</Stack>`,
    ),
  },
  {
    id: "grid", label: "Grid", group: "Layout", caption: "2 columns", root: "Grid", components: ["Grid", "Text"], interactive: false, input: false,
    build: () => lines(
      `<Grid columns={{ mobile: 1, desktop: 2 }} gap="md">`,
      `  <Text tone="base">Milestone 1 covers onboarding and sign-in.</Text>`,
      `  <Text tone="base">Milestone 2 covers the rewards screens and the points ledger.</Text>`,
      `</Grid>`,
    ),
  },
  {
    id: "divider", label: "Divider", group: "Layout", root: "Divider", components: ["Divider"], interactive: false, input: false,
    build: () => `<Divider />`,
  },
  {
    id: "accordion", label: "Accordion", group: "Layout", caption: "Collapsible section", root: "Accordion", components: ["Accordion"], interactive: true, input: false,
    // headingLevel defaults to 3: written only when the host outline needs another level.
    build: (ctx) => `<Accordion title="Payment terms"${level(ctx) === 3 ? "" : ` headingLevel={${level(ctx)}}`}>Invoices are due 30 days after they are sent.</Accordion>`,
  },
  /* Page: app chrome, for page and screen examples. */
  {
    id: "page-header", label: "Page header", group: "Page", caption: "Title and action", root: "PageHeader", components: ["PageHeader", "Button"], requires: TOAST, interactive: true, input: false,
    // An example page keeps its one h1: the inserted header is an h2 (PageHeader takes 1 or 2).
    build: () => lines(
      `<PageHeader title="Projects" headingLevel={2} description="12 active · 3 due this week"`,
      `  actions={<Button level="primary" onClick={() => toast({ title: "Project created" })}>New project</Button>} />`,
    ),
  },
  {
    id: "dashboard-header", label: "Dashboard header", group: "Page", caption: "Search, filters and actions", root: "DashboardHeader", components: ["DashboardHeader", "Search", "Chip", "Button"], requires: TOAST, interactive: true, input: false,
    // Figma Primitives/Dashboard/Header Type=Control-Bar (its default): Search, a filter Chip, the page's action.
    build: () => lines(
      `<DashboardHeader search={<Search size="md" placeholder="Search projects" />}`,
      `  controls={<Chip variant="advanced" dropdown popoverItems={[{ id: "active", label: "Active" }, { id: "archived", label: "Archived" }]}>Status</Chip>}`,
      `  actions={<Button level="primary" onClick={() => toast({ title: "Project created" })}>New project</Button>} />`,
    ),
  },
  {
    id: "top-navigation", label: "Top navigation", group: "Page", caption: "Phone bar with Back", root: "TopNavigation", components: ["TopNavigation"], requires: TOAST, interactive: true, input: false,
    build: (ctx) => lines(
      `<TopNavigation title="Loyalty app" headingLevel="h${Math.min(3, level(ctx))}"`,
      `  leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Projects" }) }}`,
      `  trailing={[{ icon: "icon-plus-line", label: "New task", onClick: () => toast({ title: "Task added" }) }]} />`,
    ),
  },
  {
    id: "bottom-navigation", label: "Bottom navigation", group: "Page", caption: "Phone tabs", root: "BottomNavigation", components: ["BottomNavigation"], state: [state("destination", '"home"')], interactive: true, input: false,
    build: () => lines(
      `<BottomNavigation aria-label="Main" value={destination} onValueChange={setDestination} items={[`,
      `  { id: "home", label: "Home", icon: "icon-home-03-line" },`,
      `  { id: "projects", label: "Projects", icon: "icon-folder-line" },`,
      `  { id: "inbox", label: "Inbox", icon: "icon-bell-01-line" },`,
      `]} />`,
    ),
    builder: () => lines(
      `<BottomNavigation aria-label="Main" value="home" items={[`,
      `  { id: "home", label: "Home", icon: "icon-home-03-line" },`,
      `  { id: "projects", label: "Projects", icon: "icon-folder-line" },`,
      `  { id: "inbox", label: "Inbox", icon: "icon-bell-01-line" },`,
      `]} />`,
    ),
  },
  {
    // Its rows are Body-Content children (Figma Menu-Item instances), so each is a layer of the slot.
    id: "sidebar", label: "Sidebar", group: "Page", caption: "Navigation", root: "Sidebar", components: ["Sidebar", "SidebarMenuItem"], state: [state("section", '"projects"')], interactive: true, input: false,
    build: () => lines(
      `<Sidebar aria-label="Workspace" selectedId={section} onItemClick={(item) => setSection(item.id)}>`,
      `  <SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" />`,
      `  <SidebarMenuItem id="projects" label="Projects" icon="icon-folder-line" />`,
      `  <SidebarMenuItem id="people" label="People" icon="icon-users-line" />`,
      `</Sidebar>`,
    ),
    builder: () => lines(
      `<Sidebar aria-label="Workspace" selectedId="projects">`,
      `  <SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" />`,
      `  <SidebarMenuItem id="projects" label="Projects" icon="icon-folder-line" />`,
      `  <SidebarMenuItem id="people" label="People" icon="icon-users-line" />`,
      `</Sidebar>`,
    ),
  },
  // Figma Pattern/AppShell/Desktop Layout=Sidebar, Collapse=Header with its placeholders (appshell-placeholder.mjs; user
  // 2026-10-26: an AppShell is a placeholder frame, the Layout examples hold real apps): the exception to real copy.
  {
    id: "app-shell", label: "App shell", group: "Page", caption: "Placeholder frame", root: "AppShell", components: componentsOf(appShellPlaceholderCode({ brand: false, root: true })), requires: TOAST, interactive: true, input: false,
    build: () => appShellPlaceholderCode({ brand: false, root: true, act: (label) => `toast({ title: ${label} })` }),
    builder: () => appShellPlaceholderCode({ brand: false, root: true }),
  },
  {
    id: "action-bar", label: "Action bar", group: "Page", caption: "Summary and actions", root: "ActionBar", components: ["ActionBar", "Text"], requires: TOAST, interactive: true, input: false,
    build: () => lines(
      `<ActionBar position="static"`,
      `  summary={<Text as="span" textStyle="Body/Base/Medium">2 invoices selected</Text>}`,
      `  primaryAction={{ label: "Send invoices", onClick: () => toast({ title: "Invoices sent" }) }}`,
      `  secondaryAction={{ label: "Download PDF", onClick: () => toast({ title: "Download started" }) }} />`,
    ),
  },
  /* Chat */
  {
    id: "chat-thread", label: "Chat thread", group: "Chat", caption: "Two messages", root: "ChatThread", components: ["ChatThread", "ChatMessage"], requires: TOAST, interactive: true, input: false,
    // Every message takes a reaction (chat/no-locked-interaction).
    build: () => lines(
      `<ChatThread aria-label="Chat with Bao Nguyen">`,
      `  <ChatMessage side="others" author={{ name: "Bao Nguyen", theme: "indigo" }} time="9:41 AM" onReact={(kind) => toast({ title: kind ? "Reaction sent" : "Reaction removed" })}>`,
      `    Can you send the rewards flow before Friday?`,
      `  </ChatMessage>`,
      `  <ChatMessage side="you" time="9:43 AM" onReact={(kind) => toast({ title: kind ? "Reaction sent" : "Reaction removed" })}>`,
      `    Sure, it goes out Thursday morning.`,
      `  </ChatMessage>`,
      `</ChatThread>`,
    ),
    builder: () => lines(
      `<ChatThread aria-label="Chat with Bao Nguyen">`,
      `  <ChatMessage side="others" author={{ name: "Bao Nguyen", theme: "indigo" }} time="9:41 AM">`,
      `    Can you send the rewards flow before Friday?`,
      `  </ChatMessage>`,
      `  <ChatMessage side="you" time="9:43 AM">`,
      `    Sure, it goes out Thursday morning.`,
      `  </ChatMessage>`,
      `</ChatThread>`,
    ),
  },
  {
    id: "chat-composer", label: "Chat composer", group: "Chat", root: "ChatComposer", components: ["ChatComposer"], requires: TOAST, interactive: true, input: false,
    build: () => `<ChatComposer label="Message Bao Nguyen" placeholder="Message" onSend={(text) => toast({ title: "Message sent", children: text })} />`,
    builder: () => `<ChatComposer label="Message Bao Nguyen" placeholder="Message" />`,
  },
  {
    id: "ai-chat", label: "AI chat", group: "Chat", caption: "Thread and field", root: "Stack", components: ["Stack", "AiChatThread", "AiChatBubble", "AiChatField"], requires: TOAST, interactive: true, input: false,
    build: () => lines(
      `<Stack gap="md">`,
      `  <AiChatThread aria-label="Ask Zen">`,
      `    <AiChatBubble side="you">Which invoices are overdue?</AiChatBubble>`,
      `    <AiChatBubble side="ai">INV-0042 for Phin & Co is 6 days overdue.</AiChatBubble>`,
      `  </AiChatThread>`,
      `  <AiChatField placeholder="Ask about your projects" onSubmit={(text) => toast({ title: "Question sent", children: text })} />`,
      `</Stack>`,
    ),
  },
  {
    // Figma ❖ Voice (15081:1294): every action wired (harness voice/actions-wired); a builder page drops the toasts (builderCode).
    id: "voice-recorder", label: "Voice recorder", group: "Chat", caption: "Record a voice note", root: "VoiceRecorder", components: ["VoiceRecorder"], requires: TOAST, interactive: true, input: false,
    build: () => lines(
      `<VoiceRecorder title="Voice note" input="Built-in microphone" format="48 kHz · Mono"`,
      `  onRecord={() => toast({ title: "Recording started" })}`,
      `  onPause={() => toast({ title: "Recording paused" })}`,
      `  onResume={() => toast({ title: "Recording resumed" })}`,
      `  onFinish={() => toast({ title: "Voice note saved" })}`,
      `  onDiscard={() => toast({ title: "Take discarded" })} />`,
    ),
  },
];

const byId = new Map(PALETTE.map((item) => [item.id, item]));

/** One palette item by id. */
export const paletteItem = (id: string) => byId.get(id) ?? null;

/** Where the platform's Widgets page writes a widget: on an example stage, under the card's h3 (ChartCard's default). */
export const WIDGET_PAGE_CONTEXT: PaletteContext = {
  host: "Stack", headingLevel: 3, mobile: false, uid: "widgets",
  slot: { component: "Stack", prop: "children", name: "Layers", kind: "layout", container: null, mountsWhenEmpty: true, flow: "column", gap: "own" },
};

/** A Widgets entry's code as the platform's Widgets page shows it: its import line, then the JSX the Studio inserts. */
export function widgetCode(id: string): string {
  const item = paletteItem(id);
  if (!item || item.group !== "Widgets") return "";
  const names = [...new Set(item.components)].sort((a, b) => a.localeCompare(b));
  return `import { ${names.join(", ")} } from "@zen-ds/react";\n\n${item.build(WIDGET_PAGE_CONTEXT)}`;
}

/** Figma "preferred instances" per slot (item ids, in order): shown first in the picker. */
const PREFERRED: Readonly<Record<string, readonly string[]>> = {
  "Card.children": ["heading", "paragraph", "list", "metric", "stack"],
  "Dialog.children": ["paragraph", "input-field", "checkbox"],
  "ModalForm.children": ["input-field", "select-field", "paragraph", "list"],
  "ModalForm.side": ["input-field", "select-field", "paragraph", "list"],
  "ModalForm.top": ["input-field", "select-field", "paragraph", "list"],
  "SidePanel.children": ["input-field", "select-field", "paragraph", "list"],
  "BottomSheet.children": ["input-field", "select-field", "paragraph", "list"],
  "Accordion.children": ["paragraph", "list"],
  "TabPanel.children": ["paragraph", "list", "card", "stack"],
  "ChartCard.children": ["line-chart", "column-chart", "donut-chart", "empty-state", "metric"],
  "ListItem.leading": ["avatar", "dock-icon"],
  "ListItem.trailing": ["badge", "icon-button", "button"],
  "ListItem.children": ["paragraph"],
  "ListBox.header": ["heading", "paragraph"],
  "ListBox.children": ["list"],
  "ListBox.footer": ["button"],
  "Sidebar.brand": ["avatar", "dock-icon"],
  "Sidebar.children": ["menu-item", "menu-section"],
  "Sidebar.footer": ["menu-item"],
  "PageHeader.actions": ["button", "button-primary", "menu"],
  "PageHeader.trailing": ["icon-button", "menu", "avatar"],
};

/** The slot's preferred item ids ("metric" stands for Metric or MetricCard, whichever the host offers). */
export const preferredFor = (slot: ContentSlot): readonly string[] => PREFERRED[`${slot.component}.${slot.prop}`] ?? [];

const OVERLAY_HOSTS = new Set(["Dialog", "ModalForm", "SidePanel", "BottomSheet"]);
const CARD_SURFACES = new Set(["Card", "ChartCard", "MetricCard"]);
/** The surfaces the usage harness looks through for an overlay (check-usage.mjs BOX_TAGS). */
const SURFACE_TAGS = new Set(["Card", "ListBox", "MetricCard", "ChartCard", "Dialog", "ModalForm", "SidePanel", "BottomSheet"]);
/** The boxes that name a Table inside them (usage-guard table/titled-box). */
const TITLED_BOXES = new Set(["Card", "ListBox"]);
const FORM_HOSTS = new Set(["ModalForm", "Form"]);
const MOBILE_HOSTS = new Set(["BottomSheet", "PlatformPhone"]);
const CHOICE_CONTROLS = new Set(["checkbox", "toggle", "radio-group"]);
/** Sidebar rows go in a Sidebar (Body-Content, Footer-Content) or its flyout, and nowhere else. */
const SIDEBAR_ROWS = new Set(["SidebarMenuItem", "SidebarMenuSection"]);
const SIDEBAR_HOSTS = new Set(["Sidebar", "SidebarSubMenu"]);

/** Set to something other than false / null / undefined (a bound handler counts). */
const isSet = (value: HostProps[string]) => value !== undefined && value !== false && !(typeof value === "object" && /^(null|undefined|false)$/.test(value.bound));
const sentence = (names: readonly string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`);

/**
 * What the slot offers: every item, in group order. Editing is free (user, 2026-10-04): a host rule never hides an item,
 * it gives the item a warning (`warnings[id]`), and the usage harness reports it at Save. Host rules (spec "Host rules"):
 * - a clickable Card / ListItem content takes no control or field (card/clickable-no-nested-controls);
 * - inside Dialog, ModalForm, SidePanel or BottomSheet the actions are props: no Primary button, no Button row;
 * - a Card in a Card (Metric replaces MetricCard there, quietly); Accordion in an Accordion;
 * - ModalForm and Form prefer Checkbox to Toggle; a clickable row's trailing takes no choice control;
 * - a Divider next to a Divider; a slot's `accepts.only` / `deny`.
 * Hidden only when the code cannot be written there: actions and stateful items need a component that can hold their
 * hooks, and Image needs platformMedia (example pages only).
 * Inside BottomSheet / PlatformPhone the Toggle is size lg (ctx.mobile is set from the chain as well).
 */
export function paletteFor(ctx: PaletteHostContext): PaletteResult {
  const { context, insideCard, warningFor } = hostRules(ctx);
  /** The code cannot be written here (the server would refuse it). */
  const blockFor = (item: PaletteItem): string | null => {
    if (ctx.builder && !item.builder && (item.state?.length || builderCode(item.build(context)) === null)) return "It needs interactions: add them in the Prototype tab";
    if (ctx.canUseToast === false && (item.requires?.includes("toast") || item.state?.length)) return "It runs an action, and this spot cannot run one";
    // A builder page takes its pictures by key (`zen-media:`, the item's builder code), not platformMedia.
    if (ctx.canUseMedia === false && item.requires?.includes("media") && !(ctx.builder && item.builder)) return "Library pictures work on example pages only";
    return null;
  };

  const items: PaletteItem[] = [];
  const warnings: Record<string, PaletteWarning> = {};
  const hidden: PaletteHidden[] = [];
  for (const item of PALETTE) {
    // Metric and MetricCard are one entry: the one that fits the surface.
    if (item.id === "metric" && !insideCard) continue;
    if (item.id === "metric-card" && insideCard) continue;
    const block = blockFor(item);
    if (block) {
      const entry = hidden.find((row) => row.group === item.group && row.reason === block);
      if (entry) entry.items.push(item.label);
      else hidden.push({ group: item.group, reason: block, items: [item.label] });
      continue;
    }
    // A builder page gets the item with proto handlers (and needs no toast hook); the prototype variables a template reads
    // go with it there only.
    items.push(ctx.builder ? {
      ...item,
      requires: item.requires?.filter((need) => need !== "toast" && !(need === "media" && item.builder)),
      // Its static version (no state), or its code with proto handlers.
      ...(item.builder ? { state: undefined, build: item.builder } : { build: (built: PaletteContext) => builderCode(item.build(built)) ?? item.build(built) }),
    } : item.vars ? { ...item, vars: undefined } : item);
    const warning = warningFor(item);
    if (warning) warnings[item.id] = warning;
  }
  return { items, warnings, hidden, context };
}

/** What the host rules read of an item: the palette's own items, or pasted code (warningForCode). */
type RuleItem = Pick<PaletteItem, "id" | "root" | "components" | "interactive" | "input">;

/** paletteFor's host rules for `ctx`: the build context and the warning an item gets there. */
function hostRules(ctx: PaletteHostContext) {
  const chain = [ctx.host, ...ctx.ancestors];
  const inChain = (names: Set<string>) => chain.find((name) => names.has(name));
  // The nearest surface around the slot (usage-guard BOX_TAGS): an overlay's Container fill takes on-container surfaces.
  const surface = inChain(SURFACE_TAGS);
  const context: PaletteContext = { host: ctx.host, slot: ctx.slot, headingLevel: ctx.headingLevel, mobile: ctx.mobile || Boolean(inChain(MOBILE_HOSTS)), uid: ctx.uid, ...(surface && OVERLAY_HOSTS.has(surface) ? { overlay: true } : {}), ...(inChain(TITLED_BOXES) ? { box: true } : {}) };
  const insideCard = Boolean(inChain(CARD_SURFACES));
  const overlayHost = inChain(OVERLAY_HOSTS);
  const formHost = inChain(FORM_HOSTS);
  const clickTarget = (ctx.slot.accepts?.noInteractiveWhen ?? []).some((prop) => isSet(ctx.hostProps[prop])) ? ctx.host : ctx.clickableAncestor;
  const only = ctx.slot.accepts?.only?.length ? ctx.slot.accepts.only : null;
  const deny = new Set(ctx.slot.accepts?.deny ?? []);
  const clickableRow = ctx.host === "ListItem" && (isSet(ctx.hostProps.onClick) || isSet(ctx.hostProps.href));

  const warningFor = (item: RuleItem): PaletteWarning | null => {
    if (only && !only.includes(item.root)) return { short: `${ctx.slot.name} prefers others`, reason: `${ctx.slot.name} takes ${sentence(only)}` };
    if (SIDEBAR_ROWS.has(item.root) && !inChain(SIDEBAR_HOSTS)) return { short: "Sidebar rows only", reason: "Menu items are rows of a Sidebar (Body-Content, Footer-Content) or its flyout" };
    if (item.components.includes("Accordion") && (deny.has("Accordion") || chain.includes("Accordion"))) return { short: "Accordion in an Accordion", reason: "Accordions are one level deep" };
    if (insideCard && item.components.some((name) => CARD_SURFACES.has(name))) return { short: "Card inside a card", reason: "A card never goes inside a card" };
    // The app-shell guideline: one AppShell at the root of each screen, never a second shell inside a pane or a card.
    if (item.root === "AppShell" && surface) return { short: "Screen root only", reason: `An AppShell frames a whole screen, never inside a ${surface}` };
    const denied = item.components.find((name) => deny.has(name));
    if (denied) return { short: `${ctx.slot.component} avoids ${denied}`, reason: `${ctx.slot.component} does not take ${denied}` };
    if (clickTarget && (item.interactive || item.input)) {
      const what = clickTarget === "ListItem" ? "row" : "card";
      return { short: `Inside a clickable ${what}`, reason: `The ${what} is one click target, so it holds no controls or fields` };
    }
    if (overlayHost && (item.id === "button-primary" || item.id === "button-row")) return { short: `${overlayHost} actions are props`, reason: `${overlayHost} actions are props (primaryAction, secondaryAction)` };
    if (formHost && item.id === "toggle") return { short: "A form takes a Checkbox", reason: "A form saves on submit: a Checkbox fits it" };
    if (clickableRow && ctx.slot.prop === "trailing" && CHOICE_CONTROLS.has(item.id)) return { short: "Inside a clickable row", reason: "A clickable row holds no switch or checkbox" };
    if (item.id === "divider" && (ctx.previousSibling === "Divider" || ctx.nextSibling === "Divider")) return { short: "Next to a Divider", reason: "A Divider is next to it already" };
    return null;
  };
  return { context, insideCard, warningFor };
}

/** Layouts: an item rooted in one is judged by what it holds (button-row: Buttons). */
const LAYOUT_ROOTS = new Set(["Stack", "Grid", "Box"]);
/** Components that are controls (a click target) or fields: the palette items' own roots, and the parts of its rows. */
const CONTROL_ROOTS = new Set([...PALETTE.filter((item) => (item.interactive || item.input) && !LAYOUT_ROOTS.has(item.root)).map((item) => item.root), "Chip", "RadioButton"]);
const FIELD_ROOTS = new Set([...PALETTE.filter((item) => item.input && !LAYOUT_ROOTS.has(item.root)).map((item) => item.root), "Chip", "RadioButton"]);

/**
 * Why pasted code goes against the host rules here (user, 2026-10-12: ⌘V warns as an insert does), or null. The code
 * is read as the palette item it matches: its components (the first one its root), controls and fields among them, and
 * the item id the rules name (a `level="primary"` Button is button-primary). It still pastes; the status says why.
 */
export function warningForCode(ctx: PaletteHostContext, code: string): PaletteWarning | null {
  const names = [...code.matchAll(/<([A-Z][\w$]*(?:\.[\w$]+)*)/g)].map((match) => match[1].slice(match[1].lastIndexOf(".") + 1));
  if (!names.length) return null;
  const root = names[0];
  const components = [...new Set(names)];
  const primary = root === "Button" && /^<Button\b[^>]*\blevel="primary"/.test(code.trimStart());
  const sameParts = (item: PaletteItem) => item.components.length === components.length && item.components.every((name) => components.includes(name));
  const fits = (item: PaletteItem) => item.root === root && (item.id === "button-primary" ? primary : item.id === "button" ? !primary : true);
  const match = PALETTE.find((item) => fits(item) && sameParts(item)) ?? PALETTE.find(fits);
  const item: RuleItem = {
    id: match?.id ?? `pasted:${root}`,
    root,
    components,
    interactive: components.some((name) => CONTROL_ROOTS.has(name)),
    input: components.some((name) => FIELD_ROOTS.has(name)),
  };
  return hostRules(ctx).warningFor(item);
}

/** The title of the picker's last section: the items that go against the host rules here (they still insert). */
export const NOT_RECOMMENDED = "Not recommended here";

/**
 * The picker's sections: "Preferred for {slot}" first, then each group, then "Not recommended here" (the items with a
 * warning, in palette order). No item is listed twice.
 */
export function paletteSections(result: PaletteResult, slot: ContentSlot): Array<{ title: string; items: PaletteItem[] }> {
  const fits = (item: PaletteItem) => !result.warnings[item.id];
  const ids = preferredFor(slot).flatMap((id) => (id === "metric" ? ["metric", "metric-card"] : [id]));
  const preferred = ids.map((id) => result.items.find((item) => item.id === id)).filter((item): item is PaletteItem => Boolean(item) && fits(item as PaletteItem));
  const rest = result.items.filter((item) => !preferred.includes(item) && fits(item));
  const sections = preferred.length ? [{ title: `Preferred for ${slot.name}`, items: preferred }] : [];
  for (const group of PALETTE_GROUPS) {
    const items = rest.filter((item) => item.group === group);
    if (items.length) sections.push({ title: group, items });
  }
  const warned = result.items.filter((item) => !fits(item));
  if (warned.length) sections.push({ title: NOT_RECOMMENDED, items: warned });
  return sections;
}

/** Search filter: label, group, caption and component names, case-insensitive; every word must match. */
export function searchPalette(items: readonly PaletteItem[], query: string): PaletteItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [...items];
  return items.filter((item) => {
    const text = [item.label, item.group, item.caption ?? "", ...item.components].join(" ").toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

/** Inside a BottomSheet or PlatformPhone (the host or an ancestor): PaletteContext.mobile. */
export const isMobileChain = (host: string, ancestors: readonly string[]) => [host, ...ancestors].some((name) => MOBILE_HOSTS.has(name));
