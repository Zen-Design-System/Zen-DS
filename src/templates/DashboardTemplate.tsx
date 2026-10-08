/**
 * Template: dashboard (a product studio's operations overview). Copy it into your app, then replace the sample data and
 * handlers. Render it inside your app's <ZenProvider>. Uses only @zen-ds/react components, no custom CSS.
 *
 * - Top bar: Search (filters the projects; Enter opens the first match), Notifications (a docked Side Panel) and the
 *   account menu.
 * - PageHeader: Export (Tertiary) and New project (Primary → a validated ModalForm). The period Chip under it scopes the
 *   tiles and the projects, and moves the highlighted month of both charts.
 * - Four KPI tiles, each with its breakdown in a Side Panel; revenue or profit per month (Segmented) and billable hours
 *   by team (the chevron opens the exact figures).
 * - Active projects: a Status filter chip and a sortable Table (a List on phones). A row opens the project in a Side
 *   Panel, where Mark at risk / Mark on track changes its status and offers Undo. Recent activity rows open their project.
 * - Phone: the period and Status chips open their choices in Bottom Sheets.
 */
import { useRef, useState, type ReactNode } from "react";
import {
  AppShell,
  AppShellAccount,
  AppShellAction,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  ChartCard,
  Chip,
  Container,
  DateField,
  DescriptionList,
  DockIcon,
  EmptyState,
  Grid,
  Heading,
  Icon,
  IconButton,
  InputField,
  LineChart,
  List, ListBox,
  ListItem,
  Menu,
  Metric,
  MetricCard,
  ModalForm,
  PageHeader,
  ProgressBar,
  Search,
  SelectField,
  SidePanel,
  Sidebar,
  Stack,
  StackBarChart,
  Table,
  TableBadges,
  TableMedia,
  TableText,
  Text,
  plural,
  useFormState,
  useToast,
  useZen,
  type AvatarTheme,
  type BadgeTheme,
  type DescriptionListItem,
  type DockIconTheme,
  type IconName,
  type SidebarSection,
  type TableColumn,
  type TableSort,
} from "@zen-ds/react";

/* ── Sample data: replace with your own ─────────────────────────────── */
const workspace = { name: "Đìzai Studio", initial: "Đ" };
/** "Now" for the sample data: Wednesday, Sep 30, 2026 at 3:20 pm. */
const NOW = new Date(2026, 8, 30, 15, 20);
const TODAY = "2026-09-30";

type PersonId = "khoa" | "alex" | "bao" | "chi" | "em" | "minh-anh" | "gia" | "duy" | "hana";
const people: Record<PersonId, { name: string; role: string; initials: string; theme: AvatarTheme }> = {
  khoa: { name: "Khoa Dang", role: "Managing director", initials: "KD", theme: "neutral" },
  alex: { name: "Alex Duong", role: "Design lead", initials: "AD", theme: "blue" },
  bao: { name: "Bao Nguyen", role: "Product designer", initials: "BN", theme: "green" },
  chi: { name: "Chi Tran", role: "UX researcher", initials: "CT", theme: "pink" },
  em: { name: "Em Pham", role: "Brand designer", initials: "EP", theme: "orange" },
  "minh-anh": { name: "Minh Anh Vo", role: "Motion designer", initials: "MV", theme: "violet" },
  gia: { name: "Gia Pham", role: "Engineering lead", initials: "GP", theme: "indigo" },
  duy: { name: "Duy Le", role: "Frontend engineer", initials: "DL", theme: "teal" },
  hana: { name: "Hana Kim", role: "Product manager", initials: "HK", theme: "plum" },
};
/** The signed-in person. */
const ME: PersonId = "khoa";
const me = people[ME];

type ClientId = "hanoi-metro" | "lotus" | "vina-health" | "mekong" | "ledgerly" | "kova" | "studio-marin" | "saigon-bloom";
const clients: Record<ClientId, { name: string; initials: string; theme: AvatarTheme }> = {
  "hanoi-metro": { name: "Hanoi Metro", initials: "HM", theme: "red" },
  lotus: { name: "Lotus Coffee Co.", initials: "LC", theme: "orange" },
  "vina-health": { name: "Vina Health", initials: "VH", theme: "green" },
  mekong: { name: "Mekong Travel", initials: "MT", theme: "teal" },
  ledgerly: { name: "Ledgerly", initials: "LE", theme: "indigo" },
  kova: { name: "Kova Capital", initials: "KC", theme: "blue" },
  "studio-marin": { name: "Studio Marin", initials: "SM", theme: "violet" },
  "saigon-bloom": { name: "Saigon Bloom", initials: "SB", theme: "pink" },
};

