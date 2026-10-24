// Figma .Primitives/Date-Picker/Item/Event-List 510:36577 (docs/figma-contracts/datepicker-sidebar.json): the dots under a
// day, 4px Corner-Radius/Rounded, Spacing/Gap/3XSmall apart: Color/Content/Accent/Light (Default) or
// Date-Picker-Item/Content/Selected on a selected day (On-Selected). Code draws 1–4 dots in .zen-date-picker__events
// (`<DatePickerItem event={n}>`), as the dots of a Medium day (Default) and of a Single-Selected one (On-Selected).
// Figma's Event-List hugs its dots while code's row spans the day and centres them, so offsets are taken from the first
// dot (the frame's x 0): each dot's size, place and fill, so the last dot's place pins the row's width.
const count = (vp) => Number(vp["Number-Event"]);
const dot = (k) => `.zen-date-picker__day .zen-date-picker__events > i:nth-child(${k + 1})`;

export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "510:36577",
  kind: "dpItem",
  root: dot(0),
  cases: (vp) => ({ day: "1", event: count(vp), state: vp.Variant === "On-Selected" ? "single-selected" : "default" }),
  map: [
    { figma: "", dom: ":root", check: ["h"] },
    ...[0, 1, 2, 3].map((k) => ({ figma: `Event#${k}`, dom: dot(k), check: ["size", "x", "y", "fill", "radius"], when: (vp) => count(vp) > k })),
  ],
};
