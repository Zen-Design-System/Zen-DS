/* Breadcrumbs examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Alex Duong moves up and down the
   Đìzai Studio workspace: the shared Files, a colleague's profile three levels under People, a deep handbook page and the
   folder picker of Move. Each trail starts at its root, ends at the current page (not a link) and never wraps: long paths
   collapse their middle. The two screens are AppShells (Pattern/AppShell/Desktop, Layout=Sidebar) whose trail leads the
   header's top row: a Master crumb with collapse="sidebar", or master={false} beside the header's collapse toggle. Phones
   go up with the Top Navigation Back chevron instead (see Top navigation). */
import { useEffect, useState, type ReactNode } from "react";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader } from "../../../components/AppShell";
import { Avatar } from "../../../components/Avatar";
import { BadgeStatus } from "../../../components/BadgeStatus";
import { BreadcrumbItem, Breadcrumbs, type BreadcrumbItemData } from "../../../components/Breadcrumbs";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { Dialog } from "../../../components/Dialog";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { Icon, type IconName } from "../../../components/Icon";
import { Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { PageHeader } from "../../../components/PageHeader";
import { Sidebar, type SidebarSection } from "../../../components/Sidebar";
import { Table, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import {
  TODAY, activity, daysFromToday, formatBytes, formatDate, formatMoney, formatRelative, initials, me, people, peopleList, projectProgress, projectStep, projects, studio,
  type Person, type PersonId, type Team,
} from "../data";
import type { PlatformPage } from "../../PlatformExamples";
import { PreviewAppFrame, StudioLogo } from "../../PlatformFrames";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";

export const page: PlatformPage = "breadcrumbs";

const avatar = (p: Person, size: "xsmall" | "medium" = "medium") => p.photo
  ? <Avatar size={size} theme="photo" src={p.photo} alt="" />
  : <Avatar size={size} theme={p.theme} alt="">{initials(p.name)}</Avatar>;

/** The width of an element, kept current: a trail collapses its middle when the page gets narrow. */
function useWidth() {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, width] as const;
}

// ——— The studio’s shared files (examples 1 and 4) ————————————————————————————————————————————————————
type Entry = { id: string; name: string; parent: string | null; owner: PersonId; updated: Date; bytes?: number };
const isFolder = (e: Entry) => e.bytes === undefined;
const fileTree: Entry[] = [
  { id: "root", name: "Files", parent: null, owner: "alex", updated: TODAY },
  { id: "clients", name: "Clients", parent: "root", owner: "hana", updated: daysFromToday(0, 9, 12) },
  { id: "studio", name: "Studio", parent: "root", owner: "minhAnh", updated: daysFromToday(-5, 14, 20) },
  { id: "q3-report", name: "Q3 studio report.xlsx", parent: "root", owner: "mai", updated: daysFromToday(-5, 14, 20), bytes: 2_310_000 },
  { id: "lumen", name: "Lumen Bank", parent: "clients", owner: "hana", updated: daysFromToday(0, 9, 12) },
  { id: "phin", name: "Phin & Co", parent: "clients", owner: "chi", updated: daysFromToday(0, 10, 17) },
  { id: "mekong", name: "Mekong Freight", parent: "clients", owner: "duy", updated: daysFromToday(-1, 16, 40) },
  { id: "banking", name: "Online banking", parent: "lumen", owner: "alex", updated: daysFromToday(-1, 16, 5) },
  { id: "sow", name: "Lumen Bank SOW v3.pdf", parent: "lumen", owner: "hana", updated: daysFromToday(0, 9, 12), bytes: 412_000 },
  { id: "research", name: "Research", parent: "banking", owner: "ava", updated: daysFromToday(-1, 16, 5) },
  { id: "design", name: "Design", parent: "banking", owner: "alex", updated: daysFromToday(-3, 15, 10) },
  { id: "journey", name: "Transfers journey map.fig", parent: "banking", owner: "alex", updated: daysFromToday(-3, 15, 10), bytes: 24_600_000 },
  { id: "round-2", name: "Round 2", parent: "research", owner: "ava", updated: daysFromToday(-1, 11, 15) },
  { id: "plan", name: "Usability plan – transfers.pdf", parent: "research", owner: "ava", updated: daysFromToday(-1, 16, 5), bytes: 1_240_000 },
  { id: "notes", name: "Session notes – round 1.docx", parent: "research", owner: "ava", updated: daysFromToday(-4, 11, 30), bytes: 96_000 },
  { id: "clips", name: "Session highlights.mp4", parent: "research", owner: "emi", updated: daysFromToday(-4, 17, 45), bytes: 48_200_000 },
  { id: "synthesis", name: "Round 1 synthesis.fig", parent: "research", owner: "ava", updated: daysFromToday(-2, 18, 10), bytes: 12_700_000 },
  { id: "screener", name: "Recruiting screener – transfers.pdf", parent: "research", owner: "ava", updated: daysFromToday(-6, 10, 5), bytes: 210_000 },
  { id: "consent", name: "Consent form – Lumen Bank.docx", parent: "research", owner: "hana", updated: daysFromToday(-7, 15, 40), bytes: 54_000 },
  { id: "overview-fig", name: "Account overview.fig", parent: "design", owner: "alex", updated: daysFromToday(-2, 10, 20), bytes: 31_800_000 },
  { id: "loyalty", name: "Loyalty app", parent: "phin", owner: "chi", updated: daysFromToday(0, 10, 17) },
  { id: "points", name: "Loyalty app – points history.fig", parent: "loyalty", owner: "chi", updated: daysFromToday(0, 10, 17), bytes: 18_400_000 },
  { id: "rewards-api", name: "Rewards API contract.json", parent: "loyalty", owner: "bao", updated: daysFromToday(-2, 9, 40), bytes: 86_000 },
  { id: "handbook-pdf", name: "Studio handbook.pdf", parent: "studio", owner: "minhAnh", updated: daysFromToday(-12, 9, 0), bytes: 3_900_000 },
];
/** Root first, the folder itself last. */
const pathTo = (tree: Entry[], id: string): Entry[] => { const e = tree.find((x) => x.id === id); return e ? [...(e.parent ? pathTo(tree, e.parent) : []), e] : []; };
const childrenOf = (tree: Entry[], id: string) => tree.filter((e) => e.parent === id).sort((a, b) => Number(isFolder(b)) - Number(isFolder(a)) || a.name.localeCompare(b.name));
/** Page trails link each folder’s address; a picker’s trail only moves inside the picker, so its crumbs are buttons. */
const trail = (path: Entry[], links = true): BreadcrumbItemData[] => path.map((e) => ({ id: e.id, label: e.name, href: links ? `/files/${e.id}` : undefined, icon: e.parent === null ? "icon-folder-line" : undefined }));

/** How many crumbs fit: all of them on a desktop page, the first and the last two when it narrows, the first and the
 *  current page on a phone-width page. */
const collapseAt = (width: number) => (!width || width >= 800 ? undefined : width >= 480 ? 3 : 2);

// ——— Shared shell parts (examples 1 and 2) ————————————————————————————————————————————————————————————————
const studioLogo = <StudioLogo src={studio.logo} name={studio.name} />;
const studioMark = <Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />;

/** The account button at the end of the header’s top row, with its menu. */
function AccountMenu() {
  const { toast } = useToast();
  return (
    <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
      { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
      { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => toast({ title: "Settings", children: "Notifications, security and billing." }) },
      { type: "separator" },
      { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: "See you soon, Alex." }) },
    ]} />
  );
}

