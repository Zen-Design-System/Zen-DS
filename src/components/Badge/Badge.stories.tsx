import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge, BadgeCounter, badgeThemes } from "./Badge";

const meta = {
  title: "Components/Badge",
  component: Badge,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { children: "Active", size: "md", theme: "green", background: "subtle", leadingIcon: true, remove: false },
  argTypes: {
    size: { control: "select", options: ["xs", "sm", "md"] },
    theme: { control: "select", options: badgeThemes },
    background: { control: "inline-radio", options: ["solid", "subtle"] },
    onRemove: { action: "removed" },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Status colours in both backgrounds. */
export const Themes: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: 8 }}>
      {(["solid", "subtle"] as const).map((background) => (
        <div key={background} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {badgeThemes.map((theme) => <Badge key={theme} {...args} background={background} theme={theme}>{theme}</Badge>)}
        </div>
      ))}
    </div>
  ),
};

/** Counts use BadgeCounter (capped at 99+). */
export const Counter: Story = { render: () => <div style={{ display: "flex", gap: 8 }}><BadgeCounter value={3} /><BadgeCounter value={120} /></div> };
