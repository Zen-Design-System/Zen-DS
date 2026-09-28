import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BottomNavigation, type BottomNavigationProps } from "./BottomNavigation";

const items: BottomNavigationProps["items"] = [
  { id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },
  { id: "search", label: "Search", icon: "icon-search-medium-line" },
  { id: "inbox", label: "Inbox", icon: "icon-message-chat-circle-line", dot: true },
  { id: "me", label: "Profile", icon: "icon-user-circle-line", selectedIcon: "icon-user-circle-solid" },
];

const meta = {
  title: "Components/BottomNavigation",
  component: BottomNavigation,
  tags: ["autodocs"],
  parameters: { layout: "centered", docs: { description: { component: "Figma Bottom-Navigation/Mobile (7042:38507): Default bar, Floating pill and Floating-Glass pill; 3–5 root destinations." } } },
  args: { items, value: "home", onValueChange: () => undefined, type: "default" },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <div style={{ width: 390 }}><BottomNavigation {...args} value={value} onValueChange={setValue} /></div>;
  },
} satisfies Meta<typeof BottomNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Floating: Story = { args: { type: "floating", action: { icon: "icon-plus-line", label: "New post" } } };
export const FloatingGlass: Story = { args: { type: "floating-glass", selection: "subtle", action: { icon: "icon-plus-line", label: "New post" } } };
