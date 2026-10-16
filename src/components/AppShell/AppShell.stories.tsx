import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { AlertBanner } from "../AlertBanner";
import { BottomNavigation } from "../BottomNavigation";
import { Badge } from "../Badge";
import { Breadcrumbs } from "../Breadcrumbs";
import { Button } from "../Button";
import { Container } from "../Layout";
import { Menu } from "../Menu";
import { PageHeader } from "../PageHeader";
import { Sidebar, type SidebarSection } from "../Sidebar";
import { Text } from "../Text";
import { TopNavigation } from "../TopNavigation";
import { AppShell, AppShellAccount, AppShellAction } from "./AppShell";

const sections: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "members", label: "Members", icon: "icon-users-line" },
    { id: "billing", label: "Billing", icon: "icon-credit-card-line" },
  ] },
];
/** The same rows as the Bottom Navigation's roots (up to five map one to one). */
const roots = [
  { id: "home", label: "Home", icon: "icon-home-03-line" as const },
  { id: "members", label: "Members", icon: "icon-users-line" as const },
  { id: "billing", label: "Billing", icon: "icon-credit-card-line" as const },
];
const label = (id: string) => sections[0].items.find((item) => item.id === id)?.label ?? "Home";

/** Figma ◆ HR-Platform: the toggle and Breadcrumbs lead the top bar; a plan Badge, an action with a count and the account menu trail it. */
function Demo({ layout = "auto", collapsed = false, banner = false, phone = false }: { layout?: "auto" | "sidebar" | "drawer" | "phone"; collapsed?: boolean; banner?: boolean; phone?: boolean }) {
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
      // The page title is a header row, so a phone (under 744px) leaves it to the TopNavigation (one h1).
      sections={<PageHeader title={label(page)} description={last ? `${last} chosen from the account menu` : undefined} actions={page === "members" ? <Button level="primary" onClick={() => setLast("Invite member")}>Invite member</Button> : undefined} />}
      // Phones: the same header in the phone's bars (component-usage-rules §17).
      topNavigation={phone ? <TopNavigation title={label(page)} largeTitle={label(page)}
        trailing={[...(page === "members" ? [{ icon: "icon-plus-line" as const, label: "Invite member", onClick: () => setLast("Invite member") }] : []), { icon: "icon-bell-01-line" as const, label: "Notifications", dot: unread > 0, onClick: () => setUnread(0) }]} /> : undefined}
      bottomNavigation={phone ? <BottomNavigation value={page} onValueChange={setPage} showLabels items={roots} /> : undefined}
    >
      <Container>
        <Text tone="base">{last ? `${last} chosen` : "The page."}</Text>
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
/** Under 744px the shell draws `topNavigation` and `bottomNavigation` instead of its top bar and `sections`. */
export const Phone: Story = { render: () => <Demo layout="phone" phone />, parameters: { viewport: { defaultViewport: "mobile1" } } };
