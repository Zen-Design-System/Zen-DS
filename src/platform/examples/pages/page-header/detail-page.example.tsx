import { Fragment, useId, useRef, useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Badge, Button, Card, DescriptionList, DockIcon, EmptyState, Grid, Heading, List,
  ListBox, ListItem, Menu, PageHeader, Sidebar, SidebarMenuItem, Stack, TabPanel, Tabs, Text, Thumbnail, plural, useToast, useZen,
  type SidebarItem, type SidebarSection,
} from "@zen-ds/react";
import {
  TODAY, activity, daysFromToday, formatRange, formatRelative, initials, leaveRequests, leaveStatusTheme, me, people, studio,
  type LeaveRequest, type LeaveStatus, type Person, type PersonId,
} from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

/** A row caption of whole values: it wraps between values, never inside a date or a name; each "· " stays with the value it introduces, so no line ends on a dot. */
const wholeValues = (...values: (string | false)[]) => values.filter((value): value is string => Boolean(value)).map((value, index) => (
  <Fragment key={`${index}:${value}`}>{index ? " " : null}{whole(`${index ? "· " : ""}${value}`)}</Fragment>
));
/** A run of words that never breaks: its spaces are no-break spaces. */
const whole = (text: string) => text.replace(/ /g, " ");

// ——— The app around the page ————————————————————————————————————————————————————————————————————————
/* Đìzai Studio's navigation: the same Sidebar on every page, its current page selected. */
const studioNav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "clients", label: "Clients", icon: "icon-briefcase-line" },
    { id: "people", label: "People", icon: "icon-users-line" },
    { id: "time-off", label: "Time off", icon: "icon-calendar-line" },
  ] },
  { label: "Finance", items: [
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
    { id: "claims", label: "Expense claims", icon: "icon-wallet-02-line" },
  ] },
];
const unreadActivity = activity.filter((item) => item.unread);
const firstUnread = unreadActivity[0];

/**
 * One page of the studio's app: the AppShell (Layout=Sidebar, the toggle at the start of the header's top row) with the
 * Sidebar on the current page, the top row's utilities (an optional Search at its start, Notifications, the account
 * last) and the page's PageHeader as the header's Main row. The Body pads the page margins itself. `onNavigate` takes the
 * Sidebar rows the example can show (true when it did); any other row says it is not part of this example.
 */
