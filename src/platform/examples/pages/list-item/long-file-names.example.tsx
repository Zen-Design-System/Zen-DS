import { useId, useState } from "react";
import { Button, DescriptionList, FileIcon, Heading, List, ListBox, ListItem, SidePanel, fileIconFormatOf, useToast } from "@zen-ds/react";
import { daysFromToday, files, formatBytes, formatRelative, people, projectById, type StudioFile } from "../../data";

const recentFiles: StudioFile[] = [
  files[0],
  files[1],
  { id: "f7", name: "Lumen Bank – online banking redesign – usability findings, round 2 (final).pdf", bytes: 3_420_000, owner: "ava", project: "lumen-banking", updated: daysFromToday(-1, 11, 20) },
  files[2],
  files[3],
  files[4],
];
const SHOWN = 4;

/** Long names: the title wraps to two lines, the panel it opens shows it in full. */
export default function RecentFiles() {
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const titleId = useId();
  const opened = recentFiles.find((file) => file.id === openId);
  const rows = showAll ? recentFiles : recentFiles.slice(0, SHOWN);
  return (
    <>
    {/* A ListBox: the title in its Header-Slot, the files in its Body-Slot, Show all in its Footer-Slot. */}
    <ListBox as="section" aria-labelledby={titleId}
      header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Recent files</Heading>}
      footer={<Button level="tertiary" onClick={() => setShowAll((all) => !all)}>
        {showAll ? "Show fewer" : `Show all ${recentFiles.length} files`}
      </Button>}>
      <List aria-labelledby={titleId}>
        {rows.map((file) => (
          // The title wraps to a second line and is cut only after that; the side panel repeats the whole name.
          <ListItem key={file.id} title={file.name} titleLines={2}
            caption={`${formatBytes(file.bytes)} · ${people[file.owner].name} · ${formatRelative(file.updated)}`}
            leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
            selected={file.id === openId} onClick={() => setOpenId(file.id)} />
        ))}
      </List>
    </ListBox>
      <SidePanel type="modal" size="small" open={Boolean(opened)} onOpenChange={(open) => { if (!open) setOpenId(null); }}
        title={opened?.name ?? ""} description={opened ? projectById(opened.project).name : undefined}
        primaryAction={{ label: "Download", onClick: () => { if (opened) toast({ title: "Download started", children: opened.name }); setOpenId(null); } }}
        secondaryAction={{ label: "Close" }}>
        {opened ? (
          <DescriptionList divider items={[
            { term: "Size", description: formatBytes(opened.bytes) },
            { term: "Owner", description: people[opened.owner].name },
            { term: "Client", description: projectById(opened.project).client },
            { term: "Updated", description: formatRelative(opened.updated) },
          ]} />
        ) : null}
      </SidePanel>
    </>
  );
}
