// Figma Input/Number-Align-Center 450:7900 (docs/figma-contracts/input-search.json): Size Small–XLarge × 9 States. The
// Text-Field layout (suites/_input-shared.mjs) with a 24px Button/Icon-Main 2XSmall Tertiary stepper on each side (− value +)
// and the number centred between them (its centre compares; the copy decides its width). Read-Only draws no steppers.
import { disabledStepperExceptions, fieldMap, fieldProps, helpMap, placeholderLineHeight, smallGapExceptions } from "./_input-shared.mjs";

const slots = [["Field > Container > Leading", ".zen-input__affordance--leading > .zen-button"], ["Field > Container > Trailing", ".zen-input__affordance--trailing > .zen-button"]];
export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "450:7900",
  kind: "inputFieldsNumber",
  root: ".zen-input-field",
  cases: (vp, { spec }) => {
    const { defaultValue, ...props } = fieldProps(vp, spec);
    return { ...props, align: "center", defaultValue: defaultValue === undefined ? null : Number(defaultValue) };
  },
  figmaExceptions: [
    ...placeholderLineHeight("Field > Container > Content > Text"),
    ...smallGapExceptions(slots.flatMap(([layer]) => [[layer, "y", 24], [`${layer} > Container > Leading-Icon`, "y", 30]])),
    ...disabledStepperExceptions(slots.map(([layer]) => layer)),
    // Figma-side inconsistency (ask the designer): only this set's − stepper draws a 16px icon (Element-Size/Popular/Small,
    // Content/Neutral/Strongest); its + and both Number-Align-Left steppers use Button/Icon-Size/2XSmall (12), as code.
    // (Small's y is the gap exception's.)
    ...[["Small", 14], ["Medium (Base)", 18, 38], ["Large", 22, 42], ["XLarge", 22, 46]].flatMap(([Size, x, y]) => [["w", 12], ["h", 12], ["x", x], ["y", y]].filter(([, code]) => code !== undefined).map(([prop, code]) => ({
      vp: { Size }, layer: `${slots[0][0]} > Container > Leading-Icon`, prop, code, note: "Only Number-Align-Center's − stepper has a 16px icon; its + and Number-Align-Left's use the 12px 2XSmall button icon, as code.",
    }))),
    // Figma centres the typed number and its 1.5px Cursor together (0.75px left); the browser centres the text alone.
    { vp: { State: "Typing" }, layer: "Field > Container > Content > Text", prop: "cx", code: 157, note: "Figma centres text + Cursor together; the browser centres the text and draws the caret after it." },
  ],
  map: [
    ...fieldMap({ textBox: ["h", "y", "cx"], cursorBox: ["cy"] }),
    ...helpMap(),
    ...slots.flatMap(([layer, dom]) => [
      { figma: layer, dom, check: ["size", "x", "y"] },
      // Read-Only hides the whole slot (its hidden instance still lists visible children).
      { figma: `${layer} > Container`, dom, check: ["fill", "radius"], when: (vp) => vp.State !== "Read-Only" },
      { figma: `${layer} > Container > Leading-Icon`, dom: `${dom} .zen-icon`, check: ["size", "x", "y"], when: (vp) => vp.State !== "Read-Only" },
      { figma: `${layer} > Container > Leading-Icon > Vector`, dom: `${dom} .zen-icon`, check: ["fill"], fillVia: "color", when: (vp) => vp.State !== "Read-Only" },
    ]),
  ],
};
