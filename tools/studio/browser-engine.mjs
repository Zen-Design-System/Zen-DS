// The Studio edit engine as the browser loads it for builder pages (Studio builder GĐ2, spec
// docs/research/studio-builder-pages-spec-2026-10-06.md §3 2a): the same modules the dev server runs, no Node imports
// (engine-iso.selftest.mjs checks it). src/platform/studio/builder/engine.ts imports it lazily, so the parser only loads
// when a local page opens. Types: browser-engine.d.mts.
export { applyOps, changedRange, describeElement, sha1 } from "./jsx-source.mjs";
export { describeSlots, withSlots, requiredFromApi } from "./slots.mjs";
export { dataFieldEdit, originsOf } from "./data-source.mjs";
export { newPageText, pageHeader, parsePage, validateDialect } from "./dialect.mjs";
