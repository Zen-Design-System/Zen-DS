import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ChartCard, LineChart, StackBarChart } from "./Chart";

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
