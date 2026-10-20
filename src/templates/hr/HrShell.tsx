/**
 * HR shell: the app frame every HR template page shares, an AppShell on the Sidebar pattern. Copy the folder (with
 * ./data and ./assets) into your app and keep one shell for all pages. Render it inside your app's <ZenProvider>. Uses
 * only @zen-ds/react components, no custom CSS.
 *
 * - Home: the Sidebar as an icon rail, one icon per module; the header's toggle opens it with the same workspace header.
 * - A module (Time off, Expenses, Workbench): the expanded Sidebar with the workspace in the header, Back and the module
 *   name above its items (approval counters on Approvals), and Apps in the footer.
 * - Header (AppShellHeader): the top row starts with the sidebar toggle and Breadcrumbs from Home (derived from the
 *   module and page; no Master crumb beside the toggle) and ends with the plan Badge, the Settings menu, the Inbox with
 *   its unread count and the account menu. The page's own header (`pageHeader`: title, description, its Primary) is the
 *   Main row and its views (Tabs) the Sections under it; the Body holds the page at the page margin.
 * - Panels docked on the right: the Inbox, My profile and, on module pages, the Zen AI assistant (Home has it inline).
 * - Under 1024px (phones, an iPad held upright) the mobile shell (component-usage-rules §17): a TopNavigation with the
 *   account (its sheet holds My profile, the Settings pages, the plan and Sign out), the page title, its "+", the Inbox
 *   and ⋯ More for the page's other actions; the description opens the page; a tab bar with the navigation's first
 *   pages (up to four) and More, which opens the whole Sidebar (Back to Home, Configurations, Spaces, Apps) in the
 *   drawer. Panels open as modal panels.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import {
  AiChatBubble,
  AiChatField,
  AiChatThread,
  AppShell,
  AppShellAccount,
  AppShellAction,
  AppShellHeader,
  Avatar,
  Badge,
  BottomNavigation,
  BottomSheet,
  Box,
  Breadcrumbs,
  Button,
  DescriptionList,
  DockIcon,
  FileIcon,
  Heading,
  Icon,
  IconButton,
  InputField,
  List,
  ListItem,
  Menu,
  ModalForm,
  PageHeader,
  SidePanel,
  Sidebar,
  SidebarMenuItem,
  Stack,
  Tag,
  Text,
  TopNavigation,
  fileIconFormatOf,
  useAppShell,
  useFormState,
  useToast,
  type AvatarTheme,
  type BottomNavigationItem,
  type BottomSheetItem,
  type IconName,
  type MenuEntry,
  type MenuItemData,
  type SidebarItem,
  type SidebarSection,
  type TopNavigationAction,
} from "@zen-ds/react";
import {
  assistantAnswer,
  avatarOf,
  currentUser,
  expenseClaims,
  formatDate,
  formatDays,
  formatRelative,
  inboxItems,
  leaveRequests,
  myLeaveBalances,
  people,
  spaceList,
  teams,
  workspace,
} from "./data";

export type HrModule = "home" | "time-off" | "expenses" | "workbench";

/** Home's icon rail: you, then the product modules. The phone drawer shows it expanded, where the second group needs
 * its title. */
const railSections: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "profile", label: "My profile", icon: "icon-user-square-line" },
  ] },
  { label: "Modules", items: [
    { id: "people", label: "People", icon: "icon-users-line" },
    { id: "documents", label: "Documents", icon: "icon-file-doc-line" },
    { id: "files", label: "Files", icon: "icon-folder-line" },
    { id: "expenses", label: "Expenses", icon: "icon-coin-02-line" },
    { id: "time-off", label: "Time off", icon: "icon-calendar-heart-line" },
    { id: "workbench", label: "Workbench", icon: "icon-dataflow-03-line" },
  ] },
];

/** What waits for the signed-in approver: the Approvals counters. */
const leaveToApprove = leaveRequests.filter((request) => request.approver === currentUser.id && request.status === "Pending").length;
const claimsToApprove = expenseClaims.filter((claim) => claim.approver === currentUser.id && claim.status === "Submitted").length;

/** A space's mark in the Sidebar: its initial on a Solid XSmall Avatar. */
const spaceItem = (space: { id: string; name: string; initial: string; theme: Exclude<AvatarTheme, "photo"> }): SidebarItem =>
  ({ id: `space-${space.id}`, label: space.name, icon: <Avatar size="xsmall" theme={space.theme} background="solid" alt="">{space.initial}</Avatar> });

