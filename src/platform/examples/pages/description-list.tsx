/* Description List examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex
   Duong, Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Description List decision: one emphasised total
   closes a calculation, a row action is named after its row, long values stack and edit in place, a receipt in a
   phone's Bottom Sheet, values load in place under their terms in a docked panel, and a narrow column stacks the rows
   by itself. The two screens sit in an AppShell: the studio's Projects page (pattern top-bar, the panel docked) and
   the Phin & Co app's Orders root on a phone (the mobile Bar with the bottom bar). */
import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader } from "../../../components/AppShell";
import { Badge } from "../../../components/Badge";
import { BadgeStatus } from "../../../components/BadgeStatus";
import { BottomNavigation, type BottomNavigationItem } from "../../../components/BottomNavigation";
import { BottomSheet } from "../../../components/BottomSheet";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { ChipGroup } from "../../../components/ChipGroup";
import { DescriptionList, type DescriptionListItem } from "../../../components/DescriptionList";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { Form, FormActions } from "../../../components/Form";
import { InlineMessage } from "../../../components/InlineMessage";
import { InputField, TextAreaField } from "../../../components/Input";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { PageHeader } from "../../../components/PageHeader";
import { SidePanel } from "../../../components/SidePanel";
import { SkeletonShape, SkeletonText } from "../../../components/Skeleton";
import { Tabs } from "../../../components/Tabs";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PreviewAppFrame, StudioLogo } from "../../PlatformFrames";
import {
  TODAY, activity, daysFromToday, formatDate, formatMoney, formatRange, formatRelative, invoiceStatusTheme, me, people, projects, projectProgress, projectStep, studio,
  taskStep, type InvoiceStatus, type PersonId, type TaskStatus,
} from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./description-list.css";

export const page: PlatformPage = "description-list";

/** "Account number" → "account number", for names that follow a verb ("Copy account number"). */
const lower = (term: string) => term.charAt(0).toLowerCase() + term.slice(1);

// ——— 1. Invoice total: one emphasised row closes the calculation ——————————————————————————————————
// INV-2026-0143, the Saola Outdoor draft (the shared invoices): three lines, a returning-client discount, $12,000 in all.
const invoiceLines = [
  { id: "workshop", term: "Brand workshop · 2 days", amount: 4400 },
  { id: "direction", term: "Moodboard and art direction", amount: 3600 },
  { id: "logo", term: "Logo concepts · 3 routes", amount: 4500 },
];
const invoiceSubtotal = invoiceLines.reduce((sum, line) => sum + line.amount, 0);
const returningDiscount = 500;

function InvoiceTotal() {
  const { toast } = useToast();
  const [discount, setDiscount] = useState(true);
  const [status, setStatus] = useState<InvoiceStatus>("Draft");
  const titleId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const draft = status === "Draft";
  const total = invoiceSubtotal - (discount ? returningDiscount : 0);
  // The control that was used goes away, so focus moves to the one that brings it back (or to the title once sent).
  const focus = (selector: string) => requestAnimationFrame(() => cardRef.current?.querySelector<HTMLElement>(selector)?.focus());
  const removeDiscount = () => {
    setDiscount(false);
    focus("[data-add-discount]");
    toast({ title: "Discount removed", action: { label: "Undo", onClick: () => setDiscount(true) } });
  };
  const addDiscount = () => {
    setDiscount(true);
    focus('[aria-label="Remove discount"]');
  };
  const send = () => {
    setStatus("Sent");
    focus(`[id="${titleId}"]`);
    toast({ type: "positive", title: "Invoice sent", children: "To accounts@saola.vn", action: { label: "Undo", onClick: () => setStatus("Draft") } });
  };
  return (
    <Card ref={cardRef} as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Stack direction="row" gap="2xs" align="center" wrap>
            <Heading level={4} id={titleId} tabIndex={-1} textStyle="Heading/Subheading">INV-2026-0143</Heading>
            <Badge theme={invoiceStatusTheme[status]} background="subtle">{status}</Badge>
          </Stack>
          <Text textStyle="Body/Small/Regular" tone="base">{`Saola Outdoor · Brand refresh · Due ${formatDate(daysFromToday(30))}`}</Text>
        </Stack>
        <DescriptionList items={[
          ...invoiceLines.map((line) => ({ id: line.id, term: line.term, description: formatMoney(line.amount, true) })),
          { id: "subtotal", term: "Subtotal", description: formatMoney(invoiceSubtotal, true) },
          // A discount keeps its minus sign, so the colour is never the only signal.
          ...(discount ? [{
            // The discount is a removable label beside its term (as a checkout shows a discount code), so no row takes an
            // action column and every amount stays on the list's end edge with the total and the Send invoice button.
            // A sent invoice is read-only: the label stays and loses its remove button.
            id: "discount",
            term: (
              <Stack direction="row" gap="2xs" align="center" wrap>
                <span>Discount</span>
                <Badge theme="neutral" background="subtle" size="sm" leadingIcon={false} remove={draft} onRemove={removeDiscount} removeLabel="Remove discount">Returning client · 4%</Badge>
              </Stack>
            ),
            description: <Text as="span" textStyle="Body/Base/Medium" tone="positive">{`−${formatMoney(returningDiscount, true)}`}</Text>,
          }] : []),
          { id: "total", term: "Total", description: formatMoney(total, true), emphasis: true },
        ]} />
        {draft ? (
          <Stack direction="row" gap="sm" justify="end" wrap>
            {discount ? null : <Button level="tertiary" startIcon="icon-plus-line" data-add-discount="" onClick={addDiscount}>Add discount</Button>}
            <Button level="primary" onClick={send}>Send invoice</Button>
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}

// ——— 2. Copy payment details: each copy action is named after its row ————————————————————————————
type PaymentRow = { id: string; term: string; value: string; copy?: boolean };
const paymentRows: PaymentRow[] = [
  { id: "bank", term: "Bank", value: "Lumen Bank, Ho Chi Minh City", copy: true },
  { id: "name", term: "Account name", value: "Đìzai Studio JSC", copy: true },
  { id: "number", term: "Account number", value: "0071 0045 8823", copy: true },
  { id: "swift", term: "SWIFT code", value: "LUMBVNVX", copy: true },
  { id: "reference", term: "Reference", value: "INV-2026-0142", copy: true },
];

function PaymentDetails() {
  const [copied, setCopied] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const titleId = useId();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = (row: PaymentRow) => {
    void navigator.clipboard?.writeText(row.value.replace(/\s/g, "")).catch(() => null);
    setCopied(row.id);
    setAnnouncement(`${row.term} copied`);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 2000);
  };
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Pay by bank transfer</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`INV-2026-0142 · ${formatMoney(21000, true)} due ${formatDate(daysFromToday(25))}`}</Text>
        </Stack>
        <DescriptionList divider items={paymentRows.map((row) => ({
          id: row.id, term: row.term, description: row.value,
          action: row.copy ? (
            <IconButton appearance="flat" level="primary" size="sm" icon={copied === row.id ? "icon-check-line" : "icon-copy-line"}
              aria-label={`Copy ${lower(row.term)}`} onClick={() => copy(row)} />
          ) : undefined,
        }))} />
        {/* Rendered empty from the start, so the first copy is announced too. */}
        <VisuallyHidden role="status">{announcement}</VisuallyHidden>
      </Stack>
    </Card>
  );
}

