// Detach for builder pages (Studio builder GĐ4 M4, spec docs/research/studio-builder-instance-spec-2026-10-07.md §3d):
// the detach recipes as a lazy chunk of their own, loaded the first time a builder page asks whether an element can be
// detached. Importing detach.mjs registers its edits with jsx-source.mjs (registerDetach), so op "detach" then runs in the
// browser engine (browser-engine.mjs) as on the dev server; the engine chunk itself stays without them.
// Types: browser-detach.d.mts.
export { detachPlan } from "./detach.mjs";
