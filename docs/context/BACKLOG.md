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
Studio UI/UX review 2026-10-27 (`docs/research/studio-ux-review-2026-10-27.md` §7, approved by the user 2026-10-27:
§2.4 inserts keep their own size, §2.9 Dark mode changes the UI only), each in its own worktree session from main.
P0 (#337), P2 (#338) and the panels session (#335) are merged; P1 `claude/studio-first-view-insert-20261027-2f7881`
is PR #334 (in review). Nothing else open.

## Backlog (plan before opening sessions)
The 2026-10-24 triage's entries are done and archived (`BACKLOG-archive.md`, "Archived 2026-10-24" and "2026-10-25")
or moved to `BACKLOG-user-and-later.md`.

- **P2 · `npm run studio:build-check` fails 8 steps on main ac227b26 (found 2026-11-01, B4 chrome session):** @babel/parser
  lands in `jsx-source-*.js` and the compiler in `browser-compile-*.js` (chunk budget checks), then insert / Inspector edit /
  Swap / reload / Prototype time out and the handoff zip's PNG check fails. Same result on a clean origin/main worktree, so
  not the chrome change; the gate does not run build-check. Report `.qa/studio-e2e/build-check-2026-11-01T15-43-46.json`.
