import { useId, useRef, useState } from "react";
import type { PlatformPage } from "../../PlatformExamples";
import type { ExampleDef } from "../types";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import { ActionBar } from "../../../components/ActionBar";
import { Badge } from "../../../components/Badge";
import { BottomSheet } from "../../../components/BottomSheet";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon } from "../../../components/DockIcon";
import { Form, FormActions, FormFieldset, useFormState } from "../../../components/Form";
import { Icon } from "../../../components/Icon";
import { InlineMessage } from "../../../components/InlineMessage";
import { TextAreaField } from "../../../components/Input";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListItem } from "../../../components/ListItem";
import { RadioButton } from "../../../components/RadioButton";
import { Heading, Text } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { TODAY, daysFromToday, formatDate, formatMoney, formatRange, formatRelative, formatTime, invoiceStatusTheme, invoices, people, projectById, type InvoiceStatus } from "../data";
import { keepOnHotUpdate } from "../../hotData";
import "./radio-button.css";

export const page: PlatformPage = "radio-button";

/* ───────────── Payment terms: captions say what each choice means ───────────── */

const paymentTerms = [
  { id: "receipt", label: "Due on receipt", days: 0 },
  { id: "net15", label: "Net 15", days: 15 },
  { id: "net30", label: "Net 30", days: 30, note: "studio default" },
  { id: "net45", label: "Net 45", days: 45, note: "needs approval from Finance" },
];
const termsCaption = (term: (typeof paymentTerms)[number]) => `Due ${formatDate(daysFromToday(term.days))}${term.note ? ` · ${term.note}` : ""}`;
// The studio's draft invoice to Saola Outdoor (the same INV-2026-0143 the Stepper page approves).
const draftInvoice = invoices.find((invoice) => invoice.status === "Draft")!;

