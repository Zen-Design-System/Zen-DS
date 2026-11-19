import { useId } from "react";
import { FileIcon, Heading, List, ListBox, ListItem, fileIconFormatOf, useToast } from "@zen-ds/react";
import { files, formatBytes, formatRelative, people } from "../../data";

/** A Canvas/Flat page (page and bars one plane in both modes, an AppShell with canvas="flat"): its list box is
 *  Flat-Border, Surface/Flat in a Pale ring. */
export default function FlatPageFiles() {
  const { toast } = useToast();
  const titleId = useId();
  return (
    <ListBox as="section" theme="flat-border" aria-labelledby={titleId}
      header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Shared with you</Heading>}>
      <List aria-labelledby={titleId}>
        {files.slice(0, 4).map((file) => (
          <ListItem key={file.id} title={file.name} titleLines={2}
            caption={`${formatBytes(file.bytes)} · ${people[file.owner].name} · ${formatRelative(file.updated)}`}
            leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
            onClick={() => toast({ title: "Opening file", children: file.name })} />
        ))}
      </List>
    </ListBox>
  );
}
