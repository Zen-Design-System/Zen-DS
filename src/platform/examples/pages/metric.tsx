/* Metric examples (docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio reads its month, its people and its
   invoices through Metric and MetricCard; the phone examples are the studio's own app, where Alex checks his month. The
   screens sit in the studio's AppShell: Invoices in the sidebar pattern, the phones in its mobile parts (Numbers is a
   root with the bottom bar; the screens pushed from it have Back). */
import { useEffect, useId, useRef, useState } from "react";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader } from "../../../components/AppShell";
import { Badge } from "../../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../../components/BottomNavigation";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Divider } from "../../../components/Divider";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import type { IconName } from "../../../components/Icon";
import { InlineMessage } from "../../../components/InlineMessage";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { Metric, MetricCard, type MetricTrendDirection } from "../../../components/MetricWidget";
import { PageHeader } from "../../../components/PageHeader";
import { ProgressBar } from "../../../components/Progress";
import { Segmented } from "../../../components/Segmented";
import { SidePanel } from "../../../components/SidePanel";
import { Sidebar, SidebarMenuItem } from "../../../components/Sidebar";
import { Search } from "../../../components/Search";
import { SkeletonHeading, SkeletonShape, SkeletonText } from "../../../components/Skeleton";
import { Table, TableActions, TableBadges, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { PreviewAppFrame, StudioLogo, StudioMark } from "../../PlatformFrames";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import {
  formatCompactMoney, formatDate, formatMoney, formatRange, invoiceStatusTheme, invoices, leaveRequests, me, projectById, studio, studioMonths, studioTeamHours,
  type Invoice, type InvoiceStatus,
} from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./metric.css";

export const page: PlatformPage = "metric";

type Trend = { direction: MetricTrendDirection; label: string };
/** One line of a breakdown: a project, a team or a leave entry. */
type Row = { id: string; title: string; caption: string; icon: IconName; theme: DockIconTheme };
/** A breakdown line with its share of the metric. */
type Share = Row & { value: string };

/** A project as a breakdown row (Dock Icon and client from the shared data). */
const projectRow = (projectId: string): Row => {
  const project = projectById(projectId);
  return { id: project.id, title: project.name, caption: project.client, icon: project.icon, theme: project.theme };
};
const projectShare = (projectId: string, value: string): Share => ({ ...projectRow(projectId), value });

/** "—" for a metric without data; screen readers hear "No data" instead of a dash. */
const noData = <><span aria-hidden="true">—</span><VisuallyHidden>No data</VisuallyHidden></>;

/* ───────────── Studio overview ───────────── */

type Period = "month" | "quarter" | "year";
/** The overview's one comparison period: every tile, every trend and every breakdown follow it. */
const periods: Record<Period, { label: string; title: string; range: string; compared: string; versus: string }> = {
  month: { label: "Month", title: "September", range: "Sep 1 – Sep 30, 2026", compared: "August", versus: "August" },
  quarter: { label: "Quarter", title: "Q3 2026", range: "Jul 1 – Sep 30, 2026", compared: "Q2", versus: "Q2" },
  year: { label: "Year", title: "2026 so far", range: "Jan 1 – Sep 30, 2026", compared: "Jan 1 – Sep 30, 2025", versus: "2025" },
};
const periodOptions = (Object.keys(periods) as Period[]).map((id) => ({ id, label: periods[id].label }));

const team = (id: string, title: string, size: number, icon: IconName, theme: DockIconTheme): Row =>
  ({ id, title, caption: plural(size, "person", "people"), icon, theme });
const earlier = (id: string, caption: string): Row => ({ id, title: "Earlier projects", caption, icon: "icon-folder-line", theme: "neutral" });
/** What a tile can be broken down into: the studio's projects and its billable teams. */
const breakdownRows = {
  lumen: projectRow("lumen-banking"), phin: projectRow("phin-loyalty"), mekong: projectRow("mekong-tracking"),
  bookfair: projectRow("bookfair-site"), zen: projectRow("zen-ds"),
  handedOver: earlier("handed-over", "2 projects handed over in August"), ytd: earlier("ytd", "6 projects handed over Jan – Aug 2026"),
  design: team("design", "Design", 18, "icon-palette-line", "pink"), engineering: team("engineering", "Engineering", 14, "icon-code-02-line", "blue"),
  delivery: team("delivery", "Delivery", 6, "icon-briefcase-line", "orange"), clientServices: team("client-services", "Client Services", 5, "icon-message-chat-circle-line", "crimson"),
};
type RowKey = keyof typeof breakdownRows;
type KpiPeriod = { value: string; direction: MetricTrendDirection; change: string; rows: [RowKey, string][] };
type Kpi = { id: string; label: string; icon: IconName; theme: DockIconTheme; by: string } & Record<Period, KpiPeriod>;

/* Revenue and billable hours add up the studio's shared months (data.ts), the series the Chart page draws, so the two
   pages never disagree. Utilisation matches the Chart page's Utilisation line; the rows of each period add up to its tile. */
const invoicedIn = (...ids: string[]) => studioMonths.filter((m) => ids.includes(m.id)).reduce((total, m) => total + m.invoiced, 0);
const hoursIn = (...labels: string[]) => studioTeamHours.filter((m) => labels.includes(m.label))
  .reduce((total, m) => total + m.design + m.engineering + m.delivery + m.clientServices, 0);
/** "+9%" · "−2%": the change from one total to the next, in whole percent. */
const changeOf = (now: number, before: number) => { const p = Math.round((now / before - 1) * 100); return `${p < 0 ? "−" : "+"}${Math.abs(p)}%`; };
const hoursLabel = (value: number) => `${value.toLocaleString("en-US")} h`;
const revenue = { month: invoicedIn("sep"), august: invoicedIn("aug"), q3: invoicedIn("jul", "aug", "sep"), q2: invoicedIn("apr", "may", "jun"),
  year: invoicedIn("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep") };
const billable = { month: hoursIn("Sep"), august: hoursIn("Aug"), q3: hoursIn("Jul", "Aug", "Sep"), q2: hoursIn("Apr", "May", "Jun") };

const studioKpis: Kpi[] = [
  {
    id: "revenue", label: "Revenue", icon: "icon-currency-dollar-circle-line", theme: "green", by: "By project",
    month: { value: formatMoney(revenue.month), direction: "positive", change: changeOf(revenue.month, revenue.august), rows: [["lumen", "$52,400"], ["phin", "$38,600"], ["mekong", "$8,300"], ["bookfair", "$6,400"]] },
    quarter: { value: formatMoney(revenue.q3), direction: "positive", change: changeOf(revenue.q3, revenue.q2), rows: [["phin", "$87,200"], ["handedOver", "$78,100"], ["lumen", "$70,600"], ["bookfair", "$52,600"], ["mekong", "$8,300"]] },
    year: { value: formatMoney(revenue.year), direction: "positive", change: "+12%", rows: [["ytd", "$560,700"], ["phin", "$87,200"], ["bookfair", "$71,500"], ["lumen", "$70,600"], ["mekong", "$8,300"]] },
  },
  {
    id: "hours", label: "Billable hours", icon: "icon-clock-line", theme: "blue", by: "By project",
    month: { value: hoursLabel(billable.month), direction: "positive", change: changeOf(billable.month, billable.august), rows: [["lumen", "2,560 h"], ["phin", "2,230 h"], ["mekong", "680 h"], ["bookfair", "430 h"]] },
    quarter: { value: hoursLabel(billable.q3), direction: "positive", change: changeOf(billable.q3, billable.q2), rows: [["handedOver", "5,380 h"], ["phin", "5,050 h"], ["bookfair", "3,490 h"], ["lumen", "3,460 h"], ["mekong", "680 h"]] },
    year: { value: "50,040 h", direction: "positive", change: "+5%", rows: [["ytd", "36,110 h"], ["phin", "5,050 h"], ["bookfair", "4,740 h"], ["lumen", "3,460 h"], ["mekong", "680 h"]] },
  },
  {
    id: "utilisation", label: "Utilisation", icon: "icon-pie-chart-01-line", theme: "violet", by: "By team",
    month: { value: "78%", direction: "negative", change: "−2 pts", rows: [["design", "84%"], ["engineering", "81%"], ["delivery", "72%"], ["clientServices", "58%"]] },
    quarter: { value: "80%", direction: "positive", change: "+1 pt", rows: [["design", "86%"], ["engineering", "83%"], ["delivery", "74%"], ["clientServices", "60%"]] },
    year: { value: "77%", direction: "positive", change: "+3 pts", rows: [["design", "82%"], ["engineering", "80%"], ["delivery", "70%"], ["clientServices", "59%"]] },
  },
  {
    id: "projects", label: "Active projects", icon: "icon-folder-check-line", theme: "indigo", by: "By project",
    month: { value: "3", direction: "normal", change: "−2", rows: [["zen", "81% done"], ["phin", "64% done"], ["lumen", "38% done"]] },
    quarter: { value: "7", direction: "normal", change: "+1", rows: [["zen", "81% done"], ["phin", "64% done"], ["lumen", "38% done"], ["mekong", "22% done"], ["bookfair", "Delivered"], ["handedOver", plural(2, "project")]] },
    year: { value: "11", direction: "normal", change: "+2", rows: [["zen", "81% done"], ["phin", "64% done"], ["lumen", "38% done"], ["mekong", "22% done"], ["bookfair", "Delivered"], ["ytd", plural(6, "project")]] },
  },
];

function StudioOverviewExample() {
  const { toast } = useToast();
  const headingId = useId();
  const breakdownId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [hidden, setHidden] = useState<string[]>([]);
  const [panelKpi, setPanelKpi] = useState(studioKpis[0]);
  const [panelOpen, setPanelOpen] = useState(false);
  const at = periods[period];
  const shown = studioKpis.filter((kpi) => !hidden.includes(kpi.id));
  const trendOf = (kpi: Kpi) => ({ direction: kpi[period].direction, label: `${kpi[period].change} vs. ${at.versus}` });
  const openBreakdown = (kpi: Kpi) => { setPanelKpi(kpi); setPanelOpen(true); };
  const hide = (kpi: Kpi) => {
    setHidden((ids) => [...ids, kpi.id]);
    toast({ title: `${kpi.label} hidden`, action: { label: "Undo", onClick: () => setHidden((ids) => ids.filter((id) => id !== kpi.id)) } });
    // The tile took its ⋮ button with it: focus moves to Show all metrics (after the Menu hands focus back), not <body>.
    requestAnimationFrame(() => requestAnimationFrame(() =>
      [...(sectionRef.current?.querySelectorAll("button") ?? [])].find((button) => button.textContent === "Show all metrics")?.focus()));
  };
  // Show all metrics leaves once every tile is back: focus moves to the first tile's ⋮ button.
  const showAll = () => {
    setHidden([]);
    requestAnimationFrame(() => sectionRef.current?.querySelector<HTMLElement>('[aria-label^="Actions for"]')?.focus());
  };
  return (
    <Stack as="section" ref={sectionRef} gap="md" aria-labelledby={headingId}>
      <Stack direction="row" justify="between" align="center" gap="sm" wrap>
        <Stack gap="xs">
          <Heading level={4} id={headingId} textStyle="Heading/4">{at.title}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">All projects · {at.range} · compared with {at.compared}</Text>
        </Stack>
        <Stack direction="row" align="center" gap="xs" wrap>
          {hidden.length && shown.length ? <Button level="tertiary" onClick={showAll}>Show all metrics</Button> : null}
          <Segmented aria-label="Period" options={periodOptions} value={period} onValueChange={(id) => setPeriod(id as Period)} />
        </Stack>
      </Stack>
      {shown.length ? (
        <Grid minColumnWidth="220px" gap="md">
          {shown.map((kpi) => (
            <MetricCard key={kpi.id} theme="flat" label={kpi.label} value={kpi[period].value} trend={trendOf(kpi)} icon={kpi.icon} iconTheme={kpi.theme}
              subAction={
                <Menu align="end" trigger={<IconButton appearance="flat" level="secondary" size="sm" icon="icon-dots-vertical-line" aria-label={`Actions for ${kpi.label}`} />}
                  items={[
                    { id: "breakdown", label: "View breakdown", onSelect: () => openBreakdown(kpi) },
                    { id: "hide", label: "Hide from overview", onSelect: () => hide(kpi) },
                  ]} />
              } />
          ))}
        </Grid>
      ) : (
        <EmptyState size="sm" headingLevel={5} icon="icon-bar-chart-up-line" title="No metrics on the overview"
          secondaryAction={{ label: "Show all metrics", onClick: showAll }}>Every metric is hidden from the overview.</EmptyState>
      )}
      <SidePanel type="modal" open={panelOpen} onOpenChange={setPanelOpen} title={panelKpi.label} description={`${studio.name} · ${at.range}`}>
        <Stack gap="lg">
          <Metric size="lg" icon={false} label={at.title} value={panelKpi[period].value} trend={trendOf(panelKpi)} />
          <Stack gap="xs">
            <Heading level={3} id={breakdownId} textStyle="Body/Small/Bold" tone="light">{panelKpi.by}</Heading>
            <List aria-labelledby={breakdownId}>
              {panelKpi[period].rows.map(([key, value]) => {
                const row = breakdownRows[key];
                return (
                  <ListItem key={key} title={row.title} caption={row.caption} leading={<DockIcon size="md" icon={row.icon} theme={row.theme} background="subtle" />}
                    trailing={<Text as="span" textStyle="Body/Base/Medium">{value}</Text>} />
                );
              })}
            </List>
          </Stack>
        </Stack>
      </SidePanel>
    </Stack>
  );
}

/* ───────────── One lead metric ───────────── */

function LeadMetricExample() {
  const headingId = useId();
  return (
    <Card as="section" theme="flat" aria-labelledby={headingId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={headingId} textStyle="Heading/Subheading">People</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{studio.name} · Jul 1 – Sep 30, 2026</Text>
        </Stack>
        {/* The one metric that leads: XLarge, and the only Solid Dock-Icon. */}
        <Metric size="xl" label="Headcount" value="48" icon="icon-users-check-line" iconTheme="accent" iconBackground="solid" trend={{ direction: "positive", label: "+4 vs. Q2" }} />
        <Divider />
        {/* The metrics that explain it: one smaller size, Subtle icons. */}
        <Grid minColumnWidth="120px" gap="sm">
          <Metric size="sm" label="Joined" value="5" icon="icon-user-plus-line" />
          <Metric size="sm" label="Left" value="1" icon="icon-user-minus-line" />
          <Metric size="sm" label="Open roles" value="3" icon="icon-briefcase-line" />
        </Grid>
      </Stack>
    </Card>
  );
}

/* ───────────── Trend with guidance ───────────── */

function TrendGuidanceExample() {
  const { toast } = useToast();
  const messageRef = useRef<HTMLElement>(null);
  const [sent, setSent] = useState(false);
  const send = () => {
    setSent(true);
    // The Send button goes away with the warning, so focus moves to the result instead of <body>.
    requestAnimationFrame(() => messageRef.current?.focus());
    toast({ title: "Reminder sent", action: { label: "Undo", onClick: () => setSent(false) } });
  };
  return (
    <Stack gap="md">
      <MetricCard theme="flat" label="Timesheets submitted" value="41 of 48" icon="icon-clock-line" iconTheme="blue" iconBackground="solid"
        trend={{ direction: "negative", label: "−4 vs. last week" }} />
      <Box ref={messageRef} tabIndex={-1}>
        {sent ? (
          <InlineMessage theme="positive" title="Reminder sent to 7 people">If hours are still missing on Friday morning, they get one more.</InlineMessage>
        ) : (
          <InlineMessage theme="warning" title="7 people haven't logged last week" action={{ label: "Send reminder", onClick: send }}>
            Lumen Bank is invoiced on Friday, Oct 2, 2026. Hours logged later move to the next invoice.
          </InlineMessage>
        )}
      </Box>
    </Stack>
  );
}

/* ───────────── Tile states ───────────── */

type Load = "error" | "loading" | "ready";

function TileStatesExample() {
  const headingId = useId();
  const tileRef = useRef<HTMLElement>(null);
  const [tasks, setTasks] = useState<Load>("error");
  const [status, setStatus] = useState("");
  // A demo request: the retry takes about a second, then the number arrives.
  useEffect(() => {
    if (tasks !== "loading") return undefined;
    const timer = window.setTimeout(() => { setTasks("ready"); setStatus("Open tasks loaded"); }, 1200);
    return () => window.clearTimeout(timer);
  }, [tasks]);
  const retry = () => {
    setTasks("loading");
    setStatus("Loading open tasks");
    tileRef.current?.focus();
  };
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack gap="xs">
        <Heading level={4} id={headingId} textStyle="Heading/4">Brand refresh</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">Saola Outdoor · Kickoff on Oct 12, 2026</Text>
      </Stack>
      {/* At most three tiles a row, one on a phone */}
      <Grid minColumnWidth="clamp(240px, 30%, 100%)" gap="md">
        {/* Loaded */}
        <MetricCard theme="flat" size="md" label="Budget" value="$36,000" icon="icon-coins-line" iconTheme="green" />
        {/* No data yet: a dash, and a caption that says why */}
        <Card theme="flat">
          <Stack gap="xs">
            <Metric size="md" label="Hours logged" value={noData} icon="icon-clock-line" iconTheme="blue" />
            <Text textStyle="Body/Small/Regular" tone="base">No time logged yet. Tracking starts at the kickoff.</Text>
          </Stack>
        </Card>
        {/* Couldn't load → Skeleton in the metric's shape → the number */}
        <Card theme="flat" ref={tileRef} tabIndex={-1} aria-busy={tasks === "loading"}>
          {tasks === "loading" ? (
            <Stack direction="row" gap="sm" align="center" aria-hidden="true">
              <SkeletonShape shape="round" size="md" />
              <Stack gap="2xs">
                <SkeletonText lines={1} className="px-metric-skeleton-label" />
                <SkeletonHeading size="md" />
              </Stack>
            </Stack>
          ) : tasks === "error" ? (
            <Stack gap="md">
              <Metric size="md" label="Open tasks" value={noData} icon="icon-check-done-line" iconTheme="orange" />
              <InlineMessage theme="negative" title="Couldn't load tasks" action={{ label: "Try again", onClick: retry }} />
            </Stack>
          ) : (
            <Metric size="md" label="Open tasks" value="6" icon="icon-check-done-line" iconTheme="orange" />
          )}
        </Card>
      </Grid>
      <VisuallyHidden role="status">{status}</VisuallyHidden>
    </Stack>
  );
}

/* ───────────── Summary above a table ───────────── */

const sumOf = (rows: Invoice[], statuses: InvoiceStatus[]) => rows.filter((row) => statuses.includes(row.status)).reduce((total, row) => total + row.amount, 0);
const byNumber = (a: Invoice, b: Invoice) => b.number.localeCompare(a.number);

/** The drafts New invoice adds, in turn: the next milestones of the studio's active clients, issued today. */
const nextDrafts: Pick<Invoice, "client" | "project" | "amount">[] = [
  { client: "Saola Outdoor", project: "saola-brand", amount: 8400 },
  { client: "Phin & Co", project: "phin-loyalty", amount: 14000 },
  { client: "Lumen Bank", project: "lumen-banking", amount: 27000 },
];

function InvoiceSummaryExample() {
  const { toast } = useToast();
  const tableRef = useRef<HTMLElement>(null); // the summary and the table
  const [rows, setRows] = useState(() => [...invoices].sort(byNumber));
  const [query, setQuery] = useState("");
  const [unread, setUnread] = useState(1);
  const outstanding = sumOf(rows, ["Sent", "Overdue"]);
  const overdue = sumOf(rows, ["Overdue"]);
  const paid = sumOf(rows, ["Paid"]);
  const words = query.trim().toLowerCase();
  const shown = rows.filter((row) => !words || `${row.number} ${row.client}`.toLowerCase().includes(words));
  const setStatus = (id: string, status: InvoiceStatus) => setRows((list) => list.map((row) => (row.id === id ? { ...row, status } : row)));
  const change = (invoice: Invoice, status: InvoiceStatus, title: string) => {
    setStatus(invoice.id, status);
    toast({ title, children: `${invoice.number} · ${invoice.client}`, action: { label: "Undo", onClick: () => setStatus(invoice.id, invoice.status) } });
    // A paid invoice has no action left: focus moves on to the next open invoice (below, else above), not to <body>.
    if (status === "Paid") {
      const at = shown.indexOf(invoice);
      const next = [...shown.slice(at + 1), ...shown.slice(0, at).reverse()].find((row) => row.status !== "Paid");
      if (next) requestAnimationFrame(() => tableRef.current?.querySelector<HTMLElement>(`button[aria-label$="${next.number}"]`)?.focus());
    }
  };
  const newInvoice = () => {
    const count = rows.filter((row) => row.id.startsWith("new-")).length;
    const draft: Invoice = { ...nextDrafts[count % nextDrafts.length], id: `new-${count}`, number: `INV-2026-${String(144 + count).padStart(4, "0")}`, status: "Draft", issued: invoices[4].issued, due: invoices[4].due };
    setRows((list) => [draft, ...list]);
    setQuery("");
    toast({ title: "Draft invoice created", children: `${draft.number} · ${draft.client} · ${formatMoney(draft.amount)}`, action: { label: "Undo", onClick: () => setRows((list) => list.filter((row) => row.id !== draft.id)) } });
  };
  const columns: TableColumn<Invoice>[] = [
    { id: "invoice", header: "Invoice", cell: (row) => <TableText bold caption={row.client}>{row.number}</TableText> },
    { id: "issued", header: "Issued", width: "140px", cell: (row) => <TableText>{formatDate(row.issued)}</TableText> },
    { id: "due", header: "Due", width: "140px", cell: (row) => <TableText>{formatDate(row.due)}</TableText> },
    { id: "status", header: "Status", width: "120px", cell: (row) => <TableBadges><Badge theme={invoiceStatusTheme[row.status]} background="subtle">{row.status}</Badge></TableBadges> },
    { id: "amount", header: "Amount", align: "right", width: "140px", cell: (row) => <TableText>{formatMoney(row.amount, true)}</TableText> },
    {
      id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "72px",
      cell: (row) => row.status === "Paid" ? null : (
        <TableActions>
          {row.status === "Draft"
            ? <IconButton appearance="flat" level="primary" size="md" icon="icon-send-01-line" aria-label={`Send ${row.number}`} onClick={() => change(row, "Sent", "Invoice sent")} />
            : <IconButton appearance="flat" level="primary" size="md" icon="icon-check-circle-line" aria-label={`Record payment for ${row.number}`} onClick={() => change(row, "Paid", "Payment recorded")} />}
        </TableActions>
      ),
    },
  ];
  return (
    <PreviewAppFrame height={{ min: 640, max: 820 }}>
      {/* The studio's Invoices page: AppShell pattern sidebar, a Search in the header's top row (it filters the table),
          the PageHeader with its one Primary in the Main row. The summary and the table lie on the page, no box. */}
      <AppShell
        sidebar={(
          <Sidebar logo={<StudioLogo src={studio.logo} name={studio.name} />} logoCollapsed={<StudioMark src={studio.logo} name={studio.name} />}
            selectedId="invoices" onItemClick={(item) => { if (item.id !== "invoices") toast({ title: `${item.label} isn't part of this example`, children: "This page shows the summary." }); }}
            sections={[{ items: [
              { id: "home", label: "Home", icon: "icon-home-03-line" },
              { id: "projects", label: "Projects", icon: "icon-folder-line" },
              { id: "invoices", label: "Invoices", icon: "icon-receipt-line", counter: rows.filter((row) => row.status === "Overdue").length || undefined },
              { id: "people", label: "People", icon: "icon-users-line" },
            ] }]}
            footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
        )}
        header={(
          <AppShellHeader
            leading={<Search placeholder="Search invoices" aria-label="Search invoices" value={query} onValueChange={setQuery} />}
            actions={<>
              <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => {
                setUnread(0);
                toast({ title: unread ? "1 new notification" : "You're all caught up", children: "Mai Ho marked INV-2026-0141 as paid · Lumen Bank" });
              }} />
              <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
                { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
                { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
              ]} />
            </>}
            main={(
              <PageHeader title="Invoices" description={`What ${studio.name} has billed its clients since July.`}
                actions={<Button level="primary" startIcon="icon-plus-line" onClick={newInvoice}>New invoice</Button>} />
            )}
          />
        )}
      >
        <Stack gap="md" ref={tableRef}>
          {/* Every number comes from the same rows as the table, so a change shows in both at once. */}
          <Grid as="section" aria-label="Summary" minColumnWidth="200px" gap="sm">
            <Metric size="sm" label="Outstanding" value={formatMoney(outstanding, true)} icon="icon-hourglass-line" iconTheme="blue" />
            <Metric size="sm" label="Overdue" value={formatMoney(overdue, true)} icon="icon-alert-triangle-line" iconTheme="red" />
            <Metric size="sm" label="Paid" value={formatMoney(paid, true)} icon="icon-check-circle-line" iconTheme="green" />
          </Grid>
          <Table aria-label="Invoices" columns={columns} rows={shown}
            empty={<EmptyState headingLevel={2} size="sm" icon="icon-search-medium-line" title="No invoices match" secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>Try a client or an invoice number.</EmptyState>} />
        </Stack>
      </AppShell>
    </PreviewAppFrame>
  );
}

