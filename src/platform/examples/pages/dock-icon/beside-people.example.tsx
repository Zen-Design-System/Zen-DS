import { useRef, useState } from "react";
import { Avatar, Badge, BadgeCounter, Button, DockIcon, Heading, List, ListBox, ListItem, Stack, VisuallyHidden, type DockIconTheme, type IconName } from "@zen-ds/react";
import { activity, daysFromToday, formatDue, formatMoney, formatRange, formatRelative, initials, invoices, leaveRequests, people, type Person } from "../../data";

const person = (id: string) => (people as Record<string, Person>)[id];
/** Photo when the person has one, initials on their steady theme otherwise. The name sits next to it, so alt is empty. */
const avatarFor = (p: Person) => p.photo ? { theme: "photo" as const, src: p.photo, alt: "" } : { theme: p.theme, children: initials(p.name) };

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

export default function Notifications() {
  const [items, setItems] = useState(notices);
  const [openId, setOpenId] = useState<string | null>(null);
  const unread = items.filter((n) => n.unread).length;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const open = (id: string) => { setOpenId(id); setItems((list) => list.map((n) => (n.id === id ? { ...n, unread: false } : n))); };
  // The button turns disabled once everything is read, so focus moves to the list's title beside it.
  const markAllRead = () => {
    setItems((list) => list.map((n) => ({ ...n, unread: false })));
    setTimeout(() => titleRef.current?.focus());
  };
  return (
    // A ListBox: the title, its counter and Mark all as read in its Header-Slot, the notifications in its Body-Slot.
    <ListBox width="fill"
      header={<Stack direction="row" align="center" justify="between" gap="xs" wrap>
        <Stack direction="row" align="center" gap="2xs">
          <Heading ref={titleRef} level={4} textStyle="Heading/Subheading" tabIndex={-1}>Notifications</Heading>
          {unread ? <><BadgeCounter value={unread} aria-hidden="true" /><VisuallyHidden>{`${unread} unread`}</VisuallyHidden></> : null}
        </Stack>
        <Button level="tertiary" disabled={!unread} onClick={markAllRead}>Mark all as read</Button>
      </Stack>}>
      <List aria-label="Notifications">
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
