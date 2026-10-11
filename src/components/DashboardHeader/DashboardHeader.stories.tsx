import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppShellAction } from "../AppShell";
import { Avatar } from "../Avatar";
import { Breadcrumbs } from "../Breadcrumbs";
import { Button } from "../Button";
import { Chip } from "../Chip";
import { Search } from "../Search";
import { DashboardHeader } from "./DashboardHeader";

const meta = {
  title: "Components/DashboardHeader",
  component: DashboardHeader,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "One row of a dashboard page's header (Figma Primitives/Dashboard/Header): a control bar, a navigation bar, the page title row or your own row." } } },
  args: {
    type: "control-bar",
    search: <Search size="md" placeholder="Search leave requests" />,
    controls: <><Chip variant="advanced">Status</Chip><Chip variant="advanced">Type</Chip></>,
    actions: <><Button level="tertiary">Export report</Button><Button level="primary">Submit leave</Button></>,
  },
} satisfies Meta<typeof DashboardHeader>;

export default meta;
type Story = StoryObj<typeof meta>;
export const ControlBar: Story = {};
export const ControlBarWithCount: Story = { args: { subheading: "96 results" } };
export const Navigation: Story = {
  args: {
    type: "navigation",
    leading: <Breadcrumbs items={[{ id: "home", label: "Home" }, { id: "leaves", label: "My leaves" }]} />,
    trailing: <><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={8} /><Avatar size="md" alt="Alex Duong">AD</Avatar></>,
  },
};
export const Main: Story = {
  args: {
    type: "main",
    title: "My leaves",
    childTitle: "2026",
    subheading: "12 days left this year.",
    actions: <><Button level="tertiary">Export report</Button><Button level="primary">Submit leave</Button></>,
  },
};
