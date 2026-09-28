import type { Meta, StoryObj } from "@storybook/react-vite";
import { Breadcrumbs } from "./Breadcrumbs";

const meta = {
  title: "Components/Breadcrumbs",
  component: Breadcrumbs,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    items: [
      { id: "home", label: "Home", href: "#" },
      { id: "projects", label: "Projects", href: "#" },
      { id: "zen", label: "Zen DS", href: "#" },
      { id: "settings", label: "Settings" },
    ],
    emphasis: "default",
  },
  argTypes: { emphasis: { control: "inline-radio", options: ["default", "medium"] }, onNavigate: { action: "navigate" } },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Long trails collapse the middle behind "Show N more". */
export const Collapsed: Story = {
  args: {
    maxItems: 3,
    items: ["Home", "Workspace", "Design", "Libraries", "Zen DS", "Components", "Breadcrumbs"].map((label, index, all) => ({ id: label, label, href: index < all.length - 1 ? "#" : undefined })),
  },
};
