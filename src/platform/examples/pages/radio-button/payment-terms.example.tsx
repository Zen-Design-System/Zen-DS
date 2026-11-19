import { useId, useState } from "react";
import { Badge, Button, Card, Form, FormActions, FormFieldset, Heading, RadioButton, Stack, Text, useToast } from "@zen-ds/react";
import { TODAY, daysFromToday, formatDate, formatMoney, formatTime, invoiceStatusTheme, invoices, projectById, type InvoiceStatus } from "../../data";

const paymentTerms = [
  { id: "receipt", label: "Due on receipt", days: 0 },
  { id: "net15", label: "Net 15", days: 15 },
  { id: "net30", label: "Net 30", days: 30, note: "studio default" },
  { id: "net45", label: "Net 45", days: 45, note: "needs approval from Finance" },
];
const termsCaption = (term: (typeof paymentTerms)[number]) => `Due ${formatDate(daysFromToday(term.days))}${term.note ? ` · ${term.note}` : ""}`;
// The studio's draft invoice to Saola Outdoor (the same INV-2026-0143 the Stepper page approves).
const draftInvoice = invoices.find((invoice) => invoice.status === "Draft")!;

/** Captions say what each choice means. */
export default function PaymentTerms() {
  const { toast } = useToast();
  const name = useId();
  // The safe, usual choice is pre-selected.
  const [term, setTerm] = useState("net30");
  const [status, setStatus] = useState<InvoiceStatus>(draftInvoice.status);
  const chosen = paymentTerms.find((item) => item.id === term) ?? paymentTerms[2];
  const send = () => {
    setStatus("Sent");
    toast({ title: "Invoice sent", action: { label: "Undo", onClick: () => setStatus("Draft") } });
  };
  // The card is a form: Enter or Send invoice submits, and the action sits on the right (full width under 480px).
  return (
    <Card theme="default">
      <Form onSubmit={send}>
        <Stack gap="xs">
          <Stack direction="row" gap="2xs" align="center" wrap>
            <Heading level={4} textStyle="Heading/Subheading">{draftInvoice.number}</Heading>
            <Badge theme={invoiceStatusTheme[status]} background="subtle">{status}</Badge>
          </Stack>
          <Text textStyle="Body/Small/Regular" tone="base">{`${draftInvoice.client} · ${projectById(draftInvoice.project).name} · ${formatMoney(draftInvoice.amount, true)}`}</Text>
        </Stack>
        <FormFieldset kind="radio" legend="Payment terms">
          {paymentTerms.map((item) => (
            <RadioButton key={item.id} name={name} value={item.id} label={item.label} caption={termsCaption(item)} disabled={status === "Sent"}
              checked={term === item.id} onCheckedChange={(checked) => { if (checked) setTerm(item.id); }} />
          ))}
        </FormFieldset>
        {status === "Draft" ? (
          <FormActions>
            <Button level="primary" type="submit">Send invoice</Button>
          </FormActions>
        ) : <Text role="status" textStyle="Body/Small/Regular" tone="base">Sent at {formatTime(TODAY)} · due {formatDate(daysFromToday(chosen.days))}</Text>}
      </Form>
    </Card>
  );
}
