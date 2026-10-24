// Figma Date-Picker/Single-Calendar 895:31954 (docs/figma-contracts/datepicker-sidebar.json): the popover calendar
// (`<DatePicker onClose>`): Color/Background/Popover/Default, a 1px Color/Border/Popover/Subtle stroke, Corner-Radius/
// 3XLarge, Effect/Popover (shadow + background blur) and Spacing/Padding/Medium around the Container (Gap/Medium).
// State=Default is the Calendar Type=Single on the Figma's own grid (May 2026, _date-picker-shared calendarProps); its
// Divider, Time-Picker and Actions are off (Time-Picker / Actions booleans), as without `timePicker` / `showActions`.
// State=Select-Month-Year is reached as a user does: the case presses the month/year button once on mount; its Actions
// (Cancel · Submit) are on, as code always shows them there.
import { calendarProps, child, monthYearMap, monthYearOf, panelMap } from "./_date-picker-shared.mjs";

const calendar = "Container > .Primitives/Date-Picker/Calendar";
const days = (vp) => vp.State === "Default";
const monthYear = (vp) => vp.State === "Select-Month-Year";
const actions = ".zen-date-picker__view > .zen-date-picker__actions";
export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "895:31954",
  kind: "dpCalendar",
  root: ".zen-date-picker",
  cases: (vp, { spec }) => {
    const box = { width: spec.w, height: spec.h, popover: true };
    const calendarNode = child(child(child(spec, "Container"), ".Primitives/Date-Picker/Calendar"), "Calendar");
    if (monthYear(vp)) return { ...box, monthYear: true, month: monthYearOf(child(calendarNode, "Calendar-Table")) };
    const props = calendarProps([child(calendarNode, "Calendar-Table")]);
    return { ...box, ...props, selectionMode: "single" };
  },
  // As in the Calendar set: Type=Single's last Saturday and Sunday (30, 31) are State=Default in Figma; code greys them.
  figmaExceptions: [5, 6].flatMap((c) => ["rgba(0, 0, 0, 0.486)", "rgba(255, 255, 255, 0.596)"].map((code) => ({
    vp: { State: "Default" }, layer: `${calendar} > Calendar#0 > Calendar-Table > Row#4 > Day#${c} > Container > Label`, prop: "color", code,
    note: "Figma slip: the Single's last weekend (30, 31) is State=Default; Calendar-Table 460:34664 and the Dual draw them Weekend",
  }))),
  map: [
    { figma: "", dom: ":root", check: ["size", "fill", "radius", "fx"], fxBackdrop: true },
    { figma: "", dom: ":root", check: ["stroke"] },
    { figma: "Container", dom: ".zen-date-picker__view", check: ["size", "x", "y"] },
    { figma: calendar, dom: ".zen-date-picker__panels", check: ["size", "x", "y"], when: days },
    ...panelMap(calendar, 0, days),
    { figma: "Container > Divider", dom: ".zen-date-picker__view > .zen-divider", check: [], when: days },
    { figma: "Container > .Primitives/Date-Picker/Time-Picker", dom: ".zen-date-picker__time", check: [], when: days },
    { figma: "Container > Actions", dom: actions, check: [], when: days },
    { figma: calendar, dom: ".zen-date-picker__month-year", check: ["size", "x", "y"], when: monthYear },
    ...monthYearMap(calendar, ".zen-date-picker", monthYear),
    { figma: "Container > Actions", dom: actions, check: ["size", "x", "y"], when: monthYear },
    ...["Cancel", "Submit"].map((name, k) => ({ figma: `Container > Actions > ${name}`, dom: `${actions} > .zen-button:${k ? "last-child" : "first-child"}`, check: ["h", "y"], when: monthYear })),
    { figma: "Container > Actions > Submit", dom: `${actions} > .zen-button:last-child`, check: ["right"], when: monthYear },
  ],
};
