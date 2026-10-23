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

## Session B · Example className round 2, PR 3: `sticky` (tier M; user "Thêm prop sticky cho Box", "Bottom = Fixed, Top = Sticky")

- Spec: docs/research/layout-sticky-spec-2026-10-23.md (Figma facts measured with use_figma; the AppShell session OK'd
  the Body rule). `sticky="top|bottom"` on Stack, Grid, Box, Shape; AppShell Body bottom padding through
  `--zen-app-shell-body-pad-end`, a bottom-sticky descendant takes it inside itself; `surface="canvas"` follows the
  shell's canvas; chat / ai-chat / ai-ui docks without CSS; Studio Prototype › Scroll behavior (canvas in place);
  push bottom → Fixed (absolute, on top), top → Sticky; pull reads numberOfFixedChildren and the REST export's Sticky;
  native writes scrollBehavior. Plugin 397fc74 on studio-import (npm test green; its API sequence checked live).
- Found in my own work and fixed: React saw two Prototype-panel children keyed by the layer (Scroll behavior beside
  Interactions); the first gate failed on a stale compile-api.generated.mjs (individual selftests do not cover it:
  run `npm run studio:selftest`).
- Visual diff (chat, ai-chat, ai-ui, app-shell, templates, layout, shape; 1512 + 390; before = main 0f4c28cf in a
  scratch worktree): 227 identical, 1 changed (chat 01, 3 px, the same noise as PR 2). Dock probe at 1512: sticky,
  −24 / +24, its bottom on the scroller's bottom mid-scroll and at the end.
- E2E FW-210/211 works; app-shell + app-shell-grid tests 52/52; gate `--isolated` PASS (0 errors, Studio E2E 338).
- Not run: a live native paste of a sticky layer (BACKLOG P3).

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

## AppShell session · Zen-High-Contrast in the native packages (tier S, static; BACKLOG P3 G5, user-approved, via Giám sát)

Branch zen/feat/native-high-contrast-20261023 from main 4c456456. Everything under platforms/ is written by
scripts/build-native-tokens.mjs (engines, tests and README too), so the change is in its templates.
- Swift: `ZenContext.highContrast`; `with(colorScheme:contrast:)` (Dark / Light, Zen-High-Contrast / Zen, other modes
  kept); `.zenSystemContext(base)` (a ViewModifier reading colorScheme and colorSchemeContrast); UIKit
  `with(traits:)` (userInterfaceStyle, accessibilityContrast .high). Dart: `ZenContext.highContrast`,
  `withSystem(brightness:highContrast:)`, `ZenContext.fromMediaQuery(data, base)` (platformBrightness, highContrast:
  Flutter reports it on iOS).
- Vectors: two contexts in Zen-High-Contrast (Light, Dark) and 8 semantic colours the mode changes (it changes 82 in
  Light, 63 in Dark) → 1218 vectors (830). New Swift and Dart tests for the mapping. README section.
- Checks: tokens:native:check, tokens:check. Not run: swift test (this Mac's Command Line Tools: SwiftPM cannot link the
  manifest and the SDK does not match the compiler, so no Swift builds at all) and flutter test (no Flutter); CI runs
  neither. The Swift and Dart code was reviewed against the APIs (iOS 15 / macOS 12, Flutter MediaQueryData).
- BACKLOG line removed.

## AppShell session · Figma contracts G5 (tier S, read-only Figma + contract files; BACKLOG P3, user-approved, via Giám sát)

Branch zen/chore/figma-contracts-g5-20261023 from main 4c456456.
- Capture: `mcp-capture/capture-template.js` per file (code in the scratchpad), 56 read-only use_figma calls made by two
  helper agents so the LZ chunks stay out of the main context, `assemble.cjs` from the transcripts (all hashes whole),
  written with each file's own serialisation (python json.dumps; input-search-primitives JSON.stringify; table-cells
  raw unicode).
- (a) New: chart-line, -stack-bar, -multi-line, -bar, -donut, -radial, -heatmap, -area, -grouped-bar, -combo, -gauge,
  -funnel, -bar-list, -bullet, -card (Gauge / Funnel / Bullet are sets with Color now: 15968:130382 / 130460 / 130554,
  told the chart-colour session; its branch already points CHART_SETS there).
- (b) Re-read whole: avatar-single (48 → 656 variants: Theme gained Sky, Mint, Bronze, Golden), chat-bubbles,
  table-cells, input-search-primitives, datepicker-sidebar, input-search (Search/Default unchanged but its
  description), segmented-toggle-badge-avatarstack (Segmented unchanged; Badge and Badge-Counter +24, the four hues).
  The code already has the four hues (avatarThemes, badgeThemes).
- Found: Figma's Side-Bar/Master/Small-Density (5974:20590) is named "Component" now → BACKLOG designer question.
- Checks: nested-paths --check 45/45; run-all.mjs 25/25 (Input/Heading 432/432 on the new capture); figma-pull's
  Actions-Cell icon still icon-dots-vertical-line. BACKLOG G5 narrowed to the suites still to write.

## Chart Color phase 2: `palette` in code + Studio (tier M; user: "xử hết backlog", then approved the Figma review and the name `palette`)

