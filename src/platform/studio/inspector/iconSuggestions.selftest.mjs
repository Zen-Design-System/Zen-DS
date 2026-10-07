#!/usr/bin/env node
// The icon picker's suggestions (./iconSuggestions.ts, imported directly: Node strips the types): the icons a file uses
// and the picker's groups. Run: node src/platform/studio/inspector/iconSuggestions.selftest.mjs
import { iconGroups, iconsIn, MAX_FILE_ICONS } from "./iconSuggestions.ts";

const failures = [];
let passed = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const known = new Set(["icon-heart-line", "icon-plus-line", "icon-x-close", "icon-home-03-solid"]);
const text = `<Button startIcon="icon-plus-line" />\n<Icon name='icon-heart-line' />\nconst a = { icon: "icon-plus-line" };\n<Tag leading={\`icon-x-close\`} />\n<Icon name="icon-not-a-glyph" /> // icon-home-03-solid in a comment`;
check("icons in order, once, quoted and known only", iconsIn(text, known), ["icon-plus-line", "icon-heart-line", "icon-x-close"]);
check("nothing in a text without icons", iconsIn("<Stack gap=\"md\" />", known), []);

const all = ["icon-a", "icon-b"];
check("default, then the file's icons without it, then all", iconGroups(all, "icon-plus-line", ["icon-plus-line", "icon-heart-line"]).map((group) => [group.id, group.names]), [
  ["default", ["icon-plus-line"]], ["file", ["icon-heart-line"]], ["all", ["icon-a", "icon-b"]],
]);
check("no default, no file icons: all only", iconGroups(all, undefined, []).map((group) => group.id), ["all"]);
check(`at most ${MAX_FILE_ICONS} file icons`, iconGroups(all, undefined, Array.from({ length: 20 }, (_, index) => `icon-${index}`))[0].names.length, MAX_FILE_ICONS);

if (failures.length) {
  console.error(`iconSuggestions selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ icon suggestions selftest: ${passed} checks pass.`);
