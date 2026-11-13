import { BadgeStatus, DockIcon, List, ListBox, ListItem } from "@zen-ds/react";
import { formatDate, projectProgress, projectStep, projects } from "../../data";

// A project's own status words map onto the workflow (projectStep); the label stays the project's word.
export default function ProjectProgress() {
  return (
    <ListBox>
      <List aria-label="Projects">
        {projects.map((project) => (
          <ListItem key={project.id} title={project.name} caption={`${project.client} · due ${formatDate(project.due)}`}
            leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
            trailing={<BadgeStatus size="sm" status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus>} />
        ))}
      </List>
    </ListBox>
  );
}
