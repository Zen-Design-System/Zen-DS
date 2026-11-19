import { useState } from "react";
import { Chip, FileIcon, List, ListBox, ListItem, Stack, Text, fileIconFormatOf, plural, useToast } from "@zen-ds/react";
import { files, formatBytes, formatRelative, type StudioFile } from "../../data";

type SortId = "updated" | "name" | "size";
const sortOptions: { id: SortId; label: string; caption: string }[] = [
  { id: "updated", label: "Last updated", caption: "Newest first" },
  { id: "name", label: "Name", caption: "A to Z" },
  { id: "size", label: "Size", caption: "Largest first" },
];
const sortFiles = (list: StudioFile[], sort: SortId) => [...list].sort((a, b) =>
  sort === "name" ? a.name.localeCompare(b.name) : sort === "size" ? b.bytes - a.bytes : b.updated.getTime() - a.updated.getTime());

/** Sort is a single choice: a Chip's Popover that closes on pick and re-sorts the files. */
export default function SortFiles() {
  const [sort, setSort] = useState<SortId>("updated");
  const { toast } = useToast();
  const current = sortOptions.find((option) => option.id === sort)!;
  return (
    // A ListBox: the count and the Sort chip in its Header-Slot, the files in its Body-Slot.
    <ListBox width="fill"
      header={<Stack direction="row" align="center" justify="between" gap="md" wrap>
        <Text as="span" textStyle="Body/Small/Regular" tone="base">{plural(files.length, "file")}</Text>
        <Chip variant="advanced" dropdown leading="icon-switch-vertical-01-line" popoverLabel="Sort by"
          popoverItems={sortOptions.map((option) => ({ ...option, selected: option.id === sort }))}
          onPopoverSelect={(item) => setSort(item.id as SortId)}>
          {current.label}
        </Chip>
      </Stack>}>
      <List aria-label="Files">
        {sortFiles(files, sort).map((file) => (
          // A long file name wraps to a second line rather than being cut: nothing else on the card shows it.
          <ListItem key={file.id} title={file.name} titleLines={2} caption={`${formatBytes(file.bytes)} · ${formatRelative(file.updated)}`}
            leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} onClick={() => toast({ title: "File opened in a new tab" })} />
        ))}
      </List>
    </ListBox>
  );
}
