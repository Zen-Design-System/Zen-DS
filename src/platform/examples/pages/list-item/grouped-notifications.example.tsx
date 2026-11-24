import { useId, useRef, useState } from "react";
import { Avatar, Badge, BadgeCounter, Button, Heading, List, ListBox, ListItem, Stack, VisuallyHidden } from "@zen-ds/react";
import { TODAY, activity, formatRange, formatRelative, initials, leaveRequests, people, type Person, type PersonId } from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const avatarFor = (person: Person) => (person.photo
  ? <Avatar size="md" theme="photo" src={person.photo} alt="" />
  : <Avatar size="md" theme={person.theme} alt="">{initials(person.name)}</Avatar>);

type Notice = { id: string; actor: PersonId; title: string; text: string; at: Date; unread: boolean };
/** When each studio event happened (the shared activity feed), so every page tells the same story. */
const happened = (id: string) => activity.find((event) => event.id === id)!.at;
const myLeave = leaveRequests.find((request) => request.person === "alex")!;
const firstNotices: Notice[] = [
  { id: "n1", actor: "chi", title: "Design the points history screen", text: "Chi Tran commented", at: happened("a1"), unread: true },
  { id: "n2", actor: "bao", title: "Connect the rewards API to checkout", text: "Bao Nguyen asked you to review", at: happened("a2"), unread: true },
  { id: "n3", actor: "hana", title: "Lumen Bank SOW v3", text: "Hana Kim shared a file", at: happened("a3"), unread: true },
  { id: "n4", actor: "duy", title: "Shipment tracking", text: "Duy Le put the project on hold", at: happened("a4"), unread: false },
  { id: "n5", actor: "minhAnh", title: `Time off, ${formatRange(myLeave.from, myLeave.to)}`, text: "Minh Anh Vo approved your request", at: happened("a5"), unread: false },
  { id: "n6", actor: "mai", title: "INV-2026-0141", text: "Mai Ho marked the invoice as paid", at: happened("a6"), unread: false },
];
const isToday = (d: Date) => d.toDateString() === TODAY.toDateString();

/** Notifications: one ListBox and one named List per group. */
export default function Notifications() {
  const [notices, setNotices] = useState(firstNotices);
  const [openId, setOpenId] = useState<string | null>(null);
  const baseId = useId();
  const firstRowRef = useRef<HTMLElement>(null);
  const unread = notices.filter((notice) => notice.unread).length;
  const open = (id: string) => { setOpenId(id); setNotices((list) => list.map((notice) => (notice.id === id ? { ...notice, unread: false } : notice))); };
  const groups = [
    { id: "today", label: "Today", items: notices.filter((notice) => isToday(notice.at)) },
    { id: "earlier", label: "Earlier", items: notices.filter((notice) => !isToday(notice.at)) },
  ];
  const firstId = groups.flatMap((group) => group.items)[0]?.id;
  // The button turns disabled once everything is read, so focus moves on to the first notification.
  const markAllRead = () => {
    setNotices((list) => list.map((notice) => ({ ...notice, unread: false })));
    firstRowRef.current?.focus();
  };
  return (
    // Grouped list on desktop: a Heading/4 section with its action, then one ListBox per group, so Today and
    // Earlier read as two units instead of kickers over one long run of rows.
    <Stack as="section" gap="md" aria-labelledby={`${baseId}-title`}>
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Stack direction="row" gap="2xs" align="center">
          <Heading level={4} id={`${baseId}-title`} textStyle="Heading/4">Notifications</Heading>
          {unread ? <><BadgeCounter value={unread} aria-hidden="true" /><VisuallyHidden>{`${unread} unread`}</VisuallyHidden></> : null}
        </Stack>
        <Button level="tertiary" disabled={!unread} onClick={markAllRead}>Mark all as read</Button>
      </Stack>
      {groups.map((group) => (
        // Each group is a ListBox titled in its Header-Slot (Figma Component/List-Box).
        <ListBox key={group.id} as="section" aria-labelledby={`${baseId}-${group.id}`}
          header={<Heading level={5} id={`${baseId}-${group.id}`} textStyle="Heading/Subheading">{group.label}</Heading>}>
          <List aria-labelledby={`${baseId}-${group.id}`}>
            {group.items.map((notice) => (
              <ListItem key={notice.id} ref={notice.id === firstId ? firstRowRef : undefined} tabIndex={notice.id === firstId ? -1 : undefined}
                title={notice.title} titleLines={2} caption={`${notice.text} · ${formatRelative(notice.at)}`}
                selected={notice.id === openId} onClick={() => open(notice.id)}
                leading={avatarFor(people[notice.actor])}
                trailing={notice.unread ? <Badge theme="accent" background="subtle">New</Badge> : undefined} />
            ))}
          </List>
        </ListBox>
      ))}
    </Stack>
  );
}
