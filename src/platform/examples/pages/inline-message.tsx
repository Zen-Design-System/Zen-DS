/* Inline Message examples: messages that sit inside the content they describe, in Đìzai Studio's Zen workspace (brief:
   docs/research/example-rebuild-brief-2026-09-30.md). A page- or app-wide condition is an Alert Banner, the result of
   one quick action is a Toast, and one bad field is that field's error text. */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Badge } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { Dialog } from "../../../components/Dialog";
import { Form, FormActions, useFormState } from "../../../components/Form";
import { Image, Thumbnail } from "../../../components/Image";
import { InlineMessage } from "../../../components/InlineMessage";
import { InputField, SelectField, TextAreaField } from "../../../components/Input";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { PageHeader } from "../../../components/PageHeader";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { platformMedia } from "../../PlatformMedia";
import { PlatformPhone } from "../../PlatformPhone";
import {
  daysFromToday, formatDate, formatDay, formatMoney, formatRange, formatRelative, invoiceStatusTheme, invoices, people, projectById,
  taskStatusTheme, type PersonId, type TaskStatus,
} from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./inline-message.css";

export const page: PlatformPage = "inline-message";

/* ───────────── 1. Editing a sent invoice (context above a form) ───────────── */

const sentInvoice = invoices.find((invoice) => invoice.number === "INV-2026-0142")!;
const terms = [
  { value: "net15", label: `Net 15 · due ${formatDate(daysFromToday(10))}` },
  { value: "net30", label: `Net 30 · due ${formatDate(sentInvoice.due)}` },
  { value: "net45", label: `Net 45 · due ${formatDate(daysFromToday(40))}` },
];
type InvoiceEdit = { terms: string; po: string; note: string };

function SentInvoiceExample() {
  const { toast } = useToast();
  const form = useFormState<InvoiceEdit>({
    initialValues: { terms: "net30", po: "PHIN-PO-0915", note: "" },
    validate: ({ note }) => ({ note: note.trim() ? undefined : "Tell Phin & Co what changed" }),
    // The saved values become the new baseline for the next edit.
    onSubmit: (values, { reset }) => { reset(values); toast({ title: "Updated invoice sent", children: "Phin & Co got the new copy by email" }); },
  });
  return (
    <div className="px-inline-message-screen">
      <Stack gap="xl" className="px-inline-message-page">
        <PageHeader eyebrow="Invoices" title={`Edit ${sentInvoice.number}`}
          meta={<Badge theme={invoiceStatusTheme[sentInvoice.status]} background="subtle">{sentInvoice.status}</Badge>}
          description={`${sentInvoice.client} · ${projectById(sentInvoice.project).name} · Issued ${formatDate(sentInvoice.issued)}`} />
        <Card theme="flat" className="px-inline-message-measure">
          <Form form={form}>
            {/* Context for the whole form, above its first field. Essential, so it has no close button. */}
            <InlineMessage theme="warning" title="Phin & Co already has this invoice">
              Saving emails them the updated copy with your note about what changed.
            </InlineMessage>
            <DescriptionList items={[
              { term: "Client", description: sentInvoice.client },
              { term: "Amount", description: formatMoney(sentInvoice.amount, true), emphasis: true },
            ]} />
            <Stack gap="md">
              <SelectField label="Payment terms" options={terms} {...form.selectField("terms")} />
              <InputField label="Purchase order" labelOptional {...form.field("po")} />
              <TextAreaField label="Note to Phin & Co" helpText="Shown at the top of the email" rows={3} {...form.field("note")} />
            </Stack>
            <FormActions>
              <Button level="primary" type="submit">Save and send</Button>
            </FormActions>
          </Form>
        </Card>
      </Stack>
    </div>
  );
}

/* ───────────── 2. Form error summary ───────────── */