function StudioApp({ here, onNavigate, leading, main, children }: {
  here: string; onNavigate?: (id: string) => boolean; leading?: ReactNode; main: ReactNode; children: ReactNode;
}) {
  const { toast } = useToast();
  const [unread, setUnread] = useState(unreadActivity.length);
  const goTo = (id: string, label: string) => {
    if (onNavigate?.(id) || id === here) return;
    toast({ title: `${label} isn’t part of this example`, children: "Each example on this page is one page of the studio’s app." });
  };
  const readAll = () => {
    toast(unread
      ? { title: plural(unread, "new notification"), children: `${people[firstUnread.actor].name} ${firstUnread.verb} “${firstUnread.object}”${unread > 1 ? `, and ${unread - 1} more` : ""}.` }
      : { title: "No new notifications", children: "You’re all caught up." });
    setUnread(0);
  };
  return (
    <AppShell
      sidebar={(
        // The logo slot is 24px tall: the mark is a 2xs Thumbnail that fits it at every density.
        <Sidebar logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />}
          sections={studioNav} selectedId={here} onItemClick={(item: SidebarItem) => goTo(item.id, item.label)}
          footer={<>
            <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
            <SidebarMenuItem id="help" label="Help" icon="icon-help-circle-line" />
          </>} />
      )}
      header={(
        <AppShellHeader
          // The top row: utilities only (the page's actions are in its PageHeader).
          leading={leading}
          actions={<>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={readAll} />
            <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
              { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => goTo("settings", "Settings") },
              { type: "separator" },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${me.name.split(" ")[0]}.` }) },
            ]} />
          </>}
          // The Main row: the page's own header, its h1.
          main={main}
        />
      )}
    >
      {children}
    </AppShell>
  );
}

// ——— The Time off pages ————————————————————————————————————————————————————————————————————————————
type Request = LeaveRequest & { history: { id: string; text: string; at: Date }[] };
const teamRequests: Request[] = [
  ...leaveRequests.filter((request) => ["chi", "emi", "gia"].includes(request.person)),
  { id: "l6", person: "ava" as PersonId, kind: "Annual leave" as const, from: new Date(2026, 9, 5), to: new Date(2026, 9, 6), days: 2, status: "Approved" as const, note: "Visiting family in Singapore", requested: daysFromToday(-8, 9, 30) },
].map((request) => ({
  ...request,
  history: [
    { id: "requested", text: `Requested by ${people[request.person].name}`, at: request.requested },
    ...(request.status === "Pending" ? [] : [{ id: "decided", text: `${request.status} by ${people.alex.name}`, at: new Date(request.requested.getTime() + 20 * 60 * 60 * 1000) }]),
  ],
}));
/* Alex's own approved leave counts when he weighs who else is away. */
const ownLeave = leaveRequests.filter((request) => request.person === "alex");

/** A timestamp inside a sentence: "Yesterday at 4:40 pm" → "yesterday at 4:40 pm"; weekdays and months keep their capital. */
const inSentence = (when: string) => (/^(Yesterday|Just now)/.test(when) ? when[0].toLowerCase() + when.slice(1) : when);
const monthName = (date: Date) => date.toLocaleString("en-US", { month: "long" });

export default function TimeOffPages() {
  const { toast } = useToast();
  const [requests, setRequests] = useState(teamRequests);
  // The page opens on the first request that waits for Alex; Back leads to the Time off list.
  const [openId, setOpenId] = useState<string | null>(teamRequests.find((request) => request.status === "Pending")?.id ?? null);
  // The request Back returns from: its row takes focus in the list.
  const [fromId, setFromId] = useState<string | null>(null);
  const [tab, setTab] = useState("details");
  // On a narrow page a trailing Badge would squeeze the caption, so the status leads the caption instead.
  const narrow = useZen()?.breakpoint === "mobile";
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLLIElement>(null);
  const tabsId = useId();
  const listId = useId();
  const requestId = useId();
  const awayId = useId();
  // A request opens with focus on its title.
  const open = (id: string) => { setOpenId(id); setTab("details"); setTimeout(() => titleRef.current?.focus()); };
  // Back (or the Sidebar's Time off) returns to the list with focus on the request it came from.
  const back = (id: string) => { setFromId(id); setOpenId(null); setTimeout(() => rowRef.current?.focus()); };
  const decide = (id: string, status: LeaveStatus) => {
    const before = requests;
    setRequests((list) => list.map((request) => (request.id === id
      ? { ...request, status, history: [...request.history, { id: "decided", text: `${status} by ${people.alex.name}`, at: TODAY }] }
      : request)));
    toast({ title: status === "Approved" ? "Leave approved" : "Leave declined", action: { label: "Undo", onClick: () => setRequests(before) } });
  };
  const waiting = requests.filter((request) => request.status === "Pending").length;
  const request = requests.find((item) => item.id === openId);
  const onNavigate = (id: string) => { if (id !== "time-off") return false; if (request) back(request.id); return true; };

  if (request) {
    const person = people[request.person];
    // Who else is away that month (declined requests don't count): what an approver weighs before saying yes.
    const away = [...ownLeave, ...requests].filter((other) => other.id !== request.id && other.status !== "Declined" && other.status !== "Cancelled"
      && other.from.getMonth() === request.from.getMonth() && other.from.getFullYear() === request.from.getFullYear())
      .sort((a, b) => a.from.getTime() - b.from.getTime());
    return (
      <StudioApp here="time-off" onNavigate={onNavigate}
        main={(
          <PageHeader
            back={{ label: "Time off", onClick: () => back(request.id) }}
            title={<span ref={titleRef} tabIndex={-1}>{`${person.name}’s ${request.kind.toLowerCase()}`}</span>}
            meta={<Badge theme={leaveStatusTheme[request.status]} background="subtle">{request.status}</Badge>}
            description={`${formatRange(request.from, request.to)} · ${plural(request.days, "day")} · Requested ${inSentence(formatRelative(request.requested))}`}
            // Only a request that waits for Alex has actions: Decline (Tertiary) before Approve (the one Primary).
            actions={request.status === "Pending" ? <>
              <Button level="tertiary" onClick={() => decide(request.id, "Declined")}>Decline</Button>
              <Button level="primary" onClick={() => decide(request.id, "Approved")}>Approve</Button>
            </> : undefined}
            tabs={<Tabs idPrefix={tabsId} aria-label="Request sections" value={tab} onValueChange={setTab}
              items={[{ id: "details", label: "Details" }, { id: "history", label: "History", badge: request.history.length }]} />} />
        )}
      >
        <Stack gap="xl">
          <TabPanel idPrefix={tabsId} id="details" hidden={tab !== "details"}>
            {/* The request beside who else is away: two shadowed boxes, the elevation the default Sidebar sets. */}
            <Grid columns={2} stackBelow={720} gap="md" align="start">
              <Card as="section" theme="shadow" aria-labelledby={requestId}>
                <Stack gap="md">
                  <Heading level={2} id={requestId} textStyle="Heading/Subheading">Request</Heading>
                  <DescriptionList items={[
                    { term: "Type", description: request.kind },
                    { term: "Dates", description: formatRange(request.from, request.to) },
                    { term: "Working days", description: String(request.days) },
                    { term: "Note", description: request.note ?? "No note" },
                    { term: "Team", description: `${person.team} · ${person.role}` },
                  ]} />
                </Stack>
              </Card>
              <ListBox as="section" theme="shadow" aria-labelledby={awayId}
                header={<Heading level={2} id={awayId} textStyle="Heading/Subheading">{`Also away in ${monthName(request.from)}`}</Heading>}>
                {away.length ? (
                  <List aria-labelledby={awayId}>
                    {away.map((other) => (
                      <ListItem key={other.id} title={other.person === "alex" ? `${people.alex.name} (you)` : people[other.person].name}
                        caption={wholeValues(narrow && other.status, other.kind, formatRange(other.from, other.to))}
                        leading={<Avatar size="md" {...avatarOf(people[other.person])} />}
                        trailing={narrow ? undefined : <Badge theme={leaveStatusTheme[other.status]} background="subtle">{other.status}</Badge>} />
                    ))}
                  </List>
                ) : (
                  <EmptyState size="sm" headingLevel={3} icon="icon-calendar-line" title="Nobody else is away">{`The Design team is in all of ${monthName(request.from)}.`}</EmptyState>
                )}
              </ListBox>
            </Grid>
          </TabPanel>
          <TabPanel idPrefix={tabsId} id="history" hidden={tab !== "history"}>
            <ListBox theme="shadow" width="fill" maxWidth={440}>
              <List aria-label="History">
                {request.history.map((event) => (
                  <ListItem key={event.id} title={event.text} caption={formatRelative(event.at)}
                    leading={<DockIcon icon={event.id === "requested" ? "icon-calendar-line" : "icon-check-done-line"} theme="neutral" background="subtle" />} />
                ))}
              </List>
            </ListBox>
          </TabPanel>
        </Stack>
      </StudioApp>
    );
  }
  return (
    <StudioApp here="time-off" onNavigate={onNavigate}
      main={<PageHeader title="Time off" description={`Requests from the Design team · ${waiting ? `${waiting} waiting for you` : "nothing waiting for you"}`} />}>
      {/* A ListBox holds the rows: its slots keep the row fill (12px past the row sideways) 12px (phone 8px) inside the
          edge and space the title from the rows. */}
      <Stack gap="xl">
        <ListBox as="section" theme="shadow" aria-labelledby={listId}
          header={<Heading level={2} id={listId} textStyle="Heading/Subheading">Requests</Heading>}>
          <List aria-labelledby={listId}>
            {requests.map((item) => (
              <ListItem key={item.id} ref={item.id === fromId ? rowRef : undefined} tabIndex={item.id === fromId ? -1 : undefined} title={people[item.person].name}
                caption={wholeValues(narrow && item.status, item.kind, formatRange(item.from, item.to))}
                leading={<Avatar size="md" {...avatarOf(people[item.person])} />}
                trailing={narrow ? undefined : <Badge theme={leaveStatusTheme[item.status]} background="subtle">{item.status}</Badge>}
                onClick={() => open(item.id)} />
            ))}
          </List>
        </ListBox>
      </Stack>
    </StudioApp>
  );
}
