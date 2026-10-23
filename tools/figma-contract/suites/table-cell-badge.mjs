// Figma Primitives/Table/Cell/Badge-Cell 1603:6158 (docs/figma-contracts/table-cells.json): an Items slot (HUG, one line,
// Spacing/Gap/2XSmall) holding Badge Medium · Neutral · Subtle (Badge/Size/Medium 28, Rounded, Background/Neutral/Subtle):
// the 16px leading dot (Content/Neutral/Light) 8px in, the label (Body/Base/Medium · Strongest) in its Text-Wrapper
// Badge/Spacing/Medium/Gap after it; Remove hidden. Two cases:
//  - `badges`: the slot's default content as an app writes it (TableBadges with a Badge, which shows its dot);
//  - `content: "badge"`: the column draws the badge itself, without the dot (a row's dot is its override, as Zen Studio's
//    Figma pull writes it: `Row[…]/<column>/Badge: { leadingIcon: true }`), so the dot and the label's x are left out.
import { at, cellCase, textOf } from "./_table-shared.mjs";

const dotted = (vp, props) => props.cell === "badges";
export default {
  contract: "docs/figma-contracts/table-cells.json",
  setId: "1603:6158",
  kind: "tableCell",
  root: ".zen-table-items",
  cases: (vp, { spec }) => [
    cellCase(spec, {}, {}, { cell: "badges" }),
    cellCase(spec, { content: "badge", field: "status" }, { status: textOf(at(spec, "Items > Badge > Text-Wrapper > Label")) }),
  ],
  map: [
    { figma: "", dom: ":root", check: ["h"] },
    { figma: "Items", dom: ":root", check: ["h", "x", "y"] },
    { figma: "Items > Badge", dom: ".zen-badge", check: ["h", "x", "y", "fill", "radius"] },
    { figma: "Items > Badge > Leading", dom: ".zen-badge__leading", check: ["size", "x", "y"], when: dotted },
    { figma: "Items > Badge > Leading > Vector", dom: ".zen-badge__leading", check: ["fill"], fillVia: "color", when: dotted },
    { figma: "Items > Badge > Text-Wrapper", dom: ".zen-badge__text", check: ["h", "y"] },
    { figma: "Items > Badge > Text-Wrapper", dom: ".zen-badge__text", check: ["x"], when: dotted },
    { figma: "Items > Badge > Text-Wrapper > Label", dom: ".zen-badge__text", check: ["text"] },
    { figma: "Items > Badge > Remove", dom: ".zen-badge__remove", check: [] },
  ],
};
