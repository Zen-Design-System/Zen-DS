# Session log 2026-10-22

## Session B · Content into the instance's properties (tier S; user's call relayed by the progress session, 2026-10-22)

Branch zen/feat/studio-content-props-20261022. The walk's §2a: a Button, Card and text had a **Content** section
Figma has no counterpart for. User decisions in session B: a text layer keeps a Text field (first row of Typography);
the 58 components without Figma properties lose the 2026-10-06 groups for one Properties block in prop order.
- DesignPanel: the Content section, its child-layer list and selectChild are gone. `childText` (the JSX children's
  words, a computed one as bound) goes to the Properties block of an instance (GroupedProperties `text`, after Figma's
  own rows; else at `children`'s place in the API order) or first in a text layer's Typography (TextSection
  `textRows`). An instance with words but no property block gets a Properties section of its own.
- inspector/autoGroups.ts deleted. The double-click fallback (focus-content) focuses the moved Text row.
- Gate (20:48–21:11, main 032d8fbd): **PASS**, Studio E2E 338/338 in 3 shards. `--only=figma` 173/174: FW-206 could
  not find its InputLabel on the canvas (InputLabel spreads no props onto its DOM, so no data-zen-src): the row now uses a
  Link (no Figma properties, 6 rows, `children` after Visited). FW-205…207 then 3/3.

## Session B · Corner smoothing (tier M; parity ❌, user decisions in session B: CSS corner-shape)

Branch zen/feat/studio-corner-smoothing-20261022. Spec card: docs/research/studio-fill-gradient-smoothing-eyedropper-spec-2026-10-22.md
(gradient and Pick color follow, one PR each).
- Library: `cornerSmoothing` (%) in _shared/corners.ts (CornerSmoothingProps, cornerShapeValue: superellipse(1 + s/60),
  60 % = superellipse(2), the squircle), on Box / Stack / Grid / rectangle Shape through `data-corner-smoothing` and
  `--zen-corner-shape` (layout.css, shape.css: read next to the attribute only). Docs/api, guidelines, ai-ui rebuilt.
- Studio: Appearance › Corner smoothing (ScrubNumberField, %) under the independent corners, opening them while set; 0
  removes the prop. In radiusPropNames so Properties does not list it twice.
- Figma: push frameLook / rectangle `cornerSmoothing` 0–1; the read's frames and shapes, pulled back in %; native paste
  (C's figma-native.mjs, targeted, C told) the kiwi `cornerSmoothing`; plugin ef17610 sets it (0 when absent). Live:
  Figma keeps 0.6 as 0.6000000238 (float32), pulled back as 60.
- Checks: push selftest +3 (363), pull 114, native +2 (133), compile 77, studio:selftest, tsc, usage, ai-ui, style,
  guidelines, compile-api, plugin npm test. E2E FW-180 (needs the gate slot).

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


## Session A — Figma walks measured again (17:00, Giám sát's slot)

- **Where:** 5b027db1, C's Libraries head. It is `main` 6f894b5e plus Scale, Slice, Comment and Libraries (#206–#209),
  so it reads as `main` will once they merge.
- **§2 hands-on walk, 76 actions:** 72 ✅ · 4 🟡 · 0 ❌. It was 65 · 7 · 4 on 2026-10-21 and 36 · 14 · 26 on 2026-10-18.
  - The 7 rows that went up: K, S, C, ⌥⌘A and the three right-click menus.
  - The 4 🟡 left: Detach on a Button (kept on purpose) and the right panel's Content section (B, the user's decision).
- **§6.3 first ten minutes:** 14 / 14 tasks in 40 steps, the same as Figma's 40, with 0 refusals.
- **Walk script change:** ⌥⌘A matches in other frames, so K-34 first copies the frame (title click, ⌘D). It also reads
  the status line, since the selection count did not see the copy.
- **Written into:** the plan doc's §2b, §5 status and §6.3.
- **Before that, a read-only review of C's project-components branch** (two passes). C fixed every finding: 1 red
  selftest, the push resolving the wrong page, the phone library, the detach self-link, a missing-component placeholder,
  the cross-page cycle in the push, and gone-main messages.

## AppShell session · Bottom Sheet playground's Action example (tier S, branch `zen/fix/bottom-sheet-action-demo-20261022`)

Giám sát passed on a gate finding. Main a2143e36's `usage:check` had 1 ⚠ at
src/platform/PlatformMobilePlaygrounds.tsx:240 [bottom-sheet/choice-uses-list-item], there since 10-08. I fixed it at
the owner, under the "fix findings at once" rule.

- The demo: the Action type showed "Sort by" with `selectedId`/`onSelect`, a single choice. The guideline says a
  choice is a Modal sheet with a List, and Action items are commands. It now shows the Action commands of a project:
  "Brand refresh", with Share, Duplicate, Rename and Archive. There is no selected item; picking one runs it, closes
  the sheet, and names the last command under the button. The live playground and the code string match.
- The harness: the rule is a prohibition, but it used the lenient `present`, which counts any `${…}` in a code sample
  as a selectedId. It now uses `has`, as the file's own note says prohibitions should.
- Checks: `usage:check` shows 0 warnings; `usage:selftest` passes all 235 rules (the bad fixture's literal selectedId
  still trips it); tsc, style, guidelines, ai-ui and studio pass.


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

## AppShell session · BACKLOG: two items already done (tier XS, docs only)

- "P3 · Card Spacing=XSmall follow-ups" is done: native-pack.json on main has the 40 Spacing=XSmall Card variants,
  from Bug's card-themes re-capture (#210).
- "P3 · Designer question: the mobile playground's 'Sort by' Action sheet marks the current sort" is answered: #213
  (06df41f4) turned the Action example into commands and made the rule strict, and usage:check shows 0 warnings.

