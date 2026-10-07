import { useId, useRef, useState, type ReactNode } from "react";
import { Avatar } from "../../../components/Avatar";
import { BottomNavigation, type BottomNavigationItem } from "../../../components/BottomNavigation";
import { BottomSheet } from "../../../components/BottomSheet";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { useFormState } from "../../../components/Form";
import type { IconName } from "../../../components/Icon";
import { Image } from "../../../components/Image";
import { InputField, NumberField, SelectField } from "../../../components/Input";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Metric } from "../../../components/MetricWidget";
import { Heading, Text } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { PlatformPhoneMedia, platformMedia } from "../../PlatformMedia";
import { PlatformPhone } from "../../PlatformPhone";
import {
  TODAY, daysFromToday, files, formatBytes, formatDate, formatDay, formatDue, formatMoney, formatRange, formatRelative, formatTime, initials, leaveRequests, me, people,
  projectById, projects, tasks,
  type Person, type PersonId, type ProjectStatus,
} from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./bottom-navigation.css";

export const page: PlatformPage = "bottom-navigation";

/** A person as Avatar props: their photo, or initials on their steady theme. The row title already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);

/** One group of a grouped list on a Surface-Alt screen: a ListBox under the kicker that names it. Rows have no padding of
    their own, so the ListBox's Card-padding-medium (20px on a phone) insets them; the kicker lines up with the row text (lg).
    No border or shadow: white on Surface-Alt already separates it. */
function ListGroup({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Stack as="section" gap="xs" aria-labelledby={id}>
      <Box paddingX="lg"><Heading level={2} id={id} textStyle="Body/Small/Bold" tone="light">{title}</Heading></Box>
      <ListBox>
        <List aria-labelledby={id}>{children}</List>
      </ListBox>
    </Stack>
  );
}
/** Alex's approved annual leave (the shared leave requests). */
const myLeave = leaveRequests.find((request) => request.person === "alex")!;

/* ───────────── 1. Root destinations ───────────── */

const meetings = [
  { id: "m1", title: "Design critique", start: daysFromToday(0, 11, 0), where: "Studio room 2", project: "phin-loyalty" },
  { id: "m2", title: "Lumen Bank check-in", start: daysFromToday(0, 14, 0), where: "Video call", project: "lumen-banking" },
  { id: "m3", title: "Zen office hours", start: daysFromToday(0, 16, 30), where: "Studio room 1", project: "zen-ds" },
];
// Alex's own work for the rest of the week, soonest first.
const dueThisWeek = [
  { id: "w1", title: "WCAG audit of accounts", project: "lumen-banking", due: daysFromToday(0) },
  { id: "w2", title: "Points history sign-off", project: "phin-loyalty", due: daysFromToday(1) },
  { id: "w3", title: "Transfer limit copy", project: "lumen-banking", due: daysFromToday(2) },
  { id: "w4", title: "Metric card guidelines", project: "zen-ds", due: daysFromToday(2) },
  { id: "w5", title: "Moodboard feedback", project: "saola-brand", due: daysFromToday(3) },
  { id: "w6", title: "Design team 1:1s", project: "zen-ds", due: daysFromToday(4) },
];
// The studio's six projects plus the smaller ones it runs alongside them, by name.
type ProjectRow = { id: string; name: string; client: string; icon: IconName; theme: DockIconTheme; status: ProjectStatus };
const moreProjects: ProjectRow[] = [
  { id: "phin-gift", name: "Gift cards", client: "Phin & Co", icon: "icon-gift-01-line", theme: "orange", status: "Active" },
  { id: "phin-training", name: "Barista training app", client: "Phin & Co", icon: "icon-coffee-bean-line", theme: "orange", status: "Completed" },
  { id: "lumen-cards", name: "Card controls", client: "Lumen Bank", icon: "icon-credit-card-lock-line", theme: "blue", status: "Planning" },
  { id: "lumen-savings", name: "Savings goals", client: "Lumen Bank", icon: "icon-piggy-bank-line", theme: "blue", status: "Active" },
  { id: "mekong-driver", name: "Driver app", client: "Mekong Freight", icon: "icon-route-line", theme: "teal", status: "On hold" },
  { id: "bookfair-tickets", name: "Exhibitor portal", client: "Hanoi Book Fair", icon: "icon-ticket-01-line", theme: "purple", status: "Completed" },
  { id: "saola-trails", name: "Trail guide app", client: "Saola Outdoor", icon: "icon-map-line", theme: "green", status: "Planning" },
  { id: "studio-site", name: "Studio website", client: "Đìzai Studio", icon: "icon-globe-01-line", theme: "indigo", status: "Active" },
];
const projectRows: ProjectRow[] = [...projects, ...moreProjects].sort((a, b) => a.name.localeCompare(b.name));
// Grouped by status, so each row keeps its whole name.
const projectGroups = (["Active", "Planning", "On hold", "Completed"] as ProjectStatus[]).map((status) => ({ status, rows: projectRows.filter((project) => project.status === status) }));
const inbox: { id: string; actor: PersonId; text: string; at: Date }[] = [
  { id: "n1", actor: "chi", text: "Commented on Points history", at: minutesAgo(2) },
  { id: "n2", actor: "bao", text: "Asked you to review PHIN-219", at: minutesAgo(13) },
  { id: "n3", actor: "hana", text: "Shared Lumen Bank SOW v3", at: daysFromToday(0, 9, 12) },
  { id: "n4", actor: "ava", text: "Added the session 3 clip", at: daysFromToday(0, 8, 40) },
  { id: "n5", actor: "duy", text: "Put Shipment tracking on hold", at: daysFromToday(-1, 16, 40) },
  { id: "n6", actor: "emi", text: "Mentioned you in Points counter", at: daysFromToday(-1, 14, 5) },
  { id: "n7", actor: "finn", text: "Closed LUM-095 Passkey spike", at: daysFromToday(-1, 11, 20) },
  { id: "n8", actor: "minhAnh", text: `Approved your leave from ${formatDay(myLeave.from)}`, at: daysFromToday(-2, 11, 5) },
  { id: "n9", actor: "em", text: "Filed 2 bugs on Loyalty app", at: daysFromToday(-3, 17, 30) },
  { id: "n10", actor: "gia", text: "Shared the Saola moodboard", at: daysFromToday(-4, 10, 15) },
  { id: "n11", actor: "linh", text: "Edited Saola tone of voice", at: daysFromToday(-6, 15, 45) },
  { id: "n12", actor: "mai", text: "Marked INV-2026-0141 as paid", at: daysFromToday(-8, 15, 30) },
  { id: "n13", actor: "khoa", text: "Mapped the customs hold states", at: daysFromToday(-14, 9, 10) },
];
const studioTabs = { home: "Home", projects: "Projects", inbox: "Inbox", profile: "Profile" } as const;
type StudioTab = keyof typeof studioTabs;

