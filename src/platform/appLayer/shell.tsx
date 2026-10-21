import { Fragment, useEffect, useId, useLayoutEffect, useState, type FormEvent, type ReactNode } from "react";
import { ActionBar } from "../../components/ActionBar";
import { AlertBanner } from "../../components/AlertBanner";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader, AppShellPane, useAppShell, type AppShellCollapse, type AppShellMobileTop, type AppShellPattern } from "../../components/AppShell";
import { Avatar, AvatarStack } from "../../components/Avatar";
import { Badge } from "../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../components/BottomNavigation";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { Button, IconButton } from "../../components/Button";
import { Card } from "../../components/Card";
import { Chip } from "../../components/Chip";
import { DashboardHeader } from "../../components/DashboardHeader";
import { DescriptionList } from "../../components/DescriptionList";
import { DockIcon } from "../../components/DockIcon";
import { EmptyState } from "../../components/EmptyState";
import type { IconName } from "../../components/Icon";
import { Image, Thumbnail } from "../../components/Image";
import { InputField, SelectField, TextAreaField } from "../../components/Input";
import { Box, Grid, Stack } from "../../components/Layout";
import { List, ListItem } from "../../components/ListItem";
import { Menu, type MenuEntry } from "../../components/Menu";
import { PageHeader } from "../../components/PageHeader";
import { Search } from "../../components/Search";
import { Segmented } from "../../components/Segmented";
import { SidePanel } from "../../components/SidePanel";
import { Sidebar, type SidebarSection } from "../../components/Sidebar";
import { Stepper } from "../../components/Stepper";
import { Table, TableMedia, TableText, type TableColumn } from "../../components/Table";
import { Tabs } from "../../components/Tabs";
import { Heading, Text, plural } from "../../components/Text";
import { TopNavigation, type TopNavigationAction } from "../../components/TopNavigation";
import { daysFromToday, formatDate, formatDay, formatRange, formatRelative, initials, leaveBalance, leaveRequests, leaveStatusTheme, me, people, peopleList, projectStatusTheme, projects, studio, type Person, type PersonId, type Team } from "../examples/data";
import { StudioLogo } from "../PlatformFrames";
import { platformMedia } from "../PlatformMedia";
import { PlatformPhone } from "../PlatformPhone";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, keepOnHotUpdate, option } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";
import "./shell.css";

/* ───────────── Sample data: Đìzai Studio's Zen app (examples/data), signed in as Alex Duong, Wed Sep 30, 2026 ───────────── */

