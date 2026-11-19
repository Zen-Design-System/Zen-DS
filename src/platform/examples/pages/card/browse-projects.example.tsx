import { useState } from "react";
import {
  Avatar, AvatarStack, BadgeStatus, Card, Chip, DescriptionList, DockIcon, EmptyState, Grid, Heading, List, ListItem, ProgressBar, SidePanel, Stack, Text,
  plural,
} from "@zen-ds/react";
import {
  formatDate, formatDue, formatMoney, formatRange, initials, people, projectProgress, projectStep, projects, type PersonId, type Project, type ProjectStatus,
} from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const stackItem = (id: PersonId) => {
  const person = people[id];
  return person.photo ? { src: person.photo, alt: person.name, theme: "photo" as const } : { alt: person.name, theme: person.theme };
};
const rowAvatar = (id: PersonId) => {
  const person = people[id];
  return person.photo
    ? <Avatar size="md" theme="photo" src={person.photo} alt="" />
    : <Avatar size="md" theme={person.theme} alt="">{initials(person.name)}</Avatar>;
};

const statuses: ProjectStatus[] = ["Planning", "Active", "On hold", "Completed"];
const leads = [...new Set(projects.map((project) => project.lead))];
/** The fact that matters for each status: when it starts, when it is due, or when it finished. */
const timing = (project: Project) =>
  project.status === "Planning" ? `Starts ${formatDate(project.start)}`
    : project.status === "Completed" ? `Finished ${formatDate(project.due)}`
      : formatDue(project.due);

/** Browse projects: the whole card opens the project, so it holds no buttons of its own. */
export default function BrowseProjects() {
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [lead, setLead] = useState<PersonId | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = projects.filter((project) => (!status || project.status === status) && (!lead || project.lead === lead));
  const opened = projects.find((project) => project.id === openId);
  const clear = () => { setStatus(null); setLead(null); };
  return (
    <Stack gap="md">
      <Stack direction="row" gap="xs" align="center" wrap>
        <Chip variant="advanced" dropdown selected={status !== null} popoverLabel="Status"
          popoverItems={statuses.map((option) => ({ id: option, label: option, selected: option === status }))}
          onPopoverSelect={(item) => setStatus(item.id === status ? null : (item.id as ProjectStatus))}
          onClearSelection={() => setStatus(null)}>
          {status ?? "Status"}
        </Chip>
        <Chip variant="advanced" dropdown selected={lead !== null} popoverLabel="Lead"
          popoverItems={leads.map((id) => ({ id, label: people[id].name, selected: id === lead, ...(people[id].photo ? { photoSrc: people[id].photo } : { leading: <Avatar size="sm" theme={people[id].theme} alt="">{initials(people[id].name)}</Avatar>, theme: "avatar-small" as const }) }))}
          onPopoverSelect={(item) => setLead(item.id === lead ? null : (item.id as PersonId))}
          onClearSelection={() => setLead(null)}>
          {lead ? people[lead].name : "Lead"}
        </Chip>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "project")}</Text>
      </Stack>
      {rows.length ? (
        <Grid minColumnWidth={260}>
          {rows.map((project) => (
            <Card key={project.id} theme="border" onClick={() => setOpenId(project.id)}
              aria-label={`${project.name}, ${project.client}, ${project.status}`}>
              <Stack gap="md">
                <Stack direction="row" justify="between" align="start">
                  <DockIcon icon={project.icon} theme={project.theme} background="solid" />
                  <BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus>
                </Stack>
                <Stack gap="xs">
                  <Heading level={4} textStyle="Heading/Subheading" truncate={2}>{project.name}</Heading>
                  <Text as="span" textStyle="Body/Small/Regular" tone="base" truncate>{`${project.client} · ${timing(project)}`}</Text>
                </Stack>
                <ProgressBar value={project.progress} label aria-label={`${project.name} progress`} />
                <AvatarStack size="sm" items={project.members.map(stackItem)} />
              </Stack>
            </Card>
          ))}
        </Grid>
      ) : (
        <EmptyState size="sm" headingLevel={4} icon="icon-search-medium-line" title="No projects match"
          secondaryAction={{ label: "Clear filters", onClick: clear }}>
          Try another status or lead.
        </EmptyState>
      )}
      <SidePanel type="modal" size="small" open={Boolean(opened)} onOpenChange={(open) => { if (!open) setOpenId(null); }}
        title={opened?.name ?? ""} description={opened?.client}>
        {opened ? (
          <Stack gap="lg">
            <DescriptionList divider items={[
              { term: "Status", description: <BadgeStatus status={projectStep[opened.status]} progress={projectProgress(opened)}>{opened.status}</BadgeStatus> },
              { term: "Lead", description: people[opened.lead].name },
              { term: "Dates", description: formatRange(opened.start, opened.due) },
              { term: "Progress", description: `${opened.progress}%` },
              ...(opened.budget ? [{ term: "Budget", description: `${formatMoney(opened.spent)} of ${formatMoney(opened.budget)}` }] : []),
            ]} />
            <List aria-label={`${opened.name} team`}>
              {opened.members.map((id) => <ListItem key={id} leading={rowAvatar(id)} title={people[id].name} caption={people[id].role} />)}
            </List>
          </Stack>
        ) : null}
      </SidePanel>
    </Stack>
  );
}
