/**
 * Template: HR · Time off › Configurations › Public holidays. The public holidays of each country people work in:
 * - Tabs switch the calendar (Vietnam, Singapore, United States, United Kingdom, Germany, each with its Flag); the year
 *   chip beside the title switches between this year and the next one, which HR fills in before it starts.
 * - Three tiles: the next holiday (also marked Next in the table), the working days off in the year and the people who
 *   follow the calendar.
 * - The table lists each holiday's date and weekday, name, working days off and whether the office closes. A row opens
 *   the holiday to edit; its ⋯ menu also keeps the office open (or closes it again) and removes it; changes offer Undo
 *   in a Toast. A phone lists the holidays instead: a row opens the same actions in a Bottom Sheet, and the year chip
 *   opens its choices in one too.
 * - Add holiday opens a validated ModalForm whose dates are typed or picked in the calendar; the holiday lands in its
 *   calendar and year.
 *
 * Copy it with ./HrShell, ./data and ./assets into your app and replace the sample data. Render it inside your app's
 * <ZenProvider>. Uses only @zen/design-system components, no custom CSS.
 */
import { useState } from "react";
import {
  Badge,
  BottomSheet,
  Button,
  Checkbox,
  Chip,
  Container,
  DateField,
  EmptyState,
  Flag,
  Grid,
  Heading,
  Icon,
  IconButton,
  InputField,
  List,
  ListItem,
  Menu,
  MetricCard,
  ModalForm,
  PageHeader,
  SelectField,
  Stack,
  Table,
  TableActions,
  TableBadges,
  TableText,
  TabPanel,
  Tabs,
  Text,
  VisuallyHidden,
  plural,
  useFormState,
  useToast,
  useZen,
  type DockIconTheme,
  type IconName,
  type MenuEntry,
} from "@zen/design-system";
import { HrShell, hrModules, type HrNavigate } from "./HrShell";
import {
  daysFromToday,
  formatDate,
  formatDays,
  holidayCalendars,
  holidayCountries,
  holidayDaysOff,
  publicHolidays,
  toDate,
  toIsoDay,
  today,
  type HolidayCountry,
  type PublicHoliday,
} from "./data";

/* ── Data: the five calendars and their holidays; the office stays open on the ones the studio works through ──── */
type Holiday = PublicHoliday & { officeOpen: boolean };
/** Most US private employers keep Columbus Day and Veterans Day as working days. */
const workedThrough = ["united-states-2026-10-12", "united-states-2026-11-11"];
const seed: Holiday[] = publicHolidays.map((item) => ({ ...item, officeOpen: workedThrough.includes(item.id) }));
const thisYear = toDate(today).getFullYear();
const years = [thisYear, thisYear + 1];
const slug = (country: string) => country.toLowerCase().replace(/\s+/g, "-");
const countryOf = (id: string) => holidayCountries.find((country) => slug(country) === id) ?? holidayCountries[0];

/* ── Helpers: the table's words for a holiday ─────────────────────────────────────────────────────────────────── */
const weekdayOf = (day: string) => toDate(day).toLocaleDateString("en-US", { weekday: "long" });
const shortDay = (day: string) => formatDate(day, { year: false });
const dateOf = (item: Holiday) => (item.start === item.end ? shortDay(item.start) : `${shortDay(item.start)} – ${shortDay(item.end)}`);
const weekdaysOf = (item: Holiday) => (item.start === item.end ? weekdayOf(item.start) : `${weekdayOf(item.start)} – ${weekdayOf(item.end)}`);
/** Working days off: none when the office stays open; a weekend holiday counts its day in lieu. */
const daysOffOf = (item: Holiday) => (item.officeOpen ? 0 : holidayDaysOff(item).length);
/** The last day a holiday keeps people off (its day in lieu can come after it). */
const lastDayOf = (item: Holiday) => (item.inLieu && item.inLieu > item.end ? item.inLieu : item.end);
const byStart = (a: Holiday, b: Holiday) => a.start.localeCompare(b.start);
const whenOf = (day: string) => { const gap = daysFromToday(day); return gap <= 0 ? "Today" : gap === 1 ? "Tomorrow" : `In ${gap} days`; };

