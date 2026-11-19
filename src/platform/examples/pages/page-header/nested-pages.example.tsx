import { Fragment, useId, useRef, useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, BadgeStatus, Breadcrumbs, Card, DescriptionList, DockIcon, Grid, Heading, Icon, List,
  ListBox, ListItem, Menu, PageHeader, Sidebar, SidebarMenuItem, Stack, Text, Thumbnail, plural, useToast, useZen,
  type BreadcrumbItemData, type SidebarItem, type SidebarSection,
} from "@zen-ds/react";
import {
  activity, formatDate, formatMoney, formatRange, initials, invoices, me, people, projectStep, projects, studio,
  type Invoice, type Person, type PersonId, type Project, type ProjectStatus,
} from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

/** A row caption of whole values: it wraps between values, never inside a date or a name; each "· " stays with the value it introduces, so no line ends on a dot. */
const wholeValues = (...values: (string | false)[]) => values.filter((value): value is string => Boolean(value)).map((value, index) => (
  <Fragment key={`${index}:${value}`}>{index ? " " : null}{whole(`${index ? "· " : ""}${value}`)}</Fragment>
));
/** A run of words that never breaks: its spaces are no-break spaces. */
const whole = (text: string) => text.replace(/ /g, " ");

// ——— The app around the page ————————————————————————————————————————————————————————————————————————
/* Đìzai Studio's navigation: the same Sidebar on every page, its current page selected. */
const studioNav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "clients", label: "Clients", icon: "icon-briefcase-line" },
    { id: "people", label: "People", icon: "icon-users-line" },
    { id: "time-off", label: "Time off", icon: "icon-calendar-line" },
  ] },
  { label: "Finance", items: [
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
    { id: "claims", label: "Expense claims", icon: "icon-wallet-02-line" },
  ] },
];
const unreadActivity = activity.filter((item) => item.unread);
const firstUnread = unreadActivity[0];

/**
 * One page of the studio's app: the AppShell (Layout=Sidebar, the toggle at the start of the header's top row) with the
 * Sidebar on the current page, the top row's utilities (an optional Search at its start, Notifications, the account
 * last) and the page's PageHeader as the header's Main row. The Body pads the page margins itself. `onNavigate` takes the
 * Sidebar rows the example can show (true when it did); any other row says it is not part of this example.
 */
