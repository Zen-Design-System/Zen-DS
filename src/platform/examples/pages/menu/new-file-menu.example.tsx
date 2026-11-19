import { useId, useState } from "react";
import { Button, FileIcon, Heading, List, ListBox, ListItem, Menu, MenuItem, Stack, Text, fileIconFormatOf, useToast } from "@zen-ds/react";
import { formatBytes, people } from "../../data";

type LoyaltyFile = { id: string; name: string; caption: string };
const firstFiles: LoyaltyFile[] = [
  { id: "f1", name: "Loyalty app – points history.fig", caption: `${formatBytes(18_400_000)} · Chi Tran · 13 minutes ago` },
  { id: "f3", name: "Rewards API contract.json", caption: `${formatBytes(86_000)} · Bao Nguyen · Monday at 9:40 am` },
  { id: "f8", name: "Android test plan.pdf", caption: `${formatBytes(640_000)} · Em Pham · Sep 22 at 4:15 pm` },
];
const kinds = {
  design: { label: "Design file", file: "Untitled design file", extension: "fig" },
  doc: { label: "Document", file: "Untitled document", extension: "docx" },
  sheet: { label: "Spreadsheet", file: "Untitled spreadsheet", extension: "xlsx" },
} as const;
type Kind = keyof typeof kinds;

/** A project's files with a New menu: each item makes an untitled file of its kind. */
export default function NewFileMenu() {
  const { toast } = useToast();
  const [files, setFiles] = useState(firstFiles);
  const titleId = useId();
  const create = (kind: Kind) => {
    const { label, file, extension } = kinds[kind];
    const same = files.filter((item) => item.name.startsWith(file)).length;
    const created: LoyaltyFile = { id: `new-${Date.now()}`, name: `${file}${same ? ` ${same + 1}` : ""}.${extension}`, caption: `Empty · ${people.alex.name} · Just now` };
    setFiles((list) => [created, ...list]);
    toast({ title: `${label} created`, children: created.name, action: { label: "Undo", onClick: () => setFiles((list) => list.filter((item) => item.id !== created.id)) } });
  };
  return (
    // A ListBox: the title, its caption and the New menu in its Header-Slot, the files in its Body-Slot.
    <ListBox as="section" aria-labelledby={titleId}
      header={<Stack direction="row" justify="between" align="center" gap="xs" wrap>
        <Stack gap="2xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Files</Heading>
          <Text as="span" textStyle="Body/Small/Regular" tone="base">Loyalty app · Phin & Co</Text>
        </Stack>
        {/* Composed items: any element is the icon, and each item runs its own onSelect. */}
        <Menu align="end" trigger={<Button level="tertiary" startIcon="icon-plus-line" endIcon="icon-chevron-down-line">New</Button>}>
          <MenuItem id="design" label="Design file" caption="A blank Figma canvas" icon={<FileIcon format="figma" />} onSelect={() => create("design")} />
          <MenuItem id="doc" label="Document" caption="A brief, notes or a spec" icon={<FileIcon format="doc" />} onSelect={() => create("doc")} />
          <MenuItem id="sheet" label="Spreadsheet" caption="A budget or a tracker" icon={<FileIcon format="sheet" />} onSelect={() => create("sheet")} />
        </Menu>
      </Stack>}>
      <List aria-labelledby={titleId}>
        {files.map((file) => (
          <ListItem key={file.id} title={file.name} titleLines={2} caption={file.caption} leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} />
        ))}
      </List>
    </ListBox>
  );
}
