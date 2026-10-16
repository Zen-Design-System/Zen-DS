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

## Widget patterns batch 1 (tier L, user: "Build tiếp các widget pattern cho đa dạng" → "làm mỗi lần 20 cái. Commit, push, merge rồi tính tiếp")

- Choices (AskUserQuestion): a Widgets page on the platform + a Widgets group in Studio's palette; batch 1 = the seven
  Metric-Card types + thirteen chart widgets. Worktree `../Zen-DS-widgets`, branch `zen/feat/widgets-batch1`. Spec,
  manifest, as-built: `docs/research/widget-patterns-spec-2026-10-14.md`.
- Agents: card-color (Card `theme="solid"`, `color`, `surface="flat"`, Solid token re-points incl. chart marks and
  area fades, Studio mapping + inspector), metric-types (`MetricCard type`, internal MetricMarks, `figma-metric.mjs`),
  widgets (app-layer page `widgets` + palette group, one source checked by palette.selftest §4b, figma-widgets
  selftest), chart-sync (re-read the 15 chart sets after the user's Figma edits: Line and Area areas fade Solid →
  Subtle at 30%, idle sector rules hidden).
- User mid-batch: the Sparkline bug (area 4px above the line, end dot clipped by Metric-Body) — the Figma write was
  refused by the tool's shared-library guard; the user rebuilt the Sparkline (and Hero) in Figma with a fade, code
  follows. "nên học cách làm lớp mờ dần của line chart" → fade on the sparkline and LineChart (AskUserQuestion); the
  designer then made the Area chart fade too. "Thêm 1 bộ variable background Inverse" → already in Figma and code
  (Solid, Subtle, Flat): user "Không cần thêm". Design check of the widget charts: spark-bar sample given real weekly
  variation, This year vs last → six months, Budget rings legend at the bottom.
