import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar, AvatarStack, avatarThemes } from "./Avatar";

const meta = {
  title: "Components/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { children: "AN", alt: "Ava Nguyen", size: "md", theme: "neutral", background: "solid", shape: "circle", status: false },
  argTypes: {
    size: { control: "select", options: ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"] },
    theme: { control: "select", options: avatarThemes },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** A person's initials at every size; `status` adds the online dot. */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      {(["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"] as const).map((size) => <Avatar key={size} {...args} size={size} status />)}
    </div>
  ),
};

/** Up to `max` people, then a "+N" avatar. */
export const Stack: Story = {
  render: () => (
    <AvatarStack
      showMore
      max={3}
      items={[{ alt: "Ava Nguyen", children: "AN" }, { alt: "Bao Tran", children: "BT", theme: "blue" }, { alt: "Chi Le", children: "CL", theme: "green" }, { alt: "Duy Pham", children: "DP" }, { alt: "Em Vo", children: "EV" }]}
    />
  ),
};