function StudioApp({ here, onNavigate, leading, main, children }: {
  here: string; onNavigate?: (id: string) => boolean; leading?: ReactNode; main: ReactNode; children: ReactNode;
}) {
  const { toast } = useToast();
  const [unread, setUnread] = useState(unreadActivity.length);
  const goTo = (id: string, label: string) => {
    if (onNavigate?.(id) || id === here) return;
    toast({ title: `${label} isn’t part of this example`, children: "Each example on this page is one page of the studio’s app." });
  };
  const readAll = () => {
    toast(unread
      ? { title: plural(unread, "new notification"), children: `${people[firstUnread.actor].name} ${firstUnread.verb} “${firstUnread.object}”${unread > 1 ? `, and ${unread - 1} more` : ""}.` }
      : { title: "No new notifications", children: "You’re all caught up." });
    setUnread(0);
  };
  return (
    <AppShell
      sidebar={(
        // The logo slot is 24px tall: the mark is a 2xs Thumbnail that fits it at every density.
        <Sidebar logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />}
          sections={studioNav} selectedId={here} onItemClick={(item: SidebarItem) => goTo(item.id, item.label)}
          footer={<>
            <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
            <SidebarMenuItem id="help" label="Help" icon="icon-help-circle-line" />
          </>} />
      )}
      header={(
        <AppShellHeader
          // The top row: utilities only (the page's actions are in its PageHeader).
          leading={leading}
          actions={<>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={readAll} />
            <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
              { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => goTo("settings", "Settings") },
              { type: "separator" },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${me.name.split(" ")[0]}.` }) },
            ]} />
          </>}
          // The Main row: the page's own header, its h1.
          main={main}
        />
      )}
    >
      {children}
    </AppShell>
  );
}

// ——— The Clients pages ——————————————————————————————————————————————————————————————————————————————
type Client = { id: string; name: string; since: number; director: PersonId; theme: "brown" | "blue" | "indigo" | "purple" | "plum" };
const clients: Client[] = [
  { id: "phin", name: "Phin & Co", since: 2024, director: "linh", theme: "brown" },
  { id: "lumen", name: "Lumen Bank", since: 2025, director: "hana", theme: "blue" },
  { id: "mekong", name: "Mekong Freight", since: 2025, director: "hana", theme: "indigo" },
  { id: "bookfair", name: "Hanoi Book Fair", since: 2023, director: "linh", theme: "purple" },
  { id: "saola", name: "Saola Outdoor", since: 2026, director: "linh", theme: "plum" },
];
const projectsOf = (client: Client) => projects.filter((project) => project.client === client.name);
const invoicesOf = (client: Client) => invoices.filter((invoice) => invoice.client === client.name);
const outstanding = (rows: Invoice[]) => rows.filter((row) => row.status === "Sent" || row.status === "Overdue").reduce((sum, row) => sum + row.amount, 0);
const projectBadge = (status: ProjectStatus) => <BadgeStatus status={projectStep[status]}>{status}</BadgeStatus>;

export default function ClientPages() {
  // The route: [] Clients · [client] a client · [client, project] a project.
  const [path, setPath] = useState<string[]>(["lumen", "lumen-banking"]);
  // The row a level up came from: it takes focus when you go back up.
  const [fromId, setFromId] = useState<string | null>(null);
  const titleId = useId();
  const sideId = useId();
  // On a narrow page a trailing Badge would squeeze the caption, so the status leads the caption instead.
  const narrow = useZen()?.breakpoint === "mobile";
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLLIElement>(null);
  // Down a level, focus moves to the new page's title; up a level, to the row you came from.
  const down = (next: string[]) => { setPath(next); setTimeout(() => titleRef.current?.focus()); };
  const up = (next: string[]) => { setFromId(path[next.length]); setPath(next); setTimeout(() => rowRef.current?.focus()); };
  const client = clients.find((item) => item.id === path[0]);
  const project = client ? projectsOf(client).find((item) => item.id === path[1]) : undefined;
  // The Sidebar's Clients row leads back to the top level.
  const onNavigate = (id: string) => { if (id !== "clients") return false; if (path.length) up([]); return true; };
  // The trail starts at the top level and ends at this page (not a link). Clients itself has none.
  const trail: BreadcrumbItemData[] = [
    { id: "root", label: "Clients", href: "/clients" },
    ...(client ? [{ id: client.id, label: client.name, href: `/clients/${client.id}` }] : []),
    ...(project ? [{ id: project.id, label: project.name }] : []),
  ];
  // Clients is a section, not the workspace root, so its crumb has no master (house) icon. The top row stays free of a
  // trail (utilities only), so the Breadcrumbs appear once: in the PageHeader. The full trail every time: on a phone the
  // PageHeader turns it into Back to the parent by itself (component-usage-rules §17).
  const breadcrumbs = client ? (
    <Breadcrumbs master={false} items={trail} onNavigate={(item, event) => { event.preventDefault(); up(item.id === "root" ? [] : [item.id]); }} />
  ) : undefined;

  if (client && project) {
    const team = project.members.map((id) => people[id]);
    return (
      <StudioApp here="clients" onNavigate={onNavigate}
        main={<PageHeader breadcrumbs={breadcrumbs} title={<span ref={titleRef} tabIndex={-1}>{project.name}</span>} meta={projectBadge(project.status)}
          description={`${formatRange(project.start, project.due)} · Led by ${people[project.lead].name}`} />}>
        <Grid columns={2} stackBelow={720} gap="md" align="start">
          <Card as="section" theme="shadow" aria-labelledby={sideId}>
            <Stack gap="md">
              <Heading level={2} id={sideId} textStyle="Heading/Subheading">Overview</Heading>
              <DescriptionList items={[
                { term: "Client", description: client.name },
                { term: "Progress", description: `${project.progress}%` },
                { term: "Budget", description: project.budget ? formatMoney(project.budget) : "Internal" },
                { term: "Spent", description: project.budget ? `${formatMoney(project.spent)} · ${Math.round((project.spent / project.budget) * 100)}%` : "Not tracked" },
              ]} />
            </Stack>
          </Card>
          <ListBox as="section" theme="shadow" aria-labelledby={titleId}
            header={<Heading level={2} id={titleId} textStyle="Heading/Subheading">{`Team · ${plural(team.length, "person", "people")}`}</Heading>}>
            <List aria-labelledby={titleId}>
              {team.map((member) => (
                <ListItem key={member.id} title={member.name} caption={member.id === project.lead ? `${member.role} · Lead` : member.role}
                  leading={<Avatar size="md" {...avatarOf(member)} />} />
              ))}
            </List>
          </ListBox>
        </Grid>
      </StudioApp>
    );
  }
  if (client) {
    const list = projectsOf(client);
    const billed = invoicesOf(client);
    return (
      <StudioApp here="clients" onNavigate={onNavigate}
        main={<PageHeader breadcrumbs={breadcrumbs} title={<span ref={titleRef} tabIndex={-1}>{client.name}</span>} description={`Client since ${client.since} · ${people[client.director].name} is the account director`} />}>
        <Grid columns={2} stackBelow={720} gap="md" align="start">
          <ListBox as="section" theme="shadow" aria-labelledby={titleId}
            header={<Heading level={2} id={titleId} textStyle="Heading/Subheading">Projects</Heading>}>
            <List aria-labelledby={titleId}>
              {list.map((item: Project) => (
                <ListItem key={item.id} ref={item.id === fromId ? rowRef : undefined} tabIndex={item.id === fromId ? -1 : undefined} title={item.name}
                  // Narrow: the status leads the caption instead of squeezing it as a trailing Badge.
                  caption={wholeValues(narrow && item.status, `${item.status === "Completed" ? "Finished" : "Due"} ${formatDate(item.due)}`)}
                  leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" />} trailing={narrow ? undefined : projectBadge(item.status)}
                  onClick={() => down([client.id, item.id])} />
              ))}
            </List>
          </ListBox>
          <Card as="section" theme="shadow" aria-labelledby={sideId}>
            <Stack gap="md">
              <Heading level={2} id={sideId} textStyle="Heading/Subheading">Account</Heading>
              <DescriptionList items={[
                { term: "Account director", description: people[client.director].name },
                { term: "Client since", description: String(client.since) },
                { term: "Invoiced in 2026", description: formatMoney(billed.reduce((sum, invoice) => sum + invoice.amount, 0)) },
                { term: "Outstanding", description: formatMoney(outstanding(billed)) },
              ]} />
            </Stack>
          </Card>
        </Grid>
      </StudioApp>
    );
  }
  return (
    // A top-level page: no trail.
    <StudioApp here="clients" onNavigate={onNavigate}
      main={<PageHeader title="Clients" description={`${plural(clients.length, "client")} · ${plural(projects.filter((item) => item.client !== studio.name).length, "project")}`} />}>
      <Stack gap="xl">
        <ListBox as="section" theme="shadow" aria-labelledby={titleId}
          header={<Heading level={2} id={titleId} textStyle="Heading/Subheading">All clients</Heading>}>
          <List aria-labelledby={titleId}>
            {clients.map((item) => (
              <ListItem key={item.id} ref={item.id === fromId ? rowRef : undefined} tabIndex={item.id === fromId ? -1 : undefined} title={item.name} caption={`${plural(projectsOf(item).length, "project")} · ${people[item.director].name}`}
                leading={<Avatar size="md" shape="square" theme={item.theme} alt="">{initials(item.name.replace("&", ""))}</Avatar>}
                trailing={<Icon name="icon-chevron-right-line-small" decorative />}
                onClick={() => down([item.id])} />
            ))}
          </List>
        </ListBox>
      </Stack>
    </StudioApp>
  );
}
