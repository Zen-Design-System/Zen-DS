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
In flight: merge train C (#282, #290–#294). This list is empty once it lands.
- **P3 · New APIs the contract suites asked for (2026-10-24; the user picked the first four):** Figma draws what code
  has no prop for, so those variants return null in their suites (`tools/figma-contract/suites/*.mjs`). Needs the user's
  go: DatePicker event days on the calendar (the Single calendars' day-1 dot: DatePicker has no events prop, while
  DatePickerItem takes `event` 1–4 since #266 and Event-List 1–4 is compared). Done 2026-10-24 (train B): Popover
  `placement="cover"` (Autocomplete-Field) and DatePickerSheet `header="selection"` (9923:2323, suite
  date-picker-sheet-header) in #280; Avatar status Disabled / Pending / Inactive and the 4px XSmall dot (`AvatarStatus`)
  and the workspace rail's Master-Background (`railBackground`) in #279.
  (2026-10-25: the user said "Làm luôn" to the event days; built in #293, train C.)
- **P3 · Phone Segmenteds that do not fit (2026-10-24, B, audit `segmented-fit`, 12 baseline keys):** at 390 / 320 the
  desktop compositions' Segmenteds slide sideways or ellipsize: app-shell B3 Top-bar analytics (Period, Range), B4
  Workspace editor (Mode), G1 Grid (Range), chart's Range (`chart.tsx` ~368, ~1091) and Studio analytics. The
  guideline's phone fix is a single-choice Chip row (as `segmented.tsx` ~414). Each example needs its phone pattern
  (a design call for the dashboard headers), S–M. The Segmented page's own playground (Section) slides on purpose.
  (2026-10-25: the user chose A, a Segmented that does not fit renders as a Chip row on phones by itself; #291, train C.)

## Backlog (plan before opening sessions)
Empty since 2026-10-25. The 2026-10-24 triage's entries are done and archived (`BACKLOG-archive.md`, "Archived
2026-10-24"), in flight above, or moved to `BACKLOG-user-and-later.md`.
