import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  ChipGroup,
  Container,
  EmptyState,
  Form,
  Grid,
  IconButton,
  InputField,
  List,
  ListBox,
  ListItem,
  PageHeader,
  Stack,
  Text,
  VisuallyHidden,
  plural,
  useFormState,
  useToast,
} from "@zen-ds/react";

type Task = { id: string; title: string; done: boolean; createdAt: number };
type Filter = "all" | "active" | "completed";

const STORAGE_KEY = "zen-todo/tasks";

const seed: Task[] = [
  { id: "1", title: "Read the Zen Design System guide", done: true, createdAt: 1 },
  { id: "2", title: "Build a todo list with Zen components", done: false, createdAt: 2 },
  { id: "3", title: "Check the app in dark mode and at phone width", done: false, createdAt: 3 },
];

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : seed;
  } catch {
    return seed;
  }
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [filter, setFilter] = useState<Filter>("all");
  const { toast, dismiss } = useToast();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      /* storage unavailable: keep the tasks in memory */
    }
  }, [tasks]);

  const form = useFormState({
    initialValues: { title: "" },
    validate: (values) => (values.title.trim() ? {} : { title: "Enter a task" }),
    onSubmit: (values, { reset }) => {
      setTasks((current) => [...current, { id: newId(), title: values.title.trim(), done: false, createdAt: Date.now() }]);
      reset();
    },
  });

  const activeCount = tasks.filter((task) => !task.done).length;
  const completedCount = tasks.length - activeCount;

  const visible = useMemo(
    () => tasks.filter((task) => (filter === "all" ? true : filter === "active" ? !task.done : task.done)),
    [tasks, filter],
  );

  const toggle = (id: string, done: boolean) =>
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, done } : task)));

  /** Removes tasks at once and offers Undo, which puts them back where they were. */
  const remove = (ids: string[], title: string) => {
    const before = tasks;
    setTasks((current) => current.filter((task) => !ids.includes(task.id)));
    const toastId = toast({
      title,
      action: { label: "Undo", onClick: () => { setTasks(before); dismiss(toastId); } },
    });
  };

  const emptyState = () => {
    if (tasks.length === 0) {
      return (
        <EmptyState title="No tasks yet" icon="icon-check-done-line" illustration={false} headingLevel={2}>
          Add your first task above to get started.
        </EmptyState>
      );
    }
    if (filter === "active") {
      return (
        <EmptyState
          title="All tasks are done"
          icon="icon-check-done-line"
          illustration={false}
          headingLevel={2}
          secondaryAction={{ label: "Show all tasks", onClick: () => setFilter("all") }}
        >
          Nice work. Add another task when something comes up.
        </EmptyState>
      );
    }
    return (
      <EmptyState
        title="No completed tasks"
        icon="icon-clipboard-line"
        illustration={false}
        headingLevel={2}
        secondaryAction={{ label: "Show all tasks", onClick: () => setFilter("all") }}
      >
        Tick a task off and it shows up here.
      </EmptyState>
    );
  };

  return (
    <Container as="main" maxWidth="sm">
      <Stack gap="lg" paddingY="lg">
        <PageHeader
          title="Tasks"
          description={tasks.length === 0 ? "Nothing on your list" : `${plural(activeCount, "task")} left · ${completedCount} done`}
        />

        <Form form={form} gap="md" aria-label="Add a task">
          <Grid columns={{ mobile: 1, desktop: "1fr auto" }} gap="xs" align="end">
            <InputField label="New task" placeholder="Buy oat milk" {...form.field("title")} />
            <Button level="primary" type="submit" startIcon="icon-plus-line">
              Add task
            </Button>
          </Grid>
        </Form>

        <Stack direction="row" justify="between" align="center" gap="xs" wrap>
          <ChipGroup
            aria-label="Show tasks"
            size="md"
            value={filter}
            onValueChange={(value) => setFilter(value as Filter)}
            options={[
              { value: "all", label: `All (${tasks.length})` },
              { value: "active", label: `Active (${activeCount})` },
              { value: "completed", label: `Completed (${completedCount})` },
            ]}
          />
          {completedCount > 0 && (
            <Button
              level="tertiary"
              startIcon="icon-trash-line"
              onClick={() => remove(tasks.filter((t) => t.done).map((t) => t.id), `${plural(completedCount, "task")} cleared`)}
            >
              Clear completed
            </Button>
          )}
        </Stack>

        <ListBox>
          {visible.length === 0 ? (
            emptyState()
          ) : (
            <List aria-label="Tasks">
              {visible.map((task) => (
                <ListItem
                  key={task.id}
                  titleLines={2}
                  title={
                    <Text as="span" tone={task.done ? "light" : "strongest"} style={task.done ? { textDecoration: "line-through" } : undefined}>
                      {task.title}
                      {task.done && <VisuallyHidden> (done)</VisuallyHidden>}
                    </Text>
                  }
                  leading={
                    <Checkbox
                      aria-label={task.done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
                      checked={task.done}
                      onCheckedChange={(checked) => toggle(task.id, checked)}
                    />
                  }
                  trailing={
                    <IconButton
                      appearance="flat"
                      size="md"
                      icon="icon-trash-line"
                      aria-label={`Delete “${task.title}”`}
                      onClick={() => remove([task.id], "Task deleted")}
                    />
                  }
                />
              ))}
            </List>
          )}
        </ListBox>
      </Stack>
    </Container>
  );
}
