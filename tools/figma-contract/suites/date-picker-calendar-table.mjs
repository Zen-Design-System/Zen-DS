// Figma .Primitives/Date-Picker/Calendar-Table 460:34664 (docs/figma-contracts/datepicker-sidebar.json): the weekday row
// (Body/Small/Medium, Content/Neutral/Light, Spacing/Padding/2XSmall above and below) over 32px rows of Items,
// Spacing/Gap/3XSmall apart — the `.zen-date-picker__calendar` of an inline single `<DatePicker>`. Row=5 Rows is the
// Figma's own grid (31 days from a Friday: May 2026, _date-picker-shared calendarProps). Row=4 Rows draws 24 days from a
// Friday, which no month has: it renders the 4-row month, February 2027 (28 days from a Monday), whose first four cells
// are days where the template has Blanks (same transparent Container; their labels are not compared).
import { calendarProps, dayState, hiddenEventsOf, rowsOf, tableMap } from "./_date-picker-shared.mjs";

export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "460:34664",
  kind: "dpCalendar",
  root: ".zen-date-picker__calendar",
  cases: (vp, { spec }) => calendarProps([spec])
    ?? { month: "2027-02-01", today: "2027-04-15", cells: [rowsOf(spec).map((row) => row.map(dayState))], hiddenEvents: [hiddenEventsOf(spec)] },
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    ...tableMap("", ".zen-date-picker__calendar", {}).slice(1).map((entry) => ({ ...entry, figma: entry.figma.replace(/^ > /, "") })),
  ],
};
