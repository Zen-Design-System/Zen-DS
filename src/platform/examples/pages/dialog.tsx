/* Dialog examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio's own work in Zen: delete a
   finished project, leave an edit, invite someone to a project, request time off, start a project in steps, restore a
   file version, copy a token that is shown once, and withdraw leave on a phone. Each demo copies its data into local
   state; Dialog and ModalForm come from ../../../components/Dialog. */
import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import { ActionBar } from "../../../components/ActionBar";
import { Dialog, ModalForm } from "../../../components/Dialog";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Checkbox } from "../../../components/Checkbox";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { Form, FormActions, FormFieldset } from "../../../components/Form";
import type { IconName } from "../../../components/Icon";
import { DateField, InputField, SelectField, TextAreaField } from "../../../components/Input";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { RadioButton } from "../../../components/RadioButton";
import { Stepper } from "../../../components/Stepper";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import {
  TODAY, daysFromToday, files, formatDate, formatDay, formatRange, formatRelative, initials, leaveRequests, leaveStatusTheme, people, projectStatusTheme,
  projects, tasks, type LeaveKind, type LeaveRequest, type LeaveStatus, type Person, type PersonId, type ProjectStatus,
} from "../data";
import { keepOnHotUpdate } from "../../hotData";
import "./dialog.css";

export const page: PlatformPage = "dialog";

// ——— Shared helpers ————————————————————————————————————————————————————————————————————————————
/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };
/** Focus a control once the next render has put it on screen (the opener of a dialog may be gone by then). */
const focusSoon = (find: () => HTMLElement | null | undefined) => requestAnimationFrame(() => find()?.focus());
/** A timestamp inside a sentence: "just now", "yesterday at 4:05 pm", "Friday at 4:05 pm", "Sep 14 at 9:00 am". */
const since = (d: Date) => formatRelative(d).replace(/^(Just now|Yesterday)/, (word) => word.toLowerCase());

/** A group label inside a card or a panel: a kicker (Body/Small/Bold, Light), one level below the title above it. */
function Kicker({ level = 5, children }: { level?: 2 | 3 | 5; children: string }) {
  return <Heading level={level} textStyle="Body/Small/Bold" tone="light">{children}</Heading>;
}

/** True while a card's list is phone-width (the docs page on a phone): rows then put their status under the caption. */
const NarrowContext = createContext(false);

/** A card's list that tells its rows when it is narrower than 300px. */
function CardList({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 300));
    observer.observe(list);
    return () => observer.disconnect();
  }, []);
  return <NarrowContext.Provider value={narrow}><List ref={ref} aria-label={label}>{children}</List></NarrowContext.Provider>;
}

/** A row with an optional trailing Badge or button. ListItem titles stay on one line, so on a narrow list the title
 *  wraps instead of being cut (the Contents slot): a Badge or text button moves under the caption, while an icon
 *  button (`iconTrailing`) is small enough to keep its place at the end of the row. */
function Row({ title, caption, leading, trailing, iconTrailing = false }: { title: string; caption: string; leading: ReactNode; trailing?: ReactNode; iconTrailing?: boolean }) {
  const narrow = useContext(NarrowContext);
  if (!narrow || !trailing) return <ListItem title={title} caption={caption} leading={leading} trailing={trailing} />;
  return (
    <ListItem title={title} leading={leading} trailing={iconTrailing ? trailing : undefined}>
      <Text as="span" textStyle="Body/Base/Bold">{title}</Text>
      <Text as="span" textStyle="Body/Small/Regular" tone="light">{caption}</Text>
      {iconTrailing ? null : <span className="px-dialog-row-trailing">{trailing}</span>}
    </ListItem>
  );
}

/** A card's header: its title (Heading/Subheading, h4 under the example's h3), an optional supporting line (xs below
 *  it) and an optional action on the right. */
function CardHeader({ title, children, action }: { title: string; children?: string; action?: ReactNode }) {
  const heading = <Heading level={4} textStyle="Heading/Subheading">{title}</Heading>;
  const titles = children ? <Stack gap="xs">{heading}<Text textStyle="Body/Small/Regular" tone="base">{children}</Text></Stack> : heading;
  return action ? <Stack direction="row" align="start" justify="between" gap="md" wrap>{titles}{action}</Stack> : titles;
}

// ——— 1. Delete a project: negative theme, type the name to confirm ——————————————————————————————————————
type DoneProject = { id: string; name: string; client: string; icon: IconName; theme: DockIconTheme; files: number; finished: Date };
const doneProjects: DoneProject[] = [
  { id: "bookfair-site", name: "Book Fair 2026 website", client: "Hanoi Book Fair", icon: "icon-book-open-line", theme: "purple", files: 214, finished: daysFromToday(-12) },
  { id: "phin-tet", name: "Tết campaign microsite", client: "Phin & Co", icon: "icon-gift-01-line", theme: "orange", files: 86, finished: new Date(2026, 1, 20) },
  { id: "lumen-report", name: "Annual report 2025", client: "Lumen Bank", icon: "icon-file-chart-line", theme: "blue", files: 42, finished: new Date(2026, 3, 8) },
];

