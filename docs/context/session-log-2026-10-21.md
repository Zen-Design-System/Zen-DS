# Session log — 2026-10-21

## Calendar in code + Studio (session "Calendar", tier L; user: "Đã duyệt, làm Calendar trước")

Branch `zen/feat/calendar-20261021`, worktree `../Zen-DS-calendar` (from main e99c5408). Spec card, page manifest and
API: `docs/research/calendar-2026-10-21.md` (read from Figma ❖ Calendar 16121:3 with read-only use_figma dumps).

- Library `src/components/Calendar/`: views CalendarToolbar, CalendarWeekStrip, CalendarMonth, CalendarTimeGrid,
  CalendarAgenda; primitives CalendarEvent, CalendarEventBlock, CalendarDate, CalendarNowLine, CalendarDayCell,
  CalendarAgendaItem, CalendarDayTile (Slot = the time grid's rows). Reuses DatePickerItem (Week-Strip Dot, mobile
  Month), Button / IconButton, Segmented, AvatarStack, EmptyState. `calendarDates.ts`: Monday-first weeks, lanes for
  overlapping events, Intl formats, `shiftPeriod`, `calendarTitle`, `toDate` (ISO strings in local time).
- Figma choices kept: event hues Support/<Hue>, Brand text Content/Accent; hover steps one ramp step (Subtle → Soft,
  Solid → Rich; Figma draws none); Day-Tile Selected keeps its Pale border (zen-allow, Figma 16142:3915).
- Found and fixed while building: `font: inherit` on calendar buttons overrode "+N more"'s Caption style; the phone
  toolbar title clipped ("Septemb…": Heading/3 is 26px in the Mobile typography) → short default title on mobile
  ("Sep 2026") + BACKLOG P2 question for the designer; the phone example offers three views (a fourth label clips at
  Comfortable). Studio's page dialect drops `new Date(…)` props → every date prop also takes an ISO string.
- Platform page `calendar` (playground + 6 examples incl. PlatformPhone and keyboard), Do/Don't visuals, guideline +
  keyboard map, harness rules (3, fixtures), smoke fixtures, axe baseline (colour-contrast only: Neutral/Light text,
  white on Zen/9 and Support Orange/Pink Solid — token level, as DatePicker), tests/interaction/calendar.test.tsx (9).
- Studio: component-properties.json page ❖ Calendar (5 public sets), figma-props.map entries, generated props / variant
  sets, 5 Assets items (ISO dates), library keys (5), native pack: a probe frame of the 5 sets on the QA page, copied
  from Figma desktop with the clipboard saved and restored through files (6 types back), merged into the pack (13 sets,
  88 symbols, 32 contents added; nothing replaced), probe removed. studio:selftest green.
- Figma: the 13 Calendar descriptions' "Draft 2026-10-17, not yet in code." → "In code since 2026-10-21: <Component>".