// ——— 1. File browser ——————————————————————————————————————————————————————————————————————————————————
/** The Sidebar’s places: every file, the latest ones, and the top-level folders (a folder keeps its top folder selected). */
const fileSections: SidebarSection[] = [
  { items: [
    { id: "root", label: "All files", icon: "icon-folder-line" },
    { id: "recent", label: "Recent", icon: "icon-clock-line" },
  ] },
  { label: "Folders", items: [
    { id: "clients", label: "Clients", icon: "icon-briefcase-line" },
    { id: "studio", label: "Studio", icon: "icon-home-03-line" },
  ] },
];

function FileBrowserExample() {
  const { toast } = useToast();
  const [tree, setTree] = useState(fileTree);
  const [folderId, setFolderId] = useState("research");
  const [creating, setCreating] = useState(false);
  const [measure, width] = useWidth();

  const recent = folderId === "recent";
  const path = recent ? [] : pathTo(tree, folderId);
  const folder = path[path.length - 1];
  const rows = recent ? tree.filter((e) => !isFolder(e)).sort((a, b) => +b.updated - +a.updated).slice(0, 8) : childrenOf(tree, folderId);
  const folders = rows.filter(isFolder).length;
  const bytes = rows.reduce((sum, e) => sum + (e.bytes ?? 0), 0);
  const counts = [folders ? plural(folders, "folder") : "", rows.length - folders ? plural(rows.length - folders, "file") : "", bytes ? formatBytes(bytes) : ""].filter(Boolean).join(" · ");
  const addFolder = (name: string) => setTree((list) => [...list, { id: `new-${list.length}`, name, parent: folderId, owner: "alex", updated: TODAY }]);
  const download = (e: Entry) => toast({ title: "Download started", children: e.name });
  // A phone-width window shows the Name column alone and folds size and date into its caption (the icon steps up to lg).
  const narrow = width > 0 && width < 640;
  const allColumns: TableColumn<Entry>[] = [
    { id: "name", header: "Name", cell: (e) => (narrow
      ? <TableMedia bold media={isFolder(e) ? <Icon name="icon-folder-line" size="lg" /> : <FileIcon format={fileIconFormatOf(e.name)} size="lg" />}
          caption={[e.bytes === undefined ? "" : formatBytes(e.bytes), formatRelative(e.updated)].filter(Boolean).join(" · ")}>{e.name}</TableMedia>
      : <TableMedia bold media={isFolder(e) ? <Icon name="icon-folder-line" size="base" /> : <FileIcon format={fileIconFormatOf(e.name)} size="base" />}>{e.name}</TableMedia>) },
    { id: "owner", header: "Owner", width: "180px", cell: (e) => <TableMedia bold={false} media={avatar(people[e.owner], "xsmall")}>{people[e.owner].name}</TableMedia> },
    { id: "updated", header: "Modified", width: "200px", cell: (e) => <TableText>{formatRelative(e.updated)}</TableText> },
    { id: "size", header: "Size", align: "right", width: "96px", cell: (e) => <TableText>{e.bytes === undefined ? "" : formatBytes(e.bytes)}</TableText> },
  ];
  const columns = narrow ? allColumns.filter((column) => column.id === "name") : allColumns;
  const title = recent ? "Recent" : folder.name;

  return (
    <PreviewAppFrame frameRef={measure} height={{ min: 560, max: 760 }}>
      <AppShell
        // The trail starts at Files, a Master crumb with its folder icon, so the collapse toggle moves into the Sidebar’s
        // header: beside the toggle the two icons would read as two controls in a row.
        collapse="sidebar"
        sidebar={(
          <Sidebar logo={studioLogo} logoCollapsed={studioMark} sections={fileSections}
            selectedId={recent ? "recent" : path[1]?.id ?? "root"} onItemClick={(item) => setFolderId(item.id)} />
        )}
        header={(
          <AppShellHeader
            // A top-level place has no trail; below it, the trail starts at Files and ends at this folder.
            leading={path.length > 1 ? (
              <Breadcrumbs key={folderId} items={trail(path)} maxItems={collapseAt(width)}
                onNavigate={(item, event) => { event.preventDefault(); setFolderId(item.id); }} />
            ) : undefined}
            actions={<AccountMenu />}
            main={(
              <PageHeader title={title} description={counts || undefined}
                actions={recent ? undefined : <>
                  <Button level="tertiary" startIcon="icon-folder-plus-line" onClick={() => setCreating(true)}>New folder</Button>
                  <Button level="primary" startIcon="icon-upload-01-line" onClick={() => toast({ title: `Uploading to ${title}`, children: "Drop files anywhere on the page, or pick them from your computer." })}>Upload</Button>
                </>} />
            )}
          />
        )}
      >
        {/* The folder’s table is the page’s content: it lies on the page, no Card. */}
        <Table aria-label={title} rows={rows} columns={columns}
          onRowClick={(e) => (isFolder(e) ? setFolderId(e.id) : download(e))}
          // The header’s Upload stays the page’s one Primary; the empty state offers the other way in.
          empty={<EmptyState headingLevel={2} icon="icon-folder-line" title="No files yet" secondaryAction={{ label: "New folder", onClick: () => setCreating(true) }}>Upload files or add a folder: what you share in {title} shows up here.</EmptyState>} />
      </AppShell>
      <DemoFieldDialog open={creating} onOpenChange={setCreating} title="New folder" field={{ kind: "name", label: "Folder name", placeholder: "Round 2" }}
        submitLabel="Create folder" confirm={() => "Folder created"} onSubmit={addFolder} />
    </PreviewAppFrame>
  );
}

