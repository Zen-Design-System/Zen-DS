import { useId, useState, type ReactNode, type RefObject } from "react";
import {
  AppShell, Avatar, Card, DescriptionList, DockIcon, EmptyState, Heading, Link, List, ListBox, ListItem, Sidebar, SidebarMenuItem, Stack, Text, Thumbnail,
  TopNavigation, plural, useToast,
  type IconName, type SidebarSection,
} from "@zen-ds/react";
import {
  activity, daysFromToday, formatDate, formatDay, formatDue, initials, me, people, plans, projectById, projects, studio, tasks, workspacePlan,
  type Activity, type Person, type Task,
} from "../../data";

type Row = { id: string; title: string; caption: string; leading: ReactNode; trailing?: ReactNode; onClick?: () => void };

const personAvatar = (p: Person) => p.photo
  ? <Avatar size="medium" theme="photo" src={p.photo} alt="" />
  : <Avatar size="medium" theme={p.theme} alt="">{initials(p.name)}</Avatar>;
const itemIcon = (icon: IconName) => <DockIcon icon={icon} theme="neutral" background="subtle" size="medium" />;
const firstName = (p: Person) => p.name.split(" ")[0];
/** The caption follows the status: open work shows when it is due, finished work when it was done. */
const taskWhen = (t: Task) => (t.status === "Done" ? `Done ${formatDay(t.due)}` : formatDue(t.due));

/** A phone section: rows in a Default box on the grey Canvas, titled (Heading/Subheading and See all) or named by `label`. */
function PhoneList({ label, rows, titled = false, seeAll }: { label: string; rows: Row[]; titled?: boolean; seeAll?: () => void }) {
  const headingId = useId();
  return (
    <ListBox as="section" aria-label={titled ? undefined : label} aria-labelledby={titled ? headingId : undefined} header={titled ? (
      <Stack direction="row" justify="between" align="center" gap="xs">
        <Heading level={2} id={headingId} textStyle="Heading/Subheading">{label}</Heading>
        {seeAll ? <Text as="span" textStyle="Body/Small/Bold"><Link as="button" tone="inherit" onClick={seeAll}>See all</Link></Text> : null}
      </Stack>
    ) : undefined}>
      <List aria-label={titled ? undefined : label} aria-labelledby={titled ? headingId : undefined}>
        {rows.map(({ id, ...row }) => <ListItem key={id} as="li" titleLines={2} {...row} />)}
      </List>
    </ListBox>
  );
}

/* The studio's mark and name: the mark is a 2xs Thumbnail that fits the Sidebar's 24px logo slot. */
const studioLogo = <Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>;
const openProjects = projects.filter((p) => p.status !== "Completed");
const tasksOf = (projectId: string) => tasks.filter((t) => t.project === projectId);
const dueThisWeek = tasks.filter((t) => t.status !== "Done" && t.due <= daysFromToday(7)).sort((a, b) => +a.due - +b.due).slice(0, 5);
/** The studio’s plan, from the shared price list: Business, 48 seats, billed monthly. */
const studioPlan = plans.find((plan) => plan.id === workspacePlan.plan)!;
const myTaskIds = ["t5", "t2", "t8"]; // assigned to Alex, or waiting for his review
const helpRows: Row[] = [
  { id: "shortcuts", title: "Keyboard shortcuts", caption: "Move around Zen without the mouse", leading: itemIcon("icon-keyboard-line") },
  { id: "invite", title: "Invite your team", caption: "Add people and choose what they can see", leading: itemIcon("icon-users-plus-line") },
  { id: "figma", title: "Connect Figma", caption: "Show live designs on tasks and reviews", leading: itemIcon("icon-link-01-line") },
];

/** On a phone the Sidebar is the AppShell drawer: the Top Navigation’s menu button slides it in; a pick closes it.
 *  `scrollRef`: what scrolls the screen, so the large title folds into the bar as it scrolls ("window" in your app). */
