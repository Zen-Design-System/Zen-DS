/**
 * Template: HR · Home. The HR workspace's landing page on the icon rail (HrShell module="home"):
 * - Zen AI greets Alex. Its suggestions start real tasks: a leave request form, short answers from the workspace data
 *   and a jump to Tasks. + attaches a file from the device to the next prompt; the microphone fills the prompt.
 * - Today: the requests waiting for Alex (approve or decline in place, with Undo; a row opens the request in a Side
 *   Panel), who's out today, this week or next week, and the next public holiday on Alex's calendar.
 * - Studio at a glance: four KPI tiles; each chevron opens its breakdown in a Side Panel.
 * - Your apps: Time off, Expenses and Workbench, each with where Alex stands.
 *
 * Copy it with ./HrShell, ./data and ./assets into your app and replace the sample data. Render it inside your app's
 * <ZenProvider>. Uses only @zen/design-system components, no custom CSS.
 */
import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AiChatBlock,
  AiChatBubble,
  AiChatField,
  AiChatThread,
  Avatar,
  Badge,
  BadgeCounter,
  Box,
  Card,
  Chip,
  Container,
  DateField,
  DescriptionList,
  DockIcon,
  EmptyState,
  FileIcon,
  FormFieldset,
  Grid,
  Heading,
  Icon,
  IconButton,
  List, ListBox,
  ListItem,
  MetricCard,
  ModalForm,
  RadioButton,
  Segmented,
  SidePanel,
  Stack,
  Tag,
  Text,
  TextAreaField,
  fileIconFormatOf,
  plural,
  useFormState,
  useToast,
  useZen,
  type AiChatSuggestion,
  type DockIconTheme,
  type IconName,
  type MetricTrendDirection,
} from "@zen/design-system";
import { HrRouterContext, HrShell, hrModules, type HrModule, type HrNavigate } from "./HrShell";
import {
  assistantAnswer,
  avatarOf,
  claimStatusTheme,
  currentUser,
  daysFromToday,
  expenseCategories,
  expenseClaims,
  formatDate,
  formatDays,
  formatMoney,
  formatRange,
  formatRelative,
  leaveBalances,
  leaveDays,
  leaveKindList,
  leaveKinds,
  leaveRequests,
  leaveStatusTheme,
  monthlySpend,
  nextHoliday,
  now,
  people,
  peopleOff,
  tasks,
  teamList,
  teams,
  toDate,
  toIsoDay,
  today,
  workspace,
  type ExpenseCategoryId,
  type ExpenseClaim,
  type LeaveKindId,
  type LeaveRequest,
  type MonthlySpend,
} from "./data";

/* ── Data: the signed-in person, the calendar around today and the studio figures ─────────────────────────────── */
const me = currentUser;
const myManager = people[me.manager ?? me.id];
/** Headcount when Q2 closed: the Headcount tile compares against it. */
const lastQuarterHeadcount = 46;

const shiftDay = (day: string, by: number) => { const date = toDate(day); date.setDate(date.getDate() + by); return toIsoDay(date); };
const monday = shiftDay(today, -((toDate(today).getDay() + 6) % 7));
type Period = "today" | "week" | "next";
/** Who's out: today, the rest of this week, and next week (Monday to Sunday). */
const periods: Record<Period, { label: string; from: string; to: string }> = {
  today: { label: "Today", from: today, to: today },
  week: { label: "This week", from: today, to: shiftDay(monday, 6) },
  next: { label: "Next week", from: shiftDay(monday, 7), to: shiftDay(monday, 13) },
};
const outDuring = (requests: LeaveRequest[], { from, to }: { from: string; to: string }) =>
  requests.filter((request) => request.status === "Approved" && request.start <= to && request.end >= from).sort((a, b) => a.start.localeCompare(b.start));

const monthTotal = (month: MonthlySpend) => Object.values(month.spend).reduce((sum, amount) => sum + amount, 0);
const [lastMonth, thisMonth] = monthlySpend.slice(-2);
const spendChange = Math.round((monthTotal(thisMonth) / monthTotal(lastMonth) - 1) * 100);

