# Session log 2026-10-23

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
