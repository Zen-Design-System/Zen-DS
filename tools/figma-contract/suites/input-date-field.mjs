// Figma Input/Date-Field 421:8388 (docs/figma-contracts/input-search.json): Size Small–XLarge × 9 States. The Text-Field
// layout (suites/_input-shared.mjs) plus the Trailing calendar (Leading-Trailing Elements › icon-calendar-line: Small 16,
// Base 20 from Medium up; Active=No → Content/Disabled in Read-Only and Disabled). The calendar popover stays closed.
import { fieldMap, fieldProps, helpMap, placeholderLineHeight, smallGapExceptions } from "./_input-shared.mjs";

const trailing = "Field > Container > Trailing";
export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "421:8388",
  kind: "inputFieldsDate",
  root: ".zen-input-field",
  cases: (vp, { spec }) => fieldProps(vp, spec),
  figmaExceptions: [
    ...placeholderLineHeight("Field > Container > Content > Text"),
    ...smallGapExceptions([
      [trailing, "y", 28], [`${trailing} > Elements > Leading-Icon`, "y", 28],
    ]),
  ],
  map: [
    ...fieldMap(),
    ...helpMap(),
    { figma: trailing, dom: ".zen-input__affordance--trailing", check: ["size", "x", "y"] },
    { figma: `${trailing} > Elements > Leading-Icon`, dom: ".zen-input__affordance--trailing > .zen-icon", check: ["size", "x", "y"] },
    { figma: `${trailing} > Elements > Leading-Icon > Vector`, dom: ".zen-input__affordance--trailing > .zen-icon", check: ["fill"], fillVia: "color" },
  ],
};
