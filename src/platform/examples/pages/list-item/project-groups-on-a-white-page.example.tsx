import { useId } from "react";
import { BadgeCounter, DockIcon, Grid, Heading, List, ListBox, ListItem, Stack, useToast, type ListBoxColor } from "@zen-ds/react";
import { projects, type Project, type ProjectStatus } from "../../data";

/** The project board's groups: a Pale box each, in its own hue (one box family on the page; the colour varies). */
const projectGroups: { id: string; title: string; statuses: ProjectStatus[]; color: ListBoxColor }[] = [
  { id: "active", title: "Active", statuses: ["Active"], color: "blue" },
  { id: "waiting", title: "Planning or on hold", statuses: ["Planning", "On hold"], color: "orange" },
  { id: "done", title: "Completed", statuses: ["Completed"], color: "green" },
];

/** A white Canvas/Alt page (an AppShell with canvas="alt"): colour on a box is Pale (theme/box-on-canvas), one box per
 *  group of projects. */
export default function ProjectBoard() {
  const { toast } = useToast();
  const baseId = useId();
  const open = (project: Project) => toast({ title: project.name, children: `${project.client} · ${project.progress}% done` });
  return (
    <Grid columns={3} stackBelow={720} gap="md" align="start">
      {projectGroups.map((group) => {
        const rows = projects.filter((project) => group.statuses.includes(project.status));
        const titleId = `${baseId}-${group.id}`;
        return (
          <ListBox key={group.id} as="section" theme="pale" color={group.color} aria-labelledby={titleId}
            header={<Stack direction="row" gap="xs" align="center">
              <Heading level={4} id={titleId} textStyle="Heading/Subheading">{group.title}</Heading>
              <BadgeCounter value={rows.length} aria-hidden="true" />
            </Stack>}>
            <List aria-labelledby={titleId}>
              {rows.map((project) => (
                <ListItem key={project.id} title={project.name} titleLines={2} caption={project.client}
                  leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
                  onClick={() => open(project)} />
              ))}
            </List>
          </ListBox>
        );
      })}
    </Grid>
  );
}
