// Figma Breadcrumbs 4031:20161 (docs/figma-contracts/breadcrumbs.json, captured 2026-10-21): Size=Small, an Item-List
// slot of Primitives/Breadcrumbs/Item/Slot (the crumb + its Dash, Spacing/Gap/2XSmall), Spacing/Gap/XSmall apart. The
// trail is read from the slot (labels, Level, Emphasis, Dash). Checks the row's height, each slot's and crumb's box, the
// Master icon, each label's style and colour, and each Dash's size, place and colour (a hidden Dash: none rendered).
// Crumbs hug their labels (Inter differs on CI's Linux), so only the first slot's start and the first label's (after the
// fixed icon) are asserted, and no widths. The root's own Spacing/Gap/3XSmall spaces its single child and never renders.
// The 4px list padding the BACKLOG asked to record is gone: Item-List pads 0 in this capture, as code does.
import { child } from "./_chart-shared.mjs";
import { crumbOf } from "./_breadcrumbs-shared.mjs";

const SLOTS = 2;
const slot = (i) => `Item-List > Item#${i}`;
const li = (i) => `.zen-breadcrumbs__item:nth-child(${i + 1})`;
const master = (i) => (vp, props) => props.items[i]?.level === "master";

export default {
  contract: "docs/figma-contracts/breadcrumbs.json",
  setId: "4031:20161",
  kind: "stbBreadcrumbs",
  root: ".zen-breadcrumbs",
  cases: (vp, { spec }) => ({ items: (child(spec, "Item-List")?.c ?? []).filter((node) => !node.hidden).map(crumbOf) }),
  map: [
    { figma: "", dom: ":root", check: ["h"] },
    { figma: "Item-List", dom: ".zen-breadcrumbs__list", check: ["h", "x", "y"] },
    ...Array.from({ length: SLOTS }, (_, i) => [
      { figma: slot(i), dom: li(i), check: ["h", "y"] },
      { figma: `${slot(i)} > Item`, dom: `${li(i)} > .zen-breadcrumb`, check: ["h", "y", "fill"] },
      { figma: `${slot(i)} > Item > icon-home-03-line`, dom: `${li(i)} .zen-breadcrumb__icon`, check: ["size", "y"], when: master(i) },
      { figma: `${slot(i)} > Item > icon-home-03-line > Vector`, dom: `${li(i)} .zen-breadcrumb__icon > .zen-icon`, check: ["fill"], fillVia: "color", when: master(i) },
      { figma: `${slot(i)} > Item > Label`, dom: `${li(i)} .zen-breadcrumb__label`, check: ["h", "y", "text"] },
      { figma: `${slot(i)} > Dash`, dom: `${li(i)} > .zen-breadcrumbs__separator`, check: ["size", "y"] },
      { figma: `${slot(i)} > Dash > Vector`, dom: `${li(i)} > .zen-breadcrumbs__separator > .zen-icon`, check: ["fill"], fillVia: "color", when: (vp, props) => props.items[i]?.dash },
    ]).flat(),
    { figma: slot(0), dom: li(0), check: ["x"] },
    { figma: `${slot(0)} > Item`, dom: `${li(0)} > .zen-breadcrumb`, check: ["x"] },
    { figma: `${slot(0)} > Item > icon-home-03-line`, dom: `${li(0)} .zen-breadcrumb__icon`, check: ["x"], when: master(0) },
    { figma: `${slot(0)} > Item > Label`, dom: `${li(0)} .zen-breadcrumb__label`, check: ["x"] },
    // The two gaps, measured from the first Dash so no label width enters: the crumb ends Spacing/Gap/2XSmall before
    // its Dash, and the next slot starts Spacing/Gap/XSmall after it.
    { figma: `${slot(0)} > Item`, dom: `${li(0)} > .zen-breadcrumb`, figmaRoot: `${slot(0)} > Dash`, root: `${li(0)} > .zen-breadcrumbs__separator`, check: ["right"] },
    { figma: slot(1), dom: li(1), figmaRoot: `${slot(0)} > Dash`, root: `${li(0)} > .zen-breadcrumbs__separator`, check: ["x"] },
  ],
};
