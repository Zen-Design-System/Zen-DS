import { useId, useState } from "react";
import { Card, DockIcon, Heading, List, ListItem, SkeletonShape, SkeletonText, Stack, Text, VisuallyHidden } from "@zen-ds/react";
import { daysFromToday, formatDue, formatRelative, projectById, tasks } from "../../data";

const dueThisWeek = tasks
  .filter((task) => task.status !== "Done" && task.due >= daysFromToday(0, 0, 0) && task.due <= daysFromToday(7, 23, 59))
  .sort((a, b) => a.due.getTime() - b.due.getTime())
  .slice(0, 4);

/** Loading: the card keeps its title while the body loads. */
export default function DueThisWeek() {
  const [rows, setRows] = useState(dueThisWeek);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(daysFromToday(0, 10, 12));
  /** The reload under way, so Refresh again starts it over. */
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout>>();
  const titleId = useId();
  const refresh = () => {
    setLoading(true);
    clearTimeout(timer);
    // Bao's review finished in the meantime: the refreshed list no longer has his task.
    setTimer(setTimeout(() => {
      setRows((list) => list.filter((task) => task.key !== "PHIN-219"));
      setUpdated(new Date(daysFromToday(0).getTime() - 20_000));
      setLoading(false);
    }, 1200));
  };
  return (
    <Card as="section" theme="default" aria-labelledby={titleId} aria-busy={loading || undefined}
      subAction={{ label: "Refresh", icon: "icon-refresh-cw-01-line", onClick: refresh }}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Due this week</Heading>
          <Text as="span" role="status" textStyle="Caption/Regular" tone="light">{loading ? "Updating…" : `Updated ${formatRelative(updated).toLowerCase()}`}</Text>
        </Stack>
        {loading ? (
          // Each placeholder row has a static list row's rhythm: no padding, a 40px mark, rows Gap/Medium apart.
          <Stack gap="md">
            <VisuallyHidden>Loading tasks</VisuallyHidden>
            {rows.map((task) => (
              <Stack key={task.id} direction="row" gap="md" align="center">
                <SkeletonShape shape="round" size="md" />
                <SkeletonText lines={2} />
              </Stack>
            ))}
          </Stack>
        ) : (
          <List aria-labelledby={titleId}>
            {rows.map((task) => {
              const project = projectById(task.project);
              return (
                <ListItem key={task.id} title={task.title} titleLines={2} caption={`${project.name} · ${formatDue(task.due)}`}
                  leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />} />
              );
            })}
          </List>
        )}
      </Stack>
    </Card>
  );
}
