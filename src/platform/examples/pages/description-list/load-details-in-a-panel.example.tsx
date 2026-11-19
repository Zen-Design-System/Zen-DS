import { useId, useRef, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, BadgeStatus, Button, ChipGroup, DescriptionList, DockIcon, EmptyState, Heading, InlineMessage, InputField,
  List, ListBox, ListItem, Menu, ModalForm, PageHeader, SidePanel, SkeletonShape, SkeletonText, Stack, Tabs, Text, Thumbnail, VisuallyHidden, plural, useAppShell,
  useFormState, useToast, useZen, type DescriptionListItem,
} from "@zen-ds/react";
import { activity, daysFromToday, formatMoney, formatRange, formatRelative, me, people, projectProgress, projectStep, projects, studio, type PersonId } from "../../data";

type Phase = "loading" | "ready" | "failed";
type ProjectRow = (typeof projects)[number];
/** The studio app's places as the top bar's Tabs: the Top-Bar pattern has no Sidebar, so the side panel keeps its room. */
const studioTabs = [{ id: "home", label: "Home" }, { id: "projects", label: "Projects" }, { id: "invoices", label: "Invoices" }, { id: "people", label: "People" }];
const statusFilters = [{ value: "all", label: "All" }, ...(["Active", "Planning", "On hold", "Completed"] as const).map((status) => ({ value: status, label: status }))];
const unread = activity.filter((item) => item.unread);
/** A place this example does not draw: the toast says so, and the page stays. */
const notHere = (label: string) => ({ title: `${label} isn't part of this example`, children: "This page shows the projects and their details." });

/** The top row's utilities: notifications (the count clears once read) and the account menu, last. */
function StudioActions() {
  const { toast } = useToast();
  const [count, setCount] = useState(unread.length);
  const latest = unread[0];
  return (
    <>
      <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={count} onClick={() => {
        setCount(0);
        toast({ title: count ? plural(count, "new notification") : "You're all caught up", children: `${people[latest.actor].name} ${latest.verb} ${latest.object} · ${formatRelative(latest.at)}` });
      }} />
      <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
        { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
        { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => toast({ title: "Settings", children: "Workspace, notifications and billing." }) },
        { type: "separator" },
        { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
      ]} />
    </>
  );
}

/** The header: the logo and the places in the top row, the PageHeader with the one Primary in the Main row. */
function ProjectsHeader({ count, onNewProject }: { count: number; onNewProject: () => void }) {
  const { toast } = useToast();
  // Under 1024 the shell leaves the Top-Bar pattern for its narrow layout: the places move under the page title, as
  // its sections row.
  const narrow = useAppShell()?.layout !== "desktop";
  const places = (
    <Tabs variant="subtle" aria-label={studio.name} items={studioTabs} value="projects"
      onValueChange={(id) => { if (id !== "projects") toast(notHere(studioTabs.find((tab) => tab.id === id)?.label ?? id)); }} />
  );
  return (
    <AppShellHeader
      leading={(
        <Stack direction="row" gap="xl" align="center">
          <Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>
          {narrow ? null : places}
        </Stack>
      )}
      sections={narrow ? places : undefined}
      actions={<StudioActions />}
      main={(
        <PageHeader title="Projects" description={`${plural(count, "project")} · ${studio.name}`}
          actions={<Button level="primary" startIcon="icon-plus-line" onClick={onNewProject}>New project</Button>} />
      )}
    />
  );
}

/** The details request in the panel: when it was asked for (only the latest answers) and how it went. */
type Details = { at: number; phase: Phase; timedOut: boolean };

