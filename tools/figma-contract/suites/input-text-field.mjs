// Figma Input/Text-Field 421:4108 (docs/figma-contracts/input-search.json): Size Small–XLarge × 9 States, a 312px FILL
// field. Label (Body/Small/Regular), the Field-Only box (size, radius, fill, Effect/Input, stroke, Focused ring), the
// Input-Content text (placeholder or value: style, colour, place), the caret and the error Help-Text (suites/_input-shared.mjs).
import { fieldMap, fieldProps, helpMap, placeholderLineHeight } from "./_input-shared.mjs";

export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "421:4108",
  kind: "inputFieldsText",
  root: ".zen-input-field",
  cases: (vp, { spec }) => fieldProps(vp, spec),
  figmaExceptions: placeholderLineHeight("Field > Container > Content > Text"),
  map: [
    ...fieldMap(),
    ...helpMap(),
    { figma: "Field > Container > Leading", dom: ".zen-input__affordance--leading", check: [] },
    { figma: "Field > Container > Trailing", dom: ".zen-input__affordance--trailing", check: [] },
  ],
};