const reviewing = tasks.filter((task) => task.status === "In review");

function RootDestinationsExample() {
  // One scroller: the large title folds as the screen runs under the bar.
  const screenRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<StudioTab>("home");
  const [unread, setUnread] = useState(3);
  const todayId = useId();
  const reviewId = useId();
  const dueId = useId();
  const groupId = useId();
  const items: BottomNavigationItem[] = [
    { id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },
    { id: "projects", label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
    // The dot is decorative: the label carries the count until Inbox is opened.
    { id: "inbox", label: unread ? `Inbox, ${unread} new` : "Inbox", icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid", dot: unread > 0 },
    { id: "profile", label: "Profile", icon: "icon-user-circle-line", selectedIcon: "icon-user-circle-solid" },
  ];
  // Tapping the current destination again scrolls it back to the top; another destination opens at its top.
  const open = (id: string) => {
    screenRef.current?.scrollTo({ top: 0, behavior: id === tab ? "smooth" : "auto" });
    setTab(id as StudioTab);
    if (id === "inbox") setUnread(0);
  };
  const title = studioTabs[tab];
  // Home and Projects split their rows under kickers, so they are grouped lists on a Surface-Alt screen with the Alt bar;
  // Inbox and Profile are single lists and stay on Surface.
  const grouped = tab === "home" || tab === "projects";
  return (
    <PlatformPhone label="Zen app" canvas={grouped ? "alt" : "default"} headerOverlay screenRef={screenRef}
      header={<TopNavigation type={grouped ? "alt" : "default"} title={title} largeTitle={title} scrollRef={screenRef} />}
      footer={<BottomNavigation items={items} value={tab} onValueChange={open} />}>
      {/* Body padding lg (20px, the phone margin); groups lg apart. */}
      {tab === "home" ? (
        <Stack gap="lg" padding="lg">
          <ListGroup id={todayId} title="Today">
            {meetings.map((meeting) => {
              const project = projectById(meeting.project);
              return <ListItem key={meeting.id} title={meeting.title} caption={`${formatTime(meeting.start)} · ${meeting.where}`} leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />} />;
            })}
          </ListGroup>
          <ListGroup id={reviewId} title="Waiting for your review">
            {reviewing.map((task) => (
              <ListItem key={task.id} title={people[task.assignee].name} caption={task.title} leading={<Avatar size="md" {...avatarOf(people[task.assignee])} />} />
            ))}
          </ListGroup>
          <ListGroup id={dueId} title="Due this week">
            {dueThisWeek.map((task) => {
              const project = projectById(task.project);
              return <ListItem key={task.id} title={task.title} caption={`${formatDue(task.due)} · ${project.name}`} leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />} />;
            })}
          </ListGroup>
        </Stack>
      ) : null}
      {tab === "projects" ? (
        <Stack gap="lg" padding="lg">
          {projectGroups.map((group, index) => (
            <ListGroup key={group.status} id={`${groupId}-${index}`} title={group.status}>
              {group.rows.map((project) => (
                <ListItem key={project.id} title={project.name} caption={project.client}
                  leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />} />
              ))}
            </ListGroup>
          ))}
        </Stack>
      ) : null}
      {tab === "inbox" ? (
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Notifications">
            {inbox.map((item) => (
              <ListItem key={item.id} title={people[item.actor].name} caption={`${item.text} · ${formatRelative(item.at)}`} leading={<Avatar size="md" {...avatarOf(people[item.actor])} />} />
            ))}
          </List>
        </Box>
      ) : null}
      {tab === "profile" ? (
        <Stack gap="md" paddingY="xs">
          <Box paddingX="lg">
            <List aria-label="Signed in as">
              <ListItem title={me.name} caption={`${me.role} · ${me.team}`} leading={<Avatar size="md" theme="photo" src={me.photo} alt="" />} />
            </List>
          </Box>
          <Box paddingX="lg">
            <DescriptionList items={[
              { term: "Email", description: me.email },
              { term: "Location", description: me.location },
              { term: "Projects", description: String(projects.filter((project) => project.members.includes("alex")).length) },
            ]} />
          </Box>
        </Stack>
      ) : null}
    </PlatformPhone>
  );
}

/* ───────────── 2. Action in the bar ───────────── */

