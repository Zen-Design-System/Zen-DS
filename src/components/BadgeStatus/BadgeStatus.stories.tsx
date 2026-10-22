import type { Meta, StoryObj } from "@storybook/react-vite";
import { BadgeStatus, badgeStatuses } from "./BadgeStatus";

const meta = {
  title: "Components/BadgeStatus",
  component: BadgeStatus,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { status: "in-progress", size: "md" },
  argTypes: {
    status: { control: "select", options: badgeStatuses },
    size: { control: "inline-radio", options: ["sm", "md"] },
    progress: { control: { type: "range", min: 0, max: 100, step: 5 } },
  },
} satisfies Meta<typeof BadgeStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Every step in both sizes. */
export const Statuses: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: 8 }}>
      {(["md", "sm"] as const).map((size) => (
        <div key={size} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {badgeStatuses.map((status) => <BadgeStatus key={status} {...args} size={size} status={status} />)}
        </div>
      ))}
    </div>
  ),
};

/** An exact value: the ring shows it and a screen reader hears it after the label. */
export const ExactProgress: Story = {
  render: () => <div style={{ display: "flex", gap: 8 }}>{[10, 60, 90].map((value) => <BadgeStatus key={value} status="in-progress" progress={value} />)}</div>,
};
