// Figma .Primitives/Date-Picker 9923:2323 (docs/figma-contracts/datepicker-sidebar.json): the DatePickerSheet header
// for `header="selection"`. Option=1 (single): Caption over the picked date in Heading/3 and the edit Action
// (Button/Icon-Flat Small in a 20px wrapper, `onEdit`). Option=2 (range): the Heading/3 title beside Close, the picked
// range with Clear dates, and the Day-Header weekday row. Both pad by the sheet inset over an inside Border/Neutral/
// Subtle rule. The sheet opens full width in a 390 frame, Figma's width. Text-hugging widths (the range text, the date
// beside the edit action) are not asserted.
const iconFlat = "Button/Icon-Flat";
export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "9923:2323",
  kind: "dpSheet",
  root: ".zen-date-picker-sheet__header",
  cases: (vp) => (vp.Option === "1"
    ? { width: 390, height: 760, header: "selection", today: "2026-01-06", value: "2026-01-06", edit: true }
    : { width: 390, height: 760, header: "selection", selectionMode: "range", today: "2026-01-06", range: { start: "2026-01-06", end: null } }),
  map: [
    { figma: "", dom: ":root", check: ["size", "stroke"], strokeVia: "after", strokeSide: "bottom" },
    // Option=1
    { figma: "Container > Heading-Div > Content > Caps", dom: ".zen-date-picker-sheet__caption", check: ["size", "x", "y", "text"], when: (vp) => vp.Option === "1" },
    { figma: "Container > Heading-Div > Content > Heading-Text > Heading-Text > Heading", dom: ".zen-date-picker-sheet__date", check: ["h", "x", "y", "text"], when: (vp) => vp.Option === "1" },
    { figma: "Container > Heading-Div > Content > Heading-Text > Heading-Text > Action", dom: ".zen-date-picker-sheet__edit", check: ["size", "x", "y"], when: (vp) => vp.Option === "1" },
    { figma: `Container > Heading-Div > Content > Heading-Text > Heading-Text > Action > ${iconFlat}`, dom: ".zen-date-picker-sheet__edit .zen-button", check: ["size", "x", "y"], when: (vp) => vp.Option === "1" },
    { figma: `Container > Heading-Div > Content > Heading-Text > Heading-Text > Action > ${iconFlat} > Container > Leading-Icon`, dom: ".zen-date-picker-sheet__edit .zen-icon", check: ["size", "x", "y"], when: (vp) => vp.Option === "1" },
    { figma: `Container > Heading-Div > Content > Heading-Text > Heading-Text > Action > ${iconFlat} > Container > Leading-Icon > Vector`, dom: ".zen-date-picker-sheet__edit .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => vp.Option === "1" },
    // Option=2
    { figma: "Container > Heading-Div > Content > Heading-Text > Heading-Text > Heading", dom: ".zen-date-picker-sheet__title", check: ["size", "x", "y", "text"], when: (vp) => vp.Option === "2" },
    { figma: "Container > Close-Container", dom: ".zen-date-picker-sheet__close", check: ["size", "x", "y"], when: (vp) => vp.Option === "2" },
    { figma: `Container > Close-Container > Wrapper > ${iconFlat}`, dom: ".zen-date-picker-sheet__close .zen-button", check: ["size", "x", "y"], when: (vp) => vp.Option === "2" },
    { figma: `Container > Close-Container > Wrapper > ${iconFlat} > Container > Leading-Icon`, dom: ".zen-date-picker-sheet__close .zen-icon", check: ["size", "x", "y"], when: (vp) => vp.Option === "2" },
    { figma: "Caption-Container > Range", dom: ".zen-date-picker-sheet__range", check: ["h", "x", "y", "text"], when: (vp) => vp.Option === "2" },
    { figma: "Caption-Container > Clear", dom: ".zen-date-picker-sheet__clear", check: ["h", "y", "right", "text"], when: (vp) => vp.Option === "2" },
    { figma: "Day-Header", dom: ".zen-date-picker-sheet__weekdays", check: ["size", "x", "y"], when: (vp) => vp.Option === "2" },
    { figma: "Day-Header > M", dom: ".zen-date-picker-sheet__weekdays > span:first-child", check: ["size", "x", "y", "text"], when: (vp) => vp.Option === "2" },
  ],
};