Branch claude/interesting-yonath-0da9e0 (worktree agitated-leakey-b2b41c). BACKLOG P1 "Chart Color = Primary | Secondary, phase 2".
- Figma review: the 10 sets read live, Primary vs Secondary side by side (12 pairs incl. Bar horizontal and Area
  stacked). Every pair swaps the Color Chart Sector styles cleanly (style tally per set: Primary ↔ Secondary counts mirror).
  A twin diff (55 pairs: clip, size, position, layout, radius, stroke, effects, text) found two drifts made after the
  10-17 build, both in Secondary: Bar Horizontal 4-Sectors had Plot clipping on (axis "0 h" / "3,000 h" cut) with Bars
  164 instead of 144; Grouped-Bar 4-Sectors was 434 tall instead of its Primary's 370. User: "Duyệt, sửa 2 chỗ" → both
  now match their Primary; re-diff 0 differences, no overlaps in the sets.
- Code: `palette?: "primary" | "secondary"` on the ten charts (type `ChartPaletteName`). chartCore `sectorAt` /
  `colourAt` / `fadeAt` swap palette slots 0 ↔ 1 (series 3–7 and an item's own `color` stay; a single or stacked area
  takes the Neutral fade pair); ChartBlock writes `data-palette`, and chart.css marks read `--zen-chart-lead` /
  `--zen-chart-second` (Bar's bars and active bar, Gauge value/target, Funnel stages/last, Bullet actual/target, Combo
  bars/line/dots). BarList keeps Sector/Primary (no Color in Figma). BarChart `color` / `activeColor` still win.
- Studio (`tools/studio/figma-charts.mjs`): push writes Color on the ten sets and swaps the drawn Stack-Bar segment and
  Donut slice styles; pull reads Color=Secondary back as `palette="secondary"`. CHART_SETS Gauge/Funnel/Bullet now hold
  their set ids (15968:130382 / :130460 / :130554; the old ids are the Color=Primary variants); library-keys.json has the
  three set keys (in place of the old component entries; read live, read-only). The native pack already had the sets
  (merged 10-21). A key imports in other files only once the library is published with these sets.
- Docs and checks: chart guideline (Color row, use line, do line, Figma ids), harness `chart/palette-by-hand` (warn: the
  sector colours set by hand on color/activeColor/series) with bad/good fixtures, a Do/Don't pair, platform example
  "Led by the neutral colour" (Bar, Gauge, Donut), a story; Figma descriptions of the ten sets gained a "Color:" line
  (decoded first; Stack-Bar's stacked `&amp;lt;` escape fixed). No chart contract suite exists (BACKLOG P3), and the
  component-properties contract still has no chart sets (BACKLOG P2 inspector item, Color added to it).
- Gate (isolated, chart + 23 files): static ✓, Vitest 79 / 79, audit 1512 / 390 / 320 + dark + behaviour 0 new, Studio
  E2E 338 / 338 (3 shards), Build-QA PASS. Contact sheets: the 390 sheet showed "5,900 of 7,564 h" leaving the unit "h"
  alone on its line (in the new example and the older "Utilisation against a target"): the chart page's `hours()` now
  puts a no-break space before "h". Re-gate of the chart page PASS; the unit stays with its number.

## Picture drops on one row or one item (tier M; BACKLOG P1 ×2, user "dọn hết trước khi qua phase mới")

Branch claude/modest-gauss-20ef1e. BACKLOG "a row's picture through a helper" and "pictures inside list props" (both
2026-10-10, docs/research/studio-usability-eval-2026-10-10.md §5).
- **Engine** (`tools/studio/data-source.mjs`): classify gives a helper's parameter kind "param" with `helper` (an object
  argument `p.photo`, or a lookup `const one = people[id]`). A walk (`reach`) follows a place through props, spreads,
  fragments, children, lists, `.map` rows, helper calls, conditions and `let`s set in branches, binding each function's
  parameters to the call's arguments; `produce` finds the bindings the target element is drawn with. A row a filter or
  sort moved is found by the fields its object copies from the data (`id: t.id`), a list place is checked against the
  fields the canvas read there (`titled: true` vs the default false). op setDataField `via` (holders, nearest first,
  `holds` for a holder a helper draws) and `path` (a field inside a value written in place or read by a .map). An
  initials Avatar (no `src`) takes the field its sibling branch reads. `followAdding` resolves a const item
  (`seenBy={[gia, emi]}`) to where it is written.
