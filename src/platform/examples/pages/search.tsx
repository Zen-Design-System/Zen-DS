/* Search examples (rebuild brief 2026-09-30): finding things in Đìzai Studio's Zen workspace — the studio directory,
   the invoice list, client files, projects, files on a phone and client contacts during an import. Each card teaches
   one Search decision. */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Avatar, type AvatarTheme } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { BottomSheet } from "../../../components/BottomSheet";
import { Button } from "../../../components/Button";
import { Chip } from "../../../components/Chip";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { Icon } from "../../../components/Icon";
import { InlineMessage } from "../../../components/InlineMessage";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { ProgressBar } from "../../../components/Progress";
import { Search } from "../../../components/Search";
import { Table, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { PlatformPhone } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import {
  daysFromToday, files, formatBytes, formatDate, formatMoney, formatRelative, initials, invoiceStatusTheme, invoices, people, peopleList,
  projectById, projectStatusTheme, projects, studio, type Invoice, type InvoiceStatus, type Person, type PersonId,
} from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./search.css";

export const page: PlatformPage = "search";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };
/** True when the query is empty or any field contains it (case-insensitive). */
const matches = (query: string, ...fields: string[]) => {
  const q = query.trim().toLowerCase();
  return !q || fields.some((field) => field.toLowerCase().includes(q));
};

// ——— 1. Filter as you type ————————————————————————————————————————————————————————————————————————
function DirectoryExample() {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const rows = peopleList.filter((person) => matches(query, person.name, person.role, person.team, person.location));
  const clear = () => { setQuery(""); searchRef.current?.focus(); };
  return (
    // A ListBox: the title, the search and its count in its Header-Slot; the results (or the Empty State) in its Body-Slot.
    <ListBox className="px-search-card"
      header={<>
        <Heading level={4} textStyle="Heading/Subheading">Studio directory</Heading>
        <Stack gap="xs">
          <Search ref={searchRef} placeholder="Search people" value={query} onValueChange={setQuery} />
          <Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "person", "people")}</Text>
        </Stack>
      </>}>
      {rows.length ? (
        // The list scrolls inside the box; the region takes focus so the keyboard can scroll it too.
        <Box className="px-search-scroll" role="region" aria-label="Directory results" tabIndex={0}>
          <List aria-label="People">
            {rows.map((person) => (
              <ListItem key={person.id} title={person.name} caption={`${person.role} · ${person.location}`}
                leading={<Avatar size="md" {...avatarOf(person)} />} />
            ))}
          </List>
        </Box>
      ) : (
        <EmptyState illustration={false} headingLevel={5} title={`No people match “${query.trim()}”`}
          secondaryAction={{ label: "Clear search", onClick: clear }}>
          Try a first name, a team such as Design, or a city.
        </EmptyState>
      )}
    </ListBox>
  );
}

// ——— 2. Table toolbar ——————————————————————————————————————————————————————————————————————————————
// The shared invoices plus three older paid ones (the Date Picker page lists the same eight), newest first.
type InvoiceRow = Invoice & { projectName: string };
const olderInvoices: Invoice[] = [
  { id: "i140", number: "INV-2026-0140", client: "Phin & Co", project: "phin-loyalty", amount: 18750, status: "Paid", issued: daysFromToday(-35), due: daysFromToday(-5) },
  { id: "i137", number: "INV-2026-0137", client: "Lumen Bank", project: "lumen-banking", amount: 17810, status: "Paid", issued: daysFromToday(-62), due: daysFromToday(-32) },
  { id: "i136", number: "INV-2026-0136", client: "Hanoi Book Fair", project: "bookfair-site", amount: 18279.5, status: "Paid", issued: daysFromToday(-80), due: daysFromToday(-50) },
];
const invoiceRows: InvoiceRow[] = [...invoices, ...olderInvoices]
  .sort((a, b) => b.issued.getTime() - a.issued.getTime())
  .map((invoice) => ({ ...invoice, projectName: projectById(invoice.project).name }));
