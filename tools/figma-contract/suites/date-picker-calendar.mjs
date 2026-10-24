// Figma .Primitives/Date-Picker/Calendar 478:30561 (docs/figma-contracts/datepicker-sidebar.json): the in-place calendar
// (`<DatePicker>` inline: no surface). Single and Dual: 224px panels Spacing/Gap/Small apart, each a Header (Back · month
// · Next; the Dual's first has only Back, its second only Next, the hidden button keeping its 32px wrapper) over the
// Calendar-Table, Gap/Small between. The case is the Figma's own grid (_date-picker-shared calendarProps: May 2026 for
// the Single, January + February 2027 for the Dual), Today and the selection on the Figma's cells.
// Select-Month-Year is `<DatePickerMonthYear>`: the Focused header over the month and year wheels (Heading/4 rows,
// 1 · 0.25 · 0.1 opacity), Spacing/Padding/Medium above and below.
import { calendarProps, child, monthYearMap, monthYearOf, panelMap } from "./_date-picker-shared.mjs";

const calendars = (vp) => vp.Type !== "Select-Month-Year";
export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "478:30561",
  kind: "dpCalendar",
  root: ".zen-date-picker__panels",
  cases: (vp, { spec }) => {
    if (!calendars(vp)) return { monthYearOnly: true, month: monthYearOf(child(child(spec, "Calendar"), "Calendar-Table")) };
    const props = calendarProps(spec.c.filter((node) => node.n === "Calendar").map((node) => child(node, "Calendar-Table")));
    return { ...props, calendar: vp.Type.toLowerCase(), selectionMode: props.range ? "range" : "single" };
  },
  // Type=Single draws the last Saturday and Sunday (30, 31) as State=Default; every other weekend day, the Dual's and the
  // Calendar-Table set's own (460:34664) are Weekend: code greys them (Content/Neutral/Light), as each light/dark value.
  figmaExceptions: [5, 6].flatMap((c) => ["rgba(0, 0, 0, 0.486)", "rgba(255, 255, 255, 0.596)"].map((code) => ({
    vp: { Type: "Single" }, layer: `Calendar#0 > Calendar-Table > Row#4 > Day#${c} > Container > Label`, prop: "color", code,
    note: "Figma slip: the Single's last weekend (30, 31) is State=Default; Calendar-Table 460:34664 and the Dual draw them Weekend",
  }))),
  map: [
    { figma: "", dom: ":root", check: ["size"], when: calendars },
    ...panelMap("", 0, calendars),
    ...panelMap("", 1, (vp) => vp.Type === "Dual"),
    ...monthYearMap("", ".zen-date-picker__month-year", (vp) => !calendars(vp)),
  ],
};
