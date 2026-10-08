import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { Image } from "../../../components/Image";
import { Container, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { PageHeader } from "../../../components/PageHeader";
import { Pagination } from "../../../components/Pagination";
import { Search } from "../../../components/Search";
import { SkeletonShape, SkeletonText } from "../../../components/Skeleton";
import { Table, TableBadges, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { TopNavigation } from "../../../components/TopNavigation";
import { platformMedia } from "../../PlatformMedia";
import { PlatformPhone } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import {
  TODAY, daysFromToday, formatDate, formatMoney, formatRelative, initials, invoiceStatusTheme, invoices, people, studio, studioMonths,
  type InvoiceStatus, type Person, type PersonId,
} from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./pagination.css";

export const page: PlatformPage = "pagination";

// ——— Helpers —————————————————————————————————————————————————————————————————————————————————

const pageOf = <T,>(items: T[], pageNo: number, size: number) => items.slice((pageNo - 1) * size, pageNo * size);
/** The page that holds row `index` (0-based) at `size` rows a page: a new page size keeps the reader's place. */
const pageHolding = (index: number, size: number) => Math.floor(index / size) + 1;
/** After a page change the list starts from its top again, but only scrolls when that top has left the screen. */
const backToTop = (element: HTMLElement | null) => { if (element && element.getBoundingClientRect().top < 0) element.scrollIntoView({ block: "start" }); };

function PersonAvatar({ person }: { person: Person }) {
  return person.photo
    ? <Avatar size="md" theme="photo" src={person.photo} alt="" />
    : <Avatar size="md" theme={person.theme} alt="">{initials(person.name)}</Avatar>;
}

// ——— Data ————————————————————————————————————————————————————————————————————————————————————

/** Every invoice the studio sent in 2026, newest first: the five in data.ts plus the older ones, which add up to the
 *  same monthly totals as the studio's revenue charts (studioMonths). Numbers run in issue order: 0001–0137 from Jan 1
 *  to Aug 10, then 0138 and 0139 (data.ts), 0140 on Sep 3, 0141–0143 (data.ts). The older ones are all paid, so what is
 *  open is the same everywhere: 0139 overdue and 0142 sent. */
type StudioInvoice = { id: string; number: string; client: string; amount: number; status: InvoiceStatus; issued: Date; due: Date };
const pastClients = ["Phin & Co", "Lumen Bank", "Mekong Freight", "Hanoi Book Fair"];
/** What the studio billed in a month of 2026 (0 = January), and how much of it the data.ts invoices already cover. */
const billedIn = (month: number) => studioMonths.filter((entry) => entry.month.endsWith("2026"))[month].invoiced;
const sharedIn = (month: number) => invoices.filter((invoice) => invoice.status !== "Draft" && invoice.issued.getMonth() === month).reduce((sum, invoice) => sum + invoice.amount, 0);
// Jan – Jul: a month's invoices; Aug: the ones before INV-2026-0138, issued Aug 1 – Aug 10.
const olderMonths = [18, 17, 18, 18, 19, 18, 19, 10].map((count, month) => ({ month, count, lastDay: month === 7 ? 10 : 28, total: billedIn(month) - sharedIn(month) }));
const invoiceOn = (n: number, issued: Date, client: string, amount: number, status: InvoiceStatus): StudioInvoice =>
  ({ id: `inv-${n}`, number: `INV-2026-${String(n).padStart(4, "0")}`, client, amount, status, issued, due: new Date(issued.getTime() + 30 * 24 * 60 * 60 * 1000) });
let invoiceNo = 0;
const olderInvoices: StudioInvoice[] = olderMonths.flatMap(({ month, count, lastDay, total }) => {
  // Milestone invoices are large and retainers small: uneven weights, rounded to whole dollars; the last takes the rest.
  const weights = Array.from({ length: count }, (_, i) => 0.3 + (((i + 1) * 7919 + month * 104729) % 97) / 40);
  const sum = weights.reduce((a, b) => a + b, 0);
  const amounts = weights.map((w) => Math.round((total * w) / sum));
  amounts[count - 1] = Math.round((total - amounts.slice(0, -1).reduce((a, b) => a + b, 0)) * 100) / 100;
  return amounts.map((amount, i) => {
    invoiceNo += 1;
    return invoiceOn(invoiceNo, new Date(2026, month, 1 + Math.floor((i * lastDay) / count), 10, 30), pastClients[(invoiceNo * 3) % pastClients.length], amount, "Paid");
  });
});
// September: INV-2026-0140 and the two in data.ts.
const september = invoiceOn(140, new Date(2026, 8, 3, 10, 30), "Phin & Co", billedIn(8) - sharedIn(8), "Paid");
const studioInvoices: StudioInvoice[] = [...invoices, ...olderInvoices, september].sort((a, b) => b.number.localeCompare(a.number));
const invoiceStatuses: InvoiceStatus[] = ["Draft", "Sent", "Paid", "Overdue"];
const invoiceClients = [...new Set(studioInvoices.map((invoice) => invoice.client))].sort();

const invoiceColumns: TableColumn<StudioInvoice>[] = [
  { id: "number", header: "Invoice", width: "168px", cell: (invoice) => <TableText bold>{invoice.number}</TableText> },
  { id: "client", header: "Client", cell: (invoice) => <TableText>{invoice.client}</TableText> },
  { id: "issued", header: "Issued", width: "136px", cell: (invoice) => <TableText>{formatDate(invoice.issued)}</TableText> },
  { id: "due", header: "Due", width: "136px", cell: (invoice) => <TableText>{formatDate(invoice.due)}</TableText> },
  { id: "amount", header: "Amount", align: "right", width: "136px", cell: (invoice) => <TableText>{formatMoney(invoice.amount, true)}</TableText> },
  { id: "status", header: "Status", width: "120px", cell: (invoice) => <TableBadges><Badge theme={invoiceStatusTheme[invoice.status]} background="subtle">{invoice.status}</Badge></TableBadges> },
];

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

/** Saola Outdoor's moodboard for the brand refresh. */
const moodboard = [...platformMedia.feed, platformMedia.mountainRoad, platformMedia.site[4], platformMedia.site[1], platformMedia.site[2]];
const PHOTOS_PER_PAGE = 4;

/** The workspace activity log: one event every 43 minutes, newest first. */
type LogEvent = { id: string; person: PersonId; action: string; at: Date };
const logPeople: PersonId[] = ["alex", "bao", "chi", "duy", "mai", "minhAnh", "finn", "hana", "gia", "khoa"];
const logActions = [
  "Signed in on a new device", "Exported the Q3 report", "Invited 2 people", "Set up two-step sign-in", "Marked an invoice paid",
  "Archived a project", "Changed the billing email", "Shared a client file", "Removed a guest", "Downloaded 12 files",
  "Created Brand refresh", "Updated the leave policy", "Changed a member's role", "Reset their password", "Renamed a project",
];
const activityLog: LogEvent[] = Array.from({ length: 486 }, (_, i) => ({
  id: `event-${i}`, person: logPeople[(i * 3) % logPeople.length], action: logActions[(i * 7 + 2) % logActions.length],
  at: new Date(TODAY.getTime() - (i * 43 + 4) * 60 * 1000),
}));

/** Hanoi Book Fair 2026 exhibitors as the fair's app lists them: A–Z, 14 a page (a phone list longer than its screen). */
type Genre = "fiction" | "kids" | "comics" | "nonfiction" | "education";
const genres: Record<Genre, { label: string; theme: DockIconTheme }> = {
  fiction: { label: "Fiction", theme: "purple" }, kids: { label: "Children's books", theme: "yellow" }, comics: { label: "Comics", theme: "red" },
  nonfiction: { label: "Non-fiction", theme: "blue" }, education: { label: "Education", theme: "green" },
};
const exhibitorList: Array<[string, Genre]> = [
  ["An Nhiên Books", "fiction"], ["Bamboo Press", "nonfiction"], ["Blue Lantern Comics", "comics"], ["Bông Sen Kids", "kids"],
  ["Cloud Nine Readers", "kids"], ["Cỏ May Editions", "nonfiction"], ["Dragonfly Picture Books", "kids"], ["Firefly Classics", "fiction"],
  ["Gió Mùa Publishing", "education"], ["Green Tea Comics", "comics"], ["Hạt Dẻ Kids", "kids"], ["Harbour Lights Press", "nonfiction"],
  ["Hồ Tây Editions", "fiction"], ["Ink & Rain", "fiction"], ["Jade River Books", "fiction"], ["Kite String Kids", "kids"],
  ["Lá Xanh Readers", "kids"], ["Lotus Garden Press", "nonfiction"], ["Mây Trắng Publishing", "education"], ["Mekong Delta Books", "fiction"],
  ["Moonrise Comics", "comics"], ["Night Market Press", "nonfiction"], ["Northwind Editions", "nonfiction"], ["Ốc Nhỏ Kids", "kids"],
  ["Paper Crane Books", "fiction"], ["Phố Cổ Press", "nonfiction"], ["Pine Hill Publishing", "education"], ["Quill & Lamp", "fiction"],
  ["Rice Paper Editions", "nonfiction"], ["Riverbend Readers", "kids"], ["Sao Mai Books", "fiction"], ["Sông Hồng Publishing", "education"],
  ["Starfruit Comics", "comics"], ["Sương Sớm Press", "nonfiction"], ["Tea House Books", "fiction"], ["Tổ Chim Kids", "kids"],
  ["Tre Xanh Editions", "nonfiction"], ["Turtle Tower Press", "nonfiction"], ["Umbrella Readers", "kids"], ["Vàng Son Publishing", "education"],
  ["Velvet Moth Books", "fiction"], ["Violet Hour Press", "nonfiction"], ["Wandering Heron", "fiction"], ["Whale Song Kids", "kids"],
  ["Xanh Lơ Comics", "comics"], ["Yellow Door Books", "fiction"], ["Yên Bình Readers", "kids"], ["Zephyr Editions", "nonfiction"],
];
const exhibitors = exhibitorList.sort(([a], [b]) => a.localeCompare(b, "vi"))
  .map(([name, genre], index) => ({ id: `exhibitor-${index}`, name, genre: genres[genre], hall: "ABC"[index % 3], stand: (index * 7) % 40 + 1 }));
const EXHIBITORS_PER_PAGE = 14;

// ——— Examples ————————————————————————————————————————————————————————————————————————————————

/** Inline theme under an index table: page size in the Chip, the range beside the arrows; filters survive page turns. */
function InvoiceTableExample() {
  const [status, setStatus] = useState<InvoiceStatus | null>(null);
  const [client, setClient] = useState<string | null>(null);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const topRef = useRef<HTMLElement>(null);
  const statusRef = useRef<HTMLButtonElement>(null);
  const rows = studioInvoices.filter((invoice) => (!status || invoice.status === status) && (!client || invoice.client === client));
  // A new filter starts from page 1; turning pages never touches the filters.
  const filter = (change: () => void) => { change(); setPageNo(1); };
  // Clear filters leaves with the empty state, so focus goes to the first filter, not to <body>.
  const clearFilters = () => { filter(() => { setStatus(null); setClient(null); }); statusRef.current?.focus(); };
  const turn = (next: number) => { setPageNo(next); backToTop(topRef.current); };
  const resize = (size: number) => { setPageSize(size); setPageNo(pageHolding((pageNo - 1) * pageSize, size)); };
  return (
    <Container maxWidth="full">
      <Stack paddingY="xl" gap="xl">
        <PageHeader title="Invoices" description={`Everything ${studio.name} has billed its clients this year.`} />
        <Stack gap="md" ref={topRef}>
          <Stack direction="row" gap="xs" wrap>
            <Chip ref={statusRef} variant="advanced" selected={Boolean(status)} popoverLabel="Status"
              popoverItems={invoiceStatuses.map((value) => ({ id: value, label: value, selected: value === status }))}
              onPopoverSelect={(item) => filter(() => setStatus(item.id as InvoiceStatus))} onClearSelection={() => filter(() => setStatus(null))}>
              {status ?? "Status"}
            </Chip>
            <Chip variant="advanced" selected={Boolean(client)} popoverLabel="Client"
              popoverItems={invoiceClients.map((value) => ({ id: value, label: value, selected: value === client }))}
              onPopoverSelect={(item) => filter(() => setClient(item.id))} onClearSelection={() => filter(() => setClient(null))}>
              {client ?? "Client"}
            </Chip>
          </Stack>
          <Table aria-label="Invoices" columns={invoiceColumns} rows={pageOf(rows, pageNo, pageSize)}
            empty={<EmptyState illustration={false} headingLevel={2} title="No invoices match"
              secondaryAction={{ label: "Clear filters", onClick: clearFilters }}>Try another status or client.</EmptyState>} />
          {rows.length ? (
            <Stack direction="row" justify="end">
              <Pagination theme="inline" aria-label="Invoice pages" page={pageNo} onPageChange={turn}
                total={rows.length} pageSize={pageSize} pageSizeOptions={[10, 25, 50]} onPageSizeChange={resize} />
            </Stack>
          ) : null}
        </Stack>
      </Stack>
    </Container>
  );
}

/** Numbered pages for search results; a new query goes back to page 1, and two pages or fewer show everything. */
function FileSearchExample() {
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
          <EmptyState illustration={false} headingLevel={4} title="No files match"
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

/** Secondary theme with Small items: a quiet selected page beside the photos. */
function MoodboardExample() {
  const titleId = useId();
  const [pageNo, setPageNo] = useState(1);
  const pageCount = Math.ceil(moodboard.length / PHOTOS_PER_PAGE);
  return (
    <Card theme="flat" as="section" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Brand refresh moodboard</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`Saola Outdoor · ${plural(moodboard.length, "photo")} from ${people.gia.name}`}</Text>
        </Stack>
        <Grid columns={2} gap="md">
          {pageOf(moodboard, pageNo, PHOTOS_PER_PAGE).map((photo) => <Image key={photo.src} src={photo.src} alt={photo.alt} ratio="4:3" radius="md" />)}
        </Grid>
        <Stack direction="row" justify="center">
          <Pagination theme="secondary" size="sm" aria-label="Moodboard pages" page={pageNo} onPageChange={setPageNo} pageCount={pageCount} />
        </Stack>
      </Stack>
    </Card>
  );
}

/** Manually theme: the reader types a page size; each page loads from the server, so rows show Skeletons meanwhile. */
function ActivityLogExample() {
  const titleId = useId();
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!loading) return undefined;
    const timer = window.setTimeout(() => setLoading(false), 600);
    return () => window.clearTimeout(timer);
  }, [loading, pageNo, pageSize]);
  const turn = (next: number) => { setPageNo(next); setLoading(true); };
  // Keep the first event on screen when the size changes; cap it at 100 rows a page.
  const resize = (size: number) => { const next = Math.min(size, 100); setPageNo(pageHolding((pageNo - 1) * pageSize, next)); setPageSize(next); setLoading(true); };
  const events = pageOf(activityLog, pageNo, pageSize);
  return (
    // A ListBox: the title in its Header-Slot, the events in its Body-Slot, the pages in its Footer-Slot.
    <ListBox as="section" aria-labelledby={titleId}
      header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Workspace activity</Heading>}
      footer={<Pagination theme="manually" aria-label="Activity pages" page={pageNo} onPageChange={turn}
        total={activityLog.length} pageSize={pageSize} onPageSizeChange={resize} />}>
      <List aria-label="Activity" aria-busy={loading}>
        {loading
          ? events.map((event) => <ListItem key={event.id} leading={<SkeletonShape shape="round" size="md" />} title={<SkeletonText lines={1} />} caption={<SkeletonText lines={1} />} />)
          : events.map((event) => (
            <ListItem key={event.id} leading={<PersonAvatar person={people[event.person]} />} title={event.action}
              caption={`${people[event.person].name} · ${formatRelative(event.at)}`} />
          ))}
      </List>
    </ListBox>
  );
}