// Đìzai Studio's expenses app: three destinations, and the app's one create action as the last cell of the bar.
type ExpenseCategory = "Transport" | "Meals" | "Flights" | "Software" | "Office";
const categoryLook: Record<ExpenseCategory, { icon: IconName; theme: DockIconTheme }> = {
  Transport: { icon: "icon-car-01-line", theme: "blue" },
  Meals: { icon: "icon-coffee-cup-line", theme: "orange" },
  Flights: { icon: "icon-plane-line", theme: "teal" },
  Software: { icon: "icon-laptop-line", theme: "purple" },
  Office: { icon: "icon-book-open-line", theme: "green" },
};
const categoryOptions = (Object.keys(categoryLook) as ExpenseCategory[]).map((category) => ({ value: category, label: category }));
type Expense = { id: string; merchant: string; category: ExpenseCategory; amount: number; at: Date };
// Alex's September, newest first.
const myExpenses: Expense[] = [
  { id: "x1", merchant: "Grab", category: "Transport", amount: 6.4, at: daysFromToday(0, 8, 50) },
  { id: "x2", merchant: "Phin & Co Lê Lợi", category: "Meals", amount: 18.6, at: daysFromToday(-1, 12, 30) },
  { id: "x3", merchant: "Figma", category: "Software", amount: 45, at: daysFromToday(-2, 9, 0) },
  { id: "x4", merchant: "Xanh SM", category: "Transport", amount: 5.2, at: daysFromToday(-3, 19, 10) },
  { id: "x5", merchant: "Pizza 4P's", category: "Meals", amount: 64, at: daysFromToday(-4, 12, 15) },
  { id: "x6", merchant: "Vietnam Airlines", category: "Flights", amount: 212.8, at: daysFromToday(-6, 15, 10) },
  { id: "x7", merchant: "Grab", category: "Transport", amount: 9.1, at: daysFromToday(-7, 7, 45) },
  { id: "x8", merchant: "Fahasa", category: "Office", amount: 23.5, at: daysFromToday(-9, 17, 20) },
  { id: "x9", merchant: "Adobe", category: "Software", amount: 59.99, at: daysFromToday(-11, 9, 0) },
  { id: "x10", merchant: "Highlands Coffee", category: "Meals", amount: 12.4, at: daysFromToday(-13, 15, 30) },
  { id: "x11", merchant: "Tiki", category: "Office", amount: 31.8, at: daysFromToday(-16, 10, 5) },
  { id: "x12", merchant: "Vietjet Air", category: "Flights", amount: 96.5, at: daysFromToday(-20, 20, 30) },
  { id: "x13", merchant: "Notion", category: "Software", amount: 10, at: daysFromToday(-27, 9, 0) },
];
const trips = [
  // After Alex's leave (Oct 12 – Oct 14), soonest first.
  { id: "tr1", name: "Lumen Bank workshop", city: "Singapore", project: "lumen-banking", start: daysFromToday(19), end: daysFromToday(21) },
  { id: "tr2", name: "Phin & Co store visits", city: "Hanoi", project: "phin-loyalty", start: daysFromToday(26), end: daysFromToday(27) },
  { id: "tr3", name: "Book Fair wrap-up", city: "Hanoi", project: "bookfair-site", start: daysFromToday(-13), end: daysFromToday(-12) },
];
// The Design team's expenses that wait for Alex, their approver.
const waiting: { id: string; person: PersonId; what: string; amount: number }[] = [
  { id: "ap1", person: "chi", what: "Usability lab snacks", amount: 32 },
  { id: "ap2", person: "emi", what: "Font licence", amount: 120 },
  { id: "ap3", person: "ava", what: "Taxi to Lumen Bank", amount: 14.2 },
];
const expenseTabs: BottomNavigationItem[] = [
  { id: "expenses", label: "Expenses", icon: "icon-receipt-line", selectedIcon: "icon-receipt-solid" },
  { id: "trips", label: "Trips", icon: "icon-plane-line", selectedIcon: "icon-plane-solid" },
  { id: "approvals", label: "Approvals", icon: "icon-receipt-check-line", selectedIcon: "icon-receipt-check-solid" },
];

type ExpenseDraft = { merchant: string; amount: number | null; category: string };

