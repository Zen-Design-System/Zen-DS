import { useRef, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Badge, Button, EmptyState, Grid, IconButton, Menu, Metric, PageHeader, Search, Sidebar,
  SidebarMenuItem, Stack, Table, TableActions, TableBadges, TableText, Text, Thumbnail, VisuallyHidden, useToast, type TableColumn,
} from "@zen-ds/react";
import { formatDate, formatMoney, invoiceStatusTheme, invoices, me, studio, type Invoice, type InvoiceStatus } from "../../data";

const sumOf = (rows: Invoice[], statuses: InvoiceStatus[]) => rows.filter((row) => statuses.includes(row.status)).reduce((total, row) => total + row.amount, 0);
const byNumber = (a: Invoice, b: Invoice) => b.number.localeCompare(a.number);

/** The drafts New invoice adds, in turn: the next milestones of the studio's active clients, issued today. */
const nextDrafts: Pick<Invoice, "client" | "project" | "amount">[] = [
  { client: "Saola Outdoor", project: "saola-brand", amount: 8400 },
  { client: "Phin & Co", project: "phin-loyalty", amount: 14000 },
  { client: "Lumen Bank", project: "lumen-banking", amount: 27000 },
];

/** The studio's Invoices page: small Metrics above the invoices Table add up the same rows. */
export default function InvoiceSummary() {
  const { toast } = useToast();
  // Each open invoice's action button, so focus can move on to the next one.
  const actionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [rows, setRows] = useState(() => [...invoices].sort(byNumber));
  const [query, setQuery] = useState("");
  const [unread, setUnread] = useState(1);
  const outstanding = sumOf(rows, ["Sent", "Overdue"]);
  const overdue = sumOf(rows, ["Overdue"]);
  const paid = sumOf(rows, ["Paid"]);
  const words = query.trim().toLowerCase();
  const shown = rows.filter((row) => !words || `${row.number} ${row.client}`.toLowerCase().includes(words));
  const setStatus = (id: string, status: InvoiceStatus) => setRows((list) => list.map((row) => (row.id === id ? { ...row, status } : row)));
  const change = (invoice: Invoice, status: InvoiceStatus, title: string) => {
    setStatus(invoice.id, status);
    toast({ title, children: `${invoice.number} · ${invoice.client}`, action: { label: "Undo", onClick: () => setStatus(invoice.id, invoice.status) } });
    // A paid invoice has no action left: focus moves on to the next open invoice (below, else above), not to <body>.
    if (status === "Paid") {
      const at = shown.indexOf(invoice);
      const next = [...shown.slice(at + 1), ...shown.slice(0, at).reverse()].find((row) => row.status !== "Paid");
      if (next) setTimeout(() => actionRefs.current[next.id]?.focus());
    }
  };
  const newInvoice = () => {
    const count = rows.filter((row) => row.id.startsWith("new-")).length;
    const draft: Invoice = { ...nextDrafts[count % nextDrafts.length], id: `new-${count}`, number: `INV-2026-${String(144 + count).padStart(4, "0")}`, status: "Draft", issued: invoices[4].issued, due: invoices[4].due };
    setRows((list) => [draft, ...list]);
    setQuery("");
    toast({ title: "Draft invoice created", children: `${draft.number} · ${draft.client} · ${formatMoney(draft.amount)}`, action: { label: "Undo", onClick: () => setRows((list) => list.filter((row) => row.id !== draft.id)) } });
  };
  const columns: TableColumn<Invoice>[] = [
    { id: "invoice", header: "Invoice", cell: (row) => <TableText bold caption={row.client}>{row.number}</TableText> },
    { id: "issued", header: "Issued", width: "140px", cell: (row) => <TableText>{formatDate(row.issued)}</TableText> },
    { id: "due", header: "Due", width: "140px", cell: (row) => <TableText>{formatDate(row.due)}</TableText> },
    { id: "status", header: "Status", width: "120px", cell: (row) => <TableBadges><Badge theme={invoiceStatusTheme[row.status]} background="subtle">{row.status}</Badge></TableBadges> },
    { id: "amount", header: "Amount", align: "right", width: "140px", cell: (row) => <TableText>{formatMoney(row.amount, true)}</TableText> },
    {
      id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "72px",
      cell: (row) => row.status === "Paid" ? null : (
        <TableActions>
          {row.status === "Draft"
            ? <IconButton ref={(button) => { actionRefs.current[row.id] = button; }} appearance="flat" level="primary" size="md" icon="icon-send-01-line" aria-label={`Send ${row.number}`} onClick={() => change(row, "Sent", "Invoice sent")} />
            : <IconButton ref={(button) => { actionRefs.current[row.id] = button; }} appearance="flat" level="primary" size="md" icon="icon-check-circle-line" aria-label={`Record payment for ${row.number}`} onClick={() => change(row, "Paid", "Payment recorded")} />}
        </TableActions>
      ),
    },
  ];
  return (
    // The studio's Invoices page: AppShell pattern sidebar, a Search in the header's top row (it filters the table),
    // the PageHeader with its one Primary in the Main row. The summary and the table lie on the page, no box.
    <AppShell
      sidebar={(
        <Sidebar
          logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          logoCollapsed={<Thumbnail src={studio.logo} alt={studio.name} size="2xs" />}
          selectedId="invoices" onItemClick={(item) => { if (item.id !== "invoices") toast({ title: `${item.label} isn't part of this example`, children: "This page shows the summary." }); }}
          sections={[{ items: [
            { id: "home", label: "Home", icon: "icon-home-03-line" },
            { id: "projects", label: "Projects", icon: "icon-folder-line" },
            { id: "invoices", label: "Invoices", icon: "icon-receipt-line", counter: rows.filter((row) => row.status === "Overdue").length || undefined },
            { id: "people", label: "People", icon: "icon-users-line" },
          ] }]}
          footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
      )}
      header={(
        <AppShellHeader
          leading={<Search placeholder="Search invoices" aria-label="Search invoices" value={query} onValueChange={setQuery} />}
          actions={<>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => {
              setUnread(0);
              toast({ title: unread ? "1 new notification" : "You're all caught up", children: "Mai Ho marked INV-2026-0141 as paid · Lumen Bank" });
            }} />
            <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
            ]} />
          </>}
          main={(
            <PageHeader title="Invoices" description={`What ${studio.name} has billed its clients since July.`}
              actions={<Button level="primary" startIcon="icon-plus-line" onClick={newInvoice}>New invoice</Button>} />
          )}
        />
      )}
    >
      <Stack gap="md">
        {/* Every number comes from the same rows as the table, so a change shows in both at once. */}
        <Grid as="section" aria-label="Summary" minColumnWidth="200px" gap="sm">
          <Metric size="sm" label="Outstanding" value={formatMoney(outstanding, true)} icon="icon-hourglass-line" iconTheme="blue" />
          <Metric size="sm" label="Overdue" value={formatMoney(overdue, true)} icon="icon-alert-triangle-line" iconTheme="red" />
          <Metric size="sm" label="Paid" value={formatMoney(paid, true)} icon="icon-check-circle-line" iconTheme="green" />
        </Grid>
        <Table aria-label="Invoices" columns={columns} rows={shown}
          empty={<EmptyState headingLevel={2} size="sm" icon="icon-search-medium-line" title="No invoices match" secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>Try a client or an invoice number.</EmptyState>} />
      </Stack>
    </AppShell>
  );
}