// ——— 2. Top bar trail ———————————————————————————————————————————————————————————————————————————————————
const teams: { id: string; team: Team; icon: IconName }[] = [
  { id: "design", team: "Design", icon: "icon-palette-line" },
  { id: "engineering", team: "Engineering", icon: "icon-code-02-line" },
  { id: "delivery", team: "Delivery", icon: "icon-target-04-line" },
  { id: "client-services", team: "Client Services", icon: "icon-briefcase-line" },
  { id: "operations", team: "Operations", icon: "icon-settings-01-line" },
];
type Route = { section: "home" | "projects" | "people"; team?: string; person?: PersonId; project?: string };
const teamOf = (p: Person) => teams.find((t) => t.team === p.team)!;
const capitalised = (text: string) => `${text[0].toUpperCase()}${text.slice(1)}`;

function TopBarTrailExample() {
  const { toast } = useToast();
  const [measure, width] = useWidth();
  const [route, setRoute] = useState<Route>({ section: "people", team: "design", person: "chi" });
  const [unseen, setUnseen] = useState(2);
  const team = teams.find((t) => t.id === route.team);
  const person = route.person ? people[route.person] : undefined;
  const project = route.project ? projects.find((p) => p.id === route.project) : undefined;
  const sectionLabel = { home: "Home", projects: "Projects", people: "People" }[route.section];

  // The trail mirrors the pages above this one; the Sidebar keeps the section selected at every depth.
  const crumbs: BreadcrumbItemData[] = [
    { id: "home", label: "Home" },
    ...(route.section === "home" ? [] : [{ id: route.section, label: sectionLabel }]),
    ...(team ? [{ id: `team:${team.id}`, label: team.team }] : []),
    ...(person ? [{ id: `person:${person.id}`, label: person.name }] : []),
    ...(project ? [{ id: `project:${project.id}`, label: project.name }] : []),
  ];
  const openProject = (id: string) => setRoute({ section: "projects", project: id });
  const openPerson = (p: Person) => setRoute({ section: "people", team: teamOf(p).id, person: p.id as PersonId });
  const projectRow = (p: (typeof projects)[number]) => (
    <ListItem key={p.id} title={p.name} titleLines={2} caption={`${p.client} · ${p.status === "Completed" ? "Finished" : "Due"} ${formatDate(p.due)}`} leading={<DockIcon icon={p.icon} theme={p.theme} background="subtle" size="medium" />}
      trailing={<BadgeStatus status={projectStep[p.status]} progress={projectProgress(p)}>{p.status}</BadgeStatus>} onClick={() => openProject(p.id)} />
  );
  const go = (id: string) => {
    if (id === "home" || id === "projects" || id === "people") setRoute({ section: id });
    else if (id.startsWith("team:")) setRoute({ section: "people", team: id.slice(5) });
  };
  /** A titled list section on the page. */
  const section = (id: string, label: string, list: ReactNode) => (
    <ListBox as="section" theme="shadow" aria-labelledby={id} header={<Heading level={2} textStyle="Heading/Subheading" id={id}>{label}</Heading>}>
      <List aria-labelledby={id}>{list}</List>
    </ListBox>
  );

  let header: { title: string; description?: string; meta?: ReactNode };
  let content: ReactNode;
  if (project) {
    // Reached from a profile or from Projects, the trail is the same: it shows where the page sits, not the way here.
    const members = project.members.map((id) => people[id]);
    header = { title: project.name, meta: <BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus>, description: `${project.client} · ${project.status === "Completed" ? "Finished" : "Due"} ${formatDate(project.due)}` };
    content = (
      <Grid columns={2} stackBelow={720} gap="md" align="start">
        <Card theme="shadow">
          <DescriptionList items={[
            { term: "Client", description: project.client },
            { term: "Lead", description: people[project.lead].name },
            { term: "Progress", description: `${project.progress}% done` },
            { term: "Budget", description: `${formatMoney(project.spent)} of ${formatMoney(project.budget)}` },
          ]} />
        </Card>
        {section(`${project.id}-team`, "Team", members.map((p) => <ListItem key={p.id} title={p.name} caption={p.id === project.lead ? `${p.role} · Lead` : p.role} leading={avatar(p)} onClick={() => openPerson(p)} />))}
      </Grid>
    );
  } else if (person && team) {
    header = { title: person.name, description: `${person.role} · ${person.location}` };
    content = (
      <Grid columns={2} stackBelow={720} gap="md" align="start">
        <Card theme="shadow">
          <DescriptionList items={[
            { term: "Team", description: team.team },
            { term: "Email", description: person.email },
            { term: "Location", description: person.location },
          ]} />
        </Card>
        {section(`${person.id}-projects`, "Projects", projects.filter((p) => p.members.includes(person.id as PersonId)).map(projectRow))}
      </Grid>
    );
  } else if (team) {
    const members = peopleList.filter((p) => p.team === team.team);
    header = { title: team.team, description: plural(members.length, "person", "people") };
    content = (
      <ListBox theme="shadow">
        <List aria-label={`${team.team} team`}>
          {members.map((p) => <ListItem key={p.id} title={p.name} caption={`${p.role} · ${p.location}`} leading={avatar(p)} onClick={() => openPerson(p)} />)}
        </List>
      </ListBox>
    );
  } else if (route.section === "people") {
    header = { title: "People", description: `${plural(peopleList.length, "person", "people")} across ${plural(teams.length, "team")}` };
    content = (
      <ListBox theme="shadow">
        <List aria-label="Teams">
          {teams.map((t) => (
            <ListItem key={t.id} title={t.team} caption={plural(peopleList.filter((p) => p.team === t.team).length, "person", "people")}
              leading={<DockIcon icon={t.icon} theme="neutral" background="subtle" size="medium" />} onClick={() => setRoute({ section: "people", team: t.id })} />
          ))}
        </List>
      </ListBox>
    );
  } else if (route.section === "projects") {
    header = { title: "Projects", description: `${plural(projects.length, "project")} for ${plural(5, "client")} and the studio` };
    content = (
      <ListBox theme="shadow">
        <List aria-label="Projects">{projects.map(projectRow)}</List>
      </ListBox>
    );
  } else {
    header = { title: "Home", description: `Good morning, ${people.alex.name.split(" ")[0]}. Here is what changed at ${studio.name} since yesterday.` };
    content = (
      <Grid columns={2} stackBelow={720} gap="md" align="start">
        {section("home-recent", "Since yesterday", activity.slice(0, 4).map((a) => (
          <ListItem key={a.id} title={people[a.actor].name} caption={`${capitalised(a.verb)} ${a.object} · ${formatRelative(a.at)}`} leading={avatar(people[a.actor])} onClick={() => openPerson(people[a.actor])} />
        )))}
        {section("home-projects", "Your projects", projects.filter((p) => p.members.includes("alex")).map(projectRow))}
      </Grid>
    );
  }

  return (
    <PreviewAppFrame frameRef={measure} height={{ min: 560, max: 760 }}>
      <AppShell
        sidebar={(
          <Sidebar
            // The logo slot is sized to the header (24px, 20px dense): the mark fills its height, so density never outgrows it.
            logo={studioLogo}
            logoCollapsed={studioMark}
            sections={[{ items: [
              { id: "home", label: "Home", icon: "icon-home-03-line" },
              { id: "projects", label: "Projects", icon: "icon-folder-line" },
              { id: "people", label: "People", icon: "icon-users-line" },
            ] }]}
            selectedId={route.section}
            onItemClick={(item) => go(item.id)}
          />
        )}
        header={(
          <AppShellHeader
            // The house pattern (HR-Platform): the trail leads the top row, right after the collapse toggle, so it starts
            // at Home without the Master icon. Home itself is the top level, so it shows no trail.
            leading={crumbs.length > 1 ? <Breadcrumbs key={crumbs.length} master={false} items={crumbs} maxItems={width && width < 640 ? 3 : undefined} onNavigate={(item, event) => { event.preventDefault(); go(item.id); }} /> : undefined}
            actions={<>
              <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unseen}
                onClick={() => { setUnseen(0); toast({ title: "2 new since yesterday", children: "Chi Tran commented on the points history · Bao Nguyen asked for a review" }); }} />
              <AccountMenu />
            </>}
            main={<PageHeader {...header} />}
          />
        )}
      >
        {content}
      </AppShell>
    </PreviewAppFrame>
  );
}

