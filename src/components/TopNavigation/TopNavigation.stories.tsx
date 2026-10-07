import type { Meta, StoryObj } from "@storybook/react-vite";
import { TopNavigation, topNavigationTypes } from "./TopNavigation";

const meta = {
  title: "Components/TopNavigation",
  component: TopNavigation,
  tags: ["autodocs"],
  parameters: { layout: "centered", docs: { description: { component: "Figma Top-Navigation/Mobile (12014:45167): navigator bar (leading · Sub heading · trailing) + Expand-Heading + Control-Bar; 10 Types × Margin." } } },
  args: {
    type: "default",
    margin: "comfortable",
    title: "Heading",
    largeTitle: "Heading",
    leading: { icon: "icon-chevron-left-line-medium", label: "Back" },
    trailing: [{ icon: "icon-plus-line", label: "Add" }],
    largeTitleAction: { icon: "icon-plus-line", label: "New" },
  },
  argTypes: { type: { control: "select", options: topNavigationTypes } },
  decorators: [(Story) => <div style={{ width: 390 }}><Story /></div>],
} satisfies Meta<typeof TopNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Collapsed: Story = { args: { collapsed: true } };
export const Compact: Story = { args: { type: "compact" } };
