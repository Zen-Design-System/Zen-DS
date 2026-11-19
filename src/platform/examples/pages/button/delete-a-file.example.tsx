import { useRef, useState } from "react";
import { Box, Card, Dialog, EmptyState, FileIcon, IconButton, List, ListBox, ListItem, fileIconFormatOf, plural, useToast } from "@zen-ds/react";
import { daysFromToday, files, formatBytes, formatRelative, people, type PersonId, type StudioFile } from "../../data";

// Short names, so a row never has to cut one off.
const loyaltyFiles: StudioFile[] = [
  { ...files[0], name: "Points history.fig" },
  { ...files[2], name: "Rewards API.json" },
  { id: "f7", name: "Launch plan.pdf", bytes: 320_000, owner: "duy", project: "phin-loyalty", updated: daysFromToday(-3, 15, 10) },
];

export default function DeleteFile() {
  const { toast } = useToast();
  const [list, setList] = useState(loyaltyFiles);
  // The dialog keeps its last file while it animates out, so the title never goes blank.
  const [target, setTarget] = useState<StudioFile>(loyaltyFiles[0]);
  const [open, setOpen] = useState(false);
  // After a delete, focus goes to the first trash button left, or to the Empty State's title once the last file is gone.
  const firstDeleteRef = useRef<HTMLButtonElement>(null);
  const emptyTitleRef = useRef<HTMLSpanElement>(null);
  const confirmDelete = (file: StudioFile) => { setTarget(file); setOpen(true); };
  const deleteFile = () => {
    setList((current) => current.filter((file) => file.id !== target.id));
    setOpen(false);
    toast({ title: "File deleted" });
    // The row that opened the dialog is gone: once the dialog has closed, focus the next action instead of <body>.
    setTimeout(() => (firstDeleteRef.current ?? emptyTitleRef.current)?.focus(), 300);
  };
  const upload = () => {
    setList(loyaltyFiles);
    toast({ type: "positive", title: `${plural(loyaltyFiles.length, "file")} uploaded` });
  };
  return (
    <Box>
      {/* A static surface on the stage: the ListBox's Body-Slot insets the rows (they pad 0). */}
      {list.length ? (
        <ListBox>
          <List aria-label="Files in Loyalty app">
            {list.map((file) => (
              <ListItem key={file.id} title={file.name}
                caption={`${formatBytes(file.bytes)} · ${people[file.owner as PersonId].name} · ${formatRelative(file.updated)}`}
                leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
                trailing={<IconButton ref={file.id === list[0].id ? firstDeleteRef : undefined} appearance="flat" icon="icon-trash-line" aria-label={`Delete ${file.name}`} onClick={() => confirmDelete(file)} />} />
            ))}
          </List>
        </ListBox>
      ) : (
        <Card theme="default">
          <EmptyState size="sm" headingLevel={4} icon="icon-folder-line" title={<span ref={emptyTitleRef} tabIndex={-1}>No files yet</span>}
            primaryAction={{ label: "Upload files", onClick: upload }}>
            Files you add to Loyalty app show up here.
          </EmptyState>
        </Card>
      )}
      <Dialog open={open} onOpenChange={setOpen} theme="negative" title={`Delete “${target.name}”?`}
        description="Everyone on Loyalty app loses access to it. You can't undo this."
        primaryAction={{ label: "Delete file", level: "danger", onClick: deleteFile }}
        secondaryAction={{ label: "Cancel", autoFocus: true }} />
    </Box>
  );
}
