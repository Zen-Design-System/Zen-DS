import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { AlertBanner } from "../AlertBanner";
import { Badge } from "../Badge";
import { Breadcrumbs } from "../Breadcrumbs";
import { Button } from "../Button";
import { Container } from "../Layout";
import { Menu } from "../Menu";
import { PageHeader } from "../PageHeader";
import { Sidebar, type SidebarSection } from "../Sidebar";
import { Text } from "../Text";
import { AppShell, AppShellAccount, AppShellAction } from "./AppShell";

const sections: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "members", label: "Members", icon: "icon-users-line" },
    { id: "billing", label: "Billing", icon: "icon-credit-card-line" },
  ] },
];
const label = (id: string) => sections[0].items.find((item) => item.id === id)?.label ?? "Home";

/** Figma ◆ HR-Platform: the toggle and Breadcrumbs lead the top bar; a plan Badge, an action with a count and the account menu trail it. */
function Demo({ layout = "auto", collapsed = false, banner = false }: { layout?: "auto" | "sidebar" | "drawer"; collapsed?: boolean; banner?: boolean }) {
  const [page, setPage] = useState("members");
  const [unread, setUnread] = useState(12);
  const [notice, setNotice] = useState(banner);
  const [last, setLast] = useState("");
  return (
    <AppShell layout={layout} defaultSidebarCollapsed={collapsed}
      banner={notice ? <AlertBanner theme="warning" onClose={() => setNotice(false)}>Your card expires in 3 days.</AlertBanner> : undefined}
      sidebar={<Sidebar logo={<Text as="span" textStyle="Heading/4">Acme</Text>} logoCollapsed={<Text as="span" textStyle="Heading/4">A</Text>} sections={sections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
      header={<Breadcrumbs master={false} items={[{ id: "home", label: "Home" }, ...(page === "home" ? [] : [{ id: page, label: label(page) }])]} onNavigate={(item, event) => { event.preventDefault(); setPage(item.id); }} />}
      headerActions={<>
        <Badge size="md" theme="neutral" background="subtle" leading="icon-package-solid">Pro</Badge>
        <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => setUnread(0)} />
        <Menu align="end" trigger={<AppShellAccount name="Ava Chen" theme="blue" />} items={[{ id: "profile", label: "Profile" }, { id: "sign-out", label: "Sign out" }]} onSelect={(item) => setLast(item.label)} />
      </>}
    >
      <Container>
        <PageHeader title={label(page)} description={last ? `${last} chosen from the account menu` : undefined} actions={page === "members" ? <Button level="primary" onClick={() => setLast("Invite member")}>Invite member</Button> : undefined} />
      </Container>
    </AppShell>
  );
}

const meta = {
  title: "Components/AppShell",
  component: AppShell,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { description: { component: "Sidebar navigation, a sticky top bar (toggle, Breadcrumbs, actions, account), the page, and optional banner, side panel and floating action, with a skip link. From 1024px the toggle collapses the Sidebar to its rail; narrower, it opens as a drawer." } } },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Responsive: Story = { render: () => <Demo /> };
export const CollapsedRail: Story = { render: () => <Demo layout="sidebar" collapsed /> };
export const Drawer: Story = { render: () => <Demo layout="drawer" /> };
export const WithBanner: Story = { render: () => <Demo banner /> };
