// Figma Primitives/Table/Cell/Text-Cell 1603:3247 (docs/figma-contracts/table-cells.json): Bold No · Yes, a column's
// default content (TableText). A Label (Body/Base/Regular, Bold: Body/Base/Bold · Content/Neutral/Strongest) and the
// Caption boolean (hidden by default). Each variant renders without and with a caption: without one code draws no
// caption; with one the Caption keeps the hidden layer's text style and colour (Caption/Regular · Content/Neutral/Light).
// The hidden Caption is a FIXED 80×16 box at y 26, so its place is checked where it shows: the Subtext of the media cells
// (table-cell-avatar … dock-icon), FILL × HUG, 3XSmall under the label.
import { cellCase, child, textOf } from "./_table-shared.mjs";

const captioned = (vp, props) => Boolean(props.column.captionField);
export default {
  contract: "docs/figma-contracts/table-cells.json",
  setId: "1603:3247",
  kind: "tableCell",
  root: ".zen-table-text",
  cases: (vp, { spec }) => {
    const row = { label: textOf(child(spec, "Label")), caption: textOf(child(spec, "Caption")) };
    const column = { field: "label", bold: vp.Bold === "Yes" };
    return [cellCase(spec, column, row), cellCase(spec, { ...column, captionField: "caption" }, row)];
  },
  map: [
    { figma: "", dom: ":root", check: ["h"], when: (vp, props) => !captioned(vp, props) },
    { figma: "Label", dom: ".zen-table-text__label", check: ["text", "h", "x", "y"] },
    { figma: "Caption", dom: ".zen-table-text__caption", check: [], when: (vp, props) => !captioned(vp, props) },
    { figma: "Caption", dom: ".zen-table-text__caption", check: ["text", "h"], forceVisible: true, when: captioned },
  ],
};
