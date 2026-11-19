import { useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, AvatarStack, BadgeStatus, Chip, DescriptionList, DockIcon, EmptyState, Heading, Icon,
  List, ListItem, Menu, PageHeader, ProgressBar, SidePanel, Sidebar, SidebarMenuItem, Stack, Table, TableBadges, TableMedia, TableText, Text, Thumbnail,
  VisuallyHidden, plural, useToast, type AvatarSize, type TableColumn,
} from "@zen-ds/react";
import {
  formatDate, formatDue, formatMoney, formatRange, initials, me, people, projectById, projectProgress, projectStep, projects, studio, tasks,
  type Person, type Project,
} from "../../data";

/** People are Avatars: a photo when there is one, otherwise initials on the person's steady theme. Subtle beside other
 *  content; `lead` in a table's first column, the row's name, where initials are Solid (table/first-column-avatar-solid). */
function PersonAvatar({ person, size, lead = false }: { person: Person; size: AvatarSize; lead?: boolean }) {
  return person.photo
    ? <Avatar size={size} theme="photo" src={person.photo} alt="" />
    : <Avatar size={size} theme={person.theme} background={lead ? "solid" : "subtle"} alt="">{initials(person.name)}</Avatar>;
}

/* Read-only projects open their detail in a Side Panel. */
const projectStatuses = ["Planning", "Active", "On hold", "Completed"];
const projectColumns: TableColumn<Project>[] = [
  { id: "name", header: "Project", cell: (project) => <TableMedia bold media={<DockIcon size="sm" icon={project.icon} theme={project.theme} background="subtle" />} caption={project.client}>{project.name}</TableMedia> },
  { id: "lead", header: "Lead", width: "170px", cell: (project) => <TableMedia bold={false} media={<PersonAvatar person={people[project.lead]} size="xs" />}>{people[project.lead].name}</TableMedia> },
  { id: "due", header: "Due", width: "140px", cell: (project) => <TableText>{formatDate(project.due)}</TableText> },
  // The percentage takes the width of "100%", so every bar in the column ends at the same x.
  { id: "progress", header: "Progress", width: "160px", cell: (project) => (
    <ProgressBar value={project.progress} aria-label={`${project.name} progress`}
      label={<span style={{ display: "inline-block", minWidth: "4.5ch", textAlign: "end" }}>{project.progress}%</span>} />
  ) },
  { id: "status", header: "Status", width: "120px", cell: (project) => <TableBadges><BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus></TableBadges> },
  // A passive chevron says the row opens; the row itself is the target.
  { id: "open", header: <VisuallyHidden>Open</VisuallyHidden>, align: "right", width: "56px", cell: () => <Icon name="icon-chevron-right-line" size="base" decorative /> },
];

function ProjectDetail({ project }: { project: Project }) {
  const internal = project.budget === 0;
  return (
    <DescriptionList items={[
      { id: "status", term: "Status", description: <BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus> },
      { id: "lead", term: "Lead", description: people[project.lead].name },
      { id: "team", term: "Team", description: <AvatarStack max={4} items={project.members.map((id) => { const person = people[id]; return person.photo ? { theme: "photo" as const, src: person.photo, alt: person.name } : { theme: person.theme, alt: person.name, children: initials(person.name) }; })} /> },
      { id: "dates", term: "Dates", description: formatRange(project.start, project.due) },
      { id: "progress", term: "Progress", description: `${project.progress}%` },
      { id: "budget", term: "Budget", description: internal ? "Internal project" : formatMoney(project.budget) },
      { id: "spent", term: "Spent", description: internal ? "Not tracked" : `${formatMoney(project.spent)} (${Math.round((project.spent / project.budget) * 100)}%)` },
    ]} />
  );
}

/** The project's open tasks, from the shared task list: what the panel lists under the facts. */
const openTasksOf = (project: Project) => tasks.filter((task) => task.project === project.id && task.status !== "Done");

export default function ProjectsPage() {
  const { toast } = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [unread, setUnread] = useState(3);
  const opened = openId ? projectById(openId) : null;
  const rows = projects.filter((project) => !status || project.status === status);
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the table." });
  return (
    // The studio's Projects page: AppShell pattern sidebar, the PageHeader in the header's Main row, the status filter
    // in its Sections row, the table on the page (no Card). A row opens its project in the shell's side panel: docked
    // beside the page when the window keeps room for both, else floating over it, so the list stays in place.
    <AppShell
      sidebar={(
        <Sidebar
          logo={(
            <Stack direction="row" gap="xs" align="center">
              <Thumbnail src={studio.logo} alt="" size="2xs" />
              <Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text>
            </Stack>
          )}
          logoCollapsed={<Thumbnail src={studio.logo} alt={studio.name} size="2xs" />}
          selectedId="projects" onItemClick={(item) => { if (item.id !== "projects") notHere(item.label); }}
          sections={[{ items: [
            { id: "home", label: "Home", icon: "icon-home-03-line" },
            { id: "projects", label: "Projects", icon: "icon-folder-line" },
            { id: "tasks", label: "Tasks", icon: "icon-check-square-line" },
            { id: "people", label: "People", icon: "icon-users-line" },
          ] }]}
          footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
      )}
      header={(
        <AppShellHeader
          actions={<>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => {
              setUnread(0);
              toast({ title: unread ? plural(unread, "new notification") : "You're all caught up", children: "Duy Le moved Shipment tracking to On hold" });
            }} />
            <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
            ]} />
          </>}
          main={<PageHeader title="Projects" description={`Client and studio work, from planning to handover · ${plural(projects.length, "project")}`} />}
          sections={(
            <Stack direction="row" gap="xs" align="center" paddingY="xs">
              <Chip variant="advanced" selected={status !== null} popoverLabel="Status"
                popoverItems={projectStatuses.map((value) => ({ id: value, label: value, selected: value === status }))}
                onPopoverSelect={(item) => setStatus(item.id === status ? null : item.id)} onClearSelection={() => setStatus(null)}>
                {status ?? "Status"}
              </Chip>
              <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "project")}</Text>
            </Stack>
          )}
        />
      )}
      sidePanel={(
        <SidePanel type="standard" open={Boolean(opened)} onOpenChange={(open) => { if (!open) setOpenId(null); }}
          title={opened?.name ?? ""} description={opened?.client}>
          {opened ? (
            <Stack gap="lg">
              <ProjectDetail project={opened} />
              {openTasksOf(opened).length ? (
                <Stack as="section" gap="xs" aria-label="Open tasks">
                  <Heading level={3} textStyle="Body/Small/Bold" tone="light">Open tasks</Heading>
                  <List aria-label={`${opened.name} open tasks`}>
                    {openTasksOf(opened).map((task) => (
                      <ListItem key={task.id} title={task.title} titleLines={2} caption={`${task.key} · ${formatDue(task.due)}`}
                        leading={<PersonAvatar person={people[task.assignee]} size="md" />} />
                    ))}
                  </List>
                </Stack>
              ) : null}
            </Stack>
          ) : null}
        </SidePanel>
      )}
    >
      <Table aria-label="Projects" columns={projectColumns} rows={rows} onRowClick={(project) => setOpenId(project.id)}
        empty={<EmptyState headingLevel={2} size="sm" icon="icon-search-medium-line" title="No projects match" secondaryAction={{ label: "Clear filter", onClick: () => setStatus(null) }}>Try another status.</EmptyState>} />
    </AppShell>
  );
}
