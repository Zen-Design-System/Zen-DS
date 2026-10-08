/**
 * HR shell: the app frame every HR template page shares. Copy the folder (with ./data and ./assets) into your app and
 * keep one shell for all pages. Render it inside your app's <ZenProvider>. Uses only @zen-ds/react components,
 * no custom CSS.
 *
 * - Home: the Sidebar as an icon rail, one icon per module; the top bar's toggle opens it with the same workspace header.
 * - A module (Time off, Expenses, Workbench): the expanded Sidebar with the workspace in the header, Back and the module
 *   name above its items (approval counters on Approvals), and Apps in the footer.
 * - Top bar: the sidebar toggle and Breadcrumbs (derived from the module and page) lead; the plan Badge, the Settings
 *   menu, the Inbox with its unread count and the account menu close it.
 * - Panels docked on the right: the Inbox, My profile and, on module pages, the Zen AI assistant (Home has it inline).
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AiChatBubble,
  AiChatField,
  AiChatThread,
  AppShell,
  AppShellAccount,
  AppShellAction,
  Avatar,
  Badge,
  Box,
  Breadcrumbs,
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
  SidePanel,
  Sidebar,
  Stack,
  Tag,
  Text,
  fileIconFormatOf,
  useFormState,
  useToast,
  type AvatarTheme,
  type MenuEntry,
  type SidebarItem,
  type SidebarSection,
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

export interface HrShellProps {
  /** The module the page belongs to: Home shows the icon rail, a module its own navigation. */
  module: HrModule;
  /** Id of the current page in the module's navigation (e.g. "my-leaves"). */
  page?: string;
  /** Top-bar Breadcrumbs after Home (the last one is the current page). Default: derived from `module` and `page`. */
  crumbs?: string[];
  /** A module item, a rail module, Back, a crumb or a notification was picked; the template decides what to show. */
  onNavigate?: HrNavigate;
  /** Extra aside next to the page (a docked Side Panel); the shell's own panels take it while open. */
  aside?: ReactNode;
  children?: ReactNode;
}

type Panel = "inbox" | "profile" | "assistant";
type Message = { id: number; side: "you" | "ai"; text: string; file?: string };

/** The HR app frame: AppShell + the HR Sidebar + the top bar and its panels. */
export function HrShell({ module, page, crumbs, onNavigate: onNavigateProp, aside, children }: HrShellProps) {
  const { toast } = useToast();
  const router = useContext(HrRouterContext);
  const onNavigate = router ?? onNavigateProp;
  const [panel, setPanel] = useState<Panel | null>(null);
  const go: HrNavigate = (target) => { setPanel(null); onNavigate?.(target); };
  const notInDemo = (label: string) => toast({ title: `${label} isn't part of this demo` });
  // Apps in every Sidebar footer: the rail hides its label visually and shows it as the 1s tooltip.
  const appsButton = <button type="button" onClick={() => notInDemo("Apps")}><Icon name="icon-shop-store-line" size="base" /><span>Apps</span></button>;

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

  // The workspace logo alone, centred in every rail: Home's, and a module's when the top bar collapses it.
  const workspaceMark = <Avatar size="small" shape="square" theme="photo" src={workspace.logo} alt={workspace.name} />;
  // The expanded header of every Sidebar, Home's too when the top bar opens its rail: the workspace logo, name over email.
  const workspaceBrand = (
    <Stack direction="row" gap="xs" align="center" style={{ width: "100%" }}>
      <Avatar size="small" shape="square" theme="photo" src={workspace.logo} alt="" />
      <Stack gap="none" style={{ minWidth: 0, flex: 1 }}>
        <Text as="span" textStyle="Body/Base/Bold" truncate>{workspace.name}</Text>
        <Text as="span" textStyle="Caption/Regular" tone="light" truncate>{workspace.email}</Text>
      </Stack>
    </Stack>
  );
  const sidebar = current ? (
    <Sidebar
      aria-label={`${current.title} navigation`}
      brand={workspaceBrand}
      logoCollapsed={workspaceMark}
      search={(
        // Back (Button/Icon-Main Small Tertiary) over the module name.
        <Stack gap="md" paddingX="sm" paddingY="2xs">
          <IconButton appearance="main" level="tertiary" size="sm" aria-label="Back to Home" icon={<Icon name="icon-chevron-left-line-medium" />} onClick={() => go({ module: "home" })} />
          <Heading level={2} textStyle="Heading/4">{current.title}</Heading>
        </Stack>
      )}
      // Spaces carry one section action: add a space.
      sections={current.sections.map((section) => section.label === "Spaces"
        ? { ...section, items: [...section.items, ...spaces], action: <IconButton appearance="flat" level="primary" size="sm" aria-label="New space" icon="icon-plus-line" onClick={() => { spaceForm.reset(); setAddingSpace(true); }} /> }
        : section)}
      selectedId={page}
      onItemClick={(item) => go({ module, page: item.id })}
      footer={appsButton}
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
      footer={appsButton}
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

  return (
    <AppShell
      sidebar={sidebar}
      header={<Breadcrumbs master={false} items={trail} onNavigate={(item, event) => {
        event.preventDefault();
        if (item.id === "home" || module === "home") go({ module: "home" });
        else go({ module });
      }} />}
      headerActions={<>
        <Badge size="md" theme="neutral" background="subtle" leading="icon-package-solid">{workspace.plan}</Badge>
        <Menu align="end" trigger={<AppShellAction icon="icon-settings-01-line" aria-label="Settings" />} items={settingsItems} />
        <AppShellAction icon="ic-inbox-01-line" aria-label="Inbox" count={unread.length} aria-expanded={panel === "inbox"} onClick={() => toggle("inbox")} />
        <Menu align="end" trigger={<AppShellAccount name={currentUser.name} src={currentUser.photo} />} items={accountItems} />
      </>}
      aside={panel ? panels[panel] : aside}
      // zen-allow-accent: the promoted assistant launcher. Home shows the assistant inline, so only modules float it.
      floatingAction={module === "home" ? undefined : <IconButton level="accent" icon="icon-zen" aria-label="Ask Zen AI" aria-expanded={panel === "assistant"} onClick={() => toggle("assistant")} />}
    >
      {children}
      <ModalForm open={addingSpace} onOpenChange={setAddingSpace} title="New space" onSubmit={spaceForm.handleSubmit}
        primaryAction={{ label: "Create space" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Name" placeholder="Research" autoComplete="off" {...spaceForm.field("name")} />
      </ModalForm>
    </AppShell>
  );
}
