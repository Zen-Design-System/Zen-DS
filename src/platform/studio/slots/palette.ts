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
 * Pure: no DOM, no React, type-only imports and erasable TypeScript, so `node palette.selftest.mjs` imports it.
 */

export type PaletteGroup = "Text" | "Actions" | "Navigation" | "Data display" | "Charts" | "Feedback" | "Inputs" | "Overlays" | "Layout" | "Page" | "Chat";

/** The picker's group order (after "Preferred for {slot}"). */
export const PALETTE_GROUPS: readonly PaletteGroup[] = ["Text", "Actions", "Navigation", "Data display", "Charts", "Feedback", "Inputs", "Overlays", "Layout", "Page", "Chat"];

export type PaletteContext = {
  /** The component whose slot takes the item (`slot.component`; a Stack / Grid / Box for layout children). */
  host: string;
  slot: ContentSlot;
  /** headingLevelFor(…) in registry.ts: the host title + 1, never 1. */
  headingLevel: number;
  /** Inside a BottomSheet or PlatformPhone: Toggle size lg, fields md or larger (mobile/full-size-controls). */
  mobile: boolean;
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
  /** A builder page kept in this browser (Studio builder GĐ2): no hooks, so actions become proto.toast(…) and items that
   * keep state are hidden. */
  builder?: boolean;
};

/**
 * An item's code for a builder page: `() => toast({ … })` handlers become `proto.toast({ … })` (the page's prototype
 * runtime shows the toast in Play); null when the code holds other logic a page cannot have.
 */
