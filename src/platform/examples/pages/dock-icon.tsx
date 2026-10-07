/* Dock Icon examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio's own work in Zen: pick
   the kind of a new project, scan the client projects, read notifications from people and from the system, check leave
   balances, and — the one other domain — the Lumen Bank app the studio designs, on a phone. */
import { useId, useRef, useState } from "react";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { Avatar } from "../../../components/Avatar";
import { Badge, BadgeCounter } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { Form, FormActions, FormFieldset } from "../../../components/Form";
import type { IconName } from "../../../components/Icon";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Grid, Stack } from "../../../components/Layout";
import { Metric } from "../../../components/MetricWidget";
import { Table, TableBadges, TableMedia, TableText, type TableSort } from "../../../components/Table";
import { Heading, Text } from "../../../components/Text";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import {
  activity, daysFromToday, formatDate, formatDue, formatMoney, formatRange, formatRelative, formatTime, initials, invoices, leaveRequests, people,
  projectStatusTheme, projects, type Person, type Project,
} from "../data";
import { keepOnHotUpdate } from "../../hotData";
import "./dock-icon.css";

export const page: PlatformPage = "dock-icon";

const person = (id: string) => (people as Record<string, Person>)[id];
/** Photo when the person has one, initials on their steady theme otherwise. The name sits next to it, so alt is empty. */
const avatarFor = (p: Person) => p.photo ? { theme: "photo" as const, src: p.photo, alt: "" } : { theme: p.theme, children: initials(p.name) };

// ——— 1. Choose a project type: Large Solid marks on selectable cards ————————————————————————————————————————
type ProjectType = { id: string; name: string; caption: string; icon: IconName; theme: DockIconTheme };
/** The same colour per kind of work everywhere in Zen: Loyalty app is orange, Book Fair purple, Brand refresh green. */
const projectTypes: ProjectType[] = [
  { id: "mobile", name: "Mobile app", caption: "iOS and Android, from flows to store assets", icon: "icon-mobile-line", theme: "orange" },
  { id: "website", name: "Website", caption: "Marketing sites and web apps", icon: "icon-browser-line", theme: "purple" },
  { id: "brand", name: "Brand identity", caption: "Logo, type, colour and guidelines", icon: "icon-palette-line", theme: "green" },
  { id: "system", name: "Design system", caption: "Tokens, components and docs", icon: "icon-grid-01-line", theme: "indigo" },
  { id: "research", name: "Research study", caption: "Interviews, usability tests and a report", icon: "icon-beaker-02-line", theme: "teal" },
  { id: "workshop", name: "Workshop", caption: "Discovery and co-design sessions", icon: "icon-presentation-chart-line", theme: "pink" },
];