const invoiceStatuses: InvoiceStatus[] = ["Draft", "Sent", "Paid", "Overdue"];
const invoiceClients = [...new Set(invoiceRows.map((row) => row.client))].sort();
const invoiceColumns: TableColumn<InvoiceRow>[] = [
  { id: "number", header: "Invoice", cell: (row) => <TableText bold caption={row.projectName}>{row.number}</TableText> },
  { id: "client", header: "Client", width: "170px", cell: (row) => <TableText>{row.client}</TableText> },
  { id: "issued", header: "Issued", width: "140px", cell: (row) => <TableText>{formatDate(row.issued)}</TableText> },
  { id: "due", header: "Due", width: "140px", cell: (row) => <TableText>{formatDate(row.due)}</TableText> },
  { id: "amount", header: "Amount", align: "right", width: "140px", cell: (row) => <TableText>{formatMoney(row.amount, true)}</TableText> },
  { id: "status", header: "Status", width: "120px", cell: (row) => <Badge theme={invoiceStatusTheme[row.status]} background="subtle">{row.status}</Badge> },
];

function InvoiceToolbarExample() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | null>(null);
  const [client, setClient] = useState<string | null>(null);
  const rows = invoiceRows.filter((row) => matches(query, row.number, row.client, row.projectName)
    && (!status || row.status === status) && (!client || row.client === client));
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const narrowed = Boolean(query.trim() || status || client);
  const searchRef = useRef<HTMLInputElement>(null);
  // Clear all removes itself: focus moves to the search, at the start of the toolbar.
  const clearAll = () => { searchRef.current?.focus(); setQuery(""); setStatus(null); setClient(null); };
  return (
    // The table is the content here, not a widget: it lies on the page under its toolbar, with no container.
    <Stack gap="md">
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        {/* Search grows up to 320px; the filters sit beside it and wrap under it when the toolbar is narrow. */}
        <Stack direction="row" gap="xs" align="center" wrap className="px-search-toolbar">
          <Box className="px-search-toolbar-field">
            <Search ref={searchRef} placeholder="Search invoices" value={query} onValueChange={setQuery} />
          </Box>
          <Stack direction="row" gap="xs" align="center" wrap role="group" aria-label="Filters">
            <Chip variant="advanced" selected={Boolean(status)} popoverLabel="Status"
              popoverItems={invoiceStatuses.map((value) => ({ id: value, label: value, selected: value === status }))}
              onPopoverSelect={(item) => setStatus(item.id as InvoiceStatus)} onClearSelection={() => setStatus(null)}>
              {status ?? "Status"}
            </Chip>
            <Chip variant="advanced" selected={Boolean(client)} popoverLabel="Client"
              popoverItems={invoiceClients.map((value) => ({ id: value, label: value, selected: value === client }))}
              onPopoverSelect={(item) => setClient(item.id)} onClearSelection={() => setClient(null)}>
              {client ?? "Client"}
            </Chip>
            {narrowed ? <Button level="tertiary" onClick={clearAll}>Clear all</Button> : null}
          </Stack>
        </Stack>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{`${plural(rows.length, "invoice")} · ${formatMoney(total, true)}`}</Text>
      </Stack>
      <Table aria-label="Invoices" columns={invoiceColumns} rows={rows}
        empty={<EmptyState illustration={false} headingLevel={4} title="No invoices match" secondaryAction={{ label: "Clear filters", onClick: clearAll }}>
          Try another invoice number, client or status.
        </EmptyState>} />
    </Stack>
  );
}

// ——— 3. Search in a scope ——————————————————————————————————————————————————————————————————————————
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

function ClientFilesExample() {
  const [scope, setScope] = useState("Phin & Co");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const all = scope === "all";
  const rows = clientFiles.filter((file) => (all || file.client === scope) && matches(query, file.name, file.project));
  const widen = () => { setScope("all"); searchRef.current?.focus(); };
  const clear = () => { setQuery(""); searchRef.current?.focus(); };
  return (
    // A ListBox: the title, the scoped search and its count in its Header-Slot; the results (or the Empty State) in its Body-Slot.
    <ListBox className="px-search-card"
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
        <Box className="px-search-scroll" role="region" aria-label="File results" tabIndex={0}>
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
        <EmptyState illustration={false} headingLevel={5} title={`No files match “${query.trim()}”`}
          secondaryAction={all ? { label: "Clear search", onClick: clear } : { label: "Search all clients", onClick: widen }}>
          {all ? "Try part of the file name or the project." : `Nothing from ${scope} matches. Files of other clients might.`}
        </EmptyState>
      )}
    </ListBox>
  );
}

