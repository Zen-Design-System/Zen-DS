import { useId, useRef, useState } from "react";
import {
  Avatar, Button, Dialog, FileIcon, Heading, List, ListBox, ListItem, Stack, Table, TableMedia, TableText, Text, fileIconFormatOf, plural, useToast,
  type TableColumn,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatBytes, formatRelative, initials, people, projectById, type Person, type PersonId } from "../../data";

type Export = { id: string; name: string; bytes: number; at: Date };
const pastExports: Export[] = [
  { id: "aug", name: "Timesheets – Aug 2026.csv", bytes: 51_200, at: daysFromToday(-29, 17, 4) },
  { id: "jul", name: "Timesheets – Jul 2026.csv", bytes: 47_900, at: daysFromToday(-61, 16, 52) },
];
type Entry = { id: string; person: PersonId; project: string; hours: number };
const entries: Entry[] = [
  { id: "e1", person: "alex", project: "lumen-banking", hours: 152.5 },
  { id: "e2", person: "bao", project: "phin-loyalty", hours: 160 },
  { id: "e3", person: "chi", project: "phin-loyalty", hours: 148 },
  { id: "e4", person: "duy", project: "mekong-tracking", hours: 96.5 },
  { id: "e5", person: "ava", project: "lumen-banking", hours: 132 },
];

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, background: "subtle" as const, alt: "", children: initials(person.name) };
const entryColumns: TableColumn<Entry>[] = [
  { id: "person", header: "Person", cell: (row) => <TableMedia bold media={<Avatar size="xs" {...avatarOf(people[row.person])} />}>{people[row.person].name}</TableMedia> },
  { id: "project", header: "Project", cell: (row) => <TableText>{projectById(row.project).name}</TableText> },
  { id: "hours", header: "Hours", align: "right", width: "96px", cell: (row) => <TableText>{row.hours.toFixed(1)}</TableText> },
];

/** Export CSV runs in the background; a toast brings the file back when it is ready. */
export default function BackgroundExport() {
  const { toast } = useToast();
  const titleId = useId();
  const [exports, setExports] = useState(pastExports);
  const [running, setRunning] = useState(false);
  const [preview, setPreview] = useState<Export>(pastExports[0]);
  const [open, setOpen] = useState(false);
  // The new file's row: View opens the preview from it, so closing the preview returns focus there.
  const newRowRef = useRef<HTMLElement>(null);
  const view = (item: Export) => { setPreview(item); setOpen(true); };
  // The export runs on its own (a timer stands in for your server); the toast brings the result back with one action,
  // the same one the list row offers.
  const start = () => {
    setRunning(true);
    setTimeout(() => {
      const done: Export = { id: "sep", name: "Timesheets – Sep 2026.csv", bytes: 48_300, at: TODAY };
      setRunning(false);
      setExports((list) => [done, ...list.filter((item) => item.id !== "sep")]);
      // View closes its toast, so focus moves to the file's row first: the Dialog hands it back there when it closes.
      toast({ type: "positive", title: "Export ready", children: done.name, action: { label: "View", onClick: () => { newRowRef.current?.focus(); view(done); } } });
    }, 2400);
  };
  const download = () => { setOpen(false); toast({ title: "Download started", children: preview.name }); };
  return (
    <>
      {/* A ListBox: the title, the export status and Export CSV in its Header-Slot, the past exports in its Body-Slot. */}
      <ListBox as="section" aria-labelledby={titleId} width="fill" maxWidth={480}
        header={<Stack direction="row" justify="between" align="center" gap="xs" wrap>
          <Stack gap="2xs" width="fill" minWidth={160}>
            <Heading level={4} id={titleId} textStyle="Heading/Subheading">Timesheets</Heading>
            <Text textStyle="Body/Small/Regular" tone="base" role="status">
              {running ? "Exporting September for 48 people…" : `September 2026 · ${plural(48, "person", "people")}`}
            </Text>
          </Stack>
          <Button level="tertiary" startIcon="icon-download-01-line" disabled={running} onClick={start}>{running ? "Exporting…" : "Export CSV"}</Button>
        </Stack>}>
        <List aria-label="Recent exports">
          {exports.map((item) => (
            <ListItem key={item.id} ref={item.id === "sep" ? newRowRef : undefined} tabIndex={item.id === "sep" ? -1 : undefined}
              title={item.name} caption={`${formatBytes(item.bytes)} · ${formatRelative(item.at)}`}
              leading={<FileIcon format={fileIconFormatOf(item.name)} size="xl" />} onClick={() => view(item)} />
          ))}
        </List>
      </ListBox>
      <Dialog open={open} onOpenChange={setOpen} title={preview.name}
        description={`Exported ${formatRelative(preview.at).toLowerCase()} · ${formatBytes(preview.bytes)}`}
        primaryAction={{ label: "Download CSV", onClick: download }} secondaryAction={{ label: "Close" }}>
        <Table aria-label="First rows of the export" columns={entryColumns} rows={entries} />
      </Dialog>
    </>
  );
}
