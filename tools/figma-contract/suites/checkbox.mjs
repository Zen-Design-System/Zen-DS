// Figma Checkbox/Text (309:46871) — includes the nested Checkbox/Mark and .Primitives/Checkbox/Content.
const mark = "Container/Check-Wrapper/Check-Mark";
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "309:46871",
  kind: "checkbox",
  // Each variant renders twice: without and with the Caption boolean.
  cases: (vp) => [false, true].map((withCaption) => ({
    label: "Checkbox label",
    caption: withCaption ? "Please select this checkbox if you agree to the terms and conditions" : undefined,
    checked: vp.Select === "Yes",
    state: vp.State.toLowerCase(),
    checkSide: vp["Check-Side"].toLowerCase(),
  })),
  // Figma's Label is a fixed-width text box (117px), so on the Right side the mark's x depends
  // on that arbitrary width; check y there and x only for Left.
  map: [
    { figma: "", dom: ":root", check: ["h"], when: (vp, props) => !props.caption },
    { figma: "Caption", dom: ".zen-checkbox__caption", check: ["x", "y", "text"], forceVisible: true, when: (vp, props) => Boolean(props.caption) },
    { figma: `${mark}/Container`, dom: ".zen-checkbox__box", check: ["size", "y", "fill", "stroke", "radius", "fx"] },
    { figma: `${mark}/Container`, dom: ".zen-checkbox__box", check: ["x"], when: (vp) => vp["Check-Side"] === "Left" },
    { figma: `${mark}/Focus-Ring`, dom: ".zen-checkbox__mark::before", check: ["size", "y", "fill", "stroke", "radius"], strokeVia: "border", when: (vp) => vp.State === "Hover" || vp.State === "Focus" },
    { figma: `${mark}/Container/icon-check-line`, dom: ".zen-checkbox__box > .zen-icon", check: ["size", "y"], when: (vp) => vp.Select === "Yes" },
    { figma: `${mark}/Container/icon-check-line/Vector`, dom: ".zen-checkbox__box > .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => vp.Select === "Yes" },
    { figma: "Container/Content/Content/Label", dom: ".zen-checkbox__label", check: ["h", "y", "text"] },
    { figma: "Container/Content/Content/Label", dom: ".zen-checkbox__label", check: ["x"], when: (vp) => vp["Check-Side"] === "Left" },
  ],
};
