import { useState } from "react";
import {
  AppShell, AppShellAccount, AppShellHeader, Avatar, Breadcrumbs, Button, EmptyState, FileIcon, Icon, InputField, Menu, ModalForm, PageHeader, Sidebar,
  Stack, Table, TableMedia, TableText, Text, Thumbnail, fileIconFormatOf, plural, useFormState, useToast, useZen,
  type BreadcrumbItemData, type SidebarSection, type TableColumn,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatBytes, formatRelative, initials, me, people, studio, type Person, type PersonId } from "../../data";

const avatar = (p: Person, size: "xsmall" | "medium" = "medium") => p.photo
  ? <Avatar size={size} theme="photo" src={p.photo} alt="" />
  : <Avatar size={size} theme={p.theme} alt="">{initials(p.name)}</Avatar>;

// ——— The studio’s shared files ——————————————————————————————————————————————————————————————————————————————————
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
/** Page trails link each folder’s address. */
const trail = (path: Entry[]): BreadcrumbItemData[] => path.map((e) => ({ id: e.id, label: e.name, href: `/files/${e.id}`, icon: e.parent === null ? "icon-folder-line" : undefined }));

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

export default function FileBrowser() {
  const { toast } = useToast();
  const [tree, setTree] = useState(fileTree);
  const [folderId, setFolderId] = useState("research");
  const [creating, setCreating] = useState(false);
  const breakpoint = useZen()?.breakpoint;

  const recent = folderId === "recent";
  const path = recent ? [] : pathTo(tree, folderId);
  const folder = path[path.length - 1];
  const rows = recent ? tree.filter((e) => !isFolder(e)).sort((a, b) => +b.updated - +a.updated).slice(0, 8) : childrenOf(tree, folderId);
  const folders = rows.filter(isFolder).length;
  const bytes = rows.reduce((sum, e) => sum + (e.bytes ?? 0), 0);
  const counts = [folders ? plural(folders, "folder") : "", rows.length - folders ? plural(rows.length - folders, "file") : "", bytes ? formatBytes(bytes) : ""].filter(Boolean).join(" · ");
  const addFolder = (name: string) => setTree((list) => [...list, { id: `new-${list.length}`, name, parent: folderId, owner: "alex", updated: TODAY }]);
  const download = (e: Entry) => toast({ title: "Download started", children: e.name });
  // New folder: one name field; the folder joins the table and a toast confirms it.
  const newFolder = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : "Enter a folder name" }),
    onSubmit: ({ name }, { reset }) => {
      addFolder(name.trim());
      setCreating(false);
      reset();
      toast({ type: "positive", title: "Folder created" });
    },
  });
  // Cancel, Escape and the scrim close the dialog and clear what was typed.
  const changeCreating = (next: boolean) => { setCreating(next); if (!next) newFolder.reset(); };
  // A phone shows the Name column alone and folds size and date into its caption (the icon steps up to lg).
  const narrow = breakpoint === "mobile";
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
    <>
      <AppShell
        // The trail starts at Files, a Master crumb with its folder icon, so the collapse toggle moves into the Sidebar’s
        // header: beside the toggle the two icons would read as two controls in a row.
        collapse="sidebar"
        sidebar={(
          <Sidebar
            logo={(
              <Stack direction="row" gap="xs" align="center">
                <Thumbnail src={studio.logo} alt="" size="2xs" />
                <Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text>
              </Stack>
            )}
            logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />}
            sections={fileSections}
            selectedId={recent ? "recent" : path[1]?.id ?? "root"} onItemClick={(item) => setFolderId(item.id)} />
        )}
        header={(
          <AppShellHeader
            // A top-level place has no trail; below it, the trail starts at Files and ends at this folder. All the crumbs
            // fit on a desktop window; a tablet keeps the first and the last two, a phone the first and the current page.
            leading={path.length > 1 ? (
              <Breadcrumbs key={folderId} items={trail(path)} maxItems={breakpoint === "mobile" ? 2 : breakpoint === "tablet" ? 3 : undefined}
                onNavigate={(item, event) => { event.preventDefault(); setFolderId(item.id); }} />
            ) : undefined}
            // The account button at the end of the header’s top row, with its menu.
            actions={(
              <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
                { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
                { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => toast({ title: "Settings", children: "Notifications, security and billing." }) },
                { type: "separator" },
                { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: "See you soon, Alex." }) },
              ]} />
            )}
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
      <ModalForm open={creating} onOpenChange={changeCreating} title="New folder" onSubmit={newFolder.handleSubmit}
        primaryAction={{ label: "Create folder" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Folder name" type="text" autoComplete="off" placeholder="Round 2" data-autofocus="" {...newFolder.field("name")} />
      </ModalForm>
    </>
  );
}
