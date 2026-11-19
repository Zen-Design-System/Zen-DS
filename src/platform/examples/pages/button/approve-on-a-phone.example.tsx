import { useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, Avatar, Badge, BadgeCounter, BottomNavigation, Box, Card, DescriptionList, EmptyState, Heading, List, ListBox, ListItem, Stack, Text, TopNavigation,
  plural, useToast, type BottomNavigationItem,
} from "@zen-ds/react";
import {
  daysFromToday, formatDate, formatDay, formatRange, formatRelative, initials, leaveBalance, leaveRequests, leaveStatusTheme, people, studio,
  type LeaveRequest, type Person, type PersonId,
} from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };

// The Design team's leave, as Alex (their approver) sees it. The current requests are the studio's shared ones (the same
// on every page); the rest is this year's history, newest dates first.
const reportsToAlex = (id: PersonId) => id !== "alex" && people[id].team === "Design";
const pastLeave = (id: string, person: PersonId, kind: LeaveRequest["kind"], from: number, to: number, days: number, note: string, status: LeaveRequest["status"] = "Approved"): LeaveRequest =>
  ({ id, person, kind, from: daysFromToday(from, 0, 0), to: daysFromToday(to, 0, 0), days, status, note, requested: daysFromToday(from - 21, 9, 30) });
