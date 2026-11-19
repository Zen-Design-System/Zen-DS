import { useId, useRef, useState, type KeyboardEvent } from "react";
import { BadgeStatus, Button, Card, DescriptionList, Heading, Menu, Stack, Text, plural, useToast, type MenuItemData } from "@zen-ds/react";
import { formatDate, people, projectById, taskStep, tasks, type PersonId, type Task } from "../../data";

const reviewTask = tasks.find((task) => task.id === "t2")!;

/** A task card whose Actions menu shows letter shortcuts, and the card wires them. */
export default function TaskActionsKeyboard() {
  const { toast } = useToast();
  const [assignee, setAssignee] = useState<PersonId>(reviewTask.assignee);
  const [watching, setWatching] = useState(false);
  const [copies, setCopies] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const titleId = useId();
  const actionsRef = useRef<HTMLButtonElement>(null);
  const task: Task = { ...reviewTask, assignee };
  const assignToMe = () => {
    if (assignee === "alex") return;
    const before = assignee;
    setAssignee("alex");
    toast({ title: "Task assigned to you", action: { label: "Undo", onClick: () => setAssignee(before) } });
  };
  const copyLink = () => {
    void navigator.clipboard?.writeText(`https://zen.dizai.studio/tasks/${task.key}`).catch(() => undefined);
    toast({ title: "Link copied", children: task.key });
  };
  const duplicate = () => {
    setCopies((n) => n + 1);
    // Undo takes the toast's button away, so focus goes back to Actions, which stays.
    toast({ title: "Task duplicated", children: `PHIN-${227 + copies} is in To do`, action: { label: "Undo", onClick: () => {
      setCopies((n) => n - 1);
      actionsRef.current?.focus();
    } } });
  };
  const watch = () => { setWatching((on) => !on); toast({ title: watching ? "You stopped watching this task" : "You're watching this task" }); };
  // Each shortcut is the action's first letter, so typeahead in the open menu lands on the same item.
  const items: MenuItemData[] = [
    { id: "assign", label: "Assign to me", icon: "icon-user-check-line", shortcut: "A", disabled: assignee === "alex", caption: assignee === "alex" ? "Already assigned to you" : undefined, onSelect: assignToMe },
    { id: "copy", label: "Copy link", icon: "icon-link-01-line", shortcut: "C", onSelect: copyLink },
    { id: "duplicate", label: "Duplicate", icon: "icon-duplicate-line", shortcut: "D", onSelect: duplicate },
    { id: "watch", label: watching ? "Stop watching" : "Watch", icon: watching ? "icon-eye-off-line" : "icon-eye-line", shortcut: watching ? "S" : "W", onSelect: watch },
  ];
  // The app wires the shortcuts itself (Menu only shows them): here, while focus is on this task and the menu is closed.
  // An open menu's keys reach the card too (React events bubble from the menu to its trigger's parents): there a letter
  // is typeahead, so the card leaves it alone.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (menuOpen || event.metaKey || event.ctrlKey || event.altKey) return;
    const item = items.find((entry) => entry.shortcut === event.key.toUpperCase() && !entry.disabled);
    if (!item) return;
    event.preventDefault();
    item.onSelect?.();
  };
  return (
    <Card as="section" theme="default" aria-labelledby={titleId} onKeyDown={onKeyDown}>
      <Stack gap="md">
        <Stack gap="xs">
          <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${task.key} · ${projectById(task.project).name}`}</Text>
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">{task.title}</Heading>
        </Stack>
        <DescriptionList items={[
          { term: "Status", description: <BadgeStatus status={taskStep[task.status]}>{task.status}</BadgeStatus> },
          { term: "Assignee", description: people[task.assignee].name },
          { term: "Due", description: formatDate(task.due) },
          { term: "Watchers", description: plural(watching ? 3 : 2, "person", "people") },
        ]} />
        <Stack direction="row">
          <Menu items={items} open={menuOpen} onOpenChange={setMenuOpen}
            trigger={<Button ref={actionsRef} level="tertiary" endIcon="icon-chevron-down-line">Actions</Button>} />
        </Stack>
      </Stack>
    </Card>
  );
}
