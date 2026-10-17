import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Segmented, segmentedLevels } from "./Segmented";

const meta = {
  title: "Components/Segmented",
  component: Segmented,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    "aria-label": "View",
    level: "secondary",
    size: "md",
    defaultValue: "list",
    options: [{ id: "list", label: "List" }, { id: "board", label: "Board" }, { id: "calendar", label: "Calendar" }],
  },
  argTypes: { level: { control: "inline-radio", options: segmentedLevels }, size: { control: "inline-radio", options: ["sm", "md"] }, onValueChange: { action: "value" } },
} satisfies Meta<typeof Segmented>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Controlled, with icon + label options. */
export const Controlled: Story = {
  render: function ControlledStory(args) {
    const [value, setValue] = useState("list");
    return <Segmented {...args} value={value} onValueChange={setValue} options={[{ id: "list", label: "List", leading: "icon-list-line" }, { id: "grid", label: "Grid", leading: "icon-grid-01-line" }]} />;
  },
};

/** Black-Overlay (the default overlay) and White-Overlay on a Brand/Accent band: static tokens, so light and dark mode render the same. */
export const Overlay: Story = {
  args: { options: [{ id: "nutrition", label: "Nutrition" }, { id: "activity", label: "Activity", badge: 3 }], defaultValue: "nutrition" },
  render: (args) => (
    <div style={{ display: "grid", gap: 12, padding: 24, borderRadius: 16, background: "var(--zen-color-background-accent-solid-default)" }}>
      <Segmented {...args} level="black-overlay" />
      <Segmented {...args} level="white-overlay" />
    </div>
  ),
};
