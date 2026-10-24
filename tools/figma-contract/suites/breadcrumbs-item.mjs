// Figma .Primitives/Breadcrumbs/Item 292:43787 (docs/figma-contracts/breadcrumbs.json, captured 2026-10-21): Level
// (Sub · Master) × State (Default · Hover) × Emphasis (Default · Medium). A BreadcrumbItem (a link-less crumb, so a
// button) with the variant's label. Checks the 20px row, the Master icon (Element-Size/Popular/Base, Gap/XSmall before
// the label), the label's style and colour, and Hover's Hover-Base plate (the ::before: Neutral/Flat/Hover,
// Corner-Radius/Small, bleeding 4px above and below and 8px (Master: 4px) before the item); at rest the plate is clear.
// The crumb and the plate hug the label (Inter differs on CI's Linux), so their widths are not asserted.
import { child, textOf } from "./_chart-shared.mjs";

const hover = (vp) => vp.State === "Hover";
const masterLevel = (vp) => vp.Level === "Master";

export default {
  contract: "docs/figma-contracts/breadcrumbs.json",
  setId: "292:43787",
  kind: "stbBreadcrumbItem",
  root: ".zen-breadcrumb",
  cases: (vp, { spec }) => ({
    label: textOf(child(spec, "Label")),
    level: vp.Level.toLowerCase(),
    state: vp.State.toLowerCase(),
    emphasis: vp.Emphasis.toLowerCase(),
  }),
  map: [
    { figma: "", dom: ":root", check: ["h", "fill"] },
    { figma: "", dom: ".zen-breadcrumb::before", check: ["fill"], when: (vp) => !hover(vp) },
    { figma: "Hover-Base", dom: ".zen-breadcrumb::before", check: ["h", "x", "y", "fill", "radius"], when: hover },
    { figma: "icon-home-03-line", dom: ".zen-breadcrumb__icon", check: ["size", "x", "y"], when: masterLevel },
    { figma: "icon-home-03-line/Vector", dom: ".zen-breadcrumb__icon > .zen-icon", check: ["fill"], fillVia: "color", when: masterLevel },
    { figma: "Label", dom: ".zen-breadcrumb__label", check: ["h", "x", "y", "text"] },
  ],
};
