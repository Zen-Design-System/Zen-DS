import { useId, useRef, useState } from "react";
import { Badge, Button, Card, Heading, Stack, Stepper, StepperStep, Text, useToast } from "@zen-ds/react";
import { formatDate, formatMoney, invoiceStatusTheme, invoices, people } from "../../data";

const approvalInvoice = invoices.find((invoice) => invoice.status === "Draft")!;

/** A read-only tracker of who has to approve an invoice, and since when. */
export default function InvoiceApproval() {
  const { toast } = useToast();
  const titleId = useId();
  const statusRef = useRef<HTMLParagraphElement>(null);
  const approveRef = useRef<HTMLButtonElement>(null);
  const [approved, setApproved] = useState(false);
  // Approve goes away once pressed, so focus moves to the status line; Undo brings the button back and focuses it.
  const undo = () => {
    setApproved(false);
    setTimeout(() => approveRef.current?.focus());
  };
  const approve = () => {
    setApproved(true);
    setTimeout(() => statusRef.current?.focus());
    toast({ title: "Invoice approved", children: approvalInvoice.number, action: { label: "Undo", onClick: undo } });
  };

  return (
    <Card theme="default" as="section" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Stack direction="row" gap="2xs" align="center" wrap>
            <Heading level={4} id={titleId} textStyle="Heading/Subheading">{approvalInvoice.number}</Heading>
            <Badge background="subtle" theme={invoiceStatusTheme[approvalInvoice.status]}>{approvalInvoice.status}</Badge>
          </Stack>
          <Text textStyle="Body/Small/Regular" tone="base">{`${approvalInvoice.client} · ${formatMoney(approvalInvoice.amount, true)} · Due ${formatDate(approvalInvoice.due)}`}</Text>
        </Stack>
        {/* A read-only tracker: no onStepClick, the captions say who acts and since when. The steps as StepperStep
            children (Figma's steps slot) rather than a steps array. */}
        <Stepper aria-label="Invoice approval" orientation="vertical" current={approved ? 2 : 1}>
          <StepperStep id="draft" title="Draft" caption={`${people.linh.name} · 9:12 am`} />
          <StepperStep id="lead" title="Design lead" caption={approved ? "You · Approved at 10:30 am" : "You · Waiting since 9:12 am"} />
          <StepperStep id="finance" title="Finance" caption={approved ? `${people.mai.name} · Waiting since 10:30 am` : people.mai.name} />
          <StepperStep id="client" title="Client" caption={`Sent to ${approvalInvoice.client}`} />
        </Stepper>
        {/* The card's one action sits on the right, like FormActions. */}
        {approved
          ? <Text ref={statusRef} tabIndex={-1} role="status" textStyle="Body/Base/Regular" tone="base">{`Waiting for ${people.mai.name} in Finance.`}</Text>
          : <Stack direction="row" justify="end"><Button ref={approveRef} level="primary" onClick={approve}>Approve invoice</Button></Stack>}
      </Stack>
    </Card>
  );
}
