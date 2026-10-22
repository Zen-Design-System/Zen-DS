# Session log 2026-10-23

## Shape examples: coverage (tier S; gate finding with no owner, assigned by Giám sát)

Branch zen/fix/shape-examples-coverage-20261023 from main e07ae5ae. BACKLOG "P3 · Shape examples: coverage (2026-10-17,
gate ④)": the page had 9 examples and no states, edge cases, phone or keyboard / a11y example.
- `src/platform/examples/pages/shape.tsx` (now `keepOnHotUpdate`, as example-patterns §8), three examples:
  - **A seat map with labelled marks** (states + keyboard / a11y): four seats, each a labelled ellipse (role img), its
    number aria-hidden; Segmented buttons pick the seat, taken seats disabled there and drawn as outlines (form and
    words, not colour alone); a role="status" line.
  - **Arc and star at the edge of their range**: Sweep 0 % (nothing drawn, the box kept), Ratio 96 %, a 16-tip star
    at Ratio 10 % and 0 % (no fill area left: a centred stroke).
  - **Onboarding art on a phone**: PlatformPhone, TopNavigation compact-alt with Back, ActionBar Next / Skip / Start
    collecting (a toast, then step 1), each screen's art in a 240 × 200 free frame, Accent leading.
- BACKLOG line removed; CHANGELOG line.
- Gate finding met on the way, fixed at its owner: usage:check warned interaction/action-without-handler on
  DesignPanel.tsx:696, a `// … (<Button>Save</Button>)` comment (#219). engine.mjs skipped block comments only; it now
  skips line comments too (never after ":" or a quote, so a URL stays code). Fixtures: the comment case in good.tsx, a
  tag after "https://" still caught in bad.tsx. usage:check 0 warnings.
- Static: tsc, usage:selftest, usage:check, style:check, guidelines:check, ai-ui:check, ai-kit:check, mcp:selftest,
  tokens:check: all exit 0.
- Gate (Giám sát's slot, `--isolated --only=shape`): run 1 FAIL — at 320 the seat map (264 + a 6-item Segmented)
  overflowed; warnings: Segmented 6 items (keep 2–5), the onboarding's gap 2xl (40, off the ladder here). Fixed: four
  seats in a 240 frame, gap xl, the onboarding content centred in the screen (height fill). Run 3 **PASS** (0 ✗, 0 ⚠);
  contact sheets 390 / 1512 looked at.
- Stale BACKLOG lines removed (both shipped in #214, 032d8fbd): "P3 · AppShellHeader `theme` / `density` to and from
  Figma" (79f07c77: Header/AppShell with theme, density and slots, read back) and "P3 · Card `subAction` to and from
  Figma" (bac4f867: Sub-Action through the wrapper, its icon). "P3 · Card contract predates Figma's Sub-Action wrapper"
  stays: nested-layers.json was last captured 2026-10-17.

## Card contract re-read (tier XS; BACKLOG P3 assigned by Giám sát, no owner)

Branch zen/fix/card-contract-recapture-20261023, stacked on #223 (both add this log and edit BACKLOG). BACKLOG "P3 ·
Card contract predates Figma's Sub-Action wrapper" pointed at `docs/figma-contracts/card.json`, which does not exist:
Card's only layer contract is `nested-layers.json`, and it has had Sub-Action (F) › Wrapper (F) › Button/Icon-Flat (I)
since 2026-10-12; native-pack.json has the wrapper too (#210). What was stale: the variant count and other sets.
- Re-read all 38 sets read-only (`nested-layers-read.mjs code`, 4 use_figma calls on 9nZv4uW2LT21yuHabMTCh1, answers
  taken from the transcript, `merge`): Card v 20 → 120 (Spacing=XSmall and the renamed themes), layers unchanged;
  Bottom-Sheet +Trailing-Icon-2 −Search/Popover; Modal/Dialog Heading-Text IF → F; Inline-Message +Leading-Icon
  +Trailing-Icon −Label-Wrapper; 6085:25796 is now Empty-State's Size=Medium variant, so the entry is the set
  16339:135 (v 2, read in a 5th call).
- `nested-paths.mjs --check` 45/45 (EmptyState now covered: Illustration, Primary, Secondary, Icon); `run-all.mjs`
  25/25. BACKLOG line removed; CHANGELOG line.
- Stale BACKLOG line removed too: "P2 · Templates take the phone chrome" — since the AppShell rebuild (71d3a22c,
  2026-10-19) AdminList, Dashboard, Detail, SettingsForm and HrShell put their PageHeader in AppShellHeader's `main`
  and pass `topNavigation` (AdminList, Dashboard and HrShell also `bottomNavigation`; Detail and SettingsForm are
  pushed pages with a Back chevron).

## BACKLOG: the two widget-theme P1s re-checked (tier XS, docs; user "tiếp tục")

Branch zen/docs/backlog-widget-themes-20261023, stacked on #226.
- "P1 · Widget themes phase 2" removed: Card `color` and `solid`, MetricCard's types (8 with Tile), the chart paint
  styles (7 Color Chart Sector styles in figma-styles.full.json), the chart descriptions in tools/figma-docs and the
  Studio map shipped in #58 (cc3a97b9) and after; the gradient themes were dropped by the user (2026-10-14).
- "P1 · Box theme vocabulary in code" rewritten as P2 "Code-side rules for the Figma theme audit": the vocabulary
  (Card / ListBox theme · color · surface, MetricCard / ChartCard pass-through, Studio map, Card contract after #210)
  is in code; only usage-guard rules mirroring the Figma audit's theme/* checks are left, and those wait for the user.

## Session B · Example className round 2, PR 1 (tier S; user decisions 2026-10-23, spec examples-classnames-round2-spec-2026-10-23.md)

Branch zen/chore/examples-classnames-20261023. The coverage BACKLOG item (P3–P4) had been merged on 10-13; examples
added since brought 177 className back. PR 1: classes with a Figma-equivalent prop become props.
- Direct: calendar planner Card `maxWidth={420}`, schedule planner Stack `maxWidth={420}`, colour-picker panel
  `<Box width="fill" maxWidth={360}>` (was a div).
- Fill + min width, measured on an isolated server (natural width, line and siblings at 1512 / 768 / 390 / 320):
  list-item search `width="fill" minWidth={200}` (natural 220 would overflow a 320 phone; wrap point 299 instead of 319);
  toast title block `minWidth={160}` (= natural, same wrap point). Kept as CSS: the search page's toolbar (natural 445
  shrinks to 248 on a phone because its chips wrap inside: no min width keeps both) and the date picker's Form (Form has
  no size props).
- Visual diff 102 panels at 1512 / 390 / 320: identical. Gate PASS (5 pages; audit, dark, behaviour, contact sheets
  looked at).
- My slip: I stopped my isolated server with pattern kills (`pkill -f "tail -f /dev/null"`), which can hit another
  session's processes; memory updated (TaskStop or exact PIDs only).

## AppShell session · Mobile Bar takes the canvas's twin (tier S; gate finding from the box-themes session's theme/navigation-surface, via Giám sát)

Branch zen/fix/app-shell-top-bar-canvas-20261023 from main 25a86b67. AppShell gave the Bar's TopNavigation `alt`
(Surface/Alt) on every canvas. Checked against skills/zen-figma-design/references/screen-rules.md §1 (Theme-01…08):
Canvas/Default ↔ Surface/Alt (Type=Alt), Canvas/Alt ↔ Surface/Default (Type=Default), Canvas/Flat ↔ Surface/Flat (no
Top-Navigation type; Figma screens override by variable).
- AppShell.tsx: `BAR_TYPE` by canvas (default → alt, alt → default, flat → default); `TOP_NAV_TYPE` keeps band,
  band-sheet and media. app-shell.css: on `canvas="flat"` a Default bar's `--zen-top-nav-fill` is Surface/Flat.
  `mobileTop` JSDoc updated; guidelines, api, ai-ui catalog and the platform api regenerated.
- Test (tests/interaction/app-shell.test.tsx): for each canvas the bar's type and that its fill equals the shell's
  background.
- Not changed: BottomNavigation stays Surface/Default (Figma's Bottom-Navigation has no surface choice; BACKLOG P2
  "Navigation surfaces missing"). Found, owner B: figma-push draws a mobile AppShell's TopNavigation with its own
  `type` (default when unset), not the Bar type AppShell picks, so on the default canvas Figma gets Default where code
  draws Alt (told Giám sát / B).
- Slot (after the BadgeStatus PR #234): app-shell.test.tsx 41/41; gate (app-shell, templates, accordion, action-bar,
  sidebar) PASS, vitest 81/81, with one new warning: deadclick on app-shell@1512 B2 "Send a like". Owner fix:
  ChatComposer's default quick action had no onClick (dead wherever an app keeps the default); it now sends "👍" through
  onSend, as the chat page's own quickAction does. Test in chat.test.tsx (both devices); docs regenerated.

## AppShell session · Workflow steps to BadgeStatus (tier M, multi-file; BACKLOG P2, the user's pick through Giám sát)

Branch zen/fix/workflow-badge-status-20261023 from main 4b96bbb8. User's call (this session): project statuses move
too, with the badge page's map (Planning → to-do, Active → in-progress with the project's real progress, On hold →
blocked, Completed → done); labels stay the data's words.
- `examples/data.ts`: `taskStatusTheme` / `projectStatusTheme` replaced by `taskStep`, `projectStep` and
  `projectProgress(project)` (Active → its progress, else the step's own ring). HR `data.ts`: `taskStep` beside
  `taskStatusTheme` (still the HR Tasks group headers' ProgressCircle theme).
- 28 example pages, the app-layer AppShell playground (`appLayer/shell.tsx`), HR Tasks' StatusBadge and the PageHeader
  story: 57 Badges → `<BadgeStatus status={…Step[x]}>{x}</BadgeStatus>`, code samples alike (a script for the plain
  form, by hand for the helpers in app-shell, layout and sidebar). Leave, expense, invoice and priority stay Badges.
- Gate finding fixed at its owner: `app-shell/pattern-parts` read nested props (a header's `BadgeStatus progress`) as
  the shell's `progress`; it now reads `topLevel(attrs)`. Fixture in good.tsx.
- BACKLOG line narrowed to the Figma instances (a Zen file write, waits for the user). CHANGELOG lines.
- Static: tsc, usage:selftest, usage:check (only DesignPanel's warning, fixed in #223), quick gate PASS (29 pages).
- Slot (after B): visual diff 25a86b67 (detached checkout, no stash) vs the branch, 29 pages × 1512/390, isolated
  :5200 stopped by task: 550 panels, 478 identical, 72 changed — all the status badges (ring + step colour, tables fit
  their 120–152px columns); top-navigation/390/06 differs only by a lazy photo. Two panels grew 1px (menu/390/04,
  search/390/04): a BadgeStatus in a DescriptionList value made the line 29px for 28 — its inline-flex baseline is the
  20px ring's bottom where a Badge's is its 16px leading's. Fixed at the owner: badge-status.css lowers the ring by half
  the difference (tokens), test tests/interaction/badge-status.test.tsx (line height = a Badge's at Medium and Small).

## Session B · Example className round 2, PR 2: Card / ListBox content column (tier L; user "Content-Slot là cột auto layout")

- `.zen-card__content` grows (flex 1 1 auto): Figma's Content-Slot fills the card; a `height="fill"` child of the card
  content or of `.zen-list-box__body` grows into it. MetricCard / ChartCard dropped their own copy of the rule.
- Examples: px-card-plan, px-card-grow, px-card-plan__cta (plan cards: a Fill-height Stack, justify between),
  px-layout-template(-body) and px-layout-cover-body went; px-layout-cover stays (26rem follows the type scale). Dead
  platform.css `.pe-plan*` / `.pe-checklist` removed.
- Visual diff, all 72 pages at 1512 + 390, before = a scratch worktree of main 25a86b67 (the classifier refused
  overwriting files or a detached checkout in this worktree): 1194 identical, 4 changed, all noise (lazy photo in
  top-navigation 06, 3 px in chat 01 and form 01, the voice wave).
- Gate `--isolated` (card, layout, list-item, metric, chart): PASS, 0 errors / 0 new warnings, Studio E2E 338 works;
  contact sheets card-1512 and layout-390 looked at.

## Backlog triage · P2 / P3 open items (tier XS, docs only; user: "rà 54 mục P2/P3")
- Each of the 53 P2 / P3 entries (B's className round 2 left to B) checked against main 4b96bbb8, merged PRs and open
  branches. 5 done or answered (#155, #193, #50/#99, the user's White-Overlay call, round 2 supersedes the 112 classes);
  20 merged into 5 (chart designer questions, AI UI × 2, direct paste, Figma contracts) and the Popover label into
  QUESTIONS.md "Contrast in light mode"; 4 rewritten to what is left (Variables v2: E5 came with #151; navigation
  surfaces; chart push data; UX polish → the design check); 8 are closed by open PRs or branches (#223, #225, #226,
  workflow-badge-status, studio-parity-leftovers). Also archived: the P6b remains, the empty "Phone decisions" heading,
  and 9 plan-section entries already marked done (PR #5, I-15) or done by #141. 38 archive entries in all.
- Merged main twice (#223, then #225–#227): conflicts kept both sides (their removals and the P2 "Code-side rules"
  line, my rewrites); no entry is archived twice and none of mine came back. Open after #230: 5 P1, 19 P2, 12 P3.

## Colour P1s: On-Brand on Zen/9 and the Chart On-Color styles (session "colour P1s", tier S)

Two BACKLOG P1s waiting on the user (brief from the supervisor: "xử hết backlog", clear the P1s before the next phase).
- **White on Zen/9 (closed, no change).** Measured with the ramp's APCA (`tools/studio/zen-ramp.generated.mjs`): white on
  Light Zen/9 #F755C9 Lc 60 / 2.96:1, black 86% Lc 48 / 6.22:1; Zen/10 white Lc 71; Dark hover #FF7BD6 white Lc 50
  (ramp floor 50); Dark pressed keeps black 86% (Lc 73). White is the APCA pick on every Light step. The user decided the
  measure on 2026-10-19 ("không áp dụng cứng nhắc WCAG … dùng APCA … có mode High Contrast"), and the audit's
  `apcaPick` already passes the pair, so the item was closed without asking again.
- **Color Chart Sector/On-Color/Secondary and /Tertiary (user: "Giữ binding mới").** Live Figma: Secondary →
  Content/Neutral/Light (black 49% Light), Tertiary → Border/Neutral/Subtle/Pressed (18%), Primary → Content/On-Colors.
  Live consumers: only the 6 Bullet-Chart Tracks (Tertiary × layer 50%); the 11 Spark-Bars bars that use Secondary sit
  in a detached frame. Options shown with swatches on Brand / Cyan / Yellow / Orange solids (Secondary Lc 31–46,
  ~2.9:1; Neutral/Base 69% Lc 42–62; the old binding drew solid #121212).
  - Figma: the three style descriptions said "Content/Neutral/Strongest at 48% / 20%" (Primary too, though it is
    On-Colors) and were rewritten; `tools/figma-docs/style-descriptions.mjs` now has an On-Color branch (it wrote
    "Chart series colour :" for them before).
  - Code: Card Solid's `--zen-card-mark-ink` (the second series on a hue Solid) Neutral/Base 69% → Content/Neutral/Light
    49%, Inverse/Light in dark mode, to match the style.
  - Gate PASS (isolated; card, widgets, metric; audit 1512/390/320, dark, behaviour, 80 browser tests; report
    2026-10-22T19-17-48-192108d7). No platform example draws a second series on a hue Solid, so a throwaway browser test
    measured the Bullet target on Brand / Cyan / Yellow / Orange Solid cards: rgba(0, 0, 0, 0.486) in light and dark.

## Session C · Figma-parity leftovers (tier S each; Giám sát's queue, plan studio-figma-design-parity-2026-10-18.md)
Branch `zen/fix/studio-parity-leftovers-20261023`; both BACKLOG lines archived.
- ⇧⌘G on several layers (BACKLOG P2): `ungroupLayers` in edit/groupLayers.ts ungroups every selected group or frame,
  the last in the code first, each once the canvas drew the one before (it reads its layers' places there); other
  selected srcs follow each write (`mapSrc`); the writes are squashed into one ⌘Z. The canvas menu offers Ungroup on
  several layers. E2E FW-220 (two seeded groups → four shapes in place, all selected, one ⌘Z).
- An instance's data-name (BACKLOG P1 leftover). User's choice (AskUserQuestion): the accessible name first. Push:
  an instance named by its component takes the data-name as its Figma name (`nameGiven`); an aria-label keeps the name
  (note), IconButton never (layer-meta `LABEL_NAMED`). Plugin (studio-import c95084e): plugin data "name" (what the
  import wrote) and "given". Pull reader: `nameGiven` when given or renamed in Figma since; pull writes data-name only
  then. A first try reading every non-default instance name made the library's own names ("Item", "Main") data-names
  on a live Zen screen and kept a padded wrapper: dropped.
- Real Figma (QA page): the import wrote name/given as planned; the real reader marked given ✓ / plain ✗ / renamed in
  Figma ✓; pageFromFigma gave `<Use data-name="Hero note">`, `<Use>`, `<Use data-name="Renamed in Figma">`. Test frame
  removed. Selftests push 402, pull 130, layer-meta 15, plugin `npm test` ✓.
- Gate (01:45–02:14, isolated, the 8 files): static ✓, Studio E2E 338 / 338 (3 shards), Build-QA PASS. FW rows run
  apart (the gate's matrix has no FW group): FW-220 first timed out (a ⇧⌘-click on the second group's empty spot added
  nothing); it now ⇧-clicks "Group 2" in Layers, as B-33 does: FW-119 + FW-220 2 / 2, FW-11…18 8 / 8.