function DeleteProject() {
  const { toast } = useToast();
  const listRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(doneProjects);
  const [target, setTarget] = useState(doneProjects[0]);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const matches = typed.trim() === target.name;
  const ask = (project: DoneProject) => { setTarget(project); setTyped(""); setMismatch(false); setOpen(true); };
  const remove = () => {
    setRows((list) => list.filter((project) => project.id !== target.id));
    setOpen(false);
    toast({ title: "Project deleted" });
    // The trash button that opened the dialog is gone: focus the next one.
    focusSoon(() => listRef.current?.querySelector<HTMLElement>("button"));
  };
  return (
    <Card theme="flat" spacing="md" className="px-dialog-card">
      <Stack gap="md" ref={listRef}>
        <CardHeader title="Completed projects" />
        {rows.length ? (
          <CardList label="Completed projects">
            {rows.map((project) => (
              <Row key={project.id} title={project.name} caption={`${project.client} · finished ${formatDate(project.finished)}`}
                leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />} iconTrailing
                trailing={<IconButton appearance="flat" size="md" icon="icon-trash-line" aria-label={`Delete ${project.name}`} onClick={() => ask(project)} />} />
            ))}
          </CardList>
        ) : (
          <EmptyState illustration={false} headingLevel={5} title="No completed projects">Projects move here when they're marked Completed.</EmptyState>
        )}
      </Stack>
      <Dialog open={open} onOpenChange={setOpen} theme="negative" title="Delete this project?"
        description={`${target.name}, its ${plural(target.files, "file")} and every comment are deleted for everyone. This can't be undone.`}
        primaryAction={{ label: "Delete project", level: "danger", disabled: !matches, onClick: remove }}
        secondaryAction={{ label: "Cancel" }}>
        {/* Enter in the field confirms once the name matches; before that it says what is missing. */}
        <Form onSubmit={() => (matches ? remove() : setMismatch(true))}>
          <InputField label="Project name" helpText={`Type “${target.name}” to confirm.`} autoComplete="off" value={typed}
            onValueChange={(value) => { setTyped(value); setMismatch(false); }} error={mismatch ? `Type “${target.name}” exactly as shown.` : undefined} />
        </Form>
      </Dialog>
    </Card>
  );
}

// ——— 2. Discard changes: a warning before edits are thrown away ————————————————————————————————————————
const pointsTask = tasks[0];
const pointsBrief = "Show earned and spent points by month. Each row names the store and the receipt total, and a tap opens the receipt.";

function DiscardChanges() {
  const { toast } = useToast();
  const editRef = useRef<HTMLButtonElement>(null);
  const [saved, setSaved] = useState(pointsBrief);
  const [draft, setDraft] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const editing = draft !== null;
  const close = () => { setDraft(null); focusSoon(() => editRef.current); };
  // Cancel asks only when something changed; untouched text just closes the editor.
  const cancel = () => (draft !== saved ? setConfirming(true) : close());
  const save = () => { setSaved(draft?.trim() || saved); close(); toast({ title: "Description saved" }); };
  const discard = () => { setConfirming(false); close(); };
  return (
    <Card theme="flat" spacing="md" className="px-dialog-card">
      <Stack gap="md">
        <CardHeader title={pointsTask.title}>{`${pointsTask.key} · Loyalty app`}</CardHeader>
        {editing ? (
          <Form onSubmit={save} gap="md">
            <TextAreaField label="Description" rows={4} value={draft} onValueChange={setDraft} />
            <FormActions>
              <Button level="tertiary" onClick={cancel}>Cancel</Button>
              <Button level="primary" type="submit">Save description</Button>
            </FormActions>
          </Form>
        ) : (
          <Stack gap="md" align="start">
            <Stack gap="xs">
              <Kicker>Description</Kicker>
              <Text>{saved}</Text>
            </Stack>
            <Button ref={editRef} level="tertiary" startIcon="icon-pencil-line" onClick={() => setDraft(saved)}>Edit description</Button>
          </Stack>
        )}
      </Stack>
      <Dialog open={confirming} onOpenChange={setConfirming} theme="warning" title="Discard unsaved changes?"
        description={`Your edits to the ${pointsTask.key} description will be lost.`}
        primaryAction={{ label: "Discard changes", level: "danger", onClick: discard }}
        secondaryAction={{ label: "Keep editing", autoFocus: true }} />
    </Card>
  );
}

// ——— 3. Invite by email: ModalForm Basic, validated on submit ————————————————————————————————————————
type Member = { id: string; email: string; role: string; person?: Person };
const roleOptions = [{ value: "Editor", label: "Editor" }, { value: "Commenter", label: "Commenter" }, { value: "Viewer", label: "Viewer" }];
const roleHelp: Record<string, string> = { Editor: "Can change files and tasks.", Commenter: "Can view and comment.", Viewer: "Can view only." };
const loyaltyMembers: Member[] = (["chi", "bao", "em", "duy"] as PersonId[]).map((id) => ({ id, email: people[id].email, role: id === "duy" ? "Commenter" : "Editor", person: people[id] }));

function InviteByEmail() {
  const { toast } = useToast();
  const [members, setMembers] = useState(loyaltyMembers);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Editor");
  const [error, setError] = useState<string>();
  const start = () => { setEmail(""); setRole("Editor"); setError(undefined); setOpen(true); };
  const send = () => {
    const address = email.trim().toLowerCase();
    const member = members.find((m) => m.email === address);
    const problem = !address ? "Enter an email address."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? "Enter an email like name@phinco.vn."
        : member ? `${member.person?.name ?? address} is already on this project.` : undefined;
    // A blocked submit: ModalForm moves focus to the field in error, so its message is read out.
    if (problem) { setError(problem); return; }
    setMembers((list) => [...list, { id: address, email: address, role }]);
    setOpen(false);
    toast({ title: "Invite sent" });
  };
  return (
    <Card theme="flat" spacing="md" className="px-dialog-card">
      <Stack gap="md">
        <CardHeader title="People on Loyalty app" action={<Button level="tertiary" startIcon="icon-user-plus-line" onClick={start} size="sm">Invite people</Button>} />
        <CardList label="People on Loyalty app">
          {members.map((member) => member.person ? (
            <Row key={member.id} title={member.person.name} caption={`${member.role} · ${member.person.role}`}
              leading={<Avatar size="md" {...avatarOf(member.person)} />} />
          ) : (
            // Someone invited by email has no name or photo yet: a mail Dock Icon at the Avatars' size.
            <Row key={member.id} title={member.email} caption={`${member.role} · invited ${since(TODAY)}`}
              leading={<DockIcon icon="icon-mail-01-line" theme="neutral" background="subtle" />}
              trailing={<Badge theme="yellow" background="subtle">Pending</Badge>} />
          ))}
        </CardList>
      </Stack>
      <ModalForm open={open} onOpenChange={setOpen} title="Invite to Loyalty app" description="They get an email with a link to join the project."
        onSubmit={send} primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email" type="email" placeholder="name@phinco.vn" autoComplete="off" value={email}
          onValueChange={(value) => { setEmail(value); setError(undefined); }} error={error} />
        <SelectField label="Role" options={roleOptions} value={role} onValueChange={setRole} helpText={roleHelp[role]} />
      </ModalForm>
    </Card>
  );
}

