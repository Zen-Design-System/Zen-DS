import { useId, useState, type ReactNode, type RefObject } from "react";
import {
  AlertBanner, AppShell, Avatar, BottomNavigation, DockIcon, Heading, List, ListBox, ListItem, Text, TopNavigation, plural, useToast,
  type AlertBannerTheme, type IconName,
} from "@zen-ds/react";
import { TODAY, activity, daysFromToday, formatDate, formatDue, formatTime, initials, people, projectById, projects, type Person } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, background: "subtle" as const, children: initials(person.name) };
const openProjects = projects.filter((project) => project.status !== "Completed");

type Connection = "offline" | "reconnecting" | "online" | "idle";
const connectionBanner: Record<Exclude<Connection, "idle">, { theme: AlertBannerTheme; leading: IconName; message: string }> = {
  offline: { theme: "negative", leading: "icon-wifi-off-line", message: `You’re offline. Showing tasks from ${formatTime(daysFromToday(0, 10, 12))}.` },
  reconnecting: { theme: "info", leading: "icon-refresh-cw-01-line", message: "Reconnecting…" },
  online: { theme: "positive", leading: "icon-wifi-line", message: "Back online. Your tasks are up to date." },
};
/** Alex’s open tasks, soonest first: the list the phone kept from its last sync. */
type PhoneTask = { id: string; title: string; project: string; due: Date };
const myTasks: PhoneTask[] = [
  { id: "m1", title: "Audit the account overview", project: "lumen-banking", due: daysFromToday(0, 17, 0) },
  { id: "m2", title: "Review Chi’s points history screen", project: "phin-loyalty", due: daysFromToday(0, 18, 0) },
  { id: "m3", title: "Sign off the transfer flow prototype", project: "lumen-banking", due: daysFromToday(1) },
  { id: "m4", title: "Review the Metric card guidelines", project: "zen-ds", due: daysFromToday(1) },
  { id: "m5", title: "Prepare the Lumen Bank review", project: "lumen-banking", due: daysFromToday(2) },
  { id: "m6", title: "Approve Gia’s moodboard", project: "saola-brand", due: daysFromToday(2) },
  { id: "m7", title: "Pick the icon set for Dock Icons", project: "zen-ds", due: daysFromToday(3) },
  { id: "m8", title: "Write the QA handoff notes", project: "lumen-banking", due: daysFromToday(3) },
  { id: "m9", title: "Test the Android build with Em", project: "phin-loyalty", due: daysFromToday(5) },
  { id: "m10", title: "Update the dark mode tokens", project: "zen-ds", due: daysFromToday(6) },
  { id: "m11", title: "Check checkout copy with Linh", project: "phin-loyalty", due: daysFromToday(7) },
  { id: "m12", title: "Brief Emi on the launch motion", project: "saola-brand", due: daysFromToday(8) },
  { id: "m13", title: "Read Ava’s usability report", project: "lumen-banking", due: daysFromToday(9) },
  { id: "m14", title: "Plan the Zen 0.5 release", project: "zen-ds", due: daysFromToday(13) },
];
/** Assigned while the phone was offline: it arrives with the sync. */
const newTask: PhoneTask = { id: "m-new", title: "Review Bao’s rewards API", project: "phin-loyalty", due: daysFromToday(1, 12, 0) };
/** The list in sections by when it is due: up to and including `within` days from today. */
const dueGroups: { id: string; label: string; within: number }[] = [
  { id: "today", label: "Today", within: 0 },
  { id: "tomorrow", label: "Tomorrow", within: 1 },
  { id: "week", label: "This week", within: 7 },
  { id: "later", label: "Later", within: Infinity },
];
const daysAway = (d: Date) => Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(TODAY).setHours(0, 0, 0, 0)) / 86_400_000);
type PhoneTab = "home" | "my-tasks" | "inbox" | "projects";
const phoneTabs = [
  { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
  { id: "my-tasks", label: "My tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line", selectedIcon: "ic-inbox-01-solid" },
  { id: "projects", label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
] satisfies { id: PhoneTab; label: string; icon: IconName; selectedIcon: IconName }[];

/** A phone section: rows in a Default box on the grey Canvas, under a Heading/Subheading. */
function PhoneSection({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <ListBox as="section" aria-labelledby={id} header={<Heading level={2} id={id} textStyle="Heading/Subheading">{label}</Heading>}>
      <List aria-labelledby={id}>{children}</List>
    </ListBox>
  );
}

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function OfflinePhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [tab, setTab] = useState<PhoneTab>("my-tasks");
  const [connection, setConnection] = useState<Connection>("offline");
  const [updated, setUpdated] = useState(daysFromToday(0, 10, 12));
  const [checking, setChecking] = useState(false);
  // The Small banner follows the connection: Negative offline, Info while it reconnects, Positive for a moment once back.
  const sync = () => {
    // Online already: check for changes; the line under the list says when the tasks were last updated.
    if (connection === "idle") { setChecking(true); setTimeout(() => { setChecking(false); setUpdated(TODAY); }, 800); return; }
    setConnection("reconnecting");
    setTimeout(() => { setConnection("online"); setUpdated(TODAY); }, 1200);
    setTimeout(() => setConnection("idle"), 4200);
  };
  const offline = connection === "offline" || connection === "reconnecting";
  const list = offline ? myTasks : [...myTasks, newTask].sort((a, b) => +a.due - +b.due);
  const banner = connection === "idle" ? null : connectionBanner[connection];
  const title = phoneTabs.find((item) => item.id === tab)!.label;
  const taskRow = (task: PhoneTask) => {
    const project = projectById(task.project);
    return (
      <ListItem key={task.id} title={task.title} titleLines={2} caption={`${project.name} · ${formatDue(task.due)}`}
        leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />}
        onClick={() => toast({ title: task.title, children: offline ? "Saved on this phone; changes sync once you’re back online." : `${project.name} · ${formatDue(task.due)}` })} />
    );
  };
  const status = <Text textStyle="Caption/Regular" tone="light" role="status">{checking ? "Checking for updates…" : `Updated ${updated === TODAY ? "just now" : formatTime(updated)}`}</Text>;

  let content: ReactNode;
  if (tab === "home") {
    const today = list.filter((task) => daysAway(task.due) <= 0);
    content = <>
      <Text tone="light">{`Good morning, Alex. ${plural(today.length, "task")} due today, ${plural(list.length, "open task")} in all.`}</Text>
      <PhoneSection label="Due today">{today.map(taskRow)}</PhoneSection>
      <PhoneSection label="Next up">{list.filter((task) => daysAway(task.due) > 0).slice(0, 3).map(taskRow)}</PhoneSection>
      {status}
    </>;
  } else if (tab === "inbox") {
    content = <>
      <Text tone="light">{offline ? "Messages from your last sync. New ones arrive when you’re back online." : plural(activity.filter((a) => a.unread).length, "unread message")}</Text>
      <PhoneSection label="Messages">
        {activity.map((a) => (
          <ListItem key={a.id} title={people[a.actor].name} titleLines={2} caption={`${a.verb[0].toUpperCase()}${a.verb.slice(1)} ${a.object}`} leading={<Avatar size="md" {...avatarOf(people[a.actor])} />}
            onClick={() => toast({ title: people[a.actor].name, children: `${a.verb[0].toUpperCase()}${a.verb.slice(1)} ${a.object}` })} />
        ))}
      </PhoneSection>
    </>;
  } else if (tab === "projects") {
    content = (
      <PhoneSection label="Your projects">
        {openProjects.map((p) => (
          <ListItem key={p.id} title={p.name} caption={`${p.client} · ${p.progress}% done`} leading={<DockIcon icon={p.icon} theme={p.theme} background="subtle" size="md" />}
            onClick={() => toast({ title: p.name, children: `${p.client} · Due ${formatDate(p.due)}` })} />
        ))}
      </PhoneSection>
    );
  } else {
    content = <>
      {dueGroups.map((group, index) => {
        const after = index ? dueGroups[index - 1].within : -Infinity;
        const rows = list.filter((task) => daysAway(task.due) > after && daysAway(task.due) <= group.within);
        return rows.length ? <PhoneSection key={group.id} label={group.label}>{rows.map(taskRow)}</PhoneSection> : null;
      })}
      {status}
    </>;
  }

  return (
    <AppShell
      // The status banner is the Top Navigation’s (its `banner` slot, the phone’s AppShell banner): pinned under the
      // bar, edge to edge, it never scrolls away. It is the app’s condition, so it stays on every tab.
      topNavigation={(
        <TopNavigation scrollRef={scrollRef} title={title} largeTitle={title}
          trailing={[{ icon: "icon-refresh-cw-01-line", label: "Sync now", onClick: sync, disabled: connection === "reconnecting" }]}
          banner={banner ? <AlertBanner size="small" theme={banner.theme} leading={banner.leading}>{banner.message}</AlertBanner> : undefined} />
      )}
      bottomNavigation={<BottomNavigation aria-label="Zen app" value={tab} onValueChange={(next) => setTab(next as PhoneTab)} showLabels items={phoneTabs} />}
    >
      {content}
    </AppShell>
  );
}