// ——— 3. Contact details: stacked rows, one row turns into a field ————————————————————————————————
type ContactId = "name" | "phone" | "address" | "emergency";
type ContactRow = { id: ContactId | "email"; term: string; editable: boolean; required?: string; multiline?: boolean; note?: string };
const contactRows: ContactRow[] = [
  { id: "name", term: "Display name", editable: true, required: "Enter a display name" },
  // A value people can't change says why, so the missing Edit doesn't read as a gap.
  { id: "email", term: "Work email", editable: false, note: "Managed by your workspace admin" },
  { id: "phone", term: "Phone", editable: true, required: "Enter a phone number, like +84 90 812 3344" },
  { id: "address", term: "Mailing address", editable: true, required: "Enter a mailing address", multiline: true },
  { id: "emergency", term: "Emergency contact", editable: true },
];
const firstContact: Record<ContactRow["id"], string> = {
  name: "Alex Duong",
  email: "alex@dizai.studio",
  phone: "+84 90 812 3344",
  address: "Apartment 12.04, Sunrise City, 23 Nguyen Huu Tho, District 7, Ho Chi Minh City",
  emergency: "",
};

function ContactDetails() {
  const [values, setValues] = useState(firstContact);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  const titleId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const focus = (selector: string) => requestAnimationFrame(() => cardRef.current?.querySelector<HTMLElement>(selector)?.focus());
  const edit = (row: ContactRow) => {
    setEditing(row);
    setDraft(values[row.id]);
    setError(undefined);
    focus(`[data-field="${row.id}"]`);
  };
  // Cancel and Save hand focus back to the row's Edit button.
  const close = (row: ContactRow) => { setEditing(null); focus(`[data-edit="${row.id}"]`); };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const value = draft.trim();
    if (!value && editing.required) { setError(editing.required); return; }
    setValues((state) => ({ ...state, [editing.id]: value }));
    setAnnouncement(`${editing.term} saved`);
    close(editing);
  };
  return (
    <Card ref={cardRef} as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Contact details</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">People at Đìzai Studio see these on your profile.</Text>
        </Stack>
        <DescriptionList layout="stacked" divider items={contactRows.map((row): DescriptionListItem => {
          const value = values[row.id];
          if (editing?.id === row.id) {
            const change = (next: string) => { setDraft(next); setError(undefined); };
            return {
              id: row.id, term: row.term,
              // The term above labels the field; Enter saves, Cancel keeps the old value. A long value (the address)
              // gets a Text Area, where Enter adds a line and ⌘/Ctrl+Enter saves.
              description: (
                <Form onSubmit={save} gap="md" aria-label={`Edit ${lower(row.term)}`}>
                  {row.multiline ? (
                    <TextAreaField data-field={row.id} aria-label={row.term} rows={3} value={draft} error={error} onValueChange={change}
                      onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
                  ) : (
                    <InputField data-field={row.id} aria-label={row.term} value={draft} error={error} onValueChange={change} />
                  )}
                  <FormActions>
                    <Button level="tertiary" onClick={() => close(row)}>Cancel</Button>
                    <Button level="primary" type="submit">Save</Button>
                  </FormActions>
                </Form>
              ),
            };
          }
          return {
            id: row.id, term: row.term,
            // A legitimately empty value says so; it is never blank or a dash. Line breaks typed in the address stay.
            description: row.note ? (
              <Stack gap="2xs">
                <span>{value}</span>
                <Text as="span" textStyle="Body/Small/Regular" tone="light">{row.note}</Text>
              </Stack>
            ) : row.multiline ? <span className="px-description-list-lines">{value || "None"}</span> : value || "None",
            // One row edits at a time: while a field is open the other rows' actions wait, so no draft is dropped.
            action: row.editable && !editing ? (
              <Button level="tertiary" size="sm" data-edit={row.id} onClick={() => edit(row)}>
                {value ? "Edit" : "Add"}<VisuallyHidden>{` ${lower(row.term)}`}</VisuallyHidden>
              </Button>
            ) : undefined,
          };
        })} />
        <VisuallyHidden role="status">{announcement}</VisuallyHidden>
      </Stack>
    </Card>
  );
}

