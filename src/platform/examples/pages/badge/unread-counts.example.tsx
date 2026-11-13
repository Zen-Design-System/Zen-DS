import { useRef, useState } from "react";
import { BadgeCounter, Button, DockIcon, List, ListBox, ListItem, Stack, Text, VisuallyHidden, plural } from "@zen-ds/react";
import { daysFromToday, formatRelative, projects } from "../../data";

/** Unread updates per project channel (comments, file versions, status changes), latest first. */
const channels = [
  { project: projects[4], unread: 128, last: daysFromToday(0, 10, 12) },
  { project: projects[0], unread: 12, last: daysFromToday(0, 9, 48) },
  { project: projects[1], unread: 4, last: daysFromToday(-1, 17, 20) },
  { project: projects[2], unread: 1, last: daysFromToday(-2, 11, 5) },
  { project: projects[5], unread: 0, last: daysFromToday(-6, 15, 40) },
  { project: projects[3], unread: 0, last: daysFromToday(-12, 16, 0) },
];

export default function UnreadCounts() {
  const [current, setCurrent] = useState<string | null>(null);
  const [unread, setUnread] = useState<Record<string, number>>(() => Object.fromEntries(channels.map((channel) => [channel.project.id, channel.unread])));
  const total = Object.values(unread).reduce((sum, n) => sum + n, 0);
  const statusRef = useRef<HTMLElement>(null);
  // Opening a channel reads it: its counter clears and disappears.
  const open = (id: string) => {
    setCurrent(id);
    setUnread((counts) => ({ ...counts, [id]: 0 }));
  };
  // The button goes away with the last unread update, so focus moves to the line that now says "All caught up".
  const markAllRead = () => {
    setUnread((counts) => Object.fromEntries(Object.keys(counts).map((id) => [id, 0])));
    setTimeout(() => statusRef.current?.focus());
  };
  return (
    <Stack gap="md" align="stretch">
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Text ref={statusRef} as="span" textStyle="Body/Small/Medium" tone="base" role="status" tabIndex={-1}>{total ? plural(total, "unread update") : "All caught up"}</Text>
        {total ? <Button level="tertiary" startIcon="icon-check-line" onClick={markAllRead}>Mark all as read</Button> : null}
      </Stack>
      {/* A list on the stage sits in a ListBox: its Body-Slot insets the rows and keeps the fill (12px out) inside. */}
      <ListBox>
        <List aria-label="Project updates">
          {channels.map(({ project, last }) => {
            const count = unread[project.id];
            return (
              // The counter takes room at the end, so a long project name wraps to a second line instead of being cut.
              <ListItem key={project.id} selected={current === project.id} onClick={() => open(project.id)}
                leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
                title={<>{project.name}{count ? <VisuallyHidden>{`, ${count} unread`}</VisuallyHidden> : null}</>} titleLines={2}
                caption={`${project.client} · ${formatRelative(last)}`}
                trailing={count > 0 ? <BadgeCounter value={count > 99 ? "99+" : count} aria-hidden="true" /> : null} />
            );
          })}
        </List>
      </ListBox>
    </Stack>
  );
}
