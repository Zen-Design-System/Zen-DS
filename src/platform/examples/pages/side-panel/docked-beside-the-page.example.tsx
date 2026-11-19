import { useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Chip, DashboardHeader, DescriptionList, EmptyState, FileIcon, IconButton, Menu, PageHeader, Search,
  SidePanel, Stack, Table, TableMedia, TableText, Text, Thumbnail, fileIconFormatOf, plural, useToast, useZen, type TableColumn,
} from "@zen-ds/react";
import { activity, daysFromToday, formatBytes, formatRelative, me, people, studio, type PersonId, type StudioFile } from "../../data";

const unreadActivity = activity.filter((item) => item.unread);

/** The top row's utilities: Notifications with the unread count (read on open), then the account. */
function HeaderUtilities() {
  const { toast } = useToast();
  const [unread, setUnread] = useState(unreadActivity.length);
  const first = unreadActivity[0];
  const readAll = () => {
    toast(unread
      ? { title: plural(unread, "new notification"), children: `${people[first.actor].name} ${first.verb} “${first.object}”${unread > 1 ? `, and ${unread - 1} more` : ""}.` }
      : { title: "No new notifications", children: "You’re all caught up." });
    setUnread(0);
  };
  return (
    <>
      <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={readAll} />
      <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
        { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
        { type: "separator" },
        { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${me.name.split(" ")[0]}.` }) },
      ]} />
    </>
  );
}

type Access = { person: PersonId; can: "Can edit" | "Can view" };
type LoyaltyFile = Pick<StudioFile, "id" | "name" | "bytes" | "owner" | "updated"> & { access: Access[] };
const loyaltyFiles: LoyaltyFile[] = [
  { id: "f1", name: "Loyalty app – points history.fig", bytes: 18_400_000, owner: "chi", updated: daysFromToday(0, 10, 17), access: [{ person: "bao", can: "Can edit" }, { person: "em", can: "Can view" }, { person: "duy", can: "Can view" }] },
  { id: "f3", name: "Rewards API contract.json", bytes: 86_000, owner: "bao", updated: daysFromToday(-2, 9, 40), access: [{ person: "chi", can: "Can view" }, { person: "finn", can: "Can edit" }] },
  { id: "f7", name: "Points history – flows.fig", bytes: 9_800_000, owner: "chi", updated: daysFromToday(-3, 15, 10), access: [{ person: "bao", can: "Can view" }] },
  { id: "f8", name: "Loyalty tiers – research synthesis, round 2.pdf", bytes: 3_150_000, owner: "ava", updated: daysFromToday(-6, 11, 30), access: [{ person: "chi", can: "Can edit" }, { person: "duy", can: "Can view" }, { person: "alex", can: "Can view" }] },
  { id: "f9", name: "Android 2.4 release notes.docx", bytes: 240_000, owner: "em", updated: daysFromToday(-8, 17, 5), access: [{ person: "bao", can: "Can edit" }, { person: "duy", can: "Can edit" }] },
  { id: "f10", name: "Rewards checkout – copy deck.docx", bytes: 410_000, owner: "linh", updated: daysFromToday(-12, 14, 0), access: [{ person: "chi", can: "Can edit" }] },
  { id: "f11", name: "Launch plan – Nov 2.xlsx", bytes: 1_260_000, owner: "duy", updated: daysFromToday(-15, 9, 15), access: [{ person: "alex", can: "Can edit" }, { person: "hana", can: "Can view" }] },
];
const fileColumns: TableColumn<LoyaltyFile>[] = [
  { id: "name", header: "Name", cell: (file) => <TableMedia bold media={<FileIcon format={fileIconFormatOf(file.name)} size="lg" />} caption={people[file.owner].name}>{file.name}</TableMedia> },
  { id: "updated", header: "Updated", width: "180px", cell: (file) => <TableText>{formatRelative(file.updated)}</TableText> },
  { id: "size", header: "Size", align: "right", width: "100px", cell: (file) => <TableText>{formatBytes(file.bytes)}</TableText> },
];
// On a phone the table keeps the file; its owner and when it changed move into the caption.
const phoneFileColumns: TableColumn<LoyaltyFile>[] = [
  { id: "name", header: "Name", cell: (file) => <TableMedia bold media={<FileIcon format={fileIconFormatOf(file.name)} size="lg" />} caption={`${people[file.owner].name} · ${formatRelative(file.updated)}`}>{file.name}</TableMedia> },
];
type FileKind = "Designs" | "Documents" | "Spreadsheets" | "Code";
const fileKinds: FileKind[] = ["Designs", "Documents", "Spreadsheets", "Code"];
const kindOf = (name: string): FileKind => (/\.fig$/.test(name) ? "Designs" : /\.xlsx$/.test(name) ? "Spreadsheets" : /\.json$/.test(name) ? "Code" : "Documents");
/** "Bao Nguyen, Duy Le" · "Only the owner" */
const namesOf = (access: Access[], can: Access["can"]) => access.filter((entry) => entry.can === can).map((entry) => people[entry.person].name).join(", ") || (can === "Can edit" ? "Only the owner" : "No one else");

/** The Loyalty app's files with the picked file's details in a Standard Side Panel docked beside them. */
// startOpen: the details start open where the shell docks them, while the page keeps a tablet width (744) beside the
// panel (360): on this Top-Bar screen from 1104 wide. Narrower they would open as a Modal over the page, so pass false.
export default function DockedFileDetails({ startOpen = true }: { startOpen?: boolean }) {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState("f1");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<FileKind | null>(null);
  // Until someone shows or hides the details, they follow startOpen.
  const [choice, setChoice] = useState<boolean | null>(null);
  const open = choice ?? startOpen;
  const phone = useZen()?.breakpoint === "mobile";
  const needle = query.trim().toLowerCase();
  const rows = loyaltyFiles.filter((item) => (!kind || kindOf(item.name) === kind) && (!needle || `${item.name} ${people[item.owner].name}`.toLowerCase().includes(needle)));
  const clear = () => { setQuery(""); setKind(null); };
  const file = loyaltyFiles.find((item) => item.id === selectedId)!;
  const extension = file.name.split(".").pop()!.toUpperCase();
  const copyLink = () => {
    void navigator.clipboard?.writeText(`https://${studio.domain}/files/${file.id}`).catch(() => null);
    toast({ title: "Link copied", children: file.name });
  };
  return (
    // Top-Bar: the project's file space has no navigation of its own, so the header runs across and the docked panel
    // sits under it, beside the page (Figma Side-Panel Standard, Small 360).
    <AppShell pattern="top-bar"
      header={(
        <AppShellHeader
          leading={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          actions={<HeaderUtilities />}
          // No eyebrow: the description already names the project (one style less on a calm page).
          main={<PageHeader title="Files" description="Design files, specs and plans for the Phin & Co loyalty app."
            trailing={<IconButton level="tertiary" icon="icon-layout-right-line" aria-label={open ? "Hide details" : "Show details"} aria-pressed={open} onClick={() => setChoice(!open)} />} />}
          // Sections: the control bar over the list (on a phone the Search takes a line of its own).
          sections={(
            <DashboardHeader
              search={<Search size="md" placeholder="Search files" value={query} onValueChange={setQuery} />}
              controls={(
                <Chip variant="advanced" dropdown selected={kind !== null} popoverLabel="Type"
                  popoverItems={fileKinds.map((option) => ({ id: option, label: option, selected: option === kind }))}
                  onPopoverSelect={(item) => setKind(item.id === kind ? null : (item.id as FileKind))} onClearSelection={() => setKind(null)}>
                  {kind ?? "Type"}
                </Chip>
              )}
              subheading={plural(rows.length, "file")} />
          )}
        />
      )}
      // Standard: the page stays live, so picking another file updates the panel beside it. The shell docks it while
      // the page keeps a tablet width and opens it as a Modal otherwise.
      sidePanel={(
        <SidePanel type="standard" size="small" open={open} onOpenChange={setChoice}
          title={file.name} description={`${extension} file · ${formatBytes(file.bytes)}`}
          primaryAction={{ label: "Copy link", onClick: copyLink }}>
          <DescriptionList items={[
            { id: "owner", term: "Owner", description: people[file.owner].name },
            { id: "project", term: "Project", description: "Loyalty app" },
            { id: "updated", term: "Updated", description: formatRelative(file.updated) },
            { id: "editors", term: "Can edit", description: namesOf(file.access, "Can edit") },
            { id: "viewers", term: "Can view", description: namesOf(file.access, "Can view") },
          ]} />
        </SidePanel>
      )}
    >
      <Stack gap="md">
        <Table aria-label="Files" columns={phone ? phoneFileColumns : fileColumns} rows={rows} currentRowId={open ? selectedId : null} onRowClick={(row) => { setSelectedId(row.id); setChoice(true); }}
          empty={<EmptyState size="sm" headingLevel={2} icon="icon-search-medium-line" title="No files match" secondaryAction={{ label: "Clear filters", onClick: clear }}>Try a file name, its owner or another type.</EmptyState>} />
      </Stack>
    </AppShell>
  );
}
