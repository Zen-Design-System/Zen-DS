// Harness case kinds for the date-picker-sidebar suites (tools/figma-contract/suites). cases.tsx merges every group's kinds.
// Dates travel as JSON, so they are "YYYY-MM-DD" strings read as local days. The suites pick the months whose grid is the
// Figma's own (first weekday and length), so every day cell of a Figma calendar has a code day in the same place.
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { DatePicker, DatePickerAction, DatePickerHeader, DatePickerItem, DatePickerMonthYear, DatePickerSheet, DatePickerTimePicker } from "../../../src/components/DatePicker";
import { Sidebar, SidebarMenuItem } from "../../../src/components/Sidebar";
import { IconButton } from "../../../src/components/Button";
import { Icon } from "../../../src/components/Icon";
import { Search } from "../../../src/components/Search";
import { Avatar } from "../../../src/components/Avatar";

type Props = Record<string, any>;

/** "2027-01-04" → that local day. */
const day = (value?: string | null) => {
  if (!value) return value === null ? null : undefined;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const rangeOf = (range?: { start: string; end: string | null } | null) => (range ? { start: day(range.start) as Date, end: day(range.end) ?? null } : range);

/** Presses the month/year button once on mount (as a user does) to show Select-Month-Year: DatePicker has no prop for it. */
function OpenMonthYear({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { ref.current?.querySelector<HTMLButtonElement>("button.zen-date-picker__month")?.click(); }, []);
  return <div ref={ref} style={{ display: "contents" }}>{children}</div>;
}

/** Opens the first closed group of a Sidebar on mount, as a press on its row does (a Child row shows inside it). */
function OpenGroup({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { ref.current?.querySelector<HTMLButtonElement>('.zen-sidebar__item[aria-expanded="false"]')?.click(); }, []);
  return <div ref={ref} style={{ display: "contents" }}>{children}</div>;
}

export const cases: Record<string, (props: Props) => ReactNode> = {
  // `.Primitives/Date-Picker/Item` and `.Primitives/Mobile-Date-Picker/Item`; a mobile day fills its column (`width`).
  dpItem: ({ width, ...p }) => (width ? <div style={{ width }}><DatePickerItem {...p} /></div> : <DatePickerItem {...p} />),
  // `.Primitives/Date-Picker/Header` in a frame as wide as the set's; `focused` is the Select-Month-Year header.
  dpHeader: ({ width, month, focused, ...p }) => (
    <div style={{ width }}>{focused ? <DatePickerMonthYear month={day(month) as Date} /> : <DatePickerHeader month={day(month) as Date} {...p} />}</div>
  ),
  dpAction: ({ width, ...p }) => <div style={{ width }}><DatePickerAction {...p} /></div>,
  dpTime: ({ width, ...p }) => <div style={{ width }}><DatePickerTimePicker {...p} onValueChange={() => {}} /></div>,
  // The calendar: inline (no surface) by default; `popover` gives it the Single-Calendar surface (an onClose, no trigger),
  // in a box of its size so the absolutely placed surface keeps its own room. `monthYear` opens Select-Month-Year;
  // `monthYearOnly` is that view alone (`<DatePickerMonthYear>`). `events` (ISO days) are the dots Figma shows; `cells` /
  // `hiddenEvents` / `shownEvents` (the Figma cells' States and dots) are for the suite's map only. `density` /
  // `typography`: the token modes of a Figma frame drawn in other modes than the page's (Date-Picker/Mobile:
  // Comfortable, Mobile), set on the case's frame as a phone app's ZenProvider sets them.
  dpCalendar: ({ width, height, density, typography, popover, monthYear, monthYearOnly, month, today, value, range, events, cells: _cells, hiddenEvents: _hiddenEvents, shownEvents: _shownEvents, ...p }) => {
    if (monthYearOnly) return <DatePickerMonthYear month={day(month) as Date} />;
    const picker = (
      <DatePicker {...p} month={day(month)} today={day(today)} value={day(value)} range={rangeOf(range)}
        events={(events as { date: string; count: number }[] | undefined)?.map((event) => ({ date: day(event.date) as Date, count: event.count }))}
        onClose={popover ? () => {} : undefined} />
    );
    const body = monthYear ? <OpenMonthYear>{picker}</OpenMonthYear> : picker;
    return <div data-density={density} data-typography={typography} style={{ position: "relative", width, height }}>{body}</div>;
  },
  // DatePickerSheet (range: the Footer-Actions footer) open in a device frame (`data-zen-overlay-root`, as a phone
  // preview), so the sheet is contained in the case; `width` is the frame's. `edit` gives `header="selection"` its
  // onEdit (the Figma Action).
  dpSheet: ({ width, height, range, today, value, edit, ...p }) => (
    <div data-zen-overlay-root="" style={{ position: "relative", width, height, overflow: "hidden" }}>
      <DatePickerSheet open onOpenChange={() => {}} {...p} today={day(today) as Date} value={day(value) ?? null} range={rangeOf(range)} monthCount={1}
        onEdit={edit ? () => {} : undefined} summary={<span style={{ display: "block", height: 40 }} />} />
    </div>
  ),
  // `Primitives/Side-Bar/Menu-Item/Master`: one row in a Sidebar of that density (the row reads its padding and gap from
  // it); a Child row is the only child of a group the case opens.
  sbMenuItem: ({ density, child, item }) => {
    const items = child ? [{ id: "parent", label: "Parent", icon: "icon-home-03-line", children: [item] }] : [item];
    return <OpenGroup><Sidebar density={density} sections={[{ items }]} /></OpenGroup>;
  },
  // `Primitives/Sidebar/Menu-Item/Section-Title`: a section's title in a Sidebar of that density; `action` adds the
  // documented section action (Button/Icon-Flat Small, icon-plus-line) in its 16px slot.
  sbSection: ({ density, label, action }) => (
    <Sidebar density={density} sections={[{ label, items: [], action: action ? <IconButton appearance="flat" level="primary" size="sm" aria-label="Add" tooltip={false} icon={<Icon name="icon-plus-line" decorative />} /> : undefined }]} />
  ),
  // A whole Sidebar (Side-Bar/Master/*) as tall as the Figma frame: `body` rows in one section, `footer` rows as
  // SidebarMenuItems, the logo slots drawn at the Figma artwork's size (`logo`: [w, h] of LOGO's Union, `mark`: logo-Zen).
  sbSidebar: ({ height, body = [], footer = [], logo, mark, productName, search, ...p }) => (
    <div style={{ display: "flex", height }}>
      <Sidebar {...p} onCollapsedChange={() => {}}
        logo={logo ? <svg viewBox={`0 0 ${logo[0]} ${logo[1]}`} aria-hidden="true"><rect width={logo[0]} height={logo[1]} fill="currentColor" /></svg> : undefined}
        logoCollapsed={mark ? <svg width={mark[0]} height={mark[1]} viewBox={`0 0 ${mark[0]} ${mark[1]}`} aria-hidden="true"><rect width={mark[0]} height={mark[1]} fill="currentColor" /></svg> : undefined}
        productName={productName}
        search={search ? <Search size="sm" placeholder={search} /> : undefined}
        sections={[{ items: body }]}
        footer={footer.length ? <>{footer.map((item: Props) => <SidebarMenuItem key={item.id} {...item} />)}</> : undefined} />
    </div>
  ),
  // Side-Bar/Master/Workspace: the workspace rail (the brand mark box, Avatar/Single Square Medium tiles, the add action)
  // beside the child panel (the current workspace's name, its settings action, `body` / `footer` rows).
  sbWorkspace: ({ height, mark, workspaces = [], body = [], footer = [], ...p }) => (
    <div style={{ display: "flex", height }}>
      <Sidebar {...p} variant="workspace"
        workspaceBrand={mark ? <span style={{ display: "inline-flex", width: 28, height: 28, alignItems: "center", justifyContent: "center" }}><svg width={mark[0]} height={mark[1]} viewBox={`0 0 ${mark[0]} ${mark[1]}`} aria-hidden="true"><rect width={mark[0]} height={mark[1]} fill="currentColor" /></svg></span> : undefined}
        workspaceItems={workspaces.map(({ initials, theme, ...item }: Props) => ({ ...item, icon: <Avatar shape="square" size="md" theme={theme} background="solid">{initials}</Avatar> }))}
        workspaceAction={<IconButton appearance="main" level="tertiary" size="md" aria-label="Add workspace" tooltip={false} icon={<Icon name="icon-plus-line" decorative />} />}
        headerAction={<IconButton appearance="flat" level="primary" size="sm" aria-label="Settings" tooltip={false} icon={<Icon name="icon-settings-01-line" decorative />} />}
        sections={[{ items: body }]}
        footer={footer.length ? <>{footer.map((item: Props) => <SidebarMenuItem key={item.id} {...item} />)}</> : undefined} />
    </div>
  ),
};
