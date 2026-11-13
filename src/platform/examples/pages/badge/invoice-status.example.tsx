import { useId, useRef, useState } from "react";
import { Badge, Button, Card, DescriptionList, DockIcon, Heading, IconButton, Menu, Stack, Text, useToast } from "@zen-ds/react";
import { TODAY, formatDate, formatDue, formatMoney, invoiceStatusTheme, invoices, projectById, type InvoiceStatus as Status } from "../../data";

const overdue = invoices.find((invoice) => invoice.status === "Overdue")!;

export default function InvoiceStatus() {
  const { toast } = useToast();
  const titleId = useId();
  const [status, setStatus] = useState<Status>(overdue.status);
  const receiptRef = useRef<HTMLButtonElement>(null);
  const paid = status === "Paid";
  const project = projectById(overdue.project);
  // Mark as paid leaves the card, so focus moves to the action that takes its place.
  const markPaid = () => {
    setStatus("Paid");
    setTimeout(() => receiptRef.current?.focus());
    toast({ type: "positive", title: "Invoice marked as paid", action: { label: "Undo", onClick: () => setStatus("Overdue") } });
  };
  return (
    // Secondary actions live in the card's Sub-Action menu; the action that moves the invoice on sits at the bottom.
    <Card as="section" theme="default" aria-labelledby={titleId}
      subAction={
        <Menu align="end" trigger={<IconButton appearance="flat" level="secondary" size="sm" icon="icon-dots-vertical-line" aria-label={`Actions for ${overdue.number}`} />}
          items={[
            { id: "remind", label: "Send reminder", icon: "icon-mail-01-line", disabled: paid, onSelect: () => toast({ title: "Reminder sent", children: `${overdue.client} gets a copy of ${overdue.number}.` }) },
            { id: "pdf", label: "Download PDF", icon: "icon-download-01-line", onSelect: () => toast({ title: "Download started", children: `${overdue.number}.pdf` }) },
          ]} />
      }>
      <Stack gap="md" align="stretch">
        <Stack direction="row" gap="md" align="start" justify="start">
          <DockIcon icon="icon-receipt-line" theme={project.theme} background="subtle" />
          <Stack gap="xs" align="stretch" width="fill">
            {/* The status sits right after the number and wraps under it on a narrow card; it never truncates. */}
            <Stack direction="row" gap="sm" align="center" wrap>
              <Heading level={4} id={titleId} textStyle="Heading/Subheading">{overdue.number}</Heading>
              <Badge theme={invoiceStatusTheme[status]} leading={paid ? "icon-check-line" : "icon-alert-circle-line"} size="sm">{status}</Badge>
            </Stack>
            <Text textStyle="Body/Small/Regular" tone="base">{`${overdue.client} · ${project.name}`}</Text>
          </Stack>
        </Stack>
        <Stack direction="row" fillChildren width="fill">
          <DescriptionList items={[
            { term: "Amount", description: formatMoney(overdue.amount, true) },
            { term: "Issued", description: formatDate(overdue.issued) },
            { term: paid ? "Paid" : "Due", description: paid ? formatDate(TODAY) : `${formatDate(overdue.due)} · ${formatDue(overdue.due)}` },
          ]} divider />
        </Stack>
        <Stack direction="row" justify="end">
          {paid
            ? <Button ref={receiptRef} level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Download started", children: `${overdue.number} receipt.pdf` })}>Download receipt</Button>
            : <Button level="primary" onClick={markPaid}>Mark as paid</Button>}
        </Stack>
      </Stack>
    </Card>
  );
}
