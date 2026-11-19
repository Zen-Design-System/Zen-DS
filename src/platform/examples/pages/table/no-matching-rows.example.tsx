import { useId, useRef, useState } from "react";
import {
  Avatar, Box, Chip, EmptyState, FileIcon, Heading, Search, Stack, Table, TableMedia, TableText, Text, fileIconFormatOf, plural,
  type AvatarSize, type TableColumn,
} from "@zen-ds/react";
import { daysFromToday, files, formatBytes, formatRelative, initials, people, projectById, type Person, type PersonId, type StudioFile } from "../../data";

/** People are Avatars: a photo when there is one, otherwise initials on the person's steady theme. Subtle beside other
 *  content; `lead` in a table's first column, the row's name, where initials are Solid (table/first-column-avatar-solid). */
function PersonAvatar({ person, size, lead = false }: { person: Person; size: AvatarSize; lead?: boolean }) {
  return person.photo
    ? <Avatar size={size} theme="photo" src={person.photo} alt="" />
    : <Avatar size={size} theme={person.theme} background={lead ? "solid" : "subtle"} alt="">{initials(person.name)}</Avatar>;
}

/* Filters that leave nothing keep the table. */
const studioFiles: StudioFile[] = [
  ...files,
  { id: "f7", name: "Points history – flows.fig", bytes: 9_800_000, owner: "chi", project: "phin-loyalty", updated: daysFromToday(-3, 15, 10) },
  { id: "f8", name: "Transfer journey map.pdf", bytes: 3_400_000, owner: "ava", project: "lumen-banking", updated: daysFromToday(-6, 10, 0) },
  { id: "f9", name: "Customs hold states.fig", bytes: 6_200_000, owner: "duy", project: "mekong-tracking", updated: daysFromToday(-8, 14, 45) },
];
const fileTypes = [
  { id: "design", label: "Design files", test: (name: string) => name.endsWith(".fig") },
  { id: "document", label: "Documents", test: (name: string) => /\.(pdf|docx)$/.test(name) },
  { id: "slides", label: "Presentations", test: (name: string) => name.endsWith(".key") },
  { id: "sheet", label: "Spreadsheets", test: (name: string) => name.endsWith(".xlsx") },
  { id: "video", label: "Videos", test: (name: string) => name.endsWith(".mp4") },
];
const fileOwners = [...new Set(studioFiles.map((file) => file.owner))].map((id) => people[id]);
const fileColumns: TableColumn<StudioFile>[] = [
  { id: "name", header: "Name", cell: (file) => <TableMedia bold media={<FileIcon format={fileIconFormatOf(file.name)} size="lg" />} caption={projectById(file.project).name}>{file.name}</TableMedia> },
  { id: "owner", header: "Owner", width: "170px", cell: (file) => <TableMedia bold={false} media={<PersonAvatar person={people[file.owner]} size="xs" />}>{people[file.owner].name}</TableMedia> },
  { id: "updated", header: "Updated", width: "190px", cell: (file) => <TableText>{formatRelative(file.updated)}</TableText> },
  { id: "size", header: "Size", align: "right", width: "110px", cell: (file) => <TableText>{formatBytes(file.bytes)}</TableText> },
];

export default function FileSearch() {
  const headingId = useId();
  // Someone looked for Chi's prototype video: nothing matches, and the table says so in place.
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [typeId, setTypeId] = useState<string | null>("video");
  const [ownerId, setOwnerId] = useState<PersonId | null>("chi");
  const type = fileTypes.find((item) => item.id === typeId);
  const owner = ownerId ? people[ownerId] : null;
  const words = query.trim().toLowerCase();
  const rows = studioFiles.filter((file) => (!type || type.test(file.name)) && (!ownerId || file.owner === ownerId) && (!words || file.name.toLowerCase().includes(words)));
  // Clear filters leaves with the empty state: focus moves to the search, where the next filter starts.
  const clearAll = () => { setQuery(""); setTypeId(null); setOwnerId(null); searchRef.current?.focus(); };
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Heading level={4} id={headingId} textStyle="Heading/4">Files</Heading>
      <Stack direction="row" gap="xs" align="center" wrap>
        <Box width="fill" minWidth={220} maxWidth={240}><Search ref={searchRef} placeholder="Search files" value={query} onValueChange={setQuery} /></Box>
        <Chip variant="advanced" selected={Boolean(type)} popoverLabel="Type"
          popoverItems={fileTypes.map((item) => ({ id: item.id, label: item.label, selected: item.id === typeId }))}
          onPopoverSelect={(item) => setTypeId(item.id)} onClearSelection={() => setTypeId(null)}>
          {type?.label ?? "Type"}
        </Chip>
        <Chip variant="advanced" selected={Boolean(owner)} popoverLabel="Owner" photoSrc={owner?.photo} theme={owner?.photo ? "leading-photo" : undefined}
          popoverItems={fileOwners.map((person) => ({ id: person.id, label: person.name, selected: person.id === ownerId, theme: "avatar-small" as const,
            ...(person.photo ? { photoSrc: person.photo } : { leading: <PersonAvatar person={person} size="sm" /> }) }))}
          onPopoverSelect={(item) => setOwnerId(item.id as PersonId)} onClearSelection={() => setOwnerId(null)}>
          {owner?.name ?? "Owner"}
        </Chip>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "file")}</Text>
      </Stack>
      {/* Fixed columns scroll sideways on a narrow screen, and the empty row spans every column. The scroll box is the size
          container, so the Empty State's wrapper takes the visible width and stays in view while the row scrolls. */}
      <Table aria-labelledby={headingId} columns={fileColumns} rows={rows} style={{ containerType: "inline-size" }}
        empty={(
          <Box style={{ position: "sticky", insetInlineStart: "var(--zen-spacing-padding-medium, 16px)", width: "calc(100cqi - 2 * var(--zen-spacing-padding-medium, 16px))" }}>
            <EmptyState headingLevel={5} illustration title="No files match" secondaryAction={{ label: "Clear filters", onClick: clearAll }} icon="icon-file-doc-line">
              Try another type or owner, or search by name.
            </EmptyState>
          </Box>
        )} />
    </Stack>
  );
}