// ——— 4. Jump with a shortcut ———————————————————————————————————————————————————————————————————————
function ProjectJumpExample() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState("lumen-banking");
  const [recent, setRecent] = useState(["lumen-banking", "phin-loyalty", "zen-ds"]);
  const searchRef = useRef<HTMLInputElement>(null);
  const q = query.trim();
  // An empty field shows recent projects; a query searches all of them.
  const shown = q ? projects.filter((project) => matches(q, project.name, project.client)) : recent.map(projectById);
  const open = (id: string) => {
    setOpenId(id);
    setRecent((list) => [id, ...list.filter((item) => item !== id)].slice(0, 3));
    setQuery("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && q && shown[0]) { event.preventDefault(); open(shown[0].id); }
    if (event.key === "Escape" && query) { event.preventDefault(); setQuery(""); }
  };
  const project = projectById(openId);
  const lead = people[project.lead];
  return (
    // The split follows the card's own width (a container query): two panes side by side, stacked when narrow.
    <Box surface="surface" radius="2xl" className="px-search-split">
      <Grid columns="minmax(0, 320px) minmax(0, 1fr)" gap="none" className="px-search-split-grid">
        {/* Both panes keep the surface's inset (Padding/XLarge = Card medium). */}
        <Stack gap="md" padding="xl" className="px-search-pane">
          <Search ref={searchRef} shortcut="j" placeholder="Jump to a project" value={query} onValueChange={setQuery} onKeyDown={onKeyDown} />
          {/* The rows open a project; the label sits xs above them (the rows pad 12px above themselves). */}
          <Stack gap="xs">
            <Text role="status" textStyle="Body/Small/Bold" tone="base">{q ? plural(shown.length, "project") : "Recent"}</Text>
            {shown.length ? (
              <List aria-label={q ? "Matching projects" : "Recent projects"}>
                {shown.map((item) => (
                  <ListItem key={item.id} title={item.name} caption={item.client} selected={item.id === openId} onClick={() => open(item.id)}
                    leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" />} />
                ))}
              </List>
            ) : (
              <EmptyState illustration={false} headingLevel={4} title={`No projects match “${q}”`}
                secondaryAction={{ label: "Clear search", onClick: () => { setQuery(""); searchRef.current?.focus(); } }}>
                Search by project or client name.
              </EmptyState>
            )}
          </Stack>
        </Stack>
        <Stack gap="md" padding="xl">
          <Stack direction="row" gap="md" align="center">
            <DockIcon size="lg" icon={project.icon} theme={project.theme} background="subtle" />
            <Stack gap="xs">
              <Heading level={4} textStyle="Heading/Subheading">{project.name}</Heading>
              <Text textStyle="Body/Small/Regular" tone="base">{project.client}</Text>
            </Stack>
          </Stack>
          <DescriptionList items={[
            { term: "Status", description: <Badge theme={projectStatusTheme[project.status]} background="subtle">{project.status}</Badge> },
            { term: "Lead", description: lead.name },
            { term: "Due", description: formatDate(project.due) },
            { term: "Budget", description: project.budget ? `${formatMoney(project.spent)} of ${formatMoney(project.budget)}` : "Internal project" },
            { term: "Progress", description: <ProgressBar value={project.progress} label aria-label={`${project.name} progress`} /> },
          ]} />
        </Stack>
      </Grid>
    </Box>
  );
}

// ——— 5. Search on a phone ——————————————————————————————————————————————————————————————————————————
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

function PhoneFilesExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<FileKind>("all");
  const [sheet, setSheet] = useState(false);
  const rows = clientFiles.filter((file) => (kind === "all" || kindOf(file.name) === kind) && matches(query, file.name, file.client, file.project));
  const kindLabel = fileKinds.find((item) => item.id === kind)!.label;
  // "Show all types" and "Clear filters" remove themselves: focus moves to the filter button in the Search.
  const toFilter = () => searchRef.current?.closest(".zen-search")?.querySelector<HTMLElement>('button[aria-label="Filter by type"]')?.focus();
  const reset = () => { toFilter(); setQuery(""); setKind("all"); };
  // Folded, the Search waits as a top-right action: it scrolls back up and focuses the field once it is back (no longer
  // inert under the bar).
  const openSearch = () => {
    screenRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    const started = performance.now();
    const focusWhenBack = () => {
      const field = searchRef.current;
      if (field && !field.closest("[inert]")) field.focus({ preventScroll: true });
      else if (performance.now() - started < 1500) requestAnimationFrame(focusWhenBack);
    };
    requestAnimationFrame(focusWhenBack);
  };
  return (
    // The header floats over the screen (headerOverlay): the large title and the Search fold away as the list scrolls.
    <PlatformPhone label="Files" headerOverlay screenRef={screenRef} header={
      <TopNavigation type="alt" title="Files" largeTitle="Files" scrollRef={screenRef} controlBar={
        // The filter icon opens a Bottom Sheet: on a phone a sheet replaces the Popover. The icon says so to screen
        // readers (aria-haspopup="dialog", aria-expanded while the sheet is open).
        <Search ref={searchRef} theme="filter-icon" placeholder="Search files" value={query} onValueChange={setQuery}
          filterActionLabel="Filter by type" filterHasPopup="dialog" filterExpanded={sheet} onFilterClick={() => setSheet(true)} />
      } searchAction={{ label: "Search files", onClick: openSearch }} />
    }>
      <Stack gap="xs" paddingY="xs">
        <Stack direction="row" gap="sm" align="center" justify="between" paddingX="lg">
          <Text role="status" textStyle="Body/Small/Regular" tone="base">{kind === "all" ? plural(rows.length, "file") : `${plural(rows.length, "file")} · ${kindLabel}`}</Text>
          {kind !== "all" ? <Button level="tertiary" onClick={() => { toFilter(); setKind("all"); }}>Show all types</Button> : null}
        </Stack>
        {rows.length ? (
          // Rows pad 0 at the sides: the screen margin (lg, 20px) lines their text up with the count.
          <Box paddingX="lg">
            <List aria-label="Files">
              {rows.map((file) => (
                <ListItem key={file.id} title={file.name} titleLines={2} caption={`${file.client} · ${formatRelative(file.updated)}`}
                  leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} />
              ))}
            </List>
          </Box>
        ) : (
          <EmptyState illustration={false} headingLevel={2} title={query.trim() ? `No files match “${query.trim()}”` : `No ${kindLabel.toLowerCase()} yet`}
            secondaryAction={{ label: "Clear filters", onClick: reset }}>
            Search by file name, client or project.
          </EmptyState>
        )}
      </Stack>
      <BottomSheet inline open={sheet} onOpenChange={setSheet} title="File type">
        <List aria-label="File type">
          {fileKinds.map((item) => (
            <ListItem key={item.id} title={item.label} selected={item.id === kind}
              trailing={item.id === kind ? <Icon name="icon-check-line" size="base" decorative /> : undefined}
              onClick={() => { setKind(item.id); setSheet(false); }} />
          ))}
        </List>
      </BottomSheet>
    </PlatformPhone>
  );
}

// ——— 6. Search during an import ————————————————————————————————————————————————————————————————————
type Contact = { id: string; name: string; role: string; company: string; theme: Exclude<AvatarTheme, "photo" | "accent"> };
const savedContacts: Contact[] = [
  { id: "c1", name: "Tran Minh Thu", role: "Head of Marketing", company: "Phin & Co", theme: "pink" },
  { id: "c2", name: "Nguyen Hoang Long", role: "Product Owner", company: "Lumen Bank", theme: "blue" },
  { id: "c3", name: "Vu Thanh Mai", role: "Programme Lead", company: "Hanoi Book Fair", theme: "purple" },
  { id: "c4", name: "Le Thi Hoa", role: "Operations Director", company: "Mekong Freight", theme: "violet" },
];
const incomingContacts: Contact[] = [
  { id: "m1", name: "Do Van Hung", role: "Customs Manager", company: "Mekong Freight", theme: "indigo" },
  { id: "m2", name: "Hoang Thi Lan", role: "Logistics Analyst", company: "Mekong Freight", theme: "plum" },
  { id: "m3", name: "Bui Minh Quan", role: "IT Manager", company: "Mekong Freight", theme: "brown" },
  { id: "m4", name: "Ngo Thanh Truc", role: "Customer Service Lead", company: "Mekong Freight", theme: "crimson" },
  { id: "m5", name: "Dang Quoc Viet", role: "Warehouse Supervisor", company: "Mekong Freight", theme: "blue" },
  { id: "m6", name: "Ly Ngoc Anh", role: "Finance Controller", company: "Mekong Freight", theme: "red" },
];

