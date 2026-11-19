import { useId, useState } from "react";
import {
  Avatar, Box, Button, EmptyState, FileIcon, Heading, Stack, Table, TableMedia, TableText, Text, fileIconFormatOf, plural, useToast,
  type AvatarSize, type TableColumn,
} from "@zen-ds/react";
import { files, formatBytes, formatRelative, initials, people, projectById, type Person, type StudioFile } from "../../data";

/** People are Avatars: a photo when there is one, otherwise solid initials on the person's steady theme (one look on every page).
 *  The name is written beside it, so the Avatar itself is decorative (alt=""). */
function PersonAvatar({ person, size }: { person: Person; size: AvatarSize }) {
  return person.photo
    ? <Avatar size={size} theme="photo" src={person.photo} alt="" />
    : <Avatar size={size} theme={person.theme} alt="">{initials(person.name)}</Avatar>;
}

const recentFiles: StudioFile[] = files;

/** Row checkboxes and bulk actions in a Table. */
export default function SelectFiles() {
  const { toast } = useToast();
  const headingId = useId();
  const [rows, setRows] = useState(recentFiles);
  const [selected, setSelected] = useState<string[]>([]);
  const picked = rows.filter((file) => selected.includes(file.id));
  // Deleting can be undone, so it acts at once and the Toast offers Undo (no confirmation dialog).
  const remove = () => {
    const before = rows;
    setRows(rows.filter((file) => !selected.includes(file.id)));
    setSelected([]);
    toast({ title: `${plural(picked.length, "file")} deleted`, action: { label: "Undo", onClick: () => setRows(before) } });
  };
  const download = () => toast({ title: `${plural(picked.length, "file")} downloaded` });
  const columns: TableColumn<StudioFile>[] = [
    { id: "name", header: "Name", cell: (file) => <TableMedia bold media={<FileIcon format={fileIconFormatOf(file.name)} size="lg" />} caption={projectById(file.project).name}>{file.name}</TableMedia> },
    { id: "owner", header: "Owner", cell: (file) => <TableMedia bold={false} media={<PersonAvatar person={people[file.owner]} size="xsmall" />}>{people[file.owner].name}</TableMedia> },
    { id: "updated", header: "Updated", cell: (file) => <TableText>{formatRelative(file.updated)}</TableText> },
    { id: "size", header: "Size", align: "right", cell: (file) => <TableText>{formatBytes(file.bytes)}</TableText> },
  ];
  // A section of the Files page: toolbar → table, and the Table sits straight on the page with no container.
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack direction="row" justify="between" align="center" gap="sm" wrap>
        <Heading level={4} id={headingId} textStyle="Heading/4">Recent files</Heading>
        <Stack direction="row" gap="xs" align="center">
          <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">
            {picked.length ? `${plural(picked.length, "file")} selected` : plural(rows.length, "file")}
          </Text>
          {picked.length ? (
            <>
              <Button level="tertiary" startIcon="icon-download-01-line" onClick={download}>Download</Button>
              <Button level="danger-subtle" startIcon="icon-trash-line" onClick={remove}>Delete</Button>
            </>
          ) : null}
        </Stack>
      </Stack>
      {/* On a narrow screen the files table scrolls sideways instead of wrapping names word by word. */}
      <Box scroll="x">
        <Table style={{ minWidth: 720 }} aria-labelledby={headingId} rows={rows} columns={columns} selectable selectedIds={selected} onSelectionChange={setSelected}
          empty={<EmptyState headingLevel={5} size="sm" icon="icon-folder-line" title="No files yet" primaryAction={{ label: "Restore files", onClick: () => setRows(recentFiles) }}>Files your team shares in projects show up here.</EmptyState>} />
      </Box>
    </Stack>
  );
}
