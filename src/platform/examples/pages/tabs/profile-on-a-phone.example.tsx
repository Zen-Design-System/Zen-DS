import { useId, useRef, useState, type RefObject } from "react";
import {
  AppShell, Avatar, Badge, BadgeStatus, BottomNavigation, DescriptionList, DockIcon, EmptyState, Heading, List, ListItem, Stack, TabPanel, Tabs, Text,
  TopNavigation, plural, useToast,
  type BottomNavigationItem, type IconName,
} from "@zen-ds/react";
import {
  TODAY, activity, daysFromToday, files, formatDate, formatRange, formatRelative, initials, leaveRequests, leaveStatusTheme, people, peopleList,
  projectProgress, projectStep, projects, studio,
  type Person, type PersonId,
} from "../../data";

/** A person as an Avatar: their photo, or initials on their steady theme. */
const avatar = (p: Person) => p.photo
  ? <Avatar size="medium" theme="photo" src={p.photo} alt="" />
  : <Avatar size="medium" theme={p.theme} alt="">{initials(p.name)}</Avatar>;

// Time off is the studio's shared leave (the same requests the Button page approves): what is booked or waiting, from
// today on. A declined request never happens, so it is left out.
const upcomingLeave = (id: PersonId) => leaveRequests
  .filter((l) => l.person === id && l.to >= daysFromToday(0, 0, 0) && (l.status === "Approved" || l.status === "Pending"))
  .sort((a, b) => a.from.getTime() - b.from.getTime());
// Each team's lead is its people's manager; leads report to no one in this list.
const leadOf: Record<Person["team"], PersonId> = { Design: "alex", Engineering: "finn", Delivery: "duy", "Client Services": "hana", Operations: "minhAnh" };
const directory = [...peopleList].sort((a, b) => a.name.localeCompare(b.name));
const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);

