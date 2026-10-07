import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProgressBar, ProgressCircle, progressBarThemes } from "./Progress";

const meta = {
  title: "Components/Progress",
  component: ProgressBar,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { value: 64, theme: "neutral", label: true, scale: "completion", "aria-label": "Upload progress" },
  argTypes: { theme: { control: "select", options: progressBarThemes }, scale: { control: "inline-radio", options: ["completion", "quota"] } },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Usage against a limit turns warning, then negative, as it fills. */
export const Quota: Story = { args: { value: 92, theme: "status", scale: "quota", label: "46 of 50 GB used", "aria-label": "Storage used" } };

export const Circle: Story = { render: () => <ProgressCircle value={72} label aria-label="Profile complete" /> };
