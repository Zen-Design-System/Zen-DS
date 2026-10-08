/* Layout examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one layout decision with Stack, Grid, Box and Container, and
   every gap comes from the spacing ladder (usage rules §13): a main column beside an aside, annotated settings at a
   readable width, cards that reflow and keep equal heights, a cluster that wraps, a panel that centres its empty state,
   and the same ladder on a phone. Two more place layers like Figma constraints and effects: a panel at the Sidebar's
   elevation, and photos with layers on a phone (a feed whose photo frames clip their corners and pin Save and a caption
   bar, opening on background media under a sheet that rounds only its top corners). */
import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Avatar } from "../../../components/Avatar";
import { Badge, type BadgeTheme } from "../../../components/Badge";
import { BottomSheet } from "../../../components/BottomSheet";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Checkbox } from "../../../components/Checkbox";
import { Chip } from "../../../components/Chip";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { Form, FormActions, FormFieldset, useFormState } from "../../../components/Form";
import type { IconName } from "../../../components/Icon";
import { Image } from "../../../components/Image";
import { InputField, SelectField } from "../../../components/Input";
import { Box, Container, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { MetricCard } from "../../../components/MetricWidget";
import { PageHeader } from "../../../components/PageHeader";
import { Sidebar, type SidebarSection } from "../../../components/Sidebar";
import { Table, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { Tag } from "../../../components/Tag";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { platformMedia, type PlatformPhoto } from "../../PlatformMedia";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import {
  daysFromToday, formatCompactMoney, formatDate, formatDay, formatDue, formatMoney, formatRange, initials, invoiceStatusTheme, invoices,
  people, projectById, projectStatusTheme, projects, studio, tasks, taskStatusTheme,
  type Person, type PersonId, type TaskStatus,
} from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./layout.css";

export const page: PlatformPage = "layout";

/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const statusBadge = (status: TaskStatus) => <Badge theme={taskStatusTheme[status]} background="subtle">{status}</Badge>;
const taskStatuses: TaskStatus[] = ["To do", "In progress", "In review", "Done"];
/** A row caption of whole values: it wraps between values, never inside a key or a name; each "· " stays with the value it introduces, so no line ends on a dot. */
const wholeValues = (...values: (string | false)[]) => values.filter((value): value is string => Boolean(value)).map((value, index) => (
  <Fragment key={`${index}:${value}`}>{index ? " " : null}<span className="px-layout-value">{index ? "· " : null}{value}</span></Fragment>
));

/** The width of an element, kept current: the table folds its columns when the main column gets narrow. */
function useWidth() {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, width] as const;
}

// ——— 1. Main column and aside ——————————————————————————————————————————————————————————————————————————
const lumen = projectById("lumen-banking");
type ProjectTask = { id: string; key: string; title: string; assignee: PersonId; status: TaskStatus; due: Date };
const lumenTasks: ProjectTask[] = [
  { id: "t5", key: "LUM-091", title: "Audit the account overview for WCAG 2.2", assignee: "alex", status: "To do", due: daysFromToday(0) },
  { id: "t4", key: "LUM-088", title: "Run five usability sessions on transfers", assignee: "ava", status: "In progress", due: daysFromToday(3) },
  { id: "l96", key: "LUM-096", title: "Design the transfer limits screen", assignee: "alex", status: "In review", due: daysFromToday(4) },
  { id: "l99", key: "LUM-099", title: "Build the account overview API", assignee: "khoa", status: "In progress", due: daysFromToday(6) },
  { id: "l97", key: "LUM-097", title: "Map the card controls flow", assignee: "ava", status: "To do", due: daysFromToday(8) },
  { id: "l101", key: "LUM-101", title: "Write the release notes for phase 1", assignee: "hana", status: "To do", due: daysFromToday(12) },
  { id: "t6", key: "LUM-095", title: "Spike: passkey sign-in on iOS", assignee: "finn", status: "Done", due: daysFromToday(-2) },
];
type TeamRow = { id: string; title: string; caption: string; person?: Person };
const lumenTeam: TeamRow[] = lumen.members.map((id) => ({ id, title: people[id].name, caption: id === lumen.lead ? `${people[id].role} · Project lead` : people[id].role, person: people[id] }));

function ProjectOverview() {
  const [rows, setRows] = useState(lumenTasks);
  const [team, setTeam] = useState(lumenTeam);
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [dialog, setDialog] = useState<"share" | "task" | "invite" | null>(null);
  const [measure, width] = useWidth();
  const tasksId = useId();
  const teamId = useId();
  const detailsId = useId();
  const shown = rows.filter((task) => !status || task.status === status);
  // A phone-width column keeps the task and its status; the assignee and due date wait for a wider page.
  const narrow = width > 0 && width < 560;
  const columns: TableColumn<ProjectTask>[] = narrow ? [
    { id: "task", header: "Task", cell: (task) => <TableText bold>{task.title}</TableText> },
    // No fixed widths on a phone: the columns share the room instead of scrolling sideways.
    { id: "status", header: "Status", cell: (task) => statusBadge(task.status) },
  ] : [
    // The column that names the row is bold, as TableMedia is by default.
    { id: "task", header: "Task", cell: (task) => <TableText bold>{task.title}</TableText> },
    { id: "assignee", header: "Assignee", width: "176px", cell: (task) => <TableMedia bold={false} media={<Avatar size="xsmall" {...avatarOf(people[task.assignee])} />}>{people[task.assignee].name}</TableMedia> },
    { id: "status", header: "Status", width: "144px", cell: (task) => statusBadge(task.status) },
    { id: "due", header: "Due", width: "136px", cell: (task) => <TableText>{formatDate(task.due)}</TableText> },
  ];
  const addTask = (title: string) => setRows((list) => [{ id: `new-${list.length}`, key: `LUM-${102 + list.length - lumenTasks.length}`, title, assignee: "alex", status: "To do", due: daysFromToday(7) }, ...list]);
  const invite = (email: string) => setTeam((list) => [...list, { id: email, title: email, caption: "Invited just now" }]);

  return (
    <Box className="px-layout-page">
      <Container maxWidth="full">
        {/* Page sections xl apart: the header, then the two columns. */}
        <Stack gap="xl">
          <PageHeader title={lumen.name}
            meta={<Badge theme={projectStatusTheme[lumen.status]} background="subtle">{lumen.status}</Badge>}
            description={`${lumen.client} · ${lumen.progress}% done · Due ${formatDate(lumen.due)}`}
            actions={<><Button level="tertiary" onClick={() => setDialog("share")}>Share</Button><Button level="primary" onClick={() => setDialog("task")}>New task</Button></>} />
          {/* Main two-thirds, aside one-third, lg apart; on phones the aside moves under the main column. */}
          {/* The two columns stop at xl (1440px), so the 1/3 aside does not keep growing on a wide screen (backlog batch 6b). */}
          <Grid columns={{ mobile: 1, desktop: "minmax(0, 2fr) minmax(0, 1fr)" }} gap="lg" align="start" maxWidth={1440}>
            <Stack as="section" gap="md" aria-labelledby={tasksId} ref={measure}>
              <Stack direction="row" gap="xs" align="center" justify="between" wrap>
                <Heading level={2} id={tasksId} textStyle="Heading/4">Tasks</Heading>
                <Chip variant="advanced" dropdown selected={status !== null} popoverLabel="Status"
                  popoverItems={taskStatuses.map((option) => ({ id: option, label: option, selected: option === status }))}
                  onPopoverSelect={(item) => setStatus(item.id === status ? null : (item.id as TaskStatus))}
                  onClearSelection={() => setStatus(null)}>
                  {status ?? "Status"}
                </Chip>
              </Stack>
              {/* The section's table lies on the page: no Card around it. */}
              <Table aria-labelledby={tasksId} rows={shown} columns={columns}
                empty={<EmptyState headingLevel={3} illustration={false} title="No tasks match" secondaryAction={{ label: "Clear filter", onClick: () => setStatus(null) }}>Try another status.</EmptyState>} />
            </Stack>
            <Stack as="aside" gap="md" aria-label="About this project">
              {/* Rows → a ListBox (title and Invite in its header); Details is not rows → a Card. */}
              <ListBox as="section" aria-labelledby={teamId}
                header={<Stack direction="row" gap="xs" align="center" justify="between">
                  <Heading level={2} id={teamId} textStyle="Heading/Subheading">Team</Heading>
                  <Button level="tertiary" startIcon="icon-user-plus-line" onClick={() => setDialog("invite")}>Invite</Button>
                </Stack>}>
                <List aria-labelledby={teamId}>
                  {team.map((member) => (
                    <ListItem key={member.id} title={member.title} caption={member.caption}
                      leading={member.person ? <Avatar size="md" {...avatarOf(member.person)} /> : <Avatar size="md" theme="neutral" background="subtle" alt="">{member.title.slice(0, 2).toUpperCase()}</Avatar>} />
                  ))}
                </List>
              </ListBox>
              <Card as="section" theme="flat" aria-labelledby={detailsId}>
                <Stack gap="md">
                  <Heading level={2} id={detailsId} textStyle="Heading/Subheading">Details</Heading>
                  <DescriptionList items={[
                    { term: "Client", description: lumen.client },
                    { term: "Lead", description: people[lumen.lead].name },
                    { term: "Started", description: formatDate(lumen.start) },
                    { term: "Budget", description: formatMoney(lumen.budget) },
                    { term: "Spent", description: formatMoney(lumen.spent) },
                  ]} divider />
                </Stack>
              </Card>
            </Stack>
          </Grid>
        </Stack>
      </Container>
      <DemoFieldDialog open={dialog === "share"} onOpenChange={(open) => setDialog(open ? "share" : null)} title={`Share ${lumen.name}`}
        field={{ kind: "email", label: "Email address", placeholder: "name@lumenbank.com" }} submitLabel="Share project" confirm={(email) => `Project shared with ${email}`} />
      <DemoFieldDialog open={dialog === "task"} onOpenChange={(open) => setDialog(open ? "task" : null)} title="New task"
        field={{ kind: "name", label: "Task name", placeholder: "Review the savings goals flow" }} submitLabel="Create task" confirm={() => "Task created"} onSubmit={addTask} />
      <DemoFieldDialog open={dialog === "invite"} onOpenChange={(open) => setDialog(open ? "invite" : null)} title="Invite to the team"
        field={{ kind: "email", label: "Email address", placeholder: "name@dizai.studio" }} submitLabel="Send invite" confirm={(email) => `Invite sent to ${email}`} onSubmit={invite} />
    </Box>
  );
}

// ——— 2. Annotated settings ————————————————————————————————————————————————————————————————————————————
type WorkspaceSettings = { name: string; timeZone: string; weekStart: string; digest: boolean; reminders: boolean; leave: boolean };
const firstSettings: WorkspaceSettings = { name: studio.name, timeZone: "hcm", weekStart: "mon", digest: true, reminders: true, leave: false };
const timeZones = [
  { value: "hcm", label: "Ho Chi Minh City (GMT+7)" },
  { value: "sg", label: "Singapore (GMT+8)" },
  { value: "london", label: "London (GMT+1)" },
];
const weekStarts = [{ value: "mon", label: "Monday" }, { value: "sun", label: "Sunday" }, { value: "sat", label: "Saturday" }];

/** One annotated section: the title and its one-line description on the left, the controls in a Card on the right.
 *  Columns lg apart; on phones the description sits md above its card. */
function SettingsSection({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <Grid as="section" columns={{ mobile: 1, desktop: "minmax(0, 1fr) minmax(0, 2fr)" }} columnGap="lg" rowGap="md" align="start" aria-labelledby={id}>
      <Stack gap="xs">
        <Heading level={2} id={id} textStyle="Heading/4">{title}</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">{description}</Text>
      </Stack>
      <Card theme="flat">
        <Stack gap="md">{children}</Stack>
      </Card>
    </Grid>
  );
}

function AnnotatedSettings() {
  const { toast } = useToast();
  const workspaceId = useId();
  const weekId = useId();
  const emailId = useId();
  const form = useFormState<WorkspaceSettings>({
    initialValues: firstSettings,
    validate: (values) => ({ name: values.name.trim() ? undefined : "Enter a workspace name" }),
    // Saved values become the new starting point, so Cancel goes back to them.
    onSubmit: (values, { reset }) => { reset(values); toast({ type: "positive", title: "Settings saved" }); },
  });
  return (
    <Box className="px-layout-page">
      {/* A form reads best at a readable width: Container md (960) centres it with the page margin outside. */}
      <Container maxWidth="md">
        <Stack gap="xl">
          <PageHeader title="Workspace settings" description={`How the ${studio.name} workspace looks and works for everyone in it.`} />
          <Form form={form} gap="xl" aria-label="Workspace settings">
            <SettingsSection id={workspaceId} title="Workspace" description="The name people see when they sign in and in every email Zen sends.">
              <InputField label="Workspace name" {...form.field("name")} />
              <InputField label="Studio domain" defaultValue={studio.domain} readOnly helpText="Only the studio owner can change the domain." />
            </SettingsSection>
            <SettingsSection id={weekId} title="Working week" description="Due dates, timesheets and the team calendar follow these.">
              <SelectField label="Time zone" options={timeZones} {...form.selectField("timeZone")} />
              <SelectField label="Week starts on" options={weekStarts} {...form.selectField("weekStart")} />
            </SettingsSection>
            <SettingsSection id={emailId} title="Email" description="What Zen emails the studio about. Each person can turn these off for themselves.">
              {/* Saved with the form, so these are Checkboxes (a Toggle would apply at once). */}
              <FormFieldset legend="Email the studio about" hideLegend kind="checkbox">
                <Checkbox label="Weekly studio digest" caption="Every Monday at 8:00 am" {...form.checkboxField("digest")} />
                <Checkbox label="Invoice reminders" caption="3 days before an invoice is due" {...form.checkboxField("reminders")} />
                <Checkbox label="Leave requests" caption="When someone on your team asks for time off" {...form.checkboxField("leave")} />
              </FormFieldset>
            </SettingsSection>
            <FormActions>
              <Button level="tertiary" disabled={!form.isDirty} onClick={() => form.reset()}>Cancel</Button>
              <Button level="primary" type="submit">Save changes</Button>
            </FormActions>
          </Form>
        </Stack>
      </Container>
    </Box>
  );
}

// ——— 3. Cards that reflow ——————————————————————————————————————————————————————————————————————————————
type Category = "Product" | "Brand" | "Research";
type Template = { id: string; name: string; summary: string; category: Category; icon: IconName; theme: DockIconTheme; tasks: number; weeks: number };
const templates: Template[] = [
  { id: "app", name: "Mobile app", summary: "Discovery, flows and UI for iOS and Android, with a clickable prototype ready for usability tests.", category: "Product", icon: "icon-mobile-line", theme: "orange", tasks: 18, weeks: 10 },
  { id: "site", name: "Website", summary: "Sitemap, content plan and page designs, handed over as a Zen kit.", category: "Product", icon: "icon-globe-01-line", theme: "blue", tasks: 12, weeks: 6 },
  { id: "brand", name: "Brand refresh", summary: "Audit, moodboards and a new identity: logo, colour, type and tone of voice.", category: "Brand", icon: "icon-palette-line", theme: "green", tasks: 14, weeks: 8 },
  { id: "system", name: "Design system", summary: "Tokens, components and guidelines in Figma and code.", category: "Product", icon: "icon-grid-01-line", theme: "indigo", tasks: 24, weeks: 16 },
  { id: "sprint", name: "Research sprint", summary: "Five interviews and a synthesis workshop in two weeks.", category: "Research", icon: "icon-lightbulb-line", theme: "yellow", tasks: 8, weeks: 2 },
  { id: "usability", name: "Usability test", summary: "Plan, recruit, run and report a moderated test of a product that is already live.", category: "Research", icon: "icon-eye-line", theme: "teal", tasks: 10, weeks: 3 },
  { id: "blueprint", name: "Service blueprint", summary: "Map what customers see and what happens behind it, across every channel from the first visit to support.", category: "Research", icon: "icon-dataflow-01-line", theme: "purple", tasks: 9, weeks: 4 },
  { id: "campaign", name: "Campaign launch", summary: "Key visual, social kit and a landing page for a campaign.", category: "Brand", icon: "icon-rocket-line", theme: "pink", tasks: 11, weeks: 5 },
];
const categories: Category[] = ["Product", "Brand", "Research"];

function TemplateGallery() {
  const [category, setCategory] = useState<Category | null>(null);
  const [picked, setPicked] = useState<Template | null>(null);
  const shown = templates.filter((template) => !category || template.category === category);
  return (
    // Toolbar → grid md; the cards md apart.
    <Stack gap="md">
      <Stack direction="row" gap="xs" align="center" wrap>
        <Chip variant="advanced" dropdown selected={category !== null} popoverLabel="Category"
          popoverItems={categories.map((option) => ({ id: option, label: option, selected: option === category }))}
          onPopoverSelect={(item) => setCategory(item.id === category ? null : (item.id as Category))}
          onClearSelection={() => setCategory(null)}>
          {category ?? "Category"}
        </Chip>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(shown.length, "template")}</Text>
      </Stack>
      {/* As many 240px columns as fit, with no breakpoints; every card stretches to the tallest in its row. */}
      <Grid as="ul" minColumnWidth={240} gap="md" aria-label="Project templates">
        {shown.map((template) => (
          <Card as="li" key={template.id} theme="flat" className="px-layout-template">
            {/* Two groups lg apart, pushed to the top and bottom: the footers line up across the row. */}
            <Stack gap="lg" justify="between" className="px-layout-template-body">
              <Stack gap="md">
                <DockIcon icon={template.icon} theme={template.theme} background="subtle" />
                <Stack gap="xs">
                  <Heading level={4} textStyle="Heading/Subheading">{template.name}</Heading>
                  <Text textStyle="Body/Small/Regular" tone="base">{template.summary}</Text>
                </Stack>
              </Stack>
              <Stack gap="md">
                <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${plural(template.tasks, "task")} · ${plural(template.weeks, "week")}`}</Text>
                <Button level="tertiary" aria-label={`Use the ${template.name} template`} onClick={() => setPicked(template)}>Use template</Button>
              </Stack>
            </Stack>
          </Card>
        ))}
      </Grid>
      <DemoFieldDialog open={picked !== null} onOpenChange={(open) => { if (!open) setPicked(null); }} title={`New ${picked?.name.toLowerCase() ?? ""} project`}
        description={picked ? `Starts with the template's ${plural(picked.tasks, "task")}.` : undefined}
        field={{ kind: "name", label: "Project name", placeholder: "Saola trail guide" }} submitLabel="Create project" confirm={(name) => `${name} created`} />
    </Stack>
  );
}

// ——— 4. A cluster that wraps ——————————————————————————————————————————————————————————————————————————
const chi = people.chi;
const chiSkills = ["Interaction design", "Prototyping", "Design systems", "Accessibility (WCAG 2.2)", "Usability testing", "Service blueprinting", "Figma", "Motion basics", "Workshop facilitation"];
const chiLanguages = ["Vietnamese", "English", "Japanese"];

function ProfileSkills() {
  const { toast } = useToast();
  const [skills, setSkills] = useState(chiSkills);
  const [adding, setAdding] = useState(false);
  const titleId = useId();
  const skillsId = useId();
  const languagesId = useId();
  const remove = (skill: string) => {
    const index = skills.indexOf(skill);
    setSkills((list) => list.filter((item) => item !== skill));
    toast({ title: "Skill removed", children: skill, action: { label: "Undo", onClick: () => setSkills((list) => (list.includes(skill) ? list : [...list.slice(0, index), skill, ...list.slice(index)])) } });
  };
  return (
    <Card as="section" theme="flat" className="px-layout-profile" aria-labelledby={titleId}>
      {/* Groups inside one surface lg apart; each kicker xs above its cluster. */}
      <Stack gap="lg">
        <Stack direction="row" gap="md" align="center">
          <Avatar size="lg" {...avatarOf(chi)} />
          <Stack gap="2xs">
            <Heading level={4} id={titleId} textStyle="Heading/Subheading">{chi.name}</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">{`${chi.role} · ${chi.location}`}</Text>
          </Stack>
        </Stack>
        {/* The editable cluster: its kicker, the Tags and its own Add skill, each xs apart. */}
        <Stack as="section" gap="xs" aria-labelledby={skillsId}>
          <Heading level={5} id={skillsId} textStyle="Body/Small/Bold" tone="light">Skills</Heading>
          {skills.length ? (
            // A row Stack with wrap: Tags flow onto as many lines as they need, 2xs apart across and down.
            <Stack as="ul" direction="row" gap="xs" wrap aria-labelledby={skillsId}>
              {skills.map((skill) => <li key={skill}><Tag remove onRemove={() => remove(skill)}>{skill}</Tag></li>)}
            </Stack>
          ) : <Text textStyle="Body/Small/Regular" tone="base">No skills yet</Text>}
          <Button level="tertiary" startIcon="icon-plus-line" onClick={() => setAdding(true)}>Add skill</Button>
        </Stack>
        {/* Read-only facts stay plain text, so only the cluster that can change looks like Tags. */}
        <Stack as="section" gap="xs" aria-labelledby={languagesId}>
          <Heading level={5} id={languagesId} textStyle="Body/Small/Bold" tone="light">Languages</Heading>
          <Text>{chiLanguages.join(", ")}</Text>
        </Stack>
      </Stack>
      <DemoFieldDialog open={adding} onOpenChange={setAdding} title="Add skill" field={{ kind: "name", label: "Skill", placeholder: "Content design" }}
        submitLabel="Add skill" confirm={() => "Skill added"} onSubmit={(skill) => setSkills((list) => (list.includes(skill) ? list : [...list, skill]))} />
    </Card>
  );
}

// ——— 5. Centred in a panel ————————————————————————————————————————————————————————————————————————————
const saolaDraft = { number: "INV-2026-0143", amount: 12000, due: daysFromToday(30) };

function ClientInvoices() {
  const { toast } = useToast();
  const [created, setCreated] = useState(false);
  const titleId = useId();
  const create = () => {
    setCreated(true);
    toast({ title: "Invoice created", children: saolaDraft.number, action: { label: "Undo", onClick: () => setCreated(false) } });
  };
  return (
    // Header at the top, footnote at the bottom; the ListBox body grows. Empty, it centres the empty state; with an
    // invoice the list starts at the top.
    <ListBox as="section" className="px-layout-cover" aria-labelledby={titleId}
      header={<Stack gap="xs">
        <Heading level={4} id={titleId} textStyle="Heading/Subheading">Invoices</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">Saola Outdoor · Brand refresh</Text>
      </Stack>}
      footer={<Text textStyle="Caption/Regular" tone="light">Synced with Payments 2 minutes ago</Text>}>
      <Stack justify={created ? "start" : "center"} className="px-layout-cover-body">
        {created ? (
          <List aria-labelledby={titleId}>
            <ListItem title={saolaDraft.number} caption={`${formatMoney(saolaDraft.amount)} · Due ${formatDate(saolaDraft.due)}`}
              leading={<DockIcon icon="icon-receipt-line" theme="neutral" background="subtle" />}
              trailing={<Badge theme={invoiceStatusTheme.Draft} background="subtle">Draft</Badge>} />
          </List>
        ) : (
          <EmptyState headingLevel={5} compactTitle illustration title="No invoices yet" primaryAction={{ label: "Create invoice", onClick: create }} icon="icon-receipt-line">
            Bill Saola Outdoor for approved hours. Paid invoices stay here.
          </EmptyState>
        )}
      </Stack>
    </ListBox>
  );
}

// ——— 6. The ladder on a phone ——————————————————————————————————————————————————————————————————————————
type When = "today" | "tomorrow" | "later";
type PhoneTask = { id: string; key: string; title: string; project: string; when: When; done: boolean };
const whenLabels: Record<When, string> = { today: "Today", tomorrow: "Tomorrow", later: "Later this week" };
const whenDue: Record<When, Date> = { today: daysFromToday(0), tomorrow: daysFromToday(1), later: daysFromToday(3) };
const myWeek: PhoneTask[] = [
  { id: "p1", key: "LUM-091", title: "Audit the account overview for WCAG 2.2", project: "lumen-banking", when: "today", done: false },
  { id: "p2", key: "PHIN-214", title: "Review the points history screen", project: "phin-loyalty", when: "today", done: false },
  { id: "p3", key: "ZEN-405", title: "Sign off the Metric card guidelines", project: "zen-ds", when: "today", done: true },
  { id: "p4", key: "LUM-093", title: "Reply to Hana about SOW v3", project: "lumen-banking", when: "today", done: false },
  { id: "p5", key: "PHIN-219", title: "Review the rewards API checkout", project: "phin-loyalty", when: "tomorrow", done: false },
  { id: "p6", key: "SAO-007", title: "Plan the Saola kickoff workshop", project: "saola-brand", when: "tomorrow", done: false },
  { id: "p7", key: "LUM-096", title: "Update the transfer limits copy", project: "lumen-banking", when: "tomorrow", done: false },
  { id: "p8", key: "ZEN-410", title: "Prepare the Q4 design review", project: "zen-ds", when: "tomorrow", done: false },
  { id: "p9", key: "LUM-098", title: "Design the transfer limits screen", project: "lumen-banking", when: "later", done: false },
  { id: "p10", key: "SAO-004", title: "Moodboard feedback for Gia", project: "saola-brand", when: "later", done: false },
  { id: "p11", key: "ZEN-412", title: "Write the Disabled input guidelines", project: "zen-ds", when: "later", done: false },
  { id: "p12", key: "ZEN-413", title: "Run the design team 1:1s", project: "zen-ds", when: "later", done: false },
  { id: "p13", key: "LUM-097", title: "Map the card controls flow", project: "lumen-banking", when: "later", done: false },
  { id: "p14", key: "PHIN-223", title: "Review the Android regression results", project: "phin-loyalty", when: "later", done: false },
];
const projectOptions = ["lumen-banking", "phin-loyalty", "zen-ds", "saola-brand"].map((id) => ({ value: id, label: projectById(id).name }));
const whenOptions = (Object.keys(whenLabels) as When[]).map((value) => ({ value, label: whenLabels[value] }));

function PhoneTasks() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const [tasks, setTasks] = useState(myWeek);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const form = useFormState<{ title: string; project: string; when: string }>({
    initialValues: { title: "", project: "lumen-banking", when: "today" },
    validate: (values) => ({ title: values.title.trim() ? undefined : "Enter a task name" }),
    onSubmit: (values, { reset }) => {
      const next = tasks.length + 1;
      setTasks((list) => [...list, { id: `p${next}`, key: `NEW-${next}`, title: values.title.trim(), project: values.project, when: values.when as When, done: false }]);
      setCreating(false);
      reset();
      toast({ type: "positive", title: "Task added", children: whenLabels[values.when as When] });
    },
  });
  const task = tasks.find((item) => item.id === openId);
  const setDone = (id: string, done: boolean) => setTasks((list) => list.map((item) => (item.id === id ? { ...item, done } : item)));
  const dueToday = tasks.filter((item) => item.when === "today" && !item.done).length;
  const doneThisWeek = tasks.filter((item) => item.done).length;

  if (task) {
    const project = projectById(task.project);
    const back = () => screen.go(`[data-task="${task.id}"] .zen-list-item__wrapper`, () => setOpenId(null));
    return (
      // A pushed screen: compact-alt bar with Back, the same body padding and section gap as the root.
      <PlatformPhone key={task.id} label="Zen tasks" canvas="alt" headerOverlay screenRef={screenRef}
        header={<TopNavigation type="compact-alt" title={task.key} scrollRef={screenRef}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
        footer={<ActionBar position="static" primaryAction={task.done
          ? { label: "Reopen task", onClick: () => setDone(task.id, false) }
          : { label: "Mark as done", onClick: () => { setDone(task.id, true); toast({ title: "Task completed", action: { label: "Undo", onClick: () => setDone(task.id, false) } }); } }} />}>
        {screen.anchor}
        <Stack gap="lg" padding="lg">
          <Heading level={2} textStyle="Heading/4">{task.title}</Heading>
          <Card theme="flat">
            <DescriptionList items={[
              { term: "Project", description: project.name },
              { term: "Client", description: project.client },
              { term: "Due", description: formatDay(whenDue[task.when]) },
              { term: "Status", description: statusBadge(task.done ? "Done" : "To do") },
            ]} />
          </Card>
        </Stack>
      </PlatformPhone>
    );
  }

  return (
    // A tab root on a Surface-Alt screen: the large title folds as the groups scroll under the bar.
    <PlatformPhone key="tasks" label="Zen tasks" canvas="alt" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="alt" title="Tasks" largeTitle="Tasks" scrollRef={screenRef}
        trailing={[{ icon: "icon-plus-line", label: "New task", onClick: () => setCreating(true) }]} />}>
      {screen.anchor}
      {/* Body padding lg (Margin-Compact); sections lg apart on a phone; the two metrics md apart. */}
      <Stack gap="lg" padding="lg">
        <Grid columns={2} gap="md">
          <MetricCard theme="flat" size="lg" label="Due today" value={String(dueToday)} icon="icon-calendar-line" />
          <MetricCard theme="flat" size="lg" label="Done this week" value={String(doneThisWeek)} icon="icon-check-done-line" />
        </Grid>
        {(Object.keys(whenLabels) as When[]).map((when) => {
          const rows = tasks.filter((item) => item.when === when);
          if (!rows.length) return null;
          const groupId = `${baseId}-${when}`;
          return (
            // Kicker xs above its ListBox. Each row opens its task and has no side padding of its own: the ListBox pads 20px on a
            // phone, so the hover fill (12px outside the row) sits 8px from every edge (2XLarge 24px = the fill's 16px + 8px),
            // and the kicker lines up with the row text (paddingX lg, 20px).
            <Stack key={when} as="section" gap="xs" aria-labelledby={groupId}>
              <Box paddingX="lg"><Heading level={2} id={groupId} textStyle="Body/Small/Bold" tone="light">{whenLabels[when]}</Heading></Box>
              <ListBox>
                <List aria-labelledby={groupId}>
                  {rows.map((item) => {
                    const project = projectById(item.project);
                    return (
                      // A trailing Badge would squeeze a phone row's caption, so a done task's status leads the caption.
                      <ListItem key={item.id} data-task={item.id} title={item.title} titleLines={1} caption={wholeValues(item.done && "Done", item.key, project.name)}
                        leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />}
                        onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(item.id))} />
                    );
                  })}
                </List>
              </ListBox>
            </Stack>
          );
        })}
      </Stack>
      <BottomSheet inline open={creating} onOpenChange={(open) => { setCreating(open); if (!open) form.reset(); }} title="New task" onSubmit={form.handleSubmit}
        primaryAction={{ label: "Add task" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Task name" placeholder="Review the onboarding copy" data-autofocus="" {...form.field("title")} />
        <SelectField label="Project" options={projectOptions} {...form.selectField("project")} />
        <SelectField label="Due" options={whenOptions} {...form.selectField("when")} />
      </BottomSheet>
    </PlatformPhone>
  );
}

// ——— 7. Elevated panel ——————————————————————————————————————————————————————————————————————————————————
type ShellPage = "home" | "projects" | "invoices";
const shellSections: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
] }];
const dueThisWeek = tasks.filter((task) => task.status !== "Done" && task.due <= daysFromToday(7, 23, 59)).sort((a, b) => a.due.getTime() - b.due.getTime());
const outstanding = invoices.filter((invoice) => invoice.status === "Sent" || invoice.status === "Overdue").reduce((sum, invoice) => sum + invoice.amount, 0);
const clientCount = new Set(projects.map((project) => project.client)).size;

