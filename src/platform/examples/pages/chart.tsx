/* Chart examples (docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio reads its revenue, its billable
   hours and a project's budget through ChartCard, LineChart and StackBarChart; the phone examples are Alex's own hours in
   the studio app. Charts and KPI tiles may abbreviate ("$105.7K"); the report behind a chart never does. The screens sit
   in the studio's AppShell: Finance and Analytics in the sidebar pattern, the phones in its mobile parts (Hours is a
   root with the bottom bar; the screens pushed from it have Back). */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  AreaChart, BarChart, BarList, BulletChart, ChartCard, ComboChart, DonutChart, FunnelChart, GaugeChart, GroupedBarChart, HeatmapChart, LineChart, RadialChart, StackBarChart,
  type ChartBullet, type ChartComboDatum, type ChartDatum, type ChartPoint, type ChartSlice, type ChartStack,
} from "../../../components/Chart";
import { ActionBar } from "../../../components/ActionBar";
import { Badge } from "../../../components/Badge";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader } from "../../../components/AppShell";
import { BottomNavigation, type BottomNavigationItem } from "../../../components/BottomNavigation";
import { BottomSheet } from "../../../components/BottomSheet";
import { Button } from "../../../components/Button";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { InlineMessage } from "../../../components/InlineMessage";
import { useFormState } from "../../../components/Form";
import { InputField, SelectField } from "../../../components/Input";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { Metric, MetricCard } from "../../../components/MetricWidget";
import { PageHeader } from "../../../components/PageHeader";
import { SidePanel } from "../../../components/SidePanel";
import { Sidebar, SidebarMenuItem, type SidebarSection } from "../../../components/Sidebar";
import { SkeletonShape } from "../../../components/Skeleton";
import { Table, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { Segmented } from "../../../components/Segmented";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { PreviewAppFrame, StudioLogo, StudioMark } from "../../PlatformFrames";
import { PlatformPhone } from "../../PlatformPhone";
import { formatCompactMoney, formatDue, formatMoney, invoiceStatusTheme, invoices, me, projectById, studio, studioMonths, studioTeamHours } from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./chart.css";

export const page: PlatformPage = "chart";

/** "1,540 h" — hours read in full, also on the axis. */
const hours = (value: number) => `${value.toLocaleString("en-US")} h`;

/* ───────────── The studio app's chrome ───────────── */

/** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
function useNotHere() {
  const { toast } = useToast();
  return (label: string) => toast({ title: `${label} isn't part of this example`, children: "This screen shows the charts." });
}

const studioPlaces: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "finance", label: "Finance", icon: "icon-coins-line" },
  { id: "analytics", label: "Analytics", icon: "icon-bar-chart-01-line" },
  { id: "people", label: "People", icon: "icon-users-line" },
] }];

/**
 * A desktop page of the studio app: AppShell pattern sidebar, the PageHeader in the header's Main row and the Body padding
 * the page. The Sidebar is Shadow=No (Surface, no shadow), so the dashboards' cards stay flat on the Canvas: one
 * elevation for the screen, none.
 */
function StudioApp({ place, main, sidePanel, children }: { place: string; main: ReactNode; sidePanel?: ReactNode; children: ReactNode }) {
  const { toast } = useToast();
  const notHere = useNotHere();
  const [unread, setUnread] = useState(2);
  return (
    <PreviewAppFrame height={{ min: 640, max: 820 }}>
      <AppShell
        sidebar={(
          <Sidebar shadow={false} logo={<StudioLogo src={studio.logo} name={studio.name} />} logoCollapsed={<StudioMark src={studio.logo} name={studio.name} />}
            sections={studioPlaces} selectedId={place} onItemClick={(item) => { if (item.id !== place) notHere(item.label); }}
            footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
        )}
        header={(
          <AppShellHeader
            actions={<>
              <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => {
                setUnread(0);
                toast({ title: unread ? plural(unread, "new notification") : "You're all caught up", children: `Mai Ho marked ${invoices[1].number} as paid · Lumen Bank sent ${formatMoney(invoices[1].amount)}` });
              }} />
              <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
                { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
                { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
              ]} />
            </>}
            main={main}
          />
        )}
        sidePanel={sidePanel}
      >
        {children}
      </AppShell>
    </PreviewAppFrame>
  );
}

/* ───────────── Finance dashboard ───────────── */

/** "+9%" · "−8%": the change from one month to the next, in whole percent. */
const changeOf = (now: number, before: number) => { const p = Math.round((now / before - 1) * 100); return `${p < 0 ? "−" : "+"}${Math.abs(p)}%`; };
// The tiles read the same shared months and invoices as the chart and the Metric page.
const [august, september] = studioMonths.slice(-2);
const overdue = invoices.filter((invoice) => invoice.status === "Overdue").sort((a, b) => a.due.getTime() - b.due.getTime());

const revenueRanges = [
  { id: "6m", label: "6 months", months: 6, span: "Apr – Sep 2026" },
  { id: "12m", label: "12 months", months: 12, span: "Oct 2025 – Sep 2026" },
];

type ReportRow = { id: string; month: string; invoiced: number; collected: number; total?: boolean };
const reportColumns: TableColumn<ReportRow>[] = [
  { id: "month", header: "Month", cell: (row) => <TableText bold={row.total}>{row.month}</TableText> },
  { id: "invoiced", header: "Invoiced", align: "right", cell: (row) => <TableText bold={row.total}>{formatMoney(row.invoiced)}</TableText> },
  { id: "collected", header: "Collected", align: "right", cell: (row) => <TableText bold={row.total}>{formatMoney(row.collected)}</TableText> },
];

const unpaid = invoices.filter((invoice) => invoice.status === "Sent" || invoice.status === "Overdue").sort((a, b) => a.due.getTime() - b.due.getTime());

function FinanceDashboardExample() {
  const { toast } = useToast();
  const openId = useId();
  const [rangeId, setRangeId] = useState("6m");
  const [reportOpen, setReportOpen] = useState(false);
  const range = revenueRanges.find((r) => r.id === rangeId) ?? revenueRanges[0];
  // The studio's shared months (Oct 2025 – Sep 2026), the same series the Metric page adds up.
  const months = studioMonths.slice(-range.months);
  const points: ChartPoint[] = months.map((m) => ({ label: m.label, value: m.invoiced }));
  const sum = (key: "invoiced" | "collected") => months.reduce((total, m) => total + m[key], 0);
  const reportRows: ReportRow[] = [...months].reverse().map((m) => ({ id: m.id, month: m.month, invoiced: m.invoiced, collected: m.collected }));
  reportRows.push({ id: "total", month: "Total", invoiced: sum("invoiced"), collected: sum("collected"), total: true });
  return (
    <StudioApp place="finance"
      main={(
        <PageHeader title="Finance" description={`What ${studio.name} invoiced and collected from its clients.`}
          actions={<Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Revenue exported", children: `revenue-${range.id}.csv · ${range.span}` })}>Export</Button>} />
      )}
      // The chevron opens the exact amounts behind the chart: docked beside the page when the window has room for both,
      // else as the modal panel.
      sidePanel={(
        <SidePanel type="standard" open={reportOpen} onOpenChange={setReportOpen} title="Revenue report" description={`Invoiced and collected per month, ${range.span}.`}>
          <Table aria-label={`Revenue per month, ${range.span}`} columns={reportColumns} rows={reportRows} />
        </SidePanel>
      )}
    >
      <Stack gap="md">
        {/* Three tiles share the row: each column at least 30% wide, one per row once 220px no longer fits. */}
        <Grid minColumnWidth="clamp(220px, 30%, 100%)" gap="md">
          <MetricCard theme="default" label="Invoiced in September" value={formatMoney(september.invoiced)} icon="icon-currency-dollar-circle-line" iconTheme="green"
            trend={{ direction: september.invoiced >= august.invoiced ? "positive" : "negative", label: `${changeOf(september.invoiced, august.invoiced)} vs. August` }} />
          <MetricCard theme="default" label="Collected in September" value={formatMoney(september.collected)} icon="icon-bank-note-01-line" iconTheme="blue"
            trend={{ direction: september.collected >= august.collected ? "positive" : "negative", label: `${changeOf(september.collected, august.collected)} vs. August` }} />
          <MetricCard theme="default" label="Overdue" value={formatMoney(overdue.reduce((total, invoice) => total + invoice.amount, 0))} icon="icon-alert-triangle-line" iconTheme="red"
            trend={{ direction: "normal", label: overdue.length ? `${plural(overdue.length, "invoice")} · ${formatDue(overdue[0].due)}` : "Nothing overdue" }} />
        </Grid>
        {/* Flat on the canvas, like the tiles. Right under the page h1: an h2. A wide card hugs its range switch. */}
        <ChartCard title="Revenue" headingLevel={2} onOpen={() => setReportOpen(true)} openLabel="Open revenue report"
          ranges={revenueRanges.map((r) => ({ id: r.id, label: r.label }))} range={rangeId} onRangeChange={setRangeId} rangesFullWidth={false}>
          {/* A new range starts on its latest month. */}
          <LineChart key={rangeId} aria-label={`Revenue invoiced per month, ${range.span}`} data={points} format={formatCompactMoney} height={260} />
        </ChartCard>
        {/* What is still open: the invoices the tiles add up, so the dashboard ends on the next thing to do. */}
        <ListBox as="section" aria-labelledby={openId} header={<Heading level={2} id={openId} textStyle="Heading/Subheading">Waiting for payment</Heading>}>
          <List aria-labelledby={openId}>
            {unpaid.map((invoice) => (
              <ListItem key={invoice.id} title={`${invoice.number} · ${invoice.client}`} caption={`${formatMoney(invoice.amount)} · ${formatDue(invoice.due)}`}
                leading={<DockIcon size="md" icon="icon-receipt-line" theme={invoice.status === "Overdue" ? "red" : "blue"} background="subtle" />}
                trailing={<Badge theme={invoiceStatusTheme[invoice.status]} background="subtle">{invoice.status}</Badge>}
                onClick={() => toast({ title: `Reminder sent to ${invoice.client}`, children: `${invoice.number} · ${formatMoney(invoice.amount)}` })} />
            ))}
          </List>
        </ListBox>
      </Stack>
    </StudioApp>
  );
}

/* ───────────── Hours by team ───────────── */

const teams = [
  { id: "design", label: "Design" },
  { id: "engineering", label: "Engineering" },
  { id: "delivery", label: "Delivery" },
  { id: "client-services", label: "Client Services" },
];

/** Billable hours per month and team, Apr – Sep 2026, from the shared series: each column adds up to the studio's month
 *  on the Metric page (Jul 6,490 · Aug 5,670 · Sep 5,900 h, Q3 18,060 h). */
const teamHours: ChartStack[] = studioTeamHours.map((month) => ({
  label: month.label,
  values: { design: month.design, engineering: month.engineering, delivery: month.delivery, "client-services": month.clientServices },
}));

const hourRanges = [{ id: "3m", label: "3 months" }, { id: "6m", label: "6 months" }];

function HoursByTeamExample() {
  const [rangeId, setRangeId] = useState("3m");
  const data = rangeId === "3m" ? teamHours.slice(-3) : teamHours;
  return (
    <ChartCard title="Billable hours" ranges={hourRanges} range={rangeId} onRangeChange={setRangeId}>
      <StackBarChart key={rangeId} aria-label={`Billable hours per month by team, ${rangeId === "3m" ? "Jul – Sep 2026" : "Apr – Sep 2026"}`}
        data={data} series={teams} format={hours} />
    </ChartCard>
  );
}

/* ───────────── Trend in a section ───────────── */

const lumen = projectById("lumen-banking");
/** Budget spent on Online banking redesign, week by week since the kickoff (cumulative). */
const budgetSpent: ChartPoint[] = [
  ["Aug 24", 13900], ["Aug 31", 21800], ["Sep 7", 30200], ["Sep 14", 38900], ["Sep 21", 48600], ["Sep 28", lumen.spent],
].map(([label, value]) => ({ label: String(label), value: Number(value) }));

function TrendInSectionExample() {
  const headingId = useId();
  const share = Math.round((lumen.spent / lumen.budget) * 100);
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack gap="xs">
        <Heading level={4} id={headingId} textStyle="Heading/4">Budget spent</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">{lumen.name} · {lumen.client}</Text>
      </Stack>
      <Metric size="xl" icon={false} label="Spent so far" value={formatMoney(lumen.spent)} trend={{ direction: "normal", label: `${share}% of ${formatMoney(lumen.budget)}` }} />
      <LineChart aria-label={`${lumen.name}, budget spent by week, Aug 24 – Sep 28, 2026`} data={budgetSpent} format={formatCompactMoney} height={200} />
    </Stack>
  );
}

