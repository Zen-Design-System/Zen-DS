// Figma .Primitives/Input/Field-Only 374:103464 (docs/figma-contracts/input-search-primitives.json): Size × 9 States, the
// box every Input field is built on (400px FIXED, XLarge 430), with its default Leading and Trailing: a Leading-Trailing
// Flag (Vietnam) · "VN" · chevron, at Size Small for a Small field, Medium for Medium and Large, Large for XLarge. Box,
// fill, Effect/Input, stroke and Focused ring (suites/_input-shared.mjs), the content text's style and row, and each slot's
// place: the Leading from the start, the Trailing from the end (the "VN" label decides what lies between them).
import { contentText, fieldMap, placeholderLineHeight, sizeOf, stateOf } from "./_input-shared.mjs";
import { at } from "./_chart-shared.mjs";

const slot = { Small: "sm", Medium: "md", Large: "md", XLarge: "lg" };
const lead = ".zen-input__affordance--leading .zen-input-leading-trailing";
const trail = ".zen-input__affordance--trailing .zen-input-leading-trailing";
export default {
  contract: "docs/figma-contracts/input-search-primitives.json",
  setId: "374:103464",
  kind: "inputFieldsText",
  root: ".zen-input-field",
  cases: (vp, { spec }) => ({
    width: spec.w, size: sizeOf(vp), state: stateOf(vp), slot: slot[vp.Size], "aria-label": "Field", ...contentText(at(spec, "Container > Content")),
    readOnly: vp.State === "Read-Only" || undefined, disabled: vp.State === "Disabled" || undefined,
  }),
  figmaExceptions: placeholderLineHeight("Container > Content > Text"),
  map: [
    ...fieldMap({ field: "", label: false, textBox: ["h", "y"], cursorBox: ["cy"] }),
    { figma: "Container > Leading", dom: lead, check: ["h", "x", "y"] },
    { figma: "Container > Leading > Flag", dom: `${lead} > .zen-flag`, check: ["size", "x", "y", "opacity"] },
    { figma: "Container > Leading > Elements", dom: `${lead} .zen-input-leading-trailing__elements`, check: ["h", "x", "y"] },
    { figma: "Container > Leading > Elements > Label", dom: `${lead} .zen-input-leading-trailing__label`, check: ["text", "h", "x", "y"] },
    { figma: "Container > Leading > Elements > Dropdown", dom: `${lead} .zen-input-leading-trailing__dropdown`, check: ["size", "y"] },
    { figma: "Container > Leading > Elements > Dropdown > Vector", dom: `${lead} .zen-input-leading-trailing__dropdown > .zen-icon`, check: ["fill"], fillVia: "color" },
    { figma: "Container > Trailing", dom: trail, check: ["h", "y", "right"] },
    { figma: "Container > Trailing > Flag", dom: `${trail} > .zen-flag`, check: ["size", "y", "opacity"] },
    { figma: "Container > Trailing > Elements > Label", dom: `${trail} .zen-input-leading-trailing__label`, check: ["text", "h", "y"] },
    { figma: "Container > Trailing > Elements > Dropdown", dom: `${trail} .zen-input-leading-trailing__dropdown`, check: ["size", "y", "right"] },
    { figma: "Container > Trailing > Elements > Dropdown > Vector", dom: `${trail} .zen-input-leading-trailing__dropdown > .zen-icon`, check: ["fill"], fillVia: "color" },
  ],
};
