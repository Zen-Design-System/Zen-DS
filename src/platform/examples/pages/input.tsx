/* Input examples (rebuild brief 2026-09-30): the fields of Đìzai Studio's own Zen workspace — a new client project,
   billing and client details, the workspace profile, a sent invoice, account setup, a task and a phone time-off
   request. Each card teaches one field decision. */
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { BottomSheet } from "../../../components/BottomSheet";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DockIcon } from "../../../components/DockIcon";
import { Flag } from "../../../components/Flag";
import { Form, FormActions, useFormState } from "../../../components/Form";
import { InlineMessage } from "../../../components/InlineMessage";
import {
  AutocompleteField, DateField, HeadingField, InputConditionItem, InputConditions, InputField, InputLeadingTrailing,
  NumberField, RichTextField, SelectField, TextAreaField,
} from "../../../components/Input";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { Toggle } from "../../../components/Toggle";
import { TopNavigation } from "../../../components/TopNavigation";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import {
  TODAY, formatDate, formatDay, formatMoney, invoiceStatusTheme, invoices, leaveRequests, leaveStatusTheme, people, peopleList, taskStatusTheme,
  type LeaveStatus,
} from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./input.css";

export const page: PlatformPage = "input";

/** "10/12/2026" (what DateField shows and types) → a Date, or null. */
const parseDay = (value: string) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  const d = m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

// ——— 1. New project ————————————————————————————————————————————————————————————————————————————
const clientOptions = [
  { value: "phin", label: "Phin & Co" },
  { value: "lumen", label: "Lumen Bank" },
  { value: "mekong", label: "Mekong Freight" },
  { value: "bookfair", label: "Hanoi Book Fair" },
  { value: "saola", label: "Saola Outdoor" },
  { value: "studio", label: "Đìzai Studio (internal)" },
];
const leadOptions = [people.alex, people.duy, people.chi, people.finn, people.gia].map((p) => ({ value: p.id, label: p.name }));
const teamOptions = peopleList.map((p) => ({ id: p.id, label: p.name }));
type ProjectDraft = { name: string; client: string; start: string; due: string; lead: string; sprint: number | null; team: string[]; brief: string };
const blankProject: ProjectDraft = { name: "", client: "", start: "10/12/2026", due: "", lead: "alex", sprint: 2, team: [], brief: "" };

