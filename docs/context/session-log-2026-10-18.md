# Session log 2026-10-18

## Zen Agent in Studio for vibe design: plan + V-1 baseline (user: "Plan trước … Plan chứ khoan làm") — plan, no code

- Plan `docs/research/studio-vibe-agent-2026-10-18.md`: embedded agent panel, loop in the dev server on the Anthropic SDK
  Tool Runner, Studio MCP tools run through the relay in-process (replaces the Agent SDK of the 2026-10-05 spec).
  User decisions: API key or `ant auth login` (per-token billing); Opus 5.5 default + Sonnet 5.5 / Haiku 5.5 picker;
  floating panel left of the canvas only; ⌘Z per step + "undo the whole turn"; phases V0–V4 each approved separately.
- V-1 (approved): sales dashboard on an empty Studio page through Claude Code + zen-studio MCP. 13 canvas calls, 2 undo
  steps for the whole build, 2 refusals (ids stale after the person switched project; open_page cannot see another
  project), 12 knowledge calls (most of the tokens), ~66 s, 0 dialect errors. Gaps folded into V0/V1 (plan §7);
  two questions to BACKLOG (chart currency in the dialect, BarList in a stretched card).
- Test pages left in Studio for the user to look at and trash: "V-1 · Sales overview" in two projects
  (ids v-1-sales-overview, v-1-sales-overview-2). No code changed; no gate run (docs only).

## Zen Agent V0 (user: "làm V0 đi") — tier M, worktree `../Zen-DS-agent`, branch `zen/feat/studio-agent-v0-20261018`

- Built per plan §4 (`docs/research/studio-vibe-agent-2026-10-18.md` §8 lists it): `tools/studio/agent/*` (Tool Runner
  turn over the Studio MCP tools through the relay, zen-ds over stdio, check_page, routes `/agent/*` behind the `/edit`
  guards), panel `src/platform/studio/agent/*` (⌘J, toolbar ✦), plugin/StudioApp/CanvasTools/ShortcutsDialog/AiChip/
  runtime small edits. User asked mid-build whether the agent uses Zen rules + harness while vibing: yes — the usage
  harness runs after every changing turn and the findings the turn caused go back to the model (2 rounds); wiring rules
  (button without action) are listed, not forced, on design pages.
- Found on the way: "make it secondary" trips `button/secondary-justified` (the agent now reports it); a panel answer
  raced a New chat (generation guard); the check stayed "fixing" when the model changed nothing (now "left"); the panel
  header sat under the floating bars below 1280px (now starts under them).
- Checks: agent.selftest 17/17; E2E AG-01…06 6/6 ×3 (baseline +6 rows); studio:selftest all; tsc; style/usage guard on
  the new files; screenshots 1512 / 390 / dark, transcript restored after reload. Live run with a real key: waits for the
  user (no key on this machine).
- Gate in the worktree: `npm run qa -- --isolated --files=<the V0 files>` PASS (report
  `.qa/reports/2026-10-17T21-08-16-6afafa79.md`, Studio E2E 324 works · 0 broken). D-01 failed first, also on clean
  main: commit 4ff67077 (card grey-canvas fix) carried the E2E leftover `save-a level="primary"` in
  `src/platform/examples/e2e/StudioSaveFixture.tsx`; restored to `tertiary` on this branch (fix at its owner).

## Dark lift in Global Colors (tier XS token change, session "Studio project theme customization"; asked by session "Kết nối GitHub cho Zen Figma", approved by the user here: "Làm luôn")
- The Zen plugin (commit 5ce6ba8) changed its ramp algorithm. `generateScale` is now the contrast ramp (`generateBaseScale`)
  plus `liftDarkSteps`: Dark Accent steps 2–8 and Dark Neutral steps 2–7 get +0.020 OKLCH L (`DARK_STEP_LIFT`, chroma
  gamut-mapped).
- `node tools/studio/zen-ramp-extract.mjs` re-copied it into tools/studio/zen-ramp.generated.mjs.
- Global Colors regeneration:
  - The Zen mode was regenerated for all 20 ramps on the #121212 dark canvas.
  - 278 Dark values changed and 0 Light; the Gray and Blue samples match the plugin exactly.
  - Zen-High-Contrast was recomputed with scripts/high-contrast.mjs (279 values; 0 rule failures).
- figma.collections.json: note and date updated. tokens:build, styles:build and native rebuilt.
- Checks:
  - tokens:check ✓, styles:check ✓, tokens:native:check ✓.
  - project-theme.selftest 1961 ✓: the copy rebuilds the new Global Colors exactly.
- Also: PR #124 makes `zen-ramp-extract --check` warn instead of failing. The plugin's change had made every session's
  studio:selftest fail on this Mac.
- Figma: the user runs Update in the Zen plugin so the Zen file matches.

## Zen Agent V1a (user: "plan V1 trước đi", then "OK") — tier M, worktree `../Zen-DS-agent-v1`, branch `zen/feat/studio-agent-v1-20261018`

