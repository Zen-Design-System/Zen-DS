import { useId, useRef, useState } from "react";
import { Badge, Button, Card, DescriptionList, Heading, Stack, Text, useToast } from "@zen-ds/react";
import { daysFromToday, formatDate, formatMoney, invoiceStatusTheme, type InvoiceStatus } from "../../data";

// INV-2026-0143, the Saola Outdoor draft (the shared invoices): three lines, a returning-client discount, $12,000 in all.
const invoiceLines = [
  { id: "workshop", term: "Brand workshop · 2 days", amount: 4400 },
  { id: "direction", term: "Moodboard and art direction", amount: 3600 },
  { id: "logo", term: "Logo concepts · 3 routes", amount: 4500 },
];
const invoiceSubtotal = invoiceLines.reduce((sum, line) => sum + line.amount, 0);
const returningDiscount = 500;

/** An invoice whose inline Description List ends with one emphasised row, the total. */
export default function InvoiceTotal() {
  const { toast } = useToast();
  const [discount, setDiscount] = useState(true);
  const [status, setStatus] = useState<InvoiceStatus>("Draft");
  const titleId = useId();
  // The control that was used goes away, so focus moves to the one that brings it back (or to the title once sent).
  const titleRef = useRef<HTMLHeadingElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const discountRef = useRef<HTMLSpanElement>(null);
  const draft = status === "Draft";
  const total = invoiceSubtotal - (discount ? returningDiscount : 0);
  const removeDiscount = () => {
    setDiscount(false);
    setTimeout(() => addRef.current?.focus());
    toast({ title: "Discount removed", action: { label: "Undo", onClick: () => setDiscount(true) } });
  };
  // Add discount brings the row back: focus goes to its term, next to the label's remove button.
  const addDiscount = () => {
    setDiscount(true);
    setTimeout(() => discountRef.current?.focus());
  };
  const send = () => {
    setStatus("Sent");
    setTimeout(() => titleRef.current?.focus());
    toast({ type: "positive", title: "Invoice sent", children: "To accounts@saola.vn", action: { label: "Undo", onClick: () => setStatus("Draft") } });
  };
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Stack direction="row" gap="2xs" align="center" wrap>
            <Heading ref={titleRef} level={4} id={titleId} tabIndex={-1} textStyle="Heading/Subheading">INV-2026-0143</Heading>
            <Badge theme={invoiceStatusTheme[status]} background="subtle">{status}</Badge>
          </Stack>
          <Text textStyle="Body/Small/Regular" tone="base">{`Saola Outdoor · Brand refresh · Due ${formatDate(daysFromToday(30))}`}</Text>
        </Stack>
        <DescriptionList items={[
          ...invoiceLines.map((line) => ({ id: line.id, term: line.term, description: formatMoney(line.amount, true) })),
          { id: "subtotal", term: "Subtotal", description: formatMoney(invoiceSubtotal, true) },
          // A discount keeps its minus sign, so the colour is never the only signal.
          ...(discount ? [{
            // The discount is a removable label beside its term (as a checkout shows a discount code), so no row takes an
            // action column and every amount stays on the list's end edge with the total and the Send invoice button.
            // A sent invoice is read-only: the label stays and loses its remove button.
            id: "discount",
            term: (
              <Stack direction="row" gap="2xs" align="center" wrap>
                <span ref={discountRef} tabIndex={-1}>Discount</span>
                <Badge theme="neutral" background="subtle" size="sm" leadingIcon={false} remove={draft} onRemove={removeDiscount} removeLabel="Remove discount">Returning client · 4%</Badge>
              </Stack>
            ),
            description: <Text as="span" textStyle="Body/Base/Medium" tone="positive">{`−${formatMoney(returningDiscount, true)}`}</Text>,
          }] : []),
          { id: "total", term: "Total", description: formatMoney(total, true), emphasis: true },
        ]} />
        {draft ? (
          <Stack direction="row" gap="sm" justify="end" wrap>
            {discount ? null : <Button ref={addRef} level="tertiary" startIcon="icon-plus-line" onClick={addDiscount}>Add discount</Button>}
            <Button level="primary" onClick={send}>Send invoice</Button>
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}
