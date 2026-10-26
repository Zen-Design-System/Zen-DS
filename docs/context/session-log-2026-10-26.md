# Session log 2026-10-26

## UI/UX Pro Max skill · evaluation, then UX principles + product patterns

The user (2026-10-26): research folding the "UI/UX Pro Max" skill (zip, v2.15.0, MIT) into Zen's skills for Figma and
Studio; evaluate it first. Read it in a scratch folder and ran its search on four Zen-like briefs: app briefs came back
as landing patterns with off-domain palettes and fonts (an internal HR dashboard → "Education teal", Victorian
serifs); its UX rows (WCAG 2.2, forms, navigation, charts) are the useful part. Verdict: don't install it (its visual
layer breaks Zen's hard rules); take the UX layer as Zen-owned principles. Plan P1–P5 (ux-principles.md,
product-patterns.md, a robustness pass in design-principles §9, wiring into the Figma AI kit and Zen Agent's prompt):
`docs/research/ui-ux-pro-max-evaluation-2026-10-26.md`.
Then (user): P1–P5 approved without G4 ("Bỏ G4. Phần đó nghiên cứu sau": data-view principles are a later study).
Wrote `skills/zen-component-usage/references/ux-principles.md` (states, forms, navigation, WCAG 2.2, touch, motion;
each item names the Zen part, e.g. Form already focuses the first invalid field, so a long form only adds an
InlineMessage summary) and `product-patterns.md` (13 families → screens, trust, avoid, Figma ◆ / code templates);
design-principles §0 and §9 (push the data, break it on purpose, walk it as a user); the two SKILL.md files; the AI
kit (`kit.mjs`, `aiKit.ts`, kit README/AGENTS); a short block in Zen Agent's prompt. Checks: ai-kit:check 193 ✓,
agent selftest 21 ✓, words ✓, guidelines:check ✓, usage:selftest ✓. Built first in the shared checkout, then moved to
the worktree branch `zen/docs/ux-principles-20261026` at Giám sát's request (no browser gate: docs and two source
lists).

## Studio responsive breakpoints · plan (approved 2026-10-26: D1–D4 as recommended, D5 no)

The user (2026-10-25): people should see and adjust the desktop / tablet / phone versions of a screen, as in Framer.
Read the Studio and Layout code, weighed per-layer overrides (Framer / Figma Sites), linked Screens, breakpoint
variables, responsive layout props and intrinsic layout. The user chose (2026-10-26): previews side by side + a few
responsive layout props (the Grid `columns` shape) + "Make a separate Screen". Plan:
`docs/research/studio-responsive-breakpoints-2026-10-26.md` (P1–P3, decisions D1–D5, sessions A/B). Finding for P1:
six components follow the window width with `@media`, not their frame's breakpoint. Nothing built yet.
Then (user): P1 is a per-Screen view switch Desktop · Tablet · Mobile (a view through `frameOverrides`, never saved;
edge drags stay real resizes, a desktop Screen's breakpoint follows its width) instead of three frames side by side.

## Studio responsive breakpoints · P1 build (bp-studio, tier L; branch claude/responsive-studio-b28ea5)

Approved 2026-10-26 (D1–D4; no harness rule). Built the Studio half's PR 1 (P1 + P3 of the plan):
- **Six window media queries** → the frame's breakpoint: AiChat model picker, AlertBanner Medium wrap, DatePicker
  dual months, Pagination optional pages, modal SidePanel width now read `[data-breakpoint="mobile"]`, with the old
  window query kept only where no ancestor says desktop or tablet (`:not(:is([data-breakpoint="desktop"],
  [data-breakpoint="tablet"]) *)`: the docs platform has no root breakpoint, and train CI's audit caught
  date-picker / pagination @390 overflowing without it); Dialog's and
  ModalForm's 480 / 720 rules apply only to an uncontained overlay (one in a device frame already follows the frame
  through `@container zen-modal-frame`).
- **The Screen's breakpoint** (`runtime.tsx`): `screenBreakpoint(device, width)` (`tools/studio/screen-devices.mjs`):
  phone → mobile, tablet → tablet, desktop → its width's (744 / 1024), the rendered width once laid out (Present
  viewports, a phone's window; one shared ResizeObserver). Published through `useModeScope` (`useZen().breakpoint`) and
  on the frame (`data-breakpoint`), so overlays in the frame's portal follow it. Export frames take it too.
- **View switch** (`board/ScreenViewSwitch.tsx`, `builder/screenViews.ts`): Segmented Desktop · Tablet · Mobile + More
  views (every device, Make a separate Screen) in a Screen's toolbar; frame override `view` (sessionStorage, never the
  page); `BuilderFrame` renders the Screen in `SimulatedDeviceContext` at the view's width, above its neighbours.
  While viewing: "Viewing Mobile · W 390 · Back to Desktop" stays on the label row, the label shows the breakpoint icon,
  Escape on the name ends it, resize handles and W / H are off, Figma copies take no canvas heights.
- **Changes on <breakpoint>** (`inspector/breakpointBehaviours.ts` registry + `BreakpointSection.tsx`): phone modes,
  page margins, mobile layout, AppShell below 1024, phone sheets, Grid columns per breakpoint, phone looks.
- **Placeholders** (`ScreenCanvasContext`, `builder/screenParts.ts`, `screenModel.ts`): on the mobile breakpoint a
  missing Top / Bottom Navigation shows a dashed "Add …" (frame chrome to the selection layer; dropped by exports); the
  part goes to the root AppShell (Bottom from its Sidebar rows, D3, else four blank items) unless the Screen draws its
  own phone parts; child screens get no Bottom placeholder. Only on the Screen being worked on (selected, or viewed):
  the train gate's HO-03 (canvas vs exported HTML, pixel comparison) caught them on every phone Screen.
