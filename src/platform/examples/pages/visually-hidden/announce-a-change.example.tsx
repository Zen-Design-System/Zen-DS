import { useId, useRef, useState } from "react";
import { Heading, IconButton, List, ListBox, ListItem, Menu, Stack, Text, VisuallyHidden, useZen } from "@zen-ds/react";
import { daysFromToday, formatRange, people, projectById, tasks, type Task } from "../../data";

const sprintTasks: Task[] = ["t1", "t2", "t3"].map((id) => tasks.find((task) => task.id === id)!).concat([
  { id: "t11", key: "PHIN-226", title: "Empty state for members with no points", project: "phin-loyalty", assignee: "gia", status: "To do", priority: "Medium", due: daysFromToday(9), comments: 0 },
  { id: "t12", key: "PHIN-231", title: "Store picker for pickup orders", project: "phin-loyalty", assignee: "chi", status: "To do", priority: "Low", due: daysFromToday(12), comments: 1 },
]);

export default function SprintPriorities() {
  // On a phone the two move buttons fold into one menu per row.
  const narrow = useZen()?.breakpoint === "mobile";
  const [order, setOrder] = useState(sprintTasks);
  const [message, setMessage] = useState("");
  const titleId = useId();
  // Each row's move buttons, by "<task id> <-1 | 1>": focus stays on the moved row.
  const moveRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const move = (id: string, by: -1 | 1) => {
    const from = order.findIndex((task) => task.id === id);
    const to = from + by;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [task] = next.splice(from, 1);
    next.splice(to, 0, task);
    setOrder(next);
    // The row only moves on screen; the status region (rendered empty from the start) says where it went.
    setMessage(`${task.title} moved to priority ${to + 1} of ${next.length}`);
    // Keep focus on the moved row's button, or its other button once this one turns disabled at the top or bottom
    // (with the menu, the Menu returns focus to the row's Reorder button itself).
    const atEnd = by === -1 ? to === 0 : to === next.length - 1;
    setTimeout(() => moveRefs.current[`${id} ${atEnd ? -by : by}`]?.focus());
  };
  return (
    // A ListBox: the title and sprint in its Header-Slot, the rows (and the out-of-flow status region) in its Body-Slot.
    <ListBox as="section" aria-labelledby={titleId}
      header={<Stack gap="2xs">
        <Heading level={4} id={titleId} textStyle="Heading/Subheading">Sprint 7 priorities</Heading>
        <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${projectById("phin-loyalty").name} · ${formatRange(daysFromToday(1), daysFromToday(14))}`}</Text>
      </Stack>}>
      <List aria-labelledby={titleId}>
        {order.map((task, index) => (
          // The order is the priority, shown only by position: the status region below says the new place in words.
          <ListItem key={task.id} title={task.title} titleLines={2} caption={`${task.key} · ${people[task.assignee].name}`}
            trailing={narrow ? (
              <Menu align="end" trigger={<IconButton appearance="flat" level="primary" size="md" icon="icon-dots-horizontal-line" aria-label={`Reorder ${task.title}`} />}
                items={[
                  { id: "up", label: "Move up", icon: "icon-arrow-up-line", disabled: index === 0, onSelect: () => move(task.id, -1) },
                  { id: "down", label: "Move down", icon: "icon-arrow-down-line", disabled: index === order.length - 1, onSelect: () => move(task.id, 1) },
                ]} />
            ) : <>
              <IconButton ref={(button) => { moveRefs.current[`${task.id} -1`] = button; }} appearance="flat" level="primary" size="md" icon="icon-arrow-up-line"
                aria-label={`Move ${task.title} up`} disabled={index === 0} onClick={() => move(task.id, -1)} />
              <IconButton ref={(button) => { moveRefs.current[`${task.id} 1`] = button; }} appearance="flat" level="primary" size="md" icon="icon-arrow-down-line"
                aria-label={`Move ${task.title} down`} disabled={index === order.length - 1} onClick={() => move(task.id, 1)} />
            </>} />
        ))}
      </List>
      <VisuallyHidden role="status">{message}</VisuallyHidden>
    </ListBox>
  );
}
