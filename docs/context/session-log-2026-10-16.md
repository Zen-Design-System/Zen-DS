# Session log 2026-10-16

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