/** A Surface panel at the Sidebar's elevation (Shadow/Bottom/Level-1, no border): the desktop block of rows (radius 2xl,
 *  padding xl) around static rows, which pad 0, so their text sits 24px from every edge. Nothing in it is clickable, so
 *  it is a Box, not a Card. */
function ElevatedList({ children, ...name }: { children: ReactNode; "aria-label"?: string; "aria-labelledby"?: string }) {
  return (
    <Box surface="surface" radius="2xl" padding="xl" clip={false}>
      <List {...name}>{children}</List>
    </Box>
  );
}

function ElevatedPanels() {
  const [page, setPage] = useState<ShellPage>("home");
  const dueId = useId();
  // A narrow page keeps each row's title readable: the status leads the caption instead of squeezing it as a trailing Badge.
  const [measure, width] = useWidth();
  const narrow = width > 0 && width < 560;
  const badge = (theme: BadgeTheme, status: string) => (narrow ? undefined : <Badge theme={theme} background="subtle">{status}</Badge>);
  let content: ReactNode;
  if (page === "projects") {
    content = (
      <>
        <PageHeader title="Projects" description={`${plural(projects.length, "project")} for ${plural(clientCount, "client")}`} />
        <ElevatedList aria-label="Projects">
          {projects.map((project) => (
            <ListItem key={project.id} title={project.name} titleLines={2}
              caption={wholeValues(narrow && project.status, project.client, `${project.progress}% done`)}
              leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />}
              trailing={badge(projectStatusTheme[project.status], project.status)} />
          ))}
        </ElevatedList>
      </>
    );
  } else if (page === "invoices") {
    content = (
      <>
        <PageHeader title="Invoices" description={`${formatMoney(outstanding)} outstanding`} />
        <ElevatedList aria-label="Invoices">
          {invoices.map((invoice) => (
            <ListItem key={invoice.id} title={invoice.number}
              caption={wholeValues(narrow && invoice.status, invoice.client, formatMoney(invoice.amount), invoice.status === "Paid" ? `Issued ${formatDate(invoice.issued)}` : `Due ${formatDate(invoice.due)}`)}
              leading={<DockIcon icon="icon-receipt-line" theme="neutral" background="subtle" size="md" />}
              trailing={badge(invoiceStatusTheme[invoice.status], invoice.status)} />
          ))}
        </ElevatedList>
      </>
    );
  } else {
    content = (
      <>
        <PageHeader title="Home" description={`${plural(dueThisWeek.length, "task")} due this week`} />
        {/* MetricCard's default theme is the same elevation: Shadow/Bottom/Level-1 and no border. */}
        <Grid columns={{ mobile: 1, desktop: 3 }} gap="md">
          <MetricCard label="Due this week" value={String(dueThisWeek.length)} icon="icon-calendar-line" theme="flat" />
          <MetricCard label="Active projects" value={String(projects.filter((project) => project.status === "Active").length)} icon="icon-folder-line" theme="flat" />
          <MetricCard label="Outstanding" value={formatCompactMoney(outstanding)} icon="icon-coins-line" theme="flat" />
        </Grid>
        <Stack as="section" gap="md" aria-labelledby={dueId}>
          <Heading level={2} id={dueId} textStyle="Heading/4">Due this week</Heading>
          <ElevatedList aria-labelledby={dueId}>
            {dueThisWeek.map((task) => (
              <ListItem key={task.id} title={task.title} titleLines={2} caption={wholeValues(narrow && task.status, task.key, formatDue(task.due))}
                leading={<Avatar size="md" {...avatarOf(people[task.assignee])} />} trailing={badge(taskStatusTheme[task.status], task.status)} />
            ))}
          </ElevatedList>
        </Stack>
      </>
    );
  }
  return (
    // A Canvas/Default page beside the default Sidebar (Surface + Shadow/Bottom/Level-1, no border): every Surface on the
    // screen takes the same elevation.
    <div className="pe-shell" data-canvas="default">
      <Sidebar logo={<Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text>} sections={shellSections} selectedId={page}
        onItemClick={(item) => setPage(item.id as ShellPage)}
        background="flat" />
      {/* Page body padded xl (Margin-Comfortable); sections xl apart. */}
      <Stack ref={measure} gap="xl" padding="xl" width="fill">{content}</Stack>
    </div>
  );
}

