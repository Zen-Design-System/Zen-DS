import { useId, useState } from "react";
import { Badge, Heading, Stack, Table, TableBadges, TableText, Text, plural, useToast, type TableBulkAction, type TableColumn } from "@zen-ds/react";
import { daysFromToday, formatDate, formatDue, formatMoney, invoiceStatusTheme, type InvoiceStatus } from "../../data";

/* A Bulk-Action bar for the selection. */
type QuarterInvoice = { id: string; number: string; client: string; project: string; amount: number; status: InvoiceStatus; due: Date };
const quarterInvoices: QuarterInvoice[] = [
  { id: "inv-142", number: "INV-2026-0142", client: "Phin & Co", project: "Loyalty app", amount: 21000, status: "Sent", due: daysFromToday(25) },
  { id: "inv-141", number: "INV-2026-0141", client: "Lumen Bank", project: "Online banking redesign", amount: 40500, status: "Paid", due: daysFromToday(12) },
  { id: "inv-140", number: "INV-2026-0140", client: "Phin & Co", project: "Loyalty app", amount: 18750, status: "Paid", due: daysFromToday(-5) },
  { id: "inv-139", number: "INV-2026-0139", client: "Mekong Freight", project: "Shipment tracking", amount: 12880, status: "Overdue", due: daysFromToday(-14) },
  { id: "inv-138", number: "INV-2026-0138", client: "Hanoi Book Fair", project: "Book Fair 2026 website", amount: 9140.5, status: "Paid", due: daysFromToday(-20) },
  { id: "inv-137", number: "INV-2026-0137", client: "Phin & Co", project: "Loyalty app", amount: 15400, status: "Overdue", due: daysFromToday(-3) },
];
const invoiceColumns: TableColumn<QuarterInvoice>[] = [
  { id: "number", header: "Invoice", cell: (invoice) => <TableText bold caption={invoice.project}>{invoice.number}</TableText> },
  { id: "client", header: "Client", width: "170px", cell: (invoice) => <TableText>{invoice.client}</TableText> },
  // Open invoices say how long is left; a paid one has nothing left to count.
  { id: "due", header: "Due", width: "170px", cell: (invoice) => <TableText caption={invoice.status === "Paid" ? undefined : formatDue(invoice.due)}>{formatDate(invoice.due)}</TableText> },
  { id: "amount", header: "Amount (USD)", align: "right", width: "150px", cell: (invoice) => <TableText>{formatMoney(invoice.amount, true)}</TableText> },
  { id: "status", header: "Status", width: "120px", cell: (invoice) => <TableBadges><Badge theme={invoiceStatusTheme[invoice.status]} background="subtle">{invoice.status}</Badge></TableBadges> },
];

export default function InvoiceSelection() {
  const { toast } = useToast();
  const headingId = useId();
  const [rows, setRows] = useState(quarterInvoices);
  const [selected, setSelected] = useState<string[]>(["inv-139", "inv-137"]);
  const picked = rows.filter((invoice) => selected.includes(invoice.id));
  const unpaid = picked.filter((invoice) => invoice.status !== "Paid");
  const count = plural(picked.length, "invoice");
  const total = formatMoney(picked.reduce((sum, invoice) => sum + invoice.amount, 0), true);
  const markPaid = () => {
    const before = rows;
    const ids = unpaid.map((invoice) => invoice.id);
    setRows(rows.map((invoice) => ids.includes(invoice.id) ? { ...invoice, status: "Paid" } : invoice));
    // The bar leaves with the selection; the Table moves the focus to Select all rows.
    setSelected([]);
    toast({ title: `${plural(ids.length, "invoice")} marked as paid`, action: { label: "Undo", onClick: () => setRows(before) } });
  };
  // Each action says how many invoices it touches: the bar's tooltips and the More menu (phones) show the same names.
  const actions: TableBulkAction[] = [
    { id: "remind", group: "Payment", icon: "icon-mail-01-line", label: unpaid.length ? `Send ${plural(unpaid.length, "reminder")}` : "Send reminders",
      onClick: () => toast({ title: `${plural(unpaid.length, "reminder")} sent` }), disabled: !unpaid.length },
    { id: "paid", group: "Payment", icon: "icon-check-circle-line", label: unpaid.length ? `Mark ${plural(unpaid.length, "invoice")} as paid` : "Mark as paid", onClick: markPaid, disabled: !unpaid.length },
    { id: "pdf", group: "Share", icon: "icon-download-01-line", label: `Download ${plural(picked.length, "PDF")}`, onClick: () => toast({ title: `${count} downloaded` }) },
    { id: "links", group: "Share", icon: "icon-link-01-line", label: `Copy ${plural(picked.length, "payment link")}`, onClick: () => toast({ title: `${plural(picked.length, "payment link")} copied` }) },
  ];
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack direction="row" justify="between" align="center" gap="sm" wrap>
        <Heading level={4} id={headingId} textStyle="Heading/4">Q3 invoices</Heading>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">
          {picked.length ? `${total} selected` : plural(rows.length, "invoice")}
        </Text>
      </Stack>
      <Table aria-labelledby={headingId} columns={invoiceColumns} rows={rows} selectable selectedIds={selected} onSelectionChange={setSelected}
        bulkActions={actions} />
    </Stack>
  );
}