// ——— 4. Details load in place: the terms stay, the values arrive ————————————————————————————————
type Phase = "loading" | "ready" | "failed";
type ProjectRow = (typeof projects)[number];
/** The studio app's places as the top bar's Tabs: the Top-Bar pattern has no Sidebar, so the side panel keeps its room. */
const studioTabs = [{ id: "home", label: "Home" }, { id: "projects", label: "Projects" }, { id: "invoices", label: "Invoices" }, { id: "people", label: "People" }];
const statusFilters = [{ value: "all", label: "All" }, ...(["Active", "Planning", "On hold", "Completed"] as const).map((status) => ({ value: status, label: status }))];
/* The Side-Panel docks while the page keeps a Tablet width (744) beside it (Small, 360): from 1104. Narrower, the
   AppShell opens the same SidePanel as a Modal, which never opens by itself. */
const DOCK_MIN_WIDTH = 360 + 744;
const unread = activity.filter((item) => item.unread);

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

function ProjectPanels() {
  const { toast } = useToast();
  const listId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const [list, setList] = useState<ProjectRow[]>(projects);
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [docked, setDocked] = useState(true);
  // Under 1024 the shell leaves the Top-Bar pattern for its narrow layout: the places move under the page title, as
  // its sections row; in a phone-wide window a row's status joins its caption, so no title is cut.
  const [frameWidth, setFrameWidth] = useState(0);
  const narrow = frameWidth > 0 && frameWidth < 1024;
  const compact = frameWidth > 0 && frameWidth < 640;
  // Docked beside the list, the first project's details are open from the start. A Modal never opens by itself, so a
  // narrow window starts with the list alone.
  const [openId, setOpenId] = useState<string | null>(projects[0].id);
  const [phase, setPhase] = useState<Phase>("ready");
  // Shipment tracking's first request times out, so the panel shows its error once; Try again then succeeds.
  const timedOut = useRef(new Set<string>());
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Measured before the first paint, so a narrow window never shows the docked panel or opens the Modal.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    let wasDocked = true;
    const update = (width: number) => {
      setFrameWidth(width);
      const next = width >= DOCK_MIN_WIDTH;
      if (wasDocked && !next) setOpenId(null);
      wasDocked = next;
      setDocked(next);
    };
    update(frame.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => update(entry.contentRect.width));
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);
  const opened = list.find((project) => project.id === openId);
  const shown = list.filter((project) => filter === "all" || project.status === filter);
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the projects and their details." });
  const load = (id: string) => {
    setPhase("loading");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (id === "mekong-tracking" && !timedOut.current.has(id)) { timedOut.current.add(id); setPhase("failed"); return; }
      setPhase("ready");
    }, 900);
  };
  // Docked, the page stays live: picking another project loads it into the same panel and focus stays on the row.
  const open = (id: string) => { setOpenId(id); load(id); };
  // A Modal hands focus back to its row by itself; the docked panel does it here, as its Close goes away.
  const close = () => {
    const id = openId;
    setOpenId(null);
    if (docked) requestAnimationFrame(() => frameRef.current?.querySelector<HTMLElement>(`[data-project="${id}"] .zen-list-item__wrapper`)?.focus());
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
  const places = (
    <Tabs variant="subtle" aria-label={studio.name} items={studioTabs} value="projects"
      onValueChange={(id) => { if (id !== "projects") notHere(studioTabs.find((tab) => tab.id === id)?.label ?? id); }} />
  );
  // While loading, each term is already in place and a Skeleton as tall as the value holds it: a pill the height of the
  // Status Badge, a one-line bar for text, so no row moves when the data arrives.
  const placeholder = (row: DescriptionListItem): DescriptionListItem => ({
    ...row,
    description: row.id === "status"
      ? <SkeletonShape shape="pill" className="px-description-list-badge-skeleton" />
      : <SkeletonText lines={1} className="px-description-list-skeleton" />,
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
      <PreviewAppFrame frameRef={frameRef}>
        {/* Top-Bar on the Canvas: the studio's places are the header's Tabs, so the page keeps the room the docked
            Side-Panel (Standard, Small 360) needs beside it. The PageHeader with the one Primary sits in the Main row. */}
        <AppShell pattern="top-bar"
          header={(
            <AppShellHeader
              leading={(
                <Stack direction="row" gap="xl" align="center">
                  <StudioLogo src={studio.logo} name={studio.name} />
                  {narrow ? null : places}
                </Stack>
              )}
              sections={narrow ? places : undefined}
              actions={<StudioActions />}
              main={(
                <PageHeader title="Projects" description={`${plural(list.length, "project")} · ${studio.name}`}
                  actions={<Button level="primary" startIcon="icon-plus-line" onClick={() => setCreating(true)}>New project</Button>} />
              )}
            />
          )}
          sidePanel={(
            <SidePanel type="standard" size="small" open={Boolean(opened)} onOpenChange={(next) => { if (!next) close(); }}
              title={opened ? <span ref={titleRef} tabIndex={-1} className="px-description-list-focus-target">{opened.name}</span> : ""}
              description={opened?.client}
              primaryAction={opened ? { label: "Open project", onClick: () => notHere(`The ${opened.name} page`) } : undefined}>
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
                    <ListItem key={project.id} data-project={project.id} title={project.name} selected={project.id === openId}
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
      </PreviewAppFrame>
      <DemoFieldDialog open={creating} onOpenChange={setCreating} title="New project" field={{ kind: "name", label: "Project name", placeholder: "Saola trail guide" }}
        submitLabel="Create project" confirm={(name) => `${name} created`} onSubmit={create} />
    </>
  );
}

// ——— 5. A narrow side column: the rows stack by themselves ———————————————————————————————————————
function TaskPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<TaskStatus>("In progress");
  const [finished, setFinished] = useState<Date | null>(null);
  const titleId = useId();
  const detailsId = useId();
  const articleRef = useRef<HTMLElement>(null);
  const done = status === "Done";
  // The pressed button goes away, so focus moves to the one that takes its place (Reopen task ↔ Mark as done).
  const focus = (selector: string) => requestAnimationFrame(() => articleRef.current?.querySelector<HTMLElement>(selector)?.focus());
  const reopen = () => { setStatus("In progress"); setFinished(null); };
  const markDone = () => {
    setStatus("Done");
    setFinished(TODAY);
    focus("[data-reopen]");
    toast({ type: "positive", title: "Task marked as done", action: { label: "Undo", onClick: reopen } });
  };
  return (
    <Box>
      <Grid columns={{ mobile: 1, desktop: "minmax(0, 3fr) minmax(0, 1fr)" }} gap="lg" align="start" stackBelow={640}>
        <Stack ref={articleRef} as="article" gap="md" align="start" aria-labelledby={titleId}>
          <Stack gap="xs">
            <Heading level={4} id={titleId} textStyle="Heading/Subheading">Run five usability sessions on transfers</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">LUM-088 · Online banking redesign</Text>
          </Stack>
          <Text>
            Five moderated sessions with Lumen Bank customers who send money at least once a week. Each session covers a
            first transfer to a new payee, a repeat transfer and changing the daily limit, so we can see where the new
            confirmation step slows people down.
          </Text>
          <Text>Recordings and notes go into the test script folder the same day; findings are due with the round 2 report.</Text>
          {done ? (
            <Button level="tertiary" data-reopen="" onClick={() => { reopen(); focus("[data-mark-done]"); }}>Reopen task</Button>
          ) : (
            <Button level="primary" data-mark-done="" onClick={markDone}>Mark as done</Button>
          )}
        </Stack>
        {/* About 260px wide on a desktop page: the list inside is under the 280px stackBelow, so each term sits above its value. */}
        <Card as="section" theme="default" spacing="md" aria-labelledby={detailsId}>
          <Stack gap="md">
            <Heading level={4} id={detailsId} textStyle="Heading/Subheading">Details</Heading>
            <DescriptionList items={[
              { id: "status", term: "Status", description: <BadgeStatus status={taskStep[status]}>{status}</BadgeStatus> },
              { id: "assignee", term: "Assignee", description: people.ava.name },
              { id: "reporter", term: "Reporter", description: people.alex.name },
              { id: "project", term: "Project", description: "Online banking redesign · Lumen Bank" },
              // A Done task shows when it finished, not when it was due.
              finished ? { id: "when", term: "Finished", description: formatRelative(finished) } : { id: "when", term: "Due", description: formatDate(daysFromToday(3)) },
              { id: "script", term: "Test script", description: "lumen-transfers_usability-script_round-2_v3-final.pdf" },
              { id: "labels", term: "Labels", description: "None" },
            ]} />
          </Stack>
        </Card>
      </Grid>
    </Box>
  );
}

// ——— 6. On a phone: a receipt in a Bottom Sheet ——————————————————————————————————————————————————
// The Phin & Co app (the studio's client): what Alex ordered over the last three weeks.
const menu = {
  phinSua: { name: "Phin sữa đá", price: 2.6 },
  phinDen: { name: "Phin đen đá", price: 2.2 },
  bacXiu: { name: "Bạc xỉu", price: 2.8 },
  coconut: { name: "Cà phê dừa", price: 3.6 },
  coldBrew: { name: "Cold brew cam sả", price: 3.4 },
  traSen: { name: "Trà sen vàng", price: 3.0 },
  banhMi: { name: "Bánh mì chả cá", price: 2.4 },
  croissant: { name: "Croissant muối", price: 2.2 },
};
type MenuId = keyof typeof menu;
type Order = { id: string; at: Date; store: string; lines: [MenuId, number][]; paidWith: string; reward?: MenuId };
const order = (id: string, days: number, hour: number, minute: number, store: string, lines: Order["lines"], extra: Partial<Order> = {}): Order =>
  ({ id, at: daysFromToday(days, hour, minute), store, lines, paidWith: "Visa ending 4821", ...extra });
const orders: Order[] = [
  order("A-250", 0, 8, 12, "Phin Nguyen Hue", [["phinSua", 2], ["banhMi", 1]]),
  order("A-249", -1, 15, 40, "Phin Ly Tu Trong", [["coldBrew", 1], ["croissant", 1]], { reward: "coldBrew" }),
  order("A-248", -1, 8, 5, "Phin Nguyen Hue", [["phinSua", 1]]),
  order("A-247", -2, 8, 20, "Phin Nguyen Hue", [["bacXiu", 1], ["banhMi", 1]], { paidWith: "Phin wallet" }),
  order("A-246", -5, 14, 10, "Phin Thao Dien", [["coconut", 2], ["traSen", 1]]),
  order("A-245", -6, 8, 15, "Phin Nguyen Hue", [["phinDen", 1]]),
  order("A-244", -7, 9, 30, "Phin Ly Tu Trong", [["phinSua", 3], ["croissant", 2]], { paidWith: "Phin wallet" }),
  order("A-243", -8, 8, 10, "Phin Nguyen Hue", [["phinSua", 1], ["banhMi", 1]]),
  order("A-242", -9, 16, 45, "Phin Thao Dien", [["traSen", 2]]),
  order("A-241", -12, 8, 25, "Phin Nguyen Hue", [["bacXiu", 1]]),
  order("A-240", -13, 13, 5, "Phin Ly Tu Trong", [["coldBrew", 2], ["banhMi", 2]]),
  order("A-239", -14, 8, 0, "Phin Nguyen Hue", [["phinDen", 1], ["croissant", 1]], { paidWith: "Phin wallet" }),
  order("A-238", -16, 10, 40, "Phin Thao Dien", [["coconut", 1]]),
  order("A-237", -19, 8, 15, "Phin Nguyen Hue", [["phinSua", 2]]),
];
const lineTotal = ([item, quantity]: [MenuId, number]) => menu[item].price * quantity;
const totalOf = (o: Order) => o.lines.reduce((sum, line) => sum + lineTotal(line), 0) - (o.reward ? menu[o.reward].price : 0);
const itemsOf = (o: Order) => o.lines.map(([item, quantity]) => (quantity > 1 ? `${menu[item].name} × ${quantity}` : menu[item].name)).join(", ");

/** The Phin & Co app's roots on a phone; Orders is this screen. */
const phinRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "menu", label: "Menu", icon: "icon-coffee-cup-line", selectedIcon: "icon-coffee-cup-solid" },
  { id: "orders", label: "Orders", icon: "icon-receipt-line", selectedIcon: "icon-receipt-solid" },
  { id: "rewards", label: "Rewards", icon: "icon-gift-01-line", selectedIcon: "icon-gift-01-solid" },
];
/** Orders from the last 7 days, then the rest: one group each. */
const weekStart = daysFromToday(-6, 0, 0).getTime();
const orderGroups = [
  { id: "week", label: "This week", orders: orders.filter((o) => o.at.getTime() >= weekStart) },
  { id: "earlier", label: "Earlier", orders: orders.filter((o) => o.at.getTime() < weekStart) },
];