/* ── Form helpers: DateField speaks MM/DD/YYYY, the data ISO days ─────────────────────────────────────────────── */
type HolidayValues = { name: string; country: string; start: string; end: string; closed: boolean };
const pad = (value: number) => String(value).padStart(2, "0");
const toFieldDate = (day: string) => { const date = toDate(day); return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`; };
const fromFieldDate = (text: string) => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  return date.getMonth() === Number(match[1]) - 1 ? toIsoDay(date) : null;
};
const blankHoliday = (country: HolidayCountry): HolidayValues => ({ name: "", country, start: "", end: "", closed: true });
const countryOptions = holidayCountries.map((country) => ({ label: country, value: country }));

export function HrPublicHolidayTemplate() {
  const { toast, dismiss } = useToast();
  const phone = useZen()?.breakpoint === "mobile";
  const [holidays, setHolidays] = useState(seed);
  const [country, setCountry] = useState<HolidayCountry>(holidayCountries[0]);
  const [year, setYear] = useState(thisYear);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Phone: the year chip and a holiday row open Bottom Sheets (popovers and the ⋯ column are for pointers).
  const [yearSheet, setYearSheet] = useState(false);
  const [acting, setActing] = useState<Holiday | null>(null);

  const calendar = holidayCalendars.find((item) => item.country === country) ?? holidayCalendars[0];
  const rows = holidays.filter((item) => item.country === country && toDate(item.start).getFullYear() === year).sort(byStart);
  // The next holiday the office observes, from today on (it may sit in next year's list).
  const next = holidays.filter((item) => item.country === country && !item.officeOpen && lastDayOf(item) >= today).sort(byStart)[0];
  const observed = rows.filter((item) => !item.officeOpen);
  const tiles: Array<{ id: string; label: string; value: string; trend?: string; icon: IconName; theme: DockIconTheme }> = [
    { id: "next", label: "Next holiday", value: next ? formatDate(next.start, { year: toDate(next.start).getFullYear() !== thisYear }) : "None", trend: next ? whenOf(next.start) : undefined, icon: "icon-calendar-heart-solid", theme: "pink" },
    { id: "days", label: `Days off in ${year}`, value: formatDays(observed.reduce((sum, item) => sum + daysOffOf(item), 0)), trend: plural(observed.length, "holiday"), icon: "icon-sun-solid", theme: "yellow" },
    { id: "people", label: "People", value: String(calendar.headcount), trend: calendar.region, icon: "icon-users-solid", theme: "blue" },
  ];

  const navigate: HrNavigate = (target) => {
    if (target.module === "home") { toast({ title: "Home isn't part of this demo" }); return; }
    const { title, sections } = hrModules[target.module];
    const pages = sections.flatMap((section) => section.items.flatMap((item) => [item, ...(item.children ?? [])]));
    const page = pages.find((item) => item.id === (target.page ?? pages[0]?.id));
    // This page, or the Configurations group, which only expands in the Sidebar.
    if (target.module === "time-off" && (target.page === "public-holiday" || page?.children?.length)) return;
    toast({ title: `${page?.label ?? title} isn't part of this demo` });
  };

  /* ── Row actions: each change shows at once and offers Undo (the Toast closes once it's used) ── */
  const setOfficeOpen = (item: Holiday, officeOpen: boolean) => {
    const apply = (open: boolean) => setHolidays((list) => list.map((entry) => (entry.id === item.id ? { ...entry, officeOpen: open } : entry)));
    apply(officeOpen);
    const id = toast({ title: "Holiday updated", children: `The office ${officeOpen ? "stays open" : "closes"} on ${item.name}`, action: { label: "Undo", onClick: () => { apply(item.officeOpen); dismiss(id); } } });
  };
  const remove = (item: Holiday) => {
    setHolidays((list) => list.filter((entry) => entry.id !== item.id));
    const id = toast({ title: "Holiday removed", children: item.name, action: { label: "Undo", onClick: () => { setHolidays((list) => [...list, item]); dismiss(id); } } });
  };

  /* ── Add or edit a holiday ── */
  const form = useFormState({
    initialValues: blankHoliday(holidayCountries[0]),
    validate: (values) => {
      const start = fromFieldDate(values.start);
      const end = values.end.trim() ? fromFieldDate(values.end) : start;
      // Two holidays of one calendar can't share a day.
      const clash = start && end ? holidays.find((item) => item.id !== editingId && item.country === values.country && item.start <= end && item.end >= start) : undefined;
      return {
        ...(values.name.trim() ? {} : { name: "Enter the holiday's name, like Mid-Autumn Festival" }),
        ...(!start ? { start: "Enter the date as MM/DD/YYYY" }
          : !years.includes(toDate(start).getFullYear()) ? { start: `Pick a day in ${years[0]} or ${years[1]}` }
          : clash ? { start: `${clash.name} is already on ${shortDay(clash.start)}` } : {}),
        ...(values.end.trim() && !end ? { end: "Enter the date as MM/DD/YYYY" } : start && end && end < start ? { end: "Pick the first day or a later one" } : {}),
      };
    },
    onSubmit: (values) => {
      const start = fromFieldDate(values.start) ?? today;
      const end = (values.end.trim() && fromFieldDate(values.end)) || start;
      const target = values.country as HolidayCountry;
      const previous = holidays.find((item) => item.id === editingId);
      // A day in lieu only belongs to the dates it was set for.
      const sameDays = previous && previous.country === target && previous.start === start && previous.end === end;
      const holiday: Holiday = { id: previous?.id ?? `${slug(target)}-${start}-${Date.now()}`, country: target, name: values.name.trim(), start, end, inLieu: sameDays ? previous.inLieu : undefined, officeOpen: !values.closed };
      setHolidays((list) => (previous ? list.map((item) => (item.id === previous.id ? holiday : item)) : [...list, holiday]));
      setCountry(target);
      setYear(toDate(start).getFullYear());
      setFormOpen(false);
      toast({ title: previous ? "Holiday updated" : "Holiday added", children: `${holiday.name} · ${formatDate(start, { weekday: true })}` });
    },
  });
  const openForm = (item?: Holiday) => {
    setEditingId(item?.id ?? null);
    form.reset(item
      ? { name: item.name, country: item.country, start: toFieldDate(item.start), end: item.end === item.start ? "" : toFieldDate(item.end), closed: !item.officeOpen }
      : blankHoliday(country));
    setFormOpen(true);
  };

  /** A holiday's actions: its ⋯ Menu on desktop, its action Bottom Sheet on a phone. */
  const actionsOf = (item: Holiday): Array<{ id: string; label: string; icon: IconName; danger?: boolean; run: () => void }> => [
    { id: "edit", label: "Edit holiday", icon: "icon-edit-02-line", run: () => openForm(item) },
    // A weekend holiday without a day in lieu closes nothing, so there is no office to keep open.
    ...(holidayDaysOff(item).length ? [{ id: "office", label: item.officeOpen ? "Close office" : "Keep office open", icon: "icon-building-02-line" as IconName, run: () => setOfficeOpen(item, !item.officeOpen) }] : []),
    { id: "remove", label: "Remove holiday", icon: "icon-trash-line", danger: true, run: () => remove(item) },
  ];
  const rowActions = (item: Holiday): MenuEntry[] => actionsOf(item).flatMap(({ id, label, icon, danger, run }): MenuEntry[] => {
    const entry: MenuEntry = { id, label, icon, danger, onSelect: run };
    return danger ? [{ type: "separator" }, entry] : [entry];
  });
  const officeBadge = (item: Holiday, size?: "sm") => (item.officeOpen
    ? <Badge size={size} theme="neutral" background="subtle">Office open</Badge>
    : <Badge size={size} theme="blue" background="subtle">Office closed</Badge>);
  const empty = (
    <EmptyState title={`No holidays in ${year} yet`} headingLevel={3} icon="icon-calendar-line"
      primaryAction={{ label: "Add holiday", onClick: () => openForm() }}>
      Add the days people in {country} take off.
    </EmptyState>
  );

  return (
    <HrShell module="time-off" page="public-holiday" onNavigate={navigate}>
      <Container maxWidth="full">
        <Stack gap="xl" paddingY="sm">
          <PageHeader title="Public holidays" description="Everyone gets their country's public holidays, and leave requests skip them."
            meta={phone ? (
              <Chip variant="advanced" size="md" dropdown aria-label={`Year, ${year}`} aria-haspopup="dialog" aria-expanded={yearSheet} onClick={() => setYearSheet(true)}>
                {String(year)}
              </Chip>
            ) : (
              <Chip variant="advanced" size="md" dropdown aria-label={`Year, ${year}`} popoverLabel="Year"
                popoverItems={years.map((option) => ({ id: String(option), label: String(option), selected: option === year }))}
                onPopoverSelect={(item) => setYear(Number(item.id))}>
                {String(year)}
              </Chip>
            )}
            actions={<Button level="primary" startIcon="icon-plus-line" onClick={() => openForm()}>Add holiday</Button>}
            tabs={(
              <Tabs aria-label="Holiday calendars" idPrefix="hr-holidays" value={slug(country)} onValueChange={(id) => setCountry(countryOf(id))}
                items={holidayCalendars.map((item) => ({ id: slug(item.country), label: item.country, icon: <Flag name={item.country} size="sm" /> }))} />
            )} />

          <TabPanel idPrefix="hr-holidays" id={slug(country)}>
            <Stack gap="xl">
              <Grid columns="repeat(auto-fit, minmax(min(100%, 220px), 1fr))" gap="md">
                {tiles.map((tile) => (
                  <MetricCard key={tile.id} variant="title-highlight" size={phone ? "sm" : "xl"} label={tile.label} value={tile.value}
                    trend={tile.trend ? { direction: "normal", label: tile.trend } : undefined} icon={tile.icon} iconTheme={tile.theme} iconSize="md" />
                ))}
              </Grid>

              <Stack gap="md">
                <Heading level={2} id="hr-holidays-title">Holidays in {year}</Heading>
                {phone ? (
                  // Phone: the same holidays as a List (date in the caption, days off over the office badge).
                  rows.length ? (
                    <List aria-labelledby="hr-holidays-title">
                      {rows.map((row) => (
                        <ListItem key={row.id} title={row.name} selected={acting?.id === row.id} onClick={() => setActing(row)}
                          caption={[`${dateOf(row)} · ${weekdaysOf(row)}`, row.inLieu && !row.officeOpen ? `Day in lieu on ${formatDate(row.inLieu, { year: false, weekday: true })}` : ""].filter(Boolean).join(" · ")}
                          trailing={(
                            <Stack gap="2xs" align="end">
                              <Text as="span" textStyle="Body/Base/Bold">{formatDays(daysOffOf(row))}</Text>
                              {officeBadge(row, "sm")}
                            </Stack>
                          )} />
                      ))}
                    </List>
                  ) : empty
                ) : (
                  <Table aria-labelledby="hr-holidays-title" rows={rows} getRowId={(row) => row.id} onRowClick={(row) => openForm(row)} empty={empty}
                    columns={[
                      { id: "date", header: "Date", width: "168px", cell: (row) => <TableText caption={weekdaysOf(row)}>{dateOf(row)}</TableText> },
                      { id: "name", header: "Holiday", cell: (row) => <TableText bold caption={row.inLieu && !row.officeOpen ? `Day in lieu on ${formatDate(row.inLieu, { year: false, weekday: true })}` : undefined}>{row.name}</TableText> },
                      { id: "days", header: "Days off", width: "112px", align: "right", cell: (row) => <TableText>{formatDays(daysOffOf(row))}</TableText> },
                      // The office badge leads, so it lines up in every row; the next holiday adds Next after it.
                      { id: "status", header: "Status", width: "240px", cell: (row) => (
                        <TableBadges>
                          {officeBadge(row)}
                          {row.id === next?.id ? <Badge theme="accent" background="subtle">Next</Badge> : null}
                        </TableBadges>
                      ) },
                      { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, width: "72px", align: "right", cell: (row) => (
                        <TableActions>
                          <Menu align="end" items={rowActions(row)}
                            trigger={<IconButton appearance="flat" level="primary" icon="icon-dots-horizontal-line" aria-label={`Actions for ${row.name}`} />} />
                        </TableActions>
                      ) },
                    ]} />
                )}
              </Stack>
            </Stack>
          </TabPanel>
        </Stack>
      </Container>

      <ModalForm open={formOpen} onOpenChange={setFormOpen} title={editingId ? "Edit holiday" : "Add holiday"}
        onSubmit={form.handleSubmit} primaryAction={{ label: editingId ? "Save changes" : "Add holiday" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Name" placeholder="Mid-Autumn Festival" autoComplete="off" data-autofocus="" {...form.field("name")} />
        <SelectField label="Country" options={countryOptions} {...form.selectField("country")} />
        <Grid columns={{ mobile: 1, desktop: 2 }} gap="md" align="start">
          <DateField label="First day" {...form.dateField("start")} />
          <DateField label="Last day" labelOptional helpText="For holidays longer than a day" {...form.dateField("end")} />
        </Grid>
        <Checkbox label="Close the office" caption="People get the day off without using leave" {...form.checkboxField("closed")} />
      </ModalForm>

      {/* Phone: one year to pick (the sheet closes on the pick), and a holiday's actions. */}
      <BottomSheet open={yearSheet} onOpenChange={setYearSheet} title="Year">
        <List aria-label="Year">
          {years.map((option) => (
            <ListItem key={option} title={String(option)} selected={option === year} trailing={option === year ? <Icon name="icon-check-line" size="base" decorative /> : undefined}
              onClick={() => { setYear(option); setYearSheet(false); }} />
          ))}
        </List>
      </BottomSheet>
      <BottomSheet type="action" open={acting !== null} onOpenChange={(open) => { if (!open) setActing(null); }} title={acting?.name ?? "Holiday"}
        items={acting ? actionsOf(acting).map(({ id, label, icon, danger }) => ({ id, label, icon, destructive: danger })) : []}
        onSelect={(item) => { const action = acting ? actionsOf(acting).find((entry) => entry.id === item.id) : undefined; setActing(null); action?.run(); }} />
    </HrShell>
  );
}