- **Make a separate Screen**: `copyFrame(…, { as })` → `<id>-mobile`, the device's size, `<title> · Mobile`,
  `versionOf` (dialect-validated, Studio-only prop). D4: `proto/versions.ts versionFor` — Play's fixed viewport, Open on
  phone (ZenProvider's breakpoint) and Present show the version for the breakpoint. Handoff lists "Breakpoint versions".
- **Play / Present**: open on the viewed device; the viewport drags from the left edge too, the tag reads
  `W × H · Mobile`.
- Checks: `screenModel.selftest.mjs` (27, in studio:selftest), builder selftest (versionOf), studio:selftest all pass,
  tsc clean, style:check clean. E2E BP-01…08 in `scenarios/breakpoints.mjs` (new default group, in the baseline).
- **Train gate** (`zen/train/responsive-20261026`, PR #310; `npm run qa -- --all --isolated` on 92a1c217): every static
  step, platform audit 1512/390/320 (0 errors), dark, behaviour, browser tests 92/92 pass; Studio E2E 372/373 — HO-03
  regressed (placeholders on every phone Screen; Overlay exports at 720 → mobile), fixed in 480b59df. After merging
  main 2e94ad76 (#307, #308; conflicts in docs and the E2E group list): HO-03, PT-27/28, BP-01…08 by id 11/11, then the
  builder, handoff and breakpoints groups 74/74. Contact sheets (12) reviewed: phone looks at 390, desktop at 1512.

## bp-library · responsive Layout props (P2 library half of the responsive-breakpoints plan)

Plan: `docs/research/studio-responsive-breakpoints-2026-10-26.md` §2 and §4, approved by the user 2026-10-26 (D5, a
harness rule for hiding on every breakpoint, is not approved: no rule or audit check added). Worktree
`responsive-layout-2b644b`; session bp-studio builds the Studio half. Tier L (Layout renders on every page).

- **`_shared/responsive.ts`:** `Responsive<T>` (`T | { desktop?, tablet?, mobile? }`), `ResponsiveBreakpoint`,
  `resolveAt(value, breakpoint)`: own key, then the wider ones, a narrower key only when no wider one is set (the old
  `columnsAt` order); desktop when no breakpoint is known. Exported from Layout.
- **Layout.tsx:** Stack `direction gap align justify wrap padding paddingX paddingY`, Grid `gap rowGap columnGap padding`,
  Box `padding paddingX paddingY` take `Responsive<…>`; `hideOn` on all three writes `data-hidden="true"`
  (`display: none` in layout.css, element kept). The breakpoint is the frame's own `modes.breakpoint`, else
  `useZen().breakpoint`, else desktop. Stack writes the resolved direction to `data-direction`, so the layout.css sizing
  rules stay as they were.
- **Grid `columns` nested-mode bug confirmed** by the new test (a desktop frame on a mobile page got 1 column, on a tablet
  page 2): the `[data-breakpoint] .zen-grid` descendant rules also matched frames with their own modes. Grid now resolves
  `columns` with `resolveAt`; the two descendant rules are gone and stackBelow's selector is plain again.
- **Test:** `tests/interaction/layout-responsive.test.tsx` (18): resolveAt, Stack/Grid/Box at the three breakpoints,
  hideOn, no provider, nested modes both ways. `npm test`: 92 files, 1402 passed.
- **Docs:** JSDoc per prop; `scripts/build-api.mjs` names the alias (`Responsive<"column" | "row">`) instead of
  react-docgen's raw `T | { … }`; guideline entry (use, api rows Per breakpoint + Hide on, Do: structure per
  breakpoint, sizes from tokens and modes; Don't: hide on every breakpoint); two Layout examples (a row that stacks on
  phones; a panel hidden on phones), each on the page and in a PlatformPhone.
- **AI UI catalog:** `tools/ai-ui/types.mjs` reads `Responsive<X>` as X or `{ desktop, tablet, mobile }` of X (the generic
  alias had turned gap/padding/direction into "anything"); `npm run ai-ui:build`. AGENTS.consumer.md's Layout row names
  the per-breakpoint props and hideOn.
- **Studio compatibility:** `compile-api-build.mjs` `literalUnion` sees through `Responsive<…>` (the generated file is
  unchanged: Stack/Grid/Box keep their LITERAL_PROPS); `propSchema.ts` `editorFor` edits the plain value of a
  `Responsive<X>` (else LayoutSection's ScaleField dropped gap/padding) — told bp-studio.
- **Figma:** `tools/studio/responsive-props.mjs` (isomorphic): push draws each frame at its Screen's breakpoint (phone
  mobile, tablet tablet, desktop by width), a frame's `modes` breakpoint for its layers, leaves out layers hidden there,
  and notes both; Update from Figma (figma-diff) compares and writes only that breakpoint's key (a reset writes the
  prop's default or drops the key), collapses a value equal everywhere to plain, never offers hideOn or a hidden layer
  as removed. The pull itself needs no change (it writes a new page; merging is figma-diff's). Selftests: figma-push
  (+5), figma-diff (+8).
- **CI audit fix (#309 run 40218954024):** 4 `outline` errors, the phone copies of both examples had their card heading
  as h4 right under the bar's h1. `OnPageAndPhone` now passes the level: h4 on the page, h2 in the phone.
- **Merge order:** bp-studio's PR 1 makes the Studio Screen give its breakpoint through ZenContext. Until it is in main,
  Grid columns and the new props inside a phone Screen on the canvas read the app's desktop breakpoint.

## dnd E2E rows: DND-03 and DND-05…08 fixed and baselined (tier S; branch zen/fix/studio-dnd-e2e-20261026; PR #308)

Found while #304 recorded the opt-in groups (session-log-2026-10-25, "New E2E rows that break fail the gate"): DND-03
and DND-06 failed alone, DND-07 hung past its 40-min limit, DND-05/08 never ran. Each row, at its owner:
- **DND-03 (product, Segmented):** the screenshot was a blank page; the run's Vite error was "Maximum update depth
  exceeded" (stack in `_shared/phone-sheet.tsx`). Cause: on a phone a full-width Segmented shares its row equally
  (`flex: 1 1 0`), so in a box as wide as its content (CalendarToolbar in a column that does not stretch, a floating
  layer) its widest label is cut → chip row; the chip row (chip padding + gaps) is wider than the segments' sum, which
  was the `needed` width → segments again → cut → … Each ChipGroup mount sets its Chips' breakpoint state, so React's
  limit tripped in phone-sheet. Fix in `Segmented.tsx`: `needed` for full width = widest segment × count; segments
  that come back and are cut at once keep the chips until the chips have more room than that width (no CSS change).
  Regression case in `tests/interaction/segmented-phone-chips.test.tsx` (floating Segmented + CalendarToolbar in a
  `align-items: flex-start` column): on 22548853's Segmented it fails with the same "Maximum update depth exceeded".
- **DND-06 (scenario):** Layers lists the front-most layer first (`data-order="front"`, Figma's order), so a row's upper
  half is after it in the code; the product wrote Text, ListBox, Box, Card, which is right. The "empty Screen's own
  row" no longer exists (the frame row is the Screen's), so the third drag now goes into the middle of the Card's row
  (into the Card, last).
- **DND-07 (scenario):** Layers names a Box "Frame N", so the `/^\s*Box\b/` row filter never matched; each item waited
  out the click and three ⌘Z timeouts (~25 s × 128 items > 40 min, then the retry). The Frame row is now found by its
  layer id (`local:<page>.zen.tsx:<loc>#0`). Measured 10 items in 24 s; the row limit is now 10 min (was 40).
- **DND-05, DND-08:** worked the first time they ran; nothing changed.

Runs (gate slot from Giám sát, main 22548853 merged first):
- `--only=dnd --rows=DND-03,DND-06,DND-08,DND-05 --no-retry`: 4 works, 274 s, no Vite errors.
- `ZEN_DND_LIMIT=10 … --rows=DND-07 --no-retry`: works, 24 s.
- Vitest `segmented-phone-chips` 4/4, plus toast-search-chip-segmented, controls, layout-sizing, chart-card-metric,
  calendar, menu-chip-sheet: 79/79.
- `npm run qa -- --isolated --pages=calendar --files=<3 files>`: PASS (Figma contracts 33 suites for Segmented,
  vitest full suite, audit 1512/390/320 + dark + behaviour 0 new, Studio E2E 363 works in 4 shards). Contact sheets
  segmented/calendar at 390 and 1512 looked the same as before (chips in "Periods on a phone", the full-width switch in
  the phone Calendar toolbar).
- `npm run platform:audit:selftest`: 70 passed (segmented-fit cases included).
- `--only=dnd --update-baseline`: 8 works, 0 broken, 990 s (DND-07 260 s), no Vite errors. The baseline now holds
  DND-01…08; README, run.mjs and dnd.mjs say about 17 minutes for the group.
- Merged main 8ec5baa9 (#306) before the push, then 9c517538 (#311: CHANGELOG and this log kept both sides, #311 first).

## Studio Play: desktop full screen + dark popovers (tier S, branch zen/fix/studio-play-desktop-20261026)

The user: "Phần play prototype đang lỗi. Không hiện full màn hình desktop ra", then "lỗi popover trong table không
chuyển sang darkmode khi UI bản play đang là darkmode". Reproduced on the DEMO-MEET page `quan-ly-task` with Playwright on
a private Studio server (a copy of `.zen-studio/pages`).

- **Desktop not full screen.** Play's Auto viewport drew a desktop Screen as a card `min(1440px, 100%)` wide on a 24px
  padded stage with rounded corners (1920 window: 240px gutters each side). Since #288 (10-24) ▷ on a page's Screen
  starts Play instead of Present's full-screen card, so the user met the card where a full screen used to be. Fix
  (`builder/proto/Player.tsx`, `builder.css`): the stage carries `data-viewport` from the viewport asked for (auto when
  no device is simulated, set before the fixed box measures, so its padding never changes under the measure); in Auto
  the stage has no padding and the device is `width: 100%`, `height: 100cqh`, square, no shadow. Fixed viewports
  (devices, typed W × H) keep the padded stage.
- **Popover light in a dark Play.** Play had no `ZenPortalProvider`, so everything that portals through ZenPortal (the
  Table editor layer, icon tooltips, a portalled Chip popover, the ToastStack) went to the Studio's `<body>`, outside the
  layer that carries Play's `data-theme`. Fix: `Player` holds the portal root and wraps the ToastProvider and the layer
  in `ZenPortalProvider`; `PlayLayer` draws `.official-portal-root.studio-portal-root` with Play's modes beside the
  device, as Present does. Not inside the device: a modal opened there (a Side Panel) inerts the device's other
  children (`inertOutside`), and a popover opened from the modal must stay live.
- Checked by script (1512, 1920, 1280 and iPad landscape at 80%): device = the page under the bar; Table popover dark
  (bg 5/255) under its cell, flips above at the bottom of a scaled iPad; Escape closes it and stays in Play; a select in
  the task Side Panel picks; tooltip and toast in the dark layer. Present already had its own portal root.
- E2E rows PT-27 (desktop Auto fills, iPad on the padded stage) and PT-28 (dark Table popover, toast, tooltip, a Table
  popover in a modal Side Panel picks), ids from Giám sát. tsc, studio:selftest, style:check, usage:check pass.
- Gate (Giám sát's GO, main 9c517538 merged): rows PT-27/28 passed only on retry at first (PT-28 read the Present bar's
  hover tooltip, from the Studio chrome; the row now reads the panel's "Close panel" tip and moves the pointer off the
  bar), then 2/2 first try; prototype group 28/28; `npm run qa -- --isolated` PASS, Studio E2E 367 works · 0 broken
  (report .qa/reports/2026-10-25T21-01-44-68156075.md).

## Studio responsive breakpoints · PR 2, the Studio half of P2 (bp-studio, tier L; branch zen/feat/studio-responsive-fields-20261026)

From main 9fa8ef52 (train #310 with bp-layout's library half in). Built:
- **`inspector/responsiveModel.ts`** (selftest 26): reads a Stack / Grid / Box prop as unset, a literal, one literal per
  breakpoint or code; `responsiveOps` turns the controls' plain setProp / removeProp into the editing breakpoint's key
  (desktop on a plain prop stays plain; elsewhere `{ desktop: <old or default>, mobile: <new> }`; collapses to plain when
  every breakpoint shows the same; removeProp writes the default there), `resetOps`, `sameEverywhereOps`, own keys.
- **LayoutSection**: a Breakpoint row (shown when the frame is narrower than desktop, values are per breakpoint, or one is
  picked): Segmented Desktop · Tablet · Mobile with dots, "Same on every breakpoint" (link icon), "Own on Mobile: …" +
  "Reset to Desktop/Tablet". Per-breakpoint values read as the literal they show, so the grouped controls (Flow,
  Alignment, Gap, Padding) edit them unchanged; an own value puts a dot after the group's label. A "Hide on" row
  (checkboxes) for Stack / Grid / Box. Other sections of a layer in a narrower frame say "All breakpoints".
- **Canvas**: `select/spacing.ts` reads per-breakpoint gap / padding at the frame's breakpoint; SpacingLayer writes the
  frame breakpoint's key through `responsiveOps`.
- **Hide on** (`edit/hideOn.ts`): the layer menu's Breakpoint group (canvas and Layers rows) — Hide / Show on each
  breakpoint for Stack / Grid / Box, Wrap in Box and hide on <shown or Mobile> for other layers (wrapInBox, one edit).
  Layers dims a row hidden at its frame's breakpoint (the library's `data-hidden`) with eye-off + the breakpoint icon.
- **Changes on <breakpoint>**: "Layout: Stack direction row → column" and "N frames hidden here (hideOn)".
- **MCP / Agent**: `update` takes `{ desktop, tablet, mobile }` and breakpoint lists (schema + runtime), its description and
  the Agent prompt name the shape. `tools/studio/responsive-props.d.mts` added for the Studio's TypeScript.
- Not done (on purpose): direction arrows on the canvas (none exist), a per-field Reset (one Reset per element, per
  breakpoint, keeps the panel short), the Studio-only `hidden="mobile"` (a Screen's layout) kept as it is.
- E2E BP-09…13 (Inspector flow + Same, Reset, canvas gap pick, Hide on + Wrap and hide + Layers dimming, All
  breakpoints + Changes): 5/5 on their first run, in the baseline.
- **Gate** (`qa --isolated --pages=layout` + 15 files): static, audit 1512/390/320, dark, behaviour pass; Studio E2E 378/380
  — B-04 (a phone Screen's gap wrote `{ desktop, mobile }`) and ST-03 (the layer menu off screen). Fixed: the frame
  carries its Screen's **primary breakpoint** (`data-primary-breakpoint`: a web page's desktop, a phone's mobile), where
  edits stay plain (a plain value becomes the primary's key once another breakpoint differs); the layer menu has one Hide
  on item (builder pages only). Merged main 389a0992 (#312), reran builder + structural + breakpoints + select: 109/109.
  Contact sheets (layout 390 / 1512) reviewed.

## Giám sát · twelve new E2E rows recorded in the baseline

Since #304 a new row only guards against regressions once it is in `matrix.baseline.json`. B-47, B-48, PT-22…28 and
HO-18…20 (from #286/#287/#294/#302/#306/#307) passed in every gate since and were listed as "new, work". Run
`studio:e2e -- --rows=<those 12> --update-baseline` on main 9fa8ef52: 12 works, 0 broken, 98 s.

## appshell-placeholder · AppShell is a placeholder frame, the examples are Layout examples

User: "Cần phân biệt rõ AppShell và Layout Example. AppShell trên Studio giống example hơn. AppShell nên là dạng
placeholder giống component trong trang ◇ Master-Layout" (Figma 1128:29541). Picked: the playground shows the
placeholder only (sample app removed), the App Shell page's examples are renamed "Layout examples".
- Figma read (section 16254:1057): Pattern/AppShell/Desktop 9 variants (Layout × Collapse), Mobile 32 (Device × Top ×
  Bottom), .Primitives/AppShell/Placeholder (Pale fill, Subtle dashed 2·2, Corner-Radius/Large, Padding/Medium,
  Heading/4 Content/Placeholder → code `tone="light"`, no Placeholder tone), Pane titles, Stepper "Step Title"/"Optional".
- `tools/studio/appshell-placeholder.mjs` (import-free; `.d.mts`): the copy, the variant lists, the parts' code and
  `appShellPlaceholderCode()`. Used by the Assets item (toast handlers), `MAIN_SAMPLES.AppShellHeader`, screen-chrome's
  frame parts (sidebar, top bar, actions, page header, banner, side panel, floating action, bottom navigation) and the
  new "Page with AppShell" (Figma's default variant around the content Stack, which keeps its "Start building here").
- Main component: `mainComponent/appShellSets.ts` lists both sets (Figma's own variants, `wrap` 4 / 8, each drawn from
  its code in its frame 1512 × 982 · 390 × 844 · 744 × 1133); `ListGrid`/`CodeCell` in MainComponentFrame; Variant
  panel jumps to the nearest listed variant. Fixed on the way: a screen cell's AppShell shrank to its content (drawer
  layout) → `.studio-mc__screen > .zen-app-shell` fills it.
- Playground (`appLayer/shell.tsx`) rewritten on the placeholders, the pickers kept (Layout, Collapse, Canvas, Top row,
  Sections, Notifications, panes, Progress, Side panel, Floating, Banner, mobile Top/Bottom); every control reports.
- Selftests updated (builder, compile, screen-frame, engine-iso): 83/83 studio selftests, tsc clean. Palette `--deep`
  has many old findings from other items; this item's were the accent FAB (now `zen-allow-accent`) and an Empty State
  inside Card hosts (host-dependent, kept).
- Follow-ups (d7881f66): a page's own Sidebar (Assets item, Screen parts, new page) has no sample switcher (`brand:
  false`, as figma-pull drops Figma's LOGO); Focus' Summary placeholder 408 high; the Stepper is named. E2E rows that
  asserted the old frame updated as intended: B-27 (6 rows; + Primary adds one to Settings · Secondary · Main Action),
  B-28 (the Page header's own crumbs), B-29 (two Breadcrumbs: header + inserted), B-33 (label-1/label-2), HO-01 (imports).
- Cost: the Studio App Shell page's long tasks 3.9 s → 5.3 s (41 AppShell cells), first frame 4.7 → 6.3 s on a warm server.
- Gate: queued with Giám sát (after tag-badge-gap, #314, Bug's chart cells); merge main first.
- User then updated .Primitives/AppShell/Pane in Figma. Re-read (16254:1099, 10 variants, props unchanged): every
  theme's fill, stroke, effect and padding already matched; two differences fixed in app-shell.css — Pane-Header's
  counter axis is Min (the 20px action wrapper at the top of the title's line, code centred it) and Theme=Canvas has
  radius 0. Studio's Main component now draws the Pane set too (`MAIN_SETS.AppShellPane`, Figma's ten variants in 264 ×
  640 frames; `MAIN_SAMPLES.AppShellPane`). The placeholder's label is centred (`Text align="center"`, Figma's text
  align), which showed once it wrapped in a 264 pane. Docs regenerated (api/guidelines app-shell). 83/83 selftests.

## Session "Bug" · Studio Main component chart widths (tier S; user screenshot: "Lỗi hiển thị")

- Cause: charts fill their container and the Main component cell is max-content, so each non-ring chart drew at its
  axis width (probe: Line 32 px with a 0-width plot, Area 36, Bar 36/81, Stack/Grouped/Combo/Funnel/Bullet 136–150).
  Not a regression of #301/#303: bc1c0fc0 (before #301) measures the same.
- Fix: MainComponentFrame FIXED_WIDTHS gets the 11 other chart sets at their Figma default-variant widths (read live
  2026-10-26: 297 Line/Multi-Line/Stack-Bar, 352 Bar/Area/Grouped/Combo/Gauge/Funnel/Bullet, 320 Curve-Preview).
  Probe after: every chart at that width, ring cells flip data-wrapped 0 times in 3 s (45 before #301).
- Gate PASS (--isolated --pages=chart): 0 warnings, Studio E2E 380/380 in 4 shards. PR #315.

## tag-badge-gap · Tags and Badges side by side are 4px (tier M)

The user: "Vẫn đang bị lỗi rule. Spacing giữa tag phải là 4px" (a PropertyField "Phụ trách" with three person Tags 8px
apart), then "áp dụng rule tương tự cho badge". Cause: `property-field.css` set Gap/XSmall on the cell and its row gap;
the harness `tag/row-gap` reads only an app's Stack, so a component's own CSS slipped through.

Spec card (changed elements only):

| Element | Token | Figma |
| --- | --- | --- |
| PropertyPeople / PropertyTags items (`.zen-property-value__slot`) | Spacing/Gap/2XSmall across and down; the cell's + stays Gap/XSmall | Property-Value Value-Slot |
| TopNavigation `largeTitleBadges` row | Gap/2XSmall apart, Gap/XSmall below the heading | Heading-Text/Basic › Badges |
| PageHeader `meta`, ListItem `trailing` of Badges/Tags only | Gap/2XSmall (other content keeps XSmall / Small) | — |

- **Code:** the chips sit in a Value-Slot span (Figma's structure) so the + keeps 8px (control gap ladder). Table items,
  the Table tag editor and Autocomplete tags were already 2XSmall. Examples fixed by the new rule: shape, ThemePreview,
  app-shell d-expressive-1 / -2.
- **Harness:** `badge/row-gap` (error, Badge + BadgeStatus), bad/good fixtures; Badge guideline Do/Don't, Tag Do names
  the runtime kind. `usage:selftest` 261 rules.
- **Runtime audit:** `item-row-gap` in `widgetLayout`: adjacent Tag–Tag / Badge–Badge in a flex or grid row, across and
  down a wrap, ≠ the row's `--zen-spacing-gap-2-xsmall`; chips, counters, absolute items, space-* rows and gaps ≥ 32 are
  not judged. 11 fixtures; audit selftest 81/81. Registered in audit.mjs (BASELINED, SEVERITY), qa ERROR_KINDS,
  build-qa-process.md.
- **Figma** (`9nZv4uW2LT21yuHabMTCh1`): itemSpacing (+ wrap spacing) rebound XSmall → 2XSmall on Value-Slot 17090:19,
  :74, :96, :118 (Person) and :146, :170, :194, :218 (Tags); Badges 12028:70969 (H1), 12048:8244 (H2), 12048:8252 (H3).
  A scan of every ❖ page found no other Tag/Badge row off 2XSmall. native-pack.json + native-defs.json.gz patched for
  those 11 nodes by script (round trip checked first; no desktop capture). The library still needs a publish.
- **Full audit** (`audit.mjs --isolated --quality --no-playground`, Giám sát's slot): 168 page runs (87 at 1512, 84 at
  390), item-row-gap ran on all of them: 0 findings, so the kind starts with a 0 baseline. The watchdog re-ran three
  slow pages at 1512 (global-dimensions, description-list, dock-icon). Proof it catches the slip: the old 8px CSS injected
  (`--css`) on input + top-navigation gives 3 item-row-gap errors (PropertyField people and labels, the badges row).
- **Gate** (`qa --isolated --files=<the 32 changed files>`; the hook had recorded none, since the edits were made through
  Bash): PASS. Static, Figma contracts (1 suite), Vitest 91/91, audit 1512/390/320 + dark, behaviour, Studio E2E
  380/380. The scope left out the PropertyField page and the app-shell examples, so a second run covered them
  (`--only=input,app-shell`): PASS (Vitest 90/90, audit 1512/390/320, dark, behaviour). Contact sheets reviewed:
  top-navigation (the badges row at 4px), shape, page-header, list-item, input (the Assignee Tags at 4px), app-shell.
- **CI on #317** failed at `ai-ui:check`: `docs/ai-ui` (catalog.json, spec.schema.json) is generated from the props and
  guideline text, and the TopNavigation JSDoc and the Badge guideline changed. Fixed with `npm run ai-ui:build` (only
  those two descriptions moved). The local gate (`tools/qa/run.mjs`) has no AI UI step, so it could not see this.
- **Gate step added** (the user: "add the ai-ui:check step to the local QA gate … in this PR"): "AI UI catalog in sync"
  runs `build-catalog.mjs --check` after the guidelines step when component TSX, the guideline source, docs/api,
  docs/guidelines, a Figma suite, tools/ai-ui or AGENTS.consumer.md is in scope (`auxKind` "ai-ui" for the last two).
  It does not regenerate: the ✗ says to run ai-ui:build and commit. Proof without a browser: a deliberately stale
  composer-rules.md fails it (`qa --files=AGENTS.consumer.md`, no pages), the restored file passes. QA self-test 43/43.

## Sidebar rows take the Sidebar's density (Studio → Figma, tier S)

User: "Menu item (Sidebar Item) trong Figma có 2 variant Density sao trong Studio chỉ có 1?", then "Khi đổi density của
sidebar thì các item cũng đổi variant theo density đó".
- Why one: in code, Density belongs to the whole Sidebar (`density`, `data-sidebar-density`, sidebar.css). The rows have
  no `density` prop. Figma puts Density on each Menu-Item (1536:27473: Medium 44/46px, Small 36/38px) because a variant
  can't inherit from its parent.
- Bug: `figma-push` `sidebarItemNode` and the `sections` items wrote only Label/Icon/Select/Counter, so every row came out
  Density=Medium (a `density="small"` Sidebar had 44px rows in its Small pattern), Theme=Neutral and State=Default.
- Fix (`tools/studio/figma-push.mjs`): `sidebarRowDensity` writes Density on every Menu-Item in the Sidebar's slots, as
  Sidebar.tsx resolves it (`density`, else AppShell `pattern="grid"` → small; `variant="small-density"` is always Small,
  as Figma's Small-Density set 5974:20590 draws 36px rows), always written so rows already in Figma swap. A Basic
  Sidebar's Footer-Content stays Medium at Small (sidebar.css: 44px). The AppShell passes `shellPattern` to its Sidebar.
  `menuItemLook` writes Theme (Accent/Neutral) and State (Disabled > `state` > Default) on JSX rows and section items.
- Pull (`figma-pull.mjs` `itemFields`): a Menu-Item's Theme=Accent → `theme: "accent"`, State=Disabled → `disabled`.
  Density stays the Sidebar's.
- Selftests: figma-push 495 (new: rows by density for medium / small / small-density / sections, footer, Theme/State,
  round trip; AppShell grid rows Small, plain shell Medium), figma-pull 151, figma-native 162, figma-diff 35,
  studio:selftest all pass.
- BACKLOG P2: nested rows (Level=Child) and Dropdown, push and pull together.
- **Gate** (`qa --isolated --files=` the three tools/studio files; the worktree's edits were not in the hook ledger, so a
  plain run found nothing to check): static, studio:selftest, TypeScript and nested layer names all pass; Studio E2E
  380 works · 0 broken (4 shards, 1722 s). Report `.qa/reports/2026-10-26T04-49-36-0958d62c.md`.

## caption-light · Caption text is always Light (tier M, PR #318, branch claude/caption-light-check-23432b)

User: "Mở phiên thêm check: chữ dùng text style Caption phải là tông Light (harness + audit lúc chạy + audit Figma), rồi
sửa mọi chỗ đang sai trong component, ví dụ và Studio." Mid-task: "Metric label cũng là light".
- **Spec card.** Element: any TEXT in Caption/Regular · Medium · Bold, plus a metric's label (`.zen-metric__label`,
  `.zen-metric-tile__label`; Figma Metric-Tile Metric-Title, Metric-Inline Icon-Highlight Label). Token: the family's
  Light (Neutral/Light on Canvas, Surface, Pale, Container, Popover; Inverse / On-*-Overlay Light on dark or imagery; a
  colour's Light for an error). Exceptions (4): on a Solid or Subtle fill follows the fill (§7); On-Colors, On-Brights,
  On-Accent; states (Disabled, Placeholder, Hyperlink, today/now/current in Accent); the Lights group takes Base.
  Title-Highlight's label is a title (Strongest), not a metric label. No keyboard/APG change.
- **Figma first** (live file, read-only scan of every ❖ page + Operation Components): the only non-Light Captions on a
  surface were the ones fixed below; Avatar, Badge, Badge-Counter, Calendar events, Gantt bars, chat "You" bubble,
  Notification-Dot sit on their own fill (exception 1). Chart labels were already rebound to Light by the chart-bars
  session (its branch also turns `.zen-chart__legend` and `.zen-chart__stage-count` Light; chart files stay theirs).
- **Harness** `text/caption-light` (error, css + Text/Heading): literal tone, or the tone words of a conditional (not the
  strings it compares); no tone = Strongest = finding. CSS: a block with the caption font size or a
  `.zen-type-caption-*` selector and a non-Light `color:` content token. 47 findings in the repo, all fixed (one
  `zen-allow-caption-light`: shape.tsx room names on their own Subtle fill). usage selftest 262 rules.
- **Runtime** kind `caption-light` in `qualityChecks` (style from the nearest `.zen-type-*` class, else metrics; tone from
  `toneName`, else `toneOf`); skips text whose nearest painted background is not a surface token, and states. audit.mjs
  BASELINED/SEVERITY/addQuality, qa ERROR_KINDS; 8 selftest fixtures, platform-audit selftest 90/90.
- **Figma audit** `text/caption-light` in `zen-figma-audit.js` (+ audit-rules.md, screen-rules.md). The harness is 108 KB,
  over use_figma's 50 KB code limit, so the library run used its own check functions verbatim in a small runner (layers
  hidden behind boolean properties included: Slider's Label-Range, Calendar's More).
- **Figma fixes** (147 TEXT layers rebound, read back after each): Calendar Day-Cell More ×3, Agenda-Item Meta ×14,
  Month Weekday ×7, Time-Grid Weekday ×12; Schedule Resource Name ×2, Itinerary Meta ×2, Event-Card Range ×8,
  Resource-Grid Label ×21; Rating NPS-Scale labels ×4; Stepper error Caption ×6 (→ Negative/Light); Metric-Tile
  Metric-Title ×4 (2 → Inverse/Light); Slider Number ×48; Timeline Gantt-Bar Title ×2, Gantt Label ×2, Week ×12.
  native-defs.json.gz patched for the 147 nodes (round trip checked; Inverse/Light had no shared paint, one appended at
  #FFFFFF98); native-pack.json holds no fills. figma-native selftest 162. No contract suite covers these sets.
  The library needs a publish. Designer screens left as warnings: ◆ Logistic 5613:1146, 12084:93091, 6091:22188,
  12084:93562, 12084:95140 (five quick-action labels each, Neutral/Strongest).
- **Code**: schedule.css, calendar.css, timeline.css, rating.css, slider.css, stepper.css, metric-widget.css, chat.css,
  top-navigation.css (overlay types only; on a colour band the subtitle is on a fill); JSDoc notes updated; Studio UI
  (AgentPanel, MyPages, NewPageDialog, StudioFolders, QuickInsert, PrototypePanel, AssetsPanel, ProjectSetup, ProjectsHome,
  ThemePreview, PagesPanel, ReadOnlyChip) and the app-shell examples (code samples too). Studio detach: an XSmall Badge's
  Caption label carries `zen-allow-caption-light` (it sits on the Badge's fill).
- **The user's decisions mid-task.** "Metric label cũng là light" → Metric-Tile titles (all sizes) and metric category
  names Light; a Title-Highlight title stays Strongest (a title). Shown a Figma comparison of Schedule Slot Small and
  Opinion items in Light: "Giữ như Figma. Các chữ này không được gọi là label. Vì trong ngữ cảnh này nó là giá trị chính
  và là giá trị một mình" → exception 5, a main value standing alone keeps its tone. Applied consistently: Schedule
  Resource Name (mobile) and Gantt-Bar Title (Milestone, Summary) rebound back to Strongest in Figma and code; the
  docs examples' quick-action names under IconButtons / DockIcons, the tracker values and the TV-remote names, and
  Studio's project-setup tile labels back to their original tones. The checks read "alone": harness — the only text
  beside Icon/IconButton/Button/DockIcon/Avatar/Image/Shape…, or of a button/label/a; runtime — the largest box around
  it with no other text is a control, a component root or holds a picture or icon; Figma — the variant's only own text,
  or a screen text under an instance in a vertical frame. A state's variant (Today, Now, Selected…) is skipped too.
  Net Figma rebinds: 144 (Calendar Day-Cell Selected "More" added). The temporary comparison frame on the QA page was
  deleted.
- **Day-Tile and Event-Card** (the user: ".Primitives/Calendar/Day-Tile Mình vừa update cả component này. Update lên
  Studio trong đợt này luôn", then "Event-Card cả này nữa"). Day-Tile 16142:3915 now: Today's Weekday Accent/Strongest,
  Selected on Active/Neutral/Subtle (Today: Active/Accent/Subtle) with no stroke → calendar.css + JSDoc; native defs
  patched for its 4 changed layers (round trip checked, every other Day-Tile field compared equal). Event-Card 16143:817:
  compared layer by layer with the stored definitions, only the Range colour (Light, from this change) differs; code
  already Light. No contract suite covers either set.
- **Round 2 (relayed from the main session, the user's words verbatim):** "tiêu đề luôn là strong"; "Subtext của heading
  cũng nên là light. Chỉ có paragraph chữ dài mới là base". Asked here, with A/B screenshots built on the QA page (the
  user: "Các câu hỏi cần trả lời kèm ảnh chụp để dễ hình dung"): Metric-Tile's Metric-Title is a label → Light; field and
  term labels → Light; meta lines → Light; Dialog / Side Panel / Modal Forms description → Base (a paragraph);
  Badge-Status Cancelled and a past itinerary title → Light; Agenda weekday, Date-Picker year/range, PageHeader eyebrow,
  Voice action labels → Base; Table column titles → Light (a kicker). Figma rebinds: 42 own layers (Description-List Term
  4, Property-Field 1, Slider/Field 16, Timeline Item 2, Condition-Item 1, Chat Reply Quote 12, Voice guidance 3,
  Badge-Status 2, Itinerary past title 1), 24 Inline-Field Label overrides, Stepper error Step Title 6 → Negative/
  Strongest. native defs patched for the 33 nodes the pack holds (Chat Reply Quote, Voice and the Inline-Field
  overrides are not in it). input-search.json Condition-Item / Input-Conditions entries re-captured by patch; digests
  equal Figma's (df384cdd, 87e4a81e). The Condition-Item's minus icon stays Neutral/Base (Figma), only its words Light.
- **Checks round 2:** harness `text/title-strongest` (error; replaces `heading/title-not-light`, Base too, kickers =
  Body/Small/Bold or All-Caps), `text/subtext-light` (CSS: subtitle / subtext / subheading / capline), and
  `content/title-is-strongest` raised to error with colour families (state selectors excepted). Runtime kind renamed
  `text-tone` (titles Strongest; Caption, labels, Subtexts Light). Figma `checkTextTone` with `text/title-strongest` and
  `text/subtext-light` by layer name; 0 findings on the library and screens. Allow comments: TopNavigation on a colour
  band, DashboardHeader's result count ("96 results", a value). CI fix: axe baseline color-contrast for CalendarDayCell,
  NpsScale, TimelineGantt; MetricCard tile test expects Inverse/Light. The platform-audit selftest (13 text-tone
  fixtures) still has to run: no browser runs until Giám sát's window.
- Gate 1 (head 52517e83: static, audit, dark, behaviour pass; E2E 367/380). The 13 regressions came from the placeholder frame:
  two crumbs made a new page a child screen (§17 R14: no phone Bottom Navigation) → pages take Master alone
  (`rootCrumbs`, `root: true`); a Studio bug, `itemElement` paired every same-label tab with the first (⊕ stacked,
  drags wrote the wrong item) → the n-th item with a label is the n-th element with that name; E2E rows updated where
  intended. Rerun of those 13 rows: 13/13. Merged main 43102f60 (#315 FIXED_WIDTHS kept).
- User (on the 3 rhythm warnings "pane 20 vs inner 16 + inset 8"): "Đổi bo góc Placeholder trong pane thành 12px (20 −
  8) cho đồng tâm, cả Figma và code". Figma: the Placeholder instance in each of the 10 Pane variants bound to
  Corner-Radius/Base (12 Rounded, 8 Standard: XLarge − 8 in each mode); every Pane in Pattern/AppShell/Desktop inherits.
  Code: the pane's placeholder takes `radius="md"` (Base). Gate 2 was stopped for it and rerun.
- Gate 3 (head 01bf1569): static, TypeScript, Vitest 90/90, platform audit 1512/390/320 (0 new warnings; the three
  concentric ones gone), dark, behaviour pass; Studio E2E 378/380. BL-01 ("no board" on the last 7 pages under 4-shard
  load) passes alone; PT-28 (dark-Play tooltip, a fixture without AppShell) fails the same with main's proto files and
  passed on a plain rerun: both flaky, not this change. New ⚠ type/visual-heading on the playground's placeholder label
  → `zen-allow-visual-heading` (d6c6235c). Slot handed to chart-bars; the formal rerun after them or on CI.

## Dashboard layout principles (skills, tier S)

User: "Nghiên cứu skill để cân bằng layout khi generate UI trên studio lẫn figma khi làm dashboard … tỷ lệ cân bằng và
không bị trống layout … chart quan trọng xuất hiện kích thước trong lưới như thế nào … các widget nên nằm trong cùng 1
lưới thay vì tách ra các section khác nhau (trừ khi nó có tiêu đề section riêng) … desktop và các thiết bị khác".
- New `skills/zen-component-usage/references/dashboard-layout.md` (principles, not checks, as the 10-20 files): rank the
  widgets (summary, hero, support, detail); one widget grid (rows `md` like the columns, a section only under a heading);
  12 parts with the span widths at 1512 / 1280 / 744 / 390; each widget's shape and narrowest width (KPI 240, chart 360,
  table 480 from DashboardTemplate; ring sizes, 32px BarList rows, 24px heatmap cells); hero 8 · companion 4 or 12; row
  recipes; equal feet (Grid stretch + ChartCard grow, audit `card-gap`); the reflow table; how to build it in code /
  Studio / Figma; screenshot questions; the HR overview of `.zen-studio/pages/quan-ly-task.zen.tsx` as before/after.
- Sources: Zen's own screens and rules; Material 3 canonical layouts; Grafana's 24-column panels; Apple WidgetKit sizes;
  Elastic EUI dashboard guidance; F-pattern and bento-grid practitioner guides.
- Wired in: zen-component-usage SKILL.md + product-patterns + design-principles §9, zen-responsive-screens SKILL.md +
  responsive-principles §3, zen-figma-design SKILL.md (files table, step 5), the AI kit for Figma (`KIT_SOURCES`,
  `src/platform/aiKit.ts` glob, kit README and AGENTS), Zen Agent's prompt (one principles bullet; the "Dashboards:"
  line is left alone because the chart-bars-full branch edits it).
- Findings: Zen's Grid has no per-cell span, so a mixed-span dashboard is built as row Grids (`"2fr 1fr"` rows sit
  ~gap/3 off a 3-column row); figma-pull keeps only a span every cell shares. A `span` prop (code, Studio fields, push
  and pull) was put to the user, not built. The HR overview Studio page breaks the existing §13 rule (`Stack gap="xl"`
  between widget rows, `align="start"`): reported, not edited (a Studio page changes only through the open Studio).
- Checks: `ai-kit:check` 196 ✓ (92 files, the new reference at `skills/zen-figma-design/references/`), Zen Agent
  selftest 21 ✓, `tsc` ✓. Gate `qa --isolated --pages=installation --files=` the three code files: static ✓, audit
  1512/390/320 ✓, dark ✓, behaviour ✓; its Studio E2E (prompt.mjs is under tools/studio) was stopped in shard 1 at
  Giám sát's request (the chart-bars session held the slot), so the PR was shipped with `--skip-gate` and CI runs it.

## Charts · full-width bars, hover-only active column, tighter donut gaps (tier M)

User: "stack hoặc bar chart nên làm style đầy đặn … spacing 8px … cột tràn ra 2 bên … đáy không có bo góc", then
"mặc định không nên hiện focus và tooltip, chỉ khi hover vào cột mới hiện", then "spacing của pie chart nên khít hơn".

| Where | Before | After |
| --- | --- | --- |
| Figma Bar-Chart Vertical (8 variants) | Column 2px padding, Lane/Bar max 40, radius 8 all corners, Bars/X-Axis gap 0 | padding 0, no max, bottom radii 0, Bars + X-Axis gap Spacing/Gap/XSmall; Tooltip-Anchor + Rule moved onto the selected column |
| Figma .Primitives/Chart/Column/Stack-Bar/Single (Vertical ×3) | 2px padding, Value max 40, radius 8 all | padding 0, no max, bottom radii 0 |
| Figma Stack-Bar-Chart (8) | Chart-Visual / Sectors grid gap 0 | gap Spacing/Gap/XSmall; Sectors' label track 32 → 24 so sector 1 still starts at 32 |
| Figma Donut-Chart (32) | slices 4px apart | slices redrawn 2px apart (same angles 30/23/18/17/12 %), Corner-Radius/XSmall re-bound |
| Code | `.zen-chart__column` 2px padding, bar ≤ 40px, radius all corners; last bar active | bar/stack blocks: bars + sectors `column-gap` 8, bars fill, `0 0` bottom radii (rise clip too); `PlotFrame hoverOnly`: nothing active until hover/keys, pointer leave or blur hands back to `initialIndex`; a touch keeps its column; DonutChart + Studio push `GAP 2` |

Contracts chart-bar / chart-stack-bar re-captured through `mcp-capture` (digests: 8 of 16 Bar variants changed, all
Horizontal equal; 8 of 8 Stack). With nothing active the screen-reader summary lists every column ("Jan 10, Feb 20, …"),
no new label keys. The palette Do/Don't previews pass `initialIndex={3}` so the highlight they compare stays visible.
Gotcha: setting `vectorPaths` on a Figma VECTOR resets its `cornerRadius` to 0 (re-set and re-bind it after).

Figma incident (same session): the ❖ Chart page (6143:31287) was found empty; the 15 chart sets plus .Chart/Hatch and
.Chart/Legend-Item were detached (parent null) before 12:11, the session's first Figma read, cause unknown. On the user's
request they were re-attached with their IDs in a new section "Chart components" (17250:3), in family rows (400 padding,
200 gaps); no other orphaned dependency (30 mains scanned). The page's doc frames are not recoverable this way.

Charts, later the same session (user, in order): "Bỏ icon trên header các Chart", Metric Label vs the description with
the description in an (i) Hint ("đồng bộ lại hết cho các chart"), "Bổ sung harness và doc usage cho chart trong Figma",
horizontal bars 8px ("Gap này là đang là 16px"), "Tooltip này chỉ bật khi hover".
- Figma (14 chart sets): Show Icon default off; Metric › Description → Metric-Label, props Show Metric Label + Metric
  Label (renamed, ids kept); Header › Hint = icon-info-circle-line 1460:917, 20px, Content/Neutral/Light, Show Hint
  (default on); Bar-Chart Horizontal rows Spacing/Gap/XSmall, min heights −8 per gap, bars flat at the axis;
  .Primitives/Chart/Sector "Tooltip" → Show Tooltip, default off (selected Sector exposed in Line/Multi-Line/Stack);
  Bar/Area/Multi-Line/Heatmap own Show Tooltip, default off. Chart-Card's header is nested: untouched.
- Code: ChartCard `hint` (MetricWidget's Hint pattern, aria-label "More information", Tooltip describes) and
  `metricLabel` (`description` @deprecated alias); 104 ChartCard tags rewritten (metricLabel, no icon); hover-only for
  Line/Area/Grouped/Combo with an overview summary; horizontal rows 24px + grow share, 8px gaps (the suite's axisGap
  exceptions are gone: both sides 8 now). Studio push/pull: Show Hint, Show Metric Label + Metric Label (pull also reads
  the old Description), Show Tooltip a preview state; the hint text is code's alone (round trip leaves it out).
- Figma AI kit: chart/header-icon, chart/tooltip-on (a frame named Hover/Tooltip is skipped), chart/metric-label-is-
  description; tested on a temporary section (each rule fires once, the clean and the hover-state charts pass) and
  removed. screen-rules §3 Charts + audit-rules rows.
- Later: Combo-Chart edge to edge (Marks and X-Axis reach 4px past the plot so the line, dots and pills stay on the bar
  centres; code the same through Padding/2XSmall); Caption Light (legend, Funnel counts, Stack-Bar labels) and the
  Metric Label Light, from the caption-light session; "Đây là trạng thái đang hover/active thì phải có tooltip": Figma
  Sectors all Select=Default with a Selected one always showing its Tooltip, Bar/Area/Multi-Line/Heatmap Hover (was Show
  Tooltip) drawing Active-Bar + Active-Wrapper overlays, rule, dots, cell ring (Active-Ring) with the Tooltip; suites pass
  no initialIndex where Figma shows none (pickedSector) and lose the 88% / 12px-dot / active-label exceptions.
  Gotchas: a grid cell takes one child (appendChildAt refuses an occupied cell, gridRowAnchorIndex is read-only), so the
  twin bar is absolute; swapping a nested instance's variant re-ids its subtree, so re-query after each swap.


## Sidebar nested rows (Studio ↔ Figma, BACKLOG P2, tier S)

Assigned by the user through "Kiểm tra tiến độ Figma-line freeform": the BACKLOG P2 left by #314.
- Figma: Menu-Item Level=Child (1551:5539) is a Tree-Line (16px) + Wrapper holding a Menu-Item Master instance (28px in,
  as `.zen-sidebar__sub-menu`). None of the Child variant's properties reach that inner instance (native pack: refs 0), so
  a Child row's label, icon, counter and Dropdown go on it (nested `Master`). Dropdown is the chevron icon itself
  (icon-chevron-down-01-line, no swap property).
- Push (`figma-push.mjs`): `menuItemNode` builds every Sidebar row (JSX and `sections`; data rows now carry their counter
  too); rows keep their data (`menuRow`) until `sidebarSubRows` lays out each row's nested rows right after it as
  Level=Child rows. Select by `selectedId`, else `selected`/`active`; a group is open as `defaultExpanded` says (and not
  in the rail); a closed group's rows are `hidden: true` so a pull reads them back. An open group's Dropdown is swapped
  for icon-chevron-up-01-line (nested `set`; `swapIcon` looks for an icon inside it). The rail turns Dropdown off.
  Deeper rows are drawn as Child rows too, with a note.
- Pull (`figma-pull.mjs`): the reader keeps hidden Level=Child Menu-Items (`closedSubRow`, marked hidden);
  `nestMenuRows` gives each Child row to the Menu-Item row before it, in `sections` (`children`) and in slots (JSX
  `<SidebarMenuItem>` children). `itemFields` reads a Child row through its inner `Master`, and writes `dropdown` (a
  chevron with no rows, instead of the old note) and `counter` (it was dropped before).
- Checks: figma-push 505 (new: rows, Child content, footer, sections + density, rail, round trip, figma-diff no change on
  a second pull), figma-pull 151 (Design Tokens now `dropdown: true`), figma-native 166 (new: Child variant hidden, label
  on the inner Menu-Item, chevron swap), figma-diff 35, figma-clip 9, studio:selftest pass. The reader code parses; it
  was not run in Figma. E2E HO-21 (id from Giám sát) written; runs with the gate.
- The Zen plugin's Import ignored `hidden` on a layer (native ⌘V hides it): fixed in the plugin repo (below).
- **Gate** (`qa --isolated --files=` the six tools/studio files, GO from Giám sát on eef3056f): static, studio:selftest,
  TypeScript, nested layer names pass; Studio E2E 381 works · 0 broken (3 shards, 1611 s), HO-21 new and working (alone
  first: 48 s). Report `.qa/reports/2026-10-26T09-17-26-0958d62c.md`. Then merged main c932a002 (#320, docs only here).
- The Zen plugin follow-up (session "Zen plugin: honour `hidden` on imported layers") pushed c1f0209 to `studio-import`:
  Import from Studio hides `hidden: true` layers and shows a Child row again once it is open (tests, not real Figma).