/** Billable teams; capacity is their billable hours a month (people × 140 h). */
type TeamId = "design" | "engineering" | "product";
const teams: Array<{ id: TeamId; label: string; capacity: number }> = [
  { id: "design", label: "Design", capacity: 1260 },
  { id: "engineering", label: "Engineering", capacity: 2800 },
  { id: "product", label: "Product", capacity: 840 },
];
/** The studio's books for 2026 so far: revenue and costs in USD, billable hours per team. */
type Month = { label: string; revenue: number; costs: number; hours: Record<TeamId, number> };
const months: Month[] = [
  { label: "Jan", revenue: 148200, costs: 112400, hours: { design: 980, engineering: 2150, product: 610 } },
  { label: "Feb", revenue: 139600, costs: 108900, hours: { design: 890, engineering: 1980, product: 560 } },
  { label: "Mar", revenue: 156900, costs: 114300, hours: { design: 1010, engineering: 2210, product: 640 } },
  { label: "Apr", revenue: 161300, costs: 116800, hours: { design: 980, engineering: 2150, product: 630 } },
  { label: "May", revenue: 168400, costs: 118200, hours: { design: 1010, engineering: 2230, product: 640 } },
  { label: "Jun", revenue: 172800, costs: 121500, hours: { design: 1030, engineering: 2270, product: 650 } },
  { label: "Jul", revenue: 169500, costs: 122900, hours: { design: 1000, engineering: 2260, product: 640 } },
  { label: "Aug", revenue: 181200, costs: 124100, hours: { design: 1070, engineering: 2330, product: 680 } },
  { label: "Sep", revenue: 190700, costs: 126400, hours: { design: 1040, engineering: 2310, product: 690 } },
];
/** Both charts show the last six months. */
const chartMonths = months.slice(-6);
const chartOffset = months.length - chartMonths.length;
const chartRange = "Apr – Sep 2026";

/** Each period is compared with the one before it; `months` index into the books above. */
type PeriodId = "this-month" | "last-month" | "this-quarter" | "last-quarter";
type Period = { label: string; name: string; range: string; end: string; months: number[]; previous: number[]; previousName: string; previousEnd: string };
const periods: Record<PeriodId, Period> = {
  "this-month": { label: "This month", name: "September 2026", range: "Sep 1 – Sep 30, 2026", end: "2026-09-30", months: [8], previous: [7], previousName: "August", previousEnd: "2026-08-31" },
  "last-month": { label: "Last month", name: "August 2026", range: "Aug 1 – Aug 31, 2026", end: "2026-08-31", months: [7], previous: [6], previousName: "July", previousEnd: "2026-07-31" },
  "this-quarter": { label: "This quarter", name: "Q3 2026", range: "Jul 1 – Sep 30, 2026", end: "2026-09-30", months: [6, 7, 8], previous: [3, 4, 5], previousName: "Q2", previousEnd: "2026-06-30" },
  "last-quarter": { label: "Last quarter", name: "Q2 2026", range: "Apr 1 – Jun 30, 2026", end: "2026-06-30", months: [3, 4, 5], previous: [0, 1, 2], previousName: "Q1", previousEnd: "2026-03-31" },
};
const periodIds = Object.keys(periods) as PeriodId[];

type Health = "On track" | "At risk" | "Off track";
const healths: Health[] = ["On track", "At risk", "Off track"];
const healthTheme: Record<Health, BadgeTheme> = { "On track": "green", "At risk": "yellow", "Off track": "red" };
const healthRank: Record<Health, number> = { "Off track": 0, "At risk": 1, "On track": 2 };
/** Client projects. `revenue` runs April to September (the chart months); `billed` is everything invoiced so far. */
type Project = { id: string; name: string; client: ClientId; lead: PersonId; health: Health; start: string; due: string; budget: number; billed: number; revenue: number[] };
const seedProjects: Project[] = [
  { id: "ticketing", name: "Ticketing platform", client: "hanoi-metro", lead: "gia", health: "At risk", start: "2026-01-12", due: "2026-12-15", budget: 420000, billed: 335200, revenue: [38200, 39500, 40100, 36800, 37900, 38400] },
  { id: "rewards", name: "Rewards app", client: "lotus", lead: "bao", health: "On track", start: "2026-03-02", due: "2026-11-20", budget: 260000, billed: 183700, revenue: [24800, 26100, 27400, 25900, 28600, 29300] },
  { id: "patient", name: "Patient app", client: "vina-health", lead: "duy", health: "Off track", start: "2026-02-09", due: "2026-10-23", budget: 150000, billed: 162500, revenue: [21300, 22000, 21700, 19800, 20400, 18900] },
  { id: "booking", name: "Booking redesign", client: "mekong", lead: "chi", health: "On track", start: "2026-04-06", due: "2026-10-30", budget: 120000, billed: 90000, revenue: [9600, 14200, 15800, 16400, 17100, 16900] },
  { id: "tokens", name: "Design system", client: "ledgerly", lead: "alex", health: "On track", start: "2026-05-11", due: "2026-10-16", budget: 72000, billed: 60500, revenue: [0, 8400, 12600, 13200, 12800, 13500] },
  { id: "investor", name: "Investor portal", client: "kova", lead: "hana", health: "At risk", start: "2026-08-03", due: "2027-01-15", budget: 96000, billed: 25500, revenue: [0, 0, 0, 0, 11200, 14300] },
  { id: "brand", name: "Brand refresh", client: "studio-marin", lead: "minh-anh", health: "On track", start: "2026-07-06", due: "2026-10-21", budget: 36000, billed: 25100, revenue: [0, 0, 0, 7400, 9100, 8600] },
  { id: "store", name: "Online store", client: "saigon-bloom", lead: "em", health: "On track", start: "2026-09-28", due: "2026-12-04", budget: 38000, billed: 2400, revenue: [0, 0, 0, 0, 0, 2400] },
];

/** Recent activity, newest first. The title is the event; the caption says who, on which project and when. People
 * lead with their Avatar, client events with a Dock Icon. */