/** Each module's navigation. Page ids are the routes (`{ module, page }`); space items are `space-<id>`. */
export const hrModules: Record<Exclude<HrModule, "home">, { title: string; sections: SidebarSection[] }> = {
  "time-off": {
    title: "Time off",
    sections: [{ items: [
      { id: "my-leaves", label: "My leaves", icon: "icon-send-01-line" },
      { id: "approvals", label: "Approvals", icon: "icon-check-done-line", counter: leaveToApprove || undefined },
      { id: "calendar", label: "Calendar", icon: "icon-calendar-line" },
      { id: "workflow", label: "Workflow", icon: "icon-dataflow-03-line" },
      { id: "configurations", label: "Configurations", icon: "icon-settings-03-line", children: [
        // Child items keep the neutral (grey) selection.
        { id: "leave-types", label: "Leave types", theme: "neutral" },
        { id: "public-holiday", label: "Public holidays", theme: "neutral" },
      ] },
    ] }],
  },
  expenses: {
    title: "Expenses",
    sections: [{ items: [
      { id: "overviews", label: "Overview", icon: "icon-pie-chart-03-line" },
      { id: "my-expenses", label: "My expenses", icon: "icon-coin-02-line" },
      { id: "approvals", label: "Approvals", icon: "icon-check-done-line", counter: claimsToApprove || undefined },
      { id: "my-budget", label: "My budget", icon: "icon-coins-stacked-02-line" },
      { id: "workflow", label: "Workflow", icon: "icon-dataflow-03-line" },
      { id: "configurations", label: "Configurations", icon: "icon-settings-03-line", dropdown: true },
    ] }],
  },
  workbench: {
    title: "Workbench",
    sections: [
      { items: [
        { id: "overviews", label: "Overview", icon: "icon-pie-chart-03-line" },
        { id: "tasks", label: "Tasks", icon: "icon-check-square-broken-line" },
        { id: "workflow", label: "Workflow", icon: "icon-dataflow-03-line" },
        { id: "configurations", label: "Configurations", icon: "icon-settings-03-line", dropdown: true },
      ] },
      { label: "Spaces", items: spaceList.map(spaceItem) },
    ],
  },
};

/** The trail after Home: the module, then the page (a group such as Configurations is not a page, so it is skipped). */
function crumbsFor(module: HrModule, page?: string): Array<{ id: string; label: string }> {
  if (module === "home") return [];
  const { title, sections } = hrModules[module];
  const pages = sections.flatMap((section) => section.items.flatMap((item) => [item, ...(item.children ?? [])]));
  const current = pages.find((item) => item.id === page && !item.children?.length);
  return [{ id: module, label: title }, ...(current ? [{ id: current.id, label: current.label }] : [])];
}

export type HrNavigate = (target: { module: HrModule; page?: string }) => void;

/**
 * Optional router for linking the HR pages into one app: when a provider is present, every navigation in the shell (a
 * module item, a rail module, Back, a crumb, an Inbox row, a Settings item) goes to it instead of the page's own
 * onNavigate. `<HrRouterContext.Provider value={(target) => setRoute(target)}>…page…</HrRouterContext.Provider>`
 */
export const HrRouterContext = createContext<HrNavigate | null>(null);

/**
 * A page's own header, one set of parts for both layouts (component-usage-rules §17): on a desktop the PageHeader in
 * the header's Main row (and its Tabs in the Sections), on a phone the TopNavigation and the top of the page.
 */
export interface HrPageHeader {
  /** The page title: the PageHeader's h1 on a desktop, the TopNavigation's large title on a phone (the same words). */
  title: string;
  /** What the page is for, under the title. On a phone it opens the page. */
  description?: ReactNode;
  /** Next to the title, e.g. the year Chip of Public holidays. On a phone it sits under the description. */
  meta?: ReactNode;
  /** The page's Primary, a create action: a Primary "+" button on a desktop, a "+" with the same name in the phone bar.
   *  `ref` reaches the desktop button (focus returns there). */
  primary?: { label: string; onClick: () => void; ref?: Ref<HTMLButtonElement> };
  /** Tertiary actions before the Primary (Export): buttons on a desktop, the ⋯ More sheet on a phone. */
  secondary?: Array<{ id: string; label: string; icon: IconName; onClick: () => void }>;
  /** The page's views, a <Tabs>: the header's Sections on a desktop, the TopNavigation's control bar on a phone. */
  tabs?: ReactNode;
}

