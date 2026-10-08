/* Form examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Form decision: a create page checks each field as you leave
   it and, on submit, moves focus to the first problem; the server's answer lands on the field or in an Inline Message
   with Try again; FormField and FormFieldset name controls that have no label of their own; FormActions keeps a
   destructive action apart; and on a phone the footer Action Bar submits the form by its id. */
import { useEffect, useId, useRef, useState } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Badge, type BadgeTheme } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Checkbox } from "../../../components/Checkbox";
import { Dialog } from "../../../components/Dialog";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { Form, FormActions, FormField, FormFieldset, useFormState } from "../../../components/Form";
import { InlineMessage } from "../../../components/InlineMessage";
import { DateField, InputField, NumberField, SelectField, TextAreaField } from "../../../components/Input";
import { Box, Container, Grid, Stack } from "../../../components/Layout";
import { List, ListItem } from "../../../components/ListItem";
import { PageHeader } from "../../../components/PageHeader";
import { RadioButton } from "../../../components/RadioButton";
import { Slider } from "../../../components/Slider";
import { Table, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { TODAY, daysFromToday, formatDay, formatMoney, formatTime, people, projectById, type PersonId } from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./form.css";

export const page: PlatformPage = "form";

/** A network round trip in the demo. */
const wait = (ms: number) => new Promise<void>((resolve) => { window.setTimeout(resolve, ms); });
/** Focus a control once the next render has put it on screen (the control that was focused may be gone by then). */
const focusSoon = (find: () => HTMLElement | null | undefined) => requestAnimationFrame(() => find()?.focus());
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
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

// ——— 1. New client: a create page, checked on blur and on submit ——————————————————————————————————————
type Terms = "net15" | "net30" | "net45";
const termsOptions: { value: Terms; label: string }[] = [{ value: "net15", label: "Net 15" }, { value: "net30", label: "Net 30" }, { value: "net45", label: "Net 45" }];
const countryOptions = [
  { value: "Vietnam", label: "Vietnam" }, { value: "Singapore", label: "Singapore" }, { value: "Thailand", label: "Thailand" },
  { value: "Australia", label: "Australia" }, { value: "United States", label: "United States" },
];
type ClientValues = { name: string; taxId: string; website: string; country: string; contact: string; email: string; terms: Terms };
type Client = ClientValues & { id: string };
const studioClients: Client[] = [
  { id: "phin", name: "Phin & Co", taxId: "0316482915", website: "phinco.vn", country: "Vietnam", contact: "Trang Le", email: "trang.le@phinco.vn", terms: "net30" },
  { id: "lumen", name: "Lumen Bank", taxId: "", website: "lumenbank.sg", country: "Singapore", contact: "Daniel Tan", email: "ap@lumenbank.sg", terms: "net45" },
  { id: "mekong", name: "Mekong Freight", taxId: "0309571442", website: "mekongfreight.vn", country: "Vietnam", contact: "Huy Dang", email: "huy.dang@mekongfreight.vn", terms: "net30" },
  { id: "bookfair", name: "Hanoi Book Fair", taxId: "0108836104", website: "", country: "Vietnam", contact: "Lan Nguyen", email: "lan@hanoibookfair.vn", terms: "net15" },
  { id: "saola", name: "Saola Outdoor", taxId: "0317204588", website: "saolaoutdoor.vn", country: "Vietnam", contact: "Mia Tran", email: "finance@saolaoutdoor.vn", terms: "net30" },
];
const blankClient: ClientValues = { name: "", taxId: "", website: "", country: "Vietnam", contact: "", email: "", terms: "net30" };
const termsLabel = (terms: Terms) => termsOptions.find((option) => option.value === terms)!.label;

const clientColumns: TableColumn<Client>[] = [
  { id: "name", header: "Client", cell: (client) => <TableText bold caption={client.website || client.country}>{client.name}</TableText> },
  { id: "contact", header: "Billing contact", width: "280px", cell: (client) => <TableText caption={client.email}>{client.contact}</TableText> },
  { id: "country", header: "Country", width: "160px", cell: (client) => <TableText>{client.country}</TableText> },
  { id: "terms", header: "Payment terms", width: "150px", cell: (client) => <TableText>{termsLabel(client.terms)}</TableText> },
];

function NewClientExample() {
  const { toast } = useToast();
  const rootRef = useRef<HTMLElement>(null);
  const newButton = useRef<HTMLButtonElement>(null);
  const [clients, setClients] = useState(studioClients);
  const [screen, setScreen] = useState<"new" | "list">("new");
  const [confirming, setConfirming] = useState(false);
  const companyId = useId();
  const billingId = useId();
  const form = useFormState<ClientValues>({
    initialValues: blankClient,
    // Each message names the fix. Errors show when a field is left with a bad value, and all of them on submit.
    validate: (values) => {
      const name = values.name.trim();
      const site = values.website.trim().replace(/^https?:\/\//, "");
      return {
        name: !name ? "Enter the company name"
          : clients.some((client) => client.name.toLowerCase() === name.toLowerCase()) ? `${name} is already a client` : undefined,
        website: site && !/^([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(site) ? "Enter a web address, like company.vn" : undefined,
        contact: values.contact.trim() ? undefined : "Enter who receives the invoices",
        email: !values.email.trim() ? "Enter the billing email" : emailPattern.test(values.email.trim()) ? undefined : "Enter an email like finance@company.com",
      };
    },
    onSubmit: async (values, { reset }) => {
      await wait(800);
      setClients((list) => [{ ...values, id: `new-${list.length}`, name: values.name.trim(), website: values.website.trim().replace(/^https?:\/\//, ""), email: values.email.trim() }, ...list]);
      reset();
      show("list");
      toast({ type: "positive", title: "Client added" });
    },
  });
  // Each screen change puts focus where the next step starts: the first field, or New client on the list. It runs
  // once the new screen has rendered, also when the switch comes from the end of an async submit.
  const moved = useRef(false);
  const show = (next: "new" | "list") => { moved.current = true; setScreen(next); };
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    (screen === "list" ? newButton.current : rootRef.current?.querySelector<HTMLElement>("input"))?.focus();
  }, [screen]);
  // Cancel asks only when something was typed.
  const cancel = () => (form.isDirty ? setConfirming(true) : show("list"));
  const discard = () => { setConfirming(false); form.reset(); show("list"); };

  return (
    // The screen card stretches its direct child: the Box paints the app's Canvas (the page layer) and holds the
    // Container that keeps the form at a readable width.
    <Box ref={rootRef} className="px-form-page"><Container maxWidth={screen === "new" ? "md" : "full"}>
      {screen === "list" ? (
        <Stack paddingY="xl" gap="xl">
          <PageHeader title="Clients" description={`${plural(clients.length, "company", "companies")} the studio invoices.`}
            actions={<Button ref={newButton} level="primary" startIcon="icon-plus-line" onClick={() => show("new")}>New client</Button>} />
          {/* The table is the page's content: it lies on the page, no Card. */}
          <Table aria-label="Clients" columns={clientColumns} rows={clients} />
        </Stack>
      ) : (
        <Stack paddingY="xl" gap="xl">
          <PageHeader back={{ label: "Clients", onClick: cancel }} title="New client"
            description="Invoices go to the billing contact. You can change these details later." />
          {/* Form spaces its groups lg; fields inside a group are md apart. Enter in any field submits. */}
          <Form form={form}>
            <Stack as="section" gap="md" aria-labelledby={companyId}>
              <Heading level={2} id={companyId} textStyle="Heading/4">Company</Heading>
              <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="lg">
                <InputField label="Company name" autoComplete="organization" {...form.field("name")} />
                <SelectField label="Country" options={countryOptions} {...form.selectField("country")} />
                <InputField label="Website" labelOptional inputMode="url" placeholder="company.vn" {...form.field("website")} />
                <InputField label="Tax ID" labelOptional inputMode="numeric" helpText="Printed on every invoice" {...form.field("taxId")} />
              </Grid>
            </Stack>
            <Stack as="section" gap="md" aria-labelledby={billingId}>
              <Heading level={2} id={billingId} textStyle="Heading/4">Billing</Heading>
              <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="lg">
                <InputField label="Billing contact" autoComplete="name" {...form.field("contact")} />
                <InputField label="Billing email" type="email" autoComplete="email" placeholder="finance@company.com" {...form.field("email")} />
              </Grid>
              <FormFieldset kind="radio" legend="Payment terms" direction="row" helpText="Days the client has to pay each invoice">
                {termsOptions.map((option) => <RadioButton key={option.value} label={option.label} {...form.radioField("terms", option.value)} />)}
              </FormFieldset>
            </Stack>
            <FormActions>
              <Button level="tertiary" disabled={form.isSubmitting} onClick={cancel}>Cancel</Button>
              <Button level="primary" type="submit">{form.isSubmitting ? "Adding…" : "Add client"}</Button>
            </FormActions>
          </Form>
        </Stack>
      )}
      <Dialog open={confirming} onOpenChange={setConfirming} theme="warning" title="Discard this client?"
        description="The details you entered are lost."
        primaryAction={{ label: "Discard client", level: "danger", onClick: discard }}
        secondaryAction={{ label: "Keep editing", autoFocus: true }} />
    </Container></Box>
  );
}

// ——— 2. Server answer: a taken address on the field, a failed request in an Inline Message ————————————————
const takenAddresses = ["dizaistudio", "studio", "design", "saigon"];

function WorkspaceAddressExample() {
  const { toast } = useToast();
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [address, setAddress] = useState("dizai");
  // The demo's network drops the first request for a free address; the retry goes through.
  const dropNext = useRef(true);
  const form = useFormState<{ slug: string }>({
    initialValues: { slug: "dizai" },
    validate: ({ slug }) => {
      const value = slug.trim().toLowerCase();
      return { slug: !value ? "Enter an address" : !/^[a-z0-9-]{3,30}$/.test(value) ? "Use 3–30 lowercase letters, numbers or hyphens" : undefined };
    },
    onSubmit: async ({ slug }, { setError, reset }) => {
      const value = slug.trim().toLowerCase();
      if (value === address) { setError("slug", `${value}.zen.app is already your address`); return; }
      await wait(900);
      // The server's own checks come back as a field error: Form moves focus to the field and announces it.
      if (takenAddresses.includes(value)) { setError("slug", `${value}.zen.app is taken. Try another, like ${value}-hcm`); return; }
      // A request that fails keeps every value; the Inline Message below offers Try again.
      if (dropNext.current) { dropNext.current = false; throw new Error("Zen didn't answer in time."); }
      setAddress(value);
      reset({ slug: value });
      dropNext.current = true;
      toast({ type: "positive", title: "Address changed" });
    },
  });
  const retry = () => {
    // The message leaves as the retry starts, so focus moves to the button that shows the progress.
    submitRef.current?.focus();
    formRef.current?.requestSubmit();
  };
  const preview = form.values.slug.trim().toLowerCase() || address;
  return (
    <Card as="section" theme="flat" aria-labelledby={titleId} className="px-form-card">
      <Stack gap="md">
        <CardHeader id={titleId} title="Workspace address">Everyone at Đìzai Studio signs in here. Old links keep working for 30 days.</CardHeader>
        <Form ref={formRef} form={form} gap="md">
          <InputField label="Address" autoComplete="off" helpText={`Opens at ${preview}.zen.app`} {...form.field("slug")} />
          {form.submitError ? (
            <InlineMessage theme="negative" title="Address not changed" action={{ label: "Try again", onClick: retry }}>{form.submitError}</InlineMessage>
          ) : null}
          <FormActions>
            <Button ref={submitRef} level="primary" type="submit">{form.isSubmitting ? "Checking…" : "Change address"}</Button>
          </FormActions>
        </Form>
      </Stack>
    </Card>
  );
}

// ——— 3. Budget alerts: FormField names a Slider, FormFieldset groups the checkboxes ————————————————————————
type AlertValues = { threshold: number; recipients: PersonId[]; repeat: "once" | "weekly" };
const lumen = projectById("lumen-banking");
const recipientIds: PersonId[] = ["alex", "hana", "mai", "finn"];
const savedAlerts: AlertValues = { threshold: 80, recipients: ["alex", "mai"], repeat: "once" };
const namesOf = (ids: PersonId[]) => {
  const names = ids.map((id) => people[id].name);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0] ?? "";
};

function BudgetAlertsExample() {
  const { toast } = useToast();
  const titleId = useId();
  const [saved, setSaved] = useState(savedAlerts);
  const form = useFormState<AlertValues>({
    initialValues: savedAlerts,
    validate: (values) => ({
      threshold: values.threshold >= 100 ? "Set it below 100%, so there's time to act" : undefined,
      recipients: values.recipients.length ? undefined : "Choose at least one person",
    }),
    onSubmit: async (values, { reset }) => {
      await wait(600);
      setSaved(values);
      reset(values);
      toast({ type: "positive", title: "Budget alerts saved" });
    },
  });
  const { threshold, recipients } = form.values;
  const formRef = useRef<HTMLFormElement>(null);
  // Undo changes goes back to the saved alerts and leaves with the edits, so focus moves to the first control.
  const undo = () => { form.reset(); requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("input")?.focus()); };
  const pick = (id: PersonId, on: boolean) => form.setValue("recipients", on ? recipientIds.filter((x) => x === id || recipients.includes(x)) : recipients.filter((x) => x !== id), { touch: true });
  return (
    <Card as="section" theme="flat" aria-labelledby={titleId} surface="default">
      <Stack gap="md">
        <CardHeader id={titleId} title="Budget alerts">
          {`${lumen.name} · ${namesOf(saved.recipients)} hear when spending passes ${saved.threshold}%.`}
        </CardHeader>
        <Form ref={formRef} form={form} gap="md">
          {/* Slider has no label or error of its own: FormField adds both and names it through aria-labelledby. */}
          <FormField label="Alert at" error={form.fieldError("threshold")}
            helpText={`${threshold}% of ${formatMoney(lumen.budget)}, at ${formatMoney((lumen.budget * threshold) / 100)}`}>
            <Slider min={50} max={100} step={5} icon="icon-bell-01-solid" value={threshold}
              onValueChange={(value) => form.setValue("threshold", value, { touch: true })} valueText={(value) => `${value}% of the budget`} />
          </FormField>
          <FormFieldset kind="checkbox" legend="Send the alert to" error={form.fieldError("recipients")}>
            {recipientIds.map((id) => (
              <Checkbox key={id} label={people[id].name} caption={people[id].role} checked={recipients.includes(id)} onCheckedChange={(on) => pick(id, on)} />
            ))}
          </FormFieldset>
          <FormFieldset kind="radio" legend="Repeat">
            <RadioButton label="Once" caption="When spending first passes the line" {...form.radioField("repeat", "once")} />
            <RadioButton label="Every Monday" caption="While spending stays above it" {...form.radioField("repeat", "weekly")} />
          </FormFieldset>
          {/* Undo changes appears once something differs from the saved alerts: at rest there is nothing to undo. */}
          <FormActions>
            {form.isDirty ? <Button level="tertiary" disabled={form.isSubmitting} onClick={undo}>Undo changes</Button> : null}
            <Button level="primary" type="submit">{form.isSubmitting ? "Saving…" : "Save alerts"}</Button>
          </FormActions>
        </Form>
      </Stack>
    </Card>
  );
}

// ——— 4. Draft invoice: read-only facts, a destructive action set apart ———————————————————————————————————
type DraftValues = { amount: number | null; due: string; note: string };
const draftStart: DraftValues = { amount: 24500, due: "10/30/2026", note: "Milestone 3: points history, rewards at checkout and the Android release." };
const billTo = "trang.le@phinco.vn";

function DraftInvoiceExample() {
  const { toast } = useToast();
  const titleId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const [status, setStatus] = useState<"Draft" | "Sent" | "Deleted">("Draft");
  const [deleting, setDeleting] = useState(false);
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
      toast({ title: "Invoice sent", action: { label: "Undo", onClick: () => { setStatus("Draft"); focusSoon(() => cardRef.current?.querySelector<HTMLElement>("button[type=submit]")); } } });
      focusSoon(() => cardRef.current?.querySelector<HTMLElement>("[data-after-send]"));
    },
  });
  const saveDraft = () => { form.reset(form.values); toast({ title: "Draft saved" }); };
  const remove = () => {
    setDeleting(false);
    setStatus("Deleted");
    toast({ title: "Draft deleted" });
    focusSoon(() => cardRef.current?.querySelector<HTMLElement>("button"));
  };
  const restart = () => { form.reset(draftStart); setStatus("Draft"); focusSoon(() => cardRef.current?.querySelector<HTMLElement>("input:not([readonly])")); };
  const sent = status === "Sent";
  const amount = form.values.amount ?? 0;

  if (status === "Deleted") {
    return (
      <Card ref={cardRef} as="section" theme="flat" aria-label="Draft invoices" className="px-form-card">
        <EmptyState illustration={false} headingLevel={4} title="No draft invoices" primaryAction={{ label: "New draft", onClick: restart }}>
          Start a draft from a project milestone.
        </EmptyState>
      </Card>
    );
  }
  return (
    <Card ref={cardRef} as="section" theme="flat" aria-labelledby={titleId} className="px-form-card" surface="default">
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
              <NumberField label="Amount (USD)" min={0} step={500} helpText={amount ? formatMoney(amount, true) : undefined} {...form.numberField("amount")} />
            )}
            <DateField label="Due date" today={TODAY} minDate={daysFromToday(1, 0, 0)} readOnly={sent} {...form.dateField("due")} />
          </Grid>
          <TextAreaField label="Note to the client" labelOptional rows={3} maxLength={200} characterLimit={!sent} readOnly={sent} {...form.field("note")} />
          {sent ? (
            // The one action left keeps the place the actions had, at the end of the row. Nothing submits any more, so it
            // is no FormActions row.
            <Stack align="end">
              <Button data-after-send="" level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "PDF downloaded", children: "INV-2026-0144.pdf" })}>Download PDF</Button>
            </Stack>
          ) : (
            // align="between": the destructive action sits alone on the left, away from Send invoice.
            <FormActions align="between">
              <Button level="danger-subtle" startIcon="icon-trash-line" disabled={form.isSubmitting} onClick={() => setDeleting(true)}>Delete draft</Button>
              <Button level="tertiary" disabled={form.isSubmitting} onClick={saveDraft}>Save draft</Button>
              <Button level="primary" type="submit">{form.isSubmitting ? "Sending…" : "Send invoice"}</Button>
            </FormActions>
          )}
        </Form>
      </Stack>
      <Dialog open={deleting} onOpenChange={setDeleting} theme="negative" title="Delete this draft?"
        description={`INV-2026-0144 for Phin & Co (${formatMoney(amount, true)}) is deleted for everyone. This can't be undone.`}
        primaryAction={{ label: "Delete draft", level: "danger", onClick: remove }}
        secondaryAction={{ label: "Cancel" }} />
    </Card>
  );
}