type NavPage = "home" | "projects" | "people" | "time-off";
const navPages: Record<NavPage, { label: string; icon: IconName; selectedIcon: IconName }> = {
  home: { label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  projects: { label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
  people: { label: "People", icon: "icon-users-line", selectedIcon: "icon-users-solid" },
  "time-off": { label: "Time off", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
};
const navIds = Object.keys(navPages) as NavPage[];
/* The same four roots are the Sidebar's rows, the Top-Bar's Tabs and the phone's Tab-Bar (component-usage-rules §17). */
const navSections: SidebarSection[] = [{ items: navIds.map((id) => ({ id, label: navPages[id].label, icon: navPages[id].icon })) }];
const roots: BottomNavigationItem[] = navIds.map((id) => ({ id, ...navPages[id] }));

const teams: Team[] = ["Design", "Engineering", "Delivery", "Client Services", "Operations"];
const directory = [...peopleList].sort((a, b) => a.name.localeCompare(b.name));
const teamOf = (team: Team | "all") => (team === "all" ? directory : directory.filter((person) => person.team === team));
const firstName = (person: Person) => person.name.split(" ")[0];
/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const awayOf = (person: Person) => leaveRequests.find((request) => request.person === person.id && request.status !== "Declined");
const projectsOf = (person: Person) => projects.filter((project) => project.members.includes(person.id as PersonId));

/** The pages the sample navigation has besides People: an empty state in product copy with its one next step. */
const emptyPages: Record<Exclude<NavPage, "people">, { title: string; body: string; action: string; icon: IconName }> = {
  home: { title: "Welcome to Đìzai Studio", body: "Pin the projects and people you check every day, and they show up here.", action: "Pin a project", icon: "icon-home-03-line" },
  projects: { title: "No projects yet", body: "Projects you create show up here for the whole studio.", action: "New project", icon: "icon-folder-line" },
  "time-off": { title: "No time off booked", body: `You have ${leaveBalance["Annual leave"]?.left ?? 0} days of annual leave left this year.`, action: "Request time off", icon: "icon-calendar-line" },
};

const accountItems: MenuEntry[] = [
  { id: "profile", label: "Profile", icon: "icon-user-circle-line" },
  { id: "preferences", label: "Preferences", icon: "icon-settings-01-line" },
  { type: "separator" },
  { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line" },
];

/* Workspace: Saola Outdoor's brand refresh moodboard, the shots in the leading pane and the review in the trailing one. */
const shotNames = ["Sunset field", "Forest creek", "Balloon over palms", "Mountain road", "Snow peaks", "Desert hills", "Coast road", "Moss and shrubs"];
const shotAuthors: PersonId[] = ["gia", "emi", "linh", "gia", "emi", "linh", "gia", "emi"];
const shots = platformMedia.feed.map((photo, index) => ({ id: `shot-${index + 1}`, name: shotNames[index] ?? photo.alt, ...photo, by: shotAuthors[index] ?? "gia", added: daysFromToday(-1 - (index % 3), 9 + index, 15) }));
type Comment = { id: string; author: PersonId; text: string; at: Date; resolved?: boolean };
const moodboardComments: Comment[] = [
  { id: "c1", author: "emi", text: "The sunset field is the warmest of the set: open the deck with it?", at: daysFromToday(0, 9, 10) },
  { id: "c2", author: "linh", text: "Saola’s guides wear green, so the forest creek matches the uniforms.", at: daysFromToday(0, 8, 45) },
  { id: "c3", author: "gia", text: "Dropping the desert shot: Saola runs no desert routes.", at: daysFromToday(-1, 17, 30), resolved: true },
];

/* Docs: the studio handbook. */
const chapters: { id: string; title: string; sections: { id: string; title: string; text: string }[] }[] = [
  { id: "welcome", title: "Welcome to Đìzai", sections: [
    { id: "who", title: "Who we are", text: "A product design studio of 14 people in Ho Chi Minh City, Hanoi and Singapore, plus two teammates who work remotely. We design and build apps for banks, retailers and travel companies." },
    { id: "first-week", title: "Your first week", text: "Your lead books a kickoff on Monday, IT hands over your laptop by 10:00 am, and you sit in on a client review before Friday." },
    { id: "ask", title: "Where to ask", text: "Post in #ask-people-ops for leave, payroll and equipment. Minh Anh answers within a working day." },
  ] },
  { id: "leave", title: "Leave and time off", sections: [
    { id: "allowance", title: "Your allowance", text: `Everyone gets ${leaveBalance["Annual leave"]?.perYear ?? 0} days of annual leave a year and ${leaveBalance["Sick leave"]?.perYear ?? 0} days of sick leave. Unused annual leave carries over until the end of March.` },
    { id: "asking", title: "Asking for leave", text: "Ask in Zen at least two weeks ahead for anything longer than three days. Your team lead approves it, usually within a day; you’ll see who else is away before you send it." },
    { id: "sick", title: "When you’re sick", text: "Tell your lead before 10:00 am and log it when you’re back. From the third day in a row we need a doctor’s note." },
    { id: "holidays", title: "Public holidays", text: "The studio follows Vietnam’s public holidays, including five days for Tết. Remote teammates follow their own country’s calendar." },
  ] },
  { id: "expenses", title: "Expenses", sections: [
    { id: "claim", title: "What you can claim", text: "Client travel, meals with clients, books and courses your lead agreed to, and one coworking day a week when you work remotely." },
    { id: "receipts", title: "Receipts", text: "Snap the receipt in the Zen app the day you pay. Claims over 500,000 ₫ without a receipt wait for Finance." },
    { id: "paid", title: "Getting paid back", text: "Approved claims are paid with the next salary, on the 25th of each month." },
  ] },
  { id: "equipment", title: "Equipment", sections: [
    { id: "laptop", title: "Your laptop", text: "Designers get a 14-inch MacBook Pro and engineers a 16-inch one. IT replaces them every three years." },
    { id: "home-office", title: "Home office", text: "A 3,000,000 ₫ budget in your first year covers a chair, a monitor or a desk lamp." },
    { id: "returning", title: "Returning equipment", text: "When you leave, bring the laptop and its charger to IT on your last day; what you bought from the home office budget stays yours." },
  ] },
];

/* Focus: inviting a new teammate, three steps. */
const inviteSteps = [{ id: "details", title: "Details" }, { id: "access", title: "Access" }, { id: "review", title: "Review" }];
const inviteCopy = ["Who joins the studio, and which team they sit with.", "What they can see and change in Zen on their first day.", "Check it once more: the invite goes out by email."];
const accessOptions = [{ value: "Member", label: "Member · sees their projects" }, { value: "Admin", label: "Admin · manages people and billing" }, { value: "Guest", label: "Guest · one project, read-only" }];
type Invite = { name: string; email: string; team: Team; access: string; project: string };
const blankInvite: Invite = { name: "", email: "", team: "Design", access: "Member", project: projects[0].id };

/* ───────────── Builder parts ───────────── */

/** A part of the shell: what renders, and the code the builder prints for it (same props, the content summarised). */
type Part = { node: ReactNode; code: string };
const part = (node: ReactNode, code: string): Part => ({ node, code });
/** Indents every line after the first, so a multi-line part sits under the prop that holds it. */
const indent = (code: string, by: string) => code.split("\n").map((line, index) => (index === 0 ? line : by + line)).join("\n");
/** One element, or a fragment of several on their own lines. */
const group = (items: string[]) => (items.length === 1 ? items[0] : `<>\n${items.map((item) => `  ${indent(item, "  ")}`).join("\n")}\n</>`);
/** A JSX prop: on one line, or a multi-line element on its own lines between the braces. */
const attr = (name: string, value: string) => (value.includes("\n") && value.startsWith("<") && !value.startsWith("<>") ? `${name}={\n  ${indent(value, "  ")}\n}` : `${name}={${value}}`);

/** The width of an element, kept current: tables fold their columns when the page gets narrow (a phone, the panes). */
function useWidth() {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, width] as const;
}

/** A preview frame: the shell fills it instead of the whole viewport and scrolls inside it. The outer box contains layout,
 *  so the navigation drawer covers the frame, not the docs page; the inner box scrolls. */
function ShellFrame({ children, height }: { children: ReactNode; height: number }) {
  return <div className="pash-frame" style={{ height }}><div className="pash-frame__scroll">{children}</div></div>;
}

type WindowId = "1440" | "1280" | "1180" | "ipad" | "phone";
const windows: Record<WindowId, { label: string; width: number; height: number }> = {
  1440: { label: "Desktop · 1440", width: 1440, height: 900 },
  1280: { label: "Laptop · 1280", width: 1280, height: 800 },
  1180: { label: "iPad landscape · 1180", width: 1180, height: 820 },
  ipad: { label: "iPad portrait · 820", width: 820, height: 1180 },
  phone: { label: "Phone · 390", width: 390, height: 844 },
};

/** The preview row an element sits in: the room inside its padding, and whether Full screen covers the viewport with it. */
function usePreviewRow(element: HTMLElement | null) {
  const [room, setRoom] = useState(0);
  const [full, setFull] = useState(false);
  useLayoutEffect(() => {
    const row = element?.closest<HTMLElement>(".platform-example-row");
    if (!row) return undefined;
    const update = () => {
      const styles = getComputedStyle(row);
      setRoom(row.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight));
      setFull(row.getAttribute("data-fullscreen") === "true");
    };
    update();
    const resize = new ResizeObserver(update);
    resize.observe(row);
    const fullScreen = new MutationObserver(update);
    fullScreen.observe(row, { attributes: true, attributeFilter: ["data-fullscreen"] });
    return () => { resize.disconnect(); fullScreen.disconnect(); };
  }, [element]);
  return { room, full };
}

/**
 * A desktop window at its real CSS width, scaled down to the preview column (the shell lays out at its own width, so
 * `layout="auto"` picks the same structure an app would). In Full screen it fills the viewport instead.
 */
function DesktopWindow({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const [probe, setProbe] = useState<HTMLSpanElement | null>(null);
  const { room, full } = usePreviewRow(probe);
  const anchor = <span ref={setProbe} hidden />;
  if (full) return <>{anchor}<ShellFrame height={height}>{children}</ShellFrame></>;
  const scale = room > 0 ? Math.min(1, room / width) : 1;
  return (
    <>
      {anchor}
      <div style={{ width: "100%", height: height * scale, visibility: room > 0 ? undefined : "hidden" }}>
        <div style={{ width, height, transform: scale < 1 ? `scale(${scale})` : undefined, transformOrigin: "top left" }}>
          <ShellFrame height={height}>{children}</ShellFrame>
        </div>
      </div>
    </>
  );
}

/** Lines under the preview window; Full screen leaves the viewport to the window. */
function PreviewNotes({ children }: { children: ReactNode }) {
  const [probe, setProbe] = useState<HTMLSpanElement | null>(null);
  const { full } = usePreviewRow(probe);
  return <><span ref={setProbe} hidden />{full ? null : children}</>;
}

/** Focus: the form's own Back · Continue, which a phone with an Action bar leaves to the bar (useAppShell().layout). */
function StepActions({ step, onBack, last, inActionBar }: { step: number; onBack: () => void; last: boolean; inActionBar: boolean }) {
  const shell = useAppShell();
  if (inActionBar && shell?.layout === "mobile") return null;
  return (
    <Stack direction="row" gap="sm" justify="end">
      {step > 0 ? <Button level="tertiary" onClick={onBack}>Back</Button> : null}
      <Button type="submit" level="primary">{last ? "Send invite" : "Continue"}</Button>
    </Stack>
  );
}

/* ───────────── AppShell builder ───────────── */

const patternOptions = [option("sidebar", "Sidebar"), option("list-detail", "List-Detail"), option("top-bar", "Top-Bar"), option("workspace", "Workspace"), option("docs", "Docs"), option("focus", "Focus"), option("grid", "Grid")];
const patternLabel = Object.fromEntries(patternOptions.map((entry) => [entry.id, entry.label])) as Record<AppShellPattern, string>;
type Bottom = "tab-bar" | "floating" | "actions" | "none";
const bottomOptions = [option("tab-bar", "Tab-Bar"), option("floating", "Floating"), option("actions", "Actions"), option("none", "None")];
const topOptions = [option("bar", "Bar"), option("band", "Band"), option("band-sheet", "Band-Sheet"), option("media", "Media")];
const optionLabel = (options: { id: string; label: string }[], id: string) => options.find((entry) => entry.id === id)?.label ?? id;
/** What each pattern's phone screen ends with by default: roots keep the Tab-Bar, a task its actions, reading nothing. */
const defaultBottom: Record<AppShellPattern, Bottom> = { sidebar: "tab-bar", "list-detail": "actions", "top-bar": "tab-bar", workspace: "actions", docs: "none", focus: "actions", grid: "tab-bar" };
const SIDEBAR_PATTERNS: AppShellPattern[] = ["sidebar", "list-detail", "grid"];

function AppShellPlayground() {
  // Desktop screens start on a 1440 window (Figma's desktop frame), scaled into the preview; phones start on the phone,
  // where a scaled desktop would be too small to read.
  const [wideScreen] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.("(min-width: 1024px)").matches));
  const [win, setWin] = useState<WindowId>(wideScreen ? "1440" : "phone");
  const [pattern, setPattern] = useState<AppShellPattern>("sidebar");
  const [collapse, setCollapse] = useState<AppShellCollapse>("header");
  const [canvas, setCanvas] = useState<"default" | "alt" | "flat">("default");
  // One elevation per screen: the grey Canvas takes the default Sidebar (shadow) and Shadow cards and panes; a white Canvas
  // a Surface-alt or Flat Sidebar (optionally with its divider) and bordered ones; the flat Canvas a Flat Sidebar.
  const [sidebarStyle, setSidebarStyle] = useState<"default" | "alt" | "flat">("default");
  const [divider, setDivider] = useState(false);
  const chooseCanvas = (next: "default" | "alt" | "flat") => { setCanvas(next); setSidebarStyle(next === "default" ? "default" : next === "alt" ? "alt" : "flat"); setDivider(false); };
  const [collapsed, setCollapsed] = useState(false);
  const [topRow, setTopRow] = useState(true);
  const [withSections, setWithSections] = useState(true);
  const [notifications, setNotifications] = useState<"count" | "dot" | "none">("count");
  const [banner, setBanner] = useState(false);
  const [withLeading, setWithLeading] = useState(true);
  const [withTrailing, setWithTrailing] = useState(true);
  const [withProgress, setWithProgress] = useState(true);
  const [panel, setPanel] = useState(false);
  const [floating, setFloating] = useState(false);
  const [mobile, setMobile] = useState(!wideScreen);
  const [mobileTop, setMobileTop] = useState<AppShellMobileTop>("bar");
  const [bottom, setBottom] = useState<Bottom>("tab-bar");
  const choosePattern = (next: AppShellPattern) => {
    setPattern(next);
    // List-Detail starts on the Sidebar's rail (Figma Sidebar Expand=No); each pattern's phone screen its own bottom.
    setCollapsed(next === "list-detail");
    setBottom(defaultBottom[next]);
    setPanel(false);
  };
  // A phone or an upright iPad shows the mobile pattern: picking one adds the mobile parts (off again: the drawer).
  const chooseWindow = (next: WindowId) => { setWin(next); if (next === "ipad" || next === "phone") setMobile(true); };

  // The sample app's own state.
  const [page, setPage] = useState<NavPage>("people");
  const [team, setTeam] = useState<Team | "all">("all");
  const [query, setQuery] = useState("");
  const [personId, setPersonId] = useState<PersonId>("chi");
  const [view, setView] = useState<"overview" | "projects" | "time-off">("overview");
  const [shotId, setShotId] = useState(shots[0].id);
  const [comments, setComments] = useState(moodboardComments);
  const [draft, setDraft] = useState("");
  const [chapterId, setChapterId] = useState("leave");
  const [step, setStep] = useState(0);
  const [invite, setInvite] = useState<Invite>(blankInvite);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [measure, width] = useWidth();
  const baseId = useId();
  const formId = `${baseId}-invite`;
  // A playground has no toast host: the last handler that ran shows under the preview.
  const [ran, setRan] = useState<string | null>(null);
  const report = (message: string) => setRan(message);

  const sidebarPattern = SIDEBAR_PATTERNS.includes(pattern);
  // Grid is the Sidebar workspace drawn in lines (Layout=Grid): the same directory, with its Sidebar and header themes.
  const directoryPattern = pattern === "sidebar" || pattern === "grid";
  const navigate = (next: NavPage) => { setPage(next); setPanel(false); };
  const person = people[personId];
  const paneTheme = canvas === "default" ? "shadow" : "border";
  const cardTheme = canvas === "default" ? "shadow" : "border";
  const narrow = width > 0 && width < 560;
  const unread = notifications !== "none";
  const glass = mobileTop === "media";

  /* ——— Header utilities, shared by the patterns that have them ——— */
  const plan = part(<Badge theme="accent" background="subtle" leadingIcon={false}>Business</Badge>, `<Badge theme="accent" background="subtle" leadingIcon={false}>Business</Badge>`);
  const bell = part(
    <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={notifications === "count" ? 3 : undefined} dot={notifications === "dot"} onClick={() => { setNotifications("none"); report("Notifications · onClick ran, unread cleared"); }} />,
    `<AppShellAction icon="icon-bell-01-line" aria-label="Notifications"${notifications === "count" ? " count={3}" : notifications === "dot" ? " dot" : ""} onClick={openNotifications} />`,
  );
  const account = part(
    <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={accountItems} onSelect={(item) => report(`${item.label} · onSelect ran`)} />,
    `<Menu align="end" trigger={<AppShellAccount name="${me.name}" src={alex.photo} />} items={accountItems} onSelect={choose} />`,
  );
  const accountButton = part(<AppShellAccount name={me.name} src={me.photo} onClick={() => report("Account · onClick ran")} />, `<AppShellAccount name="${me.name}" src={alex.photo} onClick={openAccount} />`);
  /** The trail: beside the header's collapse toggle it starts at a Sub level (no Master icon); elsewhere at the workspace. */
  const crumbs = (items: { id: string; label: string }[], onNavigate: (id: string) => void, master = false) => part(
    <Breadcrumbs master={master} items={items} onNavigate={(item, event) => { event.preventDefault(); onNavigate(item.id); }} />,
    `<Breadcrumbs${master ? "" : " master={false}"} items={[${items.map((item) => `{ id: "${item.id}", label: "${item.label}" }`).join(", ")}]} onNavigate={navigate} />`,
  );
  const sidebarCrumbs = (trail: { id: string; label: string }[]) => (collapse === "header"
    ? crumbs(trail, (id) => { if (id in navPages) navigate(id as NavPage); })
    : crumbs([{ id: "home", label: studio.name }, ...trail.filter((item) => item.id !== "home")], (id) => { if (id in navPages) navigate(id as NavPage); }, true));

  /* ——— The People pages (Sidebar and Top-Bar): a directory table, or an empty page ——— */
  const shown = teamOf(directoryPattern ? team : "all").filter((row) => !query.trim() || `${row.name} ${row.role} ${row.team}`.toLowerCase().includes(query.trim().toLowerCase()));
  const columns: TableColumn<Person>[] = [
    { id: "name", header: "Name", cell: (row) => <TableMedia bold media={<Avatar size="small" {...avatarOf(row)} />} caption={narrow ? row.role : row.email}>{row.name}</TableMedia> },
    ...(narrow ? [] : [{ id: "role", header: "Role", width: "200px", cell: (row: Person) => <TableText>{row.role}</TableText> }]),
    { id: "team", header: "Team", width: narrow ? undefined : "160px", cell: (row) => <TableText>{row.team}</TableText> },
    ...(narrow ? [] : [{ id: "office", header: "Office", width: "176px", cell: (row: Person) => <TableText>{row.location}</TableText> }]),
  ];
  const openPerson = (id: string) => { setPersonId(id as PersonId); setPanel(true); report(`${people[id as PersonId].name} · onRowClick ran, the side panel opened`); };
  const peopleMain = part(
    <PageHeader title="People" description={`${plural(directory.length, "person", "people")} at ${studio.name}`} actions={<Button level="primary" startIcon="icon-user-plus-line" onClick={() => report("Invite person · onClick ran")}>Invite person</Button>} />,
    `<PageHeader title="People" description="${plural(directory.length, "person", "people")} at ${studio.name}" actions={<Button level="primary" startIcon="icon-user-plus-line" onClick={invite}>Invite person</Button>} />`,
  );
  const peopleBody = part(
    <div ref={measure}>
      <Table aria-label={team === "all" || !directoryPattern ? "People" : `${team} team`} rows={shown} columns={columns} onRowClick={(row) => openPerson(row.id)}
        empty={<EmptyState size="sm" headingLevel={2} icon="icon-search-medium-line" title="No one matches" secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>Try a first name, a role or a team.</EmptyState>} />
    </div>,
    `<Table aria-label="People" rows={people} columns={columns} onRowClick={(person) => openPerson(person.id)} />`,
  );
  const emptyPage = page === "people" ? null : emptyPages[page];
  const emptyMain = part(<PageHeader title={navPages[page].label} />, `<PageHeader title="${navPages[page].label}" />`);
  const emptyBody = emptyPage ? part(
    <EmptyState title={emptyPage.title} headingLevel={2} icon={emptyPage.icon} primaryAction={{ label: emptyPage.action, onClick: () => report(`${emptyPage.action} · primaryAction.onClick ran`) }}>{emptyPage.body}</EmptyState>,
    `<EmptyState title="${emptyPage.title}" headingLevel={2} icon="${emptyPage.icon}" primaryAction={{ label: "${emptyPage.action}", onClick: start }}>${emptyPage.body}</EmptyState>`,
  ) : null;
  const personPanel = part(
    <SidePanel type="standard" size="small" title={person.name} description={`${person.role} · ${person.email}`} open onOpenChange={setPanel}
      primaryAction={{ label: "Message", onClick: () => report(`Message ${firstName(person)} · primaryAction.onClick ran`) }} secondaryAction={{ label: "Close" }}>
      <DescriptionList divider items={[
        { term: "Team", description: person.team },
        { term: "Office", description: person.location },
        { term: "Reports to", description: person.id === me.id ? people.duy.name : me.name },
        { term: "Away", description: awayOf(person) ? `${formatRange(awayOf(person)!.from, awayOf(person)!.to)} · ${awayOf(person)!.status}` : "Not this month" },
      ]} />
    </SidePanel>,
    `<SidePanel type="standard" size="small" title="${person.name}" description="${person.role} · ${person.email}" open={panelOpen} onOpenChange={setPanelOpen}\n  primaryAction={{ label: "Message", onClick: message }} secondaryAction={{ label: "Close" }}>\n  <DescriptionList divider items={details} />\n</SidePanel>`,
  );

  /* ——— Each pattern's screen ——— */
  let title: string;
  /** The phone bar's name when the Body holds the h1 (Focus names the task, not the step). */
  let barLabel: string | undefined;
  let titleInBody = false;
  let root = true;
  let leading: Part | undefined;
  let center: Part | undefined;
  let actions: Part[] = [];
  let main: Part | undefined;
  let sections: Part | undefined;
  let leadingPane: Part | undefined;
  let trailingPane: Part | undefined;
  let progress: Part | undefined;
  let sidePanel: Part | undefined;
  let body: Part;
  let back: { label: string; icon: IconName; run: string; code: string } | undefined;
  let barActions: { action: TopNavigationAction; code: string }[] = [];
  let hero: Part;
  let backdrop: Part;
  let actionBar: { summary?: string; secondary?: { label: string; run: () => void; code: string }; primary: { label: string; run?: () => void; code: string; submit?: boolean } };
  const notificationsAction = unread ? [{
    action: { icon: "icon-bell-01-line" as IconName, label: "Notifications, new", dot: true, onClick: () => { setNotifications("none"); report("Notifications · onClick ran, unread cleared"); } },
    code: `{ icon: "icon-bell-01-line", label: "Notifications, new", dot: true, onClick: openNotifications }`,
  }] : [];
  // Figma's Backdrop is 390 × 520 on a phone: a 3:4 photo without corners fills it (wider screens crop it).
  const photo = (index: number) => part(<Image src={platformMedia.site[index].src} alt={platformMedia.site[index].alt} ratio="3:4" radius="none" />, `<Image src={cover.src} alt="${platformMedia.site[index].alt}" ratio="3:4" radius="none" />`);

  if (directoryPattern || pattern === "top-bar") {
    // A navigation app (Sidebar) or one product with its navigation in the header (Top-Bar): the directory.
    title = navPages[page].label;
    actions = [plan, bell, account];
    if (directoryPattern) {
      leading = topRow ? sidebarCrumbs(page === "home" ? [{ id: "home", label: "Home" }] : [{ id: "home", label: "Home" }, { id: page, label: navPages[page].label }]) : undefined;
      if (!topRow) actions = [];
      sections = withSections && page === "people" ? part(
        <Tabs aria-label="Teams" value={team} onValueChange={(id) => setTeam(id as Team | "all")}
          items={[{ id: "all", label: "Everyone", badge: directory.length }, ...teams.map((id) => ({ id, label: id, badge: teamOf(id).length }))]} />,
        `<Tabs aria-label="Teams" value={team} onValueChange={setTeam} items={teams} />`,
      ) : undefined;
    } else {
      leading = part(<StudioLogo src={studio.logo} name={studio.name} />, "logo");
      center = part(
        <Search placeholder="Search people" aria-label="Search people" value={query} onValueChange={(value) => { setQuery(value); if (value.trim()) setPage("people"); }} />,
        `<Search placeholder="Search people" aria-label="Search people" value={query} onValueChange={setQuery} />`,
      );
      // Top-Bar has no Sidebar: the app's roots are the header's Sections.
      sections = part(
        <Tabs aria-label={studio.name} value={page} onValueChange={(id) => navigate(id as NavPage)} items={navIds.map((id) => ({ id, label: navPages[id].label }))} />,
        `<Tabs aria-label="${studio.name}" value={page} onValueChange={navigate} items={roots} />`,
      );
    }
    main = emptyPage ? emptyMain : peopleMain;
    body = emptyBody ?? peopleBody;
    sidePanel = panel && page === "people" ? personPanel : undefined;
    if (page === "people") barActions = [...notificationsAction, ...(bottom === "actions" ? [] : [{ action: { icon: "icon-user-plus-line" as IconName, label: "Invite person", onClick: () => report("Invite person · onClick ran") }, code: `{ icon: "icon-user-plus-line", label: "Invite person", onClick: invite }` }])];
    else barActions = notificationsAction;
    hero = page === "people" ? part(
      <Stack gap="2xs">
        <Text textStyle="Body/Small/Medium" tone="base">{studio.name}</Text>
        <Text as="p" textStyle="Heading/1">{plural(directory.length, "person", "people")}</Text>
        <Text textStyle="Body/Small/Regular" tone="base">Ho Chi Minh City · Hanoi · Singapore · remote</Text>
      </Stack>,
      `<Stack gap="2xs">…the head count…</Stack>`,
    ) : part(<Text tone="base">{emptyPage?.body}</Text>, `<Text tone="base">${emptyPage?.body}</Text>`);
    backdrop = photo(2);
    actionBar = page === "people"
      ? { summary: plural(directory.length, "person", "people"), primary: { label: "Invite person", run: () => report("Invite person · primaryAction.onClick ran"), code: "invite" } }
      : { primary: { label: emptyPage?.action ?? "", run: () => report(`${emptyPage?.action} · primaryAction.onClick ran`), code: "start" } };
  } else if (pattern === "list-detail") {
    // A list beside its detail: the people in the leading pane, the open profile filling the page.
    title = page === "people" ? person.name : navPages[page].label;
    root = page !== "people";
    leading = topRow ? sidebarCrumbs(page === "people" ? [{ id: "people", label: "People" }, { id: person.id, label: person.name }] : [{ id: page, label: navPages[page].label }]) : undefined;
    actions = topRow ? [plan, bell, account] : [];
    if (page === "people") {
      leadingPane = part(
        <AppShellPane title={`People · ${directory.length}`} theme={paneTheme}
          action={<IconButton appearance="flat" level="secondary" size="sm" icon="icon-user-plus-line" aria-label="Invite person" onClick={() => report("Invite person · onClick ran")} />}>
          <List aria-label="People">
            {directory.map((row) => (
              <ListItem key={row.id} selected={row.id === person.id} title={row.name} caption={row.role} leading={<Avatar size="md" {...avatarOf(row)} />}
                onClick={() => { setPersonId(row.id as PersonId); setPanel(false); }} />
            ))}
          </List>
        </AppShellPane>,
        `<AppShellPane title="People · ${directory.length}"${paneTheme === "shadow" ? "" : ` theme="${paneTheme}"`} action={<IconButton appearance="flat" level="secondary" size="sm" icon="icon-user-plus-line" aria-label="Invite person" onClick={invite} />}>\n  <List aria-label="People">\n    {people.map((person) => <ListItem key={person.id} selected={person.id === openId} title={person.name} caption={person.role} leading={<Avatar size="md" src={person.photo} alt="" />} onClick={() => setOpenId(person.id)} />)}\n  </List>\n</AppShellPane>`,
      );
      main = part(
        <PageHeader title={person.name} description={`${person.role} · ${person.team} team · ${person.location}`}
          actions={<><Button level="tertiary" startIcon="icon-phone-line" onClick={() => report(`Call ${firstName(person)} · onClick ran`)}>Call</Button><Button level="primary" startIcon="icon-message-circle-line" onClick={() => report(`Message ${firstName(person)} · onClick ran`)}>Message</Button></>} />,
        `<PageHeader title="${person.name}" description="${person.role} · ${person.team} team · ${person.location}"\n  actions={<><Button level="tertiary" startIcon="icon-phone-line" onClick={call}>Call</Button><Button level="primary" startIcon="icon-message-circle-line" onClick={message}>Message</Button></>} />`,
      );
      const theirProjects = projectsOf(person);
      // Two cards side by side get narrow beside the panes, and a phone shows one: the status moves into the caption.
      const narrowCards = width > 0 && width < 720;
      const theirLeave = leaveRequests.filter((request) => request.person === person.id);
      sections = withSections ? part(
        <Tabs aria-label="Profile" value={view} onValueChange={(id) => setView(id as typeof view)} items={[
          { id: "overview", label: "Overview" },
          { id: "projects", label: "Projects", badge: theirProjects.length },
          { id: "time-off", label: "Time off", badge: theirLeave.length },
        ]} />,
        `<Tabs aria-label="Profile" value={view} onValueChange={setView} items={views} />`,
      ) : undefined;
      const projectList = theirProjects.length ? (
        <List aria-label={`${firstName(person)}’s projects`}>
          {theirProjects.map((project) => (
            <ListItem key={project.id} title={project.name} titleLines={2} caption={narrowCards ? `${project.status} · due ${formatDate(project.due)}` : `${project.client} · due ${formatDate(project.due)}`}
              leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />}
              trailing={narrowCards ? undefined : <Badge theme={projectStatusTheme[project.status]} background="subtle">{project.status}</Badge>} />
          ))}
        </List>
      ) : <Text tone="base">{`${firstName(person)} isn’t on a project right now.`}</Text>;
      const leaveList = theirLeave.length ? (
        <List aria-label={`${firstName(person)}’s time off`}>
          {theirLeave.map((request) => (
            <ListItem key={request.id} title={request.kind} caption={`${formatRange(request.from, request.to)} · ${plural(request.days, "day")}`}
              trailing={<Badge theme={leaveStatusTheme[request.status]} background="subtle">{request.status}</Badge>} />
          ))}
        </List>
      ) : <Text tone="base">No time off booked this year.</Text>;
      const shownView = withSections ? view : "overview";
      body = part(
        shownView === "overview" ? (
          <Grid ref={measure} columns={{ mobile: 1, desktop: 2 }} gap="md">
            <Card theme={cardTheme}>
              <Stack gap="md">
                <Heading level={2} textStyle="Heading/4">Details</Heading>
                <DescriptionList items={[
                  { term: "Email", description: person.email },
                  { term: "Office", description: person.location },
                  { term: "Team", description: person.team },
                  { term: "Reports to", description: person.id === me.id ? people.duy.name : me.name },
                ]} />
              </Stack>
            </Card>
            <Card theme={cardTheme}>
              <Stack gap="md">
                <Heading level={2} textStyle="Heading/4">Working on</Heading>
                {projectList}
              </Stack>
            </Card>
          </Grid>
        ) : <div ref={measure}><Card theme={cardTheme}>{shownView === "projects" ? projectList : leaveList}</Card></div>,
        shownView === "overview"
          ? `<Grid columns={{ mobile: 1, desktop: 2 }} gap="md">\n  <Card${cardTheme === "shadow" ? "" : ` theme="${cardTheme}"`}>…Details…</Card>\n  <Card${cardTheme === "shadow" ? "" : ` theme="${cardTheme}"`}>…Working on…</Card>\n</Grid>`
          : `<Card${cardTheme === "shadow" ? "" : ` theme="${cardTheme}"`}>…${shownView === "projects" ? "Projects" : "Time off"}…</Card>`,
      );
      sidePanel = panel ? part(
        <SidePanel type="standard" size="small" title="Time off" description={`${firstName(person)}’s requests in 2026`} open onOpenChange={setPanel} secondaryAction={{ label: "Close" }}>
          {leaveList}
        </SidePanel>,
        `<SidePanel type="standard" size="small" title="Time off" description="${firstName(person)}’s requests in 2026" open={panelOpen} onOpenChange={setPanelOpen} secondaryAction={{ label: "Close" }}>\n  <List aria-label="Time off">{requests}</List>\n</SidePanel>`,
      ) : undefined;
      back = { label: "Back", icon: "icon-chevron-left-line-medium", run: "Back · onClick ran: the phone returns to the list", code: "back" };
      barActions = bottom === "actions" ? [] : [{ action: { icon: "icon-message-circle-line", label: `Message ${firstName(person)}`, onClick: () => report(`Message ${firstName(person)} · onClick ran`) }, code: `{ icon: "icon-message-circle-line", label: "Message ${firstName(person)}", onClick: message }` }];
      hero = part(
        <Stack direction="row" gap="md" align="center">
          <Avatar size="xlarge" {...avatarOf(person)} />
          <Stack gap="2xs">
            <Text textStyle="Body/Base/Medium">{person.role}</Text>
            <Text textStyle="Body/Small/Regular" tone="base">{`${person.team} · ${person.location}`}</Text>
          </Stack>
        </Stack>,
        `<Stack direction="row" gap="md" align="center">…the photo and role…</Stack>`,
      );
      backdrop = photo(4);
      actionBar = { secondary: { label: "Call", run: () => report(`Call ${firstName(person)} · secondaryAction.onClick ran`), code: "call" }, primary: { label: "Message", run: () => report(`Message ${firstName(person)} · primaryAction.onClick ran`), code: "message" } };
    } else {
      main = emptyMain;
      body = emptyBody!;
      barActions = notificationsAction;
      hero = part(<Text tone="base">{emptyPage?.body}</Text>, `<Text tone="base">${emptyPage?.body}</Text>`);
      backdrop = photo(4);
      actionBar = { primary: { label: emptyPage?.action ?? "", run: () => report(`${emptyPage?.action} · primaryAction.onClick ran`), code: "start" } };
    }
  } else if (pattern === "workspace") {
    // Tools around a canvas: the header across, the shots on the left, the review on the right.
    const shot = shots.find((item) => item.id === shotId) ?? shots[0];
    const open = comments.filter((comment) => !comment.resolved);
    title = "Saola moodboard";
    titleInBody = true;
    root = false;
    leading = crumbs([{ id: "projects", label: "Projects" }, { id: "saola-brand", label: "Brand refresh" }, { id: "moodboard", label: "Moodboard" }], (id) => report(`${id === "projects" ? "Projects" : id === "saola-brand" ? "Brand refresh" : "Moodboard"} · onNavigate ran`));
    actions = [
      part(<AvatarStack size="sm" items={[people.gia, people.emi, people.linh].map((item) => ({ ...avatarOf(item), alt: item.name }))} />, `<AvatarStack size="sm" items={reviewers} />`),
      part(<Button level="tertiary" startIcon="icon-share-01-line" onClick={() => report("Share · onClick ran: link copied")}>Share</Button>, `<Button level="tertiary" startIcon="icon-share-01-line" onClick={share}>Share</Button>`),
      accountButton,
    ];
    leadingPane = withLeading ? part(
      <AppShellPane title="Shots" theme={paneTheme}>
        <List aria-label="Shots">
          {shots.map((item) => (
            <ListItem key={item.id} selected={item.id === shot.id} title={item.name} caption={`${firstName(people[item.by])} · ${formatDay(item.added)}`}
              leading={<Thumbnail src={item.src} alt="" size="md" />} onClick={() => setShotId(item.id)} />
          ))}
        </List>
      </AppShellPane>,
      `<AppShellPane title="Shots"${paneTheme === "shadow" ? "" : ` theme="${paneTheme}"`}>\n  <List aria-label="Shots">{shotRows}</List>\n</AppShellPane>`,
    ) : undefined;
    trailingPane = withTrailing ? part(
      <AppShellPane title={`Comments · ${open.length}`} theme={paneTheme}>
        <List aria-label="Comments">
          {comments.map((comment) => (
            <ListItem key={comment.id} title={people[comment.author].name} caption={`${comment.text} · ${comment.resolved ? "Resolved · " : ""}${formatRelative(comment.at)}`} leading={<Avatar size="small" {...avatarOf(people[comment.author])} />} />
          ))}
        </List>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          setComments((list) => [...list, { id: `c${list.length + 1}`, author: "alex", text: draft.trim(), at: daysFromToday(0) }]);
          setDraft("");
          report("Comment · onSubmit ran");
        }}>
          <Stack gap="xs">
            <TextAreaField label="Add a comment" placeholder="Reply to the team" value={draft} onValueChange={setDraft} rows={2} />
            <Button type="submit" level="primary" size="sm" disabled={!draft.trim()}>Comment</Button>
          </Stack>
        </form>
      </AppShellPane>,
      `<AppShellPane title="Comments · ${open.length}"${paneTheme === "shadow" ? "" : ` theme="${paneTheme}"`}>\n  <List aria-label="Comments">{commentRows}</List>\n  <form onSubmit={addComment}>…</form>\n</AppShellPane>`,
    ) : undefined;
    body = part(
      <Stack gap="md">
        <Stack gap="2xs">
          <Heading level={1}>Saola moodboard</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`Brand refresh · Saola Outdoor · ${plural(shots.length, "shot")} · ${plural(open.length, "open comment")}`}</Text>
        </Stack>
        {/* Concentric: a Small Card's corner (16) less its 16 inset leaves the shot square-cornered. */}
        <Card theme={cardTheme} spacing="sm">
          <Image src={shot.src} alt={shot.alt} ratio="16:9" radius="none" />
        </Card>
      </Stack>,
      `<Stack gap="md">\n  <Heading level={1}>Saola moodboard</Heading>\n  <Card${cardTheme === "shadow" ? "" : ` theme="${cardTheme}"`} spacing="sm"><Image src={shot.src} alt={shot.alt} ratio="16:9" radius="none" /></Card>\n</Stack>`,
    );
    back = { label: "Back", icon: "icon-chevron-left-line-medium", run: "Back · onClick ran: the phone returns to Brand refresh", code: "back" };
    barActions = [{ action: { icon: "icon-share-01-line", label: "Share moodboard", onClick: () => report("Share · onClick ran: link copied") }, code: `{ icon: "icon-share-01-line", label: "Share moodboard", onClick: share }` }];
    hero = part(<Text textStyle="Body/Small/Regular" tone="base">{`Brand refresh · Saola Outdoor · ${plural(open.length, "open comment")}`}</Text>, `<Text textStyle="Body/Small/Regular" tone="base">Brand refresh · Saola Outdoor</Text>`);
    // The board's cover, not the open shot: the Body already shows that one.
    backdrop = part(<Image src={platformMedia.mountainRoad.src} alt={platformMedia.mountainRoad.alt} ratio="3:4" radius="none" />, `<Image src={cover.src} alt="${platformMedia.mountainRoad.alt}" ratio="3:4" radius="none" />`);
    actionBar = { summary: plural(open.length, "open comment"), secondary: { label: "Comment", run: () => report("Comment · secondaryAction.onClick ran"), code: "openComments" }, primary: { label: "Approve", run: () => report("Approve · primaryAction.onClick ran"), code: "approve" } };
  } else if (pattern === "docs") {
    // Reading: a 720 column between the contents and "On this page", both on the Canvas so nothing competes with the text.
    const chapter = chapters.find((item) => item.id === chapterId) ?? chapters[1];
    const index = chapters.indexOf(chapter);
    title = chapter.title;
    titleInBody = true;
    root = false;
    leading = part(<StudioLogo src={studio.logo} name="Studio handbook" />, "logo");
    center = part(<Search placeholder="Search the handbook" aria-label="Search the handbook" onValueChange={(value) => { if (value.trim()) report(`Search · onValueChange ran: “${value.trim()}”`); }} />, `<Search placeholder="Search the handbook" aria-label="Search the handbook" onValueChange={search} />`);
    actions = [accountButton];
    leadingPane = withLeading ? part(
      <AppShellPane title="Contents" theme="canvas">
        <List aria-label="Chapters">
          {chapters.map((item) => <ListItem key={item.id} selected={item.id === chapter.id} title={item.title} leading="icon-book-open-line" onClick={() => setChapterId(item.id)} />)}
        </List>
      </AppShellPane>,
      `<AppShellPane title="Contents" theme="canvas">\n  <List aria-label="Chapters">{chapterRows}</List>\n</AppShellPane>`,
    ) : undefined;
    trailingPane = withTrailing ? part(
      <AppShellPane title="On this page" theme="canvas">
        <List aria-label="On this page">
          {chapter.sections.map((section) => <ListItem key={section.id} title={section.title} href={`#${baseId}-${section.id}`} />)}
        </List>
      </AppShellPane>,
      `<AppShellPane title="On this page" theme="canvas">\n  <List aria-label="On this page">{anchorRows}</List>\n</AppShellPane>`,
    ) : undefined;
    body = part(
      <Stack as="article" gap="xl">
        <Stack gap="xs">
          <Text textStyle="Body/Small/Bold" tone="light">{`Handbook · updated Sep 12, 2026 by ${people.minhAnh.name}`}</Text>
          <Heading level={1} textStyle="Heading/1">{chapter.title}</Heading>
        </Stack>
        {chapter.sections.map((section) => (
          <Stack as="section" key={section.id} gap="sm" id={`${baseId}-${section.id}`}>
            <Heading level={2} textStyle="Heading/3">{section.title}</Heading>
            <Text>{section.text}</Text>
          </Stack>
        ))}
      </Stack>,
      `<Stack as="article" gap="xl">\n  <Heading level={1} textStyle="Heading/1">${chapter.title}</Heading>\n  {sections.map((section) => <Stack as="section" key={section.id} gap="sm">…</Stack>)}\n</Stack>`,
    );
    back = { label: "Back", icon: "icon-chevron-left-line-medium", run: "Back · onClick ran: the phone returns to the contents", code: "back" };
    barActions = [{ action: { icon: "icon-search-medium-line", label: "Search the handbook", onClick: () => report("Search the handbook · onClick ran") }, code: `{ icon: "icon-search-medium-line", label: "Search the handbook", onClick: openSearch }` }];
    hero = part(<Text textStyle="Body/Small/Regular" tone="base">{`Chapter ${index + 1} of ${chapters.length} · ${plural(chapter.sections.length, "section")}`}</Text>, `<Text textStyle="Body/Small/Regular" tone="base">Chapter ${index + 1} of ${chapters.length}</Text>`);
    backdrop = photo(0);
    actionBar = { primary: { label: "Ask People Ops", run: () => report("Ask People Ops · primaryAction.onClick ran"), code: "askPeopleOps" } };
  } else {
    // One task with steps: the way out in the header, the steps under it, the form beside its summary.
    const last = step === inviteSteps.length - 1;
    const project = projects.find((item) => item.id === invite.project) ?? projects[0];
    title = inviteSteps[step].title;
    barLabel = "Invite person";
    titleInBody = true;
    root = false;
    leading = crumbs([{ id: "people", label: "People" }, { id: "invite", label: "Invite person" }], (id) => report(`${id === "people" ? "People" : "Invite person"} · onNavigate ran`));
    actions = [part(<Button level="tertiary" onClick={() => report("Save and close · onClick ran: the draft is kept")}>Save and close</Button>, `<Button level="tertiary" onClick={saveDraft}>Save and close</Button>`)];
    progress = withProgress ? part(
      <Stepper aria-label="Invite person" steps={inviteSteps} current={step} onStepClick={(_, index) => { if (index < step) setStep(index); }} />,
      `<Stepper aria-label="Invite person" steps={steps} current={step} onStepClick={goBackTo} />`,
    ) : undefined;
    const summary = [
      { term: "Name", description: invite.name.trim() || "Not set yet" },
      { term: "Email", description: invite.email.trim() || "Not set yet" },
      { term: "Team", description: invite.team },
      { term: "Access", description: invite.access },
      { term: "First project", description: project.name },
    ];
    trailingPane = withTrailing ? part(
      <AppShellPane title="Summary" theme={paneTheme}>
        <Box padding="sm"><DescriptionList items={summary} /></Box>
      </AppShellPane>,
      `<AppShellPane title="Summary"${paneTheme === "shadow" ? "" : ` theme="${paneTheme}"`}>\n  <Box padding="sm"><DescriptionList items={summary} /></Box>\n</AppShellPane>`,
    ) : undefined;
    const submit = (event: FormEvent) => {
      event.preventDefault();
      if (step === 0 && !/^\S+@\S+\.\S+$/.test(invite.email.trim())) { setEmailError("Enter a work email, like lan@dizai.studio"); return; }
      setEmailError(undefined);
      if (!last) { setStep(step + 1); return; }
      report(`Send invite · onSubmit ran: ${invite.email.trim()} is invited`);
      setInvite(blankInvite);
      setStep(0);
    };
    const inActionBar = mobile && bottom === "actions";
    body = part(
      <form id={formId} onSubmit={submit} noValidate>
        <Stack gap="xl">
          <Stack gap="xs">
            <Heading level={1}>{inviteSteps[step].title}</Heading>
            <Text tone="base">{inviteCopy[step]}</Text>
          </Stack>
          {step === 0 ? (
            <Stack gap="lg">
              <InputField label="Full name" placeholder="Lan Pham" value={invite.name} onValueChange={(name) => setInvite({ ...invite, name })} />
              <InputField label="Work email" type="email" placeholder="lan@dizai.studio" value={invite.email} error={emailError} onValueChange={(email) => { setInvite({ ...invite, email }); setEmailError(undefined); }} />
              <SelectField label="Team" options={teams.map((id) => ({ value: id, label: id }))} value={invite.team} onValueChange={(next) => setInvite({ ...invite, team: next as Team })} />
            </Stack>
          ) : step === 1 ? (
            <Stack gap="lg">
              <SelectField label="Access" options={accessOptions} value={invite.access} onValueChange={(access) => setInvite({ ...invite, access })} />
              <SelectField label="First project" helpText="They can join more projects later." options={projects.map((item) => ({ value: item.id, label: `${item.name} · ${item.client}` }))} value={invite.project} onValueChange={(next) => setInvite({ ...invite, project: next })} />
            </Stack>
          ) : (
            <Card theme={cardTheme}><DescriptionList items={summary} /></Card>
          )}
          <StepActions step={step} last={last} onBack={() => setStep(step - 1)} inActionBar={inActionBar} />
        </Stack>
      </form>,
      `<form id="invite" onSubmit={next}>\n  <Stack gap="xl">\n    <Heading level={1}>${inviteSteps[step].title}</Heading>\n    …the step's fields…\n    <StepActions /> {/* Back · Continue; null while useAppShell().layout is "mobile", where the Action bar holds them */}\n  </Stack>\n</form>`,
    );
    back = { label: "Close", icon: "icon-x-medium-line", run: "Close · onClick ran: the draft is kept", code: "close" };
    barActions = [];
    hero = part(<Text textStyle="Body/Small/Medium" tone="base">{`Step ${step + 1} of ${inviteSteps.length} · ${inviteSteps[step].title}`}</Text>, `<Text textStyle="Body/Small/Medium" tone="base">Step ${step + 1} of ${inviteSteps.length}</Text>`);
    backdrop = photo(5);
    actionBar = {
      secondary: step > 0 ? { label: "Back", run: () => setStep(step - 1), code: "previousStep" } : undefined,
      primary: { label: last ? "Send invite" : "Continue", submit: true, code: "" },
    };
  }

  /* ——— Mobile parts (Pattern/AppShell/Mobile) ——— */
  // The Tab-Bar follows the page on the navigation patterns; a workspace, a chapter or a task sits under its area.
  const navArea = sidebarPattern || pattern === "top-bar" ? page : null;
  const area: NavPage = pattern === "workspace" ? "projects" : "people";
  const topNavigation = part(
    <TopNavigation title={titleInBody ? undefined : title} largeTitle={!titleInBody && root ? title : undefined} aria-label={titleInBody ? barLabel ?? title : undefined} topBar={titleInBody ? true : undefined}
      leading={back ? { icon: back.icon, label: back.label, onClick: () => report(back.run) } : undefined}
      trailing={barActions.map((entry) => entry.action)} />,
    `<TopNavigation${titleInBody ? ` aria-label="${barLabel ?? title}" topBar` : ` title="${title}"${root ? ` largeTitle="${title}"` : ""}`}${back ? ` leading={{ icon: "${back.icon}", label: "${back.label}", onClick: ${back.code} }}` : ""}${barActions.length ? ` trailing={[${barActions.map((entry) => entry.code).join(", ")}]}` : ""} />`,
  );
  const bottomNavigation = part(
    <BottomNavigation type={bottom === "floating" ? "floating-glass" : undefined} aria-label={studio.name} value={navArea ?? area}
      onValueChange={(id) => { navigate(id as NavPage); if (!navArea) report(`${navPages[id as NavPage].label} · onValueChange ran`); }} showLabels={bottom === "floating" ? undefined : true} items={roots} />,
    `<BottomNavigation${bottom === "floating" ? ` type="floating-glass"` : ""} aria-label="${studio.name}" value=${navArea ? "{page}" : `"${area}"`} onValueChange={navigate}${bottom === "floating" ? "" : " showLabels"} items={roots} />`,
  );
  const actionBarPart = part(
    // The summary is a status line in the Action Bar's own style (ActionBar examples: Body/Base/Medium, role="status").
    <ActionBar direction="horizontal" surface={glass ? "glass" : undefined}
      summary={actionBar.summary ? <Text as="span" role="status" textStyle="Body/Base/Medium">{actionBar.summary}</Text> : undefined}
      secondaryAction={actionBar.secondary ? { label: actionBar.secondary.label, onClick: actionBar.secondary.run } : undefined}
      primaryAction={actionBar.primary.submit ? { label: actionBar.primary.label, type: "submit", form: formId } : { label: actionBar.primary.label, onClick: actionBar.primary.run }} />,
    `<ActionBar direction="horizontal"${glass ? ` surface="glass"` : ""}${actionBar.summary ? ` summary={<Text as="span" role="status" textStyle="Body/Base/Medium">${actionBar.summary}</Text>}` : ""}${actionBar.secondary ? ` secondaryAction={{ label: "${actionBar.secondary.label}", onClick: ${actionBar.secondary.code} }}` : ""} primaryAction={{ label: "${actionBar.primary.label}"${actionBar.primary.submit ? `, type: "submit", form: "invite"` : `, onClick: ${actionBar.primary.code}`} }} />`,
  );
  const withHero = mobile && (mobileTop === "band" || mobileTop === "band-sheet");
  const withBackdrop = mobile && mobileTop === "media";

  /* ——— The shell's own parts ——— */
  const sidebar = part(
    <Sidebar logo={<StudioLogo src={studio.logo} name={studio.name} />} logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />}
      background={sidebarStyle} divider={divider} sections={navSections} selectedId={page} onItemClick={(item) => navigate(item.id as NavPage)} />,
    `<Sidebar logo={logo} logoCollapsed={mark}${sidebarStyle === "default" ? "" : ` background="${sidebarStyle}"`}${divider ? " divider" : ""} sections={sections} selectedId={page} onItemClick={(item) => navigate(item.id)} />`,
  );
  const bannerPart = part(
    <AlertBanner theme="info" onClose={() => setBanner(false)}>Zen is read-only tonight from 11:00 pm to 1:00 am while the studio moves to a new data centre.</AlertBanner>,
    `<AlertBanner theme="info" onClose={dismiss}>Zen is read-only tonight from 11:00 pm to 1:00 am while the studio moves to a new data centre.</AlertBanner>`,
  );
  const floatingPart = part(
    // zen-allow-accent: the assistant launcher is the promoted action (Figma HR-Platform Floating-Item).
    <IconButton level="accent" icon="icon-zen" aria-label="Ask Zen AI" onClick={() => report("Ask Zen AI · onClick ran")} />,
    `<IconButton level="accent" icon="icon-zen" aria-label="Ask Zen AI" onClick={openAssistant} />`,
  );
  const header = (
    <AppShellHeader leading={leading?.node} center={center?.node} actions={actions.length ? <>{actions.map((entry, index) => <Fragment key={index}>{entry.node}</Fragment>)}</> : undefined}
      main={main?.node} sections={sections?.node} />
  );
  const headerCode = `<AppShellHeader\n${[
    leading && attr("leading", leading.code),
    center && attr("center", center.code),
    actions.length ? attr("actions", group(actions.map((entry) => entry.code))) : null,
    main && attr("main", main.code),
    sections && attr("sections", sections.code),
  ].filter(Boolean).map((line) => `  ${indent(line as string, "  ")}`).join("\n")}\n/>`;
  const hasHeader = Boolean(leading || center || actions.length || main || sections || (sidebarPattern && collapse === "header"));

  // zen-allow-pattern-parts: the builder passes each pane and the progress only to the patterns that draw them (the Pattern picker sets pattern).
  const shell = (
    <AppShell
      pattern={pattern}
      collapse={sidebarPattern ? collapse : undefined}
      canvas={canvas}
      mainId="pash-playground-main"
      sidebar={sidebarPattern ? sidebar.node : undefined}
      sidebarCollapsed={sidebarPattern ? collapsed : undefined}
      onSidebarCollapsedChange={sidebarPattern ? setCollapsed : undefined}
      banner={banner ? bannerPart.node : undefined}
      header={hasHeader ? header : undefined}
      leadingPane={leadingPane?.node}
      trailingPane={trailingPane?.node}
      progress={progress?.node}
      sidePanel={sidePanel?.node}
      floatingActions={floating ? floatingPart.node : undefined}
      mobileTop={mobile ? mobileTop : undefined}
      topNavigation={mobile ? topNavigation.node : undefined}
      hero={withHero ? hero.node : undefined}
      backdrop={withBackdrop ? backdrop.node : undefined}
      bottomNavigation={mobile && (bottom === "tab-bar" || bottom === "floating") ? bottomNavigation.node : undefined}
      actionBar={mobile && bottom === "actions" ? actionBarPart.node : undefined}
    >
      {body.node}
    </AppShell>
  );

  const props = [
    pattern === "sidebar" ? null : `pattern="${pattern}"`,
    sidebarPattern && collapse !== "header" ? `collapse="${collapse}"` : null,
    canvas === "default" ? null : `canvas="${canvas}"`,
    sidebarPattern ? "sidebarCollapsed={collapsed} // store it per person" : null,
    sidebarPattern ? "onSidebarCollapsedChange={setCollapsed}" : null,
    sidebarPattern ? attr("sidebar", sidebar.code) : null,
    banner ? attr("banner", bannerPart.code) : null,
    hasHeader ? attr("header", headerCode) : null,
    leadingPane ? attr("leadingPane", leadingPane.code) : null,
    trailingPane ? attr("trailingPane", trailingPane.code) : null,
    progress ? attr("progress", progress.code) : null,
    sidePanel ? attr("sidePanel", sidePanel.code) : null,
    floating ? `// zen-allow-accent: the assistant launcher is the promoted action (Figma HR-Platform Floating-Item).\n${attr("floatingActions", floatingPart.code)}` : null,
    mobile && mobileTop !== "bar" ? `mobileTop="${mobileTop}"` : null,
    mobile ? attr("topNavigation", topNavigation.code) : null,
    withHero ? attr("hero", hero.code) : null,
    withBackdrop ? attr("backdrop", backdrop.code) : null,
    mobile && (bottom === "tab-bar" || bottom === "floating") ? attr("bottomNavigation", bottomNavigation.code) : null,
    mobile && bottom === "actions" ? attr("actionBar", actionBarPart.code) : null,
  ].filter(Boolean).map((line) => `  ${indent(line as string, "  ")}`).join("\n");
  const snippet = `<AppShell${props ? `\n${props}\n` : " "}>\n  ${indent(body.code, "  ")}\n</AppShell>`;
  // The import line names exactly the Zen components the snippet uses (StepActions is the app's own).
  const imports = [...new Set([...snippet.matchAll(/<([A-Z][A-Za-z]+)/g)].map((match) => match[1]))].filter((name) => name !== "StepActions").sort().join(", ");

  // What the window shows: the desktop pattern from 1024px; narrower the mobile pattern with mobile parts, else the drawer.
  const frame = windows[win];
  const drawn = frame.width >= 1024 ? "desktop" : mobile ? "mobile" : "drawer";
  const note = drawn === "desktop"
    ? `${frame.label}: the ${patternLabel[pattern]} pattern${mobile ? "; the mobile parts wait for a window under 1024px" : ""}${sidePanel && sidebarPattern && frame.width - (collapsed ? 80 : 240) - 360 < 744 ? ". The page would get narrower than 744px beside the side panel, so it opens as a modal" : ""}.`
    : drawn === "mobile"
      ? `${frame.label}: the mobile pattern, Top ${optionLabel(topOptions, mobileTop)} · Bottom ${optionLabel(bottomOptions, bottom)}. The header, the panes and the Sidebar wait for 1024px.`
      : `${frame.label}: no mobile parts, so the narrow shell keeps its header${sidebarPattern ? " and opens the Sidebar as a drawer from the menu button" : ""}${leadingPane || trailingPane ? "; the panes stack around the page" : ""}.`;

  return (
    <Panel
      title="App Shell"
      previewClassName="pash-preview"
      screen
      controls={<>
        <PlaygroundFilterChip label="Window" value={win} onChange={(value) => chooseWindow((String(value) || "1440") as WindowId)} options={(Object.keys(windows) as WindowId[]).map((id) => option(id, windows[id].label))} />
        <PlaygroundFilterChip label="Pattern" value={pattern} onChange={(value) => choosePattern((String(value) || "sidebar") as AppShellPattern)} options={patternOptions} />
        {sidebarPattern ? <PlaygroundFilterChip label="Collapse" value={collapse} onChange={(value) => setCollapse((String(value) || "header") as AppShellCollapse)} options={[option("header", "Header"), option("sidebar", "Sidebar"), option("none", "None")]} /> : null}
        {sidebarPattern ? <PlaygroundToggle label="Collapsed" selected={collapsed} onChange={setCollapsed} /> : null}
        <PlaygroundFilterChip label="Canvas" value={canvas} onChange={(value) => chooseCanvas((String(value) || "default") as "default" | "alt" | "flat")} options={[option("default", "Default (grey)"), option("alt", "Alt (white)"), option("flat", "Flat")]} />
        {sidebarPattern && canvas === "alt" ? <PlaygroundFilterChip label="Sidebar" value={sidebarStyle} onChange={(value) => setSidebarStyle((String(value) || "alt") as "alt" | "flat")} options={[option("alt", "Surface-alt"), option("flat", "Flat")]} /> : null}
        {sidebarPattern && canvas === "alt" ? <PlaygroundToggle label="Sidebar divider" selected={divider} onChange={setDivider} /> : null}
        {sidebarPattern ? <PlaygroundToggle label="Top row" selected={topRow} onChange={setTopRow} /> : null}
        {sidebarPattern ? <PlaygroundToggle label="Sections" selected={withSections} onChange={setWithSections} /> : null}
        {(sidebarPattern && topRow) || pattern === "top-bar" ? <PlaygroundFilterChip label="Notifications" value={notifications} onChange={(value) => setNotifications((String(value) || "count") as "count" | "dot" | "none")} options={[option("count", "Count"), option("dot", "Dot"), option("none", "None")]} /> : null}
        {pattern === "workspace" || pattern === "docs" ? <PlaygroundToggle label="Leading pane" selected={withLeading} onChange={setWithLeading} /> : null}
        {pattern === "workspace" || pattern === "docs" || pattern === "focus" ? <PlaygroundToggle label="Trailing pane" selected={withTrailing} onChange={setWithTrailing} /> : null}
        {pattern === "focus" ? <PlaygroundToggle label="Progress" selected={withProgress} onChange={setWithProgress} /> : null}
        {sidebarPattern || pattern === "top-bar" ? <PlaygroundToggle label="Side panel" selected={panel} onChange={setPanel} /> : null}
        <PlaygroundToggle label="Floating actions" selected={floating} onChange={setFloating} />
        <PlaygroundToggle label="Banner" selected={banner} onChange={setBanner} />
        <PlaygroundToggle label="Mobile parts" selected={mobile} onChange={setMobile} />
        {mobile ? <PlaygroundFilterChip label="Mobile top" value={mobileTop} onChange={(value) => setMobileTop((String(value) || "bar") as AppShellMobileTop)} options={topOptions} /> : null}
        {mobile ? <PlaygroundFilterChip label="Mobile bottom" value={bottom} onChange={(value) => setBottom((String(value) || "tab-bar") as Bottom)} options={bottomOptions} /> : null}
      </>}
      code={`import { ${imports} } from "@zen-ds/react";\n\n${snippet}`}
    >
      {win === "ipad" || win === "phone" ? (
        <Stack align="center" width="fill">
          <PlatformPhone key={win} device={win === "ipad" ? "ipad" : "iphone"} label="App Shell preview" maxHeight={720}
            canvas={mobile && (mobileTop === "band-sheet" || mobileTop === "media") ? "surface" : canvas === "default" ? "default" : canvas}
            statusBar={mobile && mobileTop === "media" ? "light" : "dark"}>
            {shell}
          </PlatformPhone>
        </Stack>
      ) : (
        <DesktopWindow key={win} width={frame.width} height={frame.height}>{shell}</DesktopWindow>
      )}
      <PreviewNotes>
        <Text as="p" textStyle="Body/Small/Regular" tone="base">{note}</Text>
        {ran ? <Text as="p" textStyle="Body/Small/Regular" tone="light" role="status">{ran}</Text> : null}
      </PreviewNotes>
    </Panel>
  );
}