const approvals: LeaveRequest[] = [
  ...leaveRequests.filter((request) => reportsToAlex(request.person)).sort((a, b) => b.from.getTime() - a.from.getTime()),
  pastLeave("h1", "ava", "Annual leave", -9, -5, 5, "Mid-Autumn week in Taipei"),
  pastLeave("h2", "chi", "Annual leave", -16, -16, 1, "A day off after the Phin & Co sprint review", "Declined"),
  pastLeave("h3", "emi", "Annual leave", -37, -33, 5, "Summer holiday in Hokkaido"),
  pastLeave("h4", "gia", "Annual leave", -44, -44, 1, "Long weekend in Vũng Tàu"),
  pastLeave("h5", "ava", "Sick leave", -51, -49, 3, "Fever, with a doctor's note attached"),
  pastLeave("h6", "chi", "Annual leave", -65, -61, 5, "Summer trip to Phú Quốc"),
  pastLeave("h7", "emi", "Annual leave", -72, -72, 1, "Visa renewal appointment"),
  pastLeave("h8", "gia", "Annual leave", -86, -84, 3, "Hội An with friends"),
  pastLeave("h9", "ava", "Annual leave", -100, -96, 5, "Visiting my parents in Penang"),
  pastLeave("h10", "chi", "Sick leave", -107, -107, 1, "Doctor's appointment"),
  pastLeave("h11", "emi", "Annual leave", -121, -119, 3, "Moving house"),
  pastLeave("h12", "gia", "Annual leave", -135, -135, 1, "Family day in Cần Thơ"),
];
/** Annual leave days each person has left this year, before the request on screen. */
const annualLeft: Partial<Record<PersonId, number>> = { chi: 9, emi: 12, gia: 10, ava: 11 };
const leaveDates = (request: LeaveRequest) => request.days === 1 ? formatDate(request.from) : formatRange(request.from, request.to);
// Rows drop the year, as every request is this year; the detail shows the full dates.
const leaveDays = (request: LeaveRequest) => request.days === 1 ? formatDay(request.from) : `${formatDay(request.from)} – ${formatDay(request.to)}`;
/** The studio app's roots on a phone; Time off is this screen. */
const studioRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "time-off", label: "Time off", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
  { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
/** Who else on the Design team is off (approved or waiting) on any day of this request. */
const alsoOff = (request: LeaveRequest, all: LeaveRequest[]) => all.filter((other) => other.id !== request.id && other.person !== request.person
  && (other.status === "Approved" || other.status === "Pending") && people[other.person].team === "Design"
  && other.from.getTime() <= request.to.getTime() && other.to.getTime() >= request.from.getTime());

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneApprove({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const waitingId = useId();
  const decidedId = useId();
  const noteId = useId();
  const overlapId = useId();
  const [requests, setRequests] = useState(approvals);
  const [openId, setOpenId] = useState<string | null>("l2");
  const [root, setRoot] = useState("time-off");
  // Focus follows the screen: a request focuses its title, Back returns to the group of the row it came from.
  const titleRef = useRef<HTMLSpanElement>(null);
  const waitingRef = useRef<HTMLHeadingElement>(null);
  const decidedRef = useRef<HTMLHeadingElement>(null);
  const request = requests.find((item) => item.id === openId);
  const open = (item: LeaveRequest) => {
    setOpenId(item.id);
    setTimeout(() => titleRef.current?.focus());
  };
  const back = (item: LeaveRequest) => {
    setOpenId(null);
    setTimeout(() => (item.status === "Pending" ? waitingRef : decidedRef).current?.focus());
  };
  // A decision removes the Action bar, so focus moves to the screen's title instead of dropping to <body>.
  const decide = (id: string, status: LeaveRequest["status"]) => {
    setRequests((list) => list.map((item) => item.id === id ? { ...item, status } : item));
    setTimeout(() => titleRef.current?.focus());
  };
  const approve = (item: LeaveRequest) => {
    decide(item.id, "Approved");
    toast({ type: "positive", title: "Leave approved", children: `${people[item.person].name} gets an email now.`, action: { label: "Undo", onClick: () => decide(item.id, "Pending") } });
  };
  const decline = (item: LeaveRequest) => {
    decide(item.id, "Declined");
    toast({ title: "Leave declined", children: `${people[item.person].name.split(" ")[0]} can ask again with other dates.`, action: { label: "Undo", onClick: () => decide(item.id, "Pending") } });
  };
  // A trailing Badge would squeeze a phone row's caption, so a decided request's status leads its caption; each value
  // keeps its words together, so the caption wraps between values.
  const row = (item: LeaveRequest, decided: boolean) => (
    <ListItem key={item.id} title={people[item.person].name}
      caption={[decided && item.status, leaveDays(item), plural(item.days, "day")].filter(Boolean).map((value) => String(value).replace(/ /g, " ")).join(" · ")}
      leading={<Avatar size="md" {...avatarOf(people[item.person])} />}
      onClick={() => open(item)} />
  );

  // Each screen is its own AppShell (key).
  if (!request) {
    const waiting = requests.filter((item) => item.status === "Pending");
    const decided = requests.filter((item) => item.status !== "Pending");
    return (
      // A tab root: the large title folds as the groups scroll under the bar, and the bottom bar holds the app's roots. It
      // casts a shadow, so both groups take the Shadow ListBox on the grey Canvas; the kickers line up with the row text.
      <AppShell key="root"
        topNavigation={<TopNavigation title="Time off" largeTitle="Time off" scrollRef={scrollRef}
          trailing={[{ icon: "icon-calendar-plus-line", label: "Request leave", onClick: () => toast({ title: "Request leave", children: `You have ${leaveBalance["Annual leave"]?.left ?? 0} days of annual leave left.` }) }]} />}
        bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={studioRoots} value={root} onValueChange={setRoot} />}
      >
        <Stack as="section" gap="xs" aria-labelledby={waitingId}>
          <Stack direction="row" gap="xs" align="center" paddingX="lg">
            <Heading ref={waitingRef} tabIndex={-1} level={2} id={waitingId} textStyle="Body/Small/Bold" tone="light">Waiting for you</Heading>
            {waiting.length ? <BadgeCounter size="sm" theme="neutral" background="subtle" value={waiting.length} /> : null}
          </Stack>
          <ListBox theme="shadow">
            {waiting.length ? <List aria-labelledby={waitingId}>{waiting.map((item) => row(item, false))}</List> : (
              <EmptyState size="sm" headingLevel={3} title="You're all caught up">New requests from the Design team show here.</EmptyState>
            )}
          </ListBox>
        </Stack>
        <Stack as="section" gap="xs" aria-labelledby={decidedId}>
          <Box paddingX="lg"><Heading ref={decidedRef} tabIndex={-1} level={2} id={decidedId} textStyle="Body/Small/Bold" tone="light">Decided this year</Heading></Box>
          <ListBox theme="shadow">
            <List aria-labelledby={decidedId}>{decided.map((item) => row(item, true))}</List>
          </ListBox>
        </Stack>
      </AppShell>
    );
  }
  const person = people[request.person];
  const left = annualLeft[request.person];
  const overlap = alsoOff(request, requests);
  return (
    // A pushed screen: the compact bar with Back, the request in flat blocks on the grey Canvas, and the two peer
    // answers in the Action bar (Figma Bottom=Actions), Primary at the end. Decided requests have no Action bar.
    <AppShell key={request.id}
      topNavigation={<TopNavigation type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>Leave request</span>} scrollRef={scrollRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => back(request) }} />}
      actionBar={request.status === "Pending" ? (
        <ActionBar direction="horizontal"
          secondaryAction={{ label: "Decline leave", onClick: () => decline(request) }}
          primaryAction={{ label: "Approve leave", onClick: () => approve(request) }} />
      ) : undefined}
    >
      <Stack direction="column" align="center" gap="md" paddingY="xs">
        <Avatar size="2xl" {...avatarOf(person)} />
        <Stack gap="2xs" align="center">
          <Heading level={2} textStyle="Heading/2" truncate align="center">{person.name}</Heading>
          <Text as="span" textStyle="Body/Small/Regular" tone="light">{`${person.role} · ${person.location}`}</Text>
        </Stack>
        <Badge theme={leaveStatusTheme[request.status]} background="subtle">{request.status}</Badge>
      </Stack>
      <Card theme="default">
        <DescriptionList divider items={[
          { id: "type", term: "Type", description: request.kind },
          { id: "dates", term: "Dates", description: leaveDates(request) },
          { id: "length", term: "Length", description: plural(request.days, "day") },
          // While it waits, the approver sees what annual leave would be left; other kinds don't use the balance.
          ...(request.status === "Pending" && request.kind === "Annual leave" && left !== undefined
            ? [{ id: "balance", term: "Balance after", description: plural(left - request.days, "day") }] : []),
          { id: "requested", term: "Requested", description: formatRelative(request.requested) },
        ]} />
      </Card>
      {request.note ? (
        <Stack as="section" gap="xs" aria-labelledby={noteId}>
          <Heading level={2} id={noteId} textStyle="Body/Small/Bold" tone="light">Note</Heading>
          <Text>{request.note}</Text>
        </Stack>
      ) : null}
      {/* What an approver checks before saying yes: who else on the team is away on those days. The list closes the
          phone screen, so it is open on the Canvas at the body's margin, not a box (usage rules §19). */}
      <Stack as="section" gap="xs" aria-labelledby={overlapId}>
        <Heading level={2} id={overlapId} textStyle="Body/Small/Bold" tone="light">Also off on these days</Heading>
        {overlap.length ? (
          <List aria-labelledby={overlapId}>
            {overlap.map((other) => (
              <ListItem key={other.id} title={people[other.person].name} caption={`${leaveDays(other)} · ${other.status}`}
                leading={<Avatar size="md" {...avatarOf(people[other.person])} />} />
            ))}
          </List>
        ) : <Text textStyle="Body/Small/Regular" tone="base">{`No one else on the ${person.team} team is off then.`}</Text>}
      </Stack>
    </AppShell>
  );
}
