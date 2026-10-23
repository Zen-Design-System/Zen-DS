// Figma .Primitives/Date-Picker/Item 455:33517 (docs/figma-contracts/datepicker-sidebar.json): Size Medium 32 · Small 24 ×
// 16 States. The root paints the In-Range strip (square, or rounded on a range end's outer side), its Container the day
// (Date-Picker-Item tokens, Corner-Radius/Action/Small · XSmall, the Today ring), the Label Body/Small/Medium. Each
// variant renders twice: as drawn, and with its Event boolean on (the 4px Event dot, 4 · 2px above the bottom).
// The "-Hover" states have no `state` value (pointer :hover only, which the checker cannot apply): they render at rest
// and compare what hover leaves alone (geometry, strip, ring, selected label); their hover fills are not checked.
import { child, itemState, selectedStates, stripStates, textOf } from "./_date-picker-shared.mjs";

const atRest = (vp) => itemState(vp.State).atRest;
export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "455:33517",
  kind: "dpItem",
  root: ".zen-date-picker__day",
  cases: (vp, { spec }) => {
    const label = textOf(child(child(spec, "Container"), "Label"));
    const props = { day: label ?? "", state: itemState(vp.State).state, size: vp.Size.toLowerCase() };
    return vp.State === "Blank" ? props : [props, { ...props, event: true }];
  },
  figmaExceptions: [
    // Only this set binds the dot on a selected day to Color/Content/Inverse/Strongest; Event-List On-Selected (510:36577)
    // and the Mobile Item (9921:3283) bind Date-Picker-Item/Content/Selected, the selected label's colour, which code
    // uses (they differ in dark/brand: Inverse is dark there, the label On-Accent white).
    ...selectedStates.map((State) => ({ vp: { State }, layer: "Container > Event > Event", prop: "fill", code: "rgb(255, 255, 255)", note: "dot on a selected day: Event-List On-Selected and the Mobile Item bind Date-Picker-Item/Content/Selected (code), this set Inverse/Strongest" })),
  ],
  map: [
    { figma: "", dom: ":root", check: ["size", "fill"] },
    // Range-Selected-End's corners are mixed with no binding (0 · 1000 · 1000 · 0); the checker reads one corner only.
    { figma: "", dom: ":root", check: ["radius"], when: (vp) => stripStates.includes(vp.State) && !vp.State.startsWith("Range-Selected-End") },
    { figma: "Container", dom: ".zen-date-picker__day > span", check: ["size", "x", "y", "radius", "stroke"], strokeVia: "shadow" },
    { figma: "Container", dom: ".zen-date-picker__day > span", check: ["fill"], when: (vp) => !atRest(vp) },
    // Weekend-Hover darkens the label to Strongest on hover only.
    { figma: "Container > Label", dom: ".zen-date-picker__day > span", check: ["text"], when: (vp) => vp.State !== "Blank" && vp.State !== "Weekend-Hover" },
    { figma: "Container > Event", dom: ".zen-date-picker__day > i", check: [], when: (vp, props) => vp.State !== "Blank" && !props.event },
    { figma: "Container > Event", dom: ".zen-date-picker__day > i", check: ["size", "x", "y"], forceVisible: true, when: (vp, props) => Boolean(props.event) },
    { figma: "Container > Event > Event", dom: ".zen-date-picker__day > i", check: ["fill", "radius"], when: (vp, props) => Boolean(props.event) },
  ],
};