export function builderCode(code: string): string | null {
  const next = code.replace(/\(\)\s*=>\s*toast\((\{[^{}]*\})\)/g, "proto.toast($1)");
  return /(?<!\.)\btoast\(|=>|\buse[A-Z]/.test(next) ? null : next;
}

/** Items the slot cannot take (the code could not be written there), by group and reason (`items`: their labels). */
export type PaletteHidden = { group: PaletteGroup; reason: string; items: string[] };
/** Why an item goes against the host rules here: `short` for the item's caption, `reason` in full. It still inserts. */
export type PaletteWarning = { short: string; reason: string };
/** `context`: what to pass to `item.build` (mobile also set when the chain holds a BottomSheet or PlatformPhone).
 * `warnings`: item id → why it is not recommended here (listed and insertable all the same). */
export type PaletteResult = { items: PaletteItem[]; warnings: Readonly<Record<string, PaletteWarning>>; hidden: PaletteHidden[]; context: PaletteContext };

/** src/components/<Folder> for every name a snippet uses, and useToast. Server: extend detach.mjs COMPONENT_FOLDER. */
export const COMPONENT_FOLDERS: Readonly<Record<string, string>> = {
  Heading: "Text", Text: "Text", Button: "Button", IconButton: "Button", Link: "Link", Avatar: "Avatar", Badge: "Badge",
  Tag: "Tag", DockIcon: "DockIcon", List: "ListItem", ListItem: "ListItem", ListBox: "ListItem", DescriptionList: "DescriptionList",
  Metric: "MetricWidget", MetricCard: "MetricWidget", Card: "Card", ProgressBar: "Progress", InlineMessage: "InlineMessage",
  EmptyState: "EmptyState", InputField: "Input", TextAreaField: "Input", SelectField: "Input", Checkbox: "Checkbox",
  Toggle: "Toggle", ChipGroup: "ChipGroup", FormFieldset: "Form", RadioButton: "RadioButton", Stack: "Layout", Grid: "Layout", Box: "Layout", Divider: "Divider",
  Accordion: "Accordion", useToast: "Toast",
  Tabs: "Tabs", TabPanel: "Tabs", Segmented: "Segmented", Breadcrumbs: "Breadcrumbs", Pagination: "Pagination",
  Stepper: "Stepper", Menu: "Menu", Tooltip: "Tooltip", Icon: "Icon", FileIcon: "FileIcon", Flag: "Flag",
  AvatarStack: "Avatar", RatingDisplay: "Rating", Rating: "Rating", NpsScale: "Rating", Table: "Table", TableText: "Table",
  Image: "Image", LineChart: "Chart", StackBarChart: "Chart", ChartCard: "Chart", AlertBanner: "AlertBanner",
  SkeletonText: "Skeleton", SkeletonHeading: "Skeleton", Search: "Search", Chip: "Chip", Slider: "Slider",
  DateField: "Input", NumberField: "Input", AutocompleteField: "Input", RichTextField: "Input",
  DatePicker: "DatePicker", ColorSelector: "ColorSelector", FileUpload: "Uploader", Dialog: "Dialog", ModalForm: "Dialog", SidePanel: "SidePanel",
  BottomSheet: "BottomSheet", Popover: "Popover", PageHeader: "PageHeader", TopNavigation: "TopNavigation",
  BottomNavigation: "BottomNavigation", Sidebar: "Sidebar", SidebarMenuItem: "Sidebar", SidebarMenuSection: "Sidebar", AppShell: "AppShell", ActionBar: "ActionBar",
  ChatThread: "Chat", ChatMessage: "Chat", ChatComposer: "Chat", AiChatThread: "AiChat", AiChatBubble: "AiChat",
  AiChatField: "AiChat", VoiceRecorder: "Voice", AiVoiceConversation: "Voice",
};

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
    build: () => lines(
      `<ListBox>`,
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
    build: () => `<Metric label="Revenue" value="$21,000" icon={false} trend={{ direction: "positive", label: "+12% vs last month" }} />`,
  },
  {
    id: "metric-card", label: "Metric card", group: "Data display", caption: "Value and trend in a card", root: "MetricCard", components: ["MetricCard"], interactive: false, input: false,
    build: () => `<MetricCard label="Revenue" value="$21,000" icon={false} trend={{ direction: "positive", label: "+12% vs last month" }} />`,
  },
  {
    id: "card", label: "Card", group: "Data display", caption: "Nested surface", root: "Card", components: ["Card", "Stack", "Heading", "Text"], interactive: false, input: false,
    build: (ctx) => lines(
      `<Card theme="border" spacing="sm">`,
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
    id: "table", label: "Table", group: "Data display", caption: "Two rows", root: "Table", components: ["Table", "TableText"], interactive: false, input: false,
    build: () => lines(
      `<Table aria-label="Projects"`,
      `  rows={[`,
      `    { id: "loyalty", name: "Loyalty app", client: "Phin & Co", due: "Oct 14, 2026" },`,
      `    { id: "banking", name: "Online banking redesign", client: "Lumen Bank", due: "Nov 2, 2026" },`,
      `  ]}`,
      `  columns={[`,
      `    { id: "project", header: "Project", cell: (row) => <TableText bold caption={row.client}>{row.name}</TableText> },`,
      `    { id: "due", header: "Due", width: "152px", cell: (row) => <TableText>{row.due}</TableText> },`,
      `  ]} />`,
    ),
  },
  {
    id: "image", label: "Image", group: "Data display", caption: "4:3 photo", root: "Image", components: ["Image"], requires: MEDIA, interactive: false, input: false,
    build: () => `<Image src={platformMedia.site[5].src} alt={platformMedia.site[5].alt} ratio="4:3" />`,
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
  /* Feedback */
  {
    id: "inline-message", label: "Inline message", group: "Feedback", caption: "Info", root: "InlineMessage", components: ["InlineMessage"], interactive: false, input: false,
    build: () => `<InlineMessage theme="info" title="Invoices go out on the 1st">The client gets a PDF by email.</InlineMessage>`,
  },
  {
    id: "empty-state", label: "Empty state", group: "Feedback", caption: "Without illustration", root: "EmptyState", components: ["EmptyState"], interactive: false, input: false,
    build: (ctx) => `<EmptyState illustration={false} headingLevel={${level(ctx)}} title="No files yet">Files you add to this project appear here.</EmptyState>`,
  },
  {
    id: "alert-banner", label: "Alert banner", group: "Feedback", caption: "Info", root: "AlertBanner", components: ["AlertBanner"], interactive: false, input: false,
    build: () => `<AlertBanner theme="info">Zen is read-only tonight from 11:00 pm to 1:00 am while the studio moves to a new data centre.</AlertBanner>`,
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
  },
  {
    id: "number-field", label: "Number field", group: "Inputs", root: "NumberField", components: ["NumberField"], interactive: true, input: true,
    build: () => `<NumberField label="Team size" defaultValue={4} min={1} max={20} />`,
  },
  {
    id: "autocomplete-field", label: "Autocomplete", group: "Inputs", caption: "Several values", root: "AutocompleteField", components: ["AutocompleteField"], interactive: true, input: true,
    build: () => lines(
      `<AutocompleteField label="Team" addLabel="Add member" popoverLabel="Studio members" searchPlaceholder="Search people" options={[`,
      `  { id: "bao", label: "Bao Nguyen" },`,
      `  { id: "trang", label: "Trang Le" },`,
      `  { id: "minh", label: "Minh Pham" },`,
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
  },
  {
    id: "color-selector", label: "Colour selector", group: "Inputs", root: "ColorSelector", components: ["ColorSelector"], state: [state("color", '"var(--zen-color-background-support-blue-solid)"')], interactive: true, input: true,
    build: () => lines(
      `<ColorSelector aria-label="Project colour" value={color} onValueChange={setColor} colors={[`,
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
  {
    id: "app-shell", label: "App shell", group: "Page", caption: "Sidebar and page", root: "AppShell", components: ["AppShell", "Sidebar", "SidebarMenuItem", "Breadcrumbs", "Text"], state: [state("area", '"projects"')], interactive: true, input: false,
    build: () => lines(
      `<AppShell`,
      `  sidebar={<Sidebar aria-label="Workspace" selectedId={area} onItemClick={(item) => setArea(item.id)}>`,
      `    <SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" />`,
      `    <SidebarMenuItem id="projects" label="Projects" icon="icon-folder-line" />`,
      `  </Sidebar>}`,
      `  header={<Breadcrumbs master={false} items={[{ id: area, label: area === "home" ? "Home" : "Projects" }]} />}>`,
      `  <Text tone="base">{area === "home" ? "3 projects are due this week." : "12 active projects."}</Text>`,
      `</AppShell>`,
    ),
    builder: () => lines(
      `<AppShell`,
      `  sidebar={<Sidebar aria-label="Workspace" selectedId="projects">`,
      `    <SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" />`,
      `    <SidebarMenuItem id="projects" label="Projects" icon="icon-folder-line" />`,
      `  </Sidebar>}`,
      `  header={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }]} />}>`,
      `  <Text tone="base">12 active projects.</Text>`,
      `</AppShell>`,
    ),
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
  },
  {
    id: "chat-composer", label: "Chat composer", group: "Chat", root: "ChatComposer", components: ["ChatComposer"], requires: TOAST, interactive: true, input: false,
    build: () => `<ChatComposer label="Message Bao Nguyen" placeholder="Message" onSend={(text) => toast({ title: "Message sent", children: text })} />`,
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
    // Figma ❖ Voice (15081:1294): every action wired (harness voice/actions-wired); a page's toasts become proto.toast.
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
  "ChartCard.children": ["empty-state", "metric"],
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
  const chain = [ctx.host, ...ctx.ancestors];
  const inChain = (names: Set<string>) => chain.find((name) => names.has(name));
  const context: PaletteContext = { host: ctx.host, slot: ctx.slot, headingLevel: ctx.headingLevel, mobile: ctx.mobile || Boolean(inChain(MOBILE_HOSTS)), uid: ctx.uid };
  const insideCard = Boolean(inChain(CARD_SURFACES));
  const overlayHost = inChain(OVERLAY_HOSTS);
  const formHost = inChain(FORM_HOSTS);
  const clickTarget = (ctx.slot.accepts?.noInteractiveWhen ?? []).some((prop) => isSet(ctx.hostProps[prop])) ? ctx.host : ctx.clickableAncestor;
  const only = ctx.slot.accepts?.only?.length ? ctx.slot.accepts.only : null;
  const deny = new Set(ctx.slot.accepts?.deny ?? []);
  const clickableRow = ctx.host === "ListItem" && (isSet(ctx.hostProps.onClick) || isSet(ctx.hostProps.href));

  const warningFor = (item: PaletteItem): PaletteWarning | null => {
    if (only && !only.includes(item.root)) return { short: `${ctx.slot.name} prefers others`, reason: `${ctx.slot.name} takes ${sentence(only)}` };
    if (SIDEBAR_ROWS.has(item.root) && !inChain(SIDEBAR_HOSTS)) return { short: "Sidebar rows only", reason: "Menu items are rows of a Sidebar (Body-Content, Footer-Content) or its flyout" };
    if (item.components.includes("Accordion") && (deny.has("Accordion") || chain.includes("Accordion"))) return { short: "Accordion in an Accordion", reason: "Accordions are one level deep" };
    if (insideCard && item.components.some((name) => CARD_SURFACES.has(name))) return { short: "Card inside a card", reason: "A card never goes inside a card" };
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
  /** The code cannot be written here (the server would refuse it). */
  const blockFor = (item: PaletteItem): string | null => {
    if (ctx.builder && !item.builder && (item.state?.length || builderCode(item.build(context)) === null)) return "A builder page keeps no state or code: this item comes with prototypes";
    if (ctx.canUseToast === false && (item.requires?.includes("toast") || item.state?.length)) return "Actions and stateful items need a component to hold their hooks; this code sits outside one";
    if (ctx.canUseMedia === false && item.requires?.includes("media")) return "Images read platformMedia, which only the example pages import";
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
    // A builder page gets the item with proto handlers (and needs no toast hook).
    items.push(ctx.builder ? {
      ...item,
      requires: item.requires?.filter((need) => need !== "toast"),
      // Its static version (no state), or its code with proto handlers.
      ...(item.builder ? { state: undefined, build: item.builder } : { build: (built: PaletteContext) => builderCode(item.build(built)) ?? item.build(built) }),
    } : item);
    const warning = warningFor(item);
    if (warning) warnings[item.id] = warning;
  }
  return { items, warnings, hidden, context };
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
