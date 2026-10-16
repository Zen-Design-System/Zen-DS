/* Widgets (docs/research/widget-patterns-spec-2026-10-14.md): batch 1 of the widget patterns, one whole dashboard widget
   per card, each the code the Zen Studio's Widgets group inserts (studio/slots/palette.ts: widgetCode). Every widget below
   renders exactly the JSX of its palette entry: palette.selftest.mjs parses this file and compares the two, so edit both
   together. The data is Đìzai Studio's (examples/data.ts), the months, teams, clients and projects the Chart and Metric
   pages read. Widgets sit flat on the Canvas/Default stage (usage rules §16). */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  AreaChart, BarChart, BarList, BulletChart, ChartCard, ComboChart, DonutChart, FunnelChart, GaugeChart, GroupedBarChart, HeatmapChart, LineChart, RadialChart,
} from "../../../components/Chart";
import { Button } from "../../../components/Button";
import { EmptyState } from "../../../components/EmptyState";
import { Box, Grid, Stack } from "../../../components/Layout";
import { MetricCard } from "../../../components/MetricWidget";
import { SkeletonShape } from "../../../components/Skeleton";
import { Heading, Text, plural } from "../../../components/Text";
import { ToastProvider, useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { PlatformPhone } from "../../PlatformPhone";
import { Panel, PlaygroundFilterChip, option } from "../../appLayer/shared";
import { WIDGET_PAGE_CONTEXT, paletteItem, widgetCode } from "../../studio/slots/palette";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./widgets.css";

export const page: PlatformPage = "widgets";

/* ───────────── The widgets (each the JSX of its palette entry) ───────────── */

function KpiWidget() {
  return (
    <MetricCard theme="flat" size="large" label="Billable hours" value="5,900 h" icon="icon-clock-line" iconTheme="blue"
      trend={{ direction: "positive", label: "+4% vs. August" }} />
  );
}

function KpiSparklineWidget() {
  return (
    <MetricCard theme="flat" type="sparkline" label="Revenue" value="$105,700" format={(value) => (value ? `$${value / 1000}K` : "$0")}
      trend={{ direction: "positive", label: "+9% vs. August" }}
      series={[71200, 76500, 68900, 74300, 79600, 85100, 82300, 91800, 88400, 94100, 97000, 105700]} />
  );
}

function KpiSparkBarsWidget() {
  return (
    <MetricCard theme="flat" type="spark-bars" label="Hours logged" value="1,284 h" format={(value) => `${value.toLocaleString("en-US")} h`}
      trend={{ direction: "positive", label: "+13% vs. last week" }}
      series={[1012, 1086, 1048, 760, 1131, 1176, 1104, 640, 1153, 1067, 1132, 1284]} />
  );
}

function GoalProgressWidget() {
  return (
    <MetricCard theme="flat" type="goal-progress" label="Collected in Q3" value="$275,800" format={(value) => `$${value.toLocaleString("en-US")}`}
      trend={{ direction: "positive", label: "+8% vs. Q2" }}
      goal={{ value: 275800, target: 290000 }} />
  );
}

function PeriodComparisonWidget() {
  return (
    <MetricCard theme="flat" type="comparison" label="Cash flow · September" comparison={[
      { id: "invoiced", label: "Invoiced", value: "$105,700", trend: { direction: "positive", label: "+9% vs. August" } },
      { id: "collected", label: "Collected", value: "$88,300", trend: { direction: "negative", label: "−8% vs. August" } },
      { id: "overdue", label: "Overdue", value: "$12,880", trend: { direction: "normal", label: "1 invoice" } },
    ]} />
  );
}

function CategorySplitWidget() {
  return (
    <MetricCard theme="flat" type="category-bar" label="Billable hours · September" value="5,900 h" format={(value) => `${value.toLocaleString("en-US")} h`}
      categories={[
        { id: "design", label: "Design", value: 2650 }, { id: "engineering", label: "Engineering", value: 1990 },
        { id: "delivery", label: "Delivery", value: 750 }, { id: "client-services", label: "Client Services", value: 510 },
      ]} />
  );
}

function HeroWidget() {
  const { toast } = useToast();
  return (
    <MetricCard type="hero" theme="solid" color="neutral" label="Invoiced this year" value="$798,300" format={(value) => (value ? `$${value / 1000}K` : "$0")}
      trend={{ direction: "positive", label: "+12% vs. 2025" }}
      series={[74300, 79600, 85100, 82300, 91800, 88400, 94100, 97000, 105700]}
      footer={<Button size="sm" appearance="overlay" level="inverse" onClick={() => toast({ title: "Revenue report opened" })}>View report</Button>} />
  );
}

function RevenueTrendWidget() {
  return (
    <ChartCard title="Revenue" icon="icon-line-chart-up-line" description="Invoiced over the last 12 months" value="$1,014,900">
      <AreaChart aria-label="Revenue invoiced per month, Oct 2025 – Sep 2026" height={200} format={(value) => (value ? `$${value / 1000}K` : "$0")}
        series={[{ id: "invoiced", label: "Invoiced" }]}
        data={[
          { label: "Oct", values: { invoiced: 71200 } }, { label: "Nov", values: { invoiced: 76500 } }, { label: "Dec", values: { invoiced: 68900 } },
          { label: "Jan", values: { invoiced: 74300 } }, { label: "Feb", values: { invoiced: 79600 } }, { label: "Mar", values: { invoiced: 85100 } },
          { label: "Apr", values: { invoiced: 82300 } }, { label: "May", values: { invoiced: 91800 } }, { label: "Jun", values: { invoiced: 88400 } },
          { label: "Jul", values: { invoiced: 94100 } }, { label: "Aug", values: { invoiced: 97000 } }, { label: "Sep", values: { invoiced: 105700 } },
        ]} />
    </ChartCard>
  );
}

function HoursByTeamWidget() {
  return (
    <ChartCard title="Billable hours by team" icon="icon-clock-line" description="Logged per month, Apr – Sep 2026" value="35,240 h">
      <AreaChart type="stacked" aria-label="Billable hours per month by team, Apr – Sep 2026" height={200} format={(value) => `${value.toLocaleString("en-US")} h`}
        series={[{ id: "design", label: "Design" }, { id: "engineering", label: "Engineering" }, { id: "delivery", label: "Delivery" }, { id: "client-services", label: "Client Services" }]}
        data={[
          { label: "Apr", values: { design: 2500, engineering: 1880, delivery: 700, "client-services": 480 } },
          { label: "May", values: { design: 2510, engineering: 1880, delivery: 700, "client-services": 480 } },
          { label: "Jun", values: { design: 2720, engineering: 2040, delivery: 770, "client-services": 520 } },
          { label: "Jul", values: { design: 2920, engineering: 2190, delivery: 820, "client-services": 560 } },
          { label: "Aug", values: { design: 2550, engineering: 1910, delivery: 720, "client-services": 490 } },
          { label: "Sep", values: { design: 2650, engineering: 1990, delivery: 750, "client-services": 510 } },
        ]} />
    </ChartCard>
  );
}

function InvoicedCollectedWidget() {
  return (
    <ChartCard title="Invoiced vs. collected" icon="icon-coins-stacked-01-line" description="Collected of $559,300 invoiced, Apr – Sep 2026" value="$531,400">
      <LineChart aria-label="Invoiced and collected per month, Apr – Sep 2026" height={200} label="Invoiced" legendPosition="top" format={(value) => (value ? `$${value / 1000}K` : "$0")}
        data={[
          { label: "Apr", value: 82300 }, { label: "May", value: 91800 }, { label: "Jun", value: 88400 },
          { label: "Jul", value: 94100 }, { label: "Aug", value: 97000 }, { label: "Sep", value: 105700 },
        ]}
        compare={{ label: "Collected", values: [79500, 90100, 86000, 91700, 95800, 88300] }} />
    </ChartCard>
  );
}

function ForecastWidget() {
  return (
    <ChartCard title="Revenue forecast" icon="icon-bar-chart-01-line" description="Invoiced and forecast for 2026" value="$1,122,800">
      <BarChart aria-label="Revenue invoiced per month, Jan – Dec 2026, Oct – Dec forecast" height={200} showAverage format={(value) => (value ? `$${value / 1000}K` : "$0")}
        data={[
          { label: "Jan", value: 74300 }, { label: "Feb", value: 79600 }, { label: "Mar", value: 85100 },
          { label: "Apr", value: 82300 }, { label: "May", value: 91800 }, { label: "Jun", value: 88400 },
          { label: "Jul", value: 94100 }, { label: "Aug", value: 97000 }, { label: "Sep", value: 105700 },
          { label: "Oct", value: 108000, projected: true }, { label: "Nov", value: 112500, projected: true }, { label: "Dec", value: 104000, projected: true },
        ]} />
    </ChartCard>
  );
}

function YearOverYearWidget() {
  return (
    <ChartCard title="This year vs last" icon="icon-bar-chart-01-line" description="Invoiced Apr – Sep 2026, up 12% on 2025" value="$559,300">
      <GroupedBarChart aria-label="Revenue invoiced per month, Apr – Sep, 2025 and 2026" height={200} format={(value) => (value ? `$${value / 1000}K` : "$0")}
        series={[{ id: "lastYear", label: "2025" }, { id: "thisYear", label: "2026" }]}
        data={[
          { label: "Apr", values: { lastYear: 74600, thisYear: 82300 } }, { label: "May", values: { lastYear: 81900, thisYear: 91800 } },
          { label: "Jun", values: { lastYear: 80300, thisYear: 88400 } }, { label: "Jul", values: { lastYear: 84200, thisYear: 94100 } },
          { label: "Aug", values: { lastYear: 86900, thisYear: 97000 } }, { label: "Sep", values: { lastYear: 90400, thisYear: 105700 } },
        ]} />
    </ChartCard>
  );
}

function RevenueMarginWidget() {
  return (
    <ChartCard title="Revenue and margin" icon="icon-bar-chart-01-line" description="Invoiced and the share kept after costs, Apr – Sep 2026" value="$559,300">
      <ComboChart aria-label="Revenue and margin per month, Apr – Sep 2026" barLabel="Revenue" lineLabel="Margin" height={200} format={(value) => (value ? `$${value / 1000}K` : "$0")} lineFormat={(value) => `${value}%`}
        data={[
          { label: "Apr", bar: 82300, line: 31 }, { label: "May", bar: 91800, line: 34 }, { label: "Jun", bar: 88400, line: 29 },
          { label: "Jul", bar: 94100, line: 36 }, { label: "Aug", bar: 97000, line: 38 }, { label: "Sep", bar: 105700, line: 41 },
        ]} />
    </ChartCard>
  );
}

function BusiestHoursWidget() {
  return (
    <ChartCard title="Busiest hours" icon="icon-activity-line" description="Hours logged per hour of the day, September">
      <HeatmapChart aria-label="Hours logged by weekday and hour of the day, September 2026" format={(value) => `${value.toLocaleString("en-US")} h`}
        columns={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
        rows={["9 am", "10 am", "11 am", "12 pm", "1 pm", "2 pm", "3 pm", "4 pm", "5 pm", "6 pm"]}
        values={[
          [38, 41, 40, 39, 35, 4, 0], [62, 66, 64, 63, 55, 6, 2], [71, 74, 72, 70, 61, 7, 2], [34, 36, 35, 33, 30, 5, 1], [52, 55, 53, 51, 44, 6, 1],
          [68, 72, 70, 69, 52, 5, 2], [70, 75, 73, 71, 48, 4, 1], [61, 64, 63, 60, 39, 3, 0], [42, 44, 43, 41, 22, 2, 0], [12, 14, 13, 12, 5, 0, 0],
        ]} />
    </ChartCard>
  );
}

function UtilisationWidget() {
  return (
    <ChartCard title="Utilisation" icon="icon-speedometer-03-line" description="Billable share of logged hours, September" value="5,900 of 7,564 h">
      <GaugeChart aria-label="Billable share of logged hours against the 85% target, September 2026" value={5900} max={7564} target={6429} actualLabel="Billable" />
    </ChartCard>
  );
}

function QuarterGoalsWidget() {
  return (
    <ChartCard title="Quarter goals" icon="icon-target-04-line" description="Q3 2026 against target" value="1 of 3 met">
      <BulletChart aria-label="Quarter goals, Q3 2026" format={(value, row) => (row.label === "Revenue" ? `$${value / 1000}K` : row.label === "Utilisation" ? `${value}%` : `${value}`)}
        data={[
          { label: "Revenue", value: 296800, target: 320000 },
          { label: "New clients", value: 5, target: 4 },
          { label: "Utilisation", value: 78, target: 80, max: 100 },
        ]} />
    </ChartCard>
  );
}

function BudgetRingsWidget() {
  return (
    <ChartCard title="Budget used" icon="icon-target-04-line" description="Client projects, spent of budget">
      <RadialChart aria-label="Budget used on client projects, September 30, 2026"
        data={[{ id: "lumen", label: "Online banking redesign", value: 36 }, { id: "phin", label: "Loyalty app", value: 61 }, { id: "mekong", label: "Shipment tracking", value: 23 }]} />
    </ChartCard>
  );
}

function SalesFunnelWidget() {
  return (
    <ChartCard title="Sales funnel" icon="icon-filter-funnel-line" description="Leads to signed projects, Q3 2026" value="62 signed">
      <FunnelChart aria-label="Leads to signed projects, Q3 2026"
        data={[{ label: "Leads", value: 480 }, { label: "Qualified", value: 312 }, { label: "Proposal", value: 168 }, { label: "Negotiation", value: 94 }, { label: "Signed", value: 62 }]} />
    </ChartCard>
  );
}

function TopClientsWidget() {
  return (
    <ChartCard title="Top clients" icon="icon-horizontal-bar-chart-01-line" description="Revenue in Q3 2026" value="$296,800">
      <BarList aria-label="Revenue by client, Q3 2026" headers={{ label: "Client", value: "Revenue" }} format={(value) => `$${value.toLocaleString("en-US")}`}
        data={[
          { label: "Lumen Bank", value: 89000 }, { label: "Phin & Co", value: 68300 }, { label: "Mekong Freight", value: 53400 },
          { label: "Hanoi Book Fair", value: 50500 }, { label: "Other clients", value: 35600 },
        ]} />
    </ChartCard>
  );
}

function RevenueByClientWidget() {
  return (
    <ChartCard title="Revenue by client" icon="icon-pie-chart-01-line" description="Invoiced in Q3 2026">
      <DonutChart aria-label="Revenue by client, Q3 2026" legendPosition="start" format={(value) => (value ? `$${value / 1000}K` : "$0")}
        data={[
          { id: "lumen", label: "Lumen Bank", value: 89000 }, { id: "phin", label: "Phin & Co", value: 68300 },
          { id: "mekong", label: "Mekong Freight", value: 53400 }, { id: "bookfair", label: "Hanoi Book Fair", value: 50500 },
          { id: "other", label: "Other clients", value: 35600 },
        ]} />
    </ChartCard>
  );
}

/* ───────────── Patterns and groups ───────────── */

type Pattern = { id: string; title: string; description: string; Widget: () => ReactNode };

/** A pattern: its Widgets palette entry (title = the entry's label) and the component that renders the same JSX. */
const pattern = (id: string, Widget: () => ReactNode, description: string): Pattern => ({ id, title: paletteItem(id)?.label ?? id, description, Widget });

/** The page's groups, in the palette's order: what a widget answers (how it moves, against what, toward which goal…). */
const groups: { id: string; label: string; patterns: Pattern[] }[] = [
  { id: "metrics", label: "Metrics", patterns: [
    pattern("widget-kpi", KpiWidget, "The plainest widget, laid out like the others (Title-Highlight, Large): its title, the number already formatted (\"5,900 h\") and its change, with a Dock Icon in the measure's colour at its corner. The trend badge says against what."),
    pattern("widget-kpi-sparkline", KpiSparklineWidget, "The number with its last twelve months as a line, the current month at the end dot. The value and trend say the numbers; the line gets an accessible summary from series and format."),
    pattern("widget-kpi-spark-bars", KpiSparkBarsWidget, "Twelve weeks as bars under this week's hours, the current week in the Secondary colour. Bars suit an amount per period; a line suits a level that moves."),
    pattern("widget-goal-progress", GoalProgressWidget, "How far a measure has come toward its goal: a stacked progress bar under the number, its label from format (\"of $290,000 goal\") and the share at the end."),
    pattern("widget-period-comparison", PeriodComparisonWidget, "Two to four numbers of one period side by side, each with its own change; the label becomes the card's title. The columns stack on a narrow card."),
    pattern("widget-category-split", CategorySplitWidget, "One total split into its parts: a bar of shares under the number, then a row per part with its amount and share, largest first."),
    pattern("widget-hero", HeroWidget, "The row's one stand-out: Card Solid Neutral, the dark widget, its trend line in neutral marks and its button Overlay Inverse. One Hero a row; the widgets around it stay flat."),
  ] },
  { id: "trends", label: "Trends", patterns: [
    pattern("widget-revenue-trend", RevenueTrendWidget, "One measure over a year: a line over its flat area, the year's total as the card's figure. The axis and the Tooltip abbreviate (\"$105.7K\"); the figure above the chart never does."),
    pattern("widget-hours-by-team", HoursByTeamWidget, "type=\"stacked\" piles the four teams into bands, so the top line is the studio's month and each band one team. The legend names every band and the Tooltip gives the month's total."),
    pattern("widget-invoiced-collected", InvoicedCollectedWidget, "What came in against what was billed: invoiced keeps the Accent line, collected runs as a dashed neutral line, and the legend above names both. The figure is the collected total; the description says of what."),
    pattern("widget-forecast", ForecastWidget, "Closed months as bars, the months to come hatched (projected), so a forecast never reads as earned. showAverage draws the closed months' mean as a dotted line with its Avg tag."),
  ] },
  { id: "comparisons", label: "Comparisons", patterns: [
    pattern("widget-year-over-year", YearOverYearWidget, "Grouped bars set each month beside the same month last year; the legend names the two years and the Tooltip reads both. The figure is this year's total for the months shown, the description gives the change."),
    pattern("widget-revenue-margin", RevenueMarginWidget, "Two units over the same months: revenue as bars on the start axis, margin as a line on the end axis (lineFormat), on shared gridlines. The Tooltip reads both for the active month."),
    pattern("widget-busiest-hours", BusiestHoursWidget, "When the studio logs time: weekdays against hours of the day in five steps from Less to More, the scale kept under the grid. Tab in, then the arrow keys move from cell to cell."),
  ] },
  { id: "goals", label: "Goals", patterns: [
    pattern("widget-utilisation", UtilisationWidget, "One reading against its maximum as a half ring: billable of the hours logged, with the 85% target as a tick. Pass max when the value isn't a percentage; screen readers hear a meter."),
    pattern("widget-quarter-goals", QuarterGoalsWidget, "Up to four goals, each on its own scale, so money, counts and percentages share one card. A bar past its tick is a goal met; the figure counts the goals met."),
    pattern("widget-budget-rings", BudgetRingsWidget, "One ring per client project, each the share of its budget spent, with the legend in one row under the rings (long project names stay on one line). Hover or ←/→ pick a ring and dim the others."),
  ] },
  { id: "shares", label: "Shares and rankings", patterns: [
    pattern("widget-sales-funnel", SalesFunnelWidget, "Stages from first contact to a signed project, each bar as wide as its share of the first stage. Every row shows its count and its share, so nothing floats over the bars."),
    pattern("widget-top-clients", TopClientsWidget, "A ranking of five: each bar is its share of the leader, the name sits in the bar and the amount in full at the end. Pass the rows largest first; an \"Other\" row may close the list."),
    pattern("widget-revenue-by-client", RevenueByClientWidget, "Shares of one quarter: a % pill on each slice of 6% or more, the total in the hole and the legend beside the ring. Hover or ←/→ show a client's amount in the centre."),
  ] },
];

/** `code` indented by `depth` spaces (every line). */
const indent = (code: string, depth: number) => code.split("\n").map((line) => `${" ".repeat(depth)}${line}`).join("\n");
/** A widget's JSX on the page (no import line). */
const jsxOf = (id: string) => paletteItem(id)?.build(WIDGET_PAGE_CONTEXT) ?? "";
/** The import line of several widgets. */
const importsOf = (ids: string[], extra: string[] = []) =>
  `import { ${[...new Set([...extra, ...ids.flatMap((id) => paletteItem(id)?.components ?? [])])].sort((a, b) => a.localeCompare(b)).join(", ")} } from "@zen-ds/react";`;

/* ───────────── Playground: one group as a dashboard row ───────────── */

/** The page's top panel: a group's widgets side by side on the canvas, as a dashboard row, with their code. */
export function WidgetsPlayground() {
  const [groupId, setGroupId] = useState(groups[0].id);
  const group = groups.find((entry) => entry.id === groupId) ?? groups[0];
  const ids = group.patterns.map((entry) => entry.id);
  const code = `${importsOf(ids, ["Grid"])}\n\n// A dashboard row: flat widgets on Canvas/Default, three a row, one a row once 280px no longer fits.\n<Grid minColumnWidth="clamp(280px, 30%, 100%)" gap="md">\n${ids.map((id) => indent(jsxOf(id), 2)).join("\n")}\n</Grid>`;
  return (
    <Panel title="Widgets" previewClassName="pe-widgets-row" code={code}
      controls={<>
        <PlaygroundFilterChip label="Group" value={groupId} onChange={(value) => setGroupId(String(value))} options={groups.map((entry) => option(entry.id, entry.label))} />
        <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${plural(group.patterns.length, "widget")} · ${plural(groups.reduce((total, entry) => total + entry.patterns.length, 0), "pattern")} in all`}</Text>
      </>}>
      {/* The playground has no ZenProvider of its own (an example card has): the Hero's button needs the toast queue. */}
      <ToastProvider>
        <Grid minColumnWidth="clamp(280px, 30%, 100%)" gap="md">
          {group.patterns.map(({ id, Widget }) => <Widget key={id} />)}
        </Grid>
      </ToastProvider>
    </Panel>
  );
}

/* ───────────── On a phone ───────────── */

function PhoneWidgetsExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  return (
    // Phone screens are Canvas/Default: the widgets stay flat, the bar takes the canvas (alt). The section heading (h2,
    // Heading/4) sits between the large title (h1) and the widgets' card titles (h3, Heading/Subheading), never smaller.
    <PlatformPhone label="Studio" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="alt" title="Studio" largeTitle="Studio" scrollRef={screenRef} />}>
      <Stack as="section" gap="md" padding="lg" aria-labelledby={headingId}>
        <Heading level={2} id={headingId} textStyle="Heading/4">This quarter</Heading>
        <UtilisationWidget />
        <TopClientsWidget />
      </Stack>
    </PlatformPhone>
  );
}

/* ───────────── Before there is data ───────────── */

function NoDataExample() {
  const { toast } = useToast();
  const regionRef = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState<"empty" | "loading" | "ready">("empty");
  // A demo request: the first months arrive after about a second.
  useEffect(() => {
    if (load !== "loading") return undefined;
    const timer = window.setTimeout(() => {
      setLoad("ready");
      toast({ title: "Timesheets connected", children: "Six months of billable hours came in.", action: { label: "Undo", onClick: () => { setLoad("empty"); regionRef.current?.focus(); } } });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [load, toast]);
  const connect = () => {
    setLoad("loading");
    // The pressed button goes away: focus moves to the widget's place, not to <body>.
    regionRef.current?.focus();
  };
  return (
    <Box ref={regionRef} tabIndex={-1} aria-busy={load === "loading"}>
      {load === "ready" ? <HoursByTeamWidget /> : (
        // The card keeps its title and description while there is nothing to draw.
        <ChartCard title="Billable hours by team" icon="icon-clock-line" description="Logged per month, Apr – Sep 2026">
          {load === "loading" ? <SkeletonShape className="pe-widgets-skeleton" /> : (
            <EmptyState icon="icon-clock-line" title="No timesheets yet" primaryAction={{ label: "Connect timesheets", onClick: connect }}>
              Hours your teams log show here month by month.
            </EmptyState>
          )}
        </ChartCard>
      )}
      <VisuallyHidden role="status">{load === "loading" ? "Loading billable hours" : load === "ready" ? "Billable hours loaded" : ""}</VisuallyHidden>
    </Box>
  );
}

/* ───────────── Examples ───────────── */

/** A Widgets example's body (description, render, code) from its pattern; the title is written at the call. */
const widgetExample = (id: string): Omit<ExampleDef, "title"> => {
  const entry = groups.flatMap((group) => group.patterns).find((item) => item.id === id);
  if (!entry) throw new Error(`No widget pattern ${id}`);
  return { description: entry.description, render: () => <entry.Widget />, code: widgetCode(entry.id) };
};

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  // One literal title per widget (the palette entry's label: palette.selftest §4b checks it), so the coverage gate
  // counts them; the rest comes from the pattern.
  { title: "KPI card", ...widgetExample("widget-kpi") },
  { title: "KPI with sparkline", ...widgetExample("widget-kpi-sparkline") },
  { title: "KPI with spark bars", ...widgetExample("widget-kpi-spark-bars") },
  { title: "Goal progress", ...widgetExample("widget-goal-progress") },
  { title: "Period comparison", ...widgetExample("widget-period-comparison") },
  { title: "Category split", ...widgetExample("widget-category-split") },
  { title: "Hero metric", ...widgetExample("widget-hero") },
  { title: "Revenue trend", ...widgetExample("widget-revenue-trend") },
  { title: "Hours by team", ...widgetExample("widget-hours-by-team") },
  { title: "Invoiced vs collected", ...widgetExample("widget-invoiced-collected") },
  { title: "Forecast", ...widgetExample("widget-forecast") },
  { title: "This year vs last", ...widgetExample("widget-year-over-year") },
  { title: "Revenue and margin", ...widgetExample("widget-revenue-margin") },
  { title: "Busiest hours", ...widgetExample("widget-busiest-hours") },
  { title: "Utilisation", ...widgetExample("widget-utilisation") },
  { title: "Quarter goals", ...widgetExample("widget-quarter-goals") },
  { title: "Budget rings", ...widgetExample("widget-budget-rings") },
  { title: "Sales funnel", ...widgetExample("widget-sales-funnel") },
  { title: "Top clients", ...widgetExample("widget-top-clients") },
  { title: "Revenue by client", ...widgetExample("widget-revenue-by-client") },
  {
    title: "Widgets on a phone",
    description: "A phone screen is Canvas/Default too, so the widgets stay flat and stack one a row under a section heading (h2, between the large title and the card titles in size too). Pick widgets whose chart keeps its width in a card: a gauge, a ranking.",
    render: () => <PhoneWidgetsExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone label="Studio" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Studio" largeTitle="Studio" scrollRef={screenRef} />}>
  <Stack as="section" gap="md" padding="lg" aria-labelledby={headingId}>
    <Heading level={2} id={headingId} textStyle="Heading/4">This quarter</Heading>
${indent(jsxOf("widget-utilisation"), 4)}
${indent(jsxOf("widget-top-clients"), 4)}
  </Stack>
</PlatformPhone>`,
  },
  {
    title: "Before there is data",
    description: "Until the first data comes in, the widget keeps its title and description and offers the step that brings data, without an empty grid. Connect timesheets shows a Skeleton while it loads, then the widget; Undo in the Toast goes back.",
    render: () => <NoDataExample />,
    code: `const [load, setLoad] = useState<"empty" | "loading" | "ready">("empty");

<Box ref={regionRef} tabIndex={-1} aria-busy={load === "loading"}>
  {load === "ready" ? (
    <HoursByTeamWidget /> // the "Hours by team" widget above
  ) : (
    <ChartCard title="Billable hours by team" icon="icon-clock-line" description="Logged per month, Apr – Sep 2026">
      {load === "loading" ? <SkeletonShape className="chart-skeleton" /> /* width: 100%; height: 236px (the chart's height) */ : (
        <EmptyState icon="icon-clock-line" title="No timesheets yet" primaryAction={{ label: "Connect timesheets", onClick: connect }}>
          Hours your teams log show here month by month.
        </EmptyState>
      )}
    </ChartCard>
  )}
  <VisuallyHidden role="status">{load === "loading" ? "Loading billable hours" : load === "ready" ? "Billable hours loaded" : ""}</VisuallyHidden>
</Box>`,
  },
]);
