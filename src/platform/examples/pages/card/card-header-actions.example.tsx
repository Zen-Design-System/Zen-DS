import { useId, useRef, useState } from "react";
import {
  Badge, Button, Card, DescriptionList, Heading, IconButton, InputField, Menu, ModalForm, Stack, Text, useFormState, useToast,
} from "@zen-ds/react";
import { daysFromToday, formatDate, formatMoney, invoiceStatusTheme, type InvoiceStatus } from "../../data";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Header actions: one action is the card's Sub-Action, several go in its ⋯ menu. */
export default function InvoiceSide() {
  const { toast } = useToast();
  const [email, setEmail] = useState("trang.le@phinco.vn");
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<InvoiceStatus>("Sent");
  const clientId = useId();
  const invoiceId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  const markPaidButton = useRef<HTMLButtonElement>(null);
  const markPaid = () => {
    setStatus("Paid");
    // Mark as paid leaves with the Sent status, so focus moves to the invoice's ⋯ menu instead of falling to <body>.
    setTimeout(() => menuButton.current?.focus());
    // Undo closes its toast as it runs, so focus goes back to Mark as paid once it is there again.
    toast({ type: "positive", title: "Invoice marked as paid", action: { label: "Undo", onClick: () => { setStatus("Sent"); setTimeout(() => markPaidButton.current?.focus()); } } });
  };
  // Edit billing contact: one email field; a valid address replaces the contact's and a toast confirms it.
  const contact = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email: value }) => {
      const text = value.trim();
      if (!text) return { email: "Enter an email address" };
      return { email: emailPattern.test(text) ? undefined : "Enter a valid email address, like name@company.com" };
    },
    onSubmit: ({ email: value }, { reset }) => {
      const text = value.trim();
      setEmail(text);
      setEditing(false);
      reset();
      toast({ type: "positive", title: "Billing contact updated" });
    },
  });
  // Cancel, Escape and the scrim close the dialog and clear what was typed.
  const changeEditing = (open: boolean) => { setEditing(open); if (!open) contact.reset(); };
  return (
    <Stack gap="md">
      <Card as="section" theme="default" aria-labelledby={clientId}
        subAction={{ label: "Edit billing contact", icon: "icon-edit-02-line", onClick: () => setEditing(true) }}>
        <Stack gap="md">
          <Heading level={4} id={clientId} textStyle="Heading/Subheading">Client</Heading>
          <DescriptionList layout="stacked" items={[
            { term: "Company", description: "Phin & Co" },
            { term: "Billing contact", description: "Trang Le" },
            { term: "Email", description: email },
            { term: "Address", description: "42 Nguyen Hue, District 1, Ho Chi Minh City" },
          ]} />
        </Stack>
      </Card>
      <Card as="section" theme="default" aria-labelledby={invoiceId}
        subAction={
          <Menu align="end"
            trigger={<IconButton ref={menuButton} appearance="flat" level="secondary" size="sm" icon="icon-dots-vertical-line" aria-label="Invoice actions" />}
            items={[
              { id: "remind", label: "Send reminder", icon: "icon-mail-01-line", disabled: status === "Paid", onSelect: () => toast({ title: "Reminder sent", children: `To ${email}` }) },
              { id: "pdf", label: "Download PDF", icon: "icon-download-01-line", onSelect: () => toast({ title: "PDF downloaded", children: "INV-2026-0142.pdf" }) },
            ]} />
        }>
        <Stack gap="md">
          <Stack gap="xs">
            <Heading level={4} id={invoiceId} textStyle="Heading/Subheading">INV-2026-0142</Heading>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">Loyalty app · Milestone 2</Text>
          </Stack>
          <DescriptionList items={[
            { term: "Status", description: <Badge theme={invoiceStatusTheme[status]} background="subtle">{status}</Badge> },
            { term: "Amount", description: formatMoney(21000, true) },
            { term: "Due", description: formatDate(daysFromToday(25)) },
          ]} />
          {status === "Sent" ? <Button ref={markPaidButton} level="tertiary" startIcon="icon-check-line" onClick={markPaid}>Mark as paid</Button> : null}
        </Stack>
      </Card>
      <ModalForm open={editing} onOpenChange={changeEditing} title="Edit billing contact"
        description="Invoices for Phin & Co go to this address." onSubmit={contact.handleSubmit}
        primaryAction={{ label: "Save email" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Billing email" type="email" autoComplete="off" placeholder="name@phinco.vn" data-autofocus="" {...contact.field("email")} />
      </ModalForm>
    </Stack>
  );
}