type NewClient = { company: string; contact: string; email: string };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function ErrorSummaryExample() {
  const { toast } = useToast();
  const titleId = useId();
  const form = useFormState<NewClient>({
    initialValues: { company: "", contact: "", email: "" },
    validate: ({ company, contact, email }) => ({
      company: company.trim() ? undefined : "Enter the company name",
      contact: contact.trim() ? undefined : "Enter who receives the invoices",
      email: !email.trim() ? "Enter a billing email" : emailPattern.test(email.trim()) ? undefined : "Enter an email like name@company.com",
    }),
    onSubmit: ({ company }, { reset }) => { reset(); toast({ title: "Client added", children: company.trim() }); },
  });
  const count = Object.keys(form.errors).length;
  return (
    <Card theme="flat" className="px-inline-message-narrow">
      {/* Form moves focus to the first invalid field after a failed submit; the summary counts what is left. */}
      <Form form={form} gap="md" aria-labelledby={titleId}>
        <Heading level={4} id={titleId} textStyle="Heading/Subheading">New client</Heading>
        {form.submitCount > 0 && count > 0 ? (
          <InlineMessage theme="negative" title={`Fix ${plural(count, "field")} to add the client`}>
            Each field below says what’s missing.
          </InlineMessage>
        ) : null}
        <InputField label="Company name" autoComplete="organization" {...form.field("company")} />
        <InputField label="Billing contact" autoComplete="name" {...form.field("contact")} />
        <InputField label="Billing email" type="email" autoComplete="email" {...form.field("email")} />
        <FormActions>
          <Button level="primary" type="submit">Add client</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

/* ───────────── 3. Verify a domain (the result where it happened) ───────────── */

type Check = "idle" | "checking" | "failed" | "verified";
const txtValue = "zen-verify=dz-4f9c2a71";

function VerifyDomainExample() {
  const { toast } = useToast();
  const titleId = useId();
  const [check, setCheck] = useState<Check>("idle");
  const [attempts, setAttempts] = useState(0);
  const timer = useRef<number>(0);
  const root = useRef<HTMLElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // The button that started a check goes away with it: focus waits on the heading, then lands on the result's action
  // (Check again, Remove domain, or Verify domain again after a removal).
  useEffect(() => {
    if (!moveFocus.current) return;
    // The result arrives a moment later: move focus only if it is still in this example (or nowhere), never pull it
    // away from what the person went on to do.
    const active = document.activeElement;
    if (active && active !== document.body && !root.current?.contains(active)) { moveFocus.current = false; return; }
    const target = check === "checking" ? root.current?.querySelector<HTMLElement>("h4")
      : check === "failed" ? root.current?.querySelector<HTMLElement>(".zen-inline-message__action") : action.current;
    target?.focus();
    if (check !== "checking") moveFocus.current = false;
  }, [check]);
  // The first check fails (the record hasn't reached the DNS yet); checking again finds it.
  const verify = () => {
    moveFocus.current = true;
    setCheck("checking");
    timer.current = window.setTimeout(() => { setCheck(attempts === 0 ? "failed" : "verified"); setAttempts(attempts + 1); }, 1200);
  };
  // Removing can be undone, so it acts at once and the Toast offers Undo.
  const remove = () => {
    moveFocus.current = true;
    setCheck("idle");
    // Undo's toast closes as it runs, so focus goes back to Remove domain once it renders.
    toast({ title: "Domain removed", action: { label: "Undo", onClick: () => { setCheck("verified"); requestAnimationFrame(() => action.current?.focus()); } } });
  };
  const copy = () => { void navigator.clipboard?.writeText(txtValue).catch(() => undefined); toast({ id: "dns-copied", title: "Value copied" }); };
  return (
    <Card theme="flat" className="px-inline-message-narrow">
      <Stack ref={root} as="section" gap="xl" aria-labelledby={titleId}>
        <Stack gap="xs">
          <Heading level={4} id={titleId} tabIndex={-1} textStyle="Heading/Subheading">Email domain</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Send invoices from billing@dizai.studio. Add this record at your DNS provider, then verify.</Text>
        </Stack>
        <DescriptionList items={[
          { term: "Type", description: "TXT" },
          { term: "Host", description: "@" },
          { term: "Value", description: txtValue, action: <IconButton appearance="flat" level="primary" size="sm" icon="icon-copy-line" aria-label="Copy value" onClick={copy} /> },
        ]} divider />
        {/* One message slot next to the records: its theme follows the check. */}
        {check === "checking" ? (
          <InlineMessage theme="info" title="Checking dizai.studio…">This takes a few seconds.</InlineMessage>
        ) : check === "failed" ? (
          <InlineMessage theme="negative" title="No TXT record found yet" action={{ label: "Check again", onClick: verify }}>
            New records can take up to an hour to show up. Check the value, then try again.
          </InlineMessage>
        ) : check === "verified" ? (
          <InlineMessage theme="positive" title="dizai.studio is verified">
            Invoices and client emails now go out from billing@dizai.studio.
          </InlineMessage>
        ) : null}
        {/* The card's one action sits at its bottom-right edge, like a form's. */}
        {check === "idle" || check === "verified" ? (
          <Stack direction="row" justify="end">
            {check === "idle"
              ? <Button ref={action} level="primary" onClick={verify}>Verify domain</Button>
              : <Button ref={action} level="danger-subtle" onClick={remove}>Remove domain</Button>}
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}

/* ───────────── 4. Moodboard to review (Custom with a thumbnail) ───────────── */

const moodboard = [platformMedia.feed[1], platformMedia.feed[3], platformMedia.feed[4], platformMedia.feed[7]];
type BrandTask = { id: string; key: string; title: string; assignee: PersonId; status: TaskStatus };
const brandTasks: BrandTask[] = [
  { id: "s1", key: "SAO-004", title: "Moodboard for the outdoor range", assignee: "gia", status: "In review" },
  { id: "s2", key: "SAO-006", title: "Sketch three logo directions", assignee: "emi", status: "In progress" },
  { id: "s3", key: "SAO-007", title: "Draft the tone-of-voice guide", assignee: "linh", status: "To do" },
];

function MoodboardExample() {
  const { toast } = useToast();
  const titleId = useId();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [approved, setApproved] = useState(false);
  const root = useRef<HTMLElement>(null);
  const moveFocus = useRef<"again" | "message" | "heading" | null>(null);
  // Focus follows what changed: Show message again, the message's Review action, or the ListBox title once the message
  // is gone (approved). It runs a frame later, after the Dialog has handed focus back.
  useEffect(() => {
    const target = moveFocus.current;
    if (!target) return undefined;
    const frame = requestAnimationFrame(() => {
      moveFocus.current = null;
      if (target === "again") root.current?.querySelector<HTMLElement>(".px-inline-message-again")?.focus();
      if (target === "message") root.current?.querySelector<HTMLElement>(".zen-inline-message__action")?.focus();
      if (target === "heading") document.getElementById(titleId)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [hidden, open, approved, titleId]);
  const approve = () => {
    moveFocus.current = "heading";
    setApproved(true);
    // Undo's toast closes as it runs, so focus moves to the message's Review again.
    toast({ title: "Moodboard approved", action: { label: "Undo", onClick: () => { moveFocus.current = "message"; setApproved(false); } } });
  };
  const hide = () => { moveFocus.current = "again"; setHidden(true); };
  const showAgain = () => { moveFocus.current = "message"; setHidden(false); };
  const rows = brandTasks.map((task) => task.id === "s1" && approved ? { ...task, status: "Done" as const } : task);
  return (
    <>
      {/* A ListBox: the title and the message about its rows in the Header-Slot (16px apart), the tasks in the Body-Slot. */}
      <ListBox ref={root} as="section" aria-labelledby={titleId} className="px-inline-message-narrow"
        header={<>
          <Stack gap="2xs">
            <Heading level={4} id={titleId} tabIndex={-1} textStyle="Heading/Subheading">Brand refresh</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">Saola Outdoor · Kickoff {formatDate(daysFromToday(12))}</Text>
          </Stack>
          {approved ? null : hidden ? (
            <Button level="tertiary" className="px-inline-message-start px-inline-message-again" onClick={showAgain}>Show message again</Button>
          ) : (
            <InlineMessage theme="custom" icon={<Thumbnail src={moodboard[0].src} alt="" size="md" />}
              title="Gia’s moodboard is ready for review" action={{ label: "Review", onClick: () => setOpen(true) }} onClose={hide}>
              Saola Outdoor sees it on Friday, so leave your notes before then.
            </InlineMessage>
          )}
        </>}>
        <List aria-labelledby={titleId}>
          {rows.map((task) => (
            <ListItem key={task.id} title={task.title} titleLines={2} caption={`${task.key} · ${people[task.assignee].name}`}
              trailing={<Badge theme={taskStatusTheme[task.status]} background="subtle">{task.status}</Badge>} />
          ))}
        </List>
      </ListBox>
      <Dialog open={open} onOpenChange={(next) => { if (!next && !moveFocus.current) moveFocus.current = "message"; setOpen(next); }} title="Moodboard for the outdoor range"
        description={`Gia Pham · ${plural(moodboard.length, "photo")} · updated ${formatRelative(daysFromToday(0, 10, 17)).toLowerCase()}`}
        primaryAction={{ label: "Approve moodboard", onClick: () => { setOpen(false); approve(); } }} secondaryAction={{ label: "Close" }}>
        <Grid columns={2} gap="xs">
          {moodboard.map((photo) => <Image key={photo.src} src={photo.src} alt={photo.alt} ratio="4:3" radius="md" />)}
        </Grid>
      </Dialog>
    </>
  );
}

/* ───────────── 5. Timesheet on a phone ───────────── */

type Day = { id: string; day: string; minutes: number; projects: string };
const weekday = (offset: number) => { const d = daysFromToday(offset); return `${d.toLocaleString("en-US", { weekday: "long" })}, ${formatDay(d)}`; };
const hours = (minutes: number) => `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
const totalOf = (days: Day[]) => days.reduce((sum, day) => sum + day.minutes, 0);
/** Alex's weeks, newest first. Last week (Sep 21 – Sep 25) is the one to submit, and its Tuesday has no hours. */
const thisWeek: Day[] = [
  { id: "sep28", day: weekday(-2), minutes: 480, projects: "Online banking redesign · Zen design system" },
  { id: "sep29", day: weekday(-1), minutes: 450, projects: "Online banking redesign" },
  { id: "sep30", day: weekday(0), minutes: 120, projects: "Zen design system" },
];
const lastWeek: Day[] = [
  { id: "sep21", day: weekday(-9), minutes: 480, projects: "Online banking redesign · Zen design system" },
  { id: "sep22", day: weekday(-8), minutes: 0, projects: "No hours logged" },
  { id: "sep23", day: weekday(-7), minutes: 450, projects: "Online banking redesign" },
  { id: "sep24", day: weekday(-6), minutes: 510, projects: "Online banking redesign · Loyalty app" },
  { id: "sep25", day: weekday(-5), minutes: 420, projects: "Zen design system" },
];
const approvedWeek: Day[] = [
  { id: "sep14", day: weekday(-16), minutes: 510, projects: "Online banking redesign · Zen design system" },
  { id: "sep15", day: weekday(-15), minutes: 480, projects: "Zen design system" },
  { id: "sep16", day: weekday(-14), minutes: 450, projects: "Online banking redesign · Loyalty app" },
  { id: "sep17", day: weekday(-13), minutes: 480, projects: "Online banking redesign" },
  { id: "sep18", day: weekday(-12), minutes: 390, projects: "Brand refresh pitch" },
];
type Sheet = "draft" | "blocked" | "submitted";

/** One week of a grouped list: a kicker with its total, then its days in a white block on the Surface-Alt screen. */
function WeekSection({ title, days, children }: { title: string; days: Day[]; children?: ReactNode }) {
  const id = useId();
  return (
    <Stack as="section" gap="md" aria-labelledby={id}>
      {children}
      <Stack gap="xs">
        {/* The kicker lines up with the row text inside the block (lg, the block's 20px). */}
        <Box paddingX="lg">
          <Stack direction="row" justify="between" align="baseline" gap="md">
            <Heading level={2} id={id} textStyle="Body/Small/Bold" tone="light">{title}</Heading>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{hours(totalOf(days))}</Text>
          </Stack>
        </Box>
        {/* The days only show their hours (Interactive=No rows, no side padding of their own): the ListBox pads them. */}
        <ListBox>
          <List aria-labelledby={id}>
            {days.map((day) => (
              <ListItem key={day.id} title={day.day} caption={day.projects}
                trailing={<Text as="span" textStyle="Body/Base/Medium" tone={day.minutes ? "strongest" : "light"}>{hours(day.minutes)}</Text>} />
            ))}
          </List>
        </ListBox>
      </Stack>
    </Stack>
  );
}

function TimesheetPhoneExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const [days, setDays] = useState(lastWeek);
  const [sheet, setSheet] = useState<Sheet>("draft");
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    const selector = focusNext.current;
    focusNext.current = null;
    if (selector) screenRef.current?.closest(".platform-phone")?.querySelector<HTMLElement>(selector)?.focus();
  });
  const missing = days.filter((day) => day.minutes === 0);
  // Submitting with a gap escalates the same message (Warning → Negative) instead of adding a second one.
  const submit = () => {
    if (missing.length) { focusNext.current = ".zen-inline-message__action"; setSheet("blocked"); return; }
    focusNext.current = ".zen-action-bar button";
    setSheet("submitted");
  };
  const logHours = () => {
    focusNext.current = ".zen-action-bar button";
    setDays((list) => list.map((day) => day.minutes === 0 ? { ...day, minutes: 450, projects: "Loyalty app" } : day));
    setSheet("draft");
  };
  const recall = () => { focusNext.current = ".zen-action-bar button"; setSheet("draft"); };
  return (
    // Grouped list: the screen is Surface-Alt and each week a white block under its kicker.
    <PlatformPhone label="Timesheet" canvas="alt" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="alt" title="Timesheet" largeTitle="Timesheet" scrollRef={screenRef} />}
      footer={(
        <ActionBar position="static"
          summary={<Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{`Last week · ${hours(totalOf(days))}`}</Text>}
          {...(sheet === "submitted"
            ? { secondaryAction: { label: "Recall timesheet", onClick: recall } }
            : { primaryAction: { label: "Submit timesheet", onClick: submit } })} />
      )}>
      {/* Margin-Compact body (padding lg, 20); group → group lg. */}
      <Stack gap="lg" padding="lg">
        <WeekSection title="This week" days={thisWeek} />
        {/* The message sits right above the week it is about, as wide as its block. */}
        <WeekSection title="Last week" days={days}>
          {sheet === "submitted" ? (
            <InlineMessage theme="positive" title="Timesheet submitted">Duy Le approves it by Friday, Oct 2.</InlineMessage>
          ) : missing.length ? (
            <InlineMessage theme={sheet === "blocked" ? "negative" : "warning"} title="Tuesday has no hours"
              action={{ label: "Log hours", onClick: logHours }}>
              {sheet === "blocked" ? "Log them, then submit again." : "Log them before you submit last week."}
            </InlineMessage>
          ) : null}
        </WeekSection>
        <WeekSection title={formatRange(daysFromToday(-16), daysFromToday(-12))} days={approvedWeek} />
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Editing a sent invoice",
    description: "The invoice has already gone out, so a Warning above the form says what saving will do before anyone types. It is essential context, so it has no close button and stays while the form is open.",
    wide: true,
    screen: true,
    render: () => <SentInvoiceExample />,
    code: `const form = useFormState({
  initialValues: { terms: "net30", po: "PHIN-PO-0915", note: "" },
  validate: ({ note }) => ({ note: note.trim() ? undefined : "Tell Phin & Co what changed" }),
  onSubmit: (values, { reset }) => {
    reset(values);
    toast({ title: "Updated invoice sent", children: "Phin & Co got the new copy by email" });
  },
});

<PageHeader eyebrow="Invoices" title="Edit INV-2026-0142" meta={<Badge theme="blue" background="subtle">Sent</Badge>} />
<Card theme="flat">
  <Form form={form}>
    <InlineMessage theme="warning" title="Phin & Co already has this invoice">
      Saving emails them the updated copy with your note about what changed.
    </InlineMessage>
    <SelectField label="Payment terms" options={terms} {...form.selectField("terms")} />
    <InputField label="Purchase order" labelOptional {...form.field("po")} />
    <TextAreaField label="Note to Phin & Co" helpText="Shown at the top of the email" {...form.field("note")} />
    <FormActions>
      <Button level="primary" type="submit">Save and send</Button>
    </FormActions>
  </Form>
</Card>`,
  },
  {
    title: "Form error summary",
    description: "After a failed submit, a Negative summary above the fields counts what is left to fix while each field keeps its own error, and focus moves to the first one. The count drops as fields are fixed and the summary leaves with the last error.",
    render: () => <ErrorSummaryExample />,
    code: `const form = useFormState({ initialValues: { company: "", contact: "", email: "" }, validate, onSubmit: addClient });
const count = Object.keys(form.errors).length;

<Form form={form} gap="md">
  {form.submitCount > 0 && count > 0 ? (
    <InlineMessage theme="negative" title={\`Fix \${plural(count, "field")} to add the client\`}>
      Each field below says what’s missing.
    </InlineMessage>
  ) : null}
  <InputField label="Company name" {...form.field("company")} />
  <InputField label="Billing contact" {...form.field("contact")} />
  <InputField label="Billing email" type="email" {...form.field("email")} />
  <FormActions><Button level="primary" type="submit">Add client</Button></FormActions>
</Form>`,
  },
  {
    title: "Verify a domain",
    description: "The check's result stays next to the records it is about, in one slot whose theme follows the check: Info while it runs, Negative with Check again when the record is missing, Positive once it is found.",
    render: () => <VerifyDomainExample />,
    code: `{check === "checking" ? (
  <InlineMessage theme="info" title="Checking dizai.studio…">This takes a few seconds.</InlineMessage>
) : check === "failed" ? (
  <InlineMessage theme="negative" title="No TXT record found yet" action={{ label: "Check again", onClick: verify }}>
    New records can take up to an hour to show up. Check the value, then try again.
  </InlineMessage>
) : check === "verified" ? (
  <InlineMessage theme="positive" title="dizai.studio is verified">
    Invoices and client emails now go out from billing@dizai.studio.
  </InlineMessage>
) : null}
{check === "idle" ? (
  <Stack direction="row" justify="end">
    <Button level="primary" onClick={verify}>Verify domain</Button>
  </Stack>
) : null}`,
  },
  {
    title: "Moodboard to review",
    description: "Theme Custom takes your own visual, here a thumbnail of the moodboard it announces. Review opens it; approving resolves the message, and closing it leaves Show message again in its place.",
    render: () => <MoodboardExample />,
    code: `{hidden ? (
  <Button level="tertiary" onClick={() => setHidden(false)}>Show message again</Button>
) : (
  <InlineMessage
    theme="custom"
    icon={<Thumbnail src={moodboardCover} alt="" size="md" />}
    title="Gia’s moodboard is ready for review"
    action={{ label: "Review", onClick: () => setOpen(true) }}
    onClose={() => setHidden(true)}
  >
    Saola Outdoor sees it on Friday, so leave your notes before then.
  </InlineMessage>
)}
<Dialog open={open} onOpenChange={setOpen} title="Moodboard for the outdoor range"
  primaryAction={{ label: "Approve moodboard", onClick: approve }} secondaryAction={{ label: "Close" }}>
  <Grid columns={2} gap="xs">{photos.map((photo) => <Image key={photo.src} {...photo} ratio="4:3" />)}</Grid>
</Dialog>`,
  },
  {
    title: "Timesheet on a phone",
    description: "On a phone the message sits in the page flow, right above the week it is about; each week is a white block under its kicker on the Surface-Alt screen. Submitting with a gap turns the same Warning Negative and focuses Log hours, rather than stacking a second message.",
    render: () => <TimesheetPhoneExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone canvas="alt" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Timesheet" largeTitle="Timesheet" scrollRef={screenRef} />}
  footer={<ActionBar position="static" summary={\`Last week · \${hours(total)}\`}
    primaryAction={{ label: "Submit timesheet", onClick: submit }} />}>
  <Stack gap="lg" padding="lg">
    <WeekSection title="This week" days={thisWeek} />
    <Stack as="section" gap="md" aria-labelledby="last-week">
      {missing.length ? (
        <InlineMessage theme={blocked ? "negative" : "warning"} title="Tuesday has no hours"
          action={{ label: "Log hours", onClick: logHours }}>
          {blocked ? "Log them, then submit again." : "Log them before you submit last week."}
        </InlineMessage>
      ) : null}
      <Stack gap="xs">
        {/* The kicker lines up with the row text inside the block */}
        <Box paddingX="lg">
          <Heading level={2} id="last-week" textStyle="Body/Small/Bold" tone="light">Last week</Heading>
        </Box>
        {/* One white Surface block per week on the Surface-Alt screen */}
        <ListBox>
          <List aria-labelledby="last-week">
            {days.map((day) => <ListItem key={day.id} title={day.day} caption={day.projects} trailing={hours(day.minutes)} />)}
          </List>
        </ListBox>
      </Stack>
    </Stack>
    <WeekSection title="Sep 14 – Sep 18, 2026" days={approvedWeek} />
  </Stack>
</PlatformPhone>`,
  },
]);