// ——— 3. Long path ————————————————————————————————————————————————————————————————————————————————————
type Doc = { id: string; title: string; parent: string | null; updated: Date; owner: PersonId };
const handbook: Doc[] = [
  { id: "handbook", title: "Handbook", parent: null, updated: daysFromToday(-1), owner: "minhAnh" },
  { id: "how-we-work", title: "How we work", parent: "handbook", updated: daysFromToday(-1), owner: "alex" },
  { id: "people-ops", title: "People", parent: "handbook", updated: daysFromToday(-2), owner: "minhAnh" },
  { id: "design", title: "Design", parent: "how-we-work", updated: daysFromToday(-1), owner: "alex" },
  { id: "engineering", title: "Engineering", parent: "how-we-work", updated: daysFromToday(-9), owner: "finn" },
  { id: "reviews", title: "Reviews", parent: "design", updated: daysFromToday(-1), owner: "alex" },
  { id: "file-naming", title: "File naming", parent: "design", updated: daysFromToday(-40), owner: "chi" },
  { id: "y2026", title: "2026", parent: "reviews", updated: daysFromToday(-1), owner: "alex" },
  { id: "y2025", title: "2025", parent: "reviews", updated: daysFromToday(-240), owner: "alex" },
  { id: "q3", title: "Q3 critique", parent: "y2026", updated: daysFromToday(-1, 17, 20), owner: "alex" },
  { id: "q2", title: "Q2 critique", parent: "y2026", updated: daysFromToday(-92), owner: "chi" },
];
// What the Q3 critique page says: findings from the studio’s own projects, each with an owner.
const q3Findings = "Three findings came out of the Q3 critiques. Lumen Bank's transfer flow needs a review step before people confirm (Ava Chen). The Phin & Co points history reads better grouped by month (Chi Tran). The Saola Outdoor moodboard leans on product photos rather than illustration (Gia Pham).";
/** "Yesterday at 5:20 pm" reads "updated yesterday at 5:20 pm" mid-sentence; dates and weekdays keep their capital. */
const lower = (text: string) => (/^(Yesterday|Just now)/.test(text) ? `${text[0].toLowerCase()}${text.slice(1)}` : text);
const docPath = (id: string): Doc[] => { const d = handbook.find((x) => x.id === id); return d ? [...(d.parent ? docPath(d.parent) : []), d] : []; };

