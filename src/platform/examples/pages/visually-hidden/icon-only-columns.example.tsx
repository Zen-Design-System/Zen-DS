import { useId, useRef, useState, type CSSProperties } from "react";
import {
  EmptyState, FileIcon, Heading, IconButton, Stack, Table, TableActions, TableMedia, TableText, Text, VisuallyHidden, fileIconFormatOf, plural, useToast,
  type TableColumn,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatBytes, formatRelative, people, type PersonId } from "../../data";

const minutesAgo = (m: number) => new Date(TODAY.getTime() - m * 60_000);

type StudioFileRow = { id: string; name: string; bytes: number; owner: PersonId; updated: Date };
const firstFiles: StudioFileRow[] = [
  { id: "f1", name: "Loyalty app – points history.fig", bytes: 18_400_000, owner: "chi", updated: minutesAgo(13) },
  { id: "f2", name: "Store locator.fig", bytes: 9_800_000, owner: "chi", updated: daysFromToday(-1, 15, 20) },
  { id: "f3", name: "Rewards API contract.json", bytes: 86_000, owner: "bao", updated: daysFromToday(-2, 9, 40) },
  { id: "f4", name: "Android test plan.pdf", bytes: 640_000, owner: "em", updated: daysFromToday(-8, 16, 15) },
  { id: "f5", name: "Sprint 6 report.xlsx", bytes: 420_000, owner: "duy", updated: daysFromToday(-3, 17, 30) },
];

export default function FilesTable() {
  const { toast } = useToast();
  const [rows, setRows] = useState(firstFiles);
  const [starred, setStarred] = useState<string[]>(["f1"]);
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Each row's Archive button, by row id: focus has somewhere to go once a row is archived.
  const archiveRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const toggleStar = (row: StudioFileRow) => setStarred((list) => (list.includes(row.id) ? list.filter((id) => id !== row.id) : [...list, row.id]));
  const archive = (row: StudioFileRow) => {
    const index = rows.findIndex((item) => item.id === row.id);
    const next = rows[index + 1] ?? rows[index - 1];
    setRows((list) => list.filter((item) => item.id !== row.id));
    toast({ title: "File archived", children: row.name, action: { label: "Undo", onClick: () => setRows((list) => [...list.slice(0, index), row, ...list.slice(index)]) } });
    // The row and its button are gone: focus moves to the next row's Archive, or to the heading.
    setTimeout(() => (next ? archiveRefs.current[next.id] : headingRef.current)?.focus());
  };
  const columns: TableColumn<StudioFileRow>[] = [
    // No visible header: the star is the column's only content, so the hidden text names it ("Starred").
    { id: "starred", header: <VisuallyHidden>Starred</VisuallyHidden>, width: "64px", cell: (row) => {
      const on = starred.includes(row.id);
      return <IconButton appearance="flat" level="primary" size="md" icon={on ? "icon-star-01-solid" : "icon-star-01-line"} aria-pressed={on} aria-label={`Star ${row.name}`} onClick={() => toggleStar(row)} />;
    } },
    // Who changed the file and when share the name's caption, so the icon-only columns sit closer to the name.
    { id: "name", header: "Name", cell: (row) => <TableMedia bold media={<FileIcon format={fileIconFormatOf(row.name)} size="lg" />} caption={`${people[row.owner].name} · ${formatRelative(row.updated)}`}>{row.name}</TableMedia> },
    { id: "size", header: "Size", align: "right", width: "120px", cell: (row) => <TableText>{formatBytes(row.bytes)}</TableText> },
    { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "72px", cell: (row) => (
      <TableActions>
        <IconButton ref={(button) => { archiveRefs.current[row.id] = button; }} appearance="flat" level="primary" size="md" icon="icon-archive-line"
          aria-label={`Archive ${row.name}`} onClick={() => archive(row)} />
      </TableActions>
    ) },
  ];
  return (
    // --zen-table-fill-min-width (Table's CSS contract): the file name keeps 18rem; on a narrow screen the table scrolls
    // sideways before a name is cut short.
    <Stack as="section" gap="md" aria-labelledby={headingId} style={{ "--zen-table-fill-min-width": "18rem" } as CSSProperties}>
      <Stack direction="row" justify="between" align="center" gap="xs" wrap>
        <Heading ref={headingRef} level={4} id={headingId} textStyle="Heading/4" tabIndex={-1}>Loyalty app files</Heading>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{`${plural(rows.length, "file")} · ${starred.filter((id) => rows.some((row) => row.id === id)).length} starred`}</Text>
      </Stack>
      {/* The file name fills the rest of the row; on a narrow screen the table scrolls sideways to Archive. */}
      <Table aria-labelledby={headingId} columns={columns} rows={rows}
        empty={<EmptyState size="sm" headingLevel={5} icon="icon-folder-line" title="Every file is archived"
          secondaryAction={{ label: "Restore files", onClick: () => setRows(firstFiles) }}>Archived files stay in Archive for 30 days.</EmptyState>} />
    </Stack>
  );
}
