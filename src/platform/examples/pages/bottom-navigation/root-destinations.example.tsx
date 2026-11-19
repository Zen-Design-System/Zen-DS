import { useId, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  AppShell, Avatar, BottomNavigation, Box, DescriptionList, DockIcon, Heading, List, ListBox, ListItem, Stack, TopNavigation,
  type BottomNavigationItem, type DockIconTheme, type IconName,
} from "@zen-ds/react";
import {
  TODAY, daysFromToday, formatDay, formatDue, formatRelative, formatTime, initials, leaveRequests, me, people, projectById, projects, tasks,
  type Person, type PersonId, type ProjectStatus,
} from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. The row title already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);

/** One group of a grouped list: a ListBox under the kicker that names it. Rows have no padding of their own, so the
    ListBox's Card-padding-medium (20px on a phone) insets them; the kicker lines up with the row text (lg). No border
    or shadow: white on the Canvas already separates it. */
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

/** The studio app's four root screens, one tap apart in the tab bar. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function RootDestinations({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const shellRef = useRef<HTMLDivElement>(null);
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
  // Tapping the current destination again scrolls it back to the top; another destination opens at its top. What
  // scrolls is the scroller passed as scrollRef, or the page itself in your app.
  const open = (id: string) => {
    const behavior = id === tab ? "smooth" : "auto";
    if (scrollRef === "window") shellRef.current?.scrollIntoView({ behavior });
    else scrollRef.current?.scrollTo({ top: 0, behavior });
    setTab(id as StudioTab);
    if (id === "inbox") setUnread(0);
  };
  const title = studioTabs[tab];
  return (
    // Home and Projects split their rows under kickers, so they are grouped lists (white ListBoxes on the Canvas) with
    // the Alt bar; Inbox and Profile are single lists.
    <AppShell ref={shellRef}
      topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title={title} largeTitle={title} />}
      bottomNavigation={<BottomNavigation items={items} value={tab} onValueChange={open} />}>
      {/* Groups lg apart. */}
      {tab === "home" ? (
        <Stack gap="lg">
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
        <Stack gap="lg">
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
        <List aria-label="Notifications">
          {inbox.map((item) => (
            <ListItem key={item.id} title={people[item.actor].name} caption={`${item.text} · ${formatRelative(item.at)}`} leading={<Avatar size="md" {...avatarOf(people[item.actor])} />} />
          ))}
        </List>
      ) : null}
      {tab === "profile" ? (
        <Stack gap="md">
          <List aria-label="Signed in as">
            <ListItem title={me.name} caption={`${me.role} · ${me.team}`} leading={<Avatar size="md" theme="photo" src={me.photo} alt="" />} />
          </List>
          <DescriptionList items={[
            { term: "Email", description: me.email },
            { term: "Location", description: me.location },
            { term: "Projects", description: String(projects.filter((project) => project.members.includes("alex")).length) },
          ]} />
        </Stack>
      ) : null}
    </AppShell>
  );
}
