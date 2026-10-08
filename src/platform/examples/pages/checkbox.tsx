import { useId, useRef, useState } from "react";
import type { PlatformPage } from "../../PlatformExamples";
import type { ExampleDef } from "../types";
import { PlatformPhone } from "../../PlatformPhone";
import { ActionBar } from "../../../components/ActionBar";
import { Avatar, type AvatarSize } from "../../../components/Avatar";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Checkbox } from "../../../components/Checkbox";
import { DescriptionList } from "../../../components/DescriptionList";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { Form, FormActions, FormFieldset, useFormState } from "../../../components/Form";
import { InlineMessage } from "../../../components/InlineMessage";
import { Grid, Stack } from "../../../components/Layout";
import { Table, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { daysFromToday, files, formatBytes, formatRange, formatRelative, initials, people, projectById, studio, type Person, type StudioFile } from "../data";
import { keepOnHotUpdate } from "../../hotData";
import "./checkbox.css";

export const page: PlatformPage = "checkbox";

/** People are Avatars: a photo when there is one, otherwise solid initials on the person's steady theme (one look on every page).
 *  The name is written beside it, so the Avatar itself is decorative (alt=""). */
function PersonAvatar({ person, size }: { person: Person; size: AvatarSize }) {
  return person.photo
    ? <Avatar size={size} theme="photo" src={person.photo} alt="" />
    : <Avatar size={size} theme={person.theme} alt="">{initials(person.name)}</Avatar>;
}

/* ───────────── Select files: row checkboxes and bulk actions in a Table ───────────── */

const recentFiles: StudioFile[] = files;

function SelectFilesExample() {
  const { toast } = useToast();
  const headingId = useId();
  const [rows, setRows] = useState(recentFiles);
  const [selected, setSelected] = useState<string[]>([]);
  const picked = rows.filter((file) => selected.includes(file.id));
  // Deleting can be undone, so it acts at once and the Toast offers Undo (no confirmation dialog).
  const remove = () => {
    const before = rows;
    setRows(rows.filter((file) => !selected.includes(file.id)));
    setSelected([]);
    toast({ title: `${plural(picked.length, "file")} deleted`, action: { label: "Undo", onClick: () => setRows(before) } });
  };
  const download = () => toast({ title: `${plural(picked.length, "file")} downloaded` });
  const columns: TableColumn<StudioFile>[] = [
    { id: "name", header: "Name", cell: (file) => <TableMedia bold media={<FileIcon format={fileIconFormatOf(file.name)} size="lg" />} caption={projectById(file.project).name}>{file.name}</TableMedia> },
    { id: "owner", header: "Owner", cell: (file) => <TableMedia bold={false} media={<PersonAvatar person={people[file.owner]} size="xsmall" />}>{people[file.owner].name}</TableMedia> },
    { id: "updated", header: "Updated", cell: (file) => <TableText>{formatRelative(file.updated)}</TableText> },
    { id: "size", header: "Size", align: "right", cell: (file) => <TableText>{formatBytes(file.bytes)}</TableText> },
  ];
  // A section of the Files page: toolbar → table, and the Table sits straight on the page with no container.
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack direction="row" justify="between" align="center" gap="sm" wrap>
        <Heading level={4} id={headingId} textStyle="Heading/4">Recent files</Heading>
        <Stack direction="row" gap="xs" align="center">
          <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">
            {picked.length ? `${plural(picked.length, "file")} selected` : plural(rows.length, "file")}
          </Text>
          {picked.length ? (
            <>
              <Button level="tertiary" startIcon="icon-download-01-line" onClick={download}>Download</Button>
              <Button level="danger-subtle" startIcon="icon-trash-line" onClick={remove}>Delete</Button>
            </>
          ) : null}
        </Stack>
      </Stack>
      <Table className="px-checkbox-table" aria-labelledby={headingId} rows={rows} columns={columns} selectable selectedIds={selected} onSelectionChange={setSelected}
        empty={<EmptyState headingLevel={5} illustration={false} title="No files yet" primaryAction={{ label: "Restore files", onClick: () => setRows(recentFiles) }}>Files your team shares in projects show up here.</EmptyState>} />
    </Stack>
  );
}

/* ───────────── Export sections: a parent checkbox for a labelled group ───────────── */

