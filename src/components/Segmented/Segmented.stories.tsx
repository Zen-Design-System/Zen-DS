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
