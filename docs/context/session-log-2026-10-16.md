# Session log 2026-10-16

## Expenses page in Zen Studio (user: "trên Zen studio hãy build cho tôi 1 trang Expenses management cho Business")
- Built in the user's Studio page "Expenses" (`.zen-studio/pages/untitled-page.zen.tsx`, gitignored): AppShell, 4 typed
  MetricCards, Spend by month (StackBar) / by category (Donut, same 6 categories) / Budget by team, All expenses table
  (control bar, bulk actions, pagination), overlays New expense (ModalForm) and expense detail (SidePanel), proto wired.
  The Studio MCP M0 has no insert, so the page was written as a file; the tab takes it on reload. Checked by MCP screenshots.
- Fix (XS, `src/components/Dialog/dialog.css`): `.zen-input-field { align-self: start }` tied with the ModalForm body's
  stretch rule, so CSS load order decided; in Studio a TextAreaField in ModalForm hugged its content. The field is now
  named in the stretch rule (`:is(…) > .zen-input-field`), as bottom-sheet.css already did. Gate: `npm run qa -- --files=…`.
- User review rounds on the page, each fixed at its owner:
  - MetricCard (`metric-widget.css`): a stretched card pins the type's content and footer to the bottom (was: top, gap
    under a 48px Spark-Bars beside 64px sparklines; the old rule came with the widget batch, no user decision on it).
  - Charts (`chartCore.tsx` ChartBlock `data-wrapped` via ResizeObserver, `chart.css`): a start/end legend wrapped under
    the ring becomes a centred wrapping row; total-start's legend wraps from the start. X pills take Padding/2XSmall in a
    plot under 280px. A throwaway probe (11 charts × 240–704px) found only these two; Y labels "8,000 h" run 1px past
    Figma's fixed 32px column (left). Regression test in `chart-family.test.tsx`.
  - Studio Play/Present (`builder.css`): the device clips instead of hiding its overflow and the canvas's `height: auto`
    is undone under `.studio-player`, so the AppShell Sidebar sticks at the viewport height (Auto: 100dvh; fixed W × H:
    100cqh) and its body scrolls. Probed in Chromium with Play's DOM chain. The canvas still draws the page full height.
- Four checks (user: "thêm cả 4 kiểm tra luôn", tier M):
  - `widgetLayout` in `quality-checks.mjs` → audit kinds `card-gap` and `legend-column` (errors, baselined kinds).
    Proved with `--css` re-creating the old CSS: card-gap flags Spark-Bars 16px / goal 28px on metric "Metric types in a
    row"; legend-column flags 5. All pages at 1512 + 390 then had 6 + 1 card-gap findings, fixed at the owner. First a
    bottom pin; the user then asked for the chart to scale: ChartCard `useChartGrow` measures the free height (grow off)
    and sets `--zen-chart-grow`; plots add it to `--zen-chart-height`, rings to `--zen-chart-size` (gauge ×2, capped at
    the width, not beside a legend), row charts spread their gaps by count, heatmap cells grow; leftovers centre.
    MetricCard keeps the pins (comparison columns, stacked KPI). Now 0 on every page.
  - Figma (user: "update cho cả figma", file 9nZv4uW2LT21yuHabMTCh1): a FILL child keeps its size in a HUG parent, so no
    root changed and placed instances keep their size until stretched. Bar-Chart (Plot/Y-Axis FILL, Grid/Bars STRETCH,
    X-Axis MAX, Columns non-auto-layout with Bar SCALE; horizontal rows spread), Area/Grouped/Combo (marks moved into a
    grid-sized `Marks` frame, dots in `Dot-Anchor` frames), Multi-Line Trend FILL, Funnel/Bar-List/Bullet spread with
    minHeight (gaps ≥ 8px, user), Heatmap rows grow, rings grow with lockAspectRatio under a legend and centre beside
    one, Gauge centres, Chart-Card Card/slot/chart FILL, Metric-Card bodies space-between (Category-Bar and Hero wrap
    their foot in `Bottom`). Swept placed instances: Chart 9, Performance 64, HR-Platform 36. Verified on temporary
    boards (deleted). Left: Stack-Bar segments (BACKLOG P2).
  - 320 in the gate (`tools/qa/run.mjs`): 40 pages / 197 findings of debt with the gate's flags (docs section grids with implicit `auto`
    columns, ListItem caption without ellipsis, a few examples) → `BASELINE_ALL_KINDS` (every kind baselined at 320),
    seeded on an isolated server; BACKLOG P1 waits for the user.
  - Studio E2E PT-11 (`prototype.mjs`): plays a desktop AppShell page in a 260px-tall window, scrolls the nearest
    scrolling ancestor of the device, expects the Sidebar at 0, as tall as the box, its body scrolling.