/* ───────────── No data yet ───────────── */

/** The first two weeks of Brand refresh time, from the imported timesheets. */
const firstWeeks: ChartPoint[] = [{ label: "Sep 21", value: 6 }, { label: "Sep 28", value: 14 }];

function NoDataExample() {
  const { toast } = useToast();
  const cardRef = useRef<HTMLElement>(null);
  const [points, setPoints] = useState<ChartPoint[]>([]);
  // The pressed button goes away: focus moves to what takes its place (the chart, or Import timesheets after Undo).
  const focusIn = (selector: string) => requestAnimationFrame(() => cardRef.current?.querySelector<HTMLElement>(selector)?.focus());
  const importTimesheets = () => {
    setPoints(firstWeeks);
    focusIn('[aria-roledescription="chart"]');
    toast({ title: "Timesheets imported", children: `${plural(5, "entry", "entries")} from Gia Pham and Emi Sato`,
      action: { label: "Undo", onClick: () => { setPoints([]); focusIn("button"); } } });
  };
  return (
    <Box ref={cardRef}>
      <ChartCard title="Hours logged">
        {points.length ? (
          <LineChart aria-label="Hours logged on Brand refresh per week, since Sep 21, 2026" data={points} format={hours} height={220} />
        ) : (
          <EmptyState icon="icon-clock-line" title="No hours logged yet" primaryAction={{ label: "Import timesheets", onClick: importTimesheets }}>
            Time the team logs on Brand refresh shows here week by week.
          </EmptyState>
        )}
      </ChartCard>
    </Box>
  );
}

/* ───────────── Data didn't load ───────────── */

/** Studio utilisation (billable ÷ available hours) per month, Apr – Sep 2026: 78% in September, 2 points below August;
 *  Q3 80%, a point above Q2 (the Metric page's Studio overview). */
const utilisation: ChartPoint[] = [["Apr", 77], ["May", 81], ["Jun", 80], ["Jul", 82], ["Aug", 80], ["Sep", 78]]
  .map(([label, value]) => ({ label: String(label), value: Number(value) }));
const percent = (value: number) => `${value}%`;

function LoadFailedExample() {
  const regionRef = useRef<HTMLElement>(null);
  const [load, setLoad] = useState<"failed" | "loading" | "ready">("failed");
  // A demo request: the retry takes about a second, then the months arrive.
  useEffect(() => {
    if (load !== "loading") return undefined;
    const timer = window.setTimeout(() => setLoad("ready"), 1200);
    return () => window.clearTimeout(timer);
  }, [load]);
  const retry = () => {
    setLoad("loading");
    // Try again leaves with the message: focus moves to the chart's place, not to <body>.
    regionRef.current?.focus();
  };
  return (
    <ChartCard title="Utilisation">
      <Box ref={regionRef} tabIndex={-1} aria-busy={load === "loading"}>
        {load === "failed" ? (
          <InlineMessage theme="negative" title="Couldn't load utilisation" action={{ label: "Try again", onClick: retry }}>
            The timesheet service didn't answer in time.
          </InlineMessage>
        ) : load === "loading" ? (
          <SkeletonShape className="px-chart-skeleton" />
        ) : (
          <LineChart aria-label="Studio utilisation per month, Apr – Sep 2026" data={utilisation} format={percent} height={220} />
        )}
      </Box>
      <VisuallyHidden role="status">{load === "loading" ? "Loading utilisation" : load === "ready" ? "Utilisation loaded" : ""}</VisuallyHidden>
    </ChartCard>
  );
}

/* ───────────── Hours on a phone ───────────── */

/** Alex's logged hours: the last six full weeks, or the last six months (September matches the Metric page, 164 h). */
const myHours: Record<string, ChartPoint[]> = {
  weekly: [["Aug 17", 38], ["Aug 24", 41], ["Aug 31", 36], ["Sep 7", 40], ["Sep 14", 42], ["Sep 21", 39]].map(([label, value]) => ({ label: String(label), value: Number(value) })),
  monthly: [["Apr", 152], ["May", 160], ["Jun", 148], ["Jul", 166], ["Aug", 152], ["Sep", 164]].map(([label, value]) => ({ label: String(label), value: Number(value) })),
};
const myRanges = [{ id: "weekly", label: "Weekly" }, { id: "monthly", label: "Monthly" }];
const septemberByProject = [["lumen-banking", 92], ["zen-ds", 48], ["phin-loyalty", 16], ["saola-brand", 8]].map(([id, value]) => ({ project: projectById(String(id)), value: Number(value) }));
/** This week's entries so far (Mon Sep 28 – today), newest first: part of September's 164 h. */
const thisWeek = [
  { id: "w1", note: "Account overview audit", project: "lumen-banking", day: "Today", value: 2 },
  { id: "w2", note: "Transfer sessions debrief", project: "lumen-banking", day: "Yesterday", value: 5 },
  { id: "w3", note: "Metric card guidelines", project: "zen-ds", day: "Yesterday", value: 3 },
  { id: "w4", note: "Usability plan for transfers", project: "lumen-banking", day: "Monday", value: 4 },
  { id: "w5", note: "Design critique", project: "phin-loyalty", day: "Monday", value: 2 },
  { id: "w6", note: "Zen office hours", project: "zen-ds", day: "Monday", value: 2 },
].map((entry) => ({ ...entry, project: projectById(entry.project) }));

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "hours", label: "Hours", icon: "icon-clock-line", selectedIcon: "icon-clock-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
/** The bottom bar of a root screen: the other roots are not drawn here, so a toast says so and the bar keeps this root. */
function PhoneRoots({ value }: { value: string }) {
  const notHere = useNotHere();
  return (
    <BottomNavigation aria-label={studio.name} showLabels items={phoneRoots} value={value}
      onValueChange={(id) => { if (id !== value) notHere(phoneRoots.find((item) => item.id === id)?.label ?? id); }} />
  );
}
/** Back on a pushed screen whose parent this example does not draw: the toast names where it goes. */
function useBackTo(parent: string) {
  const { toast } = useToast();
  return { icon: "icon-chevron-left-line-medium" as const, label: "Back", onClick: () => toast({ title: `Back to ${parent}`, children: "This example shows the one screen." }) };
}