type Activity = { id: string; project: string; at: Date; title: string } & ({ by: PersonId } | { client: ClientId; icon: IconName; theme: DockIconTheme });
const seedActivity: Activity[] = [
  { id: "prototype", project: "rewards", at: new Date("2026-09-30T15:07"), title: "Checkout prototype shared", by: "bao" },
  { id: "token-set", project: "tokens", at: new Date("2026-09-30T11:40"), title: "Token set approved", client: "ledgerly", icon: "icon-file-check-line", theme: "green" },
  { id: "ticketing-risk", project: "ticketing", at: new Date("2026-09-30T09:05"), title: "Marked at risk", by: "gia" },
  { id: "inv-0139", project: "booking", at: new Date("2026-09-29T16:12"), title: "INV-0139 paid", client: "mekong", icon: "icon-bank-note-01-line", theme: "green" },
  { id: "launch", project: "patient", at: new Date("2026-09-29T10:30"), title: "Launch moved to Oct 23", by: "duy" },
  { id: "q-0031", project: "store", at: new Date("2026-09-28T11:20"), title: "Quote Q-0031 accepted", client: "saigon-bloom", icon: "icon-file-check-line", theme: "blue" },
  { id: "brand-guide", project: "brand", at: new Date("2026-09-28T09:40"), title: "Brand guide shared", by: "minh-anh" },
  { id: "interviews", project: "booking", at: new Date("2026-09-24T14:10"), title: "6 user interviews booked", by: "chi" },
  { id: "inv-0142", project: "rewards", at: new Date("2026-09-16T09:00"), title: "INV-0142 overdue", client: "lotus", icon: "icon-clock-line", theme: "red" },
  { id: "scope", project: "investor", at: new Date("2026-09-14T14:30"), title: "12 screens added to scope", by: "hana" },
];
const ACTIVITY_PREVIEW = 7;

const notices: Array<{ id: string; project: string; title: string; caption: string; icon: IconName; theme: DockIconTheme }> = [
  { id: "overdue", project: "rewards", title: "INV-0142 is 15 days overdue", caption: "Lotus Coffee Co. · Due Sep 15", icon: "icon-clock-line", theme: "red" },
  { id: "off-track", project: "patient", title: "Patient app is off track", caption: "Over budget · Yesterday at 10:30 am", icon: "icon-alert-triangle-line", theme: "orange" },
  { id: "quote", project: "store", title: "Saigon Bloom accepted a quote", caption: "Q-0031 · Monday at 11:20 am", icon: "icon-file-check-line", theme: "blue" },
];

const nav: SidebarSection[] = [
  { items: [
    { id: "overview", label: "Overview", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "clients", label: "Clients", icon: "icon-briefcase-line" },
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
    { id: "time", label: "Time", icon: "icon-clock-line" },
    { id: "reports", label: "Reports", icon: "icon-bar-chart-01-line" },
    { id: "settings", label: "Settings", icon: "icon-settings-01-line" },
  ] },
];

