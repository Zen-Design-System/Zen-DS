# Session log 2026-10-22

## Select matching layers ⌥⌘A + Select all with same › (Session A, branch `zen/feat/studio-select-matching-20261022`)

The user's ask, relayed by the progress session: "điều phối cho session nhận scope chưa ai nhận đi". ⌥⌘A was one of
the four ❌ keys of the walk's §2a.

**Spec questions answered by the user in session A:**
- Figma's rule, from help.figma.com "Identify matching objects": a match is an identical layer in another frame, with
  the same name, the same parent names and the same place in the hierarchy. A layer in a Section matches only inside
  that Section, and a text that was never renamed matches by its text style.
- Studio numbers auto names per page, so the user picked "as Figma, without the auto numbers". A given name must be
  equal. An auto name compares by its kind. An instance compares by its component and variant (the Figma variant axes
  from variantSets.generated). A text compares by its text style.
- "Select all with same ›" is built in the same PR. It searches the whole page:
  - Fill compares Shape `fill`, frame `surface` and text `tone`.
  - Stroke compares Shape `stroke` and frame `border`.
  - Effect compares `effectStyle`.
  - Text properties compares `textStyle`.
  - Font compares the text style's family and weight.
  - Instance compares the component.
  - Properties compares the type and the paint props.

**Code:**
- `edit/matchModel.ts` is pure, with a selftest of 21 checks in studio:selftest.
- `edit/selectMatching.ts` maps the locs to rendered layers, leaving out locked and unrendered ones, and selects them
  with the source as primary.
- `select/layerMeta.ts` now keeps the page board (`pageBoardOf`).
- The entry points:
  - the ⌥⌘A key in figmaKeys, which works on view-only pages too;
  - its entry in figmaNotYet is removed;
  - the layer menu items "Select matching layers" and "Select all with same ›" (the list opens in place);
  - Quick actions;
  - the Shortcuts row;
  - `selectMatchingShortcut` in modKey (Ctrl+Alt+A off a Mac).
- E2E FW-175…179 (figma group).
- The worktree had no `uqr` (added by #191), so it was copied from the main checkout (memory: worktree node_modules).
- **Found by FW-178/179:** a right-click on a selected layer's resize handle opened no menu, because the handle only
  prevented the browser's menu. A short text at 53 % zoom is mostly handles. ResizeLayer now passes the right-click to
  SelectionLayer's onContextMenu (one prop, as SpacingLayer does). FW-178 right-clicks the text's left handle.
- **E2E:** FW-175…179 pass alone, 5 / 5 (after merging `main` f7e8708f). The test right-clicks off a selected ellipse's
  middle, since the arc dot is a handle of its own.

## QA gate: shards sized from measured time (gate-shards session, branch `zen/fix/qa-gate-shards-20261022`)

Asked by the progress session: every full gate failed on time limits, not findings. Bug's card-theme gate (12:47): the
4 main audit shards (~15 pages each, 12 Chromium processes at once) all passed the 30-min cap and wrote no report; the
Studio E2E (338 rows, one process, ~25 min on a quiet machine) passed its 40-min cap ("no summary · 2400s"). Earlier
E2E steps ran 3163–3377 s against that cap: the limit was sent to `npm`, not to the harness.

- **Audit / dark / behaviour:** `planShards` (tools/qa/lib.mjs) packs pages into shards of ~10 min from each page's last
  time (`.qa/timings.json`, measured by the gate from the "✓|⚠|✗ page@width" line each page prints, in awake time);
  untimed pages take the median, else `PAGE_SECONDS`. All shards share one pool of `ZEN_QA_SHARDS` (2) processes per
  job, main audit first. A shard stops at max(30 min, 3× plan); one without a report fails its step and names its pages.
- **Studio E2E:** `--list` counts the rows, `planE2E` picks n shards of ~10 min from the last seconds per row, the gate
  runs `node tools/studio/e2e/run.mjs --shard=k/n --budget=<s>` one after another (SIGTERM, then SIGKILL, at budget +
  10 min) and writes one combined report `.qa/studio-e2e/<stamp>-gate.md`. The runner's `--budget` starts no row after
  it (rows left: `notRun`, exit 1); SIGTERM/SIGINT put the disk back before it exits.
- `tools/qa/selftest.mjs` (`npm run qa:selftest`, 26 checks), run by the gate when `tools/qa` is in scope (auxKind "qa").
- **Full gate 17:08–18:43 (`--all --isolated`, main 6f894b5e):** static all ✓ (81/81 Vitest, all contract suites);
  audit ✓ 21 shards, 1484 s, 0 errors, 61 baseline; dark ✓ 2 shards, 107 s; behaviour ⚠ 7 shards, 455 s, 1 new warning
  (below); E2E shards 1/3 387 s and 2/3 599 s, 225 rows, 0 broken; contact sheets ✓. No step was killed.
- **The Mac slept 17:50–18:36 during E2E shard 3/3:** rows ST-12/23/24 took 352–970 s of wall time and still worked
  (row timers stop during sleep), but `--budget` measured `Date.now()`, so the last 95 rows were reported as not run
  (✗, with a full report). Fixed: the budget and the page timings use `performance.now()` (awake time). Shard 3/3
  re-run alone: 113 works · 0 broken · 540 s, exit 0. E2E total 338/338 works, 0 broken (387 + 599 + 540 s).
- **Gate finding fixed:** behaviour ⚠ deadclick ai-ui@1512 "Composed while typing, on a phone": once the booking form
  shows, `SlotChips` drew the read-only people/place values as Chips with no handler (a `<button>` that does nothing;
  seen in the appshell and card-themes gates too). The chip guideline says a read-only label is a Tag: they are Tags
  now. Scoped gate `--only=ai-ui`: PASS, behaviour 0 warnings. Its BACKLOG P3 line (from #210) is removed.
