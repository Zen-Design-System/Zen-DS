#!/usr/bin/env node
// Self-test of the Studio library search (./search.ts with ./synonyms.ts, ./keywords.generated.ts and the slot palette,
// imported directly: Node strips the types). Run: node src/platform/studio/builder/library/search.selftest.mjs
import { PALETTE } from "../../slots/palette.ts";
import { GUIDELINE_KEYWORDS } from "./keywords.generated.ts";
import { fold, paletteEntries, searchLibrary, synonymMap, tokensOf, withinOneEdit } from "./search.ts";
import { SYNONYM_ROWS } from "./synonyms.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const entries = paletteEntries(PALETTE, GUIDELINE_KEYWORDS);
const synonyms = synonymMap(SYNONYM_ROWS);
const top = (query, count = 1) => searchLibrary(entries, query, synonyms).slice(0, count).map((entry) => entry.id);
const ids = (query) => searchLibrary(entries, query, synonyms).map((entry) => entry.id);

// Folding
check("fold marks", fold("Hộp Thoại"), "hop thoai");
check("fold đ", fold("Đường kẻ"), "duong ke");
check("fold punctuation", fold("  Input-Field!! "), "input field");

// One edit
check("added", withinOneEdit("buton", "button"), true);
check("swapped", withinOneEdit("tabel", "table"), true);
check("changed", withinOneEdit("dialig", "dialog"), true);
check("two apart", withinOneEdit("btn", "button"), false);

// Phrases
check("a phrase is one token", tokensOf("hộp thoại xác nhận", synonyms).map((token) => token.text), ["hop thoai", "xac nhan"]);
check("plain words stay words", tokensOf("primary zzz", synonyms).map((token) => token.text), ["primary", "zzz"]);

// Every synonym points at a palette item
const known = new Set(PALETTE.map((item) => item.id));
check("synonym ids exist", SYNONYM_ROWS.flatMap(([, rowIds]) => rowIds).filter((id) => !known.has(id)), []);
check("synonym terms fold to something", SYNONYM_ROWS.flatMap(([terms]) => terms).filter((term) => !fold(term)), []);
check("entries carry guideline keywords", entries.find((entry) => entry.id === "dialog").keywords.includes("confirm"), true);

// What people type → the best item first
const firsts = [
  ["button", "button"], ["Button", "button"], ["primary", "button-primary"], ["buton", "button"], ["nút", "button"], ["cta", "button-primary"],
  ["modal", "dialog"], ["popup", "dialog"], ["hộp thoại", "dialog"], ["hop thoai", "dialog"], ["dialg", "dialog"], ["confirm", "dialog"],
  ["dropdown", "select-field"], ["chọn", "select-field"], ["switch", "toggle"], ["công tắc", "toggle"], ["bật tắt", "toggle"],
  ["tab", "tabs"], ["tabel", "table"], ["bảng", "table"], ["biểu đồ", "chart-card"], ["chart", "chart-card"],
  ["date", "date-picker"], ["date field", "date-field"], ["lịch", "date-picker"], ["text field", "input-field"], ["textbox", "input-field"],
  ["ô nhập", "input-field"], ["ảnh", "image"], ["photo", "image"], ["ảnh đại diện", "avatar"], ["avatar", "avatar"], ["kpi", "metric"],
  ["empty", "empty-state"], ["loading", "skeleton"], ["upload", "file-upload"], ["tải lên", "file-upload"], ["kebab", "menu"], ["menu", "menu"],
  ["drawer", "side-panel"], ["bottom sheet", "bottom-sheet"], ["tooltip", "tooltip"], ["layout", "stack"], ["grid", "grid"],
  ["đường kẻ", "divider"], ["faq", "accordion"], ["tiêu đề", "heading"], ["heading", "heading"], ["filter", "chip-row"],
  ["checkbox", "checkbox"], ["radio", "radio-group"], ["slider", "slider"], ["calendar", "date-picker"], ["breadcrumb", "breadcrumbs"],
  ["navbar", "top-navigation"], ["thanh bên", "sidebar"], ["trò chuyện", "chat-thread"], ["trợ lý", "ai-chat"],
];
for (const [query, id] of firsts) check(`"${query}" → ${id}`, top(query)[0], id);

// Order and filtering
check("Button before Button row", top("button", 2), ["button", "button-row"]);
check("Tabs before Table for tab", ids("tab").indexOf("tabs") < ids("tab").indexOf("table"), true);
check("modal also offers Modal form", top("modal", 2), ["dialog", "modal-form"]);
check("every word must match", ids("button xyzzy"), []);
check("nothing for nonsense", ids("xyzzy"), []);
check("an empty query lists everything in order", ids("").length, PALETTE.length);
check("button row as words", top("button row")[0], "button-row");

if (failures.length) {
  console.error(`library search selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ library search selftest: ${passed} checks pass.`);