/* ───────────── PageHeader ───────────── */

function PageHeaderPlayground() {
  const [withActions, setWithActions] = useState(true);
  const [withTabs, setWithTabs] = useState(false);
  const [withBreadcrumbs, setWithBreadcrumbs] = useState(false);
  const [withBack, setWithBack] = useState(false);
  const [tab, setTab] = useState("overview");
  const [clicks, setClicks] = useState(0);
  // Share reports what ran under the preview; Publish toggles the status (a playground has no toast host).
  const [shared, setShared] = useState(false);
  const [published, setPublished] = useState(false);
  return (
    <Panel
      title="Page Header"
      previewClassName="pash-preview"
      controls={<>
        <PlaygroundToggle label="Actions" selected={withActions} onChange={setWithActions} />
        <PlaygroundToggle label="Breadcrumbs" selected={withBreadcrumbs} onChange={setWithBreadcrumbs} />
        <PlaygroundToggle label="Back" selected={withBack} onChange={setWithBack} />
        <PlaygroundToggle label="Tabs" selected={withTabs} onChange={setWithTabs} />
      </>}
      code={`import { PageHeader } from "@zen-ds/react";

<PageHeader
  title="Brand refresh"
  description="Logo, colour and type updates for the 2026 launch."${withBack ? `
  back={{ label: "Projects", onClick: goBack }}` : ""}${withBreadcrumbs ? `
  breadcrumbs={<Breadcrumbs items={[{ id: "projects", label: "Projects" }, { id: "brand", label: "Brand refresh" }]} />}` : ""}${withActions ? `
  actions={<><Button level="tertiary" onClick={share}>Share</Button><Button level="primary" onClick={publish}>Publish</Button></>}` : ""}${withTabs ? `
  tabs={<Tabs aria-label="Project sections" items={sections} value={tab} onChange={setTab} />}` : ""}
/>`}
    >
      <div className="pash-page-header-stage">
        <PageHeader
          title="Brand refresh"
          description="Logo, colour and type updates for the 2026 launch."
          back={withBack ? { label: "Projects", onClick: () => setClicks((count) => count + 1) } : undefined}
          breadcrumbs={withBreadcrumbs ? <Breadcrumbs items={[{ id: "projects", label: "Projects" }, { id: "brand", label: "Brand refresh" }]} onNavigate={(_item, event) => event.preventDefault()} /> : undefined}
          meta={<Badge size="small" theme="green" background="subtle">{clicks ? "Back pressed" : published ? "Published" : "In review"}</Badge>}
          actions={withActions ? <><Button level="tertiary" onClick={() => setShared(true)}>Share</Button><Button level={published ? "tertiary" : "primary"} onClick={() => setPublished(!published)}>{published ? "Unpublish" : "Publish"}</Button></> : undefined}
          tabs={withTabs ? <Tabs aria-label="Project sections" items={[{ id: "overview", label: "Overview" }, { id: "files", label: "Files" }, { id: "activity", label: "Activity" }]} value={tab} onChange={setTab} /> : undefined}
        />
      </div>
      {shared ? <Text as="p" textStyle="Body/Small/Regular" tone="light" role="status">“Share” pressed · onClick ran</Text> : null}
    </Panel>
  );
}

