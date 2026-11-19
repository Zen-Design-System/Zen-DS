import { useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, Avatar, Badge, BottomNavigation, Box, DescriptionList, Heading, List, ListBox, ListItem, Stack, Text, TopNavigation, plural, useToast,
  type BottomNavigationItem,
} from "@zen-ds/react";
import {
  daysFromToday, formatDate, formatRange, formatRelative, initials, leaveStatusTheme, people, studio, type LeaveKind, type LeaveStatus, type Person, type PersonId,
} from "../../data";

type Approval = { id: string; person: PersonId; kind: LeaveKind; from: Date; to: Date; days: number; status: LeaveStatus; note?: string; requested: Date };
const d = (month: number, date: number) => new Date(2026, month - 1, date);
/** Annual leave left this year for the Design team Alex approves. */
const annualLeft: Partial<Record<PersonId, number>> = { chi: 9, emi: 6, gia: 11, ava: 8 };
const approvals: Approval[] = ([
  ["chi", "Annual leave", d(10, 19), d(10, 21), 3, "Pending", "Wedding in Hải Phòng", daysFromToday(-3, 16, 45)],
  ["emi", "Annual leave", d(10, 26), d(10, 27), 2, "Pending", undefined, daysFromToday(-1, 11, 10)],
  ["gia", "Annual leave", d(11, 16), d(11, 20), 5, "Pending", "Hiking in Sa Pa", daysFromToday(0, 9, 12)],
  ["ava", "Sick leave", d(9, 22), d(9, 23), 2, "Approved", undefined, d(9, 22)],
  ["gia", "Unpaid leave", d(11, 2), d(11, 6), 5, "Declined", "Overlaps the Saola kickoff", d(9, 24)],
  ["chi", "Sick leave", d(9, 8), d(9, 8), 1, "Approved", undefined, d(9, 8)],
  ["emi", "Annual leave", d(8, 24), d(8, 28), 5, "Approved", "Visiting family in Osaka", d(8, 3)],
  ["ava", "Annual leave", d(8, 10), d(8, 14), 5, "Approved", undefined, d(7, 20)],
  ["gia", "Sick leave", d(7, 20), d(7, 20), 1, "Approved", undefined, d(7, 20)],
  ["chi", "Annual leave", d(7, 6), d(7, 10), 5, "Approved", "Summer trip to Phú Quốc", d(6, 15)],
  ["emi", "Sick leave", d(6, 15), d(6, 15), 1, "Approved", undefined, d(6, 15)],
  ["ava", "Annual leave", d(5, 25), d(5, 26), 2, "Cancelled", undefined, d(5, 2)],
  ["gia", "Annual leave", d(5, 4), d(5, 8), 5, "Approved", undefined, d(4, 14)],
  ["chi", "Annual leave", d(4, 27), d(4, 29), 3, "Approved", undefined, d(4, 1)],
] as const).map(([person, kind, from, to, days, status, note, requested], index) => ({ id: `a${index}`, person, kind, from, to, days, status, note, requested }));
const datesOf = (item: Pick<Approval, "from" | "to">) => (item.from.getTime() === item.to.getTime() ? formatDate(item.from) : formatRange(item.from, item.to));
/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
/** Đìzai Studio's Zen app, the roots of its tab bar. */
const zenRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "approvals", label: "Approvals", icon: "icon-clipboard-check-line", selectedIcon: "icon-clipboard-check-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
const back = "icon-chevron-left-line-medium" as const;

