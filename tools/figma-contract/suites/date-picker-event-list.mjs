// Figma .Primitives/Date-Picker/Item/Event-List 510:36577 (docs/figma-contracts/datepicker-sidebar.json): the dots under a
// day, 4px Corner-Radius/Rounded, Spacing/Gap/3XSmall apart: Color/Content/Accent/Light (Default) or
// Date-Picker-Item/Content/Selected on a selected day (On-Selected). Code draws one dot (`<DatePickerItem event>`, a
// boolean), so Number-Event=1 is compared, as the dot of a Medium day (Default) and of a Single-Selected one
// (On-Selected); Number-Event 2–4 have no code counterpart (no event count prop) and are skipped.
export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "510:36577",
  kind: "dpItem",
  root: ".zen-date-picker__day > i",
  cases: (vp) => (vp["Number-Event"] === "1" ? { day: "1", event: true, state: vp.Variant === "On-Selected" ? "single-selected" : "default" } : null),
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    { figma: "Event", dom: ":root", check: ["size", "x", "y", "fill", "radius"] },
  ],
};
