import { useState, type ReactNode } from "react";
import { AppShell } from "../../components/AppShell";
import { Avatar } from "../../components/Avatar";
import { Badge, BadgeCounter } from "../../components/Badge";
import { BottomNavigation } from "../../components/BottomNavigation";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { Button, IconButton } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { Container, Stack } from "../../components/Layout";
import { List, ListItem } from "../../components/ListItem";
import { PageHeader } from "../../components/PageHeader";
import { ZenProvider } from "../../components/Provider";
import { Search } from "../../components/Search";
import { Sidebar, type SidebarSection } from "../../components/Sidebar";
import { Table, TableText } from "../../components/Table";
import { Tabs } from "../../components/Tabs";
import { Text, plural } from "../../components/Text";
import { useToast } from "../../components/Toast";
import { PlatformPhone } from "../PlatformPhone";
import { figmaSidebarBrand } from "../PlatformSidebarBrand";
import { bottomNavItems } from "../PlatformMobileData";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, option } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";
import "./shell.css";

/* ───────────── Sample data ───────────── */

const navSections = (active: string): SidebarSection[] => [
  { items: [
    { id: "home", label: "Home", icon: <Icon name="icon-home-03-line" />, active: active === "home" },
    { id: "projects", label: "Projects", icon: <Icon name="icon-folder-line" />, active: active === "projects" },
    { id: "members", label: "Members", icon: <Icon name="icon-users-line" />, active: active === "members" },
    { id: "billing", label: "Billing", icon: <Icon name="icon-credit-card-line" />, active: active === "billing" },
  ] },
];

const members = [
  { id: "ava", name: "Ava Chen", email: "ava@zen.studio", role: "Owner" },
  { id: "bao", name: "Bao Nguyen", email: "bao@zen.studio", role: "Admin" },
  { id: "chi", name: "Chi Tran", email: "chi@zen.studio", role: "Member" },
  { id: "duy", name: "Duy Le", email: "duy@zen.studio", role: "Member" },
];

function MembersTable() {
  return (
    <Table aria-label="Members" rows={members} getRowId={(row) => row.id}
      columns={[
        { id: "name", header: "Name", cell: (row) => <Stack direction="row" gap="sm"><Avatar size="small" theme="blue" background="subtle" alt="">{row.name.slice(0, 1)}</Avatar><Stack gap="3xs"><Text as="span" textStyle="Body/Base/Medium">{row.name}</Text><Text as="span" textStyle="Body/Small/Regular" tone="base">{row.email}</Text></Stack></Stack> },
        { id: "role", header: "Role", cell: (row) => <TableText>{row.role}</TableText> },
      ]} />
  );
}

/** A preview frame: the shell fills it instead of the whole viewport, and it scrolls inside. */
function ShellFrame({ children, height = 520 }: { children: ReactNode; height?: number }) {
  return <div className="pash-frame" style={{ height }}>{children}</div>;
}

/* ───────────── AppShell ───────────── */

