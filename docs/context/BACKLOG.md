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
- **P1 · opt-in `--only=figma` group: 4 rows broken on main df4d62d8 (2026-11-11, session Bug):**
  - FW-80: Place image, "the canvas paints none".
  - FW-101: ⌘Y Outlines, locator.evaluate times out.
  - FW-181: a linear gradient on a rectangle, "the canvas paints the gradient" times out.
  - FW-183: Pick color, the tag beside the pointer never names Info / Solid.
  - They also break the rows run after them (FW-130, 182, 184, 186 fail after them and pass alone).
  - Seen while checking the frame-fills branch; they fail the same on main. The group is not in the gate, so they went
    unseen. Shape painting (image / gradient background) and the pick tag are the leads.

## Backlog (plan before opening sessions)
The 2026-10-24 triage's entries are done and archived (`BACKLOG-archive.md`, "Archived 2026-10-24" and "2026-10-25")
or moved to `BACKLOG-user-and-later.md`.
