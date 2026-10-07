import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toast, toastTypes } from "./Toast";

const meta = {
  title: "Components/Toast Message",
  component: Toast,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Toast-Message (1579:13276): six types on the Effect/Popover surface with title, caption, one action and a close control." } } },
  args: { type: "neutral", title: "Changes saved", children: "Your draft was saved a moment ago.", action: { label: "Undo", onClick: () => {} }, onClose: () => {} },
  argTypes: { type: { control: "inline-radio", options: toastTypes } },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Types: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      {toastTypes.map((type) => <Toast key={type} type={type} title={`${type} toast`} action={{ label: "Undo", onClick: () => {} }} onClose={() => {}}>Description text is here</Toast>)}
    </div>
  ),
};