function ActionInBarExample() {
  const { toast } = useToast();
  const screenRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("expenses");
  const [list, setList] = useState(myExpenses);
  const [creating, setCreating] = useState(false);
  const total = list.reduce((sum, expense) => sum + expense.amount, 0);
  // Tapping the current destination again scrolls it back to the top; another destination opens at its top.
  const open = (id: string) => {
    screenRef.current?.scrollTo({ top: 0, behavior: id === tab ? "smooth" : "auto" });
    setTab(id);
  };
  // Add expense always submits: a missing value gets its error and focus, the sheet stays open.
  const form = useFormState<ExpenseDraft>({
    initialValues: { merchant: "", amount: null, category: "Meals" },
    validate: (v) => ({
      merchant: v.merchant.trim() ? undefined : "Enter where you paid, like Grab",
      amount: v.amount ? undefined : "Enter the amount you paid",
    }),
    onSubmit: (v, { reset }) => {
      const expense: Expense = { id: `new-${Date.now()}`, merchant: v.merchant.trim(), category: v.category as ExpenseCategory, amount: v.amount!, at: TODAY };
      setList((all) => [expense, ...all]);
      setCreating(false);
      reset();
      // The new expense lands on top of Expenses, whichever destination was open.
      open("expenses");
      toast({ title: "Expense added", action: { label: "Undo", onClick: () => setList((all) => all.filter((item) => item.id !== expense.id)) } });
    },
  });
  const start = () => { form.reset(); setCreating(true); };
  const title = expenseTabs.find((item) => item.id === tab)!.label;
  return (
    <PlatformPhone label="Đìzai expenses" headerOverlay screenRef={screenRef}
      header={<TopNavigation title={title} largeTitle={title} scrollRef={screenRef} />}
      // Default bar: the action is one more cell after the destinations, a 48px Primary button that opens a task.
      footer={<BottomNavigation items={expenseTabs} value={tab} onValueChange={open}
        action={{ icon: "icon-plus-line", label: "New expense", onClick: start }} />}>
      {tab === "expenses" ? (
        <Stack gap="md" paddingY="xs">
          <Box paddingX="lg"><Metric size="xl" label="September" value={formatMoney(total, true)} icon="icon-receipt-line" iconTheme="blue" iconBackground="solid" /></Box>
          <Box paddingX="lg">
            <List aria-label="Expenses">
              {list.map((expense) => (
                <ListItem key={expense.id} title={expense.merchant} caption={`${expense.category} · ${formatRelative(expense.at)}`}
                  leading={<DockIcon icon={categoryLook[expense.category].icon} theme={categoryLook[expense.category].theme} background="subtle" size="md" />}
                  trailing={<Text as="span" textStyle="Body/Base/Medium" className="px-bottom-navigation-value">{formatMoney(expense.amount, true)}</Text>} />
              ))}
            </List>
          </Box>
        </Stack>
      ) : null}
      {tab === "trips" ? (
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Trips">
            {trips.map((trip) => {
              const project = projectById(trip.project);
              return <ListItem key={trip.id} title={trip.name} caption={`${trip.city} · ${formatRange(trip.start, trip.end)}`} leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />} />;
            })}
          </List>
        </Box>
      ) : null}
      {tab === "approvals" ? (
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Waiting for your approval">
            {waiting.map((item) => (
              <ListItem key={item.id} title={people[item.person].name} caption={item.what} leading={<Avatar size="md" {...avatarOf(people[item.person])} />}
                trailing={<Text as="span" textStyle="Body/Base/Medium" className="px-bottom-navigation-value">{formatMoney(item.amount, true)}</Text>} />
            ))}
          </List>
        </Box>
      ) : null}
      {/* A form sheet: Enter in a field or Add expense submits it. */}
      <BottomSheet inline open={creating} onOpenChange={setCreating} title="New expense" onSubmit={form.handleSubmit}
        primaryAction={{ label: "Add expense" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Merchant" placeholder="e.g. Grab" {...form.field("merchant")} data-autofocus="" />
        {/* min 0.01 keeps the cents a person types; the steppers still move by $1. */}
        <NumberField label="Amount (USD)" min={0.01} step={1} {...form.numberField("amount")} />
        <SelectField label="Category" options={categoryOptions} {...form.selectField("category")} />
      </BottomSheet>
    </PlatformPhone>
  );
}

/* ───────────── 3. Floating with create ───────────── */

const events = [
  { id: "e1", title: "Design critique", start: daysFromToday(0, 11, 0), end: daysFromToday(0, 12, 0), project: "phin-loyalty" },
  { id: "e2", title: "Lumen Bank check-in", start: daysFromToday(0, 14, 0), end: daysFromToday(0, 14, 30), project: "lumen-banking" },
  { id: "e3", title: "Sprint planning", start: daysFromToday(1, 9, 30), end: daysFromToday(1, 10, 30), project: "phin-loyalty" },
  { id: "e4", title: "Customs states workshop", start: daysFromToday(2, 13, 0), end: daysFromToday(2, 15, 0), project: "mekong-tracking" },
  { id: "e5", title: "Moodboard review", start: daysFromToday(7, 15, 0), end: daysFromToday(7, 16, 0), project: "saola-brand" },
];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
/** "Today" · "Tomorrow" · "Oct 12" */
const dayLabel = (d: Date) => { const days = Math.round((startOfDay(d) - startOfDay(TODAY)) / 86_400_000); return days === 0 ? "Today" : days === 1 ? "Tomorrow" : formatDay(d); };
const projectOptions = projects.filter((project) => project.status !== "Completed").map((project) => ({ value: project.id, label: project.name }));

// Short task names, as a task app shows them: the row never cuts a title off. Soonest first.
type TodoItem = { id: string; title: string; project: string; due: Date };
const todos: TodoItem[] = [
  { id: "t5", title: "WCAG audit of accounts", project: "lumen-banking", due: TODAY },
  { id: "t2", title: "Review the rewards API", project: "phin-loyalty", due: daysFromToday(1) },
  { id: "t1", title: "Points history screen", project: "phin-loyalty", due: daysFromToday(2) },
  { id: "t4", title: "Usability sessions", project: "lumen-banking", due: daysFromToday(3) },
  { id: "t9", title: "Transfer limit copy", project: "lumen-banking", due: daysFromToday(4) },
  { id: "t3", title: "Android regression test", project: "phin-loyalty", due: daysFromToday(5) },
  { id: "t6", title: "Metric card guidelines", project: "zen-ds", due: daysFromToday(6) },
  { id: "t8", title: "Outdoor range moodboard", project: "saola-brand", due: daysFromToday(7) },
  { id: "t10", title: "Points counter motion", project: "phin-loyalty", due: daysFromToday(8) },
  { id: "t7", title: "Customs hold states", project: "mekong-tracking", due: daysFromToday(9) },
  { id: "t11", title: "Dark mode tokens", project: "zen-ds", due: daysFromToday(10) },
  { id: "t13", title: "Trail map icons", project: "saola-brand", due: daysFromToday(15) },
  { id: "t12", title: "Passkey help article", project: "lumen-banking", due: daysFromToday(16) },
];

function FloatingCreateExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("tasks");
  const [list, setList] = useState(todos);
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  // Tapping the current destination again scrolls it back to the top; another destination opens at its top.
  const open = (id: string) => {
    screenRef.current?.scrollTo({ top: 0, behavior: id === tab ? "smooth" : "auto" });
    setTab(id);
  };
  const form = useFormState({
    initialValues: { name: "", project: "zen-ds" },
    validate: (v) => ({ name: v.name.trim() ? undefined : "Enter a task name" }),
    onSubmit: (v, { reset }) => {
      const id = `new-${list.length + 1}`;
      setList((all) => [{ id, title: v.name.trim(), project: v.project, due: daysFromToday(7) }, ...all]);
      setFresh(id);
      setCreating(false);
      reset();
      // The new task lands on top of Tasks.
      open("tasks");
    },
  });
  const start = () => { form.reset(); setCreating(true); };
  const items: BottomNavigationItem[] = [
    { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
    { id: "calendar", label: "Calendar", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
    { id: "files", label: "Files", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
  ];
  const title = items.find((item) => item.id === tab)!.label;
  return (
    // Floating: the pill sits over the content on a fade to Surface; the screen keeps room under its last row.
    <PlatformPhone label="Zen tasks" headerOverlay screenRef={screenRef}
      header={<TopNavigation title={title} largeTitle={title} scrollRef={screenRef} />}
      footer={<BottomNavigation type="floating" items={items} value={tab} onValueChange={open}
        action={{ icon: "icon-plus-line", label: "New task", onClick: start }} />}>
      {tab === "tasks" ? (
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Tasks">
            {list.map((task) => {
              const project = projectById(task.project);
              return (
                <ListItem key={task.id} title={task.title} caption={`${task.id === fresh ? "Created just now" : formatDue(task.due)} · ${project.name}`}
                  leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />} />
              );
            })}
          </List>
        </Box>
      ) : null}
      {tab === "calendar" ? (
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Coming up">
            {events.map((event) => {
              const project = projectById(event.project);
              return <ListItem key={event.id} title={event.title} caption={`${dayLabel(event.start)} · ${formatTime(event.start)} – ${formatTime(event.end)}`} leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />} />;
            })}
          </List>
        </Box>
      ) : null}
      {tab === "files" ? (
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Files">
            {files.map((file) => (
              <ListItem key={file.id} title={file.name} caption={`${formatBytes(file.bytes)} · ${formatRelative(file.updated)}`} leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} />
            ))}
          </List>
        </Box>
      ) : null}
      <BottomSheet inline open={creating} onOpenChange={setCreating} title="New task" onSubmit={form.handleSubmit}
        primaryAction={{ label: "Create task" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Task name" placeholder="e.g. Review the onboarding copy" {...form.field("name")} data-autofocus="" />
        <SelectField label="Project" options={projectOptions} {...form.selectField("project")} />
      </BottomSheet>
    </PlatformPhone>
  );
}

/* ───────────── 4. Glass over photos ───────────── */

// Saola Outdoor's trail app (a studio client): every destination is imagery, so the pill floats on the picture.
const trails = [
  { name: "Sunset field loop", photo: platformMedia.feed[0] },
  { name: "Forest creek", photo: platformMedia.feed[1] },
  { name: "Balloon valley", photo: platformMedia.feed[2] },
  { name: "Mountain road", photo: platformMedia.feed[3] },
  { name: "Snow peaks", photo: platformMedia.feed[4] },
  { name: "Desert hills", photo: platformMedia.feed[5] },
  { name: "Coast road", photo: platformMedia.feed[6] },
  { name: "Moss trail", photo: platformMedia.feed[7] },
  { name: "Old town walk", photo: platformMedia.site[2] },
];
const saved = [trails[1], trails[4], trails[6], trails[8]];

function GlassOverPhotosExample() {
  const [tab, setTab] = useState("today");
  const items: BottomNavigationItem[] = [
    { id: "today", label: "Today", icon: "icon-compass-line", selectedIcon: "icon-compass-solid" },
    { id: "trails", label: "Trails", icon: "icon-map-line", selectedIcon: "icon-map-solid" },
    { id: "saved", label: "Saved", icon: "icon-bookmark-line", selectedIcon: "icon-bookmark-solid" },
  ];
  const title = items.find((item) => item.id === tab)!.label;
  return (
    <PlatformPhone canvas="media" statusBar="light" label="Saola Trails"
      // Over photos and video there is no Surface band under the pill (backdrop none), only the progressive blur.
      footer={<BottomNavigation type="floating-glass" backdrop="none" items={items} value={tab} onValueChange={setTab} aria-label="Saola Trails" />}>
      {/* A full-bleed media screen shows no title bar; it still names itself with one h1. */}
      <VisuallyHidden as="h1">{title}</VisuallyHidden>
      {tab === "today" ? <PlatformPhoneMedia video={platformMedia.canyonPortrait} /> : null}
      {tab !== "today" ? (
        <Grid as="ul" columns={tab === "trails" ? 3 : 2} gap="2xs" className="px-bottom-navigation-grid" aria-label={title}>
          {(tab === "trails" ? trails : saved).map((trail) => (
            <li key={trail.name}><Image src={trail.photo.src} alt={trail.name} ratio="3:4" radius="none" /></li>
          ))}
        </Grid>
      ) : null}
    </PlatformPhone>
  );
}

/* ───────────── 5. Labels in a brand app ───────────── */

// Phin & Co's loyalty app (built by the studio): five destinations, the most a bar holds, each with a one-word label.
type Drink = { id: string; name: string; note: string; price: number };
const menu: { id: string; title: string; theme: DockIconTheme; drinks: Drink[] }[] = [
  { id: "coffee", title: "Coffee", theme: "brown", drinks: [
    { id: "d1", name: "Phin sữa đá", note: "Iced phin coffee with condensed milk", price: 3.2 },
    { id: "d2", name: "Phin đen đá", note: "Black phin coffee over ice", price: 2.8 },
    { id: "d3", name: "Bạc xỉu", note: "Milk first, a shot of phin on top", price: 3.4 },
    { id: "d4", name: "Egg coffee", note: "Whipped egg yolk over phin", price: 4.2 },
    { id: "d5", name: "Salted cream coffee", note: "Phin under a salted cream cap", price: 3.9 },
    { id: "d6", name: "Coconut coffee", note: "Phin over coconut cream", price: 4.1 },
    { id: "d7", name: "Cold brew", note: "Steeped for 18 hours", price: 3.8 },
    { id: "d8", name: "Orange cold brew", note: "Cold brew over fresh orange", price: 4.3 },
    { id: "d9", name: "Yoghurt coffee", note: "Phin over chilled yoghurt", price: 3.7 },
  ] },
  { id: "tea", title: "Tea and more", theme: "green", drinks: [
    { id: "d10", name: "Lotus tea", note: "Hanoi green tea with lotus", price: 3.4 },
    { id: "d11", name: "Peach lemongrass tea", note: "Black tea with fresh peach", price: 3.6 },
    { id: "d12", name: "Matcha latte", note: "Matcha with fresh milk", price: 4 },
    { id: "d13", name: "Đà Lạt cocoa", note: "Hot or iced, with fresh milk", price: 3.5 },
  ] },
];
const rewards = [
  { id: "r1", name: "Free pastry", points: 600 },
  { id: "r2", name: "Free drink, any size", points: 1500 },
  { id: "r3", name: "Phin filter set", points: 3200 },
];
const stores = [
  { id: "s1", name: "Phin & Co Lê Lợi", address: "84 Lê Lợi, District 1", distance: "0.4 km" },
  { id: "s2", name: "Phin & Co Thảo Điền", address: "12 Quốc Hương, Thủ Đức", distance: "6.1 km" },
  { id: "s3", name: "Phin & Co Nguyễn Huệ", address: "9 Nguyễn Huệ, District 1", distance: "0.9 km" },
];
// Ten points for every $1, newest visit first.
const visits = [
  { id: "v1", store: "Phin & Co Lê Lợi", at: daysFromToday(0, 8, 15), points: 32 },
  { id: "v2", store: "Phin & Co Lê Lợi", at: daysFromToday(-2, 8, 40), points: 38 },
  { id: "v3", store: "Phin & Co Thảo Điền", at: daysFromToday(-6, 15, 5), points: 64 },
  { id: "v4", store: "Phin & Co Nguyễn Huệ", at: daysFromToday(-7, 9, 20), points: 34 },
  { id: "v5", store: "Phin & Co Lê Lợi", at: daysFromToday(-8, 8, 30), points: 32 },
  { id: "v6", store: "Phin & Co Lê Lợi", at: daysFromToday(-9, 8, 45), points: 41 },
  { id: "v7", store: "Phin & Co Thảo Điền", at: daysFromToday(-13, 16, 10), points: 76 },
  { id: "v8", store: "Phin & Co Nguyễn Huệ", at: daysFromToday(-15, 12, 40), points: 58 },
  { id: "v9", store: "Phin & Co Lê Lợi", at: daysFromToday(-16, 8, 20), points: 32 },
  { id: "v10", store: "Phin & Co Lê Lợi", at: daysFromToday(-20, 8, 35), points: 38 },
  { id: "v11", store: "Phin & Co Nguyễn Huệ", at: daysFromToday(-22, 17, 15), points: 43 },
  { id: "v12", store: "Phin & Co Lê Lợi", at: daysFromToday(-23, 8, 25), points: 32 },
];
const points = 1240;
const phinTabs: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },
  { id: "menu", label: "Menu", icon: "icon-coffee-cup-line", selectedIcon: "icon-coffee-cup-solid" },
  { id: "rewards", label: "Rewards", icon: "icon-gift-01-line", selectedIcon: "icon-gift-01-solid" },
  { id: "stores", label: "Stores", icon: "icon-marker-pin-01-line", selectedIcon: "icon-marker-pin-01-solid" },
  { id: "account", label: "Account", icon: "icon-user-circle-line", selectedIcon: "icon-user-circle-solid" },
];

function BrandLabelsExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("home");
  const sectionId = useId();
  // Tapping the current destination again scrolls it back to the top; another destination opens at its top.
  const open = (id: string) => {
    screenRef.current?.scrollTo({ top: 0, behavior: id === tab ? "smooth" : "auto" });
    setTab(id);
  };
  const current = phinTabs.find((item) => item.id === tab)!;
  // The Menu splits its drinks under kickers: a grouped list on a Surface-Alt screen with the Alt bar.
  const grouped = tab === "menu";
  return (
    <PlatformPhone label="Phin & Co" canvas={grouped ? "alt" : "default"} headerOverlay screenRef={screenRef}
      header={<TopNavigation type={grouped ? "alt" : "default"} title={current.label} largeTitle={current.label} scrollRef={screenRef} />}
      footer={<BottomNavigation theme="accent" showLabels aria-label="Phin & Co" items={phinTabs} value={tab} onValueChange={open} />}>
      {tab === "home" ? (
        <Stack gap="lg" paddingY="xs">
          <Box paddingX="lg"><Metric size="xl" label="Your points" value={points.toLocaleString("en-US")} icon="icon-gift-01-line" iconTheme="pink" iconBackground="solid" /></Box>
          <Stack as="section" gap="xs" aria-labelledby={`${sectionId}-visits`}>
            <Box paddingX="lg"><Heading level={2} id={`${sectionId}-visits`} textStyle="Body/Small/Bold" tone="light">Recent visits</Heading></Box>
            <Box paddingX="lg">
              <List aria-labelledby={`${sectionId}-visits`}>
                {visits.map((visit) => (
                  <ListItem key={visit.id} title={visit.store} caption={formatRelative(visit.at)}
                    leading={<DockIcon icon="icon-coffee-cup-line" theme="brown" background="subtle" size="md" />}
                    trailing={<Text as="span" textStyle="Body/Base/Medium" className="px-bottom-navigation-value">{`+${visit.points} pts`}</Text>} />
                ))}
              </List>
            </Box>
          </Stack>
        </Stack>
      ) : null}
      {tab === "menu" ? (
        <Stack gap="lg" padding="lg">
          {menu.map((group) => (
            <ListGroup key={group.id} id={`${sectionId}-${group.id}`} title={group.title}>
              {group.drinks.map((drink) => (
                <ListItem key={drink.id} title={drink.name} caption={drink.note} leading={<DockIcon icon="icon-coffee-cup-line" theme={group.theme} background="subtle" size="md" />}
                  trailing={<Text as="span" textStyle="Body/Base/Medium" className="px-bottom-navigation-value">{formatMoney(drink.price, true)}</Text>} />
              ))}
            </ListGroup>
          ))}
        </Stack>
      ) : null}
      {tab === "rewards" ? (
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Rewards">
            {rewards.map((reward) => (
              <ListItem key={reward.id} title={reward.name} caption={reward.points <= points ? "Ready to redeem" : `${(reward.points - points).toLocaleString("en-US")} points to go`}
                leading={<DockIcon icon="icon-gift-01-line" theme="pink" background="subtle" size="md" />}
                trailing={<Text as="span" textStyle="Body/Base/Medium" className="px-bottom-navigation-value">{`${reward.points.toLocaleString("en-US")} pts`}</Text>} />
            ))}
          </List>
        </Box>
      ) : null}
      {tab === "stores" ? (
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Stores">
            {stores.map((store) => (
              <ListItem key={store.id} title={store.name} caption={store.address} leading={<DockIcon icon="icon-marker-pin-01-line" theme="teal" background="subtle" size="md" />}
                trailing={<Text as="span" textStyle="Body/Small/Regular" tone="base" className="px-bottom-navigation-value">{store.distance}</Text>} />
            ))}
          </List>
        </Box>
      ) : null}
      {tab === "account" ? (
        <Box paddingX="lg" paddingY="xs">
          <DescriptionList items={[
            { term: "Name", description: "Alex Duong" },
            { term: "Member since", description: formatDate(new Date(2024, 2, 8)) },
            { term: "Tier", description: "Gold" },
            { term: "Points", description: points.toLocaleString("en-US") },
          ]} />
        </Box>
      ) : null}
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Root destinations",
    description: "Four root screens, one tap apart: the selected destination switches to its solid glyph, each screen's large title folds as it scrolls, and tapping the current one again scrolls back to the top. Home and Projects group their rows, so they are grouped lists on the Surface-Alt screen. The Inbox dot clears once Inbox opens; until then its label says how many are new.",
    render: () => <RootDestinationsExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);
