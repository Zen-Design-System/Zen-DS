// Figma Primitives/Table/Cell/Progress-Cell 4081:19726 (docs/figma-contracts/table-cells.json): State=Default, a column with
// `content: "progress"`. A Progress-Bar Theme=Neutral · Layout=Inline, here Progress=Done (the row's value 100): the 8px
// track (Background/Neutral/Subtle, Rounded) fills the row, centred on the label, its fill Background/Active/Neutral/Solid;
// the label (Body/Base/Regular · Strongest) Spacing/Gap/XSmall after it at the row's end. The track's width is what the
// label's text leaves, so it is not asserted.
import { cellCase } from "./_table-shared.mjs";

export default {
  contract: "docs/figma-contracts/table-cells.json",
  setId: "4081:19726",
  kind: "tableCell",
  root: ".zen-progress-bar",
  cases: (vp, { spec }) => cellCase(spec, { content: "progress", field: "value" }, { value: 100 }),
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    { figma: "Progress-Bar", dom: ":root", check: ["size", "x", "y"] },
    { figma: "Progress-Bar > Container", dom: ".zen-progress-bar__track", check: ["h", "x", "y", "fill", "radius"] },
    { figma: "Progress-Bar > Container > Progress", dom: ".zen-progress-bar__fill", check: ["h", "x", "y", "fill"] },
    { figma: "Progress-Bar > Label", dom: ".zen-progress-bar__label", check: ["text", "h", "y", "right"] },
  ],
};
