# Session log 2026-10-24

## Session C · Prototypes pushed to Figma (tier M; BACKLOG P3, user-approved via the progress session)

Branch `zen/feat/push-prototype-20261024` from main 1b9a9cd0; plugin `studio-import` dcd3af3 + 6490d95. User, verbatim: "Cho C
(đang rảnh) làm luôn P3 'Push Overlays and prototype actions to Figma': push mọi Screen và Overlay thành frame, kèm
reaction Navigate / Open / Close overlay / Back."
- Push: `figmaPackage` writes `frames` for every Screen, Screen state and Overlay (`figmaFromPage` takes `frame`; an
  Overlay's frame hugs, no canvas or height; a page of one Overlay draws it, so Copy for Figma on an Overlay frame works
  now). The old notes ("only the first Screen", "Overlays not pushed", "interactions not pushed") are gone; what Figma
  has no reaction for is named per action, and an action on a part with no layer of its own is counted.
- `tools/studio/figma-proto.mjs` (new): action ↔ reaction both ways, Motion tokens (120/200/280 ms, Emphasized curve;
  the push selftest compares them with tokens/source/motion.json), Overlay settings as hand-step notes, ACTION_LAYERS
  for Dialog, Side Panel and Bottom Sheet buttons (read in the Zen file; the sheet's two are both "Button/Main", so
  its path is a list of names, plugin layerAt takes one; checked live).
- Plugin: `place` → `placeFrame` per frame, side by side, then `applyReactions` (setReactionsAsync, nested layers too);
  `existingRoot(pkg, part)` keeps a whole page's frames (`set = page`) apart from ⌘C copies and reuses the old
  whole-page frame for the first Screen; a copy's reaction finds the page's frames on the page.
