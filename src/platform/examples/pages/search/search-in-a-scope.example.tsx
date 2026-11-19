import { useRef, useState, type CSSProperties } from "react";
import { Box, EmptyState, FileIcon, Heading, List, ListBox, ListItem, Search, Stack, Text, fileIconFormatOf, plural } from "@zen-ds/react";
import { daysFromToday, files, formatBytes, formatRelative, projectById, studio, type PersonId } from "../../data";

/** True when the query is empty or any field contains it (case-insensitive). */
const matches = (query: string, ...fields: string[]) => {
  const q = query.trim().toLowerCase();
  return !q || fields.some((field) => field.toLowerCase().includes(q));
};

type ClientFile = { id: string; name: string; client: string; project: string; bytes: number; owner: PersonId; updated: Date };
// The shared client files plus the ones only this page needs, most recently updated first.
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
const fileClients = ["Phin & Co", "Lumen Bank", "Mekong Freight", "Hanoi Book Fair", "Saola Outdoor"];
const scopeOptions = [
  { value: "all", label: "All clients", caption: plural(clientFiles.length, "file") },
  ...fileClients.map((client) => ({ value: client, label: client, caption: plural(clientFiles.filter((file) => file.client === client).length, "file") })),
];
/** A long result list scrolls inside its ListBox: five whole rows, framed by Pale rules that run to the box edge (the
 *  scroller spans the body's side padding and pads it back); the bottom rule clears the box's rounded corners. */
const resultsScroller: CSSProperties = {
  boxSizing: "content-box",
  maxHeight: "calc(5 * (var(--zen-image-size-medium, 40px) + 2 * var(--zen-spacing-padding-small, 12px)) + 4 * var(--zen-spacing-gap-3-xsmall, 2px))",
  marginInline: "calc(-1 * var(--zen-card-padding-medium, 24px))",
  marginBlockEnd: "calc(var(--zen-corner-radius-2-xlarge, 24px) - var(--zen-list-container-vertical-padding, 12px))",
  paddingInline: "var(--zen-card-padding-medium, 24px)",
  borderBlock: "1px solid var(--zen-color-border-neutral-pale-default)",
};

/** The Filter-Dropdown theme keeps the scope inside the field; a scoped search that finds nothing offers all clients. */
export default function ClientFiles() {
  const [scope, setScope] = useState("Phin & Co");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const all = scope === "all";
  const rows = clientFiles.filter((file) => (all || file.client === scope) && matches(query, file.name, file.project));
  const widen = () => { setScope("all"); searchRef.current?.focus(); };
  const clear = () => { setQuery(""); searchRef.current?.focus(); };
  return (
    // A ListBox: the title, the scoped search and its count in its Header-Slot; the results (or the Empty State) in its Body-Slot.
    <Stack><ListBox width="fill" maxWidth={440} alignSelf="center"
      header={<>
        <Heading level={4} textStyle="Heading/Subheading">Client files</Heading>
        <Stack gap="xs">
          {/* The picked option replaces "All clients" in the trailing slot. */}
          <Search ref={searchRef} theme="filter-dropdown" placeholder="Search files" value={query} onValueChange={setQuery}
            filterActionLabel="Search in" filterOptions={scopeOptions} filterValue={scope} onFilterChange={setScope} />
          <Text role="status" textStyle="Body/Small/Regular" tone="base">{all ? plural(rows.length, "file") : `${plural(rows.length, "file")} from ${scope}`}</Text>
        </Stack>
      </>}>
      {rows.length ? (
        <Box scroll="y" style={resultsScroller} role="region" aria-label="File results" tabIndex={0}>
          <List aria-label="Files">
            {rows.map((file) => (
              // The file name is the result: it may wrap to a second line instead of being cut.
              <ListItem key={file.id} title={file.name} titleLines={2}
                caption={`${all ? `${file.client} · ` : ""}${formatBytes(file.bytes)} · ${formatRelative(file.updated)}`}
                leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} />
            ))}
          </List>
        </Box>
      ) : (
        <EmptyState size="sm" headingLevel={5} icon="icon-search-medium-line" title={`No files match “${query.trim()}”`}
          secondaryAction={all ? { label: "Clear search", onClick: clear } : { label: "Search all clients", onClick: widen }}>
          {all ? "Try part of the file name or the project." : `Nothing from ${scope} matches. Files of other clients might.`}
        </EmptyState>
      )}
    </ListBox></Stack>
  );
}
