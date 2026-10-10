import { createRef, type ReactElement, type ReactNode } from "react";
import { ListItem, TabPanel } from "../../src/index";

/**
 * Hand-written props for the smoke test: required props the generic synthesiser in components.test.tsx cannot guess
 * (object shapes, arrays, overlay `open`), plus parents for parts that are only valid inside a container.
 * Keep them realistic — the same data an app would pass.
 */
export type Fixture = {
  /** Props merged over the synthesised required props. */
  props?: Record<string, unknown>;
  /** Wrap the element in its required parent (e.g. a List for a ListItem). */
  wrap?: (element: ReactElement) => ReactNode;
  /** Not rendered; the reason is printed as a skipped test. */
  skip?: string;
};

const noop = () => undefined;
const people = [{ name: "Ava Nguyen" }, { name: "Minh Tran", theme: "blue" }];
const photo = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23c9d6e3'/%3E%3C/svg%3E";
const members = [
  { id: "ava", name: "Ava Nguyen", role: "Admin" },
  { id: "minh", name: "Minh Tran", role: "Editor" },
];

export const fixtures: Record<string, Fixture> = {
  // Overlays: render them open so their content is covered.
  Dialog: { props: { open: true, title: "Delete project?", children: "This removes the project for everyone." } },
  ModalForm: { props: { open: true, title: "Invite member", children: "Form body" } },
  SidePanel: { props: { open: true, title: "Order details", children: "Panel body" } },
  BottomSheet: { props: { open: true, title: "Share", children: "Sheet body" } },
  DatePickerSheet: { props: { open: true, title: "Your stay", selectionMode: "range", monthCount: 2, today: new Date(2026, 0, 4) } },
  Popover: { props: { open: true, "aria-label": "Sort by", items: [{ id: "new", label: "Newest" }, { id: "old", label: "Oldest" }] } },
  Menu: { props: { trigger: <button type="button">Actions</button>, children: null } },
  ChatReactorsPanel: {
    props: { reactions: [{ kind: "love", count: 2, by: people }], glyph: () => "❤️", device: "desktop", side: "others", open: true, anchorRef: createRef<HTMLElement>() },
  },

  // Collections.
  AvatarStack: { props: { items: [{ alt: "Ava Nguyen", children: "AN" }, { alt: "Minh Tran", children: "MT" }] } },
  BottomNavigation: { props: { items: [{ id: "home", label: "Home", icon: "icon-home-02-line" }, { id: "me", label: "Profile", icon: "icon-user-line" }], value: "home" } },
  Breadcrumbs: { props: { items: [{ id: "home", label: "Home", href: "#" }, { id: "team", label: "Team" }] } },
  BreadcrumbItem: { skip: "internal part: rendered by Breadcrumbs, which is covered" },
  LineChart: { props: { "aria-label": "Weekly visits", data: [{ label: "Mon", value: 12 }, { label: "Tue", value: 18 }, { label: "Wed", value: 9 }] } },
  StackBarChart: {
    props: {
      "aria-label": "Revenue by channel",
      series: [{ id: "web", label: "Web" }, { id: "app", label: "App" }],
      data: [{ label: "Q1", values: { web: 10, app: 6 } }, { label: "Q2", values: { web: 14, app: 9 } }],
    },
  },
  ChartCard: { props: { title: "Visits", children: "Chart" } },
  ColorSelector: { props: { "aria-label": "Label colour", colors: [{ value: "#3b82f6", label: "Blue" }, { value: "#ef4444", label: "Red" }] } },
  AutocompleteField: { props: { label: "Assignee", options: [{ id: "ava", label: "Ava Nguyen" }, { id: "minh", label: "Minh Tran" }] } },
  Stepper: { props: { "aria-label": "Checkout", steps: [{ id: "cart", title: "Cart" }, { id: "pay", title: "Payment" }, { id: "done", title: "Done" }] } },
  Table: {
    props: {
      "aria-label": "Members",
      columns: [
        { id: "name", header: "Name", cell: (row: (typeof members)[number]) => row.name },
        { id: "role", header: "Role", cell: (row: (typeof members)[number]) => row.role },
      ],
      rows: members,
      getRowId: (row: (typeof members)[number]) => row.id,
    },
  },
  Tabs: {
    props: { "aria-label": "Sections", idPrefix: "smoke-tabs", items: [{ id: "overview", label: "Overview" }, { id: "activity", label: "Activity" }] },
    wrap: (el) => <>{el}<TabPanel idPrefix="smoke-tabs" id="overview">Overview panel</TabPanel><TabPanel idPrefix="smoke-tabs" id="activity">Activity panel</TabPanel></>,
  },
  TabPanel: { props: { idPrefix: "smoke", id: "overview", children: "Overview panel" } },
  ToastStack: { props: { toasts: [{ id: 1, title: "Invite sent" }], inline: true } },
  Pagination: { props: { page: 2, pageCount: 5 } },
  PaginationItem: { props: { page: 2 } },
  ChatConversationItem: { props: { person: people[0], time: "9:41", preview: "See you tomorrow" }, wrap: (el) => <ul>{el}</ul> },
  ChatComposerReply: { props: { target: { id: "m1", author: "Ava", kind: "text", text: "Lunch?" } } },
  ChatReplyQuote: { props: { target: { id: "m1", author: "Ava", kind: "text", text: "Lunch?" }, side: "others" } },
  ChatReactions: { props: { reactions: [{ kind: "love", count: 2, by: people }] } },
  ChatReadList: { props: { people } },
  ChatAvatarGroup: { props: { people } },
  ChatPhotos: { props: { photos: [{ src: photo, alt: "Beach" }, { src: photo, alt: "Harbour" }] } },
  ChatFile: { props: { name: "Q4 brief.pdf" } },
  UploaderFileItem: { props: { file: { id: "f1", name: "Q4 brief.pdf", size: "2.4 MB", state: "uploaded" } }, wrap: (el) => <ul>{el}</ul> },
  ChatVoice: { props: { duration: "0:32" } },
  FileIcon: { props: { format: "pdf" } },
  Flag: { props: { name: "Vietnam", label: "Vietnam" } },
  TopNavigationActionButton: { props: { action: { icon: "icon-search-medium-line", label: "Search" }, variant: "default" } },
  ZenPortalProvider: { skip: "context provider without UI; covered through ZenProvider and every overlay" },
  DatePickerHeader: { props: { month: new Date(2026, 8, 1) } },
  DatePickerMonthYear: { props: { month: new Date(2026, 8, 1) } },
  DatePickerTimePicker: { props: { value: { from: "09:30", to: "10:00" }, onValueChange: () => undefined } },

  // Parts that only exist inside their container.
  ListItem: { props: { title: "Ava Nguyen" }, wrap: (el) => <ul>{el}</ul> },
  ToggleListItem: { props: { title: "Daily digest" }, wrap: (el) => <ul>{el}</ul> },
  MenuItem: { skip: "needs an open Menu; covered by the Menu interaction tests" },
  MenuSeparator: { skip: "needs an open Menu; covered by the Menu interaction tests" },
  MenuGroup: { skip: "needs an open Menu; covered by the Menu interaction tests" },
  DescriptionItem: { props: { term: "Total", description: "$129.00" }, wrap: (el) => <dl>{el}</dl> },
  StepperItem: { wrap: (el) => <ol>{el}</ol> },
  PopoverItem: { props: { label: "Newest" }, wrap: (el) => <div role="listbox" aria-label="Sort by">{el}</div> },
  InputConditionItem: { props: { label: "At least 8 characters" }, wrap: (el) => <ul>{el}</ul> },
  TableText: { wrap: (el) => <table><tbody><tr><td>{el}</td></tr></tbody></table> },
  TableMedia: { props: { media: <img src={photo} alt="" />, children: "Ava Nguyen" }, wrap: (el) => <table><tbody><tr><td>{el}</td></tr></tbody></table> },
  TableTrend: { wrap: (el) => <table><tbody><tr><td>{el}</td></tr></tbody></table> },
  TableBadges: { wrap: (el) => <table><tbody><tr><td>{el}</td></tr></tbody></table> },
  TableTags: { wrap: (el) => <table><tbody><tr><td>{el}</td></tr></tbody></table> },
  TableActions: { props: { children: <button type="button">Edit</button> }, wrap: (el) => <table><tbody><tr><td>{el}</td></tr></tbody></table> },
  SegmentedItem: { props: { children: "List" }, wrap: (el) => <div role="radiogroup" aria-label="View">{el}</div> },
  TabItem: { props: { label: "Overview" }, wrap: (el) => <div role="tablist" aria-label="Sections">{el}</div> },
  BreadcrumbItemData: { skip: "type only" },

  // Content the synthesiser leaves empty.
  Chip: { props: { children: "Status" } },
  ChipGroup: { props: { "aria-label": "Repeat", options: [{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }], defaultValue: "daily" } },
  Heading: { props: { children: "Team members" } },
  List: { props: { children: <ListItem title="Ava Nguyen" /> } },

  // Controls that need an accessible name to be valid.
  ControlBarSelectItem: { props: { icon: "icon-bold-01-line", "aria-label": "Bold" } },
  IconButton: { props: { icon: "icon-plus-line", "aria-label": "Add member" } },
  Checkbox: { props: { label: "Email me updates" } },
  RadioButton: { props: { label: "Monthly", name: "plan" } },
  Toggle: { props: { label: "Notifications" } },
  ToggleButton: { props: { "aria-label": "Bold" } },
  Slider: { props: { "aria-label": "Volume" } },
  Search: { props: { "aria-label": "Search members" } },
  Segmented: { props: { "aria-label": "View", options: [{ id: "list", label: "List" }, { id: "grid", label: "Grid" }] } },
  InputField: { props: { label: "Email" } },
  SelectField: { props: { label: "Role", options: [{ value: "admin", label: "Admin" }, { value: "editor", label: "Editor" }] } },
  DateField: { props: { label: "Start date" } },
  NumberField: { props: { label: "Seats" } },
  TextAreaField: { props: { label: "Message" } },
  RichTextField: { props: { label: "Description" } },
  HeadingField: { props: { "aria-label": "Page title" } },
  Rating: { props: { ariaLabel: "Rate this app" } },
  OpinionScale: { props: { ariaLabel: "How easy was it?" } },
  NpsScale: { props: { ariaLabel: "How likely are you to recommend us?" } },
  ProgressBar: { props: { value: 40, "aria-label": "Upload progress" } },
  ProgressCircle: { props: { value: 40, "aria-label": "Upload progress" } },
  RatingDisplay: { props: { value: 4 } },
  Tooltip: { props: { content: "Add member", children: <button type="button">Add</button> } },
  FormField: { props: { label: "Email", children: <input /> } },
  Image: { props: { src: photo, alt: "Harbour at dusk" } },
  Thumbnail: { props: { src: photo, alt: "Harbour at dusk" } },
  Link: { props: { href: "#", children: "Billing settings" } },
  ActionBar: { props: { primaryAction: { label: "Track order", onClick: noop } } },
  AppShell: { props: { children: "Page body" } },
  Sidebar: { props: { sections: [{ id: "main", items: [{ id: "home", label: "Home", icon: "icon-home-02-line" }] }] } },
  FileUpload: { props: { label: "Attachments" } },
};