function AppShellPlayground() {
  const [layout, setLayout] = useState<"sidebar" | "drawer">("sidebar");
  const [canvas, setCanvas] = useState<"default" | "alt" | "flat">("default");
  const [withHeader, setWithHeader] = useState(true);
  const [page, setPage] = useState("members");
  return (
    <Panel
      title="App Shell"
      previewClassName="pash-preview"
      controls={<>
        <PlaygroundFilterChip label="Layout" value={layout} onChange={(value) => setLayout((String(value) || "sidebar") as "sidebar" | "drawer")} options={[option("sidebar", "Sidebar (≥ 1024px)"), option("drawer", "Drawer (< 1024px)")]} />
        <PlaygroundFilterChip label="Canvas" value={canvas} onChange={(value) => setCanvas((String(value) || "default") as "default" | "alt" | "flat")} options={[option("default"), option("alt"), option("flat")]} />
        <PlaygroundToggle label="Header" selected={withHeader} onChange={setWithHeader} />
      </>}
      code={`import { AppShell, Container, PageHeader, Search, Sidebar } from "@zen/design-system";

<AppShell${canvas === "default" ? "" : ` canvas="${canvas}"`}
  sidebar={<Sidebar logo={<Logo />} productName="Zen"${canvas === "flat" ? ` background="flat"` : ""} sections={sections} onItemClick={(item) => navigate(item.id)} />}${withHeader ? `
  header={<Search aria-label="Search" placeholder="Search members" />}` : ""}
>
  <Container>
    <PageHeader title="Members" description="4 people in Zen Studio" />
    …
  </Container>
</AppShell>`}
    >
      <ShellFrame>
        <AppShell
          layout={layout}
          canvas={canvas}
          mainId="pash-playground-main"
          sidebar={<Sidebar {...figmaSidebarBrand} background={canvas === "flat" ? "flat" : "default"} sections={navSections(page)} onItemClick={(item) => setPage(item.id)} />}
          header={withHeader ? <Search aria-label="Search" placeholder="Search members" /> : undefined}
        >
          <Container>
            <Stack gap="lg" className="pash-page">
              <PageHeader title={page === "members" ? "Members" : page[0].toUpperCase() + page.slice(1)} description={page === "members" ? `${plural(members.length, "person")} in Zen Studio` : "Pick Members to see the table."} actions={page === "members" ? <Button level="primary">Invite member</Button> : undefined} />
              {page === "members" ? <MembersTable /> : null}
            </Stack>
          </Container>
        </AppShell>
      </ShellFrame>
    </Panel>
  );
}

function AdminAppExample() {
  const [page, setPage] = useState("members");
  const [query, setQuery] = useState("");
  const shown = members.filter((member) => member.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <ShellFrame>
      <AppShell layout="sidebar" mainId="pash-admin-main"
        sidebar={<Sidebar {...figmaSidebarBrand} sections={navSections(page)} onItemClick={(item) => setPage(item.id)} />}
        header={<Search aria-label="Search members" placeholder="Search members" value={query} onChange={(event) => setQuery(event.target.value)} />}
        headerActions={<IconButton aria-label="Notifications" icon={<Icon name="icon-bell-01-line" />} onClick={() => setQuery("")} />}
      >
        <Container>
          <Stack gap="lg" className="pash-page">
            <PageHeader title="Members" meta={<BadgeCounter value={shown.length} />} description="Manage who can access Zen Studio." actions={<><Button level="tertiary">Export</Button><Button level="primary">Invite member</Button></>} />
            <Table aria-label="Members" rows={shown} getRowId={(row) => row.id} empty={<Text tone="base">No members match “{query}”.</Text>}
              columns={[{ id: "name", header: "Name", cell: (row) => <TableText>{row.name}</TableText> }, { id: "email", header: "Email", cell: (row) => <TableText>{row.email}</TableText> }, { id: "role", header: "Role", cell: (row) => <TableText>{row.role}</TableText> }]} />
          </Stack>
        </Container>
      </AppShell>
    </ShellFrame>
  );
}

function DrawerExample() {
  const [page, setPage] = useState("home");
  return (
    <ShellFrame height={440}>
      <AppShell layout="drawer" mainId="pash-drawer-main" sidebar={<Sidebar {...figmaSidebarBrand} sections={navSections(page)} onItemClick={(item) => setPage(item.id)} />} header={<Text as="span" textStyle="Body/Base/Bold">Zen Studio</Text>}>
        <Container>
          <Stack gap="md" className="pash-page">
            <PageHeader title={page[0].toUpperCase() + page.slice(1)} description="Below 1024px the Sidebar moves into a drawer: the menu button opens it; the scrim, Escape or picking a page closes it." />
          </Stack>
        </Container>
      </AppShell>
    </ShellFrame>
  );
}