const [tab, setTab] = useState("home");
const [unread, setUnread] = useState(3);
// Tapping the current destination again scrolls it back to the top; another one opens at its top.
const open = (id: string) => {
  screenRef.current?.scrollTo({ top: 0, behavior: id === tab ? "smooth" : "auto" });
  setTab(id);
  if (id === "inbox") setUnread(0);
};

// Home and Projects split their rows under kickers: grouped lists on Surface-Alt. Inbox and Profile are single lists.
const grouped = tab === "home" || tab === "projects";

<PlatformPhone canvas={grouped ? "alt" : "default"} headerOverlay screenRef={screenRef}
  header={<TopNavigation type={grouped ? "alt" : "default"} title={title} largeTitle={title} scrollRef={screenRef} />}
  footer={
    <BottomNavigation value={tab} onValueChange={open} items={[
      { id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },
      { id: "projects", label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
      { id: "inbox", label: unread ? \`Inbox, \${unread} new\` : "Inbox",
        icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid", dot: unread > 0 },
      { id: "profile", label: "Profile", icon: "icon-user-circle-line", selectedIcon: "icon-user-circle-solid" },
    ]} />
  }>
  {tab === "home" ? (
    <Stack gap="lg" padding="lg">
      <Stack as="section" gap="xs" aria-labelledby="today">
        {/* The kicker lines up with the row text inside the group */}
        <Box paddingX="lg"><Heading level={2} id="today" textStyle="Body/Small/Bold" tone="light">Today</Heading></Box>
        {/* One white Surface block per group; rows have no padding, the block pads lg on every side */}
        <ListBox>
          <List aria-labelledby="today">
            {meetings.map((m) => <ListItem key={m.id} title={m.title} caption={\`\${formatTime(m.start)} · \${m.where}\`} leading={projectIcon(m.project)} />)}
          </List>
        </ListBox>
      </Stack>
      {/* Waiting for your review and Due this week follow the same way */}
    </Stack>
  ) : screens[tab]}
</PlatformPhone>`,
  },
  {
    title: "Action in the bar",
    description: "On the Default bar the app's one create action is the last cell, a 48px Primary button that opens a task, never a screen. New expense opens a form sheet where Enter submits and a missing value gets its error; the expense lands on top of Expenses, with Undo in the toast.",
    render: () => <ActionInBarExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);
const [tab, setTab] = useState("expenses");
const [creating, setCreating] = useState(false);

<PlatformPhone headerOverlay screenRef={screenRef}
  header={<TopNavigation title={title} largeTitle={title} scrollRef={screenRef} />}
  footer={
    <BottomNavigation value={tab} onValueChange={open} items={[
        { id: "expenses", label: "Expenses", icon: "icon-receipt-line", selectedIcon: "icon-receipt-solid" },
        { id: "trips", label: "Trips", icon: "icon-plane-line", selectedIcon: "icon-plane-solid" },
        { id: "approvals", label: "Approvals", icon: "icon-receipt-check-line", selectedIcon: "icon-receipt-check-solid" },
      ]}
      action={{ icon: "icon-plus-line", label: "New expense", onClick: () => setCreating(true) }} />
  }>
  {screens[tab]}
</PlatformPhone>

const form = useFormState({
  initialValues: { merchant: "", amount: null, category: "Meals" },
  validate: (v) => ({
    merchant: v.merchant.trim() ? undefined : "Enter where you paid, like Grab",
    amount: v.amount ? undefined : "Enter the amount you paid",
  }),
  onSubmit: (v, { reset }) => { addExpense(v); setCreating(false); reset(); },
});

<BottomSheet inline open={creating} onOpenChange={setCreating} title="New expense" onSubmit={form.handleSubmit}
  primaryAction={{ label: "Add expense" }} secondaryAction={{ label: "Cancel" }}>
  <InputField label="Merchant" placeholder="e.g. Grab" {...form.field("merchant")} data-autofocus="" />
  <NumberField label="Amount (USD)" min={0.01} step={1} {...form.numberField("amount")} />
  <SelectField label="Category" options={categories} {...form.selectField("category")} />
</BottomSheet>`,
  },
  {
    title: "Floating with create",
    description: "The Floating pill sits over the list on a fade to Surface, so rows scroll under it, and the create action floats beside it as its own 64px button. New task opens a sheet; the task lands on top of Tasks.",
    render: () => <FloatingCreateExample />,
    code: `const form = useFormState({
  initialValues: { name: "", project: "zen-ds" },
  validate: (v) => ({ name: v.name.trim() ? undefined : "Enter a task name" }),
  onSubmit: (v, { reset }) => { addTask(v); setCreating(false); reset(); },
});

<PlatformPhone headerOverlay screenRef={screenRef}
  header={<TopNavigation title={title} largeTitle={title} scrollRef={screenRef} />}
  footer={
    <BottomNavigation type="floating" value={tab} onValueChange={open} items={[
        { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
        { id: "calendar", label: "Calendar", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
        { id: "files", label: "Files", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
      ]}
      action={{ icon: "icon-plus-line", label: "New task", onClick: () => setCreating(true) }} />
  }>
  {screens[tab]}
</PlatformPhone>

<BottomSheet inline open={creating} onOpenChange={setCreating} title="New task" onSubmit={form.handleSubmit}
  primaryAction={{ label: "Create task" }} secondaryAction={{ label: "Cancel" }}>
  <InputField label="Task name" placeholder="e.g. Review the onboarding copy" {...form.field("name")} data-autofocus="" />
  <SelectField label="Project" options={projectOptions} {...form.selectField("project")} />
</BottomSheet>`,
  },
  {
    title: "Glass over photos",
    description: "Over video and photos the Floating Glass pill floats on the picture with backdrop none, so no Surface band cuts across the image. Idle icons stay Strongest and the selection is Subtle; the screen still has a hidden h1.",
    render: () => <GlassOverPhotosExample />,
    code: `<BottomNavigation type="floating-glass" backdrop="none" aria-label="Saola Trails"
  value={tab} onValueChange={setTab} items={[
    { id: "today", label: "Today", icon: "icon-compass-line", selectedIcon: "icon-compass-solid" },
    { id: "trails", label: "Trails", icon: "icon-map-line", selectedIcon: "icon-map-solid" },
    { id: "saved", label: "Saved", icon: "icon-bookmark-line", selectedIcon: "icon-bookmark-solid" },
  ]} />`,
  },
  {
    title: "Labels in a brand app",
    description: "A branded consumer app uses the Accent theme with visible labels: five destinations, the most a bar holds, each a one-word noun. Tab reaches each destination and Enter opens it; the current one is aria-current.",
    render: () => <BrandLabelsExample />,
    code: `// The Menu splits its drinks under kickers (Coffee, Tea and more): a grouped list on Surface-Alt.
const grouped = tab === "menu";

<PlatformPhone canvas={grouped ? "alt" : "default"} headerOverlay screenRef={screenRef}
  header={<TopNavigation type={grouped ? "alt" : "default"} title={current.label} largeTitle={current.label} scrollRef={screenRef} />}
  footer={
    <BottomNavigation theme="accent" showLabels aria-label="Phin & Co" value={tab} onValueChange={open} items={[
      { id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },
      { id: "menu", label: "Menu", icon: "icon-coffee-cup-line", selectedIcon: "icon-coffee-cup-solid" },
      { id: "rewards", label: "Rewards", icon: "icon-gift-01-line", selectedIcon: "icon-gift-01-solid" },
      { id: "stores", label: "Stores", icon: "icon-marker-pin-01-line", selectedIcon: "icon-marker-pin-01-solid" },
      { id: "account", label: "Account", icon: "icon-user-circle-line", selectedIcon: "icon-user-circle-solid" },
    ]} />
  }>
  {screens[tab]}
</PlatformPhone>`,
  },
]);
