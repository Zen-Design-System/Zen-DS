// Figma Date-Picker/Mobile 9923:3576 (docs/figma-contracts/datepicker-sidebar.json): the phone date picker, a Bottom
// Sheet around the mobile calendar (`<DatePicker device="mobile">`, what DatePickerSheet renders). The sheet's own chrome
// (Bottom-Sheet: indicator, Header-Bar, Footer actions) is BottomSheet's, so the suite compares the sheet Body's Contents:
// the calendar, measured from that frame (figmaRoot). The frame is drawn in the phone modes (Density=Comfortable: 40px
// Back / Next with 24px chevrons; Typography=Mobile: Body/Base 16/24), set on the case's frame as a phone app does.
// Variant=Single: one month, a Heading/Subheading month · year at the start, Back · Next at the end, Gap/XLarge over the
// table of 50px square days (the Figma's own grid: May 2026). Multiple-Default · Multiple-Selected: `calendar="stacked"`,
// months Gap/Medium apart, Display headers Gap/XSmall over tables whose weekday row is hidden (code's one sticky weekday
// row sits above the list, in the sheet header in Figma). Figma's second month is a copy of the first (same grid, Today
// and selection, labelled February): no month follows a 31-day month from a Friday with the same grid, so the second
// panel compares its header and table box only.
import { calendarProps, child, tableMap } from "./_date-picker-shared.mjs";

const FR = "Bottom-Sheet > Container > Body > Contents";
const calendarOf = (k) => `${FR} > Container#${k} > .Primitives/Date-Picker/Calendar > Calendar`;
const panel = (k) => `.zen-date-picker__panel:nth-child(${k + 1})`;
const single = (vp) => vp.Variant === "Single";
const multiple = (vp) => !single(vp);
const nav = (n) => `${panel(0)} > .zen-date-picker__header > .zen-date-picker__nav:nth-child(${n + 2})`;
const headerMap = (k, when) => {
  const C = calendarOf(k);
  const header = `${panel(k)} > .zen-date-picker__header`;
  return [
    { figma: C, dom: panel(k), check: ["size", "x", "y"], when },
    { figma: `${C} > Header`, dom: header, check: ["size", "x", "y"], when },
    { figma: `${C} > Header > Date-Container`, dom: `${header} > .zen-date-picker__month`, check: ["size", "x", "y", "fill", "radius"], when },
    { figma: `${C} > Header > Date-Container > Month`, dom: `${header} .zen-date-picker__month > span:first-child`, check: ["text", "h", "x", "y"], when },
    { figma: `${C} > Header > Date-Container > Year`, dom: `${header} .zen-date-picker__month > span:last-child`, check: ["text", "h", "y"], when },
  ];
};
const buttonMap = (n) => {
  const B = `${calendarOf(0)} > Header > Button-Wrapper#${n} > Button/Icon-Main`;
  return [
    { figma: B, dom: nav(n), check: ["size", "x", "y"], when: single },
    { figma: `${B} > Container`, dom: nav(n), check: ["fill", "radius", "fx"], fxIgnoreInset: true, when: single },
    { figma: `${B} > Container`, dom: nav(n), check: ["stroke"], strokeVia: "shadow", when: single },
    { figma: `${B} > Container > Leading-Icon`, dom: `${nav(n)} .zen-button__icon`, check: ["size", "x", "y"], when: single },
  ];
};
const fromFrame = (entry) => ({ ...entry, figmaRoot: FR, root: ".zen-date-picker__panels" });
export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "9923:3576",
  kind: "dpCalendar",
  root: ".zen-date-picker__panels",
  cases: (vp, { spec }) => {
    const contents = (spec.c[0].c[0].c.find((node) => node.n === "Body")).c.find((node) => node.n === "Contents");
    const tables = contents.c.filter((node) => node.n === "Container").map((node) => child(child(child(node, ".Primitives/Date-Picker/Calendar"), "Calendar"), "Calendar-Table"));
    const props = calendarProps([tables[0]]);
    const frame = { width: contents.w, density: "comfortable", typography: "mobile", device: "mobile" };
    return { ...frame, ...props, calendar: single(vp) ? "single" : "stacked", monthCount: tables.length, selectionMode: props.range ? "range" : "single" };
  },
  // Figma slips (ask the designer): the last Saturday and Sunday (30, 31) are State=Default in every table here, and
  // Multiple-Default's first table also draws Saturday 9 · Sunday 10 Default; every other weekend day is Weekend, as in
  // Calendar-Table 460:34664: code greys them all (Content/Neutral/Light), as each light/dark value.
  figmaExceptions: ["Single", "Multiple-Default", "Multiple-Selected"].flatMap((Variant) => [[4, 5], [4, 6], ...(Variant === "Multiple-Default" ? [[1, 5], [1, 6]] : [])]
    .flatMap(([r, c]) => ["rgba(0, 0, 0, 0.486)", "rgba(255, 255, 255, 0.596)"].map((code) => ({
      vp: { Variant }, layer: `${calendarOf(0)} > Calendar-Table > Row#${r} > Day#${c} > Container > Label`, prop: "color", code,
      note: "Figma slip: a Saturday / Sunday drawn State=Default; Calendar-Table 460:34664 draws them Weekend",
    })))),
  map: [
    { figma: `${FR} > Container#0`, dom: panel(0), check: ["size", "x", "y"] },
    ...headerMap(0, () => true),
    ...buttonMap(0),
    ...buttonMap(1),
    ...tableMap(`${calendarOf(0)} > Calendar-Table`, `${panel(0)} > .zen-date-picker__calendar`, { when: single }),
    ...tableMap(`${calendarOf(0)} > Calendar-Table`, `${panel(0)} > .zen-date-picker__calendar`, { when: multiple, weekdays: false }),
    { figma: `${FR} > Container#1`, dom: panel(1), check: ["size", "x", "y"], when: multiple },
    ...headerMap(1, multiple),
    { figma: `${calendarOf(1)} > Calendar-Table`, dom: `${panel(1)} > .zen-date-picker__calendar`, check: ["size", "x", "y"], when: multiple },
  ].map(fromFrame),
};
