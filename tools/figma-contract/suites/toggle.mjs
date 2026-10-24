// Figma Toggle 1526:5703 (docs/figma-contracts/segmented-toggle-badge-avatarstack.json): Size × State × Select × Theme
// (Text-First · Toggle-First), a 232px row of the .Primitives/Toggle/Content (Label + Subtext, FILL) and a Toggle-Button,
// Spacing/Gap/Medium apart (Small: Gap/Small). The label, caption and XLarge icon are read from the variant. Checks the
// row, the content's and each text's box, style and colour, and the switch's place, bar fill and dot (the switch
// itself: suites/toggle-button.mjs; the content primitive: suites/toggle-content.mjs). Every box here is fixed or
// FILLs the 232px row, so widths are asserted.
import { at, child } from "./_chart-shared.mjs";

const CONTENT = ".Primitives/Toggle/Content";
const xl = (vp) => vp.Size === "XLarge";

export default {
  contract: "docs/figma-contracts/segmented-toggle-badge-avatarstack.json",
  setId: "1526:5703",
  kind: "stbToggle",
  root: ".zen-toggle",
  cases: (vp, { spec }) => {
    const content = child(spec, CONTENT);
    const subtext = child(content, "Subtext");
    return {
      label: child(content, "Label")?.txt,
      caption: subtext && !subtext.hidden ? subtext.txt : undefined,
      size: vp.Size.toLowerCase(),
      state: vp.State === "Disabled" ? "disabled" : undefined,
      checked: vp.Select === "Yes",
      theme: vp.Theme.toLowerCase(),
      icon: at(spec, "Toggle-Button > Toggle-Dot > Icon")?.main,
    };
  },
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    { figma: CONTENT, dom: ".zen-toggle__content", check: ["size", "x", "y"] },
    { figma: `${CONTENT} > Label`, dom: ".zen-toggle__label", check: ["size", "x", "y", "text"] },
    { figma: `${CONTENT} > Subtext`, dom: ".zen-toggle__caption", check: ["size", "x", "y", "text"] },
    { figma: "Toggle-Button", dom: ".zen-toggle-button", check: ["size", "x", "y"] },
    { figma: "Toggle-Button", dom: ".zen-toggle-button__track", check: ["fills", "radius"] },
    { figma: "Toggle-Button > Toggle-Dot", dom: ".zen-toggle-button__dot", check: ["size", "x", "y", "fill", "stroke"], strokeVia: "shadow" },
    { figma: "Toggle-Button > Toggle-Dot > Icon", dom: ".zen-toggle-button__dot > .zen-icon", check: ["size", "x", "y"], when: xl },
    { figma: "Toggle-Button > Toggle-Dot > Icon > Vector", dom: ".zen-toggle-button__dot > .zen-icon", check: ["fill"], fillVia: "color", when: xl },
  ],
};
