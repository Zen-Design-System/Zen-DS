import { useId, useState } from "react";
import { Avatar, BadgeStatus, Heading, List, ListBox, ListItem, Stack, Toggle, type AvatarSize } from "@zen-ds/react";
import { daysFromToday, formatDue, initials, people, taskStep, type Person, type TaskStatus } from "../../data";

/** People are Avatars: a photo when there is one, otherwise solid initials on the person's steady theme (one look on every page).
 *  `named` gives the Avatar the name when nothing else says who it is. */
function PersonAvatar({ person, size, named = false }: { person: Person; size: AvatarSize; named?: boolean }) {
  const alt = named ? person.name : "";
  return person.photo
    ? <Avatar size={size} theme="photo" src={person.photo} alt={alt} />
    : <Avatar size={size} theme={person.theme} alt={alt}>{initials(person.name)}</Avatar>;
}

type WeekTask = { id: string; key: string; title: string; assignee: Person; status: TaskStatus; when: string };
const weekTasks: WeekTask[] = [
  { id: "t5", key: "LUM-091", title: "Audit the account overview for WCAG 2.2", assignee: people.alex, status: "To do", when: formatDue(daysFromToday(0)) },
  { id: "t7", key: "ZEN-402", title: "Add Disabled back to Input and Search", assignee: people.bao, status: "Done", when: "Completed today" },
  { id: "t2", key: "PHIN-219", title: "Connect the rewards API to checkout", assignee: people.bao, status: "In review", when: formatDue(daysFromToday(1)) },
  { id: "t1", key: "PHIN-214", title: "Design the points history screen", assignee: people.chi, status: "In progress", when: formatDue(daysFromToday(2)) },
  { id: "t6", key: "LUM-095", title: "Spike: passkey sign-in on iOS", assignee: people.finn, status: "Done", when: "Completed Monday" },
];

export default function ShowCompleted() {
  const headingId = useId();
  const [showDone, setShowDone] = useState(false);
  const shown = showDone ? weekTasks : weekTasks.filter((task) => task.status !== "Done");
  return (
    // The view option heads the box (Figma List-Box Header-Slot): header and rows share Card-padding-medium, so they line
    // up on every device; rows have no side padding of their own.
    <ListBox header={
      <Stack direction="row" justify="between" align="center" gap="sm" wrap>
        <Heading level={4} id={headingId} textStyle="Body/Small/Bold" tone="light">Due this week</Heading>
        {/* A view option hugs its label (a Toggle alone is 232px): a hugging Stack that stretches its child. */}
        <Stack width="hug" align="stretch" fillChildren>
          <Toggle theme="toggle-first" size="md" label="Show completed" checked={showDone} onCheckedChange={setShowDone} />
        </Stack>
      </Stack>
    }>
      <List aria-labelledby={headingId}>
        {shown.map((task) => (
          // The task title is the row's content and nothing opens it: it may wrap to a second line, never cut.
          <ListItem key={task.id} title={task.title} titleLines={2} caption={`${task.key} · ${task.when}`}
            leading={<PersonAvatar person={task.assignee} size="medium" named />}
            trailing={<BadgeStatus status={taskStep[task.status]}>{task.status}</BadgeStatus>} />
        ))}
      </List>
    </ListBox>
  );
}
