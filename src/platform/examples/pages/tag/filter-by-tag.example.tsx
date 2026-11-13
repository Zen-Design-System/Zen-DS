import { useState } from "react";
import { Chip, EmptyState, Stack, Table, TableTags, TableText, Tag, Text, plural, type TableColumn } from "@zen-ds/react";
import { daysFromToday, formatRelative, people, type Person } from "../../data";

type Note = { id: string; title: string; author: Person; at: Date; tags: string[] };
/** Newest first, the order the library shows them in. */
const notes: Note[] = [
  { id: "n3", title: "Points history is the most-used loyalty screen", author: people.chi, at: daysFromToday(-1, 9, 45), tags: ["Loyalty", "Analytics"] },
  { id: "n1", title: "First-time users stall at the payee step", author: people.ava, at: daysFromToday(-2, 15, 20), tags: ["Transfers", "Usability test"] },
  { id: "n5", title: "Older customers read every word on the transfer review", author: people.ava, at: daysFromToday(-3, 16, 30), tags: ["Transfers", "Accessibility"] },
  { id: "n2", title: "Customers want to see pending card payments", author: people.hana, at: daysFromToday(-5, 11, 0), tags: ["Cards", "Interview"] },
  { id: "n4", title: "Passkeys cut sign-in time by 40%", author: people.finn, at: daysFromToday(-9, 14, 10), tags: ["Sign-in", "Analytics"] },
  { id: "n6", title: "Drivers misread the customs hold status", author: people.duy, at: daysFromToday(-12, 10, 0), tags: ["Logistics", "Interview"] },
];
const allTags = [...new Set(notes.flatMap((note) => note.tags))].sort();

export default function FilterByTag() {
  const [tag, setTag] = useState<string | null>(null);
  const rows = tag ? notes.filter((note) => note.tags.includes(tag)) : notes;
  const columns: TableColumn<Note>[] = [
    { id: "note", header: "Finding", cell: (note) => <TableText bold caption={note.author.name}>{note.title}</TableText> },
    { id: "tags", header: "Tags", width: "280px", cell: (note) => (
      <TableTags>{note.tags.map((name) => <Tag key={name} onClick={() => setTag(tag === name ? null : name)} aria-pressed={tag === name}>{name}</Tag>)}</TableTags>
    ) },
    { id: "added", header: "Added", width: "200px", cell: (note) => <TableText>{formatRelative(note.at)}</TableText> },
  ];
  return (
    // The table is the library itself, so it lies on the page under its toolbar, with no container.
    <Stack gap="md" align="stretch">
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Chip variant="advanced" dropdown selected={tag !== null} popoverLabel="Tag"
          popoverItems={allTags.map((name) => ({ id: name, label: name, selected: tag === name }))}
          onPopoverSelect={(item) => setTag(tag === item.id ? null : item.id)} onClearSelection={() => setTag(null)}>
          {tag ?? "Tag"}
        </Chip>
        <Text as="span" textStyle="Body/Small/Regular" tone="base" role="status">{plural(rows.length, "finding")}</Text>
      </Stack>
      <Table aria-label="Research findings" columns={columns} rows={rows}
        empty={<EmptyState size="sm" headingLevel={4} icon="icon-search-medium-line" title="No findings match" secondaryAction={{ label: "Clear filter", onClick: () => setTag(null) }}>Try another tag.</EmptyState>} />
    </Stack>
  );
}
