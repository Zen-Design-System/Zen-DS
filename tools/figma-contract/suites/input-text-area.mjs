// Figma Input/Text-Area 450:7027 (docs/figma-contracts/input-search.json): Size Small–Large × 9 States, a 400px field over
// .Primitives/Input/Text-Area (Text-Area/Size height, Input/Spacing padding, top-aligned Input-Content: Body/Small/Medium in
// Small, Body/Base/Medium otherwise). The textarea fills the box, so the text's x, y and (placeholder) width compare, not
// its one-line height. The 8px resize glyph (Sympol) is the browser's own resizer: not mapped.
import { fieldMap, fieldProps, helpMap, placeholderLineHeight } from "./_input-shared.mjs";

const content = ".Primitives/Input/Input-Content/Default";
export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "450:7027",
  kind: "inputFieldsTextArea",
  root: ".zen-input-field",
  cases: (vp, { spec }) => fieldProps(vp, spec, `Field > Container > ${content}`),
  figmaExceptions: [
    ...placeholderLineHeight(`Field > Container > ${content} > Text`),
    // Figma-side inconsistencies with .Primitives/Input/Field-Only; code draws every field's box as Field-Only does. The
    // ring is a known designer question (BACKLOG P3, 2026-10-03/13). Text-Area's Focused fill Input/Background/Default and
    // error border Border/Negative/Solid/Default differ from Field-Only's tokens too, but resolve to the same colours.
    ...["Focused", "Typing"].flatMap((State) => ["3px rgba(0, 0, 0, 0.1)", "3px rgba(254, 254, 254, 0.15)"].map((code) => ({
      vp: { State }, layer: "Field", prop: "stroke", code, note: "Open question (BACKLOG P3): Text-Area's Focused ring is 2px (Emphasis/Border-Weight/Active/Primary), Field-Only's 3px, which code keeps for all fields.",
    }))),
    { vp: { State: "Read-Only" }, layer: "Field > Container", prop: "fx", code: "none", note: "Text-Area Read-Only keeps Effect/Input; Field-Only Read-Only (Text, Select, Date, Number) has none, as code." },
    // Harness: the error variants keep a 0px Negative stroke on the Field instance, which draws nothing.
    ...["Inputted-Error", "Blank-Error"].map((State) => ({ vp: { State }, layer: "Field", prop: "stroke", code: "none", note: "A 0px stroke on the Field instance draws nothing." })),
    // Small Typing: Figma's 20px Cursor makes the first line 20 tall, so the 16px text sits 2px lower; the caret is the line.
    { vp: { Size: "Small", State: "Typing" }, layer: `Field > Container > ${content} > Text`, prop: "y", code: 26, note: "Figma's 20px Cursor centres the 16px Small line 2px lower; the browser's caret is the line's height." },
  ],
  map: [
    ...fieldMap({ content, textBox: ["w", "x", "y"], cursorBox: ["x"] }),
    ...helpMap(),
  ],
};
