import { useId, useRef, useState } from "react";
import {
  Badge, Button, Card, DateField, Dialog, EmptyState, Form, FormActions, Grid, Heading, InputField, NumberField, Stack, Text, TextAreaField, useFormState, useToast,
  type BadgeTheme,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatMoney, formatTime } from "../../data";

/** A network round trip in the demo. */
const wait = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });
/** "10/14/2026" (the DateField's typed format) → a Date, or null while it is incomplete or not a real day. */
const parseDay = (text: string) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  const d = m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : null;
  return d && d.getDate() === Number(m?.[2]) ? d : null;
};
const startOfToday = daysFromToday(0, 0, 0);

/** A card's header: its title (Heading/Subheading, h4 under the example's h3) with an optional Badge (2xs beside it)
 *  and one supporting line (xs below). */
function CardHeader({ id, title, badge, children }: { id: string; title: string; badge?: { label: string; theme: BadgeTheme }; children: string }) {
  return (
    <Stack gap="xs">
      <Stack direction="row" gap="2xs" align="center" wrap>
        <Heading level={4} id={id} textStyle="Heading/Subheading">{title}</Heading>
        {badge ? <Badge theme={badge.theme} background="subtle">{badge.label}</Badge> : null}
      </Stack>
      <Text textStyle="Body/Small/Regular" tone="base">{children}</Text>
    </Stack>
  );
}

type DraftValues = { amount: number | null; due: string; note: string };
const draftStart: DraftValues = { amount: 24500, due: "10/30/2026", note: "Milestone 3: points history, rewards at checkout and the Android release." };
const billTo = "trang.le@phinco.vn";

export default function DraftInvoice() {
  const { toast } = useToast();
  const titleId = useId();
  const [status, setStatus] = useState<"Draft" | "Sent" | "Deleted">("Draft");
  const [deleting, setDeleting] = useState(false);
  // Focus follows each change of the card, so it never drops to <body>.
  const amountRef = useRef<HTMLInputElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const downloadRef = useRef<HTMLButtonElement>(null);
  const emptyTitleRef = useRef<HTMLSpanElement>(null);
  const form = useFormState<DraftValues>({
    initialValues: draftStart,
    validate: (values) => {
      const due = parseDay(values.due);
      return {
        amount: values.amount && values.amount > 0 ? undefined : "Enter the amount to invoice",
        due: !due ? "Enter the due date, like 10/30/2026" : due <= startOfToday ? "Choose a due date after today" : undefined,
      };
    },
    onSubmit: async () => {
      await wait(900);
      setStatus("Sent");
      // Sending can be undone for a few seconds, so it acts at once and the toast offers Undo.
      toast({ title: "Invoice sent", action: { label: "Undo", onClick: () => { setStatus("Draft"); setTimeout(() => sendRef.current?.focus()); } } });
      setTimeout(() => downloadRef.current?.focus());
    },
  });
  const saveDraft = () => { form.reset(form.values); toast({ title: "Draft saved" }); };
  const remove = () => {
    setDeleting(false);
    setStatus("Deleted");
    toast({ title: "Draft deleted" });
    setTimeout(() => emptyTitleRef.current?.focus());
  };
  const restart = () => { form.reset(draftStart); setStatus("Draft"); setTimeout(() => amountRef.current?.focus()); };
  const sent = status === "Sent";
  const amount = form.values.amount ?? 0;

  if (status === "Deleted") {
    return (
      <Stack><Card as="section" theme="default" aria-label="Draft invoices" width="fill" maxWidth={720} alignSelf="center">
        <EmptyState size="sm" headingLevel={4} icon="icon-receipt-line" title={<span ref={emptyTitleRef} tabIndex={-1}>No draft invoices</span>}
          primaryAction={{ label: "New draft", onClick: restart }}>
          Start a draft from a project milestone.
        </EmptyState>
      </Card></Stack>
    );
  }
  return (
    <Stack><Card as="section" theme="default" aria-labelledby={titleId} width="fill" maxWidth={720} alignSelf="center" surface="default">
      <Stack gap="md">
        <CardHeader id={titleId} title="INV-2026-0144" badge={{ label: status, theme: sent ? "blue" : "neutral" }}>
          {sent ? `Sent to ${billTo} at ${formatTime(TODAY)}` : "Phin & Co · Loyalty app · Milestone 3"}
        </CardHeader>
        <Form form={form} gap="md">
          {/* Read-only: facts set by the project, still selectable and copyable. Once sent, every field reads only. */}
          <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="lg">
            <InputField label="Client" readOnly value="Phin & Co" />
            <InputField label="Bill to" readOnly value={billTo} />
            {sent ? (
              // Once sent, the amount reads as money, not as the number being typed.
              <InputField label="Amount (USD)" readOnly value={formatMoney(amount, true)} />
            ) : (
              <NumberField ref={amountRef} label="Amount (USD)" min={0} step={500} helpText={amount ? formatMoney(amount, true) : undefined} {...form.numberField("amount")} />
            )}
            <DateField label="Due date" today={TODAY} minDate={daysFromToday(1, 0, 0)} readOnly={sent} {...form.dateField("due")} />
          </Grid>
          <TextAreaField label="Note to the client" labelOptional rows={3} maxLength={200} characterLimit={!sent} readOnly={sent} {...form.field("note")} />
          {sent ? (
            // The one action left keeps the place the actions had, at the end of the row. Nothing submits any more, so it
            // is no FormActions row.
            <Stack align="end">
              <Button ref={downloadRef} level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "PDF downloaded", children: "INV-2026-0144.pdf" })}>Download PDF</Button>
            </Stack>
          ) : (
            // align="between": the destructive action sits alone on the left, away from Send invoice.
            <FormActions align="between">
              <Button level="danger-subtle" startIcon="icon-trash-line" disabled={form.isSubmitting} onClick={() => setDeleting(true)}>Delete draft</Button>
              <Button level="tertiary" disabled={form.isSubmitting} onClick={saveDraft}>Save draft</Button>
              <Button ref={sendRef} level="primary" type="submit">{form.isSubmitting ? "Sending…" : "Send invoice"}</Button>
            </FormActions>
          )}
        </Form>
      </Stack>
      <Dialog open={deleting} onOpenChange={setDeleting} theme="negative" title="Delete this draft?"
        description={`INV-2026-0144 for Phin & Co (${formatMoney(amount, true)}) is deleted for everyone. This can't be undone.`}
        primaryAction={{ label: "Delete draft", level: "danger", onClick: remove }}
        secondaryAction={{ label: "Cancel" }} />
    </Card></Stack>
  );
}
