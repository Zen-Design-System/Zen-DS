// Figma .Primitives/Date-Picker/Action 460:38871 (docs/figma-contracts/datepicker-sidebar.json): `<DatePickerAction>` in a
// frame as wide as the set (280): Button/Main Small Tertiary "Cancel" and Primary "Submit" ("Done" on Action=Single,
// read from the variant) at the end of the row, Spacing/Gap/XSmall apart. The buttons hug their labels, so the row's end
// edge, heights and paints are compared, not the buttons' x or width (Button/Main has its own suites).
import { child, textOf } from "./_chart-shared.mjs";

const button = (name, dom, when) => [
  { figma: name, dom, check: ["h", "y"], when },
  { figma: `${name} > Container`, dom, check: ["fill", "radius", "fx"], fxIgnoreInset: true, when },
  { figma: `${name} > Container`, dom, check: ["stroke"], strokeVia: "shadow", when },
  { figma: `${name} > Container > Label-Wrapper > Label`, dom: `${dom} .zen-button__label`, check: ["text"], when },
];
export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "460:38871",
  kind: "dpAction",
  root: ".zen-date-picker__actions",
  cases: (vp, { spec }) => ({
    width: spec.w,
    action: vp.Action.toLowerCase(),
    cancelLabel: textOf(child(spec, "Cancel")),
    applyLabel: textOf(child(spec, "Submit")),
  }),
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    ...button("Cancel", ".zen-date-picker__actions > .zen-button:first-child", (vp) => vp.Action === "Dual"),
    ...button("Submit", ".zen-date-picker__actions > .zen-button:last-child"),
    { figma: "Submit", dom: ".zen-date-picker__actions > .zen-button:last-child", check: ["right"] },
  ],
};