type ActivityRow = { id: string; icon: IconName; title: string; verb: string; at: Date };
// Chi's last two weeks, newest first; other people show their files and the studio feed.
const chiActivity: ActivityRow[] = [
  { id: "c1", icon: "icon-message-circle-line", title: "Design the points history screen", verb: "Commented", at: minutesAgo(0.2) },
  { id: "c2", icon: "icon-upload-01-line", title: "Loyalty app – points history.fig", verb: "Updated", at: minutesAgo(13) },
  { id: "c3", icon: "icon-switch-horizontal-01-line", title: "Write guidelines for the Metric card", verb: "Moved to In review", at: daysFromToday(0, 9, 5) },
  { id: "c4", icon: "icon-eye-line", title: "Metric card guide", verb: `Asked ${people.alex.name} to review`, at: daysFromToday(-1, 17, 20) },
  { id: "c5", icon: "icon-message-circle-line", title: "Connect the rewards API to checkout", verb: "Commented", at: daysFromToday(-1, 15, 2) },
  { id: "c6", icon: "icon-calendar-check-line", title: "Annual leave, Oct 19 – Oct 21", verb: "Requested", at: daysFromToday(-3, 16, 45) },
  { id: "c7", icon: "icon-share-01-line", title: "Points history prototype", verb: "Shared with Phin & Co", at: daysFromToday(-2, 10, 15) },
  { id: "c8", icon: "icon-message-circle-line", title: "Rewards API contract.json", verb: "Commented", at: daysFromToday(-2, 9, 40) },
  { id: "c9", icon: "icon-switch-horizontal-01-line", title: "Design the points history screen", verb: "Moved to In progress", at: daysFromToday(-5, 14, 0) },
  { id: "c10", icon: "icon-plus-circle-line", title: "Write the rewards FAQ", verb: "Created", at: daysFromToday(-6, 11, 20) },
  { id: "c11", icon: "icon-upload-01-line", title: "Rewards checkout flow.fig", verb: "Uploaded", at: daysFromToday(-7, 16, 10) },
  { id: "c12", icon: "icon-check-circle-line", title: "Draw the loyalty tier badges", verb: "Approved", at: daysFromToday(-8, 10, 0) },
  { id: "c13", icon: "icon-message-circle-line", title: "Audit the account overview for WCAG 2.2", verb: "Commented", at: daysFromToday(-12, 15, 30) },
  { id: "c14", icon: "icon-upload-01-line", title: "Tier badge exploration.fig", verb: "Uploaded", at: daysFromToday(-13, 9, 45) },
];
const activityOf = (id: PersonId): ActivityRow[] => id === "chi" ? chiActivity : [
  ...activity.filter((a) => a.actor === id).map((a) => ({ id: a.id, icon: "icon-message-circle-line" as IconName, title: a.object, verb: `${a.verb[0].toUpperCase()}${a.verb.slice(1)}`, at: a.at })),
  ...files.filter((f) => f.owner === id).map((f) => ({ id: f.id, icon: "icon-upload-01-line" as IconName, title: f.name, verb: "Updated", at: f.updated })),
].sort((a, b) => b.at.getTime() - a.at.getTime());

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "projects", label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
  { id: "people", label: "People", icon: "icon-users-line", selectedIcon: "icon-users-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneProfile({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  // One idPrefix per rendered example, so tab and panel ids stay unique when the page shows it twice.
  const prefix = `profile-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const { toast } = useToast();
  /** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the tabs." });
  const activityId = useId();
  const [personId, setPersonId] = useState<PersonId | null>("chi");
  const [fromId, setFromId] = useState<PersonId>("chi");
  const [tab, setTab] = useState("about");
  // Focus follows the screen: a profile focuses its title, Back returns to the row of the person that was open.
  const shellRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  // Each screen opens at its top: the screen's scroller, or the page in your app ("window").
  const toTop = () => (scrollRef === "window" ? shellRef.current?.scrollIntoView() : scrollRef.current?.scrollTo({ top: 0 }));
  const openPerson = (p: Person) => {
    toTop();
    setPersonId(p.id as PersonId);
    setFromId(p.id as PersonId);
    setTab("about");
    setTimeout(() => titleRef.current?.focus());
  };
  const back = () => {
    toTop();
    setPersonId(null);
    setTimeout(() => rowRef.current?.focus());
  };

  if (!personId) {
    return (
      // The People root: the large title, the directory and the app's roots in the bottom bar. The Body pads the screen,
      // so the rows (no side padding of their own) line up with the title. One key per screen: the large title folds again.
      <AppShell key="root" ref={shellRef}
        topNavigation={<TopNavigation title="People" largeTitle="People" largeTitleSubheading={`${plural(directory.length, "person", "people")} at ${studio.name}`} scrollRef={scrollRef} />}
        bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={phoneRoots} value="people"
          onValueChange={(id) => { if (id !== "people") notHere(phoneRoots.find((item) => item.id === id)?.label ?? id); }} />}
      >
        <List aria-label="People">
          {directory.map((p) => (
            <ListItem key={p.id} ref={p.id === fromId ? rowRef : undefined} tabIndex={p.id === fromId ? -1 : undefined}
              title={p.name} caption={`${p.role} · ${p.location}`} leading={avatar(p)} onClick={() => openPerson(p)} />
          ))}
        </List>
      </AppShell>
    );
  }

  const person = people[personId];
  const personProjects = projects.filter((p) => p.members.includes(personId));
  const leave = upcomingLeave(personId);
  const recent = activityOf(personId);
  const lead = leadOf[person.team];
  return (
    // A child screen: the compact bar with Back and the person's name, the three sections as full-width tabs in its
    // control bar (pinned while the panel scrolls), no bottom bar.
    <AppShell key={personId} ref={shellRef}
      topNavigation={(
        <TopNavigation type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>{person.name}</span>} scrollRef={scrollRef}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }}
          // Two to four tabs share the phone's width evenly; the bar stays pinned under the title.
          controlBar={<Tabs idPrefix={prefix} fullWidth aria-label={`${person.name} sections`} value={tab} onValueChange={setTab} items={[
            { id: "about", label: "About" },
            { id: "projects", label: "Projects", badge: personProjects.length || undefined },
            { id: "time-off", label: "Time off" },
          ]} />} />
      )}
    >
      <TabPanel idPrefix={prefix} id="about" hidden={tab !== "about"}>
        {/* The Body pads the screen and keeps the panel's two sections apart. */}
        <Stack gap="xl">
          <Stack gap="md">
            <Stack direction="row" gap="sm" align="center">
              {person.photo ? <Avatar size="xlarge" theme="photo" src={person.photo} alt="" /> : <Avatar size="xlarge" theme={person.theme} alt="">{initials(person.name)}</Avatar>}
              <Stack gap="xs">
                <Text textStyle="Body/Base/Bold">{person.role}</Text>
                <Text textStyle="Body/Small/Regular" tone="base">{person.location}</Text>
              </Stack>
            </Stack>
            <DescriptionList divider items={[
              { term: "Team", description: person.team },
              { term: "Email", description: person.email },
              ...(lead === personId ? [] : [{ term: "Manager", description: people[lead].name }]),
            ]} />
          </Stack>
          <Stack as="section" gap="xs" aria-labelledby={activityId}>
            <Heading level={2} id={activityId} textStyle="Body/Small/Bold" tone="light">Recent activity</Heading>
            {recent.length ? (
              <List aria-labelledby={activityId}>
                {recent.map((a) => (
                  // The task or file name is the entry and nothing else shows it in full: up to two lines.
                  <ListItem key={a.id} title={a.title} titleLines={2} caption={`${a.verb} · ${formatRelative(a.at)}`}
                    leading={<DockIcon icon={a.icon} theme="neutral" background="subtle" size="medium" />} />
                ))}
              </List>
            ) : (
              <Text textStyle="Body/Small/Regular" tone="base">{`Nothing from ${person.name.split(" ")[0]} in the last two weeks.`}</Text>
            )}
          </Stack>
        </Stack>
      </TabPanel>
      <TabPanel idPrefix={prefix} id="projects" hidden={tab !== "projects"}>
        {personProjects.length ? (
          // Static rows (nothing opens them) sit in the screen margin the Body pads.
          <List aria-label="Projects">
            {personProjects.map((p) => (
              <ListItem key={p.id} title={p.name} caption={p.client} leading={<DockIcon icon={p.icon} theme={p.theme} background="subtle" size="medium" />}
                trailing={<BadgeStatus status={projectStep[p.status]} progress={projectProgress(p)}>{p.status}</BadgeStatus>} />
            ))}
          </List>
        ) : (
          <EmptyState headingLevel={2} icon="icon-folder-line" title="No projects yet">Projects {person.name.split(" ")[0]} joins show up here.</EmptyState>
        )}
      </TabPanel>
      <TabPanel idPrefix={prefix} id="time-off" hidden={tab !== "time-off"}>
        {leave.length ? (
          <List aria-label="Time off">
            {leave.map((l) => (
              <ListItem key={l.id} title={l.kind} caption={`${l.days > 1 ? formatRange(l.from, l.to) : formatDate(l.from)} · ${plural(l.days, "day")}`}
                leading={<DockIcon icon={l.kind === "Sick leave" ? "icon-medical-cross-line" : "icon-plane-line"} theme="neutral" background="subtle" size="medium" />}
                trailing={<Badge theme={leaveStatusTheme[l.status]} background="subtle">{l.status}</Badge>} />
            ))}
          </List>
        ) : (
          <EmptyState headingLevel={2} icon="icon-calendar-heart-line" title="No time off yet">Leave {person.name.split(" ")[0]} books shows up here.</EmptyState>
        )}
      </TabPanel>
    </AppShell>
  );
}
