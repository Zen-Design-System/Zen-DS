import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { List } from "./ListItem";
import { ToggleListItem } from "./ToggleListItem";

const meta = {
  title: "Components/List Item/ToggleListItem",
  component: ToggleListItem,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  decorators: [(Story) => <List style={{ maxWidth: 420, paddingInline: 16 }}><Story /></List>],
  args: { title: "Daily digest", caption: "One email at 8:00 am with what changed yesterday", defaultChecked: true },
  argTypes: { onCheckedChange: { action: "checked" } },
} satisfies Meta<typeof ToggleListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Controlled, with a leading icon. */
export const Controlled: Story = {
  render: (args) => {
    const [on, setOn] = useState(false);
    return <ToggleListItem {...args} leading="icon-bell-01-line" title="Push notifications" caption={on ? "On for this phone" : "Off"} checked={on} onCheckedChange={setOn} />;
  },
};

export const Disabled: Story = { args: { title: "Paid invoices", caption: "Only the workspace owner can change this", disabled: true, defaultChecked: false } };