function FlatCanvasExample() {
  const [page, setPage] = useState("projects");
  return (
    <ShellFrame height={420}>
      <AppShell layout="sidebar" canvas="flat" mainId="pash-flat-main" sidebar={<Sidebar {...figmaSidebarBrand} background="flat" sections={navSections(page)} onItemClick={(item) => setPage(item.id)} />}>
        <Container>
          <Stack gap="md" className="pash-page">
            <PageHeader title="Projects" description="Flat canvas: the Sidebar uses background=“flat” so navigation and page share one plane." actions={<Button level="primary">New project</Button>} />
          </Stack>
        </Container>
      </AppShell>
    </ShellFrame>
  );
}

function PhoneAppExample() {
  const [tab, setTab] = useState(bottomNavItems[0].id);
  return (
    <ZenProvider typography="mobile" paint={false} portal={false} breakpoint="mobile">
      <PlatformPhone footer={<BottomNavigation items={bottomNavItems} value={tab} onValueChange={setTab} />}>
        <Stack gap="lg" padding="lg">
          <PageHeader title={bottomNavItems.find((item) => item.id === tab)?.label ?? "Home"} description="Phone apps skip the Sidebar: BottomNavigation switches the top-level sections." />
          <List aria-label="Recent">
            {["Brand refresh", "Mobile app", "Docs platform"].map((title) => <ListItem key={title} title={title} caption="Updated today" onClick={() => setTab(bottomNavItems[1]?.id ?? tab)} />)}
          </List>
        </Stack>
      </PlatformPhone>
    </ZenProvider>
  );
}

/* ───────────── PageHeader ───────────── */

function PageHeaderPlayground() {
  const [withActions, setWithActions] = useState(true);
  const [withTabs, setWithTabs] = useState(false);
  const [withBreadcrumbs, setWithBreadcrumbs] = useState(false);
  const [withBack, setWithBack] = useState(false);
  const [tab, setTab] = useState("overview");
  const [clicks, setClicks] = useState(0);
  return (
    <Panel
      title="Page Header"
      previewClassName="pash-preview"
      controls={<>
        <PlaygroundToggle label="Actions" selected={withActions} onChange={setWithActions} />
        <PlaygroundToggle label="Breadcrumbs" selected={withBreadcrumbs} onChange={setWithBreadcrumbs} />
        <PlaygroundToggle label="Back" selected={withBack} onChange={setWithBack} />
        <PlaygroundToggle label="Tabs" selected={withTabs} onChange={setWithTabs} />
      </>}
      code={`import { PageHeader } from "@zen/design-system";

<PageHeader
  title="Brand refresh"
  description="Logo, colour and type updates for the 2026 launch."${withBack ? `
  back={{ label: "Projects", onClick: goBack }}` : ""}${withBreadcrumbs ? `
  breadcrumbs={<Breadcrumbs items={[{ id: "projects", label: "Projects" }, { id: "brand", label: "Brand refresh" }]} />}` : ""}${withActions ? `
  actions={<><Button level="tertiary">Share</Button><Button level="primary">Publish</Button></>}` : ""}${withTabs ? `
  tabs={<Tabs aria-label="Project sections" items={sections} value={tab} onChange={setTab} />}` : ""}
/>`}
    >
      <div className="pash-page-header-stage">
        <PageHeader
          title="Brand refresh"
          description="Logo, colour and type updates for the 2026 launch."
          back={withBack ? { label: "Projects", onClick: () => setClicks((count) => count + 1) } : undefined}
          breadcrumbs={withBreadcrumbs ? <Breadcrumbs items={[{ id: "projects", label: "Projects" }, { id: "brand", label: "Brand refresh" }]} onNavigate={(_item, event) => event.preventDefault()} /> : undefined}
          meta={<Badge size="small" theme="green" background="subtle">{clicks ? "Back pressed" : "In review"}</Badge>}
          actions={withActions ? <><Button level="tertiary">Share</Button><Button level="primary">Publish</Button></> : undefined}
          tabs={withTabs ? <Tabs aria-label="Project sections" items={[{ id: "overview", label: "Overview" }, { id: "files", label: "Files" }, { id: "activity", label: "Activity" }]} value={tab} onChange={setTab} /> : undefined}
        />
      </div>
    </Panel>
  );
}

