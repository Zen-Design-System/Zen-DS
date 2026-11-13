import { BadgeCounter, BadgeStatus, Grid, List, ListBox, ListItem, Stack, plural } from "@zen-ds/react";
import { people, taskStep, tasks, type TaskStatus } from "../../data";

const taskStatuses: TaskStatus[] = ["To do", "In progress", "In review", "Done"];

export default function TaskBoard() {
  return (
    <Grid columns={{ mobile: 1, tablet: 2, desktop: 4 }} gap="md" align="start">
      {taskStatuses.map((step) => {
        const column = tasks.filter((task) => task.status === step);
        return (
          <Stack key={step} gap="xs" align="stretch" role="group" aria-label={`${step}, ${plural(column.length, "task")}`}>
            <Stack direction="row" gap="xs" align="center">
              <BadgeStatus status={taskStep[step]}>{step}</BadgeStatus>
              <BadgeCounter value={column.length} theme="neutral" background="subtle" aria-hidden="true" />
            </Stack>
            <ListBox>
              <List aria-label={`${step} tasks`}>
                {column.map((task) => <ListItem key={task.id} title={task.title} titleLines={2} caption={`${task.key} · ${people[task.assignee].name}`} />)}
              </List>
            </ListBox>
          </Stack>
        );
      })}
    </Grid>
  );
}