const reportSections = [
  { id: "time", label: "Time entries", caption: "1,284 entries from 31 people" },
  { id: "invoices", label: "Invoices", caption: "14 invoices, sent and paid" },
  { id: "expenses", label: "Expenses", caption: "62 receipts with their categories" },
  { id: "budgets", label: "Project budgets", caption: "Budget and spend for 6 projects" },
];

function ExportSectionsExample() {
  const { toast } = useToast();
  const [picked, setPicked] = useState(["time", "invoices"]);
  const [error, setError] = useState<string>();
  const all = picked.length === reportSections.length;
  const some = picked.length > 0 && !all;
  const change = (next: string[]) => { setPicked(next); if (next.length) setError(undefined); };
  // The parent resolves a mixed group to "all"; from "all" it clears the group.
  const toggleAll = () => change(all ? [] : reportSections.map((section) => section.id));
  const toggle = (id: string, on: boolean) => change(on ? [...picked, id] : picked.filter((item) => item !== id));
  const submit = () => {
    if (!picked.length) { setError("Choose at least one section to export"); return; }
    toast({ title: "Q3 report exported", children: plural(picked.length, "section") });
  };
  return (
    <Card theme="flat">
      <Form onSubmit={submit}>
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Q3 2026 studio report</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{formatRange(new Date(2026, 6, 1), new Date(2026, 8, 30))} · PDF</Text>
        </Stack>
        <FormFieldset kind="checkbox" legend="Include in the export" error={error}>
          <Checkbox bold label="All sections" checked={all} indeterminate={some} onCheckedChange={toggleAll} />
          <Stack gap="sm" className="px-checkbox-children">
            {reportSections.map((section) => (
              <Checkbox key={section.id} label={section.label} caption={section.caption} checked={picked.includes(section.id)} onCheckedChange={(on) => toggle(section.id, on)} />
            ))}
          </Stack>
        </FormFieldset>
        <FormActions>
          <Button level="primary" type="submit">Export report</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

/* ───────────── Confirm before submitting: one checkbox that the submit checks ───────────── */

const loggedHours = [
  { project: "Loyalty app", client: "Phin & Co", hours: 18 },
  { project: "Online banking redesign", client: "Lumen Bank", hours: 16.5 },
  { project: "Zen design system", client: "Đìzai Studio", hours: 5.5 },
];
const hoursLabel = (hours: number) => `${hours.toFixed(1)} h`;

function ConfirmTimesheetExample() {
  const [submitted, setSubmitted] = useState(false);
  const form = useFormState({
    initialValues: { confirmed: false },
    validate: ({ confirmed }) => ({ confirmed: confirmed ? undefined : "Confirm your hours to submit the timesheet" }),
    onSubmit: () => setSubmitted(true),
  });
  const total = loggedHours.reduce((sum, row) => sum + row.hours, 0);
  const withdraw = () => { setSubmitted(false); form.reset(); };
  // The whole card is the form: its groups (header, hours, confirmation, actions) take the Form's gap.
  return (
    <Card theme="flat">
      <Form form={form}>
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Timesheet</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{formatRange(daysFromToday(-9), daysFromToday(-3))}</Text>
        </Stack>
        <DescriptionList items={[
          ...loggedHours.map((row) => ({ term: `${row.project} · ${row.client}`, description: hoursLabel(row.hours) })),
          { term: "Total", description: hoursLabel(total), emphasis: true },
        ]} />
        {submitted ? (
          <InlineMessage theme="positive" title="Timesheet submitted" action={{ label: "Withdraw", onClick: withdraw }}>
            {people.duy.name} reviews it by Friday.
          </InlineMessage>
        ) : (
          <>
            <FormFieldset legend="Confirmation" hideLegend error={form.fieldError("confirmed")}>
              <Checkbox label="I confirm these hours are accurate" caption="They are billed to Phin & Co and Lumen Bank in October." {...form.checkboxField("confirmed")} />
            </FormFieldset>
            <FormActions>
              <Button level="primary" type="submit">Submit timesheet</Button>
            </FormActions>
          </>
        )}
      </Form>
    </Card>
  );
}

/* ───────────── Role permissions: a settings form saved later, locked options with their reason ───────────── */

type Permission = { id: string; label: string; caption: string; locked?: boolean };
const permissionGroups: Array<{ id: string; legend: string; permissions: Permission[] }> = [
  { id: "projects", legend: "Projects", permissions: [
    { id: "view", label: "View all projects", caption: "Every role can view projects", locked: true },
    { id: "edit", label: "Edit files and tasks", caption: "Change designs, tasks and comments in their projects" },
    { id: "members", label: "Manage project members", caption: "Add people to a project or remove them" },
  ] },
  { id: "clients", legend: "Clients and billing", permissions: [
    { id: "guests", label: "Invite client guests", caption: "Add client contacts to a project as guests" },
    { id: "budgets", label: "See budgets and spend", caption: "Budget, hours and spend of their projects" },
    { id: "invoices", label: "Send invoices", caption: "Only the Finance role sends invoices", locked: true },
  ] },
];
const savedDesigner: Record<string, boolean> = { view: true, edit: true, members: false, guests: false, budgets: true, invoices: false };

function RolePermissionsExample() {
  const { toast } = useToast();
  const [saved, setSaved] = useState(savedDesigner);
  const [draft, setDraft] = useState(savedDesigner);
  const dirty = Object.keys(saved).some((id) => draft[id] !== saved[id]);
  const save = () => { setSaved(draft); toast({ title: "Designer role saved" }); };
  return (
    <Card theme="flat">
      <Form onSubmit={save}>
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Designer</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{plural(12, "person", "people")} at {studio.name} have this role. Changes apply the next time they open Zen.</Text>
        </Stack>
        <Grid minColumnWidth={400} gap="lg" align="start">
          {permissionGroups.map((group) => (
            <FormFieldset key={group.id} kind="checkbox" legend={group.legend}>
              {group.permissions.map((permission) => (
                <Checkbox key={permission.id} label={permission.label} caption={permission.caption} disabled={permission.locked}
                  checked={draft[permission.id]} onCheckedChange={(on) => setDraft({ ...draft, [permission.id]: on })} />
              ))}
            </FormFieldset>
          ))}
        </Grid>
        {/* Nothing to cancel or save until the draft differs from what is saved; the status line says so. */}
        <FormActions align="between">
          <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{dirty ? "Unsaved changes" : ""}</Text>
          <Button level="tertiary" disabled={!dirty} onClick={() => setDraft(saved)}>Cancel</Button>
          <Button level="primary" type="submit" disabled={!dirty}>Save changes</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

/* ───────────── Offline projects: a phone list with the mark on the right ───────────── */

// Every project Alex can open in the Zen app, by name: long enough that the large title folds as the list scrolls.
const offlineProjects = [
  { id: "lumen-report", name: "Annual report 2026", client: "Lumen Bank", bytes: 640_000_000 },
  { id: "bookfair-site", name: "Book Fair 2026 website", client: "Hanoi Book Fair", bytes: 2_100_000_000 },
  { id: "saola-brand", name: "Brand refresh", client: "Saola Outdoor", bytes: 1_120_000_000 },
  { id: "lumen-cards", name: "Card controls", client: "Lumen Bank", bytes: 310_000_000 },
  { id: "mekong-driver", name: "Driver app", client: "Mekong Freight", bytes: 520_000_000 },
  { id: "dizai-handbook", name: "Hiring handbook", client: "Đìzai Studio", bytes: 95_000_000 },
  { id: "phin-loyalty", name: "Loyalty app", client: "Phin & Co", bytes: 820_000_000 },
  { id: "phin-menu", name: "Menu boards", client: "Phin & Co", bytes: 1_700_000_000 },
  { id: "lumen-banking", name: "Online banking redesign", client: "Lumen Bank", bytes: 1_460_000_000 },
  { id: "mekong-tracking", name: "Shipment tracking", client: "Mekong Freight", bytes: 240_000_000 },
  { id: "phin-packaging", name: "Store packaging", client: "Phin & Co", bytes: 960_000_000 },
  { id: "dizai-site", name: "Studio website", client: "Đìzai Studio", bytes: 430_000_000 },
  { id: "bookfair-kiosk", name: "Ticketing kiosk", client: "Hanoi Book Fair", bytes: 280_000_000 },
  { id: "saola-trails", name: "Trail map app", client: "Saola Outdoor", bytes: 700_000_000 },
  { id: "zen-ds", name: "Zen design system", client: "Đìzai Studio", bytes: 380_000_000 },
];

function OfflineProjectsExample() {
  const { toast } = useToast();
  // One scroller: the large title folds as the list runs under the bar.
  const screenRef = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState(["phin-loyalty", "zen-ds"]);
  const bytes = offlineProjects.filter((item) => picked.includes(item.id)).reduce((sum, item) => sum + item.bytes, 0);
  const toggle = (id: string, on: boolean) => setPicked((list) => (on ? [...list, id] : list.filter((item) => item !== id)));
  return (
    <PlatformPhone label="Downloads" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="alt" title="Downloads" largeTitle="Downloads" scrollRef={screenRef} />}
      // The Primary waits for a choice, and the summary says why.
      footer={(
        <ActionBar position="static"
          summary={<Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{picked.length ? `Uses ${formatBytes(bytes)} · 18.6 GB free on this phone` : "Choose the projects to keep on this phone"}</Text>}
          primaryAction={{ label: picked.length ? `Download ${plural(picked.length, "project")}` : "Download projects", disabled: !picked.length,
            onClick: () => toast({ title: `${plural(picked.length, "project")} saved for offline` }) }} />
      )}>
      {/* Margin-Compact body (padding lg, 20). */}
      <Stack gap="md" padding="lg">
        <Text tone="base">Projects you download open without a connection, on a site visit or a flight.</Text>
        <FormFieldset kind="checkbox" legend="Projects" className="px-checkbox-rows">
          {offlineProjects.map((item) => (
            <Checkbox key={item.id} checkSide="right" label={item.name} caption={`${item.client} · ${formatBytes(item.bytes)}`}
              checked={picked.includes(item.id)} onCheckedChange={(on) => toggle(item.id, on)} bold />
          ))}
        </FormFieldset>
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Select files",
    description: "A selectable Table draws the row checkboxes and the select-all mark, which turns indeterminate while only some rows are picked. Bulk actions appear in the toolbar once something is selected, and Delete can be undone from the Toast.",
    wide: true,
    render: () => <SelectFilesExample />,
    code: `const [selected, setSelected] = useState<string[]>([]);
const picked = rows.filter((file) => selected.includes(file.id));
// Delete acts at once; Undo in the Toast puts the files back and closes it.
const remove = () => {
  const before = rows;
  setRows(rows.filter((file) => !selected.includes(file.id)));
  setSelected([]);
  toast({ title: \`\${plural(picked.length, "file")} deleted\`,
    action: { label: "Undo", onClick: () => setRows(before) } });
};

<Stack as="section" gap="md" aria-labelledby="recent-files">
  <Stack direction="row" justify="between" align="center" gap="sm" wrap>
    <Heading level={4} id="recent-files" textStyle="Heading/4">Recent files</Heading>
    <Stack direction="row" gap="xs" align="center">
      <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">
        {picked.length ? \`\${plural(picked.length, "file")} selected\` : plural(rows.length, "file")}
      </Text>
      {picked.length ? (
        <>
          <Button level="tertiary" startIcon="icon-download-01-line" onClick={download}>Download</Button>
          <Button level="danger-subtle" startIcon="icon-trash-line" onClick={remove}>Delete</Button>
        </>
      ) : null}
    </Stack>
  </Stack>
  {/* Not a widget: the table sits on the page, no Card */}
  <Table aria-labelledby="recent-files" rows={rows} columns={columns}
    selectable selectedIds={selected} onSelectionChange={setSelected}
    empty={<EmptyState headingLevel={5} illustration={false} title="No files yet" primaryAction={{ label: "Restore files", onClick: restore }}>
      Files your team shares in projects show up here.
    </EmptyState>} />
</Stack>`,
  },
  {
    title: "Export sections",
    description: "A bold parent checkbox sits over its labelled children and shows the indeterminate mark while only some are checked; clicking it selects all. Export with nothing chosen shows the error on the group.",
    render: () => <ExportSectionsExample />,
    code: `const all = picked.length === sections.length;
const some = picked.length > 0 && !all;

<Form onSubmit={submit}>
  <FormFieldset kind="checkbox" legend="Include in the export" error={error}>
    <Checkbox bold label="All sections" checked={all} indeterminate={some}
      onCheckedChange={() => setPicked(all ? [] : sections.map((s) => s.id))} />
    {/* children indented under the parent's label */}
    <Stack gap="sm" className="children">
      {sections.map((s) => (
        <Checkbox key={s.id} label={s.label} caption={s.caption}
          checked={picked.includes(s.id)} onCheckedChange={(on) => toggle(s.id, on)} />
      ))}
    </Stack>
  </FormFieldset>
  <FormActions>
    <Button level="primary" type="submit">Export report</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Confirm before submitting",
    description: "A single checkbox confirms a statement before the timesheet goes out. It starts unchecked, and submitting without it puts the error on the checkbox instead of disabling the button.",
    render: () => <ConfirmTimesheetExample />,
    code: `const form = useFormState({
  initialValues: { confirmed: false },
  validate: ({ confirmed }) => ({ confirmed: confirmed ? undefined : "Confirm your hours to submit the timesheet" }),
  onSubmit: () => setSubmitted(true),
});

<Form form={form}>
  {/* header and hours above, then: */}
  <FormFieldset legend="Confirmation" hideLegend error={form.fieldError("confirmed")}>
    <Checkbox label="I confirm these hours are accurate"
      caption="They are billed to Phin & Co and Lumen Bank in October."
      {...form.checkboxField("confirmed")} />
  </FormFieldset>
  <FormActions>
    <Button level="primary" type="submit">Submit timesheet</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Role permissions",
    description: "Checkboxes, not toggles, because nothing changes until Save. Permissions a role can't change stay disabled, checked or not, and their caption says why; Cancel and Save wake up once something changes.",
    wide: true,
    render: () => <RolePermissionsExample />,
    code: `const [draft, setDraft] = useState(saved);
const dirty = Object.keys(saved).some((id) => draft[id] !== saved[id]);

<Form onSubmit={save}>
  <Grid minColumnWidth={400} gap="lg" align="start">
    <FormFieldset kind="checkbox" legend="Projects">
      <Checkbox label="View all projects" caption="Every role can view projects" checked disabled />
      <Checkbox label="Edit files and tasks" caption="Change designs, tasks and comments in their projects"
        checked={draft.edit} onCheckedChange={(on) => setDraft({ ...draft, edit: on })} />
    </FormFieldset>
    <FormFieldset kind="checkbox" legend="Clients and billing">
      <Checkbox label="Invite client guests" caption="Add client contacts to a project as guests"
        checked={draft.guests} onCheckedChange={(on) => setDraft({ ...draft, guests: on })} />
      <Checkbox label="Send invoices" caption="Only the Finance role sends invoices" checked={false} disabled />
    </FormFieldset>
  </Grid>
  <FormActions align="between">
    <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{dirty ? "Unsaved changes" : ""}</Text>
    <Button level="tertiary" disabled={!dirty} onClick={() => setDraft(saved)}>Cancel</Button>
    <Button level="primary" type="submit" disabled={!dirty}>Save changes</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Offline projects",
    description: "On a phone the mark sits on the right (checkSide) and each row fills the width, so the whole row is the tap target. The ActionBar summary counts the download size, and Download waits until a project is chosen.",
    render: () => <OfflineProjectsExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Downloads" largeTitle="Downloads" scrollRef={screenRef} />}
  footer={(
    <ActionBar position="static"
      summary={<Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">Uses {formatBytes(bytes)} · 18.6 GB free on this phone</Text>}
      primaryAction={{ label: \`Download \${plural(picked.length, "project")}\`, disabled: !picked.length, onClick: download }} />
  )}>
  <Stack gap="md" padding="lg">
    <Text tone="base">Projects you download open without a connection, on a site visit or a flight.</Text>
    {/* rows stretch to the full width, so the marks line up on the right */}
    <FormFieldset kind="checkbox" legend="Projects">
      {projects.map((p) => (
        <Checkbox key={p.id} checkSide="right" label={p.name} caption={\`\${p.client} · \${formatBytes(p.bytes)}\`}
          checked={picked.includes(p.id)} onCheckedChange={(on) => toggle(p.id, on)} />
      ))}
    </FormFieldset>
  </Stack>
</PlatformPhone>`,
  },
]);
