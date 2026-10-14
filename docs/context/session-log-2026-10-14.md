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
