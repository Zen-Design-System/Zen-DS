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
Nothing open. (The Studio UI/UX review 2026-10-27 sessions are merged: P0 #337, P1 #334, P2 #338, panels #335.)

## Backlog (plan before opening sessions)
- **P2 · A project's typography in Figma (2026-11-06):** Studio projects now carry `theme.type` (font per role + custom
  scale, `tools/studio/project-theme.mjs`), but Copy to Figma and the Variables window (`projectVariables.ts`) send only
  Base Colors: Figma would need a Typography Configuration mode per project (the plugin's Typeface / Type Scale write
  the same values). Waits for the user's go-ahead.
The 2026-10-24 triage's entries are done and archived (`BACKLOG-archive.md`, "Archived 2026-10-24" and "2026-10-25")
or moved to `BACKLOG-user-and-later.md`.
