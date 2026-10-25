# Backlog and open items

Moved out of `HANDOFF.md` on 2026-09-29 (text unchanged). Since 2026-10-08 (user) a bug or gate finding is fixed at
once, in the change that met it; only questions for the user or designer and work too large for that change are added
here, one line each (priority + pointer), and mentioned in the report (Scope lock, `AGENTS.md`).
Read this file only when picking up work or logging a follow-up. Done, closed and duplicate entries move to
`BACKLOG-archive.md` (text unchanged).

Since 2026-10-25 (user, 2026-10-24 23:40: clear the BACKLOG once, then move on) this file holds only dev work. Items
that wait on the user and items for the next phase live in [`BACKLOG-user-and-later.md`](BACKLOG-user-and-later.md);
questions for the designer in [`QUESTIONS.md`](QUESTIONS.md). Code keeps its current behaviour until each is answered.

## Open items
- **P2 · Direct paste (⌘V on the canvas) into other files (2026-10-17; unblocked 2026-10-25: the user published the library):** it binds by
  node id, so only the Zen file takes it; other files need the published library and full component definitions in the
  paste (instances by `componentKey`, as Figma's own copies carry). The rest of the parity list closed on 2026-10-23
  (Copy for Figma in a copy event, grid cards' heights, the pack at 7.7 MB; the slot and alias differences kept by
  design). Pointer: `docs/research/studio-native-paste-2026-10-17.md` §8.

- **P2 · Toolbar Search 240 vs DashboardHeader's 320 (2026-10-24; answered 2026-10-25, user: "ở control bar thì tối đa là 240"):** the user's rule caps
  a toolbar Search at 240 (harness `search/toolbar-width`, audit kinds `toolbar-search` / Figma
  `search/toolbar-width`), but Figma's `Primitives/Dashboard/Header` Type=Control-Bar (4122:33401) has its Search
  FIXED 320, and code follows it (`dashboard-header.css` `--zen-dashboard-header-search-basis`); all three checks
  leave that slot out. Move the component (and Figma) to 240?
  Answer: yes. DashboardHeader Type=Control-Bar caps its Search at 240 in code and Figma, and the three checks cover it.

## Backlog (plan before opening sessions)
Empty since 2026-10-25. The 2026-10-24 triage's entries are done and archived (`BACKLOG-archive.md`, "Archived
2026-10-24" and "2026-10-25") or moved to `BACKLOG-user-and-later.md`.