// ——— 8. Layers over photos —————————————————————————————————————————————————————————————————————————————
// The Events tab of the Đìzai app. Each photo in the feed is a frame its layers pin to: Save to the top-right corner and
// the caption bar to the bottom edge. An event opens on a media screen: its photo is background media under the whole
// screen, and the details sit in a sheet docked to the bottom.
type StudioEvent = { id: string; name: string; start: Date; end?: Date; going: number; photo: PlatformPhoto; organiser: Person; about: string; join: string };
const studioEvents: StudioEvent[] = [
  { id: "hoi-an", name: "Sketch weekend in Hội An", start: daysFromToday(10), end: daysFromToday(11), going: 9, photo: platformMedia.site[2], organiser: people.gia,
    about: "Two slow days in the old town: sketch the lanes and the river at dawn, then share the pages over coffee.", join: "Join the weekend" },
  { id: "vung-tau", name: "Coast ride to Vũng Tàu", start: daysFromToday(24), going: 14, photo: platformMedia.feed[6], organiser: people.duy,
    about: "An early start on the coast road, breakfast by the sea and back in the city by lunch. The studio brings the bikes and helmets.", join: "Join the ride" },
  { id: "da-lat", name: "Studio retreat in Đà Lạt", start: daysFromToday(37), end: daysFromToday(39), going: 31, photo: platformMedia.mountainRoad, organiser: people.minhAnh,
    about: "Three days in the pine hills with the whole studio: the 2027 roadmap, a design jam and the night market.", join: "Join the retreat" },
  { id: "year-end", name: "Year-end party by the river", start: daysFromToday(79), going: 44, photo: platformMedia.site[4], organiser: people.minhAnh,
    about: "Dinner on the riverside with the whole studio and our clients: the year in pictures, the team awards and live music.", join: "Join the party" },
];
const eventDates = (event: StudioEvent) => (event.end ? formatRange(event.start, event.end) : formatDate(event.start));
/** Adds or removes one id, so a toast's Undo puts back exactly the state before the press. */
const withId = (list: string[], id: string, on: boolean) => (on ? [...list.filter((item) => item !== id), id] : list.filter((item) => item !== id));

