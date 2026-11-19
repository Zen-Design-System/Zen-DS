import { useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, BadgeStatus, Breadcrumbs, Card, DescriptionList, DockIcon, Grid, Heading, List,
  ListBox, ListItem, Menu, PageHeader, Sidebar, Stack, Text, Thumbnail, plural, useToast, useZen,
  type BreadcrumbItemData, type IconName,
} from "@zen-ds/react";
import {
  activity, formatDate, formatMoney, formatRelative, initials, me, people, peopleList, projectProgress, projectStep, projects, studio,
  type Person, type PersonId, type Team,
} from "../../data";

const avatar = (p: Person) => p.photo
  ? <Avatar size="medium" theme="photo" src={p.photo} alt="" />
  : <Avatar size="medium" theme={p.theme} alt="">{initials(p.name)}</Avatar>;

const teams: { id: string; team: Team; icon: IconName }[] = [
  { id: "design", team: "Design", icon: "icon-palette-line" },
  { id: "engineering", team: "Engineering", icon: "icon-code-02-line" },
  { id: "delivery", team: "Delivery", icon: "icon-target-04-line" },
  { id: "client-services", team: "Client Services", icon: "icon-briefcase-line" },
  { id: "operations", team: "Operations", icon: "icon-settings-01-line" },
];
type Route = { section: "home" | "projects" | "people"; team?: string; person?: PersonId; project?: string };
const teamOf = (p: Person) => teams.find((t) => t.team === p.team)!;
const capitalised = (text: string) => `${text[0].toUpperCase()}${text.slice(1)}`;

