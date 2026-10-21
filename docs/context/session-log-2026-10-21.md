# Session log 2026-10-21

## Session "Bug" · PageHeader description tone (tier XS; user: "trong Figma dòng subtext dưới header là tone Light chứ không phải base")

- Read live (use_figma): Primitives/Dashboard/Header Type=Main 4122:33399 SubHeading = Body/Base/Regular,
  Color/Content/Neutral/Light; Type=Control-Bar Subheading (the result count) = Strongest (code already matches).
- PageHeader `description` Text tone base → light (DashboardHeader type="main" renders PageHeader, so its subheading
  follows). JSDoc cites the node; guidelines + api docs rebuilt.

## Session B · Instance menu, instance Appearance, Frame / Group heading (user, 2026-10-21: three of A's re-measure gaps)

A's re-measure on main e99c5408: §2 keys 65 ✅ · 7 🟡 · 4 ❌ (2026-10-18: 36 · 14 · 26); §6.3 14/14 in 44 steps against
Figma's 39. The user picked three of the four gaps in B's area: "Menu chuột phải instance", "Appearance cho Button" and
"Tên Group/Frame ở header" (not "Bỏ mục Content"). Branch `zen/feat/studio-instance-menu-appearance-20261021`. Tier M.
Spec card `docs/research/studio-instance-panel-parity-spec-2026-10-21.md`. Plugin `studio-import` 8248c59.

- Layer menu (K-70), in `inspector/instanceActions.ts` and `shell/CanvasMenu.tsx`:
  - A Zen instance gets Go to main component: its Studio page opens on the Main component frame, selected and zoomed.
    It skips the old page's frame while the board changes.
  - It also gets Reset all changes. The Design panel publishes its header reset for the layer it shows; the menu
    subscribes, since the same click selects the layer, and runs it: one request, one ⌘Z. It is disabled with "No
    changes" when nothing is written.
  - A page's own `<Use>` gains Go to main component (`goToMain`).
- Instance Appearance (K-74):
  - A page has no `style` (dialect), so the look is written as on a frame: `opacity={40}` and `blendMode="multiply"`.
  - `tools/studio/instance-look.mjs` takes them off the component's props: renderPage and compile.mjs put them on its
    `style`, figma-push on the INSTANCE (0–1, the enum), and figma-pull reads them back.
  - The plugin sets the instance's opacity and blend, else 1 and Pass through.
  - Only the components whose `style` reaches their root take it. A probe over every public component found 69 (59
    instances plus primitives); about 100 drop `style`. The conformance test now pins that list.
  - Studio: DesignPanel shows the frames' AppearanceSection on such an instance, on pages made in the Studio.
- Heading: `panelTitle` (select/layerNames.ts) reads Frame for Box / Stack / Grid and Group for a group. Only the
  Design panel heading changes; its title attribute keeps the code name. Eight E2E heading checks follow (builder,
  library, build-check, dnd, draw, figma).
- Live Zen file: the real importer placed a Button at 0.4 MULTIPLY, a plain Button (1, PASS_THROUGH) and a Badge at
  0.6, with no notes. The screenshot matched, and the QA frame was removed.
- Checks:
  - Selftests: push 345, compile 77, the new layerNames selftest 7; studio:selftest passes and tsc is clean.
  - Conformance 180/180; the plugin's full `npm test` passes.
  - New E2E rows FW-99, FW-141 and FW-142 (figma group).
- Gate (15:16–15:52, main 51dffc2b): static checks, TypeScript and browser tests (76/76) pass. Studio E2E is
  332 / 336: MC-02…05 fail as on main. The cause is LayersPanel watching a stale canvas world, and A fixes it
  (53e87642). FW-99/141/142 pass alone, and every changed heading check passes. FW-100/101 were renumbered to
  FW-141/142 because they collided with F10's rows.
