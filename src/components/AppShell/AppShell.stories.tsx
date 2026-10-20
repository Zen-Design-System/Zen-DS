import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ActionBar } from "../ActionBar";
import { AlertBanner } from "../AlertBanner";
import { BottomNavigation } from "../BottomNavigation";
import { Badge } from "../Badge";
import { Breadcrumbs } from "../Breadcrumbs";
import { Button } from "../Button";
import { ListItem, List } from "../ListItem";
import { Menu } from "../Menu";
import { PageHeader } from "../PageHeader";
import { Sidebar, type SidebarSection } from "../Sidebar";
import { Stepper } from "../Stepper";
import { Text } from "../Text";
import { TopNavigation } from "../TopNavigation";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader, AppShellPane, type AppShellBand, type AppShellLayout, type AppShellMobileTop, type AppShellPattern } from "./AppShell";

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
const members = ["Ava Chen", "Bao Nguyen", "Chi Tran", "Duy Le"];

/** One app on every pattern: the Sidebar, Header/AppShell (top row, Main row), the panes and the phone parts. */
function Demo({ pattern = "sidebar", layout = "auto", banner = false, mobileTop = "bar", band }: { pattern?: AppShellPattern; layout?: "auto" | AppShellLayout; banner?: boolean; mobileTop?: AppShellMobileTop; band?: AppShellBand }) {
  const [page, setPage] = useState("members");
  const [unread, setUnread] = useState(12);
  const [notice, setNotice] = useState(banner);
  const [open, setOpen] = useState(members[0]);
  const pane = (
    <AppShellPane title="Members">
      <List aria-label="Members">{members.map((name) => <ListItem key={name} title={name} selected={name === open} onClick={() => setOpen(name)} />)}</List>
    </AppShellPane>
  );
  return (
    <AppShell pattern={pattern} layout={layout} mobileTop={mobileTop} band={band}
      banner={notice ? <AlertBanner theme="warning" onClose={() => setNotice(false)}>Your card expires in 3 days.</AlertBanner> : undefined}
      sidebar={<Sidebar logo={<Text as="span" textStyle="Heading/4">Acme</Text>} logoCollapsed={<Text as="span" textStyle="Heading/4">A</Text>} sections={sections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
      header={(
        <AppShellHeader
          leading={<Breadcrumbs master={false} items={[{ id: "home", label: "Home" }, ...(page === "home" ? [] : [{ id: page, label: label(page) }])]} onNavigate={(item, event) => { event.preventDefault(); setPage(item.id); }} />}
          actions={<>
            <Badge size="md" theme="neutral" background="subtle" leading="icon-package-solid">Pro</Badge>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => setUnread(0)} />
            <Menu align="end" trigger={<AppShellAccount name="Ava Chen" theme="blue" />} items={[{ id: "profile", label: "Profile" }, { id: "sign-out", label: "Sign out" }]} />
          </>}
          main={<PageHeader title={label(page)} actions={page === "members" ? <Button level="primary">Invite member</Button> : undefined} />}
        />
      )}
      leadingPane={pattern === "list-detail" || pattern === "workspace" || pattern === "docs" ? pane : undefined}
      trailingPane={pattern === "workspace" || pattern === "docs" || pattern === "focus" ? <AppShellPane title="Details" theme={pattern === "docs" ? "canvas" : "shadow"}><Text tone="base">{open}</Text></AppShellPane> : undefined}
      progress={pattern === "focus" ? <Stepper aria-label="Invite" steps={[{ id: "who", title: "Who" }, { id: "role", title: "Role" }, { id: "send", title: "Send" }]} current={0} /> : undefined}
      // Phones and an upright iPad: the same header in the phone's bars (component-usage-rules §17).
      topNavigation={<TopNavigation title={label(page)} largeTitle={label(page)} />}
      hero={mobileTop === "band" || mobileTop === "band-sheet" ? <Text textStyle="Heading/1" tone={band === "accent" ? "on-accent" : undefined}>12 members</Text> : undefined}
      bottomNavigation={mobileTop === "bar" || mobileTop === "band" ? <BottomNavigation value={page} onValueChange={setPage} showLabels items={roots} /> : undefined}
      actionBar={mobileTop === "band-sheet" || mobileTop === "media" ? <ActionBar primaryAction={{ label: "Invite member" }} /> : undefined}
    >
      <Text tone="base">{`${open} is open.`}</Text>
    </AppShell>
  );
}

const meta = {
  title: "Components/AppShell",
  component: AppShell,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { description: { component: "Figma's AppShell patterns (◇ Master-Layout 16254:1057). From 1024px a desktop pattern (sidebar · list-detail · top-bar · workspace · docs · focus) with Header/AppShell, panes and a docked side panel; narrower, with mobile parts, a mobile pattern (bar · band · band-sheet · media) with the Tab-Bar or an Action bar; otherwise the header with the Sidebar in a modal drawer." } } },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;
export const SidebarPattern: Story = { name: "Sidebar", render: () => <Demo layout="desktop" /> };
export const ListDetail: Story = { render: () => <Demo pattern="list-detail" layout="desktop" /> };
export const TopBar: Story = { render: () => <Demo pattern="top-bar" layout="desktop" /> };
export const Workspace: Story = { render: () => <Demo pattern="workspace" layout="desktop" /> };
export const Docs: Story = { render: () => <Demo pattern="docs" layout="desktop" /> };
export const Focus: Story = { render: () => <Demo pattern="focus" layout="desktop" /> };
export const Drawer: Story = { render: () => <Demo layout="drawer" /> };
export const WithBanner: Story = { render: () => <Demo banner layout="desktop" /> };
/** Under 1024px with mobile parts the shell draws Pattern/AppShell/Mobile. */
export const PhoneBar: Story = { render: () => <Demo layout="mobile" />, parameters: { viewport: { defaultViewport: "mobile1" } } };
export const PhoneBand: Story = { render: () => <Demo layout="mobile" mobileTop="band" />, parameters: { viewport: { defaultViewport: "mobile1" } } };
export const PhoneBandSheet: Story = { render: () => <Demo layout="mobile" mobileTop="band-sheet" />, parameters: { viewport: { defaultViewport: "mobile1" } } };
/** `band="accent"`: an Accent/Solid band; the bar turns transparent-on-color and the hero text takes On-Accent. */
export const PhoneAccentBand: Story = { render: () => <Demo layout="mobile" mobileTop="band-sheet" band="accent" />, parameters: { viewport: { defaultViewport: "mobile1" } } };