function PhoneHoursExample() {
  // The phone's scroller: the large title folds as the month's entries run under the bar.
  const screenRef = useRef<HTMLDivElement>(null);
  const chartId = useId();
  const groupId = useId();
  const weekId = useId();
  const [rangeId, setRangeId] = useState("weekly");
  return (
    // The Hours root of the studio app: one main chart goes straight on the screen, no Chart Card (the card's padding
    // would cost the plot its width; the user, 2026-10-13). The bottom bar casts a shadow, so the entry groups are Shadow
    // blocks on the grey Canvas, each a ListBox (20px on a phone) whose kicker lines up with the row text.
    <PlatformPhone label="Hours" canvas="default" screenRef={screenRef}>
      <AppShell
        topNavigation={<TopNavigation title="Hours" largeTitle="Hours" largeTitleSubheading={`${me.name} · 164 h in September`} scrollRef={screenRef} />}
        bottomNavigation={<PhoneRoots value="hours" />}
      >
        <Stack as="section" gap="md" aria-labelledby={chartId}>
          <Heading level={2} id={chartId} textStyle="Heading/Subheading">Hours logged</Heading>
          <Segmented options={myRanges} value={rangeId} onValueChange={setRangeId} fullWidth aria-label="Range" />
          <LineChart key={rangeId} aria-label={rangeId === "weekly" ? "Your hours per week, Aug 17 – Sep 27, 2026" : "Your hours per month, Apr – Sep 2026"}
            data={myHours[rangeId]} format={hours} height={220} />
        </Stack>
        <Stack as="section" gap="xs" aria-labelledby={groupId}>
          <Box paddingX="lg"><Heading level={2} id={groupId} textStyle="Body/Small/Bold" tone="light">September by project</Heading></Box>
          <ListBox theme="shadow">
            <List aria-labelledby={groupId}>
              {septemberByProject.map(({ project, value }) => (
                <ListItem key={project.id} title={project.name} caption={project.client}
                  leading={<DockIcon size="md" icon={project.icon} theme={project.theme} background="subtle" />}
                  trailing={<Text as="span" textStyle="Body/Base/Medium">{hours(value)}</Text>} />
              ))}
            </List>
          </ListBox>
        </Stack>
        <Stack as="section" gap="xs" aria-labelledby={weekId}>
          <Box paddingX="lg"><Heading level={2} id={weekId} textStyle="Body/Small/Bold" tone="light">This week</Heading></Box>
          <ListBox theme="shadow">
            <List aria-labelledby={weekId}>
              {/* Day and client: each client has one project here, and the client keeps the caption on one line in the block. */}
              {thisWeek.map((entry) => (
                <ListItem key={entry.id} title={entry.note} caption={`${entry.day} · ${entry.project.client}`}
                  leading={<DockIcon size="md" icon={entry.project.icon} theme={entry.project.theme} background="subtle" />}
                  trailing={<Text as="span" textStyle="Body/Base/Medium">{hours(entry.value)}</Text>} />
              ))}
            </List>
          </ListBox>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

/* ───────────── Studio analytics (the chart family on one canvas) ───────────── */

/** Invoiced per month in 2026: Jan – Sep from the shared months, Oct – Dec the finance team's forecast (hatched). */
const forecast = [["Oct", 108000], ["Nov", 112500], ["Dec", 104000]] as const;
const revenue2026: ChartPoint[] = [
  ...studioMonths.slice(-9).map((m) => ({ label: m.label, value: m.invoiced })),
  ...forecast.map(([label, value]) => ({ label, value, projected: true })),
];
const invoicedSoFar = studioMonths.slice(-9).reduce((total, m) => total + m.invoiced, 0);

function RevenueBarsCard({ headingLevel = 3 }: { headingLevel?: 2 | 3 | 4 }) {
  return (
    <ChartCard title="Revenue" headingLevel={headingLevel} icon="icon-bar-chart-01-line" description="Invoiced so far in 2026" value={formatMoney(invoicedSoFar)}>
      <BarChart aria-label="Revenue invoiced per month, Jan – Dec 2026, Oct – Dec forecast" data={revenue2026} format={formatCompactMoney} height={240} showAverage />
    </ChartCard>
  );
}

/** Invoiced per month, Apr – Sep 2026, against what was collected (the dashed comparison). */
const cashMonths: ChartPoint[] = studioMonths.slice(-6).map((m) => ({ label: m.label, value: m.invoiced }));
const collected = { label: "Collected", values: studioMonths.slice(-6).map((m) => m.collected) };

function CashFlowCard({ headingLevel = 3 }: { headingLevel?: 2 | 3 | 4 }) {
  return (
    <ChartCard title="Invoiced and collected" headingLevel={headingLevel} icon="icon-line-chart-up-line" description="Apr – Sep 2026">
      <LineChart aria-label="Invoiced and collected per month, Apr – Sep 2026" data={cashMonths} label="Invoiced" compare={collected} legendPosition="top" format={formatCompactMoney} height={240} />
    </ChartCard>
  );
}

/** Billable hours per team in September against the hours each team can bill (its capacity). */
const capacity: ChartPoint[] = [
  { label: "Design", value: 2650, target: 2800 },
  { label: "Engineering", value: 1990, target: 2240 },
  { label: "Delivery", value: 750, target: 960 },
  { label: "Client Services", value: 510, target: 640 },
];

function CapacityCard({ headingLevel = 3 }: { headingLevel?: 2 | 3 | 4 }) {
  return (
    <ChartCard title="Hours against capacity" headingLevel={headingLevel} icon="icon-clock-line" description="Billable hours in September" value={hours(capacity.reduce((total, team) => total + team.value, 0))}>
      <BarChart orientation="horizontal" aria-label="Billable hours per team against capacity, September 2026" data={capacity} format={hours} showAverage />
    </ChartCard>
  );
}

/** Q3 2026 revenue by client; the five shares add up to the quarter ($296,800). */
const clientShares: ChartSlice[] = [
  { id: "lumen", label: "Lumen Bank", value: 89000 },
  { id: "phin", label: "Phin & Co", value: 68300 },
  { id: "mekong", label: "Mekong Freight", value: 53400 },
  { id: "bookfair", label: "Hanoi Book Fair", value: 50500 },
  { id: "other", label: "Other clients", value: 35600 },
];
/** Jan – Sep 2026 by the same clients; adds up to the year's invoiced revenue on the Revenue card ($798,300). */
const clientSharesYtd: ChartSlice[] = [239400, 183700, 143600, 135800, 95800].map((value, i) => ({ ...clientShares[i], value }));
const quarters = [{ id: "q3", label: "Q3" }, { id: "ytd", label: "Year to date" }];

function ClientShareCard({ headingLevel = 3 }: { headingLevel?: 2 | 3 | 4 }) {
  const [quarter, setQuarter] = useState("q3");
  return (
    <ChartCard title="Revenue by client" headingLevel={headingLevel} icon="icon-pie-chart-01-line" ranges={quarters} range={quarter} onRangeChange={setQuarter}>
      <DonutChart key={quarter} aria-label={`Revenue by client, ${quarter === "q3" ? "Q3 2026" : "Jan – Sep 2026"}`} data={quarter === "q3" ? clientShares : clientSharesYtd}
        format={formatCompactMoney} legendPosition="start" />
    </ChartCard>
  );
}

/** The same quarter with its total beside the ring: the figure leads, the legend lists down under it. */
function ClientShareSplitCard() {
  return (
    <ChartCard title="Revenue by client" icon="icon-pie-chart-01-line">
      <DonutChart aria-label="Revenue by client, Q3 2026" data={clientShares} format={formatCompactMoney} totalPosition="start" size="large"
        label="Invoiced in Q3 2026" value={formatMoney(clientShares.reduce((sum, c) => sum + c.value, 0))} />
    </ChartCard>
  );
}

/** A dashboard row of two half-width cards: the split donut next to the ring gauges. */
function ClientShareSplitRow() {
  return (
    <Grid minColumnWidth="clamp(320px, 45%, 100%)" gap="md">
      <ClientShareSplitCard />
      <BudgetRingsCard />
    </Grid>
  );
}

/** Budget used on the client projects under way (spent ÷ budget). */
const budgetRings: ChartSlice[] = ["lumen-banking", "phin-loyalty", "mekong-tracking"].map((id) => {
  const project = projectById(id);
  return { id, label: project.name, value: Math.round((project.spent / project.budget) * 100) };
});

function BudgetRingsCard({ headingLevel = 3 }: { headingLevel?: 2 | 3 | 4 }) {
  return (
    <ChartCard title="Budget used" headingLevel={headingLevel} icon="icon-target-04-line" description="Client projects, spent of budget">
      <RadialChart aria-label="Budget used on client projects, September 30, 2026" data={budgetRings} legendPosition="end" />
    </ChartCard>
  );
}

/** Hours logged per hour of the day in September, by weekday (the studio's timesheets). */
const loggedHours = ["9 am", "10 am", "11 am", "12 pm", "1 pm", "2 pm", "3 pm", "4 pm", "5 pm", "6 pm"];
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const loggedByHour = [
  [38, 41, 40, 39, 35, 4, 0], [62, 66, 64, 63, 55, 6, 2], [71, 74, 72, 70, 61, 7, 2], [34, 36, 35, 33, 30, 5, 1], [52, 55, 53, 51, 44, 6, 1],
  [68, 72, 70, 69, 52, 5, 2], [70, 75, 73, 71, 48, 4, 1], [61, 64, 63, 60, 39, 3, 0], [42, 44, 43, 41, 22, 2, 0], [12, 14, 13, 12, 5, 0, 0],
];

function ActivityCard({ headingLevel = 3 }: { headingLevel?: 2 | 3 | 4 }) {
  return (
    <ChartCard title="When the studio logs time" headingLevel={headingLevel} icon="icon-activity-line" description="Hours logged per hour, September">
      <HeatmapChart aria-label="Hours logged by weekday and hour of the day, September 2026" rows={loggedHours} columns={weekdays} values={loggedByHour} format={hours} />
    </ChartCard>
  );
}

function StudioAnalyticsExample() {
  const { toast } = useToast();
  return (
    <StudioApp place="analytics"
      main={(
        <PageHeader title="Analytics" description={`How ${studio.name} earns, bills and spends its time.`}
          actions={<Button level="tertiary" startIcon="icon-share-01-line" onClick={() => toast({ title: "Link copied", children: "Analytics · Jan – Sep 2026, view only" })}>Share</Button>} />
      )}
    >
      {/* Three cards a row on a desktop, one per row once 300px no longer fits; every card is flat on the canvas. */}
      <Grid minColumnWidth="clamp(300px, 30%, 100%)" gap="md">
        <RevenueBarsCard headingLevel={2} />
        <CashFlowCard headingLevel={2} />
        <ClientShareCard headingLevel={2} />
        <ActivityCard headingLevel={2} />
        <CapacityCard headingLevel={2} />
        <BudgetRingsCard headingLevel={2} />
      </Grid>
    </StudioApp>
  );
}

/* ───────────── Bar list and bullet chart ───────────── */

/** Revenue by client, ranked largest first: Q3 2026 ($296,800) or Jan – Sep 2026 ($798,300), the donut's shares. */
const clientRanking = { q3: clientShares, ytd: clientSharesYtd };

function TopClientsCard() {
  const [quarter, setQuarter] = useState<"q3" | "ytd">("q3");
  const rows = clientRanking[quarter];
  return (
    <ChartCard title="Top clients" icon="icon-horizontal-bar-chart-01-line" description={quarter === "q3" ? "Revenue in Q3 2026" : "Revenue, Jan – Sep 2026"}
      value={formatMoney(rows.reduce((sum, c) => sum + c.value, 0))} ranges={quarters} range={quarter} onRangeChange={(id) => setQuarter(id as "q3" | "ytd")}>
      <BarList key={quarter} aria-label={`Revenue by client, ${quarter === "q3" ? "Q3 2026" : "Jan – Sep 2026"}`} headers={{ label: "Client", value: "Revenue" }}
        data={rows.map((c) => ({ label: c.label, value: c.value }))} format={(v) => formatMoney(v)} />
    </ChartCard>
  );
}

/** Alex's September hours by project (the same 164 h as "Hours on a phone"), ranked largest first. */
function PhoneProjectsExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const back = useBackTo("Hours");
  return (
    // A pushed screen from Hours: the compact bar with Back, no bottom bar. The ranking is the screen's one chart:
    // straight on the screen, no Chart Card, its column labels over the rows.
    <PlatformPhone label="Hours by project" canvas="default" screenRef={screenRef}>
      <AppShell topNavigation={<TopNavigation type="compact-alt" title="Hours by project" scrollRef={screenRef} leading={back} />}>
        <Stack as="section" gap="md" aria-labelledby={headingId}>
          <Stack gap="2xs">
            <Heading level={2} id={headingId} textStyle="Heading/Subheading">September</Heading>
            <Text tone="base" textStyle="Body/Small/Regular">{`${hours(septemberByProject.reduce((sum, p) => sum + p.value, 0))} on ${plural(septemberByProject.length, "project")}`}</Text>
          </Stack>
          <BarList aria-label="Your hours by project, September 2026" headers={{ label: "Project", value: "Hours" }}
            data={septemberByProject.map(({ project, value }) => ({ label: project.name, value }))} format={hours} />
        </Stack>
        {/* What the ranking leaves out: the client projects' budgets, so the hours read against what each can still take. */}
        {/* It closes the phone screen, so the list is open on the Canvas at the body's margin (usage rules §19). */}
        <Stack as="section" gap="xs" aria-labelledby={`${headingId}-budget`}>
          <Heading level={2} id={`${headingId}-budget`} textStyle="Body/Small/Bold" tone="light">Budget left</Heading>
          <List aria-labelledby={`${headingId}-budget`}>
            {septemberByProject.filter(({ project }) => project.spent > 0).map(({ project }) => (
              <ListItem key={project.id} title={project.name} caption={`${project.client} · ${Math.round((project.spent / project.budget) * 100)}% used`}
                leading={<DockIcon size="md" icon={project.icon} theme={project.theme} background="subtle" />}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{formatCompactMoney(project.budget - project.spent)}</Text>} />
            ))}
          </List>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

/** Q3 2026 goals, each in its own unit: revenue (Jul – Sep invoiced, $296,800), new clients, utilisation (September). */
const q3Goals: ChartBullet[] = [
  { label: "Revenue", value: studioMonths.slice(-3).reduce((sum, m) => sum + m.invoiced, 0), target: 320000 },
  { label: "New clients", value: 5, target: 4 },
  { label: "Utilisation", value: 78, target: 80, max: 100 },
];
const goalFormat = (value: number, row: ChartBullet) => (row.label === "Revenue" ? formatCompactMoney(value) : row.label === "Utilisation" ? percent(value) : String(value));

function QuarterGoalsCard() {
  const met = q3Goals.filter((goal) => goal.value >= goal.target).length;
  return (
    <ChartCard title="Quarter goals" icon="icon-target-04-line" description="Q3 2026 against target" value={`${met} of ${q3Goals.length} met`}>
      <BulletChart aria-label="Quarter goals, Q3 2026" data={q3Goals} format={goalFormat} />
    </ChartCard>
  );
}

/** What the studio collected in Q3 2026 (Jul – Sep, $275,800) against the plan. */
const collectedQ3 = studioMonths.slice(-3).reduce((sum, m) => sum + m.collected, 0);

function CollectedGoalCard() {
  return (
    <ChartCard title="Collected in Q3" icon="icon-coins-stacked-01-line" description="Against the $290K plan" value={formatMoney(collectedQ3)}>
      <BulletChart aria-label="Collected against plan, Q3 2026" data={[{ label: "Jul – Sep 2026", value: collectedQ3, target: 290000, max: 300000 }]}
        actualLabel="Collected" targetLabel="Plan" format={formatCompactMoney} />
    </ChartCard>
  );
}

/* ───────────── Gauge and funnel ───────────── */

/** September: the teams' 5,900 billable hours of 7,564 logged (78%, the utilisation line's September) against 85%. */
const septemberTeams = studioTeamHours[studioTeamHours.length - 1];
const billableSeptember = septemberTeams.design + septemberTeams.engineering + septemberTeams.delivery + septemberTeams.clientServices;
const loggedSeptember = 7564;

function UtilisationGaugeCard({ headingLevel = 3 }: { headingLevel?: 2 | 3 | 4 }) {
  return (
    <ChartCard title="Utilisation" headingLevel={headingLevel} icon="icon-speedometer-03-line" description="Billable share of logged hours, September"
      value={`${billableSeptember.toLocaleString("en-US")} of ${hours(loggedSeptember)}`}>
      <GaugeChart aria-label="Billable share of logged hours against the 85% target, September 2026" value={billableSeptember} max={loggedSeptember}
        target={loggedSeptember * 0.85} actualLabel="Billable" />
    </ChartCard>
  );
}

/** Alex's 40-hour week: this week's entries so far (the "Hours on a phone" list, 18 h). */
const weekHours = 40;
const weekLogged = thisWeek.reduce((total, entry) => total + entry.value, 0);

const logProjects = ["lumen-banking", "zen-ds", "phin-loyalty", "saola-brand"].map((id) => ({ value: id, label: projectById(id).name }));
const logHours = ["1", "2", "3", "4"].map((value) => ({ value, label: hours(Number(value)) }));

function PhoneWeekGaugeExample() {
  const { toast } = useToast();
  const screenRef = useRef<HTMLDivElement>(null);
  const gaugeId = useId();
  const listId = useId();
  const back = useBackTo("Hours");
  const [entries, setEntries] = useState(thisWeek);
  const [logging, setLogging] = useState(false);
  const logged = entries.reduce((total, entry) => total + entry.value, 0);
  const form = useFormState<{ note: string; project: string; hours: string }>({
    initialValues: { note: "", project: "lumen-banking", hours: "2" },
    validate: (values) => ({ note: values.note.trim() ? undefined : "Say what you worked on" }),
    onSubmit: (values, { reset }) => {
      const entry = { id: `log-${entries.length}`, note: values.note.trim(), project: projectById(values.project), day: "Today", value: Number(values.hours) };
      setEntries((list) => [entry, ...list]);
      setLogging(false);
      reset();
      toast({ title: `${hours(entry.value)} logged`, children: `${entry.note} · ${entry.project.name}`, action: { label: "Undo", onClick: () => setEntries((list) => list.filter((item) => item.id !== entry.id)) } });
    },
  });
  return (
    // A pushed screen from Hours: Back and the compact bar, the week's one action in the Action bar (Figma Bottom=Actions).
    // One main chart goes straight on the screen; the entries close it, open on the grey Canvas (usage rules §19).
    <PlatformPhone label="This week" canvas="default" screenRef={screenRef}>
      <AppShell
        topNavigation={<TopNavigation type="compact-alt" title="This week" scrollRef={screenRef} leading={back} />}
        actionBar={<ActionBar primaryAction={{ label: "Log time", onClick: () => setLogging(true) }} />}
      >
        <Stack as="section" gap="md" aria-labelledby={gaugeId}>
          <Heading level={2} id={gaugeId} textStyle="Heading/Subheading" align="center">Hours logged</Heading>
          <GaugeChart aria-label="Hours logged this week, of a 40-hour week" value={Math.min(logged, weekHours)} max={weekHours} format={hours} actualLabel="Logged"
            caption={logged >= weekHours ? "Week complete" : `${hours(weekHours - logged)} to go`} />
        </Stack>
        <Stack as="section" gap="xs" aria-labelledby={listId}>
          <Heading level={2} id={listId} textStyle="Body/Small/Bold" tone="light">Entries</Heading>
          <List aria-labelledby={listId}>
            {entries.map((entry) => (
              <ListItem key={entry.id} title={entry.note} caption={`${entry.day} · ${entry.project.client}`}
                leading={<DockIcon size="md" icon={entry.project.icon} theme={entry.project.theme} background="subtle" />}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{hours(entry.value)}</Text>} />
            ))}
          </List>
        </Stack>
      </AppShell>
      <BottomSheet inline open={logging} onOpenChange={(open) => { setLogging(open); if (!open) form.reset(); }} title="Log time" onSubmit={form.handleSubmit}
        primaryAction={{ label: "Log hours" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="What did you work on?" placeholder="Transfer limits review" data-autofocus="" {...form.field("note")} />
        <SelectField label="Project" options={logProjects} {...form.selectField("project")} />
        <SelectField label="Hours" options={logHours} {...form.selectField("hours")} />
      </BottomSheet>
    </PlatformPhone>
  );
}

/** Q3 2026: from first contact to a signed project (Figma Chart/Funnel-Chart). */
const proposalFunnel: ChartPoint[] = [["Leads", 480], ["Qualified", 312], ["Proposal", 168], ["Negotiation", 94], ["Signed", 62]]
  .map(([label, value]) => ({ label: String(label), value: Number(value) }));

function ProposalFunnelCard({ headingLevel = 3 }: { headingLevel?: 2 | 3 | 4 }) {
  return (
    <ChartCard title="Proposal funnel" headingLevel={headingLevel} icon="icon-filter-funnel-line" description="Leads to signed projects, Q3"
      value={`${proposalFunnel[proposalFunnel.length - 1].value} signed`}>
      <FunnelChart aria-label="Leads to signed projects, Q3 2026" data={proposalFunnel} />
    </ChartCard>
  );
}

/** The studio's design hiring round, July – September 2026: six stages, the most a funnel takes. */
const hiringFunnel: ChartPoint[] = [["Applications", 214], ["Screened", 96], ["Portfolio review", 41], ["Interview", 18], ["Offer", 5], ["Hired", 4]]
  .map(([label, value]) => ({ label: String(label), value: Number(value) }));
const people = (value: number) => plural(value, "person", "people");

function HiringFunnelCard() {
  return (
    <ChartCard title="Design hiring" icon="icon-users-plus-line" description="Product designer round, Jul – Sep" value={`${people(hiringFunnel[hiringFunnel.length - 1].value)} hired`}>
      <FunnelChart aria-label="Product designer hiring, applications to hires, July – September 2026" data={hiringFunnel} format={people} />
    </ChartCard>
  );
}

/* ───────────── Area, grouped bars and combo ───────────── */

/** The studio's billable hours per month, Apr – Sep 2026: the four teams added up (Jul 6,490 · Aug 5,670 · Sep 5,900 h). */
const studioHours: ChartDatum[] = teamHours.map((month) => ({ label: month.label, values: { hours: Object.values(month.values).reduce((sum, v) => sum + v, 0) } }));
const studioHoursTotal = studioHours.reduce((sum, month) => sum + month.values.hours, 0);

function HoursAreaCard() {
  return (
    <ChartCard title="Billable hours" icon="icon-line-chart-up-line" description="Logged per month, Apr – Sep 2026" value={hours(studioHoursTotal)}>
      <AreaChart aria-label="Billable hours per month, Apr – Sep 2026" data={studioHours} series={[{ id: "hours", label: "Billable hours" }]} format={hours} height={240} />
    </ChartCard>
  );
}

function HoursByTeamAreaCard() {
  return (
    <ChartCard title="Billable hours by team" icon="icon-line-chart-up-line" description="Logged per month, Apr – Sep 2026" value={hours(studioHoursTotal)}>
      <AreaChart type="stacked" aria-label="Billable hours per month by team, Apr – Sep 2026" data={teamHours} series={teams} format={hours} height={240} />
    </ChartCard>
  );
}

/** Invoiced and collected per month, Apr – Sep 2026 (the shared months; the Finance dashboard reads the same). */
const invoicedCollected: ChartDatum[] = studioMonths.slice(-6).map((m) => ({ label: m.label, values: { invoiced: m.invoiced, collected: m.collected } }));
const cashSeries = [{ id: "invoiced", label: "Invoiced" }, { id: "collected", label: "Collected" }];
const invoicedSixMonths = studioMonths.slice(-6).reduce((sum, m) => sum + m.invoiced, 0);

function InvoicedCollectedCard() {
  return (
    <ChartCard title="Invoiced vs. collected" icon="icon-bar-chart-01-line" description="Apr – Sep 2026" value={formatMoney(invoicedSixMonths)}>
      <GroupedBarChart aria-label="Invoiced and collected per month, Apr – Sep 2026" data={invoicedCollected} series={cashSeries} format={formatCompactMoney} height={240} />
    </ChartCard>
  );
}

/** Alex's last six full weeks (the phone example's weekly hours), split into billable and internal time. */
const myWeekSplit: ChartDatum[] = myHours.weekly.map((week, i) => ({ label: week.label, values: { billable: [32, 35, 29, 33, 36, 34][i], internal: week.value - [32, 35, 29, 33, 36, 34][i] } }));
const myBillable = myWeekSplit.reduce((sum, week) => sum + week.values.billable, 0);
const myInternal = myWeekSplit.reduce((sum, week) => sum + week.values.internal, 0);

function PhoneTimeSplitExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const chartId = useId();
  const totalsId = useId();
  const back = useBackTo("Hours");
  return (
    // A pushed screen from Hours: one main chart straight on the screen; the totals close it, open on the grey Canvas
    // (usage rules §19).
    <PlatformPhone label="Billable time" canvas="default" screenRef={screenRef}>
      <AppShell topNavigation={<TopNavigation type="compact-alt" title="Billable time" scrollRef={screenRef} leading={back} />}>
        <Stack as="section" gap="md" aria-labelledby={chartId}>
          <Stack gap="xs">
            <Heading level={2} id={chartId} textStyle="Heading/Subheading">Billable and internal</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">Last six weeks, Aug 17 – Sep 27</Text>
          </Stack>
          <GroupedBarChart aria-label="Your billable and internal hours per week, Aug 17 – Sep 27, 2026" data={myWeekSplit}
            series={[{ id: "billable", label: "Billable" }, { id: "internal", label: "Internal" }]} format={hours} height={220} />
        </Stack>
        <Stack as="section" gap="xs" aria-labelledby={totalsId}>
          <Heading level={2} id={totalsId} textStyle="Body/Small/Bold" tone="light">Six-week totals</Heading>
          <List aria-labelledby={totalsId}>
            <ListItem title="Billable" caption={`${Math.round((myBillable / (myBillable + myInternal)) * 100)}% of logged time`} trailing={<Text as="span" textStyle="Body/Base/Medium">{hours(myBillable)}</Text>} />
            <ListItem title="Internal" caption="Reviews, critiques and office hours" trailing={<Text as="span" textStyle="Body/Base/Medium">{hours(myInternal)}</Text>} />
          </List>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

/** Revenue and margin per month, Apr – Sep 2026: invoiced (the shared months) and the share kept after costs. */
const revenueMargin: ChartComboDatum[] = studioMonths.slice(-6).map((m, i) => ({ label: m.label, bar: m.invoiced, line: [31, 34, 29, 36, 38, 41][i] }));

function RevenueMarginCard() {
  return (
    <ChartCard title="Revenue and margin" icon="icon-bar-chart-01-line" description="Apr – Sep 2026" value={formatMoney(invoicedSixMonths)}>
      <ComboChart aria-label="Revenue and margin per month, Apr – Sep 2026" data={revenueMargin} barLabel="Revenue" lineLabel="Margin"
        format={formatCompactMoney} lineFormat={percent} height={240} />
    </ChartCard>
  );
}

/** Billable hours (the four teams added up) and utilisation per month, Apr – Sep 2026: 78% in September. */
const hoursUtilisation: ChartComboDatum[] = studioHours.map((month, i) => ({ label: month.label, bar: month.values.hours, line: utilisation[i].value }));

function HoursUtilisationCard() {
  return (
    <ChartCard title="Hours and utilisation" icon="icon-clock-line" description="Billable hours and the share of available hours" value={`${percent(utilisation[utilisation.length - 1].value)} in September`}>
      <ComboChart aria-label="Billable hours and utilisation per month, Apr – Sep 2026" data={hoursUtilisation} barLabel="Billable hours" lineLabel="Utilisation"
        format={hours} lineFormat={percent} lineMax={100} height={240} />
    </ChartCard>
  );
}

/* ───────────── Examples ───────────── */

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Finance dashboard",
    screen: true,
    description: "The studio's Finance page: the Chart Card sits on the page canvas with three Metric Cards, all flat (Surface on the canvas, no border or shadow) beside a Sidebar without a shadow, and its title is an h2 right under the PageHeader in the header's Main row. On the wide card the range switch hugs its labels; the chevron opens the exact amounts in a Side Panel that docks beside the page when the window has room and floats over it when not.",
    render: () => <FinanceDashboardExample />,
    code: `const [range, setRange] = useState("6m");
const [reportOpen, setReportOpen] = useState(false);

<AppShell
  // Shadow=No: a Surface Sidebar with no shadow, so the cards stay flat on the Canvas
  sidebar={<Sidebar shadow={false} logo={logo} sections={places} selectedId="finance" onItemClick={go} />}
  header={<AppShellHeader actions={<>{notifications}{account}</>}
    main={<PageHeader title="Finance" description="What Đìzai Studio invoiced and collected from its clients." actions={<Button level="tertiary" startIcon="icon-download-01-line" onClick={exportCsv}>Export</Button>} />} />}
  sidePanel={
    <SidePanel type="standard" open={reportOpen} onOpenChange={setReportOpen} title="Revenue report"
      description="Invoiced and collected per month, Apr – Sep 2026.">
      <Table aria-label="Revenue per month, Apr – Sep 2026" columns={columns} rows={rows} />
    </SidePanel>
  }
>
  <Grid minColumnWidth="clamp(220px, 30%, 100%)" gap="md">
    <MetricCard theme="default" label="Invoiced in September" value="$105,700" icon="icon-currency-dollar-circle-line" iconTheme="green"
      trend={{ direction: "positive", label: "+9% vs. August" }} />
    {/* Collected in September, Overdue */}
  </Grid>
  <ChartCard title="Revenue" headingLevel={2} onOpen={() => setReportOpen(true)} openLabel="Open revenue report"
    ranges={[{ id: "6m", label: "6 months" }, { id: "12m", label: "12 months" }]} range={range} onRangeChange={setRange}
    rangesFullWidth={false}>
    <LineChart key={range} aria-label="Revenue invoiced per month, Apr – Sep 2026" data={points} format={formatCompactMoney} height={260} />
  </ChartCard>
  <ListBox as="section" aria-labelledby="open" header={<Heading level={2} id="open" textStyle="Heading/Subheading">Waiting for payment</Heading>}>…</ListBox>
</AppShell>`,
  },
  {
    title: "Studio analytics",
    screen: true,
    description: "The whole chart family on the studio's Analytics page, every card flat on the canvas beside a Sidebar without a shadow, its title an h2 under the PageHeader in the header's Main row: bars with a hatched forecast, a line with a dashed comparison, a donut, a heatmap, bars against capacity and ring gauges. Each chart draws itself in as it mounts.",
    render: () => <StudioAnalyticsExample />,
    code: `<AppShell
  sidebar={<Sidebar shadow={false} logo={logo} sections={places} selectedId="analytics" onItemClick={go} />}
  header={<AppShellHeader actions={<>{notifications}{account}</>}
    main={<PageHeader title="Analytics" description="How Đìzai Studio earns, bills and spends its time." actions={<Button level="tertiary" startIcon="icon-share-01-line" onClick={share}>Share</Button>} />} />}
>
  <Grid minColumnWidth="clamp(300px, 30%, 100%)" gap="md">
    <ChartCard title="Revenue" headingLevel={2} icon="icon-bar-chart-01-line" description="Invoiced so far in 2026" value="$798,300">
      <BarChart aria-label="Revenue invoiced per month, Jan – Dec 2026, Oct – Dec forecast" data={revenue} format={formatCompactMoney} height={240} showAverage />
    </ChartCard>
    <ChartCard title="Invoiced and collected" headingLevel={2} icon="icon-line-chart-up-line" description="Apr – Sep 2026">
      <LineChart aria-label="Invoiced and collected per month, Apr – Sep 2026" data={invoiced} label="Invoiced"
        compare={{ label: "Collected", values: collected }} legendPosition="top" height={240} />
    </ChartCard>
    {/* Revenue by client (DonutChart), When the studio logs time (HeatmapChart),
        Hours against capacity (BarChart orientation="horizontal"), Budget used (RadialChart) */}
  </Grid>
</AppShell>`,
  },
  {
    title: "Hours by team",
    description: "A Stack Bar shows how each month's billable hours split across the four teams. The legend names every colour, the Tooltip gives the month's total, and the range switch fills the card.",
    render: () => <HoursByTeamExample />,
    code: `const teams = [{ id: "design", label: "Design" }, { id: "engineering", label: "Engineering" },
  { id: "delivery", label: "Delivery" }, { id: "client-services", label: "Client Services" }];
const hours = (value: number) => \`\${value.toLocaleString("en-US")} h\`;
const [range, setRange] = useState("3m");

<ChartCard title="Billable hours" ranges={[{ id: "3m", label: "3 months" }, { id: "6m", label: "6 months" }]}
  range={range} onRangeChange={setRange}>
  <StackBarChart key={range} aria-label="Billable hours per month by team, Jul – Sep 2026"
    data={range === "3m" ? months.slice(-3) : months} // { label: "Sep", values: { design: 2650, … } }
    series={teams} format={hours} />
</ChartCard>`,
  },
  {
    title: "Revenue with a forecast",
    description: "Bars compare months; the months not closed yet are projected and hatched, so the forecast never reads as earned. The card leads with the year's figure, the active bar (the last closed month) takes the Secondary colour with its Tooltip, and showAverage draws the closed months' mean as a dotted line with its Avg tag.",
    render: () => <RevenueBarsCard />,
    code: `const revenue = [
  { label: "Jan", value: 74300 }, /* … */ { label: "Sep", value: 105700 },
  { label: "Oct", value: 108000, projected: true }, { label: "Nov", value: 112500, projected: true }, { label: "Dec", value: 104000, projected: true },
];

<ChartCard title="Revenue" icon="icon-bar-chart-01-line" description="Invoiced so far in 2026" value="$798,300">
  <BarChart aria-label="Revenue invoiced per month, Jan – Dec 2026, Oct – Dec forecast" data={revenue} format={formatCompactMoney} height={240}
    showAverage />
</ChartCard>`,
  },
  {
    title: "A line and its comparison",
    description: "The line chart with one dashed comparison: what was invoiced keeps its Accent line and area, what was collected runs as a dashed neutral reference line, and the legend above names both. The Tooltip reads both values for the active month.",
    render: () => <CashFlowCard />,
    code: `const invoiced = [{ label: "Apr", value: 82300 }, /* … */ { label: "Sep", value: 105700 }];
const collected = { label: "Collected", values: [79500, /* … */ 88300] };

<ChartCard title="Invoiced and collected" icon="icon-line-chart-up-line" description="Apr – Sep 2026">
  <LineChart aria-label="Invoiced and collected per month, Apr – Sep 2026" data={invoiced} label="Invoiced"
    compare={collected} legendPosition="top" format={formatCompactMoney} height={240} />
</ChartCard>`,
  },
  {
    title: "Shares of a total",
    description: "A donut splits one quarter's revenue across clients: a % pill on every slice of 6% or more, the total in the hole, the legend beside the ring. Hover or ←/→ pick a client and the centre shows its amount.",
    render: () => <ClientShareCard />,
    code: `const [quarter, setQuarter] = useState("q3");

<ChartCard title="Revenue by client" icon="icon-pie-chart-01-line"
  ranges={[{ id: "q3", label: "Q3" }, { id: "ytd", label: "Year to date" }]} range={quarter} onRangeChange={setQuarter}>
  <DonutChart key={quarter} aria-label="Revenue by client, Q3 2026" format={formatCompactMoney} legendPosition="start"
    data={[{ id: "lumen", label: "Lumen Bank", value: 89000 }, { id: "phin", label: "Phin & Co", value: 68300 }, /* … */]} />
</ChartCard>`,
  },
  {
    title: "Total beside the ring",
    wide: true,
    description: "On a half-width dashboard card the total leads in a column of its own, the legend lists down under it and the ring stands at the end with an empty hole (totalPosition=\"start\"). Picking a slice puts its amount in the total's place; on a narrow card the column comes first and the ring under it.",
    render: () => <ClientShareSplitRow />,
    code: `<ChartCard title="Revenue by client" icon="icon-pie-chart-01-line">
  <DonutChart aria-label="Revenue by client, Q3 2026" totalPosition="start" size="large"
    label="Invoiced in Q3 2026" value="$296,800" format={formatCompactMoney}
    data={[{ id: "lumen", label: "Lumen Bank", value: 89000 }, { id: "phin", label: "Phin & Co", value: 68300 }, /* … */]} />
</ChartCard>`,
  },
  {
    title: "Against a target",
    description: "Horizontal bars suit long category names. Each team's capacity is a hatched track behind its bar, every row ends with its value (the active one in Strongest, nothing floats over the bars), and the average runs down the plot under its tag. ↑/↓ move between teams; the summary reads \"1,990 h of 2,240 h\".",
    render: () => <CapacityCard />,
    code: `<ChartCard title="Hours against capacity" icon="icon-clock-line" description="Billable hours in September" value="5,900 h">
  <BarChart orientation="horizontal" aria-label="Billable hours per team against capacity, September 2026" format={hours} showAverage
    data={[{ label: "Design", value: 2650, target: 2800 }, { label: "Engineering", value: 1990, target: 2240 }, /* … */]} />
</ChartCard>`,
  },
  {
    title: "Ring gauges",
    description: "Up to four measures against the same maximum, as concentric rings over dotted tracks: here the share of budget each client project has spent. The centre shows the outer ring, or the ring you pick.",
    render: () => <BudgetRingsCard />,
    code: `<ChartCard title="Budget used" icon="icon-target-04-line" description="Client projects, spent of budget">
  <RadialChart aria-label="Budget used on client projects, September 30, 2026" legendPosition="end"
    data={[{ id: "lumen-banking", label: "Online banking redesign", value: 36 }, /* … */]} />
</ChartCard>`,
  },
  {
    title: "Activity by hour",
    description: "A heatmap reads a value per weekday and hour on five Brand steps, from Pale to Deep, with the Less → More scale under it. The arrow keys move through the cells; the row and column labels of the active cell light up.",
    render: () => <ActivityCard />,
    code: `<ChartCard title="When the studio logs time" icon="icon-activity-line" description="Hours logged per hour, September">
  <HeatmapChart aria-label="Hours logged by weekday and hour of the day, September 2026" format={hours}
    rows={["9 am", "10 am", /* … */ "6 pm"]} columns={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
    values={[[38, 41, 40, 39, 35, 4, 0], /* one row per hour */]} />
</ChartCard>`,
  },
  {
    title: "Trend in a section",
    description: "Inside a page section the LineChart goes without a card, under the section heading and the metric it explains. Tab reaches the chart; ←/→ and Home/End move the point, and the Tooltip and a live summary read its value.",
    render: () => <TrendInSectionExample />,
    code: `<Stack as="section" gap="md" aria-labelledby={headingId}>
  <Stack gap="xs">
    <Heading level={4} id={headingId} textStyle="Heading/4">Budget spent</Heading>
    <Text textStyle="Body/Small/Regular" tone="base">Online banking redesign · Lumen Bank</Text>
  </Stack>
  <Metric size="sm" icon={false} label="Spent so far" value="$58,310" trend={{ direction: "normal", label: "36% of $162,000" }} />
  <LineChart aria-label="Online banking redesign, budget spent by week, Aug 24 – Sep 28, 2026"
    data={budgetSpent} format={formatCompactMoney} height={200} />
</Stack>`,
  },
  {
    title: "No data yet",
    description: "Before any time is logged the card keeps its title and shows an Empty State with the action that brings data in, never an empty grid. Import timesheets draws the first two weeks, and Undo in the Toast goes back.",
    render: () => <NoDataExample />,
    code: `const { toast } = useToast();
const [points, setPoints] = useState<ChartPoint[]>([]);
const importTimesheets = () => {
  setPoints(firstWeeks);
  focusChart(); // the button goes away: focus moves to the chart
  // Undo closes its toast after it runs.
  toast({ title: "Timesheets imported", children: "5 entries from Gia Pham and Emi Sato",
    action: { label: "Undo", onClick: () => { setPoints([]); focusImportButton(); } } });
};

<ChartCard title="Hours logged">
  {points.length ? (
    <LineChart aria-label="Hours logged on Brand refresh per week, since Sep 21, 2026" data={points} format={hours} height={220} />
  ) : (
    <EmptyState icon="icon-clock-line" title="No hours logged yet" primaryAction={{ label: "Import timesheets", onClick: importTimesheets }}>
      Time the team logs on Brand refresh shows here week by week.
    </EmptyState>
  )}
</ChartCard>`,
  },
  {
    title: "Data didn't load",
    description: "When the data fails, the card keeps its title and shows a Negative Inline Message with Try again, not an Empty State. The retry puts a Skeleton in the chart's place until the months arrive, and a hidden status line tells screen readers.",
    render: () => <LoadFailedExample />,
    code: `const [load, setLoad] = useState<"failed" | "loading" | "ready">("failed");
const retry = () => {
  setLoad("loading");
  regionRef.current?.focus(); // the button goes away: focus stays in the card
  fetchUtilisation().then(() => setLoad("ready"));
};

<ChartCard title="Utilisation">
  <Box ref={regionRef} tabIndex={-1} aria-busy={load === "loading"}>
    {load === "failed" ? (
      <InlineMessage theme="negative" title="Couldn't load utilisation" action={{ label: "Try again", onClick: retry }}>
        The timesheet service didn't answer in time.
      </InlineMessage>
    ) : load === "loading" ? (
      <SkeletonShape className="chart-skeleton" /> // width: 100%; height: 220px (the chart's height)
    ) : (
      <LineChart aria-label="Studio utilisation per month, Apr – Sep 2026" data={months} format={(v) => \`\${v}%\`} height={220} />
    )}
  </Box>
  <VisuallyHidden role="status">{load === "loading" ? "Loading utilisation" : load === "ready" ? "Utilisation loaded" : ""}</VisuallyHidden>
</ChartCard>`,
  },
  {
    title: "Hours on a phone",
    description: "On a phone a screen's one main chart goes straight on the screen — no Chart Card, whose padding would cost the plot its width: its title, the range switch split into equal halves and the chart share the margin the AppShell's Body pads, and six short labels keep every point tappable. Hours is a root of the studio app, so the bottom bar holds its roots; the bar casts a shadow, so the entry groups below are Shadow blocks on the grey Canvas, and they scroll the large title into the bar.",
    render: () => <PhoneHoursExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

// One main chart on a phone: straight on the screen, no Chart Card.
<PlatformPhone screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation title="Hours" largeTitle="Hours" largeTitleSubheading="Alex Duong · 164 h in September" scrollRef={screenRef} />}
    bottomNavigation={<BottomNavigation aria-label="Đìzai Studio" showLabels value="hours" onValueChange={go} items={roots} />}
  >
    {/* The Body pads 20 and spaces the sections Layout-Mobile/Section-Gap apart */}
    <Stack as="section" gap="md" aria-labelledby={chartId}>
      <Heading level={2} id={chartId} textStyle="Heading/Subheading">Hours logged</Heading>
      <Segmented options={[{ id: "weekly", label: "Weekly" }, { id: "monthly", label: "Monthly" }]} value={range}
        onValueChange={setRange} fullWidth aria-label="Range" />
      <LineChart aria-label="Your hours per week, Aug 17 – Sep 27, 2026" data={myHours[range]} format={hours} height={220} />
    </Stack>
    <Stack as="section" gap="xs" aria-labelledby={groupId}>
      {/* The kicker lines up with the row text inside the group */}
      <Box paddingX="lg"><Heading level={2} id={groupId} textStyle="Body/Small/Bold" tone="light">September by project</Heading></Box>
      {/* Rows have no side padding of their own: the ListBox pads them. Shadow: the bottom bar's elevation */}
      <ListBox theme="shadow">
        <List aria-labelledby={groupId}>
          <ListItem title="Online banking redesign" caption="Lumen Bank" leading={<DockIcon size="md" icon="icon-bank-line" theme="blue" background="subtle" />}
            trailing={<Text as="span" textStyle="Body/Base/Medium">92 h</Text>} />
        </List>
      </ListBox>
    </Stack>
    {/* … then "This week" the same way: one row per time entry */}
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "Top clients",
    description: "A bar list ranks a few items with their values: each bar is its share of the leader, the name sits in the bar and the values line up at the end under their column label. The active row is stronger (48%); ↑/↓ and Home/End move it and the summary reads \"Lumen Bank: $89,000 (1 of 5)\". The range switch redraws the list.",
    render: () => <TopClientsCard />,
    code: `<ChartCard title="Top clients" icon="icon-horizontal-bar-chart-01-line" description="Revenue in Q3 2026" value="$296,800"
  ranges={[{ id: "q3", label: "Q3" }, { id: "ytd", label: "Year to date" }]} range={quarter} onRangeChange={setQuarter}>
  {/* Ranked largest first by you: the list keeps your order. */}
  <BarList key={quarter} aria-label="Revenue by client, Q3 2026" headers={{ label: "Client", value: "Revenue" }} format={formatMoney}
    data={[{ label: "Lumen Bank", value: 89000 }, { label: "Phin & Co", value: 68300 }, /* … */ { label: "Other clients", value: 35600 }]} />
</ChartCard>`,
  },
  {
    title: "Ranking on a phone",
    description: "On a phone the screen's one ranking goes straight on the screen, no Chart Card: a heading with its total, then the list at full width. Project names sit inside the bars (a short bar lets its name run past its end, a name too long for the column ends in an ellipsis) and the values keep their own column. The screen is pushed from Hours: Back in the compact bar, no bottom bar, and the budgets left close it as an open list on the Canvas (no box: the list ends the phone page).",
    render: () => <PhoneProjectsExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone screenRef={screenRef}>
  <AppShell topNavigation={<TopNavigation type="compact-alt" title="Hours by project" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToHours }} />}>
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack gap="2xs">
        <Heading level={2} id={headingId} textStyle="Heading/Subheading">September</Heading>
        <Text tone="base" textStyle="Body/Small/Regular">164 h on 4 projects</Text>
      </Stack>
      <BarList aria-label="Your hours by project, September 2026" headers={{ label: "Project", value: "Hours" }} format={hours}
        data={[{ label: "Online banking redesign", value: 92 }, { label: "Zen design system", value: 48 }, /* … */]} />
    </Stack>
    {/* Budget left: it closes the screen, so a List under a Body/Small/Bold kicker, open on the Canvas (no ListBox) */}
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "Goals against targets",
    description: "A bullet chart sets 1–4 goals against their targets, each on its own scale, so money, counts and percentages share one card: the bar is where a goal stands, the tick where it should be, and a bar past its tick is a goal met. ↑/↓ pick a goal (the others dim) and the summary reads \"New clients: 5 of 4 (2 of 3)\".",
    render: () => <QuarterGoalsCard />,
    code: `<ChartCard title="Quarter goals" icon="icon-target-04-line" description="Q3 2026 against target" value="1 of 3 met">
  <BulletChart aria-label="Quarter goals, Q3 2026"
    format={(v, row) => (row.label === "Revenue" ? formatCompactMoney(v) : row.label === "Utilisation" ? \`\${v}%\` : String(v))}
    data={[
      { label: "Revenue", value: 296800, target: 320000 },
      { label: "New clients", value: 5, target: 4 },
      { label: "Utilisation", value: 78, target: 80, max: 100 },
    ]} />
</ChartCard>`,
  },
  {
    title: "One goal",
    description: "One goal is enough for a bullet chart when its target matters: the tick shows the plan, which a progress bar can't. The legend takes the card's words (actualLabel, targetLabel) and max sets the scale.",
    render: () => <CollectedGoalCard />,
    code: `<ChartCard title="Collected in Q3" icon="icon-coins-stacked-01-line" description="Against the $290K plan" value="$275,800">
  <BulletChart aria-label="Collected against plan, Q3 2026" actualLabel="Collected" targetLabel="Plan" format={formatCompactMoney}
    data={[{ label: "Jul – Sep 2026", value: 275800, target: 290000, max: 300000 }]} />
</ChartCard>`,
  },
  {
    title: "Utilisation against a target",
    description: "One measure against its maximum as a half ring: billable hours of the hours logged, the 85% target as a tick across the ring. Pass max (here the hours logged) and the gauge reads the share; the legend names the value and the target. Screen readers hear a meter: \"Billable 78%, Target 85%\".",
    render: () => <UtilisationGaugeCard />,
    code: `<ChartCard title="Utilisation" icon="icon-speedometer-03-line" description="Billable share of logged hours, September" value="5,900 of 7,564 h">
  <GaugeChart aria-label="Billable share of logged hours against the 85% target, September 2026"
    value={5900} max={7564} target={7564 * 0.85} actualLabel="Billable" />
</ChartCard>`,
  },
  {
    title: "Hours this week on a phone",
    description: "A gauge with no target: the week's 40 hours are the scale, format reads hours at the figure and both ends, and the caption says what is left. On a phone the screen's one main chart goes straight on the screen, without a Chart Card; the week's entries close it as an open list on the grey Canvas (no box: the list ends the phone page). Log time in the Action bar adds an entry from a Bottom Sheet, and the gauge moves with it (Undo in the toast).",
    render: () => <PhoneWeekGaugeExample />,
    code: `<PlatformPhone screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation type="compact-alt" title="This week" scrollRef={screenRef}
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToHours }} />}
    actionBar={<ActionBar primaryAction={{ label: "Log time", onClick: () => setLogging(true) }} />}
  >
    <Stack as="section" gap="md" aria-labelledby={gaugeId}>
      <Heading level={2} id={gaugeId} textStyle="Heading/Subheading" align="center">Hours logged</Heading>
      <GaugeChart aria-label="Hours logged this week, of a 40-hour week" value={logged} max={40} format={hours} actualLabel="Logged" caption={\`\${hours(40 - logged)} to go\`} />
    </Stack>
    {/* … the week's entries close the screen: a List under a Body/Small/Bold kicker, open on the Canvas (no ListBox) */}
  </AppShell>
  <BottomSheet inline open={logging} onOpenChange={setLogging} title="Log time" onSubmit={form.handleSubmit}
    primaryAction={{ label: "Log hours" }} secondaryAction={{ label: "Cancel" }}>…</BottomSheet>
</PlatformPhone>`,
  },
  {
    title: "Proposal funnel",
    description: "Stages from first contact to a signed project, each bar centred and as wide as its share of the first stage; the last stage takes Sector/Secondary. Every row shows its count under the name and its share at the end, so nothing floats over the bars. Hover or ↑/↓ pick a stage and dim the others.",
    render: () => <ProposalFunnelCard />,
    code: `<ChartCard title="Proposal funnel" icon="icon-filter-funnel-line" description="Leads to signed projects, Q3" value="62 signed">
  <FunnelChart aria-label="Leads to signed projects, Q3 2026"
    data={[{ label: "Leads", value: 480 }, { label: "Qualified", value: 312 }, { label: "Proposal", value: 168 }, { label: "Negotiation", value: 94 }, { label: "Signed", value: 62 }]} />
</ChartCard>`,
  },
  {
    title: "Six stages with the keyboard",
    description: "Six stages, the most a funnel takes: a long stage name widens the name column for every row, and the small last stages keep a visible bar. Tab to the funnel, then ↑/↓ move between stages and Home/End jump to the first and last; the summary reads \"Interview: 18 people, 8% of Applications (4 of 6)\".",
    render: () => <HiringFunnelCard />,
    code: `const people = (value: number) => plural(value, "person", "people");

<ChartCard title="Design hiring" icon="icon-users-plus-line" description="Product designer round, Jul – Sep" value="4 people hired">
  <FunnelChart aria-label="Product designer hiring, applications to hires, July – September 2026" format={people}
    data={[{ label: "Applications", value: 214 }, { label: "Screened", value: 96 }, { label: "Portfolio review", value: 41 }, /* … */ { label: "Hired", value: 4 }]} />
</ChartCard>`,
  },
  {
    title: "Hours over time",
    description: "An area chart reads one measure over time as a straight line over its fading area, from the first month to the last. The active month shows its dot, a rule down to the baseline and the Tooltip beside the dot; with one series the card title names the measure, so there is no legend.",
    render: () => <HoursAreaCard />,
    code: `<ChartCard title="Billable hours" icon="icon-line-chart-up-line" description="Logged per month, Apr – Sep 2026" value="35,240 h">
  <AreaChart aria-label="Billable hours per month, Apr – Sep 2026" series={[{ id: "hours", label: "Billable hours" }]}
    data={[{ label: "Apr", values: { hours: 5560 } }, /* … */ { label: "Sep", values: { hours: 5900 } }]} format={hours} height={240} />
</ChartCard>`,
  },
  {
    title: "Stacked by team",
    description: "type=\"stacked\" piles two to four series as bands, so the top line is the month's total and each band shows how one team moves. The legend names every band. Tab to the chart, then ←/→ move between months and Home/End jump to April and September; the Tooltip gives the total and the summary reads \"Sep: total 5,900 h; Design 2,650 h, Engineering 1,990 h, Delivery 750 h, Client Services 510 h (6 of 6)\".",
    render: () => <HoursByTeamAreaCard />,
    code: `const teams = [{ id: "design", label: "Design" }, { id: "engineering", label: "Engineering" },
  { id: "delivery", label: "Delivery" }, { id: "client-services", label: "Client Services" }];

<ChartCard title="Billable hours by team" icon="icon-line-chart-up-line" description="Logged per month, Apr – Sep 2026" value="35,240 h">
  <AreaChart type="stacked" aria-label="Billable hours per month by team, Apr – Sep 2026" series={teams} format={hours} height={240}
    data={months} // { label: "Sep", values: { design: 2650, engineering: 1990, delivery: 750, "client-services": 510 } }
  />
</ChartCard>`,
  },
  {
    title: "Invoiced vs. collected",
    description: "Grouped bars put two or three measures side by side in each month, here what was invoiced next to what came in. The legend names both colours and the Tooltip reads each value after its dot. For a trend against a reference, the line with its comparison reads better; for parts of one total, a Stack Bar.",
    render: () => <InvoicedCollectedCard />,
    code: `<ChartCard title="Invoiced vs. collected" icon="icon-bar-chart-01-line" description="Apr – Sep 2026" value="$559,300">
  <GroupedBarChart aria-label="Invoiced and collected per month, Apr – Sep 2026" format={formatCompactMoney} height={240}
    series={[{ id: "invoiced", label: "Invoiced" }, { id: "collected", label: "Collected" }]}
    data={[{ label: "Apr", values: { invoiced: 82300, collected: 79500 } }, /* … */ { label: "Sep", values: { invoiced: 105700, collected: 88300 } }]} />
</ChartCard>`,
  },
  {
    title: "Grouped bars on a phone",
    description: "On a phone the chart goes straight on the screen under its heading, without a Chart Card. Six weeks of two bars still fit 390px: each bar narrows with its column. Touching a week shows its Tooltip; the totals below close the screen as an open list on the grey Canvas of a screen pushed from Hours (Back, no bottom bar).",
    render: () => <PhoneTimeSplitExample />,
    code: `<PlatformPhone screenRef={screenRef}>
  <AppShell topNavigation={<TopNavigation type="compact-alt" title="Billable time" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToHours }} />}>
    <Stack as="section" gap="md" aria-labelledby={chartId}>
      <Stack gap="xs">
        <Heading level={2} id={chartId} textStyle="Heading/Subheading">Billable and internal</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">Last six weeks, Aug 17 – Sep 27</Text>
      </Stack>
      <GroupedBarChart aria-label="Your billable and internal hours per week, Aug 17 – Sep 27, 2026" format={hours} height={220}
        series={[{ id: "billable", label: "Billable" }, { id: "internal", label: "Internal" }]}
        data={[{ label: "Aug 17", values: { billable: 32, internal: 6 } }, /* … */]} />
    </Stack>
    {/* Six-week totals close the screen: a List under a Body/Small/Bold kicker, open on the Canvas (no ListBox) */}
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "Revenue and margin",
    description: "A combo chart reads two measures with different units over the same months: revenue as bars on the start axis, margin as a line with a dot per month on the end axis. Both axes share the gridlines, and the Tooltip reads both values for the active month.",
    render: () => <RevenueMarginCard />,
    code: `<ChartCard title="Revenue and margin" icon="icon-bar-chart-01-line" description="Apr – Sep 2026" value="$559,300">
  <ComboChart aria-label="Revenue and margin per month, Apr – Sep 2026" barLabel="Revenue" lineLabel="Margin"
    format={formatCompactMoney} lineFormat={(value) => \`\${value}%\`} height={240}
    data={[{ label: "Apr", bar: 82300, line: 31 }, /* … */ { label: "Sep", bar: 105700, line: 41 }]} />
</ChartCard>`,
  },
  {
    title: "A share on a fixed axis",
    description: "When the line is a share, lineMax={100} fixes the end axis at 0 – 100%, so 78% sits at 78% of the plot instead of near the top of a tighter scale. The end axis still takes the start axis' gridlines (0, 25, 50, 75, 100%).",
    render: () => <HoursUtilisationCard />,
    code: `<ChartCard title="Hours and utilisation" icon="icon-clock-line" description="Billable hours and the share of available hours" value="78% in September">
  <ComboChart aria-label="Billable hours and utilisation per month, Apr – Sep 2026" barLabel="Billable hours" lineLabel="Utilisation"
    format={hours} lineFormat={(value) => \`\${value}%\`} lineMax={100} height={240}
    data={[{ label: "Apr", bar: 5560, line: 77 }, /* … */ { label: "Sep", bar: 5900, line: 78 }]} />
</ChartCard>`,
  },
]);
