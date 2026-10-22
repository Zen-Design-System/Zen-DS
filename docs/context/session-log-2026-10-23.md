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