function PhoneReceipts() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const [root, setRoot] = useState("orders");
  const [openId, setOpenId] = useState<string | null>(null);
  // The sheet keeps its last order while it slides away.
  const [last, setLast] = useState(orders[0]);
  const opened = orders.find((item) => item.id === openId);
  const open = (o: Order) => { setLast(o); setOpenId(o.id); };
  // Closing hands focus back to the row the receipt came from.
  const close = () => screen.go(`[data-order="${last.id}"] .zen-list-item__wrapper`, () => setOpenId(null));
  const total = totalOf(last);
  const spentThisWeek = orderGroups[0].orders.reduce((sum, o) => sum + totalOf(o), 0);
  return (
    // A tab root on the AppShell's mobile Bar: the large title folds as the orders scroll under it, and the bottom bar
    // holds the app's roots. It casts a shadow, so each group of orders is a Shadow ListBox on the grey Canvas.
    <PlatformPhone key="orders" label="Phin & Co orders" canvas="default" screenRef={screenRef}>
      <AppShell
        topNavigation={<TopNavigation title="Orders" largeTitle="Orders" scrollRef={screenRef}
          trailing={[{ icon: "icon-search-medium-line", label: "Search orders", onClick: () => toast({ title: "Search orders", children: "By drink, store or date." }) }]} />}
        bottomNavigation={<BottomNavigation aria-label="Phin & Co" showLabels items={phinRoots} value={root} onValueChange={setRoot} />}
      >
        {screen.anchor}
        <Text as="p" textStyle="Body/Small/Regular" tone="base">{`${plural(orderGroups[0].orders.length, "order")} this week · ${formatMoney(spentThisWeek, true)}`}</Text>
        {orderGroups.map((group) => (
          // The kicker lines up with the row text: the ListBox pads its rows 20 (Card-padding-medium on a phone).
          <Stack key={group.id} as="section" gap="xs" aria-labelledby={`${baseId}-${group.id}`}>
            <Box paddingX="lg"><Heading level={2} id={`${baseId}-${group.id}`} textStyle="Body/Small/Bold" tone="light">{group.label}</Heading></Box>
            <ListBox theme="shadow">
              <List aria-labelledby={`${baseId}-${group.id}`}>
                {group.orders.map((o) => (
                  // Each value keeps its words together, so the caption wraps between the time and the store.
                  <ListItem key={o.id} data-order={o.id} title={itemsOf(o)} titleLines={2} caption={[formatRelative(o.at), o.store].map((value) => value.replace(/ /g, "\u00a0")).join(" · ")}
                    trailing={<Text as="span" textStyle="Body/Base/Medium">{formatMoney(totalOf(o), true)}</Text>}
                    onClick={() => open(o)} />
                ))}
              </List>
            </ListBox>
          </Stack>
        ))}
      </AppShell>
      <BottomSheet inline open={Boolean(opened)} onOpenChange={(next) => { if (!next) close(); }} title={`Order ${last.id}`} actionsDirection="vertical"
        primaryAction={{ label: "Order again", onClick: () => { close(); toast({ title: "Order added to your cart", children: itemsOf(last) }); } }}
        secondaryAction={{ label: "Close" }}>
        {/* Two groups in one sheet: what was bought, closed by its total, then how it was paid. */}
        <Stack gap="lg">
          <DescriptionList items={[
            ...last.lines.map(([item, quantity]) => ({ id: item, term: `${menu[item].name} × ${quantity}`, description: formatMoney(menu[item].price * quantity, true) })),
            ...(last.reward ? [{ id: "reward", term: "Free drink · 1,500 points", description: <Text as="span" textStyle="Body/Base/Medium" tone="positive">{`−${formatMoney(menu[last.reward].price, true)}`}</Text> }] : []),
            { id: "total", term: "Total", description: formatMoney(total, true), emphasis: true },
          ]} />
          <DescriptionList divider items={[
            { id: "ordered", term: "Ordered", description: formatRelative(last.at) },
            { id: "store", term: "Store", description: last.store },
            { id: "paid", term: "Paid with", description: last.paidWith },
            { id: "points", term: "Points earned", description: plural(Math.floor(total) * 10, "point") },
          ]} />
        </Stack>
      </BottomSheet>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Invoice total",
    description: "An inline list closes the calculation with one emphasised row, the total, under a High rule. The discount keeps its minus sign and sits as a removable label beside its term while the invoice is a draft, so every amount, the total and Send invoice share one end edge; once it is sent, the rows are read-only.",
    render: () => <InvoiceTotal />,
    code: `<DescriptionList items={[
  { id: "workshop", term: "Brand workshop · 2 days", description: "$4,400.00" },
  { id: "direction", term: "Moodboard and art direction", description: "$3,600.00" },
  { id: "logo", term: "Logo concepts · 3 routes", description: "$4,500.00" },
  { id: "subtotal", term: "Subtotal", description: "$12,500.00" },
  ...(discount ? [{
    // A removable label beside the term, not an action column: the amounts keep the list's end edge.
    id: "discount",
    term: <Stack direction="row" gap="2xs" align="center" wrap>
      <span>Discount</span>
      <Badge theme="neutral" background="subtle" size="sm" leadingIcon={false} remove={draft}
        onRemove={removeDiscount} removeLabel="Remove discount">Returning client · 4%</Badge>
    </Stack>,
    description: <Text as="span" textStyle="Body/Base/Medium" tone="positive">−$500.00</Text>,
  }] : []),
  { id: "total", term: "Total", description: formatMoney(total, true), emphasis: true },
]} />

<Stack direction="row" gap="sm" justify="end" wrap>
  {discount ? null : <Button level="tertiary" startIcon="icon-plus-line" onClick={addDiscount}>Add discount</Button>}
  <Button level="primary" onClick={send}>Send invoice</Button>
</Stack>`,
  },
  {
    title: "Copy payment details",
    description: "Every value people paste into their bank app gets a Copy action, a Flat icon button named after its row (“Copy account number”), so each row has the same shape: values in one column, the copy icons on the list\u2019s end edge. The icon turns into a check for two seconds and a hidden status region says what was copied.",
    render: () => <PaymentDetails />,
    code: `<DescriptionList divider items={rows.map((row) => ({
  id: row.id, term: row.term, description: row.value,
  action: row.copy ? (
    <IconButton appearance="flat" level="primary" size="sm"
      icon={copied === row.id ? "icon-check-line" : "icon-copy-line"}
      aria-label={\`Copy \${lower(row.term)}\`} onClick={() => copy(row)} />
  ) : undefined,
}))} />
{/* Rendered empty from the start, so the first copy is announced too. */}
<VisuallyHidden role="status">{announcement}</VisuallyHidden>`,
  },
  {
    title: "Edit in place",
    description: "Long values such as an address read better stacked. Each Edit names its row and turns one value into a field (a Text Area for the address), while the other rows' actions wait: Save or Enter keeps it, Cancel restores it, and focus returns to Edit. An empty value reads None with Add; a value people can't change says why.",
    render: () => <ContactDetails />,
    code: `<DescriptionList layout="stacked" divider items={rows.map((row) => editing?.id === row.id ? {
  id: row.id, term: row.term,
  description: (
    <Form onSubmit={save} gap="md" aria-label={\`Edit \${lower(row.term)}\`}>
      {row.multiline
        ? <TextAreaField aria-label={row.term} rows={3} value={draft} error={error} onValueChange={setDraft} />
        : <InputField aria-label={row.term} value={draft} error={error} onValueChange={setDraft} />}
      <FormActions>
        <Button level="tertiary" onClick={cancel}>Cancel</Button>
        <Button level="primary" type="submit">Save</Button>
      </FormActions>
    </Form>
  ),
} : {
  id: row.id, term: row.term,
  description: row.note ? (
    <Stack gap="2xs">
      <span>{values[row.id]}</span>
      <Text as="span" textStyle="Body/Small/Regular" tone="light">{row.note}</Text>
    </Stack>
  ) : values[row.id] || "None",
  // One row edits at a time
  action: row.editable && !editing ? (
    <Button level="tertiary" size="sm" onClick={() => edit(row)}>
      {values[row.id] ? "Edit" : "Add"}<VisuallyHidden>{\` \${lower(row.term)}\`}</VisuallyHidden>
    </Button>
  ) : undefined,
})} />`,
  },
  {
    title: "Receipt on a phone",
    description: "In the Phin & Co app's Orders root (the AppShell's mobile Bar with the bottom bar), every past order opens its receipt in a Bottom Sheet: the items and a reward closed by one total row, then a second list for how it was paid. Order again adds the items to the cart; closing returns focus to the order's row.",
    render: () => <PhoneReceipts />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone canvas="default" screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation title="Orders" largeTitle="Orders" scrollRef={screenRef}
      trailing={[{ icon: "icon-search-medium-line", label: "Search orders", onClick: searchOrders }]} />}
    bottomNavigation={<BottomNavigation aria-label="Phin & Co" showLabels items={roots} value={root} onValueChange={setRoot} />}
  >
    {groups.map((group) => (
      <Stack key={group.id} as="section" gap="xs" aria-labelledby={group.id}>
        <Box paddingX="lg"><Heading level={2} id={group.id} textStyle="Body/Small/Bold" tone="light">{group.label}</Heading></Box>
        <ListBox theme="shadow">{/* the bottom bar's elevation */}
          <List aria-labelledby={group.id}>
            {group.orders.map((order) => (
              <ListItem key={order.id} title={itemsOf(order)} titleLines={2} caption={\`\${formatRelative(order.at)} · \${order.store}\`}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{formatMoney(totalOf(order), true)}</Text>}
                onClick={() => setOpenId(order.id)} />
            ))}
          </List>
        </ListBox>
      </Stack>
    ))}
  </AppShell>
  <BottomSheet inline open={Boolean(opened)} onOpenChange={(open) => !open && setOpenId(null)}
    title={\`Order \${order.id}\`} actionsDirection="vertical"
    primaryAction={{ label: "Order again", onClick: orderAgain }} secondaryAction={{ label: "Close" }}>
    <Stack gap="lg">
      <DescriptionList items={[
        ...order.lines.map(([item, qty]) => ({ term: \`\${menu[item].name} × \${qty}\`, description: formatMoney(menu[item].price * qty, true) })),
        { term: "Total", description: formatMoney(total, true), emphasis: true },
      ]} />
      <DescriptionList divider items={[
        { term: "Store", description: order.store },
        { term: "Paid with", description: order.paidWith },
        { term: "Points earned", description: plural(points, "point") },
      ]} />
    </Stack>
  </BottomSheet>
</PlatformPhone>`,
  },
  {
    title: "Load details in a panel",
    screen: true,
    description: "The studio's Projects page in the AppShell's Top-Bar pattern: project details come from the server into the shell's Side Panel, docked beside the list, with the first project open. The terms are there at once and a Skeleton as tall as each value holds it (a pill for the Status Badge), so nothing moves when the data arrives; a request that fails shows a Negative Inline Message with Try again. When the page would get narrower than a tablet beside it, the AppShell opens the same panel as a Modal.",
    render: () => <ProjectPanels />,
    code: `const docked = frameWidth >= 360 + 744; // the AppShell docks the panel while the page keeps a tablet's width
// Docked, the first project is open from the start (a Modal never opens by itself).
const [openId, setOpenId] = useState(docked ? projects[0].id : null);

/* A Skeleton as tall as each value holds its place, so no row moves when the data arrives:
   .skeleton-value { display: inline-flex; vertical-align: middle; width: 10ch; }
   The pill is as tall as the Status Badge and sits on its baseline (the Badge's 16px dot):
   .zen-skeleton-shape.skeleton-badge { display: inline-flex; align-items: center; width: 10ch;
     height: var(--zen-badge-size-medium); }
   .zen-skeleton-shape.skeleton-badge::before { content: ""; height: var(--zen-element-size-popular-small); } */
const placeholder = (row) => ({
  ...row,
  description: row.id === "status"
    ? <SkeletonShape shape="pill" className="skeleton-badge" />
    : <SkeletonText lines={1} className="skeleton-value" />,
});
// Try again goes away with its message: focus moves to the panel title (tabIndex -1), inside the panel.
const retry = () => { titleRef.current?.focus(); load(opened.id); };

<AppShell
  pattern="top-bar" // no Sidebar: the places are the header's Tabs, and the page keeps room for the panel
  header={<AppShellHeader leading={<>{logo}<Tabs variant="subtle" aria-label="Đìzai Studio" items={places} value="projects" onValueChange={go} /></>}
    actions={<><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={3} onClick={openNotifications} /><Menu align="end" trigger={account} items={accountItems} /></>}
    main={<PageHeader title="Projects" description="6 projects · Đìzai Studio" actions={<Button level="primary" startIcon="icon-plus-line" onClick={create}>New project</Button>} />} />}
  sidePanel={
    <SidePanel type="standard" size="small" open={Boolean(opened)} onOpenChange={(open) => !open && close()}
      title={<span ref={titleRef} tabIndex={-1}>{opened?.name}</span>} description={opened?.client}
      primaryAction={{ label: "Open project", onClick: openProject }}>
      <Stack gap="md" aria-busy={phase === "loading" || undefined}>
        {phase === "failed" ? (
          <InlineMessage theme="negative" title="Details didn’t load" action={{ label: "Try again", onClick: retry }}>
            The project service took too long to answer.
          </InlineMessage>
        ) : (
          <DescriptionList divider items={phase === "loading" ? rows.map(placeholder) : rows} />
        )}
        <VisuallyHidden role="status">{phase === "loading" ? "Loading project details" : "Project details loaded"}</VisuallyHidden>
      </Stack>
    </SidePanel>
  }
>
  {/* The Body pads the page: the filter and the list start at the margin. */}
  <Stack gap="md">
    <ChipGroup aria-label="Status" size="md" level="secondary" options={statuses} value={filter} onValueChange={setFilter} />
    <ListBox as="section" theme="default" aria-labelledby="projects" header={<Heading level={2} id="projects" textStyle="Heading/Subheading">All projects</Heading>}>
      <List aria-labelledby="projects">
        {shown.map((project) => (
          <ListItem key={project.id} title={project.name} caption={\`\${project.client} · \${lead(project)}\`} selected={project.id === openId}
            leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
            trailing={<Badge theme={statusTheme[project.status]} background="subtle">{project.status}</Badge>}
            onClick={() => open(project.id)} />
        ))}
      </List>
    </ListBox>
  </Stack>
</AppShell>`,
  },
  {
    title: "Narrow side column",
    wide: true,
    description: "In a task's side panel, about 260px wide, the inline rows stack by themselves because the list is narrower than stackBelow (280px); given more room, the same rows sit inline. Long values wrap instead of overflowing, an empty one reads None, and a Done task shows when it finished with Reopen task.",
    render: () => <TaskPage />,
    code: `<Grid columns={{ mobile: 1, desktop: "minmax(0, 3fr) minmax(0, 1fr)" }} gap="lg" align="start">
  <Stack as="article" gap="md">
    …the task…
    {done
      ? <Button level="tertiary" onClick={reopen}>Reopen task</Button>
      : <Button level="primary" onClick={markDone}>Mark as done</Button>}
  </Stack>
  <Card as="section" theme="default" aria-labelledby="details">
    <Stack gap="md">
      <Heading level={4} id="details" textStyle="Heading/Subheading">Details</Heading>
      {/* Narrower than stackBelow (280px by default): each term sits above its value. */}
      <DescriptionList items={[
        { term: "Status", description: <BadgeStatus status={taskStep[status]}>{status}</BadgeStatus> },
        { term: "Assignee", description: "Ava Chen" },
        { term: "Project", description: "Online banking redesign · Lumen Bank" },
        finished ? { term: "Finished", description: formatRelative(finished) } : { term: "Due", description: "Oct 3, 2026" },
        { term: "Test script", description: "lumen-transfers_usability-script_round-2_v3-final.pdf" },
        { term: "Labels", description: "None" },
      ]} />
    </Stack>
  </Card>
</Grid>`,
  },
]);
