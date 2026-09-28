// Figma Checkbox/Text (309:46871) — includes the nested Checkbox/Mark and .Primitives/Checkbox/Content.
const mark = "Container/Check-Wrapper/Check-Mark";
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "309:46871",
  kind: "checkbox",
  // Each variant renders twice: without and with the caption (Figma: the Content primitive's Subtext boolean —
  // the old outer Caption layer was removed from Checkbox/Text; its dangling Caption#309:249 prop drives nothing).
  cases: (vp) => [false, true].map((withCaption) => ({
    label: "Checkbox label",
    caption: withCaption ? "Please select this checkbox if you agree to the terms and conditions" : undefined,
    checked: vp.Select === "Yes",
    state: vp.State.toLowerCase(),
    checkSide: vp["Check-Side"].toLowerCase(),
  })),
  // Figma's Container is a fixed-width row (141px) with the Content FILLing it, so on the Right side the mark's x
  // depends on that arbitrary width; check y there and x only for Left.
  // The nested Content instance no longer exposes its hidden Subtext (live capture 2026-09-29), like Radio-Button's;
  // the Subtext style and offset are checked on the primitive in checkbox-content. In Disabled the code greys the
  // caption with the label (Content/Disabled), same as Radio-Button.
  figmaExceptions: [
    { layer: `${mark}/Container`, prop: "fx", vp: { Select: "No" }, note: "house rule §9 (docs/component-usage-rules.md): the unselected mark sits on Neutral/Pale, so the code drops Figma\'s Shadow/Action/Basic" },
  ],
  map: [
    { figma: "", dom: ":root", check: ["h"], when: (vp, props) => !props.caption },
    { figma: `${mark}/Container`, dom: ".zen-checkbox__box", check: ["size", "y", "fill", "stroke", "radius", "fx"] },
    { figma: `${mark}/Container`, dom: ".zen-checkbox__box", check: ["x"], when: (vp) => vp["Check-Side"] === "Left" },
    { figma: `${mark}/Focus-Ring`, dom: ".zen-checkbox__mark::before", check: ["size", "y", "fill", "stroke", "radius"], strokeVia: "border", when: (vp) => vp.State === "Hover" || vp.State === "Focus" },
    { figma: `${mark}/Container/icon-check-line`, dom: ".zen-checkbox__box > .zen-icon", check: ["size", "y"], when: (vp) => vp.Select === "Yes" },
    { figma: `${mark}/Container/icon-check-line/Vector`, dom: ".zen-checkbox__box > .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => vp.Select === "Yes" },
    { figma: "Container/Content/Content/Label", dom: ".zen-checkbox__label", check: ["h", "y", "text"] },
    { figma: "Container/Content/Content/Label", dom: ".zen-checkbox__label", check: ["x"], when: (vp) => vp["Check-Side"] === "Left" },
  ],
};