/** Phone: numbered pages at the end of a list longer than the screen; a page change scrolls back to the top, so the
    large title opens again over the first row, and focus goes up with it to the count line. */
function MobileExhibitorsExample() {
  const [pageNo, setPageNo] = useState(1);
  const screenRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  const pageCount = Math.ceil(exhibitors.length / EXHIBITORS_PER_PAGE);
  const first = (pageNo - 1) * EXHIBITORS_PER_PAGE + 1;
  const last = Math.min(exhibitors.length, pageNo * EXHIBITORS_PER_PAGE);
  const turn = (next: number) => {
    setPageNo(next);
    screenRef.current?.scrollTo({ top: 0 });
    // The pages scrolled out of view: focus goes up with the screen, so a screen reader reads on into the new rows.
    countRef.current?.focus({ preventScroll: true });
  };
  return (
    <PlatformPhone label="Hanoi Book Fair app" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="alt" title="Exhibitors" largeTitle="Exhibitors" scrollRef={screenRef} />}>
      {/* Body padding lg (20) = the bar's margin; rows pad 0 at the sides, so they line up with the count. */}
      <Stack padding="lg" gap="md">
        <Stack gap="xs">
          <Text ref={countRef} tabIndex={-1} className="px-pagination-focus-target" role="status" textStyle="Body/Small/Regular" tone="base">{`${first}–${last} of ${plural(exhibitors.length, "exhibitor")}`}</Text>
          <List aria-label="Exhibitors">
            {pageOf(exhibitors, pageNo, EXHIBITORS_PER_PAGE).map((exhibitor) => (
              <ListItem key={exhibitor.id} leading={<DockIcon icon="icon-book-open-line" theme={exhibitor.genre.theme} background="subtle" size="md" />}
                title={exhibitor.name} caption={`Hall ${exhibitor.hall} · Stand ${exhibitor.hall}${exhibitor.stand} · ${exhibitor.genre.label}`} />
            ))}
          </List>
        </Stack>
        <Stack direction="row" justify="center">
          <Pagination size="sm" aria-label="Exhibitor pages" page={pageNo} onPageChange={turn} pageCount={pageCount} />
        </Stack>
      </Stack>
    </PlatformPhone>
  );
}

