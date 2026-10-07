#!/usr/bin/env node
// Zen Studio Grid columns selftest: the pure helpers of ./gridTracks.ts (imported directly: Node strips the types) that
// resize and spacing use to read and write a Grid's px columns, without a browser.
//   node src/platform/studio/select/gridTracks.selftest.mjs     summary; exit 1 on any failure
import { columnsOp, columnsSource, pxTrack, spanOf, splitTracks, withTrack, withTrackPx } from "./gridTracks.ts";

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

/* ── splitTracks ── */
check("split: minmax + fr", splitTracks("minmax(0, 320px) 1fr"), ["minmax(0, 320px)", "1fr"]);
check("split: extra spaces (inside a track kept as written)", splitTracks("  2fr   minmax( 0 ,  1fr )  "), ["2fr", "minmax( 0 ,  1fr )"]);
check("split: repeat → null", splitTracks("repeat(3, minmax(0, 1fr))"), null);
check("split: named lines → null", splitTracks("[main] 1fr [aside] 320px"), null);
check("split: unbalanced → null", splitTracks("minmax(0, 320px 1fr"), null);
check("split: empty → null", splitTracks("   "), null);

/* ── pxTrack ── */
check("px: fixed", pxTrack("320px")?.px, 320);
check("px: fixed write", pxTrack("320px")?.write(240), "240px");
check("px: minmax max", pxTrack("minmax(0, 320px)")?.px, 320);
check("px: minmax keeps its min", pxTrack("minmax(0, 320px)")?.write(240), "minmax(0, 240px)");
check("px: minmax px min above the new max drops with it", pxTrack("minmax(200px, 320px)")?.write(160), "minmax(160px, 160px)");
check("px: minmax px min below stays", pxTrack("minmax(200px, 320px)")?.write(280), "minmax(200px, 280px)");
check("px: fr → null", pxTrack("1fr"), null);
check("px: minmax fr → null", pxTrack("minmax(0, 1fr)"), null);
check("px: auto → null", pxTrack("auto"), null);
check("px: percent → null", pxTrack("30%"), null);

/* ── withTrackPx ── */
check("with: first column", withTrackPx("minmax(0, 320px) 1fr", 0, 240), "minmax(0, 240px) 1fr");
check("with: aside column", withTrackPx("minmax(0, 1fr) 320px", 1, 360), "minmax(0, 1fr) 360px");
check("with: fr column → null", withTrackPx("minmax(0, 320px) 1fr", 1, 240), null);
check("with: out of range → null", withTrackPx("320px 1fr", 4, 240), null);

/* ── withTrack (Hug on a px column writes auto) ── */
check("track: px column → auto", withTrack("240px 1fr", 0, "auto"), "auto 1fr");
check("track: minmax column → auto", withTrack("minmax(0, 320px) 1fr", 0, "auto"), "auto 1fr");
check("track: out of range → null", withTrack("240px 1fr", 2, "auto"), null);

/* ── columnsSource ── */
const attr = (extra) => ({ name: "columns", raw: "", line: 1, ...extra });
const responsive = attr({
  kind: "expression",
  value: '{ mobile: 1, desktop: "minmax(0, 320px) 1fr" }',
  shape: { type: "object", fields: [{ key: "mobile", kind: "number", value: 1 }, { key: "desktop", kind: "string", value: "minmax(0, 320px) 1fr" }] },
});
check("source: desktop field", columnsSource([responsive], "desktop"), { list: "minmax(0, 320px) 1fr", field: "desktop" });
check("source: mobile count → null", columnsSource([responsive], "mobile"), null);
check("source: tablet falls back to desktop", columnsSource([responsive], "tablet"), { list: "minmax(0, 320px) 1fr", field: "desktop" });
const tabletOnly = attr({ kind: "expression", value: '{ tablet: "200px 1fr" }', shape: { type: "object", fields: [{ key: "tablet", kind: "string", value: "200px 1fr" }] } });
check("source: desktop reads tablet", columnsSource([tabletOnly], "desktop"), { list: "200px 1fr", field: "tablet" });
check("source: string attribute", columnsSource([attr({ kind: "string", value: "2fr 320px" })], "mobile"), { list: "2fr 320px", field: null });
check("source: string in braces", columnsSource([attr({ kind: "expression", value: '"2fr 320px"' })], "desktop"), { list: "2fr 320px", field: null });
check("source: count → null", columnsSource([attr({ kind: "expression", value: "3" })], "desktop"), null);
check("source: bound → null", columnsSource([attr({ kind: "expression", value: "layout.columns" })], "desktop"), null);
const spreadInside = attr({ kind: "expression", value: '{ ...base, desktop: "320px 1fr" }', shape: { type: "object", fields: [{ key: "…", kind: "spread", value: "base" }, { key: "desktop", kind: "string", value: "320px 1fr" }] } });
check("source: spread in the object → null", columnsSource([spreadInside], "desktop"), null);
check("source: a spread attribute is not columns", columnsSource([{ name: "…", kind: "spread", raw: "{...rest}", line: 1 }], "desktop"), null);
check("source: none → null", columnsSource([], "desktop"), null);

/* ── columnsOp ── */
check("op: field", columnsOp({ list: "x", field: "desktop" }, "minmax(0, 240px) 1fr"), { op: "setField", name: "columns", key: "desktop", value: { kind: "string", value: "minmax(0, 240px) 1fr" } });
check("op: prop", columnsOp({ list: "x", field: null }, "240px 1fr"), { op: "setProp", name: "columns", value: { kind: "string", value: "240px 1fr" } });

/* ── spanOf ── */
const spans = [{ from: 0, to: 320 }, { from: 332, to: 1000 }];
check("span: inside the first", spanOf(spans, 0, 240), { first: 0, last: 0 });
check("span: across both", spanOf(spans, 100, 600), { first: 0, last: 1 });
check("span: a pixel of overlap does not count", spanOf(spans, 319.5, 330), null);

console.log(`gridTracks selftest: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
}
