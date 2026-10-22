# Session log 2026-10-22

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

## Session B · Fill gradient (tier M; parity ❌, user decisions in session B: whole fill palette, diamond as 4 linear quadrants)

Branch zen/feat/studio-fill-gradient-20261022, stacked on the corner-smoothing branch (they share Layout/Shape/appearance
and the Figma tools; land smoothing first). Spec card §1 (same file as smoothing).
- Library: `gradient` in _shared/gradient.ts (gradientLayers: linear-gradient(angle) · radial-gradient(closest-side) ·
  conic-gradient(from angle) · diamond = 4 quadrant linear-gradients with stops at half; svgGradient for SVG shapes,
  linear or radial). Frames: `data-gradient` + `--zen-gradient*` layers over the surface, under an image (layout.css).
  Shape: a rectangle's own layers, an SVG shape's `<linearGradient>`/`<radialGradient>`; a Shape with a gradient has no
  fill colour unless given (as with an image). Exported from Shape's index (gradientTypes, ZenGradient…).
- Figma: tools/studio/figma-gradient.mjs. gradientTransform from the CSS angle in the layer's w × h (linear: through
  the centre, as long as the box's projection; angular: turned about the centre from 3 o'clock; radial and diamond
  identity), back to the angle (and a note when the handles were moved), stops ↔ Color/Background variables (a raw or
  foreign stop is noted and left out). Push `gradientFill` on frames and shapes; reader READ_GRADIENT_FILL (async
  variableName); native paste writes kiwi `stops` + `stopsVar` (alias) + `transform`, the same orientation as the
  Plugin API's gradientTransform (checked against Figma's own copies in native-pack: Bottom-Navigation's stroke,
  Area's fill bound to Accent/Solid); plugin 9c54e40 binds each stop through its `boundVariables`
  (setBoundVariableForPaint takes solid paints only, measured) and sets a linear transform again once the page is laid
  out (settleGradients: a hugging frame grows after its look).
- Live (Zen file, QA page, frame removed): the plugin's own functions on real layers: 5 paints, stops bound, the hug
  frame's transform settled (0.366 → 0.552 at 141 × 66); read back and pulled: all five gradients equal, no notes;
  Figma draws them as the CSS does (45° pink bottom-left → blue top-right, angular seam at 200°). Native paste not
  pasted live (scripted pastes unreliable, memory).
- Studio: Fill › Gradient (GradientFillRow.tsx): type (PropField, − in its icon column), angle (linear, angular), the
  gradient bar (role=slider handles: drag, ← → / ⇧ 10, Home / End, Delete; a press on the bar adds a stop), the selected
  stop's place (− removes it, a gradient keeps two) and its colour (SwatchControl, whole fill palette). A shape's colour
  becomes the first stop (Figma's paint type); a frame's fill stays under it (keeps Zen's shadow-on-Surface rule).
  The first layout (one row per stop) failed panelFits (long variable names cut, fields off the grid): replaced by the
  bar and one selected stop. − on a shape's gradient writes fill="none" (Figma's −), never the default grey back.
- Fixed on the way: frameLookProps' `else if (node.fill)` note fired for every frame with a surface since F8a; the frame
  read takes only SOLID fills. Smoothing branch: its position selftest still listed the radius props without
  cornerSmoothing (fixed there, 50e42099).
- Checks: gradient selftest 49, push 366, pull 119, native 138, appearance model 33, studio:selftest, tsc, style,
  usage, guidelines, ai-ui, compile-api, plugin npm test. E2E FW-181/182 pass (run alone, 2 rows).

## Session B · Pick color (I) (tier M; parity ❌, user decision in session B: the layer's token, then the pixel)

Branch zen/feat/studio-pick-color-20261022, stacked on the gradient branch (land smoothing → gradient → this).
- edit/pickColorModel.ts (pure, selftest 10): what a pick paints (Shape fill · frame surface · a text-tone component's
  tone; nothing on a Button), chooseOption (the layer's own variable when the target's palette has it, else the nearest
  colour of that palette), pickOps (a fill or surface also takes a gradient's place, Figma's solid).
- edit/pickColor.ts: I (page you made) arms it like the placement tools (capture listeners, crosshair, the drag tag names
  the colour, the layer under the pointer outlined); a click reads the paint at the point (an SVG fill, a text's colour,
  the first visible background; a picture or gradient → the browser's EyeDropper on that click, Chromium) and writes all
  selected layers in one edit (setOwnPropsOnLayers); Esc, a press on the panels, another tool or page stops it.
  edit/pickColorRequest.ts lets SwatchControl's new "Pick color" row (every colour list) start it for that row without
  the Inspector importing the canvas code (madge: it had added a PropField ↔ pickColor cycle).
- I left FIGMA_NOT_YET; StudioApp's I is Interact only on example pages; Quick actions › Pick color (I), Keyboard
  shortcuts › Tools.
- E2E FW-183…186 (pick onto a Shape, a frame exact and nearest, Esc / no selection / Quick actions, a colour row's
  pick); FW-05's list lost I. The EyeDropper path has no E2E (the browser's own picker). My slip: I ran FW-05 +
  FW-183…186 beside C's gate (check and run in one command); told C. FW-184's helper was fixed afterwards by reading
  the code (layers chosen by data-name), to re-run in my gate turn.

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

## Session A — B's corner smoothing → gradient → Pick color stack landed (20:00–21:00)

- **Taken over from B** at the user's request ("giao cho session khác xử corner smoothing, gradient, Pick color (B)").
- **Main merged in, bottom-up:** a8a0bf23, then 032d8fbd (#213, #214). Conflicts:
  - the studio:selftest chain: both sides kept;
  - figma-push DRAWN_PARTS: main's line, with smoothingOf below it;
  - toolbar, Shortcuts, figmaNotYet, FW-05: Comment (C) and Pick color (I) both built, so the not-yet lists are empty;
  - CHANGELOG and BACKLOG: both sides kept.
- **Gate PASS** on Pick color (ab48e6e6): Studio E2E 338/0 in 8 shards, 9 pages.
- **Found by FW-180's first run:** Corner smoothing never showed on frames, because FRAME_LOOK lacked `cornerSmoothing`.
  Fixed on the smoothing branch.
- **FW-186:** `pickLayer` read the selection from Layers while the left panel was on Pages. The helper now shows Layers
  first.
- **After the fixes:** FW-05 and FW-180…186 pass 8/8; tsc, studio:selftest and the CI quick steps are green.
- **PRs:** #215 smoothing → main, #216 gradient → #215, #217 Pick color → #216. Auto-fix is on.
- **Live paste test (user's go, ~21:30):** a frame with linear, radial and angular gradients plus a hugging linear Stack
  (`cornerSmoothing={60}`) was ⌘V'd into the Zen file's QA page through Figma's direct paste. All four landed with
  every stop bound to its variable (Accent/Solid, Info/Solid), smoothing 0.6 and radius 16. It also showed a Shape of
  width 200 or 80 pasted 1392 wide, an old bug on main: the push let a column's stretch give a shape `fillW`. Fixed on
  the smoothing branch (figma-push `ownW`/`ownH` cover shapes, plus a selftest); the decoded clipboard now carries
  200 / 80 with no STRETCH. No second paste: by then the user was working in another Figma file. The test frame was
  removed (no node left on any page) and the clipboard put back as it was (empty). BACKLOG's gradient-paste P3 is closed.
