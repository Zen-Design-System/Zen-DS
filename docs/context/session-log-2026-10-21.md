# Session log 2026-10-21

## Session "Bug" · PageHeader description tone (tier XS; user: "trong Figma dòng subtext dưới header là tone Light chứ không phải base")

- Read live (use_figma): Primitives/Dashboard/Header Type=Main 4122:33399 SubHeading = Body/Base/Regular,
  Color/Content/Neutral/Light; Type=Control-Bar Subheading (the result count) = Strongest (code already matches).
- PageHeader `description` Text tone base → light (DashboardHeader type="main" renders PageHeader, so its subheading
  follows). JSDoc cites the node; guidelines + api docs rebuilt.

## AppShell session · Figma sync: Grid, Header Theme/Density, Sidebar Theme, Sub-Header (tier M, branch `zen/feat/appshell-figma-sync-20261021`)

The user updated Pattern Sidebar, AppShell and Header/AppShell in Figma, pointed to the Rule section 16823:85229, and
added Primitives/Sub-Header-Sidebar 16823:88101 with its example 16823:89311.

Approved:
- the Header theme: "Duyệt, làm PR riêng sau";
- the Grid API: `pattern="grid"`;
- the rule: guideline + skill, not the harness.

Evidence (use_figma, read live):

| Figma | Value | Code |
| --- | --- | --- |
| Header/AppShell set 16783:71068 | Theme Default · Border & Divider (Border dropped); Density Medium · Small | `theme` default · border-divider, `density` medium · small |
| Default/Medium (16243:290461) Main | 24·24·12·24, gap **Gap/Large 24** | gap 16 → 24 |
| Default/Small (16823:76454) Main | top Margin-Compact 20 | `[data-density=small]` padding-top |
| Border & Divider/Small (16783:72140) | Main 0/0; Top-Header 12·24·12·24 + 1px Border/Neutral/Pale bottom (65); Main-Element 16·24 (72) | `[data-theme=border-divider]` rows |
| Patterns/Sidebar 6040:67524 Theme=Border | root padding 0; Placeholder no fill, radius 0, no shadow; 1px Pale right stroke inside; expanded body 4·8; rail 64 | `theme="border"` |
| Patterns/Sidebar Density=Small (Basic) | header Padding/Medium 16 (64 high); rows 36 (pad 8); footer rows 44; rail 72 (8 + 64) | `[data-variant=basic][data-sidebar-density=small]` |
| Pattern/AppShell/Desktop Layout=Grid, Collapse=Header | Sidebar Border/Small/No shadow + Header Border & Divider/Small; Body 24 / gap 8 | `pattern="grid"`: context defaults, explicit props win |
| Primitives/Sub-Header-Sidebar | Button/Icon-Main Small Tertiary (chevron-left) over Heading/4 (truncate); Medium 4·12·8·12 gap 16, Small 4·8·8·8 gap 12 | `SidebarSubHeader` via `subHeader` |

Other changes:
- Examples: G1 · Grid (16817:58511, Team performance) and G2 · Grid, a level inside the app (16823:89311, Time off). Every box is Flat, as Figma draws it.
- Test: `tests/interaction/app-shell-grid.test.tsx`.
- Docs: guideline rows, the Grid do line, and the skill texts (screen-rules, design-principles).
- Regenerated: compile-api, library keywords, part props.

The Medium rail: code had 84 / 88 (an 8px right inset, header gap 16), while the Pattern draws 80 (no right inset, gap
24). The user said "Sửa rail Medium theo Figma luôn", so now:
- sidebar.css: min-width 80, no right inset, Gap/Large;
- app-shell.css: the shell's -8px rail offset is gone;
- figma-push SIDEBAR_RAIL_WIDTH.basic is 80, with its selftest (B's file; B to be told);
- test: `Sidebar rail, Density=Medium`.
Studio's Theme/Density mapping waits for this merge (Bug session).

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

## Copy a Section with its frames (Session C) — tier S, branch `zen/feat/studio-section-duplicate-20261021`
The user picked it (2026-10-21) from the BACKLOG P1 "Studio design page = Figma" leftovers (F4, C's area). ⌥-drag, ⌘D
and ⌘C ⌘V of a Section copy it with the frames and Sections it holds (board/sections.ts, any depth), all moved by the
same amount, in one edit and one ⌘Z; the copy is selected. `frameEdit.ts` `copySection`: one `insertChild` `paste` of
the Section copies first (they draw behind the frames) then the frame copies, after the original Section; each copy a
new id (`freeFrameId` per kind); links stay as written (Figma's copies on a page keep pointing at the originals:
forum reports). `copyFrame` hands a Section to it, so ⌥-drag (`frameMove.ts`, the Section no longer refuses ⌥), ⌘D
and paste all take it; a Section's ⌘C clip carries what it holds (`frameClip` `held`). Fix met on the way: ⌘D on a
Section copied only the Section, under a Screen's id (`freeFrameId("screen")`). Checked in Node: the paste edit on a
builder page puts Section 2 after Section 1, then its Screen. E2E FW-106 (⌘D beside, ⌥-drag where it ends, the
original stays, one ⌘Z each) waits for a gate slot.
- Gate (13:05–13:36, main 3c77ff96 merged in): static ✓; Studio E2E 335 / 336, B-28 timed out (AppShellHeader
  selection) and passed alone (52 s): load flake. The matrix leaves the Figma walk out, so `--only=figma` ran apart:
  FW-106 ✓ with FW-44/45/46. FW-66 (F6 text Resizing, mine) failed there and on main 3c77ff96 too: its steps take
  under 1 s, but `restoring`'s `undoTo` waited 4 s after each of the first four of five ⌘Z (until the page equals the
  start) and passed the row's 20 s. Fixed at its owner, the shared helper: each ⌘Z waits for its own step (the page
  changes). FW-66 + FW-106 ✓ in 12 s. The whole Figma walk again: 125 / 126, FW-02 (⌘F) timed out once and passed
  alone (8 s; it passed in the first walk run).

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
