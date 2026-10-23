// Figma .Primitives/Date-Picker/Footer-Actions 9923:2791 (docs/figma-contracts/datepicker-sidebar.json): the range
// DatePickerSheet's footer: the app's summary (Content: a price over a rating line in the Figma sample) FILLs the row
// and a Large Primary "OK", 140px, sits Spacing/Gap/Small after it. The sheet renders open in a device frame wide enough
// for a 390px footer (430: the sheet's Margin-Compact on both sides). The summary is the app's content (`summary`), so
// only its box is compared. State=Selected Date differs only in that content (and OK enabled: a complete range).
export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "9923:2791",
  kind: "dpSheet",
  root: ".zen-date-picker-sheet__footer",
  cases: (vp) => ({
    width: 430, height: 760, selectionMode: "range", today: "2026-05-04",
    range: vp.State === "Selected Date" ? { start: "2026-05-06", end: "2026-05-16" } : null,
  }),
  // The sheet's OK is 56px high (date-picker.css: "56px high in the sheet footer like its Actions", the Bottom-Sheet
  // Actions' Large buttons on a phone); this Compact primitive draws Button/Size/Large, 48.
  figmaExceptions: [["(root)", "h", 56], ["Buttons", "h", 56], ["Buttons > Button/Main", "h", 56], ["Buttons > Content", "y", 8]]
    .flatMap(([layer, prop, code]) => ["Default", "Selected Date"].map((State) => ({ vp: { State }, layer, prop, code, note: "code's sheet OK is 56 high (date-picker.css), the Compact primitive's Large button 48" }))),
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    { figma: "Buttons", dom: ":root", check: ["size"] },
    { figma: "Buttons > Content", dom: ".zen-date-picker-sheet__summary", check: ["w", "x", "y"] },
    { figma: "Buttons > Button/Main", dom: ".zen-date-picker-sheet__apply", check: ["size", "x", "y"] },
    { figma: "Buttons > Button/Main > Container", dom: ".zen-date-picker-sheet__apply", check: ["fill", "radius", "fx"], fxIgnoreInset: true, when: (vp) => vp.State === "Selected Date" },
    { figma: "Buttons > Button/Main > Container > Label-Wrapper > Label", dom: ".zen-date-picker-sheet__apply .zen-button__label", check: ["text"], when: (vp) => vp.State === "Selected Date" },
  ],
};