function ContactImportExample() {
  const { toast } = useToast();
  const headingId = useId();
  const [imported, setImported] = useState(2);
  const [importing, setImporting] = useState(true);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const backToSearch = useRef(false);
  const cardRef = useRef<HTMLElement>(null);
  // Cancel import and Import contacts each remove their own button: focus moves to the search (enabled again) or
  // to Cancel import, not to the page.
  useEffect(() => {
    if (!backToSearch.current) return;
    backToSearch.current = false;
    if (importing) cardRef.current?.querySelector<HTMLElement>(".zen-inline-message button")?.focus();
    else searchRef.current?.focus();
  }, [importing]);
  // One contact arrives every 1.5 seconds; when the last one is in, search comes back and a toast confirms.
  useEffect(() => {
    if (!importing) return undefined;
    const timer = window.setTimeout(() => {
      const next = imported + 1;
      setImported(next);
      if (next >= incomingContacts.length) {
        setImporting(false);
        toast({ type: "positive", title: "Contacts imported", children: `${plural(incomingContacts.length, "contact")} from Mekong Freight` });
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [importing, imported, toast]);
  const cancel = () => { backToSearch.current = true; setImporting(false); toast({ title: "Import cancelled", children: imported ? `${plural(imported, "contact")} kept` : undefined }); };
  const restart = () => { backToSearch.current = true; setQuery(""); setImported(0); setImporting(true); };
  const contacts = [...incomingContacts.slice(0, imported).reverse(), ...savedContacts];
  const rows = contacts.filter((contact) => matches(query, contact.name, contact.role, contact.company));
  return (
    // A ListBox: the title and Import contacts, the search, the import status and the count in its Header-Slot; the
    // contacts (or the Empty State) in its Body-Slot.
    <ListBox ref={cardRef} as="section" aria-labelledby={headingId} className="px-search-card"
      header={<>
        <Stack direction="row" gap="sm" align="center" justify="between">
          <Heading level={4} id={headingId} textStyle="Heading/Subheading">Client contacts</Heading>
          {importing ? null : <Button level="tertiary" onClick={restart}>Import contacts</Button>}
        </Stack>
        <Search ref={searchRef} placeholder="Search contacts" value={query} onValueChange={setQuery} disabled={importing} />
        {importing ? (
          <Stack gap="sm">
            {/* The reason sits right under the disabled field. */}
            <InlineMessage theme="info" title="Importing from Mekong Freight" action={{ label: "Cancel import", onClick: cancel }}>
              Search is available when the import finishes.
            </InlineMessage>
            <ProgressBar value={Math.round((imported / incomingContacts.length) * 100)} label={`${imported} of ${plural(incomingContacts.length, "contact")}`} aria-label="Import progress" />
          </Stack>
        ) : null}
        <Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "contact")}</Text>
      </>}>
      {rows.length ? (
        <Box className="px-search-scroll" role="region" aria-label="Contacts" tabIndex={0}>
          <List aria-label="Contacts">
            {rows.map((contact) => (
              <ListItem key={contact.id} title={contact.name} caption={`${contact.role} · ${contact.company}`}
                leading={<Avatar size="md" theme={contact.theme} alt="">{initials(contact.name)}</Avatar>} />
            ))}
          </List>
        </Box>
      ) : (
        <EmptyState illustration={false} headingLevel={5} title={`No contacts match “${query.trim()}”`}
          secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>
          Search by name, role or company.
        </EmptyState>
      )}
    </ListBox>
  );
}

// ——— Examples ———————————————————————————————————————————————————————————————————————————————————
export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Filter as you type",
    description: "The directory narrows on every keystroke, by name, role, team or city, and the count under the field is announced. When nothing matches, the Empty State echoes the query and Clear search empties the field and puts focus back in it.",
    render: () => <DirectoryExample />,
    code: `const [query, setQuery] = useState("");
const rows = people.filter((p) => matches(query, p.name, p.role, p.team, p.location));

<ListBox header={<>
  <Heading level={4} textStyle="Heading/Subheading">Studio directory</Heading>
  <Stack gap="xs">
    <Search ref={searchRef} placeholder="Search people" value={query} onValueChange={setQuery} />
    <Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "person", "people")}</Text>
  </Stack>
</>}>
  {rows.length ? (
    <List aria-label="People">
      {rows.map((p) => <ListItem key={p.id} title={p.name} caption={\`\${p.role} · \${p.location}\`} leading={<Avatar {...avatarOf(p)} />} />)}
    </List>
  ) : (
    <EmptyState illustration={false} title={\`No people match “\${query}”\`}
      secondaryAction={{ label: "Clear search", onClick: () => { setQuery(""); searchRef.current?.focus(); } }}>
      Try a first name, a team such as Design, or a city.
    </EmptyState>
  )}
</ListBox>`,
  },
  {
    title: "Table toolbar",
    description: "Over a table, Search grows up to 320px and the filters sit beside it as Chip Advanced, wrapping under it when the toolbar is narrow. The query matches the invoice number, client or project; the chips narrow further, and the count and total follow.",
    wide: true,
    render: () => <InvoiceToolbarExample />,
    code: `{/* No container: the table lies on the page under its toolbar. */}
<Stack gap="md">
  <Stack direction="row" gap="xs" align="center" justify="between" wrap>
    <Stack direction="row" gap="xs" align="center" wrap>
      {/* .toolbar-search { flex: 1 1 240px; max-width: 320px } */}
      <Box className="toolbar-search">
        <Search placeholder="Search invoices" value={query} onValueChange={setQuery} />
      </Box>
      <Stack direction="row" gap="xs" wrap role="group" aria-label="Filters">
        <Chip variant="advanced" selected={Boolean(status)} popoverLabel="Status"
          popoverItems={statuses.map((s) => ({ id: s, label: s, selected: s === status }))}
          onPopoverSelect={(item) => setStatus(item.id)} onClearSelection={() => setStatus(null)}>
          {status ?? "Status"}
        </Chip>
        <Chip variant="advanced" …>{client ?? "Client"}</Chip>
        {narrowed ? <Button level="tertiary" onClick={clearAll}>Clear all</Button> : null}
      </Stack>
    </Stack>
    <Text as="span" role="status" tone="base">{\`\${plural(rows.length, "invoice")} · \${formatMoney(total, true)}\`}</Text>
  </Stack>
  <Table aria-label="Invoices" columns={columns} rows={rows}
    empty={<EmptyState illustration={false} title="No invoices match"
      secondaryAction={{ label: "Clear filters", onClick: clearAll }} />} />
</Stack>`,
  },
  {
    title: "Search in a scope",
    description: "The Filter-Dropdown theme keeps the scope inside the field: Search in lists the clients and the pick shows in the trailing slot. When a scoped search finds nothing, the Empty State offers to search all clients.",
    render: () => <ClientFilesExample />,
    code: `const scopes = [
  { value: "all", label: "All clients", caption: "13 files" },
  { value: "Phin & Co", label: "Phin & Co", caption: "4 files" },
  …
];

<ListBox header={<>
  <Heading level={4} textStyle="Heading/Subheading">Client files</Heading>
  <Stack gap="xs">
    <Search theme="filter-dropdown" placeholder="Search files" value={query} onValueChange={setQuery}
      filterActionLabel="Search in" filterOptions={scopes} filterValue={scope} onFilterChange={setScope} />
    <Text role="status" textStyle="Body/Small/Regular" tone="base">{\`\${plural(rows.length, "file")} from \${scope}\`}</Text>
  </Stack>
</>}>
  {/* The file name is the result: it wraps to a second line instead of being cut. */}
  {rows.length ? (
    <List aria-label="Files">{rows.map((file) => <ListItem key={file.id} title={file.name} titleLines={2} … />)}</List>
  ) : (
    <EmptyState illustration={false} title={\`No files match “\${query}”\`}
      secondaryAction={scope === "all"
        ? { label: "Clear search", onClick: clear }
        : { label: "Search all clients", onClick: () => setScope("all") }}>
      Nothing from {scope} matches. Files of other clients might.
    </EmptyState>
  )}
</ListBox>`,
  },
  {
    title: "Jump with a shortcut",
    description: "With shortcut=\"j\" the empty field shows ⌘J, and ⌘J focuses it from anywhere on the page. With no query the list shows recent projects; Enter opens the first match, Escape clears, and opening a project resets the list to recents.",
    wide: true,
    render: () => <ProjectJumpExample />,
    code: `const shown = query.trim() ? projects.filter((p) => matches(query, p.name, p.client)) : recent;

<Search shortcut="j" placeholder="Jump to a project" value={query} onValueChange={setQuery}
  onKeyDown={(event) => {
    if (event.key === "Enter" && shown[0]) open(shown[0].id);   // open() also clears the query
    if (event.key === "Escape") setQuery("");
  }} />
{/* Clickable rows; the label sits xs above them */}
<Stack gap="xs">
  <Text role="status" textStyle="Body/Small/Bold" tone="base">{query ? plural(shown.length, "project") : "Recent"}</Text>
  <List aria-label="Recent projects">
    {shown.map((p) => (
      <ListItem key={p.id} title={p.name} caption={p.client} selected={p.id === openId} onClick={() => open(p.id)}
        leading={<DockIcon icon={p.icon} theme={p.theme} background="subtle" />} />
    ))}
  </List>
</Stack>`,
  },
  {
    title: "Search on a phone",
    description: "On a phone Search sits in the Top Navigation control bar at full size and folds away with the large title; folded, it waits as a top-right action that scrolls back up and focuses the field. The Filter-Icon theme opens a Bottom Sheet with the file types as a pick-one list.",
    render: () => <PhoneFilesExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);
const searchRef = useRef<HTMLInputElement>(null);

<PlatformPhone headerOverlay screenRef={screenRef} header={
  <TopNavigation type="alt" title="Files" largeTitle="Files" scrollRef={screenRef} controlBar={
    <Search ref={searchRef} theme="filter-icon" placeholder="Search files" value={query} onValueChange={setQuery}
      filterActionLabel="Filter by type" filterHasPopup="dialog" filterExpanded={sheet} onFilterClick={() => setSheet(true)} />
  } searchAction={{ label: "Search files", onClick: scrollUpAndFocusSearch }} />
}>
  <Text role="status" tone="base">{plural(rows.length, "file")} · {kindLabel}</Text>
  <Box paddingX="lg">
    <List aria-label="Files">
      {rows.map((file) => <ListItem key={file.id} title={file.name} titleLines={2} caption={…} leading={<FileIcon … />} />)}
    </List>
  </Box>
  <BottomSheet inline open={sheet} onOpenChange={setSheet} title="File type">
    <List aria-label="File type">
      {kinds.map((k) => (
        <ListItem key={k.id} title={k.label} selected={k.id === kind}
          onClick={() => { setKind(k.id); setSheet(false); }} />
      ))}
    </List>
  </BottomSheet>
</PlatformPhone>`,
  },
  {
    title: "Search during an import",
    description: "Search is disabled only while something blocks it: contacts are still arriving, so results would be incomplete. The Inline Message under the field says why, and search comes back when the import finishes or is cancelled.",
    render: () => <ContactImportExample />,
    code: `<ListBox as="section" aria-labelledby="contacts-title" header={<>
  <Stack direction="row" gap="sm" align="center" justify="between">
    <Heading level={4} id="contacts-title" textStyle="Heading/Subheading">Client contacts</Heading>
    {importing ? null : <Button level="tertiary" onClick={restart}>Import contacts</Button>}
  </Stack>
  <Search placeholder="Search contacts" value={query} onValueChange={setQuery} disabled={importing} />
  {importing ? (
    <Stack gap="sm">
      <InlineMessage theme="info" title="Importing from Mekong Freight"
        action={{ label: "Cancel import", onClick: cancel }}>
        Search is available when the import finishes.
      </InlineMessage>
      <ProgressBar value={percent} label={\`\${imported} of \${plural(total, "contact")}\`} aria-label="Import progress" />
    </Stack>
  ) : null}
  <Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "contact")}</Text>
</>}>
  <List aria-label="Contacts">
    {rows.map((c) => <ListItem key={c.id} title={c.name} caption={\`\${c.role} · \${c.company}\`} leading={<Avatar size="md" theme={c.theme} alt="">{initials(c.name)}</Avatar>} />)}
  </List>
</ListBox>`,
  },
]);
