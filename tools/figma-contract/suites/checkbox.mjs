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
  // Figma's Label is a fixed-width text box (117px), so on the Right side the mark's x depends
  // on that arbitrary width; check y there and x only for Left.
  // Disabled keeps the hidden Subtext on Content/Neutral/Light only because nobody overrode a hidden layer;
  // the label turns Content/Disabled, so the caption follows it (same as Radio-Button).
  figmaExceptions: [
    { layer: `${mark}/Container`, prop: "fx", vp: { Select: "No" }, note: "house rule §9 (docs/component-usage-rules.md): the unselected mark sits on Neutral/Pale, so the code drops Figma\'s Shadow/Action/Basic" },
    { layer: "Container/Content/Content/Subtext", prop: "color", vp: { State: "Disabled" }, note: "hidden Subtext not overridden in Disabled — code greys it with the label" },
  ],
  map: [
    { figma: "", dom: ":root", check: ["h"], when: (vp, props) => !props.caption },
    // Subtext is hidden by default so Figma keeps a stale y; its offset is the primitive's 3XSmall gap (checked in checkbox-content).
    { figma: "Container/Content/Content/Subtext", dom: ".zen-checkbox__caption", check: ["text"], forceVisible: true, when: (vp, props) => Boolean(props.caption) },
    { figma: "Container/Content/Content/Subtext", dom: ".zen-checkbox__caption", check: ["x"], forceVisible: true, when: (vp, props) => Boolean(props.caption) && vp["Check-Side"] === "Left" },
    { figma: `${mark}/Container`, dom: ".zen-checkbox__box", check: ["size", "y", "fill", "stroke", "radius", "fx"] },
    { figma: `${mark}/Container`, dom: ".zen-checkbox__box", check: ["x"], when: (vp) => vp["Check-Side"] === "Left" },
    { figma: `${mark}/Focus-Ring`, dom: ".zen-checkbox__mark::before", check: ["size", "y", "fill", "stroke", "radius"], strokeVia: "border", when: (vp) => vp.State === "Hover" || vp.State === "Focus" },
    { figma: `${mark}/Container/icon-check-line`, dom: ".zen-checkbox__box > .zen-icon", check: ["size", "y"], when: (vp) => vp.Select === "Yes" },
    { figma: `${mark}/Container/icon-check-line/Vector`, dom: ".zen-checkbox__box > .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => vp.Select === "Yes" },
    { figma: "Container/Content/Content/Label", dom: ".zen-checkbox__label", check: ["h", "y", "text"] },
    { figma: "Container/Content/Content/Label", dom: ".zen-checkbox__label", check: ["x"], when: (vp) => vp["Check-Side"] === "Left" },
  ],
};
