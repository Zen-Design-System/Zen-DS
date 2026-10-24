// Figma Primitives/Table/Cell/Tag-Cell 1603:23304 (docs/figma-contracts/table-cells.json): an Items slot (HUG, one line,
// Spacing/Gap/2XSmall) holding Tag Text-Only · Default (Tag/Size/Medium 28, Rounded, Tag/Background/Default, a 1px INSIDE
// Tag/Border/Default stroke, Shadow/Action/Tertiary with its background blur), the label (Body/Base/Medium · Strongest)
// in a Text-Wrapper Tag/Spacing/Medium/Horizontal-Padding in. A column with `content: "tag"`. The stroke is an inset ring
// in the Tag's box-shadow list, so `fx` compares the outer shadow only.
import { at, cellCase, textOf } from "./_table-shared.mjs";

export default {
  contract: "docs/figma-contracts/table-cells.json",
  setId: "1603:23304",
  kind: "tableCell",
  root: ".zen-table-items",
  cases: (vp, { spec }) => cellCase(spec, { content: "tag", field: "tags" }, { tags: [textOf(at(spec, "Items > Tag > Text-Wrapper > Label"))] }),
  map: [
    { figma: "", dom: ":root", check: ["h"] },
    { figma: "Items", dom: ":root", check: ["h", "x", "y"] },
    { figma: "Items > Tag", dom: ".zen-tag", check: ["h", "x", "y", "fill", "radius", "fx"], fxIgnoreInset: true, fxBackdrop: true },
    { figma: "Items > Tag", dom: ".zen-tag", check: ["stroke"], strokeVia: "shadow" },
    { figma: "Items > Tag > Text-Wrapper", dom: ".zen-tag__label", check: ["h", "x", "y"] },
    { figma: "Items > Tag > Text-Wrapper > Label", dom: ".zen-tag__label", check: ["text"] },
  ],
};