// ——— 4. Request time off: ModalForm 1-3, the balance beside the form —————————————————————————————————
type Leave = Pick<LeaveRequest, "id" | "kind" | "from" | "to" | "days" | "status" | "note">;
const leaveIcon: Record<LeaveKind, IconName> = { "Annual leave": "icon-plane-line", "Sick leave": "icon-thermometer-01-line", "Unpaid leave": "icon-calendar-line" };
const leaveKinds: LeaveKind[] = ["Annual leave", "Sick leave", "Unpaid leave"];
/** Days left in 2026 out of the studio's 18 annual and 12 paid sick days a year (the history below adds up to it);
 *  unpaid leave has no balance. */
const leaveBalance: Record<LeaveKind, number | null> = { "Annual leave": 7, "Sick leave": 10, "Unpaid leave": null };
/** "10/12/2026" (the DateField's typed format) → a Date, or null while it is incomplete. */
const parseDay = (text: string) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  const d = m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : null;
  return d && d.getDate() === Number(m?.[2]) ? d : null;
};
/** Monday to Friday between two days, both included. */
const workingDays = (first: Date, last: Date) => {
  let count = 0;
  for (const d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) if (d.getDay() % 6) count++;
  return count;
};
const leave = (id: string, kind: LeaveKind, from: Date, to: Date, status: LeaveStatus = "Approved", note?: string): Leave =>
  ({ id, kind, from, to, days: workingDays(from, to), status, note });
/** Alex's time off, newest first: his request in the studio's shared leave data (Oct 12 – Oct 14, approved), then his
 *  history. This year's requests show on the desktop list, the last two years on the phone. */
const myLeave: Leave[] = [
  ...leaveRequests.filter((request) => request.person === "alex"),
  leave("sep", "Sick leave", new Date(2026, 8, 8), new Date(2026, 8, 8)),
  leave("aug", "Annual leave", new Date(2026, 7, 18), new Date(2026, 7, 20)),
  leave("apr", "Annual leave", new Date(2026, 3, 27), new Date(2026, 3, 29), "Approved", "Long weekend in Hội An"),
  leave("mar", "Unpaid leave", new Date(2026, 2, 16), new Date(2026, 2, 17), "Approved", "Moving house"),
  leave("feb", "Annual leave", new Date(2026, 1, 23), new Date(2026, 1, 24), "Approved", "Tết with family in Huế"),
  leave("jan", "Sick leave", new Date(2026, 0, 19), new Date(2026, 0, 19)),
  leave("dec25", "Annual leave", new Date(2025, 11, 22), new Date(2025, 11, 26)),
  leave("nov25", "Sick leave", new Date(2025, 10, 17), new Date(2025, 10, 18)),
  leave("oct25", "Annual leave", new Date(2025, 9, 6), new Date(2025, 9, 8), "Cancelled"),
  leave("aug25", "Sick leave", new Date(2025, 7, 4), new Date(2025, 7, 4)),
  leave("jul25", "Annual leave", new Date(2025, 6, 14), new Date(2025, 6, 18), "Approved", "Summer trip to Phú Quốc"),
  leave("may25", "Annual leave", new Date(2025, 4, 2), new Date(2025, 4, 2)),
  leave("mar25", "Sick leave", new Date(2025, 2, 10), new Date(2025, 2, 10)),
];
const thisYear = (item: Pick<Leave, "from">) => item.from.getFullYear() === TODAY.getFullYear();
const leaveDates = (leave: Pick<Leave, "from" | "to">) => leave.from.getTime() === leave.to.getTime() ? formatDate(leave.from) : formatRange(leave.from, leave.to);
/** The same dates under a year header, which already names the year: "Oct 12 – Oct 14", "Sep 8". */
const leaveDays = (leave: Pick<Leave, "from" | "to">) => leave.from.getTime() === leave.to.getTime() ? formatDay(leave.from) : `${formatDay(leave.from)} – ${formatDay(leave.to)}`;

