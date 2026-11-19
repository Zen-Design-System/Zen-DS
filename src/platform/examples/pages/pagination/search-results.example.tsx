import { useRef, useState } from "react";
import { EmptyState, FileIcon, List, ListBox, ListItem, Pagination, Search, Stack, Text, fileIconFormatOf, plural } from "@zen-ds/react";
import { daysFromToday, formatRelative } from "../../data";

const pageOf = <T,>(items: T[], pageNo: number, size: number) => items.slice((pageNo - 1) * size, pageNo * size);
/** After a page change the list starts from its top again, but only scrolls when that top has left the screen. */
const backToTop = (element: HTMLElement | null) => { if (element && element.getBoundingClientRect().top < 0) element.scrollIntoView({ block: "start" }); };

/** The shared drive: every review a project held, one subject (a screen, a flow, a component) per line, most recent first.
 *  Each review leaves its own files: the deck and the notes of the first round, then any specialist review a day before
 *  the end, and a round 2 deck when one was needed. d = deck, n = notes, a = accessibility, c = copy, u = usability. */
type DriveFile = { id: string; name: string; project: string; client: string; updated: Date };
const reviewFiles = {
  d: { name: "design review.pdf", daysBefore: 3, hour: 9 }, n: { name: "review notes.docx", daysBefore: 3, hour: 11 },
  a: { name: "accessibility review.pdf", daysBefore: 1, hour: 15 }, c: { name: "copy review.docx", daysBefore: 1, hour: 14 },
  u: { name: "usability review.pdf", daysBefore: 1, hour: 16 }, 2: { name: "design review round 2.pdf", daysBefore: 0, hour: 8 },
} as const;
type ReviewKind = keyof typeof reviewFiles;
const driveProjects: Array<{ project: string; client: string; lastDaysAgo: number; reviews: Array<[string, string]> }> = [
  { project: "Loyalty app", client: "Phin & Co", lastDaysAgo: 0, reviews: [
    ["Points history", "dn2"], ["Rewards checkout", "dn2a"], ["Store finder", "dn"], ["Member onboarding", "dnc"], ["Order ahead", "dnu"],
    ["Wallet top-up", "dn"], ["Push notification settings", "dc"], ["Referral invite", "dn"], ["Birthday reward", "dc"], ["Receipt scanner", "dnu"],
  ] },
  { project: "Online banking redesign", client: "Lumen Bank", lastDaysAgo: 1, reviews: [
    ["Account overview", "dn2a"], ["Transfers", "dnu"], ["Transfer limits", "dn"], ["Saved recipients", "dn"], ["Card controls", "dna"],
    ["Statements", "dn"], ["Passkey sign-in", "dnu"], ["Spending insights", "dc"],
  ] },
  { project: "Zen design system", client: "Đìzai Studio", lastDaysAgo: 2, reviews: [
    ["Top Navigation", "dn2"], ["Data table", "dna"], ["Metric card", "dn"], ["Date picker", "da"], ["Bottom sheet", "dn"], ["Chat", "dn"],
  ] },
  { project: "Shipment tracking", client: "Mekong Freight", lastDaysAgo: 8, reviews: [
    ["Tracking timeline", "dn"], ["Customs hold states", "dnc"], ["Driver handover", "du"], ["Proof of delivery", "dn"],
  ] },
  { project: "Book Fair 2026 website", client: "Hanoi Book Fair", lastDaysAgo: 12, reviews: [
    ["Exhibitor directory", "dn2"], ["Event schedule", "dnc"], ["Ticketing", "dna"], ["Venue map", "dn"], ["Homepage", "dn2c"],
  ] },
];
// A subject was wrapped up about every 4 days; its files are dated back from that day.
const driveFiles: DriveFile[] = driveProjects.flatMap(({ project, client, lastDaysAgo, reviews }, p) =>
  reviews.flatMap(([subject, kinds], r) => [...kinds].map((kind): DriveFile => {
    const file = reviewFiles[kind as ReviewKind];
    return {
      id: `${p}-${r}-${kind}`, name: `${subject} – ${file.name}`, project, client,
      updated: daysFromToday(-lastDaysAgo - r * 4 - file.daysBefore, file.hour + (p % 2), (r * 13 + p * 7) % 60),
    };
  }))).sort((a, b) => b.updated.getTime() - a.updated.getTime());
const searchDrive = (query: string) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return driveFiles.filter((file) => words.every((word) => `${file.name} ${file.project} ${file.client}`.toLowerCase().includes(word)));
};
const RESULTS_PER_PAGE = 10;

/** Numbered pages for search results; a new query goes back to page 1, and two pages or fewer show everything. */
export default function FileSearch() {
  const [query, setQuery] = useState("review");
  const [pageNo, setPageNo] = useState(1);
  const listRef = useRef<HTMLElement>(null);
  const results = searchDrive(query);
  const pageCount = Math.ceil(results.length / RESULTS_PER_PAGE);
  const paged = pageCount >= 3;
  const shown = paged ? pageOf(results, pageNo, RESULTS_PER_PAGE) : results;
  const searchRef = useRef<HTMLInputElement>(null);
  const search = (next: string) => { setQuery(next); setPageNo(1); };
  // Clear search leaves with the empty state, so focus goes back to the field, not to <body>.
  const clear = () => { search(""); searchRef.current?.focus(); };
  const turn = (next: number) => { setPageNo(next); backToTop(listRef.current); };
  const term = query.trim();
  return (
    <Stack gap="md" ref={listRef}>
      <Search ref={searchRef} placeholder="Search files" value={query} onValueChange={search} />
      {/* The count labels the results under it: xs inside, md from the Search and the pages. */}
      <Stack gap="xs">
        <Text role="status" textStyle="Body/Small/Regular" tone="base">
          {term ? `${plural(results.length, "file")} for “${term}”` : plural(results.length, "file")}
        </Text>
        {results.length ? (
          // A List on the stage sits in a ListBox: its Body-Slot insets the rows (they pad 0).
          <ListBox>
            <List aria-label="Search results">
              {shown.map((file) => (
                // On a narrow screen a long name wraps to a second line instead of being cut.
                <ListItem key={file.id} leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
                  title={file.name} titleLines={2} caption={`${file.project} · ${formatRelative(file.updated)}`} />
              ))}
            </List>
          </ListBox>
        ) : (
          <EmptyState size="sm" headingLevel={4} icon="icon-search-medium-line" title="No files match"
            secondaryAction={{ label: "Clear search", onClick: clear }}>
            Check the spelling, or search by project or client name.
          </EmptyState>
        )}
      </Stack>
      {paged ? (
        <Stack direction="row" justify="center">
          <Pagination aria-label="Search result pages" page={pageNo} onPageChange={turn} pageCount={pageCount} />
        </Stack>
      ) : null}
    </Stack>
  );
}
