import { useId, useState, type ReactNode } from "react";
import {
  Badge, Button, Card, DateField, DescriptionList, DockIcon, FormFieldset, Grid, Heading, List, ListItem, ModalForm, RadioButton, Stack, Text, TextAreaField,
  plural, useToast, useZen, type IconName,
} from "@zen-ds/react";
import {
  TODAY, formatDate, formatRange, leaveBalance, leaveHistory, leaveRequests, leaveStatusTheme, people, type LeaveKind, type LeaveRequest,
} from "../../data";

type Leave = Pick<LeaveRequest, "id" | "kind" | "from" | "to" | "days" | "status" | "note">;
const leaveKinds: LeaveKind[] = ["Annual leave", "Sick leave", "Unpaid leave"];
const leaveIcon: Record<LeaveKind, IconName> = { "Annual leave": "icon-plane-line", "Sick leave": "icon-thermometer-01-line", "Unpaid leave": "icon-calendar-line" };
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
/** Alex's time off this year, newest first: his request in the studio's leave data (Oct 12 – Oct 14), then his history. */
const myLeave: Leave[] = [
  ...leaveRequests.filter((request) => request.person === "alex"),
  ...leaveHistory.filter((item) => item.from.getFullYear() === TODAY.getFullYear()),
];
const leaveDates = (item: Pick<Leave, "from" | "to">) => item.from.getTime() === item.to.getTime() ? formatDate(item.from) : formatRange(item.from, item.to);

/** A row with a status Badge at its end. ListItem titles stay on one line, so on a phone the Badge moves under the
 *  caption and the title wraps instead of being cut (the Contents slot). */
function Row({ title, caption, leading, trailing }: { title: string; caption: string; leading: ReactNode; trailing: ReactNode }) {
  const narrow = useZen()?.breakpoint === "mobile";
  if (!narrow) return <ListItem title={title} caption={caption} leading={leading} trailing={trailing} />;
  return (
    <ListItem title={title} leading={leading}>
      <Stack gap="3xs" align="start">
        <Text as="span" textStyle="Body/Base/Bold">{title}</Text>
        <Text as="span" textStyle="Body/Small/Regular" tone="light">{caption}</Text>
        {trailing}
      </Stack>
    </ListItem>
  );
}

/** Your time off this year; Request time off opens a ModalForm with the balance beside the form (layout 1-3). */
export default function RequestTimeOff() {
  const { toast } = useToast();
  const typeName = useId();
  const [requests, setRequests] = useState(myLeave);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<LeaveKind>("Annual leave");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ from?: string; to?: string }>({});
  const [sending, setSending] = useState(false);
  const first = parseDay(from), last = parseDay(to);
  const days = first && last && last >= first ? workingDays(first, last) : 0;
  // Days left of the chosen type; unpaid leave has no balance.
  const balance = leaveBalance[kind]?.left ?? null;
  const approver = people.minhAnh;
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
    setTimeout(() => {
      setSending(false);
      setRequests((list) => [{ id: `r${list.length}`, kind, from: first, to: last, days, status: "Pending", note: note.trim() || undefined }, ...list]);
      setOpen(false);
      toast({ title: "Request sent" });
    }, 900);
  };
  return (
    <Card theme="default" spacing="md" width="fill">
      <Stack gap="md">
        <Stack direction="row" align="start" justify="between" gap="md" wrap>
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">Your time off</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">{`${plural(leaveBalance["Annual leave"]?.left ?? 0, "day")} of annual leave left in ${TODAY.getFullYear()}`}</Text>
          </Stack>
          <Button level="tertiary" startIcon="icon-plus-line" onClick={start} size="sm">Request time off</Button>
        </Stack>
        <List aria-label="Your time off">
          {requests.map((item) => (
            <Row key={item.id} title={item.kind} caption={`${leaveDates(item)} · ${plural(item.days, "day")}`}
              leading={<DockIcon icon={leaveIcon[item.kind]} theme="neutral" background="subtle" />}
              trailing={<Badge theme={leaveStatusTheme[item.status]} background="subtle">{item.status}</Badge>} />
          ))}
        </List>
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
