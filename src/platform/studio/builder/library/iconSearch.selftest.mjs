#!/usr/bin/env node
// Self-test of the library's icon and photo search (./iconSearch.ts with ./iconSynonyms.ts and the generated icon names,
// imported directly: Node strips the types). Run: node src/platform/studio/builder/library/iconSearch.selftest.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { iconNames } from "../../../../icons/generated/names.ts";
import { iconGlyphs, iconSynonymMap, searchIcons, searchPhotos } from "./iconSearch.ts";
import { ICON_SYNONYM_ROWS } from "./iconSynonyms.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

// Glyphs
const sample = iconGlyphs(["icon-trash-01-line", "icon-trash-01-solid", "icon-chevron-left-line-small", "icon-chevron-left-line-medium", "icon-zen"]);
check("line and solid are one glyph", sample.find((glyph) => glyph.id === "trash-01"), { id: "trash-01", label: "trash 01", words: ["trash", "01"], line: "icon-trash-01-line", solid: "icon-trash-01-solid" });
check("a cut-only drawing takes the medium cut", sample.find((glyph) => glyph.id === "chevron-left")?.line, "icon-chevron-left-line-medium");
check("a name without a style is a line glyph", sample.find((glyph) => glyph.id === "zen")?.line, "icon-zen");

const glyphs = iconGlyphs(iconNames);
const synonyms = iconSynonymMap(ICON_SYNONYM_ROWS);
check("every glyph names real icons", glyphs.every((glyph) => [glyph.line, glyph.solid].filter(Boolean).every((name) => iconNames.includes(name))) && glyphs.length > 900, true);

// Every synonym word exists in an icon name or a photo's alt text (read from PlatformMedia.tsx).
const here = path.dirname(fileURLToPath(import.meta.url));
const media = fs.readFileSync(path.join(here, "../../../PlatformMedia.tsx"), "utf8");
const fold = (text) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim();
const photoWords = new Set([...media.matchAll(/alt: "([^"]+)"/g)].flatMap((match) => fold(match[1]).split(" ")));
const iconWords = new Set(glyphs.flatMap((glyph) => glyph.words));
check("synonym words exist", ICON_SYNONYM_ROWS.flatMap(([, words]) => words).filter((word) => !iconWords.has(word) && !photoWords.has(word)), []);

const first = (query) => searchIcons(glyphs, query, synonyms)[0]?.id ?? null;
const firstWord = (query) => searchIcons(glyphs, query, synonyms)[0]?.words[0] ?? null;
for (const [query, word] of [
  ["trash", "trash"], ["xoá", "trash"], ["thùng rác", "trash"], ["bin", "trash"], ["home", "home"], ["nhà", "home"], ["heart", "heart"],
  ["tim", "heart"], ["thích", "heart"], ["user", "user"], ["người dùng", "user"], ["settings", "settings"], ["cài đặt", "settings"],
  ["searh", "search"], ["tìm kiếm", "search"], ["close", "x"], ["đóng", "x"], ["thêm", "plus"], ["lịch", "calendar"], ["bell", "bell"],
  ["thông báo", "bell"], ["khoá", "lock"], ["tải xuống", "download"], ["giỏ hàng", "shopping"], ["ảnh", "image"], ["thư", "mail"],
]) check(`icon "${query}" → ${word}…`, firstWord(query), word);
check("two words narrow it down", first("arrow left"), "arrow-left");
check("every word must match", searchIcons(glyphs, "trash zzzz", synonyms).length, 0);
check("an empty query lists every glyph", searchIcons(glyphs, "", synonyms).length, glyphs.length);

// Photos
const photos = [
  { key: "site-cafe", alt: "Café table with a coffee" },
  { key: "feed-snow-peaks", alt: "Snow-covered peaks under clouds" },
  { key: "mountain-road-tall", alt: "A mountain road curving above a green valley" },
];
const photo = (query) => searchPhotos(photos, query, synonyms).map((row) => row.key);
check("photo by alt", photo("coffee"), ["site-cafe"]);
check("photo in Vietnamese", photo("cà phê"), ["site-cafe"]);
check("photo synonym (núi → mountain, peaks)", photo("núi"), ["mountain-road-tall", "feed-snow-peaks"]);
check("photo by key word", photo("feed"), ["feed-snow-peaks"]);
check("no photo for nonsense", photo("zzzz"), []);

if (failures.length) {
  console.error(`icon search selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ icon search selftest: ${passed} checks pass.`);