function ListPageHeaderExample() {
  const [count, setCount] = useState(4);
  return <PageHeader title="Members" meta={<BadgeCounter value={count} />} description={`${plural(count, "person")} can access Zen Studio.`} actions={<><Button level="tertiary">Export</Button><Button level="primary" onClick={() => setCount((value) => value + 1)}>Invite member</Button></>} />;
}

function DetailPageHeaderExample() {
  const [tab, setTab] = useState("overview");
  const [back, setBack] = useState(false);
  return (
    <PageHeader
      back={{ label: back ? "Back to projects (pressed)" : "Projects", onClick: () => setBack(true) }}
      title="Brand refresh"
      meta={<Badge size="small" theme="green" background="subtle">In review</Badge>}
      description="Logo, colour and type updates for the 2026 launch."
      actions={<Button level="primary">Publish</Button>}
      tabs={<Tabs aria-label="Project sections" items={[{ id: "overview", label: "Overview" }, { id: "files", label: "Files", badge: 12 }, { id: "activity", label: "Activity" }]} value={tab} onChange={setTab} />}
    />
  );
}

function BreadcrumbHeaderExample() {
  const [crumb, setCrumb] = useState("Invoices");
  return (
    <PageHeader
      breadcrumbs={<Breadcrumbs items={[{ id: "settings", label: "Settings" }, { id: "billing", label: "Billing" }, { id: "invoices", label: crumb }]} onNavigate={(item, event) => { event.preventDefault(); setCrumb(`Invoices (from ${String(item.label)})`); }} />}
      title="Invoices"
      description="Download receipts for every payment."
    />
  );
}

function OverviewHeaderExample() {
  return <PageHeader eyebrow="Good morning, Ava" title="Your workspace" description="3 projects need your review this week." actions={<Button level="primary">New project</Button>} />;
}

/* ───────────── Toast (useToast) ───────────── */

function UseToastExample() {
  const { toast } = useToast();
  const [files, setFiles] = useState(["Q4 brief.pdf", "Moodboard.fig", "Budget.xlsx"]);
  const remove = (name: string) => {
    setFiles((list) => list.filter((file) => file !== name));
    toast({ type: "neutral", title: `“${name}” moved to trash`, action: { label: "Undo", onClick: () => setFiles((list) => (list.includes(name) ? list : [...list, name])) } });
  };
  return (
    <List aria-label="Files">
      {files.map((name) => <ListItem key={name} title={name} caption="Edited today" trailing={<IconButton aria-label={`Delete ${name}`} level="tertiary" icon={<Icon name="icon-trash-line" />} onClick={() => remove(name)} />} />)}
      {files.length === 0 ? <ListItem title="No files" caption="Undo from the toast to bring them back" /> : null}
    </List>
  );
}

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = {
  "app-shell": {
    label: "App Shell",
    eyebrow: "Components / App Shell",
    title: "App Shell",
    description: "The frame of a web app: Sidebar navigation, a sticky top bar and the main content with a skip link. Below 1024px the Sidebar becomes a drawer.",
    playground: AppShellPlayground,
  },
  "page-header": {
    label: "Page Header",
    eyebrow: "Components / Page Header",
    title: "Page Header",
    description: "The top of an app page: breadcrumbs or Back, the h1 title with meta and actions, a description and section tabs.",
    playground: PageHeaderPlayground,
  },
};

