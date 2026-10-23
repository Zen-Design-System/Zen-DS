// Figma Input/Number-Align-Left 421:10057 (docs/figma-contracts/input-search.json): Size Small–XLarge × 9 States. The
// Text-Field layout (suites/_input-shared.mjs) with the number left-aligned and .Primitives/Input/Number/Trailing at the end:
// two 24px Button/Icon-Main 2XSmall Tertiary steppers (− +), Spacing/Gap/2XSmall apart. The buttons' own look is the
// Icon-Main suite's; here their box, place, fill and icon.
import { disabledStepperExceptions, fieldMap, fieldProps, helpMap, placeholderLineHeight, smallGapExceptions } from "./_input-shared.mjs";

const trailing = "Field > Container > Trailing";
const stepper = (i) => `.zen-number__steppers > .zen-button:nth-child(${i + 1})`;
const shown = (vp) => vp.State !== "Read-Only";
export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "421:10057",
  kind: "inputFieldsNumber",
  root: ".zen-input-field",
  cases: (vp, { spec }) => {
    const { defaultValue, ...props } = fieldProps(vp, spec);
    return { ...props, align: "left", defaultValue: defaultValue === undefined ? null : Number(defaultValue) };
  },
  figmaExceptions: [
    ...placeholderLineHeight("Field > Container > Content > Text"),
    ...smallGapExceptions([
      [trailing, "y", 24],
      ...[0, 1].flatMap((i) => [[`${trailing} > Button/Icon-Main#${i}`, "y", 24], [`${trailing} > Button/Icon-Main#${i} > Container > Leading-Icon`, "y", 30]]),
    ]),
    // Documented code decision (NumberField JSDoc): Read-Only hides the steppers, as Number-Align-Center Read-Only draws none.
    { vp: { State: "Read-Only" }, layer: trailing, prop: "exists", note: "NumberField hides the steppers in Read-Only (JSDoc); Number-Align-Center Read-Only has none either." },
    ...disabledStepperExceptions([0, 1].map((i) => `${trailing} > Button/Icon-Main#${i}`)),
  ],
  map: [
    ...fieldMap(),
    ...helpMap(),
    { figma: trailing, dom: ".zen-number__steppers", check: ["size", "x", "y"] },
    ...[0, 1].flatMap((i) => [
      { figma: `${trailing} > Button/Icon-Main#${i}`, dom: stepper(i), check: ["size", "x", "y"], when: shown },
      { figma: `${trailing} > Button/Icon-Main#${i} > Container`, dom: stepper(i), check: ["fill", "radius"], when: shown },
      { figma: `${trailing} > Button/Icon-Main#${i} > Container > Leading-Icon`, dom: `${stepper(i)} .zen-icon`, check: ["size", "x", "y"], when: shown },
      { figma: `${trailing} > Button/Icon-Main#${i} > Container > Leading-Icon > Vector`, dom: `${stepper(i)} .zen-icon`, check: ["fill"], fillVia: "color", when: shown },
    ]),
  ],
};
