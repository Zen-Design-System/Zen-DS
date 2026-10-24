// Figma .Primitives/Mobile-Date-Picker/Item 9921:3283 (docs/figma-contracts/datepicker-sidebar.json): the phone day,
// `<DatePickerItem device="mobile">`, a square that fills its column (40px here) with the day in Body/Base/Medium; the
// same 16 States, tokens and Event dot (4px above the bottom) as the desktop Item. Each variant renders as drawn and
// with its Event on. The "-Hover" states render at rest (no `state` value: pointer :hover) and compare what hover
// leaves alone; their hover fills are not checked.
import { child, itemState, stripStates, textOf } from "./_date-picker-shared.mjs";

const event = "Container > Event|.Primitives/Date-Picker/Item/Event-List";
export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "9921:3283",
  kind: "dpItem",
  root: ".zen-date-picker__day",
  cases: (vp, { spec }) => {
    const props = { width: spec.w, device: "mobile", day: textOf(child(child(spec, "Container"), "Label")) ?? "", state: itemState(vp.State).state };
    return vp.State === "Blank" ? props : [props, { ...props, event: true }];
  },
  map: [
    { figma: "", dom: ":root", check: ["size", "fill"] },
    // Range-Selected-End's corners are mixed with no binding (0 · 1000 · 1000 · 0): compared corner by corner.
    { figma: "", dom: ":root", check: ["radius"], when: (vp) => stripStates.includes(vp.State) },
    { figma: "Container", dom: ".zen-date-picker__day > span", check: ["size", "x", "y", "radius", "stroke"], strokeVia: "shadow" },
    { figma: "Container", dom: ".zen-date-picker__day > span", check: ["fill"], when: (vp) => !itemState(vp.State).atRest },
    // Weekend-Hover darkens the label to Strongest on hover only.
    { figma: "Container > Label", dom: ".zen-date-picker__day > span", check: ["text"], when: (vp) => vp.State !== "Blank" && vp.State !== "Weekend-Hover" },
    { figma: event, dom: ".zen-date-picker__day .zen-date-picker__events > i", check: [], when: (vp, props) => vp.State !== "Blank" && !props.event },
    { figma: event, dom: ".zen-date-picker__day .zen-date-picker__events > i", check: ["size", "x", "y"], forceVisible: true, when: (vp, props) => Boolean(props.event) },
    { figma: `${event} > Event`, dom: ".zen-date-picker__day .zen-date-picker__events > i", check: ["fill", "radius"], when: (vp, props) => Boolean(props.event) },
  ],
};
