import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { BarChart, ChartCard, DonutChart, HeatmapChart, LineChart, RadialChart, StackBarChart } from "./index";

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
