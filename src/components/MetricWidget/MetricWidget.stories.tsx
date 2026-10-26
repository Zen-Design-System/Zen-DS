import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button";
import { Metric, MetricCard, metricSizes } from "./MetricWidget";

const meta = {
  title: "Components/MetricWidget",
  component: Metric,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Metric-Inline (595:55188) and Metric-Card (6643:64008), its Type axis: KPI · Sparkline · Spark-Bars · Goal-Progress · Comparison · Category-Bar · Hero." } } },
  args: { label: "Metric Title", value: "$1,680.68", trend: { direction: "positive", label: "24%", subLabel: "vs. last year" }, size: "xlarge" },
  argTypes: { size: { control: "inline-radio", options: metricSizes } },
} satisfies Meta<typeof Metric>;

export default meta;
type Story = StoryObj<typeof meta>;
const usd = (value: number) => `$${value.toLocaleString("en-US")}`;
const more = { label: "Metric actions", icon: "icon-dots-vertical-line" } as const;
const revenue = [61, 66, 64, 73, 71, 80, 78, 87, 85, 96, 94, 105.7];

export const Playground: Story = {};
export const Card: Story = { render: (args) => <div style={{ width: 345 }}><MetricCard {...args} subAction={more} /></div> };
/** Figma Metric-Card Type=Sparkline (15480:89548). */
export const Sparkline: Story = { render: () => <div style={{ width: 345 }}><MetricCard type="sparkline" label="Revenue" value="$105,700" trend={{ direction: "positive", label: "9%", subLabel: "vs. August" }} series={revenue} subAction={more} /></div> };
/** Figma Metric-Card Type=Spark-Bars (15480:89594). */
export const SparkBars: Story = { render: () => <div style={{ width: 345 }}><MetricCard type="spark-bars" label="Hours logged" value="1,284 h" trend={{ direction: "positive", label: "6%", subLabel: "vs. last week" }} series={[25, 31, 28, 35, 23, 38, 32, 36, 29, 41, 34, 45]} subAction={more} /></div> };
/** Figma Metric-Card Type=Goal-Progress (15481:1803). */
export const GoalProgress: Story = { render: () => <div style={{ width: 345 }}><MetricCard type="goal-progress" label="Collected this quarter" value="$108,400" trend={{ direction: "positive", label: "12%", subLabel: "vs. Q2" }} goal={{ value: 108400, target: 135000 }} format={usd} subAction={more} /></div> };
/** Figma Metric-Card Type=Comparison (15481:1848). */
export const Comparison: Story = {
  render: () => (
    <div style={{ width: 560 }}>
      <MetricCard type="comparison" label="Cash flow · September" subAction={more} comparison={[
        { id: "invoiced", label: "Invoiced", value: "$105,700", trend: { direction: "positive", label: "9%", subLabel: "vs. August" } },
        { id: "collected", label: "Collected", value: "$88,300", trend: { direction: "negative", label: "8%", subLabel: "vs. August" } },
        { id: "overdue", label: "Overdue", value: "$12,880", trend: { direction: "normal", label: "1", subLabel: "invoice" } },
      ]} />
    </div>
  ),
};
/** Figma Metric-Card Type=Category-Bar (15481:1957). */
export const CategoryBar: Story = {
  render: () => (
    <div style={{ width: 345 }}>
      <MetricCard type="category-bar" label="Invoices by status" value="$184,200" format={usd} subAction={more} categories={[
        { id: "paid", label: "Paid", value: 106800 }, { id: "pending", label: "Pending", value: 44200 },
        { id: "overdue", label: "Overdue", value: 22100 }, { id: "draft", label: "Draft", value: 11100 },
      ]} />
    </div>
  ),
};
/** Figma Metric-Card Type=Hero (15481:2047) and its Solid Neutral form (15487:89034). */
export const Hero: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 24 }}>
      {(["pale", "solid"] as const).map((theme) => (
        <div key={theme} style={{ width: 345 }}>
          <MetricCard type="hero" theme={theme} label="Invoiced this year" value="$798,300" trend={{ direction: "positive", label: "12%", subLabel: "vs. 2025" }}
            series={[52, 58, 56, 63, 69, 65, 74, 71, 81, 85, 90, 100]} subAction={more}
            footer={<Button size="sm" appearance={theme === "solid" ? "overlay" : "main"} level={theme === "solid" ? "inverse" : "primary"}>View report</Button>} />
        </div>
      ))}
    </div>
  ),
};
