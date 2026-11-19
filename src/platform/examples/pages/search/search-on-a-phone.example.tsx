import { useRef, useState, type RefObject } from "react";
import { AppShell, BottomSheet, Button, EmptyState, FileIcon, Icon, List, ListItem, Search, Stack, Text, TopNavigation, fileIconFormatOf, plural } from "@zen-ds/react";
import { daysFromToday, files, formatRelative, projectById, studio, type PersonId } from "../../data";

/** True when the query is empty or any field contains it (case-insensitive). */
const matches = (query: string, ...fields: string[]) => {
  const q = query.trim().toLowerCase();
  return !q || fields.some((field) => field.toLowerCase().includes(q));
};

type ClientFile = { id: string; name: string; client: string; project: string; bytes: number; owner: PersonId; updated: Date };
// The shared client files plus a few more, most recently updated first.
const clientFiles: ClientFile[] = ([
  ...files.filter((file) => projectById(file.project).client !== studio.name).map((file) => {
    const project = projectById(file.project);
    return { id: file.id, name: file.name, client: project.client, project: project.name, bytes: file.bytes, owner: file.owner, updated: file.updated };
  }),
  { id: "x1", name: "Android build notes.docx", client: "Phin & Co", project: "Loyalty app", bytes: 52_000, owner: "em", updated: daysFromToday(-1, 17, 20) },
  { id: "x2", name: "Loyalty app sitemap.pdf", client: "Phin & Co", project: "Loyalty app", bytes: 640_000, owner: "duy", updated: daysFromToday(-6, 15, 10) },
  { id: "x3", name: "Transfer flow v4.fig", client: "Lumen Bank", project: "Online banking redesign", bytes: 24_600_000, owner: "alex", updated: daysFromToday(0, 9, 5) },
  { id: "x4", name: "Lumen Bank SOW v3.pdf", client: "Lumen Bank", project: "Online banking redesign", bytes: 410_000, owner: "hana", updated: daysFromToday(0, 9, 12) },
  { id: "x5", name: "Customs hold states.fig", client: "Mekong Freight", project: "Shipment tracking", bytes: 9_800_000, owner: "duy", updated: daysFromToday(-3, 11, 30) },
  { id: "x6", name: "Shipment tracking brief.pdf", client: "Mekong Freight", project: "Shipment tracking", bytes: 780_000, owner: "duy", updated: daysFromToday(-12, 10, 0) },
  { id: "x7", name: "Exhibitor list.xlsx", client: "Hanoi Book Fair", project: "Book Fair 2026 website", bytes: 310_000, owner: "linh", updated: daysFromToday(-24, 14, 0) },
  { id: "x8", name: "Outdoor range moodboard.png", client: "Saola Outdoor", project: "Brand refresh", bytes: 6_200_000, owner: "gia", updated: daysFromToday(-2, 13, 15) },
] satisfies ClientFile[]).sort((a, b) => b.updated.getTime() - a.updated.getTime());

type FileKind = "all" | "figma" | "pdf" | "sheet" | "slides" | "media" | "doc";
const fileKinds: { id: FileKind; label: string }[] = [
  { id: "all", label: "All types" },
  { id: "figma", label: "Figma files" },
  { id: "pdf", label: "PDFs" },
  { id: "sheet", label: "Spreadsheets" },
  { id: "slides", label: "Presentations" },
  { id: "media", label: "Images and video" },
  { id: "doc", label: "Documents" },
];
const kindOf = (name: string): FileKind => {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "fig" ? "figma" : ext === "pdf" ? "pdf" : ext === "xlsx" ? "sheet" : ext === "key" ? "slides" : ext === "mp4" || ext === "png" ? "media" : "doc";
};

// scrollRef: what scrolls the screen, so the large title and the Search fold away as it scrolls. "window" in your app.
export default function PhoneFiles({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<FileKind>("all");
  const [sheet, setSheet] = useState(false);
  const rows = clientFiles.filter((file) => (kind === "all" || kindOf(file.name) === kind) && matches(query, file.name, file.client, file.project));
  const kindLabel = fileKinds.find((item) => item.id === kind)!.label;
  // "Show all types" and "Clear filters" remove themselves: focus moves to the Search.
  const toSearch = () => searchRef.current?.focus();
  const reset = () => { toSearch(); setQuery(""); setKind("all"); };
  return (
    <>
      {/* A tab root: the large title and the Search fold away as the list scrolls. Folded, the Search waits as a
          top-right action (searchAction) that scrolls back up and focuses the field. */}
      <AppShell
        topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Files" largeTitle="Files" controlBar={
          // The filter icon opens a Bottom Sheet: on a phone a sheet replaces the Popover. The icon says so to screen
          // readers (aria-haspopup="dialog", aria-expanded while the sheet is open).
          // On a phone the Search is a pill (shape="rounded"): recommended for mobile, not required.
          <Search ref={searchRef} shape="rounded" theme="filter-icon" placeholder="Search files" value={query} onValueChange={setQuery}
            filterActionLabel="Filter by type" filterHasPopup="dialog" filterExpanded={sheet} onFilterClick={() => setSheet(true)} />
        } searchAction={{ label: "Search files" }} />}>
        <Stack gap="xs">
          <Stack direction="row" gap="sm" align="center" justify="between">
            <Text role="status" textStyle="Body/Small/Regular" tone="base">{kind === "all" ? plural(rows.length, "file") : `${plural(rows.length, "file")} · ${kindLabel}`}</Text>
            {kind !== "all" ? <Button level="tertiary" onClick={() => { toSearch(); setKind("all"); }}>Show all types</Button> : null}
          </Stack>
          {rows.length ? (
            // Rows pad 0 at the sides: the screen margin lines their text up with the count.
            <List aria-label="Files">
              {rows.map((file) => (
                <ListItem key={file.id} title={file.name} titleLines={2} caption={`${file.client} · ${formatRelative(file.updated)}`}
                  leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} />
              ))}
            </List>
          ) : (
            <EmptyState headingLevel={2} icon="icon-search-medium-line" title={query.trim() ? `No files match “${query.trim()}”` : `No ${kindLabel.toLowerCase()} yet`}
              secondaryAction={{ label: "Clear filters", onClick: reset }}>
              Search by file name, client or project.
            </EmptyState>
          )}
        </Stack>
      </AppShell>
      <BottomSheet inline open={sheet} onOpenChange={setSheet} title="File type">
        <List aria-label="File type">
          {fileKinds.map((item) => (
            <ListItem key={item.id} title={item.label} selected={item.id === kind}
              trailing={item.id === kind ? <Icon name="icon-check-line" size="base" decorative /> : undefined}
              onClick={() => { setKind(item.id); setSheet(false); }} />
          ))}
        </List>
      </BottomSheet>
    </>
  );
}
