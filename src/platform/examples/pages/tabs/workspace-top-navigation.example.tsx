import { useId, useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellHeader, Avatar, AvatarStack, Badge, BadgeStatus, Button, Card, DockIcon, Grid, Heading, List, ListBox, ListItem, Menu,
  MetricCard, PageHeader, ProgressBar, Stack, TabPanel, Tabs, Text, Thumbnail, plural, useToast, useZen,
} from "@zen-ds/react";
import {
  activity, formatDate, formatDue, formatMoney, formatRelative, initials, invoiceStatusTheme, invoices, me, people, peopleList, projectById, projectProgress,
  projectStep, projects, studio, tasks, taskStep, type Person,
} from "../../data";

/** A person as an Avatar: their photo, or initials on their steady theme. */
const avatar = (p: Person) => p.photo
  ? <Avatar size="medium" theme="photo" src={p.photo} alt="" />
  : <Avatar size="medium" theme={p.theme} alt="">{initials(p.name)}</Avatar>;

const activeProjects = projects.filter((p) => p.status === "Active");
const unpaidInvoices = invoices.filter((i) => i.status === "Sent" || i.status === "Overdue");
const myOpenTasks = tasks.filter((t) => t.assignee === me.id && t.status !== "Done");
const workspaceSections: Record<string, { title: string; description: string }> = {
  home: { title: "Home", description: `${studio.name} this week` },
  projects: { title: "Projects", description: `${plural(activeProjects.length, "active project")}` },
  invoices: { title: "Invoices", description: `${plural(unpaidInvoices.length, "invoice")} waiting for payment` },
  people: { title: "People", description: `${plural(peopleList.length, "person", "people")} in ${plural(new Set(peopleList.map((p) => p.team)).size, "team")}` },
};
const unpaidTotal = unpaidInvoices.reduce((sum, i) => sum + i.amount, 0);
const overdueTotal = invoices.filter((i) => i.status === "Overdue").reduce((sum, i) => sum + i.amount, 0);
const paidTotal = invoices.filter((i) => i.status === "Paid").reduce((sum, i) => sum + i.amount, 0);
const myDueSoon = [...myOpenTasks].sort((a, b) => a.due.getTime() - b.due.getTime());
const teamsInStudio = [...new Set(peopleList.map((p) => p.team))];

