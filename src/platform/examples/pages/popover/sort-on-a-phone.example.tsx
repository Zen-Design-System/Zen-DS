import { useState, type RefObject } from "react";
import { AppShell, BottomSheet, Chip, FileIcon, Icon, List, ListItem, Stack, Text, TopNavigation, fileIconFormatOf, plural } from "@zen-ds/react";
import { daysFromToday, files, formatBytes, formatRelative, type StudioFile } from "../../data";

type SortId = "updated" | "name" | "size";
const sortOptions: { id: SortId; label: string; caption: string }[] = [
  { id: "updated", label: "Last updated", caption: "Newest first" },
  { id: "name", label: "Name", caption: "A to Z" },
  { id: "size", label: "Size", caption: "Largest first" },
];
const sortFiles = (list: StudioFile[], sort: SortId) => [...list].sort((a, b) =>
  sort === "name" ? a.name.localeCompare(b.name) : sort === "size" ? b.bytes - a.bytes : b.updated.getTime() - a.updated.getTime());

// The studio's recent files and the rest of the month's: on a phone the list runs past one screen, as in real use.
const phoneFiles: StudioFile[] = [
  ...files,
  { id: "f7", name: "Transfer flow v4.fig", bytes: 24_600_000, owner: "ava", project: "lumen-banking", updated: daysFromToday(0, 9, 5) },
  { id: "f8", name: "Points expiry copy.docx", bytes: 64_000, owner: "linh", project: "phin-loyalty", updated: daysFromToday(-1, 11, 30) },
  { id: "f9", name: "Customs hold states.pdf", bytes: 980_000, owner: "duy", project: "mekong-tracking", updated: daysFromToday(-2, 15, 10) },
  { id: "f10", name: "Outdoor range moodboard.png", bytes: 8_200_000, owner: "gia", project: "saola-brand", updated: daysFromToday(-5, 10, 0) },
  { id: "f11", name: "Transfers usability notes.docx", bytes: 210_000, owner: "ava", project: "lumen-banking", updated: daysFromToday(-6, 17, 15) },
  { id: "f12", name: "Zen tokens export.json", bytes: 412_000, owner: "finn", project: "zen-ds", updated: daysFromToday(-8, 9, 50) },
  { id: "f13", name: "Book Fair 2026 – final invoices.xlsx", bytes: 156_000, owner: "mai", project: "bookfair-site", updated: daysFromToday(-12, 14, 0) },
  { id: "f14", name: "Tier badges.svg", bytes: 42_000, owner: "gia", project: "phin-loyalty", updated: daysFromToday(-14, 16, 30) },
  { id: "f15", name: "Shipment tracking – app map.pdf", bytes: 3_100_000, owner: "duy", project: "mekong-tracking", updated: daysFromToday(-23, 10, 15) },
];

/** On a phone the same Sort chip opens a Bottom Sheet instead of a Popover: full-width rows within thumb reach. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneSort({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const [sort, setSort] = useState<SortId>("updated");
  const [sheet, setSheet] = useState(false);
  const current = sortOptions.find((option) => option.id === sort)!;
  return (
    <>
      {/* A tab root: the large title folds into the bar as the list scrolls under it. */}
      <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Files" largeTitle="Files" />}>
        <Stack gap="sm">
          <Stack direction="row" align="center" justify="between" gap="md">
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{plural(phoneFiles.length, "file")}</Text>
            {/* The chip opens a sheet, and says so to screen readers (aria-haspopup="dialog", aria-expanded while open). */}
            <Chip variant="advanced" dropdown leading="icon-switch-vertical-01-line" aria-haspopup="dialog" aria-expanded={sheet}
              onClick={() => setSheet(true)}>{current.label}</Chip>
          </Stack>
          {/* Rows pad 0 at the sides: the screen margin lines them up with the bar above. */}
          <List aria-label="Files">
            {sortFiles(phoneFiles, sort).map((file) => (
              <ListItem key={file.id} title={file.name} caption={`${formatBytes(file.bytes)} · ${formatRelative(file.updated)}`}
                leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} />
            ))}
          </List>
        </Stack>
      </AppShell>
      <BottomSheet inline open={sheet} onOpenChange={setSheet} title="Sort by">
        <List aria-label="Sort by">
          {sortOptions.map((option) => (
            <ListItem key={option.id} title={option.label} caption={option.caption} selected={option.id === sort}
              trailing={option.id === sort ? <Icon name="icon-check-line" size="base" decorative /> : undefined}
              onClick={() => { setSort(option.id); setSheet(false); }} />
          ))}
        </List>
      </BottomSheet>
    </>
  );
}