export const examples: ExampleMap = {
  "app-shell": [
    { title: "Admin app", screen: true, description: "Sidebar + a top bar with Search and notifications; the page is a Container with PageHeader and a Table. Search filters the table.", wide: true, render: () => <AdminAppExample />, code: `<AppShell
  sidebar={<Sidebar logo={<Logo />} productName="Zen" sections={sections} onItemClick={(item) => navigate(item.id)} />}
  header={<Search aria-label="Search members" placeholder="Search members" value={query} onChange={(e) => setQuery(e.target.value)} />}
  headerActions={<IconButton aria-label="Notifications" icon={<Icon name="icon-bell-01-line" />} onClick={openNotifications} />}
>
  <Container>
    <PageHeader title="Members" description="Manage who can access Zen Studio."
      actions={<><Button level="tertiary">Export</Button><Button level="primary">Invite member</Button></>} />
    <Table aria-label="Members" rows={shown} getRowId={(row) => row.id} columns={columns} />
  </Container>
</AppShell>` },
    { title: "Drawer below 1024px", screen: true, description: "layout follows ZenProvider's breakpoint; here it is forced to the drawer. The menu button opens it; the scrim, Escape or picking a page closes it and focus returns to the button.", render: () => <DrawerExample />, code: `<AppShell sidebar={<Sidebar … />} header={<Text as="span" textStyle="Body/Base/Bold">Zen Studio</Text>}>
  …
</AppShell>
// Below 1024px (tablet, mobile) the Sidebar moves into a drawer automatically.
// layout="drawer" | "sidebar" forces one.` },
    { title: "Flat canvas", screen: true, description: "canvas=“flat” with Sidebar background=“flat”: navigation and page share one plane (background-layers rule).", render: () => <FlatCanvasExample />, code: `<AppShell canvas="flat" sidebar={<Sidebar background="flat" … />}>
  …
</AppShell>` },
    { title: "Phone app", description: "Phones skip the Sidebar: BottomNavigation switches sections and PageHeader keeps the same structure in mobile typography.", wide: true, render: () => <PhoneAppExample />, code: `<ZenProvider typography="mobile" density="comfortable">
  <Stack gap="lg" padding="lg">
    <PageHeader title="Home" description="…" />
    <List aria-label="Recent">…</List>
  </Stack>
  <BottomNavigation items={items} value={tab} onValueChange={setTab} />
</ZenProvider>` },
  ],
  "page-header": [
    { title: "List page", description: "Title with a count Badge, a description and Tertiary + Primary actions (one Primary per page).", render: () => <ListPageHeaderExample />, code: `<PageHeader title="Members" meta={<BadgeCounter value={count} />}
  description={\`\${plural(count, "person")} can access Zen Studio.\`}
  actions={<><Button level="tertiary">Export</Button><Button level="primary" onClick={invite}>Invite member</Button></>} />` },
    { title: "Detail page", description: "Back (chevron) to the parent list, a status Badge, one action and Tabs for the page's sections.", render: () => <DetailPageHeaderExample />, code: `<PageHeader
  back={{ label: "Projects", onClick: goBack }}
  title="Brand refresh"
  meta={<Badge size="small" theme="green" background="subtle">In review</Badge>}
  description="Logo, colour and type updates for the 2026 launch."
  actions={<Button level="primary">Publish</Button>}
  tabs={<Tabs aria-label="Project sections" items={sections} value={tab} onChange={setTab} />}
/>` },
    { title: "Nested page", description: "Breadcrumbs above the title for pages deeper than one level.", render: () => <BreadcrumbHeaderExample />, code: `<PageHeader
  breadcrumbs={<Breadcrumbs items={[{ id: "settings", label: "Settings" }, { id: "billing", label: "Billing" }, { id: "invoices", label: "Invoices" }]} />}
  title="Invoices"
  description="Download receipts for every payment."
/>` },
    { title: "Overview page", description: "An eyebrow (Body/Small/Medium) above the Heading/1 title for top-level overview pages.", render: () => <OverviewHeaderExample />, code: `<PageHeader eyebrow="Good morning, Ava" title="Your workspace"
  description="3 projects need your review this week." actions={<Button level="primary">New project</Button>} />` },
  ],
  toast: [
    { title: "useToast()", description: "Call toast() after an action; ZenProvider hosts the stack. Deleting a file shows an Undo action that restores it.", render: () => <UseToastExample />, code: `const { toast } = useToast();

function remove(name: string) {
  setFiles((list) => list.filter((file) => file !== name));
  toast({ type: "neutral", title: \`“\${name}” moved to trash\`, action: { label: "Undo", onClick: () => restore(name) } });
}` },
  ],
};