- Pull: the reader reads `reactions` (destination by the frame id the import kept); `pageFromFigma` writes `proto.*`
  back, the frame's After delay as the Screen's `onDelay`; a Dialog button's reaction goes into its action prop when the
  page has one. Native paste: an Overlay root hugs; interactions are a note (the plugin's import carries them).
- Live in the Zen file (QA page, removed): the real importer (unrelated parts stubbed) placed 3 frames 120 px apart,
  the Overlay 440×212 hugging; Invite → Open overlay (Dissolve 0.2 s, CUSTOM_CUBIC_BEZIER); the Dialog's Primary →
  Close overlay; imported again: 0 created, reactions kept. The reader read back Push right 0.28 s, While hovering and
  After delay 1.5 s.
- Tests: push 467 (+16), pull 135, native 150 (+1), plugin `npm test` (multi-frame, legacy frame, ⌘C copy, removed
  reaction, missing destination); E2E HO-16 (new, Export › Figma of HTML_PAGE; id from Giám sát).

## Backlog triage · "Backlog (plan before opening sessions)" (tier XS, docs only; started by the progress session)
- All 53 entries checked against main 545216b6: grep, the named files, git history, and two read-only Figma variable
  reads (Bubble-Chat-Others-Business is Surface/Default in all nine modes; Popover-Search is still NaN in S1–S6).
- 10 done, 2 stale, 3 duplicates of archived entries, 25 partly done (rewritten to what is left), 13 still open
  (5 kept as written, 8 merged into group entries). 48 originals archived with their verdict, text unchanged.
- Left: 35 entries under 7 owner groups (business, Studio, components, designer, platform, tooling, design check);
  4 P2: the LICENSE review, the registry's user steps, ModalForm `header={false}` without a name (a11y), and the
  contrast/targets baseline seeding. "## Open items" untouched; nothing P1-urgent found. No work started.
- User "Giao 35 mục theo đề xuất": the Designer entry moved to QUESTIONS.md / .vi.md as the 2026-10-24 designer batch.

## Session B · platform-audit `clip` check and self-test (tier S; Tooling 2a + 2b, user "Theo đề xuất", handed over by chart-contract-suites)

- **2a `clip`** (`tools/platform-audit/quality-checks.mjs` controlClip, wired in audit.mjs like `fit`: `--quality`,
  error, baselined). It reports three cases:
  - a control (button, link, tab, option, input…) cut off by an `overflow: hidden | clip` or `contain: paint` ancestor
    (> 2px);
  - a control wholly past that edge while a sibling control of the same parent shows;
  - a control whose visible middle is under another element of the example (elementFromPoint, the window scrolled to it
    and back).

  Not reported: scroll containers, a device frame's bottom edge, a group hidden as a whole, floating layers and scrims,
  invisible hit areas, the docs chrome, and a bar over the scroll container the control scrolls in.
- **2b** `tools/platform-audit/selftest.mjs` (`npm run platform:audit:selftest`, gate harness list, CI):
  - fixtures with the real tokens.css and typography.css in headless Chromium, no dev server;
  - each kind, with a clean twin: scale, roles, hierarchy, rhythm, ladder, fit, card-gap, legend-column, outline,
    outline-h1/-start/-card/-siblings, clip (10 fixtures);
  - pageChecks is cut out of audit.mjs by its top-level braces (the script runs when imported).
- **Gate bug fixed:** tools/qa/run.mjs ERROR_KINDS missed `counts` (an error since 2026-10-15), and `card-gap` and
  `legend-column` (since 10-16), so the gate passed them as warnings. The self-test now checks that the list equals
  audit.mjs SEVERITY's errors.

## Tooling fixes (#264; tier S–M; the user's go 2026-10-24)
- `avatar/solid-initials-contrast`: measured today's tokens (both themes the same): golden 2.58, teal 2.70, cyan 2.96,
  orange 2.98 below 3:1; green 3.48 and bronze 3.38 pass, so the rule lists golden | teal | cyan | orange (fixtures,
  guideline, the sidebar example's comment).
- `-shadow-off`: `token-outputs.mjs` declares each companion in every component theme (`initial` where not tinted);
  tokens.css +66 lines, no value changed; Chromium check of a Neutral-S4 chip inside Neutral-S3: the shadow is back.
  `tokens:check` counts gaps (66 on main, 0 here).
- Audit `edges`: a focused element's outline / ring is not a frame. Gate: `pidIsQaRun` (a reused pid is stale).
  Baseline notes follow fix-at-once. Playground empty slots → example-patterns §3c; APFS backups → zen-build-qa §2.
- BACKLOG P2 seeding: `audit.mjs --quality --viewports=1512,390 --baseline-update=contrast,targets` over all 73
  pages, light (636 s) and `--dark` (658 s), isolated: no new key. The three contrast keys (app-shell E7 2.90:1 at
  1512/390/320) were all there were; targets 0. Baseline unchanged. The dark pass with playgrounds also lists
  rhythm/roles/scale/outline-siblings findings the light keys hold; the gate's dark step (`--no-playground`) never sees
  most of them.
## Components group of the triaged backlog (tier M; user 2026-10-24 via the coordinator: "Giao 35 mục theo đề xuất … Phần không cần quyết làm ngay; phần cần quyết gom lại hỏi tôi một lượt")

Branch zen/fix/components-backlog-20261024 from main 6e4e6605 (worktree festive-archimedes-176df5, beside PR #248's
queued gate). The 9 Components entries of PR #262's triaged BACKLOG: what needs no decision is built; the decisions
went to the coordinator as one list.
- ModalForm `header={false}`: the title stays the modal's name as a visually hidden heading, the unshown description is
  no longer referenced; new `aria-label` / `aria-labelledby` (labelledby wins). Interaction tests in dialog-modal.
- Nits: ProgressCircle `decorative` (HR Tasks' status marks; harness progress/needs-label accepts it, good fixture);
  Table `currentRowId` (aria-current + Selected fill; six templates and the Side Panel files example moved off
  `selectedIds` for the open row); Popover / Menu keep their opened edge and clamp from it (resolveAnchoredAlign no
  longer flips while open: a 64px jump at anchor x 278 in a 390px window); TextArea `:read-only, :disabled` no grip;
  Chat ring radius per bubble shape (`--zen-chat-ring-radius`); onJumpToReply documented for threads that load older
  messages (jumpToChatMessage returns false when the original is not rendered); Breadcrumbs plate bleed = Figma, noted.
- Toggle docs: platform visuals, playground and its PlaygroundToggle on checked / onCheckedChange; JSDoc cites
  Toggle-Button 1523:104 and Toggle 1526:5703.
- Card: `--zen-card-shadow` set with an alt `--zen-card-surface` (platform .pe-shell[data-canvas="alt"]);
  surface="default" resets it. Test in card-color.
- Phone targets: 44px `::after` hit areas under `[data-breakpoint="mobile"]` for the ChartCard Open button, the Metric
  header action and Pagination's xs arrows (outward only: `data-arrow`), zen-allow-slot-size (no 44 token). FileUpload
  `buttonSize`; Settings template uses md on phones.
- DatePicker: Event-List read in Figma (510:36577: 4px dots, Gap/3XSmall, Content/Accent/Light, On-Selected
  Date-Picker-Item/Content/Selected); `event` count, Calendar passes counts. Cells/panels from
  --zen-select-item-size-medium|small (Compact 32/24, Comfortable 40/32, Studio 28): tests in calendar.
- TopNavigation: Figma check — Header-Trailing holds `.Primitives/Top-Navigation/Mobile/Nav-Slot/Action` (6340:42675)
  like the bar, its Nav-Action has Trailing-Icon / -2, so `largeTitleAction` pairs a `group` (groupedPlaces); the push
  mirror (figma-top-nav topNavActions) groups the lead too and notes it.
- Decisions sent to the coordinator: TopNavigation new props, Menu/Chip phone sheet, AdminList bar → bulkActions,
  Table add-row (recommend close), Sidebar headers (recipe), designer: Card Default hover/pressed, Table hover on
  non-clickable rows.
- Checks: tsc, usage:check / selftest, style:check, guidelines / ai-ui / Studio maps rebuilt, push / pull selftests,
  vitest dialog-modal, anchored-position, popover/menu files, card-color, component-fixes, calendar + date files,
  navigation / top-navigation-parity / liquid-glass. Gate: pending its slot from Giám sát.
- User decisions (2026-10-24, "Theo đề xuất", via the coordinator), built here: AdminListTemplate's selection ActionBar
  → Table `bulkActions` (labels name the skipped rows); Sidebar recipe "Account header and module title" (brand +
  chevron-selector Menu, SidebarSubHeader); Card Default Hover/Pressed and Table hover on rows that open nothing →
  QUESTIONS.md / .vi.md; Table add-row closed. Menu/Chip phone sheets handed to session C (#271, spec sent; Menu.tsx
  overlap = #266's clamp). TopNavigation (2) in progress on `wip/top-nav-20261024`: Figma read — Heading-Text/Basic
  4060:17984 Dropdown = icon-chevron-down-line 20 Gap/2XSmall after the Sub title; Badges = a row under the H1 heading
  (Gap/XSmall, Badge Medium Neutral Solid), so `largeTitleAction` does not cover it. BACKLOG: 7 Components entries
  archived, TopNavigation and the sheet line rewritten.
- CI: the library CSS check reads comments (`.pe-` in card.css's comment failed "Gates, tests and package"); reworded.

## Tooling: approved harness rules, inventory, :5173 warning, token scope in TSX (tier S–M; the user's decisions 2026-10-24)
- Rules (each with an `expect:` case in fixtures/bad.tsx and a clean case in good.tsx): `table/bulk-actions-max` (array
  literal or `(ids) => [ … ]` with more than five), `chip/needs-action` (Normal/Advanced with no handler, popover or
  selection; code samples, stories and component source skipped), `max-three-trailing` flags a group of three or more
  (my "count each item" recommendation meant this: a grouped pair stays one place, as Figma's dual Nav-Action),
  `search-folds-to-action` also on `scrollRef`. `chip/needs-action` found two dead chips in Studio's ThemePreview
  specimen: they now press like the buttons beside them.
- 1e/1f: `docs/research/harness-inventory-2026-10-24.md` (0 bare Containers around a Table; 887 Do/Don't lines, 161
  checked; three candidates for the user).
- 2c: `toolServer()` in tools/qa/isolated-server.mjs; audit, shoot and visual-diff warn on :5173 and take `--isolated`.
- 3c: `tokenScope` reads `var(--zen-…)` in TSX/TS (component folders → their page, example pages → the page); against
  228897cd it finds 19 TSX consumers. 3d documented in skills/zen-build-qa §3. B.2 is its own PR.

## Native packages compiled in CI (tier S, CI only; BACKLOG P3; user: "thêm job CI macOS chạy swift test và flutter test cho platforms/")

Branch zen/ci/native-platform-tests-20261024 from main 6a7e872a, PR #267.
- `.github/workflows/native.yml` (Native packages): `swift test` in platforms/swift and `flutter test` in platforms/flutter
  (subosito/flutter-action@v2, Flutter 3.24.5 stable), both on macos-14; only on PRs / pushes to main that touch
  platforms/**, scripts/build-native-tokens.mjs or the workflow, plus workflow_dispatch (macOS minutes).
- First run (0608e651): Apple Swift 5.10 builds the package (20 s) and passes 4/4 tests; Flutter 3.24.5 passes 4/4. #238's
  Zen-High-Contrast Swift and Dart compile — nothing to fix in the generator's templates.
- This Mac still cannot run either locally (memory native-toolchains-broken-locally, updated): the PR's run is the check.
