// Figma Primitives/Table/Cell/Basic-Icon-Cell 1603:4727 (docs/figma-contracts/table-cells.json): Bold × Subtext, a column
// with `content: "icon"`. The icon (the variant's own, icon-face-smile-line) is Element-Size/Popular/Base 20 on one line
// and Popular/Large 28 over a Subtext, in Content/Neutral/Strongest, centred on the Text-Cell, Spacing/Gap/Small before
// it. The Text-Cell's checks are shared (_table-shared.mjs).
import { child, mediaSuite } from "./_table-shared.mjs";

const ICON = /^icon-/;
export default mediaSuite({
  setId: "1603:4727",
  content: "icon",
  media: (spec) => child(spec, "01").c[0].c.find((node) => ICON.test(node.n)).n,
  visual: [
    { figma: "icon-face-smile-line", dom: ".zen-table-media__visual > .zen-icon", check: ["size", "x", "y"] },
    { figma: "icon-face-smile-line > Vector", dom: ".zen-table-media__visual > .zen-icon", check: ["fill"], fillVia: "color" },
  ],
});
