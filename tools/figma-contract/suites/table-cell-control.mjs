// Figma Primitives/Table/Cell/Control-Cell 1603:14284 (docs/figma-contracts/table-cells.json): Type Checkbox · Toggle ·
// Radio-Button, each control unselected in a Container frame. Checkbox and Toggle are columns with `content: "checkbox"` /
// `"toggle"` (the row's value false); the Table has no radio content, so Radio-Button is a column's `cell` (RadioButton
// with an aria-label). Measured from the control's own root:
//  - Checkbox/Mark: the 16px box (Checkbox/Size/Medium, Corner-Radius/XSmall), Checkbox/Background/Unselected/Default with
//    a 1px INSIDE Checkbox/Border/Default stroke;
//  - Toggle-Button Size=Medium: the 36×20 bar (Toggle/Bar/Background/Unselected/Default, Spacing/Padding/3XSmall in) and the
//    16px dot (Toggle/Item/Size/Medium, Toggle/Dot/Background/Unselected-Default, a 0.5px OUTSIDE Border/Neutral/Pale ring);
//  - Radio-Mark: the 16px ring (Rounded) with the checkbox's paints.
// The dot's Shadow/Action/Basic shares its box-shadow list with the 0.5px ring, so its `fx` is not compared here.
import { cellCase } from "./_table-shared.mjs";

const is = (type) => (vp) => vp.Type === type;
const BOX = "Container > Checkbox/Mark > Container";
const RING = "Container > Radio-Button/Radio-Mark > Container";
const BAR = "Container > Toggle-Button";
// The Control-Cell wrappers differ per Type (QUESTIONS.md "Table cells": Control-Cell wrappers): Checkbox hugs its 16px
// mark, Toggle is FIXED 40 wide around its 36px bar (at x 0), Radio-Button FIXED 20×20 with its 16px mark at the top left.
// Code draws the control alone, so the cell's root is the control's own size.
const wrapper = "Control-Cell wrappers differ per Type (Toggle FIXED 40 around a 36 bar, Radio FIXED 20×20 around a 16 mark at 0,0; QUESTIONS.md Table cells); code's cell holds the control alone.";
// A mark-only Checkbox / RadioButton keeps its 20px Check-Wrapper (the 16px mark + Spacing/Padding/3XSmall above and below,
// the label's line; checkbox.css / radio-button.css), so its root is 20 tall with the mark 2px down. The cell centres the
// row in its Content slot, so the mark lands where Figma's does.
const row = "A mark-only Checkbox/RadioButton keeps its 20px Check-Wrapper (16px mark + 2 × Spacing/Padding/3XSmall, checkbox.css); the cell centres it, so the mark sits as in Figma.";
const markShadow = "house rule §9 (docs/component-usage-rules.md): the unselected mark sits on Neutral/Pale, so the code drops Figma's Shadow/Action/Basic";
export default {
  contract: "docs/figma-contracts/table-cells.json",
  setId: "1603:14284",
  kind: "tableCell",
  cases: (vp, { spec }) => {
    if (vp.Type === "Radio-Button") return cellCase(spec, {}, {}, { cell: "radio" });
    return cellCase(spec, { content: vp.Type === "Toggle" ? "toggle" : "checkbox", field: "on" }, { on: false });
  },
  figmaExceptions: [
    { vp: { Type: "Toggle" }, layer: "(root)", prop: "w", code: "36", note: wrapper },
    { vp: { Type: "Radio-Button" }, layer: "(root)", prop: "w", code: "16", note: wrapper },
    { vp: { Type: "Checkbox" }, layer: "(root)", prop: "h", code: "20", note: row },
    ...[["Checkbox", "Container", "h", "20"], ["Checkbox", "Container > Checkbox/Mark", "y", "2"], ["Checkbox", BOX, "y", "2"],
      ["Radio-Button", "Container", "h", "20"], ["Radio-Button", "Container > Radio-Button/Radio-Mark", "y", "2"], ["Radio-Button", RING, "y", "2"]]
      .map(([Type, layer, prop, code]) => ({ vp: { Type }, layer, prop, code, note: row })),
    { vp: { Type: "Checkbox" }, layer: BOX, prop: "fx", note: markShadow },
    { vp: { Type: "Radio-Button" }, layer: RING, prop: "fx", note: markShadow },
  ],
  map: [
    // Checkbox
    { figma: "", dom: ":root", root: ".zen-checkbox", check: ["size"], when: is("Checkbox") },
    { figma: "Container", dom: ":root", root: ".zen-checkbox", check: ["size", "x", "y"], when: is("Checkbox") },
    { figma: "Container > Checkbox/Mark", dom: ".zen-checkbox__mark", root: ".zen-checkbox", check: ["size", "x", "y"], when: is("Checkbox") },
    { figma: BOX, dom: ".zen-checkbox__box", root: ".zen-checkbox", check: ["size", "x", "y", "fill", "stroke", "radius", "fx"], when: is("Checkbox") },
    // Toggle
    { figma: "", dom: ":root", root: ".zen-toggle-button", check: ["size"], when: is("Toggle") },
    { figma: "Container", dom: ":root", root: ".zen-toggle-button", check: ["size", "x", "y"], when: is("Toggle") },
    { figma: BAR, dom: ".zen-toggle-button__track", root: ".zen-toggle-button", check: ["size", "x", "y", "fill", "radius"], when: is("Toggle") },
    { figma: `${BAR} > Toggle-Dot`, dom: ".zen-toggle-button__dot", root: ".zen-toggle-button", check: ["size", "x", "y", "fill", "radius"], when: is("Toggle") },
    { figma: `${BAR} > Toggle-Dot`, dom: ".zen-toggle-button__dot", root: ".zen-toggle-button", check: ["stroke"], strokeVia: "shadow", when: is("Toggle") },
    // Radio-Button
    { figma: "", dom: ":root", root: ".zen-radio-button", check: ["size"], when: is("Radio-Button") },
    { figma: "Container", dom: ":root", root: ".zen-radio-button", check: ["size", "x", "y"], when: is("Radio-Button") },
    { figma: "Container > Radio-Button/Radio-Mark", dom: ".zen-radio-button__mark", root: ".zen-radio-button", check: ["size", "x", "y"], when: is("Radio-Button") },
    { figma: RING, dom: ".zen-radio-button__ring", root: ".zen-radio-button", check: ["size", "x", "y", "fill", "stroke", "radius", "fx"], when: is("Radio-Button") },
  ],
};