## Leftovers landed: AI UI forms on a Card, doc-engine plan status (tier S, user: "OK làm 1 và 3, dọn worktree luôn")

- Sweep of every branch and worktree against main: no open PR. Two finished pieces of work had never reached main:
  - 07e51e01 (zen/feat/ai-ui-runtime-20261014, a cloud session, 2026-10-15): forms on a flat Card in the AI UI demo,
    and `docs/research/ai-ui-live-composer-ux-2026-10-15.md`. It was pushed after #74 merged, and the user had said to
    hold it. The user approved it today. Cherry-picked unchanged; its own log section is in session-log-2026-10-14.
  - The "Phần còn lại" of `docs/research/studio-doc-engine-plan-2026-10-10.md`: PR #29 was closed (its SidePanel fix had
    landed elsewhere), so the section still said Q4 / Q5 wait for approval. It now lists what is done (#24, #25, the
    layer renames, export P1–P5) and what is left (publish the library, the user's Studio → Figma try).
- Gate `--pages=ai-ui` PASS. The coverage warning ("edge cases", already there on main) is fixed at the example: the
  phone example's description now says what it shows, the time chips and actions wrapping in the narrow bubble. Contact
  sheets reviewed: the booking form sits on its flat Card at 1512 and 390.
- Checked as not missing: #47 (Performance docs stay out of git), #34 (Card / List-Box on-container already on main),
  Zen-DS-chart-grid's uncommitted chart grid (on main), feat/vibe-ready (landed 2026-09-28).
- Removed stale worktrees: Zen-DS-chart-grid, -listbox-theme, -sidepanel, -vibe, -color, -curve, -pr53.
- Still open, for the user: the UI Foundations deck branches (claude/eloquent-ptolemy-lhe433,
  claude/gallant-brown-x2gmlu) — whether they belong in this repo.

## Header slots as Figma's, hide / show, Empty page; the desktop ⇄ mobile header rule (tier L, session "Header chỉnh sửa và responsive design")

- Research (4 read-only reports: Studio editability, live Figma `9nZv4uW2…`, the code's desktop → mobile, other
  systems) → `docs/research/responsive-header-spec-2026-10-16.md`. The user chose: P2 → P1 → P3+P4; a prop holds
  several layers for real; account avatar in Top-Leading on mobile; Sidebar > 5 → first 4 + More.
- Root causes of "headers not editable": a builder page refused fragments in props (a one-layer slot could not take a
  second); switches deleted content and switched back on with starting code; missing slots (DashboardHeader leading /
  children, AppShell banner).
- P2: usage rules §17, skill `skills/zen-responsive-screens` (+ worked examples from Expenses, HR Home, Invoice detail),
  pointers in zen-component-usage, zen-figma-design (AI kit), AGENTS.consumer rule 13. `ai-kit:check` 107 ✓.
- P1: dialect Value `fragment` (dialect, doc, renderer, compile, MCP outline, proto model, handoff, starters snapshot →
  a template's several elements are a fragment); push maps a fragment to the transparent row Stack it drew before.
  `tools/studio/visibility.mjs` (`hidden` true | "mobile" | "desktop", `hiddenSlots`, `pruneHidden`): renderer skips by
  the frame's layout, compile and push prune; Layers lists not-drawn layers from the page tree (edit/visibility.ts,
  `addHiddenRows`) with an eye; ⇧⌘H; layer menu Hide / Hide on mobile / desktop; Inspector and Screen-section switches
  write `hiddenSlots`. Registry: dashboardLeading, dashboardCustom (`:scope` container; palette selftest reads the root
  class and `:not()` rules), appShellBanner; FRAME_PARTS + banner, headerCenter; Figma-name labels (propSchema).
- Empty page (user, mid-session): `newPageText` / `frameCode` `empty`; New page › Empty page; Frame tool draws empty.
- Checks: studio:selftest all ✓ (doc 135, visibility 13, palette 2344, builder 68, push 246, compile 50); E2E B-38…B-41
  works (empty page, ⌘D into a one-layer top bar, ⇧⌘H + Layers eye + mobile/desktop-only texts, Top bar actions
  off/on keeps the three layers). Next: P3 (AppShell `topNavigation` / `bottomNavigation`) + P4 (derive the phone
  header in the Studio), on a follow-up branch.
- Chart bars (user, mid-session, screenshots of GroupedBarChart and ComboChart): `chart.css` group bars
  `flex: 0 1 clamp(12px, (70% − gaps) / --zen-chart-series, 32px)` (GroupedBarChart sets `--zen-chart-series`), combo
  bars `min(100%, clamp(20px, 50%, 40px))`: Figma's 12 / 20px at a ~45px column, wider with room.
- Gate 1: 5 E2E rows asserted the old delete-on-switch / no-fragment behaviour (B-25, SP-19…22): updated to hide-and-keep
  (hiddenSlots, a hidden template Page header) and fragment actions; a real bug on the way: the Inspector read
  `hiddenSlots` from `raw` (the whole attribute) → `slotsOffValue` now reads the list from the expression. The Layers eye
  takes Zen's icon tooltip (`LayerEye`, `useIconTooltip`; harness `button/icon-only-raw`). The widgets page's "9 text
  styles" rhythm warning is not from this change (widgets.tsx untouched): left to its owner.
## Present / Play bar like a browser's (tier S, user: "thanh bulk action nên đổi thành 1 thanh giống của trình duyệt để view load bên trong khung thì nó sẽ không đè lên UI")

- `PresentBar` (Present + Play) is a top toolbar in the chrome modes: start group (Play's Back/Restart, ‹ n / m ›),
  the title in an address pill (`minmax(0, 480px)`, truncates first; hidden on a phone), end group (light/dark, Viewport,
  Modes, Exit + Esc). Never fades. Panels drop down from their button's end edge (`right` measured, clamped in the bar).
- Layout: `.studio-present` = flex column, bar + `.studio-present__page` (`contain: layout` = containing block and
  stacking context of the screen's fixed layers; `container-type: size` + `--zen-app-shell-height: 100cqh` for AppShell's
  sticky columns; `overflow: clip`) > `.studio-present__scroll` > stage. `container-type: size` alone is NOT a fixed
  containing block: the full-screen card covered the bar until `contain: layout` was added. Stage bottom room (72px for
  the pill) removed in board.css and builder.css.
- `FullScreenExit` extracted from `FullScreenBar` (classic card / App Shell full screen keep the pill); its unused `hold`
  / `panel` and `.platform-fullscreen-bar__panel` CSS removed. Escape owner: `.studio-present-bar__panel`. E2E S-03 /
  PT-03 selectors follow.
- Measured (Playwright, :5174): sidebar screen 1512 and 390 — card at y 37 = page top, no overlap, no sideways scroll;
  Play Expenses — Sidebar 863 px = page height, sticks at 37 after a 600 px scroll; Modes panel below its button, Esc
  closes it first, then Present.
- Gate `npm run qa -- --isolated --files=<8 files> --pages=sidebar,table` PASS (report
  .qa/reports/2026-10-15T19-13-45-310b3ec6.md): static, audit 1512/390, dark, behaviour, Studio E2E 280 works · 0 broken
  (S-03, PT-03 now reading the real bar title, PT-04…10, B-16/17). Contact sheets: docs pages unchanged. Finished; not
  committed (the supervisor gathers).

## Studio MCP M1 + live folder sync (tier M, user: "làm M1 đi", "Hiện tại claude chạy xong phải refesh lại mới thấy. Không realtime được")

- Cause of "refresh to see": `mcp-5173.log` had no `update` call — Claude read over MCP, then wrote
  `.zen-studio/pages/untitled-page.zen.tsx` with its file tools (M0 had no tool to build), and a tab only synced the
  folder on connect or "Sync with the folder". Fixed at the owner: the plugin `fs.watch`es the pages folder (Vite's
  watcher skips node_modules, where the E2E server keeps its pages) and sends `zen-studio:pages-changed`; `mirrors.ts`
  syncs at once and re-documents the open page (ids). Shown ≈ 200–300 ms after the write, no reload. Server
  instructions now tell the AI never to edit page files.
- M1 tools (branch `zen/feat/studio-mcp-m1-20261016`, worktree `../Zen-DS-mcp`): list_pages, get_node, get_code, insert,
  replace, move, duplicate, delete, wrap, unwrap, batch (`as` / `"$name"`, one undo step, refused part-way = reverted),
  create_page, add_frame, select, focus, open_page (20 in all). `api.ts` gains `squashEdits` / `revertEdits`; relay 60 s.
- E2E group `mcp` (AI-01…06, `AI-` because `MC-` is Main component's): read, update + ⌘Z, insert + HTML refused, batch +
  revert, outside file edit live, Stop. 6/6 three runs, in the baseline (AI-05 was flaky once: the tab's own rename push
  overwrote the test's write; the row now waits for the named page in the folder, as B-36). Live tab run 22/22.
- Gate found B-36 (old page → master layout) waiting for the unmigrated page after a manual Sync: with the watched
  folder the page arrives already moved (as opening it does). The row now accepts either text; 2/2.
- Not done in M1: the change highlight; the real dashboard walk with the user's Claude Code.

## 320px debt (agent for the Expenses session)
User: "sửa" (BACKLOG P1). 320 baseline 197 → 33 (isolated server, the gate's flags); measured with `--css` hypotheses first.
- Docs grids (`platform.css`): `.platform-component-page__content`, `-sections`, `-section`, `.pe-section`, `__head`,
  `.platform-ref__component` take `minmax(0, 1fr)`; the implicit auto column grew to the props reference's unbreakable
  `Omit<…>` line. 13 pages no longer scroll sideways at 320; Form and Input were 353px wide at 390 too (now 342).
  `.pg-rules li` breaks `radiusTopLeft/TopRight/…` (image, layout).
- Small phones (`@media (max-width: 374px)`, tier L chrome): page gutter 16 (= the top bar), stage and playground preview
  8 + 12, so an example has 248px instead of 208 (was 56px of chrome a side). Clears most fit/density/playground debt.
- Owners: ListItem caption `overflow-x: clip` + ellipsis (still wraps; the guideline says it may wrap); Toast content
  `overflow-wrap: break-word` (emails in overlay toasts); Stepper caption breaks like the title. Examples: Popover "Sort a
  list" header and Tooltip toolbar wrap. A `wrap` on Rating's header and the Settings-form photo row changed 390/1512, so
  both were reverted and stay as designer calls.
- Fixing the scroll narrowed the examples to their real width and exposed Voice actions (192px at Comfortable in 168):
  recorded at 320 with the rest (BACKLOG P1). templates "Show all" target is an audit false positive (a link hidden in a
  template's scroll frame lines up with the next card's button).
- Visual diff 1512 + 390 (1006 panels): changes are the Form/Input width fix, 1–37px of glyph edge from the caption clip,
  and other sessions' / timing ones (ai-ui skeleton, image loads).

## Widgets gallery text styles (user: "cho xem trước", then two calls)

- Previewed the Widgets gallery (9 text styles across 7 MetricCard types; each card uses 3–5). The user's calls:
  comparison figures Heading/4 → Heading/1 (`MetricWidget.tsx` wraps the column value in Heading/1; `metric-widget.css`
  stacks the columns at `16.5em` of a body sized to Heading/1: 462 / 528 / 594px in Dashboard / Mobile / Popular, probed
  with no overflow; Figma Metric-Card Type=Comparison set to the Heading/1 style, no placed comparison cards to sweep), and
  the gallery's first widget (KPI) to Title-Highlight Large (`widgets.tsx`, Studio palette). The gallery now has 8 styles
  (Display/4 only in the Hero). Docs margins under 375px kept (user: "ok").
- KPI to Title-Highlight (user: "có"): `MetricCard` declares its own `variant` (default `title-highlight`, docs/api
  default too, so Studio push/pull follow); a KPI's size defaults to Large in Title-Highlight, XLarge in Icon-Highlight.
  51 default KPI cards across 11 files follow; the two `counter` cards (metric "Revenue by channel") set
  `variant="icon-highlight"`. Palette/widgets KPI: `size="large"` only (the figma-widgets round trip reads Figma's
  spelling). `compile-api.generated.mjs` rebuilt. Figma: Metric-Card Type=KPI's Icon-Highlight XLarge replaced by a
  Title-Highlight Large (texts kept); 96 placed KPI cards were already Title-Highlight. The user then picked "number at
  the foot" when stretched: Title-Highlight's Contents is FILL + SPACE_BETWEEN with a minHeight in every size (the CSS
  comment had claimed this; Figma was HUG/MIN). Metric-Card description rewritten (backup frame on ARCHIVED).
- App Shell's narrow-window KPI tiles keep `variant="icon-highlight"` (Title-Highlight reserves 64px beside the number for
  the corner icon; in ~130px tiles "$33.9K" overflowed: 41 audit errors). Axe baseline: MetricCard's color-contrast entry
  is gone (the Icon-Highlight default carried it).

## ListBox footer actions (user: "bổ sung rule, harness …", screenshot of text footers "Open calendar" / "Go to Inbox")

- Code: harness `listbox/footer-action-tertiary` (error, `zen-allow-footer-action`), fixtures bad ×3 / good ×3, guideline
  Do/Don't on list-item; AI UI lint reuses it (docs/ai-ui rebuilt). `list-item.css`: a footer Button fills the box (the
  column stretches it) and hugs on `[data-breakpoint="mobile"]`. No violation in the repo; the screenshot's source was
  not found in code, HR-Platform or Studio pages.
- Figma: List-Box's 32 Footer=Yes variants hold a Button/Main Tertiary Medium "View all" (Fill) instead of the "Footer"
  text; the audit harness gains `list-box/footer-text-action` (audit-rules.md), checked on a temporary frame (deleted).
- Contact sheets showed the footers still hugging at 1512: five examples (list-item ×2 + its code, image, skeleton ×2)
  wrapped the Button in `<Stack align="start">`. Unwrapped; the harness rule now flags a column Stack aligned
  start/center/end around a footer Button (bad/good fixtures), and the Figma audit gains `list-box/footer-action-hug`
  (a Footer-Slot Button at Hug on a screen wider than 600px), checked on temporary 1440/390 frames (deleted).
