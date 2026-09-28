import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toggle, toggleThemes } from "./Toggle";

const meta = {
  title: "Components/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { label: "Email notifications", caption: "A summary of mentions and replies.", defaultChecked: true, size: "sm", theme: "text-first" },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] }, theme: { control: "inline-radio", options: toggleThemes }, onCheckedChange: { action: "checked" } },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Toggles apply at once; their label names the setting, never "On". */
export const Playground: Story = {};

export const Settings: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12, width: 360 }}>
      <Toggle label="Mentions and replies" defaultChecked />
      <Toggle label="Weekly digest" caption="Every Monday." defaultChecked />
      <Toggle label="Product updates" />
    </div>
  ),
};