export interface HrShellProps {
  /** The module the page belongs to: Home shows the icon rail, a module its own navigation. */
  module: HrModule;
  /** Id of the current page in the module's navigation (e.g. "my-leaves"). */
  page?: string;
  /** Header Breadcrumbs after Home (the last one is the current page). Default: derived from `module` and `page`. */
  crumbs?: string[];
  /** A module item, a rail module, Back, a crumb or a notification was picked; the template decides what to show. */
  onNavigate?: HrNavigate;
  /** The page's own header (title, description, actions, views). Home has none: Zen AI's greeting is its title. */
  pageHeader?: HrPageHeader;
  /** The page's Side Panel, docked beside it (a modal panel on a phone); the shell's own panels take its place while open. */
  sidePanel?: ReactNode;
  /** The live count for the module's Approvals counter, when the page decides requests itself (Approve / Reject with
   *  Undo): the counter follows the page instead of the sample data. Default: the sample data's count. */
  approvals?: number;
  children?: ReactNode;
}

type Panel = "inbox" | "profile" | "assistant";
type Sheet = "account" | "more";
type Message = { id: number; side: "you" | "ai"; text: string; file?: string };

/** The solid twin of each navigation icon: the selected tab shows it, the others the line icon (one family). */
const selectedIcons: Record<string, IconName> = {
  "icon-home-03-line": "icon-home-03-solid",
  "icon-user-square-line": "icon-user-square-solid",
  "icon-users-line": "icon-users-solid",
  "icon-file-doc-line": "icon-file-doc-solid",
  "icon-send-01-line": "icon-send-01-solid",
  "icon-check-done-line": "icon-check-done-solid",
  "icon-calendar-line": "icon-calendar-solid",
  "icon-dataflow-03-line": "icon-dataflow-03-solid",
  "icon-pie-chart-03-line": "icon-pie-chart-03-solid",
  "icon-coin-02-line": "icon-coin-02-solid",
  "icon-coins-stacked-02-line": "icon-coins-stacked-02-solid",
  "icon-check-square-broken-line": "icon-check-square-solid",
  "icon-settings-03-line": "icon-settings-03-solid",
};

/** The phone's tab bar holds up to four pages, then More. */
const TAB_PAGES = 4;

/**
 * The phone's tab bar (Bottom-Navigation) for a Sidebar's rows: its first pages (up to four), with the same labels and an
 * unread dot for a counter, then More, which opens the whole Sidebar in the drawer. Configurations (a row with
 * sub-pages or a dropdown) are settings and stay in the Sidebar (component-usage-rules §17). A page that is not a tab
 * selects More.
 */
function tabsFor(rows: SidebarItem[], selectedId: string): { items: BottomNavigationItem[]; value: string } {
  const pages = rows.filter((item) => !item.children?.length && !item.dropdown).slice(0, TAB_PAGES);
  return {
    items: [
      ...pages.map((item) => ({ id: item.id, label: item.label, icon: item.icon as IconName, selectedIcon: selectedIcons[item.icon as string], dot: Boolean(item.counter) })),
      { id: "more", label: "More", icon: "icon-dots-horizontal-line" },
    ],
    value: pages.some((item) => item.id === selectedId) ? selectedId : "more",
  };
}

/** A menu's actions in order, without its groups and separators: the rows of the phone's action sheets. */
const menuActions = (entries: Array<MenuEntry>): MenuItemData[] =>
  entries.flatMap((entry) => (entry.type === "group" ? menuActions(entry.items) : entry.type === "separator" ? [] : [entry]));

/** On the mobile shell the TopNavigation holds the title, so the PageHeader's description (and meta) open the page. */
function HrPhoneIntro({ description, meta }: Pick<HrPageHeader, "description" | "meta">) {
  const mobile = useAppShell()?.layout === "mobile";
  if (!mobile || (!description && !meta)) return null;
  return (
    <Stack gap="sm" align="start">
      {description ? <Text tone="base">{description}</Text> : null}
      {meta}
    </Stack>
  );
}

