import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { BarChart, ChartCard, DonutChart, HeatmapChart, LineChart, RadialChart, StackBarChart } from "./index";
import { AreaChart, BarList, BulletChart, ComboChart, FunnelChart, GaugeChart, GroupedBarChart } from "./index";

const visits = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, index) => ({ label, value: [1200, 1850, 1640, 2100, 2480, 1720, 1510][index] }));

const meta = {
  title: "Components/Chart",
  component: LineChart,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { "aria-label": "Weekly visits", data: visits },
} satisfies Meta<typeof LineChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ←/→ move the active point; the tooltip shows its value. */
export const Line: Story = {};

/** Stacked bars with a legend; each series has a colour. */
export const StackedBars: Story = {
  render: () => (
    <StackBarChart
      aria-label="Revenue by channel"
      series={[{ id: "web", label: "Web" }, { id: "app", label: "App" }, { id: "store", label: "Store" }]}
      data={["Q1", "Q2", "Q3", "Q4"].map((label, index) => ({ label, values: { web: 40 + index * 8, app: 25 + index * 5, store: 12 + index * 2 } }))}
    />
  ),
};

/** A chart in its card, with a range switch. */
export const Card: Story = {
  render: function CardStory() {
    const [range, setRange] = useState("7d");
    return (
      <ChartCard title="Visits" ranges={[{ id: "7d", label: "7 days" }, { id: "30d", label: "30 days" }]} range={range} onRangeChange={setRange}>
        <LineChart aria-label="Visits" data={visits} />
      </ChartCard>
    );
  },
};

/** The line chart with one dashed comparison and a legend (Figma Chart/Multi-Line-Chart). */
export const WithComparison: Story = {
  render: () => (
    <LineChart aria-label="Invoiced and collected" legendPosition="top" label="Invoiced"
      data={["Apr", "May", "Jun", "Jul", "Aug", "Sep"].map((label, i) => ({ label, value: 82 + i * 4 }))}
      compare={{ label: "Collected", values: [79, 82, 85, 88, 91, 94] }} />
  ),
};

