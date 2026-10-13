#!/usr/bin/env node
// The icon picker's suggestions (./iconSuggestions.ts, imported directly: Node strips the types): the icons a file uses,
// the recent picks, the related icons and the picker's groups. Run: node src/platform/studio/inspector/iconSuggestions.selftest.mjs
import { iconGroups, iconsIn, iconStem, iconStyle, MAX_FILE_ICONS, MAX_RECENT_ICONS, relatedIcons, topicsOfWords, withRecent } from "./iconSuggestions.ts";

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
check("default, then the file's icons without it, then all", iconGroups(all, { defaultIcon: "icon-plus-line", fileIcons: ["icon-plus-line", "icon-heart-line"] }).map((group) => [group.id, group.names]), [
  ["default", ["icon-plus-line"]], ["file", ["icon-heart-line"]], ["all", ["icon-a", "icon-b"]],
]);
check("no default, no file icons: all only", iconGroups(all).map((group) => group.id), ["all"]);
check(`at most ${MAX_FILE_ICONS} file icons`, iconGroups(all, { fileIcons: Array.from({ length: 20 }, (_, index) => `icon-${index}`) })[0].names.length, MAX_FILE_ICONS);
check("default, recent, related, file, all; each icon once; never the icon shown", iconGroups(all, {
  defaultIcon: "icon-plus-line", current: "icon-coins-line",
  recent: ["icon-coins-line", "icon-wallet-01-line", "icon-plus-line"],
  related: ["icon-wallet-01-line", "icon-bank-line"],
  fileIcons: ["icon-bank-line", "icon-heart-line"],
}).map((group) => [group.id, group.names]), [
  ["default", ["icon-plus-line"]], ["recent", ["icon-wallet-01-line"]], ["related", ["icon-bank-line"]], ["file", ["icon-heart-line"]], ["all", ["icon-a", "icon-b"]],
]);
check(`at most ${MAX_RECENT_ICONS} recent icons`, iconGroups(all, { recent: Array.from({ length: 20 }, (_, index) => `icon-${index}`) })[0].names.length, MAX_RECENT_ICONS);

// Recent picks: the new one first, each once, capped.
check("a pick goes first, once", withRecent(["icon-a", "icon-b", "icon-c"], "icon-b"), ["icon-b", "icon-a", "icon-c"]);
check("recent picks are capped", withRecent(["icon-a", "icon-b", "icon-c"], "icon-d", 3), ["icon-d", "icon-a", "icon-b"]);

// Related: the stem and the style of a name, the topics of words, then the order the picker lists.
check("stem without prefix, style and number", ["icon-coins-stacked-01-solid", "icon-chevron-left-line-medium", "icon-x-close"].map(iconStem), ["coins-stacked", "chevron-left", "x-close"]);
check("style", ["icon-coins-01-solid", "icon-home-line", "icon-zen"].map(iconStyle), ["solid", "line", ""]);
check("words name topics in order, at most two", topicsOfWords("Active projects · revenue this week, 12 customers"), ["work", "money"]);
check("no topic in words that name none", topicsOfWords("Lorem ipsum"), []);
const set = [
  "icon-coins-stacked-01-solid", "icon-coins-stacked-01-line", "icon-coins-stacked-02-solid", "icon-coins-stacked-03-solid",
  "icon-coin-01-solid", "icon-coins-hand-solid", "icon-coins-swap-solid", "icon-coins-solid", "icon-chart-bar-solid",
  "icon-wallet-01-solid", "icon-wallet-02-solid", "icon-wallet-01-line", "icon-bank-solid", "icon-users-solid", "icon-user-solid",
  "icon-folder-solid", "icon-briefcase-solid", "icon-file-check-solid",
];
check("family (at most 4), then the words' topic, then the icon's topic; one per stem, same style", relatedIcons("icon-coins-stacked-01-solid", set, "Active users"), [
  "icon-coins-stacked-02-solid", "icon-coin-01-solid", "icon-coins-hand-solid", "icon-coins-swap-solid",
  "icon-users-solid", "icon-user-solid", "icon-coins-solid", "icon-wallet-01-solid", "icon-bank-solid",
]);
check("no icon shown: the words' topic in any style", relatedIcons(undefined, set, "Projects"), ["icon-folder-solid", "icon-briefcase-solid", "icon-file-check-solid"]);
check("nothing related to an unknown icon with no words", relatedIcons("icon-chart-bar-solid", set, ""), []);
check("related honours max", relatedIcons("icon-coins-stacked-01-solid", set, "", 3).length, 3);

if (failures.length) {
  console.error(`iconSuggestions selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ icon suggestions selftest: ${passed} checks pass.`);
