import { useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Box, Button, ChartCard, DonutChart, Grid, LineChart, Menu, MetricCard, PageHeader,
  Search, Segmented, Stack, Tabs, Text, useToast,
  type ChartPoint, type ChartSlice,
} from "@zen-ds/react";
import { formatCompactMoney, formatMoney, me } from "../../data";

/** The brand at the start of a top bar: Figma Brand = Avatar/Single Square Small Neutral Solid + the name in Heading/4. */
function Brand({ initial, name }: { initial: string; name: string }) {
  return (
    // Hug: the brand keeps its width beside the Tabs, which scroll when the row is short.
    <Stack direction="row" gap="xs" align="center" width="hug">
      <Avatar size="sm" shape="square" theme="neutral" background="solid" alt="">{initial}</Avatar>
      <Text as="span" textStyle="Heading/4">{name}</Text>
    </Stack>
  );
}

/** The account button at the end of the top row, in its menu (Profile, Settings, Sign out). */
function AccountMenu() {
  const { toast } = useToast();
  return (
    <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
      { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: "Your profile opens here." }) },
      { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => toast({ title: "Settings", children: "Notifications, security and billing." }) },
      { type: "separator" },
      { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: "See you soon." }) },
    ]} />
  );
}

const sections = [
  { id: "overview", label: "Overview" },
  { id: "portfolio", label: "Portfolio" },
  { id: "markets", label: "Markets" },
  { id: "transfers", label: "Transfers" },
  { id: "reports", label: "Reports" },
];
const periods = [{ id: "1d", label: "1D" }, { id: "1w", label: "1W" }, { id: "1m", label: "1M" }, { id: "1y", label: "1Y" }, { id: "all", label: "All" }];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weeks = ["W29", "W30", "W31", "W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39", "W40"];
const pointsOf = (labels: string[], values: number[]): ChartPoint[] => labels.map((label, index) => ({ label, value: values[index] }));
/* Figma's Multi-Line-Chart reads Invoiced (the line) against Collected (dashed), Q4 at $25.9K · $22.8K. */
const netWorth: Record<string, { points: ChartPoint[]; compare: number[]; span: string }> = {
  quarterly: { span: "Q1 – Q4 2026", points: pointsOf(["Q1", "Q2", "Q3", "Q4"], [8600, 19400, 17200, 25900]), compare: [4100, 14900, 13800, 22800] },
  monthly: {
    span: "Jan – Dec 2026",
    points: pointsOf(months, [7400, 6100, 8600, 12900, 15800, 19400, 14200, 16100, 17200, 15600, 21300, 25900]),
    compare: [3600, 2900, 4100, 8800, 12100, 14900, 10900, 12600, 13800, 11900, 17400, 22800],
  },
  weekly: {
    span: "the last 12 weeks",
    points: pointsOf(weeks, [14800, 15200, 16100, 15700, 16900, 17200, 18800, 19600, 21400, 22900, 24600, 25900]),
    compare: [11300, 11900, 12800, 12200, 13500, 13800, 15200, 16400, 18100, 19800, 21500, 22800],
  },
};
const netWorthRanges = [{ id: "quarterly", label: "Quarterly" }, { id: "monthly", label: "Monthly" }, { id: "weekly", label: "Weekly" }];
/* Figma's Allocation legend and shares: 30 · 23 · 18 · 17 · 12% of $296.8K in Q3. */
const allocation: Record<string, ChartSlice[]> = {
  q3: [
    { id: "lumen", label: "Lumen Bank", value: 89040 },
    { id: "phin", label: "Phin & Co", value: 68264 },
    { id: "mekong", label: "Mekong Freight", value: 53424 },
    { id: "book-fair", label: "Hanoi Book Fair", value: 50456 },
    { id: "other", label: "Other clients", value: 35616 },
  ],
  ytd: [
    { id: "lumen", label: "Lumen Bank", value: 241900 },
    { id: "phin", label: "Phin & Co", value: 198400 },
    { id: "mekong", label: "Mekong Freight", value: 151700 },
    { id: "book-fair", label: "Hanoi Book Fair", value: 117300 },
    { id: "other", label: "Other clients", value: 96500 },
  ],
};
const allocationRanges = [{ id: "q3", label: "Q3" }, { id: "ytd", label: "Year to date" }];

