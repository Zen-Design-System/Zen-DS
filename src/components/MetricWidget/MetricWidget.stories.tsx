import type { Meta, StoryObj } from "@storybook/react-vite";
import { Metric, MetricCard, metricSizes } from "./MetricWidget";

const meta = {
  title: "Components/MetricWidget",
  component: Metric,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Metric-Inline (595:55188) and Metric-Card (6643:64008)." } } },
  args: { label: "Metric Title", value: "$1,680.68", trend: { direction: "positive", label: "+24% vs. last year" }, size: "xlarge" },
  argTypes: { size: { control: "inline-radio", options: metricSizes } },
} satisfies Meta<typeof Metric>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Card: Story = { render: (args) => <div style={{ width: 345 }}><MetricCard {...args} subAction={{ label: "Metric actions", icon: "icon-dots-vertical-line" }} /></div> };
