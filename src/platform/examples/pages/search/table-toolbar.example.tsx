import { useRef, useState } from "react";
import { Badge, Box, Button, Chip, EmptyState, Search, Stack, Table, TableText, Text, plural, type TableColumn } from "@zen-ds/react";
import { daysFromToday, formatDate, formatMoney, invoiceStatusTheme, invoices, projectById, type Invoice, type InvoiceStatus } from "../../data";

/** True when the query is empty or any field contains it (case-insensitive). */
const matches = (query: string, ...fields: string[]) => {
  const q = query.trim().toLowerCase();
  return !q || fields.some((field) => field.toLowerCase().includes(q));
};

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

/** Over a table, Search grows up to 240px with the filters beside it; the count and total follow. */
export default function InvoiceToolbar() {
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
        {/* Search grows up to 240px; the filters sit beside it and wrap under it when the toolbar is narrow. The group
            takes the row's free room (flex 1 1 auto) and may shrink. */}
        <Stack direction="row" gap="xs" align="center" wrap style={{ minWidth: 0, flex: "1 1 auto" }}>
          <Box width="fill" minWidth={220} maxWidth={240}>
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
        empty={<EmptyState size="sm" headingLevel={4} icon="icon-search-medium-line" title="No invoices match" secondaryAction={{ label: "Clear filters", onClick: clearAll }}>
          Try another invoice number, client or status.
        </EmptyState>} />
    </Stack>
  );
}