/** Leave approvals in the studio's Zen app: Approve and Decline are peers, side by side in a horizontal Action bar. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneApprovals({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const waitingId = useId();
  const answeredId = useId();
  const [list, setList] = useState(approvals);
  const [openId, setOpenId] = useState<string | null>("a0");
  const [fromId, setFromId] = useState("a0");
  // Focus follows the screen: a request focuses its title, Back returns to the row it came from.
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const item = list.find((approval) => approval.id === openId);
  const setStatus = (id: string, status: LeaveStatus) => setList((rows) => rows.map((row) => (row.id === id ? { ...row, status } : row)));
  const open = (id: string) => {
    setOpenId(id);
    setFromId(id);
    setTimeout(() => titleRef.current?.focus());
  };
  const backToList = () => {
    setOpenId(null);
    setTimeout(() => rowRef.current?.focus());
  };
  // The Action bar leaves once the request is answered, so focus moves to the screen's title instead of falling to the page.
  const decide = (approval: Approval, status: "Approved" | "Declined") => {
    setStatus(approval.id, status);
    toast({ title: status === "Approved" ? "Leave approved" : "Leave declined", action: { label: "Undo", onClick: () => setStatus(approval.id, "Pending") } });
    setTimeout(() => titleRef.current?.focus());
  };
  /** A place this example does not draw: the toast says so, and the tab bar keeps this root. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This screen shows the Action Bar." });

  if (!item) {
    const waiting = list.filter((approval) => approval.status === "Pending");
    const answered = list.filter((approval) => approval.status !== "Pending");
    const groups = [
      { id: waitingId, title: "Waiting for you", rows: waiting },
      { id: answeredId, title: "Answered", rows: answered },
    ].filter((group) => group.rows.length);
    return (
      // A tab root of Đìzai Studio's Zen app: the requests Alex approves for the Design team, the ones waiting first. The
      // tab bar casts a shadow, so the lists take the same Shadow elevation; its Approvals tab shows a dot while any wait.
      <AppShell key="root"
        topNavigation={<TopNavigation scrollRef={scrollRef} title="Approvals" largeTitle="Approvals"
          largeTitleSubheading={<span role="status">{waiting.length ? `${plural(waiting.length, "request")} waiting for you` : "Nothing waiting for you"}</span>} />}
        // The other roots are not drawn here: a toast says so, and the bar keeps Approvals (a selected tab shows its solid icon).
        bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels value="approvals"
          items={zenRoots.map((root) => (root.id === "approvals" ? { ...root, dot: waiting.length > 0 } : root))}
          onValueChange={(id) => { if (id !== "approvals") notHere(zenRoots.find((root) => root.id === id)?.label ?? id); }} />}
      >
        {groups.map((group) => (
          <Stack key={group.id} as="section" gap="xs" aria-labelledby={group.id}>
            {/* A list's group title on a phone: Body/Small/Bold Light, lined up with the row text inside its ListBox. */}
            <Box paddingX="lg"><Heading level={2} id={group.id} textStyle="Body/Small/Bold" tone="light" truncate={false}>{group.title}</Heading></Box>
            <ListBox theme="shadow">
              <List aria-labelledby={group.id}>
                {group.rows.map((approval) => (
                  <ListItem key={approval.id} ref={approval.id === fromId ? rowRef : undefined} tabIndex={approval.id === fromId ? -1 : undefined}
                    title={people[approval.person].name} caption={`${approval.kind} · ${datesOf(approval)}`}
                    leading={<Avatar size="md" {...avatarOf(people[approval.person])} />}
                    trailing={<Badge theme={leaveStatusTheme[approval.status]} background="subtle">{approval.status}</Badge>}
                    onClick={() => open(approval.id)} />
                ))}
              </List>
            </ListBox>
          </Stack>
        ))}
      </AppShell>
    );
  }

  const person = people[item.person];
  const left = item.kind === "Annual leave" ? annualLeft[item.person] : undefined;
  const pending = item.status === "Pending";
  return (
    // A request is a person asking: Band-Sheet, the person rising over the brand band (Figma Top=Band-Sheet) and the
    // request's facts on the sheet. Horizontal Action bar: two peer answers side by side as Large buttons, Primary at
    // the end, the summary on its own row; once answered it goes, and the sheet runs to the home indicator.
    <AppShell key={item.id} mobileTop="band-sheet"
      topNavigation={<TopNavigation scrollRef={scrollRef} title={<span ref={titleRef} tabIndex={-1}>Leave request</span>}
        leading={{ icon: back, label: "Back", onClick: backToList }} />}
      hero={(
        <Stack gap="sm" align="center">
          <Avatar size="3xl" {...avatarOf(person)} />
          <Stack gap="2xs" width="fill">
            <Heading level={2} textStyle="Heading/2" align="center" width="fill">{person.name}</Heading>
            <Text textStyle="Body/Small/Regular" tone="base" align="center">{`${person.role} · ${person.location}`}</Text>
          </Stack>
        </Stack>
      )}
      actionBar={pending ? (
        <ActionBar direction="horizontal"
          summary={<Text as="span" textStyle="Body/Base/Medium">{left === undefined ? plural(item.days, "working day") : `${plural(item.days, "working day")} · ${plural(left - item.days, "day")} left after`}</Text>}
          secondaryAction={{ label: "Decline", onClick: () => decide(item, "Declined") }}
          primaryAction={{ label: "Approve", onClick: () => decide(item, "Approved") }} />
      ) : undefined}
    >
      {/* The status is a value of the request: a Badge in its own row, never squeezed beside the name. The sheet is the
          only surface, so the facts sit on it without a card. */}
      <DescriptionList divider items={[
        { id: "status", term: "Status", description: <Badge theme={leaveStatusTheme[item.status]} background="subtle">{item.status}</Badge> },
        { id: "kind", term: "Type", description: item.kind },
        { id: "dates", term: "Dates", description: datesOf(item) },
        { id: "length", term: "Length", description: plural(item.days, "working day") },
        ...(left === undefined ? [] : [{ id: "left", term: "Annual leave left", description: plural(left, "day") }]),
        ...(item.note ? [{ id: "note", term: "Note", description: item.note }] : []),
        { id: "requested", term: "Requested", description: formatRelative(item.requested) },
      ]} />
    </AppShell>
  );
}
