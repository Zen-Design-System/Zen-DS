// Figma Primitives/Breadcrumbs/Item/Slot 4031:20158 (docs/figma-contracts/breadcrumbs.json, captured 2026-10-21): no
// variants; one crumb (an .Primitives/Breadcrumbs/Item instance) and its Dash, hidden by default. In code it is a
// Breadcrumbs trail's `<li class="zen-breadcrumbs__item">`, so the slot renders as a one-crumb Breadcrumbs (crumb read
// from the slot) measured from that item: the 20px row, the crumb's box, its label's style and colour, and no Dash.
// The visible Dash (its size, colour and the Spacing/Gap/2XSmall before it) is checked in suites/breadcrumbs.mjs, since
// a hidden layer's offset here is stale. Widths hug the label (Inter differs on CI's Linux) and are not asserted.
import { crumbOf } from "./_breadcrumbs-shared.mjs";

export default {
  contract: "docs/figma-contracts/breadcrumbs.json",
  setId: "4031:20158",
  kind: "stbBreadcrumbs",
  root: ".zen-breadcrumbs__item",
  cases: (vp, { spec }) => ({ items: [crumbOf(spec, 0)] }),
  map: [
    { figma: "", dom: ":root", check: ["h"] },
    { figma: "Item", dom: ".zen-breadcrumb", check: ["h", "x", "y", "fill"] },
    { figma: "Item > Label", dom: ".zen-breadcrumb__label", check: ["h", "x", "y", "text"] },
    { figma: "Dash", dom: ".zen-breadcrumbs__separator", check: [] },
  ],
};
