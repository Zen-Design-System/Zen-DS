import { useId, useState, type RefObject } from "react";
import { AppShell, Avatar, Badge, BottomSheet, DockIcon, Heading, List, ListBox, ListItem, Stack, TopNavigation } from "@zen-ds/react";
import {
  TODAY, daysFromToday, formatDay, formatDue, formatRelative, formatTime, initials, leaveRequests, me, people, projectById, tasks,
  type Person, type PersonId,
} from "../../data";

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
];
const meetings = [
  { id: "m1", title: "Design critique", start: daysFromToday(0, 11, 0), where: "Studio room 2", project: "phin-loyalty" },
  { id: "m2", title: "Lumen Bank check-in", start: daysFromToday(0, 14, 0), where: "Video call", project: "lumen-banking" },
  { id: "m3", title: "Zen office hours", start: daysFromToday(0, 16, 30), where: "Studio room 1", project: "zen-ds" },
];
const reviewing = tasks.filter((task) => task.status === "In review");
// Work still being done that is due in the next 10 days, soonest first (tasks in review wait in the ListBox above).
const dueSoon = tasks
  .filter((task) => (task.status === "To do" || task.status === "In progress") && task.due >= daysFromToday(0, 0, 0) && task.due <= daysFromToday(10, 23, 59))
  .sort((a, b) => a.due.getTime() - b.due.getTime());

/** Home on an Alt canvas: the account leads the bar, and the bell's dot marks unread notifications until the sheet opens. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function HomeWithNotifications({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const [sheet, setSheet] = useState(false);
  const [seen, setSeen] = useState(false);
  const todayId = useId();
  const reviewId = useId();
  const dueId = useId();
  const fresh = notifications.filter((item) => item.unread);
  const openNotifications = () => { setSheet(true); setSeen(true); };
  return (
    <>
      {/* Alt bar on the Canvas: Surface ListBoxes carry the content. */}
      <AppShell
        topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Home" largeTitle="Home"
          leading={<Avatar size="md" theme="photo" src={me.photo} alt={me.name} />}
          trailing={[{ icon: "icon-bell-01-line", label: seen ? "Notifications" : `Notifications, ${fresh.length} new`, dot: !seen, onClick: openNotifications }]} />}>
        {/* Each section is a ListBox: its title in the Header-Slot, the rows in the Body-Slot. The slot padding follows the
            breakpoint (20px on a phone); rows have no side padding of their own, so titles and rows line up. */}
        <Stack gap="md">
          <ListBox as="section" aria-labelledby={todayId}
            header={<Heading level={2} id={todayId} textStyle="Heading/Subheading">Today</Heading>}>
            <List aria-labelledby={todayId}>
              {meetings.map((meeting) => {
                const item = projectById(meeting.project);
                return <ListItem key={meeting.id} title={meeting.title} caption={`${formatTime(meeting.start)} · ${meeting.where}`} leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" size="md" />} />;
              })}
            </List>
          </ListBox>
          <ListBox as="section" aria-labelledby={reviewId}
            header={<Heading level={2} id={reviewId} textStyle="Heading/Subheading">Waiting for your review</Heading>}>
            <List aria-labelledby={reviewId}>
              {reviewing.map((task) => (
                <ListItem key={task.id} title={people[task.assignee].name} caption={task.title} leading={<Avatar size="md" {...avatarOf(people[task.assignee])} />} />
              ))}
            </List>
          </ListBox>
          <ListBox as="section" aria-labelledby={dueId}
            header={<Heading level={2} id={dueId} textStyle="Heading/Subheading">Due soon</Heading>}>
            <List aria-labelledby={dueId}>
              {/* Titles stay one line, so the person leads and the task (which may wrap) follows its due date. */}
              {dueSoon.map((task) => (
                <ListItem key={task.id} title={people[task.assignee].name} caption={`${formatDue(task.due)} · ${task.title}`} leading={<Avatar size="md" {...avatarOf(people[task.assignee])} />} />
              ))}
            </List>
          </ListBox>
        </Stack>
      </AppShell>
      <BottomSheet inline open={sheet} onOpenChange={setSheet} title="Notifications">
        <List aria-label="Notifications">
          {notifications.map((item) => (
            <ListItem key={item.id} title={people[item.actor].name} caption={`${item.text} · ${formatRelative(item.at)}`}
              leading={<Avatar size="md" {...avatarOf(people[item.actor])} />}
              trailing={item.unread ? <Badge theme="accent" background="subtle">New</Badge> : undefined} />
          ))}
        </List>
      </BottomSheet>
    </>
  );
}
