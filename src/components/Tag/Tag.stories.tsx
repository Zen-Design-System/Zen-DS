import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tag } from "./Tag";

const meta = {
  title: "Components/Tag",
  component: Tag,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { children: "Design", remove: true, error: false, disabled: false },
  argTypes: { onRemove: { action: "removed" } },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Tags hold user-entered values; the remove button names its tag. */
export const List: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {["Design", "Research", "Accessibility"].map((label) => <Tag key={label} remove onRemove={() => undefined}>{label}</Tag>)}
      <Tag leading="icon-alert-circle-line" error remove onRemove={() => undefined}>not-an-email</Tag>
    </div>
  ),
};