// ——— Page ————————————————————————————————————————————————————————————————————————————————————

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Table footer",
    wide: true,
    screen: true,
    description: "The Inline theme sits under an index table: its Chip picks 10, 25 or 50 rows a page and the range beside the arrows says which rows show. A new filter starts again from page 1, while turning pages keeps the filters.",
    render: () => <InvoiceTableExample />,
    code: `const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(10);
const rows = invoices.filter(matchesFilters);
// A new filter starts from page 1; turning pages keeps the filters.
const filter = (change: () => void) => { change(); setPage(1); };

<Table aria-label="Invoices" columns={columns} rows={rows.slice((page - 1) * pageSize, page * pageSize)} empty={noMatches} />
<Stack direction="row" justify="end">
  <Pagination
    theme="inline"
    aria-label="Invoice pages"
    page={page}
    onPageChange={setPage}
    total={rows.length}
    pageSize={pageSize}
    pageSizeOptions={[10, 25, 50]}
    // A new page size keeps the first visible row on screen.
    onPageSizeChange={(size) => { setPage(Math.floor(((page - 1) * pageSize) / size) + 1); setPageSize(size); }}
  />
</Stack>`,
  },
  {
    title: "Search results",
    description: "Numbered pages under 85 results, with the middle folded into “…”; below 480px only the first, current and last pages stay. A new search goes back to page 1, and a search that fits on one or two pages shows every result with no pagination.",
    render: () => <FileSearchExample />,
    code: `const results = searchFiles(query);
const pageCount = Math.ceil(results.length / 10);
const search = (next: string) => { setQuery(next); setPage(1); };

<Search placeholder="Search files" value={query} onValueChange={search} />
<ListBox>
  <List aria-label="Search results">
    {(pageCount >= 3 ? results.slice((page - 1) * 10, page * 10) : results).map((file) => <ListItem key={file.id} … />)}
  </List>
</ListBox>
{pageCount >= 3 ? (
  <Pagination aria-label="Search result pages" page={page} onPageChange={setPage} pageCount={pageCount} />
) : null}`,
  },
  {
    title: "Mobile list",
    description: "On a phone the pages sit at the end of a list longer than the screen, in the Small size for 32px targets. A page change scrolls the screen back to the top, so the large title opens again over the first row, and focus moves up to the count.",
    render: () => <MobileExhibitorsExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);