/* ── Helpers ─────────────────────────────────────────────────────────── */
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const usdShort = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
/** "$113,100" in tables and panels; "$541.4K" on tiles and chart axes (the panels hold the exact figures). */
const money = (value: number) => usd.format(value);
const moneyShort = (value: number) => usdShort.format(value);
const hours = (value: number) => `${Math.round(value).toLocaleString("en-US")} h`;
const percent = (value: number) => `${Math.round(value)}%`;
const formatDay = (iso: string) => new Date(`${iso}T00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Timestamps follow one ladder: Just now · 13 minutes ago · 10:30 am · Yesterday at 10:30 am · Friday at 10:30 am ·
 * Sep 14 at 10:30 am · Dec 18, 2025. */
const clock = (date: Date) => date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
function when(date: Date) {
  const minutes = Math.floor((NOW.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${plural(minutes, "minute")} ago`;
  const days = Math.round((dayStart(NOW) - dayStart(date)) / 86400000);
  if (days === 0) return clock(date);
  if (days === 1) return `Yesterday at ${clock(date)}`;
  if (days < 7) return `${date.toLocaleDateString("en-US", { weekday: "long" })} at ${clock(date)}`;
  if (date.getFullYear() === NOW.getFullYear()) return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${clock(date)}`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** A period's books: revenue, costs and profit, the margin, and utilization (billable hours ÷ capacity). */
function booksOf(indexes: number[]) {
  const picked = indexes.map((index) => months[index]);
  const revenue = sum(picked.map((month) => month.revenue));
  const costs = sum(picked.map((month) => month.costs));
  const billable = sum(picked.map((month) => sum(Object.values(month.hours))));
  const capacity = sum(teams.map((team) => team.capacity)) * picked.length;
  return { revenue, costs, profit: revenue - costs, margin: ((revenue - costs) / revenue) * 100, billable, utilization: (billable / capacity) * 100 };
}
/** A project's revenue in the given months; its figures start with the charts, in April. */
const revenueIn = (project: Project, indexes: number[]) => sum(indexes.map((index) => project.revenue[index - chartOffset] ?? 0));
/** Projects count as active from their start day; none has finished this year. */
const activeBy = (list: Project[], end: string) => list.filter((project) => project.start <= end);
/** "+8% vs. Q2" · "−1 pt vs. August" · "Same as Q2"; the direction colours the trend badge. */
function trendOf(delta: number, unit: "%" | "pts" | "count", against: string) {
  const amount = unit === "%" ? `${Math.abs(delta)}%` : unit === "pts" ? `${Math.abs(delta)} ${Math.abs(delta) === 1 ? "pt" : "pts"}` : `${Math.abs(delta)}`;
  const label = delta === 0 ? `Same as ${against}` : `${delta > 0 ? "+" : "−"}${amount} vs. ${against}`;
  // More projects is neither good nor bad news, so that trend stays neutral.
  const direction = unit === "count" || delta === 0 ? "normal" : delta > 0 ? "positive" : "negative";
  return { direction, label } as const;
}

type Row = Project & { earned: number };
const sorters: Record<string, (a: Row, b: Row) => number> = {
  project: (a, b) => a.name.localeCompare(b.name),
  revenue: (a, b) => a.earned - b.earned,
  status: (a, b) => healthRank[a.health] - healthRank[b.health] || b.earned - a.earned,
};
const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

/* ── New project form: DateField speaks MM/DD/YYYY, the data ISO days; the budget is typed as text ── */
type ProjectValues = { name: string; client: string; lead: string; budget: string; due: string };
const blankProject: ProjectValues = { name: "", client: "", lead: "", budget: "", due: "" };
const parseAmount = (text: string) => { const clean = text.replace(/[$,\s]/g, ""); return /^\d+(\.\d{1,2})?$/.test(clean) ? Number(clean) : Number.NaN; };
const fromFieldDate = (text: string) => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  if (date.getMonth() !== Number(match[1]) - 1) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

type ReportId = "revenue" | "margin" | "hours" | "projects";
type Panel = { type: "project"; id: string } | { type: "report"; id: ReportId } | { type: "inbox" } | null;

export function DashboardTemplate() {
  const { toast, dismiss } = useToast();
  const phone = useZen()?.breakpoint === "mobile";
  const [periodId, setPeriodId] = useState<PeriodId>("this-quarter");
  const [measure, setMeasure] = useState<"revenue" | "profit">("revenue");
  const [projects, setProjects] = useState(seedProjects);
  const [activity, setActivity] = useState(seedActivity);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<TableSort | null>({ columnId: "revenue", direction: "desc" });
  const [panel, setPanel] = useState<Panel>(null);
  const [unread, setUnread] = useState(notices.length);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [creating, setCreating] = useState(false);
  // Phone: the period and Status chips open Bottom Sheets (popovers are for pointers).
  const [sheet, setSheet] = useState<"period" | "status" | null>(null);
  const projectsRef = useRef<HTMLElement>(null);
  // Clearing the search or the filter removes the button that did it, so focus goes back to the control.
  const searchRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLButtonElement>(null);
  const nextId = useRef(0);

  /* ── The period: this one's books against the one before ── */
  const period = periods[periodId];
  const books = booksOf(period.months);
  const before = booksOf(period.previous);
  const active = activeBy(projects, period.end);
  const activeBefore = activeBy(projects, period.previousEnd);
  // The period's last month is the highlighted point of both charts; ←/→ move through the others.
  const activeMonth = period.months[period.months.length - 1] - chartOffset;

  const kpis: Array<{ id: ReportId; label: string; value: string; trend: ReturnType<typeof trendOf>; icon: IconName; theme: DockIconTheme }> = [
    { id: "revenue", label: "Revenue", value: moneyShort(books.revenue), trend: trendOf(Math.round(((books.revenue - before.revenue) / before.revenue) * 100), "%", period.previousName), icon: "icon-coins-stacked-01-solid", theme: "green" },
    { id: "margin", label: "Profit margin", value: percent(books.margin), trend: trendOf(Math.round(books.margin) - Math.round(before.margin), "pts", period.previousName), icon: "icon-pie-chart-01-solid", theme: "violet" },
    { id: "hours", label: "Utilization", value: percent(books.utilization), trend: trendOf(Math.round(books.utilization) - Math.round(before.utilization), "pts", period.previousName), icon: "icon-clock-solid", theme: "blue" },
    { id: "projects", label: "Active projects", value: String(active.length), trend: trendOf(active.length - activeBefore.length, "count", period.previousName), icon: "icon-folder-solid", theme: "orange" },
  ];

  /* ── Active projects: the period's revenue, filtered by Search and Status, then sorted ── */
  const q = query.trim().toLowerCase();
  const matches = active
    .map((project): Row => ({ ...project, earned: revenueIn(project, period.months) }))
    .filter((project) => (!q || project.name.toLowerCase().includes(q) || clients[project.client].name.toLowerCase().includes(q))
      && (!statusFilter.length || statusFilter.includes(project.health)));
  const rows = sort ? [...matches].sort((a, b) => sorters[sort.columnId](a, b) * (sort.direction === "asc" ? 1 : -1)) : matches;

  /* ── Actions ── */
  const notInDemo = (label: string) => toast({ title: `${label} isn't part of this demo` });
  const openProject = (id: string) => setPanel({ type: "project", id });
  const close = (open: boolean) => { if (!open) setPanel(null); };
  const search = (value: string) => {
    // The first letter brings the projects into view, where the matches show.
    if (!query.trim() && value.trim()) projectsRef.current?.scrollIntoView({ block: "nearest" });
    setQuery(value);
  };
  /** Adds a line to Recent activity, signed by you; returns its id so Undo can take it back. */
  const log = (project: string, title: string) => {
    const id = `activity-${++nextId.current}`;
    setActivity((list) => [{ id, project, at: NOW, title, by: ME }, ...list]);
    return id;
  };
  /** A status change shows at once; Undo puts the old status back and drops the activity line. */
  const setHealth = (project: Project, health: Health) => {
    const previous = project.health;
    const mark = (next: Health) => setProjects((list) => list.map((item) => (item.id === project.id ? { ...item, health: next } : item)));
    mark(health);
    const entry = log(project.id, `Marked ${health.toLowerCase()}`);
    const id = toast({ title: `${project.name} marked ${health.toLowerCase()}`, action: { label: "Undo", onClick: () => {
      mark(previous);
      setActivity((list) => list.filter((item) => item.id !== entry));
      dismiss(id);
    } } });
  };

  const projectForm = useFormState({
    initialValues: blankProject,
    validate: (values) => {
      const name = values.name.trim();
      const due = fromFieldDate(values.due);
      return {
        name: !name ? "Enter a project name, like Loyalty app"
          : projects.some((project) => project.name.toLowerCase() === name.toLowerCase()) ? `There's already a project called ${name}` : undefined,
        client: values.client ? undefined : "Choose a client",
        lead: values.lead ? undefined : "Choose who leads the project",
        budget: parseAmount(values.budget) > 0 ? undefined : "Enter the budget, like 48,000",
        due: !due ? "Enter the date as MM/DD/YYYY" : due <= TODAY ? "Pick a day after today" : undefined,
      };
    },
    onSubmit: (values, { reset }) => {
      const id = `project-${++nextId.current}`;
      const name = values.name.trim();
      const client = values.client as ClientId;
      setProjects((list) => [...list, { id, name, client, lead: values.lead as PersonId, health: "On track", start: TODAY, due: fromFieldDate(values.due) ?? TODAY, budget: parseAmount(values.budget), billed: 0, revenue: [] }]);
      log(id, "Project created");
      setCreating(false);
      reset();
      const toastId = toast({ title: "Project created", children: `${name} · ${clients[client].name}`, action: { label: "View", onClick: () => { openProject(id); dismiss(toastId); } } });
    },
  });
  const startProject = () => { projectForm.reset(); setCreating(true); };

  /* ── Breakdowns behind the tiles and the hours chart: the exact figures of the period ── */
  const reportOf = (id: ReportId): { title: string; description: string; items: DescriptionListItem[] } => {
    if (id === "revenue") {
      const byProject = active.map((project) => ({ project, earned: revenueIn(project, period.months) })).sort((a, b) => b.earned - a.earned);
      return { title: "Revenue", description: `${period.name}, by project`, items: [
        ...byProject.map(({ project, earned }) => ({ id: project.id, term: project.name, description: money(earned) })),
        { id: "other", term: "Retainers and other work", description: money(books.revenue - sum(byProject.map((item) => item.earned))) },
        { id: "total", term: "Total", description: money(books.revenue), emphasis: true },
      ] };
    }
    if (id === "margin") {
      return { title: "Profit margin", description: `${period.name} · ${percent(books.margin)}, against ${percent(before.margin)} in ${period.previousName}`, items: [
        { id: "revenue", term: "Revenue", description: money(books.revenue) },
        { id: "costs", term: "Team and contractor costs", description: money(books.costs) },
        { id: "profit", term: "Profit", description: money(books.profit), emphasis: true },
      ] };
    }
    if (id === "hours") {
      const teamHours = (team: TeamId) => sum(period.months.map((index) => months[index].hours[team]));
      return { title: "Billable hours by team", description: `${period.name} · hours billed and share of capacity`, items: [
        ...teams.map((team) => ({ id: team.id, term: team.label, description: `${hours(teamHours(team.id))} · ${percent((teamHours(team.id) / (team.capacity * period.months.length)) * 100)}` })),
        { id: "all", term: "All teams", description: `${hours(books.billable)} · ${percent(books.utilization)}`, emphasis: true },
      ] };
    }
    const started = active.filter((project) => project.start > period.previousEnd).length;
    return { title: "Active projects", description: `${period.name} · ${plural(started, "project")} started`, items: [
      ...healths.map((health) => ({ id: health, term: health, description: plural(active.filter((project) => project.health === health).length, "project") })),
      { id: "total", term: "Total", description: plural(active.length, "project"), emphasis: true },
    ] };
  };

  /* ── Rows and marks ── */
  const clientMark = (client: ClientId, size: "sm" | "md") => (
    <Avatar size={size} shape="square" theme={clients[client].theme} background="subtle" alt="">{clients[client].initials}</Avatar>
  );
  const activityMark = (item: Activity) => ("by" in item
    ? <Avatar size="md" theme={people[item.by].theme} background="subtle" alt="">{people[item.by].initials}</Avatar>
    : <DockIcon icon={item.icon} theme={item.theme} background="subtle" size="md" />);
  /** "Bao Nguyen · Rewards app · 13 minutes ago"; a project's own panel leaves the project out. */
  const activityCaption = (item: Activity, withProject: boolean) => [
    "by" in item ? people[item.by].name : clients[item.client].name,
    withProject ? projects.find((project) => project.id === item.project)?.name : undefined,
    when(item.at),
  ].filter(Boolean).join(" · ");
  const kpiTile = (kpi: (typeof kpis)[number]) => (
    <MetricCard key={kpi.id} variant="title-highlight" size={phone ? "md" : "xl"} label={kpi.label} value={kpi.value} trend={kpi.trend}
      icon={kpi.icon} iconTheme={kpi.theme} iconSize="md"
      action={<IconButton size="xs" icon="icon-chevron-right-line" aria-label={`${kpi.label} breakdown`} onClick={() => setPanel({ type: "report", id: kpi.id })} />} />
  );

  const filtered = statusFilter.length > 0;
  const noRows = filtered || !q
    ? <EmptyState title="No projects match" headingLevel={3} illustration={false} icon="icon-search-medium-line" secondaryAction={{ label: "Clear filters", onClick: () => { setStatusFilter([]); statusRef.current?.focus(); } }}>Try another status.</EmptyState>
    : <EmptyState title={`No results for “${query.trim()}”`} headingLevel={3} illustration={false} icon="icon-search-medium-line" secondaryAction={{ label: "Clear search", onClick: () => { setQuery(""); searchRef.current?.focus(); } }}>Search by project or client name.</EmptyState>;
  const check = <Icon name="icon-check-line" size="base" decorative />;
  // Desktop: the chips' Popovers. Phone: each chip opens a Bottom Sheet with the same choices.
  const statusChip = { variant: "advanced", size: phone ? "md" : "sm", dropdown: true, selectionMode: "multiple", selected: filtered, selectionCount: statusFilter.length, onClearSelection: () => setStatusFilter([]) } as const;
  const statusLabel = statusFilter.length === 1 ? statusFilter[0] : "Status";

  const columns: TableColumn<Row>[] = [
    { id: "project", header: "Project", sortable: true, cell: (row) => <TableMedia media={clientMark(row.client, "sm")} caption={clients[row.client].name}>{row.name}</TableMedia> },
    { id: "revenue", header: "Revenue", width: "128px", align: "right", sortable: true, cell: (row) => <TableText>{money(row.earned)}</TableText> },
    { id: "status", header: "Status", width: "136px", sortable: true, cell: (row) => <TableBadges><Badge theme={healthTheme[row.health]} background="subtle">{row.health}</Badge></TableBadges> },
  ];

  /* ── The docked Side Panel: notifications, a project or a breakdown ── */
  let aside: ReactNode;
  const opened = panel?.type === "project" ? projects.find((project) => project.id === panel.id) : undefined;
  if (panel?.type === "inbox") {
    aside = (
      <SidePanel type="standard" title="Notifications" open onOpenChange={close}>
        <List aria-label="Notifications">
          {notices.map((notice) => (
            <ListItem key={notice.id} title={notice.title} caption={notice.caption} leading={<DockIcon icon={notice.icon} theme={notice.theme} background="subtle" size="md" />}
              onClick={() => openProject(notice.project)} />
          ))}
        </List>
      </SidePanel>
    );
  } else if (opened) {
    const lead = people[opened.lead];
    const used = opened.budget ? (opened.billed / opened.budget) * 100 : 0;
    const history = activity.filter((item) => item.project === opened.id);
    aside = (
      <SidePanel type="standard" title={opened.name} description={clients[opened.client].name} open onOpenChange={close}
        primaryAction={{ label: "Open project", onClick: () => notInDemo("The project page") }}
        secondaryAction={opened.health === "On track"
          ? { label: "Mark at risk", onClick: () => setHealth(opened, "At risk") }
          : { label: "Mark on track", onClick: () => setHealth(opened, "On track") }}>
        <Stack gap="lg">
          <Stack direction="row" gap="md" justify="between" align="start">
            <Metric size="md" icon={false} label={`Revenue in ${period.name}`} value={money(revenueIn(opened, period.months))} />
            <Badge theme={healthTheme[opened.health]} background="subtle">{opened.health}</Badge>
          </Stack>
          {/* The bar turns Warning from 75% of the budget and Negative from 90%. */}
          <ProgressBar theme="status" scale="quota" value={Math.min(used, 100)} label={`${percent(used)} of budget billed`} />
          <DescriptionList divider items={[
            { id: "lead", term: "Lead", description: `${lead.name} · ${lead.role}` },
            { id: "started", term: "Started", description: formatDay(opened.start) },
            { id: "due", term: "Due", description: formatDay(opened.due) },
            { id: "budget", term: "Budget", description: money(opened.budget) },
            { id: "billed", term: "Billed to date", description: money(opened.billed) },
          ]} />
          {history.length ? (
            <Stack gap="xs">
              <Heading level={3}>Recent activity</Heading>
              <List aria-label={`Recent activity on ${opened.name}`}>
                {history.map((item) => <ListItem key={item.id} title={item.title} caption={activityCaption(item, false)} leading={activityMark(item)} />)}
              </List>
            </Stack>
          ) : null}
        </Stack>
      </SidePanel>
    );
  } else if (panel?.type === "report") {
    const report = reportOf(panel.id);
    aside = (
      <SidePanel type="standard" size="small" title={report.title} description={report.description} open onOpenChange={close}>
        <DescriptionList divider items={report.items} />
      </SidePanel>
    );
  }

  return (
    <AppShell
      sidebar={(
        <Sidebar
          // The workspace mark and name head the Sidebar (brand grows with density; the logo slot is for a logo image).
          brand={<Stack direction="row" gap="xs" align="center"><Avatar size="sm" shape="square" theme="violet" alt="">{workspace.initial}</Avatar><Text as="span" textStyle="Body/Base/Bold">{workspace.name}</Text></Stack>}
          sections={nav}
          selectedId="overview"
          // Your router goes here: navigate(`/${item.id}`).
          onItemClick={(item) => { if (item.id !== "overview") notInDemo(item.label); }}
        />
      )}
      header={(
        <Search ref={searchRef} aria-label="Search projects" placeholder="Search projects" value={query} onValueChange={search}
          // Enter opens the first match. preventDefault keeps the same key press off the modal panel's Close button,
          // which takes focus when the panel opens as a modal (narrow shells).
          onKeyDown={(event) => { if (event.key === "Enter" && rows[0]) { event.preventDefault(); openProject(rows[0].id); } }} />
      )}
      headerActions={<>
        <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} aria-expanded={panel?.type === "inbox"}
          onClick={() => { setUnread(0); setPanel((current) => (current?.type === "inbox" ? null : { type: "inbox" })); }} />
        <Menu align="end" trigger={<AppShellAccount name={me.name} />} items={[
          { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => notInDemo("Profile") },
          { id: "settings", label: "Studio settings", icon: "icon-settings-01-line", onSelect: () => notInDemo("Studio settings") },
          { type: "separator" },
          { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => notInDemo("Signing out") },
        ]} />
      </>}
      aside={aside}
    >
      <Container>
        <Stack gap="lg" paddingY="lg">
          <Stack gap="md">
            <PageHeader title="Studio overview" description={`Money, capacity and delivery across ${workspace.name}'s client work.`}
              actions={<>
                <Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Overview exported", children: `${period.name} · dizai-studio-overview.csv` })}>Export</Button>
                <Button level="primary" startIcon="icon-plus-line" onClick={startProject}>New project</Button>
              </>} />
            <Stack direction="row" gap="sm" align="center" wrap>
              {phone ? (
                <Chip variant="advanced" size="md" dropdown leading="icon-calendar-line" aria-haspopup="dialog" aria-expanded={sheet === "period"} onClick={() => setSheet("period")}>{period.label}</Chip>
              ) : (
                <Chip variant="advanced" size="md" dropdown leading="icon-calendar-line" popoverLabel="Period"
                  popoverItems={periodIds.map((id) => ({ id, label: periods[id].label, selected: id === periodId }))}
                  onPopoverSelect={(item) => setPeriodId(item.id as PeriodId)}>{period.label}</Chip>
              )}
              <Text as="span" tone="base">{period.range}</Text>
            </Stack>
          </Stack>

          <Stack gap="md">
            {/* Four tiles in a row, two by two, or stacked: never three and one. */}
            <Grid columns="repeat(auto-fit, minmax(min(100%, 496px), 1fr))" gap="md">
              {[kpis.slice(0, 2), kpis.slice(2)].map((pair) => (
                <Grid key={pair[0].id} columns="repeat(auto-fit, minmax(min(100%, 240px), 1fr))" gap="md">{pair.map(kpiTile)}</Grid>
              ))}
            </Grid>

            {/* Side by side the two plots share a baseline: the hours chart is taller by the height of the switch. */}
            <Grid columns="repeat(auto-fit, minmax(min(100%, 360px), 1fr))" gap="md">
              <ChartCard title="Revenue and profit" headingLevel={2} theme="shadow" range={measure} onRangeChange={(id) => setMeasure(id as typeof measure)}
                ranges={[{ id: "revenue", label: "Revenue" }, { id: "profit", label: "Profit" }]} rangesFullWidth={phone}>
                <LineChart key={`${periodId}-${measure}`} initialIndex={activeMonth} height={220} format={moneyShort}
                  aria-label={`${measure === "revenue" ? "Revenue" : "Profit"} per month, ${chartRange}`}
                  data={chartMonths.map((month) => ({ label: month.label, value: measure === "revenue" ? month.revenue : month.revenue - month.costs }))} />
              </ChartCard>
              <ChartCard title="Billable hours by team" headingLevel={2} theme="shadow" onOpen={() => setPanel({ type: "report", id: "hours" })} openLabel="Open billable hours by team">
                <StackBarChart key={periodId} initialIndex={activeMonth} height={phone ? 220 : 276} format={hours}
                  aria-label={`Billable hours by team and month, ${chartRange}`}
                  series={teams.map((team) => ({ id: team.id, label: team.label }))}
                  data={chartMonths.map((month) => ({ label: month.label, values: month.hours }))} />
              </ChartCard>
            </Grid>

            <Grid columns="repeat(auto-fit, minmax(min(100%, 480px), 1fr))" gap="md">
              <Card ref={projectsRef} theme="shadow" as="section" aria-labelledby="dashboard-projects">
                <Stack gap="md">
                  <Stack direction="row" gap="sm" justify="between" align="center" wrap>
                    <Heading level={2} textStyle="Heading/Subheading" id="dashboard-projects">Active projects</Heading>
                    {phone ? (
                      <Chip ref={statusRef} {...statusChip} aria-haspopup="dialog" aria-expanded={sheet === "status"} onClick={() => setSheet("status")}>{statusLabel}</Chip>
                    ) : (
                      <Chip ref={statusRef} {...statusChip} popoverMultiple popoverLabel="Status" popoverItems={healths.map((health) => ({ id: health, label: health, selected: statusFilter.includes(health) }))}
                        onPopoverSelect={(item) => setStatusFilter((list) => toggle(list, item.id))}>{statusLabel}</Chip>
                    )}
                  </Stack>
                  {phone ? (
                    // Phone: the same projects as a List, the revenue over the status; the row opens the project.
                    rows.length ? (
                      <List aria-labelledby="dashboard-projects">
                        {rows.map((row) => (
                          <ListItem key={row.id} title={row.name} caption={clients[row.client].name} leading={clientMark(row.client, "md")}
                            trailing={(
                              <Stack gap="2xs" align="end">
                                <Text as="span" textStyle="Body/Base/Bold">{money(row.earned)}</Text>
                                <Badge size="sm" theme={healthTheme[row.health]} background="subtle">{row.health}</Badge>
                              </Stack>
                            )}
                            selected={opened?.id === row.id} onClick={() => openProject(row.id)} />
                        ))}
                      </List>
                    ) : noRows
                  ) : (
                    // The open project's row stays selected while its panel is open.
                    <Table aria-labelledby="dashboard-projects" rows={rows} getRowId={(row) => row.id} columns={columns}
                      sort={sort} onSortChange={setSort} selectedIds={opened ? [opened.id] : []} onRowClick={(row) => openProject(row.id)} empty={noRows} />
                  )}
                  {rows.length ? (
                    <Text textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "project")} · {money(sum(rows.map((row) => row.earned)))} in {period.name}</Text>
                  ) : null}
                </Stack>
              </Card>

              {/* Rows only: a ListBox, the title and Show all in its Header-Slot. */}
              <ListBox as="section" theme="shadow" aria-labelledby="dashboard-activity"
                header={<Stack direction="row" gap="sm" justify="between" align="center">
                  <Heading level={2} textStyle="Heading/Subheading" id="dashboard-activity">Recent activity</Heading>
                  {activity.length > ACTIVITY_PREVIEW ? (
                    <Button level="tertiary" size={phone ? "md" : "sm"} aria-expanded={showAllActivity} onClick={() => setShowAllActivity((all) => !all)}>
                      {showAllActivity ? "Show less" : "Show all"}
                    </Button>
                  ) : null}
                </Stack>}>
                <List aria-labelledby="dashboard-activity">
                  {(showAllActivity ? activity : activity.slice(0, ACTIVITY_PREVIEW)).map((item) => (
                    <ListItem key={item.id} title={item.title} caption={activityCaption(item, true)} leading={activityMark(item)} onClick={() => openProject(item.project)} />
                  ))}
                </List>
              </ListBox>
            </Grid>
          </Stack>
        </Stack>
      </Container>

      <ModalForm open={creating} onOpenChange={setCreating} title="New project" description="It starts on track and joins Active projects."
        onSubmit={projectForm.handleSubmit} primaryAction={{ label: "Create project" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Project name" placeholder="Loyalty app" autoComplete="off" data-autofocus="" {...projectForm.field("name")} />
        <Grid columns={{ mobile: 1, desktop: 2 }} gap="md" align="start">
          <SelectField label="Client" placeholder="Choose a client" options={(Object.keys(clients) as ClientId[]).map((id) => ({ label: clients[id].name, value: id }))} {...projectForm.selectField("client")} />
          <SelectField label="Lead" placeholder="Choose a lead" options={(Object.keys(people) as PersonId[]).map((id) => ({ label: people[id].name, value: id }))} {...projectForm.selectField("lead")} />
        </Grid>
        <Grid columns={{ mobile: 1, desktop: 2 }} gap="md" align="start">
          <InputField label="Budget" inputMode="decimal" leading="icon-currency-dollar-line" placeholder="48,000" autoComplete="off" {...projectForm.field("budget")} />
          <DateField label="Due date" {...projectForm.dateField("due")} />
        </Grid>
      </ModalForm>

      {/* Phone: one period to pick (the sheet closes on the pick); Status picks keep it open until Show. */}
      <BottomSheet open={sheet === "period"} onOpenChange={(open) => { if (!open) setSheet(null); }} title="Period">
        <List aria-label="Period">
          {periodIds.map((id) => (
            <ListItem key={id} title={periods[id].label} caption={periods[id].range} selected={id === periodId} trailing={id === periodId ? check : undefined}
              onClick={() => { setPeriodId(id); setSheet(null); }} />
          ))}
        </List>
      </BottomSheet>
      <BottomSheet open={sheet === "status"} onOpenChange={(open) => { if (!open) setSheet(null); }} title="Status" primaryAction={{ label: `Show ${plural(rows.length, "project")}` }}>
        <List aria-label="Status">
          {healths.map((health) => {
            const on = statusFilter.includes(health);
            return <ListItem key={health} title={health} selected={on} trailing={on ? check : undefined} onClick={() => setStatusFilter((list) => toggle(list, health))} />;
          })}
        </List>
      </BottomSheet>
    </AppShell>
  );
}