function PaymentTermsExample() {
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
    <Card theme="flat">
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

/* ───────────── Decline with a reason: no default, "Something else" asks for a note ───────────── */

const declineReasons = [
  { id: "wrong", label: "I'm not the right reviewer" },
  { id: "context", label: "It needs more context first" },
  { id: "away", label: "I'm out until Monday" },
  { id: "other", label: "Something else" },
];

function DeclineReviewExample() {
  const bao = people.bao;
  const [declined, setDeclined] = useState(false);
  // No option is safe to assume here, so none is pre-selected and the group is required.
  const form = useFormState({
    initialValues: { reason: "", note: "" },
    validate: ({ reason, note }) => ({
      reason: reason ? undefined : "Choose a reason",
      note: reason === "other" && !note.trim() ? "Tell Bao why in a few words" : undefined,
    }),
    onSubmit: () => setDeclined(true),
  });
  // The whole card is the form: header, reason, note and actions take the Form's gap.
  return (
    <Card theme="flat">
      <Form form={form}>
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Connect the rewards API to checkout</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">PHIN-219 · {bao.name} asked for your review {formatRelative(daysFromToday(0, 10, 17))}</Text>
        </Stack>
        {declined ? (
          <InlineMessage theme="neutral" title="Review declined" action={{ label: "Undo", onClick: () => setDeclined(false) }}>
            Bao sees your reason and can ask someone else.
          </InlineMessage>
        ) : (
          <>
            <FormFieldset kind="radio" legend="Why are you declining?" required error={form.fieldError("reason")}>
              {declineReasons.map((reason) => <RadioButton key={reason.id} label={reason.label} {...form.radioField("reason", reason.id)} />)}
            </FormFieldset>
            {form.values.reason === "other" ? <TextAreaField label="Note for Bao" rows={3} {...form.field("note")} /> : null}
            <FormActions>
              <Button level="primary" type="submit">Decline review</Button>
            </FormActions>
          </>
        )}
      </Form>
    </Card>
  );
}

/* ───────────── Project visibility: radio cards in a row, one option unavailable ───────────── */

const loyalty = projectById("phin-loyalty");
const visibilityOptions = [
  { id: "members", label: "Project members", caption: "Chi, Bao, Em and Duy can open it" },
  { id: "studio", label: "Everyone at Đìzai Studio", caption: "All 48 people can find and open it" },
  { id: "guests", label: "Members and Phin & Co guests", caption: "Turn on client guest access in Settings first", disabled: true },
];

function ProjectVisibilityExample() {
  const { toast } = useToast();
  const name = useId();
  const headingId = useId();
  const [saved, setSaved] = useState("members");
  const [visibility, setVisibility] = useState(saved);
  const save = () => {
    setSaved(visibility);
    toast({ title: "Visibility updated", children: `${visibilityOptions.find((option) => option.id === visibility)?.label} can open ${loyalty.name}` });
  };
  const dirty = visibility !== saved;
  // A settings section on the page: the form is named by its heading; header, options and actions take the Form's gap.
  return (
    <Form onSubmit={save} aria-labelledby={headingId}>
      <Stack gap="xs">
        <Heading level={4} id={headingId} textStyle="Heading/4">Visibility</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">{loyalty.name} · {loyalty.client}. People outside the project find it only if you allow it.</Text>
      </Stack>
      <FormFieldset kind="radio" legend={`Who can open ${loyalty.name}`}>
        {/* Radio cards: the whole card selects; the selected card gets the Active stroke. */}
        <Grid minColumnWidth={280} gap="md">
          {visibilityOptions.map((option) => (
            <Card key={option.id} className="px-radio-button-card" theme="flat" spacing="small" selected={visibility === option.id}>
              <RadioButton name={name} value={option.id} bold label={option.label} caption={option.caption} disabled={option.disabled}
                checked={visibility === option.id} onCheckedChange={(checked) => { if (checked) setVisibility(option.id); }} />
            </Card>
          ))}
        </Grid>
      </FormFieldset>
      {/* Nothing to cancel or save until the choice differs from what is saved. */}
      <FormActions align="between">
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{dirty ? "Unsaved changes" : ""}</Text>
        <Button level="tertiary" disabled={!dirty} onClick={() => setVisibility(saved)}>Cancel</Button>
        <Button level="primary" type="submit" disabled={!dirty}>Save visibility</Button>
      </FormActions>
    </Form>
  );
}

/* ───────────── Date and time: two short groups in a row, with a live preview ───────────── */

type TimePrefs = { clock: "12" | "24"; week: "monday" | "sunday" };
const savedPrefs: TimePrefs = { clock: "12", week: "monday" };
const clientReview = daysFromToday(1, 14, 0);

function DateTimeExample() {
  const { toast } = useToast();
  const clockName = useId();
  const weekName = useId();
  const [saved, setSaved] = useState(savedPrefs);
  const [draft, setDraft] = useState(savedPrefs);
  const dirty = draft.clock !== saved.clock || draft.week !== saved.week;
  const pick = (next: Partial<TimePrefs>) => (checked: boolean) => { if (checked) setDraft({ ...draft, ...next }); };
  const time = draft.clock === "12" ? formatTime(clientReview) : `${clientReview.getHours()}:${String(clientReview.getMinutes()).padStart(2, "0")}`;
  const week = draft.week === "monday" ? formatRange(daysFromToday(-2), daysFromToday(4)) : formatRange(daysFromToday(-3), daysFromToday(3));
  const save = () => { setSaved(draft); toast({ title: "Preferences saved" }); };
  return (
    <Card theme="flat">
      <Form onSubmit={save}>
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Date and time</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">How times and weeks show for you across Zen. Teammates keep their own settings.</Text>
        </Stack>
        <Grid minColumnWidth={400} gap="lg" align="start">
          <Stack gap="md" direction="column">
            {/* Two short options: a row (direction="row"), not a column. */}
            <FormFieldset kind="radio" legend="Time format" direction="column">
              <RadioButton name={clockName} value="12" label="12-hour" checked={draft.clock === "12"} onCheckedChange={pick({ clock: "12" })} />
              <RadioButton name={clockName} value="24" label="24-hour" checked={draft.clock === "24"} onCheckedChange={pick({ clock: "24" })} />
            </FormFieldset>
            <FormFieldset kind="radio" legend="Week starts on" direction="column">
              <RadioButton name={weekName} value="monday" label="Monday" checked={draft.week === "monday"} onCheckedChange={pick({ week: "monday" })} />
              <RadioButton name={weekName} value="sunday" label="Sunday" checked={draft.week === "sunday"} onCheckedChange={pick({ week: "sunday" })} />
            </FormFieldset>
          </Stack>
          <Box surface="pale" radius="lg" padding="md" aria-live="polite">
            <DescriptionList items={[{ term: "Client review", description: `Thursday at ${time}` }, { term: "This week", description: week }]} />
          </Box>
        </Grid>
        <FormActions align="between">
          <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{dirty ? "Unsaved changes" : ""}</Text>
          <Button level="tertiary" disabled={!dirty} onClick={() => setDraft(saved)}>Cancel</Button>
          <Button level="primary" type="submit" disabled={!dirty}>Save preferences</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

/* ───────────── Delivery slot: a phone screen with full-width rows ───────────── */

const deliverySlots = [
  { id: "thu-am", label: "Thursday, Oct 1 · Morning", caption: "8:00 am – 12:00 pm · Free" },
  { id: "thu-pm", label: "Thursday, Oct 1 · Afternoon", caption: "1:00 pm – 5:00 pm · Free" },
  { id: "fri-am", label: "Friday, Oct 2 · Morning", caption: "Fully booked", disabled: true },
  { id: "fri-pm", label: "Friday, Oct 2 · Afternoon", caption: "1:00 pm – 5:00 pm · Free" },
  { id: "sat-am", label: "Saturday, Oct 3 · Morning", caption: "8:00 am – 12:00 pm · $15.00 weekend fee" },
];

function DeliverySlotExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const name = useId();
  // One scroller per screen; each screen keys its PlatformPhone, so it opens at the top and measures its own header.
  const screenRef = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState("thu-am");
  // The demo opens on the slot screen; Back shows the shipment it belongs to.
  const [draft, setDraft] = useState<string | null>(slot);
  const [asking, setAsking] = useState(false);
  const current = deliverySlots.find((item) => item.id === slot) ?? deliverySlots[0];
  const open = () => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setDraft(slot));
  const leave = () => screen.go('[data-row="slot"] .zen-list-item__wrapper', () => { setAsking(false); setDraft(null); });
  // Back with a new, unconfirmed slot asks first instead of dropping it.
  const back = () => (draft !== slot ? setAsking(true) : leave());
  const confirm = () => {
    if (draft && draft !== slot) toast({ title: "Delivery slot updated" });
    if (draft) setSlot(draft);
    leave();
  };
  if (draft !== null) {
    return (
      <PlatformPhone key="slot" label="Delivery slot" headerOverlay screenRef={screenRef}
        header={<TopNavigation type="compact-alt" title="Delivery slot" scrollRef={screenRef} leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
        footer={<ActionBar position="static" primaryAction={{ label: "Confirm slot", onClick: confirm }} />}>
        {screen.anchor}
        {/* Margin-Compact body (padding lg, 20). */}
        <Stack gap="md" padding="lg">
          <Text tone="base">Someone at the studio signs for the 2 pallets when they arrive.</Text>
          <FormFieldset kind="radio" legend="Delivery slot" hideLegend className="px-radio-button-rows">
            {deliverySlots.map((item) => (
              <RadioButton key={item.id} name={name} value={item.id} radioSide="right" label={item.label} caption={item.caption} disabled={item.disabled}
                checked={draft === item.id} onCheckedChange={(checked) => { if (checked) setDraft(item.id); }} bold />
            ))}
          </FormFieldset>
        </Stack>
        <BottomSheet inline open={asking} onOpenChange={setAsking} title="Discard the new slot?"
          primaryAction={{ label: "Discard slot", level: "danger", onClick: leave }} secondaryAction={{ label: "Keep choosing" }}>
          <Text tone="base">{current.label} stays booked for MF-20931.</Text>
        </BottomSheet>
      </PlatformPhone>
    );
  }
  return (
    <PlatformPhone key="root" label="Delivery" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="alt" title="Delivery" largeTitle="Delivery" scrollRef={screenRef} />}>
      {screen.anchor}
      <Stack padding="lg">
        <List aria-label="Shipment MF-20931">
          <ListItem title="In transit to Ho Chi Minh City" caption={`MF-20931 · Left Hai Phong ${formatRelative(daysFromToday(-1, 18, 10)).toLowerCase()}`}
            leading={<DockIcon icon="icon-truck-line" theme="teal" background="subtle" size="medium" />} />
          <ListItem title="Deliver to" caption="Đìzai Studio, 12 Ton Duc Thang, District 1"
            leading={<DockIcon icon="icon-building-01-line" theme="neutral" background="subtle" size="medium" />} />
          <ListItem data-row="slot" title="Delivery slot" caption={`${current.label} · ${current.caption.split(" · ")[0]}`} onClick={open}
            leading={<DockIcon icon="icon-calendar-line" theme="blue" background="subtle" size="medium" />}
            trailing={<Icon name="icon-chevron-right-line-small" size="base" decorative />} />
        </List>
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Payment terms",
    description: "Each caption states what the choice means, here the due date it sets. The studio's usual terms are pre-selected; arrow keys move and select within the group, and the group locks once the invoice is sent.",
    render: () => <PaymentTermsExample />,
    code: `const [term, setTerm] = useState("net30");

<Form onSubmit={send}>
  <FormFieldset kind="radio" legend="Payment terms">
    {terms.map((t) => (
      <RadioButton key={t.id} name="payment-terms" value={t.id} label={t.label}
        caption={\`Due \${formatDate(addDays(today, t.days))}\`}
        disabled={status === "Sent"}
        checked={term === t.id} onCheckedChange={(checked) => { if (checked) setTerm(t.id); }} />
    ))}
  </FormFieldset>
  <FormActions>
    <Button level="primary" type="submit">Send invoice</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Decline with a reason",
    description: "With no safe default nothing is pre-selected, and submitting without a choice shows the error on the group. Picking Something else adds a required note field.",
    render: () => <DeclineReviewExample />,
    code: `const form = useFormState({
  initialValues: { reason: "", note: "" },
  validate: ({ reason, note }) => ({
    reason: reason ? undefined : "Choose a reason",
    note: reason === "other" && !note.trim() ? "Tell Bao why in a few words" : undefined,
  }),
  onSubmit: decline,
});

<Form form={form}>
  <FormFieldset kind="radio" legend="Why are you declining?" required error={form.fieldError("reason")}>
    <RadioButton label="I'm not the right reviewer" {...form.radioField("reason", "wrong")} />
    <RadioButton label="It needs more context first" {...form.radioField("reason", "context")} />
    <RadioButton label="Something else" {...form.radioField("reason", "other")} />
  </FormFieldset>
  {form.values.reason === "other" ? <TextAreaField label="Note for Bao" rows={3} {...form.field("note")} /> : null}
  <FormActions>
    <Button level="primary" type="submit">Decline review</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Project visibility",
    description: "A settings section where each option is a card with a bold label and a caption, side by side on wide screens. An option that isn't available yet stays visible, disabled, with the reason in its caption; Cancel and Save wake up once the choice changes.",
    wide: true,
    render: () => <ProjectVisibilityExample />,
    code: `const [visibility, setVisibility] = useState(saved);

<Form onSubmit={save} aria-labelledby="visibility">
  <Heading level={4} id="visibility" textStyle="Heading/4">Visibility</Heading>
  <FormFieldset kind="radio" legend="Who can open Loyalty app">
    <Grid minColumnWidth={280} gap="md">
      {options.map((option) => (
        <Card key={option.id} theme="flat" spacing="small" selected={visibility === option.id}>
          <RadioButton name="visibility" value={option.id} bold label={option.label} caption={option.caption}
            disabled={option.disabled} checked={visibility === option.id}
            onCheckedChange={(checked) => { if (checked) setVisibility(option.id); }} />
        </Card>
      ))}
    </Grid>
  </FormFieldset>
  <FormActions align="between">
    <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{dirty ? "Unsaved changes" : ""}</Text>
    <Button level="tertiary" disabled={!dirty} onClick={() => setVisibility(saved)}>Cancel</Button>
    <Button level="primary" type="submit" disabled={!dirty}>Save visibility</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Date and time",
    description: "Two or three short options sit side by side (direction row), not in a column. A live preview shows what each choice changes before it is saved.",
    wide: true,
    render: () => <DateTimeExample />,
    code: `<Form onSubmit={save}>
  <Grid minColumnWidth={400} gap="lg" align="start">
    <Stack gap="md" direction="column">
      <FormFieldset kind="radio" legend="Time format" direction="column">
        <RadioButton name="clock" value="12" label="12-hour" checked={draft.clock === "12"} onCheckedChange={pick({ clock: "12" })} />
        <RadioButton name="clock" value="24" label="24-hour" checked={draft.clock === "24"} onCheckedChange={pick({ clock: "24" })} />
      </FormFieldset>
      <FormFieldset kind="radio" legend="Week starts on" direction="column">
        <RadioButton name="week" value="monday" label="Monday" checked={draft.week === "monday"} onCheckedChange={pick({ week: "monday" })} />
        <RadioButton name="week" value="sunday" label="Sunday" checked={draft.week === "sunday"} onCheckedChange={pick({ week: "sunday" })} />
      </FormFieldset>
    </Stack>
    <Box surface="pale" radius="lg" padding="md" aria-live="polite">
      <DescriptionList items={[{ term: "Client review", description: \`Thursday at \${time}\` }, { term: "This week", description: week }]} />
    </Box>
  </Grid>
  <FormActions align="between">
    <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{dirty ? "Unsaved changes" : ""}</Text>
    <Button level="tertiary" disabled={!dirty} onClick={() => setDraft(saved)}>Cancel</Button>
    <Button level="primary" type="submit" disabled={!dirty}>Save preferences</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Delivery slot",
    description: "A phone screen for a Mekong Freight delivery: rows fill the width with the mark on the right (radioSide), a full slot stays visible but disabled, and Confirm slot in the ActionBar applies the choice. Back shows the shipment, and asks first when a new slot is not confirmed yet.",
    render: () => <DeliverySlotExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);
// Back with an unconfirmed slot asks first.
const back = () => (draft !== slot ? setAsking(true) : leave());

<PlatformPhone key="slot" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact-alt" title="Delivery slot" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
  footer={<ActionBar position="static" primaryAction={{ label: "Confirm slot", onClick: confirm }} />}>
  <Stack gap="md" padding="lg">
    <FormFieldset kind="radio" legend="Delivery slot" hideLegend>
      {slots.map((slot) => (
        <RadioButton key={slot.id} name="slot" value={slot.id} radioSide="right"
          label={slot.label} caption={slot.caption} disabled={slot.disabled}
          checked={draft === slot.id} onCheckedChange={(checked) => { if (checked) setDraft(slot.id); }} />
      ))}
    </FormFieldset>
  </Stack>
  <BottomSheet inline open={asking} onOpenChange={setAsking} title="Discard the new slot?"
    primaryAction={{ label: "Discard slot", level: "danger", onClick: leave }} secondaryAction={{ label: "Keep choosing" }}>
    <Text tone="base">Thursday, Oct 1 · Morning stays booked for MF-20931.</Text>
  </BottomSheet>
</PlatformPhone>`,
  },
]);