/** Bars: the last closed month is active; the forecast is hatched. */
export const Bars: Story = {
  render: () => (
    <BarChart aria-label="Revenue per month, Oct – Dec forecast"
      data={["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((label, i) => ({ label, value: [94, 97, 106, 108, 112, 104][i], projected: i > 2 }))} />
  ),
};

/** Horizontal bars over a hatched target track; ↑/↓ move between them. */
export const HorizontalBars: Story = {
  render: () => (
    <BarChart orientation="horizontal" aria-label="Billable hours against capacity"
      data={[{ label: "Design", value: 2650, target: 2800 }, { label: "Engineering", value: 1990, target: 2240 }, { label: "Delivery", value: 750, target: 960 }]} />
  ),
};

/** Shares of one total with % pills and the total in the centre. */
export const Donut: Story = {
  render: () => (
    <DonutChart aria-label="Revenue by client" legendPosition="end"
      data={[{ id: "a", label: "Lumen Bank", value: 89 }, { id: "b", label: "Phin & Co", value: 68 }, { id: "c", label: "Mekong Freight", value: 53 }, { id: "d", label: "Other", value: 36 }]} />
  ),
};

/** Ring gauges against 100%. */
export const Radial: Story = {
  render: () => (
    <RadialChart aria-label="Budget used" data={[{ id: "a", label: "Online banking", value: 36 }, { id: "b", label: "Loyalty app", value: 61 }, { id: "c", label: "Shipment tracking", value: 23 }]} />
  ),
};

/** A weekday × hour heatmap on the five Brand steps. */
export const Heatmap: Story = {
  render: () => (
    <HeatmapChart aria-label="Hours logged by weekday and hour" rows={["9 am", "11 am", "1 pm", "3 pm"]} columns={["Mon", "Tue", "Wed", "Thu", "Fri"]}
      values={[[38, 41, 40, 39, 35], [71, 74, 72, 70, 61], [52, 55, 53, 51, 44], [70, 75, 73, 71, 48]]} />
  ),
};

/** The card header: icon, title, description and the headline value. */
export const CardHeader: Story = {
  render: () => (
    <ChartCard title="Revenue" icon="icon-bar-chart-01-line" description="Invoiced so far in 2026" value="$798,300">
      <BarChart aria-label="Revenue per month" data={["Jul", "Aug", "Sep"].map((label, i) => ({ label, value: [94, 97, 106][i] }))} />
    </ChartCard>
  ),
};

/** A ranking: each bar is its share of the leader, the name inside, the value at the end; ↑/↓ move the active row. */
export const BarListRanking: Story = {
  render: () => (
    <ChartCard title="Top clients" icon="icon-horizontal-bar-chart-01-line" description="Revenue, 2026 so far" value="$296,800">
      <BarList aria-label="Revenue by client, 2026 so far" headers={{ label: "Client", value: "Revenue" }} format={(v) => `$${v.toLocaleString("en-US")}`}
        data={[{ label: "Lumen Bank", value: 96400 }, { label: "Phin & Co", value: 71200 }, { label: "Mekong Freight", value: 54800 }, { label: "Hanoi Book Fair", value: 38100 }, { label: "Other clients", value: 36300 }]} />
    </ChartCard>
  ),
};

/** Goals against their targets, each on its own scale; the legend names the bar and the tick. */
export const Bullet: Story = {
  render: () => (
    <ChartCard title="Quarter goals" icon="icon-target-04-line" description="Q3 2026 against target" value="2 of 3 on track">
      <BulletChart aria-label="Quarter goals, Q3 2026"
        format={(v, row) => (row.label === "Revenue" ? `$${v}K` : row.label === "Utilisation" ? `${v}%` : String(v))}
        data={[{ label: "Revenue", value: 798, target: 900 }, { label: "New clients", value: 18, target: 24 }, { label: "Utilisation", value: 82, target: 85, max: 100 }]} />
    </ChartCard>
  ),
};

/** One measure against 100% as a half ring, its target a tick across the ring; the legend names both. */
export const Gauge: Story = {
  render: () => (
    <ChartCard title="Utilisation" icon="icon-speedometer-03-line" description="Billable share of logged hours" value="1,052 of 1,284 h">
      <GaugeChart aria-label="Billable share of logged hours, September 2026" value={82} target={85} actualLabel="Billable" />
    </ChartCard>
  ),
};

/** Stages from first contact to outcome, each bar its share of the first; ↑/↓ pick a stage. */
export const Funnel: Story = {
  render: () => (
    <ChartCard title="Proposal funnel" icon="icon-filter-funnel-line" description="Leads to signed projects, Q3" value="62 signed">
      <FunnelChart aria-label="Leads to signed projects, Q3 2026"
        data={[{ label: "Leads", value: 480 }, { label: "Qualified", value: 312 }, { label: "Proposal", value: 168 }, { label: "Negotiation", value: 94 }, { label: "Signed", value: 62 }]} />
    </ChartCard>
  ),
};

const months6 = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const hoursOf = (value: number) => `${value.toLocaleString("en-US")} h`;
const money = (value: number) => `$${Math.round(value / 1000)}K`;

/** One measure over time as a line over its flat area; the Tooltip stands beside the active dot (Figma Type=Area). */
export const Area: Story = {
  render: () => (
    <ChartCard title="Billable hours" icon="icon-line-chart-up-line" description="Logged per month, 2026" value="11,480 h">
      <AreaChart aria-label="Billable hours per month, Apr – Sep 2026" format={hoursOf} series={[{ id: "hours", label: "Billable hours" }]}
        data={months6.map((label, i) => ({ label, values: { hours: [1510, 1670, 1600, 1880, 2030, 2210][i] } }))} />
    </ChartCard>
  ),
};

/** Two to four series stacked as bands; the top line reads the total and the legend names every band (Figma Type=Stacked). */
export const StackedArea: Story = {
  render: () => (
    <ChartCard title="Billable hours" icon="icon-line-chart-up-line" description="Logged by team, 2026" value="11,480 h">
      <AreaChart type="stacked" aria-label="Billable hours per month by team, Apr – Sep 2026" format={hoursOf}
        series={[{ id: "design", label: "Design" }, { id: "engineering", label: "Engineering" }, { id: "delivery", label: "Delivery" }]}
        data={months6.map((label, i) => ({ label, values: { design: [510, 570, 550, 630, 690, 750][i], engineering: [640, 700, 680, 800, 850, 920][i], delivery: [360, 400, 370, 450, 490, 540][i] } }))} />
    </ChartCard>
  ),
};

/** Two or three series side by side per period, with a legend; the Tooltip reads each value after its dot. */
export const GroupedBars: Story = {
  render: () => (
    <ChartCard title="Invoiced vs. collected" icon="icon-bar-chart-01-line" description="Last six months" value="$560,000">
      <GroupedBarChart aria-label="Invoiced and collected per month, Apr – Sep 2026" format={money}
        series={[{ id: "invoiced", label: "Invoiced" }, { id: "collected", label: "Collected" }]}
        data={months6.map((label, i) => ({ label, values: { invoiced: [82300, 91800, 88400, 94100, 97000, 105700][i], collected: [79500, 90100, 86000, 91700, 95800, 88300][i] } }))} />
    </ChartCard>
  ),
};

/** Bars on the start axis and a line on the end axis, on shared gridlines. */
export const Combo: Story = {
  render: () => (
    <ChartCard title="Revenue and margin" icon="icon-bar-chart-01-line" description="Monthly, 2026" value="$560,000">
      <ComboChart aria-label="Revenue and margin per month, Apr – Sep 2026" barLabel="Revenue" lineLabel="Margin" format={money} lineFormat={(v) => `${v}%`}
        data={months6.map((label, i) => ({ label, bar: [82300, 91800, 88400, 94100, 97000, 105700][i], line: [31, 34, 29, 36, 38, 41][i] }))} />
    </ChartCard>
  ),
};