function NewProjectExample() {
  const { toast } = useToast();
  const form = useFormState<ProjectDraft>({
    initialValues: blankProject,
    validate: (v) => {
      const start = parseDay(v.start), due = parseDay(v.due);
      return {
        name: v.name.trim() ? undefined : "Enter a project name",
        client: v.client ? undefined : "Choose a client",
        start: start ? undefined : "Enter a start date, like 10/12/2026",
        due: !due ? "Enter a due date, like 12/18/2026" : start && due <= start ? "Pick a due date after the start date" : undefined,
        team: v.team.length ? undefined : "Add at least one team member",
      };
    },
    onSubmit: (v, { reset }) => {
      toast({ type: "positive", title: "Project created", children: `${v.name.trim()} · ${plural(v.team.length, "member")}` });
      reset();
    },
  });
  return (
    <Card theme="flat">
      {/* Fields stack md apart; the grid's columns sit lg apart. */}
      <Form form={form} gap="md">
        <Heading level={4} textStyle="Heading/Subheading">New project</Heading>
        <Grid minColumnWidth={280} rowGap="md" columnGap="lg">
          <InputField label="Project name" placeholder="e.g. Loyalty app" {...form.field("name")} />
          <SelectField label="Client" placeholder="Choose a client" options={clientOptions} {...form.selectField("client")} />
          <SelectField label="Project lead" options={leadOptions} {...form.selectField("lead")} />
          <DateField label="Start date" today={TODAY} {...form.dateField("start")} />
          <DateField label="Due date" today={TODAY} {...form.dateField("due")} />
          <NumberField label="Sprint length (weeks)" min={1} max={4} {...form.numberField("sprint")} />
        </Grid>
        <AutocompleteField label="Team" addLabel="Add member" popoverLabel="Studio members" searchPlaceholder="Search people" options={teamOptions} {...form.autocompleteField("team")} />
        <TextAreaField label="Brief" labelOptional placeholder="What the client needs and by when" rows={3} maxLength={280} characterLimit {...form.field("brief")} />
        <FormActions>
          <Button level="tertiary" onClick={() => form.reset()}>Cancel</Button>
          <Button level="primary" type="submit">Create project</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

// ——— 2. Label parts ———————————————————————————————————————————————————————————————————————————————
const phinAddress = "12 Ton That Dam, Ben Nghe Ward, District 1, Ho Chi Minh City";

function BillingDetailsExample() {
  const [email, setEmail] = useState("accounts@phinco.vn");
  const [po, setPo] = useState("");
  const [address, setAddress] = useState("");
  return (
    <Card theme="flat" className="px-input-card">
      <Stack gap="md">
        <Heading level={4} textStyle="Heading/Subheading">Billing details</Heading>
        <Stack gap="md" direction="column">
          <InputField label="Billing email" type="email" labelTooltip="Invoices and payment receipts go to this address." value={email} onValueChange={setEmail} />
          <InputField label="PO number" labelOptional placeholder="e.g. PO-4471" helpText="Printed on every invoice when set." value={po} onValueChange={setPo} />
          <InputField label="Billing address" placeholder="Street, ward, district, city" value={address} onValueChange={setAddress}
            labelAction={<button type="button" onClick={() => setAddress(phinAddress)}>Use company address</button>} />
        </Stack>
      </Stack>
    </Card>
  );
}

// ——— 3. Help text that responds ——————————————————————————————————————————————————————————————————
const savedAddress = "dizai-studio";
const takenAddresses = ["dizai", "phin", "lumen", "saola", "studio", "zen"];
const personalDomain = /@(gmail|yahoo|outlook|hotmail|icloud)\./i;

function WorkspaceProfileExample() {
  const { toast } = useToast();
  const [name, setName] = useState("Đìzai Studio");
  const [address, setAddress] = useState(savedAddress);
  const [current, setCurrent] = useState(savedAddress);
  const [checked, setChecked] = useState(false);
  const [support, setSupport] = useState("dizai.studio@gmail.com");
  // The address is checked when the field is left (or on Save), never while typing.
  const addressError = !checked || address === current ? undefined
    : !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(address) ? "Use only lowercase letters, numbers and hyphens"
      : takenAddresses.includes(address) ? `zen.so/${address} is taken. Try another address.` : undefined;
  const addressHelp = address === current ? `People sign in at zen.so/${current}.` : checked ? `zen.so/${address} is available.` : "Lowercase letters, numbers and hyphens.";
  const personal = personalDomain.test(support);
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChecked(true);
    const ok = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(address) && !takenAddresses.includes(address);
    if (!ok && address !== current) return;
    setCurrent(address);
    setChecked(false);
    toast({ type: "positive", title: "Workspace updated" });
  };
  return (
    <Card theme="flat" className="px-input-card">
      <Form onSubmit={save} gap="md">
        <Heading level={4} textStyle="Heading/Subheading">Workspace profile</Heading>
        <InputField label="Workspace name" maxLength={32} characterLimit helpText="Shown in the sidebar and on invoices." value={name} onValueChange={setName} />
        <InputField label="Workspace address" value={address} onValueChange={(v) => { setAddress(v.toLowerCase()); setChecked(false); }} onBlur={() => setChecked(true)}
          leading={<InputLeadingTrailing label="zen.so/" interactive={false} />}
          error={addressError} helpText={addressHelp} helpTheme={checked && address !== current ? "positive" : "neutral"} />
        <InputField label="Support email" type="email" value={support} onValueChange={setSupport}
          helpText={personal ? "Personal addresses can miss client replies. Use a studio address." : "Clients reply to this address."}
          helpTheme={personal ? "warning" : "neutral"} />
        <FormActions>
          <Button level="primary" type="submit">Save changes</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

// ——— 4. Read-only and disabled ———————————————————————————————————————————————————————————————————
const sentInvoice = invoices[0]; // INV-2026-0142 · Phin & Co · $21,000 · Sent

function SentInvoiceExample() {
  const { toast } = useToast();
  const [reminders, setReminders] = useState(false);
  const [days, setDays] = useState<number | null>(3);
  const firstReminder = new Date(sentInvoice.due.getTime() - (days ?? 0) * 86_400_000);
  const copy = () => {
    navigator.clipboard.writeText(sentInvoice.number).catch(() => undefined);
    toast({ type: "positive", title: "Invoice number copied" });
  };
  return (
    <Card theme="flat" className="px-input-card">
      {/* Two groups in one card (lg apart); fields inside a group md apart. */}
      <Stack gap="lg">
        <Stack gap="md">
          <Stack direction="row" gap="sm" align="start" justify="between">
            <Heading level={4} textStyle="Heading/Subheading">Invoice for {sentInvoice.client}</Heading>
            <Badge className="px-input-status" theme={invoiceStatusTheme[sentInvoice.status]} background="subtle">{sentInvoice.status}</Badge>
          </Stack>
          <InputField label="Invoice number" readOnly value={sentInvoice.number} labelAction={<button type="button" onClick={copy}>Copy</button>} />
          <InputField label="Amount" readOnly value={formatMoney(sentInvoice.amount, true)} helpText={`Locked since it was sent on ${formatDate(sentInvoice.issued)}.`} />
        </Stack>
        <Stack gap="md">
          {/* A setting row fills the card, so the switch lines up with the fields' right edge. */}
          <Toggle className="px-input-fill" size="md" label="Payment reminders" caption={`Email ${sentInvoice.client} before the due date, ${formatDate(sentInvoice.due)}`} checked={reminders} onCheckedChange={setReminders} />
          <NumberField label="Days before the due date" min={1} max={14} value={days} onValueChange={setDays} disabled={!reminders}
            helpText={reminders ? `First reminder on ${formatDate(firstReminder)}.` : "Turn on payment reminders to set a schedule."} />
        </Stack>
      </Stack>
    </Card>
  );
}

// ——— 5. Pickers in the field —————————————————————————————————————————————————————————————————————
const dialCodes = [
  { value: "vn", label: "+84", caption: "Vietnam", flag: <Flag name="Vietnam" size="sm" /> },
  { value: "sg", label: "+65", caption: "Singapore", flag: <Flag name="Singapore" size="sm" /> },
  { value: "us", label: "+1", caption: "United States", flag: <Flag name="United States" size="sm" /> },
  { value: "jp", label: "+81", caption: "Japan", flag: <Flag name="Japan" size="sm" /> },
  { value: "au", label: "+61", caption: "Australia", flag: <Flag name="Australia" size="sm" /> },
];
const currencies = [
  { value: "usd", label: "USD", caption: "US dollar" },
  { value: "sgd", label: "SGD", caption: "Singapore dollar" },
  { value: "vnd", label: "VND", caption: "Vietnamese dong" },
];

function ClientContactExample() {
  const [dial, setDial] = useState("sg");
  const [phone, setPhone] = useState("9123 4567");
  const [site, setSite] = useState("lumenbank.sg");
  const [currency, setCurrency] = useState("usd");
  const [retainer, setRetainer] = useState("12,000");
  return (
    <Card theme="flat" className="px-input-card">
      <Stack gap="md">
        <Heading level={4} textStyle="Heading/Subheading">Lumen Bank</Heading>
        <InputField label="Phone" type="tel" value={phone} onValueChange={setPhone}
          leading={<InputLeadingTrailing label="+65" options={dialCodes} value={dial} onValueChange={setDial} popoverLabel="Country code" align="start" />} />
        <InputField label="Website" value={site} onValueChange={setSite}
          leading={<InputLeadingTrailing label="https://" interactive={false} />} />
        <InputField label="Monthly retainer" inputMode="decimal" value={retainer} onValueChange={setRetainer} helpText="Billed on the 1st of each month."
          trailing={<InputLeadingTrailing label="USD" options={currencies} value={currency} onValueChange={setCurrency} popoverLabel="Currency" />} />
      </Stack>
    </Card>
  );
}

// ——— 6. Password rules ————————————————————————————————————————————————————————————————————————————
const passwordRules = [
  { label: "At least 10 characters", test: (v: string) => v.length >= 10 },
  { label: "An uppercase and a lowercase letter", test: (v: string) => /[A-Z]/.test(v) && /[a-z]/.test(v) },
  { label: "A number", test: (v: string) => /\d/.test(v) },
  { label: "Not your name or email", test: (v: string) => v.length > 0 && !/pham|em@dizai/i.test(v) },
];

function PasswordRulesExample() {
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState(false);
  const fieldRef = useRef<HTMLInputElement>(null);
  const restarted = useRef(false);
  const passes = passwordRules.every((rule) => rule.test(password));
  const cardRef = useRef<HTMLElement>(null);
  // The form and the message replace each other: focus follows to the field or to Change password, not to the page.
  useEffect(() => {
    if (done) cardRef.current?.querySelector<HTMLElement>(".zen-inline-message button")?.focus();
    else if (restarted.current) fieldRef.current?.focus();
  }, [done]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTried(true);
    if (passes) setDone(true);
  };
  const again = () => { restarted.current = true; setPassword(""); setTried(false); setShown(false); setDone(false); };
  return (
    <Card ref={cardRef} theme="flat" className="px-input-card">
      {done ? (
        <InlineMessage theme="positive" title="Password set" action={{ label: "Change password", onClick: again }}>
          You can now sign in to Đìzai Studio as em@dizai.studio.
        </InlineMessage>
      ) : (
        <Form onSubmit={submit} gap="md">
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">Set your password</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">You're joining Đìzai Studio as em@dizai.studio.</Text>
          </Stack>
          <InputField ref={fieldRef} label="New password" type={shown ? "text" : "password"} autoComplete="new-password" value={password}
            onValueChange={(v) => { setPassword(v); setTried(false); }}
            error={tried && !passes ? "Meet every rule below to continue" : undefined}
            trailing={<InputLeadingTrailing icon={shown ? "icon-eye-off-line" : "icon-eye-line"} aria-label={shown ? "Hide password" : "Show password"} onClick={() => setShown((s) => !s)} />} />
          <InputConditions>
            {passwordRules.map((rule) => (
              <InputConditionItem key={rule.label} label={rule.label} state={!password ? "default" : rule.test(password) ? "success" : "wrong"} />
            ))}
          </InputConditions>
          <FormActions>
            <Button level="primary" type="submit">Set password</Button>
          </FormActions>
        </Form>
      )}
    </Card>
  );
}

// ——— 7. Task title and notes —————————————————————————————————————————————————————————————————————
// A follow-up to LUM-088 with a title too long for one line.
const taskSaved = {
  key: "LUM-097",
  status: "In progress" as const,
  due: new Date(2026, 9, 9),
  title: "Run five follow-up sessions on the new transfer flow with Lumen Bank retail customers in Ho Chi Minh City",
  notes: "<p>Goal: check that the new review screen fixes where customers hesitated in round one.</p><ul><li>Recruit five retail customers through the Lumen Bank research panel</li><li>Test the review screen and the saved payees list</li><li>Share the top findings with Hana Kim before the Oct 9 review</li></ul>",
};

function TaskDetailExample() {
  const { toast } = useToast();
  const [saved, setSaved] = useState({ title: taskSaved.title, notes: taskSaved.notes });
  const [title, setTitle] = useState(taskSaved.title);
  const [notes, setNotes] = useState(taskSaved.notes);
  const dirty = title !== saved.title || notes !== saved.notes;
  const formRef = useRef<HTMLFormElement>(null);
  // Both actions disable themselves once used: focus goes back to the title, not to the page.
  const toTitle = () => formRef.current?.querySelector<HTMLElement>('[aria-label="Task title"]')?.focus();
  const save = () => { toTitle(); setSaved({ title, notes }); toast({ type: "positive", title: "Task updated" }); };
  const discard = () => { toTitle(); setTitle(saved.title); setNotes(saved.notes); };
  const ava = people.ava;
  return (
    <Card theme="flat">
      {/* Blocks of one card md apart: the task header, the notes, the actions. */}
      <Form ref={formRef} onSubmit={save} gap="md">
        <Stack gap="sm">
          <Stack gap="xs">
            <Text textStyle="Body/Small/Bold" tone="base">{taskSaved.key} · Online banking redesign</Text>
            <HeadingField headingSize="h3" multiline aria-label="Task title" placeholder="Task title" value={title} onValueChange={setTitle} />
          </Stack>
          <Stack direction="row" gap="xs" align="center" wrap>
            <Badge theme={taskStatusTheme[taskSaved.status]} background="subtle">{taskSaved.status}</Badge>
            <Stack direction="row" gap="xs" align="center">
              <Avatar size="xs" theme="photo" src={ava.photo} alt="" />
              <Text as="span" textStyle="Body/Small/Regular" tone="base">{ava.name}</Text>
            </Stack>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">• Due {formatDate(taskSaved.due)}</Text>
          </Stack>
        </Stack>
        <RichTextField label="Notes" maxLength={2000} characterLimit value={notes} onValueChange={(html) => setNotes(html)} editorBar />
        {/* Both actions wait for a change; the status says why they turned on. */}
        <FormActions align="between">
          <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{dirty ? "Unsaved changes" : ""}</Text>
          <Button level="tertiary" disabled={!dirty} onClick={discard}>Cancel</Button>
          <Button level="primary" type="submit" disabled={!dirty}>Save changes</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

// ——— 8. Time off on a phone ——————————————————————————————————————————————————————————————————————
type TimeOffRequest = { id: string; type: string; first: Date; last: Date; status: LeaveStatus };
// The shared leave kinds, plus Work from home, which this form also books.
const leaveTypes = ["Annual leave", "Sick leave", "Work from home", "Unpaid leave"].map((type) => ({ value: type, label: type }));
const annualAllowance = 18;
const day = (month: number, date: number) => new Date(2026, month - 1, date);
// Alex's requests this year, newest first: the shared Oct 12 – Oct 14 leave, then the ones already taken.
const pastRequests: TimeOffRequest[] = [
  ...leaveRequests.filter((r) => r.person === "alex").map((r) => ({ id: r.id, type: r.kind, first: r.from, last: r.to, status: r.status })),
  { id: "r12", type: "Work from home", first: day(9, 25), last: day(9, 25), status: "Approved" },
  { id: "r11", type: "Sick leave", first: day(9, 18), last: day(9, 18), status: "Approved" },
  { id: "r10", type: "Annual leave", first: day(8, 27), last: day(8, 28), status: "Approved" },
  { id: "r9", type: "Work from home", first: day(8, 7), last: day(8, 7), status: "Approved" },
  { id: "r8", type: "Sick leave", first: day(7, 17), last: day(7, 17), status: "Approved" },
  { id: "r7", type: "Annual leave", first: day(6, 29), last: day(7, 1), status: "Approved" },
  { id: "r6", type: "Work from home", first: day(6, 12), last: day(6, 12), status: "Approved" },
  { id: "r5", type: "Annual leave", first: day(5, 4), last: day(5, 4), status: "Approved" },
  { id: "r4", type: "Sick leave", first: day(4, 10), last: day(4, 10), status: "Approved" },
  { id: "r3", type: "Work from home", first: day(3, 16), last: day(3, 17), status: "Approved" },
  { id: "r2", type: "Annual leave", first: day(2, 23), last: day(2, 24), status: "Approved" },
  { id: "r1", type: "Unpaid leave", first: day(1, 9), last: day(1, 9), status: "Approved" },
];
const workingDays = (first: Date, last: Date) => {
  let n = 0;
  for (const d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) if (d.getDay() % 6 !== 0) n += 1;
  return n;
};
const today = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
// This year's dates drop the year, so a row title stays on one line beside its status.
const dayOf = (d: Date) => d.getFullYear() === TODAY.getFullYear() ? formatDay(d) : formatDate(d);
const datesOf = (r: TimeOffRequest) => r.first.getTime() === r.last.getTime() ? dayOf(r.first) : `${dayOf(r.first)} – ${dayOf(r.last)}`;
type LeaveDraft = { type: string; first: string; last: string; note: string };
// Where focus lands after moving between the two screens (usePhoneScreen).
const requestButton = ".zen-action-bar button";
const firstField = ".zen-select__trigger";

function TimeOffPhoneExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const formId = useId();
  const upcomingId = useId();
  const earlierId = useId();
  const [view, setView] = useState<"list" | "form">("list");
  const [discarding, setDiscarding] = useState(false);
  const [requests, setRequests] = useState(pastRequests);
  const annualLeft = annualAllowance - requests.filter((r) => r.type === "Annual leave").reduce((n, r) => n + workingDays(r.first, r.last), 0);
  const upcoming = requests.filter((r) => r.last >= today).sort((a, b) => a.first.getTime() - b.first.getTime());
  const earlier = requests.filter((r) => r.last < today);
  const form = useFormState<LeaveDraft>({
    initialValues: { type: "Annual leave", first: "", last: "", note: "" },
    validate: (v) => {
      const first = parseDay(v.first), last = parseDay(v.last);
      const days = first && last ? workingDays(first, last) : 0;
      return {
        first: !first ? "Pick your first day off" : first < today ? "Pick today or a later day" : undefined,
        last: !last ? "Pick your last day off" : first && last < first ? "Pick a last day on or after the first day"
          : v.type === "Annual leave" && days > annualLeft ? `You have ${plural(annualLeft, "day")} of annual leave left` : undefined,
      };
    },
    onSubmit: (v, { reset }) => {
      setRequests((list) => [{ id: `new-${list.length + 1}`, type: v.type, first: parseDay(v.first)!, last: parseDay(v.last)!, status: "Pending" }, ...list]);
      reset();
      screen.go(requestButton, () => setView("list"));
      toast({ type: "positive", title: "Request sent", children: "Minh Anh Vo will reply in Zen." });
    },
  });
  const first = parseDay(form.values.first), last = parseDay(form.values.last);
  const days = first && last && last >= first ? workingDays(first, last) : 0;
  const after = annualLeft - days;
  const annual = form.values.type === "Annual leave";
  const lastHelp = days ? `${plural(days, "working day")}${annual ? ` · ${after < 0 ? `${plural(-after, "day")} over your balance` : `${plural(after, "day")} left after this`}` : ""}` : undefined;
  const toList = () => screen.go(requestButton, () => { setDiscarding(false); form.reset(); setView("list"); });
  // Back drops the draft only after asking, unless nothing was filled in.
  const back = () => (form.isDirty ? setDiscarding(true) : toList());
  const open = () => screen.go(firstField, () => setView("form"));
  const row = (r: TimeOffRequest) => (
    <ListItem key={r.id} title={datesOf(r)} caption={r.type}
      leading={<DockIcon icon="icon-calendar-check-line" theme={leaveStatusTheme[r.status]} background="subtle" />}
      trailing={<Badge theme={leaveStatusTheme[r.status]} background="subtle">{r.status}</Badge>} />
  );

  if (view === "list") {
    return (
      // One key per screen: each screen opens at the top and the large title folds again.
      // Grouped list: the screen is Surface-Alt and each group a white block. The requests only show their status
      // (Interactive=No rows, no side padding of their own), so each group is a ListBox (20px on a phone) and the kicker
      // lines up with their text (paddingX lg).
      <PlatformPhone key="list" label="Time off" canvas="alt" headerOverlay screenRef={screenRef}
        header={<TopNavigation type="alt" title="Time off" largeTitle="Time off" scrollRef={screenRef} />}
        footer={<ActionBar position="static" primaryAction={{ label: "Request time off", onClick: open }} />}>
        {screen.anchor}
        <Stack gap="lg" padding="lg">
          <ListBox>
            <List aria-label="Balance">
              <ListItem title="Annual leave" caption={`${annualAllowance} days a year`} leading={<DockIcon icon="icon-calendar-line" theme="green" background="subtle" />}
                trailing={<Text as="span" textStyle="Body/Base/Bold">{plural(annualLeft, "day")} left</Text>} />
            </List>
          </ListBox>
          <Stack as="section" gap="xs" aria-labelledby={upcomingId}>
            <Box paddingX="lg"><Heading level={2} id={upcomingId} textStyle="Body/Small/Bold" tone="light">Upcoming</Heading></Box>
            <ListBox>
              <List aria-labelledby={upcomingId}>{upcoming.map(row)}</List>
            </ListBox>
          </Stack>
          <Stack as="section" gap="xs" aria-labelledby={earlierId}>
            <Box paddingX="lg"><Heading level={2} id={earlierId} textStyle="Body/Small/Bold" tone="light">Earlier this year</Heading></Box>
            <ListBox>
              <List aria-labelledby={earlierId}>{earlier.map(row)}</List>
            </ListBox>
          </Stack>
        </Stack>
      </PlatformPhone>
    );
  }
  return (
    <PlatformPhone key="form" label="Request time off" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact-alt" title="Request time off" scrollRef={screenRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
      footer={<ActionBar position="static" primaryAction={{ label: "Send request", type: "submit", form: formId }} />}>
      {screen.anchor}
      <Box padding="lg">
        <Form id={formId} form={form} gap="md">
          <SelectField size="lg" label="Leave type" options={leaveTypes} {...form.selectField("type")} />
          <DateField size="lg" label="First day" today={TODAY} minDate={today} {...form.dateField("first")} />
          <DateField size="lg" label="Last day" today={TODAY} minDate={first ?? today} helpText={lastHelp} helpTheme={annual && after < 0 ? "warning" : "neutral"} {...form.dateField("last")} />
          <TextAreaField size="lg" label="Note for Minh Anh" labelOptional placeholder="e.g. Family trip to Đà Lạt" rows={3} maxLength={200} characterLimit {...form.field("note")} />
        </Form>
      </Box>
      <BottomSheet inline open={discarding} onOpenChange={setDiscarding} title="Discard this request?"
        primaryAction={{ label: "Discard request", level: "danger", onClick: toList }} secondaryAction={{ label: "Keep editing" }}>
        <Text tone="base">The dates and the note you entered won't be sent.</Text>
      </BottomSheet>
    </PlatformPhone>
  );
}

// ——— Examples ———————————————————————————————————————————————————————————————————————————————————
export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Create a project",
    description: "Each value gets the field built for it: text for the name, a Select for one of six clients, calendar dates, steppers for a small count and tags for the team. Errors show when a field is left or the form is submitted, and focus moves to the first one.",
    wide: true,
    render: () => <NewProjectExample />,
    code: `const form = useFormState({
  initialValues: { name: "", client: "", start: "10/12/2026", due: "", lead: "alex", sprint: 2, team: [], brief: "" },
  validate: (v) => ({
    name: v.name.trim() ? undefined : "Enter a project name",
    client: v.client ? undefined : "Choose a client",
    due: isAfter(v.due, v.start) ? undefined : "Pick a due date after the start date",
    team: v.team.length ? undefined : "Add at least one team member",
  }),
  onSubmit: (v, { reset }) => { toast({ type: "positive", title: "Project created" }); reset(); },
});

<Card theme="flat">
  <Form form={form} gap="md">
    <Heading level={4} textStyle="Heading/Subheading">New project</Heading>
    <Grid minColumnWidth={280} rowGap="md" columnGap="lg">
      <InputField label="Project name" placeholder="e.g. Loyalty app" {...form.field("name")} />
      <SelectField label="Client" placeholder="Choose a client" options={clients} {...form.selectField("client")} />
      <SelectField label="Project lead" options={leads} {...form.selectField("lead")} />
      <DateField label="Start date" today={today} {...form.dateField("start")} />
      <DateField label="Due date" today={today} {...form.dateField("due")} />
      <NumberField label="Sprint length (weeks)" min={1} max={4} {...form.numberField("sprint")} />
    </Grid>
    <AutocompleteField label="Team" addLabel="Add member" options={studioMembers} {...form.autocompleteField("team")} />
    <TextAreaField label="Brief" labelOptional rows={3} maxLength={280} characterLimit {...form.field("brief")} />
    <FormActions>
      <Button level="tertiary" onClick={() => form.reset()}>Cancel</Button>
      <Button level="primary" type="submit">Create project</Button>
    </FormActions>
  </Form>
</Card>`,
  },
  {
    title: "Label parts",
    description: "An info tooltip says where invoices go, (Optional) marks the one field that may stay empty, and a label action fills the billing address from the client's profile.",
    render: () => <BillingDetailsExample />,
    code: `<InputField label="Billing email" type="email" value={email} onValueChange={setEmail}
  labelTooltip="Invoices and payment receipts go to this address." />
<InputField label="PO number" labelOptional placeholder="e.g. PO-4471"
  helpText="Printed on every invoice when set." value={po} onValueChange={setPo} />
<InputField label="Billing address" value={address} onValueChange={setAddress}
  labelAction={<button type="button" onClick={() => setAddress(client.address)}>Use company address</button>} />`,
  },
  {
    title: "Help text that responds",
    description: "Help text changes theme with the value: a character count on the name, Positive or an error once the address is checked on blur, and a Warning while the support email is a personal one.",
    render: () => <WorkspaceProfileExample />,
    code: `<InputField label="Workspace name" maxLength={32} characterLimit
  helpText="Shown in the sidebar and on invoices." value={name} onValueChange={setName} />

<InputField label="Workspace address" value={address} onValueChange={setAddress} onBlur={() => setChecked(true)}
  leading={<InputLeadingTrailing label="zen.so/" interactive={false} />}
  error={checked && taken ? \`zen.so/\${address} is taken. Try another address.\` : undefined}
  helpText={checked ? \`zen.so/\${address} is available.\` : "Lowercase letters, numbers and hyphens."}
  helpTheme={checked ? "positive" : "neutral"} />

<InputField label="Support email" type="email" value={email} onValueChange={setEmail}
  helpText={personal ? "Personal addresses can miss client replies. Use a studio address." : "Clients reply to this address."}
  helpTheme={personal ? "warning" : "neutral"} />

<FormActions><Button level="primary" type="submit">Save changes</Button></FormActions>`,
  },
  {
    title: "Read-only and disabled",
    description: "A sent invoice keeps its number and amount read-only, so they can still be selected and copied. The reminder field is disabled until reminders are turned on, and its help text says why.",
    render: () => <SentInvoiceExample />,
    code: `<InputField label="Invoice number" readOnly value="INV-2026-0142"
  labelAction={<button type="button" onClick={copyNumber}>Copy</button>} />
<InputField label="Amount" readOnly value="$21,000.00" helpText="Locked since it was sent on Sep 25, 2026." />

<Toggle size="md" label="Payment reminders" caption="Email Phin & Co before the due date, Oct 25, 2026"
  checked={reminders} onCheckedChange={setReminders} />
<NumberField label="Days before the due date" min={1} max={14} value={days} onValueChange={setDays}
  disabled={!reminders}
  helpText={reminders ? \`First reminder on \${formatDate(firstReminder)}.\` : "Turn on payment reminders to set a schedule."} />`,
  },
  {
    title: "Pickers in the field",
    description: "Labelled Leading and Trailing slots with options become pickers: the country code of the phone number and the currency of the retainer. The https:// prefix has no options, so it stays decorative and a click on it focuses the field.",
    render: () => <ClientContactExample />,
    code: `const dialCodes = [
  { value: "vn", label: "+84", caption: "Vietnam", flag: <Flag name="Vietnam" size="sm" /> },
  { value: "sg", label: "+65", caption: "Singapore", flag: <Flag name="Singapore" size="sm" /> },
  …
];

<InputField label="Phone" type="tel" value={phone} onValueChange={setPhone}
  leading={<InputLeadingTrailing label="+65" options={dialCodes} value={dial} onValueChange={setDial}
    popoverLabel="Country code" align="start" />} />
<InputField label="Website" value={site} onValueChange={setSite}
  leading={<InputLeadingTrailing label="https://" interactive={false} />} />
<InputField label="Monthly retainer" inputMode="decimal" value={amount} onValueChange={setAmount}
  trailing={<InputLeadingTrailing label="USD" options={currencies} value={currency} onValueChange={setCurrency}
    popoverLabel="Currency" />} />`,
  },
  {
    title: "Password rules",
    description: "The rules sit under the field as Input Conditions and turn to a check or a cross while typing. The eye in the trailing slot is an action slot whose name says what it does, and Enter submits.",
    render: () => <PasswordRulesExample />,
    code: `const rules = [
  { label: "At least 10 characters", test: (v) => v.length >= 10 },
  { label: "An uppercase and a lowercase letter", test: (v) => /[A-Z]/.test(v) && /[a-z]/.test(v) },
  { label: "A number", test: (v) => /\\d/.test(v) },
];

<Form onSubmit={submit} gap="md">
  <InputField label="New password" type={shown ? "text" : "password"} autoComplete="new-password"
    value={password} onValueChange={setPassword}
    error={tried && !passes ? "Meet every rule below to continue" : undefined}
    trailing={<InputLeadingTrailing icon={shown ? "icon-eye-off-line" : "icon-eye-line"}
      aria-label={shown ? "Hide password" : "Show password"} onClick={() => setShown(!shown)} />} />
  <InputConditions>
    {rules.map((rule) => (
      <InputConditionItem key={rule.label} label={rule.label}
        state={!password ? "default" : rule.test(password) ? "success" : "wrong"} />
    ))}
  </InputConditions>
  <FormActions><Button level="primary" type="submit">Set password</Button></FormActions>
</Form>`,
  },
  {
    title: "Task title and notes",
    description: "A multi-line Heading field lets a long task title wrap instead of scrolling out of view, and the Rich-text field keeps its editor bar for lists and links. Both save together through one Save changes.",
    wide: true,
    render: () => <TaskDetailExample />,
    code: `<Form onSubmit={save} gap="md">
  <HeadingField headingSize="h3" multiline aria-label="Task title" value={title} onValueChange={setTitle} />
  <RichTextField label="Notes" maxLength={2000} characterLimit value={notes}
    onValueChange={(html) => setNotes(html)} editorBar />
  <FormActions align="between">
    <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{dirty ? "Unsaved changes" : ""}</Text>
    <Button level="tertiary" disabled={!dirty} onClick={discard}>Cancel</Button>
    <Button level="primary" type="submit" disabled={!dirty}>Save changes</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Time off on a phone",
    description: "Phone forms use Large fields and put the submit in the footer. The last day's help text counts the working days and the balance left, the request lands under Upcoming as Pending, and Back asks before it drops a filled-in request.",
    render: () => <TimeOffPhoneExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

// The Time off root: a grouped list on Surface-Alt; the large title folds as the year's requests scroll under it.
<PlatformPhone key="list" canvas="alt" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Time off" largeTitle="Time off" scrollRef={screenRef} />}
  footer={<ActionBar position="static" primaryAction={{ label: "Request time off", onClick: open }} />}>
  <Stack gap="lg" padding="lg">
    {/* The balance, then Upcoming and Earlier this year: a kicker over a white block each */}
    <Stack as="section" gap="xs" aria-labelledby="upcoming">
      <Box paddingX="lg"><Heading level={2} id="upcoming" textStyle="Body/Small/Bold" tone="light">Upcoming</Heading></Box>
      <ListBox>
        <List aria-labelledby="upcoming">{upcoming.map(row)}</List>
      </ListBox>
    </Stack>
  </Stack>
</PlatformPhone>

// The form, pushed from it: one key per screen, so it opens at the top.
<PlatformPhone key="form" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact-alt" title="Request time off" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => (form.isDirty ? setDiscarding(true) : toList()) }} />}
  footer={<ActionBar position="static" primaryAction={{ label: "Send request", type: "submit", form: formId }} />}>
  <Form id={formId} form={form} gap="md">
    <SelectField size="lg" label="Leave type" options={leaveTypes} {...form.selectField("type")} />
    <DateField size="lg" label="First day" today={today} minDate={today} {...form.dateField("first")} />
    <DateField size="lg" label="Last day" today={today} minDate={first ?? today} helpText={\`\${plural(days, "working day")} · \${plural(left - days, "day")} left after this\`}
      {...form.dateField("last")} />
    <TextAreaField size="lg" label="Note for Minh Anh" labelOptional rows={3} maxLength={200} characterLimit
      {...form.field("note")} />
  </Form>
  <BottomSheet inline open={discarding} onOpenChange={setDiscarding} title="Discard this request?"
    primaryAction={{ label: "Discard request", level: "danger", onClick: toList }} secondaryAction={{ label: "Keep editing" }}>
    <Text tone="base">The dates and the note you entered won't be sent.</Text>
  </BottomSheet>
</PlatformPhone>`,
  },
]);

