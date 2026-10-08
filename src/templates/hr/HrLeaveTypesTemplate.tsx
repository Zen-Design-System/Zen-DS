/**
 * Template: HR · Time off › Configurations › Leave types. The HR admin's leave policies:
 * - Every leave type in a Table: its emoji Dock Icon, name and use this year, Paid or Unpaid, the yearly allowance,
 *   the carry-over, who it applies to, and an Active Toggle that takes effect at once (turning one off offers Undo).
 * - Search and the Pay and Status filter chips narrow the table; an Empty State leads back when nothing matches. On a
 *   phone the types become a List (Active and the row menu stay at the end) and the chips open Bottom Sheets.
 * - A row opens the type in a validated ModalForm; Add leave type opens it empty and Duplicate opens it prefilled.
 * - Delete asks first in a negative Dialog, since it can't be undone, and offers Deactivate instead.
 *
 * Copy it with ./HrShell, ./data and ./assets into your app and replace the sample data. Render it inside your app's
 * <ZenProvider>. Uses only @zen-ds/react components, no custom CSS.
 */
import { useMemo, useState } from "react";
import {
  AutocompleteField,
  Badge,
  BottomSheet,
  Button,
  Chip,
  Container,
  Dialog,
  DockIcon,
  EmptyState,
  FormFieldset,
  Grid,
  Icon,
  IconButton,
  InputField,
  InputLeadingTrailing,
  List,
  ListItem,
  Menu,
  ModalForm,
  NumberField,
  PageHeader,
  RadioButton,
  Search,
  Stack,
  Table,
  TableBadges,
  TableMedia,
  TableText,
  Text,
  TextAreaField,
  ToggleButton,
  VisuallyHidden,
  plural,
  useFormState,
  useToast,
  useZen,
  type TableSort,
} from "@zen-ds/react";
import { HrShell, hrModules, type HrNavigate } from "./HrShell";
import { formatDays, leaveKindList, leaveRequests, teamList, teams, today, workspace, type LeaveKindId, type TeamId } from "./data";

/* ── Data: the studio's leave types, plus the carry-over and eligibility this page manages ─────────────────────── */
type LeaveType = {
  id: string;
  name: string;
  emoji: string;
  paid: boolean;
  /** Days per year. */
  allowance: number;
  /** Unused days people keep into next year. */
  carryOver: number;
  /** The teams it applies to; empty means everyone. */
  teams: TeamId[];
  description: string;
  active: boolean;
};
const rules: Record<LeaveKindId, Pick<LeaveType, "carryOver" | "teams">> = {
  annual: { carryOver: 5, teams: [] },
  sick: { carryOver: 0, teams: [] },
  family: { carryOver: 0, teams: [] },
  study: { carryOver: 2, teams: ["design", "engineering", "product"] },
  unpaid: { carryOver: 0, teams: [] },
};
const seed: LeaveType[] = [
  ...leaveKindList.map((kind) => ({ ...kind, ...rules[kind.id] })),
  // A policy HR is still drafting: set up, not open for requests yet.
  { id: "sabbatical", name: "Sabbatical", emoji: "🧭", paid: true, allowance: 20, carryOver: 0, teams: [], description: "A month away to recharge, after five years at the studio.", active: false },
];

/** The emoji people see next to the type when they request leave (the field shows the emoji, the list its meaning). */
const emojiOptions = [
  ["🏝️", "Holiday"], ["🤒", "Illness"], ["🏡", "Family"], ["📚", "Study"], ["🧳", "Travel"],
  ["🧭", "Sabbatical"], ["👶", "Parental"], ["💍", "Wedding"], ["🕊️", "Bereavement"], ["🏠", "Moving house"],
].map(([emoji, meaning]) => ({ value: emoji, label: emoji, caption: meaning }));
const teamOptions = teamList.map((team) => ({ id: team.id, label: team.name }));
const payOptions = [{ id: "paid", label: "Paid" }, { id: "unpaid", label: "Unpaid" }];
const statusOptions = [{ id: "active", label: "Active" }, { id: "inactive", label: "Inactive" }];
const thisYear = today.slice(0, 4);