const countRef = useRef<HTMLParagraphElement>(null);
const turn = (next: number) => {
  setPage(next);
  screenRef.current?.scrollTo({ top: 0 });
  countRef.current?.focus({ preventScroll: true }); // focus goes up with the scroll
};

<PlatformPhone headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Exhibitors" largeTitle="Exhibitors" scrollRef={screenRef} />}>
  <Stack padding="lg" gap="md">
    <Stack gap="xs">
      <Text ref={countRef} tabIndex={-1} role="status" textStyle="Body/Small/Regular" tone="base">15–28 of 48 exhibitors</Text>
      <List aria-label="Exhibitors">{/* 14 rows a page */}</List>
    </Stack>
    <Stack direction="row" justify="center">
      <Pagination size="sm" aria-label="Exhibitor pages" page={page} onPageChange={turn} pageCount={4} />
    </Stack>
  </Stack>
</PlatformPhone>`
  },
  {
    title: "Photo pages",
    description: "The Secondary theme marks the current page with a Subtle fill instead of a solid one, so it stays quiet under photos. Small items give a 32px target.",
    render: () => <MoodboardExample />,
    code: `<Grid columns={2} gap="md">
  {photos.slice((page - 1) * 4, page * 4).map((photo) => <Image key={photo.src} src={photo.src} alt={photo.alt} ratio="4:3" />)}
