// Figma Input/Select-Field 421:7303 (docs/figma-contracts/input-search.json): Size Small–XLarge × 9 States. The Text-Field
// layout (suites/_input-shared.mjs) with the value on the trigger button (placeholder: .zen-select__placeholder) and the
// Trailing Leading-Trailing's chevron (Dropdown) at the end of the field. The trigger is a button, so the Typing variant's
// Cursor has no caret to compare (not mapped).
import { fieldMap, fieldProps, helpMap, placeholderLineHeight, smallGapExceptions } from "./_input-shared.mjs";

const trailing = "Field > Container > Trailing";
export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "421:7303",
  kind: "inputFieldsSelect",
  root: ".zen-input-field",
  cases: (vp, { spec }) => {
    const { defaultValue, ...props } = fieldProps(vp, spec);
    return { ...props, options: [{ label: defaultValue ?? "Option", value: "v" }], defaultValue: defaultValue === undefined ? undefined : "v" };
  },
  figmaExceptions: [
    ...placeholderLineHeight("Field > Container > Content > Text"),
    ...smallGapExceptions(),
    // Figma-side inconsistency (ask the designer): Select-Field Small alone puts a Leading-Trailing Size=Medium (20px
    // chevron, 4px taller than the 16px glyph) in its Trailing; Date-Field Small and Field-Only Small use Size=Small (16).
    ...[[trailing, 16], [`${trailing} > Elements > Dropdown`, 16]].flatMap(([layer, px]) => [["w", px], ["h", px], ["x", 288], ["y", 28]].map(([prop, code]) => ({
      vp: { Size: "Small" }, layer, prop, code, note: "Select-Field Small uses Leading-Trailing Size=Medium (20px chevron); Date-Field and Field-Only Small use Size=Small (16px), as code.",
    }))),
    { vp: { Size: "Small" }, layer: "Field > Container > Content > Text", prop: "w", code: 270, note: "The text fills what the 16px chevron leaves (see Trailing)." },
  ],
  map: [
    ...fieldMap({ native: ".zen-select__trigger", placeholder: ".zen-select__placeholder", cursor: false }),
    ...helpMap(),
    { figma: trailing, dom: ".zen-input__affordance--trailing", check: ["size", "x", "y"] },
    { figma: `${trailing} > Elements > Dropdown`, dom: ".zen-input__affordance--trailing > .zen-icon", check: ["size", "x", "y"] },
    { figma: `${trailing} > Elements > Dropdown > Vector`, dom: ".zen-input__affordance--trailing > .zen-icon", check: ["fill"], fillVia: "color" },
  ],
};
