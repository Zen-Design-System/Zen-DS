import { useRef, useState, type RefObject } from "react";
import {
  AppShell, BottomNavigation, BottomSheet, DockIcon, FileIcon, InputField, List, ListItem, SelectField, TopNavigation, fileIconFormatOf, useFormState,
  type BottomNavigationItem,
} from "@zen-ds/react";
import { TODAY, daysFromToday, files, formatBytes, formatDay, formatDue, formatRelative, formatTime, projectById, projects } from "../../data";

const events = [
  { id: "e1", title: "Design critique", start: daysFromToday(0, 11, 0), end: daysFromToday(0, 12, 0), project: "phin-loyalty" },
  { id: "e2", title: "Lumen Bank check-in", start: daysFromToday(0, 14, 0), end: daysFromToday(0, 14, 30), project: "lumen-banking" },
  { id: "e3", title: "Sprint planning", start: daysFromToday(1, 9, 30), end: daysFromToday(1, 10, 30), project: "phin-loyalty" },
  { id: "e4", title: "Customs states workshop", start: daysFromToday(2, 13, 0), end: daysFromToday(2, 15, 0), project: "mekong-tracking" },
  { id: "e5", title: "Moodboard review", start: daysFromToday(7, 15, 0), end: daysFromToday(7, 16, 0), project: "saola-brand" },
];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
/** "Today" · "Tomorrow" · "Oct 12" */
const dayLabel = (d: Date) => { const days = Math.round((startOfDay(d) - startOfDay(TODAY)) / 86_400_000); return days === 0 ? "Today" : days === 1 ? "Tomorrow" : formatDay(d); };
const projectOptions = projects.filter((project) => project.status !== "Completed").map((project) => ({ value: project.id, label: project.name }));

// Short task names, as a task app shows them: the row never cuts a title off. Soonest first.
type TodoItem = { id: string; title: string; project: string; due: Date };
const todos: TodoItem[] = [
  { id: "t5", title: "WCAG audit of accounts", project: "lumen-banking", due: TODAY },
  { id: "t2", title: "Review the rewards API", project: "phin-loyalty", due: daysFromToday(1) },
  { id: "t1", title: "Points history screen", project: "phin-loyalty", due: daysFromToday(2) },
  { id: "t4", title: "Usability sessions", project: "lumen-banking", due: daysFromToday(3) },
  { id: "t9", title: "Transfer limit copy", project: "lumen-banking", due: daysFromToday(4) },
  { id: "t3", title: "Android regression test", project: "phin-loyalty", due: daysFromToday(5) },
  { id: "t6", title: "Metric card guidelines", project: "zen-ds", due: daysFromToday(6) },
  { id: "t8", title: "Outdoor range moodboard", project: "saola-brand", due: daysFromToday(7) },
  { id: "t10", title: "Points counter motion", project: "phin-loyalty", due: daysFromToday(8) },
  { id: "t7", title: "Customs hold states", project: "mekong-tracking", due: daysFromToday(9) },
  { id: "t11", title: "Dark mode tokens", project: "zen-ds", due: daysFromToday(10) },
  { id: "t13", title: "Trail map icons", project: "saola-brand", due: daysFromToday(15) },
  { id: "t12", title: "Passkey help article", project: "lumen-banking", due: daysFromToday(16) },
];
const items: BottomNavigationItem[] = [
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "calendar", label: "Calendar", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
  { id: "files", label: "Files", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
];

/** A task app with the Floating tab bar and its create action floating beside it. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function FloatingWithCreate({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("tasks");
  const [list, setList] = useState(todos);
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  // Tapping the current destination again scrolls it back to the top; another destination opens at its top. What
  // scrolls is the scroller passed as scrollRef, or the page itself in your app.
  const open = (id: string) => {
    const behavior = id === tab ? "smooth" : "auto";
    if (scrollRef === "window") shellRef.current?.scrollIntoView({ behavior });
    else scrollRef.current?.scrollTo({ top: 0, behavior });
    setTab(id);
  };
  const form = useFormState({
    initialValues: { name: "", project: "zen-ds" },
    validate: (v) => ({ name: v.name.trim() ? undefined : "Enter a task name" }),
    onSubmit: (v, { reset }) => {
      const id = `new-${list.length + 1}`;
      setList((all) => [{ id, title: v.name.trim(), project: v.project, due: daysFromToday(7) }, ...all]);
      setFresh(id);
      setCreating(false);
      reset();
      // The new task lands on top of Tasks.
      open("tasks");
    },
  });
  const start = () => { form.reset(); setCreating(true); };
  const title = items.find((item) => item.id === tab)!.label;
  return (
    <>
      {/* Floating: the pill sits over the content on a fade to Surface; the screen keeps room under its last row. */}
      <AppShell ref={shellRef}
        topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title={title} largeTitle={title} />}
        bottomNavigation={<BottomNavigation type="floating" items={items} value={tab} onValueChange={open}
          action={{ icon: "icon-plus-line", label: "New task", onClick: start }} />}>
        {tab === "tasks" ? (
          <List aria-label="Tasks">
            {list.map((task) => {
              const project = projectById(task.project);
              return (
                <ListItem key={task.id} title={task.title} caption={`${task.id === fresh ? "Created just now" : formatDue(task.due)} · ${project.name}`}
                  leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />} />
              );
            })}
          </List>
        ) : null}
        {tab === "calendar" ? (
          <List aria-label="Coming up">
            {events.map((event) => {
              const project = projectById(event.project);
              return <ListItem key={event.id} title={event.title} caption={`${dayLabel(event.start)} · ${formatTime(event.start)} – ${formatTime(event.end)}`} leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />} />;
            })}
          </List>
        ) : null}
        {tab === "files" ? (
          <List aria-label="Files">
            {files.map((file) => (
              <ListItem key={file.id} title={file.name} caption={`${formatBytes(file.bytes)} · ${formatRelative(file.updated)}`} leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} />
            ))}
          </List>
        ) : null}
      </AppShell>
      <BottomSheet inline open={creating} onOpenChange={setCreating} title="New task" onSubmit={form.handleSubmit}
        primaryAction={{ label: "Create task" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Task name" placeholder="e.g. Review the onboarding copy" {...form.field("name")} data-autofocus="" />
        <SelectField label="Project" options={projectOptions} {...form.selectField("project")} />
      </BottomSheet>
    </>
  );
}
