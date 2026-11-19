import { useState } from "react";
import {
  AppShell, AppShellHeader, Avatar, Badge, BadgeStatus, DescriptionList, PageHeader, SidePanel, Sidebar, Stack, Table, TableMedia, TableText, Text,
  Thumbnail, plural, useToast, useZen,
  type BadgeTheme, type IconName, type TableColumn,
} from "@zen-ds/react";
import { formatDate, initials, me, people, priorityTheme, projectById, studio, taskStep, tasks, type Person, type Task, type TaskStatus } from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const badge = (label: string, theme: BadgeTheme) => <Badge theme={theme} background="subtle">{label}</Badge>;
const taskBadge = (status: TaskStatus) => <BadgeStatus status={taskStep[status]}>{status}</BadgeStatus>;

type View = "all" | "mine" | "review";
const views: Record<View, { label: string; icon: IconName; description: string; filter: (task: Task) => boolean }> = {
  all: { label: "All tasks", icon: "icon-check-square-line", description: "Every open project at the studio", filter: () => true },
  mine: { label: "Assigned to me", icon: "icon-user-circle-line", description: `Tasks ${me.name} owns`, filter: (task) => task.assignee === "alex" },
  review: { label: "In review", icon: "icon-eye-line", description: "Waiting for a reviewer", filter: (task) => task.status === "In review" },
};

/* The studio's mark and name. The Small-Density logo slot is 20px tall: the mark is a 2xs Thumbnail that fits it, the
   name takes Body/Small/Bold; the row and the mark keep the slot's height (at Comfortable they would grow by 2px). */
const denseLogo = <Stack direction="row" gap="xs" align="center" style={{ height: "100%" }}><Thumbnail src={studio.logo} alt="" size="2xs" style={{ width: "auto", height: "100%", aspectRatio: "1" }} /><Text as="span" textStyle="Body/Small/Bold">{studio.name}</Text></Stack>;
const denseMark = <Thumbnail src={studio.logo} alt={studio.name} size="2xs" />;

export default function TaskWorkbench() {
  const { toast } = useToast();
  const breakpoint = useZen()?.breakpoint;
  const [view, setView] = useState<View>("all");
  const [rows, setRows] = useState(tasks);
  const [openId, setOpenId] = useState<string | null>(null);
  // On a phone the table keeps Task and Status and folds the assignee into the caption.
  const narrow = breakpoint === "mobile";
  const shown = rows.filter(views[view].filter);
  const task = rows.find((item) => item.id === openId);
  const setStatus = (id: string, status: TaskStatus) => setRows((list) => list.map((item) => (item.id === id ? { ...item, status } : item)));
  const columns: TableColumn<Task>[] = [
    { id: "task", header: "Task", cell: (row) => <TableText bold caption={narrow ? `${row.key} · ${people[row.assignee].name}` : row.key}>{row.title}</TableText> },
    ...(narrow ? [] : [{ id: "assignee", header: "Assignee", width: "168px", cell: (row: Task) => <TableMedia bold={false} media={<Avatar size="xsmall" {...avatarOf(people[row.assignee])} />}>{people[row.assignee].name}</TableMedia> }]),
    { id: "status", header: "Status", width: narrow ? undefined : "136px", cell: (row) => taskBadge(row.status) },
  ];
  return (
    // A flat Canvas pairs with a flat Sidebar: navigation and page are one plane. There is no top row, so the collapse
    // toggle lives in the Sidebar's header (collapse="sidebar").
    <AppShell canvas="flat" collapse="sidebar" defaultSidebarCollapsed
      sidebar={<Sidebar variant="small-density" background="flat" logo={denseLogo} logoCollapsed={denseMark}
        selectedId={view} onItemClick={(item) => { setView(item.id as View); setOpenId(null); }}
        sections={[{ items: (Object.keys(views) as View[]).map((id) => ({ id, label: views[id].label, icon: views[id].icon, counter: rows.filter(views[id].filter).filter((item) => item.status !== "Done").length || undefined })) }]} />}
      header={<AppShellHeader main={<PageHeader title={views[view].label} description={`${views[view].description} · ${plural(shown.length, "task")}`} />} />}
      // The task opens beside the page; when the page would get narrower than a tablet, the panel opens as a modal.
      sidePanel={(
        <SidePanel type="standard" size="small" open={Boolean(task)} onOpenChange={(open) => { if (!open) setOpenId(null); }}
          title={task?.title ?? ""} description={task ? `${task.key} · ${projectById(task.project).name}` : undefined}
          primaryAction={task ? (task.status === "Done"
            ? { label: "Reopen task", onClick: () => setStatus(task.id, "To do") }
            : { label: "Mark as done", onClick: () => { const before = task.status; setStatus(task.id, "Done"); toast({ title: "Task completed", action: { label: "Undo", onClick: () => setStatus(task.id, before) } }); } }) : undefined}
          secondaryAction={{ label: "Close" }}>
          {task ? (
            <DescriptionList divider items={[
              { term: "Status", description: taskBadge(task.status) },
              { term: "Priority", description: badge(task.priority, priorityTheme[task.priority]) },
              { term: "Assignee", description: people[task.assignee].name },
              { term: "Due", description: formatDate(task.due) },
              { term: "Comments", description: plural(task.comments, "comment") },
            ]} />
          ) : null}
        </SidePanel>
      )}
    >
      <Table aria-label={views[view].label} rows={shown} columns={columns} onRowClick={(row) => setOpenId(row.id)} />
    </AppShell>
  );
}
