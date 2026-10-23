// Figma .Primitives/Date-Picker/Header 458:34317 (docs/figma-contracts/datepicker-sidebar.json): a 32px row, Spacing/Gap/
// XSmall apart: Back and Next (Button/Icon-Main Small Tertiary, 20px chevrons: Element-Size/Popular/Base) around the
// Date-Container (month · year in Body/Extra/Bold, Gap/2XSmall, Corner-Radius/Small; Interactive · Static centre it,
// Display starts it and has no buttons). `<DatePickerHeader>` in a frame as wide as the set (306). The month and year
// are hugging texts: their x is compared only where it does not follow the text (Display, Focused's padding).
// State=Hover is pointer :hover (no prop): it renders at rest, its Date-Container fill and radius are not compared.
// State=Focused is the Select-Month-Year header (`<DatePickerMonthYear>`, 224 wide in code as in the calendar, so its
// widths and the year's end are compared in date-picker-calendar instead).
const nav = (k) => `.zen-date-picker__header > .zen-date-picker__nav:${k === 0 ? "first-child" : "last-child"}`;
const buttons = (vp) => vp.Type !== "Display" && vp.State !== "Focused";
const buttonMap = (k) => [
  { figma: `Button-Wrapper#${k}`, dom: nav(k), check: ["size", "x", "y"], when: buttons },
  { figma: `Button-Wrapper#${k} > Button/Icon-Main > Container`, dom: nav(k), check: ["fill", "radius", "fx"], fxIgnoreInset: true, when: buttons },
  { figma: `Button-Wrapper#${k} > Button/Icon-Main > Container`, dom: nav(k), check: ["stroke"], strokeVia: "shadow", when: buttons },
  { figma: `Button-Wrapper#${k} > Button/Icon-Main > Container > Leading-Icon`, dom: `${nav(k)} .zen-button__icon`, check: ["size", "x", "y"], when: buttons },
  { figma: `Button-Wrapper#${k} > Button/Icon-Main > Container > Leading-Icon > Vector`, dom: `${nav(k)} .zen-button__icon`, check: ["fill"], fillVia: "color", when: buttons },
];
export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "458:34317",
  kind: "dpHeader",
  root: ".zen-date-picker__header",
  cases: (vp, { spec }) => ({ width: spec.w, month: "2026-01-01", type: vp.Type.toLowerCase(), focused: vp.State === "Focused" }),
  map: [
    { figma: "", dom: ":root", check: ["size"], when: (vp) => vp.State !== "Focused" },
    { figma: "", dom: ":root", check: ["h"], when: (vp) => vp.State === "Focused" },
    ...buttonMap(0),
    ...buttonMap(1),
    { figma: "Date-Container", dom: ".zen-date-picker__month", check: ["size", "x", "y"], when: (vp) => vp.State !== "Focused" },
    { figma: "Date-Container", dom: ".zen-date-picker__month", check: ["h", "x", "y"], when: (vp) => vp.State === "Focused" },
    { figma: "Date-Container", dom: ".zen-date-picker__month", check: ["fill", "radius"], when: (vp) => vp.State !== "Hover" },
    { figma: "Date-Container > Month", dom: ".zen-date-picker__month > span:first-child", check: ["text", "h", "y"] },
    { figma: "Date-Container > Month", dom: ".zen-date-picker__month > span:first-child", check: ["x"], when: (vp) => vp.Type === "Display" || vp.State === "Focused" },
    { figma: "Date-Container > Year", dom: ".zen-date-picker__month > span:last-child", check: ["text", "h", "y"] },
  ],
};
