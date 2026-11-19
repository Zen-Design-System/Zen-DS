import { useRef, useState, type RefObject } from "react";
import { AppShell, BottomSheet, EmptyState, FileIcon, IconButton, List, ListItem, Stack, Text, TopNavigation, fileIconFormatOf, plural, useToast } from "@zen-ds/react";
import { TODAY, daysFromToday, files, formatBytes, formatRelative } from "../../data";

type BrandFile = { id: string; name: string; bytes: number; updated: Date };
const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);
const kickoff = files.find((file) => file.id === "f5")!;
// The Brand refresh folder, last changed first.
const brandFiles: BrandFile[] = [
  { id: "f1", name: "Moodboard.fig", bytes: 24_600_000, updated: minutesAgo(13) },
  { id: "f2", name: "Brand brief.pdf", bytes: 1_240_000, updated: daysFromToday(0, 9, 12) },
  { id: "f4", name: "Logo sketches.png", bytes: 3_080_000, updated: daysFromToday(-2, 9, 40) },
  { id: "f5", name: "Naming shortlist.docx", bytes: 240_000, updated: daysFromToday(-2, 8, 15) },
  { id: "f6", name: "Competitor audit.xlsx", bytes: 860_000, updated: daysFromToday(-5, 14, 20) },
  { id: "f7", name: "Tone of voice.pdf", bytes: 1_200_000, updated: daysFromToday(-6, 11, 30) },
  { id: "f8", name: "Store photos.zip", bytes: 186_000_000, updated: daysFromToday(-7, 17, 50) },
  { id: "f9", name: "Colour studies.png", bytes: 5_400_000, updated: daysFromToday(-8, 10, 5) },
  { id: "f10", name: "Trail film reference.mp4", bytes: 96_000_000, updated: daysFromToday(-9, 15, 40) },
  { id: "f11", name: "Customer interviews.xlsx", bytes: 420_000, updated: daysFromToday(-12, 9, 0) },
  { id: "f12", name: "Typeface licences.pdf", bytes: 310_000, updated: daysFromToday(-14, 16, 20) },
  // The studio's shared kickoff deck.
  { id: "f3", name: kickoff.name, bytes: kickoff.bytes, updated: kickoff.updated },
  { id: "f13", name: "Packaging dielines.pdf", bytes: 8_900_000, updated: daysFromToday(-19, 13, 10) },
  { id: "f14", name: "Statement of work.pdf", bytes: 640_000, updated: daysFromToday(-21, 10, 0) },
];

/** A project's files on a phone: each row's ⋯ opens an action Bottom Sheet for that file. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function FileActions({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [list, setList] = useState(brandFiles);
  const [sheet, setSheet] = useState(false);
  const [fileId, setFileId] = useState(brandFiles[0].id);
  const file = brandFiles.find((item) => item.id === fileId)!;
  // Each row's ⋯ button, by file id, and the count line: focus has somewhere to go once a file is deleted.
  const moreRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const countRef = useRef<HTMLElement>(null);

  const remove = () => {
    const index = list.findIndex((item) => item.id === file.id);
    const neighbour = list[index + 1] ?? list[index - 1];
    setList((all) => all.filter((item) => item.id !== file.id));
    // The row that opened the sheet is gone: focus moves to the next row's actions (the count once none is left).
    setTimeout(() => (neighbour ? moreRefs.current[neighbour.id] : countRef.current)?.focus());
    toast({ title: "File deleted", action: { label: "Undo", onClick: () => setList((all) => brandFiles.filter((item) => item.id === file.id || all.includes(item))) } });
  };
  const choose = (id: string) => {
    if (id === "link") {
      void navigator.clipboard?.writeText(`https://zen.dizai.studio/files/${file.id}`).catch(() => undefined);
      toast({ title: "Link copied" });
    } else if (id === "download") toast({ title: "Download started" });
    else remove();
  };

  return (
    <>
      {/* A tab root: the large title folds into the bar as the files scroll under it. */}
      <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Files" largeTitle="Files" />}>
        <Stack gap="xs">
          <Text ref={countRef} role="status" tabIndex={-1} textStyle="Body/Small/Regular" tone="base">{`Brand refresh · ${plural(list.length, "file")}`}</Text>
          {list.length ? (
            // Rows pad 0 at the sides: the screen margin lines their text up with the count.
            <List aria-label="Brand refresh files">
              {list.map((item) => (
                <ListItem key={item.id} title={item.name} caption={`${formatBytes(item.bytes)} · ${formatRelative(item.updated)}`}
                  leading={<FileIcon format={fileIconFormatOf(item.name)} size="xl" />}
                  trailing={<IconButton ref={(button) => { moreRefs.current[item.id] = button; }} appearance="flat" size="md" icon="icon-dots-horizontal-line"
                    aria-label={`More actions for ${item.name}`} aria-haspopup="dialog" onClick={() => { setFileId(item.id); setSheet(true); }} />} />
              ))}
            </List>
          ) : (
            <EmptyState headingLevel={2} icon="icon-folder-line" title="No files yet">Files your team adds to Brand refresh show up here.</EmptyState>
          )}
        </Stack>
      </AppShell>
      {/* Action type: one tap runs the item and closes the sheet; the destructive item comes last. */}
      <BottomSheet inline type="action" open={sheet} onOpenChange={setSheet} title={file.name}
        items={[
          { id: "link", label: "Copy link", icon: "icon-link-01-line" },
          { id: "download", label: "Download", icon: "icon-download-01-line", trailing: formatBytes(file.bytes) },
          { id: "delete", label: "Delete file", icon: "icon-trash-line", destructive: true },
        ]}
        onSelect={(item) => choose(item.id)} />
    </>
  );
}
