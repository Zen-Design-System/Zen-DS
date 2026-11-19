import { useId, useRef, useState } from "react";
import { Avatar, Box, Chip, EmptyState, Heading, List, ListItem, Stack, Text, plural } from "@zen-ds/react";
import { initials, people, tasks, type Person, type PersonId, type TaskStatus } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };

const bandStatuses: TaskStatus[] = ["To do", "In progress", "In review"];
const openTasks = tasks.filter((task) => task.status !== "Done");
const openAssignees = [...new Set(openTasks.map((task) => task.assignee))];

/** Open tasks under a Brand/Accent band: the filter chips on the band take an overlay level. */
export default function ColourBand() {
  const headingId = useId();
  const [on, setOn] = useState<TaskStatus[]>(["In progress"]);
  const [assignee, setAssignee] = useState<PersonId | null>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  const toggle = (value: TaskStatus) => setOn((list) => list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  // Clear filters goes away once pressed, so the focus moves to the count it changed.
  const clearAll = () => {
    setOn([]);
    setAssignee(null);
    setTimeout(() => countRef.current?.focus());
  };
  const shown = openTasks.filter((task) => (!on.length || on.includes(task.status)) && (!assignee || task.assignee === assignee));
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      {/* Brand/Accent band (Background/Accent/Solid): the same pink in light and dark mode, so the chips on it take an
          overlay level (the default, Black-Overlay) and the text static On-White-Overlay tones. */}
      <Box surface="accent-solid" padding="lg" radius="lg">
        <Stack gap="md">
          <Stack gap="2xs">
            <Heading level={4} id={headingId} textStyle="Heading/Subheading" tone="on-white-overlay-strongest">Open tasks</Heading>
            <Text ref={countRef} tabIndex={-1} role="status" textStyle="Body/Small/Regular" tone="on-white-overlay-base">{plural(shown.length, "task")}</Text>
          </Stack>
          <Stack direction="row" gap="xs" align="center" wrap role="group" aria-label="Filters">
            <Chip variant="advanced" level="black-overlay" selected={assignee !== null} popoverLabel="Assignee"
              popoverItems={openAssignees.map((id) => ({ id, label: people[id].name, selected: id === assignee, ...(people[id].photo ? { photoSrc: people[id].photo } : { leading: <Avatar size="sm" {...avatarOf(people[id])} />, theme: "avatar-small" as const }) }))}
              onPopoverSelect={(item) => setAssignee(item.id as PersonId)} onClearSelection={() => setAssignee(null)}>
              {assignee ? people[assignee].name : "Assignee"}
            </Chip>
            {bandStatuses.map((status) => (
              <Chip key={status} variant="normal" level="black-overlay" selected={on.includes(status)} onClick={() => toggle(status)}>{status}</Chip>
            ))}
          </Stack>
        </Stack>
      </Box>
      {shown.length ? (
        <List aria-label="Open tasks">
          {shown.map((task) => (
            <ListItem key={task.id} title={task.title} caption={`${task.key} · ${task.status} · ${people[task.assignee].name}`}
              leading={<Avatar size="md" {...avatarOf(people[task.assignee])} />} />
          ))}
        </List>
      ) : (
        <EmptyState size="sm" headingLevel={4} icon="icon-search-medium-line" title="No tasks match" secondaryAction={{ label: "Clear filters", onClick: clearAll }}>
          Turn on another status or pick someone else.
        </EmptyState>
      )}
    </Stack>
  );
}