/** A portfolio dashboard: few sections, deep content (Figma ◇ Master-Layout B3, Layout=Top-Bar on Canvas/Alt). */
export default function AnalyticsApp() {
  const { toast } = useToast();
  const [section, setSection] = useState("portfolio");
  const [period, setPeriod] = useState("1m");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("quarterly");
  const [share, setShare] = useState("q3");
  const series = netWorth[range];
  const more = (label: string) => ({ label: `More about ${label.toLowerCase()}`, onClick: () => toast({ title: label, children: "Open the breakdown, set an alert or pin it to Overview." }) });
  return (
    // Top-Bar on Canvas/Alt: few sections, deep content. The navigation is a Large Indicator Tab-Bar in the top row, so
    // the page keeps the full width for numbers; the title row holds the Heading/1 title, the period and the actions.
    // Boxes are Pale with no shadow; one Subtle Brand Hero Metric-Card leads.
    <AppShell pattern="top-bar" canvas="alt"
      header={(
        <AppShellHeader
          leading={(
            <Stack direction="row" gap="xl" align="center">
              <Brand initial="F" name="Finlytics" />
              <Tabs size="lg" aria-label="Sections" value={section} onValueChange={setSection} items={sections} />
            </Stack>
          )}
          actions={<>
            <Box width={240}><Search placeholder="Search tickers, accounts" aria-label="Search tickers and accounts" value={query} onValueChange={setQuery} /></Box>
            <AppShellAction icon="icon-bell-01-solid" aria-label="Notifications" count={8} onClick={() => toast({ title: "8 notifications", children: "3 dividends paid · 5 price alerts" })} />
            <AccountMenu />
          </>}
          main={(
            <PageHeader title={sections.find((item) => item.id === section)?.label ?? "Portfolio"} description="All accounts · updated 2 minutes ago"
              actions={<>
                <Segmented aria-label="Period" options={periods} value={period} onValueChange={setPeriod} />
                <Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Export ready", children: "Portfolio, all accounts · CSV" })}>Export</Button>
                <Button level="primary" startIcon="icon-plus-line" onClick={() => toast({ title: "Add funds", children: "From a linked bank account or a card." })}>Add funds</Button>
              </>} />
          )}
        />
      )}
    >
      {/* One widget grid, one section: its two rows keep the cards' Spacing/Gap/Medium. */}
      <Stack gap="md">
        <Grid columns="400px 1fr" stackBelow={720} gap="md">
          <MetricCard type="hero" theme="subtle" color="brand" label="Total balance" value="$248,930"
            trend={{ direction: "positive", label: "4.2%", subLabel: "this month" }} format={formatCompactMoney}
            series={[212400, 214800, 213900, 219200, 222600, 221100, 227900, 229400, 236200, 239800, 244300, 248930]}
            subAction={more("Total balance")}
            footer={<Button size="sm" level="tertiary" onClick={() => toast({ title: "Statement for September", children: "PDF · all accounts" })}>View statement</Button>} />
          <ChartCard theme="pale" color="neutral" headingLevel={2} title="Net worth vs. invested" metricLabel="All accounts · this year" value="$248.9k"
            onOpen={() => toast({ title: "Net worth report", children: "Opens with this year selected." })} openLabel="Open net worth report"
            ranges={netWorthRanges} range={range} onRangeChange={setRange}>
            <LineChart key={range} aria-label={`Invoiced and collected, ${series.span}`} data={series.points} label="Invoiced"
              compare={{ label: "Collected", values: series.compare }} legendPosition="top" format={formatCompactMoney} height={184} />
          </ChartCard>
        </Grid>
        <Grid columns="400px 1fr 1fr 1fr" stackBelow={720} gap="md">
          <ChartCard theme="pale" color="neutral" headingLevel={2} title="Allocation"
            ranges={allocationRanges} range={share} onRangeChange={setShare}>
            <DonutChart key={share} aria-label={`Allocation, ${share === "q3" ? "Q3 2026" : "2026 to date"}`} data={allocation[share]}
              size="small" legendPosition="start" format={formatCompactMoney} />
          </ChartCard>
          <MetricCard type="sparkline" theme="pale" color="neutral" label="Cash" value="$32,410" trend={{ direction: "positive", label: "1.1%", subLabel: "vs. Aug" }}
            series={[29800, 30100, 29950, 30600, 31000, 30800, 31500, 31400, 31900, 32050, 32410]} format={formatCompactMoney} subAction={more("Cash")} />
          <MetricCard type="spark-bars" theme="pale" color="neutral" label="Monthly spend" value="$4,862" trend={{ direction: "positive", label: "-6%", subLabel: "vs. Aug" }}
            series={[4100, 4400, 4300, 4700, 4200, 4900, 4600, 4800, 4400, 5000, 5170, 4862]} format={formatCompactMoney} subAction={more("Monthly spend")} />
          <MetricCard type="sparkline" theme="pale" color="neutral" label="Dividends YTD" value={formatMoney(1284)} trend={{ direction: "positive", label: "12%", subLabel: "vs. 2025" }}
            series={[620, 680, 710, 760, 820, 870, 940, 1010, 1080, 1150, 1210, 1284]} format={formatCompactMoney} subAction={more("Dividends YTD")} />
        </Grid>
      </Stack>
    </AppShell>
  );
}
