import { useId, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, BadgeStatus, Box, Button, DescriptionList, DockIcon, EmptyState, Heading, IconButton,
  InputField, List, ListItem, Menu, ModalForm, PageHeader, Search, SidePanel, Sidebar, SidebarMenuItem, Stack, Table, TableMedia, TableText, Text, Thumbnail,
  plural, useFormState, useToast, useZen, type SidebarItem, type SidebarSection, type TableColumn,
} from "@zen-ds/react";
import { activity, initials, me, people, peopleList, projectProgress, projectStep, projects, studio, type Person, type PersonId } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

// Đìzai Studio's navigation: the same Sidebar on every screen, its current page selected.
const studioNav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "briefs", label: "Briefs", icon: "icon-file-doc-line" },
    { id: "people", label: "People", icon: "icon-users-line" },
    { id: "time-off", label: "Time off", icon: "icon-calendar-line" },
  ] },
  { label: "Finance", items: [
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
  ] },
];
const unreadActivity = activity.filter((item) => item.unread);

/** The top row's utilities: Notifications with the unread count (read on open), then the account. */
function HeaderUtilities() {
  const { toast } = useToast();
  const [unread, setUnread] = useState(unreadActivity.length);
  const first = unreadActivity[0];
  const readAll = () => {
    toast(unread
      ? { title: plural(unread, "new notification"), children: `${people[first.actor].name} ${first.verb} “${first.object}”${unread > 1 ? `, and ${unread - 1} more` : ""}.` }
      : { title: "No new notifications", children: "You’re all caught up." });
    setUnread(0);
  };
  return (
    <>
      <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={readAll} />
      <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
        { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
        { type: "separator" },
        { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${me.name.split(" ")[0]}.` }) },
      ]} />
    </>
  );
}

const projectsOf = (id: PersonId) => projects.filter((project) => project.members.includes(id) || project.lead === id);
const directory = [...peopleList].sort((a, b) => a.name.localeCompare(b.name));
const personColumns: TableColumn<Person>[] = [
  { id: "name", header: "Name", cell: (person) => <TableMedia bold media={<Avatar size="sm" {...avatarOf(person)} />} caption={person.role}>{person.name}</TableMedia> },
  { id: "team", header: "Team", width: "180px", cell: (person) => <TableText>{person.team}</TableText> },
  { id: "office", header: "Office", width: "180px", cell: (person) => <TableText>{person.location}</TableText> },
  { id: "projects", header: "Projects", align: "right", width: "110px", cell: (person) => <TableText>{String(projectsOf(person.id as PersonId).length)}</TableText> },
];
// On a phone the table keeps the person; the team and the office move into the caption.
const phonePersonColumns: TableColumn<Person>[] = [
  { id: "name", header: "Name", cell: (person) => <TableMedia bold media={<Avatar size="sm" {...avatarOf(person)} />} caption={`${person.team} · ${person.location}`}>{person.name}</TableMedia> },
];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The studio's People page: a read-only row opens its person in a Modal Side Panel. */
export default function PeopleDirectory() {
  const { toast } = useToast();
  const projectsId = useId();
  // The opened person stays set while the panel animates out.
  const [opened, setOpened] = useState<Person>(people.chi);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [inviting, setInviting] = useState(false);
  const phone = useZen()?.breakpoint === "mobile";
  const needle = query.trim().toLowerCase();
  const rows = directory.filter((person) => !needle || `${person.name} ${person.role} ${person.team} ${person.location}`.toLowerCase().includes(needle));
  const onProjects = projectsOf(opened.id as PersonId);
  const go = (item: SidebarItem) => {
    if (item.id !== "people") toast({ title: `${item.label} isn’t part of this example`, children: "Each screen here is one page of the studio’s app." });
  };
  const copyEmail = () => {
    void navigator.clipboard?.writeText(opened.email).catch(() => null);
    toast({ title: "Email copied", children: opened.email });
  };
  // Invite person: one email field; a valid address closes the dialog and a toast confirms the invite.
  const invite = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => {
      const text = email.trim();
      if (!text) return { email: "Enter an email address" };
      return { email: emailPattern.test(text) ? undefined : "Enter a valid email address, like name@company.com" };
    },
    onSubmit: ({ email }, { reset }) => {
      setInviting(false);
      reset();
      toast({ type: "positive", title: `Invite sent to ${email.trim()}` });
    },
  });
  // Cancel, Escape and the scrim close the dialog and clear what was typed.
  const changeInviting = (next: boolean) => { setInviting(next); if (!next) invite.reset(); };
  return (
    <AppShell
      sidebar={(
        <Sidebar
          logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />}
          sections={studioNav} selectedId="people" onItemClick={go}
          footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
      )}
      header={(
        <AppShellHeader
          leading={<Box width="fill" maxWidth={400}><Search placeholder="Search people" value={query} onValueChange={setQuery} /></Box>}
          actions={<HeaderUtilities />}
          main={<PageHeader title="People" description={`${plural(directory.length, "person", "people")} on client projects in Ho Chi Minh City, Hanoi, Singapore and remote.`}
            actions={<Button level="primary" startIcon="icon-user-plus-line" onClick={() => setInviting(true)}>Invite person</Button>} />}
        />
      )}
    >
      {/* Read-only rows: the whole row opens the person (Tab reaches it, Enter opens it). The table lies on the page. */}
      <Stack gap="md">
        <Table aria-label="People" columns={phone ? phonePersonColumns : personColumns} rows={rows} onRowClick={(person) => { setOpened(person); setOpen(true); }}
          empty={<EmptyState size="sm" headingLevel={2} icon="icon-search-medium-line" title="Nobody matches" secondaryAction={{ label: "Show everyone", onClick: () => setQuery("") }}>Try a name, a team or an office.</EmptyState>} />
      </Stack>
      {/* Modal: the table waits behind the scrim; Close, Escape or the scrim return focus to the row. */}
      <SidePanel type="modal" open={open} onOpenChange={setOpen} title={opened.name} description={`${opened.role} · ${opened.team}`}>
        <Avatar size="lg" {...avatarOf(opened)} />
        <DescriptionList items={[
          { id: "email", term: "Email", description: opened.email,
            action: <IconButton appearance="flat" size="sm" icon="icon-copy-line" aria-label={`Copy ${opened.name}’s email`} onClick={copyEmail} /> },
          { id: "team", term: "Team", description: opened.team },
          { id: "office", term: "Office", description: opened.location },
        ]} />
        <Stack as="section" gap="xs" aria-labelledby={projectsId}>
          {/* A kicker one level below the panel's h2 title. */}
          <Heading level={3} id={projectsId} textStyle="Body/Small/Bold" tone="light">Projects</Heading>
          {onProjects.length ? (
            <List aria-labelledby={projectsId}>
              {onProjects.map((project) => (
                <ListItem key={project.id} title={project.name} caption={project.client}
                  leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
                  trailing={<BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus>} />
              ))}
            </List>
          ) : (
            <EmptyState size="sm" headingLevel={4} icon="icon-folder-line" title="No projects yet">{`${opened.name.split(" ")[0]} isn't on a project team right now.`}</EmptyState>
          )}
        </Stack>
      </SidePanel>
      <ModalForm open={inviting} onOpenChange={changeInviting} title={`Invite to ${studio.name}`} onSubmit={invite.handleSubmit}
        primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email address" type="email" autoComplete="off" placeholder="name@dizai.studio" data-autofocus="" {...invite.field("email")} />
      </ModalForm>
    </AppShell>
  );
}
