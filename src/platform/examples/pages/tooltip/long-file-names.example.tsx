import { useRef, useState } from "react";
import { FileIcon, Heading, Link, List, ListBox, ListItem, Stack, Text, Tooltip, fileIconFormatOf, useToast } from "@zen-ds/react";
import { formatBytes, people, type PersonId } from "../../data";

type HandoffFile = { id: string; name: string; bytes: number; owner: PersonId };
const handoff: HandoffFile[] = [
  { id: "h1", name: "Loyalty app – points history – final review with Phin & Co v3.fig", bytes: 18_400_000, owner: "chi" },
  { id: "h2", name: "Loyalty app – rewards checkout – developer handoff notes.pdf", bytes: 1_120_000, owner: "bao" },
  { id: "h3", name: "Tier badges.svg", bytes: 42_000, owner: "gia" },
  { id: "h4", name: "Rewards API contract.json", bytes: 86_000, owner: "bao" },
];

/** One file row: the name gets a tooltip only while its ellipsis cuts it. */
function FileRow({ file, onOpen }: { file: HandoffFile; onOpen: () => void }) {
  const nameRef = useRef<HTMLSpanElement>(null);
  const [cut, setCut] = useState(false);
  // Measured as the pointer or the focus arrives, before the tooltip opens, so it follows the row's current width.
  const measure = () => {
    const name = nameRef.current;
    if (name) setCut(name.scrollWidth > name.clientWidth);
  };
  return (
    <ListItem leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} title={file.name}>
      {/* Fills ListItem's Contents slot, so the pair copies the row's own title and caption (gap 2XSmall, caption Light). */}
      <Stack gap="2xs" width="fill">
        {/* The tooltip takes the row's width; the link may shrink below its name (minWidth 0), so the name ends in an
            ellipsis in the link's colour (tone inherit). */}
        <Tooltip content={file.name} disabled={!cut}>
          <Link href={`#file-${file.id}`} style={{ minWidth: 0 }} onPointerEnter={measure} onFocus={measure}
            onClick={(event) => { event.preventDefault(); onOpen(); }}>
            <Text ref={nameRef} as="span" textStyle="Body/Base/Bold" tone="inherit" truncate>{file.name}</Text>
          </Link>
        </Tooltip>
        <Text as="span" textStyle="Body/Small/Regular" tone="light">{`${formatBytes(file.bytes)} · ${people[file.owner].name}`}</Text>
      </Stack>
    </ListItem>
  );
}

/** Files shared with a client: a cut name shows the whole name in a tooltip; a name that fits gets none. */
export default function LongFileNames() {
  const { toast } = useToast();
  return (
    // A ListBox: the title in its Header-Slot, the files (FileRow renders a ListItem) in its Body-Slot.
    <ListBox width="fill"
      header={<Heading level={4} textStyle="Heading/Subheading">Shared with Phin & Co</Heading>}>
      <List aria-label="Shared with Phin & Co">
        {handoff.map((file) => <FileRow key={file.id} file={file} onOpen={() => toast({ title: "File opened in a new tab" })} />)}
      </List>
    </ListBox>
  );
}