- Plan §9 recorded with the user's "OK" to every recommendation (chat per page, ask when a request breaks a Zen rule,
  eval budget with Sonnet + Haiku, V1a → V1b → V1c). V1a built: model picker (a Menu at the panel's foot; the AiChatField
  model slot cannot anchor a Menu), Undo turn, `ask_person` (+ POST /agent/answer), pictures (paste or +, `pictures.ts`),
  transcript parts in order, canvas flash of the changed layer for any MCP client (`mcp/highlight.ts`).
- Found on the way: the flash outlined the parent Stack too ("Added to #parent" in the insert answer) → ids after
  Added to / Moved into / Copied / Deleted are left out, children too; the E2E helper read the previous "Stopped" reply
  as the new one → waits for the new reply; the tab's update answer is "Changed:" + outline → step details join them.
  Machine load (replayd ~90% CPU, load 14) made two E2E repeats time out; reruns at load 6–9 passed.
- Checks: agent.selftest 21/21, mcp.selftest 14/14, E2E AG-01…12 12/12 ×3 (baseline +6), tsc, style/usage guard on
  the new files; screenshots 1512 / 390 (flash on the Button only, question card, model menu, picture).

## Project variables: only the project's mode (tier S, session "Studio project theme customization"; user: "trong variables
studio chỉ hiện của project đó, không cho hiện project khác hoặc mặc định (mode Zen)") — worktree `../Zen-DS-project-vars`,
branch `zen/fix/project-variables-20261018`

- `project/projectVariables.ts`: `withProjectMode` gives Base Colors (Project) one mode, named after the project,
  instead of putting it before Zen. Drafts keeps Zen.
- `VariablesWindow.tsx`: inside a project that collection's rows are fixed. Rename, Duplicate, Delete and Create
  variable are off; Enter / Delete say "This project's colours change in Project settings"; a value opens Project
  settings, as before. The collections menu counts the shown modes (Base Colors (Project) · 1 mode).
- Checked on a private server (:5197, Playwright): project Demo → headers Name | Demo, Create variable disabled, Enter
  makes no rename field, Delete removes no row, a value opens Project settings; Drafts → Name | Zen, Create enabled.

## Studio component boards + Main component coverage (tier L, session "Bug")

User: "Update lại Progress component từ Figma lên Studio" · "Kiểm tra lại hết các main component của Studio đã hiển thị
đủ chưa" · "Sắp xếp layout của các trang component trên canvas lại cho gọn gàng và chuyên nghiệp hơn. Mỗi lần bổ sung
để kiểm tra lại layout" (layout picked: "Xếp dọc theo khu") · "Bug UI của section badge".
- Progress from the live file: Progress-Bar fills None 0 / Low 20 / Medium 40 / Good 80 / Done 100 (grid weights);
  Progress-Circle/Icon Done=No is an 80% pie. Map: `main: { prop, values }` on a skipped VARIANT (figma-props.map.mjs)
  → variant-sets-build draws it; MainComponentFrame turns numeric axes into numbers. Same for Rating and SkeletonText.
  ProgressCircle maps Progress-Circle + Progress-Circle/Icon (Theme row in Properties) + an Assets item.
- Probe of all 40 Main component pages (scratch Playwright): zero-width cells Divider / NPS / Dashboard header rows →
  a collapsed variant takes its set's Figma width (356 / 212·392 / 1232, else 360).
- Board: StudioBoard sections Component (row) · Examples (wrap) · Docs (masonry, boardLayout.ts `masonry` + selftest);
  frames "guidelines" and "props:<Component>" (ComponentProps `only`, unique ids); zoom-to-fit takes every section.
- E2E group `board`: BL-01 (stack, edges, gaps, frames inside sections, Docs columns, tab padding) and BL-02 (no empty
  Main component cell) over the 49 component pages, 156 s; both works, in the baseline.
- Still open (BACKLOG): Main component not drawn for components without an Assets item (ToggleButton, BadgeCounter,
  HeadingField, SkeletonShape, OpinionScale, UploaderFileItem, ControlBarSelectItem, InputConditionItem, Chat parts),
  the five overlays (deferred by design), 13 components with no variant set mapped, Dashboard header Navigation/Custom
  rows drawn without their content.

## AppShell collapses a customised Sidebar (user: "lỗi sidebar lúc expand và collapse khi dùng template … nếu user gọi sidebar ra rồi custom") — tier M
- Cause 1: AppShell read the rail from `sidebar.type === Sidebar` + its props. Measured (scratch vitest, 1440px): a
  Sidebar wrapped in an app component got no control at all (240px, no toggle); wrapped with `collapsed` it stayed an
  84px rail with no way out; a wrapped Sidebar with its own `collapsed` + `onCollapsedChange` beside a shell prop showed
  two controls and the top-bar one did nothing. Same for a Sidebar in a Stack (Studio wrap) and a Studio ⌥⌘K main,
  which compile.mjs exports as `<LocalFn />`.