function RequestTimeOff() {
  const { toast } = useToast();
  const [requests, setRequests] = useState(() => myLeave.filter(thisYear));
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<LeaveKind>("Annual leave");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ from?: string; to?: string }>({});
  const [sending, setSending] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const first = parseDay(from), last = parseDay(to);
  const days = first && last && last >= first ? workingDays(first, last) : 0;
  const balance = leaveBalance[kind];
  const start = () => { setKind("Annual leave"); setFrom(""); setTo(""); setNote(""); setErrors({}); setOpen(true); };
  const submit = () => {
    const next = {
      from: first ? undefined : "Enter the first day, like 10/12/2026.",
      to: !last ? "Enter the last day." : first && last < first ? "The last day is before the first day."
        : balance !== null && days > balance ? `You have ${plural(balance, "day")} of ${kind.toLowerCase()} left.` : first && !days ? "Pick at least one working day." : undefined,
    };
    setErrors(next);
    if (next.from || next.to || !first || !last) return;
    // The primary action shows the wait itself; the request joins the list as Pending.
    setSending(true);
    timer.current = window.setTimeout(() => {
      setSending(false);
      setRequests((list) => [{ id: `r${list.length}`, kind, from: first, to: last, days, status: "Pending", note: note.trim() || undefined }, ...list]);
      setOpen(false);
      toast({ title: "Request sent" });
    }, 900);
  };
  const approver = people.minhAnh;
  const typeName = useId();
  return (
    <Card theme="flat" spacing="md" className="px-dialog-card">
      <Stack gap="md">
        <CardHeader title="Your time off" action={<Button level="tertiary" startIcon="icon-plus-line" onClick={start} size="sm">Request time off</Button>}>
          {`${plural(leaveBalance["Annual leave"] ?? 0, "day")} of annual leave left in ${TODAY.getFullYear()}`}
        </CardHeader>
        <CardList label="Your time off">
          {requests.map((item) => (
            <Row key={item.id} title={item.kind} caption={`${leaveDates(item)} · ${plural(item.days, "day")}`}
              leading={<DockIcon icon={leaveIcon[item.kind]} theme="neutral" background="subtle" />}
              trailing={<Badge theme={leaveStatusTheme[item.status]} background="subtle">{item.status}</Badge>} />
          ))}
        </CardList>
      </Stack>
      <ModalForm open={open} onOpenChange={(next) => { if (!sending) setOpen(next); }} layout="1-3" title="Request time off"
        description={`${approver.name} in People Ops approves your requests.`}
        // The balance of the chosen type, updated as the dates change.
        side={<DescriptionList layout="stacked" items={[
          { term: kind, description: balance === null ? "No limit" : `${plural(balance, "day")} left` },
          { term: "This request", description: days ? plural(days, "day") : "No dates yet" },
          ...(balance === null ? [] : [{ term: "Left after", description: plural(Math.max(balance - days, 0), "day"), emphasis: true }]),
        ]} />}
        onSubmit={submit}
        primaryAction={{ label: sending ? "Sending…" : "Send request", disabled: sending }}
        secondaryAction={{ label: "Cancel", disabled: sending }}>
        {/* Three types: a radio group shows them all, and the dialog's first focus lands on the chosen one. */}
        <FormFieldset kind="radio" legend="Type" direction="row">
          {leaveKinds.map((option) => (
            <RadioButton key={option} name={typeName} value={option} label={option}
              checked={kind === option} onCheckedChange={(checked) => { if (checked) { setKind(option); setErrors({}); } }} />
          ))}
        </FormFieldset>
        <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="lg">
          <DateField label="First day" today={TODAY} value={from} onValueChange={(value) => { setFrom(value); setErrors((e) => ({ ...e, from: undefined })); }} error={errors.from} />
          <DateField label="Last day" today={TODAY} value={to} onValueChange={(value) => { setTo(value); setErrors((e) => ({ ...e, to: undefined })); }} error={errors.to} />
        </Grid>
        <TextAreaField label="Note" labelOptional rows={3} value={note} onValueChange={setNote} helpText={`Only ${approver.name} sees it.`} />
      </ModalForm>
    </Card>
  );
}

// ——— 5. New project in steps: ModalForm Big with a Stepper ——————————————————————————————————————————
const clientOptions = ["Phin & Co", "Lumen Bank", "Mekong Freight", "Hanoi Book Fair", "Saola Outdoor", "Đìzai Studio"].map((client) => ({ value: client, label: client }));
const leadIds: PersonId[] = ["alex", "chi", "duy", "gia", "finn"];
const memberIds: PersonId[] = ["ava", "bao", "chi", "emi", "em", "finn", "gia", "khoa", "linh"];
const projectSteps = [
  { id: "details", title: "Details", caption: "Name and client" },
  { id: "team", title: "Team", caption: "Lead and members" },
  { id: "review", title: "Review", caption: "Check and create" },
];
type ProjectRow = { id: string; name: string; client: string; icon: IconName; theme: DockIconTheme; status: ProjectStatus };