/** The studio's Projects page: a project's details load into the Side Panel docked beside the list. */
// docked: whether the shell docks the panel beside the page, which it does while the page keeps a tablet width (744)
// beside the panel (360): on this Top-Bar screen from 1104 wide. Narrower it opens the same SidePanel as a Modal.
export default function ProjectPanels({ docked = true }: { docked?: boolean }) {
  const { toast } = useToast();
  const listId = useId();
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const [list, setList] = useState<ProjectRow[]>(projects);
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  // In a phone-wide window a row's status joins its caption, so no title is cut.
  const compact = useZen()?.breakpoint === "mobile";
  // Docked beside the list, the first project's details are open from the start. A Modal never opens by itself, so a
  // narrow window starts with the list alone. Once someone opens or closes a project, that holds.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const openId = picked === undefined ? (docked ? projects[0].id : null) : picked;
  // The row the details came from: the docked panel hands focus back to it.
  const [fromId, setFromId] = useState(projects[0].id);
  const [details, setDetails] = useState<Details>({ at: 0, phase: "ready", timedOut: false });
  const { phase } = details;
  const opened = list.find((project) => project.id === openId);
  const shown = list.filter((project) => filter === "all" || project.status === filter);
  // A demo server: the details arrive after about a second. Shipment tracking's first request times out, so the panel
  // shows its error once; Try again then succeeds.
  const load = (id: string) => {
    const at = Date.now();
    setDetails((current) => ({ ...current, at, phase: "loading" }));
    setTimeout(() => setDetails((current) => (current.at !== at ? current
      : id === "mekong-tracking" && !current.timedOut ? { ...current, phase: "failed", timedOut: true }
        : { ...current, phase: "ready" })), 900);
  };
  // Docked, the page stays live: picking another project loads it into the same panel and focus stays on the row.
  const open = (id: string) => { setPicked(id); setFromId(id); load(id); };
  // A Modal hands focus back to its row by itself; the docked panel does it here, as its Close goes away.
  const close = () => {
    setPicked(null);
    if (docked) setTimeout(() => rowRef.current?.focus());
  };
  // Try again goes away with its message, so focus moves to the panel title (tabIndex -1), which stays in the panel.
  const retry = (id: string) => { titleRef.current?.focus(); load(id); };
  // New project: the row joins the top of the list and its details load into the panel.
  const create = (name: string) => {
    const id = `new-${list.length}`;
    setList((rows) => [{ ...projects[0], id, name, client: studio.name, icon: "icon-folder-line", theme: "indigo", status: "Planning", lead: me.id as PersonId, members: [me.id as PersonId], progress: 0, start: daysFromToday(7), due: daysFromToday(97), budget: 0, spent: 0 }, ...rows]);
    setFilter("all");
    if (docked) open(id);
  };
  // New project asks for one field: submitting checks it, closes, confirms with a toast; Cancel, Escape and the scrim
  // close it, and focus returns to the button.
  const newProject = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : "Enter a project name" }),
    onSubmit: ({ name }, { reset }) => {
      const text = name.trim();
      create(text);
      setCreating(false);
      reset();
      toast({ type: "positive", title: `${text} created` });
    },
  });
  const changeCreating = (next: boolean) => { setCreating(next); if (!next) newProject.reset(); };
  // While loading, each term is already in place and a Skeleton as tall as the value holds it, so no row moves when the
  // data arrives: a one-line bar for text, and for the Status a pill as tall as the Badge (Badge/Size/Medium) whose
  // bottom sits as far under the text's baseline as the Badge's (its baseline is the bottom of its centred 16px dot).
  const placeholder = (row: DescriptionListItem): DescriptionListItem => ({
    ...row,
    description: row.id === "status"
      ? <SkeletonShape shape="pill" style={{ display: "inline-flex", width: "10ch", height: "var(--zen-badge-size-medium, 28px)", verticalAlign: "calc((var(--zen-element-size-popular-small, 16px) - var(--zen-badge-size-medium, 28px)) / 2)" }} />
      : <SkeletonText lines={1} style={{ display: "inline-flex", width: "10ch", verticalAlign: "middle" }} />,
  });
  const rows = (project: ProjectRow): DescriptionListItem[] => [
    { id: "status", term: "Status", description: <BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus> },
    { id: "lead", term: "Lead", description: people[project.lead].name },
    { id: "dates", term: "Dates", description: formatRange(project.start, project.due) },
    { id: "budget", term: "Budget", description: project.budget ? formatMoney(project.budget) : "None" },
    { id: "spent", term: "Spent", description: project.budget ? formatMoney(project.spent) : "Not tracked" },
  ];
  return (
    <>
      {/* Top-Bar on the Canvas: the studio's places are the header's Tabs, so the page keeps the room the docked
          Side-Panel (Standard, Small 360) needs beside it. The PageHeader with the one Primary sits in the Main row. */}
      <AppShell pattern="top-bar"
        header={<ProjectsHeader count={list.length} onNewProject={() => setCreating(true)} />}
        sidePanel={(
          <SidePanel type="standard" size="small" open={Boolean(opened)} onOpenChange={(next) => { if (!next) close(); }}
            title={opened ? <span ref={titleRef} tabIndex={-1}>{opened.name}</span> : ""}
            description={opened?.client}
            primaryAction={opened ? { label: "Open project", onClick: () => toast(notHere(`The ${opened.name} page`)) } : undefined}>
            {opened ? (
              <Stack gap="md" aria-busy={phase === "loading" || undefined}>
                {phase === "failed" ? (
                  <InlineMessage theme="negative" title="Details didn’t load" action={{ label: "Try again", onClick: () => retry(opened.id) }}>
                    The project service took too long to answer.
                  </InlineMessage>
                ) : (
                  <DescriptionList divider items={phase === "loading" ? rows(opened).map(placeholder) : rows(opened)} />
                )}
                <VisuallyHidden role="status">{phase === "loading" ? "Loading project details" : phase === "failed" ? "" : "Project details loaded"}</VisuallyHidden>
              </Stack>
            ) : null}
          </SidePanel>
        )}
      >
        {/* The Body pads the page: the filter and the list start at the page margin, md apart. */}
        <Stack gap="md">
          <ChipGroup aria-label="Status" size="md" level="secondary" options={statusFilters} value={filter} onValueChange={setFilter} />
          <ListBox as="section" theme="default" aria-labelledby={listId}
            header={<Heading level={2} id={listId} textStyle="Heading/Subheading">{filter === "all" ? "All projects" : filter}</Heading>}>
            {shown.length ? (
              <List aria-labelledby={listId}>
                {shown.map((project) => (
                  <ListItem key={project.id} ref={project.id === fromId ? rowRef : undefined} tabIndex={project.id === fromId ? -1 : undefined}
                    title={project.name} selected={project.id === openId}
                    caption={(compact ? [project.status, project.client] : [project.client, people[project.lead].name]).join(" · ")}
                    leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
                    trailing={compact ? undefined : <BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus>}
                    onClick={() => open(project.id)} />
                ))}
              </List>
            ) : (
              <EmptyState size="sm" headingLevel={3} icon="icon-folder-line" title={`No ${filter.toLowerCase()} projects`}
                secondaryAction={{ label: "Show all projects", onClick: () => setFilter("all") }}>Pick another status.</EmptyState>
            )}
          </ListBox>
        </Stack>
      </AppShell>
      <ModalForm open={creating} onOpenChange={changeCreating} title="New project" onSubmit={newProject.handleSubmit}
        primaryAction={{ label: "Create project" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Project name" autoComplete="off" placeholder="Saola trail guide" data-autofocus="" {...newProject.field("name")} />
      </ModalForm>
    </>
  );
}
