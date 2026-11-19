import { useState } from "react";
import { Badge, Button, Card, DescriptionList, Form, FormActions, Heading, InputField, Stack, Text, useFormState, useToast } from "@zen-ds/react";
import { formatDate, formatMoney, invoiceStatusTheme, invoices, type InvoiceStatus } from "../../data";

const saolaInvoice = invoices.find((invoice) => invoice.status === "Draft")!;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** A network round trip in the demo. */
const wait = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

export default function SendInvoice() {
  const { toast } = useToast();
  const [status, setStatus] = useState<InvoiceStatus>(saolaInvoice.status);
  const [sentTo, setSentTo] = useState("");
  const recordPayment = () => {
    setStatus("Paid");
    toast({ type: "positive", title: "Payment recorded", action: { label: "Undo", onClick: () => setStatus("Sent") } });
  };
  // The Primary submits the current step. Send invoice shows its own progress while the request runs (isSubmitting)
  // and Download PDF waits; once sent, Record payment takes the Primary slot.
  const form = useFormState({
    initialValues: { email: "finance@saolaoutdoor.vn" },
    validate: ({ email }) => ({ email: emailPattern.test(email.trim()) ? undefined : "Enter an email address, like finance@saolaoutdoor.vn" }),
    onSubmit: async ({ email }) => {
      if (status === "Sent") return recordPayment();
      await wait(1600);
      setSentTo(email.trim());
      setStatus("Sent");
      toast({ type: "positive", title: "Invoice sent", action: { label: "Undo", onClick: () => setStatus("Draft") } });
    },
  });
  const downloadPdf = () => toast({ title: "PDF downloaded" });
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center" spacing="md">
      <Stack gap="md">
        <Stack direction="row" justify="between" align="start" gap="sm">
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">{saolaInvoice.number}</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">Saola Outdoor · Brand refresh</Text>
          </Stack>
          <Badge theme={invoiceStatusTheme[status]} background="subtle">{status}</Badge>
        </Stack>
        <DescriptionList items={[
          { term: "Issued", description: formatDate(saolaInvoice.issued) },
          { term: "Due", description: formatDate(saolaInvoice.due) },
          ...(status === "Draft" ? [] : [{ term: "Sent to", description: sentTo }]),
          { term: "Amount", description: formatMoney(saolaInvoice.amount, true), emphasis: true },
        ]} />
        <Form form={form} gap="md">
          {status === "Draft" ? <InputField label="Send to" type="email" autoComplete="off" {...form.field("email")} /> : null}
          <FormActions>
            <Button level="tertiary" disabled={form.isSubmitting} onClick={downloadPdf}>Download PDF</Button>
            {status === "Paid" ? null : (
              <Button level="primary" type="submit" disabled={form.isSubmitting}>
                {status === "Sent" ? "Record payment" : form.isSubmitting ? "Sending…" : "Send invoice"}
              </Button>
            )}
          </FormActions>
        </Form>
      </Stack>
    </Card></Stack>
  );
}