- Merged main b399312 (Tung's React 19 refs refactor): ChartCard and MetricCard keep `ref` and gain `color`.
- Checks: tsc, usage, style, guidelines, studio:selftest, `npm test` 871 passed; QA gate below.
- Open (BACKLOG P2): Figma bugs and older chart diffs for the designer; BarList leader 78%.
- Finished by "Giám sát" (user: "tiếp quản phiên donut"; the Donut session had closed at its 22:15 gate, FAIL): merged
  main d46001d (ColorField; 9 conflicts: guidelines.source and palette.selftest kept both, component-properties merged by
  page, generated docs/Studio files rebuilt). Fixed: Studio E2E SP-13/SP-20/SP-21 (MetricCard mapped to Metric-Card only
  had dropped the Metric switches; the Inspector now adds the Metric it holds, `componentGroups` HOLDS — push/pull keep
  Metric-Card, figma-widgets 31/31), audit outline (phone section h2 → Heading/4; comparison title a heading,
  `headingLevel`, 2 under a phone's h1). Gate: static, Vitest 64/64, behaviour ✓; E2E 263/265 (O-02/O-04 = main's
  modal-isolation regression, PR #57).

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
- Guideline curve-preview, rule curve-preview/bounce-range (+ fixtures), platform page (6 examples incl. Transition off, 1 Do/Don't pair),
  Studio palette/synonyms/figma-props (Chart/Curve-Preview in the contract).
- #53 CI fix (merged with #53): vitest optimizeDeps.include pocketbase + react-dom/client (a cold Vite cache
  re-optimized mid-run and one suite failed to import).
- Gates: slider-field PASS (5 examples), curve-preview PASS (6 examples, 0 warnings); contact sheets reviewed. Under
  load ~17 (three other gates) unrelated suites timed out; they pass alone and in the rerun.

## Segmented tokens + component, Figma → code/Studio (tier M, user: "Update Segmented Tokens từ component theme và Segmented Component từ Figma lên Studio")

- Live read (file 9nZv4uW2LT21yuHabMTCh1): Component Theme `Segmented-Item-*` (13 tokens, 9 modes) equal the repo, no
  change. Component Size changed: `Segmented/Size/Medium` 36 / 44 (was 32 / 40), `Small` 28 / 36 (was 24 / 32),
  `Segmented/Size/XSmall` deleted (no consumer). Repo-only Studio mode kept (Medium 28, Small 24, HANDOFF rule).
  Component Size 194 variables (167 hidden in Figma); repo 2,224; tokens:build, tokens:check 0 failures.
- Component (1238:892 + 1204:11690, every variant hash changed): track padding Spacing/Padding/3XSmall (2, was 2XSmall 4),
  so the Compact Medium track stays 40 tall; Level=Primary track has its fill hidden and a 2px INSIDE stroke
  Color/Border/Neutral/Subtle/Default (new). Item fills, labels, icons, focus ring, badge themes, text styles unchanged.
  (Level=Secondary's track is now a VERTICAL auto layout around the slot; same geometry, nothing to do in code.)
- Code: segmented.css padding token + `[data-level="primary"]` track (no background, inset 2px ring, Figma strokes take
  no room); Segmented.tsx JSDoc; Studio PropField `TRACK_PADDING` 8 → 4 (fit check of the inspector's enum Segmented);
  guideline Level text; guidelines rebuilt.
- Contracts: both sets re-captured into segmented-toggle-badge-avatarstack.json (18 variants, ASCII-escaped parts of
  ≤ 18,000 escaped chars, patched with figma-kit) and checked against the live hashes (770a955f, ad5fdad7: 18/18 ✓);
  BACKLOG P3 "contracts without a suite" line updated. `lock --check` was already failing (Button Focused
  variants patched 2026-10-13 and Input/Heading, Dashboard/Header without a lock run) → `lock`, now ✓.
  nested-paths: the two Segmented ALLOWED entries were stale (Item layers are now captured) → removed, 45/45 ✓.
- Bug met (Giám sát flagged binding-diff selftest [99,1]): binding-diff proposed a ✓ edit of tag.css (Segmented Item's old
  fill read Tag/Background/Default) because a set no code component names (Primitives/Segmented/Item) searched every
  stylesheet → folderIndex falls back to the folder the set name starts with; now 0 proposals. The selftest's
  "committed contracts" check stays [99,0] until the contract is committed (0/0 against a `git stash create` tree).
- Studio mode: kept 28 / 24 items, so the chrome's Segmented track is 4px lower (28 / 32 with 2px padding).
- Gate (`npm run qa -- --isolated --files=…`, after Giám sát moved the checkout to b399312): static, Vitest 58/58, audit
  1512 + 390, dark, behaviour ✓; sheets segmented/chart 390 + 1512 looked at (Primary track outlined, nothing cut).
  Studio E2E: B-29 broke because the inspector's enum rows now fit a Segmented (real track chrome 4, was counted 8)
  where the E2E helper `pickOption` only opened selects → helper picks a segment when the row draws one (B-29, I-31 ✓).
  MC-08 and binding-diff's repo check need the contract committed (0/0 against a `git stash create` tree; the selftest
  now asks for no proposal while contracts are uncommitted). O-02 / O-04 fail on clean b399312 too: the new
  `inertOutside` (_shared/modal-isolation.ts) inerts everything up to `<body>`, the Studio toolbar included, while a
  canvas Dialog is open → told Giám sát (owner of that refactor's landing), not changed here.

## Studio canvas and chrome inert under a canvas Dialog (tier S, user: "Tôi sửa ngay")

- Found by session "Segmented Tokens…": Studio E2E O-02/O-04 fail on clean b399312 (pass on f05a8a0). `inertOutside`
  (`_shared/modal-isolation.ts`, Tung's refactor) climbs from the modal's root to `<body>` unless it meets a device frame;
  a Dialog previewed on the Studio canvas portals into the canvas area's preview layer, so the canvas tools (Move), the
  canvas itself (Studio's Select clicks land there) and the panels went `inert`.
- Tried first: a root on `main.studio-canvas-area` + a keep mark on ChromeScope: Move clickable, but the inert canvas
  still dropped Select's click (O-02 kept the opener selected). Disabling isolation made both pass, so the canvas must stay live.
- Fix: isolation also stops at `[data-zen-isolation-root]`; StudioApp marks the preview overlay layer
  (`.studio-portal-root`), so a canvas modal only isolates other overlays in that layer. An app has no mark: unchanged.
- Checks: shared-hooks "stays inside a data-zen-isolation-root" fails without the fix, passes with it; E2E overlays
  O-01–O-04 4/4; tsc.

## AI UI runtime: catalog, spec, renderer (tier L, user: "Tách nhánh riêng đặt tên rồi làm. Không merge khi chưa có yêu cầu. Đảm bảo những thứ plan làm là những thứ chưa làm")

- Context: the user's handoff for a conversational UI product (a person types anything, the UI for that context is composed
  from Zen at run time and is interactive at once). Readiness read on the repo first: 65–70 % for a booking pilot, 55–60 %
  for the open-ended case; the missing part was the runtime layer, and Zen Studio already held ~60 % of it (dialect tree,
  renderPage, ops). Plan W1–W7 approved as a whole; branch `zen/feat/ai-ui-runtime-20261014` from `origin/main` (a04b390).
- Checked "not already done" before each item: no `docs/specs`, no catalog or JSON schema anywhere, no library-level
  renderer (Studio's is platform-only), `tools/studio/compile-api-build.mjs` derives only required functions. Reused its
  type-text helpers' approach and `check-unions`' source resolver idea (own implementation in `tools/ai-ui/types.mjs`).
- Built (docs/ai-ui/README.md has the detail): `tools/ai-ui/build-catalog.mjs` → `docs/ai-ui/{catalog.json, catalog.index.json,
  spec.schema.json, composer-rules.md}` (133 public components, 52 shared types, 56 binding pairs, 41 verified, 2
  experimental; decisions in `catalog.config.mjs`); `src/ai-ui/` = `@zen-ds/react/ai-ui` (spec helpers, `validateSpec`,
  `toJsx`, `applyOps`, `markdownToSpec`, `<AiUi>` / `renderSpec`); `tools/ai-ui/lint.mjs` = `@zen-ds/react/ai-ui/lint`;
  `npm run ai-ui:build / ai-ui:check / ai-ui:selftest`; CI step; `vite.lib.config.ts` entry, `tsconfig.build.json`,
  `build-lib-types.mjs` copies the `.d.mts`, package exports and files; `examples/consumer-smoke/ssr.mjs` renders a spec
  in Node (verify:package).
- Decisions made on the way (to confirm, BACKLOG "AI UI"): spec = Zen's own node tree with `$ref` / `$state` / `$action` /
  `$map` / `pending` markers (the Studio dialect's shape, so Studio and the runtime can share it); props excluded by name
  (`className`, `style`, `overrides`, `ref`, `key`, `state`) and by type (refs, element types, CSS, formatters); a documented
  `id` prop stays (SidebarMenuItem); HTML attributes admitted per `extends`; `value` / `defaultValue` written out from
  `on<X>Change`; auto-binding by node id for `value`, `checked`, `open`, `page`, `range`, `expanded`, `selected`; a required
  prop with no JSON form makes the component `experimental`; a required handler field inside an object (TableBulkAction
  `onClick`) is never required in a spec (the renderer emits it as an action); bound props fall back to the component's
  own default (DatePicker `open` = true) so controlled components never flip.
- Gates: tsc, `usage:check` (457 files, 200 rules, 1 pre-existing warning), `guidelines:check`, `style:check`, `ai-ui:check`,
  `ai-ui:selftest` (24 checks), `tests/ai-ui` 137 passed / 13 skipped, `tests/smoke` + content-tone + scale 394 passed,
  `verify:package` OK (13 entry points, tsc with skipLibCheck:false on the `.d.mts`). Browser tests ran on the sandbox's
  Chromium 1194 through a symlink for Playwright's 1243 (download blocked); no repo change for that.
- Fixed on the way: `tests/smoke/fixtures.tsx` Sidebar fixture carried a stray `id` on a section (the type has none).
- Findings: a 4-column Table needs ~608 px and scrolls sideways inside its own box at 600 / 390 px; `data-ai-ui-id` does
  not reach the DOM on the Skeletons; fenced code has no code-block component. BACKLOG lines added; no PR opened.

## AI UI demo page on the platform (tier L, user: "tiếp")

- Page `ai-ui` in the app layer beside Templates and Widgets (`src/platform/appLayer/{types.ts,ai-ui.tsx}`,
  `PlatformAppLayer.tsx`), examples and playground in `src/platform/examples/pages/ai-ui.{tsx,css}`; Studio lays its
  playground out desktop-wide (`studio/board/frameLayout.ts`). A deterministic composer answers a prompt with a spec built
  from the studio's data (booking, invoices with a Skeleton first, revenue, a confirmation Dialog, Markdown prose, one
  deliberately broken spec); specs validate against the catalog before they render, picks land in a controlled shared
  state shown beside the thread, follow-ups ("make the button accent", "at 4 pm") apply ops and state to the UI on screen.
- Gate (`npm run qa -- --only=ai-ui --isolated`) found and fixed on the way: a React key warning for lists of nodes inside
  a prop (ListItem title from Markdown; `src/ai-ui/render.tsx`, test hardened), an icon name that does not exist
  (`icon-edit-03-line` → 02; the usage rule sees literal props only), seeded conversations answered after a delay so the
  contact sheets showed thinking dots (seeded prompts answer at once), StrictMode's second effect run cleared the data
  timer so the invoices table never arrived (one effect that resets and re-seeds), and the 404 the audit reported on every
  load was `/favicon.ico` (the platform had no favicon: `index.html` now declares an empty one; a real icon is the
  designer's call). `llms.txt` is generated by `build-guidelines.mjs`: the AI UI section moved into the generator.

## AI UI compose loop + MCP tools (tier M, user: "tiếp")

- `tools/ai-ui/compose.mjs` (`@zen-ds/react/ai-ui/compose`): `tier1` / `tier2` / `buildSystemPrompt` (the rules from
  composer-rules.md, tier 1 ≈ 41 KB with prop names or 26 KB without, tier 2 for 4 picked components ≈ 37 KB),
  `extractJson`, `judge` (validateSpec + lintSpec), `feedbackFor`, `composeUi` (pick → compose → feedback loop, ids
  assigned, text-only answers accepted, `attempts` kept for the metrics) and `composeEdit` (ops / state / spec / text,
  a failed op goes back with the ids on screen). The model is the app's function: no provider in Zen.
  `tools/ai-ui/compact.mjs` now holds the prop formatting the catalog index and the prompts share.
- `mcp/server.mjs`: `get_catalog` (tier 1 without prop names, chrome and experimental first, under the 40 KB clip; or
  one component's tier 2 with status and exclusions) and `check_spec` (judge + feedback text; invalid JSON is an error
  result). `mcp/selftest.mjs` expects 11 tools and checks both.
- Selftest: scripted model (picks, answers a broken spec, gets the numbered problems with hints, fixes it; gives up after
  `maxAttempts`; text-only; ops retry on an unknown id; state-only). A first assertion read the shared `messages` array
  after the loop had appended to it: fixed to read the first message.
- Gates: tsc, `ai-ui:selftest`, `mcp:selftest`, `verify:package`.

## Where the model connects, composing while typing, PR #64 (tier M, user: "nối ở đâu, như thế nào" · "Lúc gõ" · "OK")

- PR #64 opened for the branch (the user's OK); merging stays theirs.
- Connection: `tools/ai-ui/adapters/anthropic.mjs` (official SDK, loaded on first use; `claude-opus-5-5`, effort
  medium, cached system prompt, `fallbacks: "default"` with its beta header, a refusal returned as a text-only answer;
  tested against a fake client — no key in the sandbox, so no live call), `tools/ai-ui/server.mjs` (framework-free
  handler + `node:http` listener + standalone), `tools/ai-ui/vite-plugin.mjs` (the handler at `/ai-ui/*` on the dev
  server when `ANTHROPIC_API_KEY` resolves; `enabled: false` otherwise, so the QA server and CI are unaffected). The
  demo page sends typed prompts to `/ai-ui/compose` or `/ai-ui/edit` when `/ai-ui/status` says enabled and falls back
  to its deterministic composer; seeded prompts stay deterministic (screenshots, gate). `@anthropic-ai/sdk` is a
  devDependency for the platform; apps install it themselves.
- "Lúc gõ": `src/ai-ui/live.mjs` `createLiveComposer` (debounce 300, on-device `keywordClassifier`, Skeleton at 60 %
  confidence, compose with AbortSignal, stale answers dropped, an unsure guess never clears the UI, switch margin /
  stick time, Enter composes regardless). `AiChatField` gains `value` / `onValueChange` (the field had no way to expose
  the text being typed; `defaultValue` stays; docs/api, guidelines and the catalog regenerated — the catalog pairs them).
  Example "Composed while typing" on the page.
- Selftest: adapter request shape and refusal, the handler's routes and errors, the live composer's timeline.

### Eval script (2026-10-15, tier S, user: "Làm mục 1, viết script eval")

- `tools/ai-ui/eval.mjs` (`npm run ai-ui:eval`, also `@zen-ds/react/ai-ui/eval`) and `tools/ai-ui/eval/prompts.json`
  (20 cases, en + vi, with follow-ups; `intents` for the classifier; shared `data` read with `$ref`). Per case:
  `composeUi` with the adapter (one model function per case so usage lands on it), then the follow-ups chained on the
  result; the record keeps every reply, the problem codes, the components used and the ms to the accepted spec. Summary
  and Markdown report: valid-spec rate (first / within the loop / per attempt), wrong UI against `expect`, text
  answers, time to first UI (median, p90), tokens, follow-ups, and the keyword classifier on 25–100 % of each prompt
  (no model). `--dry` runs a scripted model (one broken spec first, text for small talk, ops / state for edits) so the
  pipeline and the report run without a key; `--classifier-only` is that metric alone. Reports in `.qa/ai-ui-eval/`.
- Not run live: the sandbox has no key. Dry run: 20/20 valid within the loop, one feedback round (`unknown-component`);
  the wrong-UI metric flags the 13 cases where the scripted booking form is not the expected UI. Classifier: 19/20 right
  at 25 % of the prompt, 20/20 from 50 %, no false positives on the 13 cases without an intent.
- Selftest section 10 covers runEval's counts, the report and the classifier metric. Two expectations tightened after
  the dry run (delete-project and new-project-form let a plain form pass).

### Slots and the keyboard contract (2026-10-15, tier S, user: "Làm 1 và 2, chưa merge")

- Reference: two ShapeShift UI screenshots the user shared (one field; while typing, the guessed type's form appears
  pre-filled from the sentence, empty slots as "+ Add …" chips, Tab keeps the type, Esc clears, Enter adds). The site
  and x.com are blocked by the sandbox's network policy; the screenshots were enough.
- `src/ai-ui/live.mjs`: `extractSlots(text, { now, dayFirst })` — title after the lead-in ("remind me to", "đặt lịch"),
  date (ISO; today / tomorrow / weekdays / next week / numeric / month names, en + vi), time (HH:MM; am / pm, "4h chiều",
  a bare hour 1–6 is the afternoon), people (after with / với, @handles), a capitalised place after at / in / ở / tại,
  and the `spans` for later highlighting. `keywordClassifier(intents, { slots })` passes the original text to the
  extractor; `skeleton` may be a function of the slots (a template). The composer gains `accept()` / `state.pinned`
  (a pinned intent ignores the classifier's switches and keeps composing for the new text; `reset` unpins) and
  `primaryActionOf(spec)` + `resolveArgs(args, { state, data })` for Enter.
- `AiChatField`: `onAccept` (Tab) and `onClear` (Escape), only while passed. First cut prevented Tab's default; the
  behaviour gate flagged it as a keyboard trap (APG), so Tab now keeps the guess and still moves focus, into the form
  when it is next. Guideline a11y line and keyboard rows; interaction tests for both keys and for the field without
  the handlers.
- Demo "Composed while typing": the booking intent's tier 1 is `bookingSpec(title)` pre-filled from the slots; the
  slots land in `review.*` only when they change (a pick survives typing; a first cut compared against a ref already
  overwritten, so nothing landed — seen on the contact sheet, fixed; the date is written as the field's own
  MM/DD/YYYY text, since DateField's value is the text it shows); the hints row uses Tag as a keycap (Tab · Esc ·
  Enter); Enter runs Schedule with the resolved args and shows the call; the deterministic composer keeps the title.
- Gates: tsc, ai-ui selftest (+ 8 checks), usage, style, guidelines, ai-ui:check, mcp, smoke + ai-ui tests (489),
  interaction test, Build-QA `--only=ai-ui,ai-chat --isolated` (audit, dark, behaviour), verify:package.
- For the designer (BACKLOG "AI UI"): the tentative look of a guessed form and its dashed add-chips, the underlined span
  in the field, a keycap component.
- Live check with the user's key (2026-10-15): `/ai-ui/status` enabled but "không thấy chạy". Reproduced in the sandbox
  with a dummy key: the API answers 401, the route 500, and the page fell back to the demo composer in silence (chips and
  seeded prompts never use the model by design, only typed prompts do). Fixed at the owner: `postJson` returns the
  server's reason, the answer bubble shows "Zen AI could not reach the model: …" before the fallback, the live example's
  status line says it too, and the Vite plugin logs every ≥ 500 answer (`[zen ai-ui] POST /ai-ui/compose → 500: …`).
  Verified with Chromium against a dev server: a faked model answer renders; a failing one shows the reason.
- The user's key is a personal key with Organization scope (the Console's new key types): such keys need
  `anthropic-workspace-id` on every request (docs: Authentication → Select a workspace), which the adapter did not send.
  Added `workspaceId` / `ANTHROPIC_WORKSPACE_ID` (per-request header, so an injected client works too; selftest). Their
  401 "invalid x-api-key" is the value itself: the Console lists keys masked (`sk-ant-usr-1hA...KwAA`), the full key
  shows once at creation. README: create a key scoped to one workspace, or set the workspace id.

### Live composer UX study + forms on a Card (2026-10-15, user: "Bạn nghiên cứu thử nhé" · "các form nên bỏ vô card")

- `docs/research/ai-ui-live-composer-ux-2026-10-15.md`: what ShapeShift does (one card, a guess looks like a guess,
  nothing said twice, keyboard-first, quiet motion), nine findings on our example (F1–F9, each at its owner), six
  principles, the composer-card layout with wireframes (desktop guessing / confident, phone with the preview above the
  field), the state table, what Zen has vs what needs Figma, and a plan P1-a … P4 with three open questions for the user.
  The live site stays refused by the sandbox's network policy; the study works from the two screenshots.
- P1-a applied (the user's direct ask): `Framed` on the demo page wraps a composed UI that has bound controls in
  `<Card theme="flat" spacing="sm" width="fill">` (flat per usage rules §16, the gate flagged the shadow default; small
  spacing in a chat column); the booking actions row wraps (the gate's density check: Cancel / Schedule outgrew the
  390 px column at Comfortable once the Card's padding came in). Gate `--only=ai-ui --isolated` green; sheets reviewed.
  Not committed, not pushed, not merged (the user: "làm xong khoan commit, push hay merge").
- P1-b/c applied on the demo (the user: "đồng ý"): `LiveTypingExample` is the composer card — AiChatField, then a flat
  Card (type row `intentMeta` icon + label + "likely" / "kept", the slot title as Heading/4, `SlotChips` with `dropdown`
  for heard values and `state="placeholder"` "+ Add …" for empty ones, the template through `composerBody()` which drops
  the spec's heading and button row, a footer with KeyHints and Cancel / Schedule run by `primaryActionOf` +
  `resolveArgs`). `sure` = pinned, answered, or confidence ≥ 0.85; chips show while guessing, the form once sure or a
  chip is opened. Gate findings fixed at the owner: focus audit (the DatePicker popover was clipped by the body's
  overflow → no height transition, fade only), gap ladder §13 in the footer (md between groups, sm / xs inside), nested
  corners (the pill field moved out of the card). Gate `--only=ai-ui --isolated` green; sheets reviewed.
- P1-d applied on the demo (the user: "giao diện của AI chat chưa tối ưu … làm tiếp rồi commit sau"): `ComposerScreen`
  has a bar (h1 "Zen AI" at Heading/4, `ModelTag`, the panel button), the thread and the suggestion chips in a column
  that scrolls under a sticky `AiChatField fieldStyle="liquid-glass"` (the chips moved out of the dock: text showed
  between them); the screen and the phone flow carry the AI Chat playground's Liquid Glass tint with a 16 s opacity-only
  breathing layer (`zen-allow-canvas-layer`; an AI-glow gradient of its own waits for tokens); bubbles and answers get
  `.px-ai-ui-enter` (fade, Motion/Duration/Base); `useScrollToEnd` follows the turns and the catalog (the first answer's
  Card was cut by the dock); the aside is "What Zen AI sees" — `DescriptionList` rows from `flatten(demo.shared)` and
  the events — a Surface Box with Shadow/Bottom/Level-3 over the screen's right edge (a Grid column crushed the chat
  below 960), opened by the bar's button (`aria-expanded`, `aria-controls` while open) and closed by an `IconButton`;
  the dev note under the field is gone (the Tag and the example description say who answers); the phone's
  `TopNavigation` is `liquid-glass` (compact-alt's Surface/Alt fill cut a grey band through the tint) and its flow
  reaches under the overlaid header. Gate `--only=ai-ui --isolated` green after two of its findings were fixed: the
  visible h1 at Heading/4 (hierarchy: a content h1 is Heading/1, only a TopNavigation bar title keeps bar size) is
  a VisuallyHidden h1 again with the bar's title as Text; the bar wraps at 390 (the Tag and the button overflowed).
  Usage harness and style guard run on the two files directly (edits went through scripts, so the gate saw 0 UI
  files). Sheets 390 / 1512 reviewed. No JS effect
  library: gradients, glass and fades are CSS + the Liquid Glass hook already in the field.
- Working-state ring (the user: "gradient tôi nói là hiệu ứng lúc thinking … chứ đâu phải gradient nền"): the gradient
  the user meant is the AI-at-work effect, not a page tint. `.px-ai-ui-glow` wraps the three fields (desktop dock,
  phone dock, composer card) with `data-busy` from `demo.busy` / the live composer's `skeleton` + `composing` phases:
  a Padding/3-XSmall ring (masked pseudo-element, conic gradient of Support Pink/Violet/Cyan Solid) turning on an
  `@property` angle multiplied by `--zen-motion-movement` (still under reduced motion), a blurred halo under it, both
  fading in and out at Motion/Duration/Base. Style guard made the width and the radius step tokens. The page tint from
  P1-d stays until the user says otherwise (reported as a question). The live composer's "skeleton" phase is the
  working state for a first guess (`composing` only edits a kept spec). `useScrollToEnd` also follows the thread's
  growth while the reader is at the end (the 390 sheet showed the chips under the dock). Then the user: "bỏ nền
  gradient đi" — the P1-d page tint and its breathing layer are gone (screens on their Canvas, the phone back to
  `TopNavigation type="compact-alt"`); the Liquid Glass field and the ring stay. Gate `--only=ai-ui --isolated`
  green; sheets 390 / 1512 reviewed.
- The orb (the user: "màu cho thanh xấu quá. Tôi nghĩ có thể thử 1 cục tròn như siri"): the ring around the field is
  gone; `Orb` (`.px-ai-ui-orb`, a span with role="status") is a sphere of Support Cyan/Violet/Pink Solid + Violet Rich
  (conic) under a Surface/Default highlight (radial), with a blurred halo (`::after`, Padding/XSmall out); sphere and
  halo turn in opposite directions on the `@property` angle × `--zen-motion-movement`, the sphere breathes by a
  registered number × movement (still under reduced motion). 28 px (Element-Size/Popular/Large) in the AI bubble that
  waits for the answer (instead of the component's dots, demo only), 16 px (Popular/Base) in the composer card's type
  row while `skeleton` / `composing`. `useScrollToEnd` now takes the scroller's ref, so the phone's screen follows the
  conversation too (the orb sat under the dock). Style guard: the halo's reach through a token (raw -40% flagged).
  Phone dock (the user: "chat box nằm hơi cao trên mobile"): PlatformPhone pads a footer-less screen by the safe
  area and the dock cleared the home indicator again, so the field floated 64 px up; the page zeroes that padding
  for its own flow (`:has`), the field sits 36 px from the bottom as the AI Chat phone's. Gate `--only=ai-ui
  --isolated` green; sheets reviewed. Next (the user): the orb should follow the Dribbble "Sphere AI Assistant"
  shot; `dribbble.com` / `cdn.dribbble.com` are refused by the sandbox's network policy, a screenshot or the
  domain allowed is needed first.
- The sphere (the user: https://dribbble.com/shots/27218429-Sphere-AI-Assistant, "nên làm giống vầy"; the user
  allowed `cdn.dribbble.com` in the environment's network policy, the mp4 was read as frames with ffmpeg): the conic
  Siri-style orb is replaced by a frosted glass sphere — base Surface/Default → Cyan Soft at the rim, a pink pool low
  (Pink Solid → Pink Soft), a lavender haze high right (Violet Soft), an aurora band of Violet Soft → white → Cyan
  Solid with a white crest sweeping across the middle, a highlight top-left — three blurred `<i>` layers (blur as a
  share of the size) that drift and slide on `--zen-motion-movement`-scaled distances (still under reduced motion;
  nothing turns). 56 px (Element-Size/Popular/3-XLarge) in the waiting bubble, 20 px (Popular/Medium) on the composer
  card. Style guard made the rim a gradient (hand-written box-shadow flagged) and the band's shape a transform (a
  percentage inset flagged). Gate `--only=ai-ui --isolated` green; sheets reviewed.
- P1-e, the composer on a phone (the user: "làm tiếp"; study §4 phone wireframe and F9, the P1 item still open; P2
  onward need Figma and the Figma MCP does not connect in this session): `LiveTypingExample` takes `placement`
  ("above" puts the card over the field), `fieldStyle` and `placeholder`; `LiveTypingPhone` is a PlatformPhone with
  the AiChatBlock greeting filling the screen and the composer at the end of the flow (in flow, not sticky: the card
  pushes the greeting up and `useScrollToEnd` keeps the field in view). On the phone the footer shows a "Keep as …"
  tertiary button instead of Tab / Esc / Enter hints. New example "Composed while typing, on a phone". Gate
  `--only=ai-ui --isolated` green with one warning (dead click on the empty "Add place" chip once the form is shown;
  fixed in the next change); sheets reviewed.
- P1-f, listening and free text (the user: "tôi muốn type gì cũng được", then "khi tôi type thì model có hiệu ứng
  real time listening"): `Orb` takes `beat` (a Web Animations `scale` pulse per keystroke, step × movement, duration
  from the motion tokens; nothing under reduced motion); `LiveTypingExample` keeps `hearing` for 900 ms after a key
  and shows the sphere on the type row meanwhile; before any guess the card is one row "Zen AI · listening".
  `keywordOrFree` wraps the keyword classifier: no known intent and ≥ 3 words → `free` at 0.6 (a known intent, ≥ 0.8,
  replaces it at once); `compose` sends the sentence as it is to `/ai-ui/compose` when the server is enabled, else
  the demo answers a Markdown note on what it can build. `intentMeta` gains `free` ("Zen AI", icon-zen) and `keep`
  labels (phone button / Tab hint). `SlotChips interactive={!showForm}`: heard values stay as plain chips, empty ones
  go, once the form is shown (the gate's dead-click warning). README: a bullet under "Composing while typing". Gate
  `--only=ai-ui --isolated` green, no warnings; sheets reviewed.
- 2026-10-16, verification and state (the user: "làm tiếp"): the free path checked against a route-faked model
  (`/ai-ui/status` enabled, `/ai-ui/compose` answering a small spec for any prompt): "Draft a client update for
  Lumen Bank" reaches `/ai-ui/compose` as it is and the card shows the model's field and button, the bar's Tag the
  model's name (`.qa/preview/free-model.mjs`). PR #74 turned out merged by the user on 2026-10-15 16:48Z (head
  8cad3db); the seven commits since (cea2b95 … f23a27f) sit on the branch with no PR, 39 behind `main`, no
  conflicts (`git merge-tree`). The user: "mở PR đi" → PR #87 (base main) carries the eight commits; merging stays
  the user's step.