export default function TopBarTrail() {
  const { toast } = useToast();
  const phone = useZen()?.breakpoint === "mobile";
  const [route, setRoute] = useState<Route>({ section: "people", team: "design", person: "chi" });
  const [unseen, setUnseen] = useState(2);
  const team = teams.find((t) => t.id === route.team);
  const person = route.person ? people[route.person] : undefined;
  const project = route.project ? projects.find((p) => p.id === route.project) : undefined;
  const sectionLabel = { home: "Home", projects: "Projects", people: "People" }[route.section];

  // The trail mirrors the pages above this one; the Sidebar keeps the section selected at every depth.
  const crumbs: BreadcrumbItemData[] = [
    { id: "home", label: "Home" },
    ...(route.section === "home" ? [] : [{ id: route.section, label: sectionLabel }]),
    ...(team ? [{ id: `team:${team.id}`, label: team.team }] : []),
    ...(person ? [{ id: `person:${person.id}`, label: person.name }] : []),
    ...(project ? [{ id: `project:${project.id}`, label: project.name }] : []),
  ];
  const openProject = (id: string) => setRoute({ section: "projects", project: id });
  const openPerson = (p: Person) => setRoute({ section: "people", team: teamOf(p).id, person: p.id as PersonId });
  const projectRow = (p: (typeof projects)[number]) => (
    <ListItem key={p.id} title={p.name} titleLines={2} caption={`${p.client} · ${p.status === "Completed" ? "Finished" : "Due"} ${formatDate(p.due)}`} leading={<DockIcon icon={p.icon} theme={p.theme} background="subtle" size="medium" />}
      trailing={<BadgeStatus status={projectStep[p.status]} progress={projectProgress(p)}>{p.status}</BadgeStatus>} onClick={() => openProject(p.id)} />
  );
  const go = (id: string) => {
    if (id === "home" || id === "projects" || id === "people") setRoute({ section: id });
    else if (id.startsWith("team:")) setRoute({ section: "people", team: id.slice(5) });
  };
  /** A titled list section on the page. */
  const section = (id: string, label: string, list: ReactNode) => (
    <ListBox as="section" theme="shadow" aria-labelledby={id} header={<Heading level={2} textStyle="Heading/Subheading" id={id}>{label}</Heading>}>
      <List aria-labelledby={id}>{list}</List>
    </ListBox>
  );

  let header: { title: string; description?: string; meta?: ReactNode };
  let content: ReactNode;
  if (project) {
    // Reached from a profile or from Projects, the trail is the same: it shows where the page sits, not the way here.
    const members = project.members.map((id) => people[id]);
    header = { title: project.name, meta: <BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus>, description: `${project.client} · ${project.status === "Completed" ? "Finished" : "Due"} ${formatDate(project.due)}` };
    content = (
      <Grid columns={2} stackBelow={720} gap="md" align="start">
        <Card theme="shadow">
          <DescriptionList items={[
            { term: "Client", description: project.client },
            { term: "Lead", description: people[project.lead].name },
            { term: "Progress", description: `${project.progress}% done` },
            { term: "Budget", description: `${formatMoney(project.spent)} of ${formatMoney(project.budget)}` },
          ]} />
        </Card>
        {section(`${project.id}-team`, "Team", members.map((p) => <ListItem key={p.id} title={p.name} caption={p.id === project.lead ? `${p.role} · Lead` : p.role} leading={avatar(p)} onClick={() => openPerson(p)} />))}
      </Grid>
    );
  } else if (person && team) {
    header = { title: person.name, description: `${person.role} · ${person.location}` };
    content = (
      <Grid columns={2} stackBelow={720} gap="md" align="start">
        <Card theme="shadow">
          <DescriptionList items={[
            { term: "Team", description: team.team },
            { term: "Email", description: person.email },
            { term: "Location", description: person.location },
          ]} />
        </Card>
        {section(`${person.id}-projects`, "Projects", projects.filter((p) => p.members.includes(person.id as PersonId)).map(projectRow))}
      </Grid>
    );
  } else if (team) {
    const members = peopleList.filter((p) => p.team === team.team);
    header = { title: team.team, description: plural(members.length, "person", "people") };
    content = (
      <ListBox theme="shadow">
        <List aria-label={`${team.team} team`}>
          {members.map((p) => <ListItem key={p.id} title={p.name} caption={`${p.role} · ${p.location}`} leading={avatar(p)} onClick={() => openPerson(p)} />)}
        </List>
      </ListBox>
    );
  } else if (route.section === "people") {
    header = { title: "People", description: `${plural(peopleList.length, "person", "people")} across ${plural(teams.length, "team")}` };
    content = (
      <ListBox theme="shadow">
        <List aria-label="Teams">
          {teams.map((t) => (
            <ListItem key={t.id} title={t.team} caption={plural(peopleList.filter((p) => p.team === t.team).length, "person", "people")}
              leading={<DockIcon icon={t.icon} theme="neutral" background="subtle" size="medium" />} onClick={() => setRoute({ section: "people", team: t.id })} />
          ))}
        </List>
      </ListBox>
    );
  } else if (route.section === "projects") {
    header = { title: "Projects", description: `${plural(projects.length, "project")} for ${plural(5, "client")} and the studio` };
    content = (
      <ListBox theme="shadow">
        <List aria-label="Projects">{projects.map(projectRow)}</List>
      </ListBox>
    );
  } else {
    header = { title: "Home", description: `Good morning, ${people.alex.name.split(" ")[0]}. Here is what changed at ${studio.name} since yesterday.` };
    content = (
      <Grid columns={2} stackBelow={720} gap="md" align="start">
        {section("home-recent", "Since yesterday", activity.slice(0, 4).map((a) => (
          <ListItem key={a.id} title={people[a.actor].name} caption={`${capitalised(a.verb)} ${a.object} · ${formatRelative(a.at)}`} leading={avatar(people[a.actor])} onClick={() => openPerson(people[a.actor])} />
        )))}
        {section("home-projects", "Your projects", projects.filter((p) => p.members.includes("alex")).map(projectRow))}
      </Grid>
    );
  }

  return (
    <AppShell
      sidebar={(
        <Sidebar
          // The logo slot is sized to the header (24px, 20px dense): the mark fills its height, so density never outgrows it.
          logo={(
            <Stack direction="row" gap="xs" align="center">
              <Thumbnail src={studio.logo} alt="" size="2xs" />
              <Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text>
            </Stack>
          )}
          logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />}
          sections={[{ items: [
            { id: "home", label: "Home", icon: "icon-home-03-line" },
            { id: "projects", label: "Projects", icon: "icon-folder-line" },
            { id: "people", label: "People", icon: "icon-users-line" },
          ] }]}
          selectedId={route.section}
          onItemClick={(item) => go(item.id)}
        />
      )}
      header={(
        <AppShellHeader
          // The house pattern (HR-Platform): the trail leads the top row, right after the collapse toggle, so it starts
          // at Home without the Master icon. Home itself is the top level, so it shows no trail. A phone keeps the first
          // crumb and the last two.
          leading={crumbs.length > 1 ? <Breadcrumbs key={crumbs.length} master={false} items={crumbs} maxItems={phone ? 3 : undefined} onNavigate={(item, event) => { event.preventDefault(); go(item.id); }} /> : undefined}
          actions={<>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unseen}
              onClick={() => { setUnseen(0); toast({ title: "2 new since yesterday", children: "Chi Tran commented on the points history · Bao Nguyen asked for a review" }); }} />
            {/* The account button at the end of the header’s top row, with its menu. */}
            <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
              { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => toast({ title: "Settings", children: "Notifications, security and billing." }) },
              { type: "separator" },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: "See you soon, Alex." }) },
            ]} />
          </>}
          main={<PageHeader {...header} />}
        />
      )}
    >
      {content}
    </AppShell>
  );
}