function LongPathExample() {
  const [docId, setDocId] = useState("q3");
  const [measure, width] = useWidth();
  const path = docPath(docId);
  const doc = path[path.length - 1];
  const children = handbook.filter((d) => d.parent === docId);

  return (
    <Stack><Card theme="default" spacing="md" width="fill" maxWidth={480} alignSelf="center" ref={measure}>
      <Stack gap="md">
        {/* Six levels: the first and the last two stay, "…" opens the rest (narrow: the first and the current page). */}
        {/* The trail as BreadcrumbItem children (Figma’s Item-List slot); an items array works the same. */}
        <Breadcrumbs key={docId} maxItems={width && width < 400 ? 2 : 3} onNavigate={(item, event) => { event.preventDefault(); setDocId(item.id); }}>
          {path.map((d) => <BreadcrumbItem key={d.id} item={{ id: d.id, label: d.title, href: `/handbook/${d.id}`, icon: d.parent === null ? "icon-book-open-line" : undefined }} />)}
        </Breadcrumbs>
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">{doc.title}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`Updated ${lower(formatRelative(doc.updated))} by ${people[doc.owner].name}`}</Text>
        </Stack>
        {children.length ? (
          <List aria-label={`Pages in ${doc.title}`}>
            {children.map((d) => (
              <ListItem key={d.id} title={d.title} caption={`Updated ${lower(formatRelative(d.updated))}`}
                leading={<DockIcon icon="icon-file-doc-line" theme="neutral" background="subtle" size="medium" />} onClick={() => setDocId(d.id)} />
            ))}
          </List>
        ) : (
          <Text>{q3Findings}</Text>
        )}
      </Stack>
    </Card></Stack>
  );
}