export default function WorkspaceTopNav() {
  // One idPrefix per rendered example, so tab and panel ids stay unique when the page shows it twice.
  const prefix = `workspace-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [tab, setTab] = useState("projects");
  const { toast } = useToast();
  // On a phone only the logo's mark stays and the tabs scroll.
  const phone = useZen()?.breakpoint === "mobile";
  const homeTasksId = useId();
  const homeActivityId = useId();
  const otherProjectsId = useId();
  const unpaidId = useId();
  const paidId = useId();
  const panel = (id: string, children: ReactNode) => <TabPanel idPrefix={prefix} id={id} hidden={tab !== id}>{children}</TabPanel>;
  const open = (title: string, detail: string) => toast({ title, children: detail });

  return (
    // AppShell pattern="top-bar": no Sidebar, the studio's main sections are Large tabs in the header's top row (64px
    // items, the selected one underlined), beside the logo; the account stays last. The page's PageHeader is the
    // header's Main row and changes with the tab; every block on the Canvas is flat (no Sidebar, so no elevation).
    <AppShell pattern="top-bar"
      header={(
        <AppShellHeader
          leading={(
            <Stack direction="row" align="center" gap="lg">
              {/* The logo fits the top row at every density (Thumbnail 2xs); on a phone only the mark stays. */}
              {phone ? <Thumbnail src={studio.logo} alt={studio.name} size="2xs" /> : (
                <Stack direction="row" gap="xs" align="center" width="hug">
                  <Thumbnail src={studio.logo} alt="" size="2xs" />
                  <Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text>
                </Stack>
              )}
              <Tabs idPrefix={prefix} size="lg" aria-label="Workspace" value={tab} onValueChange={setTab} items={[
                { id: "home", label: "Home" },
                { id: "projects", label: "Projects", badge: activeProjects.length },
                { id: "invoices", label: "Invoices", badge: unpaidInvoices.length || undefined },
                { id: "people", label: "People" },
              ]} />
            </Stack>
          )}
          // The account menu, last in the top row: Your profile opens People.
          actions={(
            <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => setTab("people") },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
            ]} />
          )}
          main={<PageHeader title={workspaceSections[tab].title} description={workspaceSections[tab].description} />}
        />
      )}
    >
      {panel("home", (
        <Stack gap="md">
          <Grid columns="repeat(auto-fit, minmax(min(100%, 200px), 1fr))" gap="md">
            <MetricCard label="Active projects" value={`${activeProjects.length}`} icon="icon-folder-line" iconTheme="blue" theme="default" />
            <MetricCard label="Unpaid invoices" value={formatMoney(unpaidTotal)} icon="icon-receipt-line" iconTheme="orange" theme="default" />
            <MetricCard label="Your open tasks" value={`${myOpenTasks.length}`} icon="icon-check-square-line" iconTheme="green" theme="default" />
          </Grid>
          <Grid columns="minmax(0, 1fr) minmax(0, 1fr)" stackBelow={720} gap="md" align="start">
            <ListBox as="section" aria-labelledby={homeTasksId} header={<Heading level={2} id={homeTasksId} textStyle="Heading/Subheading">Your tasks</Heading>}>
              <List aria-labelledby={homeTasksId}>
                {myDueSoon.map((t) => (
                  <ListItem key={t.id} title={t.title} titleLines={2} caption={`${t.key} · ${formatDue(t.due)}`}
                    leading={<DockIcon icon={projectById(t.project).icon} theme={projectById(t.project).theme} background="subtle" size="medium" />}
                    trailing={<BadgeStatus status={taskStep[t.status]}>{t.status}</BadgeStatus>}
                    onClick={() => open(t.title, `${t.key} · ${projectById(t.project).name}`)} />
                ))}
              </List>
            </ListBox>
            <ListBox as="section" aria-labelledby={homeActivityId} header={<Heading level={2} id={homeActivityId} textStyle="Heading/Subheading">Since yesterday</Heading>}>
              <List aria-labelledby={homeActivityId}>
                {activity.slice(0, 4).map((a) => (
                  <ListItem key={a.id} title={people[a.actor].name} caption={`${a.verb} ${a.object} · ${formatRelative(a.at)}`} leading={avatar(people[a.actor])} />
                ))}
              </List>
            </ListBox>
          </Grid>
        </Stack>
      ))}
      {panel("projects", (
        <Stack gap="xl">
          {/* The active projects as flat cards, as many 280px columns as fit: each with its progress and its next date. */}
          <Grid as="ul" minColumnWidth={280} gap="md" aria-label="Active projects">
            {activeProjects.map((p) => (
              <Card as="li" key={p.id} theme="default">
                <Stack gap="md">
                  <Stack direction="row" gap="sm" align="center">
                    <DockIcon icon={p.icon} theme={p.theme} background="subtle" size="medium" />
                    <Stack gap="2xs" width="fill">
                      <Heading level={2} textStyle="Heading/Subheading">{p.name}</Heading>
                      <Text textStyle="Body/Small/Regular" tone="base">{p.client}</Text>
                    </Stack>
                  </Stack>
                  <ProgressBar value={p.progress} label aria-label={`${p.name} progress`} />
                  <Stack direction="row" gap="xs" align="center" justify="between">
                    <Text as="span" textStyle="Body/Small/Regular" tone="base">{`Due ${formatDate(p.due)}`}</Text>
                    <AvatarStack size="xsmall" max={4} items={p.members.map((id) => people[id].photo ? { src: people[id].photo, alt: people[id].name } : { theme: people[id].theme, alt: people[id].name, children: initials(people[id].name) })} />
                  </Stack>
                  <Button level="tertiary" onClick={() => open(p.name, `${p.client} · ${p.progress}% done · Led by ${people[p.lead].name}`)} aria-label={`Open ${p.name}`}>Open project</Button>
                </Stack>
              </Card>
            ))}
          </Grid>
          <Stack as="section" gap="md" aria-labelledby={otherProjectsId}>
            <Heading level={2} id={otherProjectsId} textStyle="Heading/4">Other projects</Heading>
            <ListBox>
              <List aria-labelledby={otherProjectsId}>
                {projects.filter((p) => p.status !== "Active").map((p) => (
                  <ListItem key={p.id} title={p.name} caption={`${p.client} · Led by ${people[p.lead].name}`}
                    leading={<DockIcon icon={p.icon} theme={p.theme} background="subtle" size="medium" />}
                    trailing={<BadgeStatus status={projectStep[p.status]} progress={projectProgress(p)}>{p.status}</BadgeStatus>}
                    onClick={() => open(p.name, `${p.client} · ${p.status}`)} />
                ))}
              </List>
            </ListBox>
          </Stack>
        </Stack>
      ))}
      {panel("invoices", (
        <Stack gap="xl">
          <Grid columns="repeat(auto-fit, minmax(min(100%, 200px), 1fr))" gap="md">
            <MetricCard iconBackground="solid" label="Outstanding" value={formatMoney(unpaidTotal)} icon="icon-hourglass-line" iconTheme="blue" theme="default" />
            <MetricCard iconBackground="solid" label="Overdue" value={formatMoney(overdueTotal)} icon="icon-alert-triangle-line" iconTheme="red" theme="default" />
            <MetricCard iconBackground="solid" label="Paid this quarter" value={formatMoney(paidTotal)} icon="icon-check-circle-line" iconTheme="green" theme="default" />
          </Grid>
          <Stack as="section" gap="md" aria-labelledby={unpaidId}>
            <Heading level={2} id={unpaidId} textStyle="Heading/4">Waiting for payment</Heading>
            <ListBox>
              <List aria-labelledby={unpaidId}>
                {unpaidInvoices.map((i) => (
                  <ListItem key={i.id} title={i.number} caption={`${i.client} · ${formatMoney(i.amount, true)} · Due ${formatDate(i.due)}`}
                    leading={<DockIcon icon="icon-receipt-line" theme="neutral" background="subtle" size="medium" />}
                    trailing={<Badge theme={invoiceStatusTheme[i.status]} background="subtle">{i.status}</Badge>}
                    onClick={() => open(i.number, `${i.client} · ${formatMoney(i.amount, true)}`)} />
                ))}
              </List>
            </ListBox>
          </Stack>
          <Stack as="section" gap="md" aria-labelledby={paidId}>
            <Heading level={2} id={paidId} textStyle="Heading/4">Paid recently</Heading>
            <ListBox>
              <List aria-labelledby={paidId}>
                {invoices.filter((i) => i.status === "Paid").map((i) => (
                  <ListItem key={i.id} title={i.number} caption={`${i.client} · ${formatMoney(i.amount, true)} · Issued ${formatDate(i.issued)}`}
                    leading={<DockIcon icon="icon-receipt-line" theme="neutral" background="subtle" size="medium" />}
                    trailing={<Badge theme={invoiceStatusTheme[i.status]} background="subtle">{i.status}</Badge>}
                    onClick={() => open(i.number, `${i.client} · ${formatMoney(i.amount, true)}`)} />
                ))}
              </List>
            </ListBox>
          </Stack>
        </Stack>
      ))}
      {panel("people", (
        // One block of rows per team, as many 320px columns as fit.
        <Grid minColumnWidth={320} gap="md" align="start">
          {teamsInStudio.map((team) => (
            <ListBox key={team} as="section" aria-labelledby={`${prefix}-${team.replace(/\s+/g, "-")}`}
              header={<Heading level={2} id={`${prefix}-${team.replace(/\s+/g, "-")}`} textStyle="Heading/Subheading">{team}</Heading>}>
              <List aria-labelledby={`${prefix}-${team.replace(/\s+/g, "-")}`}>
                {peopleList.filter((p) => p.team === team).map((p) => <ListItem key={p.id} title={p.name} caption={`${p.role} · ${p.location}`} leading={avatar(p)} />)}
              </List>
            </ListBox>
          ))}
        </Grid>
      ))}
    </AppShell>
  );
}
