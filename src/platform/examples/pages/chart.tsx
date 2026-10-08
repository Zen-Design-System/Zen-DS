/* Chart examples (docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio reads its revenue, its billable
   hours and a project's budget through ChartCard, LineChart and StackBarChart; the phone example is Alex's own hours in
   the studio app. Charts and KPI tiles may abbreviate ("$105.7K"); the report behind a chart never does. */
import { useEffect, useId, useRef, useState } from "react";
import { ChartCard, LineChart, StackBarChart, type ChartPoint, type ChartStack } from "../../../components/Chart";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { InlineMessage } from "../../../components/InlineMessage";
import { Box, Container, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Metric, MetricCard } from "../../../components/MetricWidget";
import { PageHeader } from "../../../components/PageHeader";
import { SidePanel } from "../../../components/SidePanel";
import { SkeletonShape } from "../../../components/Skeleton";
import { Table, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { PlatformPhone } from "../../PlatformPhone";
import { formatCompactMoney, formatDue, formatMoney, invoices, projectById, studio, studioMonths, studioTeamHours } from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./chart.css";

export const page: PlatformPage = "chart";

/** "1,540 h" — hours read in full, also on the axis. */
const hours = (value: number) => `${value.toLocaleString("en-US")} h`;

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

function FinanceDashboardExample() {
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
    <Box className="px-chart-canvas">
      <Container maxWidth="lg">
        <Stack paddingY="xl" gap="xl">
          <PageHeader title="Finance" description={`What ${studio.name} invoiced and collected from its clients.`} />
          <Stack gap="md">
            {/* Three tiles share the row: each column at least 30% wide, one per row once 220px no longer fits. */}
            <Grid minColumnWidth="clamp(220px, 30%, 100%)" gap="md">
              <MetricCard theme="flat" label="Invoiced in September" value={formatMoney(september.invoiced)} icon="icon-currency-dollar-circle-line" iconTheme="green"
                trend={{ direction: september.invoiced >= august.invoiced ? "positive" : "negative", label: `${changeOf(september.invoiced, august.invoiced)} vs. August` }} />
              <MetricCard theme="flat" label="Collected in September" value={formatMoney(september.collected)} icon="icon-bank-note-01-line" iconTheme="blue"
                trend={{ direction: september.collected >= august.collected ? "positive" : "negative", label: `${changeOf(september.collected, august.collected)} vs. August` }} />
              <MetricCard theme="flat" label="Overdue" value={formatMoney(overdue.reduce((total, invoice) => total + invoice.amount, 0))} icon="icon-alert-triangle-line" iconTheme="red"
                trend={{ direction: "normal", label: overdue.length ? `${plural(overdue.length, "invoice")} · ${formatDue(overdue[0].due)}` : "Nothing overdue" }} />
            </Grid>
            {/* On the canvas every surface keeps its Pale edge (theme border). Right under the page h1: an h2. A wide card hugs its range switch. */}
            <ChartCard title="Revenue" headingLevel={2} onOpen={() => setReportOpen(true)} openLabel="Open revenue report"
              ranges={revenueRanges.map((r) => ({ id: r.id, label: r.label }))} range={rangeId} onRangeChange={setRangeId} rangesFullWidth={false}>
              {/* A new range starts on its latest month. */}
              <LineChart key={rangeId} aria-label={`Revenue invoiced per month, ${range.span}`} data={points} format={formatCompactMoney} height={260} />
            </ChartCard>
          </Stack>
        </Stack>
      </Container>
      {/* The chevron opens the exact amounts behind the chart. */}
      <SidePanel type="modal" open={reportOpen} onOpenChange={setReportOpen} title="Revenue report" description={`Invoiced and collected per month, ${range.span}.`}>
        <Table aria-label={`Revenue per month, ${range.span}`} columns={reportColumns} rows={reportRows} />
      </SidePanel>
    </Box>
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
          <EmptyState illustration={false} title="No hours logged yet" primaryAction={{ label: "Import timesheets", onClick: importTimesheets }}>
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

function PhoneHoursExample() {
  // The phone's scroller: the large title folds as the month's entries run under the bar.
  const screenRef = useRef<HTMLDivElement>(null);
  const groupId = useId();
  const weekId = useId();
  const [rangeId, setRangeId] = useState("weekly");
  return (
    // Grouped list: the screen is Surface-Alt and the card and each group of entries are white blocks on it, so no
    // border or shadow is needed. The rows are static with no side padding of their own: each group is a ListBox (20px on a
    // phone) and its kicker lines up with the row text (lg).
    <PlatformPhone label="My hours" canvas="alt" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="alt" title="My hours" largeTitle="My hours" scrollRef={screenRef} />}>
      <Stack gap="lg" padding="lg">
        <ChartCard title="Hours logged" headingLevel={2} ranges={myRanges} range={rangeId} onRangeChange={setRangeId}>
          <LineChart key={rangeId} aria-label={rangeId === "weekly" ? "Your hours per week, Aug 17 – Sep 27, 2026" : "Your hours per month, Apr – Sep 2026"}
            data={myHours[rangeId]} format={hours} height={200} />
        </ChartCard>
        <Stack as="section" gap="xs" aria-labelledby={groupId}>
          <Box paddingX="lg"><Heading level={2} id={groupId} textStyle="Body/Small/Bold" tone="light">September by project</Heading></Box>
          <ListBox>
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
          <ListBox>
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
      </Stack>
    </PlatformPhone>
  );
}

/* ───────────── Examples ───────────── */

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Finance dashboard",
    screen: true,
    description: "On a dashboard the Chart Card sits on the page canvas with three Metric Cards, all flat (Surface on the canvas, no border or shadow), and its title is an h2 right under the page title. On the wide card the range switch hugs its labels; the chevron opens the exact amounts in a Side Panel.",
    render: () => <FinanceDashboardExample />,
    code: `const [range, setRange] = useState("6m");
const [reportOpen, setReportOpen] = useState(false);

<PageHeader title="Finance" description="What Đìzai Studio invoiced and collected from its clients." />
<Grid minColumnWidth="clamp(220px, 30%, 100%)" gap="md">
  <MetricCard theme="flat" label="Invoiced in September" value="$105,700" icon="icon-currency-dollar-circle-line" iconTheme="green"
    trend={{ direction: "positive", label: "+9% vs. August" }} />
  {/* Collected in September, Overdue */}
</Grid>
<ChartCard title="Revenue" headingLevel={2} onOpen={() => setReportOpen(true)} openLabel="Open revenue report"
  ranges={[{ id: "6m", label: "6 months" }, { id: "12m", label: "12 months" }]} range={range} onRangeChange={setRange}
  rangesFullWidth={false}>
  <LineChart key={range} aria-label="Revenue invoiced per month, Apr – Sep 2026" data={points} format={formatCompactMoney} height={260} />
</ChartCard>

<SidePanel type="modal" open={reportOpen} onOpenChange={setReportOpen} title="Revenue report"
  description="Invoiced and collected per month, Apr – Sep 2026.">
  <Table aria-label="Revenue per month, Apr – Sep 2026" columns={columns} rows={rows} />
</SidePanel>`,
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
    <EmptyState illustration={false} title="No hours logged yet" primaryAction={{ label: "Import timesheets", onClick: importTimesheets }}>
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
    description: "On a phone the Chart Card spans the screen inside its margin, the range switch splits it into equal halves, and six short labels keep every point tappable. The entries are grouped, so the screen is Surface-Alt: the card and each group are white blocks with no border, and the entries scroll the large title into the bar.",
    render: () => <PhoneHoursExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

// Grouped list: Surface-Alt screen, Alt bar; the card and each group are white blocks (no border, no shadow).
<PlatformPhone canvas="alt" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="My hours" largeTitle="My hours" scrollRef={screenRef} />}>
  {/* padding 20 (Margin-Compact); gap 24 between the card and the groups */}
  <Stack gap="lg" padding="lg">
    <ChartCard title="Hours logged" headingLevel={2}
      ranges={[{ id: "weekly", label: "Weekly" }, { id: "monthly", label: "Monthly" }]} range={range} onRangeChange={setRange}>
      <LineChart aria-label="Your hours per week, Aug 17 – Sep 27, 2026" data={myHours[range]} format={hours} height={200} />
    </ChartCard>
    <Stack as="section" gap="xs" aria-labelledby={groupId}>
      {/* The kicker lines up with the row text inside the group */}
      <Box paddingX="lg"><Heading level={2} id={groupId} textStyle="Body/Small/Bold" tone="light">September by project</Heading></Box>
      {/* Rows have no side padding of their own: the ListBox pads them */}
      <ListBox>
        <List aria-labelledby={groupId}>
          <ListItem title="Online banking redesign" caption="Lumen Bank" leading={<DockIcon size="md" icon="icon-bank-line" theme="blue" background="subtle" />}
            trailing={<Text as="span" textStyle="Body/Base/Medium">92 h</Text>} />
        </List>
      </ListBox>
    </Stack>
    {/* … then "This week" the same way: one row per time entry */}
  </Stack>
</PlatformPhone>`,
  },
]);
