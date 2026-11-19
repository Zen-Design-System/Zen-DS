import { useState, type ReactElement } from "react";
import {
  AppShell, AppShellHeader, Avatar, EmptyState, IconButton, Menu, PageHeader, Sidebar, SidebarSubHeader, Stack, Text, plural, useToast,
  type IconName, type SidebarItem, type SidebarSection,
} from "@zen-ds/react";
import { studio, workspacePlan } from "../../data";

/* A recipe for the HR-Platform Sidebar's account header and a module's Back + title, from the Sidebar's own slots. The
   brand is the workspace's square logo with its name over a short line and a chevron-selector Menu at the end that
   switches workspace; inside a module the Sidebar shows a SidebarSubHeader (Back over the module's name), and its rail
   keeps the logo and the Back chevron. */
type Workspace = { id: string; label: string; members: number; role: string; mark: (size: "medium" | "2xsmall") => ReactElement };
const nav = (id: string, label: string, icon: IconName, extra: Partial<SidebarItem> = {}): SidebarItem => ({ id, label, icon, ...extra });
/** Each workspace's square mark, drawn at the size its place needs: the brand, or a menu row's icon. */
const workspaces: Workspace[] = [
  { id: "ws-dizai", label: studio.name, members: workspacePlan.seats, role: "Admin", mark: (size) => <Avatar size={size} shape="square" theme="photo" src={studio.logo} alt="" /> },
  { id: "ws-phin", label: "Phin & Co", members: 9, role: "Guest", mark: (size) => <Avatar size={size} shape="square" theme="brown" alt="">PC</Avatar> },
  { id: "ws-lumen", label: "Lumen Bank", members: 14, role: "Member", mark: (size) => <Avatar size={size} shape="square" theme="blue" alt="">LB</Avatar> },
];
const modules: Record<string, { title: string; sections: SidebarSection[] }> = {
  projects: { title: "Projects", sections: [{ items: [nav("all", "All projects", "icon-folder-line"), nav("mine", "Assigned to me", "icon-user-check-line"), nav("archived", "Archived", "icon-archive-line")] }] },
};
const home: SidebarSection[] = [{ items: [nav("home", "Home", "icon-home-03-line"), nav("projects", "Projects", "icon-folder-line"), nav("people", "People", "icon-users-line")] }];

export default function AccountHeader() {
  const { toast } = useToast();
  const [active, setActive] = useState("ws-dizai");
  const [module, setModule] = useState<string | null>("projects");
  const [page, setPage] = useState("all");
  const workspace = workspaces.find((w) => w.id === active) ?? workspaces[0];
  const current = module ? modules[module] : null;
  const brand = (
    <Stack direction="row" gap="xs" align="center" width="fill">
      {workspace.mark("medium")}
      <Stack gap="none" width="fill" minWidth={0}>
        <Text as="span" textStyle="Body/Base/Bold" truncate>{workspace.label}</Text>
        <Text as="span" textStyle="Caption/Regular" tone="light" truncate>{`${workspace.role} · ${plural(workspace.members, "member")}`}</Text>
      </Stack>
      <Menu align="end" aria-label="Switch workspace" trigger={<IconButton appearance="flat" level="primary" size="sm" aria-label="Switch workspace" icon="icon-chevron-selector-vertical-line" />}
        items={workspaces.map((w) => ({ id: w.id, label: w.label, icon: w.mark("2xsmall"), caption: w.id === active ? "Current workspace" : w.role, onSelect: () => { setActive(w.id); setModule(null); toast({ title: `Switched to ${w.label}` }); } }))} />
    </Stack>
  );
  const label = (current?.sections ?? home).flatMap((section) => section.items).find((item) => item.id === (current ? page : "home"))?.label ?? "Home";
  return (
    // The header is its Main row alone, so the rail's toggle sits in the Sidebar (an empty top row is never drawn).
    <AppShell collapse="sidebar"
      sidebar={(
        <Sidebar aria-label={current ? `${current.title} navigation` : "Workspace navigation"} brand={brand} logoCollapsed={workspace.mark("medium")}
          subHeader={current ? <SidebarSubHeader title={current.title} backLabel="Back to Home" onBack={() => setModule(null)} /> : undefined}
          sections={current ? current.sections : home} selectedId={current ? page : "home"}
          onItemClick={(item) => (current ? setPage(item.id) : modules[item.id] ? (setModule(item.id), setPage("all")) : toast({ title: item.label, children: "Not part of this demo." }))} />
      )}
      header={<AppShellHeader main={<PageHeader title={label} description={workspace.label} />} />}
    >
      <EmptyState size="sm" headingLevel={2} icon="icon-folder-line" title={`${label} in ${workspace.label}`}>Switch the workspace from the header's menu; open Projects to see the module's Back + title.</EmptyState>
    </AppShell>
  );
}