- BACKLOG P3 (waits for the user): AppShellHeader `theme` / `density` (#179) are not pushed to Figma yet.

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

## Session "Bug" · Header/AppShell to Studio (tier M; user: "Update Header/AppShell component từ Figma lên studio")

- Live read: Header/AppShell became a set 16783:71068 (Theme Default 16243:290461 · Border 16783:71137 · Border &
  Divider 16783:72140) while the work ran; props Collapse Button, Top-Elements, Main-Element, Top-Header, Main,
  Sections. Contract (◇ Master-Layout) and library-keys (set key 1081dfd3…) hold the set.
- Map AppShellHeader: Main / Sections switches (slot), leading · center · actions as the Slots rows (propSchema
  names), Collapse Button / Top-Header / Top-Elements / Main-Element skipped with reasons, Theme skipped until
  AppShell ships `theme` (approved by the user, its own PR). Main component: MAIN_SAMPLES.AppShellHeader (Figma's
  default content), FIXED_WIDTHS 1272, an AppShellChromeContext preview (toggle "collapse") so the Collapse button draws.
- Native pack: C added `--merge` / `probe-code --ids` (#176). First capture copied the user's selection (C now checks
  the copied node); second capture of the set merged 1 set + 3 symbols, clipboard put back 4/4, probe frame removed.
  Drift found and handed over: header bottom padding 12 (Figma) vs 8 (code) → AppShell; the push's top bar → B.
- Next (agreed with AppShell, user: "Studio vẽ đủ các variant" of Patterns/Sidebar): after #179 and AppShell's
  patterns-sidebar branch, map Header Theme/Density; Sidebar.sets gains "Patterns/Sidebar": "basic" (6040:67524,
  16 variants, wraps Side-Bar/Master/Basic) with Theme/Density/Shadow rows and Expand as `main` collapsed (inverted);
  one desktop capture refreshes Header/AppShell + Patterns/Sidebar + 19 chart sets (drop then `--merge`).
- Built (worktree `../Zen-DS-header-sidebar`, branch `zen/feat/studio-header-sidebar-20261021` on AppShell's
  426a569a): Header Theme {Default, Border & Divider → border-divider} / Density; Sidebar Theme · Density · Shadow
  rows, Expand `main` (Yes → false, No → true). Found by figma-push.selftest (crash at the AppShell master): the push's
  entryFor() picks a set by `setValue`, and a second "basic" set took Side-Bar/Master/Basic's place (the first set is
  re-registered without its setProp). Fix at the owner of the SET row, figma-props-build.mjs: a set that repeats a
  value adds its props and Main component variants, not a choice (first wins), and a boolean's `when` counts values,
  not sets. Push selftest 342 ✓ again; Sidebar is the only map entry with a repeated value.
- Native pack refresh (user: Patterns/Sidebar final, clipboard OK): a drop script took 20 sets out of the pack (19 chart
  sets incl. .Primitives/Chart/Sector, Trend, Hatch, Legend-Item, Stack-Bar Single/Value-Sector, and Patterns/Sidebar's
  4 old variants) with their 149 symbols and 0 slot contents; probe 16897:29494 (164 instances: charts 145, Patterns/
  Sidebar 16, Header/AppShell 3) captured with `--merge --keep`: 21 sets + 164 symbols added, the 211 sets kept stay,
  clipboard put back 6/6, probe removed. check 177/177, figma-native selftest 130 ✓, studio:selftest exit 0.
- Probe (private server): Header/AppShell draws its 4 Theme × Density cells; Patterns/Sidebar switches all 5 themes
  through the variant panel, Medium rail 80, expanded 240; the Small rails measured 60 / 52 (Figma 72 / 64) without a
  logo → AppShell fixed sidebar.css at its owner (e94c0f3c, min-width 72 / 64), stacked under this branch.
