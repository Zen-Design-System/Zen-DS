# Session log 2026-10-14

## Studio: icon picker on nested icons (session "Studio toggles + click", branch zen/fix/studio-toggles-click, tier S)

- Asked to explain round-3 item 3 (icon suggestions), the picker was measured on a Dashboard-template page: the Revenue
  card's DockIcon showed "Default in Figma" (1) and "All icons" (200 of 1598) only. Cause: `TablePartPanel` rendered
  `PartPanel` without `InspectorFileContext`, so `useFileIcons` had no file. Fix: the part panel gets the owner's file
  (`parseSrc(selection.src).file`); the picker now shows "Used in this file" (12). Gate: `npm run qa -- --isolated
  --files=src/platform/studio/table/TableCellPanel.tsx`.
- User: "có" to ship → merged origin/main (#33 #36 #40; CHANGELOG and session-log conflicts were both-sides additions;
  figma-props, guidelines, api.generated in sync; tsc and studio:selftest pass) and `npm run ship` → PR #43.
- User: "OK với gợi ý của bạn. Làm ngay" → Recent + Related (`inspector/iconSuggestions.ts`):
  - Recent: the last picks of any icon picker, localStorage `zen-studio:recent-icons` (withRecent, 12 kept, 6 shown).
  - Related (relatedIcons): the icon's family (stems with its first word, coin/coins one family; ≤ 4), then the topics
    of the words beside it (`wordsNear`: the host's text or the nearest ancestor's within 4 levels; ≤ 2 topics), then
    the icon's own topics; ICON_TOPICS is a hand-written table of 14 topics (stems + label words); each topic gets a
    fair share of the tiles left ("Profit margin" + pie chart → money and chart); one icon per stem, same line/solid
    style; 12 shown.
  - Groups: Default in Figma, Recent, Related, Used in this file, All icons; an icon shows once, never the current one.
    Recent and Related are tiles (6 a row, 35×36, name as tooltip and accessible name).
  - TablePartPanel also provides InspectorHostContext (the part's element) so a nested icon gets its words.
  - Dashboard template: Revenue coins → coins family + wallet, bank note, bank, card, dollar, euro, receipt, piggy bank;
    pick wallet, next card's Recent leads with it.
  - Tests: iconSuggestions.selftest 17 checks; E2E IN-20 (two tile picks, Recent, no repeated icon), IN-07 finds
    groups by id.

## List-Box heading pushed in on the theme test frames (tier S, user: "component slot bị lỗi constrain làm thục chữ vào")

- Seen on ◆ Performance (Theme-01 … 08 mobile frames and the superseded review): "Members" started 28px in from the
  List-Box edge while the List-Items lined up at 0.
- Cause, in the library (`Component/List-Box` 14922:75297, all 100 variants): Header-Slot and Footer-Slot are vertical
  with counter-axis CENTER, and their default Heading / Footer texts were FIXED 263px (the slot width of a 311px box).
  A wider box (358 on a 390 phone) centres the 263px text in a 318px slot → +28. No other set in the file has a fixed
  text in a centred slot (scanned every page).
- Fix (user approved writing to the file): both slots counter-axis MIN, Heading / Footer `layoutSizingHorizontal` FILL
  (100 + 100), matching code (`.zen-list-box__header` / `__footer` are flex columns that stretch). The 30 authored slot
  texts on ◆ Performance set to FILL (slot content is the instance's own, so the library change does not reach them).
  Read back: 30 × Header-Slot MIN, text x0 w318 of 318; screenshots of Theme-01 Light and Theme-08 Dark checked.
- Harness (user approved): AI kit audit rule `text/shifted` (error) — authored left-aligned text with a fixed width in a
  vertical auto layout that centres or end-aligns, starting more than 1px in from the padding edge. Header comment,
  `checkShiftedText`, audit-rules.md row. Dry run of the same predicate on every page of the Zen file after the fix: 0
  findings (no false positives); the 30 texts read before the fix had exactly the shape it reports (FIXED, LEFT, x+28
  in a CENTER slot with 0 padding), but the rule itself was not run on them before they were fixed. `npm run ai-kit:check`
  102 ✓ (was 100).
- Repo contracts unaffected (component-properties.json lists only property names). Open for the user: publish the
  library; the Pokeslide file uses its own fork library, so its List-Boxes are not changed by this.

## Support background Rich (tier XS, user: "thêm 1 token nằm giữa Deep và Solid … tên là Rich dùng step 11")

- Repo: 20 tokens `Color/Background/Support/<colour>/Rich` = `{Light|Dark/<ramp>/11}` (ramp taken from Deep; Brand and
  Neutral from Base Colors (Project)) in `mode-colors-semantic.json` (431 → 451); each Support background set regrouped
  as Deep, Rich, Solid, Soft, Subtle, Pale (the live panel order, user's request), no other value changed.
  `figma.collections.json` count + note. `tokens:build` (2225 tokens, native too), `tokens:check` clean.
- Figma (live file, user approved): the same 20 variables, scopes and publishing copied from Deep; read back 40/40 hex
  equal the repo. The Plugin API cannot reorder variables (`variableIds` is read-only), so Rich sits last in each group
  until dragged under Deep; Sky and Mint are still Solid, Subtle, Soft, Deep, Pale in the panel. Library not published.

## Chart card Value Heading/3 → Heading/2 (tier XS, user: "Update Font size Value của card chart từ Figma (Từ heading 3 lên heading 2)")

- Live file, ❖ Chart page: 32 `Heading > Value` texts; 11 main-component ones were still Heading/3 — Chart/Line-Chart
  15328:1077, Stack-Bar-Chart 15328:1108, Donut-Chart ×3 (15324:1069, 15324:996, 15392:2450), Radial-Chart ×2
  (15325:1041, 15325:1098), Multi-Line-Chart ×4 (15426:2533, 15501:2971/3031/3001). Set to the same Heading/2 style the
  Bar, Area, Heatmap and new charts use (`setTextStyleIdAsync`); read back 11/11 Heading/2 25/32.
- Check: temporary instances with Value shown (Line, Donut Total=Start, Radial End, Multi-Line), screenshot clean, removed.
- Repo: no code reads this layer (`ChartCard` has no value prop). Library not published.

## ❖ Chart page tidied (tier XS, Figma only, user: "Sắp xếp các component/element bên Chart ngăn nắp gọn gàng lại")

- Before: one section, 8 covers on a 3 × 3 grid with a hole (Donut set pushed into it), the other sets loose at odd
  offsets, set paddings 0 / 15-24 / 24 / 40, Multi-Line Sector order 4 · 6 · 12 · 7.
- Now four sections stacked: **Chart** (7032:8969, kept) = the 8 covers on 4 × 2, all 1400 tall, renamed from
  "Bottom Sheet" to "Card Chart" … "Heatmap Chart"; **Chart components** (15576:3333) mirrors the cover grid: row 1
  Chart-Card, Line, Stack-Bar, Bar; row 2 Multi-Line, Donut, Radial, Heatmap; row 3 Area, Grouped-Bar, Combo, Gauge,
  Funnel, Bar-List, Bullet; **Widget themes**
  (15576:3334) = the board; **.Primitives** (15576:3335) = Legend-Item, Hatch. Every set auto-layout, padding 40, gap 40
  (Legend-Item 16), top-aligned; content tops line up per row, 120 between components, 200 between rows and sections.
- Multi-Line variants reordered 4 · 6 · 7 · 12 (default still 4-Sectors). Checked: no overlap or overflow in any section,
  screenshots of all four. No component, variant or instance otherwise changed. Library not published.
- Follow-up (user: "1. Có 2. Có"): Multi-Line `Sector=7 Sectors` → `7-Sectors` (`.Chart/Line-Chart/Trend` already said
  7-Sectors; nothing in the repo reads the old name). Covers made one shape: Chart-Card 6643:63528, Line-Chart 6643:63324
  and Stack-Bar-Chart 6643:73471 left their covers for Chart components (IDs unchanged), each cover now shows an
  instance in an "Examples" frame cloned from the Bar cover's; the Heatmap cover's bare instance got the same frame.
  Covers screenshot unchanged.

## Charts take their card from Card (tier M, Figma + AI kit, user: "các chart card nên được override từ card chứ ta?" → "Làm cả 4 bước")

- Library (❖ Chart): Bar (2 variants), Donut (3), Radial (2), Heatmap root = no fill, padding 0, radius 0 (unbound from
  Surface/Default, Card-padding-medium, 2XLarge), width − 48; props and variants unchanged. Probe first (removed): a
  card-less Bar-Chart in Card Flat/Medium is pixel-identical (400 × 384, title at 24/52); Card's own Sub-Action "⋮" is on
  by default → off when the chart shows its open button.
- Placements rebuilt, never moved (moving a chart between slots left its heading layout stale in the probe): a fresh
  Chart-Card (Sub-Action off, Theme from the old surface: Flat / Shadow / Border / Pale, plus fill/effect overrides when
  the old look differed) holding a fresh chart; props and every nested override copied, checked by a per-layer
  signature (name, visible, paints, text, padding, grow) and y/height, then the old instance deleted.
  ❖ Chart covers 8/8; ◆ Performance 38/38 (10 Flat, 6 Shadow, 8 Border, 14 Pale + override; Case C's "Wrong" Flat
  chart beside Shadow cards kept as is). The 8 Border ones differ by 1 px: the old chart drew its stroke inside the layout
  (content at 25), Card Border keeps content at 24 like the Chart-Card beside it. All 38 Charts rows 420 tall (the
  Multi-Line card's natural height; they read 416 before, 4 px under that card's content).
- Gotchas: `figma.skipInvisibleInstanceChildren` must be false to map overrides on hidden layers (columns 9–12, Rule);
  node wrappers from `findAll` are not `===` to `parent.children` items (index by id); size the Chart-Card before
  filling its slot or it keeps the 345-wide height (1568).
- Descriptions: Chart-Card from `tools/figma-docs` source (props Card + Content, rule "charts draw no surface of their
  own"); Bar/Donut/Radial/Heatmap open "… chart:" with a note to sit in Chart-Card. AI kit: `theme/box-on-canvas` and
  `theme/mixed-elevation` no longer count a standalone chart as a box (harness, audit-rules, screen-rules §1);
  `npm run ai-kit:check` 104 ✓. Library not published.

## Donut total Value Heading/3 → Heading/2, Figma → code/Studio (tier S, user: "Update font size Value của Donut chart từ Heading 3 lên heading 2" · "Update từ Figma lên Studio")

- Figma (live file): Chart/Donut-Chart `Legend=Start, Total=Start` → `Total > Value` (15392:2498) was still Heading/3
  (the visible figure there; its `Heading > Value` is hidden). Set to Heading/2; read back: every Value in the set is
  Heading/2 except the `Centre > Value` (Heading/Subheading, unchanged). The one placed instance on ❖ Chart follows.
- Code lives only on PR #38's branch (worktree Zen-DS-charts, `zen/fix/chart-average-dots`; main has no DonutChart):
  `DonutChart` total-value and `ChartCard` value Heading/3 → Heading/2 (ChartCard's Figma Value moved earlier today),
  guideline source, chart spec, CHANGELOG, guidelines rebuilt. Studio renders the code components, so it follows.
  Committed 18a4e38 on that branch (not pushed); its older examples/pages/chart.tsx edit is not ours, left out.
- Centre figure differs on purpose: Figma `Centre > Value` Heading/Subheading, code Heading/4. User: "giữ nguyên"
  (keep both as they are); don't "fix" it.

## Figma plugin: "Import failed … The node (instance sublayer …) does not exist" (session "Studio toggles + click", tier M, plugin repo `~/Documents/zen-ds-figma-plugin-main` f39af77)

- User: "Lỗi import vào figma" (findOne callback crashed: in get_name … `I15598:100696;4182:11567` does not exist). The node
  was an Avatar the import made (default variant 3XLarge, `4182:11567` = its Focus-Ring) in the Zen file's "Studio exports".
- Reproduced in the live Zen file with the real importer (test bed: icon page 1340:4450 for componentNamed, package
  without set names when the id is there, Dashboard = 28 KB + importer 19 KB in one `use_figma`): a second import of
  the same page failed every time (`I…;12280:21764 does not exist`, the header's Notifications).
- Cause: Figma re-creates an instance's slot content with new ids (seen between runs: `15606:1414` →
  `I15606:1197;4122:33338;15606:1431`); a layer taken before then still reads its type but not its name, and
  findOne / findAll hand such layers to callbacks.
- Fix (studio-import.js): `findIn` (callbacks skip unreadable layers; walk by hand if Figma's traversal fails),
  `keyedChild` + `intact` (reuse a layer only while its own layers read; slot content left to the slot), the layer
  re-read after insertChild, leftovers by position; sizes: only an import-bound size resets, to the variant's own
  (Avatars came back 112px); a swapped nested layer (Avatar → Dock-Icon, renamed by Figma) found by the new name; a
  failed import removes the layers it made. Mock tests +5 (each fails on the old code); `npm test` 0 failures; dist
  rebuilt (backup `backups/dist-before-studio-import-stale-*.tgz`).
- Live: full Dashboard twice in one run (130 created, then 118 updated / 12 re-made, no duplicates, Avatars 32/40),
  then again in a new run (130 updated, 0 created, 0 removed); swap re-import 0 notes. QA frames and the stray layers
  of my failed runs removed; the user's own "Dashboard" frame (15598:100161, empty) untouched.

## Registry deploy (npm.dizai.studio) — Podman on 51.79.205.10

- Deployed tools/registry to 51.79.205.10 (Ubuntu 26.04, shared with the PocketBase server agent and its system Caddy)
  with Podman (user's choice): Quadlet `zen-registry.service`, host network, Verdaccio on 127.0.0.1:4873 (ufw's forward
  policy DROP blocked bridged containers from the license store), `npm.dizai.studio` block appended to the host
  Caddyfile, Let's Encrypt cert. Kit: `tools/registry/deploy/podman/`. Web UI tried, then turned off again (user).
- Secret `ZEN_REGISTRY_PUBLISH_KEY` set; first release `v0.3.0` published by the Release workflow.
- Customer guide fix: CI token goes into the job's `~/.npmrc` (a `${ZEN_DS_NPM_TOKEN}` line in the project's .npmrc
  overrode every developer's login → E401, reproduced); `zen-ds doctor` flags any token line. Spinner, Yarn 2+, Docker notes.
- Open: R2 backups (no backup.env yet), uptime check, `npm deprecate` of public @zen-ds/react 0.1.0, where customers see
  their licence id (question for the user).

## Figma plugin: Import from Studio set no property in Figma (tier M, user: "Bug import. Bạn phải test kỹ phần này"; plugin repo `~/Documents/zen-ds-figma-plugin-main`)

- User's frame (Studio exports › Dashboard 15617:100928, from `~/Downloads/dashboard-5.figma.json`): every variant,
  boolean and icon property at its default (Avatars 3XLarge, Dashboard Header Control-Bar sample rows, Button XLarge,
  home icons, black badges, "TITLE" headers, Footer). Texts were set.
- Cause: the manifest's `documentAccess: "dynamic-page"` makes Figma throw on `instance.mainComponent`. studio-import.js
  read it in try/catch since its first version (53d42d2), so `setOf` was null: no property set (338 notes "X is not a
  property of its component"), no `swapIcon`, and every re-import made new instances (`setOf(existing) === …` false).
  `use_figma`, the live test bed, does not enforce dynamic-page (`figma.getNodeById` works there), so every earlier live
  test passed.
- Fix (plugin): `mainOf` / `setOf` read `getMainComponentAsync`; `nestedAt` and `applyIcon` async; layers compared by
  id (`sameNode`); `setTextStyleIdAsync` only; the exports page loaded before reading its layers.
  Tests: the mock throws on the sync getter/setter as Figma does (old code fails: properties `{}`), and
  `plugin-source-safety` bans sync dynamic-page APIs in studio-import.js. `npm test` passes, and dist is rebuilt (backup
  `backups/zen-ds-dist-before-dynamic-page-import-fix-*.tgz`).
- Live (Zen file, QA frames with page ids `qa-…`, removed after; package stored in shared plugin data, importer minified):
  - T1: the user's own package imports with every property (Avatars 32/40, Header rows, badge colours, metric icons).
  - T2: re-import gives 0 created, 138 updated, 0 removed, 1217/1217 layers identical.
  - T3: the old importer with its sync reads emulated as failing reproduced the user's picture exactly. Importing
    that frame again with the fix matches T1 on 1217 layers (only 7 hidden Trailing layers 40×40 vs 40×56).
- Found while testing, fixed (push/pull, Zen-DS):
  - A Table `photo` cell without a picture is now Avatar-Cell with a Square Avatar. Figma's Photo-Cell holds a Photo
    rectangle, so "Photo-Cell › Avatar: no such nested instance" ×8 and the sample photo. Pull reads it back as photo.
  - MetricCard `custom` now goes to Metric-Inline's Custom-Slot (the note said "no Figma slot"; the empty slot made the
    card taller). Selftests: push 201, pull 53, new checks fail on the old code. Live T4/T5: 0 notes; re-import gives
    3 created (the custom layers), 139 updated.
- Not fixed (BACKLOG P3): a Grid in a Grid cell does not stretch to its row in Figma; Swap Project Colors' sync
  `getVariableById`. Charts still draw Figma's sample data (BACKLOG P2, awaiting scope).
- Follow-up, plugin (reported by session "Donut chart font size update"):
  - **Grid:** a re-import set `layoutMode = "GRID"` again. Figma resets a grid to 2 × 2 and refuses that when a cell
    sits in a third row (live: "Cannot set grid row count: Cannot delete occupied row/column"). Caught, the grid fell
    back to a column. A 2-row grid was not affected (checked live).
  - **Hide:** a layer an earlier import hid stayed hidden.
  - **Fix:** a grid stays GRID; `gridTracks` runs once before the cells are placed and again after (it drops emptied
    rows). The names an import hides are kept on the instance (`hidden`) and shown again when the page no longer hides
    them.
  - **Tests:** mock grid semantics as measured; each new test fails without its fix.
  - **Live:** a 3-row page imported again gives 0 created and stays GRID 2×3. Shrinking 3 → 1 row: GRID, 1 row, 4
    removed, Segmented shown again. Growing 2 → 3: 2 created. QA frames removed. `npm test` passes, dist is rebuilt
    (backup `backups/zen-ds-dist-before-grid-hide-import-fix-*.tgz`).

## Property-panel components in Figma, Accordion spacing + Pale rule (tier S; user: "bổ sung các component thiếu vào Figma", "Spacing giữ Title và list gần nhau quá … set rule luôn", "Accordion tự lo", "Đổi màu border của accordion sang Pale")
- Figma only (draft sections, ids in memory `property-panel-figma-draft`): Input/Inline-Field, Input/Color-Field,
  .Primitives/Input/Color-Swatch, Color-Picker, Slider/Field, Chart/Curve-Preview, a Photo Stack example (Light/Dark).
- Accordion Medium Title → Contents 8 → 12 (Figma primitive 239:18764 Medium ×4 → Spacing/Gap/Small; accordion.css;
  test accordion-sheet-rating), one step above the rows inside; its Figma description rule via tools/figma-docs (FORCE
  for this call, backup on 🔒 ARCHIVED). No new Stack/Box API: a paddingTop/Bottom try was reverted the same session.
- Accordion Divider rule Subtle → Pale in accordion.css; Figma already bound Border/Neutral/Pale/Default on all 24 roots.
- Rules: groups in their own stacks with gap 0 (a divider has 16 above and below), the Accordion owns title → rows,
  nested corners concentric (component-usage-rules §13, screen-rules §2, figma-gotchas: an inside stroke clips 1px in
  with the outer radius). BACKLOG P3: Accordion Box top/bottom Pale stroke in Figma, a designer question.
- Checks: ai-kit:check ✓, qa (accordion, --isolated) ✓, accordion tests 21/21.

## Registry seats: Google sign-in for developers, capped CI keys, usage (approved by the user)

- `npm login` (web) → `/-/zen/login/<id>` page (Google only; the registry also requires a linked Google login) →
  seat check: owner + team_members oldest first, up to max_members. CI: `--auth-type=legacy` + licence key → CI
  token, 3 per licence (4th retires oldest, `zen-ci-tokens.json`). Basic auth with the key refused. Old tokens refused.
- Usage per month/licence (`zen-usage.json`, `usage-report.js`). Live PocketBase: team_members list/view rules +
  `registry_clients` (read-only; checked: registry sees members, not licence lists). Deployed; tests 28/28.
- Not tried live: a real Google sign-in + a real CI key login (needs the user's account / key).

## Charts phase 2: seven Figma charts in code + Studio (tier L, user: "kiểm tra update lại các Chart mới từ Figma lên lại studio" → "Đủ cả")

- Worktree `../Zen-DS-charts2`, branch `zen/feat/charts-phase2` (from main 1831bc8, fast-forwarded to d587171). Spec
  card + manifest + API contract + as-built: `docs/research/chart-phase2-spec-2026-10-14.md`.
- Agents (AGENTS §C, L): charts-xy (AreaChart, GroupedBarChart, ComboChart), charts-meter (GaugeChart, FunnelChart),
  charts-list (BarList, BulletChart), studio (palette + push/pull), one reviewer. Each chart: component + chart.css
  block, stories, guideline rows, harness rules + fixtures, smoke fixture, ≥ 2 examples on the Chart page (family page:
  not 4 each), Do/Don't pair. Axe baseline: the new charts' Content/Neutral/Light axis labels, as the older charts.
- Studio: `tools/studio/figma-charts.mjs` maps all 15 chart sets both ways; push of a ChartCard = Card (theme) + chart
  with the header props; a bare chart hides its Heading. Real-Figma check in the Zen file (17 ChartCards + 1 bare),
  pulled back with the same props, all test layers deleted. Found plugin bugs (re-import collapsed multi-row Grids;
  `hide` never re-showed a layer) → fixed by the "Bug import" session in the plugin repo.
- Fixed on the way: `useChartSelection` ignored data that arrived after mount (no default item, "No data");
  `defaultFormat` printed "306.6666666666667"; GaugeChart could write aria-valuenow NaN; LineChart compare legend
  start-aligned (Figma Multi-Line Legend MIN in all 4 Sector variants); the guideline renderer dropped text after a
  second "→" (Input, App Shell, Chart lines split one advice per line). Reviewer: the five new Figma legends use
  Gap/Small 12 · XSmall 8 → shared `ChartLegend gap="small"` (older charts keep 8 · 4). GaugeChart `label` →
  `actualLabel` (as BulletChart).
- Checks: tsc, usage selftest/check, style, guidelines, `npm test` 656 passed, `npm run studio:selftest` green,
  QA gate (isolated, pages chart, input, app-shell).
- Open (BACKLOG): BarList leader at 78% in Figma vs full track in code (designer); chart sets missing from the
  component-properties contract (inspector rows); Figma descriptions of the seven sets are stale (widget themes P1).

## Component best-practice refactor (branch `zen/refactor/component-best-practices`, worktree `../Zen-DS-refactor`)

User asked for a review checklist, then "refactor all components to match rules" and to apply practices from high-quality
open-source libraries. Tier L (every component), done in a worktree so other sessions on `main` were not disturbed.

- **Checklist:** `docs/qa/component-review-checklist.md` (Figma/tokens, a11y, security, React 19, code, tests; [gate] marks
  what a gate already checks).
- **Scan:** exact JSX parse (Babel) of all 65 folders: buttons all typed, no literal labels/text, no `any`, no positive
  tabIndex. Index keys and click-on-div hits were all deliberate (positional lists; pointer shortcuts with keyboard paths).
- **Research:** Radix, React Aria, Base UI, Ariakit, Headless UI, Fluent v9, Mantine, Ark, shadcn compared with our code;
  the top gaps drove the work below.
- **Security (fixed):** RichTextField assigned `value` to `innerHTML` (stored `<img onerror>` ran) → `_shared/sanitize-html.ts`
  allowlist; Link `target="_blank"` without `external` had no `rel`. Tests: `tests/interaction/security.test.tsx`.
- **Shared helpers (`_shared`):** useControllableState, useStableCallback, mergeRefs/useMergedRefs, composeEventHandlers,
  useIsomorphicLayoutEffect (8 copies removed), isDev, layers.ts (nested dismissable layers; order taken at render so a
  parent and child opening in one commit still nest; StrictMode-safe), modal-isolation.ts (hide-others `inert` from the
  modal's portal root up to the frame/body, ref-counted; scroll lock with scrollbar compensation, ref-counted).
  `useModal(..., { isolate })` is on for portalled Dialog/ModalForm/SidePanel/BottomSheet, off for inline previews and
  the Chat picker. Tests: `tests/interaction/shared-hooks.test.tsx`.
- **Migrations (14 agents, disjoint folders):** controlled state → hook in ~30 components (left hand-rolled where callbacks
  fire for unchanged values: AppShell nav/collapse, Tooltip/Menu open, NpsScale, SelectField value, Chip popover);
  every forwardRef → ref prop; refs on ~110 components/parts; refs written during render removed; DatePicker's
  "on open" effects → useEffectEvent (eslint-disables gone); Tabs focuses the next tab by id.
- **Conformance:** `tests/smoke/conformance.test.tsx` (StrictMode, ref reaches DOM, className kept, clean unmount);
  shares `tests/smoke/api-components.ts` with the smoke test. New fixtures: PopoverSearch, PopoverManualAddNew, ModalActions.
- **Found while testing:** Popover label at 3.75:1 → axe baseline + BACKLOG designer question.
- **Not done (needs approval, new API):** `render` prop / asChild for Button-as-router-link, shared roving-focus hook with
  RTL, Tabs context so TabPanel wires itself, usePress for non-native controls, rich-text sanitiser as a prop.
- Checks: tsc clean, guidelines build/check, usage selftest, `vitest run` 842 passed, 11 skipped, twice in a row.
  `npm run qa` not run (user rule: gates only on approval).
- Review (one reviewer agent): fixed open toasts going inert under a modal (`.zen-toast-layer` kept), isolation with an
  app's own ZenPortalProvider container (useModal gets the real container), Tabs focus scoped to its tablist, layer
  order kept through StrictMode's replay. Kept on purpose: Tabs/Segmented no re-fire for the same value (CHANGELOG).

## Popover width variant (tier S, user request)

- User: Popover is a fixed width; wants a variant that scales for long search bars with suggestions and domain pickers
  with long names. Figma Popover/Default: Fixed 240, min width 240 (contract `checkbox-radio-chip-popover.json`), so the
  new modes keep 240 as their floor.
- `Popover width?: "fill" | "hug" | number` + `maxWidth` (`data-width`, rules in `popover.css`); `useAnchoredPosition`
  option `trackAnchorWidth` writes `--zen-anchor-width` (anchor `offsetWidth`, right in scaled frames). A new anchor
  width lands a frame later (anchor's own ResizeObserver → rAF); the surface's observer only moves it: reading the new
  anchor width there resized the surface inside its own callback → "ResizeObserver loop completed with undelivered
  notifications" (flaky 3/4 in the new fill test, traced by wrapping ResizeObserver). SelectField `popoverWidth`.
- Examples: Search results now `width="fill"`; new "Pick a domain" (SelectField + Publish, `popoverWidth="hug"`):
  1512 field 344 → list 377, 0 labels cut. Story `Widths`; 6 tests in `tests/interaction/anchored-position.test.tsx`.
- Guideline: Popover api row Width + one Do line; `guidelines:build`, `part-props-build` rerun.
- Gate [fit] popover@390: a long SelectField value spilled 16px out of its trigger (no ellipsis) → `input.css`
  `.zen-select__trigger.zen-input__native` ellipsis; the domain row wraps (field min 200, Publish below on phones).

## Batch 1 of the property-panel components in code: ColorField · ColorPicker · ColorSwatch · layout="inline" (tier L, worktree ../Zen-DS-color, user: "update lại lên Studio các component này" → API "prop trên field có sẵn", "theo đợt")
- Library: ColorSwatch (.zen-swatch, not ColorSelector's .zen-color-swatch), ColorPicker (DatePicker's popover pattern;
  hue = Slider white with a spectrum track held half a thumb at each end; channels = inline fields), ColorField in
  Input.tsx (APG combobox → dialog; six digits apply, short hex on Enter/blur), `layout="inline"` in FieldShell; 15 labels
  en/vi; colour maths in ColorPicker/color.ts (grey keeps its hue).
- Docs/harness: guideline `color-picker`, input/color-selector updated; rule color-picker/hex-value (+ fixtures);
  platform page color-picker (5 examples, 2 Do/Don't pairs); Studio palette/synonyms/detach/figma-props map + the three
  Figma sets in component-properties.json; tests/interaction/color-field.test.tsx 8/8, smoke + scale ✓.
- Skill (user: "tổng hợp lại cách bạn hiểu Zen … thành skill hoặc harness"): customize-in-code.md,
  customize-without-detach.md, Figma audit `bounds/stroke-clip-gap` (dry run: Input page 0, old swatch shape caught).
- Batch 2 (SliderField) and 3 (CurvePreview) wait for the user.

## Batch 2: SliderField (tier L, stacked branch zen/feat/slider-field-20261014 on #53, user: "Có")
- SliderField: Input box (::before background + Effect/Input, ::after border on top, the value as a fill), role=slider
  on the number area (the label is part of its hit target), click/Enter/F2 → a text input (Enter applies, clamped and
  on the step; Escape drops), drag scrubs against the whole field; tests/interaction/slider-field.test.tsx 4/4.
- Guideline slider-field (slider's avoid list points to it), rule slider-field/value-in-range (+ fixtures), platform
  page (5 examples, 1 Do/Don't pair), Studio palette/synonyms/detach/figma-props (Slider/Field in the contract).

## Batch 3: CurvePreview (tier L, stacked branch zen/feat/curve-preview-20261014 on batch 2, worktree ../Zen-DS-curve)
- Figma's curves are exact damped springs (Spring ζ 0.7 ω 16, Bounce ζ 0.3 ω 18) and the two Béziers (Ease-Out =
  Motion/Ease/Emphasized, Ease-In-Out .65 0 .35 1); `curve.ts` reproduces them to 0.0005 of the plot (0.05px).
- CurvePreview: role=img named "Motion curve: <type>" (en/vi labels), SVG 320×176 stretched to the width
  (non-scaling strokes), Input surface (Corner-Radius/Input carries zen-allow-radius-role, as Figma binds it);
  `bounce` = 1 − damping ratio. tests/interaction/curve-preview.test.tsx 3/3.
- Guideline curve-preview, rule curve-preview/bounce-range (+ fixtures), platform page (5 examples, 1 Do/Don't pair),
  Studio palette/synonyms/figma-props (Chart/Curve-Preview in the contract).
- #53 CI fix on the way: vitest optimizeDeps.include pocketbase + react-dom/client (a cold Vite cache re-optimized
  mid-run and one suite failed to import).
