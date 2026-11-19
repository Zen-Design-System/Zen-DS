import { useId, useRef, useState } from "react";
import { Badge, Button, Chip, DatePicker, EmptyState, Heading, Stack, Table, TableText, Text, plural, useZen, type DatePickerRange, type TableColumn } from "@zen-ds/react";
import { TODAY, daysFromToday, formatDate, formatMoney, formatRange, invoiceStatusTheme, invoices, projectById, type Invoice, type InvoiceStatus } from "../../data";

/** The studio's invoices, newest first: the shared ones plus the three older ones the Search page lists too. */
const olderInvoices: Invoice[] = [
  { id: "i140", number: "INV-2026-0140", client: "Phin & Co", project: "phin-loyalty", amount: 18750, status: "Paid", issued: daysFromToday(-35), due: daysFromToday(-5) },
  { id: "i137", number: "INV-2026-0137", client: "Lumen Bank", project: "lumen-banking", amount: 17810, status: "Paid", issued: daysFromToday(-62), due: daysFromToday(-32) },
  { id: "i136", number: "INV-2026-0136", client: "Hanoi Book Fair", project: "bookfair-site", amount: 18279.5, status: "Paid", issued: daysFromToday(-80), due: daysFromToday(-50) },
];
const studioInvoices = [...invoices, ...olderInvoices].sort((a, b) => b.issued.getTime() - a.issued.getTime());
const dayKey = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
const thisMonth: DatePickerRange = { start: new Date(2026, 8, 1), end: new Date(2026, 8, 30) };
const statusOptions: InvoiceStatus[] = ["Draft", "Sent", "Paid", "Overdue"];
const invoiceColumns: TableColumn<Invoice>[] = [
  { id: "invoice", header: "Invoice", cell: (row) => <TableText bold caption={projectById(row.project).name}>{row.number}</TableText> },
  { id: "client", header: "Client", cell: (row) => <TableText>{row.client}</TableText> },
  { id: "issued", header: "Issued", width: "132px", cell: (row) => <TableText>{formatDate(row.issued)}</TableText> },
  { id: "amount", header: "Amount", align: "right", width: "140px", cell: (row) => <TableText>{formatMoney(row.amount, true)}</TableText> },
  { id: "status", header: "Status", width: "120px", cell: (row) => <Badge theme={invoiceStatusTheme[row.status]} background="subtle">{row.status}</Badge> },
];

/** An Advanced chip opens the calendar as a popover anchored to it; Submit filters the table. */
export default function InvoiceFilter() {
  // A dual calendar needs about 500px: phones get the single calendar.
  const twoMonths = useZen()?.breakpoint !== "mobile";
  const titleId = useId();
  const chipRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<DatePickerRange | null>(thisMonth);
  const [month, setMonth] = useState(() => new Date(2026, 7, 1));
  const [status, setStatus] = useState<InvoiceStatus | null>(null);
  const rows = studioInvoices.filter((invoice) =>
    (!period?.end || (dayKey(invoice.issued) >= dayKey(period.start) && dayKey(invoice.issued) <= dayKey(period.end))) && (!status || invoice.status === status));
  const toggle = () => {
    // Open on the applied period: its last month on the right of a dual calendar.
    const last = period?.end ?? TODAY;
    if (!open) setMonth(new Date(last.getFullYear(), last.getMonth() - (twoMonths ? 1 : 0), 1));
    setOpen(!open);
  };
  // Clear all removes itself: focus moves to the first filter.
  const clearFilters = () => { chipRef.current?.focus(); setPeriod(null); setStatus(null); };
  return (
    // The table is a section of the page, not a widget: it lies on the page under its heading and toolbar, no container.
    <Stack gap="md">
      <Heading level={4} textStyle="Heading/4" id={titleId}>Invoices</Heading>
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Stack direction="row" wrap gap="xs" align="center">
          {/* The calendar anchored to its own trigger (the issue-date Chip) is placed against this box. */}
          <div style={{ position: "relative" }}>
            <Chip ref={chipRef} variant="advanced" dropdown aria-haspopup="dialog" aria-expanded={open} popoverOpen={open}
              selected={Boolean(period)} onClearSelection={period ? () => setPeriod(null) : undefined} onClick={toggle}>
              {period?.end ? formatRange(period.start, period.end) : "Issue date"}
            </Chip>
            <DatePicker open={open} onOpenChange={setOpen} anchorRef={chipRef} today={TODAY}
              calendar={twoMonths ? "dual" : "single"} selectionMode="range" maxDate={TODAY}
              range={period} month={month} onMonthChange={setMonth}
              showActions onApply={(_, range) => setPeriod(range)} />
          </div>
          <Chip variant="advanced" dropdown selected={Boolean(status)}
            popoverItems={statusOptions.map((option) => ({ id: option, label: option, selected: option === status }))}
            onPopoverSelect={(item) => setStatus(item.id as InvoiceStatus)} onClearSelection={status ? () => setStatus(null) : undefined}>
            {status ?? "Status"}
          </Chip>
          {period && status ? <Button level="tertiary" onClick={clearFilters}>Clear all</Button> : null}
        </Stack>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "invoice")}</Text>
      </Stack>
      <Table aria-labelledby={titleId} columns={invoiceColumns} rows={rows} getRowId={(row) => row.id}
        empty={
          <EmptyState icon="icon-search-medium-line" title="No invoices match" headingLevel={5} size="sm" secondaryAction={{ label: "Clear filters", onClick: clearFilters }}>
            No invoice was issued in these dates with this status.
          </EmptyState>
        } />
    </Stack>
  );
}
