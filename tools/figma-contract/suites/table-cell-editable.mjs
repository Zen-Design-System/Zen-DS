// Figma Primitives/Table/Cell/Editabled-Cell 1603:23274 (docs/figma-contracts/table-cells.json, no variants): the editor of
// an editable cell (Table/Cell/Default State=Edit), here a text column (`edit` with a "Placeholder" placeholder) put in
// Edit as a press on the cell does (cases/table-cells.tsx). FIXED 330 × Table/Cell/Size, padding Small × Medium, gap
// XSmall: the Content (FILL, Spacing/Padding/3XSmall in) holds the caret (Background/Active/Neutral/Solid) and the
// placeholder (Body/Base/Medium · Content/Placeholder); the hidden Data (a Tag-Cell, Data=Yes for tags) is not drawn.
// Not compared: the 2px bottom stroke (Emphasis/Border-Weight/Active/Primary, Color/Focus/Neutral/Solid, INSIDE), which
// code draws as an inset box-shadow (`0 -2px 0 0`) the checker cannot read.
import { at, cellCase, textOf } from "./_table-shared.mjs";

// Code paints Neutral/Pale over an opaque Surface (background-image over background-color) so the editor can overlay the
// rows below without showing them through (table.css); the background colour is the Surface. `code` pins it per mode.
const surface = "Code lays Neutral/Pale over an opaque Surface (table.css: the editor overlays the rows below), so its background colour is Surface/Default.";
export default {
  contract: "docs/figma-contracts/table-cells.json",
  setId: "1603:23274",
  kind: "tableCell",
  root: ".zen-table-editor",
  cases: (vp, { spec }) => ({ ...cellCase(spec, { field: "note", edit: { placeholder: textOf(at(spec, "Content > Text")) } }, { note: "" }, { editing: true }), width: spec.w }),
  figmaExceptions: ["rgb(255, 255, 255)", "rgb(33, 33, 33)"].map((code) => ({ vp: {}, layer: "(root)", prop: "fill", code, note: surface })),
  map: [
    { figma: "", dom: ":root", check: ["size", "fill"] },
    { figma: "Content", dom: ".zen-table-editor__input", check: ["size", "x", "y"] },
    { figma: "Content > Text", dom: ".zen-table-editor__input::placeholder", check: ["text"] },
    { figma: "Content > Cursor", dom: ".zen-table-editor__input", check: ["fill"], fillVia: "caret" },
    { figma: "Data", dom: ".zen-table-editor__tags", check: [] },
  ],
};
