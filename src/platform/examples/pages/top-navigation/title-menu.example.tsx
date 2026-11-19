import { useState } from "react";
import { AppShell, Avatar, List, ListItem, TopNavigation, plural, useToast } from "@zen-ds/react";
import { formatRelative, initials, people, tasks } from "../../data";

const mailboxes = [
  { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line", unread: 3, rows: 6 },
  { id: "starred", label: "Starred", icon: "icon-star-01-line", unread: 0, rows: 2 },
  { id: "archive", label: "Archive", icon: "icon-archive-line", unread: 0, rows: 4 },
] as const;

/** Mail: the bar title is a menu of mailboxes; picking one renames the screen. */
export default function TitleMenu() {
  const { toast } = useToast();
  const [box, setBox] = useState<(typeof mailboxes)[number]["id"]>("inbox");
  const current = mailboxes.find((item) => item.id === box) ?? mailboxes[0];
  return (
    <AppShell
      topNavigation={<TopNavigation type="alt" title={current.label}
        titleMenu={mailboxes.map((item) => ({ id: item.id, label: item.label, icon: item.icon, caption: item.unread ? plural(item.unread, "unread message") : undefined, onSelect: () => setBox(item.id) }))}
        trailing={[{ icon: "icon-edit-01-line", label: "New message", onClick: () => toast({ title: "New message", children: "The composer isn't part of this demo." }) }]} />}>
      <List aria-label={current.label}>
        {tasks.slice(0, current.rows).map((task) => (
          <ListItem key={task.id} title={task.title} caption={`${people[task.assignee].name} · ${formatRelative(task.due)}`}
            leading={<Avatar size="medium" theme={people[task.assignee].theme} src={people[task.assignee].photo} alt="">{initials(people[task.assignee].name)}</Avatar>} />
        ))}
      </List>
    </AppShell>
  );
}
