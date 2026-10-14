#!/usr/bin/env node
// toneRules.ts (imported directly: Node strips the types) against the harness rule it warns about ahead of time:
// every `<family>-light` tone the harness flags on a Text is "Not for text" in the picker, and nothing else is.
// Run: node src/platform/studio/inspector/toneRules.selftest.mjs
import { contentTones } from "../../../components/_shared/contentTone.ts";
import { rules } from "../../../../tools/usage-guard/check-usage.mjs";
import { toneWarning } from "./toneRules.ts";

const failures = [];
let passed = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const lights = rules.find((rule) => rule.id === "content/lights-no-light-text");
check("the harness rule exists", Boolean(lights), true);
for (const tone of contentTones.filter((name) => name.endsWith("-light"))) {
  const flagged = Boolean(lights?.check({ attrs: `tone="${tone}"`, body: "", selector: "" }));
  check(`${tone} on a Text: the picker says "Not for text" exactly when the harness flags it`, toneWarning(tone, "Text") === "Not for text (fails contrast)", flagged);
}
check("Neutral light on a Text: tertiary text, no warning", toneWarning("light", "Text"), null);
check("Neutral light on a Heading: not for titles", toneWarning("light", "Heading"), "Not for titles");
check("a colour Light on a Text: status or help text only", toneWarning("info-light", "Text"), "Short status or help text only");
check("an overlay Light on a Text: no warning", toneWarning("on-black-overlay-light", "Text"), null);
check("any tone on an Icon: no warning", toneWarning("accent-light", "Icon"), null);
check("a Base level: no warning", toneWarning("accent-base", "Heading"), null);

if (failures.length) {
  console.error(`toneRules selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`toneRules selftest: ${passed} checks passed`);
