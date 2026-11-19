import { useRef, useState, type RefObject } from "react";
import { AppShell, Avatar, Badge, EmptyState, List, ListItem, Segmented, TopNavigation } from "@zen-ds/react";
import { TODAY, daysFromToday, formatDay, formatRelative, initials, leaveRequests, me, people, type Person, type PersonId } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. The row title already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);
// Alex's approved leave, from the studio's shared leave requests.
const myLeave = leaveRequests.find((request) => request.person === me.id && request.status === "Approved")!;
const myLeaveDays = `${formatDay(myLeave.from)} – ${formatDay(myLeave.to)}`;

// Alex's notifications, newest first.
type InboxItem = { id: string; actor: PersonId; text: string; at: Date; unread: boolean };
const notifications: InboxItem[] = [
  { id: "n1", actor: "chi", text: "Commented on Points history", at: minutesAgo(2), unread: true },
  { id: "n2", actor: "bao", text: "Asked you to review PHIN-219", at: minutesAgo(13), unread: true },
  { id: "n3", actor: "hana", text: "Shared Lumen Bank SOW v3", at: daysFromToday(0, 9, 12), unread: true },
  { id: "n4", actor: "duy", text: "Put Shipment tracking on hold", at: daysFromToday(-1, 16, 40), unread: false },
  { id: "n5", actor: "minhAnh", text: `Approved your leave for ${myLeaveDays}`, at: daysFromToday(-2, 11, 5), unread: false },
  { id: "n6", actor: "finn", text: "Requested changes on ZEN-398", at: daysFromToday(-3, 15, 20), unread: false },
  { id: "n7", actor: "linh", text: "Replied to your comment on the Book Fair recap", at: daysFromToday(-6, 9, 45), unread: false },
  { id: "n8", actor: "mai", text: "Marked INV-2026-0141 as paid", at: daysFromToday(-8, 15, 30), unread: false },
  { id: "n9", actor: "ava", text: "Mentioned you in Usability plan", at: daysFromToday(-9, 14, 10), unread: false },
  { id: "n10", actor: "khoa", text: "Assigned you LUM-097 Transfer limits", at: daysFromToday(-10, 16, 5), unread: false },
  { id: "n11", actor: "gia", text: "Added you to Brand refresh", at: daysFromToday(-13, 10, 15), unread: false },
  { id: "n12", actor: "emi", text: "Shared the Points history loading animation", at: daysFromToday(-14, 17, 50), unread: false },
];

/** The Inbox: a full-width Segmented in the control bar switches All and Unread and stays pinned as the title folds. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function InboxControlBar({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const [items, setItems] = useState(notifications);
  const [view, setView] = useState("all");
  // Where focus goes when a row leaves: the row that takes its place, or the empty state.
  const [focusId, setFocusId] = useState<string | null>(null);
  const rowRef = useRef<HTMLElement>(null);
  const emptyRef = useRef<HTMLElement>(null);
  const unread = items.filter((item) => item.unread).length;
  const shown = view === "unread" ? items.filter((item) => item.unread) : items;
  const read = (id: string) => {
    setItems((list) => list.map((item) => item.id === id ? { ...item, unread: false } : item));
    if (view !== "unread") return;
    // In Unread the row leaves once read: focus moves to the next row (or the empty state), not to <body>.
    const at = shown.findIndex((item) => item.id === id);
    const left = shown.filter((item) => item.id !== id);
    const next = left[at] ?? left[at - 1];
    setFocusId(next?.id ?? null);
    setTimeout(() => (next ? rowRef : emptyRef).current?.focus());
  };
  const showAll = () => {
    setView("all");
    setFocusId(items[0].id);
    setTimeout(() => rowRef.current?.focus());
  };
  return (
    <AppShell
      // The Segmented stays pinned under the bar: it moves up with the fold and never folds away.
      topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Inbox" largeTitle="Inbox"
        // Nothing left to mark: the action stays in place, disabled.
        trailing={[{ icon: "icon-double-check-line", label: "Mark all as read", disabled: unread === 0, onClick: () => setItems((list) => list.map((item) => ({ ...item, unread: false }))) }]}
        controlBar={<Segmented fullWidth aria-label="Show" value={view} onValueChange={setView} options={[
          { id: "all", label: "All" },
          { id: "unread", label: "Unread", badge: unread || undefined },
        ]} />} />}>
      {shown.length ? (
        // The rows sit in the screen margin (Margin/Comfortable, 20px), so their fill stays 8px off the screen edge.
        <List aria-label={view === "unread" ? "Unread notifications" : "All notifications"}>
          {shown.map((item) => (
            <ListItem key={item.id} ref={item.id === focusId ? rowRef : undefined} tabIndex={item.id === focusId ? -1 : undefined}
              title={people[item.actor].name} caption={`${item.text} · ${formatRelative(item.at)}`}
              leading={<Avatar size="md" {...avatarOf(people[item.actor])} />}
              trailing={item.unread ? <Badge theme="accent" background="subtle">New</Badge> : undefined}
              onClick={() => read(item.id)} />
          ))}
        </List>
      ) : (
        <EmptyState ref={emptyRef} tabIndex={-1} headingLevel={2} icon="icon-bell-01-line" title="No unread notifications" secondaryAction={{ label: "Show all", onClick: showAll }}>
          You're up to date. New mentions and reviews land here.
        </EmptyState>
      )}
    </AppShell>
  );
}
