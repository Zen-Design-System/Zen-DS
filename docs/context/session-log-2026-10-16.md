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
