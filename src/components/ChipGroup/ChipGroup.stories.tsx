import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ChipGroup } from "./ChipGroup";

const meta = {
  title: "Components/ChipGroup",
  component: ChipGroup,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    "aria-label": "Repeat",
    size: "sm",
    defaultValue: "weekly",
    options: [{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }],
  },
  argTypes: { size: { control: "inline-radio", options: ["xs", "sm", "md"] }, level: { control: "inline-radio", options: ["primary", "secondary"] }, onValueChange: { action: "value" } },
} satisfies Meta<typeof ChipGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Controlled, with leading icons and one option that cannot be picked. */
export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | null>("pickup");
    return (
      <ChipGroup
        {...args}
        aria-label="Order type"
        value={value}
        onValueChange={setValue}
        options={[{ value: "pickup", label: "Pick up", leading: "icon-shopping-bag-01-line" }, { value: "delivery", label: "Delivery", leading: "icon-truck-line" }, { value: "dine-in", label: "Dine in", disabled: true }]}
      />
    );
  },
};