</Grid>
<Stack direction="row" justify="center">
  <Pagination theme="secondary" size="sm" aria-label="Moodboard pages" page={page} onPageChange={setPage} pageCount={3} />
</Stack>`,
  },
  {
    title: "Typed page size",
    description: "The Manually theme lets people type how many events a page holds; Enter or leaving the field applies it and the first event stays on screen. Each page loads from the server, so Skeleton rows hold its place.",
    render: () => <ActivityLogExample />,
    code: `const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(6);
// Keep the first event on screen when the size changes.
const resize = (size: number) => { setPage(Math.floor(((page - 1) * pageSize) / size) + 1); setPageSize(size); };

<ListBox as="section" aria-labelledby={titleId}
  header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Workspace activity</Heading>}
  footer={<Pagination theme="manually" aria-label="Activity pages" page={page} onPageChange={setPage}
    total={486} pageSize={pageSize} onPageSizeChange={resize} />}>
  <List aria-label="Activity" aria-busy={loading}>
    {events.map((event) => loading
      ? <ListItem key={event.id} leading={<SkeletonShape shape="round" size="md" />} title={<SkeletonText lines={1} />} />
      : <ListItem key={event.id} leading={<Avatar … />} title={event.action} caption={event.meta} />)}
  </List>
</ListBox>`,
  },
]);
