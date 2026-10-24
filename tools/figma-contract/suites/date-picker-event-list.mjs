// Figma .Primitives/Date-Picker/Item/Event-List 510:36577 (docs/figma-contracts/datepicker-sidebar.json): 1–4 dots under
// a day, 4px Corner-Radius/Rounded, Spacing/Gap/3XSmall apart, the row hugging them: Color/Content/Accent/Light (Default)
// or Date-Picker-Item/Content/Selected on a selected day (On-Selected). Code draws them in .zen-date-picker__events
// (`<DatePickerItem event>` takes a count since #266), here under a Medium day (Default) and a Single-Selected one.
export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "510:36577",
  kind: "dpItem",
  root: ".zen-date-picker__day .zen-date-picker__events",
  cases: (vp) => ({ day: "1", event: Number(vp["Number-Event"]), state: vp.Variant === "On-Selected" ? "single-selected" : "default" }),
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    ...[0, 1, 2, 3].map((k) => ({ figma: `Event#${k}`, dom: `.zen-date-picker__events > i:nth-child(${k + 1})`, check: ["size", "x", "y", "fill", "radius"], when: (vp) => Number(vp["Number-Event"]) > k })),
  ],
};
