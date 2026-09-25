// Figma Radio-Button/Radio-Button (373:96272) with nested Radio-Mark and .Primitives/Radio-Button/Content.
const mark = "Container/Check-Wrapper/Check-Mark";
const content = "Container/Content/Content";
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "373:96272",
  kind: "radio",
  cases: (vp) => [false, true].map((withCaption) => ({
    label: "Content label",
    caption: withCaption ? "Please select this an option which matched with your need" : undefined,
    checked: vp.Select === "Yes",
    state: vp.State.toLowerCase(),
    radioSide: vp["Radio-Side"].toLowerCase(),
  })),
  map: [
    { figma: "", dom: ":root", check: ["h"], when: (vp, props) => !props.caption },
    { figma: `${mark}/Container`, dom: ".zen-radio-button__ring", check: ["size", "y", "fill", "stroke", "radius", "fx"] },
    { figma: `${mark}/Container`, dom: ".zen-radio-button__ring", check: ["x"], when: (vp) => vp["Radio-Side"] === "Left" },
    { figma: `${mark}/Focus-Ring`, dom: ".zen-radio-button__mark::before", check: ["size", "y", "fill", "stroke", "radius"], when: (vp) => vp.State === "Hover" || vp.State === "Focus" },
    { figma: `${mark}/Container/icon-circle-small-solid`, dom: ".zen-radio-button__ring > .zen-icon", check: ["size", "y"], when: (vp) => vp.Select === "Yes" },
    { figma: `${mark}/Container/icon-circle-small-solid/Vector`, dom: ".zen-radio-button__ring > .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => vp.Select === "Yes" },
    { figma: `${content}/Label`, dom: ".zen-radio-button__label", check: ["h", "y", "text"] },
    { figma: `${content}/Label`, dom: ".zen-radio-button__label", check: ["x"], when: (vp) => vp["Radio-Side"] === "Left" },
  ],
};
