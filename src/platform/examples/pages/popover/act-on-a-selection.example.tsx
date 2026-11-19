import { useRef, useState } from "react";
import {
  EmptyState, FileIcon, Heading, IconButton, InputField, ModalForm, PopoverBulkAction, PopoverBulkActionDivider, PopoverBulkActionGroup, Stack, Table, TableMedia,
  TableText, Text, fileIconFormatOf, plural, useFormState, useToast, type IconName,
} from "@zen-ds/react";
import { TODAY, files, formatBytes, formatRelative, people } from "../../data";

const newestFirst = [...files].sort((a, b) => b.updated.getTime() - a.updated.getTime());
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Selecting table rows brings up a Popover Bulk-Action bar whose icon actions name how many files they affect. */
export default function BulkFileActions() {
  const [rows, setRows] = useState(newestFirst);
  const [picked, setPicked] = useState<string[]>(["f1", "f3"]);
  const [sharing, setSharing] = useState(false);
  const { toast } = useToast();
  const statusRef = useRef<HTMLElement>(null);
  const count = plural(picked.length, "file");
  const remove = () => {
    const before = rows;
    setRows(rows.filter((row) => !picked.includes(row.id)));
    setPicked([]);
    toast({ title: `${count} deleted`, action: { label: "Undo", onClick: () => setRows(before) } });
    // The bar goes with the selection: focus moves to the status line that now counts the files.
    setTimeout(() => statusRef.current?.focus());
  };
  const duplicate = () => {
    const copies = rows.filter((row) => picked.includes(row.id))
      .map((row) => ({ ...row, id: `${row.id}-copy-${rows.length}`, owner: "alex" as const, name: row.name.replace(/(\.[^.]+)$/, " copy$1"), updated: TODAY }));
    setRows([...copies, ...rows]);
    setPicked(copies.map((row) => row.id));
    toast({ title: `${count} duplicated` });
  };
  // Share: one email field; a valid address closes the dialog and a toast confirms it.
  const share = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => {
      const text = email.trim();
      if (!text) return { email: "Enter an email address" };
      return { email: emailPattern.test(text) ? undefined : "Enter a valid email address, like name@company.com" };
    },
    onSubmit: ({ email }, { reset }) => {
      setSharing(false);
      reset();
      toast({ type: "positive", title: `Shared with ${email.trim()}` });
    },
  });
  // Cancel, Escape and the scrim close the dialog and clear what was typed.
  const changeSharing = (next: boolean) => { setSharing(next); if (!next) share.reset(); };
  const action = (icon: IconName, verb: string, onClick: () => void) =>
    <IconButton appearance="flat" size="md" icon={icon} aria-label={`${verb} ${count}`} onClick={onClick} />;
  return (
    // The table is the section's content, so it lies on the page with no card.
    <Stack gap="md" width="fill">
      <Stack direction="row" align="center" justify="between" gap="md">
        <Heading level={4} textStyle="Heading/4">Recent files</Heading>
        <Text ref={statusRef} tabIndex={-1} as="span" textStyle="Body/Small/Regular" tone="base" role="status">{picked.length ? `${count} selected` : plural(rows.length, "file")}</Text>
      </Stack>
      <Table aria-label="Recent files" rows={rows} getRowId={(row) => row.id} selectable selectedIds={picked} onSelectionChange={setPicked}
        empty={<EmptyState size="sm" icon="icon-folder-line" title="No files yet" primaryAction={{ label: "Restore files", onClick: () => setRows(newestFirst) }}>Deleted files stay in the trash for 30 days.</EmptyState>}
        columns={[
          { id: "name", header: "Name", cell: (row) => <TableMedia bold media={<FileIcon format={fileIconFormatOf(row.name)} size="lg" />} caption={people[row.owner].name}>{row.name}</TableMedia> },
          { id: "size", header: "Size", align: "right", width: "120px", cell: (row) => <TableText>{formatBytes(row.bytes)}</TableText> },
          { id: "updated", header: "Updated", align: "right", width: "200px", cell: (row) => <TableText>{formatRelative(row.updated)}</TableText> },
        ]} />
      {/* The bar's row, centred, keeps the bar's height (a Medium button and 2XSmall padding) while nothing is selected,
          so the page doesn't jump when a selection starts. */}
      <Stack direction="row" justify="center" style={{ minHeight: "calc(var(--zen-button-size-medium, 40px) + 2 * var(--zen-spacing-padding-2-xsmall, 4px))" }}>
        {picked.length ? (
          <PopoverBulkAction aria-label={`Actions for ${count}`}>
            <PopoverBulkActionGroup aria-label="Share">
              {action("icon-download-01-line", "Download", () => toast({ title: `${count} downloaded` }))}
              {action("icon-share-01-line", "Share", () => setSharing(true))}
            </PopoverBulkActionGroup>
            <PopoverBulkActionDivider />
            <PopoverBulkActionGroup aria-label="Edit">
              {action("icon-copy-line", "Duplicate", duplicate)}
              {action("icon-trash-line", "Delete", remove)}
            </PopoverBulkActionGroup>
          </PopoverBulkAction>
        ) : null}
      </Stack>
      <ModalForm open={sharing} onOpenChange={changeSharing} title={`Share ${count}`} description="People you share with can view and download them."
        onSubmit={share.handleSubmit} primaryAction={{ label: "Share" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email" type="email" autoComplete="off" placeholder="name@phinco.vn" data-autofocus="" {...share.field("email")} />
      </ModalForm>
    </Stack>
  );
}
