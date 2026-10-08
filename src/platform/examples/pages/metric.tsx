/* Metric examples (docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio reads its month, its people and its
   invoices through Metric and MetricCard; the phone example is the studio's own app, where Alex checks his month. */
import { useEffect, useId, useRef, useState } from "react";
import { Badge } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Divider } from "../../../components/Divider";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import type { IconName } from "../../../components/Icon";
import { InlineMessage } from "../../../components/InlineMessage";
import { Box, Container, Grid, Stack } from "../../../components/Layout";
import { List, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { Metric, MetricCard, type MetricTrendDirection } from "../../../components/MetricWidget";
import { PageHeader } from "../../../components/PageHeader";
import { ProgressBar } from "../../../components/Progress";
import { Segmented } from "../../../components/Segmented";
import { SidePanel } from "../../../components/SidePanel";
import { SkeletonHeading, SkeletonShape, SkeletonText } from "../../../components/Skeleton";
import { Table, TableActions, TableBadges, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import {
  formatDate, formatMoney, formatRange, invoiceStatusTheme, invoices, leaveRequests, me, projectById, studio, studioMonths, studioTeamHours,
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
        <EmptyState illustration={false} headingLevel={5} title="No metrics on the overview"
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

function InvoiceSummaryExample() {
  const { toast } = useToast();
  const tableRef = useRef<HTMLElement>(null); // the summary and the table
  const [rows, setRows] = useState(() => [...invoices].sort(byNumber));
  const outstanding = sumOf(rows, ["Sent", "Overdue"]);
  const overdue = sumOf(rows, ["Overdue"]);
  const paid = sumOf(rows, ["Paid"]);
  const setStatus = (id: string, status: InvoiceStatus) => setRows((list) => list.map((row) => (row.id === id ? { ...row, status } : row)));
  const change = (invoice: Invoice, status: InvoiceStatus, title: string) => {
    setStatus(invoice.id, status);
    toast({ title, children: `${invoice.number} · ${invoice.client}`, action: { label: "Undo", onClick: () => setStatus(invoice.id, invoice.status) } });
    // A paid invoice has no action left: focus moves on to the next open invoice (below, else above), not to <body>.
    if (status === "Paid") {
      const at = rows.indexOf(invoice);
      const next = [...rows.slice(at + 1), ...rows.slice(0, at).reverse()].find((row) => row.status !== "Paid");
      if (next) requestAnimationFrame(() => tableRef.current?.querySelector<HTMLElement>(`button[aria-label$="${next.number}"]`)?.focus());
    }
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
    <Container maxWidth="full">
      <Stack paddingY="xl" gap="xl">
        <PageHeader title="Invoices" description={`What ${studio.name} has billed its clients since July.`} />
        <Stack gap="md" ref={tableRef}>
          {/* Every number comes from the same rows as the table, so a change shows in both at once. */}
          <Grid as="section" aria-label="Summary" minColumnWidth="200px" gap="sm">
            <Metric size="sm" label="Outstanding" value={formatMoney(outstanding, true)} icon="icon-hourglass-line" iconTheme="blue" />
            <Metric size="sm" label="Overdue" value={formatMoney(overdue, true)} icon="icon-alert-triangle-line" iconTheme="red" />
            <Metric size="sm" label="Paid" value={formatMoney(paid, true)} icon="icon-check-circle-line" iconTheme="green" />
          </Grid>
          <Table aria-label="Invoices" columns={columns} rows={rows} />
        </Stack>
      </Stack>
    </Container>
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

function PhoneDrillInExample() {
  const screen = usePhoneScreen();
  // The scroller of whichever screen shows: the large title folds as the cards run under the bar.
  const screenRef = useRef<HTMLDivElement>(null);
  const groupId = useId();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = myMetrics.find((metric) => metric.id === openId);

  if (!open) {
    return (
      // One key per screen: each screen opens at the top and the bar measures its fold again.
      <PlatformPhone key="root" label="My numbers" headerOverlay screenRef={screenRef}
        header={<TopNavigation type="alt" title="My numbers" largeTitle="My numbers" scrollRef={screenRef} />}>
        {screen.anchor}
        <Stack gap="lg" padding="lg">
          {myGroups.map((group) => (
            <Stack as="section" key={group.id} gap="xs" aria-labelledby={`${groupId}-${group.id}`}>
              <Heading level={2} id={`${groupId}-${group.id}`} textStyle="Body/Small/Bold" tone="light">{group.title}</Heading>
              <Stack as="ul" gap="md">
                {group.metrics.map((metric) => (
                  <li key={metric.id}>
                    <MetricCard theme="flat" variant="title-highlight" size="md" label={metric.label} value={metric.value} trend={metric.trend} icon={metric.icon} iconTheme={metric.theme}
                      action={<IconButton appearance="main" level="tertiary" size="xs" icon="icon-chevron-right-line" aria-label={openLabel(metric)}
                        onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(metric.id))} />} />
                  </li>
                ))}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </PlatformPhone>
    );
  }
  return (
    <PlatformPhone key={open.id} label={open.label} headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact-alt" title={open.label} scrollRef={screenRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[aria-label="${openLabel(open)}"]`, () => setOpenId(null)) }} />}>
      {screen.anchor}
      {/* Rows pad 0 at the sides: the screen margin (lg) insets them, so they line up with the metric. */}
      <Stack gap="lg" padding="lg">
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
      </Stack>
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
          <MetricCard key={channel.id} theme="flat" size="sm" icon={false} label={channel.label} value={channel.value}
            metricColor={channel.color} counter={channel.invoices} />
        ))}
      </Grid>
      <MetricCard theme="flat" variant="title-highlight" size="md" label="Next payout" labelIcon="icon-wallet-02-line"
        hint="Paid invoices from the last 14 days, less the 2.9% card fee. Pays out every second Friday." value="$4,812.40"
        icon="icon-bank-line" iconTheme="green" trend={{ direction: "normal", label: "Friday, Oct 16" }} />
    </Stack>
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
    description: "On a phone the Title-Highlight metric puts its title first and a chevron in the title row, one card per row under a kicker for its period. The chevron opens what the number adds up as the next screen, and Back returns focus to it.",
    render: () => <PhoneDrillInExample />,
    code: `const screen = usePhoneScreen();
const screenRef = useRef<HTMLDivElement>(null);
const [openId, setOpenId] = useState<string | null>(null);

// One key per screen; the large title folds as the cards scroll under the bar.
<PlatformPhone key="root" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="My numbers" largeTitle="My numbers" scrollRef={screenRef} />}>
  {/* padding 20 (Margin-Compact); gap 24 (sections) → 8 (kicker → cards) → 16 (cards) */}
  <Stack gap="lg" padding="lg">
    <Stack as="section" gap="xs" aria-labelledby={septemberId}>
      <Heading level={2} id={septemberId} textStyle="Body/Small/Bold" tone="light">September</Heading>
      <Stack as="ul" gap="md">
        <li>
          <MetricCard theme="flat" variant="title-highlight" size="md" label="Hours logged" value="164 h"
            trend={{ direction: "positive", label: "+12 h vs. August" }} icon="icon-clock-line" iconTheme="blue"
            action={<IconButton appearance="main" level="tertiary" size="xs" icon="icon-chevron-right-line" aria-label="Open hours logged"
              onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId("hours"))} />} />
        </li>
        {/* Tasks done, Reviews given… then "This year": Leave left, Learning budget left, Expenses claimed */}
      </Stack>
    </Stack>
  </Stack>
</PlatformPhone>

// The next screen: Back returns to the chevron it came from
<PlatformPhone key="hours" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact-alt" title="Hours logged" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go('[aria-label="Open hours logged"]', () => setOpenId(null)) }} />}>
  <Stack gap="lg" padding="lg">
    <Metric size="lg" icon={false} label="September" value="164 h" trend={{ direction: "positive", label: "+12 h vs. August" }} />
    <Stack as="section" gap="xs" aria-labelledby={groupId}>
      <Heading level={2} id={groupId} textStyle="Body/Small/Bold" tone="light">By project</Heading>
      <List aria-labelledby={groupId}>{/* ListItem per project: DockIcon + hours */}</List>
    </Stack>
  </Stack>
</PlatformPhone>`,
  },
  {
    title: "Summary above a table",
    wide: true,
    screen: true,
    description: "Small Metrics above the invoices Table add up the same rows, so sending an invoice or recording a payment moves its amount at once, with Undo in the Toast. The three Dock-Icons share one background (Subtle); their colour tells them apart.",
    render: () => <InvoiceSummaryExample />,
    code: `const outstanding = sumOf(rows, ["Sent", "Overdue"]);
const overdue = sumOf(rows, ["Overdue"]);
const paid = sumOf(rows, ["Paid"]);

<PageHeader title="Invoices" description="What Đìzai Studio has billed its clients since July." />
<Grid as="section" aria-label="Summary" minColumnWidth="200px" gap="sm">
  <Metric size="sm" label="Outstanding" value={formatMoney(outstanding, true)} icon="icon-hourglass-line" iconTheme="blue" />
  <Metric size="sm" label="Overdue" value={formatMoney(overdue, true)} icon="icon-alert-triangle-line" iconTheme="red" />
  <Metric size="sm" label="Paid" value={formatMoney(paid, true)} icon="icon-check-circle-line" iconTheme="green" />
</Grid>
<Table aria-label="Invoices" columns={columns} rows={rows} />

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
    code: `<MetricCard theme="flat" size="sm" icon={false} label="Projects" value="$18,240"
  metricColor="var(--zen-color-background-support-blue-solid)" counter={6} />

<MetricCard theme="flat" variant="title-highlight" size="md" label="Next payout" labelIcon="icon-wallet-02-line"
  hint="Paid invoices from the last 14 days, less the 2.9% card fee. Pays out every second Friday."
  value="$4,812.40" icon="icon-bank-line" iconTheme="green" trend={{ direction: "normal", label: "Friday, Oct 16" }} />`,
  },
]);
