import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "../Button";
import { Icon } from "../Icon";
import { Container } from "../Layout";
import { PageHeader } from "../PageHeader";
import { Search } from "../Search";
import { Sidebar } from "../Sidebar";
import { Text } from "../Text";
import { AppShell } from "./AppShell";

function Demo({ layout }: { layout: "auto" | "sidebar" | "drawer" }) {
  const [page, setPage] = useState("members");
  const items = [
    { id: "home", label: "Home", icon: <Icon name="icon-home-03-line" /> },
    { id: "members", label: "Members", icon: <Icon name="icon-users-line" /> },
    { id: "billing", label: "Billing", icon: <Icon name="icon-credit-card-line" /> },
  ].map((item) => ({ ...item, active: item.id === page }));
  return (
    <AppShell layout={layout} sidebar={<Sidebar logo={<Text as="span" textStyle="Heading/4">Acme</Text>} sections={[{ items }]} onItemClick={(item) => setPage(item.id)} />} header={<Search aria-label="Search" placeholder="Search" />}>
      <Container>
        <PageHeader title={items.find((item) => item.active)?.label ?? "Home"} description="The Sidebar sits beside the content from 1024px; below, it moves into a drawer." actions={<Button level="primary">Invite member</Button>} />
      </Container>
    </AppShell>
  );
}

const meta = {
  title: "Components/AppShell",
  component: AppShell,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { description: { component: "Sidebar navigation, a sticky top bar and the main content with a skip link; a drawer below 1024px." } } },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Responsive: Story = { render: () => <Demo layout="auto" /> };
export const Drawer: Story = { render: () => <Demo layout="drawer" /> };