// ——— 5. On a phone: a form screen whose footer Action Bar submits it ——————————————————————————————————————
// The Mekong Freight app, signed in as Phin & Co's roastery, which ships beans to its stores.
type ShipmentStatus = "Booked" | "In transit" | "Customs hold" | "Delivered";
const shipmentTheme: Record<ShipmentStatus, BadgeTheme> = { Booked: "neutral", "In transit": "blue", "Customs hold": "orange", Delivered: "green" };
type Shipment = { id: string; to: string; parcels: number; status: ShipmentStatus; day: Date };
const stores = ["Phin Da Nang", "Phin Hanoi Old Quarter", "Phin Can Tho", "Phin Nha Trang", "Phin Hue", "Phin Vientiane"];
const shipments: Shipment[] = ([
  ["48231", "Phin Da Nang", 3, "Booked", 1], ["48220", "Phin Hanoi Old Quarter", 6, "In transit", 0], ["48214", "Phin Vientiane", 2, "Customs hold", -1],
  ["48207", "Phin Can Tho", 4, "In transit", -1], ["48195", "Phin Nha Trang", 2, "Delivered", -2], ["48188", "Phin Hue", 3, "Delivered", -3],
  ["48172", "Phin Da Nang", 5, "Delivered", -5], ["48166", "Phin Hanoi Old Quarter", 8, "Delivered", -6], ["48151", "Phin Vientiane", 2, "Delivered", -8],
  ["48143", "Phin Can Tho", 3, "Delivered", -9], ["48130", "Phin Nha Trang", 1, "Delivered", -12], ["48122", "Phin Hue", 4, "Delivered", -13],
  ["48109", "Phin Da Nang", 6, "Delivered", -15], ["48097", "Phin Hanoi Old Quarter", 7, "Delivered", -16],
] as const).map(([code, to, parcels, status, days]) => ({ id: `MKF-${code}`, to, parcels, status, day: daysFromToday(days) }));
type PickupValues = { to: string; day: string; window: "" | "morning" | "afternoon"; parcels: number | null; note: string };
/** The store the last pickup went to starts selected: most pickups repeat it. */
const blankPickup: PickupValues = { to: "Phin Da Nang", day: "", window: "", parcels: 1, note: "" };
/** $4 for the first parcel, $1.50 for each one after it. */
const pickupFee = (parcels: number) => 4 + 1.5 * Math.max(parcels - 1, 0);

function PhonePickupExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const formId = useId();
  const [list, setList] = useState(shipments);
  // The example opens on the form, the screen it teaches; Close leads to the shipments, New pickup back here.
  const [creating, setCreating] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const form = useFormState<PickupValues>({
    initialValues: blankPickup,
    validate: (values) => {
      const day = parseDay(values.day);
      return {
        to: values.to ? undefined : "Choose the store it goes to",
        day: !day ? "Enter the pickup day, like 10/02/2026" : day < startOfToday ? "Choose today or a later day" : day.getDay() === 0 ? "Drivers don't pick up on Sundays" : undefined,
        window: values.window ? undefined : "Choose a pickup time",
        parcels: values.parcels && values.parcels >= 1 && values.parcels <= 20 ? undefined : "Book 1 to 20 parcels",
      };
    },
    onSubmit: async (values, { reset }) => {
      await wait(800);
      setList((rows) => [{ id: `MKF-${48232 + rows.length - shipments.length}`, to: values.to, parcels: values.parcels ?? 1, status: "Booked", day: parseDay(values.day)! }, ...rows]);
      reset();
      // Back on the shipments the new pickup is the first row; focus waits on New pickup for the next one.
      screen.go('.zen-top-nav__action[aria-label="New pickup"]', () => setCreating(false));
      toast({ type: "positive", title: "Pickup booked" });
    },
  });
  const leave = () => { setConfirming(false); form.reset(); screen.go('.zen-top-nav__action[aria-label="New pickup"]', () => setCreating(false)); };
  // Close asks before it drops what was entered.
  const close = () => (form.isDirty ? setConfirming(true) : leave());
  const parcels = form.values.parcels ?? 0;

  if (!creating) {
    return (
      <PlatformPhone key="root" label="Shipments" headerOverlay screenRef={screenRef}
        header={<TopNavigation type="alt" title="Shipments" largeTitle="Shipments" scrollRef={screenRef}
          trailing={[{ icon: "icon-plus-line", label: "New pickup", onClick: () => screen.go('.zen-top-nav__action[aria-label="Close"]', () => setCreating(true)) }]} />}>
        {screen.anchor}
        {/* The shipments only show their status (Interactive=No rows, no side padding of their own): the page margin (lg)
            insets the List, so their text lines up with the large title; sm sets the first row off the bar. */}
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Shipments">
            {list.map((shipment) => (
              <ListItem key={shipment.id} title={`To ${shipment.to}`} caption={`${shipment.id} · ${plural(shipment.parcels, "parcel")} · ${formatDay(shipment.day)}`}
                leading={<DockIcon icon="icon-package-line" theme="neutral" background="subtle" />}
                trailing={<Badge theme={shipmentTheme[shipment.status]} background="subtle">{shipment.status}</Badge>} />
            ))}
          </List>
        </Box>
      </PlatformPhone>
    );
  }
  return (
    <PlatformPhone key="new" label="New pickup" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact-alt" title="New pickup" scrollRef={screenRef}
        leading={{ icon: "icon-x-medium-line", label: "Close", onClick: close }} />}
      // The footer sits outside the form, so its submit names the form by id. The summary follows the parcel count.
      footer={<ActionBar position="static"
        summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{`${plural(parcels, "parcel")} · ${formatMoney(pickupFee(parcels), true)}`}</Text>}
        primaryAction={{ label: form.isSubmitting ? "Booking…" : "Book pickup", type: "submit", form: formId }} />}>
      {screen.anchor}
      <Form id={formId} form={form} aria-label="New pickup">
        {/* Stacked fields are md apart, every one of them: the day and its time slot read as neighbours. Most fields are
            required, so only the optional note is marked. */}
        <Stack padding="lg" gap="md">
          <InputField label="Pick up from" readOnly value="Phin roastery · 12 Le Van Viet, Thu Duc" />
          <SelectField label="Deliver to" helpText="Your last pickup went here" options={stores.map((store) => ({ value: store, label: store }))} {...form.selectField("to")} />
          <DateField label="Pickup day" today={TODAY} minDate={startOfToday} {...form.dateField("day")} />
          <FormFieldset kind="radio" legend="Pickup time" error={form.fieldError("window")}>
            <RadioButton label="Morning" caption="8:00 am – 12:00 pm" {...form.radioField("window", "morning")} />
            <RadioButton label="Afternoon" caption="1:00 pm – 5:00 pm" {...form.radioField("window", "afternoon")} />
          </FormFieldset>
          <NumberField label="Parcels" min={1} max={20} helpText="Up to 25 kg each" align="center" {...form.numberField("parcels")} />
          <TextAreaField label="Note for the driver" labelOptional rows={3} placeholder="Ring the bell at the side gate" {...form.field("note")} />
        </Stack>
      </Form>
      <Dialog open={confirming} onOpenChange={setConfirming} theme="warning" title="Discard this pickup?"
        description="What you entered is lost." actionsDirection="vertical"
        primaryAction={{ label: "Discard pickup", level: "danger", onClick: leave }}
        secondaryAction={{ label: "Keep editing", autoFocus: true }} />
    </PlatformPhone>
  );
}