- **Client**: `inspector/callSite.ts` `viaOf` (holders whose props hold the instance by identity, through fragments,
  with plain fields and the holder's own row); `writeAtUse` routes `helper` values. `edit/assets/picture.ts`
  `itemPictureOf` (the item of the owner's list prop: layer index `Avatar[2]`, else picture / key / fields, ties by
  drawing order) and `writeItemPicture`; `assets.ts` makes such faces drop targets ("Picture of Avatar"). DesignPanel's
  Picture on an initials Avatar goes the same way. doc.mjs maps `via` locs on pages you made.
- Real files checked with the engine: sidebar desktop (RowCard rows[1] → taskRow → personAvatar → people.bao.photo,
  through filter/sort/slice) and phone frame (`let content` → taskList("Due this week", …, true) → people.alex.photo).
- Tests: data-source selftest +10 cases (47); E2E FW-235…238 (figma group, `scenarios/figma/pictures.mjs`, fixture
  frame "E2E pictures").
- Not covered (refused in words): a layer either side of a condition, a helper in another file, a default parameter.
- Gate (slot from chart-color-phase2, Giám sát's queue; `--isolated`, 12 files): **PASS**, Studio E2E 338/0 (4 shards,
  1415 s). Then `studio:e2e --only=figma,select --rows=FW-235…238,SE-36`: 5/0 on the first run.

## Chart sets in the Studio inspector (tier S; G3 of the P2/P3 triage, approved by the user 2026-10-23; Giám sát assigned it here)

Branch zen/feat/chart-inspector-props-20261023 (stacked on #236: the Color rows need `palette`).
- Read ❖ Chart (6143:31287) live with `tools/studio/figma-props-read.js` (read-only): 15 sets with properties (Line,
  Multi-Line, Stack-Bar, Bar, Area, Grouped-Bar, Combo, Donut, Radial, Bar-List, Heatmap, Curve-Preview, Gauge, Funnel,
  Bullet; Gauge/Funnel/Bullet by their set ids). Chart/Chart-Card has no component properties, so it has no entry.
  Only that page's entry of component-properties.json changed (48 other pages byte-identical; Curve-Preview unchanged).
- figma-props.map.mjs: eleven charts mapped. The header properties (Show Icon … Show Open) are ChartCard's (skip), Sector
  is the data's period count and Average the data's mean (skip), Donut's Ring-Slot its data (skip); the rest map to
  showAverage, orientation, type, showLegend, palette, legendPosition, totalPosition, size, label, value. LineChart maps
  Line-Chart only (Multi-Line is `compare`, no prop picks it); Bar-List and Heatmap have only the header and keep the one
  list. Push and pull keep their chart branch (figma-charts.mjs runs before the generic set lookup both ways).
- Generated: figmaProps (105 components, 230 props), variantSets (the Main component frame draws the chart variants).
  studio:selftest ✓ (propGroups 352), library-keys / native-pack checks ✓, tsc ✓.
- Merged main 9022cdad (after #236 merged; #237's chart-*.json contracts came in, no overlap). Gate (isolated, the map +
  the two generated maps): Studio self-tests ✓, TypeScript ✓, nested layer names 45 / 45, Studio E2E 338 / 338
  (3 shards, BL-02 Main component coverage included), Build-QA PASS. No platform page in scope, so no contact sheet.

## AppShell session · Every component forwards data-* (tier M, many components; G2 AI UI decisions, user via Giám sát)

Branch zen/fix/components-forward-data-attrs-20261023 from main 9fe063d2. User's answers (G2): every component forwards
`data-*` (Skeletons included) so `data-ai-ui-id` lands; keep the verified heuristic; the classifier runs on the device;
ChatReactorsPanel stays experimental. After #244 (which recorded these answers and the spec format: Zen's tree), the
merge keeps #244's README wording with data-* marked built, and drops the BACKLOG build line.
- `_shared/data-attributes.ts`: `dataAttributes(props)` picks the `data-*` keys; spread first on a root so the
  component's own data-* styling hooks win. Only data-*: no other HTML attribute changes what a component renders.
- 119 public components destructured their props with no rest (static scan). A codemod (AST, tools/studio/jsx-source)
  gave 105 a `...rest` and `{...dataAttributes(rest)}` on every JSX root they return; 14 by hand where the root is a
  variable, a fragment or a conditional (BottomSheet, Dialog, ModalForm, SidePanel, ToastStack: the ref'd panel; ChatFile
  both branches; ChatPhotos; ChatReactions' pill; ChatReactorsPanel's sheet; DatePickerMonthYear; Menu's surface;
  PropertySelect / Status / Date through PickerCell `data`; TableTrend through trendBadge).
- tests/smoke/conformance.test.tsx: every public component gets `data-zen-conformance` and must put it in the DOM
  (NO_DATA: the providers and ZenPortal).
- Verified count: 38 before #237, 53 after it (chart contracts), same heuristic.
- Slot (Giám sát's GO): the conformance run found 20 the scan missed — the charts' shared ChartBlock, Divider's two
  non-decorative branches, ChatThread and SidebarSubMenu (the codemod put the spread on a context provider),
  ChatReactorsPanel's desktop popover (through ZenPortal), PropertyPeople / Tags (MultiCell), SidebarMenuItem (the item
  row, `dataAttributes(item)`). Fixed; conformance 218 passed / 5 skipped, `npm test` 1300 passed (82 files).

## Backlog G1 designer questions + G2 answers (tier XS, docs only; Giám sát's request, user "xử hết backlog")
- QUESTIONS.md / QUESTIONS.vi.md: one designer review batch moved from BACKLOG (triage group G1, 10 entries): Calendar
  toolbar mobile, Metric Title-Highlight, Action-Icon-Gap 20, Bottom-Navigation surface, Side-Bar/Master/Small-Density
  named "Component", 438-page library gaps, Android bars, unnamed layers, chart questions, AI UI Figma first.
- BACKLOG per the user's G2 answers: AI UI decisions closed (41 verified stand, Zen's node tree with an A2UI exporter
  later, classifier on the device, ChatReactorsPanel experimental), only `data-*` forwarding left to build; ListItem Value
  "decided, not built"; sheet table "Figma first, then code". docs/ai-ui/README.md "Open decisions" updated the same way.
- Open BACKLOG entries with a priority 32 → 21 (ListItem Value is parked now, like Code view), then + 1 P3 for Giám sát:
  compile #238's Swift/Dart on a machine with the toolchains. After merging main (#238, #241 closed two more): 20.

## 320px debt left: the designer calls (tier L: docs chrome at 320; user: "xử hết", B1, "Gỡ khỏi mục này")

Branch claude/eloquent-mclean-8f4974 from main 4b96bbb8. BACKLOG P1 "320px debt left" → archived.
- Re-measured at 320 (audit on a private server, 6 pages): the 13 Chat findings were gone already (the 10-20 AppShell
  gate fixed ChatComposer and the narrow desktop ChatThread); 10 layout findings left: Voice 5, DatePicker 2, Pagination 1,
  Rating 1, Settings form 1, plus the templates "Show all" target false positive.
- The 9 in a card (Voice, DatePicker, Pagination, Rating) overflowed only because the docs chrome left an example 248px and
  its Card 208, against 248 inside a Card on a real 320 phone. `platform.css` under 375px: stage and playground preview
  span the card with an 8px inset (example 272). Measured with `--css` first: all 9 fit; 390/1512 untouched.
- Settings form template: the photo row wraps, FileUpload in `<Box width="fill" minWidth={136}>` (button 119 at
  Comfortable; 150 is left at 390), so only a 320 phone stacks it. 390/1512 widths measured unchanged.
- `audit.mjs` targets: a target scrolled out of a clipping frame is skipped (the "Show all" link at y 10683 sat under a
  frame ending at 8937 and was "crowded" by the next card's button).
- Text / widgets / sidebar style findings stay in the all-viewport baseline (user: accepted, not 320 debt).
- Seen, not changed: Settings form's save bar truncates "Discard" at 320 Comfortable — the user's 10-19 ActionBar rule
  (Primary keeps its label, the other gives way).
- Gate 1 (`qa --all --isolated`, after merging main 99d230be): static, Vitest 82/82, contracts, dark, behaviour, Studio
  E2E 338/0 ✓; audit ✗ 14 new 320 "edge" errors (ai-chat "Rate an answer" after Regenerate, ai-ui Prompt=invoices),
  all one false positive: pre-wrap text gives the space at each line break its own rect, hanging 4px past the box
  (words end at 295.8 in a 296 box). `audit.mjs` edges now measure pre-wrap text by its words; both pages clean.
- Gate 2 (all 83 pages, `--isolated`, Studio E2E left out: only audit.mjs changed since gate 1): audit 1512/390/320,
  dark, behaviour 0 errors, 0 new warnings → PASS. Contact sheets: templates 390/1512 keep the photo row whole.
  Visual diff templates 1512 + 390, old vs new template: 32 identical. Baseline: the 28 @320 keys gate 2 no longer finds
  removed (13 Chat, 10 layout, the Show-all target, 4 Text-page heading demos); 16 @320 keys left, all also at 1512/390.

## Session C · Direct paste, what was left (tier S; G3 item 2 from Giám sát, user-approved triage)
Branch `zen/fix/studio-native-paste-rest-20261023`. The other-files part waits on the library publish (BACKLOG P2 kept
for it); the rest closed (research doc studio-native-paste-2026-10-17.md §8).
- Copy for Figma (frame menu) wrote after the click with `navigator.clipboard.write`: Chromium rewrote the html and only
  the plugin read it. The menu now reads the frame ahead when it opens (`readFrameAhead`, CanvasMenu) and the click
  writes code + html in a copy event (`copyFrameNow`, ≤ 3 s wait for the read; else the old write, "copy again for the
  Zen file's canvas"); the Screen layer's menu uses what ⌘C read ahead. HO-12 reads the html unsanitized.
- Grid row heights: Figma test (QA page, removed): four stretched Metric-Cards in a Hug row without minimum → row 208
  (Goal-Progress), Sparkline cards 236 → 208. The paste now takes each stretched instance cell's canvas height as
  `minSize` (`withCanvasHeights`: findBySrc by element id). HO-12's page gained a two-Metric-Card Grid; it checks the
  minimums equal the canvas heights.
- Pack 23.3 → 7.7 MB (gzip 0.76): `compactPack` interns subtrees ≥ 40 chars seen twice into `shared` (`{$: n}`),
  `expandPack` restores fresh copies (78 ms, cached per pack); all native-pack writes compact, reads expand. Round trip
  byte-identical; paste messages of 58 Studio pages + Expenses identical to the old pack's. figma-native selftest 142.
- Kept by design: slot overrides on the slot's default layer, and the component's alias variable in kept overrides.
- Sticky native paste tried live (BACKLOG P3 from B, handed over by the progress session; archived). Oracle: a frame
  with a Fixed dock via `numberOfFixedChildren` copied from Figma desktop → FIXED_WHEN_CHILD_OF_SCROLLING_FRAME on the
  dock, no `fixedChildrenDivider`. A ⌘V of a Studio frame (sticky top + bottom) → fixed count 1, and Figma's copy of it
  keeps STICKY_SCROLLS and FIXED. figma-native unchanged. QA page cleared, clipboard put back 6/6 both times.

## Session C · PropertyField ↔ Figma gaps (BACKLOG P3; Giám sát's G3 queue, tier M)
Branch `zen/fix/studio-property-field-figma-20261023`.
- Figma (user's choice "Make Container a Slot"): in the 8 Person / Tags variants of `.Primitives/Input/Property-Value`
  (16921:6022) Person / Tag-1 / Tag-2 now sit in `Value-Slot` (one SLOT property, gap bound like Container's, hidden in
  Default so "Empty" keeps its place) inside Container; sizes unchanged (280 × 40), the 7 example instances kept their
  people and labels. component-properties.json has the slot; native pack re-probed for the two sets (probe frame,
  clipboard saved and restored, merge-property.mjs replaces the sets and 25 symbols). Needs the library publish.
- Push: People / Tags fill the Value-Slot (a Person Tag per person: its name in its own text — Tag's Label property and
  first text are its avatar's — the avatar's first letter; a Badge per label); a ring's progress (BadgeStatus, the Status
  cell) is the Progress arc (`arcs` on the nested Leading; from 3π/2, as the set's own 0 / 25 / 50 / 100). Plugin
  `applyArcs` (landed inside B's 09849d4 in the shared checkout); native paste writes the arc override too.
- Pull: the reader records changed arcs (`arcs`); People / Tags from `innerSlots` (old files: Person, Tag-1/2). Found on
  the live read and fixed: the Value's parts became PropertyField `overrides` (a note per row), and a BadgeStatus' own
  label came back as children.
- Real Figma (QA page): import → arcs 80 / 60, 3 people, 3 labels; the real reader + pull give them back
  (fixture figma-property-values.json). Selftests: push 411, pull 134, native 141; plugin `npm test` ✓.

## Session B · Studio Variables v2 (G4, tier L; user decisions: modes prop, mode lists from tokens, rename keeps an alias)

- Spec docs/research/studio-variables-v2-spec-2026-10-23.md. Chunks 1–4 in one PR: Edit variable (meta op, plugin
  217d5c6), rename of a code-read variable (formerNames → `--zen-old: var(--zen-new)`, style-guard token/renamed),
  modes (src/tokens/modes.generated.ts feeds ZenProvider and Studio; add/rename/duplicate/delete; plugin 09849d4), a
  frame's `modes` (Stack/Grid/Box/Screen, useModeScope; Apply variable mode; push/pull explicit modes; plugin 1d3f0e3).
  Each plugin write checked live on throwaway nodes. Chunk 5 (new collections) to BACKLOG P3.
- Also: plugin f24b64b (Swap Project Colors async getter; BACKLOG line closed), relayed from the user.
- Found and fixed in my own work: checkedName skipped every clash on create (`except` undefined), token-outputs needed
  the old names for alias targets, VA-01 regression (the + Add mode cell was a columnheader).
- Gate `--isolated` PASS on 2b051305 (after merging #232): 0 errors, Studio E2E 341 works (VA-05…07, FW-210…213).

## A photo file from the computer on a repo page (tier M; BACKLOG P2, G4 picked by the user in the triage session)

Branch zen/feat/studio-desktop-photo-repo-20261023 (stacked on #239). Example and template code cannot read this
browser's uploads, so a dropped photo is saved in the repo first.
- Dev server: `POST /__zen-studio/media { name, data }` (write headers) writes `src/assets/media/<slug>-<hash>.webp`
  (the same bytes are the same file) and a CREDITS.md row "Dropped in Zen Studio from …, to confirm before publishing"
  (`tools/studio/repo-media.mjs`, selftest 3 cases). A file, not a draft: it stays when the edit is undone or discarded.
- Client: `edit/assets/repoMedia.ts` converts PNG / JPEG / WebP to WebP ≤ 1600 px and registers the key at once
  (`media.ts` registerRepoPicture); the glob's own update merges new pictures instead of reloading the Studio.
  `canvas/fileDrop.ts` on a repo page → `assets.ts dropComputerPictures`: on a pictured layer or a list face the
  picture (writePicture, with #239's helper and list paths), elsewhere a new `<Image src={new URL(…)}>` where it fell.
  "Your uploads" on a repo page (click, drop, the Inspector's and a table cell's Picture) are saved the same way.
- E2E FW-239 (drop on a helper row's avatar → people.bao.photo is the saved file, CREDITS row, ⌘Z) and FW-240 (drop into
  the Stack → an Image reading the file, ⌘Z); both remove what they saved.
- Finding met on the way, fixed at its owner (FW-240's first run): pasted or inserted code could not read a repo
  picture. `arrange.mjs` / `slots.mjs` parsed it as a script (`import.meta` refused) and took `URL` for a component to
  import; they parse as a module now, `URL` is a JS global and `import.meta` reads no name (arrange selftest +1 case).
- Gate (slot from box-themes; `--isolated`, the branch's 13 files): **PASS**, Studio E2E 338/0. FW-235…240: 5/1 (FW-240,
  the paste finding above); after the fix FW-239/240 2/0 and a second gate on arrange.mjs + slots.mjs **PASS** 338/0.

## Box themes in code: the Figma theme audit as harness rules (tier M; user review 2026-10-23)

Branch zen/feat/box-theme-rules-20261023 (worktree festive-archimedes-176df5). #227 had folded the two P1s into one P2.
- Already on main (checked against the live file): Card theme · color · surface (120 variants), ListBox (64), MetricCard
  types incl. Tile, ChartCard theme/color/surface, Card/List-Box/Metric-Card contracts.
- User review (AskUserQuestion), all as recommended: the theme/* rules at Figma's severities, fix flagged examples;
  MetricCard `surface` + ChartCard `spacing`; descriptions written to Figma; later "Theo Figma" (a Canvas/Alt Sidebar
  sits on the canvas, not Surface/Alt) and "Làm luôn" for on-solid-content.
- Rules: theme/box-on-canvas, mixed-elevation, mixed-boxes (warn), mode-override, navigation-surface, on-solid-content.
  on-white-solid already existed as content/on-white-solid. Page boxes are read per AppShell / PlatformPhone /
  ZenProvider (pageSurfaces); PlatformPhone canvas="alt" paints Surface/Alt (= Canvas/Default) and "surface" Canvas/Alt,
  so the canvas reader maps them (card.tsx's "white Canvas/Alt" phone was grey: now canvas="surface").
- Fixed by the rules: 3 Sidebars background="alt" on Canvas/Alt (now shadow={false} divider), 2 top bars type default on
  Canvas/Default (now alt), g-grid KPI cards shadowed beside flat charts (now default), the Q3 widget's On-Color badge on
  Solid Neutral (white on white in dark mode; now inverse); ProjectsHome's thumbnail ZenProvider keeps theme (allowed:
  same mode, re-declared for its brand).
- Styles: + 3 Color Chart Sector/On-Color styles; build-style-manifest no longer multiplies a bound paint's opacity (the
  variable's alpha) a second time. Studio: Metric-Card Card Surface/Spacing both ways; Subtle Color was dropped on push.
- Figma: descriptions of Card, List-Box, Metric-Card and 9 chart sets rewritten (backup frame on ARCHIVED). My first
  write dropped the Color lines chart-color-phase2 had just added to six charts; restored word for word a minute later,
  now in the source (chartColor) and FORCE, and that session was told.
- Left out: a ChartCard row in the Studio Figma-props map (Chart/Chart-Card has no property of its own to anchor the
  nested Card; its theme props show as code props). AppShell's default bar type (alt) does not follow canvas="alt": the
  rule flags it at the TopNavigation; AppShell's files belong to the BadgeStatus migration, so Giám sát routes the
  one-line fix (TOP_NAV_TYPE.bar follows canvas) to its owner.
- Gate (02:42–03:25, isolated, 8 pages + the token-scope set, 24 files): static ✓, audit 1512/390/320 0 errors, dark 0,
  behaviour 0, browser tests 81/81, Studio E2E 338/0, Build-QA PASS. Contact sheets: the Canvas/Alt Sidebars sit white
  on white with their divider, the G1 KPI cards are flat beside the charts, the Q3 badge reads Inverse. At 1512 the two
  new ListBox examples shrank (.pe-shell is a 480-tall row for app windows): their page is now a column of its content's
  height (list-item.css), re-shot after the slot came back: `qa --only=list-item --isolated` PASS (audit, dark,
  behaviour 0); at 1512 the three Pale groups fill their columns and the flat page hugs its list, 390 unchanged.

## Figma: workflow steps drawn as themed Badges → Badge-Status (tier S, Figma-only; BACKLOG P3, user approved the write)

Zen file 9nZv4uW2LT21yuHabMTCh1. Scan: every page's text for the harness's step words (To Do … Cancelled, vi) and the
code's project steps (Planning, Active, On hold, Completed, plus Not started / In discussion), kept where the nearest
instance is the Badge set (260:4825). The HR screens and the AppShell boards already showed Badge-Status (10-21 swap).
Swapped with `swapComponent` (labels and widths kept; signatures match the main variant: fills, text style, arcs):

| Page | Frame | Badge node | Before → after |
| --- | --- | --- | --- |
| ◆ HR-Platform | `.Row` 7394:108859, State=Hover | I7394:108361;4035:10637;7394:108378;4081:18368;7394:108838;4035:11662;7394:108722 | Badge Neutral Subtle M "To Do" → Badge-Status To Do M |
| ◆ HR-Platform | `.Row` 7394:108859, State=Default | I7394:108528;4035:10637;7394:110374;4081:18370;7394:111923;4035:11662;7394:110388 | Badge Neutral Subtle M "To Do" → To Do M |
| ❖ Popover | Popover/Default 14046:67128 (status menu) | I14046:67128;4031:26127;14046:67145;4031:26096;14046:67151;829:19627 | Blue "In Discussion" → In Review M, label kept |
| ❖ Popover | 〃 | …14046:67146;4031:26096;14046:67153;829:19627 | Neutral "Not Started" → To Do M, label kept |
| ❖ Popover | 〃 | …14046:67147;4031:26096;14046:67155;829:19627 | Yellow "In Progress" → In Progress M |
| ❖ Popover | 〃 | …14046:67148;4031:26096;14046:67157;829:19627 | Red "Cancelled" → Cancelled M |
| ❖ Popover | 〃 | …14046:67149;4031:26096;14046:67159;829:19627 | Green "Done" → Done M |
| ❖ List-Item | Example/People directory 14990:1171, Card 14990:1664, Projects | I14990:1664;6643:50987;14990:1683;14817:2747;4080:11391;14990:1612 | Blue "Active" (Loyalty app) → In Progress M, label "Active" (code: projectStep) |
| ❖ List-Item | 〃 | I14990:1664;6643:50987;14990:1684;14817:2747;4080:11391;14990:1652 | Blue "Active" (Zen design system) → In Progress M, label "Active" |

- Layer names: the old layers had the Badge's default name, so Figma's swap renames them Badge-Status (as the 10-21
  swap did); no custom name was touched. Rings keep the variant's arc (no progress pushed by hand).
- Stay Badges (not a task's step, as in code): leave requests Pending/Approved/Rejected (HR tables), Draft, Ready to
  ship, New, Paid/Unpaid, Voice Ready/Paused. Plain step text (Kanban group headers with Progress-Icon, Schedule
  event cards, keyboards) is not a Badge.
- Audit (zen-figma-audit.js, minified to fit use_figma): `.Row` 0 errors, 2 warnings (pre-existing Light drag-handle
  icon in Table/Cell, the template's own choice); Popover 0/0; People directory 2 errors fixed (Person and Toolbar
  frames clipped a button/chip shadow by 2px: Clip content off), 2 warnings left (docs Example/Stage corner radii).
  Screenshots checked; nothing moved, so no overlap. Final scan: 0 themed Badges with a step word on the 3 pages.

## Chart number format presets (tier M; user G2 2026-10-23: "literal preset format="currency" + currency"; scope widened by the user to every chart with `format`)

Branch zen/feat/chart-format-presets-20261023 from main 9fe063d2. BACKLOG P2 "Charts in Studio pages show no currency".
- chartCore: `ChartFormatPreset` ("compact" | "currency" | "percent"), `ChartFormat` (function or preset), `formatOf(format,
  currency)`. Currency: Intl's narrow symbol before defaultFormat's compact figure ("$128.4K", "€950", "-₫1.2K"; a code
  with no symbol keeps a no-break space: "CHF 5K"; a code Intl refuses is written as its letters). `currency` alone
  implies the currency preset; percent appends "%" to the value as it is.
- `format` + `currency` on LineChart, StackBarChart, BarChart, AreaChart, GroupedBarChart, ComboChart (`lineFormat` too,
  sharing `currency`), DonutChart, RadialChart and GaugeChart (their default stays the share of `max`), FunnelChart,
  HeatmapChart, BarList, BulletChart (a row function or a preset) and MetricCard. The user widened the scope from the
  approved three (LineChart, BarList, MetricCard): a preset only some charts take would crash a page that writes it on
  another (format is called as a function).
- Studio palette: on a builder page a money callback becomes `format="currency"`, a share `"percent"` (PRESETS); hours
  and goals keep the chart's own format. figma-widgets selftest: number formats come back like data (Figma has no format
  property). part-props: PlotFrame no longer maps `format` (the chart resolves it first).
- Guideline row "Number format" + a do line; good-fixture cases; example "Money as a preset" (LineChart + BarList).

## Chart push: the page's labels, axis and Tooltip (tier M; user G2 2026-10-23: "push the page's real data … X labels, six Y ticks, active tooltip")

Branch zen/feat/chart-push-real-data-20261023 (stacked on the format presets: labels use the page's preset). BACKLOG P2
"Studio push of Line, Bar, Area, Grouped and Combo charts draws Figma's sample data".
- Read live (read-only): Line's periods are .Primitives/Chart/Sector instances (Label, Select "Selected Highlight",
  Tooltip) beside six Trend Label texts; Bar vertical Y-Axis › Label × 6, X-Axis › Tick › Label, a Tooltip-Anchor at a
  fixed column (x / column width: 4→2, 6→2, 7→5, 12→8); Bar horizontal Categories / Values / Grid › Tick × 4; Area,
  Grouped-Bar and Combo name their axis texts after Figma's sample (Q1…, Apr–Sep, Mon–Sun, Jan–Dec; 2.5K…, $125K…, 50%…);
  Area's anchor sits on the last Sector (constraint MAX); Multi-Line's comparison Tooltip at Compare › Active; Grouped and
  Combo have no active state. The importer resolves edits by exact names (`>` direct child, `[i]`), so the push names them.
- figma-charts.mjs: `formatFor` (chartCore formatOf in Node: presets, currency, lineFormat), `sixTicks` (shared with
  Stack-Bar; fifths of the top when the code has another step count), `lineMarks`, `barMarks`, `axisMarks`,
  `fixedTooltip` (the highlighted period's value, hidden past the data, noted when the page's active one differs).
  Stack-Bar's tooltip and Donut's total use the page's format too. `drawn: "labels"` → note "draws its own sample marks".
- Live check in the Zen file (QA page 15872:3, frame removed after): the plugin's own applyProperties / applyNested /
  applyEdits / nestedAt / layerIn (verbatim from studio-import.js) on six instances: every path resolved (0 notes), every
  text read back as written. Found and fixed: Area's tooltip with fewer periods than its Sector sat on an empty period
  (now hidden); a horizontal row past the data kept an empty pill and a sample bar (now hidden, its value empty). Found,
  BACKLOG P3 (plugin repo): a bare horizontal Bar keeps 290px after its Heading hides, so Values drift from the rows.
- figma-push selftest 420 (a page of six labelled charts: Line, Bar V/H, Area in EUR, Grouped, Combo with lineFormat).
- Gate for both chart PRs (isolated, top branch c6bb2bfd after main b8c4241e; pages chart, widgets, metric): static ✓,
  Vitest 80 / 80, audit 1512 / 390 / 320 + dark + behaviour 0 new, Studio E2E 340 / 341 — B-10 (Export → Import the
  same text) timed out on a click while the machine was loaded (C's E2E ran beside it ~25 s) and passed alone right
  after (1 / 1). Contact sheets: "Money as a preset" reads "$" on the axis, Tooltip and list at 390 and 1512.

- Static: tsc, usage, style, guidelines, studio, ai-ui, mcp, nested-paths. The conformance run and the gate wait for a
  browser slot.

## Voice proposals (tier M; the user approved them all, relayed by the progress session: "chia như đề xuất")

Branch zen/feat/voice-proposals-20261023 from main 9fe063d2. Review `docs/research/voice-usability-review-2026-10-13.md`.
- A4: `AiVoiceConversation state="thinking"`: the signal rests as five 4px dots that brighten in turn (opacity) and the
  halo breathes (voice.css, infinite, inside no-preference; reduced motion keeps still dots); Badge "Thinking",
  heading "Thinking it through", speaker "You · Said", Interrupt as the main action. Figma's variant stays QUESTIONS
  Voice (a), now noting the code look.
- R7: `useVoiceLevels(stream, { bars = 56, rate = 7, paused })` (Voice/useVoiceLevels.ts): AnalyserNode RMS → dBFS −60…0
  → 0–1, one level per 1/rate s, undefined without a stream.
- C3: `ChatVoice onSeek(share)`: the waveform becomes an APG slider (Playback position, value "0:16 of 0:32"; pointer
  with capture, ←/→ 5 %, PageUp/Down 10 %, Home, End; RTL flips the pointer), focus ring Focus/Accent/Solid.
- R4, R6, A5, A8: guideline Do lines; examples: Discard with an Undo toast, "Your microphone's real levels" (silence
  warning after 3 s under the quiet line), the conversation ends your turn on 1.2 s of silence then thinks, "A turn Zen
  did not catch". Chat example seeks.
- Labels (en, vi): voiceThinking, voiceThinkingHeading, voiceThinkingGuidance, voiceYouSaid, voicePosition,
  voicePositionValue. Generated docs rebuilt (guidelines, api, ai-ui). Test tests/interaction/voice-proposals.test.tsx.
- Overlap: the AppShell session's data-* forwarding branch (#246) edits the same component signatures (Voice.tsx,
  Chat.tsx); merged it in early, ChatVoice keeps `onSeek` and `...rest`.
- Gate (slot from debt-320px, Giám sát's GO; `--isolated --pages=voice,chat`): **PASS** — Vitest 83/83 (the new test
  6/6), audits 1512 / 390 / 320, dark, keyboard / APG, voice 8 and chat 10 examples; contact sheets looked at (the narrow
  recorder footer wraps "Live levels · 7 a second" as the existing "48 kHz · Mono" one does).

## Session B · AppShell phone bars in Figma (tier M; BACKLOG P3, user-approved through the progress session)

- figma-push `mobileShellNode`: a phone AppShell (root or inside the page) with phone parts → Pattern/AppShell/Mobile
  16261:136204 (Device · Top Bar/Band/Band-Sheet/Media · Bottom Tab-Bar/Floating/Actions/None), layers per Top read
  from the set. Bar type by canvas as AppShell.tsx BAR_TYPE; flat repaints the Default bar Surface/Flat (edit `fill`,
  plugin 84b6d1e, figma-native too); band colour on Band / Stage; hero/backdrop slot hidden and emptied when unset
  (Figma's sample Placeholder kept its 192px). ActionBar → Action-Bar/Mobile (Type, Actions Dual/Single × direction,
  buttons in Figma's order). A Screen with its own bars keeps them and notes the AppShell's.
- BottomNavigation tabs (were "no item set yet"): Items/Default · Floating · Floating-Glass, Theme by selection,
  selectedIcon, showLabels, dot, the Default bar's action as Type=Action, the floating CTA's glyph. Pull reads them back
  (labels kept while hidden, value, theme, selection, action): round trip exact in the selftest.
- library-keys.json + 4 sets (keys read live). TOP_NAV_TYPES + transparent / transparent-on-color.
- Native paste: native-pack `write --merge` of a probe copy (+3 sets: the pattern, Action-Bar/Mobile, Status-bar/IOS/
  Tablet; 36 symbols, 23.6 MB, no pictures); figma-native nestedAt looks into a frame on the path (Band › Top-Navigation),
  as the importer does, and writes an edit's fill. The capture switched the user's Figma tab (they were on Home); the
  clipboard was saved and restored (6/6 types).
- Live, real importer in the Zen file (QA page 15872:3, frames removed): flat bar + 3 tabs; band accent + ActionBar.
- FW-160 made order-independent (Giám sát: it failed after other figma rows in C's run): pointer and modifiers reset,
  ⇧1 once the Assets panel is open, boxes read when the canvas is still, the drop in the slot's room below its Empty.
- Left: pulling the pattern back to AppShell, and a standalone ActionBar in Figma → BACKLOG P3. Archived BACKLOG
  "Example className, round 2" and "AppShell phone bars"; the sticky native paste line is C's (tried live).

## Phone AppShell pulled back from Figma; ActionBar alone both ways (tier M; B's P3, user approved the split via the parent)

Branch zen/feat/pull-phone-appshell-20261023, stacked on B's #253 (zen/feat/push-appshell-phone-bars-20261023: its
mobileShellNode / MOBILE_SHELL_TOP / actionBarParts are what this reads back).
- figma-pull `mobileShellElement`: Pattern/AppShell/Mobile → AppShell. Top → mobileTop; the Top-Navigation at that Top's
  place (Bar `Top-Navigation`, Band `Band/…`, Band-Sheet and Media `Stage/…`) → topNavigation, its type left unsaid when it
  is the one AppShell gives (Bar: the canvas's twin; Band: Transparent / Transparent-On-Color; Media: Liquid-Overlay);
  Tab-Bar / Floating → bottomNavigation, Actions → actionBar; Content → the page; shown Hero / Backdrop slots; the band's
  paint → band, the pattern's fill → canvas (a read's `Color/` group stripped).
- `actionBarElement`: Action-Bar/Mobile (in the pattern or alone) → ActionBar: Glass, Dual, Horizontal order (Tertiary
  then Primary), a role's own level unsaid, the Leading-Icon as startIcon.
- figmaReadCode: a placed pattern read as the push writes it (`readMobileShell`): the Top-Navigation through readTopNav,
  Bottom-Navigation with its Nav-Items, `Actions/Button[i]` paths (`readActionBarParts`; the generic read gave unindexed
  "Button" paths and only overridden parts), slots by the frames they sit in, hidden slots and the band's paint as edits.
  A placed tab is labelled by its Label-Text (its layer keeps the component's name). `partOf` carries `topNav`.
- figma-push `actionBarNode`: an ActionBar alone is Action-Bar/Mobile (Home-Indicator off) instead of "left out";
  `actionBarParts` takes a path prefix. library-keys: Action-Bar/Mobile's key read from the live file.
- Real Zen file: a temporary Pattern/AppShell/Mobile (Phone · Bar · Tab-Bar) and an Action-Bar/Mobile on "Studio exports —
  QA", read with the new code and removed; the pattern read is a fixture (figma-mobile-shell-read.json): AppShell with
  Figma's sample TopNavigation, four tabs and the Empty-State page, no note.
- Selftest tools/studio/figma-mobile-shell.selftest.mjs (in studio:selftest): 19 checks — push → pull round trips for
  every Top, band, canvas, hero/backdrop, tabs, ActionBar in and out of the shell, and the two live reads.
