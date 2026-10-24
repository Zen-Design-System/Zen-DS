// Figma Primitives/Segmented/Item 1204:11690 (docs/figma-contracts/segmented-toggle-badge-avatarstack.json): Size ×
// Level × State × Select. Each variant renders as the one option of a Segmented (cases/segmented-toggle-breadcrumbs.tsx
// `stbSegmentedItem`, since the item's colours follow the group's level and size) and is measured from the item.
// Checks the item's height, fill, radius, Shadow/Action/Basic (selected) and 3px inside focus ring (Focused), the leading
// icon's box and colour, and the label's box, text style and colour. The icon and label text are read from the
// variant. Item widths hug their labels (Inter differs by a pixel or two on CI's Linux), so no width or end edge is
// asserted; the label's start is fixed (padding + icon). The Badge slot (Wrapper) is hidden in every variant.
import { child, textOf } from "./_chart-shared.mjs";

export default {
  contract: "docs/figma-contracts/segmented-toggle-badge-avatarstack.json",
  setId: "1204:11690",
  kind: "stbSegmentedItem",
  root: ".zen-segmented__item",
  cases: (vp, { spec }) => ({
    size: vp.Size.toLowerCase(),
    level: vp.Level.toLowerCase(),
    state: vp.State === "Default" ? undefined : vp.State.toLowerCase(),
    selected: vp.Select === "Yes",
    leading: child(spec, "Leading")?.main,
    label: textOf(child(spec, "Text-Wrapper")),
  }),
  map: [
    { figma: "", dom: ":root", check: ["h", "fill", "radius", "stroke", "fx"], strokeVia: "shadow", fxIgnoreInset: true },
    { figma: "Leading", dom: ".zen-segmented__leading", check: ["size", "x", "y"] },
    { figma: "Leading/Vector", dom: ".zen-segmented__leading > .zen-icon", check: ["fill"], fillVia: "color" },
    { figma: "Text-Wrapper", dom: ".zen-segmented__label", check: ["h", "x", "y"] },
    { figma: "Text-Wrapper/Label", dom: ".zen-segmented__label", check: ["text"] },
    { figma: "Wrapper", dom: ".zen-segmented__badge", check: [] },
  ],
};