/** The HR app frame: AppShell + the HR Sidebar + the header, the phone bars and the panels. */
export function HrShell({ module, page, crumbs, onNavigate: onNavigateProp, pageHeader, sidePanel, approvals, children }: HrShellProps) {
  const { toast } = useToast();
  const router = useContext(HrRouterContext);
  const onNavigate = router ?? onNavigateProp;
  const [panel, setPanel] = useState<Panel | null>(null);
  // The phone's drawer (the whole Sidebar, from the tab bar's More) and its sheets (the account, the page's More).
  const [navOpen, setNavOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const go: HrNavigate = (target) => { setPanel(null); setNavOpen(false); onNavigate?.(target); };
  const notInDemo = (label: string) => toast({ title: `${label} isn't part of this demo` });
  // Apps in every Sidebar footer: a Sidebar row (Figma Footer-Content Menu-Item), so the rail shows its icon alone with
  // the label as its name and 1s tooltip. It reaches the Sidebar's onItemClick as "apps".
  const appsItem = <SidebarMenuItem id="apps" label="Apps" icon="icon-shop-store-line" />;

  // Inbox: opening it reads everything; the rows that were new keep their badge until it closes.
  const [unread, setUnread] = useState(() => inboxItems.filter((item) => item.unread).map((item) => item.id));
  const [fresh, setFresh] = useState<string[]>([]);
  const toggle = (next: Panel) => {
    if (next === "inbox" && panel !== "inbox") { setFresh(unread); setUnread([]); }
    setPanel((open) => (open === next ? null : next));
  };

  // Spaces added here join the Workbench navigation.
  const [spaces, setSpaces] = useState<SidebarItem[]>([]);
  const [addingSpace, setAddingSpace] = useState(false);
  const spaceForm = useFormState({
    initialValues: { name: "" },
    validate: (values) => ({ name: values.name.trim() ? undefined : "Enter a space name, like Research" }),
    onSubmit: (values, { reset }) => {
      const name = values.name.trim();
      setSpaces((list) => [...list, spaceItem({ id: `new-${Date.now()}`, name, initial: name.charAt(0).toUpperCase(), theme: "teal" })]);
      setAddingSpace(false); reset();
      toast({ title: "Space created", children: name });
    },
  });

  // Zen AI: one greeting with today's summary, then canned answers from ./data.
  const [messages, setMessages] = useState<Message[]>(() => [{ id: 0, side: "ai", text: `Hi ${currentUser.name.split(" ")[0]}. ${assistantAnswer("")}` }]);
  // "+" picks a file that goes out with the next prompt; the microphone fills the prompt with what it heard (a set
  // sentence in this sample) and leaves the caret at its end.
  const [file, setFile] = useState<string | null>(null);
  const attach = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,application/pdf";
    input.onchange = () => { const picked = input.files?.[0]; if (picked) setFile(picked.name); };
    input.click();
  };
  const fieldRef = useRef<HTMLElement>(null);
  const [dictation, setDictation] = useState({ key: 0, text: "" });
  useEffect(() => {
    const prompt = dictation.key ? fieldRef.current?.querySelector("textarea") : null;
    prompt?.focus();
    prompt?.setSelectionRange(prompt.value.length, prompt.value.length);
  }, [dictation.key]);
  const ask = (text: string) => {
    const attached = file ?? undefined;
    setFile(null);
    setMessages((list) => [...list, { id: list.length, side: "you", text, file: attached }, { id: list.length + 1, side: "ai",
      text: attached ? `I have ${attached}. I can file it as an expense claim, or add it to a sick leave request as a doctor's note.` : assistantAnswer(text) }]);
  };

  const current = module === "home" ? null : hrModules[module];
  const trail = [{ id: "home", label: "Home" }, ...(crumbs ? crumbs.map((label, index) => ({ id: `crumb-${index}`, label })) : crumbsFor(module, page))];
  const annual = myLeaveBalances.find((balance) => balance.kind === "annual");

  const settingsItems: MenuEntry[] = [
    { type: "group", label: "Time off", items: [
      { id: "leave-types", label: "Leave types", icon: "icon-calendar-heart-line", onSelect: () => go({ module: "time-off", page: "leave-types" }) },
      { id: "public-holiday", label: "Public holidays", icon: "icon-calendar-line", onSelect: () => go({ module: "time-off", page: "public-holiday" }) },
    ] },
    { type: "group", label: "Expenses", items: [
      { id: "expense-configurations", label: "Expense policies", icon: "icon-coin-02-line", onSelect: () => go({ module: "expenses", page: "configurations" }) },
    ] },
  ];
  const accountItems: MenuEntry[] = [
    { id: "profile", label: "My profile", icon: "icon-user-square-line", onSelect: () => setPanel("profile") },
    { type: "separator" },
    { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => notInDemo("Signing out") },
  ];

  // The workspace logo alone, centred in every rail: Home's, and a module's when the header's toggle collapses it.
  const workspaceMark = <Avatar size="small" shape="square" theme="photo" src={workspace.logo} alt={workspace.name} />;
  // The expanded header of every Sidebar, Home's too when the header's toggle opens its rail: the workspace logo, name over email.
  const workspaceBrand = (
    <Stack direction="row" gap="xs" align="center" style={{ width: "100%" }}>
      <Avatar size="small" shape="square" theme="photo" src={workspace.logo} alt="" />
      <Stack gap="none" style={{ minWidth: 0, flex: 1 }}>
        <Text as="span" textStyle="Body/Base/Bold" truncate>{workspace.name}</Text>
        <Text as="span" textStyle="Caption/Regular" tone="light" truncate>{workspace.email}</Text>
      </Stack>
    </Stack>
  );
  const backHome = <IconButton appearance="main" level="tertiary" size="sm" aria-label="Back to Home" icon={<Icon name="icon-chevron-left-line-medium" />} onClick={() => go({ module: "home" })} />;
  // The module's navigation, shared by its Sidebar and the phone's tab bar. Spaces carry one section action: add a space.
  const navSections = current ? current.sections.map((section) => section.label === "Spaces"
    ? { ...section, items: [...section.items, ...spaces], action: <IconButton appearance="flat" level="primary" size="sm" aria-label="New space" icon="icon-plus-line" onClick={() => { setNavOpen(false); spaceForm.reset(); setAddingSpace(true); }} /> }
    : approvals === undefined ? section
      : { ...section, items: section.items.map((item) => (item.id === "approvals" ? { ...item, counter: approvals || undefined } : item)) }) : railSections;
  const sidebar = current ? (
    <Sidebar
      aria-label={`${current.title} navigation`}
      brand={workspaceBrand}
      logoCollapsed={workspaceMark}
      search={(
        // Back (Button/Icon-Main Small Tertiary) over the module name.
        <Stack gap="md" paddingX="sm" paddingY="2xs">
          {backHome}
          <Heading level={2} textStyle="Heading/4">{current.title}</Heading>
        </Stack>
      )}
      // The collapsed rail keeps the Back chevron (not a Search button).
      searchCollapsed={backHome}
      sections={navSections}
      selectedId={page}
      onItemClick={(item) => (item.id === "apps" ? notInDemo(item.label) : go({ module, page: item.id }))}
      footer={appsItem}
    />
  ) : (
    <Sidebar
      aria-label="Modules"
      collapsed
      brand={workspaceBrand}
      logoCollapsed={workspaceMark}
      sections={railSections}
      selectedId={panel === "profile" ? "profile" : "home"}
      onItemClick={(item) => {
        if (item.id === "time-off" || item.id === "expenses" || item.id === "workbench") go({ module: item.id });
        else if (item.id === "profile") toggle("profile");
        else if (item.id === "home") setPanel(null);
        else notInDemo(item.label);
      }}
      footer={appsItem}
    />
  );

  const close = (open: boolean) => { if (!open) setPanel(null); };
  const panels: Record<Panel, ReactNode> = {
    inbox: (
      <SidePanel type="standard" title="Inbox" open onOpenChange={close}>
        {/* A person's update leads with their Avatar, a system update with a Dock Icon of the same size (Medium). The panel
            body scrolls with no top padding: sm above and below holds the first and last row's fill (12px outside them). */}
        <Box paddingY="sm">
          <List aria-label="Notifications">
            {inboxItems.map((item) => (
              <ListItem key={item.id} title={item.title} caption={<>{item.caption}<br />{formatRelative(item.at)}</>}
                leading={item.person ? <Avatar size="md" background="subtle" {...avatarOf(people[item.person])} alt="" /> : <DockIcon icon={item.icon} theme={item.theme} background="subtle" size="md" />}
                trailing={fresh.includes(item.id) ? <Badge size="sm" theme="accent" background="subtle">New</Badge> : undefined}
                onClick={() => go(item.target)} />
            ))}
          </List>
        </Box>
      </SidePanel>
    ),
    profile: (
      <SidePanel type="standard" title={currentUser.name} description={`${currentUser.role} · ${teams[currentUser.team].name}`} open onOpenChange={close}>
        <Stack gap="lg">
          <Avatar size="xl" {...avatarOf(currentUser)} alt="" />
          <DescriptionList divider items={[
            { id: "email", term: "Email", description: currentUser.email },
            { id: "office", term: "Office", description: currentUser.city },
            { id: "manager", term: "Manager", description: currentUser.manager ? people[currentUser.manager].name : "None" },
            { id: "joined", term: "Joined", description: formatDate(currentUser.joined) },
            { id: "leave", term: "Annual leave left", description: annual ? formatDays(annual.available) : "None" },
          ]} />
        </Stack>
      </SidePanel>
    ),
    assistant: (
      <SidePanel type="standard" title="Zen AI" open onOpenChange={close}>
        <Stack gap="lg">
          <AiChatThread aria-label="Conversation with Zen AI">
            {messages.map((message) => (
              <AiChatBubble key={message.id} side={message.side}>
                {/* A prompt sent with a file shows the file above it. */}
                {message.file ? (
                  <Stack gap="xs" align="end">
                    <Stack direction="row" gap="2xs" align="center">
                      <FileIcon format={fileIconFormatOf(message.file)} />
                      <Text as="span" textStyle="Body/Base/Medium">{message.file}</Text>
                    </Stack>
                    <Text as="span">{message.text}</Text>
                  </Stack>
                ) : message.text}
              </AiChatBubble>
            ))}
          </AiChatThread>
          {file ? (
            <Stack direction="row" gap="2xs">
              <Tag leading={<FileIcon format={fileIconFormatOf(file)} />} remove onRemove={() => setFile(null)}>{file}</Tag>
            </Stack>
          ) : null}
          <Box ref={fieldRef}>
            <AiChatField key={dictation.key} defaultValue={dictation.text} placeholder="Ask Zen AI" onSubmit={ask}
              onAttach={attach} onVoice={() => setDictation((current) => ({ key: current.key + 1, text: "How many days of leave do I have left?" }))} />
          </Box>
        </Stack>
      </SidePanel>
    ),
  };

  // The phone keeps every header action (component-usage-rules §17): the account sheet holds the account menu, the
  // Settings menu and the plan; the bar holds the page's "+" and the Inbox, and ⋯ More the page's other actions.
  const sheetActions: Record<Sheet, MenuItemData[]> = {
    account: [
      ...menuActions(accountItems).filter((item) => item.id !== "sign-out"),
      ...menuActions(settingsItems),
      { id: "plan", label: "Plan", icon: "icon-package-line", onSelect: () => notInDemo("Plans and billing") },
      ...menuActions(accountItems).filter((item) => item.id === "sign-out"),
    ],
    more: (pageHeader?.secondary ?? []).map((action) => ({ id: action.id, label: action.label, icon: action.icon, onSelect: action.onClick })),
  };
  const sheetItems = (open: Sheet): BottomSheetItem[] => sheetActions[open].map((item) => ({ id: item.id, label: item.label, icon: item.icon,
    trailing: item.id === "plan" ? <Badge size="sm" theme="neutral" background="subtle" leadingIcon={false}>{workspace.plan}</Badge> : undefined }));
  const runSheet = (open: Sheet) => (item: BottomSheetItem) => sheetActions[open].find((action) => action.id === item.id)?.onSelect?.();
  const closeSheet = (open: boolean) => { if (!open) setSheet(null); };
  const tabs = tabsFor(current ? navSections[0].items : navSections.flatMap((section) => section.items), current ? page ?? "" : panel === "profile" ? "profile" : "home");
  const title = pageHeader?.title;
  const phoneActions: TopNavigationAction[] = [
    ...(pageHeader?.primary ? [{ icon: "icon-plus-line" as const, label: pageHeader.primary.label, onClick: pageHeader.primary.onClick }] : []),
    { icon: "ic-inbox-01-line", label: unread.length ? `Inbox, ${unread.length} new` : "Inbox", dot: unread.length > 0, onClick: () => toggle("inbox") },
    ...(pageHeader?.secondary?.length ? [{ icon: "icon-dots-horizontal-line" as const, label: "More actions", onClick: () => setSheet("more") }] : []),
  ];

  return (
    <AppShell
      sidebar={sidebar}
      navOpen={navOpen}
      onNavOpenChange={setNavOpen}
      header={(
        <AppShellHeader
          // The top row: the collapse toggle, then the trail from Home (no Master crumb beside the toggle)…
          leading={<Breadcrumbs master={false} items={trail} onNavigate={(item, event) => {
            event.preventDefault();
            if (item.id === "home" || module === "home") go({ module: "home" });
            else go({ module });
          }} />}
          // …then utilities only: the plan, Settings, the Inbox with its unread count, the account menu last.
          actions={<>
            <Badge size="md" theme="neutral" background="subtle" leading="icon-package-solid">{workspace.plan}</Badge>
            <Menu align="end" trigger={<AppShellAction icon="icon-settings-01-line" aria-label="Settings" />} items={settingsItems} />
            <AppShellAction icon="ic-inbox-01-line" aria-label="Inbox" count={unread.length} aria-expanded={panel === "inbox"} onClick={() => toggle("inbox")} />
            <Menu align="end" trigger={<AppShellAccount name={currentUser.name} src={currentUser.photo} />} items={accountItems} />
          </>}
          // The Main row: the page's own header, its Tertiary actions before the one Primary.
          main={pageHeader ? (
            <PageHeader title={pageHeader.title} description={pageHeader.description} meta={pageHeader.meta}
              actions={pageHeader.primary || pageHeader.secondary?.length ? <>
                {pageHeader.secondary?.map((action) => <Button key={action.id} level="tertiary" startIcon={action.icon} onClick={action.onClick}>{action.label}</Button>)}
                {pageHeader.primary ? <Button ref={pageHeader.primary.ref} level="primary" startIcon="icon-plus-line" onClick={pageHeader.primary.onClick}>{pageHeader.primary.label}</Button> : null}
              </> : undefined} />
          ) : undefined}
          sections={pageHeader?.tabs}
        />
      )}
      // Mobile: a root's bar (the account, the page title, its actions) and the tab bar. Home's title is Zen AI's greeting.
      topNavigation={(
        <TopNavigation aria-label={title ?? "Home"} title={title} largeTitle={title} controlBar={pageHeader?.tabs} trailing={phoneActions}
          leading={<AppShellAccount name={currentUser.name} src={currentUser.photo} aria-haspopup="dialog" aria-expanded={sheet === "account"} onClick={() => setSheet("account")} />} />
      )}
      bottomNavigation={(
        <BottomNavigation aria-label={current ? `${current.title} navigation` : "Modules"} showLabels items={tabs.items} value={tabs.value}
          onValueChange={(id) => {
            if (id === "more") setNavOpen(true);
            else if (current) go({ module, page: id });
            else if (id === "profile") toggle("profile");
            else if (id === "home") setPanel(null);
            else notInDemo(tabs.items.find((item) => item.id === id)?.label ?? id);
          }} />
      )}
      sidePanel={panel ? panels[panel] : sidePanel}
      // zen-allow-accent: the promoted assistant launcher. Home shows the assistant inline, so only modules float it.
      floatingActions={module === "home" ? undefined : <IconButton level="accent" icon="icon-zen" aria-label="Ask Zen AI" aria-expanded={panel === "assistant"} onClick={() => toggle("assistant")} />}
    >
      <HrPhoneIntro description={pageHeader?.description} meta={pageHeader?.meta} />
      {children}
      <ModalForm open={addingSpace} onOpenChange={setAddingSpace} title="New space" onSubmit={spaceForm.handleSubmit}
        primaryAction={{ label: "Create space" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Name" placeholder="Research" autoComplete="off" {...spaceForm.field("name")} />
      </ModalForm>
      {/* Phone: the account sheet (from the bar's avatar) and the page's ⋯ More. */}
      <BottomSheet type="action" open={sheet === "account"} onOpenChange={closeSheet} title={currentUser.name} items={sheetItems("account")} onSelect={runSheet("account")} />
      {pageHeader?.secondary?.length ? (
        <BottomSheet type="action" open={sheet === "more"} onOpenChange={closeSheet} title="More actions" items={sheetItems("more")} onSelect={runSheet("more")} />
      ) : null}
    </AppShell>
  );
}