export default function SidebarOnPhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [page, setPage] = useState("home");
  const [navOpen, setNavOpen] = useState(false);
  const [unread, setUnread] = useState(true);
  // A new page starts at its top (in your app, your router's scroll restoration does this for the window).
  const go = (id: string) => { setPage(id); if (scrollRef !== "window") scrollRef.current?.scrollTo({ top: 0 }); };
  const sections: SidebarSection[] = [
    { items: [
      { id: "home", label: "Home", icon: "icon-home-03-line" },
      { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line", counter: unread ? 3 : undefined },
      { id: "my-tasks", label: "My tasks", icon: "icon-check-square-line", counter: myTaskIds.length },
    ] },
    { label: "Projects", items: openProjects.map((p) => ({ id: p.id, label: p.name, icon: p.icon })) },
  ];
  const project = openProjects.find((p) => p.id === page);
  const taskList = (label: string, list: Task[], titled = false) => <PhoneList label={label} titled={titled} rows={list.map((t) => ({
    id: t.id, title: t.title, caption: `${projectById(t.project).name} · ${taskWhen(t)}`, leading: personAvatar(people[t.assignee]),
    onClick: () => toast({ title: t.key, children: `${t.title} · ${people[t.assignee].name}` }),
  }))} />;
  const messages = (list: Activity[], titled = false, seeAll?: () => void) => <PhoneList label={titled ? "Recent activity" : "Messages"} titled={titled} seeAll={seeAll} rows={list.map((a) => ({
    id: a.id, title: people[a.actor].name, caption: `${a.verb[0].toUpperCase()}${a.verb.slice(1)} ${a.object}`, leading: personAvatar(people[a.actor]),
    onClick: () => toast({ title: people[a.actor].name, children: `${a.verb[0].toUpperCase()}${a.verb.slice(1)} ${a.object}` }),
  }))} />;
  let title: string;
  let content: ReactNode;
  if (project) {
    title = project.name;
    content = <>
      <Text tone="light">{`${project.client} · ${project.progress}% done · Due ${formatDate(project.due)}`}</Text>
      {tasksOf(project.id).length ? taskList(`${project.name} tasks`, tasksOf(project.id)) : (
        <EmptyState headingLevel={2} size="sm" icon="icon-check-square-line" title="No tasks yet">Tasks added to {project.name} show up here.</EmptyState>
      )}
    </>;
  } else if (page === "inbox") {
    title = "Inbox";
    content = <>
      <Text tone="light">{unread ? plural(3, "unread message") : "You’re all caught up."}</Text>
      {messages(activity)}
    </>;
  } else if (page === "my-tasks") {
    title = "My tasks";
    content = <><Text tone="light">Assigned to you or waiting for your review</Text>{taskList("My tasks", tasks.filter((t) => myTaskIds.includes(t.id)))}</>;
  } else if (page === "settings") {
    title = "Settings";
    content = <Card theme="default"><DescriptionList items={[{ term: "Workspace", description: studio.name }, { term: "Plan", description: `${studioPlan.name} · ${plural(workspacePlan.seats, "seat")}` }, { term: "Signed in as", description: me.email }]} /></Card>;
  } else if (page === "help") {
    title = "Help";
    content = <PhoneList label="Help articles" rows={helpRows.map((row) => ({ ...row, onClick: () => toast({ title: row.title, children: row.caption }) }))} />;
  } else {
    title = "Home";
    content = <>
      <Text tone="light">{`Good morning, ${firstName(me)}. ${plural(dueThisWeek.length, "task")} across your projects are due this week.`}</Text>
      {taskList("Due this week", dueThisWeek, true)}
      {messages(activity.slice(0, 3), true, () => go("inbox"))}
    </>;
  }
  return (
    <AppShell navOpen={navOpen} onNavOpenChange={setNavOpen}
      sidebar={(
        <Sidebar logo={studioLogo} sections={sections} selectedId={page} onItemClick={(item) => go(item.id)}
          footer={<>
            <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
            <SidebarMenuItem id="help" label="Help" icon="icon-help-circle-line" />
          </>} />
      )}
      // Too many destinations for a bottom bar (every project, Settings, Help): the menu button opens the drawer.
      topNavigation={(
        <TopNavigation title={title} largeTitle={title} scrollRef={scrollRef}
          leading={{ icon: "icon-menu-01-line", label: "Open navigation", onClick: () => setNavOpen(true) }}
          trailing={[{ icon: "icon-bell-01-line", label: unread ? "Notifications, 3 new" : "Notifications", dot: unread, onClick: () => { setUnread(false); go("inbox"); } }]} />
      )}
    >
      {content}
    </AppShell>
  );
}
