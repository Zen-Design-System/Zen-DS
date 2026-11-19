import { useId, useRef, useState } from "react";
import {
  Badge, DescriptionList, Dialog, EmptyState, Heading, IconButton, Menu, SidePanel, Stack, Table, TableActions, TableBadges, TableText, Text, VisuallyHidden,
  plural, useToast, type MenuEntry, type TableColumn,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatDate, formatMoney, invoiceStatusTheme, invoices, projectById, type Invoice } from "../../data";

/** Where each client's invoices and reminders go. */
const billingEmail: Record<string, string> = {
  "Phin & Co": "trang.le@phinco.vn", "Lumen Bank": "ap@lumenbank.com", "Mekong Freight": "accounts@mekongfreight.vn",
  "Hanoi Book Fair": "finance@hanoibookfair.vn", "Saola Outdoor": "billing@saolaoutdoor.com",
};
const firstInvoices = [...invoices].sort((a, b) => b.number.localeCompare(a.number));
const nextNumber = (list: Invoice[]) => `INV-2026-${String(Math.max(...list.map((invoice) => Number(invoice.number.slice(-4)))) + 1).padStart(4, "0")}`;

/** The studio's invoices: a row opens the invoice, its ⋯ menu holds the other actions. */
export default function InvoiceRowActions() {
  const { toast } = useToast();
  const [rows, setRows] = useState(firstInvoices);
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Each row's ⋯ button, by row id: focus has somewhere to go once a row is deleted.
  const menuRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const opened = rows.find((row) => row.id === openId);
  const update = (id: string, patch: Partial<Invoice>) => setRows((list) => list.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const send = (row: Invoice) => {
    update(row.id, { status: "Sent", issued: TODAY });
    toast({ title: "Invoice sent", children: `${row.number} to ${billingEmail[row.client]}`, action: { label: "Undo", onClick: () => update(row.id, { status: row.status, issued: row.issued }) } });
  };
  const remind = (row: Invoice) => toast({ title: "Reminder sent", children: `To ${billingEmail[row.client]}` });
  const markPaid = (row: Invoice) => {
    update(row.id, { status: "Paid" });
    toast({ type: "positive", title: "Invoice marked as paid", children: row.number, action: { label: "Undo", onClick: () => update(row.id, { status: row.status }) } });
  };
  const download = (row: Invoice) => toast({ title: "PDF downloaded", children: `${row.number}.pdf` });
  const duplicate = (row: Invoice) => {
    const copy: Invoice = { ...row, id: `copy-${Date.now()}`, number: nextNumber(rows), status: "Draft", issued: TODAY, due: daysFromToday(30) };
    setRows((list) => [copy, ...list]);
    toast({ title: "Invoice duplicated", children: `${copy.number} is a draft`, action: { label: "Undo", onClick: () => setRows((list) => list.filter((item) => item.id !== copy.id)) } });
  };
  // Deleting can't be undone, so it asks first; the row leaves with its ⋯, so focus moves to the next row's menu (or
  // the one above, or the heading once the table is empty), never to <body>.
  const remove = () => {
    if (!deleting) return;
    const index = rows.findIndex((row) => row.id === deleting.id);
    const next = rows[index + 1] ?? rows[index - 1];
    setRows((list) => list.filter((row) => row.id !== deleting.id));
    toast({ title: "Invoice deleted", children: deleting.number });
    setDeleting(null);
    setTimeout(() => (next ? menuRefs.current[next.id] : headingRef.current)?.focus());
  };

  // Only the actions that fit the invoice's status; Delete is last, after a separator.
  const actionsFor = (row: Invoice): MenuEntry[] => [
    ...(row.status === "Draft" ? [{ id: "send", label: "Send invoice", icon: "icon-send-01-line", onSelect: () => send(row) } as const] : []),
    ...(row.status === "Sent" || row.status === "Overdue" ? [
      { id: "remind", label: "Send reminder", icon: "icon-mail-01-line", onSelect: () => remind(row) } as const,
      { id: "paid", label: "Mark as paid", icon: "icon-check-circle-line", onSelect: () => markPaid(row) } as const,
    ] : []),
    { id: "pdf", label: "Download PDF", icon: "icon-download-01-line", onSelect: () => download(row) },
    { id: "duplicate", label: "Duplicate", icon: "icon-duplicate-line", onSelect: () => duplicate(row) },
    { type: "separator" },
    { id: "delete", label: "Delete invoice", icon: "icon-trash-line", danger: true, onSelect: () => setDeleting(row) },
  ];
  const columns: TableColumn<Invoice>[] = [
    { id: "number", header: "Invoice", cell: (row) => <TableText bold caption={projectById(row.project).name}>{row.number}</TableText> },
    { id: "client", header: "Client", width: "180px", cell: (row) => <TableText>{row.client}</TableText> },
    { id: "due", header: "Due", width: "140px", cell: (row) => <TableText>{formatDate(row.due)}</TableText> },
    { id: "amount", header: "Amount", align: "right", width: "140px", cell: (row) => <TableText>{formatMoney(row.amount, true)}</TableText> },
    { id: "status", header: "Status", width: "120px", cell: (row) => <TableBadges><Badge theme={invoiceStatusTheme[row.status]} background="subtle">{row.status}</Badge></TableBadges> },
    {
      id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "72px",
      cell: (row) => (
        <TableActions>
          {/* The menu floats above the table and flips up near the bottom of the screen. */}
          <Menu align="end" items={actionsFor(row)}
            trigger={<IconButton ref={(button) => { menuRefs.current[row.id] = button; }} appearance="flat" level="primary" size="md"
              icon="icon-dots-horizontal-line" aria-label={`Actions for ${row.number}`} />} />
        </TableActions>
      ),
    },
  ];
  // The side panel's one action moves the invoice on.
  const panelAction = (row: Invoice) =>
    row.status === "Draft" ? { label: "Send invoice", onClick: () => { send(row); setOpenId(null); } }
      : row.status === "Paid" ? { label: "Download PDF", onClick: () => { download(row); setOpenId(null); } }
        : { label: "Mark as paid", onClick: () => { markPaid(row); setOpenId(null); } };

  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack direction="row" justify="between" align="center" gap="xs" wrap>
        <Heading ref={headingRef} level={4} id={headingId} textStyle="Heading/4" tabIndex={-1}>Invoices</Heading>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "invoice")}</Text>
      </Stack>
      {/* The row opens the invoice; on a narrow screen the table scrolls sideways to the ⋯ column. */}
      <Table aria-labelledby={headingId} columns={columns} rows={rows} onRowClick={(row) => setOpenId(row.id)}
        empty={<EmptyState size="sm" headingLevel={5} icon="icon-receipt-line" title="No invoices yet">Invoices you send to clients show here.</EmptyState>} />
      <SidePanel type="modal" size="small" open={Boolean(opened)} onOpenChange={(open) => { if (!open) setOpenId(null); }}
        title={opened?.number ?? ""} description={opened?.client}
        primaryAction={opened ? panelAction(opened) : undefined} secondaryAction={{ label: "Close" }}>
        {opened ? (
          <DescriptionList divider items={[
            { term: "Status", description: <Badge theme={invoiceStatusTheme[opened.status]} background="subtle">{opened.status}</Badge> },
            { term: "Project", description: projectById(opened.project).name },
            { term: "Billing email", description: billingEmail[opened.client] },
            { term: "Issued", description: formatDate(opened.issued) },
            { term: "Due", description: formatDate(opened.due) },
            { term: "Amount", description: formatMoney(opened.amount, true), emphasis: true },
          ]} />
        ) : null}
      </SidePanel>
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }} theme="negative"
        title={deleting ? `Delete ${deleting.number}?` : ""}
        description="The invoice and its payment history are removed for everyone. This can't be undone."
        primaryAction={{ label: "Delete invoice", level: "danger", onClick: remove }} secondaryAction={{ label: "Cancel" }} />
    </Stack>
  );
}