function NewProject() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ProjectRow[]>(() => projects.filter((p) => p.status !== "Completed").slice(0, 3));
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [client, setClient] = useState("Saola Outdoor");
  const [brief, setBrief] = useState("");
  const [lead, setLead] = useState<PersonId>("alex");
  const [team, setTeam] = useState<PersonId[]>(["chi", "emi"]);
  const [error, setError] = useState<string>();
  const last = step === projectSteps.length - 1;
  const start = () => { setStep(0); setName(""); setClient("Saola Outdoor"); setBrief(""); setLead("alex"); setTeam(["chi", "emi"]); setError(undefined); setOpen(true); };
  // Enter or the primary button: the next step, or Create on the last one.
  const next = () => {
    if (step === 0 && !name.trim()) { setError("Name the project."); return; }
    if (!last) return setStep(step + 1);
    setRows((list) => [{ id: `new-${list.length}`, name: name.trim(), client, icon: "icon-layout-alt-01-line", theme: "indigo", status: "Planning" }, ...list]);
    setOpen(false);
    toast({ title: "Project created" });
  };
  const toggle = (id: PersonId, on: boolean) => setTeam((list) => on ? [...list, id] : list.filter((x) => x !== id));
  // The lead is on the team anyway; members are everyone else who is ticked.
  const members = team.filter((id) => id !== lead);
  return (
    <Card theme="flat" spacing="md" className="px-dialog-card">
      <Stack gap="md">
        <CardHeader title="Projects" action={<Button level="tertiary" startIcon="icon-plus-line" onClick={start} size="sm">New project</Button>} />
        <CardList label="Projects">
          {rows.map((project) => (
            <Row key={project.id} title={project.name} caption={project.client}
              leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
              trailing={<Badge theme={projectStatusTheme[project.status]} background="subtle">{project.status}</Badge>} />
          ))}
        </CardList>
      </Stack>
      <ModalForm open={open} onOpenChange={setOpen} layout="big" title="New project"
        description="Set up the basics now; tasks, files and budget come after."
        onSubmit={next}
        primaryAction={{ label: last ? "Create project" : "Continue" }}
        secondaryAction={{ label: "Cancel" }}
        tertiaryAction={step > 0 ? { label: "Back", onClick: () => setStep(step - 1) } : undefined}>
        {/* Earlier steps stay reachable from the Stepper; later ones open through Continue. */}
        <Stepper aria-label="New project steps" steps={projectSteps} current={step} onStepClick={(_, index) => { if (index < step) setStep(index); }} />
        {step === 0 ? (
          <Stack gap="md">
            <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="lg">
              <InputField label="Project name" value={name} onValueChange={(value) => { setName(value); setError(undefined); }} error={error} maxLength={60} autoComplete="off" />
              <SelectField label="Client" options={clientOptions} value={client} onValueChange={setClient} />
            </Grid>
            <TextAreaField label="Brief" labelOptional rows={3} value={brief} onValueChange={setBrief} />
          </Stack>
        ) : step === 1 ? (
          <Stack gap="md">
            <SelectField label="Project lead" options={leadIds.map((id) => ({ value: id, label: people[id].name }))} value={lead} onValueChange={(value) => setLead(value as PersonId)} />
            <FormFieldset legend="Members" kind="checkbox" helpText={`${plural(members.length, "person", "people")} selected`}>
              {/* Three columns of names on a desktop dialog; one on a phone, where three would squeeze each name. */}
              <Grid columns={{ mobile: 1, desktop: 3 }} rowGap="sm" columnGap="lg">
                {memberIds.filter((id) => id !== lead).map((id) => (
                  <Checkbox key={id} label={people[id].name} caption={people[id].role} checked={team.includes(id)} onCheckedChange={(on) => toggle(id, on)} />
                ))}
              </Grid>
            </FormFieldset>
          </Stack>
        ) : (
          <DescriptionList divider items={[
            { term: "Project", description: name },
            { term: "Client", description: client },
            { term: "Lead", description: people[lead].name },
            { term: "Members", description: members.map((id) => people[id].name).join(", ") || "Only the lead" },
            { term: "Brief", description: brief.trim() || "Not written yet" },
            { term: "Status", description: <Badge theme={projectStatusTheme.Planning} background="subtle">Planning</Badge> },
          ]} />
        )}
      </ModalForm>
    </Card>
  );
}

// ——— 6. Restore a version: three equal choices, stacked (Direction=Vertical) ——————————————————————————
type Version = { number: number; author: PersonId; at: Date; note?: string };
const contractFile = files.find((file) => file.id === "f3")!;
const contractVersions: Version[] = [
  { number: 4, author: "bao", at: contractFile.updated, note: "Adds the points expiry field" },
  { number: 3, author: "finn", at: daysFromToday(-5, 16, 5), note: "Renames reward tiers" },
  { number: 2, author: "bao", at: daysFromToday(-9, 11, 20) },
  { number: 1, author: "bao", at: daysFromToday(-16, 9, 0) },
];

function RestoreVersion() {
  const { toast } = useToast();
  const [versions, setVersions] = useState(contractVersions);
  const [picked, setPicked] = useState<Version | null>(null);
  const [open, setOpen] = useState(false);
  const current = versions[0];
  const ask = (version: Version) => { setPicked(version); setOpen(true); };
  const restore = () => {
    if (!picked) return;
    setVersions((list) => [{ number: list[0].number + 1, author: "alex", at: TODAY, note: `Restored from version ${picked.number}` }, ...list]);
    setOpen(false);
    toast({ title: `Version ${picked.number} restored` });
  };
  const saveCopy = () => { setOpen(false); toast({ title: "Copy saved" }); };
  return (
    <Card theme="flat" spacing="md" className="px-dialog-card">
      <Stack gap="md">
        <CardHeader title={contractFile.name}>Loyalty app · version history</CardHeader>
        <CardList label="Versions">
          {versions.map((version) => (
            <Row key={version.number} title={version.note ?? `Version ${version.number}`}
              caption={`${version.note ? `Version ${version.number} · ` : ""}${people[version.author].name} · ${formatRelative(version.at)}`}
              leading={<Avatar size="md" {...avatarOf(people[version.author])} />}
              trailing={version === current
                ? <Badge theme="neutral" background="subtle">Current</Badge>
                : <Button level="tertiary" size="md" aria-label={`Restore version ${version.number}`} onClick={() => ask(version)}>Restore</Button>} />
          ))}
        </CardList>
      </Stack>
      <Dialog open={open} onOpenChange={setOpen} icon="icon-clock-line" title={`Restore version ${picked?.number ?? ""}?`}
        description={picked ? `${people[picked.author].name} saved it ${since(picked.at)}. Restoring keeps version ${current.number} in the history; a copy leaves the file as it is.` : undefined}
        actionsDirection="vertical"
        primaryAction={{ label: `Restore version ${picked?.number ?? ""}`, onClick: restore }}
        secondaryAction={{ label: "Save as new file", onClick: saveCopy }}
        tertiaryAction={{ label: "Cancel" }} />
    </Card>
  );
}