const myOpenTasks = tasks.filter((task) => task.assignees.includes(me.id) && task.status !== "Done").sort((a, b) => a.due.localeCompare(b.due));
const holiday = nextHoliday(me.country);
/** A ladder timestamp inside a sentence: "yesterday at 5:40 pm", while "Friday at 2:15 pm" keeps its capital. */
const midSentence = (text: string) => (/^(Just now|Yesterday|Tomorrow)/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text);
const inDays = (day: string) => { const gap = daysFromToday(day); return gap === 0 ? "today" : gap === 1 ? "tomorrow" : `in ${plural(gap, "day")}`; };
const greeting = (() => { const hour = toDate(now).getHours(); return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"; })();

/** Rows drop the year inside this year: "Oct 12 – Oct 14"; other years keep it ("Dec 28, 2026 – Jan 4, 2027"). */
const rowRange = (start: string, end: string) => {
  const year = today.slice(0, 4);
  if (!start.startsWith(year) || !end.startsWith(year)) return formatRange(start, end);
  return start === end ? formatDate(start, { year: false }) : `${formatDate(start, { year: false })} – ${formatDate(end, { year: false })}`;
};
/**
 * A leave row's caption: "🏝️ Annual leave · Oct 12 – Oct 14", with the working days when there is room. Colour emoji
 * take the alpha of `color`, and the caption is Content/Neutral/Base (alpha), so the emoji gets its own opaque span.
 */
const leaveCaption = (request: LeaveRequest, withDays = false) => <>
  <Text as="span" textStyle="Body/Small/Regular" tone="strongest">{leaveKinds[request.kind].emoji}</Text>
  {` ${leaveKinds[request.kind].name} · ${rowRange(request.start, request.end)}${withDays ? ` · ${formatDays(request.days)}` : ""}`}
</>;
/** People lead their rows with a Medium Subtle Avatar, like the Inbox (initials in their colour, or a photo). */
const personAvatar = (id: LeaveRequest["person"]) => <Avatar size="md" background="subtle" {...avatarOf(people[id])} alt="" />;

/* ── Form helpers: DateField speaks MM/DD/YYYY, the data ISO days ─────────────────────────────────────────────── */
type LeaveValues = { kind: string; start: string; end: string; note: string };
const blankLeave: LeaveValues = { kind: "annual", start: "", end: "", note: "" };
const fromFieldDate = (text: string) => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  return date.getMonth() === Number(match[1]) - 1 ? toIsoDay(date) : null;
};

type Message = { id: number; side: "you" | "ai"; text: string; /** The file sent with a prompt. */ file?: string };
type Panel = { type: "leave" | "claim" | "metric"; id: string };
type Kpi = { id: string; label: string; value: string; trend: { direction: MetricTrendDirection; label: string }; icon: IconName; theme: DockIconTheme };

export function HrHomeTemplate() {
  const { toast, dismiss } = useToast();
  const phone = useZen()?.breakpoint === "mobile";
  const router = useContext(HrRouterContext);
  const [requests, setRequests] = useState(leaveRequests);
  const [claims, setClaims] = useState(expenseClaims);
  const [period, setPeriod] = useState<Period>("today");
  const [panel, setPanel] = useState<Panel | null>(null);
  const [requesting, setRequesting] = useState(false);

  /* ── Navigation: App Shell › HR workspace routes it; on its own the page names what isn't in this demo ── */
  const navigate: HrNavigate = (target) => {
    if (target.module === "home") return;
    const { title, sections } = hrModules[target.module];
    const pages = sections.flatMap((section) => section.items.flatMap((item) => [item, ...(item.children ?? [])]));
    toast({ title: `${pages.find((item) => item.id === target.page)?.label ?? title} isn't part of this demo` });
  };
  const go = (target: { module: HrModule; page?: string }) => { setPanel(null); (router ?? navigate)(target); };

  /* ── Everything below follows the local state, so decisions and new requests show up at once ── */
  const leaveToReview = requests.filter((request) => request.approver === me.id && request.status === "Pending");
  const claimsToReview = claims.filter((claim) => claim.approver === me.id && claim.status === "Submitted");
  const waiting = leaveToReview.length + claimsToReview.length;
  const openLeave = requests.filter((request) => request.status === "Pending");
  const openClaims = claims.filter((claim) => claim.status === "Submitted");
  const offToday = peopleOff(today, requests);
  const offYesterday = peopleOff(shiftDay(today, -1), requests);
  const out = outDuring(requests, periods[period]);
  const balances = leaveBalances(requests);
  const annual = balances.find((balance) => balance.kind === "annual")!;
  const myPendingLeave = requests.filter((request) => request.person === me.id && request.status === "Pending");
  const mySubmitted = claims.filter((claim) => claim.person === me.id && claim.status === "Submitted").length;
  const myDrafts = claims.filter((claim) => claim.person === me.id && claim.status === "Draft").length;

  /* ── Approvals: act first, then offer Undo. A decided request leaves the list: its open panel closes and focus moves
     to the row that takes its place (or the card's empty state) ── */
  const waitingRef = useRef<HTMLElement>(null);
  const waitingIds = [...leaveToReview, ...claimsToReview].map((item) => item.id);
  const refocus = (id: string) => {
    const index = waitingIds.indexOf(id);
    requestAnimationFrame(() => {
      const rows = waitingRef.current?.querySelectorAll<HTMLElement>("li > button");
      (rows?.length ? rows[Math.min(index, rows.length - 1)] : waitingRef.current?.querySelector<HTMLElement>("button"))?.focus();
    });
  };
  const decideLeave = (request: LeaveRequest, status: "Approved" | "Declined") => {
    setRequests((list) => list.map((item) => (item.id === request.id ? { ...item, status, decided: now } : item)));
    setPanel((open) => (open?.id === request.id ? null : open));
    refocus(request.id);
    const toastId = toast({ title: `Leave request ${status.toLowerCase()}`, children: `${people[request.person].name} · ${formatRange(request.start, request.end)}`,
      action: { label: "Undo", onClick: () => { setRequests((list) => list.map((item) => (item.id === request.id ? request : item))); dismiss(toastId); } } });
  };
  const decideClaim = (claim: ExpenseClaim, status: "Approved" | "Rejected") => {
    setClaims((list) => list.map((item) => (item.id === claim.id ? { ...item, status, decided: now } : item)));
    setPanel((open) => (open?.id === claim.id ? null : open));
    refocus(claim.id);
    const toastId = toast({ title: `Expense claim ${status.toLowerCase()}`, children: `${people[claim.person].name} · ${claim.title} · ${formatMoney(claim.amount)}`,
      action: { label: "Undo", onClick: () => { setClaims((list) => list.map((item) => (item.id === claim.id ? claim : item))); dismiss(toastId); } } });
  };

  /* ── Zen AI: a prompt shows the thinking dots, then a short answer from the page's data; Stop cancels it ── */
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // + picks a file on the device; it goes out with the next prompt.
  const [file, setFile] = useState<string | null>(null);
  const attach = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,application/pdf";
    input.onchange = () => { const picked = input.files?.[0]; if (picked) setFile(picked.name); };
    input.click();
  };
  // The microphone fills the prompt with what it heard (a set sentence in this sample): the field remounts with the
  // text and the caret waits at its end.
  const fieldRef = useRef<HTMLElement>(null);
  const [dictation, setDictation] = useState({ key: 0, text: "" });
  useEffect(() => {
    const prompt = dictation.key ? fieldRef.current?.querySelector("textarea") : null;
    prompt?.focus();
    prompt?.setSelectionRange(prompt.value.length, prompt.value.length);
  }, [dictation.key]);
  const names = (list: LeaveRequest[]) => list.map((request) => people[request.person].name).join(" and ");
  const answer = (prompt: string, attached?: string) => {
    if (attached) return `I have ${attached}. I can file it as an expense claim, or add it to a sick leave request as a doctor's note.`;
    const waitingLine = waiting ? `${plural(waiting, "request")} ${waiting === 1 ? "is" : "are"} waiting for your approval` : "nothing is waiting for your approval";
    if (/approv|review|wait/i.test(prompt)) {
      if (!waiting) return "Nothing is waiting for your approval.";
      return `${plural(leaveToReview.length, "leave request")} and ${plural(claimsToReview.length, "expense claim")} are waiting for you, the oldest from ${people[[...leaveToReview, ...claimsToReview].sort((a, b) => (a.submitted ?? "").localeCompare(b.submitted ?? ""))[0].person].name}.`;
    }
    if (/balance|leave|time off|holiday/i.test(prompt)) {
      const pending = annual.pending ? `, and ${formatDays(annual.pending)} waiting for approval` : "";
      return `You have ${formatDays(annual.available)} of annual leave left this year${pending}.${holiday ? ` The next public holiday is ${holiday.name}, ${formatDate(holiday.start, { weekday: true })}.` : ""}`;
    }
    if (/summar|today|my day/i.test(prompt)) {
      const off = offToday.length ? `${names(offToday)} ${offToday.length === 1 ? "is" : "are"} off today` : "Everyone is in today";
      const due = myOpenTasks.find((task) => daysFromToday(task.due) === 0);
      return `${off}, and ${waitingLine}.${due ? ` ${due.id}, “${due.title}”, is due today.` : ""}`;
    }
    return assistantAnswer(prompt);
  };
  const ask = (text: string) => {
    const attached = file ?? undefined;
    setFile(null);
    setMessages((list) => [...list, { id: list.length, side: "you", text, file: attached }]);
    setThinking(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setMessages((list) => [...list, { id: list.length, side: "ai", text: answer(text, attached) }]);
      setThinking(false);
    }, 900);
  };
  const stop = () => { window.clearTimeout(timer.current); setThinking(false); };

  /* ── Request time off: a validated form; the request joins the page's data and goes to Alex's manager ── */
  const leaveForm = useFormState({
    initialValues: blankLeave,
    validate: (values) => {
      const start = fromFieldDate(values.start);
      const end = fromFieldDate(values.end);
      const days = start && end && end >= start ? leaveDays(me.id, start, end) : 0;
      const balance = balances.find((item) => item.kind === values.kind);
      const left = balance ? balance.available - balance.pending : 0;
      return {
        start: !start ? "Enter the first day, like 10/26/2026" : start < today ? "Pick today or a later day" : undefined,
        end: !end ? "Enter the last day, like 10/28/2026" : start && end < start ? "The last day can't be before the first day"
          : start && !days ? "Pick at least one working day" : days > left ? `Only ${formatDays(Math.max(left, 0))} left after your pending requests` : undefined,
      };
    },
    onSubmit: (values, { reset }) => {
      const start = fromFieldDate(values.start)!;
      const end = fromFieldDate(values.end)!;
      const kind = leaveKinds[values.kind as LeaveKindId];
      const request: LeaveRequest = { id: `leave-${Date.now()}`, person: me.id, kind: kind.id, start, end, days: leaveDays(me.id, start, end), status: "Pending", submitted: now, approver: myManager.id, note: values.note.trim() || undefined };
      setRequests((list) => [request, ...list]);
      setRequesting(false);
      reset();
      const toastId = toast({ title: "Leave request sent", children: `${formatDays(request.days)} of ${kind.name.toLowerCase()} · ${formatRange(start, end)}`,
        action: { label: "View", onClick: () => { dismiss(toastId); go({ module: "time-off", page: "my-leaves" }); } } });
    },
  });
  const pickedStart = fromFieldDate(leaveForm.values.start);
  const pickedEnd = fromFieldDate(leaveForm.values.end);
  const pickedDays = pickedStart && pickedEnd && pickedEnd >= pickedStart ? leaveDays(me.id, pickedStart, pickedEnd) : 0;
  const startRequest = () => { leaveForm.reset(); setRequesting(true); };

  const suggestions: AiChatSuggestion[] = [
    { label: "Request time off", icon: "icon-calendar-plus-line", onClick: startRequest },
    { label: "Summarise my day", icon: "icon-stars-01-line", onClick: () => ask("Summarise my day") },
    { label: "Check my leave balance", icon: "icon-calendar-check-line", onClick: () => ask("How much leave do I have left?") },
    { label: "Open my tasks", icon: "icon-check-square-broken-line", onClick: () => go({ module: "workbench", page: "tasks" }) },
  ];

  /* ── Studio at a glance: one comparison per tile; the chevron opens the breakdown ── */
  const offChange = offToday.length - offYesterday.length;
  const kpis: Kpi[] = [
    { id: "headcount", label: "Headcount", value: `${workspace.headcount}`, trend: { direction: "positive", label: `+${workspace.headcount - lastQuarterHeadcount} vs. last quarter` }, icon: "icon-users-solid", theme: "blue" },
    { id: "on-leave", label: "On leave today", value: `${offToday.length}`, trend: { direction: "normal", label: offChange ? `${offChange > 0 ? "+" : "−"}${Math.abs(offChange)} vs. yesterday` : "Same as yesterday" }, icon: "icon-calendar-heart-solid", theme: "violet" },
    { id: "open", label: "Open requests", value: `${openLeave.length + openClaims.length}`, trend: { direction: "normal", label: waiting ? `${waiting} waiting for you` : "None waiting for you" }, icon: "icon-hourglass-solid", theme: "yellow" },
    { id: "spend", label: "Spend this month", value: formatMoney(monthTotal(thisMonth), { compact: true }), trend: { direction: "normal", label: `${spendChange >= 0 ? "+" : "−"}${Math.abs(spendChange)}% vs. last month` }, icon: "icon-coin-02-solid", theme: "green" },
  ];
  const kpiTile = (kpi: Kpi) => (
    <MetricCard key={kpi.id} variant="title-highlight" size={phone ? "md" : "xl"} label={kpi.label} value={kpi.value} trend={kpi.trend}
      icon={kpi.icon} iconTheme={kpi.theme} iconSize="md"
      action={<IconButton size="xs" icon="icon-chevron-right-line" aria-label={`${kpi.label} breakdown`} onClick={() => setPanel({ type: "metric", id: kpi.id })} />} />
  );

  /* ── Your apps: where Alex stands in each module ── */
  const apps: Array<{ module: Exclude<HrModule, "home">; caption: string; icon: IconName; theme: DockIconTheme }> = [
    { module: "time-off", icon: "icon-calendar-heart-solid", theme: "violet",
      caption: myPendingLeave.length ? `${formatDays(annual.available)} left · ${plural(myPendingLeave.length, "request")} pending` : `${formatDays(annual.available)} of annual leave left` },
    { module: "expenses", icon: "icon-coin-02-solid", theme: "green",
      caption: [mySubmitted ? `${plural(mySubmitted, "claim")} submitted` : "No claims waiting", myDrafts ? plural(myDrafts, "draft") : ""].filter(Boolean).join(" · ") },
    { module: "workbench", icon: "icon-dataflow-03-solid", theme: "orange",
      caption: `${plural(myOpenTasks.length, "open task")}${myOpenTasks[0] ? ` · ${myOpenTasks[0].id} due ${daysFromToday(myOpenTasks[0].due) === 0 ? "today" : formatDate(myOpenTasks[0].due, { year: false })}` : ""}` },
  ];

  /* ── Rows ── */
  const approvalActions = (name: string, onApprove: () => void, onDecline: () => void, decline: string) => (
    <>
      <IconButton appearance="flat" level="primary" size="md" icon="icon-check-line" aria-label={`Approve ${name}'s request`} onClick={onApprove} />
      <IconButton appearance="flat" level="primary" size="md" icon="icon-x-line" aria-label={`${decline} ${name}'s request`} onClick={onDecline} />
    </>
  );
  // A row that opens the request stays selected while its panel is open.
  const leaveRow = (request: LeaveRequest, trailing?: ReactNode, onClick?: () => void) => (
    <ListItem key={request.id} title={people[request.person].name} caption={leaveCaption(request, Boolean(onClick) && !phone)} leading={personAvatar(request.person)} trailing={trailing}
      onClick={onClick} selected={Boolean(onClick) && panel?.type === "leave" && panel.id === request.id} />
  );

  /* ── The docked Side Panel: a request to decide, or a KPI breakdown ── */
  const openedLeave = panel?.type === "leave" ? requests.find((request) => request.id === panel.id) : undefined;
  const openedClaim = panel?.type === "claim" ? claims.find((claim) => claim.id === panel.id) : undefined;
  const openedKpi = panel?.type === "metric" ? kpis.find((kpi) => kpi.id === panel.id) : undefined;
  const close = (open: boolean) => { if (!open) setPanel(null); };
  const personHeader = (id: LeaveRequest["person"]) => (
    <List aria-label="Requested by">
      <ListItem title={people[id].name} caption={`${people[id].role} · ${teams[people[id].team].name}`} leading={personAvatar(id)} />
    </List>
  );

  let aside: ReactNode;
  if (openedLeave) {
    const kind = leaveKinds[openedLeave.kind];
    const left = leaveBalances(requests, openedLeave.person).find((balance) => balance.kind === openedLeave.kind);
    const pending = openedLeave.status === "Pending";
    aside = (
      <SidePanel type="standard" title="Leave request" description={`Sent ${midSentence(formatRelative(openedLeave.submitted))}`} open onOpenChange={close}
        primaryAction={pending ? { label: "Approve", onClick: () => decideLeave(openedLeave, "Approved") } : undefined}
        secondaryAction={pending ? { label: "Decline", onClick: () => decideLeave(openedLeave, "Declined") } : undefined}>
        <Stack gap="lg">
          {personHeader(openedLeave.person)}
          <DescriptionList divider items={[
            { term: "Status", description: <Badge theme={leaveStatusTheme[openedLeave.status]} background="subtle">{openedLeave.status}</Badge> },
            { term: "Leave type", description: `${kind.emoji} ${kind.name}` },
            { term: "Dates", description: formatRange(openedLeave.start, openedLeave.end) },
            { term: "Working days", description: formatDays(openedLeave.days) },
            ...(left ? [{ term: `${kind.name} left`, description: formatDays(left.available) }] : []),
            ...(openedLeave.note ? [{ term: "Note", description: openedLeave.note }] : []),
          ]} />
        </Stack>
      </SidePanel>
    );
  } else if (openedClaim) {
    const category = expenseCategories[openedClaim.category];
    const submitted = openedClaim.status === "Submitted";
    aside = (
      <SidePanel type="standard" title="Expense claim" description={openedClaim.submitted ? `${openedClaim.id} · Sent ${midSentence(formatRelative(openedClaim.submitted))}` : openedClaim.id} open onOpenChange={close}
        primaryAction={submitted ? { label: "Approve", onClick: () => decideClaim(openedClaim, "Approved") } : undefined}
        secondaryAction={submitted ? { label: "Reject", onClick: () => decideClaim(openedClaim, "Rejected") } : undefined}>
        <Stack gap="lg">
          {personHeader(openedClaim.person)}
          <DescriptionList divider items={[
            { term: "Status", description: <Badge theme={claimStatusTheme[openedClaim.status]} background="subtle">{openedClaim.status}</Badge> },
            { term: "Amount", description: formatMoney(openedClaim.amount), emphasis: true },
            { term: "Description", description: openedClaim.title },
            { term: "Merchant", description: openedClaim.merchant },
            { term: "Category", description: category.name },
            { term: "Date", description: formatDate(openedClaim.spent) },
            { term: "Receipt", description: openedClaim.receipt ?? "Missing" },
            ...(openedClaim.note ? [{ term: "Note", description: openedClaim.note }] : []),
          ]} />
        </Stack>
      </SidePanel>
    );
  } else if (openedKpi) {
    const spendRows = (Object.entries(thisMonth.spend) as Array<[ExpenseCategoryId, number]>).sort((a, b) => b[1] - a[1]);
    const breakdown: Record<string, ReactNode> = {
      headcount: <DescriptionList divider items={[
        ...teamList.map((team) => ({ term: team.name, description: plural(team.headcount, "person", "people") })),
        { term: "Studio", description: plural(workspace.headcount, "person", "people"), emphasis: true },
      ]} />,
      "on-leave": offToday.length
        ? <List aria-label="On leave today">{offToday.map((request) => leaveRow(request))}</List>
        : <EmptyState title="No one is off today" headingLevel={3} illustration={false} icon="icon-calendar-heart-line">Approved leave shows up here.</EmptyState>,
      open: (
        <List aria-label="Open requests">
          {openLeave.map((request) => leaveRow(request, <Badge size="sm" theme={leaveStatusTheme[request.status]} background="subtle">{request.status}</Badge>))}
          {openClaims.map((claim) => (
            <ListItem key={claim.id} title={people[claim.person].name} caption={`${claim.title} · ${formatMoney(claim.amount)}`} leading={personAvatar(claim.person)}
              trailing={<Badge size="sm" theme={claimStatusTheme[claim.status]} background="subtle">{claim.status}</Badge>} />
          ))}
        </List>
      ),
      spend: <DescriptionList divider items={[
        ...spendRows.map(([id, amount]) => ({ term: expenseCategories[id].name, description: formatMoney(amount) })),
        { term: "Total", description: formatMoney(monthTotal(thisMonth)), emphasis: true },
      ]} />,
    };
    aside = (
      <SidePanel type="standard" size="small" title={openedKpi.label} description={`${openedKpi.value} · ${openedKpi.trend.label}`} open onOpenChange={close}
        primaryAction={openedKpi.id === "spend" ? { label: "Open expenses", onClick: () => go({ module: "expenses", page: "overviews" }) } : undefined}>
        {breakdown[openedKpi.id]}
      </SidePanel>
    );
  }

  return (
    <HrShell module="home" onNavigate={navigate} aside={aside}>
      {/* Full width like the other HR pages (backlog batch 6b, user 2026-10-07). */}
      <Container maxWidth="full">
        <Stack gap="xl" paddingY="sm">
          {/* Zen AI: the greeting, a short thread once Alex asks, and the prompt. The greeting is the page's h1 (it is the
              title people see, in Heading/1), so the sections under it are h2 Heading/4. */}
          <AiChatBlock headingLevel={1} greeting={`${greeting}, ${me.name.split(" ")[0]}. How can I help?`} suggestions={suggestions}>
            {messages.length ? (
              <AiChatThread aria-label="Conversation with Zen AI">
                {messages.map((message) => (
                  <AiChatBubble key={message.id} side={message.side}>
                    {/* A prompt sent with a file shows the file above it. */}
                    {message.file ? (
                      <Stack gap="xs" align="end">
                        <Stack direction="row" gap="2xs" align="center">
                          <FileIcon format={fileIconFormatOf(message.file)} />
                          <Text as="span" textStyle="Body/Base/Medium">{message.file}</Text>
                        </Stack>
                        <Text as="span">{message.text}</Text>
                      </Stack>
                    ) : message.text}
                  </AiChatBubble>
                ))}
                {thinking ? <AiChatBubble side="ai" thinking /> : null}
              </AiChatThread>
            ) : null}
            {file ? (
              <Stack direction="row" gap="2xs">
                <Tag leading={<FileIcon format={fileIconFormatOf(file)} />} remove onRemove={() => setFile(null)}>{file}</Tag>
              </Stack>
            ) : null}
            <Box ref={fieldRef}>
              <AiChatField key={dictation.key} defaultValue={dictation.text} fieldStyle="surface" placeholder="Ask Zen AI" busy={thinking} onStop={stop} onSubmit={ask}
                onAttach={attach} onVoice={() => setDictation((current) => ({ key: current.key + 1, text: "What's waiting for my approval?" }))} />
            </Box>
          </AiChatBlock>

          {/* Today: what needs Alex, who's away and the next day off. Tablets and phones stack the columns. */}
          <Stack as="section" gap="md" aria-labelledby="home-today">
            <Stack direction="row" gap="xs" align="baseline" wrap>
              <Heading level={2} id="home-today">Today</Heading>
              <Text as="span" textStyle="Body/Small/Regular" tone="light">{formatDate(today, { weekday: true, year: false })}</Text>
            </Stack>
            <Grid columns={{ mobile: 1, tablet: 1, desktop: "minmax(0, 2fr) minmax(360px, 1fr)" }} gap="md" align="start">
              {/* Rows (grouped under kickers) → a ListBox: the title and count in its Header-Slot. */}
              <ListBox as="section" theme="shadow" aria-labelledby="home-waiting" ref={waitingRef}
                header={<Stack direction="row" gap="xs" align="center">
                  <Heading level={3} id="home-waiting">Waiting for you</Heading>
                  {waiting ? <BadgeCounter value={waiting} /> : null}
                </Stack>}>
                {/* Kicker → rows xs (the rows pad 12px above and below themselves); group → group lg (24). */}
                <Stack gap="lg">
                  {leaveToReview.length ? (
                    <Stack gap="xs">
                      <Heading level={4} textStyle="Body/Small/Bold" tone="light" id="home-waiting-leave">Leave requests</Heading>
                      <List aria-labelledby="home-waiting-leave">
                        {leaveToReview.map((request) => leaveRow(request,
                          approvalActions(people[request.person].name, () => decideLeave(request, "Approved"), () => decideLeave(request, "Declined"), "Decline"),
                          () => setPanel({ type: "leave", id: request.id })))}
                      </List>
                    </Stack>
                  ) : null}
                  {claimsToReview.length ? (
                    <Stack gap="xs">
                      <Heading level={4} textStyle="Body/Small/Bold" tone="light" id="home-waiting-claims">Expense claims</Heading>
                      <List aria-labelledby="home-waiting-claims">
                        {claimsToReview.map((claim) => (
                          <ListItem key={claim.id} title={people[claim.person].name} leading={personAvatar(claim.person)}
                            // Phones keep the caption to two lines: the amount and category (the panel has the rest).
                            caption={phone ? `${formatMoney(claim.amount)} · ${expenseCategories[claim.category].name}` : `${claim.title} · ${formatMoney(claim.amount)}`}
                            trailing={approvalActions(people[claim.person].name, () => decideClaim(claim, "Approved"), () => decideClaim(claim, "Rejected"), "Reject")}
                            onClick={() => setPanel({ type: "claim", id: claim.id })} selected={panel?.type === "claim" && panel.id === claim.id} />
                        ))}
                      </List>
                    </Stack>
                  ) : null}
                </Stack>
                {waiting ? null : (
                  <EmptyState title="No requests to review" headingLevel={4} illustration={false} icon="icon-check-circle-line"
                    secondaryAction={{ label: "Open approvals", onClick: () => go({ module: "time-off", page: "approvals" }) }}>
                    Leave requests and expense claims from your team show up here.
                  </EmptyState>
                )}
              </ListBox>

              <Stack gap="md">
                <ListBox as="section" theme="shadow" aria-labelledby="home-out"
                  header={<>
                    <Heading level={3} id="home-out">Who's out</Heading>
                    {/* A phone can't fit three equal segments, so it gets a single-choice row of Normal chips: Small and
                        2xs apart, so the three periods share one line inside the card (they wrap only on a narrower phone). */}
                    {phone ? (
                      <Stack direction="row" gap="2xs" wrap role="group" aria-label="Period">
                        {(Object.keys(periods) as Period[]).map((id) => (
                          <Chip key={id} variant="normal" size="sm" level="primary" selected={id === period} onClick={() => setPeriod(id)}>{periods[id].label}</Chip>
                        ))}
                      </Stack>
                    ) : (
                      <Segmented aria-label="Period" fullWidth value={period} onValueChange={(value) => setPeriod(value as Period)}
                        options={(Object.keys(periods) as Period[]).map((id) => ({ id, label: periods[id].label }))} />
                    )}
                  </>}>
                  {out.length ? (
                    <List aria-label={`Out ${periods[period].label.toLowerCase()}`}>{out.map((request) => leaveRow(request))}</List>
                  ) : (
                    <EmptyState title={`No one is off ${periods[period].label.toLowerCase()}`} headingLevel={4} illustration={false} icon="icon-calendar-heart-line"
                      secondaryAction={{ label: "Open calendar", onClick: () => go({ module: "time-off", page: "calendar" }) }}>
                      Approved leave shows up here.
                    </EmptyState>
                  )}
                </ListBox>

                {holiday ? (
                  <ListBox as="section" theme="shadow" aria-labelledby="home-holiday"
                    header={<Heading level={3} id="home-holiday">Next public holiday</Heading>}>
                    <List aria-labelledby="home-holiday">
                      <ListItem title={holiday.name} caption={`${formatDate(holiday.start, { weekday: true, year: holiday.start.slice(0, 4) !== today.slice(0, 4) })} · ${inDays(holiday.start)}`}
                        leading={<DockIcon icon="icon-calendar-heart-line" theme="red" background="subtle" size="md" />}
                        trailing={<Icon name="icon-chevron-right-line" />} onClick={() => go({ module: "time-off", page: "public-holiday" })} />
                    </List>
                  </ListBox>
                ) : null}
              </Stack>
            </Grid>
          </Stack>

          {/* Studio at a glance: four tiles in a row, two by two, or stacked; never three and one. */}
          <Stack as="section" gap="md" aria-labelledby="home-studio">
            <Heading level={2} id="home-studio">Studio at a glance</Heading>
            <Grid minColumnWidth={496} gap="md">
              {[kpis.slice(0, 2), kpis.slice(2)].map((pair) => (
                <Grid key={pair[0].id} columns="repeat(auto-fit, minmax(min(100%, 240px), 1fr))" gap="md">{pair.map(kpiTile)}</Grid>
              ))}
            </Grid>
          </Stack>

          {/* Your apps: each card opens its module. */}
          <Stack as="section" gap="md" aria-labelledby="home-apps">
            <Heading level={2} id="home-apps">Your apps</Heading>
            <Grid columns={{ mobile: 1, tablet: 3, desktop: 3 }} gap="md">
              {apps.map((app) => (
                <Card key={app.module} onClick={() => go({ module: app.module })}>
                  <Stack direction="row" gap="md" align="center">
                    <DockIcon icon={app.icon} theme={app.theme} size="md" />
                    <Stack gap="none">
                      <Heading level={3}>{hrModules[app.module].title}</Heading>
                      <Text textStyle="Body/Small/Regular" tone="base">{app.caption}</Text>
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </Grid>
          </Stack>
        </Stack>
      </Container>

      <ModalForm open={requesting} onOpenChange={setRequesting} title="Request time off" description={`${myManager.name} gets it for approval.`}
        onSubmit={leaveForm.handleSubmit} primaryAction={{ label: "Send request" }} secondaryAction={{ label: "Cancel" }}>
        {/* Each type shows what is left, so Alex picks one that covers the days. */}
        <FormFieldset legend="Leave type" kind="radio">
          {leaveKindList.filter((kind) => kind.active).map((kind) => {
            const balance = balances.find((item) => item.kind === kind.id);
            return (
              <RadioButton key={kind.id} label={`${kind.emoji} ${kind.name}`} {...leaveForm.radioField("kind", kind.id)}
                caption={balance ? `${formatDays(balance.available)} left${balance.pending ? ` · ${formatDays(balance.pending)} pending` : ""}` : undefined} />
            );
          })}
        </FormFieldset>
        <Grid columns={{ mobile: 1, desktop: 2 }} gap="md" align="start">
          <DateField label="First day" {...leaveForm.dateField("start")} />
          <DateField label="Last day" helpText={pickedDays ? plural(pickedDays, "working day") : undefined} {...leaveForm.dateField("end")} />
        </Grid>
        <TextAreaField label="Note" labelOptional placeholder="Family trip to Da Lat" {...leaveForm.field("note")} />
      </ModalForm>
    </HrShell>
  );
}
