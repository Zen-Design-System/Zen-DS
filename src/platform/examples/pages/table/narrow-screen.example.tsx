import { useState, type RefObject } from "react";
import { ActionBar, AppShell, Avatar, Stack, Table, TableMedia, TableText, Text, TopNavigation, plural, useToast, type AvatarSize, type TableColumn } from "@zen-ds/react";
import { daysFromToday, formatDate, formatRange, initials, me, people, type Person } from "../../data";

/** People are Avatars: a photo when there is one, otherwise initials on the person's steady theme. Subtle beside other
 *  content; `lead` in a table's first column, the row's name, where initials are Solid (table/first-column-avatar-solid). */
function PersonAvatar({ person, size, lead = false }: { person: Person; size: AvatarSize; lead?: boolean }) {
  return person.photo
    ? <Avatar size={size} theme="photo" src={person.photo} alt="" />
    : <Avatar size={size} theme={person.theme} background={lead ? "solid" : "subtle"} alt="">{initials(person.name)}</Avatar>;
}

/* On a phone, fixed columns scroll sideways instead of wrapping. */
// The Design team Alex approves: the studio people from the shared data, plus the designers it does not list.
const designer = (id: string, name: string, role: string, theme: Person["theme"], location: Person["location"]): Person =>
  ({ id, name, role, team: "Design", theme, location, email: `${name.split(" ")[0].toLowerCase()}@dizai.studio` });
type Timesheet = { person: Person; hours: number[] };
const weekStart = daysFromToday(-9);
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const timesheets: Timesheet[] = [
  { person: people.alex, hours: [8, 8.5, 9, 8, 7.5] },
  { person: people.chi, hours: [8, 8, 8.5, 8, 6] },
  { person: people.ava, hours: [7.5, 8, 8, 8, 8] },
  { person: people.gia, hours: [8, 9, 8, 8.5, 8] },
  { person: people.emi, hours: [6, 6, 6, 6, 6] },
  { person: designer("quang", "Quang Tran", "Visual Designer", "blue", "Hanoi"), hours: [8, 8, 8, 8, 8] },
  { person: designer("thao", "Thao Nguyen", "Product Designer", "crimson", "Ho Chi Minh City"), hours: [8.5, 8, 9, 8, 7] },
  { person: designer("long", "Long Pham", "Content Designer", "brown", "Ho Chi Minh City"), hours: [8, 7.5, 8, 8, 8] },
  { person: designer("vy", "Vy Le", "Product Designer", "purple", "Hanoi"), hours: [8, 8, 8, 4, 0] },
  { person: designer("hieu", "Hieu Do", "Illustrator", "red", "Ho Chi Minh City"), hours: [7, 8, 8, 8, 8] },
  { person: designer("nam", "Nam Hoang", "Interaction Designer", "indigo", "Ho Chi Minh City"), hours: [9, 8.5, 8, 8, 8] },
  { person: designer("my", "My Dang", "Design Intern", "violet", "Ho Chi Minh City"), hours: [4, 4, 4, 4, 4] },
  { person: designer("khanh", "Khanh Vu", "UI Designer", "pink", "Hanoi"), hours: [8, 8, 7.5, 8, 8] },
  { person: designer("trang", "Trang Bui", "Design Researcher", "plum", "Ho Chi Minh City"), hours: [8, 8, 8, 8, 6.5] },
].sort((a, b) => a.person.name.localeCompare(b.person.name));
const weekTotal = (sheet: Timesheet) => sheet.hours.reduce((sum, hours) => sum + hours, 0);
const timesheetColumns: TableColumn<Timesheet>[] = [
  { id: "person", header: "Person", width: "176px", cell: (sheet) => <TableMedia bold={false} media={<PersonAvatar person={sheet.person} size="xs" lead />}>{sheet.person.name}</TableMedia> },
  ...weekDays.map((day, index): TableColumn<Timesheet> => ({ id: day, header: day, align: "right", width: "64px", cell: (sheet) => <TableText>{sheet.hours[index].toFixed(1)}</TableText> })),
  { id: "total", header: "Total", align: "right", width: "80px", cell: (sheet) => <TableText bold>{weekTotal(sheet).toFixed(1)}</TableText> },
];

// scrollRef: what scrolls the screen, so the bar title stays while the table runs under it. "window" in your app.
export default function TeamHours({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [approved, setApproved] = useState(false);
  const hours = timesheets.reduce((sum, sheet) => sum + weekTotal(sheet), 0);
  const approve = () => {
    setApproved(true);
    toast({ title: `${plural(timesheets.length, "timesheet")} approved`, action: { label: "Undo", onClick: () => setApproved(false) } });
  };
  return (
    // A task screen pushed from Approvals: the compact bar with Back, the week's one action in the Action bar (Figma
    // Bottom=Actions), no bottom bar.
    <AppShell
      topNavigation={<TopNavigation type="compact-alt" title="Team hours" subtitle={`Design team · ${formatRange(weekStart, daysFromToday(-5))}`} scrollRef={scrollRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Approvals", children: "This example shows the one screen." }) }} />}
      actionBar={<ActionBar
        summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{approved ? "Approved just now" : `${plural(timesheets.length, "timesheet")} · ${plural(hours, "hour")}`}</Text>}
        primaryAction={approved ? undefined : { label: "Approve timesheets", onClick: approve }}
        secondaryAction={approved ? { label: "Reopen timesheets", onClick: () => setApproved(false) } : undefined} />}
    >
      {/* The table lies on the screen inside the margin the Body pads, no card around it. */}
      <Stack gap="xs">
        <Text tone="base">{approved ? `Approved by ${me.name}` : "Waiting for your approval"}</Text>
        <Table aria-label={`Design team hours, week of ${formatDate(weekStart)}`} columns={timesheetColumns} rows={timesheets} getRowId={(sheet) => sheet.person.id} />
      </Stack>
    </AppShell>
  );
}