// ——— 7. Copy a new token: positive theme, a read-only value shown once —————————————————————————————————
type Token = { id: string; name: string; created: Date; used?: Date };
const makeToken = () => `zen_pat_${Array.from({ length: 28 }, () => "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 55)]).join("")}`;

function TokenOnce() {
  const [tokens, setTokens] = useState<Token[]>([
    { id: "figma", name: "Figma plugin", created: daysFromToday(-16, 11, 0), used: daysFromToday(0, 10, 17) },
    { id: "ci", name: "CI deploy", created: new Date(2026, 7, 2, 15, 30), used: daysFromToday(-1, 18, 2) },
  ]);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [secret, setSecret] = useState("");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Form focuses the field and announces the error when the name is missing.
  const create = () => {
    const label = name.trim();
    if (!label) return setNameError("Name the token so you can tell it apart later.");
    setTokens((list) => [{ id: `t${list.length}`, name: label, created: TODAY }, ...list]);
    setSecret(makeToken());
    setCopied(false);
    setName("");
    setOpen(true);
  };
  const copy = () => { navigator.clipboard?.writeText(secret).catch(() => undefined); setCopied(true); };
  const newest = tokens[0];
  return (
    <Card theme="flat" spacing="md" className="px-dialog-card">
      <Stack gap="md">
        <CardHeader title="Access tokens">Tokens let your tools read and publish the Zen design system.</CardHeader>
        <Form onSubmit={create} gap="md">
          <InputField label="Token name" placeholder="Storybook deploy" autoComplete="off" value={name}
            onValueChange={(value) => { setName(value); setNameError(undefined); }} error={nameError} />
          <FormActions>
            <Button type="submit" level="primary" startIcon="icon-key-line">Create token</Button>
          </FormActions>
        </Form>
        <List aria-label="Access tokens">
          {tokens.map((token) => (
            <ListItem key={token.id} title={token.name}
              caption={`Created ${since(token.created)} · ${token.used ? `last used ${since(token.used)}` : "never used"}`}
              leading={<DockIcon icon="icon-key-line" theme="neutral" background="subtle" />} />
          ))}
        </List>
      </Stack>
      {/* Shown once: no scrim or Escape dismissal, so the token isn't lost by accident. Done is the way out. */}
      <Dialog open={open} onOpenChange={setOpen} theme="positive" dismissible={false} title="Copy your new token"
        description={`“${newest.name}” can read and publish the Zen design system. You won't see this token again.`}
        primaryAction={{ label: "Done" }}>
        {/* Read-only: the value can be selected and copied but not changed. The copy action sits outside the field. */}
        <Stack gap="md" align="start">
          <Box className="px-dialog-fill">
            <InputField label="Token" readOnly value={secret} helpText={copied ? "Copied to the clipboard." : undefined} helpTheme="positive" />
          </Box>
          <Button level="tertiary" startIcon={copied ? "icon-check-line" : "icon-copy-line"} onClick={copy}>Copy token</Button>
        </Stack>
      </Dialog>
    </Card>
  );
}

// ——— 8. Withdraw on a phone: the same negative Dialog, stacked for the thumb ————————————————————————————

function PhoneWithdraw() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  // One scroller per screen: the large title folds and the bar shows its rule as the content runs under it.
  const screenRef = useRef<HTMLDivElement>(null);
  const yearId = useId();
  const [requests, setRequests] = useState(myLeave);
  const [openId, setOpenId] = useState<string | null>("l1");
  const [confirming, setConfirming] = useState(false);
  const request = requests.find((item) => item.id === openId);
  const setStatus = (id: string, status: LeaveStatus) => setRequests((list) => list.map((item) => item.id === id ? { ...item, status } : item));
  const upcoming = (item: Leave) => item.from > TODAY;
  // The footer button changes after an action, so focus moves to the new one instead of falling to the page.
  const focusFooter = () => focusSoon(() => screenRef.current?.closest(".platform-phone")?.querySelector<HTMLElement>(".platform-phone__footer button"));
  const withdraw = () => {
    if (!request) return;
    setStatus(request.id, "Cancelled");
    setConfirming(false);
    toast({ title: "Request withdrawn" });
    focusFooter();
  };
  const requestAgain = () => {
    if (!request) return;
    setStatus(request.id, "Pending");
    toast({ title: "Request sent" });
    focusFooter();
  };

  if (!request) {
    const years = [...new Set(requests.map((item) => item.from.getFullYear()))];
    return (
      // The requests are grouped by year: a grouped list, so the screen is Surface-Alt with the Alt bar and each year a white
      // ListBox under its kicker. Each row opens its request and has no side padding of its own: the ListBox pads it 20px on a
      // phone, so the hover (12px outside the row) sits 8px from every edge, concentric with its 2XLarge corners (24px = the
      // fill's Large 16px + 8px), and the kicker lines up with the row content (lg, 20px).
      <PlatformPhone key="root" label="Time off" canvas="alt" headerOverlay screenRef={screenRef}
        header={<TopNavigation type="alt" title="Time off" largeTitle="Time off" scrollRef={screenRef} />}>
        {screen.anchor}
        <Stack gap="lg" padding="lg">
          {years.map((year) => (
            <Stack as="section" key={year} gap="xs" aria-labelledby={`${yearId}-${year}`}>
              <Box paddingX="lg"><Heading id={`${yearId}-${year}`} level={2} textStyle="Body/Small/Bold" tone="light">{String(year)}</Heading></Box>
              <ListBox>
                <List aria-labelledby={`${yearId}-${year}`}>
                  {/* The caption is the dates only, so it stays on one line beside the status Badge inside the block; the
                      request's length is on its detail screen. */}
                  {requests.filter((item) => item.from.getFullYear() === year).map((item) => (
                    <ListItem key={item.id} data-leave={item.id} title={item.kind} caption={leaveDays(item)}
                      leading={<DockIcon icon={leaveIcon[item.kind]} theme="neutral" background="subtle" />}
                      trailing={<Badge theme={leaveStatusTheme[item.status]} background="subtle">{item.status}</Badge>}
                      onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(item.id))} />
                  ))}
                </List>
              </ListBox>
            </Stack>
          ))}
        </Stack>
      </PlatformPhone>
    );
  }
  const canWithdraw = upcoming(request) && request.status !== "Cancelled";
  const balance = leaveBalance[request.kind];
  return (
    <PlatformPhone key={request.id} label="Leave request" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact-alt" title={request.kind} scrollRef={screenRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[data-leave="${request.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }} />}
      footer={upcoming(request) ? (
        <ActionBar position="static" primaryAction={canWithdraw
          ? { label: "Withdraw request", level: "danger-subtle", onClick: () => setConfirming(true) }
          : { label: "Request again", onClick: requestAgain }} />
      ) : undefined}>
      {screen.anchor}
      <Stack padding="lg" gap="md">
        <Stack direction="row" align="center" justify="between" gap="md">
          <Heading level={2} textStyle="Heading/Subheading">{leaveDates(request)}</Heading>
          <Badge theme={leaveStatusTheme[request.status]} background="subtle">{request.status}</Badge>
        </Stack>
        <DescriptionList divider items={[
          { term: "Length", description: plural(request.days, "working day") },
          { term: "Approver", description: people.minhAnh.name },
          // This year's balance; a withdrawn (Cancelled) request gives its days back.
          ...(thisYear(request) && balance !== null ? [{ term: "Days left", description: plural(balance + (request.status === "Cancelled" ? request.days : 0), "day") }] : []),
          ...(request.note ? [{ term: "Note", description: request.note }] : []),
        ]} />
      </Stack>
      {/* Inside a PlatformPhone the Dialog opens in the device frame: its scrim covers this screen only. */}
      <Dialog open={confirming} onOpenChange={setConfirming} theme="negative" title="Withdraw leave request?"
        description={`Your leave for ${leaveDates(request)} is cancelled and ${people.minhAnh.name} is told. Taking it later needs a new approval.`}
        actionsDirection="vertical"
        primaryAction={{ label: "Withdraw request", level: "danger", onClick: withdraw }}
        secondaryAction={{ label: "Keep request", autoFocus: true }} />
    </PlatformPhone>
  );
}

