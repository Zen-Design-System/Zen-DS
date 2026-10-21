import type { PaletteItem } from "../slots/palette";

/*
 * The code the Main component frame draws a component from when the Assets have no item for it (a part used inside
 * another component: a Control-Bar select item, an Uploader file row, a chat bubble) or when the Assets item shows it
 * closed (Popover) or in one form only (a Dashboard header's Control-Bar). Never listed in the Assets panel. User
 * 2026-10-18: "làm tiếp phần còn thiếu của main component". E2E BL-02 checks every component with Figma variant sets is
 * drawn. Each sample is one element of that component, with the content every variant of its sets needs to show.
 */

const lines = (...rows: string[]) => rows.join("\n");
const sample = (root: string, code: string, extra: Partial<PaletteItem> = {}): PaletteItem => ({
  id: `main-${root}`, label: root, group: "Data display", root, components: [root], interactive: false, input: false, build: () => code, ...extra,
});

const ava = `{ name: "Ava Chen", theme: "violet" }`;
const bao = `{ name: "Bao Nguyen", theme: "blue" }`;

export const MAIN_SAMPLES: Readonly<Record<string, PaletteItem>> = {
  ToggleButton: sample("ToggleButton", `<ToggleButton icon="icon-star-01-line" aria-label="Favourite" />`),
  BadgeCounter: sample("BadgeCounter", `<BadgeCounter value={3} />`),
  // Timeline/Item (16131:1090): an entry with its detail line and a comment attachment, so Attachment and Description draw.
  TimelineItem: sample("TimelineItem", `<TimelineItem actor="Maya Chen" title="approved your leave request" time="10:42" description="Annual leave · Oct 12 – Oct 16" attachment="Can we move the review to Thursday?" />`),
  HeadingField: sample("HeadingField", `<HeadingField aria-label="Project name" placeholder="Untitled project" />`),
  SkeletonShape: sample("SkeletonShape", `<SkeletonShape shape="round" size="md" />`),
  OpinionScale: sample("OpinionScale", `<OpinionScale scale={5} aria-label="How was your visit?" />`),
  UploaderFileItem: sample("UploaderFileItem", `<UploaderFileItem file={{ id: "cover", name: "Café cover.jpg", size: "2.4 MB", state: "uploaded", previewUrl: "zen-media:site-cafe" }} thumbnail="file" />`),
  ControlBarSelectItem: sample("ControlBarSelectItem", `<ControlBarSelectItem icon="icon-grid-01-line" aria-label="Grid view" />`),
  InputConditionItem: sample("InputConditionItem", `<InputConditionItem label="8 characters or more" />`),
  InputConditions: sample("InputConditions", lines(
    `<InputConditions>`,
    `  <InputConditionItem label="8 characters or more" state="success" />`,
    `  <InputConditionItem label="One number" />`,
    `</InputConditions>`,
  ), { components: ["InputConditions", "InputConditionItem"] }),
  ChatConversationItem: sample("ChatConversationItem", `<ChatConversationItem person={${ava}} preview="See you at 3" time="2m" />`),
  ChatBubble: sample("ChatBubble", `<ChatBubble side="others">Can we move the kickoff to Thursday?</ChatBubble>`),
  ChatFile: sample("ChatFile", `<ChatFile side="others" kind="pdf" name="Brand brief.pdf" size="2.4 MB" />`),
  ChatCall: sample("ChatCall", `<ChatCall side="others" type="audio" state="in-call" detail="12 min" />`),
  ChatAvatarGroup: sample("ChatAvatarGroup", `<ChatAvatarGroup people={[${ava}, ${bao}]} />`),
  // Library photos by key (builder/library/media.ts): the page renderer resolves them in nested values too.
  ChatPhotos: sample("ChatPhotos", `<ChatPhotos side="others" photos={[{ src: "zen-media:site-cafe", alt: "Café table with a coffee" }, { src: "zen-media:site-bridge", alt: "A bridge at dusk" }]} />`),
  // Open with no anchor and no onOpenChange: the surface draws in place and listens to nothing (as the docs' visuals).
  Popover: sample("Popover", `<Popover open label="Assignee" items={[{ id: "ava", label: "Ava Chen" }, { id: "bao", label: "Bao Nguyen", selected: true }]} />`),
  // The toast card itself (toast() puts it in the page's stack; here it is drawn in place).
  Toast: sample("Toast", `<Toast type="neutral" title="Project archived" action={{ label: "Undo" }} />`),
  // Modal overlays, drawn open in a screen of their own (MainComponentFrame OVERLAY_SCREENS, OverlayPreviewContext).
  Dialog: sample("Dialog", `<Dialog open title="Delete Brand refresh?" description="Its 24 pages and comments move to the trash for 30 days." primaryAction={{ label: "Delete" }} secondaryAction={{ label: "Cancel" }} />`),
  ModalForm: sample("ModalForm", lines(
    `<ModalForm open title="New project" description="Name it and pick who owns it." primaryAction={{ label: "Create project" }} secondaryAction={{ label: "Cancel" }}`,
    `  side={<Text textStyle="Body/Base/Regular" tone="base">Projects group pages, files and people.</Text>}>`,
    `  <InputField label="Project name" placeholder="Brand refresh" />`,
    `</ModalForm>`,
  ), { components: ["ModalForm", "Text", "InputField"] }),
  SidePanel: sample("SidePanel", lines(
    `<SidePanel open title="Invoice INV-0143" description="Saola Outdoor · Due Oct 30" primaryAction={{ label: "Send invoice" }} secondaryAction={{ label: "Download PDF" }}>`,
    `  <Text textStyle="Body/Base/Regular">$12,000.00 for the Brand refresh, September.</Text>`,
    `</SidePanel>`,
  ), { components: ["SidePanel", "Text"] }),
  // A Modal sheet shows its content, an Action sheet its items: the sample carries both.
  BottomSheet: sample("BottomSheet", lines(
    `<BottomSheet open title="Sort by" items={[{ id: "name", label: "Name" }, { id: "date", label: "Date modified" }, { id: "size", label: "Size" }]} selectedId="date">`,
    `  <Text textStyle="Body/Base/Regular">Files keep this order on every device you sign in on.</Text>`,
    `</BottomSheet>`,
  ), { components: ["BottomSheet", "Text"] }),
  DatePickerSheet: sample("DatePickerSheet", `<DatePickerSheet open title="Pick a date" />`),
  // Figma's bar: four destinations, the selected one solid and the others line (nav-icons rule), the action from CTA.
  BottomNavigation: sample("BottomNavigation", lines(
    `<BottomNavigation value="home" aria-label="Main" items={[`,
    `  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },`,
    `  { id: "projects", label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },`,
    `  { id: "inbox", label: "Inbox", icon: "icon-bell-01-line", selectedIcon: "icon-bell-01-solid", dot: true },`,
    `  { id: "profile", label: "Profile", icon: "icon-user-circle-line", selectedIcon: "icon-user-circle-solid" },`,
    `]} />`,
  )),
  // Every type reads its own props: Main the title and actions, Control-Bar the search, filters and actions, Navigation the
  // breadcrumbs and the bell, Custom its children.
  DashboardHeader: sample("DashboardHeader", lines(
    `<DashboardHeader title="Projects" subheading="12 active"`,
    `  search={<Search size="md" placeholder="Search projects" />}`,
    `  controls={<Chip variant="advanced" dropdown popoverItems={[{ id: "active", label: "Active" }, { id: "archived", label: "Archived" }]}>Status</Chip>}`,
    `  actions={<Button level="primary">New project</Button>}`,
    `  leading={<Breadcrumbs items={[{ id: "workspace", label: "Workspace", href: "#" }, { id: "projects", label: "Projects" }]} />}`,
    `  trailing={<IconButton icon="icon-bell-01-line" level="tertiary" aria-label="Notifications" />}>`,
    `  <Text textStyle="Body/Base/Regular" tone="base">Updated 5 minutes ago</Text>`,
    `</DashboardHeader>`,
  ), { components: ["DashboardHeader", "Search", "Chip", "Button", "Breadcrumbs", "IconButton", "Text"] }),
};