- Stack gate (one run for AppShell's #181 + this branch, Supervisor's plan; report .qa/reports/2026-10-21T07-13-11-
  92715053.md): static ✓, Vitest 76/76, behaviour 0 errors, runtime 0 errors + 4 new [rhythm] warnings on AppShell's
  G1 · Grid (10 text styles, already on main), Studio E2E 329 works / 7 broken. B-28 passes on a rerun (flaky under
  load); MC-02…07 fail on main as well (shared checkout at 51dffc2b, and b454389b / 3c77ff96 / e94c0f3c without this
  branch's commits): the click selects the variant but the Layers row never shows selected. Last worked 12:09 today
  (Zen-DS-appshell); handed to B (mainComponent / Layers) and the Supervisor.

## Session "Bug" · Chart responsive in Figma (Figma library only; user: "kiểm tra lại responsive tất cả các chart trong figma", "tất cả các chiều", "Sửa hết")

- Audit: temporary instances of every chart variant on the QA page 15872:3 at 280/343/600/1200 wide (and 0.8×/1.6×
  height for fixed-height ones), clip-aware, shapes by render bounds; flags x/y overflow > 1.5px and a gap > 24px below.
- Fixes: .Primitives/Chart/Sector 4388:8677 last grid row → HUG (labels hung 12px under Line/Multi-Line), Trend
  4401:7782 Sector overrides too; the selected sector (tooltip) moved to the middle in 4 Line Trend + 8 Stack-Bar
  variants (instance constraints cannot be overridden); Radial/Donut Chart frame HUG + minWidth per Size (ring
  120/168/240/320, +124 Start/End legend; Radial End 286–486); Bar Vertical 12-sector minWidth 324, Horizontal minHeight
  290/370/410/610 (4 Secondary made FIXED 290 like Primary); Funnel minHeight 318, Bullet 294.
- Re-audit: 580 instances, 0 issues. The native pack still holds the old chart skeletons (merge keeps what it holds):
  refresh them with the Header/AppShell capture after AppShell's #179 lands.

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

## AppShell session · Patterns/Sidebar → Studio, Sidebar themes (tier M, branch `zen/feat/studio-patterns-sidebar-20261021`, stacked on #179)

The user asked: "Update cả Patterns/Sidebar từ figma lên Studio", "Cập nhật boolean cho footer của sidebar từ figma lên
studio", and (through the Bug session) "bổ sung variant của Patterns/Sidebar". They approved Carved and
Carved-Floating: "Có, cùng đợt Studio". Borderless appeared in Figma while I worked.

Live Patterns/Sidebar 6040:67524, renamed from "…/Density-Medium":
- Theme = Default | Border | Borderless | Carved | Carved-Floating; Density = Medium | Small; plus Shadow and Expand.
- The flush themes (Border, Borderless, Carved): inset 0, rail 64, header gap 24, body padding 4·8.
- Carved-Floating: inset 8·0·8·8, panel in Background/Carved, radius 20, no shadow.

Code:
- `sidebarThemes` has all five values, with CSS for each.
- New test in app-shell-grid.test.tsx.
- Guideline row updated.

Studio:
- Contract: the ❖ Sidebar page re-read (Basic and Small-Density gained Collapse Button and Footer, Workspace gained
  Footer) and Patterns/Sidebar added under ◇ Master-Layout.
- Map: Footer → { toggle: "footer", on: "slot" }; Collapse Button → skip.
- figmaProps regenerated (48 toggles).
- MASTER_SIDEBAR_PATTERN, library-keys and the push selftest use the new name.
- `studio:selftest` exit 0.

The Bug session wires Patterns/Sidebar into Properties and the Main component, and captures the native pack together
with Header/AppShell.

### Standalone Sidebar → Patterns/Sidebar (same branch; user: "Có, sửa push Sidebar đứng riêng luôn")

- Live set read (use_figma, read-only): 16 variants. Border, Borderless, Carved and Carved-Floating exist only at
  Density=Small, and their Shadow is fixed (No when open, Yes on the flush rails). The Side-Bar inside is named
  Patterns/Density/Comfortable/Sidebar/Yes|No.
- Push (`figma-push.mjs`):
  - `sidebarPatternProps(look)` picks the nearest variant: Theme and Expand first, then Density, then Shadow.
  - `sidebarPatternNode` wraps a Basic Side-Bar on its own: its props go to nested "Patterns", its slots and edits move
    inside the Sidebar/Yes|No layer, and that layer fills the pattern's height. Workspace and Small-Density stay as
    they are.
  - The AppShell master writes the same variant (`pattern="grid"` gives Border · Small). Its frames fallback wraps too.
  - Rail widths follow the look: 80 · 72 (Small) · 64 (flush).
- Pull (`figma-pull.mjs`):
  - The composition read keeps its variant (`compositionProps`), and `sidebarPattern` reads a placed pattern or the
    push's instance.
  - `sidebarLookProps` gives back theme, density and shadow. Shadow=No is read on Default only.
  - `instanceIn` and the master frame carry the look, so it survives the AppShell read too.
- Checks:
  - Push selftest 347 (5 new: variant choice, a carved small rail, the grid master, two round trips). `studio:selftest`
    exit 0. library-keys check: all 176 sets keyed.
  - Live-shaped reads of three placed patterns (16783:66571 Border·Small, 16272:135322, 16256:1944) give
    `theme="border" density="small"`, `density="small"` and `collapsed density="small"`.
- BACKLOG P2 "A standalone Sidebar pushes without its theme" removed.
- Real Figma: the plugin's importer was run on "Studio exports — QA" (unused paths stubbed, one use_figma call) with
  three Sidebars: carved small, a border rail, and default with shadow={false}.
  - Each became Patterns/Sidebar with its exact variant: 240 / 64 / 240 wide, the Side-Bar filling 982, rows and
    selection right.
  - The screenshot matches: a flush Carved column, the rail with its line, the inset panel without a shadow.
  - The frame was removed afterwards.
  - The bed's notes about Footer-Container and Divider are use_figma skipping hidden layers. The Footer boolean already
    hides them, and the plugin finds hidden layers.
- Fix from Bug's gate on 3af0dfb9 (Studio Main component probe). Collapsed without a 32px logo, the Density=Small rail
  hugged its content: 60 for default/carved-floating, 52 for the flush themes. Figma's rails are a fixed 72 and 64.
  sidebar.css now gives the small rail min-width 72 and the flush rails 64, as Medium has 80. The new test in
  app-shell-grid.test.tsx runs in Bug's re-run; I ran no browser test, so as not to overlap Bug's gate.

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

## Schedule in code + Studio (session "Calendar", tier L; user: "xong gate thì làm tiếp Schedule")

Branch `zen/feat/schedule-20261021` (worktree `../Zen-DS-schedule`, on top of the Calendar branch). Spec card:
`docs/research/schedule-2026-10-21.md` (read from ❖ Schedule 16121:6 with read-only use_figma dumps).

- `src/components/Schedule/`: ScheduleResourceGrid, ScheduleItinerary, ScheduleSlotPicker, ScheduleDayPlanner and the
  primitives; dates through Calendar's `toDate` (ISO strings for Studio pages). Reuses Event-Block, Now-Line, Week-Strip,
  Avatar / AvatarStack, Dock-Icon, Badge, Divider, IconButton.
- Choices: Slot heights from Select-Item Medium / Small (Comfortable 40 / 32 on phones; Figma's text says 44); Past stop
  titles Neutral/Base (zen-allow, Figma 16133:1131); the Slot label keeps Corner-Radius/Action/Small (it is the radio's
  box); Event-Card meta wraps on a narrow card; bars and the now line are placed through CSS variables.
- Platform page `schedule` (playground + 6 examples incl. PlatformPhone booking), Do/Don't visuals, guideline + keyboard
  map, harness rules (2, fixtures), smoke fixtures, axe baseline (colour-contrast only: Neutral/Light text), 4 interaction
  tests. Studio: component-properties page ❖ Schedule (4 public sets), figma-props map, 4 Assets items, library keys.
- Native pack (user: "Làm luôn"): probe of the 4 sets on the QA page, one Figma desktop copy (the clipboard was empty and
  stays empty), merged additively (9 sets, 34 symbols), no picture layers, probe removed; native-pack check green.