// ——— Examples ———————————————————————————————————————————————————————————————————————————————————————
export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Add a client",
    description: "A create page: useFormState binds every field in one spread and checks a field when you leave it. Add client (or Enter) checks them all, moves focus to the first problem and announces how many need attention; Cancel asks before it drops what you typed.",
    wide: true,
    screen: true,
    render: () => <NewClientExample />,
    code: `const form = useFormState({
  initialValues: { name: "", taxId: "", website: "", country: "Vietnam", contact: "", email: "", terms: "net30" },
  validate: (values) => ({
    name: values.name.trim() ? undefined : "Enter the company name",
    email: emailPattern.test(values.email.trim()) ? undefined : "Enter an email like finance@company.com",
  }),
  onSubmit: async (values, { reset }) => { await createClient(values); reset(); toast({ type: "positive", title: "Client added" }); },
});

<PageHeader back={{ label: "Clients", onClick: cancel }} title="New client" description="Invoices go to the billing contact." />
<Form form={form}> {/* groups lg apart; fields md apart */}
  <Stack as="section" gap="md" aria-labelledby="company">
    <Heading level={2} id="company" textStyle="Heading/4">Company</Heading>
    <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="lg">
      <InputField label="Company name" autoComplete="organization" {...form.field("name")} />
      <SelectField label="Country" options={countries} {...form.selectField("country")} />
      <InputField label="Website" labelOptional {...form.field("website")} />
      <InputField label="Tax ID" labelOptional helpText="Printed on every invoice" {...form.field("taxId")} />
    </Grid>
  </Stack>
  <Stack as="section" gap="md" aria-labelledby="billing">
    <Heading level={2} id="billing" textStyle="Heading/4">Billing</Heading>
    …
    <FormFieldset kind="radio" legend="Payment terms" direction="row">
      {terms.map((t) => <RadioButton key={t.value} label={t.label} {...form.radioField("terms", t.value)} />)}
    </FormFieldset>
  </Stack>
  <FormActions>
    <Button level="tertiary" onClick={cancel}>Cancel</Button>
    <Button level="primary" type="submit">{form.isSubmitting ? "Adding…" : "Add client"}</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Server errors",
    wide: true,
    description: "What the server rejects goes back on the field with setError, and focus returns to it: dizaistudio is taken. A request that fails throws, keeps every value and shows a Negative Inline Message whose Try again sends it again.",
    render: () => <WorkspaceAddressExample />,
    code: `const form = useFormState({
  initialValues: { slug: "dizai" },
  validate: ({ slug }) => ({ slug: /^[a-z0-9-]{3,30}$/.test(slug) ? undefined : "Use 3–30 lowercase letters, numbers or hyphens" }),
  onSubmit: async ({ slug }, { setError, reset }) => {
    const result = await api.changeAddress(slug); // throws when the request fails → form.submitError
    if (result.taken) return setError("slug", \`\${slug}.zen.app is taken. Try another, like \${slug}-hcm\`);
    reset({ slug });
    toast({ type: "positive", title: "Address changed" });
  },
});

<Form ref={formRef} form={form} gap="md">
  <InputField label="Address" helpText={\`Opens at \${slug}.zen.app\`} {...form.field("slug")} />
  {form.submitError ? (
    <InlineMessage theme="negative" title="Address not changed"
      action={{ label: "Try again", onClick: () => formRef.current?.requestSubmit() }}>{form.submitError}</InlineMessage>
  ) : null}
  <FormActions>
    <Button level="primary" type="submit">{form.isSubmitting ? "Checking…" : "Change address"}</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Label custom controls",
    description: "A Slider has no label or error of its own, so FormField adds them and a failed submit lands on it. The people to alert are one FormFieldset with one error for the group; the repeat choice is a radio FormFieldset.",
    render: () => <BudgetAlertsExample />,
    code: `<Form form={form} gap="md">
  <FormField label="Alert at" error={form.fieldError("threshold")} helpText={\`\${threshold}% of $162,000\`}>
    <Slider min={50} max={100} step={5} icon="icon-bell-01-solid" value={threshold}
      onValueChange={(value) => form.setValue("threshold", value, { touch: true })} valueText={(value) => \`\${value}% of the budget\`} />
  </FormField>
  <FormFieldset kind="checkbox" legend="Send the alert to" error={form.fieldError("recipients")}>
    {team.map((person) => (
      <Checkbox key={person.id} label={person.name} caption={person.role} checked={recipients.includes(person.id)}
        onCheckedChange={(on) => form.setValue("recipients", on ? [...recipients, person.id] : recipients.filter((id) => id !== person.id), { touch: true })} />
    ))}
  </FormFieldset>
  <FormFieldset kind="radio" legend="Repeat">
    <RadioButton label="Once" caption="When spending first passes the line" {...form.radioField("repeat", "once")} />
    <RadioButton label="Every Monday" caption="While spending stays above it" {...form.radioField("repeat", "weekly")} />
  </FormFieldset>
  <FormActions>
    {form.isDirty ? <Button level="tertiary" onClick={undo}>Undo changes</Button> : null}
    <Button level="primary" type="submit">{form.isSubmitting ? "Saving…" : "Save alerts"}</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Form screen on a phone",
    description: "A pickup booking in the Mekong Freight app: the footer Action Bar sits outside the form, so its submit names the form by id, and its summary follows the parcels. Close asks before it drops what was entered; a booked pickup joins the shipments.",
    render: () => <PhonePickupExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);
const formId = useId();

<PlatformPhone key="new" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact-alt" title="New pickup" scrollRef={screenRef}
    leading={{ icon: "icon-x-medium-line", label: "Close", onClick: close }} />}
  footer={<ActionBar position="static"
    summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{\`\${plural(parcels, "parcel")} · \${formatMoney(fee, true)}\`}</Text>}
    primaryAction={{ label: form.isSubmitting ? "Booking…" : "Book pickup", type: "submit", form: formId }} />}>
  <Form id={formId} form={form} aria-label="New pickup">
    <Stack padding="lg" gap="md"> {/* stacked fields: md apart */}
      <SelectField label="Deliver to" options={stores} {...form.selectField("to")} />
      <DateField label="Pickup day" today={TODAY} minDate={TODAY} {...form.dateField("day")} />
      <FormFieldset kind="radio" legend="Pickup time" error={form.fieldError("window")}>
        <RadioButton label="Morning" caption="8:00 am – 12:00 pm" {...form.radioField("window", "morning")} />
        <RadioButton label="Afternoon" caption="1:00 pm – 5:00 pm" {...form.radioField("window", "afternoon")} />
      </FormFieldset>
      <NumberField label="Parcels" min={1} max={20} {...form.numberField("parcels")} />
    </Stack>
  </Form>
</PlatformPhone>`,
  },
  {
    title: "Destructive action apart",
    wide: true,
    description: "FormActions align=\"between\" puts Delete draft alone on the left, away from Send invoice, and asks in a negative Dialog because deleting can't be undone. Client and Bill to are read-only facts; once sent, every field reads only and the toast can undo the send.",
    render: () => <DraftInvoiceExample />,
    code: `<Form form={form} gap="md">
  <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="lg">
    <InputField label="Client" readOnly value="Phin & Co" />
    <InputField label="Bill to" readOnly value="trang.le@phinco.vn" />
    <NumberField label="Amount (USD)" min={0} step={500} {...form.numberField("amount")} />
    <DateField label="Due date" today={TODAY} {...form.dateField("due")} />
  </Grid>
  <TextAreaField label="Note to the client" labelOptional rows={3} maxLength={200} characterLimit {...form.field("note")} />
  <FormActions align="between">
    <Button level="danger-subtle" startIcon="icon-trash-line" onClick={() => setDeleting(true)}>Delete draft</Button>
    <Button level="tertiary" onClick={saveDraft}>Save draft</Button>
    <Button level="primary" type="submit">{form.isSubmitting ? "Sending…" : "Send invoice"}</Button>
  </FormActions>
</Form>

<Dialog open={deleting} onOpenChange={setDeleting} theme="negative" title="Delete this draft?"
  description="INV-2026-0144 for Phin & Co ($24,500.00) is deleted for everyone. This can't be undone."
  primaryAction={{ label: "Delete draft", level: "danger", onClick: remove }} secondaryAction={{ label: "Cancel" }} />`,
  },
]);
