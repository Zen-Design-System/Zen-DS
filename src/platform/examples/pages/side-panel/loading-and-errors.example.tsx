import { useId, useRef, useState } from "react";
import {
  Badge, DescriptionList, DockIcon, Heading, InlineMessage, List, ListBox, ListItem, SidePanel, SkeletonText, Stack, Text, VisuallyHidden, plural, useToast,
  type BadgeTheme,
} from "@zen-ds/react";
import { daysFromToday, formatDate, formatDue, formatMoney } from "../../data";

type Unpaid = { id: string; number: string; client: string; project: string; amount: number; status: "Sent" | "Overdue"; issued: Date; due: Date; lines: { label: string; amount: number }[] };
const unpaidTheme: Record<Unpaid["status"], BadgeTheme> = { Sent: "blue", Overdue: "red" };
const unpaid: Unpaid[] = [
  { id: "i3", number: "INV-2026-0139", client: "Mekong Freight", project: "Shipment tracking", amount: 12880, status: "Overdue", issued: daysFromToday(-44), due: daysFromToday(-14),
    lines: [{ label: "Discovery workshops", amount: 7200 }, { label: "Service blueprint", amount: 5680 }] },
  { id: "i7", number: "INV-2026-0137", client: "Saola Outdoor", project: "Brand refresh", amount: 6000, status: "Overdue", issued: daysFromToday(-37), due: daysFromToday(-7),
    lines: [{ label: "Brand audit", amount: 6000 }] },
  { id: "i1", number: "INV-2026-0142", client: "Phin & Co", project: "Loyalty app", amount: 21000, status: "Sent", issued: daysFromToday(-5), due: daysFromToday(25),
    lines: [{ label: "Milestone 2: rewards", amount: 16500 }, { label: "Usability testing", amount: 4500 }] },
  { id: "i8", number: "INV-2026-0140", client: "Lumen Bank", project: "Online banking redesign", amount: 18600, status: "Sent", issued: daysFromToday(-12), due: daysFromToday(33),
    lines: [{ label: "Design sprint 4", amount: 14400 }, { label: "Accessibility audit", amount: 4200 }] },
];

/** Placeholder rows of a DescriptionList: a short term at the start, a value at the end, each a Body/Base line tall. */
function SkeletonRows({ count }: { count: number }) {
  return (
    <Stack gap="xs">
      {Array.from({ length: count }, (_, index) => (
        <Stack key={index} direction="row" gap="md" justify="between" align="center" style={{ minHeight: "var(--zen-typography-line-height-body-base, 24px)" }}>
          <SkeletonText lines={1} style={{ width: "30%" }} />
          <SkeletonText lines={1} style={{ width: "35%" }} />
        </Stack>
      ))}
    </Stack>
  );
}

type Load = { id: string; state: "loading" | "error" | "ready" };

/** Unpaid invoices: a row opens its invoice in a Modal Side Panel that keeps its frame while the details load or fail. */
export default function InvoicePanel() {
  const { toast } = useToast();
  const titleId = useId();
  const linesId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const [opened, setOpened] = useState(unpaid[0]);
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<Load>({ id: unpaid[0].id, state: "loading" });
  // In this demo the billing service's first answer for INV-2026-0139 fails.
  const [failedOnce, setFailedOnce] = useState(false);
  const state = load.state;
  // The billing service answers after a moment; only the invoice still open takes the answer.
  const fetchInvoice = (invoice: Unpaid) => {
    const fail = invoice.id === "i3" && !failedOnce;
    setLoad({ id: invoice.id, state: "loading" });
    setTimeout(() => {
      if (fail) setFailedOnce(true);
      setLoad((current) => (current.id === invoice.id && current.state === "loading" ? { id: invoice.id, state: fail ? "error" : "ready" } : current));
    }, 900);
  };
  const openInvoice = (invoice: Unpaid) => { setOpened(invoice); setOpen(true); fetchInvoice(invoice); };
  // The message and its button leave while the retry runs, so focus waits on the panel itself (its title is read).
  const retry = () => { panelRef.current?.focus(); fetchInvoice(opened); };
  const remind = () => { setOpen(false); toast({ title: "Reminder sent", children: `${opened.number} · ${opened.client}` }); };
  return (
    <>
      {/* A ListBox: the title and the total in its Header-Slot, the invoices in its Body-Slot. */}
      <ListBox as="section" aria-labelledby={titleId}
        header={<Stack gap="2xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Unpaid invoices</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${formatMoney(unpaid.reduce((sum, invoice) => sum + invoice.amount, 0))} across ${plural(unpaid.length, "invoice")}`}</Text>
        </Stack>}>
        <List aria-labelledby={titleId}>
          {unpaid.map((invoice) => (
            // The number names the panel it opens; the row keeps client, amount and status, so nothing is cut on a phone.
            <ListItem key={invoice.id} title={invoice.client} titleLines={2} caption={formatMoney(invoice.amount)}
              leading={<DockIcon icon="icon-receipt-line" theme="neutral" background="subtle" />}
              trailing={<Badge theme={unpaidTheme[invoice.status]} background="subtle">{invoice.status}</Badge>}
              onClick={() => openInvoice(invoice)} />
          ))}
        </List>
      </ListBox>
      {/* The panel opens at once with its title, so people see their click landed; the body fills in after. It is a
          modal (portalled), so it sits beside the ListBox, not in its rows. */}
      <SidePanel ref={panelRef} type="modal" open={open} onOpenChange={setOpen} title={opened.number} description={`${opened.client} · ${opened.project}`}
        primaryAction={{ label: "Send reminder", onClick: remind, disabled: state !== "ready" }}>
        {state === "loading" ? (
          // The placeholders take the shape of what arrives: term · value rows, the kicker (a Body/Small line), then
          // the line items and the total, so nothing jumps when the details land.
          <Stack gap="lg" aria-busy="true">
            <VisuallyHidden role="status">Loading invoice</VisuallyHidden>
            <SkeletonRows count={3} />
            <Stack gap="xs">
              <Stack direction="row" align="center" style={{ minHeight: "var(--zen-typography-line-height-body-small, 20px)" }}>
                <SkeletonText lines={1} style={{ width: "25%" }} />
              </Stack>
              <SkeletonRows count={opened.lines.length + 1} />
            </Stack>
          </Stack>
        ) : state === "error" ? (
          <InlineMessage theme="negative" title="Invoice didn't load" action={{ label: "Try again", onClick: retry }}>
            Zen couldn't reach the billing service. Nothing has changed.
          </InlineMessage>
        ) : (
          <Stack gap="lg">
            <DescriptionList items={[
              { id: "status", term: "Status", description: <Badge theme={unpaidTheme[opened.status]} background="subtle">{opened.status}</Badge> },
              { id: "issued", term: "Issued", description: formatDate(opened.issued) },
              { id: "due", term: "Due", description: `${formatDate(opened.due)} · ${formatDue(opened.due).replace(/^Due in/, "in")}` },
            ]} />
            <Stack as="section" gap="xs" aria-labelledby={linesId}>
              {/* A kicker one level below the panel's h2 title. */}
              <Heading level={3} id={linesId} textStyle="Body/Small/Bold" tone="light">Line items</Heading>
              <DescriptionList items={[
                ...opened.lines.map((line) => ({ id: line.label, term: line.label, description: formatMoney(line.amount, true) })),
                { id: "total", term: "Total", description: formatMoney(opened.amount, true), emphasis: true },
              ]} />
            </Stack>
          </Stack>
        )}
      </SidePanel>
    </>
  );
}
