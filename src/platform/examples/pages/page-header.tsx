/* Page Header examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Every example is a desktop page that starts with one PageHeader, its h1: a list page
   with its actions, a detail page with Back and Tabs, nested pages with Breadcrumbs, a long title, a page title inside a
   tab (h2) and a first-use page whose empty state carries the first action. On a phone the actions wrap under the title
   with the Primary first; phone apps name their screens with the Top Navigation instead (see Top navigation). */
import { Fragment, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Avatar } from "../../../components/Avatar";
import { Badge, BadgeCounter } from "../../../components/Badge";
import { Breadcrumbs, type BreadcrumbItemData } from "../../../components/Breadcrumbs";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { ModalForm } from "../../../components/Dialog";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { useFormState } from "../../../components/Form";
import { Icon } from "../../../components/Icon";
import { InputField, NumberField, SelectField } from "../../../components/Input";
import { Box, Container, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { PageHeader } from "../../../components/PageHeader";
import { Table, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { TabPanel, Tabs } from "../../../components/Tabs";
import { Heading, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import type { PlatformPage } from "../../PlatformExamples";
import {
  TODAY, daysFromToday, formatDate, formatDay, formatMoney, formatRange, formatRelative, initials, invoiceStatusTheme, invoices, leaveRequests,
  leaveStatusTheme, people, plans, projectStatusTheme, projects, studio, workspacePlan,
  type Invoice, type LeaveRequest, type LeaveStatus, type Person, type PersonId, type Project, type ProjectStatus,
} from "../data";
import type { ExampleDef } from "../types";
import "./page-header.css";

export const page: PlatformPage = "page-header";

/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

/** The width of an element, kept current: tables fold their columns on a phone-width page. */
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

/** A row caption of whole values: it wraps between values, never inside a date or a name; each "· " stays with the value it introduces, so no line ends on a dot. */
const wholeValues = (...values: (string | false)[]) => values.filter((value): value is string => Boolean(value)).map((value, index) => (
  <Fragment key={`${index}:${value}`}>{index ? " " : null}<span className="px-page-header-value">{index ? "· " : null}{value}</span></Fragment>
));

/** Each example is one desktop page: the Canvas, the page margin, then PageHeader → content xl apart. */
// maxWidth "full": list pages whose content is a non-widget Table span the page (user rule 2026-10-03); detail pages keep lg.
function Page({ children, pageRef, maxWidth }: { children: ReactNode; pageRef?: (element: HTMLElement | null) => void; maxWidth?: "lg" | "full" }) {
  return (
    <Box className="px-page-header-page" ref={pageRef}>
      <Container maxWidth={maxWidth}><Stack gap="xl">{children}</Stack></Container>
    </Box>
  );
}

// ——— 1. List page ——————————————————————————————————————————————————————————————————————————————————
const clientNames = ["Phin & Co", "Lumen Bank", "Mekong Freight", "Hanoi Book Fair", "Saola Outdoor"];
const outstanding = (rows: Invoice[]) => rows.filter((row) => row.status === "Sent" || row.status === "Overdue").reduce((sum, row) => sum + row.amount, 0);
const invoiceBadge = (invoice: Invoice) => <Badge theme={invoiceStatusTheme[invoice.status]} background="subtle">{invoice.status}</Badge>;

function InvoicesPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState(invoices);
  const [creating, setCreating] = useState(false);
  const [measure, width] = useWidth();
  const form = useFormState<{ client: string; amount: number | null }>({
    initialValues: { client: "", amount: null },
    validate: (values) => ({
      client: values.client ? undefined : "Choose a client",
      amount: values.amount && values.amount > 0 ? undefined : "Enter an amount",
    }),
    onSubmit: (values, { reset }) => {
      const number = `INV-2026-${String(144 + rows.length - invoices.length).padStart(4, "0")}`;
      setRows((list) => [{ id: number, number, client: values.client, project: "", amount: values.amount ?? 0, status: "Draft", issued: TODAY, due: daysFromToday(30) }, ...list]);
      setCreating(false);
      reset();
      toast({ type: "positive", title: "Invoice created", children: number });
    },
  });
  // A phone-width page keeps the invoice and its status; client and amount move into the caption.
  const narrow = width > 0 && width < 640;
  const columns: TableColumn<Invoice>[] = narrow ? [
    { id: "invoice", header: "Invoice", cell: (row) => <TableText bold caption={`${row.client} · ${formatMoney(row.amount, true)}`}>{row.number}</TableText> },
    // No fixed widths on a phone: the columns share the room instead of scrolling sideways.
    { id: "status", header: "Status", cell: invoiceBadge },
  ] : [
    { id: "invoice", header: "Invoice", width: "176px", cell: (row) => <TableText bold>{row.number}</TableText> },
    { id: "client", header: "Client", cell: (row) => <TableText>{row.client}</TableText> },
    { id: "status", header: "Status", width: "120px", cell: invoiceBadge },
    { id: "due", header: "Due", width: "152px", cell: (row) => <TableText>{formatDate(row.due)}</TableText> },
    { id: "amount", header: "Amount", align: "right", width: "136px", cell: (row) => <TableText>{formatMoney(row.amount, true)}</TableText> },
  ];
  return (
    <Page pageRef={measure} maxWidth="full">
      {/* The h1 with its eyebrow and description; Tertiary first, the page's one Primary last. */}
      <PageHeader eyebrow="Finance" title="Invoices"
        description={`${plural(rows.length, "invoice")} this quarter · ${formatMoney(outstanding(rows))} outstanding`}
        actions={<>
          <Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Export started", children: "invoices-2026-q3.csv" })}>Export</Button>
          <Button level="primary" onClick={() => setCreating(true)}>New invoice</Button>
        </>} />
      {/* The page's table lies on the Canvas: no Card. */}
      <Table aria-label="Invoices" rows={rows} columns={columns} />
      <ModalForm open={creating} onOpenChange={(open) => { setCreating(open); if (!open) form.reset(); }} title="New invoice" description="It stays a draft until you send it."
        onSubmit={form.handleSubmit} primaryAction={{ label: "Create invoice" }} secondaryAction={{ label: "Cancel" }}>
        <SelectField label="Client" placeholder="Choose a client" options={clientNames.map((name) => ({ value: name, label: name }))} data-autofocus="" {...form.selectField("client")} />
        <NumberField label="Amount (USD)" min={0.01} step={100} {...form.numberField("amount")} />
      </ModalForm>
    </Page>
  );
}

// ——— 2. Detail page with Back and Tabs ————————————————————————————————————————————————————————————————
type Request = LeaveRequest & { history: { id: string; text: string; at: Date }[] };
const teamRequests: Request[] = [
  ...leaveRequests.filter((request) => ["chi", "emi", "gia"].includes(request.person)),
  { id: "l6", person: "ava" as PersonId, kind: "Annual leave" as const, from: new Date(2026, 9, 5), to: new Date(2026, 9, 6), days: 2, status: "Approved" as const, note: "Visiting family in Singapore", requested: daysFromToday(-8, 9, 30) },
].map((request) => ({
  ...request,
  history: [
    { id: "requested", text: `Requested by ${people[request.person].name}`, at: request.requested },
    ...(request.status === "Pending" ? [] : [{ id: "decided", text: `${request.status} by ${people.alex.name}`, at: new Date(request.requested.getTime() + 20 * 60 * 60 * 1000) }]),
  ],
}));

/** A timestamp inside a sentence: "Yesterday at 4:40 pm" → "yesterday at 4:40 pm"; weekdays and months keep their capital. */
const inSentence = (when: string) => (/^(Yesterday|Just now)/.test(when) ? when[0].toLowerCase() + when.slice(1) : when);

function TimeOffPages() {
  const { toast } = useToast();
  const [requests, setRequests] = useState(teamRequests);
  // The page opens on the first request that waits for Alex; Back leads to the Time off list.
  const [openId, setOpenId] = useState<string | null>(teamRequests.find((request) => request.status === "Pending")?.id ?? null);
  const [tab, setTab] = useState("details");
  const pageRef = useRef<HTMLElement | null>(null);
  const [measure, width] = useWidth();
  const setPage = useCallback((element: HTMLElement | null) => { pageRef.current = element; measure(element); }, [measure]);
  // On a narrow page a trailing Badge would squeeze the caption, so the status leads the caption instead.
  const narrow = width > 0 && width < 480;
  const tabsId = useId();
  const listId = useId();
  const focusAfter = useRef<string | null>(null);
  useEffect(() => {
    const selector = focusAfter.current;
    if (!selector) return;
    focusAfter.current = null;
    pageRef.current?.querySelector<HTMLElement>(selector)?.focus();
  });
  const open = (id: string) => { focusAfter.current = ".zen-page-header__back button"; setOpenId(id); setTab("details"); };
  // Back returns to the list with focus on the request it came from.
  const back = (id: string) => { focusAfter.current = `[data-request="${id}"] .zen-list-item__wrapper`; setOpenId(null); };
  const decide = (id: string, status: LeaveStatus) => {
    const before = requests;
    setRequests((list) => list.map((request) => (request.id === id
      ? { ...request, status, history: [...request.history, { id: "decided", text: `${status} by ${people.alex.name}`, at: TODAY }] }
      : request)));
    toast({ title: status === "Approved" ? "Leave approved" : "Leave declined", action: { label: "Undo", onClick: () => setRequests(before) } });
  };
  const waiting = requests.filter((request) => request.status === "Pending").length;
  const request = requests.find((item) => item.id === openId);

  if (request) {
    const person = people[request.person];
    return (
      <Page pageRef={setPage}>
        <PageHeader
          back={{ label: "Time off", onClick: () => back(request.id) }}
          title={`${person.name}’s ${request.kind.toLowerCase()}`}
          meta={<Badge theme={leaveStatusTheme[request.status]} background="subtle">{request.status}</Badge>}
          description={`${formatRange(request.from, request.to)} · ${plural(request.days, "day")} · Requested ${inSentence(formatRelative(request.requested))}`}
          // Only a request that waits for Alex has actions: Decline (Tertiary) before Approve (the one Primary).
          actions={request.status === "Pending" ? <>
            <Button level="tertiary" onClick={() => decide(request.id, "Declined")}>Decline</Button>
            <Button level="primary" onClick={() => decide(request.id, "Approved")}>Approve</Button>
          </> : undefined}
          tabs={<Tabs idPrefix={tabsId} aria-label="Request sections" value={tab} onValueChange={setTab}
            items={[{ id: "details", label: "Details" }, { id: "history", label: "History", badge: request.history.length }]} />} />
        <TabPanel idPrefix={tabsId} id="details" hidden={tab !== "details"}>
          {/* A readable width keeps each term near its value. */}
          <Card theme="flat" className="px-page-header-details">
            <DescriptionList items={[
              { term: "Type", description: request.kind },
              { term: "Dates", description: formatRange(request.from, request.to) },
              { term: "Working days", description: String(request.days) },
              { term: "Note", description: request.note ?? "No note" },
              { term: "Team", description: `${person.team} · ${person.role}` },
            ]} />
          </Card>
        </TabPanel>
        <TabPanel idPrefix={tabsId} id="history" hidden={tab !== "history"}>
          <ListBox className="px-page-header-details">
            <List aria-label="History">
              {request.history.map((event) => (
                <ListItem key={event.id} title={event.text} caption={formatRelative(event.at)}
                  leading={<DockIcon icon={event.id === "requested" ? "icon-calendar-line" : "icon-check-done-line"} theme="neutral" background="subtle" />} />
              ))}
            </List>
          </ListBox>
        </TabPanel>
      </Page>
    );
  }
  return (
    <Page pageRef={setPage}>
      <PageHeader title="Time off" description={`Requests from the Design team · ${waiting ? `${waiting} waiting for you` : "nothing waiting for you"}`} />
      {/* A ListBox holds the rows: its slots keep the row fill (12px past the row sideways) 12px (phone 8px) inside the
          edge and space the title from the rows. */}
      <ListBox as="section" aria-labelledby={listId}
        header={<Heading level={2} id={listId} textStyle="Heading/Subheading">Requests</Heading>}>
        <List aria-labelledby={listId}>
          {requests.map((item) => (
            <ListItem key={item.id} data-request={item.id} title={people[item.person].name}
              caption={wholeValues(narrow && item.status, item.kind, formatRange(item.from, item.to))}
              leading={<Avatar size="md" {...avatarOf(people[item.person])} />}
              trailing={narrow ? undefined : <Badge theme={leaveStatusTheme[item.status]} background="subtle">{item.status}</Badge>}
              onClick={() => open(item.id)} />
          ))}
        </List>
      </ListBox>
    </Page>
  );
}

// ——— 3. Nested pages with Breadcrumbs ——————————————————————————————————————————————————————————————————
type Client = { id: string; name: string; since: number; director: PersonId; theme: "brown" | "blue" | "indigo" | "purple" | "plum" };
const clients: Client[] = [
  { id: "phin", name: "Phin & Co", since: 2024, director: "linh", theme: "brown" },
  { id: "lumen", name: "Lumen Bank", since: 2025, director: "hana", theme: "blue" },
  { id: "mekong", name: "Mekong Freight", since: 2025, director: "hana", theme: "indigo" },
  { id: "bookfair", name: "Hanoi Book Fair", since: 2023, director: "linh", theme: "purple" },
  { id: "saola", name: "Saola Outdoor", since: 2026, director: "linh", theme: "plum" },
];
const projectsOf = (client: Client) => projects.filter((project) => project.client === client.name);
const projectBadge = (status: ProjectStatus) => <Badge theme={projectStatusTheme[status]} background="subtle">{status}</Badge>;

function ClientPages() {
  // The route: [] Clients · [client] a client · [client, project] a project.
  const [path, setPath] = useState<string[]>(["lumen", "lumen-banking"]);
  const titleId = useId();
  const pageRef = useRef<HTMLElement | null>(null);
  const [measure, width] = useWidth();
  const setPage = useCallback((element: HTMLElement | null) => { pageRef.current = element; measure(element); }, [measure]);
  // A narrow page has no room for the trail beside the title it repeats: Back to the parent takes its place.
  const narrow = width > 0 && width < 480;
  const focusAfter = useRef<string | null>(null);
  useEffect(() => {
    const selector = focusAfter.current;
    if (!selector) return;
    focusAfter.current = null;
    pageRef.current?.querySelector<HTMLElement>(selector)?.focus();
  });
  // Down a level, focus moves to the way back up (Back, or the parent crumb); up a level, to the row you came from.
  const down = (next: string[]) => { focusAfter.current = ".zen-page-header__back button, .zen-breadcrumbs__item:nth-last-child(2) .zen-breadcrumb"; setPath(next); };
  const up = (next: string[]) => { focusAfter.current = `[data-row="${path[next.length]}"] .zen-list-item__wrapper`; setPath(next); };
  const client = clients.find((item) => item.id === path[0]);
  const project = client ? projectsOf(client).find((item) => item.id === path[1]) : undefined;
  // The trail starts at the top level and ends at this page (not a link). Clients itself has none.
  const trail: BreadcrumbItemData[] = [
    { id: "root", label: "Clients", href: "/clients" },
    ...(client ? [{ id: client.id, label: client.name, href: `/clients/${client.id}` }] : []),
    ...(project ? [{ id: project.id, label: project.name }] : []),
  ];
  // Clients is a section, not the workspace root, so its crumb has no master (house) icon.
  const breadcrumbs = client && !narrow ? (
    <Breadcrumbs master={false} items={trail} onNavigate={(item, event) => { event.preventDefault(); up(item.id === "root" ? [] : [item.id]); }} />
  ) : undefined;
  const back = client && narrow
    ? (project ? { label: client.name, onClick: () => up([client.id]) } : { label: "Clients", onClick: () => up([]) })
    : undefined;

  if (client && project) {
    return (
      <Page pageRef={setPage}>
        <PageHeader breadcrumbs={breadcrumbs} back={back} title={project.name} meta={projectBadge(project.status)}
          description={`${formatRange(project.start, project.due)} · Led by ${people[project.lead].name}`} />
        <Card theme="flat" className="px-page-header-details">
          <DescriptionList items={[
            { term: "Client", description: client.name },
            { term: "Progress", description: `${project.progress}%` },
            { term: "Team", description: plural(project.members.length, "person", "people") },
            { term: "Budget", description: project.budget ? formatMoney(project.budget) : "Internal" },
          ]} />
        </Card>
      </Page>
    );
  }
  if (client) {
    const list = projectsOf(client);
    return (
      <Page pageRef={setPage}>
        <PageHeader breadcrumbs={breadcrumbs} back={back} title={client.name} description={`Client since ${client.since} · ${people[client.director].name} is the account director`} />
        <ListBox as="section" aria-labelledby={titleId}
          header={<Heading level={2} id={titleId} textStyle="Heading/Subheading">Projects</Heading>}>
          <List aria-labelledby={titleId}>
            {list.map((item: Project) => (
              <ListItem key={item.id} data-row={item.id} title={item.name}
                // Narrow: the status leads the caption instead of squeezing it as a trailing Badge.
                caption={wholeValues(narrow && item.status, `${item.status === "Completed" ? "Finished" : "Due"} ${formatDate(item.due)}`)}
                leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" />} trailing={narrow ? undefined : projectBadge(item.status)}
                onClick={() => down([client.id, item.id])} />
            ))}
          </List>
        </ListBox>
      </Page>
    );
  }
  return (
    <Page pageRef={setPage}>
      {/* A top-level page: no trail. */}
      <PageHeader title="Clients" description={`${plural(clients.length, "client")} · ${plural(projects.filter((item) => item.client !== studio.name).length, "project")}`} />
      <ListBox as="section" aria-labelledby={titleId}
        header={<Heading level={2} id={titleId} textStyle="Heading/Subheading">All clients</Heading>}>
        <List aria-labelledby={titleId}>
          {clients.map((item) => (
            <ListItem key={item.id} data-row={item.id} title={item.name} caption={`${plural(projectsOf(item).length, "project")} · ${people[item.director].name}`}
              leading={<Avatar size="md" shape="square" theme={item.theme} alt="">{initials(item.name.replace("&", ""))}</Avatar>}
              trailing={<Icon name="icon-chevron-right-line-small" decorative />}
              onClick={() => down([item.id])} />
          ))}
        </List>
      </ListBox>
    </Page>
  );
}

// ——— 4. A long title ————————————————————————————————————————————————————————————————————————————————
const phaseTwo = {
  title: "Lumen Bank online banking, phase 2: transfers, savings goals and card controls",
  from: new Date(2026, 9, 12), to: new Date(2027, 1, 26), lead: people.alex, budget: 118000,
};

function LongTitlePage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<ProjectStatus>("Planning");
  const [dialog, setDialog] = useState<"share" | "task" | null>(null);
  const hold = () => {
    const before = status;
    setStatus(before === "On hold" ? "Planning" : "On hold");
    toast({ title: before === "On hold" ? "Project resumed" : "Project put on hold", action: { label: "Undo", onClick: () => setStatus(before) } });
  };
  return (
    <Page>
      {/* The title wraps (never truncates) and the actions keep their row beside it; when there is no room they wrap
          under the title. Share, then More with the less frequent actions, then the Primary; on a phone the Primary
          moves first and More still ends the row. */}
      <PageHeader title={phaseTwo.title} meta={projectBadge(status)}
        description={`Lumen Bank · ${formatRange(phaseTwo.from, phaseTwo.to)} · Led by ${phaseTwo.lead.name}`}
        actions={<>
          <Button level="tertiary" onClick={() => setDialog("share")}>Share</Button>
          <Menu align="end" trigger={<IconButton level="tertiary" icon="icon-dots-horizontal-line" aria-label="More actions" />} items={[
            { id: "link", label: "Copy link", icon: "icon-link-01-line", onSelect: () => { void navigator.clipboard?.writeText(`https://${studio.domain}/projects/lumen-phase-2`).catch(() => null); toast({ title: "Link copied" }); } },
            { id: "duplicate", label: "Duplicate project", icon: "icon-copy-line", onSelect: () => toast({ title: "Project duplicated", children: `Copy of ${phaseTwo.title}` }) },
            { type: "separator" },
            { id: "hold", label: status === "On hold" ? "Resume project" : "Put on hold", icon: "icon-pause-circle-line", onSelect: hold },
          ]} />
          <Button level="primary" onClick={() => setDialog("task")}>New task</Button>
        </>} />
      <Card theme="flat" className="px-page-header-details">
        <DescriptionList items={[
          { term: "Client", description: "Lumen Bank" },
          { term: "Lead", description: phaseTwo.lead.name },
          { term: "Starts", description: formatDate(phaseTwo.from) },
          { term: "Budget", description: formatMoney(phaseTwo.budget) },
        ]} />
      </Card>
      <DemoFieldDialog open={dialog === "share"} onOpenChange={(open) => setDialog(open ? "share" : null)} title="Share project"
        field={{ kind: "email", label: "Email address", placeholder: "name@lumenbank.com" }} submitLabel="Share project" confirm={(email) => `Project shared with ${email}`} />
      <DemoFieldDialog open={dialog === "task"} onOpenChange={(open) => setDialog(open ? "task" : null)} title="New task"
        field={{ kind: "name", label: "Task name", placeholder: "Plan the savings goals research" }} submitLabel="Create task" confirm={() => "Task created"} />
    </Page>
  );
}

// ——— 5. A page title inside a tab ————————————————————————————————————————————————————————————————————
type Member = { id: string; name: string; email: string; role: "Owner" | "Admin" | "Member"; team: string; person?: Person };
const firstMembers: Member[] = (["alex", "minhAnh", "mai", "chi", "bao", "duy", "hana", "ava"] as PersonId[]).map((id) => ({
  id, name: people[id].name, email: people[id].email, team: people[id].team, person: people[id],
  role: id === "alex" ? "Owner" : id === "minhAnh" || id === "mai" ? "Admin" : "Member",
}));
const studioPlan = plans.find((plan) => plan.id === workspacePlan.plan)!;

function SettingsTabs() {
  const [tab, setTab] = useState("members");
  const [members, setMembers] = useState(firstMembers);
  const [inviting, setInviting] = useState(false);
  const [measure, width] = useWidth();
  const tabsId = useId();
  const narrow = width > 0 && width < 640;
  const columns: TableColumn<Member>[] = [
    { id: "member", header: "Member", cell: (row) => (
      <TableMedia caption={row.email} media={row.person ? <Avatar size="small" {...avatarOf(row.person)} /> : <Avatar size="small" theme="neutral" background="subtle" alt="">{row.email.slice(0, 2).toUpperCase()}</Avatar>}>{row.name}</TableMedia>
    ) },
    { id: "role", header: "Role", width: narrow ? undefined : "112px", cell: (row) => <TableText>{row.role}</TableText> },
    ...(narrow ? [] : [{ id: "team", header: "Team", width: "176px", cell: (row: Member) => <TableText>{row.team}</TableText> }]),
  ];
  return (
    <Page pageRef={measure} maxWidth="full">
      {/* The page's h1 owns the tabs; each tab's own title is an h2 PageHeader (headingLevel 2, Heading/2). */}
      <PageHeader title="Settings" description={`${studio.name} workspace`}
        tabs={<Tabs idPrefix={tabsId} aria-label="Settings sections" value={tab} onValueChange={setTab}
          items={[{ id: "general", label: "General" }, { id: "members", label: "Members" }, { id: "billing", label: "Billing" }]} />} />
      <TabPanel idPrefix={tabsId} id="general" hidden={tab !== "general"}>
        <Stack gap="lg">
          <PageHeader headingLevel={2} title="General" description="The name, domain and working week everyone in the workspace sees." />
          <Card theme="flat" className="px-page-header-details">
            <DescriptionList items={[
              { term: "Workspace", description: studio.name },
              { term: "Domain", description: studio.domain },
              { term: "Time zone", description: "Ho Chi Minh City (GMT+7)" },
              { term: "Week starts on", description: "Monday" },
            ]} />
          </Card>
        </Stack>
      </TabPanel>
      <TabPanel idPrefix={tabsId} id="members" hidden={tab !== "members"}>
        <Stack gap="lg">
          <PageHeader headingLevel={2} title="Members" meta={<BadgeCounter value={members.length} />}
            description="People who can sign in. Admins can invite people and change billing."
            actions={<Button level="primary" startIcon="icon-user-plus-line" onClick={() => setInviting(true)}>Invite member</Button>} />
          <Table aria-label="Members" rows={members} columns={columns} />
        </Stack>
      </TabPanel>
      <TabPanel idPrefix={tabsId} id="billing" hidden={tab !== "billing"}>
        <Stack gap="lg">
          <PageHeader headingLevel={2} title="Billing" description="Billed monthly to the card on file." />
          <Card theme="flat" className="px-page-header-details">
            <DescriptionList items={[
              { term: "Plan", description: `${studioPlan.name} · ${plural(workspacePlan.seats, "seat")}` },
              { term: "Next invoice", description: `${formatMoney(studioPlan.seatMonthly * workspacePlan.seats)} on ${formatDate(daysFromToday(1))}` },
              { term: "Payment method", description: "Visa ending 4242" },
            ]} />
          </Card>
        </Stack>
      </TabPanel>
      <DemoFieldDialog open={inviting} onOpenChange={setInviting} title="Invite member" field={{ kind: "email", label: "Email address", placeholder: "name@dizai.studio" }}
        submitLabel="Send invite" confirm={(email) => `Invite sent to ${email}`}
        onSubmit={(email) => setMembers((list) => [...list, { id: email, name: "Invited", email, role: "Member", team: "Not set yet" }])} />
    </Page>
  );
}

// ——— 6. First use: the empty state carries the first action ————————————————————————————————————————————
type Claim = { id: string; title: string; amount: number; submitted: Date };

function ExpenseClaims() {
  const { toast } = useToast();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [creating, setCreating] = useState(false);
  const [measure, width] = useWidth();
  const narrow = width > 0 && width < 640;
  const form = useFormState<{ title: string; amount: number | null }>({
    initialValues: { title: "", amount: null },
    validate: (values) => ({
      title: values.title.trim() ? undefined : "Say what it was for",
      amount: values.amount && values.amount > 0 ? undefined : "Enter an amount",
    }),
    onSubmit: (values, { reset }) => {
      const claim = { id: `c${claims.length + 1}`, title: values.title.trim(), amount: values.amount ?? 0, submitted: TODAY };
      setClaims((list) => [claim, ...list]);
      setCreating(false);
      reset();
      toast({ title: "Claim sent", children: `${formatMoney(claim.amount, true)} · ${claim.title}`, action: { label: "Undo", onClick: () => setClaims((list) => list.filter((item) => item.id !== claim.id)) } });
    },
  });
  const columns: TableColumn<Claim>[] = [
    { id: "claim", header: "Claim", cell: (row) => <TableText bold caption={narrow ? formatDay(row.submitted) : undefined}>{row.title}</TableText> },
    ...(narrow ? [] : [{ id: "sent", header: "Sent", width: "152px", cell: (row: Claim) => <TableText>{formatDate(row.submitted)}</TableText> }]),
    { id: "status", header: "Status", width: narrow ? undefined : "128px", cell: () => <Badge theme="yellow" background="subtle">Pending</Badge> },
    { id: "amount", header: "Amount", align: "right", width: narrow ? undefined : "120px", cell: (row) => <TableText>{formatMoney(row.amount, true)}</TableText> },
  ];
  return (
    <Page pageRef={measure} maxWidth="full">
      {/* While the page is empty the empty state holds the one Primary; with a claim it moves up to the header. */}
      <PageHeader title="Expense claims" description={`Claims you send go to ${people.mai.name} in Finance.`}
        actions={claims.length ? <Button level="primary" onClick={() => setCreating(true)}>New claim</Button> : undefined} />
      {claims.length ? <Table aria-label="Expense claims" rows={claims} columns={columns} /> : (
        <EmptyState headingLevel={2} icon="icon-receipt-line" title="No expense claims yet" primaryAction={{ label: "New claim", onClick: () => setCreating(true) }}>
          Claim anything you paid for the studio, like a taxi to a client meeting.
        </EmptyState>
      )}
      <ModalForm open={creating} onOpenChange={(open) => { setCreating(open); if (!open) form.reset(); }} title="New claim"
        onSubmit={form.handleSubmit} primaryAction={{ label: "Send claim" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="What was it for?" placeholder="Taxi to Lumen Bank" data-autofocus="" {...form.field("title")} />
        <NumberField label="Amount (USD)" min={0.01} step={1} {...form.numberField("amount")} />
      </ModalForm>
    </Page>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "List page",
    description: "The top of a list page: an eyebrow for the app section, the h1, one line on what the page holds, then Tertiary Export and the page's one Primary on the right. On a phone the actions wrap under the title with the Primary first. New invoice adds a draft to the table.",
    wide: true,
    screen: true,
    render: () => <InvoicesPage />,
    code: `<Container maxWidth="full">
  {/* PageHeader → content: xl */}
  <Stack gap="xl">
    <PageHeader
      eyebrow="Finance"
      title="Invoices"
      description={\`\${plural(rows.length, "invoice")} this quarter · \${formatMoney(outstanding)} outstanding\`}
      actions={<>
        <Button level="tertiary" startIcon="icon-download-01-line" onClick={exportCsv}>Export</Button>
        <Button level="primary" onClick={() => setCreating(true)}>New invoice</Button>
      </>}
    />
    {/* The page's table sits on the Canvas: no Card */}
    <Table aria-label="Invoices" rows={rows} columns={columns} />
  </Stack>
</Container>`,
  },
  {
    title: "Detail page",
    description: "Chi Tran’s leave request, opened from the Time off list: Back names the page it returns to, the status Badge sits beside the title and Tabs split the page. Decline and Approve show only while the request waits; either one changes the Badge, and the toast can undo it. Back puts focus on the row you came from.",
    wide: true,
    screen: true,
    render: () => <TimeOffPages />,
    code: `<PageHeader
  back={{ label: "Time off", onClick: backToList }}
  title="Chi Tran’s annual leave"
  meta={<Badge theme={leaveStatusTheme[request.status]} background="subtle">{request.status}</Badge>}
  description="Oct 19 – Oct 21, 2026 · 3 days · Requested Sunday at 4:45 pm"
  actions={request.status === "Pending" ? <>
    <Button level="tertiary" onClick={() => decide("Declined")}>Decline</Button>
    <Button level="primary" onClick={() => decide("Approved")}>Approve</Button>
  </> : undefined}
  tabs={<Tabs idPrefix="request" aria-label="Request sections" value={tab} onValueChange={setTab}
    items={[{ id: "details", label: "Details" }, { id: "history", label: "History", badge: history.length }]} />}
/>
<TabPanel idPrefix="request" id="details" hidden={tab !== "details"}>
  {/* .details { width: min(100%, 440px) }: a readable width keeps each term near its value */}
  <Card theme="flat" className="details"><DescriptionList items={details} /></Card>
</TabPanel>
<TabPanel idPrefix="request" id="history" hidden={tab !== "history"}>…</TabPanel>`,
  },
  {
    title: "Nested pages",
    description: "Pages deeper than one level put Breadcrumbs above the title instead of Back: the trail starts at Clients and ends at the current page, which is not a link. The top-level Clients page has no trail. Rows go down a level, crumbs go back up; on a narrow page Back to the parent takes the trail's place.",
    wide: true,
    screen: true,
    render: () => <ClientPages />,
    code: `<PageHeader
  breadcrumbs={narrow ? undefined : (
    <Breadcrumbs
      master={false} // Clients is a section, not the workspace root
      items={[
        { id: "clients", label: "Clients", href: "/clients" },
        { id: "lumen", label: "Lumen Bank", href: "/clients/lumen" },
        { id: "lumen-banking", label: "Online banking redesign" }, // the current page: no href
      ]}
      onNavigate={(item, event) => { event.preventDefault(); navigate(item.href); }}
    />
  )}
  back={narrow ? { label: "Lumen Bank", onClick: () => navigate("/clients/lumen") } : undefined}
  title="Online banking redesign"
  meta={<Badge theme="blue" background="subtle">Active</Badge>}
  description="Aug 16 – Dec 15, 2026 · Led by Alex Duong"
/>`,
  },
  {
    title: "Long title",
    description: "A long project name wraps onto a second line instead of being cut, and the status Badge follows it. The actions keep their own row: Tertiary Share, More with the less frequent ones, then the Primary. When the row runs out of room they wrap under the title, the Primary first.",
    wide: true,
    screen: true,
    render: () => <LongTitlePage />,
    code: `<PageHeader
  title="Lumen Bank online banking, phase 2: transfers, savings goals and card controls"
  meta={<Badge theme={projectStatusTheme[status]} background="subtle">{status}</Badge>}
  description="Lumen Bank · Oct 12, 2026 – Feb 26, 2027 · Led by Alex Duong"
  actions={<>
    <Button level="tertiary" onClick={share}>Share</Button>
    <Menu align="end" trigger={<IconButton level="tertiary" icon="icon-dots-horizontal-line" aria-label="More actions" />} items={[
      { id: "link", label: "Copy link", icon: "icon-link-01-line", onSelect: copyLink },
      { id: "duplicate", label: "Duplicate project", icon: "icon-copy-line", onSelect: duplicate },
      { type: "separator" },
      { id: "hold", label: status === "On hold" ? "Resume project" : "Put on hold", icon: "icon-pause-circle-line", onSelect: toggleHold },
    ]} />
    <Button level="primary" onClick={newTask}>New task</Button>
  </>}
/>`,
  },
  {
    title: "Title inside a tab",
    description: "Settings owns the page's h1 and its Tabs. Each tab starts with its own PageHeader at headingLevel 2 (Heading/2), so the outline reads Settings, then Members, and the tab keeps its own count and Primary. Invite member adds a row to the table.",
    wide: true,
    screen: true,
    render: () => <SettingsTabs />,
    code: `<PageHeader title="Settings" description="Đìzai Studio workspace"
  tabs={<Tabs idPrefix="settings" aria-label="Settings sections" value={tab} onValueChange={setTab}
    items={[{ id: "general", label: "General" }, { id: "members", label: "Members" }, { id: "billing", label: "Billing" }]} />} />

<TabPanel idPrefix="settings" id="members" hidden={tab !== "members"}>
  {/* The tab's header → its table: lg */}
  <Stack gap="lg">
    <PageHeader headingLevel={2} title="Members" meta={<BadgeCounter value={members.length} />}
      description="People who can sign in. Admins can invite people and change billing."
      actions={<Button level="primary" startIcon="icon-user-plus-line" onClick={invite}>Invite member</Button>} />
    <Table aria-label="Members" rows={members} columns={columns} />
  </Stack>
</TabPanel>`,
  },
  {
    title: "First use",
    description: "Before the first claim the page shows an empty state that carries the one Primary, so the header keeps only its title and description. Once a claim exists, New claim moves up into the header and the table takes the empty state's place; the toast's Undo goes back.",
    wide: true,
    screen: true,
    render: () => <ExpenseClaims />,
    code: `<PageHeader title="Expense claims" description="Claims you send go to Mai Ho in Finance."
  actions={claims.length ? <Button level="primary" onClick={newClaim}>New claim</Button> : undefined} />
{claims.length ? <Table aria-label="Expense claims" rows={claims} columns={columns} /> : (
  <EmptyState headingLevel={2} icon="icon-receipt-line" title="No expense claims yet"
    primaryAction={{ label: "New claim", onClick: newClaim }}>
    Claim anything you paid for the studio, like a taxi to a client meeting.
  </EmptyState>
)}`,
  },
];
