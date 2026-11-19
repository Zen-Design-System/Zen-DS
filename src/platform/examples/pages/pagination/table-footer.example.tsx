import { useRef, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Badge, Button, Chip, EmptyState, Menu, PageHeader, Pagination, Sidebar, SidebarMenuItem, Stack,
  Table, TableBadges, TableText, Text, Thumbnail, plural, useToast,
  type TableColumn,
} from "@zen-ds/react";
import { formatDate, formatMoney, invoiceStatusTheme, invoices, me, studio, studioMonths, type InvoiceStatus } from "../../data";

const pageOf = <T,>(items: T[], pageNo: number, size: number) => items.slice((pageNo - 1) * size, pageNo * size);
/** The page that holds row `index` (0-based) at `size` rows a page: a new page size keeps the reader's place. */
const pageHolding = (index: number, size: number) => Math.floor(index / size) + 1;
/** After a page change the list starts from its top again, but only scrolls when that top has left the screen. */
const backToTop = (element: HTMLElement | null) => { if (element && element.getBoundingClientRect().top < 0) element.scrollIntoView({ block: "start" }); };

/** Every invoice the studio sent in 2026, newest first: the five in the demo data plus the older ones, which add up to
 *  the same monthly totals as the studio's revenue charts (studioMonths). Numbers run in issue order: 0001–0137 from
 *  Jan 1 to Aug 10, then 0138 and 0139 (demo data), 0140 on Sep 3, 0141–0143 (demo data). The older ones are all paid,
 *  so what is open is the same everywhere: 0139 overdue and 0142 sent. */
type StudioInvoice = { id: string; number: string; client: string; amount: number; status: InvoiceStatus; issued: Date; due: Date };
const pastClients = ["Phin & Co", "Lumen Bank", "Mekong Freight", "Hanoi Book Fair"];
/** What the studio billed in a month of 2026 (0 = January), and how much of it the demo invoices already cover. */
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
// September: INV-2026-0140 and the two in the demo data.
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

/** Inline theme under an index table: page size in the Chip, the range beside the arrows; filters survive page turns. */
export default function InvoiceTable() {
  const { toast } = useToast();
  const [unread, setUnread] = useState(1);
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the pages." });
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
  const billed = rows.reduce((sum, invoice) => sum + invoice.amount, 0);
  return (
    // The studio's Invoices page: AppShell pattern sidebar, the PageHeader in the header's Main row and the filters in
    // its Sections row (they stay with the title while the rows scroll); the table and its pages on the page.
    <AppShell
      sidebar={(
        <Sidebar
          logo={(
            <Stack direction="row" gap="xs" align="center">
              <Thumbnail src={studio.logo} alt="" size="2xs" />
              <Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text>
            </Stack>
          )}
          logoCollapsed={<Thumbnail src={studio.logo} alt={studio.name} size="2xs" />}
          selectedId="invoices" onItemClick={(item) => { if (item.id !== "invoices") notHere(item.label); }}
          sections={[{ items: [
            { id: "home", label: "Home", icon: "icon-home-03-line" },
            { id: "projects", label: "Projects", icon: "icon-folder-line" },
            { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
            { id: "people", label: "People", icon: "icon-users-line" },
          ] }]}
          footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
      )}
      header={(
        <AppShellHeader
          actions={<>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => {
              setUnread(0);
              toast({ title: unread ? "1 new notification" : "You're all caught up", children: "INV-2026-0139 to Mekong Freight is 14 days overdue" });
            }} />
            <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
            ]} />
          </>}
          main={(
            <PageHeader title="Invoices" description={`Everything ${studio.name} has billed its clients this year.`}
              actions={<Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Invoices exported", children: `${plural(rows.length, "invoice")} · ${formatMoney(billed, true)}` })}>Export</Button>} />
          )}
          sections={(
            <Stack direction="row" gap="xs" align="center" wrap paddingY="xs">
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
          )}
        />
      )}
    >
      <Stack gap="md" ref={topRef}>
        <Table aria-label="Invoices" columns={invoiceColumns} rows={pageOf(rows, pageNo, pageSize)}
          empty={<EmptyState headingLevel={2} icon="icon-search-medium-line" title="No invoices match"
            secondaryAction={{ label: "Clear filters", onClick: clearFilters }}>Try another status or client.</EmptyState>} />
        {rows.length ? (
          <Stack direction="row" justify="end">
            <Pagination theme="inline" aria-label="Invoice pages" page={pageNo} onPageChange={turn}
              total={rows.length} pageSize={pageSize} pageSizeOptions={[10, 25, 50]} onPageSizeChange={resize} />
          </Stack>
        ) : null}
      </Stack>
    </AppShell>
  );
}