- Fix: `SidebarShellContext.register` (`_shared/sidebar-shell.ts`). The Sidebar registers in a layout effect
  (canCollapse = not workspace, its `collapsed`, owns = has `onCollapsedChange`, `request` = a stable call of it); the
  drawer copy never registers. AppShell reads a Sidebar passed straight in from its props as before (first render, SSR)
  and a deeper one from the registration; the first word from a wrapped Sidebar seeds the rail unless
  `defaultSidebarCollapsed` is set; an owning Sidebar keeps its header control and the shell's toggle /
  `useAppShell().toggleSidebar()` call its handler.
- Cause 2: HrShell's footer was a raw `<button><Icon/><span>`; Studio's template copy turns it into Stack + Icon + Text,
  which the rail CSS (`> button > span`) cannot hide: rail 122px with "Apps" showing (the user's page "HR · Expense
  overview"). Footer is now `<SidebarMenuItem id="apps">` (onItemClick "apps" → the demo toast): 84px, label hidden,
  name "Apps".
- Tests: 6 new cases in `tests/interaction/app-shell-sidebar-context.test.tsx` (wrapped, wrapped collapsed,
  defaultSidebarCollapsed wins, Stack wrap, owning Sidebar + useAppShell, footer SidebarMenuItem 84px). AppShell,
  Sidebar slots, nested overrides, navigation and smoke suites: 411 passed. tsc clean; guidelines rebuilt (Sidebar
  `collapsed` now documented).
- Gate: `npm run qa -- --isolated --keep-going --files=…` PASS (report `.qa/reports/2026-10-17T19-10-54-c49938e0.md`;
  full vitest 70/70 on the second run, the first lost 3 unrelated-looking tests to load ~18 with another session's gate
  running; my suites passed 4/4 repeats). Sheets read: templates (HR Apps row aligned, rail shows its icon alone),
  app-shell, sidebar. Studio page "HR · Expense overview" (its Stack footer) still to replace once the Studio tab is
  open again (the tab closed during the session).
- Gathered by "Giám sát" after the session closed (PR zen/fix/appshell-wrapped-sidebar-20261018), with the "Bug"
  session's Studio E2E SP-08 update (`tools/studio/e2e/scenarios/starters.mjs`: `appsButton` → `appsItem`), which must
  land together with the HrShell footer change.

## AppShell patterns in Figma (user: "Tái cấu trúc và xây dựng lại AppShell giống như vầy … Dựng trước bên Figma rồi duyệt xong sẽ qua Studio") — Figma only, waiting for review
- Source: the user's draft section "Innovatte AppShell" (16243:290639: Pattern/AppShell 16243:290638, Header/AppShell
  16243:290461) and ◇ Master-Layout · Variants B1–B6 / C1–F12, read node by node (user: "Đọc Figma chứ không chụp assume").
