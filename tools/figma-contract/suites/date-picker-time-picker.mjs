// Figma .Primitives/Date-Picker/Time-Picker 460:38628 (docs/figma-contracts/datepicker-sidebar.json): `<DatePickerTimePicker>`
// in a frame as wide as the set (331). Type=Single stacks From over To (Input/Text-Field Small: Label, the field with the
// "hh:mm" placeholder and the AM/PM Leading-Trailing at its end) over Checkbox/Text "All day", Spacing/Gap/Medium apart;
// Type=Range puts From | To side by side (Gap/Medium), each field over its All day (Gap/XSmall). The fields' and the
// checkbox's own parts have suites of their own (input-text-field, checkbox): here their places, sizes and text styles.
import { placeholderLineHeight } from "./_input-shared.mjs";

const fieldMap = (figma, dom, when) => [
  { figma, dom, check: ["size", "x", "y"], when },
  { figma: `${figma} > Label > Content > Label`, dom: `${dom} .zen-input-label__text`, check: ["h", "x", "y", "text"], when },
  { figma: `${figma} > Field`, dom: `${dom} .zen-input__control`, check: ["size", "x", "y", "radius"], when },
  { figma: `${figma} > Field > Container`, dom: `${dom} .zen-input__control::before`, check: ["fill", "fx"], when },
  { figma: `${figma} > Field > Container > Content > Text`, dom: `${dom} .zen-input__native::placeholder`, check: ["text"], when },
  { figma: `${figma} > Field > Container > Trailing`, dom: `${dom} .zen-input__affordance--trailing`, check: ["h", "y", "right"], when },
];
const checkboxMap = (figma, dom, when) => [
  { figma, dom, check: ["size", "x", "y"], when },
  { figma: `${figma} > Container > Content > Content > Label`, dom: `${dom} .zen-checkbox__label`, check: ["h", "x", "y", "text"], when },
];
const single = (vp) => vp.Type === "Single";
const range = (vp) => vp.Type === "Range";
const side = (k) => `.zen-date-picker__time-side:nth-child(${k + 1})`;
export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "460:38628",
  kind: "dpTime",
  root: ".zen-date-picker__time",
  cases: (vp, { spec }) => ({ width: spec.w, type: vp.Type.toLowerCase(), value: { from: null, to: null } }),
  figmaExceptions: [
    ...placeholderLineHeight("Range-Time > From > Field > Container > Content > Text"),
    ...placeholderLineHeight("Range-Time > To > Field > Container > Content > Text"),
    ...placeholderLineHeight("Range-Time > From > From > Field > Container > Content > Text"),
    ...placeholderLineHeight("Range-Time > To > To > Field > Container > Content > Text"),
    // Range: the From field is FIXED 64 high (12px under its field) where To hugs 52; code sizes both sides alike (52), so
    // From's All day sits where To's does and the row is 80, not 92.
    ...[["(root)", "h", 80], ["Range-Time", "h", 80], ["Range-Time > From", "h", 80], ["Range-Time > To", "h", 80], ["Range-Time > From > From", "h", 52], ["Range-Time > From > Checkbox/Text", "y", 60], ["Range-Time > From > Checkbox/Text > Container > Content > Content > Label", "y", 60]]
      .map(([layer, prop, code]) => ({ vp: { Type: "Range" }, layer, prop, code, note: "Figma slip: Range's From Text-Field is FIXED 64 (To hugs 52); code gives both sides the hugging field" })),
  ],
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    { figma: "Range-Time", dom: ".zen-date-picker__time-fields", check: ["size", "x", "y"], when: single },
    ...fieldMap("Range-Time > From", ".zen-date-picker__time-fields > .zen-input-field:nth-child(1)", single),
    ...fieldMap("Range-Time > To", ".zen-date-picker__time-fields > .zen-input-field:nth-child(2)", single),
    ...checkboxMap("Checkbox/Text", ".zen-date-picker__time > .zen-checkbox", single),
    // Range: the root is Range-Time itself (one row of two sides).
    { figma: "Range-Time", dom: ":root", check: ["size"], when: range },
    ...[["From", 0], ["To", 1]].flatMap(([name, k]) => [
      { figma: `Range-Time > ${name}`, dom: side(k), check: ["size", "x", "y"], when: range },
      ...fieldMap(`Range-Time > ${name} > ${name}`, `${side(k)} > .zen-input-field`, range),
      ...checkboxMap(`Range-Time > ${name} > Checkbox/Text`, `${side(k)} > .zen-checkbox`, range),
    ]),
  ],
};
