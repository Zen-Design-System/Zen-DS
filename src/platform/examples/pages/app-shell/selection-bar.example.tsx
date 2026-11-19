import { useState } from "react";
import {
  ActionBar, AppShell, AppShellAccount, AppShellHeader, Avatar, Breadcrumbs, FileIcon, Menu, PageHeader, Sidebar, Stack, Table, TableMedia, TableText, Text,
  Thumbnail, fileIconFormatOf, plural, useToast, useZen,
  type IconName, type TableColumn,
} from "@zen-ds/react";
import { daysFromToday, files, formatBytes, formatRelative, initials, me, people, projectById, studio, type Person, type StudioFile } from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

// ——— The studio's files: the shared ones, and more from the client projects ————————————————————————————————————
type Folder = "all" | "clients" | "studio";
const moreFiles: StudioFile[] = [
  { id: "f7", name: "Lumen Bank SOW v3.pdf", bytes: 412_000, owner: "hana", project: "lumen-banking", updated: daysFromToday(0, 9, 12) },
  { id: "f8", name: "Transfers journey map.fig", bytes: 24_600_000, owner: "alex", project: "lumen-banking", updated: daysFromToday(-3, 15, 10) },
  { id: "f9", name: "Session highlights.mp4", bytes: 48_200_000, owner: "emi", project: "lumen-banking", updated: daysFromToday(-4, 17, 45) },
  { id: "f10", name: "Points history – copy deck.docx", bytes: 64_000, owner: "linh", project: "phin-loyalty", updated: daysFromToday(-1, 11, 20) },
  { id: "f11", name: "Customs hold states.pdf", bytes: 980_000, owner: "duy", project: "mekong-tracking", updated: daysFromToday(-6, 10, 0) },
  { id: "f12", name: "Saola moodboard.fig", bytes: 36_100_000, owner: "gia", project: "saola-brand", updated: daysFromToday(-4, 10, 15) },
  { id: "f13", name: "Zen tokens 0.4.json", bytes: 142_000, owner: "bao", project: "zen-ds", updated: daysFromToday(-2, 16, 30) },
  { id: "f14", name: "Studio handbook.pdf", bytes: 3_900_000, owner: "minhAnh", project: "zen-ds", updated: daysFromToday(-12, 9, 0) },
];
const allFiles = [...files, ...moreFiles].sort((a, b) => +b.updated - +a.updated);
const folders: Record<Folder, { label: string; icon: IconName; filter: (file: StudioFile) => boolean }> = {
  all: { label: "All files", icon: "icon-file-doc-line", filter: () => true },
  clients: { label: "Client work", icon: "icon-briefcase-line", filter: (file) => projectById(file.project).client !== studio.name },
  studio: { label: "Studio", icon: "icon-building-02-line", filter: (file) => projectById(file.project).client === studio.name },
};

export default function FilesWithSelectionBar() {
  const { toast } = useToast();
  const breakpoint = useZen()?.breakpoint;
  const [folder, setFolder] = useState<Folder>("all");
  const [selected, setSelected] = useState<string[]>([]);
  // On a phone the table keeps the Name column and folds size and date into its caption (the icon steps up to lg).
  const narrow = breakpoint === "mobile";
  const shown = allFiles.filter(folders[folder].filter);
  const columns: TableColumn<StudioFile>[] = [
    { id: "name", header: "Name", cell: (file) => <TableMedia bold media={<FileIcon format={fileIconFormatOf(file.name)} size={narrow ? "lg" : "base"} />} caption={narrow ? `${formatBytes(file.bytes)} · ${formatRelative(file.updated)}` : undefined}>{file.name}</TableMedia> },
    ...(narrow ? [] : [
      { id: "owner", header: "Owner", width: "168px", cell: (file: StudioFile) => <TableMedia bold={false} media={<Avatar size="xsmall" {...avatarOf(people[file.owner])} />}>{people[file.owner].name}</TableMedia> },
      { id: "updated", header: "Modified", width: "200px", cell: (file: StudioFile) => <TableText>{formatRelative(file.updated)}</TableText> },
      { id: "size", header: "Size", align: "right" as const, width: "96px", cell: (file: StudioFile) => <TableText>{formatBytes(file.bytes)}</TableText> },
    ]),
  ];
  return (
    <AppShell
      sidebar={(
        <Sidebar selectedId={folder} onItemClick={(item) => { setFolder(item.id as Folder); setSelected([]); }}
          logo={(
            <Stack direction="row" gap="xs" align="center">
              <Thumbnail src={studio.logo} alt="" size="2xs" />
              <Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text>
            </Stack>
          )}
          logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />}
          sections={[{ items: (Object.keys(folders) as Folder[]).map((id) => ({ id, label: folders[id].label, icon: folders[id].icon })) }]} />
      )}
      header={(
        <AppShellHeader
          leading={<Breadcrumbs master={false} items={[{ id: "files", label: "Files" }, { id: folder, label: folders[folder].label }]} onNavigate={(_, event) => { event.preventDefault(); setFolder("all"); }} />}
          actions={<Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
            { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: "Profile", children: me.name }) },
            { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out" }) },
          ]} />}
          main={<PageHeader title={folders[folder].label} description={`${plural(shown.length, "file")} · newest first`} />}
        />
      )}
    >
      <Table aria-label={folders[folder].label} rows={shown} columns={columns} selectable selectedIds={selected} onSelectionChange={setSelected} />
      {/* The bar sticks to the bottom of the page while rows are selected (ActionBar position="sticky"). */}
      {selected.length ? (
        <ActionBar direction="horizontal" summary={`${plural(selected.length, "file")} selected`}
          secondaryAction={{ label: "Clear selection", onClick: () => setSelected([]) }}
          primaryAction={{ label: "Download", onClick: () => { toast({ title: "Download started", children: plural(selected.length, "file") }); setSelected([]); } }} />
      ) : null}
    </AppShell>
  );
}