/** How many requests used the type this year: shown under its name and before a delete. */
const requestsThisYear = (id: string) => leaveRequests.filter((request) => request.kind === id && request.start.startsWith(thisYear)).length;
const usageOf = (id: string) => { const count = requestsThisYear(id); return count ? `${plural(count, "request")} this year` : "No requests yet"; };
/** Who it applies to: everyone, one team or a number of teams, with the headcount. */
const audienceOf = (type: LeaveType) => ({
  label: !type.teams.length ? "Everyone" : type.teams.length === 1 ? teams[type.teams[0]].name : `${type.teams.length} teams`,
  people: type.teams.length ? type.teams.reduce((sum, id) => sum + teams[id].headcount, 0) : workspace.headcount,
});

const blank = { name: "", emoji: emojiOptions[0].value, description: "", pay: "paid", allowance: null as number | null, carryOver: 0 as number | null, audience: "everyone", teams: [] as string[] };
type Values = typeof blank;
const valuesOf = (type: LeaveType, name = type.name): Values => ({
  name, emoji: type.emoji, description: type.description, pay: type.paid ? "paid" : "unpaid", allowance: type.allowance, carryOver: type.carryOver,
  audience: type.teams.length ? "teams" : "everyone", teams: [...type.teams],
});

export function HrLeaveTypesTemplate() {
  const { toast, dismiss } = useToast();
  const phone = useZen()?.breakpoint === "mobile";
  const [types, setTypes] = useState(seed);
  const [query, setQuery] = useState("");
  const [pay, setPay] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  // Phones pick Pay and Status in Bottom Sheets.
  const [sheet, setSheet] = useState<"pay" | "status" | null>(null);
  const [sort, setSort] = useState<TableSort | null>(null);
  // What the form and the Dialog show stays set while they animate out; only `open` flips.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState("new"); // "new" or the id of the type being edited
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<LeaveType | null>(null);
  const current = types.find((type) => type.id === editing);
  const deletingUses = deleting ? requestsThisYear(deleting.id) : 0;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = types.filter((type) =>
      (!q || `${type.name} ${type.description}`.toLowerCase().includes(q))
      && (!pay || (pay === "paid") === type.paid)
      && (!status || (status === "active") === type.active));
    if (!sort) return list;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...list].sort((a, b) => (sort.columnId === "allowance" ? a.allowance - b.allowance : a.name.localeCompare(b.name)) * direction);
  }, [types, query, pay, status, sort]);
  const clearFilters = () => { setQuery(""); setPay(null); setStatus(null); };
  const activeFilters = (query.trim() ? 1 : 0) + (pay ? 1 : 0) + (status ? 1 : 0);

  const navigate: HrNavigate = (target) => {
    // Configurations only expands in the Sidebar; Leave types is this page.
    if (target.module === "time-off" && (target.page === "leave-types" || target.page === "configurations")) return;
    if (target.module === "home") { toast({ title: "Home isn't part of this demo" }); return; }
    const { title, sections } = hrModules[target.module];
    const pages = sections.flatMap((section) => section.items.flatMap((item) => [item, ...(item.children ?? [])]));
    toast({ title: `${pages.find((item) => item.id === target.page)?.label ?? title} isn't part of this demo` });
  };

  /* ── Changes that apply at once; each can be undone from its Toast (Undo also closes it) ── */
  const update = (id: string, patch: Partial<LeaveType>) => setTypes((list) => list.map((type) => (type.id === id ? { ...type, ...patch } : type)));
  const undoable = (title: string, children: string | undefined, undo: () => void) => {
    const toastId = toast({ title, children, action: { label: "Undo", onClick: () => { undo(); dismiss(toastId); } } });
  };
  const setActive = (type: LeaveType, active: boolean) => {
    update(type.id, { active });
    if (active) toast({ title: `${type.name} activated`, children: "Open for new requests" });
    else undoable(`${type.name} deactivated`, "Hidden from new requests", () => update(type.id, { active: true }));
  };
  const remove = (type: LeaveType) => {
    setTypes((list) => list.filter((item) => item.id !== type.id));
    setDeleteOpen(false);
    toast({ title: "Leave type deleted", children: type.name });
  };

  /* ── Add, duplicate and edit share one validated form ── */
  const form = useFormState({
    initialValues: blank,
    validate: (values) => {
      const name = values.name.trim();
      const taken = types.some((type) => type.id !== editing && type.name.toLowerCase() === name.toLowerCase());
      const { allowance, carryOver } = values;
      return {
        name: !name ? "Enter a name, like Parental leave" : taken ? `Choose another name, ${name} already exists` : undefined,
        allowance: allowance === null ? "Enter the days per year, like 15" : !Number.isInteger(allowance) || allowance < 1 || allowance > 365 ? "Use a whole number from 1 to 365" : undefined,
        carryOver: carryOver === null ? "Enter 0 to keep no days" : !Number.isInteger(carryOver) || carryOver < 0 ? "Use a whole number, 0 or more" : allowance !== null && carryOver > allowance ? `Use ${allowance} days or fewer` : undefined,
        teams: values.audience === "teams" && !values.teams.length ? "Choose at least one team" : undefined,
      };
    },
    onSubmit: (values) => {
      const next = {
        name: values.name.trim(), emoji: values.emoji, description: values.description.trim(), paid: values.pay === "paid",
        allowance: values.allowance ?? 0, carryOver: values.carryOver ?? 0, teams: values.audience === "teams" ? (values.teams as TeamId[]) : [],
      };
      setFormOpen(false);
      if (current) {
        const before = current;
        update(before.id, next);
        undoable(`${next.name} updated`, undefined, () => update(before.id, before));
      } else {
        const id = `type-${Date.now()}`;
        setTypes((list) => [...list, { id, active: true, ...next }]);
        undoable(`${next.name} added`, `${formatDays(next.allowance)} a year`, () => setTypes((list) => list.filter((type) => type.id !== id)));
      }
    },
  });
  const openForm = (id: string, values: Values) => { form.reset(values); setEditing(id); setFormOpen(true); };
  const pickedPeople = form.values.teams.reduce((sum, id) => sum + teams[id as TeamId].headcount, 0);
  const addType = () => openForm("new", blank);

  /* ── Pay and Status: one choice each; a Chip popover on a desktop, a Bottom Sheet on a phone ── */
  const filters = {
    pay: { label: "Pay", options: payOptions, value: pay, onChange: setPay },
    status: { label: "Status", options: statusOptions, value: status, onChange: setStatus },
  };
  const chip = (id: keyof typeof filters) => {
    const { label, options, value, onChange } = filters[id];
    const shared = { variant: "advanced", size: "md", dropdown: true, selected: value !== null, onClearSelection: () => onChange(null) } as const;
    const chipLabel = options.find((option) => option.id === value)?.label ?? label;
    return phone
      ? <Chip key={id} {...shared} aria-haspopup="dialog" aria-expanded={sheet === id} onClick={() => setSheet(id)}>{chipLabel}</Chip>
      : (
        <Chip key={id} {...shared} popoverLabel={label} popoverItems={options.map((option) => ({ ...option, selected: option.id === value }))}
          onPopoverSelect={(item) => onChange(item.id === value ? null : item.id)}>{chipLabel}</Chip>
      );
  };
  const sheetFilter = sheet ? filters[sheet] : null;
  const check = <Icon name="icon-check-line" size="base" decorative />;

  /* ── A type's controls, shared by the table row and the phone list row ── */
  const activeToggle = (type: LeaveType) => (
    <ToggleButton size={phone ? "lg" : "md"} aria-label={`${type.name} active`} checked={type.active} onCheckedChange={(checked) => setActive(type, checked)} />
  );
  const actionsMenu = (type: LeaveType) => (
    <Menu align="end" trigger={<IconButton appearance="flat" level="primary" icon="icon-dots-horizontal-line" aria-label={`Actions for ${type.name}`} />}
      items={[
        { id: "edit", label: "Edit", icon: "icon-edit-01-line", onSelect: () => openForm(type.id, valuesOf(type)) },
        { id: "duplicate", label: "Duplicate", icon: "icon-copy-line", onSelect: () => openForm("new", valuesOf(type, `${type.name} copy`)) },
        { type: "separator" },
        { id: "delete", label: "Delete", icon: "icon-trash-line", danger: true, onSelect: () => { setDeleting(type); setDeleteOpen(true); } },
      ]} />
  );

  const empty = !types.length
    ? <EmptyState title="No leave types yet" headingLevel={2} illustration={false} icon="icon-calendar-heart-line" primaryAction={{ label: "Add leave type", onClick: addType }}>Add the kinds of time off people can request.</EmptyState>
    : pay || status || !query.trim()
      ? <EmptyState title="No leave types match" headingLevel={2} illustration={false} icon="icon-search-medium-line" secondaryAction={{ label: "Clear filters", onClick: clearFilters }}>Try another name, pay or status.</EmptyState>
      : <EmptyState title={`No results for “${query.trim()}”`} headingLevel={2} illustration={false} icon="icon-search-medium-line" secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>Search by name or description.</EmptyState>;

  return (
    <HrShell module="time-off" page="leave-types" onNavigate={navigate}>
      <Container maxWidth="full">
        <Stack gap="xl" paddingY="sm">
          <PageHeader title="Leave types" description="The kinds of time off people can request. Allowances reset every Jan 1."
            actions={<Button level="primary" startIcon="icon-plus-line" onClick={addType}>Add leave type</Button>} />

          <Stack gap="md">
            {/* Search fills its column; the filter chips (and Clear all, once two filters are on) share the rest. */}
            <Grid columns={{ mobile: 1, desktop: "minmax(0, 320px) 1fr" }} gap="sm" align="center">
              <Search aria-label="Search leave types" placeholder="Search leave types" value={query} onValueChange={setQuery} />
              {/* On a phone the chips stay on one row that scrolls sideways. */}
              <Stack direction="row" gap="xs" align="center" wrap={!phone} role="group" aria-label="Filter leave types" style={phone ? { overflowX: "auto" } : undefined}>
                {chip("pay")}
                {chip("status")}
                {activeFilters >= 2 ? <Button level="tertiary" onClick={clearFilters}>Clear all</Button> : null}
              </Stack>
            </Grid>

            {phone ? (
              // A phone lists the types: allowance, pay and who it applies to under the name; Active and the menu stay in reach.
              shown.length ? (
                <List aria-label="Leave types">
                  {shown.map((type) => (
                    <ListItem key={type.id} title={type.name} onClick={() => openForm(type.id, valuesOf(type))}
                      caption={`${formatDays(type.allowance)} a year · ${type.paid ? "Paid" : "Unpaid"} · ${audienceOf(type).label}`}
                      leading={<DockIcon theme="emoji" emoji={type.emoji} size="md" />}
                      trailing={<Stack direction="row" gap="xs" align="center">{activeToggle(type)}{actionsMenu(type)}</Stack>} />
                  ))}
                </List>
              ) : empty
            ) : (
              <Table aria-label="Leave types" rows={shown} getRowId={(row) => row.id} sort={sort} onSortChange={setSort} empty={empty}
                onRowClick={(row) => openForm(row.id, valuesOf(row))}
                columns={[
                  { id: "name", header: "Leave type", sortable: true, cell: (row) => (
                    <TableMedia media={<DockIcon theme="emoji" emoji={row.emoji} size="sm" />} caption={usageOf(row.id)}>{row.name}</TableMedia>
                  ) },
                  // Pay is a category, not a status: the Badge drops its status dot.
                  { id: "pay", header: "Pay", width: "104px", cell: (row) => (
                    <TableBadges><Badge theme={row.paid ? "green" : "neutral"} background="subtle" leadingIcon={false}>{row.paid ? "Paid" : "Unpaid"}</Badge></TableBadges>
                  ) },
                  { id: "allowance", header: "Allowance", width: "136px", align: "right", sortable: true, cell: (row) => <TableText>{formatDays(row.allowance)}</TableText> },
                  { id: "carry-over", header: "Carry-over", width: "112px", align: "right", cell: (row) => <TableText>{row.carryOver ? formatDays(row.carryOver) : "None"}</TableText> },
                  { id: "audience", header: "Applies to", width: "144px", cell: (row) => {
                    const audience = audienceOf(row);
                    return <TableText caption={plural(audience.people, "person", "people")}>{audience.label}</TableText>;
                  } },
                  { id: "active", header: "Active", width: "88px", cell: activeToggle },
                  { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, width: "64px", align: "right", cell: actionsMenu },
                ]} />
            )}

            {shown.length ? <Text textStyle="Body/Small/Regular" tone="base">{plural(shown.length, "leave type")} · {shown.filter((type) => type.active).length} active</Text> : null}
          </Stack>
        </Stack>
      </Container>

      <ModalForm open={formOpen} onOpenChange={setFormOpen} onSubmit={form.handleSubmit}
        title={current ? "Edit leave type" : "Add leave type"}
        description={current ? "Changes apply to requests made from now on." : "People it applies to can request it right away."}
        primaryAction={{ label: current ? "Save changes" : "Add leave type" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Name" placeholder="Parental leave" autoComplete="off" data-autofocus="" {...form.field("name")}
          leading={<InputLeadingTrailing label={form.values.emoji} dropdown options={emojiOptions} value={form.values.emoji}
            onValueChange={(emoji) => form.setValue("emoji", emoji)} popoverLabel="Emoji" align="start" />} />
        <TextAreaField label="Description" labelOptional rows={2} placeholder="Time with a newborn or a newly adopted child." {...form.field("description")} />
        <FormFieldset legend="Pay" kind="radio" direction="row">
          <RadioButton label="Paid" caption="Full salary" {...form.radioField("pay", "paid")} />
          <RadioButton label="Unpaid" caption="Deducted from salary" {...form.radioField("pay", "unpaid")} />
        </FormFieldset>
        <Grid columns={{ mobile: 1, desktop: 2 }} gap="md" align="start">
          <NumberField label="Days per year" min={1} max={365} placeholder="15" {...form.numberField("allowance")} />
          <NumberField label="Carry-over" min={0} max={365} helpText="Days kept for next year" {...form.numberField("carryOver")} />
        </Grid>
        <FormFieldset legend="Applies to" kind="radio" direction="row">
          <RadioButton label="Everyone" caption={plural(workspace.headcount, "person", "people")} {...form.radioField("audience", "everyone")} />
          <RadioButton label="Specific teams" caption={pickedPeople ? plural(pickedPeople, "person", "people") : undefined} {...form.radioField("audience", "teams")} />
        </FormFieldset>
        {form.values.audience === "teams"
          ? <AutocompleteField label="Teams" options={teamOptions} addLabel="Add team" popoverLabel="Teams" searchPlaceholder="Search teams" {...form.autocompleteField("teams")} />
          : null}
      </ModalForm>

      {/* Phone filters: one choice closes the sheet; picking the chosen one again clears it. */}
      <BottomSheet open={sheetFilter !== null} onOpenChange={(open) => { if (!open) setSheet(null); }} title={sheetFilter?.label ?? "Filter"}>
        {sheetFilter ? (
          <List aria-label={sheetFilter.label}>
            {sheetFilter.options.map((option) => {
              const selected = option.id === sheetFilter.value;
              return <ListItem key={option.id} title={option.label} selected={selected} trailing={selected ? check : undefined}
                onClick={() => { sheetFilter.onChange(selected ? null : option.id); setSheet(null); }} />;
            })}
          </List>
        ) : null}
      </BottomSheet>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen} theme="negative"
        title={deleting ? `Delete “${deleting.name}”?` : "Delete leave type?"}
        description={`This removes everyone's balance for it and can't be undone.${deletingUses ? ` Its ${plural(deletingUses, "request")} ${deletingUses === 1 ? "stays" : "stay"} in people's history.` : ""}`}
        primaryAction={{ label: "Delete", level: "danger", onClick: () => { if (deleting) remove(deleting); } }}
        secondaryAction={{ label: "Cancel", autoFocus: true }}
        tertiaryAction={deleting?.active ? { label: "Deactivate instead", onClick: () => { setDeleteOpen(false); setActive(deleting, false); } } : undefined} />
    </HrShell>
  );
}