/* ───────────── Team pulse ───────────── */

function TeamPulseExample() {
  const headingId = useId();
  return (
    <Card as="section" theme="flat" aria-labelledby={headingId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={headingId} textStyle="Heading/Subheading">Pulse survey</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">September · 39 of 48 people answered</Text>
        </Stack>
        {/* People-centred scores: an emoji Dock-Icon instead of an icon */}
        <Grid minColumnWidth="160px" gap="sm">
          <Metric size="md" label="Team mood" value="4.3 / 5" iconEmoji="😊" trend={{ direction: "positive", label: "+0.2 vs. August" }} />
          <Metric size="md" label="Energy" value="3.8 / 5" iconEmoji="⚡" trend={{ direction: "normal", label: "Same as August" }} />
        </Grid>
      </Stack>
    </Card>
  );
}

/* ───────────── Drill in on a phone ───────────── */

type MyMetric = { id: string; label: string; value: string; icon: IconName; theme: DockIconTheme; trend?: Trend; period: string; group: string; rows: Share[] };
type MyGroup = { id: string; title: string; metrics: MyMetric[] };

/** Alex's approved leave in October, from the studio's shared leave requests. */
const myLeave = leaveRequests.find((request) => request.person === me.id && request.status === "Approved")!;
/** Alex's numbers in the studio app, this month and this year. Each metric opens the rows it adds up. */
const myGroups: MyGroup[] = [
  {
    id: "month", title: "September", metrics: [
      {
        id: "hours", label: "Hours logged", value: "164 h", icon: "icon-clock-line", theme: "blue", trend: { direction: "positive", label: "+12 h vs. August" },
        period: "September", group: "By project",
        rows: [projectShare("lumen-banking", "92 h"), projectShare("zen-ds", "48 h"), projectShare("phin-loyalty", "16 h"), projectShare("saola-brand", "8 h")],
      },
      {
        id: "tasks", label: "Tasks done", value: "12", icon: "icon-check-done-line", theme: "orange", trend: { direction: "negative", label: "−2 vs. August" },
        period: "September", group: "By project",
        rows: [projectShare("zen-ds", plural(6, "task")), projectShare("lumen-banking", plural(5, "task")), projectShare("phin-loyalty", plural(1, "task"))],
      },
      {
        id: "reviews", label: "Reviews given", value: "9", icon: "icon-annotation-check-line", theme: "purple", trend: { direction: "positive", label: "+3 vs. August" },
        period: "September", group: "By project",
        rows: [projectShare("zen-ds", plural(5, "review")), projectShare("lumen-banking", plural(3, "review")), projectShare("phin-loyalty", plural(1, "review"))],
      },
    ],
  },
  {
    id: "year", title: "This year", metrics: [
      {
        id: "leave", label: "Leave left", value: plural(9, "day"), icon: "icon-plane-line", theme: "cyan",
        period: "2026", group: "Annual leave",
        rows: [
          { id: "allowance", title: "Allowance", caption: "Jan 1 – Dec 31, 2026", icon: "icon-calendar-line", theme: "cyan", value: plural(15, "day") },
          { id: "taken", title: "Taken", caption: "Jun 2 – Jun 4, 2026", icon: "icon-calendar-check-line", theme: "cyan", value: plural(3, "day") },
          { id: "booked", title: "Booked", caption: formatRange(myLeave.from, myLeave.to), icon: "icon-plane-line", theme: "cyan", value: plural(myLeave.days, "day") },
        ],
      },
      {
        id: "learning", label: "Learning budget left", value: "$620", icon: "icon-graduation-hat-line", theme: "green",
        period: "2026", group: "Learning budget",
        rows: [
          { id: "budget", title: "Allowance", caption: "Jan 1 – Dec 31, 2026", icon: "icon-wallet-02-line", theme: "green", value: "$1,200" },
          { id: "course", title: "Inclusive design course", caption: "Mar 14, 2026", icon: "icon-graduation-hat-line", theme: "green", value: "$380" },
          { id: "conference", title: "UX Vietnam conference", caption: "Aug 22, 2026", icon: "icon-ticket-01-line", theme: "green", value: "$200" },
        ],
      },
      {
        id: "expenses", label: "Expenses claimed", value: "$1,446.39", icon: "icon-receipt-line", theme: "pink",
        period: "2026", group: "Claims",
        rows: [
          { id: "figma", title: "Figma seats for October", caption: "Sep 1, 2026", icon: "icon-receipt-line", theme: "pink", value: "$1,080.00" },
          { id: "taxi", title: "Taxi to Lumen Bank", caption: "Aug 19, 2026", icon: "icon-receipt-line", theme: "pink", value: "$14.40" },
          { id: "books", title: "Accessibility handbook", caption: "May 6, 2026", icon: "icon-receipt-line", theme: "pink", value: "$351.99" },
        ],
      },
    ],
  },
];
const myMetrics = myGroups.flatMap((group) => group.metrics);
const openLabel = (metric: MyMetric) => `Open ${metric.label.toLowerCase()}`;

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "numbers", label: "Numbers", icon: "icon-pie-chart-01-line", selectedIcon: "icon-pie-chart-01-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
/** Back on a pushed screen whose parent this example does not draw: the toast names where it goes. */
function useBackTo(parent: string) {
  const { toast } = useToast();
  return { icon: "icon-chevron-left-line-medium" as const, label: "Back", onClick: () => toast({ title: `Back to ${parent}`, children: "This example shows the one screen." }) };
}

function PhoneDrillInExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  // The scroller of whichever screen shows: the large title folds as the cards run under the bar.
  const screenRef = useRef<HTMLDivElement>(null);
  const groupId = useId();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = myMetrics.find((metric) => metric.id === openId);

  if (!open) {
    return (
      // The Numbers root of the studio app: one key per screen, so each screen opens at the top and the bar measures its
      // fold again. The bottom bar casts a shadow, so the cards on the grey Canvas take the same Shadow elevation.
      <PlatformPhone key="root" label="Numbers" screenRef={screenRef}>
        <AppShell
          topNavigation={<TopNavigation title="Numbers" largeTitle="Numbers" largeTitleSubheading={`${me.name} · ${me.role}`} scrollRef={screenRef} />}
          bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={phoneRoots} value="numbers"
            onValueChange={(id) => { if (id !== "numbers") toast({ title: `${phoneRoots.find((item) => item.id === id)?.label ?? id} isn't part of this example`, children: "This screen shows the metrics." }); }} />}
        >
          {screen.anchor}
          {myGroups.map((group) => (
            <Stack as="section" key={group.id} gap="xs" aria-labelledby={`${groupId}-${group.id}`}>
              <Heading level={2} id={`${groupId}-${group.id}`} textStyle="Body/Small/Bold" tone="light">{group.title}</Heading>
              <Stack as="ul" gap="md">
                {group.metrics.map((metric) => (
                  <li key={metric.id}>
                    <MetricCard theme="shadow" variant="title-highlight" size="md" label={metric.label} value={metric.value} trend={metric.trend} icon={metric.icon} iconTheme={metric.theme}
                      action={<IconButton appearance="main" level="tertiary" size="xs" icon="icon-chevron-right-line" aria-label={openLabel(metric)}
                        onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(metric.id))} />} />
                  </li>
                ))}
              </Stack>
            </Stack>
          ))}
        </AppShell>
      </PlatformPhone>
    );
  }
  return (
    // The pushed screen: the compact bar with Back and the metric's name, no bottom bar.
    <PlatformPhone key={open.id} label={open.label} screenRef={screenRef}>
      <AppShell
        topNavigation={<TopNavigation type="compact-alt" title={open.label} scrollRef={screenRef}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[aria-label="${openLabel(open)}"]`, () => setOpenId(null)) }} />}
      >
        {screen.anchor}
        {/* Rows pad 0 at the sides: the Body's margin insets them, so they line up with the metric. */}
        <Metric size="lg" icon={false} label={open.period} value={open.value} trend={open.trend} />
        <Stack as="section" gap="xs" aria-labelledby={groupId}>
          <Heading level={2} id={groupId} textStyle="Body/Small/Bold" tone="light">{open.group}</Heading>
          <List aria-labelledby={groupId}>
            {open.rows.map((share) => (
              <ListItem key={share.id} title={share.title} caption={share.caption} leading={<DockIcon size="md" icon={share.icon} theme={share.theme} background="subtle" />}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{share.value}</Text>} />
            ))}
          </List>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

/* ───────────── Examples ───────────── */

/** Title-Highlight with its Custom-Slot (Figma Custom=Yes): each budget's spend as a ProgressBar under the number. */
const budgets = [
  { id: "loyalty", label: "Loyalty app", spent: 28400, budget: 36000, icon: "icon-phone-line" as IconName, theme: "orange" as DockIconTheme },
  { id: "banking", label: "Online banking", spent: 51200, budget: 48000, icon: "icon-bank-line" as IconName, theme: "blue" as DockIconTheme },
];
function BudgetProgress() {
  return (
    <Grid columns="repeat(auto-fit, minmax(min(100%, 260px), 1fr))" gap="md">
      {budgets.map((item) => {
        const used = Math.round((item.spent / item.budget) * 100);
        return (
          <MetricCard key={item.id} theme="flat" variant="title-highlight" size="md" label={item.label} value={`$${item.spent.toLocaleString("en-US")}`}
            icon={item.icon} iconTheme={item.theme}
            trend={{ direction: used > 100 ? "negative" : "normal", label: `of $${item.budget.toLocaleString("en-US")}` }}
            custom={<ProgressBar value={Math.min(used, 100)} theme="status" scale="quota" label={`${used}%`} aria-label={`${item.label} budget used`} />} />
        );
      })}
    </Grid>
  );
}

// Revenue by channel: Metric-Color ties each metric to its chart series, the Counter says how many invoices it covers;
// the payout tile is Title-Highlight with a Label-Icon and a Hint (Figma Metric-Inline, 2026-10-07).
const channels = [
  { id: "projects", label: "Projects", value: "$18,240", invoices: 6, color: "var(--zen-color-background-support-blue-solid)" },
  { id: "retainers", label: "Retainers", value: "$9,600", invoices: 3, color: "var(--zen-color-background-support-green-solid)" },
  { id: "workshops", label: "Workshops", value: "$2,150", invoices: 2, color: "var(--zen-color-background-support-orange-solid)" },
];

function RevenueByChannel() {
  return (
    <Stack gap="lg">
      <Grid columns="repeat(auto-fit, minmax(min(100%, 200px), 1fr))" gap="md">
        {channels.map((channel) => (
          <MetricCard variant="icon-highlight" key={channel.id} theme="flat" size="sm" icon={false} label={channel.label} value={channel.value}
            metricColor={channel.color} counter={channel.invoices} />
        ))}
      </Grid>
      <MetricCard theme="flat" variant="title-highlight" size="md" label="Next payout" labelIcon="icon-wallet-02-line"
        hint="Paid invoices from the last 14 days, less the 2.9% card fee. Pays out every second Friday." value="$4,812.40"
        icon="icon-bank-line" iconTheme="green" trend={{ direction: "normal", label: "Friday, Oct 16" }} />
    </Stack>
  );
}

/* ───────────── Metric-Card types (Figma Metric-Card Type, 6643:64008) ───────────── */

const usd = (value: number) => formatMoney(value);
const monthOf = (id: string) => studioMonths.find((m) => m.id === id)!;
/** The last twelve months the studio invoiced, oldest first (the sparkline's series). */
const invoicedSeries = studioMonths.map((m) => m.invoiced);
/** Billable hours logged per week, the last twelve weeks (Jul 13 – Sep 28, the current week last): the studio's offsite
 *  week (Aug 3) and the National Day holiday week (Aug 31) run low, so the bars vary as real weeks do. */
const weeklyHours = [1012, 1086, 1048, 760, 1131, 1176, 1104, 640, 1153, 1067, 1132, 1284];
const collectedIn = (...ids: string[]) => ids.reduce((total, id) => total + monthOf(id).collected, 0);
const q3Collected = collectedIn("jul", "aug", "sep");
const q2Collected = collectedIn("apr", "may", "jun");
/** What the studio invoiced each month this year (the Hero's line) and in total (its number). */
const thisYear = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep"].map((id) => monthOf(id).invoiced);
const thisYearTotal = thisYear.reduce((total, value) => total + value, 0);
const statusOrder: InvoiceStatus[] = ["Paid", "Sent", "Overdue", "Draft"];
const byStatus = statusOrder.map((status) => ({ id: status.toLowerCase(), label: status, value: invoices.filter((row) => row.status === status).reduce((total, row) => total + row.amount, 0) }));
const statusTotal = byStatus.reduce((total, item) => total + item.value, 0);
const overdueCount = invoices.filter((row) => row.status === "Overdue").length;

/** Three typed MetricCards in one row: a sparkline, spark bars and a goal. */
function MetricTypesRow() {
  return (
    <Grid columns="repeat(auto-fit, minmax(min(100%, 260px), 1fr))" gap="md">
      <MetricCard theme="flat" type="sparkline" label="Revenue" value={usd(monthOf("sep").invoiced)} series={invoicedSeries} format={formatCompactMoney}
        trend={{ direction: "positive", label: `${changeOf(monthOf("sep").invoiced, monthOf("aug").invoiced)} vs. August` }} />
      <MetricCard theme="flat" type="spark-bars" label="Hours logged" value={hoursLabel(weeklyHours[weeklyHours.length - 1])} series={weeklyHours} format={hoursLabel}
        trend={{ direction: "positive", label: `${changeOf(weeklyHours[11], weeklyHours[10])} vs. last week` }} />
      <MetricCard theme="flat" type="goal-progress" label="Collected in Q3" value={usd(q3Collected)} format={usd}
        goal={{ value: q3Collected, target: 290000 }} trend={{ direction: "positive", label: `${changeOf(q3Collected, q2Collected)} vs. Q2` }} />
    </Grid>
  );
}

/** A comparison of three numbers and the split of one total, side by side (stacked on a narrow screen). */
function CashFlowRow() {
  return (
    <Grid columns="repeat(auto-fit, minmax(min(100%, 420px), 1fr))" gap="md">
      <MetricCard theme="flat" type="comparison" label="Cash flow · September" comparison={[
        { id: "invoiced", label: "Invoiced", value: usd(monthOf("sep").invoiced), trend: { direction: "positive", label: `${changeOf(monthOf("sep").invoiced, monthOf("aug").invoiced)} vs. August` } },
        { id: "collected", label: "Collected", value: usd(monthOf("sep").collected), trend: { direction: "negative", label: `${changeOf(monthOf("sep").collected, monthOf("aug").collected)} vs. August` } },
        { id: "overdue", label: "Overdue", value: usd(byStatus.find((item) => item.id === "overdue")!.value), trend: { direction: "normal", label: plural(overdueCount, "invoice") } },
      ]} />
      <MetricCard theme="flat" type="category-bar" label="Open and paid invoices" value={usd(statusTotal)} categories={byStatus} format={usd} />
    </Grid>
  );
}

/** The one Hero of a dashboard: Brand Pale, or the dark Solid Neutral widget (Button level inverse on it). */
function HeroMetric() {
  const { toast } = useToast();
  const [look, setLook] = useState<"brand" | "dark">("brand");
  const dark = look === "dark";
  return (
    <Stack gap="md">
      <Segmented aria-label="Hero style" value={look} onValueChange={(id) => setLook(id as "brand" | "dark")} options={[{ id: "brand", label: "Brand" }, { id: "dark", label: "Dark" }]} />
      <MetricCard type="hero" theme={dark ? "solid" : "pale"} color={dark ? "neutral" : "brand"} label="Invoiced this year" value={usd(thisYearTotal)}
        trend={{ direction: "positive", label: "+12% vs. 2025" }} series={thisYear} format={formatCompactMoney}
        footer={<Button size="sm" appearance={dark ? "overlay" : "main"} level={dark ? "inverse" : "primary"} onClick={() => toast({ title: "Report for 2026 opened in a new tab" })}>View report</Button>} />
    </Stack>
  );
}

/** The month on the studio's phone app: a screen pushed from Numbers, its typed cards stacked. */
function PhoneMetricTypes() {
  const screenRef = useRef<HTMLDivElement>(null);
  const back = useBackTo("Numbers");
  return (
    <PlatformPhone label="September" screenRef={screenRef}>
      <AppShell topNavigation={<TopNavigation type="compact-alt" title="September" scrollRef={screenRef} leading={back} />}>
        {/* The Body pads the screen; the cards sit md apart, flat on the grey Canvas (no bottom bar, no shadow). */}
        <Stack gap="md">
          <MetricCard theme="flat" spacing="small" type="sparkline" label="Revenue" value={usd(monthOf("sep").invoiced)} series={invoicedSeries} format={formatCompactMoney}
            trend={{ direction: "positive", label: `${changeOf(monthOf("sep").invoiced, monthOf("aug").invoiced)} vs. August` }} />
          <MetricCard theme="flat" spacing="small" type="comparison" label="Cash flow" headingLevel={2} comparison={[
            { id: "invoiced", label: "Invoiced", value: usd(monthOf("sep").invoiced), trend: { direction: "positive", label: "+9% vs. August" } },
            { id: "collected", label: "Collected", value: usd(monthOf("sep").collected), trend: { direction: "negative", label: "−8% vs. August" } },
          ]} />
          <MetricCard theme="flat" spacing="small" type="category-bar" label="Invoices by status" value={usd(statusTotal)} categories={byStatus} format={usd} />
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

type TileColor = "neutral" | "accent" | "yellow";
const tileColors: { id: TileColor; label: string }[] = [{ id: "neutral", label: "Neutral" }, { id: "accent", label: "Accent" }, { id: "yellow", label: "Yellow" }];

/** Stat tiles: one Solid stand-out among Flat tiles; its content follows the fill (Inverse, On-Accent, On-Color, On-Bright). */
function StandOutTiles() {
  const [color, setColor] = useState<TileColor>("neutral");
  return (
    <Stack gap="md">
      <Segmented aria-label="Stand-out colour" value={color} onValueChange={(id) => setColor(id as TileColor)} options={tileColors} />
      <Grid columns="repeat(auto-fit, minmax(min(100%, 160px), 1fr))" gap="md">
        <MetricCard type="tile" theme="solid" color={color} label="Overdue" value="$12,880" icon="icon-alarm-clock-line"
          trend={{ direction: "negative", label: "+1 invoice" }} />
        <MetricCard type="tile" theme="flat" label="Collected" value="$88,300" icon="icon-wallet-02-line"
          trend={{ direction: "negative", label: "−8% vs. August" }} />
        <MetricCard type="tile" theme="flat" label="Hours logged" value="1,284 h" icon="icon-clock-line"
          trend={{ direction: "positive", label: "+13% vs. August" }} />
      </Grid>
    </Stack>
  );
}

/** The phone app's week, pushed from Numbers: two Medium tiles (the dark one stands out), three Small tiles, then what
 *  comes up next (the shared tasks, review requests and leave). */
const comingUp: Row[] = [
  { id: "audit", title: "Audit the account overview for WCAG 2.2", caption: "LUM-091 · Due today", icon: "icon-check-square-line", theme: "blue" },
  { id: "review", title: "Connect the rewards API to checkout", caption: "Bao Nguyen asked you to review", icon: "icon-annotation-check-line", theme: "purple" },
  { id: "leave", title: "Annual leave", caption: formatRange(myLeave.from, myLeave.to), icon: "icon-plane-line", theme: "cyan" },
];

function PhoneTiles() {
  const screenRef = useRef<HTMLDivElement>(null);
  const back = useBackTo("Numbers");
  const daysId = useId();
  return (
    <PlatformPhone label="This week" screenRef={screenRef}>
      <AppShell topNavigation={<TopNavigation type="compact-alt" title="This week" scrollRef={screenRef} leading={back} />}>
        <Stack gap="md">
          <Grid columns="repeat(2, minmax(0, 1fr))" gap="sm">
            <MetricCard type="tile" theme="solid" color="neutral" label="Billable" value="82%" icon="icon-pie-chart-01-line"
              trend={{ direction: "positive", label: "+4%" }} />
            <MetricCard type="tile" theme="flat" label="Hours logged" value="164 h" icon="icon-clock-line"
              trend={{ direction: "positive", label: "+12 h" }} />
          </Grid>
          <Grid columns="repeat(3, minmax(0, 1fr))" gap="sm">
            <MetricCard type="tile" size="sm" theme="flat" label="Tasks done" value="12" icon="icon-check-done-line" trend={{ direction: "negative", label: "−2" }} />
            <MetricCard type="tile" size="sm" theme="flat" label="Reviews" value="9" icon="icon-annotation-check-line" trend={{ direction: "positive", label: "+3" }} />
            <MetricCard type="tile" size="sm" theme="flat" label="Days off left" value="9" icon="icon-plane-line" />
          </Grid>
        </Stack>
        {/* What comes up next: the rows under the tiles, in the Body's margin. */}
        <Stack as="section" gap="xs" aria-labelledby={daysId}>
          <Heading level={2} id={daysId} textStyle="Body/Small/Bold" tone="light">Coming up</Heading>
          <List aria-labelledby={daysId}>
            {comingUp.map((row) => (
              <ListItem key={row.id} title={row.title} titleLines={2} caption={row.caption} leading={<DockIcon size="md" icon={row.icon} theme={row.theme} background="subtle" />} />
            ))}
          </List>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

/** A new client's first weeks: no revenue yet, one week of hours, a goal already passed. */
function FirstWeeksMetrics() {
  return (
    <Grid columns="repeat(auto-fit, minmax(min(100%, 240px), 1fr))" gap="md">
      <MetricCard theme="flat" type="sparkline" label="Revenue" value={noData} series={[]} trend={{ direction: "normal", label: "First invoice due Oct 31" }} />
      <MetricCard theme="flat" type="spark-bars" label="Hours logged" value={hoursLabel(38)} series={[38]} trend={{ direction: "normal", label: "Week 1 of the project" }} />
      <MetricCard theme="flat" type="goal-progress" label="Deposit collected" value={usd(5600)} format={usd} goal={{ value: 5600, target: 5000 }}
        trend={{ direction: "positive", label: "$600 over the deposit" }} />
    </Grid>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Studio overview",
    wide: true,
    description: "Four MetricCards share one size and one comparison period: the Segmented switches Month, Quarter or Year and every value and trend follows. The ⋮ Sub-Action opens the rows behind a tile in a Side Panel, or hides the tile with Undo.",
    render: () => <StudioOverviewExample />,
    code: `const [period, setPeriod] = useState<Period>("month"); // "month" | "quarter" | "year"
const [hidden, setHidden] = useState<string[]>([]);
const at = periods[period]; // { title: "September", range: "Sep 1 – Sep 30, 2026", versus: "August" }
const trendOf = (kpi: Kpi) => ({ direction: kpi[period].direction, label: \`\${kpi[period].change} vs. \${at.versus}\` });
const hide = (kpi: Kpi) => {
  setHidden((ids) => [...ids, kpi.id]);
  toast({ title: \`\${kpi.label} hidden\`, action: { label: "Undo", onClick: () => setHidden((ids) => ids.filter((id) => id !== kpi.id)) } });
};

<Heading level={4} textStyle="Heading/4">{at.title}</Heading>
<Segmented aria-label="Period" value={period} onValueChange={(id) => setPeriod(id as Period)}
  options={[{ id: "month", label: "Month" }, { id: "quarter", label: "Quarter" }, { id: "year", label: "Year" }]} />

<Grid minColumnWidth="220px" gap="md">
  {kpis.filter((kpi) => !hidden.includes(kpi.id)).map((kpi) => (
    <MetricCard key={kpi.id} theme="flat" label={kpi.label} value={kpi[period].value} trend={trendOf(kpi)}
      icon={kpi.icon} iconTheme={kpi.theme} // Revenue green, Billable hours blue…
      subAction={
        <Menu align="end"
          trigger={<IconButton appearance="flat" level="secondary" size="sm" icon="icon-dots-vertical-line" aria-label={\`Actions for \${kpi.label}\`} />}
          items={[
            { id: "breakdown", label: "View breakdown", onSelect: () => openBreakdown(kpi) },
            { id: "hide", label: "Hide from overview", onSelect: () => hide(kpi) },
          ]} />
      } />
  ))}
</Grid>

<SidePanel type="modal" open={panelOpen} onOpenChange={setPanelOpen} title={panelKpi.label} description={\`Đìzai Studio · \${at.range}\`}>
  <Metric size="lg" icon={false} label={at.title} value={panelKpi[period].value} trend={trendOf(panelKpi)} />
  <List aria-labelledby={breakdownId}>{/* a ListItem per project or team: DockIcon + its share */}</List>
</SidePanel>`,
  },
  {
    title: "One lead metric",
    description: "Headcount leads at XLarge with the only Solid Dock-Icon. The three metrics that explain it share one smaller size below a Divider.",
    render: () => <LeadMetricExample />,
    code: `<Card as="section" theme="flat" aria-labelledby={headingId}>
  <Stack gap="md">
    <Stack gap="xs">
      <Heading level={4} id={headingId} textStyle="Heading/Subheading">People</Heading>
      <Text textStyle="Body/Small/Regular" tone="base">Đìzai Studio · Jul 1 – Sep 30, 2026</Text>
    </Stack>
    <Metric size="xl" label="Headcount" value="48" icon="icon-users-check-line"
      iconTheme="accent" iconBackground="solid" trend={{ direction: "positive", label: "+4 vs. Q2" }} />
    <Divider />
    <Grid minColumnWidth="120px" gap="sm">
      <Metric size="sm" label="Joined" value="5" icon="icon-user-plus-line" />
      <Metric size="sm" label="Left" value="1" icon="icon-user-minus-line" />
      <Metric size="sm" label="Open roles" value="3" icon="icon-briefcase-line" />
    </Grid>
  </Stack>
</Card>`,
  },
  {
    title: "Team pulse",
    description: "A survey widget shows people-centred scores with an emoji Dock-Icon instead of an icon. The Normal trend says in words that a score held steady.",
    render: () => <TeamPulseExample />,
    code: `<Card as="section" theme="flat" aria-labelledby={headingId}>
  <Stack gap="md">
    <Stack gap="xs">
      <Heading level={4} id={headingId} textStyle="Heading/Subheading">Pulse survey</Heading>
      <Text textStyle="Body/Small/Regular" tone="base">September · 39 of 48 people answered</Text>
    </Stack>
    <Grid minColumnWidth="160px" gap="sm">
      <Metric size="md" label="Team mood" value="4.3 / 5" iconEmoji="😊"
        trend={{ direction: "positive", label: "+0.2 vs. August" }} />
      <Metric size="md" label="Energy" value="3.8 / 5" iconEmoji="⚡"
        trend={{ direction: "normal", label: "Same as August" }} />
    </Grid>
  </Stack>
</Card>`,
  },
  {
    title: "Tile states",
    wide: true,
    description: "Three tiles of one project dashboard: Budget has loaded, Hours logged has no data yet (a dash and a caption that says why), and Open tasks couldn't load. Try again shows a Skeleton in the metric's shape until the number arrives.",
    render: () => <TileStatesExample />,
    code: `// "—" reads as "No data" to screen readers
const noData = <><span aria-hidden="true">—</span><VisuallyHidden>No data</VisuallyHidden></>;

{/* At most three tiles a row, one on a phone */}
<Grid minColumnWidth="clamp(240px, 30%, 100%)" gap="md">
  <MetricCard theme="flat" size="md" label="Budget" value="$36,000" icon="icon-coins-line" iconTheme="green" />
  <Card theme="flat">
    <Stack gap="xs">
      <Metric size="md" label="Hours logged" value={noData} icon="icon-clock-line" iconTheme="blue" />
      <Text textStyle="Body/Small/Regular" tone="base">No time logged yet. Tracking starts at the kickoff.</Text>
    </Stack>
  </Card>
  <Card theme="flat" ref={tileRef} tabIndex={-1} aria-busy={tasks === "loading"}>
    {tasks === "loading" ? (
      <Stack direction="row" gap="sm" align="center" aria-hidden="true">
        <SkeletonShape shape="round" size="md" />
        <Stack gap="2xs"><SkeletonText lines={1} /><SkeletonHeading size="md" /></Stack>
      </Stack>
    ) : tasks === "error" ? (
      <Stack gap="md">
        <Metric size="md" label="Open tasks" value={noData} icon="icon-check-done-line" iconTheme="orange" />
        <InlineMessage theme="negative" title="Couldn't load tasks" action={{ label: "Try again", onClick: retry }} />
      </Stack>
    ) : (
      <Metric size="md" label="Open tasks" value="6" icon="icon-check-done-line" iconTheme="orange" />
    )}
  </Card>
</Grid>
<VisuallyHidden role="status">{status}</VisuallyHidden>`,
  },
  {
    title: "Trend with guidance",
    description: "A worrying trend comes with an Inline Message that says what to do next. Send reminder turns the message into the result, and Undo in the Toast brings the warning back.",
    render: () => <TrendGuidanceExample />,
    code: `const [sent, setSent] = useState(false);
const send = () => {
  setSent(true);
  toast({ title: "Reminder sent", action: { label: "Undo", onClick: () => setSent(false) } });
};

<MetricCard theme="flat" label="Timesheets submitted" value="41 of 48" icon="icon-clock-line" iconTheme="blue" iconBackground="solid"
  trend={{ direction: "negative", label: "−4 vs. last week" }} />
{sent ? (
  <InlineMessage theme="positive" title="Reminder sent to 7 people">If hours are still missing on Friday morning, they get one more.</InlineMessage>
) : (
  <InlineMessage theme="warning" title="7 people haven't logged last week" action={{ label: "Send reminder", onClick: send }}>
    Lumen Bank is invoiced on Friday, Oct 2, 2026. Hours logged later move to the next invoice.
  </InlineMessage>
)}`,
  },
  {
    title: "Drill in on a phone",
    description: "On a phone the Title-Highlight metric puts its title first and a chevron in the title row, one card per row under a kicker for its period, on the Numbers root of the studio app (the large title, the bottom bar; its shadow gives the cards theme=\"shadow\"). The chevron opens what the number adds up as the next screen, pushed without the bottom bar, and Back returns focus to it.",
    render: () => <PhoneDrillInExample />,
    code: `const screen = usePhoneScreen();
const screenRef = useRef<HTMLDivElement>(null);
const [openId, setOpenId] = useState<string | null>(null);

// One key per screen; the large title folds as the cards scroll under the bar.
<PlatformPhone key="root" screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation title="Numbers" largeTitle="Numbers" largeTitleSubheading="Alex Duong · Design Lead" scrollRef={screenRef} />}
    bottomNavigation={<BottomNavigation aria-label="Đìzai Studio" showLabels value="numbers" onValueChange={go} items={roots} />}
  >
    {/* The Body pads 20 and spaces the sections Layout-Mobile/Section-Gap apart; kicker → cards 8; cards 16 */}
    <Stack as="section" gap="xs" aria-labelledby={septemberId}>
      <Heading level={2} id={septemberId} textStyle="Body/Small/Bold" tone="light">September</Heading>
      <Stack as="ul" gap="md">
        <li>
          <MetricCard theme="shadow" variant="title-highlight" size="md" label="Hours logged" value="164 h"
            trend={{ direction: "positive", label: "+12 h vs. August" }} icon="icon-clock-line" iconTheme="blue"
            action={<IconButton appearance="main" level="tertiary" size="xs" icon="icon-chevron-right-line" aria-label="Open hours logged"
              onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId("hours"))} />} />
        </li>
        {/* Tasks done, Reviews given… then "This year": Leave left, Learning budget left, Expenses claimed */}
      </Stack>
    </Stack>
  </AppShell>
</PlatformPhone>

// The next screen: Back returns to the chevron it came from
<PlatformPhone key="hours" screenRef={screenRef}>
  <AppShell topNavigation={<TopNavigation type="compact-alt" title="Hours logged" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go('[aria-label="Open hours logged"]', () => setOpenId(null)) }} />}>
    <Metric size="lg" icon={false} label="September" value="164 h" trend={{ direction: "positive", label: "+12 h vs. August" }} />
    <Stack as="section" gap="xs" aria-labelledby={groupId}>
      <Heading level={2} id={groupId} textStyle="Body/Small/Bold" tone="light">By project</Heading>
      <List aria-labelledby={groupId}>{/* ListItem per project: DockIcon + hours */}</List>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "Summary above a table",
    wide: true,
    screen: true,
    description: "The studio's Invoices page: small Metrics above the invoices Table add up the same rows, so sending an invoice, recording a payment or adding a draft (New invoice, in the PageHeader of the header's Main row) moves its amount at once, with Undo in the Toast; the Search in the header's top row filters the table. The three Dock-Icons share one background (Subtle); their colour tells them apart.",
    render: () => <InvoiceSummaryExample />,
    code: `const outstanding = sumOf(rows, ["Sent", "Overdue"]);
const overdue = sumOf(rows, ["Overdue"]);
const paid = sumOf(rows, ["Paid"]);

<AppShell
  sidebar={<Sidebar logo={logo} sections={places} selectedId="invoices" onItemClick={go} />}
  header={
    <AppShellHeader
      leading={<Search placeholder="Search invoices" aria-label="Search invoices" value={query} onValueChange={setQuery} />}
      actions={<>{notifications}{account}</>}
      main={<PageHeader title="Invoices" description="What Đìzai Studio has billed its clients since July."
        actions={<Button level="primary" startIcon="icon-plus-line" onClick={newInvoice}>New invoice</Button>} />}
    />
  }
>
  <Grid as="section" aria-label="Summary" minColumnWidth="200px" gap="sm">
    <Metric size="sm" label="Outstanding" value={formatMoney(outstanding, true)} icon="icon-hourglass-line" iconTheme="blue" />
    <Metric size="sm" label="Overdue" value={formatMoney(overdue, true)} icon="icon-alert-triangle-line" iconTheme="red" />
    <Metric size="sm" label="Paid" value={formatMoney(paid, true)} icon="icon-check-circle-line" iconTheme="green" />
  </Grid>
  <Table aria-label="Invoices" columns={columns} rows={shown} empty={noMatches} />
</AppShell>

// Actions column: record a payment, then offer Undo
<IconButton appearance="flat" level="primary" size="md" icon="icon-check-circle-line"
  aria-label={\`Record payment for \${row.number}\`} onClick={() => change(row, "Paid", "Payment recorded")} />`,
  },
  {
    title: "Budget with progress",
    description: "Title-Highlight takes your own content under the number in its Custom slot (Figma Custom-Slot): here each project's spend as a ProgressBar. The corner icon stays beside the number; the bar uses the quota scale, so it turns Warning from 75% and Negative from 90%.",
    render: () => <BudgetProgress />,
    code: `<MetricCard theme="flat" variant="title-highlight" size="md" label="Loyalty app" value="$28,400"
  icon="icon-phone-line" iconTheme="orange" trend={{ direction: "normal", label: "of $36,000" }}
  custom={<ProgressBar value={79} theme="status" scale="quota" label="79%" aria-label="Loyalty app budget used" />} />`,
  },
  {
    title: "Revenue by channel",
    description: "Metric-Color puts each channel's chart colour before its label, and the Counter after it says how many invoices the total covers. The payout tile is Title-Highlight with a Label-Icon before its title and a Hint after it, which explains how the number is worked out on hover and focus.",
    render: () => <RevenueByChannel />,
    code: `<MetricCard variant="icon-highlight" theme="flat" size="sm" icon={false} label="Projects" value="$18,240"
  metricColor="var(--zen-color-background-support-blue-solid)" counter={6} />

<MetricCard theme="flat" variant="title-highlight" size="md" label="Next payout" labelIcon="icon-wallet-02-line"
  hint="Paid invoices from the last 14 days, less the 2.9% card fee. Pays out every second Friday."
  value="$4,812.40" icon="icon-bank-line" iconTheme="green" trend={{ direction: "normal", label: "Friday, Oct 16" }} />`,
  },
  {
    title: "Metric types in a row",
    wide: true,
    description: "MetricCard type draws Figma's Metric-Card types under a Title-Highlight number: a sparkline of the last twelve months, spark bars with the current week in Chart Sector/Secondary, and a stacked ProgressBar toward the quarter's goal. The marks draw in on load; screen readers hear the numbers and a summary of each series.",
    render: () => <MetricTypesRow />,
    code: `{/* display: grid; repeat(auto-fit, minmax(260px, 1fr)); gap: 16px */}
<MetricCard theme="flat" type="sparkline" label="Revenue" value="$105,700" format={formatCompactMoney}
  series={[71200, 76500, 68900, 74300, 79600, 85100, 82300, 91800, 88400, 94100, 97000, 105700]}
  trend={{ direction: "positive", label: "+9% vs. August" }} />
<MetricCard theme="flat" type="spark-bars" label="Hours logged" value="1,284 h" format={hoursLabel}
  series={[1012, 1086, 1048, 760, 1131, 1176, 1104, 640, 1153, 1067, 1132, 1284]}
  trend={{ direction: "positive", label: "+13% vs. last week" }} />
<MetricCard theme="flat" type="goal-progress" label="Collected in Q3" value="$275,800" format={formatMoney}
  goal={{ value: 275800, target: 290000 }} trend={{ direction: "positive", label: "+8% vs. Q2" }} />`,
  },
  {
    title: "Cash flow at a glance",
    wide: true,
    description: "Comparison puts three numbers side by side under one title, each with its own trend; Category-Bar splits one total into its parts, each row saying its amount and a share that adds up to 100%. On a narrow card the columns stack.",
    render: () => <CashFlowRow />,
    code: `<MetricCard theme="flat" type="comparison" label="Cash flow · September" comparison={[
  { id: "invoiced", label: "Invoiced", value: "$105,700", trend: { direction: "positive", label: "+9% vs. August" } },
  { id: "collected", label: "Collected", value: "$88,300", trend: { direction: "negative", label: "−8% vs. August" } },
  { id: "overdue", label: "Overdue", value: "$12,880", trend: { direction: "normal", label: "1 invoice" } },
]} />
<MetricCard theme="flat" type="category-bar" label="Open and paid invoices" value="$95,520.50" format={formatMoney}
  categories={[
    { id: "paid", label: "Paid", value: 49640.5 }, { id: "sent", label: "Sent", value: 21000 },
    { id: "overdue", label: "Overdue", value: 12880 }, { id: "draft", label: "Draft", value: 12000 },
  ]} />`,
  },
  {
    title: "One hero metric",
    description: "The Hero is the one widget of a dashboard that stands out: a Brand Pale card with neutral marks and a Primary button, or the dark Solid Neutral card, whose content turns Inverse and whose button is the white overlay Inverse one. Its trend sits in a white On-Color badge.",
    render: () => <HeroMetric />,
    code: `const [look, setLook] = useState<"brand" | "dark">("brand");
const dark = look === "dark";

<Segmented aria-label="Hero style" value={look} onValueChange={(id) => setLook(id as "brand" | "dark")}
  options={[{ id: "brand", label: "Brand" }, { id: "dark", label: "Dark" }]} />
<MetricCard type="hero" theme={dark ? "solid" : "pale"} color={dark ? "neutral" : "brand"} label="Invoiced this year"
  value="$798,300" trend={{ direction: "positive", label: "+12% vs. 2025" }} format={formatCompactMoney}
  series={[74300, 79600, 85100, 82300, 91800, 88400, 94100, 97000, 105700]} // a month each
  footer={<Button size="sm" appearance={dark ? "overlay" : "main"} level={dark ? "inverse" : "primary"} onClick={openReport}>View report</Button>} />`,
  },
  {
    title: "Stat tiles with one stand-out",
    description: "type=\"tile\" is the compact stat: the title, number and trend over the Dock-Icon, in a Small card. One tile of the row stands out with theme=\"solid\"; pick its colour and its content follows the fill: Inverse on Neutral, On-Accent on Accent, dark On-Brights on Yellow (white On-Colors on Brand, Cyan and Orange), and the trend and Dock-Icon turn into chips of that family. White on Accent, Brand, Cyan and Orange is about 3:1, so keep the words there short and large.",
    render: () => <StandOutTiles />,
    code: `const [color, setColor] = useState<"neutral" | "accent" | "yellow">("neutral");

<Segmented aria-label="Stand-out colour" value={color} onValueChange={setColor} options={tileColors} />
<Grid columns="repeat(auto-fit, minmax(min(100%, 160px), 1fr))" gap="md">
  <MetricCard type="tile" theme="solid" color={color} label="Overdue" value="$12,880" icon="icon-alarm-clock-line"
    trend={{ direction: "negative", label: "+1 invoice" }} />
  <MetricCard type="tile" theme="flat" label="Collected" value="$88,300" icon="icon-wallet-02-line"
    trend={{ direction: "negative", label: "−8% vs. August" }} />
  <MetricCard type="tile" theme="flat" label="Hours logged" value="1,284 h" icon="icon-clock-line"
    trend={{ direction: "positive", label: "+13% vs. August" }} />
</Grid>`,
  },
  {
    title: "Stat tiles on a phone",
    description: "Two Medium tiles share the screen's width (Display/3 numbers), three Small ones a row (Heading/3). The dark Solid Neutral tile is the week's one highlight, its content Inverse. A tile without a trend is shorter inside; the row's cards still share one height. The week is a screen pushed from Numbers (Back, no bottom bar), with what comes up next under the tiles.",
    render: () => <PhoneTiles />,
    code: `<PlatformPhone screenRef={screenRef}>
  <AppShell topNavigation={<TopNavigation type="compact-alt" title="This week" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToNumbers }} />}>
    <Stack gap="md">
      <Grid columns="repeat(2, minmax(0, 1fr))" gap="sm">
        <MetricCard type="tile" theme="solid" color="neutral" label="Billable" value="82%" icon="icon-pie-chart-01-line"
          trend={{ direction: "positive", label: "+4%" }} />
        <MetricCard type="tile" theme="flat" label="Hours logged" value="164 h" icon="icon-clock-line" trend={{ direction: "positive", label: "+12 h" }} />
      </Grid>
      <Grid columns="repeat(3, minmax(0, 1fr))" gap="sm">
        <MetricCard type="tile" size="sm" theme="flat" label="Tasks done" value="12" icon="icon-check-done-line" trend={{ direction: "negative", label: "−2" }} />
        <MetricCard type="tile" size="sm" theme="flat" label="Reviews" value="9" icon="icon-annotation-check-line" trend={{ direction: "positive", label: "+3" }} />
        <MetricCard type="tile" size="sm" theme="flat" label="Days off left" value="9" icon="icon-plane-line" />
      </Grid>
    </Stack>
    {/* Coming up: a List under a Body/Small/Bold kicker */}
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "Metric types on a phone",
    description: "On the studio's phone app the typed cards fill the screen's width: the sparkline and the category bar take the card's width, and the comparison stacks its columns with a rule above each. September is a screen pushed from Numbers (Back, no bottom bar), so the cards stay flat on the grey Canvas.",
    render: () => <PhoneMetricTypes />,
    code: `<PlatformPhone screenRef={screenRef}>
  <AppShell topNavigation={<TopNavigation type="compact-alt" title="September" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToNumbers }} />}>
    <Stack gap="md">
      <MetricCard theme="flat" spacing="small" type="sparkline" label="Revenue" value="$105,700" series={invoiced} format={formatCompactMoney}
        trend={{ direction: "positive", label: "+9% vs. August" }} />
      <MetricCard theme="flat" spacing="small" type="comparison" label="Cash flow" headingLevel={2} comparison={[
        { id: "invoiced", label: "Invoiced", value: "$105,700", trend: { direction: "positive", label: "+9% vs. August" } },
        { id: "collected", label: "Collected", value: "$88,300", trend: { direction: "negative", label: "−8% vs. August" } },
      ]} />
      <MetricCard theme="flat" spacing="small" type="category-bar" label="Invoices by status" value="$95,520.50" categories={byStatus} format={formatMoney} />
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "First weeks of a project",
    description: "Edge cases keep their shape: with no data yet the sparkline keeps its height and the number reads a dash (\"No data\" to screen readers); one week of hours is one current bar; a goal already passed fills the bar and reads 112%.",
    render: () => <FirstWeeksMetrics />,
    code: `<MetricCard theme="flat" type="sparkline" label="Revenue" value={noData} series={[]}
  trend={{ direction: "normal", label: "First invoice due Oct 31" }} />
<MetricCard theme="flat" type="spark-bars" label="Hours logged" value="38 h" series={[38]}
  trend={{ direction: "normal", label: "Week 1 of the project" }} />
<MetricCard theme="flat" type="goal-progress" label="Deposit collected" value="$5,600" format={formatMoney}
  goal={{ value: 5600, target: 5000 }} trend={{ direction: "positive", label: "$600 over the deposit" }} />`,
  },
]);