function ChooseProjectType() {
  const [typeId, setTypeId] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [naming, setNaming] = useState(false);
  const type = projectTypes.find((t) => t.id === typeId);
  const pick = (id: string) => { setTypeId(id); setMissing(false); };
  return (
    <>
      {/* Without a pick, Form moves focus to the first type card and announces the group's error. */}
      <Form className="px-dock-icon-fill" onSubmit={() => (type ? setNaming(true) : setMissing(true))} invalidMessage={() => "Choose a project type to continue"}>
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">New project for Mekong Freight</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">The kind of work sets the phases, the team template and the budget lines.</Text>
        </Stack>
        <FormFieldset legend="Project type" error={missing ? "Choose a project type to continue" : undefined}>
          <Grid minColumnWidth={280} gap="md">
            {projectTypes.map((t) => (
              <Card key={t.id} theme="border" selected={t.id === typeId} aria-pressed={t.id === typeId} onClick={() => pick(t.id)}>
                <Stack gap="md">
                  {/* Decorative: the name is right under it. */}
                  <DockIcon icon={t.icon} theme={t.theme} size="lg" />
                  <Stack gap="xs">
                    <Text as="span" textStyle="Body/Base/Bold">{t.name}</Text>
                    <Text as="span" textStyle="Body/Small/Regular" tone="base">{t.caption}</Text>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Grid>
        </FormFieldset>
        <FormActions><Button level="primary" type="submit">Create project</Button></FormActions>
      </Form>
      <DemoFieldDialog open={naming} onOpenChange={setNaming} title={type ? `New ${type.name.toLowerCase()} project` : "New project"}
        description="Mekong Freight is the client. You can invite the team next."
        field={{ kind: "name", label: "Project name", placeholder: "Driver app" }} submitLabel="Create project" confirm={(name) => `${name} created`} />
    </>
  );
}

// ——— 2. Project marks in a table: Small Subtle marks in the media cell ——————————————————————————————————————
const clientProjects = projects.filter((p) => p.budget > 0);
const sortProjects = (rows: Project[], sort: TableSort | null) => {
  if (!sort) return rows;
  const dir = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => dir * (sort.columnId === "name" ? a.name.localeCompare(b.name) : sort.columnId === "due" ? a.due.getTime() - b.due.getTime() : a.budget - b.budget));
};

function ProjectTable() {
  const titleId = useId();
  const [sort, setSort] = useState<TableSort | null>({ columnId: "due", direction: "asc" });
  return (
    // A section of the page: its h4 names the table, which lies on the page with no container.
    <Stack as="section" gap="xs" aria-labelledby={titleId} className="px-dock-icon-fill">
      <Heading level={4} id={titleId} textStyle="Heading/4">Client projects</Heading>
      <Table aria-labelledby={titleId} rows={sortProjects(clientProjects, sort)} getRowId={(row) => row.id} sort={sort} onSortChange={setSort}
      columns={[
        { id: "name", header: "Project", sortable: true, cell: (row) => (
          <TableMedia media={<DockIcon icon={row.icon} theme={row.theme} background="subtle" size="sm" />} caption={row.client}>{row.name}</TableMedia>
        ) },
        { id: "lead", header: "Lead", width: "200px", cell: (row) => (
          <TableMedia media={<Avatar size="xs" {...avatarFor(person(row.lead))} />} bold={false}>{person(row.lead).name}</TableMedia>
        ) },
        { id: "status", header: "Status", width: "140px", cell: (row) => <TableBadges><Badge theme={projectStatusTheme[row.status]} background="subtle">{row.status}</Badge></TableBadges> },
        { id: "due", header: "Due", width: "150px", sortable: true, cell: (row) => <TableText>{formatDate(row.due)}</TableText> },
        { id: "budget", header: "Budget", align: "right", width: "140px", sortable: true, cell: (row) => <TableText>{formatMoney(row.budget, true)}</TableText> },
      ]} />
    </Stack>
  );
}

// ——— 3. Beside people: Dock Icons for system events, Avatars for people, both Medium ——————————————————————————
type Notice = { id: string; title: string; text: string; at: Date; unread: boolean } & ({ actor: string } | { icon: IconName; theme: DockIconTheme });
/** When each studio event happened (the shared activity feed), so every page tells the same story. */
const happened = (id: string) => activity.find((event) => event.id === id)!.at;
const paidInvoice = invoices.find((invoice) => invoice.number === "INV-2026-0141")!;
const overdueInvoice = invoices.find((invoice) => invoice.status === "Overdue")!;
const myLeave = leaveRequests.find((request) => request.person === "alex")!;
/** Newest first: people and studio events mixed, as they arrive. */
const notices: Notice[] = [
  { id: "n1", actor: "chi", title: people.chi.name, text: "Commented on Design the points history screen", at: happened("a1"), unread: true },
  { id: "n2", actor: "bao", title: people.bao.name, text: "Asked you to review Connect the rewards API to checkout", at: happened("a2"), unread: true },
  { id: "n3", icon: "icon-receipt-line", theme: "red", title: "Invoice overdue", text: `${overdueInvoice.number} to ${overdueInvoice.client} is ${formatDue(overdueInvoice.due)}`, at: daysFromToday(0, 9, 0), unread: true },
  { id: "n4", actor: "minhAnh", title: people.minhAnh.name, text: `Approved your leave for ${formatRange(myLeave.from, myLeave.to)}`, at: happened("a5"), unread: false },
  { id: "n5", icon: "icon-alarm-clock-line", theme: "yellow", title: "Timesheet due Friday", text: "Log this week's hours before 6:00 pm", at: daysFromToday(-2, 8, 0), unread: false },
  { id: "n6", icon: "icon-bank-note-01-line", theme: "green", title: "Payment received", text: `${paidInvoice.client} paid ${paidInvoice.number}, ${formatMoney(paidInvoice.amount, true)}`, at: happened("a6"), unread: false },
];

function Notifications() {
  const [items, setItems] = useState(notices);
  const [openId, setOpenId] = useState<string | null>(null);
  const unread = items.filter((n) => n.unread).length;
  const listRef = useRef<HTMLUListElement>(null);
  const open = (id: string) => { setOpenId(id); setItems((list) => list.map((n) => (n.id === id ? { ...n, unread: false } : n))); };
  // The button turns disabled once everything is read, so focus moves on to the first notification.
  const markAllRead = () => {
    setItems((list) => list.map((n) => ({ ...n, unread: false })));
    listRef.current?.querySelector<HTMLElement>(".zen-list-item__wrapper")?.focus();
  };
  return (
    // A ListBox: the title, its counter and Mark all as read in its Header-Slot, the notifications in its Body-Slot.
    <ListBox className="px-dock-icon-fill"
      header={<Stack direction="row" align="center" justify="between" gap="xs" wrap>
        <Stack direction="row" align="center" gap="2xs">
          <Heading level={4} textStyle="Heading/Subheading">Notifications</Heading>
          {unread ? <><BadgeCounter value={unread} aria-hidden="true" /><VisuallyHidden>{`${unread} unread`}</VisuallyHidden></> : null}
        </Stack>
        <Button level="tertiary" disabled={!unread} onClick={markAllRead}>Mark all as read</Button>
      </Stack>}>
      <List ref={listRef} aria-label="Notifications">
        {items.map((n) => (
          <ListItem key={n.id} selected={n.id === openId} title={n.title} titleLines={2} caption={`${n.text} · ${formatRelative(n.at)}`}
            leading={"actor" in n ? <Avatar size="md" {...avatarFor(person(n.actor))} /> : <DockIcon icon={n.icon} theme={n.theme} background="subtle" size="md" />}
            trailing={n.unread ? <Badge theme="accent" background="subtle">New</Badge> : undefined}
            onClick={() => open(n.id)} />
        ))}
      </List>
    </ListBox>
  );
}

// ——— 4. Emoji marks: Theme=Emoji for the leave types people pick themselves ————————————————————————————————————
/** The studio's leave types with the emoji they have on the HR pages; Alex's balance for 2026. */
const leaveTypes = [
  { id: "annual", emoji: "🏝️", name: "Annual leave", caption: "7 of 18 days left · resets Jan 1, 2027" },
  { id: "sick", emoji: "🤒", name: "Sick leave", caption: "10 of 12 days left" },
  { id: "family", emoji: "🏡", name: "Family leave", caption: "3 of 3 days left" },
  { id: "unpaid", emoji: "🧳", name: "Unpaid leave", caption: "No limit · talk to your lead first" },
];

function LeaveBalance() {
  return (
    <ListBox className="px-dock-icon-fill" header={<Heading level={4} textStyle="Heading/Subheading">Leave balance</Heading>}>
      <List aria-label="Leave balance">
        {leaveTypes.map((t) => (
          <ListItem key={t.id} title={t.name} caption={t.caption} leading={<DockIcon theme="emoji" emoji={t.emoji} size="md" />} />
        ))}
      </List>
    </ListBox>
  );
}

// ——— 5. On a phone: the Lumen Bank app — Subtle marks in the list, the Solid mark heads the detail ————————————————————
type Category = { name: string; icon: IconName; theme: DockIconTheme };
const categories = {
  coffee: { name: "Coffee", icon: "icon-coffee-cup-line", theme: "orange" },
  transport: { name: "Transport", icon: "icon-train-01-line", theme: "blue" },
  income: { name: "Income", icon: "icon-bank-note-01-line", theme: "green" },
  shopping: { name: "Shopping", icon: "icon-shopping-bag-01-line", theme: "purple" },
  bills: { name: "Bills", icon: "icon-lightning-01-line", theme: "yellow" },
  tickets: { name: "Tickets", icon: "icon-ticket-01-line", theme: "pink" },
} satisfies Record<string, Category>;
type Payment = { id: string; merchant: string; category: keyof typeof categories; amount: number; at: Date; reference: string };
/** A customer's last five days on the Everyday account, newest first. */
const payments: Payment[] = [
  { id: "p1", merchant: "Phin & Co – Thao Dien", category: "coffee", amount: -4.8, at: daysFromToday(0, 8, 12), reference: "LB-7730-1942" },
  { id: "p2", merchant: "Metro Line 1", category: "transport", amount: -0.6, at: daysFromToday(0, 7, 45), reference: "LB-7730-1938" },
  { id: "p3", merchant: "Saola Outdoor", category: "shopping", amount: -129, at: daysFromToday(-1, 18, 20), reference: "LB-7729-0588" },
  { id: "p4", merchant: "Mobile plan", category: "bills", amount: -9.5, at: daysFromToday(-1, 12, 40), reference: "LB-7729-0466" },
  { id: "p5", merchant: "Đìzai Studio", category: "income", amount: 3850, at: daysFromToday(-1, 9, 0), reference: "LB-7729-0417" },
  { id: "p6", merchant: "Phin & Co – District 3", category: "coffee", amount: -3.9, at: daysFromToday(-1, 8, 30), reference: "LB-7729-0391" },
  { id: "p7", merchant: "Hanoi Book Fair", category: "tickets", amount: -12, at: daysFromToday(-2, 19, 30), reference: "LB-7728-2291" },
  { id: "p8", merchant: "Electricity bill", category: "bills", amount: -38.2, at: daysFromToday(-2, 12, 0), reference: "LB-7728-2210" },
  { id: "p9", merchant: "Metro Line 1", category: "transport", amount: -0.6, at: daysFromToday(-2, 8, 5), reference: "LB-7728-2034" },
  { id: "p10", merchant: "Book Street", category: "shopping", amount: -16.4, at: daysFromToday(-3, 16, 30), reference: "LB-7727-1206" },
  { id: "p11", merchant: "Saola Outdoor refund", category: "income", amount: 24, at: daysFromToday(-3, 15, 10), reference: "LB-7727-1180" },
  { id: "p12", merchant: "Phin & Co – Thao Dien", category: "coffee", amount: -5.2, at: daysFromToday(-3, 10, 20), reference: "LB-7727-1022" },
  { id: "p13", merchant: "Riverside Cinema", category: "tickets", amount: -9, at: daysFromToday(-4, 19, 40), reference: "LB-7726-0988" },
  { id: "p14", merchant: "Water bill", category: "bills", amount: -11.6, at: daysFromToday(-4, 18, 0), reference: "LB-7726-0960" },
  { id: "p15", merchant: "Transfer from Linh Vo", category: "income", amount: 25, at: daysFromToday(-4, 13, 15), reference: "LB-7726-0874" },
];
/** "−$4.80" · "+$3,850.00": the sign is in the text, so colour is never the only signal. */
const signed = (n: number) => `${n < 0 ? "−" : "+"}${formatMoney(Math.abs(n), true)}`;
/** "Today" · "Yesterday" · "Monday": the day a group of payments belongs to. */
const dayLabel = (d: Date) => {
  const days = Math.round((daysFromToday(0, 0, 0).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86_400_000);
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : d.toLocaleString("en-US", { weekday: "long" });
};
const groups = payments.reduce<{ day: string; items: Payment[] }[]>((list, p) => {
  const day = dayLabel(p.at);
  const group = list.find((g) => g.day === day);
  if (group) group.items.push(p); else list.push({ day, items: [p] });
  return list;
}, []);

function PhoneSpending() {
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(null);
  const payment = payments.find((p) => p.id === openId);
  if (!payment) {
    return (
      // Spending is a tab root: its large title folds into the bar as the list scrolls under it.
      <PlatformPhone key="spending" label="Lumen Bank app" headerOverlay screenRef={screenRef}
        header={<TopNavigation title="Spending" largeTitle="Spending" scrollRef={screenRef} />}>
        {screen.anchor}
        {/* The day groups sit in the screen margin (Margin/Comfortable, 20px): rows and kickers share one start edge and
            the fills stay 8px off the screen edge. Kicker → rows xs (the rows pad 12px above themselves). */}
        <Stack gap="lg" paddingX="lg">
          {groups.map((group, index) => (
            <Stack key={group.day} as="section" gap="xs" aria-labelledby={`${baseId}-${index}`}>
              <Heading level={2} id={`${baseId}-${index}`} textStyle="Body/Small/Bold" tone="light">{group.day}</Heading>
              <List aria-labelledby={`${baseId}-${index}`}>
                {group.items.map((p) => {
                  const category = categories[p.category];
                  return (
                    <ListItem key={p.id} data-payment={p.id} title={p.merchant} caption={`${category.name} · ${formatTime(p.at)}`}
                      leading={<DockIcon icon={category.icon} theme={category.theme} background="subtle" size="md" />}
                      trailing={<Text as="span" textStyle="Body/Base/Bold" tone={p.amount > 0 ? "positive" : "strongest"}>{signed(p.amount)}</Text>}
                      onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(p.id))} />
                  );
                })}
              </List>
            </Stack>
          ))}
        </Stack>
      </PlatformPhone>
    );
  }
  const category = categories[payment.category];
  return (
    // A pushed screen: compact bar with Back, which returns focus to the row it came from.
    <PlatformPhone key={payment.id} label="Lumen Bank app" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact" title="Payment" scrollRef={screenRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[data-payment="${payment.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }} />}>
      {screen.anchor}
      <Stack gap="lg" padding="lg">
        {/* The detail repeats the list's mark, Large and Solid: same icon, same colour. */}
        <Metric size="xl" label={payment.merchant} value={signed(payment.amount)} icon={category.icon} iconTheme={category.theme} iconBackground="solid" />
        <DescriptionList divider items={[
          { term: "Category", description: category.name },
          { term: "Date", description: `${formatDate(payment.at)} at ${formatTime(payment.at)}` },
          { term: "Account", description: "Everyday account ··4821" },
          { term: "Reference", description: payment.reference },
        ]} />
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Choose a project type",
    description: "Large Solid Dock Icons lead selectable cards, each kind of work in the colour it has everywhere else in Zen. The mark is decorative because the name sits under it; Create project without a pick moves focus to the types and says what's missing.",
    wide: true,
    code: `const [typeId, setTypeId] = useState(null);

<Form onSubmit={() => (typeId ? setNaming(true) : setMissing(true))}>
  <FormFieldset legend="Project type" error={missing ? "Choose a project type to continue" : undefined}>
    <Grid minColumnWidth={280} gap="md">
      {projectTypes.map((type) => (
        <Card key={type.id} theme="border" selected={type.id === typeId} aria-pressed={type.id === typeId} onClick={() => setTypeId(type.id)}>
          <Stack gap="md">
            <DockIcon icon={type.icon} theme={type.theme} size="lg" />
            <Stack gap="xs">
              <Text as="span" textStyle="Body/Base/Bold">{type.name}</Text>
              <Text as="span" textStyle="Body/Small/Regular" tone="base">{type.caption}</Text>
            </Stack>
          </Stack>
        </Card>
      ))}
    </Grid>
  </FormFieldset>
  <FormActions><Button level="primary" type="submit">Create project</Button></FormActions>
</Form>`,
    render: () => <ChooseProjectType />,
  },
  {
    title: "Project marks in a table",
    description: "In a table the mark is Small and Subtle, inside TableMedia with the client as its caption; the Avatar in the Lead column is XSmall because it has no caption. Project, Due and Budget sort.",
    wide: true,
    code: `const [sort, setSort] = useState({ columnId: "due", direction: "asc" });

<Heading level={4} id="client-projects" textStyle="Heading/4">Client projects</Heading>
<Table aria-labelledby="client-projects" rows={sortProjects(projects, sort)} sort={sort} onSortChange={setSort}
  columns={[
    { id: "name", header: "Project", sortable: true, cell: (row) => (
      <TableMedia media={<DockIcon icon={row.icon} theme={row.theme} background="subtle" size="sm" />} caption={row.client}>
        {row.name}
      </TableMedia>
    ) },
    { id: "lead", header: "Lead", cell: (row) => <TableMedia media={<Avatar size="xs" {...avatarFor(lead)} />} bold={false}>{lead.name}</TableMedia> },
    { id: "status", header: "Status", cell: (row) => <TableBadges><Badge theme={projectStatusTheme[row.status]} background="subtle">{row.status}</Badge></TableBadges> },
    { id: "due", header: "Due", sortable: true, cell: (row) => <TableText>{formatDate(row.due)}</TableText> },
    { id: "budget", header: "Budget", align: "right", sortable: true, cell: (row) => <TableText>{formatMoney(row.budget, true)}</TableText> },
  ]} />`,
    render: () => <ProjectTable />,
  },
  {
    title: "Beside people",
    description: "People are Avatars and system events are Dock Icons, both Medium so the titles line up. Opening a notification marks it read, and Mark all as read clears the counter.",
    code: `<ListItem title={notice.title} titleLines={2} selected={notice.id === openId}
  caption={\`\${notice.text} · \${formatRelative(notice.at)}\`}
  leading={notice.actor
    ? <Avatar size="md" {...avatarFor(people[notice.actor])} />
    : <DockIcon icon="icon-bank-note-01-line" theme="green" background="subtle" size="md" />}
  trailing={notice.unread ? <Badge theme="accent" background="subtle">New</Badge> : undefined}
  onClick={() => open(notice.id)} />`,
    render: () => <Notifications />,
  },
  {
    title: "Emoji marks",
    description: "Theme=Emoji draws any emoji at the Dock Icon size, here the leave types the studio chose for its HR pages. One list, one size: every row is Medium.",
    code: `<ListBox header={<Heading level={4} textStyle="Heading/Subheading">Leave balance</Heading>}>
  <List aria-label="Leave balance">
    <ListItem title="Annual leave" caption="7 of 18 days left · resets Jan 1, 2027"
      leading={<DockIcon theme="emoji" emoji="🏝️" size="md" />} />
    <ListItem title="Sick leave" caption="10 of 12 days left"
      leading={<DockIcon theme="emoji" emoji="🤒" size="md" />} />
  </List>
</ListBox>`,
    render: () => <LeaveBalance />,
  },
  {
    title: "Spending on a phone",
    description: "In the Lumen Bank app each category keeps one icon and colour: Subtle and Medium in the list, Solid and Large at the top of the payment it opens. Back returns to the list, on the row you opened.",
    code: `const screenRef = useRef<HTMLDivElement>(null);

{/* One key per screen, so each opens at the top and the title folds again */}
<PlatformPhone key="spending" headerOverlay screenRef={screenRef}
  header={<TopNavigation title="Spending" largeTitle="Spending" scrollRef={screenRef} />}>
  {/* In the screen margin (20px); kicker → rows xs */}
  <Stack gap="lg" paddingX="lg">
    <Stack as="section" gap="xs" aria-labelledby="today">
      <Heading level={2} id="today" textStyle="Body/Small/Bold" tone="light">Today</Heading>
      <List aria-labelledby="today">
        <ListItem title={payment.merchant} caption={\`\${category.name} · \${formatTime(payment.at)}\`}
          leading={<DockIcon icon={category.icon} theme={category.theme} background="subtle" size="md" />}
          trailing={<Text as="span" textStyle="Body/Base/Bold">{signed(payment.amount)}</Text>}
          onClick={() => setOpenId(payment.id)} />
      </List>
    </Stack>
  </Stack>
</PlatformPhone>

{/* The payment screen: the same mark, Large and Solid */}
<PlatformPhone key={payment.id} headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact" title="Payment" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => setOpenId(null) }} />}>
  <Metric size="xl" label={payment.merchant} value={signed(payment.amount)}
    icon={category.icon} iconTheme={category.theme} iconBackground="solid" />
</PlatformPhone>`,
    render: () => <PhoneSpending />,
  },
]);
