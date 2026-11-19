import { useState } from "react";
import {
  Breadcrumbs, Button, Card, Dialog, DockIcon, FileIcon, Heading, List, ListItem, Stack, Text, fileIconFormatOf, useToast,
  type BreadcrumbItemData,
} from "@zen-ds/react";
import { formatBytes } from "../../data";

// The folders of the studio’s shared Files, and the file to move.
type Folder = { id: string; name: string; parent: string | null };
const folderTree: Folder[] = [
  { id: "root", name: "Files", parent: null },
  { id: "clients", name: "Clients", parent: "root" },
  { id: "studio", name: "Studio", parent: "root" },
  { id: "lumen", name: "Lumen Bank", parent: "clients" },
  { id: "phin", name: "Phin & Co", parent: "clients" },
  { id: "mekong", name: "Mekong Freight", parent: "clients" },
  { id: "banking", name: "Online banking", parent: "lumen" },
  { id: "research", name: "Research", parent: "banking" },
  { id: "design", name: "Design", parent: "banking" },
  { id: "round-2", name: "Round 2", parent: "research" },
  { id: "loyalty", name: "Loyalty app", parent: "phin" },
];
const file = { name: "Session highlights.mp4", bytes: 48_200_000 };
/** Root first, the folder itself last. */
const pathTo = (id: string): Folder[] => { const f = folderTree.find((x) => x.id === id); return f ? [...(f.parent ? pathTo(f.parent) : []), f] : []; };
const subfolders = (id: string) => folderTree.filter((f) => f.parent === id).sort((a, b) => a.name.localeCompare(b.name));
/** A picker’s trail only moves inside the picker, so its crumbs are buttons (no href). */
const trail = (path: Folder[]): BreadcrumbItemData[] => path.map((f) => ({ id: f.id, label: f.name, icon: f.parent === null ? "icon-folder-line" : undefined }));

export default function MoveToFolder() {
  const { toast } = useToast();
  const [fileFolder, setFileFolder] = useState("research");
  const [open, setOpen] = useState(false);
  const [browse, setBrowse] = useState("research");
  const folders = subfolders(browse);
  const here = pathTo(browse);
  const location = folderTree.find((f) => f.id === fileFolder)!;
  const current = here[here.length - 1];

  const start = () => { setBrowse(fileFolder); setOpen(true); };
  const move = () => {
    const before = fileFolder;
    setFileFolder(browse);
    setOpen(false);
    toast({ title: "File moved", children: `To ${current.name}`, action: { label: "Undo", onClick: () => setFileFolder(before) } });
  };

  return (
    <Stack><Card theme="default" width="fill" maxWidth={480} alignSelf="center">
      <Stack gap="md">
        <Stack direction="row" gap="sm" align="center">
          <FileIcon format={fileIconFormatOf(file.name)} size="xl" />
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">{file.name}</Heading>
            <Text role="status" textStyle="Body/Small/Regular" tone="base">{`${formatBytes(file.bytes)} · In ${location.name}`}</Text>
          </Stack>
        </Stack>
        <Stack direction="row" justify="end" alignSelf="stretch"><Button level="tertiary" onClick={start}>Move file</Button></Stack>
      </Stack>
      <Dialog open={open} onOpenChange={setOpen} icon={false} title="Move to folder" description={file.name}
        primaryAction={{ label: "Move here", onClick: move, disabled: browse === fileFolder }}
        secondaryAction={{ label: "Cancel" }}>
        <Stack gap="md">
          {/* A second trail on the screen gets its own name. It is the picker’s only sign of where you are, so it takes
              the Medium emphasis. */}
          <Breadcrumbs key={browse} aria-label="Folder path" emphasis="medium" items={trail(here)} maxItems={3} onNavigate={(item, event) => { event.preventDefault(); setBrowse(item.id); }} />
          {folders.length ? (
            <List aria-label={`Folders in ${current.name}`}>
              {folders.map((f) => <ListItem key={f.id} title={f.name} leading={<DockIcon icon="icon-folder-line" theme="neutral" background="subtle" size="medium" />} onClick={() => setBrowse(f.id)} />)}
            </List>
          ) : (
            <Text textStyle="Body/Small/Regular" tone="base">No folders inside {current.name}.</Text>
          )}
        </Stack>
      </Dialog>
    </Card></Stack>
  );
}
