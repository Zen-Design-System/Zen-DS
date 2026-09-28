import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../Badge";
import { Breadcrumbs } from "../Breadcrumbs";
import { Button } from "../Button";
import { Tabs } from "../Tabs";
import { PageHeader } from "./PageHeader";

const meta = {
  title: "Components/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "The top of an app page: breadcrumbs or Back, the h1 title with meta and actions, a description and section tabs." } } },
  args: {
    title: "Members",
    description: "4 people can access Zen Studio.",
    actions: <><Button level="tertiary">Export</Button><Button level="primary">Invite member</Button></>,
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Detail: Story = {
  args: {
    title: "Brand refresh",
    back: { label: "Projects", onClick: () => undefined },
    meta: <Badge size="small" theme="green" background="subtle">In review</Badge>,
    description: "Logo, colour and type updates for the 2026 launch.",
    actions: <Button level="primary">Publish</Button>,
    tabs: <Tabs aria-label="Project sections" items={[{ id: "overview", label: "Overview" }, { id: "files", label: "Files" }]} defaultValue="overview" />,
  },
};
export const Nested: Story = {
  args: {
    title: "Invoices",
    breadcrumbs: <Breadcrumbs items={[{ id: "settings", label: "Settings" }, { id: "billing", label: "Billing" }, { id: "invoices", label: "Invoices" }]} />,
    description: "Download receipts for every payment.",
    actions: undefined,
  },
};