// ——— Examples ———————————————————————————————————————————————————————————————————————————————————————
export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Delete a project",
    description: "Deleting a project can't be undone, so the negative Dialog states what goes with it and keeps Delete project disabled until the name is typed; Enter in the field then confirms. Focus starts in the field; Cancel and Escape leave without deleting.",
    code: `const [typed, setTyped] = useState("");
const matches = typed.trim() === target.name;

<IconButton appearance="flat" size="md" icon="icon-trash-line" aria-label={\`Delete \${project.name}\`} onClick={() => ask(project)} />

<Dialog open={open} onOpenChange={setOpen} theme="negative" title="Delete this project?"
  description={\`\${target.name}, its \${plural(target.files, "file")} and every comment are deleted for everyone. This can't be undone.\`}
  primaryAction={{ label: "Delete project", level: "danger", disabled: !matches, onClick: remove }}
  secondaryAction={{ label: "Cancel" }}>
  {/* Enter confirms once the name matches. */}
  <Form onSubmit={() => (matches ? remove() : setMismatch(true))}>
    <InputField label="Project name" helpText={\`Type “\${target.name}” to confirm.\`} value={typed}
      onValueChange={(value) => { setTyped(value); setMismatch(false); }}
      error={mismatch ? \`Type “\${target.name}” exactly as shown.\` : undefined} />
  </Form>
</Dialog>`,
    render: () => <DeleteProject />,
  },
  {
    title: "Discard changes",
    description: "Cancel with edits asks before throwing them away; with nothing changed it just closes. Keep editing has the focus, and Discard changes uses Danger because the text is lost.",
    code: `// Ask only when something changed.
const cancel = () => (draft !== saved ? setConfirming(true) : close());

<Form onSubmit={save} gap="md">
  <TextAreaField label="Description" rows={4} value={draft} onValueChange={setDraft} />
  <FormActions>
    <Button level="tertiary" onClick={cancel}>Cancel</Button>
    <Button level="primary" type="submit">Save description</Button>
  </FormActions>
</Form>

<Dialog open={confirming} onOpenChange={setConfirming} theme="warning" title="Discard unsaved changes?"
  description="Your edits to the PHIN-214 description will be lost."
  primaryAction={{ label: "Discard changes", level: "danger", onClick: discard }}
  secondaryAction={{ label: "Keep editing", autoFocus: true }} />`,
    render: () => <DiscardChanges />,
  },
  {
    title: "Invite by email",
    description: "ModalForm Basic for a short form. onSubmit makes Enter and Send invite submit; the email is checked first and the error stays in the form. A sent invite joins the list as Pending.",
    code: `<ModalForm open={open} onOpenChange={setOpen} title="Invite to Loyalty app"
  description="They get an email with a link to join the project."
  onSubmit={send} primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
  <InputField label="Email" type="email" placeholder="name@phinco.vn" value={email}
    onValueChange={(value) => { setEmail(value); setError(undefined); }} error={error} />
  <SelectField label="Role" options={roleOptions} value={role} onValueChange={setRole} helpText={roleHelp[role]} />
</ModalForm>`,
    render: () => <InviteByEmail />,
  },
  {
    title: "New project in steps",
    description: "Layout Big for a longer flow: a Stepper leads the form, Continue moves on, and Back appears as the tertiary action from step 2. Create project adds the project as Planning.",
    code: `<ModalForm open={open} onOpenChange={setOpen} layout="big" title="New project"
  onSubmit={next}
  primaryAction={{ label: last ? "Create project" : "Continue" }}
  secondaryAction={{ label: "Cancel" }}
  tertiaryAction={step > 0 ? { label: "Back", onClick: () => setStep(step - 1) } : undefined}>
  <Stepper aria-label="New project steps" steps={steps} current={step}
    onStepClick={(_, index) => { if (index < step) setStep(index); }} />
  {step === 0 ? <Details /> : step === 1 ? <Team /> : <Review />}
</ModalForm>`,
    render: () => <NewProject />,
  },
  {
    title: "Request time off",
    description: "Layout 1-3 puts a 240px summary beside the form: the balance of the chosen type updates as the dates change. Three leave types are a radio group, not a select, and focus starts on the chosen one. Send request shows the wait itself, and the request joins the list as Pending.",
    code: `<ModalForm open={open} onOpenChange={setOpen} layout="1-3" title="Request time off"
  description="Minh Anh Vo in People Ops approves your requests."
  side={<DescriptionList layout="stacked" items={[
    { term: kind, description: \`\${plural(balance, "day")} left\` },
    { term: "This request", description: days ? plural(days, "day") : "No dates yet" },
    { term: "Left after", description: plural(balance - days, "day"), emphasis: true },
  ]} />}
  onSubmit={submit}
  primaryAction={{ label: sending ? "Sending…" : "Send request", disabled: sending }}
  secondaryAction={{ label: "Cancel", disabled: sending }}>
  <FormFieldset kind="radio" legend="Type" direction="row">
    {["Annual leave", "Sick leave", "Unpaid leave"].map((option) => (
      <RadioButton key={option} name={typeName} value={option} label={option}
        checked={kind === option} onCheckedChange={(checked) => { if (checked) setKind(option); }} />
    ))}
  </FormFieldset>
  <DateField label="First day" today={TODAY} value={from} onValueChange={setFrom} error={errors.from} />
  <DateField label="Last day" today={TODAY} value={to} onValueChange={setTo} error={errors.to} />
  <TextAreaField label="Note" labelOptional rows={3} value={note} onValueChange={setNote} helpText="Only Minh Anh Vo sees it." />
</ModalForm>`,
    render: () => <RequestTimeOff />,
  },
  {
    title: "Withdraw on a phone",
    description: "Inside the phone the Dialog covers that screen only, and its actions stack full width within thumb reach, Primary first. Keep request has the focus, a withdrawn request turns Cancelled and offers Request again, and Back returns to the row it came from.",
    code: `const screenRef = useRef<HTMLDivElement>(null);

// The Time off root groups the requests by year: a grouped list (PlatformPhone canvas="alt", TopNavigation type="alt"),
// each year a white <ListBox> around its List of rows that open a request, under
// a kicker in <Box paddingX="lg">.
<PlatformPhone key={request.id} headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact-alt" title="Annual leave" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToList }} />}
  footer={<ActionBar position="static"
    primaryAction={{ label: "Withdraw request", level: "danger-subtle", onClick: () => setConfirming(true) }} />}>
  <DescriptionList divider items={details} />

  {/* Inside a device frame the Dialog opens in that frame. */}
  <Dialog open={confirming} onOpenChange={setConfirming} theme="negative" title="Withdraw leave request?"
    description="Your leave for Oct 12 – Oct 14, 2026 is cancelled and Minh Anh Vo is told. Taking it later needs a new approval."
    actionsDirection="vertical"
    primaryAction={{ label: "Withdraw request", level: "danger", onClick: withdraw }}
    secondaryAction={{ label: "Keep request", autoFocus: true }} />
</PlatformPhone>`,
    render: () => <PhoneWithdraw />,
  },
  {
    title: "Restore a version",
    description: "Two outcomes of equal weight with longer labels stack full width (actionsDirection vertical): restore the version, or save it as a new file. Cancel sits last.",
    code: `<Dialog open={open} onOpenChange={setOpen} icon="icon-clock-line" title="Restore version 3?"
  description="Finn Walsh saved it Friday at 4:05 pm. Restoring keeps version 4 in the history; a copy leaves the file as it is."
  actionsDirection="vertical"
  primaryAction={{ label: "Restore version 3", onClick: restore }}
  secondaryAction={{ label: "Save as new file", onClick: saveCopy }}
  tertiaryAction={{ label: "Cancel" }} />`,
    render: () => <RestoreVersion />,
  },
  {
    title: "Show a token once",
    description: "A positive Dialog blocks only when there is something to keep: a token shown once, in a read-only field with a Copy token button. dismissible={false} stops a stray click or Escape from losing it; Done closes.",
    code: `<Form onSubmit={create} gap="md">
  <InputField label="Token name" value={name} onValueChange={setName} error={nameError} />
  <FormActions><Button type="submit" level="primary" startIcon="icon-key-line">Create token</Button></FormActions>
</Form>

<Dialog open={open} onOpenChange={setOpen} theme="positive" dismissible={false} title="Copy your new token"
  description="“Storybook deploy” can read and publish the Zen design system. You won't see this token again."
  primaryAction={{ label: "Done" }}>
  <InputField label="Token" readOnly value={token} helpText={copied ? "Copied to the clipboard." : undefined} helpTheme="positive" />
  <Button level="tertiary" startIcon={copied ? "icon-check-line" : "icon-copy-line"} onClick={copy}>Copy token</Button>
</Dialog>`,
    render: () => <TokenOnce />,
  },
]);
