# Session log 2026-10-21

## Session "Bug" · PageHeader description tone (tier XS; user: "trong Figma dòng subtext dưới header là tone Light chứ không phải base")

- Read live (use_figma): Primitives/Dashboard/Header Type=Main 4122:33399 SubHeading = Body/Base/Regular,
  Color/Content/Neutral/Light; Type=Control-Bar Subheading (the result count) = Strongest (code already matches).
- PageHeader `description` Text tone base → light (DashboardHeader type="main" renders PageHeader, so its subheading
  follows). JSDoc cites the node; guidelines + api docs rebuilt.

## Figma walks re-measured (Session A, worktree `../Zen-DS-f9b`, branch `zen/docs/figma-walk-remeasure-20261020`)

User (2026-10-20, relayed by the progress session): "Giao Blend mode (Appearance) cho phiên B, rồi đo lại 14 tác vụ Figma."
The run was on `main` e99c5408 (after B's Blend mode #171), in A's slot after C (02:00–02:16), on a private Studio E2E
server with Chromium. The scripts are in A's scratchpad (`walk/`), built on the E2E helpers. They write tables to
`docs/research/studio-figma-design-parity-2026-10-18.md`: §2a, the §5 status line and §6.3.
- **§2, 76 Figma actions:** 65 ✅ · 7 🟡 · 4 ❌. On 2026-10-18 it was 36 · 14 · 26.
  - ❌: K, S, C, ⌥⌘A. The status line says these are not built yet.
  - 🟡: Detach on a Button (the user's rule), three menus (no Flip, no Go to main / Reset, no Paste on the canvas), and
    a Content section on instance and text panels.
  - Six first grades were the script's fault, re-run after fixing it: ⌘A counted the wrong element, Home does not move
    a macOS caret, a right-click landed on the panel, two expected values were wrong (tidy up rows, distribute 140), and
    the Line had to be reached by keys.
- **§6.3, 14 tasks:** 14 / 14 done in 44 steps, against Figma's 39, with 0 refusals.
  - +3: ⇧-click did not add a layer in a frame (it took ⇧⌘-click).
  - +1: a click on a grouped layer selected the layer, not its group.
  - +1: the left panel stays on Pages after a new page.
  - The ⇧-click and group cases need a probe: the ⌘D copy overlapped the original, and `keepSelected` prefers the
    selected layer under the pointer.
- **Bug fixed at its owner:** a Line or an Arrow (0 px high) could not be clicked on the canvas; a ⌘-click selected its
  frame. Now `select/select.css` gives it a band 4 screen px either side (an `::after`, divided by `--studio-zoom`).
  E2E FW-132 covers it (to run in A's next slot).
- **To the user, not built (scope lock):**
  - The group / frame panel heading reads "Box" / "Stack". It comes from `layerName`, which also feeds export file
    names and 7 E2E heading checks.
  - The menus' missing items.
  - The Content section.
  - Instance panels without Appearance / Fill / Stroke / Effects.
- **The user's three fixes** (relayed 2026-10-21: "⇧-click thêm layer trong frame, click vào layer trong group thì chọn
  group, và mở Layers sau khi tạo trang"):
  - Layers after a new page was real. `openLocalPage(id, { made: true })` from New page, a template or frame page and
    MCP create_page; E2E FW-133.
  - The other two were the script's. It passed `modifiers` to `page.mouse.click`, which Playwright ignores, and it
    pressed Esc after each task. The probe on layers that do not overlap showed that Studio already does both as Figma.
  - Re-run on `main` 1bd55975 with the script fixed (keys held, the ⌘D copy moved aside, the page made with New page):
    14 / 14 in 40 steps, the same as Figma's 40, with 0 refusals.
  - FW-132 / FW-133: 2 / 2.

## AppShell session · Token Color/Background/Carved (tier XS; user: "Update token background-carved")

- Read live (use_figma, Mode Colors (Semantic), VariableID:12082:86877): Light {Light/Neutral-Alpha/2} (the repo had
  /3); Dark {Dark/Carved} #0505058C in the Zen, Chat, VT and Ecom-Demo modes, unchanged.
- tokens/source/figma/mode-colors-semantic.json, then `tokens:build`: web, Swift and Flutter. tokens:check,
  tokens:native:check and high contrast (0 failures) all pass.
- No component CSS and no Figma contract binds Carved: it reaches apps, the Design Tokens page and Studio's Variables.

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
