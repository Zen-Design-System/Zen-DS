import { useId, useRef, useState } from "react";
import { Card, EmptyState, FileIcon, Heading, IconButton, List, ListItem, ProgressBar, Stack, Text, fileIconFormatOf, useToast } from "@zen-ds/react";
import { plans, workspacePlan } from "../../data";

/** The workspace's plan (Business, 48 seats) comes with 50 GB. */
const planName = plans.find((plan) => plan.id === workspacePlan.plan)!.name;
const PLAN_GB = 50;
/** Everything else in the workspace: many small files. */
const SMALL_FILES_GB = 13.4;
type LargeFile = { id: string; name: string; gb: number; project: string };
const largestFiles: LargeFile[] = [
  { id: "video", name: "Launch film.mov", gb: 18.6, project: "Book Fair 2026 website" },
  { id: "raw", name: "Raw photos.zip", gb: 9.2, project: "Brand refresh" },
  { id: "sessions", name: "Usability sessions.mp4", gb: 6.4, project: "Online banking redesign" },
];
const gb = (n: number) => `${n.toFixed(1)} GB`;

/** Workspace storage on the quota scale; deleting a large file frees space at once. */
export default function StorageQuota() {
  const { toast } = useToast();
  const titleId = useId();
  const listId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const deleteRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [files, setFiles] = useState(largestFiles);
  const used = SMALL_FILES_GB + files.reduce((sum, file) => sum + file.gb, 0);
  const percent = (used / PLAN_GB) * 100;
  const remove = (file: LargeFile) => {
    const index = files.indexOf(file);
    const rest = files.filter((f) => f.id !== file.id);
    setFiles((list) => list.filter((f) => f.id !== file.id));
    // The row leaves with its button: focus moves to the Delete button now in its place (or the one above), and to
    // the list heading once the list is empty, never to <body>.
    const after = rest[Math.min(index, rest.length - 1)];
    setTimeout(() => (after ? deleteRefs.current[after.id] : headingRef.current)?.focus());
    // Undo puts the file back in its old place.
    const restore = () => setFiles((list) => largestFiles.filter((f) => f.id === file.id || list.some((x) => x.id === f.id)));
    toast({ title: "File deleted", children: `${gb(file.gb)} freed`, action: { label: "Undo", onClick: restore } });
  };
  return (
    <Card theme="default" as="section" aria-labelledby={titleId}>
      {/* Header group → file list: blocks of one surface (md); each block keeps its label close (xs). */}
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Storage</Heading>
          <ProgressBar value={percent} theme="status" scale="quota" label={`${used.toFixed(1)} of ${PLAN_GB} GB`} aria-label="Storage used" />
          <Text textStyle="Body/Small/Regular" tone="base">
            {percent >= 90 ? `${gb(PLAN_GB - used)} left. Uploads stop when storage is full.` : `${gb(PLAN_GB - used)} left on the ${planName} plan.`}
          </Text>
        </Stack>
        <Stack gap="xs">
          <Heading ref={headingRef} tabIndex={-1} level={5} id={listId} textStyle="Body/Small/Bold" tone="light">Largest files</Heading>
          {files.length ? (
            <List aria-labelledby={listId}>
              {files.map((file) => (
                <ListItem key={file.id} title={file.name} titleLines={2} caption={`${gb(file.gb)} · ${file.project}`}
                  leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
                  trailing={<IconButton ref={(button) => { deleteRefs.current[file.id] = button; }} appearance="flat" size="md" icon="icon-trash-line"
                    aria-label={`Delete ${file.name}`} onClick={() => remove(file)} />} />
              ))}
            </List>
          ) : <EmptyState headingLevel={6} size="sm" icon="icon-folder-line" title="No large files">Every file left is under 1 GB.</EmptyState>}
        </Stack>
      </Stack>
    </Card>
  );
}
