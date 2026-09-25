// .Primitives/Radio-Button/Content (373:96322): Label (+ optional Caption, gap Spacing/Gap/3XSmall).
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "373:96322",
  kind: "radio",
  root: ".zen-radio-button__content",
  cases: (vp) => ({ label: "Content label", caption: "Please select this an option which matched with your need", bold: vp.Bold === "Yes" }),
  map: [
    { figma: "Label", dom: ".zen-radio-button__label", check: ["h", "x", "y", "text"] },
    { figma: "Caption", dom: ".zen-radio-button__caption", check: ["x", "text"], forceVisible: true },
  ],
};
