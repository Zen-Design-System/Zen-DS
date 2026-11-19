import { useState } from "react";
import { Badge, Card, Heading, InputField, NumberField, Stack, Toggle, useToast } from "@zen-ds/react";
import { formatDate, formatMoney, invoiceStatusTheme, invoices } from "../../data";

const sentInvoice = invoices[0]; // INV-2026-0142 · Phin & Co · $21,000 · Sent

/** A sent invoice keeps its number and amount read-only; the reminder field waits, disabled, for its switch. */
export default function SentInvoice() {
  const { toast } = useToast();
  const [reminders, setReminders] = useState(false);
  const [days, setDays] = useState<number | null>(3);
  const firstReminder = new Date(sentInvoice.due.getTime() - (days ?? 0) * 86_400_000);
  const copy = () => {
    navigator.clipboard.writeText(sentInvoice.number).catch(() => undefined);
    toast({ type: "positive", title: "Invoice number copied" });
  };
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      {/* Two groups in one card (lg apart); fields inside a group md apart. */}
      <Stack gap="lg">
        <Stack gap="md">
          <Stack direction="row" gap="sm" align="start" justify="between">
            <Heading level={4} textStyle="Heading/Subheading">Invoice for {sentInvoice.client}</Heading>
            <Badge theme={invoiceStatusTheme[sentInvoice.status]} background="subtle">{sentInvoice.status}</Badge>
          </Stack>
          <InputField label="Invoice number" readOnly value={sentInvoice.number} labelAction={<button type="button" onClick={copy}>Copy</button>} />
          <InputField label="Amount" readOnly value={formatMoney(sentInvoice.amount, true)} helpText={`Locked since it was sent on ${formatDate(sentInvoice.issued)}.`} />
        </Stack>
        {/* A setting row fills the card (fillChildren + stretch), so the switch lines up with the fields' right edge. */}
        <Stack gap="md" align="stretch" fillChildren>
          <Toggle size="md" label="Payment reminders" caption={`Email ${sentInvoice.client} before the due date, ${formatDate(sentInvoice.due)}`} checked={reminders} onCheckedChange={setReminders} />
          <NumberField label="Days before the due date" min={1} max={14} value={days} onValueChange={setDays} disabled={!reminders}
            helpText={reminders ? `First reminder on ${formatDate(firstReminder)}.` : "Turn on payment reminders to set a schedule."} />
        </Stack>
      </Stack>
    </Card></Stack>
  );
}