// ——— 3b. Next level (per-crumb Emphasis and Dash) ——————————————————————————————————————————————————————————————
/* Each crumb sets its own look, as Figma's Item instances in the Item-List slot do (2026-10-10): the open folder is Medium
   and keeps its Dash (the chevron after it) while it has folders inside, and the Menu after the chevron goes one level
   down. Crumbs go back up. */
function NextLevelExample() {
  const [folderId, setFolderId] = useState("clients");
  const [measure, width] = useWidth();
  const path = pathTo(fileTree, folderId);
  const folders = childrenOf(fileTree, folderId).filter(isFolder);
  return (
    <Stack><Card theme="default" spacing="md" width="fill" maxWidth={480} alignSelf="center" ref={measure}>
      {/* One row: the chevron after the open folder stays beside the menu it points to (narrow: the trail collapses). */}
      <Stack direction="row" gap="xs" align="center">
        <Breadcrumbs
          aria-label="Folder path"
          maxItems={width && width < 400 ? 2 : 3}
          items={trail(path).map((item, index) => (index === path.length - 1 ? { ...item, emphasis: "medium", dash: folders.length > 0 } : item))}
          onNavigate={(item, event) => { event.preventDefault(); setFolderId(item.id); }}
        />
        {folders.length ? (
          <Menu
            aria-label={`Folders in ${path[path.length - 1].name}`}
            trigger={<Button level="tertiary" size="sm" endIcon="icon-chevron-down-line">{plural(folders.length, "folder")}</Button>}
            items={folders.map((f) => ({ id: f.id, label: f.name, icon: "icon-folder-line" }))}
            onSelect={(item) => setFolderId(item.id)}
          />
        ) : null}
      </Stack>
    </Card></Stack>
  );
}

