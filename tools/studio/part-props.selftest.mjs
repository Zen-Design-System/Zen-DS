#!/usr/bin/env node
// Self-test of the part props (tools/studio/part-props-build.mjs → partProps.generated.ts) and of forwardedProps
// (inspector/partForwarding.ts): a deep-selected part edits the owner props it is passed, like Figma's exposed nested
// instance properties (Modal/Forms › Buttons › Direction = ModalForm actionsDirection).
//   node tools/studio/part-props.selftest.mjs
import { PART_PROPS } from "../../src/platform/studio/inspector/partProps.generated.ts";
import { forwardedProps } from "../../src/platform/studio/inspector/partForwarding.ts";

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

// The Figma case: Modal/Forms and Modal/Dialog expose their Buttons (.Primitives/Modal/Actions) Direction.
check("ModalForm passes actionsDirection to ModalActions' direction", PART_PROPS.ModalForm?.ModalActions?.direction, "actionsDirection");
check("Dialog passes actionsDirection to ModalActions' direction", PART_PROPS.Dialog?.ModalActions?.direction, "actionsDirection");
check("SidePanel passes no direction (its actions stay horizontal)", PART_PROPS.SidePanel?.ModalActions?.direction, undefined);
// Plumbing is left out: DOM attributes, handlers, refs.
check("no data-, aria-, on…, className or ref entries", Object.values(PART_PROPS).flatMap((parts) => Object.values(parts).flatMap((props) => Object.keys(props))).filter((prop) => /^(?:data-|aria-|on[A-Z])|^(?:className|style|ref|key|id|children)$/.test(prop)), []);
// A capitalised local that names an element (`const Tag = … ? "button" : "div"`) is not a part.
check("Card's polymorphic Tag is not a part", PART_PROPS.Card?.Tag, undefined);

// forwardedProps: a direct part, a part behind wrappers, a chain through an internal component, a broken chain.
check("direct part", forwardedProps("ModalForm", ["ModalActions"], PART_PROPS).direction, "actionsDirection");
check("behind a wrapper (a Portal between the owner and the part)", forwardedProps("ModalForm", ["ZenPortal", "ModalActions"], PART_PROPS).direction, "actionsDirection");
const table = { Owner: { Middle: { mid: "own" } }, Middle: { Part: { leaf: "mid", other: "notPassed" } } };
check("through a component in between", forwardedProps("Owner", ["Middle", "Part"], table), { leaf: "own" });
check("a link the middle does not get breaks the chain", forwardedProps("Owner", ["Other", "Part"], table), {});
check("no chain, no props", forwardedProps("ModalForm", [], PART_PROPS), {});

if (failures.length) {
  console.error(`✗ part props selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ part props selftest: ${passed} checks pass.`);