- Built on ◇ Master-Layout, section "AppShell · Patterns (proposal for review)" 16254:1057: Read me 16266:3283,
  `.Primitives/AppShell/Placeholder` 16254:1058 (Side-Panel's dashed "Replace Component Here" look), `.Primitives/AppShell/Pane`
  16254:1099 (Theme Shadow · Flat · Canvas), `Pattern/AppShell/Desktop` 16258:1857 (Layout Sidebar · Top-Bar · List-Detail ·
  Workspace · Docs · Focus; booleans Sidebar, Side-Panel, Floating-Actions, Leading-Pane, Trailing-Pane, Progress; slot
  Content), `Pattern/AppShell/Mobile` 16261:136204 (Top Bar · Band · Media × Bottom Tab-Bar · Floating · Actions · None;
  slots Content, Hero, Backdrop; booleans Top-Navigation, Floating-Actions).
- Header/AppShell (the user's) gained booleans Top-Header and Main (defaults on, draft unchanged).
- Audit (harness, 21 roots): 6 errors left, all library-owned (Floating-Glass gradient ×2, Liquid-Overlay status bar
  Dark ×4); warnings explained (brand chevron colour copied from the draft Sidebar, placeholder "Title", Accent FAB =
  the floating assistant). Instance test: Layout / Top / Bottom swaps keep Content, nested Pane slots editable.
- Open: the Read me's Q1–Q6; Studio part (Frame tool → Screen / Frame, device picker, AppShell optional) after approval.
- Review 1 answers applied (user: Q1 one collapse at a time, Q2 Pane themes like Card without accents, Q3 Band-Sheet yes,
  Q4 tablet status bar + research iPhone Duo, then "tablet nên chia 2 loại xoay ngang và dọc": portrait = mobile
  AppShell, landscape = desktop adaptive; Q5/Q6 OK):
  - Desktop 16258:1857: `Collapse` Header | Sidebar | None (one button shown: header's or the Sidebar's own
    `Collapse Button#16243:0`); `Status-Bar` boolean (Status-bar/IOS/Tablet) for iPad landscape at 1133 × 744; roots
    with a Sidebar wrap their row in `Shell`; Docs/Focus columns FILL with maxWidth 720/680. Usage row 16283:9982.
  - Mobile 16261:136204: `Device` Phone | Tablet (iPad portrait 744 × 1133, Breakpoint Tablet, Status-bar/IOS/Tablet on
    top, Top-Navigation's own status bar off) × Top Bar | Band | Band-Sheet | Media × Bottom = 32 variants, manual grid.
  - Pane 16254:1099: Card's Neutral Theme × Surface (Shadow, Flat ×2, Border ×3, Pale, Subtle, On-Container) + Canvas.
    Solid removed (the user flagged it with a Border variant that rendered black: re-binding a cloned fill to the same
    variable keeps the black fallback; fixed by copying Flat's fills; rule in skills/zen-figma-design/references/figma-gotchas.md).
  - Library fix: Status-bar/IOS/Tablet inner Wrapper + Status Bar FILL (the battery was cut off below 1208 wide).
  - Draft Pattern/AppShell 16243:290638 and its section deleted (0 instances); Header/AppShell moved into 16254:1057.
    The desktop-style tablet set built earlier the same day was removed (superseded by the orientation split).
  - Audit (50 variants): 12 errors, all library-owned (Floating-Glass gradient ×4, Liquid-Overlay status bar Dark ×8).
  - iPhone Duo research (Apple, 9 Sep 2026): inner 1878 × 2670 px, outer 1398 × 2034 px, status cluster in a corner,
    navigation along the right edge, vertical tab bars under iOS 27.1 SDK — Read me 16280:5328 §5, Q7 (needs new parts).
- Review 2 (user: Q7 yes, Q8 ok): iPhone Duo built in the AppShell section — Status-bar/IOS/Duo 16287:5822 (Side ·
  Side-Island · Corner; the clock beside the combined round icon .Primitives/Status-bar/Duo-Status 16294:6171 — battery
  ring, Wi-Fi, five signal dots; user: "status bar của Duo chưa đúng" → redone from Apple's "circular, flexible system
  that nestles into the corner"), Side-Strip/Duo 16287:5823 (84pt right strip; tab items made square 64 on the Duo
  instances only — user: "Bug bo góc trong ngoài … chỉ làm cho Duo"), Pattern/AppShell/Duo 16288:7247 (Inner 951 × 669,
  Outer 466 × 678, Inner-Portrait 669 × 951; Leading-Pane, Fold). Audit: 0 errors after binding the battery radii.
  Studio work starts in worktree ../Zen-DS-appshell (branch zen/feat/appshell-frames-20261018).
- Duo checked against Apple's newsroom video and app images (user: "Vẫn chưa giống lắm", "Kiểm tra lại coi có đúng không?"):
  status = camera (outer) above the clock above one round icon (arc over the top = battery, dots along the bottom =
  cellular, Wi-Fi inside); strip = status, Back (off on root screens), grouped actions in one Liquid-Glass capsule,
  Primary, then tabs capsule + Search at the bottom; inner portrait keeps horizontal bars 16 below the edge with the
  corner status in the bar's row (no Apple image of that posture; simulator measure). New audit rule
  `radius/concentric` (harness + audit-rules.md + figma-gotchas.md, ai-kit:check 147 ✓).
- Figma Top-Navigation/Mobile (user: "action icon của mobile có thể mở thêm 2-3 action. Hiện tại chỉ cho mở 1 trailing"):
  `.Primitives/Mobile/Top-Navigation/Trailling` 12013:39571 gained booleans Action 2 / Action 3 (off; clones of the slot's
  action left of the slot, root gap = the slot's Action-Button-Gap / Action-Icon-Gap — a boolean cannot reach slot
  sublayers); in all 24 Top-Navigation/Mobile variants Top-Trailing is exposed, hugs its actions, and its wrapper lost
  maxWidth 88 (it pushed actions 2–3 past the edge). Checked at 390: 1/2/3 actions fit, the title shrinks (238 → 134).
  Duo title row: Main-Container padding-top Spacing/Padding/Small, inner status padding-top 2XLarge (user: "Heading hơi sát trên").
- Review 3 (Figma, user corrections the same afternoon):
  - "Trailing bên trong action button, bạn nhầm trailing slot": Action 2 / Action 3 removed from Trailling 12013:39571
    (Top-Trailing stays exposed and hugging). Nav-Action/Icon-Main 6085:33688 and Liquid-Glass 12015:46174 gained
    Trailing-Icon-2 (+ -Src): one capsule of up to three icons (§17's three trailing places); Liquid-Glass gained
    Direction=Horizontal · Vertical (20 new variants, "dọc dành cho Duo"); the Duo strip's two actions are one vertical
    capsule (Trailing-Icon on).
  - Duo status overlay cases: Status-bar/IOS/Duo × Style=Default · Black Overlay · White Overlay (Content/On-Black- and
    On-White-Overlay), Duo-Status is a set 16313:6362 with the same axis.
  - iPad status bar detached from the top bar: on all 16 tablet variants the separate Status-Bar is gone, Top-Navigation's
    own Status-bar swapped to Status-bar/IOS/Tablet (Fill). Its battery border/cap were raw black (stayed black in Dark):
    bound to Content/Neutral/Strongest. New audit rule `navigation/status-in-bar`.
  - Floating bottom bar fit (cases 16260:305754, "dành chung mobile và tablet"; values "min 64 max 88" for every tab):
    item sets 9017:25813 / 9018:43881 and both navs at 64/88; patterns: phone Fill, tablet + Duo Hug with Fixed 88 tabs
    (Space between with the action). New audit rule `navigation/floating-fit`; code BottomNavigation CSS follows it
    (worktree branch). The user's case "3 tabs + action" was built at the old selected max 100 and now reads Hug.
  - "Kích thước 2 pane hai bên không đều": Workspace (264 / 300) and Docs (264 / 220) panes bound to Sidebar/Default-Width.
  - Action-Bar/Mobile 16326:6489 (Type Default | Glass with the Floating-Glass fade + progressive blur; Home-Indicator
    boolean; Actions exposed) replaces the hand-built bar in the 8 Bottom=Actions variants.
  - QA: harness fixed where it misread (icons counted in radius/concentric; a component set read as one screen; set
    chrome audited); Top-Navigation/Mobile set re-gridded (its third column was cut off by the docs frame). Final run over
    17 sets: every remaining finding is library-owned by design (Focus-Ring 6px outside, overlay status Dark, Liquid /
    Floating gradients, blur and glass effects without a style, iOS status bars without text styles). ai-kit:check 151 ✓.
  - Next (user): rebuild every ◆ template page except Logistic on the new AppShell, Figma first. Inventory: HR-Platform
    22 desktop (one old Patterns/Pages/Density-Medium instance each), Performance 21 desktop (same), Ecommerce 19 desktop
    storefront pages (own marketing header, up to 8604 high), Social 17 phone (Top-Navigation only), Finance 10 phone
    (Top-Navigation + Tab-Bar / Floating-Glass).
- Template rebuild on the new AppShell (user: archive the old screens, edit Performance, leave Ecommerce and Logistic):
  each original frame stays in place (prototype links and overlays kept) and now holds a Pattern/AppShell instance; a
  clone of the original sits in the page's "Archive · before AppShell (2026-10-18)" section.
  - HR-Platform 22 (Layout=Sidebar, Collapse=Header; HR sidebar swapped in with its slots, one collapse button),
    Performance 21 (same; popovers, modals and the side panel stay over it), Finance 10 (Mobile Phone Bar × Tab-Bar /
    Floating; Top/Bottom-Navigation swapped to the originals' variants, image fills copied, Body side/top padding 0 and
    Content gap 0 because those blocks carry their own margins). Checked against the archive: texts of header, sidebar,
    content and overlays, nav variants, heights — all clean.
  - Header/AppShell gained a Sections slot (empty = 0 high) for the old header's extra rows (Tasks tabs + filters,
    Performance Control-Bar), as code AppShell sections; "cho phép tắt hàng main của header": its Main boolean (128 → 72)
    is on every desktop layout's exposed Header.
  - clone() traps met: a FILL card in a HUG row collapses to 1px (pin it to the original height); overrides deep inside
    a nested instance in a slot (a badge count) and image fills of swapped bars are not carried (copy them).
  - Pre-existing: HR Tasks content runs 46px below its 982 screen (54px in the original).
  - Social waits on the user (its Chats screens' hand-made bottom bar).
- Empty State (user: "vẫn chưa dùng rule các empty state … chưa update size của illustration trong Figma", then
  "120 thì bé quá … 200"): Figma Empty-State 16339:135 and its illustration 16339:69 have Size=Medium (240, icon
  Popular/2XLarge) | Small (200, icon Popular/XLarge; 1px / 2px strokes kept). Small applied where it fills a region: the
  16 mobile Band-Sheet / Media sheets, HR's leave list under its summary cards, Performance's tables and chart cards.
  The Performance "Search, no results" table hid the illustration (code rule keep-illustration); with it back the screen
  is 1556 high. New audit rule `empty-state/size-by-container` (follow-up to PR #131). Code EmptyState `sm` is still 120:
  change it to 200 with a Popular/XLarge icon.
- Status bars: Status-bar/IOS/Mobile 16327:6750 and Tablet 16327:7921 have Style Default · Black Overlay · White Overlay
  (user Q9 yes); the overlay Top-Navigations and the tablet Media patterns use Black Overlay instead of a Dark mode.
- Social rebuilt (user: (a) "Làm lại" the Chats bottom bar, (b) conversations OK): 17 screens on Pattern/AppShell/Mobile in
  place, clones in the page's Archive. The three Chats screens' hand-made `.Social/.Business/Chat/Bot-Nav` (a wrapper
  around Bottom-Navigation/Mobile/Default) became the library bar: Tab-Bar with the same five items (icons, the Profile
  avatar, the selected tab), Floating-Glass with four tabs and no action on the Liquid Glass copy (88 each, Fill). The 14
  conversations use Bottom=None with the pattern's home indicator off: the composer (Chat-Control, its own indicator) stays
  pinned at the foot and the message bubbles' overlay stays on top; the instance has no fill so the frames' doodle
  background shows. Checked against the archive: all texts and nav variants match. The Chats list runs under the tab
  bar as in the originals (a scrolling list).
- Performance calendar on the ❖ Calendar components (user: "nên dùng component từ page Calendar gốc", then "bỏ các
  component tạo trong page Performance"): Month, Event details and New event now hold `Calendar/Month` (Desktop; days
  of Sept 2024 Mon-first, Outside / Today 22, 30 events as `.Primitives/Calendar/Event` in the Day-Cells' Events slots;
  Team → Blue, Design → Violet, Sales → Teal, Company → Orange, the same Support Subtle / Strongest tokens). Calendar/Time-Grid
  has no slots (its day columns and sample blocks are fixed), so the Week screen keeps its grid with every part swapped
  to the library primitives (Slot 140, Date 7, Event-Block 7, Event 1; same 64 px/hour from 08:00, sizes unchanged).
  `.Template-Component/Performance/Sidebar-List` (no library twin: the screens' own menu) was detached on the 21 screens;
  the archive's 392 local instances were detached; the five local components and the `.Template` section are deleted
  (0 instances left on any page, 0 instances without a main). Scripts: `getInstancesAsync` still returns removed nodes
  (reading their parent throws), and nodes inside instances or slots are new wrappers on each read (find by id).
- Rule: the header's sidebar toggle never sits beside a Master crumb (user: "Nếu bật button bật tắt sidebar ở đây thì
  không dùng item breadcrumb master ở đầu. do bị conflict icon", "Nếu muốn dùng thì tắt icon sidebar và bật ở header
  sidebar"). Harness `navigation/collapse-beside-master-crumb` (error: a visible Header/AppShell with Collapse Button and
  Top-Header on whose first visible `.Primitives/Breadcrumbs/Item` in Top-Elements is Level=Master), audit-rules row,
  screen-rules bullet; ai-kit:check 155 ✓. Performance's 21 screens set to Collapse=Sidebar (texts unchanged); HR (22),
  the patterns and the Header/AppShell default start with Level=Sub. Tried in Figma: Performance 0, HR 0, patterns 0, a
  temporary Collapse=Header instance with a Master crumb 1 (removed).
- Code, checked against Figma (user: "làm tiếp phần code. Nhưng phải check lại từ figma"), branch
  zen/feat/appshell-frames-20261018 on main 0993a6b8:
  - EmptyState `sm` = Figma Empty-State Size=Small (16339:82; set 16339:135, illustration set 16339:69): 200 art, 36 icon
    (Popular/XLarge, Figma dm-36), the same 1px / 2px lines. Read from the nodes, two older drifts fixed with it: the ring,
    well and icon sit on (149, 130) of 240 (code had 146, 120) and the icon is Content/Placeholder (code had
    Content/Neutral/Light). Guideline source, harness message, Figma description source (Empty-State now in FORCE: its
    hand-written set description had stacked HTML escapes; the Medium variant's stale lone-component text cleared, backup
    on 🔒 ARCHIVED "Description backup 2026-10-18"), docs regenerated.
  - Studio ↔ Figma: component-properties (❖ Empty State re-read: Size on both sets), figma-props map `Size: "size"`,
    library-keys (the two sets; 6085:25796 / 6085:25816 are now their Medium variants, keys unchanged), native-pack
    merged from one probe frame (16364:4, removed) instead of a full re-capture: only the two Empty-State symbols changed
    and the two Small variants were added (Button/Main identical). The user's clipboard was saved and put back.
  - BottomNavigation floating / floating-glass tabs 64–88 (Fill while they fit, Hug at 88), phone and tablet.
  - Studio phase 1 (Frame picker, Size presets, device simulator in Present and Play): E2E B-45 (Frame › Frame 100 × 100),
    B-46 (Size iPhone → iPad, portrait, one ⌘Z), PT-15 (Present on the iPhone, iPad portrait, Device frame, Duo open).
  - QA: `npm run qa -- --isolated` on empty-state, bottom-navigation and the 13 pages that render a Small Empty State: PASS
    (0 errors; 12 sheets reviewed). Studio, guidelines, usage selftests ✓, tsc ✓.

## Studio Flat hover (user: "UI của Studio dùng màu hover cho các nền flat chưa đúng (Định nghĩa flat là không có nền...)") — tier S
- Cause: Studio items with no fill at rest hovered with Neutral/Subtle/Hover (alpha 4) or Surface/Hover; the selected
  fill is Active/Neutral/Subtle (alpha 3), so the hovered Variables group looked darker than the selected one.
- Fix: `variables.css` (groups + `:active` + selected-row hover = Subtle/Hover as Sidebar, value cells, alias options),
  `inspector.css` (`.studio-inspector__item` hover/pressed), `controls.css` (align-box target) → Neutral/Flat/Hover|Pressed.
- Rule: style-guard `color/flat-state` (error; rest none/transparent/*-flat-default + :hover/:active with a non-Flat
  state fill; selected rows exempt), fixtures bad/good; 0 findings repo-wide after the fix, 5 on the old Studio CSS.
  Guideline background-layers do/don't added (guidelines.source.mjs → rebuilt).
- Measured (Playwright, :5180 Variables): rest 0, hover rgba(5,5,5,.03), selected/pressed rgba(2,2,2,.075).
- Gathered by "Giám sát" on 2026-10-18: the session closed while its gate was running; the gate was run again here (PR zen/fix/studio-flat-hover-20261018).
## Studio in Figma's words and keys — F0 (user: "Đồng ý theo đề xuất, làm F0 trước") — tier M, worktree `../Zen-DS-figlang`, branch `zen/feat/studio-f0-words-keys-20261018`

Plan `docs/research/studio-figma-design-parity-2026-10-18.md` (audit + plan written this session, every §4 recommendation
approved). F0 applies its glossary (§3a) and keys.
- **Keys:** `edit/figmaNotYet.ts` — Figma keys Zen lacks (⌘R, ⌘G, ⇧⌘G, ⇧⌘L, ⌘E, ⌥⌘O, ⌃⌘M, ⌥⌘A, ⌘Y, ⇧⌘C, ⌃⌥T/H/V, ⌃G,
  ⇧R, ⇧S, ⇧P, ⇧H, ⇧V, ⇧N, K, S, P, C, I, N) say "X isn't in Zen Studio yet" (⌘R / ⌘G / ⌘Y / ⌘E kept from the browser
  even in a field). ⌘K = Actions (⌘/ stays), ⌘F = Find a layer, ⇧⌘K = Place image/video (the Image tool), Enter = Select
  children (all of them), ⌥⌘↵ = Present (a page you made plays its prototype; P was Play), ⇧0 = Zoom to 100%, ⇧2 = Zoom to
  selection. Show/Hide UI no longer persists hidden across a reload.
- **Words:** one tooltip shape `tip(name, keys)` (`shell/ShortcutTip.tsx`); menus Bring to front / forward, Send backward
  / to back, Delete, Show/Hide UI, Create component, Group selection and Lock (off, "Not in Zen Studio yet"); Inspector
  Layers (was Children), Layer size, Alignment, Typography, Reset all changes, "Alignment works only inside auto layout",
  no "Reset to auto"; status lines name tokens ("Gap → XLarge", "left 4XLarge · 48"), "Unsaved" for drafts (dialogs:
  "Discard changes to …"), "Deleted"; Layers row titles and empty states without code; US spelling; option labels by
  Figma names (`controls/scale.ts optionLabel / valueWords`).
- **`words.ts`:** gate adds attribute, markup, render, source, HTML, dev server, Stack / Box; Stack → auto layout frame,
  Box → frame; a / an fixed after a swap; identifiers and paths kept (`data-zen-src`, `src/components`, `List-Box`).
- **Guard:** `words.selftest` part 3 harvests 1,542 UI strings (JSX labels, tooltips, titles, text, menu labels) and fails
  on a retired glossary term (`RETIRED`) or code words in a JSX label. New opt-in E2E group `figma` (FW-01…10, plan §6:
  the Figma walk's scoreboard) — `npm run studio:e2e -- --only=figma`.
- **E2E updated** for the new words: P → ⌥⌘↵ in prototype / builder / dnd / build-check, SE-03 (Enter selects all
  children), I-31 (Unsaved), AP-02, drafts D-01, MC-07, starters (Delete Reports), instance.
- **Interact on a page you made:** off the toolbar and off I (Figma's Pick color), but kept in Actions (⌘K › Interact):
  Play starts only on a Screen, so an Overlay frame's form (the Dashboard template's New project DateField, SP-24, the
  user's 2026-10-15 "date input… hoạt động như bình thường") had no other way to be tried. Figma's answer (Present from
  the selected frame, an overlay too) needs Player.tsx (AppShell session's file): later, with them.
- **Runs:** tsc ✓; `studio:selftest` ✓; `studio:dnd` 19,442 + 12,569 cases, 0 findings; style / usage ✓. Full Studio E2E
  326 / 332, the 6 regressions were old words in the tests (I-31, AP-02, B-43, NO-07) and Interact on templates (SP-23,
  SP-24): fixed, all 6 pass on rerun. `--only=figma` 10 / 10 (FW-10: the undo line reads "Undid “auto layout frame Gap →
  XLarge”").
- **Left (BACKLOG P1 line):** Code properties rows → the Code tab (structural, after F1); Rename / Lock / Group get built
  in F1–F3; Present from an Overlay frame.
- style:check on main after #134 (Giám sát): `.studio-device-duo` gap 8 / padding-top 32 had their zen-allow-raw-spacing
  in the block comment above the selector; style-guard wants it right above each declaration. Fixed (tier XS).

## Segmented Component Size + Primary track from Figma (tier S, session "Bug"; user: "Update tokens Component Size của segmented … từ Figma lên Studio")

- Live read (Component Size, 14 Segmented/* variables): Medium/Horizontal-Padding Compact {dm-8} (repo 10) · Small/Horizontal-Padding
  Comfortable {dm-8} (repo 6); the rest equal; repo-only Studio mode kept. component-size.json + sync note, tokens:build,
  segmented.css Medium fallback 8px.
- Contract hashes found two more drifts: Focus/Accent/Subtle resolved colour (#ff019e2f → #ff01982f, the Zen ramp sync)
  in the 4 Focused items, and Segmented Level=Primary's track now filled Neutral/Subtle with no 2px stroke (CENTER/MIN),
  plus the set description's overlay line. Code follows (Primary ring removed, JSDoc, guidelines rebuilt); contract
  patched and both sets hash equal to the live file.
  - Chat bubble avatar shadow (user removed it from Chat/Conversation/Bubble, "Kiểm tra Studio nếu có thì remove luôn"):
    the two B2 avatars still carried it as an instance override → cleared. Code/Studio have none (chat.css avatar column
    has no shadow, avatar.css only its 1px ring; Studio fixtures, chat-bubbles contract and native-pack carry no avatar
    drop shadow); ◆ Social and ❖ Chat: 0 left.

## ◇ Master-Layout · Variants rebuilt on the AppShell (user: "Dùng appshell mới build lại các example bên ◇ Master-Layout · Variants trong Figma") — Figma only
- All 41 screens (A1–A4, B1–B6, C1–C7, D1–D5, E1–E7, F1–F12) keep their frame and caption; each frame now holds one
  `Pattern/AppShell/Desktop` or `Pattern/AppShell/Mobile` instance. A → Sidebar, Collapse=Sidebar (the trail starts with a
  Master crumb); B1/B3 → Top-Bar, B2 → List-Detail (context column in the Side-Panel, its Actions hidden), B4 → Workspace
  (Border panes), B5 → Docs, B6 → Focus; mobile → Bar / Band / Band-Sheet (D5, E4, E7) / Media (C4) × Tab-Bar / Floating /
  Actions (C4–C6) / None (D2, E4, F2–F11). Navs synced from the originals (variant, props, texts, slot content); body
  content moved into Content / Hero / Backdrop; old header rows mapped to Header/AppShell Top-Elements / Main-Element.
- Checked against the archive copies: visible texts, image fills and icons identical on all 41 screens.
- The section "Archive · before AppShell (2026-10-18)" (16369:163148) was later deleted outside this session (not by
  me); the originals are now only in version history.
- Desktop frames set to Breakpoint = Desktop (the page is Mobile; AppShell desktop sizes bind to Viewport-Width/Height).
  A2–A4 KPI cards then hugged their content (fixed 156 overflowed with Desktop padding). C screens now render in the
  pattern's Comfortable + Mobile typography (they used the Compact / Dashboard defaults before).
- Fixes from the audit: 16 button-beside-text gaps → Spacing/Gap/XSmall; B2 header ⋮ → Button/Icon-Flat; B3 hero gap
  bound, shadow clip off, second Primary → Tertiary; B4 zoom chip re-pinned, inspector value truncates; B2 rail footer.
- Left for the user (audit): 33 `bounds/overflow` = content longer than the 844/982 viewport (overflowDirection cannot be
  overridden in an instance: needs the AppShell Body as a scroll container + a harness exemption); 10 `button/in-card-flat`
  that are the designer's own patterns (device power Icon-Main XSmall, steppers, playback, call); library-owned nav
  gradients (8) and Floating nav without shadow (E5/E6).
- User answers (same session): Q2 OK, Q3 "Button in card flat chỉ dành cho button ở floating ở góc cho hành động more",
  Q4 Comfortable OK. Done:
  - Figma AppShell sets (Desktop 8, Mobile 32, Duo 3): the frame holding the Content slot (Body, or Sheet on
    Band-Sheet/Media) clips and scrolls vertically (prototype overflow); Focus scrolls on Body (Column no clip, so the
    form card's shadow keeps its room).
  - Harness `zen-figma-audit.js`: content running past a non-clipping parent is accepted when the nearest clipping
    ancestor scrolls that way; `button/in-card-flat` / `in-card-wrapper` fire only for the ⋮/⋯ more menu in a card. SKILL.md
    §2 and audit-rules.md rewritten to match; ai-kit:check 155 ✓. B2 header ⋮ back to Icon-Main Tertiary.
  - Audit of the 41 screens: 16 errors → 8 library nav gradients, 5 glyph overflows inside library chart/metric instances
    (B3), 2 Floating navs without shadow (E5/E6), D2 legal text (fixed after the run: Fill + wrap). Warnings explained:
    canvas root-fill overrides, B2 chat avatar 28px blur cut 4px by the Body clip (library effect, 8% alpha).
  - After the Breakpoint = Desktop switch, table and summary-row texts in A1–A4 / B6 kept a stale line layout (wrapped,
    cut) though their boxes read right; toggling the mode Mobile → Desktop again re-laid them out (checked live with
    node.screenshot; get_screenshot lagged on A4).
