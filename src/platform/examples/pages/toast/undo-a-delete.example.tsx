import { useId, useRef, useState } from "react";
import { EmptyState, FileIcon, Heading, IconButton, List, ListBox, ListItem, fileIconFormatOf, plural, useToast, type ToastItem } from "@zen-ds/react";
import { files, formatBytes, formatRelative, people, type StudioFile } from "../../data";

const recentFiles = files.slice(0, 4);

/** Recent files: deleting one is undoable, so it happens at once and a toast offers Undo. */
export default function UndoDelete() {
  const { toast, dismiss } = useToast();
  const titleId = useId();
  const [list, setList] = useState<StudioFile[]>(recentFiles);
  // The Undo toasts still open, so Restore files can close them.
  const [undoToasts, setUndoToasts] = useState<ToastItem["id"][]>([]);
  // Where focus goes once a row leaves or comes back: a file's Delete button, or the title when none is left.
  const titleRef = useRef<HTMLHeadingElement>(null);
  const deleteRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // Undo puts the file back where it was; its toast closes, so focus moves to the file that came back.
  const undo = (file: StudioFile) => {
    setList((current) => recentFiles.filter((item) => item.id === file.id || current.includes(item)));
    setTimeout(() => deleteRefs.current[file.id]?.focus());
  };
  const remove = (file: StudioFile) => {
    const index = list.indexOf(file);
    const rest = list.filter((item) => item.id !== file.id);
    setList(rest);
    // The row leaves with its button: focus moves to the row that took its place (or the one above), never to <body>.
    const next = rest[Math.min(index, rest.length - 1)];
    setTimeout(() => (next ? deleteRefs.current[next.id] : titleRef.current)?.focus());
    const id = toast({ title: "File deleted", children: file.name, action: { label: "Undo", onClick: () => undo(file) } });
    setUndoToasts((ids) => [...ids, id]);
  };
  // Restoring everything makes the open Undo toasts pointless, so they go too.
  const restoreAll = () => {
    undoToasts.forEach((id) => dismiss(id));
    setUndoToasts([]);
    setList(recentFiles);
    toast({ title: `${plural(recentFiles.length, "file")} restored` });
    setTimeout(() => deleteRefs.current[recentFiles[0].id]?.focus());
  };
  return (
    // A ListBox: the title in its Header-Slot, the files (or the Empty State once they are all gone) in its Body-Slot.
    <ListBox as="section" aria-labelledby={titleId} width="fill" maxWidth={480}
      header={<Heading ref={titleRef} tabIndex={-1} level={4} id={titleId} textStyle="Heading/Subheading">Recent files</Heading>}>
      {list.length ? (
        <List aria-labelledby={titleId}>
          {list.map((file) => (
            <ListItem key={file.id} title={file.name} titleLines={2}
              caption={`${formatBytes(file.bytes)} · ${people[file.owner].name} · ${formatRelative(file.updated)}`}
              leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
              trailing={<IconButton ref={(button) => { deleteRefs.current[file.id] = button; }} appearance="flat" level="primary" icon="icon-trash-line"
                aria-label={`Delete ${file.name}`} tooltip="Delete" onClick={() => remove(file)} />} />
          ))}
        </List>
      ) : (
        <EmptyState size="sm" icon="icon-folder-line" title="No recent files" primaryAction={{ label: "Restore files", onClick: restoreAll }}>
          Files you open in any project show up here.
        </EmptyState>
      )}
    </ListBox>
  );
}