type DashboardRow = "control-bar" | "navigation" | "main" | "custom";
const dashboardRows = [option("control-bar", "Control-Bar"), option("navigation", "Navigation"), option("main", "Main"), option("custom", "Custom")];

/** Dashboard Header playground: Figma's Type and each type's booleans (Search, Controls, Subheading, Actions,
 *  Nav-Center-Block, Nav-Trailing-Block, Child-Heading), on the row as the sections of an AppShell pad it. */
function DashboardHeaderPlayground() {
  const [type, setType] = useState<DashboardRow>("control-bar");
  const [search, setSearch] = useState(true);
  const [controls, setControls] = useState(true);
  const [subheading, setSubheading] = useState(false);
  const [actions, setActions] = useState(true);
  const [center, setCenter] = useState(false);
  const [trailing, setTrailing] = useState(true);
  const [childTitle, setChildTitle] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [ran, setRan] = useState<string | null>(null);
  const actionButtons = <><Button level="tertiary" onClick={() => setRan("“Export report” pressed · onClick ran")}>Export report</Button><Button level="primary" onClick={() => setRan("“Submit leave” pressed · onClick ran")}>Submit leave</Button></>;
  const statusChip = (
    <Chip variant="advanced" dropdown selected={status !== null} popoverLabel="Status" popoverItems={["Pending", "Approved", "Declined"].map((id) => ({ id, label: id, selected: status === id }))}
      onPopoverSelect={(item) => setStatus(status === item.id ? null : item.id)} onClearSelection={() => setStatus(null)}>{status ?? "Status"}</Chip>
  );
  const icons = <><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={8} onClick={() => setRan("Notifications pressed · onClick ran")} /><Avatar size="md" alt="Alex Duong" theme="indigo">AD</Avatar></>;
  const toggles = type === "control-bar"
    ? <><PlaygroundToggle label="Search" selected={search} onChange={setSearch} /><PlaygroundToggle label="Controls" selected={controls} onChange={setControls} /><PlaygroundToggle label="Subheading" selected={subheading} onChange={setSubheading} /><PlaygroundToggle label="Actions" selected={actions} onChange={setActions} /></>
    : type === "navigation"
      ? <><PlaygroundToggle label="Nav-Center-Block" selected={center} onChange={setCenter} /><PlaygroundToggle label="Nav-Trailing-Block" selected={trailing} onChange={setTrailing} /></>
      : type === "main"
        ? <><PlaygroundToggle label="Child-Heading" selected={childTitle} onChange={setChildTitle} /><PlaygroundToggle label="Subheading" selected={subheading} onChange={setSubheading} /><PlaygroundToggle label="Actions" selected={actions} onChange={setActions} /><PlaygroundToggle label="Nav-Trailing-Block" selected={trailing} onChange={setTrailing} /></>
        : null;
  const code = type === "control-bar"
    ? `<DashboardHeader${search ? `\n  search={<Search size="md" placeholder="Search leave requests" onValueChange={setQuery} />}` : ""}${controls ? "\n  controls={<Chip variant=\"advanced\" dropdown popoverLabel=\"Status\" popoverItems={statuses} onPopoverSelect={pick}>Status</Chip>}" : ""}${subheading ? "\n  subheading=\"96 results\"" : ""}${actions ? "\n  actions={<><Button level=\"tertiary\" onClick={exportCsv}>Export report</Button><Button level=\"primary\" onClick={submitLeave}>Submit leave</Button></>}" : ""}\n/>`
    : type === "navigation"
      ? `<DashboardHeader\n  type="navigation"\n  leading={<Breadcrumbs items={trail} onNavigate={go} />}${center ? "\n  center={<Search size=\"md\" placeholder=\"Search Đìzai Studio\" />}" : ""}${trailing ? "\n  trailing={<><AppShellAction icon=\"icon-bell-01-line\" aria-label=\"Notifications\" count={8} onClick={openInbox} /><Avatar size=\"md\" alt=\"Alex Duong\">AD</Avatar></>}" : ""}\n/>`
      : type === "main"
        ? `<DashboardHeader\n  type="main"\n  title="My leaves"${childTitle ? "\n  childTitle=\"2026\"" : ""}${subheading ? "\n  subheading=\"12 days left this year.\"" : ""}${actions ? "\n  actions={<><Button level=\"tertiary\" onClick={exportCsv}>Export report</Button><Button level=\"primary\" onClick={submitLeave}>Submit leave</Button></>}" : ""}${trailing ? "\n  trailing={<AppShellAction icon=\"icon-bell-01-line\" aria-label=\"Notifications\" count={8} onClick={openInbox} />}" : ""}\n/>`
        : `<DashboardHeader type="custom">\n  <Segmented aria-label="Reporting period" options={periods} value={period} onValueChange={setPeriod} />\n  <Text textStyle="Body/Base/Medium">Sep 1 – Sep 30, 2026</Text>\n</DashboardHeader>`;
  return (
    <Panel
      title="Dashboard Header"
      previewClassName="pash-preview"
      controls={<>
        <PlaygroundFilterChip label="Type" value={type} onChange={(value) => setType((String(value) || "control-bar") as DashboardRow)} options={dashboardRows} />
        {toggles}
      </>}
      code={`import { DashboardHeader } from "@zen-ds/react";\n\n${code}`}
    >
      <div className="pash-dashboard-header-stage">
        {type === "control-bar" ? (
          <DashboardHeader search={search ? <Search size="md" placeholder="Search leave requests" /> : undefined} controls={controls ? statusChip : undefined} subheading={subheading ? "96 results" : undefined} actions={actions ? actionButtons : undefined} />
        ) : type === "navigation" ? (
          <DashboardHeader type="navigation" leading={<Breadcrumbs items={[{ id: "home", label: "Home" }, { id: "leaves", label: "My leaves" }]} onNavigate={(_item, event) => event.preventDefault()} />} center={center ? <Search size="md" placeholder="Search Đìzai Studio" /> : undefined} trailing={trailing ? icons : undefined} />
        ) : type === "main" ? (
          <DashboardHeader type="main" title="My leaves" childTitle={childTitle ? "2026" : undefined} subheading={subheading ? "12 days left this year." : undefined} actions={actions ? actionButtons : undefined} trailing={trailing ? <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={8} onClick={() => setRan("Notifications pressed · onClick ran")} /> : undefined} />
        ) : (
          <DashboardHeader type="custom"><Segmented aria-label="Reporting period" options={[{ id: "week", label: "Week" }, { id: "month", label: "Month" }]} defaultValue="month" /><Text textStyle="Body/Base/Medium">Sep 1 – Sep 30, 2026</Text></DashboardHeader>
        )}
      </div>
      {ran ? <Text as="p" textStyle="Body/Small/Regular" tone="light" role="status">{ran}</Text> : null}
    </Panel>
  );
}


