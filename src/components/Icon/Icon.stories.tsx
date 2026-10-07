import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon, iconSizes } from "./Icon";

const meta = {
  title: "Components/Icon",
  component: Icon,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { name: "icon-search-medium-line", size: "base" },
  argTypes: { size: { control: "select", options: iconSizes } },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** The size tokens; `base` (20px) sits between sm and md. */
export const Sizes: Story = {
  render: (args) => <div style={{ display: "flex", gap: 12, alignItems: "end" }}>{iconSizes.map((size) => <Icon key={size} {...args} size={size} />)}</div>,
};