// ——— 4. Move to folder ——————————————————————————————————————————————————————————————————————————————————
function MoveToFolderExample() {
  const { toast } = useToast();
  const [fileFolder, setFileFolder] = useState("research");
  const [open, setOpen] = useState(false);
  const [browse, setBrowse] = useState("research");
  const file = fileTree.find((e) => e.id === "clips")!;
  const folders = childrenOf(fileTree, browse).filter(isFolder);
  const here = pathTo(fileTree, browse);
  const location = fileTree.find((e) => e.id === fileFolder)!;
  const current = here[here.length - 1];

  const start = () => { setBrowse(fileFolder); setOpen(true); };
  const move = () => {
    const before = fileFolder;
    setFileFolder(browse);
    setOpen(false);
    toast({ title: "File moved", children: `To ${current.name}`, action: { label: "Undo", onClick: () => setFileFolder(before) } });
  };

  return (
    <Stack><Card theme="default" width="fill" maxWidth={480} alignSelf="center">
      <Stack gap="md">
        <Stack direction="row" gap="sm" align="center">
          <FileIcon format={fileIconFormatOf(file.name)} size="xl" />
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">{file.name}</Heading>
            <Text role="status" textStyle="Body/Small/Regular" tone="base">{`${formatBytes(file.bytes ?? 0)} · In ${location.name}`}</Text>
          </Stack>
        </Stack>
        <Stack direction="row" justify="end" alignSelf="stretch"><Button level="tertiary" onClick={start}>Move file</Button></Stack>
      </Stack>
      <Dialog open={open} onOpenChange={setOpen} icon={false} title="Move to folder" description={file.name}
        primaryAction={{ label: "Move here", onClick: move, disabled: browse === fileFolder }}
        secondaryAction={{ label: "Cancel" }}>
        <Stack gap="md">
          {/* A second trail on the screen gets its own name. It is the picker’s only sign of where you are, so it takes
              the Medium emphasis. */}
          <Breadcrumbs key={browse} aria-label="Folder path" emphasis="medium" items={trail(here, false)} maxItems={3} onNavigate={(item, event) => { event.preventDefault(); setBrowse(item.id); }} />
          {folders.length ? (
            <List aria-label={`Folders in ${current.name}`}>
              {folders.map((f) => <ListItem key={f.id} title={f.name} leading={<DockIcon icon="icon-folder-line" theme="neutral" background="subtle" size="medium" />} onClick={() => setBrowse(f.id)} />)}
            </List>
          ) : (
            <Text textStyle="Body/Small/Regular" tone="base">No folders inside {current.name}.</Text>
          )}
        </Stack>
      </Dialog>
    </Card></Stack>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "File browser",
    description: "Folders three and more levels deep in the studio’s Files: the trail leads the header’s top row, starts at Files with its folder icon (the Master level) and ends at the open folder as plain text. Because the trail starts with a Master crumb, the collapse toggle sits in the Sidebar (collapse=\"sidebar\"). Crumbs are links with an href, so they open in a new tab too; a top-level place shows no trail, and a narrow window collapses the middle.",
    wide: true,
    screen: true,
    render: () => <FileBrowserExample />,
    code: `const path = pathTo(folderId); // [Files, Clients, Lumen Bank, Online banking, Research]

<AppShell
  collapse="sidebar" // the trail starts with the Master crumb, so the toggle moves into the Sidebar's header
  sidebar={<Sidebar logo={logo} sections={places} selectedId={path[1]?.id ?? "root"} onItemClick={(item) => setFolderId(item.id)} />}
  header={
    <AppShellHeader
      leading={path.length > 1 && (
        <Breadcrumbs
          items={path.map((f) => ({ id: f.id, label: f.name, href: \`/files/\${f.id}\`, icon: f.isRoot ? "icon-folder-line" : undefined }))}
          maxItems={narrow ? 2 : undefined} // Files › … › Research in a phone-width window
          onNavigate={(item, event) => { event.preventDefault(); setFolderId(item.id); }}
        />
      )}
      actions={<Menu align="end" trigger={<AppShellAccount name="Alex Duong" src={photo} />} items={accountItems} />}
      main={
        <PageHeader title={folder.name} description="1 folder · 6 files · 62.5 MB"
          actions={<>
            <Button level="tertiary" startIcon="icon-folder-plus-line" onClick={openNewFolder}>New folder</Button>
            <Button level="primary" startIcon="icon-upload-01-line" onClick={upload}>Upload</Button>
          </>} />
      }
    />
  }
>
  {/* The table sits on the page, no Card; in a phone-width window Name stands alone, size and date in its caption */}
  <Table aria-label={folder.name} rows={children} columns={narrow ? [nameWithCaption] : columns}
    onRowClick={(row) => row.isFolder ? setFolderId(row.id) : download(row)} />
</AppShell>`,
  },
  {
    title: "Top bar trail",
    description: "The house pattern (HR-Platform): the trail leads the header’s top row right after the collapse toggle, so it starts at Home without the Master icon (master={false}); the Sidebar already shows the section. It follows the page’s place, not the way there: a project opened from Chi Tran’s profile reads Home › Projects › Loyalty app.",
    wide: true,
    screen: true,
    render: () => <TopBarTrailExample />,
    code: `// The trail comes from where the page sits (section › team › person), never from click history:
// a project opened from a profile still reads Home › Projects › Loyalty app.
<AppShell
  sidebar={<Sidebar sections={sections} selectedId={route.section} onItemClick={(item) => go(item.id)} />}
  header={
    <AppShellHeader
      leading={
        <Breadcrumbs
          master={false} // beside the collapse toggle the trail starts at a Sub level
          maxItems={narrow ? 3 : undefined}
          items={[
            { id: "home", label: "Home" },
            { id: "people", label: "People" },
            { id: "team:design", label: "Design" },
            { id: "person:chi", label: "Chi Tran" },
          ]}
          onNavigate={(item, event) => { event.preventDefault(); go(item.id); }}
        />
      }
      actions={<><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={2} onClick={openNotifications} /><AccountMenu /></>}
      main={<PageHeader title="Chi Tran" description="Product Designer · Hanoi" />}
    />
  }
>
  <ProfilePage person="chi" />
</AppShell>`,
  },
  {
    title: "Long path",
    description: "A handbook page six levels down keeps its trail on one line: maxItems keeps the root and the last levels, and “…” (named “Show 3 more”) opens the rest. Going up or down resets the collapse. The crumbs are BreadcrumbItem children, Figma's Item-List slot.",
    render: () => <LongPathExample />,
    code: `<Breadcrumbs
  key={pageId} // a new page collapses the trail again
  maxItems={narrow ? 2 : 3}
  onNavigate={(item, event) => { event.preventDefault(); setPageId(item.id); }}
>
  {path.map((p) => <BreadcrumbItem key={p.id} item={{ id: p.id, label: p.title, href: \`/handbook/\${p.id}\` }} />)}
</Breadcrumbs>
<Heading level={4} textStyle="Heading/Subheading">Q3 critique</Heading>
<Text textStyle="Body/Small/Regular" tone="base">Updated yesterday at 5:20 pm by Alex Duong</Text>`,
  },
  {
    title: "Next level",
    description: "Each crumb can set its own Level, Emphasis, State and Dash, like Figma's Item instances in the Item-List slot. The open folder is Medium and keeps its chevron while it has folders inside, and the menu after the chevron opens one of them; the crumbs go back up.",
    render: () => <NextLevelExample />,
    code: `const path = pathTo(folderId); // [Files, Clients]
const folders = subfolders(folderId); // Lumen Bank, Mekong Freight, Phin & Co

{/* One row: the trail, then the menu one level down (gap 8px); a narrow card collapses the trail instead of wrapping */}
<Stack direction="row" gap="xs" align="center">
  <Breadcrumbs
    aria-label="Folder path"
    maxItems={narrow ? 2 : 3}
    items={path.map((f, i) => ({
      id: f.id,
      label: f.name,
      href: \`/files/\${f.id}\`,
      icon: f.isRoot ? "icon-folder-line" : undefined,
      // The open folder: Medium, and its chevron stays while the menu follows it
      ...(i === path.length - 1 ? { emphasis: "medium", dash: folders.length > 0 } : {}),
    }))}
    onNavigate={(item, event) => { event.preventDefault(); setFolderId(item.id); }}
  />
  {folders.length > 0 && (
    <Menu
      aria-label={\`Folders in \${path.at(-1).name}\`}
      trigger={<Button level="tertiary" size="sm" endIcon="icon-chevron-down-line">{plural(folders.length, "folder")}</Button>}
      items={folders.map((f) => ({ id: f.id, label: f.name, icon: "icon-folder-line" }))}
      onSelect={(item) => setFolderId(item.id)}
    />
  )}
</Stack>`,
  },
  {
    title: "Move to folder",
    description: "A folder picker inside a Dialog has its own trail, named “Folder path” and set in Medium emphasis because nothing else in the Dialog says where you are. Move here stays off in the file’s current folder, and Undo in the toast moves it back.",
    render: () => <MoveToFolderExample />,
    code: `<Button level="tertiary" onClick={() => { setBrowse(file.folder); setOpen(true); }}>Move file</Button>

<Dialog open={open} onOpenChange={setOpen} icon={false} title="Move to folder" description={file.name}
  primaryAction={{ label: "Move here", onClick: move, disabled: browse === file.folder }}
  secondaryAction={{ label: "Cancel" }}>
  {/* md (16px) between the trail and the rows keeps the first row's fill (12px outside it) off the Breadcrumbs. */}
  <Stack gap="md">
    <Breadcrumbs
      aria-label="Folder path"
      emphasis="medium"
      items={pathTo(browse).map((f) => ({ id: f.id, label: f.name, icon: f.isRoot ? "icon-folder-line" : undefined }))}
      maxItems={3}
      onNavigate={(item, event) => { event.preventDefault(); setBrowse(item.id); }}
    />
    <List aria-label="Folders">
      {folders.map((f) => <ListItem key={f.id} title={f.name} leading={<DockIcon icon="icon-folder-line" theme="neutral" background="subtle" />} onClick={() => setBrowse(f.id)} />)}
    </List>
  </Stack>
</Dialog>`,
  },
]);