function StudioEvents() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [going, setGoing] = useState<string[]>([]);
  const save = (event: StudioEvent) => {
    const next = !saved.includes(event.id);
    setSaved((list) => withId(list, event.id, next));
    toast({ title: next ? "Event saved" : "Event removed from saved", children: event.name, action: { label: "Undo", onClick: () => setSaved((list) => withId(list, event.id, !next)) } });
  };
  const rsvp = (event: StudioEvent, next: boolean) => {
    setGoing((list) => withId(list, event.id, next));
    toast({ title: next ? "RSVP sent" : "RSVP cancelled", children: event.name, action: { label: "Undo", onClick: () => setGoing((list) => withId(list, event.id, !next)) } });
  };
  const event = studioEvents.find((item) => item.id === openId);

  if (event) {
    const isSaved = saved.includes(event.id);
    const isGoing = going.includes(event.id);
    const back = () => screen.go(`[data-event="${event.id}"] .zen-list-item__wrapper`, () => setOpenId(null));
    return (
      // A media screen: the overlay bar keeps Back and Save readable on the photo, and the RSVP sits in the footer, clear
      // of the home indicator. The footer's one Button changes its label, so focus stays on it after each press.
      <PlatformPhone key={event.id} label={studio.name} canvas="media" statusBar="light" homeIndicator="dark"
        header={<TopNavigation type="liquid-overlay"
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }}
          trailing={[{ icon: isSaved ? "icon-bookmark-solid" : "icon-bookmark-line", label: isSaved ? "Remove from saved" : "Save event", onClick: () => save(event) }]} />}
        footer={<ActionBar position="static"
          summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{isGoing ? `You and ${plural(event.going, "other")} are going` : `${plural(event.going, "person", "people")} going`}</Text>}
          primaryAction={isGoing ? { label: "Cancel RSVP", level: "tertiary", onClick: () => rsvp(event, false) } : { label: event.join, onClick: () => rsvp(event, true) }} />}>
        {screen.anchor}
        <Box height="fill">
          {/* Background media first: Left & right × Top & bottom, so it covers the whole screen, under the bar too. */}
          <Box position="absolute" constraintX="left-right" constraintY="top-bottom">
            <img className="px-layout-media" src={event.photo.src} alt={event.photo.alt} />
          </Box>
          {/* Written after the photo, so it paints above it. Docked to the bottom edge (Left & right / Bottom): only the
              top corners round, to 3xl, and Shadow/Top/Level-2 casts upward onto the photo. */}
          <Box position="absolute" constraintX="left-right" constraintY="bottom" surface="surface"
            radiusTopLeft="3xl" radiusTopRight="3xl" effectStyle="Shadow/Top/Level-2" padding="lg">
            <Stack gap="md">
              <Stack gap="xs">
                {/* The bar carries no title over the photo, so this heading is the screen's h1. */}
                <Heading level={1}>{event.name}</Heading>
                <Text textStyle="Body/Small/Regular" tone="base">{eventDates(event)}</Text>
              </Stack>
              <Text>{event.about}</Text>
              <List aria-label="Organiser">
                <ListItem title={event.organiser.name} caption={`Organiser · ${event.organiser.role}`}
                  leading={<Avatar size="md" {...avatarOf(event.organiser)} />} />
              </List>
            </Stack>
          </Box>
        </Box>
      </PlatformPhone>
    );
  }

  return (
    // The tab root: the large title folds as the feed scrolls under the bar.
    <PlatformPhone key="events" label={studio.name} headerOverlay screenRef={screenRef}
      header={<TopNavigation type="alt" title="Events" largeTitle="Events" scrollRef={screenRef} />}>
      {screen.anchor}
      <Stack as="ul" gap="md" padding="lg" aria-label="Upcoming events">
        {studioEvents.map((item) => {
          const isSaved = saved.includes(item.id);
          return (
            // The frame owns the radius and clips the photo to it (Clip content), so the photo takes none.
            <Box as="li" key={item.id} data-event={item.id} radius="3xl" clip>
              <Image src={item.photo.src} alt={item.photo.alt} ratio="4:3" radius="none" loading="eager" />
              {/* Right / Top, sm in from both edges. */}
              <Box position="absolute" constraintX="right" constraintY="top" insetRight="sm" insetTop="sm">
                <IconButton appearance="overlay" level="black-overlay" icon={isSaved ? "icon-bookmark-solid" : "icon-bookmark-line"}
                  aria-label={`Save ${item.name}`} aria-pressed={isSaved} onClick={() => save(item)} />
              </Box>
              {/* Left & right / Bottom: the bar stretches between its sm insets at any width. Its radius (lg) plus the
                  inset is the frame's 3xl, so the corners stay concentric. The whole row opens the event and pads 12px above
                  and below: the bar pads md sideways and 2xs above and below, so the row's fill (its height, 12px past it
                  sideways) sits 4px inside the bar on every side (lg 16px = Base 12px + 4px). */}
              <Box position="absolute" constraintX="left-right" constraintY="bottom" insetLeft="sm" insetRight="sm" insetBottom="sm"
                surface="surface" radius="lg" paddingX="md" paddingY="2xs">
                <ListItem as="div" title={item.name} caption={wholeValues(eventDates(item), `${item.going + (going.includes(item.id) ? 1 : 0)} going`)}
                  leading={<Avatar size="md" {...avatarOf(item.organiser)} />}
                  onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(item.id))} />
              </Box>
            </Box>
          );
        })}
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Main column and aside",
    description: "A project page: the PageHeader, then a Grid of a two-thirds main column and a one-third aside, xl apart as page sections. The task table sits on the page under its heading and Status filter; the aside stacks its cards md apart, and on phones it moves under the main column.",
    wide: true,
    screen: true,
    render: () => <ProjectOverview />,
    code: `<Container maxWidth="full">
  {/* Page sections: xl */}
  <Stack gap="xl">
    <PageHeader title="Online banking redesign" meta={<Badge theme="blue" background="subtle">Active</Badge>}
      description="Lumen Bank · 38% done · Due Dec 15, 2026"
      actions={<><Button level="tertiary" onClick={share}>Share</Button><Button level="primary" onClick={newTask}>New task</Button></>} />
    {/* Layout columns: lg. One column on phones, the aside under the main column. */}
    <Grid columns={{ mobile: 1, desktop: "minmax(0, 2fr) minmax(0, 1fr)" }} gap="lg" align="start" maxWidth={1440}>
      <Stack as="section" gap="md" aria-labelledby="tasks">
        {/* Heading and its filter: one toolbar row, xs */}
        <Stack direction="row" gap="xs" align="center" justify="between" wrap>
          <Heading level={2} id="tasks" textStyle="Heading/4">Tasks</Heading>
          <Chip variant="advanced" dropdown selected={status !== null} popoverLabel="Status"
            popoverItems={statuses.map((s) => ({ id: s, label: s, selected: s === status }))}
            onPopoverSelect={(item) => setStatus(item.id === status ? null : item.id)}
            onClearSelection={() => setStatus(null)}>{status ?? "Status"}</Chip>
        </Stack>
        {/* A section's table sits on the page: no Card */}
        <Table aria-labelledby="tasks" rows={shown} columns={columns} empty={<EmptyState … />} />
      </Stack>
      {/* Cards in a stack: md */}
      <Stack as="aside" gap="md" aria-label="About this project">
        {/* Rows → ListBox; the Details DescriptionList → Card */}
        <ListBox as="section" aria-labelledby="team"
          header={<Stack direction="row" gap="xs" align="center" justify="between">
            <Heading level={2} id="team" textStyle="Heading/Subheading">Team</Heading>
            <Button level="tertiary" startIcon="icon-user-plus-line" onClick={invite}>Invite</Button>
          </Stack>}>
          <List aria-labelledby="team">…</List>
        </ListBox>
        <Card as="section" theme="flat" aria-labelledby="details">…</Card>
      </Stack>
    </Grid>
  </Stack>
</Container>`,
  },
  {
    title: "Annotated settings",
    description: "Container maxWidth=\"md\" keeps a long form at a readable width however wide the window is. Each section is a Grid with its title and a short description in the narrow column and its fields in a Card; sections sit xl apart and stack on phones. Save checks the name and moves focus to it when it is empty.",
    wide: true,
    screen: true,
    render: () => <AnnotatedSettings />,
    code: `const form = useFormState({ initialValues, validate, onSubmit: (values, { reset }) => { reset(values); toast({ type: "positive", title: "Settings saved" }); } });

function SettingsSection({ id, title, description, children }) {
  return (
    // Columns lg apart; on phones the description sits md above its card.
    <Grid as="section" columns={{ mobile: 1, desktop: "minmax(0, 1fr) minmax(0, 2fr)" }} columnGap="lg" rowGap="md" align="start" aria-labelledby={id}>
      <Stack gap="xs">
        <Heading level={2} id={id} textStyle="Heading/4">{title}</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">{description}</Text>
      </Stack>
      <Card theme="flat"><Stack gap="md">{children}</Stack></Card>
    </Grid>
  );
}

<Container maxWidth="md">
  <Stack gap="xl">
    <PageHeader title="Workspace settings" description="How the Đìzai Studio workspace looks and works for everyone in it." />
    <Form form={form} gap="xl" aria-label="Workspace settings">
      <SettingsSection id="workspace" title="Workspace" description="The name people see when they sign in and in every email Zen sends.">
        <InputField label="Workspace name" {...form.field("name")} />
        <InputField label="Studio domain" defaultValue="dizai.studio" readOnly helpText="Only the studio owner can change the domain." />
      </SettingsSection>
      <SettingsSection id="week" title="Working week" description="Due dates, timesheets and the team calendar follow these.">…</SettingsSection>
      <SettingsSection id="email" title="Email" description="What Zen emails the studio about.">
        <FormFieldset legend="Email the studio about" hideLegend kind="checkbox">
          <Checkbox label="Weekly studio digest" caption="Every Monday at 8:00 am" {...form.checkboxField("digest")} />
          …
        </FormFieldset>
      </SettingsSection>
      <FormActions>
        <Button level="tertiary" disabled={!form.isDirty} onClick={() => form.reset()}>Cancel</Button>
        <Button level="primary" type="submit">Save changes</Button>
      </FormActions>
    </Form>
  </Stack>
</Container>`,
  },
  {
    title: "Cards that reflow",
    description: "Grid minColumnWidth fits as many 240px columns as the width allows, four here and one on a phone, with no breakpoints. Cells stretch to the tallest card in the row and each card pushes its footer to the bottom, so the Use template buttons line up across each row.",
    wide: true,
    render: () => <TemplateGallery />,
    code: `{/* Toolbar → grid: md */}
<Stack gap="md">
  <Stack direction="row" gap="xs" align="center" wrap>
    <Chip variant="advanced" dropdown selected={category !== null} popoverLabel="Category" … >{category ?? "Category"}</Chip>
    <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(shown.length, "template")}</Text>
  </Stack>
  <Grid as="ul" minColumnWidth={240} gap="md" aria-label="Project templates">
    {shown.map((template) => (
      // .equal-height > .zen-card__content and .equal-height-body { flex: 1 1 auto }: the content fills the stretched card.
      <Card as="li" key={template.id} theme="flat" className="equal-height">
        {/* Two groups lg apart, pushed to the top and the bottom */}
        <Stack gap="lg" justify="between" className="equal-height-body">
          <Stack gap="md">
            <DockIcon icon={template.icon} theme={template.theme} background="subtle" />
            <Stack gap="xs">
              <Heading level={4} textStyle="Heading/Subheading">{template.name}</Heading>
              <Text textStyle="Body/Small/Regular" tone="base">{template.summary}</Text>
            </Stack>
          </Stack>
          <Stack gap="xs">
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{\`\${plural(template.tasks, "task")} · \${plural(template.weeks, "week")}\`}</Text>
            <Button level="tertiary" aria-label={\`Use the \${template.name} template\`} onClick={() => use(template)}>Use template</Button>
          </Stack>
        </Stack>
      </Card>
    ))}
  </Grid>
</Stack>`,
  },
  {
    title: "Wrapping cluster",
    description: "A row Stack with wrap flows the Tags onto as many lines as they need, 2xs apart across and down. Inside the card the header and each labelled group sit lg apart; the kicker sits xs above the Skills cluster and Add skill xs below it. Removing a skill can be undone from the toast.",
    render: () => <ProfileSkills />,
    code: `<Card as="section" theme="flat" aria-labelledby="profile">
  {/* Groups inside one surface: lg */}
  <Stack gap="lg">
    <Stack direction="row" gap="md" align="center">
      <Avatar size="lg" theme="photo" src={chi.photo} alt="" />
      <Stack gap="2xs">
        <Heading level={4} id="profile" textStyle="Heading/Subheading">Chi Tran</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">Product Designer · Hanoi</Text>
      </Stack>
    </Stack>
    {/* Kicker → its cluster → its action: xs */}
    <Stack as="section" gap="xs" aria-labelledby="skills">
      <Heading level={5} id="skills" textStyle="Body/Small/Bold" tone="light">Skills</Heading>
      {/* A cluster: 2xs across and down */}
      <Stack as="ul" direction="row" gap="2xs" wrap aria-labelledby="skills">
        {skills.map((skill) => <li key={skill}><Tag remove onRemove={() => remove(skill)}>{skill}</Tag></li>)}
      </Stack>
      <Button level="tertiary" startIcon="icon-plus-line" onClick={addSkill}>Add skill</Button>
    </Stack>
    {/* Read-only facts stay plain text */}
    <Stack as="section" gap="xs" aria-labelledby="languages">
      <Heading level={5} id="languages" textStyle="Body/Small/Bold" tone="light">Languages</Heading>
      <Text>Vietnamese, English, Japanese</Text>
    </Stack>
  </Stack>
</Card>`,
  },
  {
    title: "Centred in a panel",
    description: "A panel of fixed height: the header stays at the top, the footnote at the bottom, and the middle Stack grows, so an empty state sits in the optical centre. Create invoice puts the draft at the top of the list instead; the toast's Undo brings the empty state back.",
    render: () => <ClientInvoices />,
    code: `{/* .cover { min-height: 26rem }; the ListBox body grows by itself, .grow { flex: 1 1 auto } */}
<ListBox as="section" className="cover" aria-labelledby="invoices"
  header={<Stack gap="xs">
    <Heading level={4} id="invoices" textStyle="Heading/Subheading">Invoices</Heading>
    <Text textStyle="Body/Small/Regular" tone="base">Saola Outdoor · Brand refresh</Text>
  </Stack>}
  footer={<Text textStyle="Caption/Regular" tone="light">Synced with Payments 2 minutes ago</Text>}>
  <Stack justify={invoices.length ? "start" : "center"} className="grow">
    {invoices.length ? <List aria-labelledby="invoices">…</List> : (
      <EmptyState headingLevel={5} compactTitle illustration title="No invoices yet"
        primaryAction={{ label: "Create invoice", onClick: create }} icon="icon-receipt-line">
        Bill Saola Outdoor for approved hours. Paid invoices stay here.
      </EmptyState>
    )}
  </Stack>
</ListBox>`,
  },
  {
    title: "Elevated panel",
    description: "Beside the default Sidebar on a Canvas/Default page, every Surface on the screen takes the Sidebar's elevation: a Box with effectStyle=\"Shadow/Bottom/Level-1\" and no border, like the MetricCards above it. The rows are static, so the panel is the desktop block of rows (radius 2xl, padding xl) as a Box rather than a Card.",
    wide: true,
    screen: true,
    render: () => <ElevatedPanels />,
    code: `{/* Canvas/Default page + default Sidebar (Surface, Shadow/Bottom/Level-1, no border) */}
<Sidebar logo={logo} sections={sections} selectedId={page} onItemClick={(item) => setPage(item.id)} />
<Stack gap="xl" padding="xl" width="fill">
  <PageHeader title="Home" description="7 tasks due this week" />
  {/* MetricCard's default theme is the same elevation */}
  <Grid columns={{ mobile: 1, desktop: 3 }} gap="md">
    <MetricCard label="Due this week" value="7" icon="icon-calendar-line" />
    …
  </Grid>
  <Stack as="section" gap="md" aria-labelledby="due">
    <Heading level={2} id="due" textStyle="Heading/4">Due this week</Heading>
    {/* A Surface panel at the same elevation: shadow, no border; rows pad 0 at the sides, so xl puts their text 24px from every edge */}
    <Box surface="surface" effectStyle="Shadow/Bottom/Level-1" radius="2xl" padding="xl">
      <List aria-labelledby="due">
        {tasks.map((task) => (
          <ListItem key={task.id} title={task.title} titleLines={2} caption={\`\${task.key} · \${formatDue(task.due)}\`}
            leading={<Avatar size="md" {...avatarOf(task.assignee)} />}
            trailing={<Badge theme={taskStatusTheme[task.status]} background="subtle">{task.status}</Badge>} />
        ))}
      </List>
    </Box>
  </Stack>
</Stack>`,
  },
  {
    title: "Phone screen",
    description: "The same ladder on a phone: the body is padded lg (Margin-Compact) and its sections sit lg apart. Two metrics share a fixed two-column Grid md apart, and each day is a white block under its kicker. A task opens its own screen with Back; New task adds one from a Bottom Sheet.",
    render: () => <PhoneTasks />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone key="tasks" canvas="alt" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Tasks" largeTitle="Tasks" scrollRef={screenRef}
    trailing={[{ icon: "icon-plus-line", label: "New task", onClick: () => setCreating(true) }]} />}>
  {/* Body: padding lg (20 = Margin-Compact); sections: lg */}
  <Stack gap="lg" padding="lg">
    {/* Cards in a grid: md */}
    <Grid columns={2} gap="md">
      <MetricCard theme="flat" size="lg" label="Due today" value={String(dueToday)} icon="icon-calendar-line" />
      <MetricCard theme="flat" size="lg" label="Done this week" value={String(done)} icon="icon-check-done-line" />
    </Grid>
    {/* Kicker → its ListBox: xs; rows pad 0 at the sides, so the ListBox pads 20px on a phone with 2XLarge corners (24px = the fill's
        16px + 8px) and the kicker lines up with the row text (lg, 20px) */}
    <Stack as="section" gap="xs" aria-labelledby="today">
      <Box paddingX="lg"><Heading level={2} id="today" textStyle="Body/Small/Bold" tone="light">Today</Heading></Box>
      <ListBox>
        <List aria-labelledby="today">
          {today.map((task) => (
            <ListItem key={task.id} title={task.title} titleLines={2} caption={\`\${task.key} · \${project.name}\`}
              leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />}
              onClick={() => setOpenId(task.id)} />
          ))}
        </List>
      </ListBox>
    </Stack>
    {/* Tomorrow and Later this week follow the same way */}
  </Stack>
</PlatformPhone>`,
  },
  {
    title: "Layers over photos",
    description: "In the Events feed each photo is a frame that clips to 3xl: Save pins to its top-right corner, sm in from both edges (Right / Top), and the caption bar stretches between sm insets along the bottom edge (Left & right / Bottom). An event opens on a media screen: its photo comes first as background media (Left & right × Top & bottom) under the overlay bar, and the details sheet docks to the bottom (Left & right / Bottom) with only its top corners rounded and Shadow/Top/Level-2 casting upward. Back returns to the event you opened, and the toast can undo a save or an RSVP.",
    render: () => <StudioEvents />,
    code: `const screenRef = useRef<HTMLDivElement>(null);
const [openId, setOpenId] = useState<string | null>(null);
const [saved, setSaved] = useState<string[]>([]);
const [going, setGoing] = useState<string[]>([]);
// withId(list, id, on) adds or removes one id, so Undo puts back exactly the state before the press.
const save = (event) => {
  const next = !saved.includes(event.id);
  setSaved((list) => withId(list, event.id, next));
  toast({ title: next ? "Event saved" : "Event removed from saved", children: event.name,
    action: { label: "Undo", onClick: () => setSaved((list) => withId(list, event.id, !next)) } });
};
const rsvp = (event, next) => {
  setGoing((list) => withId(list, event.id, next));
  toast({ title: next ? "RSVP sent" : "RSVP cancelled", children: event.name,
    action: { label: "Undo", onClick: () => setGoing((list) => withId(list, event.id, !next)) } });
};

// The Events feed: each photo is a frame its layers pin to.
<PlatformPhone key="events" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Events" largeTitle="Events" scrollRef={screenRef} />}>
  <Stack as="ul" gap="md" padding="lg" aria-label="Upcoming events">
    {events.map((event) => (
      // The frame owns the radius and clips the photo to it
      <Box as="li" key={event.id} data-event={event.id} radius="3xl" clip>
        <Image src={event.photo.src} alt={event.photo.alt} ratio="4:3" radius="none" />
        {/* Right / Top, sm in from both edges */}
        <Box position="absolute" constraintX="right" constraintY="top" insetRight="sm" insetTop="sm">
          <IconButton appearance="overlay" level="black-overlay" icon={saved.includes(event.id) ? "icon-bookmark-solid" : "icon-bookmark-line"}
            aria-label={\`Save \${event.name}\`} aria-pressed={saved.includes(event.id)} onClick={() => save(event)} />
        </Box>
        {/* Left & right / Bottom between sm insets; radius lg + inset sm = the frame's 3xl */}
        <Box position="absolute" constraintX="left-right" constraintY="bottom" insetLeft="sm" insetRight="sm" insetBottom="sm"
          surface="surface" radius="lg" paddingX="md" paddingY="2xs"> {/* the row pads 12px above and below: its fill sits 4px inside the bar */}
          <ListItem as="div" title={event.name} caption="Nov 6 – Nov 8, 2026 · 31 going"
            leading={<Avatar size="md" {...avatarOf(event.organiser)} />}
            onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(event.id))} />
        </Box>
      </Box>
    ))}
  </Stack>
</PlatformPhone>

// The event: a media screen. The photo is background media under the overlay bar; the sheet comes after it, so it
// paints on top.
<PlatformPhone key={event.id} canvas="media" statusBar="light" homeIndicator="dark"
  header={<TopNavigation type="liquid-overlay"
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back",
      onClick: () => screen.go(\`[data-event="\${event.id}"] .zen-list-item__wrapper\`, () => setOpenId(null)) }}
    trailing={[{ icon: isSaved ? "icon-bookmark-solid" : "icon-bookmark-line",
      label: isSaved ? "Remove from saved" : "Save event", onClick: () => save(event) }]} />}
  footer={<ActionBar position="static"
    summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{isGoing ? "You and 31 others are going" : "31 people going"}</Text>}
    primaryAction={isGoing ? { label: "Cancel RSVP", level: "tertiary", onClick: () => rsvp(event, false) }
      : { label: "Join the retreat", onClick: () => rsvp(event, true) }} />}>
  <Box height="fill">
    {/* Background media first: Left & right × Top & bottom */}
    <Box position="absolute" constraintX="left-right" constraintY="top-bottom">
      <img src={event.photo.src} alt={event.photo.alt} /> {/* display: block; width: 100%; height: 100%; object-fit: cover */}
    </Box>
    {/* Docked to the bottom edge (Left & right / Bottom): only the top corners round; the shadow casts upward */}
    <Box position="absolute" constraintX="left-right" constraintY="bottom" surface="surface"
      radiusTopLeft="3xl" radiusTopRight="3xl" effectStyle="Shadow/Top/Level-2" padding="lg">
      <Stack gap="md">
        <Stack gap="xs">
          {/* The bar has no title over the photo: this is the screen's h1 */}
          <Heading level={1}>Studio retreat in Đà Lạt</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Nov 6 – Nov 8, 2026</Text>
        </Stack>
        <Text>Three days in the pine hills with the whole studio: the 2027 roadmap, a design jam and the night market.</Text>
        <List aria-label="Organiser">
          <ListItem title="Minh Anh Vo" caption="Organiser · People Ops Manager" leading={<Avatar size="md" {...avatarOf(minhAnh)} />} />
        </List>
      </Stack>
    </Box>
  </Box>
</PlatformPhone>`,
  },
]);