export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = keepOnHotUpdate(import.meta.hot, "pages", {
  "app-shell": {
    label: "App Shell",
    eyebrow: "Components / App Shell",
    title: "App Shell",
    description: "Build an app's frame from Figma's AppShell patterns (◇ Master-Layout): pick the desktop pattern (Sidebar, List-Detail, Top-Bar, Workspace, Docs, Focus), where the Sidebar's toggle sits, the header rows, panes, progress, side panel and floating actions, then the mobile parts (Top Bar, Band, Band-Sheet or Media; Bottom Tab-Bar, Floating or Actions). The window shows what the same AppShell draws at that width, and the code is the AppShell you built.",
    playground: AppShellPlayground,
  },
  "page-header": {
    label: "Page Header",
    eyebrow: "Components / Page Header",
    title: "Page Header",
    description: "The top of an app page: breadcrumbs or Back, the h1 title with meta and actions, a description and section tabs.",
    playground: PageHeaderPlayground,
  },
  "dashboard-header": {
    label: "Dashboard Header",
    eyebrow: "Components / Dashboard Header",
    title: "Dashboard Header",
    description: "One row of a dashboard page's header (Figma ◇ Master-Layout Primitives/Dashboard/Header): a control bar with Search, filters, the result count and the page's actions; a navigation bar; the page title row; or your own row. Inside an AppShell the rows go in sections.",
    playground: DashboardHeaderPlayground,
  },
});

// The examples of these pages live in src/platform/examples/pages/<page>.tsx (examples/registry.ts).
export const examples: ExampleMap = {};
