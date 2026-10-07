# Session log — 2026-09-30

## Dark ramps, fourth Global Colors export (session "Add audit check for text overflowing its box", tier XS)

- 264 Dark values changed, Light none: steps 1–8 of the Dark solid ramps are a touch lighter (153 of 154, at most
  4/255 per channel; Gray/2 #1B1B1B → #191919 is darker), plus Gray/11–12 and 110 small Alpha adjustments. The
  192 VT/Chat/Ananas variables in the export stay out. Dark Canvas = Gray/1 #121212, Surface = Gray/2 #191919
  (canvas/surface contrast 1.11 → 1.07), Strongest text #FDFDFD, all confirmed in the browser.
- `tokens:build` (+ native), `tokens:check`, `tokens:native:check` clean. Gate on the token fast path
  (`--files=src/styles/tokens.css,…`, 56 pages, 10.5 min): audit and Dark audit 0 errors; each of the 34 Dark warnings
  also appears in Light at the same ratio. The contract step fails from the parallel-suite bug (BACKLOG P1); all 23
  suites + 25 interactions pass through `run-all.mjs`, which the user accepted as the evidence.
- Lost time: plain `npm run qa` missed the fast path (tokens.css is script-written), the dev server stopped mid-run.
  Recipe saved to memory for future colour syncs.

## Gate fix: parallel contract suites and the token fast path (same session, approved by the user)

- `tools/figma-contract/check.mjs` and `interactions.mjs` build into `.out/<suite>-<pid>` (removed on exit, `--keep`
  keeps it). The shared `.out/harness.js` + `index.html` let concurrent suites render each other's cases.
- `tools/qa/run.mjs`: the scoped contract step runs `ZEN_QA_SUITES` (default 4) suites at a time, 1 under `--serial`
  (it was `Promise.all` over all of them). `TOKEN_ONLY` also holds when no UI file is recorded but a token source was
  edited, since `tokens:build` writes `tokens.css` through a script.
- Verified with a manual run, `--files=tokens/source/figma/global-colors.json` only: the fast-path note appears and
  the contract step passes 23/23 suites + interactions (it failed 18/23 before).

## Typography outline P2 follow-ups (same session, tier S, approved by the user: "tiếp tục")

- Inventory first: `audit.mjs --quality --outline` over all 61 pages (122 runs): 0 errors, 12 screens without an h1
  (outline-h1) and 6 whose outline does not start at h1; outline-card and outline-siblings 0. Form "Mobile checkout"
  was already fixed.
- Fixed: Bottom Navigation "Floating + action" (compact TopNavigation with the tab name, as the playground does),
  "Glass over media" (visually hidden h1: a full-bleed media screen); Templates "Empty & error states" (PageHeader
  "Projects" h1, Empty States h2, "Project not found"). The first longer description spilled out of the Templates
  list caption at 390 (`fit`), so it keeps its old length. The other 9 screens (Chat desktop, Sidebar shells, Side
  Panel "Docked inspector") are baselined debt, listed in BACKLOG.
- `audit.mjs`: outline-* on by default (`--no-outline`); outline-* and rhythm re-seeded (popover, action-bar and input
  held for the "Component library review và fixes" session, seeded later).
- `tools/qa/lib.mjs`: `pagesAt` follows a helper through the functions that use it (3 levels), and an exported
  component used in other files maps to their pages (a foundation or app-layer file counts as its own pages).
  PlatformPhone → 18 pages, PlatformTypographyHierarchy → typography, ProjectList → bottom-navigation.
- EmptyState in a self-titled Card: no example does it (outline-card 0); left as an API question for the user.

## Review batch 1/9: Action Bar horizontal on phones, Popover scroll + playground (session "Component library review và fixes", tier S+S)

User list of 17 items, two at a time with approval between batches. This batch: items 1 and 2.
- Backup: `Zen-CodeBase/backups/zen-ds-before-actionbar-popover-20260930-020139.tar.gz`.
- ActionBar: `size = vertical || narrow ? "lg" : "md"`, so a horizontal bar under 480px (phone) gets Large buttons,
  side by side (the Bottom-Sheet dual footer). Playground: Device (Phone/Desktop) and Direction are separate controls.
  New example "Filters on a phone" (FormFieldset + Chip normal + Toggle, Clear all · Show N prints, results view).
  Guideline do-line: pick the phone direction by the actions (one leading action → vertical; a pair → horizontal).
- Popover jump: cause measured at 1512×860 — the playground chip loads at y≈772, so the surface opened above it and
  flipped below as soon as the bottom fitted (scrollY 250 → 300: top@266 → bottom@492). `resolveAnchoredSide/Align`
  (useAnchoredPosition.ts) keep the current side while it fits, as CSS anchor positioning keeps its last successful
  fallback; Menu's own placement uses them too. Scroll/resize/ResizeObserver updates run through `flushSync` so a
  portalled surface does not trail its anchor by a frame.
- Playground "không tự mở": it was open at load but flipped over the intro, closed on any control press and stayed
  closed after Trigger changes; the Select trigger could not be opened at all. Now: IntersectionObserver opens it the
  first time the trigger is in view with 300px below; control pointer-downs don't close it; every control change opens
  it; SelectField has `popoverOpen/onPopoverOpenChange` and only autofocuses when opened from its trigger.
- Probe (headless, scratch): opens at scrollY 200 below; no flip scrolling down; flips once to top scrolling back up
  when the bottom would clip; Label/Search/Caption keep it open; outside click closes; Select opens without taking
  focus; Menu flips once (top → bottom) when the top would clip.
- Follow-up (user rule): on phones components keep their full size — Toggle Large, inputs Medium+. "Filters on a
  phone" Toggle → `size="lg"`, its filter Chips → `size="md"` (small measured 20px in the scaled 390 frame); Toggle/Input guideline Size rows say so. Scan of phone-frame examples found one more:
  PlatformMobileShowcases `SheetSettingsExample` ToggleButton (default md) — proposed to the user, not changed.
- Approved by the user ("OK"): SheetSettingsExample ToggleButton → `size="lg"`; harness `mobile/full-size-controls`
  (error, components PlatformPhone + BottomSheet): Toggle/ToggleButton not lg, or an input at size xs/sm, inside them.
  Fixtures: 2 bad, 2 good; `usage:check` clean over 176 files after the fix. HANDOFF rule count → 152.

## Review batch 2/9: item 3 (no guide lines) and item 4 (TopNavigation mobile), same session

Item 3 — inventory by script (imperative verbs, `tone="light"` / `pe-text--light` status lines, fallbacks of status
expressions) over PlatformShowcases, PlatformExamples, Mobile*/ChatDesktop showcases, appLayer. Removed or emptied:
BadgeCounterNav, PopoverCreateLabel, DateBooking ("Add dates"/"Add check-out"), BreadcrumbsCollapsed, TableTaskEdit,
PopoverBulkSelection/BulkList ("5 files")/ContextMenu, RatingReview, ColorBrand, ColorKeyboard, ToastStack (real toast
bodies), the Examples section intro, playground summaries (date picker, breadcrumbs, table edit log, dialog), Link,
Menu (row/card/phone/keyboard/disabled), Action Bar playground note, Description List promo error (no longer reveals
the code), chat demo initial notes (SR-only regions). Kept: real UI copy (empty-state bodies, placeholders, help text,
errors), action logs, the Visually Hidden "screen readers hear" panels (item 16 reviews them). Example descriptions
(above the preview) are unchanged. Backup `backups/zen-ds-before-guide-lines-20260930-024417.tar.gz`.
- Item 3 gate: PASS on 16 pages (explicit `--pages`; the Examples intro copy renders everywhere, checked through them).
  New warnings were pre-existing (Color Selector preview contrast, Chat targets, Dialog rhythm) → Backlog.

Item 4 — research by a background agent (Apple HIG/UIKit/SwiftUI docs, WWDC25 284/356, Material 3, React Navigation,
Flutter's Cupertino port for the numbers). Findings that drove the change: iOS collapses the large title scroll-linked
(not a switch), shows the small title only when the large one is covered (≈ 10pt left), snaps a half-way stop,
starts at the scroll-edge appearance (no hairline) and shows the standard one (fill + hairline, or the iOS 26 edge
effect) once content is under the bar; search hides on scroll; large titles belong to top-level screens.
- `TopNavigation scrollRef`: `useScrollFold` (passive effect — the scroller ref attaches after the header in the same
  commit, a layout effect saw null) writes `--zen-top-nav-fold` per scroll event; thresholds covered (expand − 10),
  folded, scrolled; `scrollend` (160ms debounce fallback) settles to 0 / fold height, instant under reduced motion.
  CSS: the fill moved to `--zen-top-nav-fill`, painted by `::before` whose bottom inset is the fold, so content shows
  below the shrinking header; the fold translates up and clips its top; a non-Search Control-Bar stays pinned.
  Pale rule only for default/alt/compact/compact-alt while scrolled (not in Figma: decision flagged to the user).
- Probe (headless): fold 0→116px tracks scrollTop, bar title visible from 85px, search action at 116, snap 30→0 and
  80→116, Search action scrolls up and focuses "Search messages", one h1 throughout.
- Not changed: Typography › "Master screen · phone" still collapses with an onScroll threshold (manual mode) → Backlog.
  Backup `backups/zen-ds-before-topnav-scroll-20260930-025153.tar.gz`.
- Item 3 follow-up found in the sheets: Link status fallbacks ("always underlined", "(opens in a new tab)", "take its
  colour") and the Date Picker DateField help text "Click the field to open the calendar" → removed.
- Gates: item 4 PASS (`--pages=top-navigation`); final PASS (`--pages=date-picker,link,bottom-sheet,chat`, the pages
  of the last edits plus the two that use the canvas phone rule). New warnings pre-existing → Backlog.

## Review batch 3–4: items 5–12 (same session; the user asked for four, then four more)

- 5 Chip example accent-subtle row: it is the Bottom Sheet Action item's Figma Single-Selected (4059:17214,
  Active/Accent/Subtle). Asked; the user chose List + ListItem. `SheetChoiceList` in Chip › Mobile filter row and Button ›
  Mobile footer CTA (3 sheets). The BottomSheet component and its playground keep the Figma state.
- 6 Date Picker Time-Picker from Figma 460:38628 (Type Single/Range) + Single-Calendar `Time-Picker` boolean (895:31954)
  and Dual-Calendar 465:41427: Divider + InputField Small (hh:mm, InputLeadingTrailing AM/PM) + Checkbox All day. Values
  "HH:mm"; draft with actions; no auto-close on a date pick; Escape ignores an inner popover's handled Escape. Playground
  toggle + example "Meeting with a time". Label keys timeFrom/timeTo/timePlaceholder/timeAm/timePm/allDay/invalidTime.
  Note: Input.tsx ↔ DatePicker.tsx now import each other (render-time only; Popover ↔ Search ↔ Input is the same shape).
  Built on the uncommitted DatePicker parity edits already in the tree (Item Small size, wheel opacities).
- 7 Layout page: delegated to a background agent (layout.tsx / layout.css only); see its section below.
- 8 Metric examples: auto-fill left empty tracks and flex rows hugged left; example cards always render at the
  desktop breakpoint (PlatformShowcases `breakpoint="desktop"`), so responsive Grid columns never change there. Card rows
  use `Grid columns="repeat(auto-fit, minmax(min(100%, Npx), 1fr))"`; split rows use `.pe-metric-split` with a container
  query (< 480px stacks, rules move on top). KPI gets a 4th card (New sign-ups + report).
- 9 `PlaygroundSlot` (docs chrome, dashed Border/Neutral/Subtle, image-size token heights) in Card, Dialog (Custom slot
  on by default, Main-Contents, Side-Content), Side Panel, Bottom Sheet, Accordion; code samples show slot comments.
- 10 Page Header examples wide. 11 Chip › "Period filter on a phone" (Normal chips Medium, single choice) replaces the
  Segmented one; Segmented guideline updated. 12 Sidebar shells: ShellPage → PageHeader (h1 Heading/1), 8 h5 → h2;
  Link › "Links and selectedId" loses its "Jump to…" instruction.
- 7 Layout (background agent, layout.tsx / layout.css only): 9 examples + fuller playground; responsive examples use a
  nested `ZenProvider breakpoint="auto"` because example cards pin desktop (Backlog P2 for a platform decision);
  `.pal-list-box` sets `--zen-list-inset`; Toggles stretched with `.pal-toggles`; teal Avatar initials 2.70:1 avoided
  (Backlog avatar-contrast line). Sources: Material 3 canonical layouts, Polaris Layout, Primer PageLayout, Every Layout,
  Atlassian page layout. Segmented got a 4th example "Fits a phone" after the period example moved to Chip.
- Gates for batch 3–4: 13 pages PASS (after a smoke fixture for DatePickerTimePicker), Segmented PASS, link/menu/
  page-header/app-shell PASS, Layout PASS (Save changes in "Annotated settings" now disabled until something changes —
  the behaviour probe flagged the dead click). New warnings were all pre-existing debt → Backlog.

## Review batch 5: items 13–17 (same session; the user approved "ok")

- 14 HR templates from the live file (`9nZv4uW2LT21yuHabMTCh1`): `src/templates/hr/HrShell.tsx` (mine: Home rail
  Figma HR/Sidebar Expand=No, module Sidebar with workspace brand, Back + title, App Store; top bar Breadcrumbs, Pro,
  Settings, Inbox count → docked Inbox panel, account Menu; floating Zen AI) + 7 pages by 3 background agents, one file
  each: Home 7373:43623, Expense Overviews 12082:87511, My Expenses 7379:272568, My Leaves 7378:38418 (+ empty state
  7379:209766), Leave Types 7379:36025, Public Holiday 7379:41817, All Tasks 7394:105706 / 7407:16906 / 7407:18433 /
  7488:32671. Registered on `?page=templates` with `?raw` sources. Agents' Figma deltas (Metric Title-Highlight
  composed, emoji DockIcon 12px, flags as emoji, data fixes in My Leaves, Calendar/Gantt views) → Backlog lines.
  Breakpoint grids in My Leaves / My Expenses / Home KPIs → `minColumnWidth` (examples pin desktop; squeezed at 390).
  `HrRouterContext` (optional) lets a host route every shell navigation. Rail App Store: `useIconTooltip` (harness
  `button/icon-only-raw`). Backups: `backups/zen-ds-before-hr-templates-*`, `zen-ds-hr-templates-agent-output-*`.
- 15/16 Visually Hidden (`appLayer/content.tsx`): Starred column header has no icon (render + 2 code samples), status
  example without the "Screen readers hear" line, new "Unread counts on a phone" (BadgeCounter aria-hidden + hidden
  "N unread messages", list name carries the total), hidden-heading description explains h2 on a page vs h4 in the
  docs card. Backup `zen-ds-before-vh-review-*`.
- 13 Side Panel: examples moved to `appLayer/panels.tsx` + `panels.css` (shared HR data in `appLayer/hrDemo.tsx`); the
  4 old ones (and `.pe-panel-shell`) removed from PlatformShowcases/platform.css. Probe: submit leave (typed dates →
  3 working days, Pending row, balance 13 → 10), approve row, Reset → "Show 7 results", inspector rename + hide + close
  (aria-pressed false), notification filters + mark all read — no console errors. Toggles in panel bodies are direct
  children (the body stretches them; Toggle is 232px otherwise); the docked panel overrides `height: 100%` to stretch.
  DateField fires `onDateChange` only on a calendar pick, so the example parses `onValueChange` text → Backlog.
  Other examples: the three trigger-only Dialog examples (Unsaved changes, Success, Vertical actions) now open from a
  page editor, a site card and a members card; the rest of the sweep is listed in the Backlog.
- 17 App Shell (`appLayer/shellScreens.tsx`, entries in `shell.tsx`): HR workspace = the 7 templates behind
  `HrRouterContext` (navigates Time Off › Leave Types, Back to Home, Expenses — verified), People admin, Home on the
  rail, Time Off drawer (approve/decline updates the Sidebar counter), Billing banner, Workbench flat canvas (default
  brand slots keep the Sidebar's own collapse control; a custom `brand` drops it → Backlog), HR phone app.
  Backup `zen-ds-before-side-panel-examples-*`.
- QA fixes after the first runs: Templates index caption carries the file path (the trailing path squeezed it at
  390); HR Home quick actions "Upload Document" / "Export Expenses" (a Chip never wraps; Figma says "Upload Company
  Document" / "Export Expenses Report"); HrShell module crumbs navigate to the module; Dialog Success keeps Publish
  enabled (focus return, APG error); VH unread rows select on open; drawer starts on Approvals with a per-row decision
  Menu (two trailing buttons squeezed the caption); Workbench Overviews / Workflow / space pages; Done tasks reopen.
- Gate: `npm run qa -- --pages=side-panel,app-shell,templates,visually-hidden,dialog` → PASS (0 failing, 7 with
  warnings; report `.qa/reports/2026-09-29T23-04-15-a36170e7.md`). Sheets opened: app-shell, templates,
  visually-hidden, side-panel, dialog (390 + 1512). Remaining warnings → Backlog "Review batch 5 follow-ups".
- Sheet review: fixed-count card rows used `Grid minColumnWidth` (auto-fill → empty tracks at 1512, e.g. Submit leave
  balances) → `columns="repeat(auto-fit, minmax(min(100%, Npx), 1fr))"` in panels.tsx, shellScreens.tsx, the three
  HR template grids and the App Shell code samples. Final gate `--pages=side-panel,app-shell,templates,dialog` PASS
  (report `.qa/reports/2026-09-29T23-11-30-a36170e7.md`); sheets opened incl. description-list / action-bar / image.

## Review batch 6: use components as designed, alignment, whole-row behaviour (user feedback after batch 5)

User rules (memory `zen-example-ux-alignment-rules`): MetricCard for metrics; one leading size per group (Avatar Medium
↔ Dock Icon Medium); whole-row click; Table `onOpen` only for editable tables; Dock Icon for item icons; varied,
detailed, polished examples; no invented foundation components. Backup `backups/zen-ds-before-ux-alignment-*`.
- Table: `onRowClick` (tr tabIndex 0, click unless a CELL_ACTION owns it or text is selected, Enter/Space on the row,
  `data-clickable` → pointer, hover tint on focus, 3px Focus/Accent/Solid inset outline). Interaction test in
  `tests/interaction/data.test.tsx`; guideline api/do/dont lines; docs rebuilt.
- HR templates: Home KPIs, My Leaves balances, My Expenses totals → MetricCard (⋮ Menu / chevron as Card Sub-Action);
  Expense Overview → MetricCards + a Card with Metric + ProgressBar + DescriptionList, laid out as two pairs (no 3+1
  orphan). Row opening: My Leaves (passive chevron cell), My Expenses, Leave Types (edit form), Tasks list and Gantt
  (`onOpen` removed), Kanban cards `onClick` (their ⋮ moved out: a clickable card holds no other control).
- Side Panel / App Shell: Employee profile `onRowClick`; KindMark (emoji Dock Icon) and ThingMark (subtle Dock Icon) in
  `appLayer/hrDemo.tsx`; calendar list "You" row is the signed-in person's Avatar; Flat canvas task rows open a docked
  task panel; drawer Approvals rows open a review Side Panel (Approve · Decline); HrShell Inbox rows lead with Avatar or
  Dock Icon (Medium).
- Dock Icon sweep (grep of bare leading icons): Search results/recent, Sign-up success, Detail template activity.
- Dialog: six trigger-only examples now open from real context (members list with Pending invites, profile card,
  workspace switcher, import history, shared project, project list with row Menu + Undo).

## Batch 6b: Flag, Metric Title-Highlight, HR templates rebuilt from Figma data, component parity (tier M)

User asks (2026-09-30): Flag icons from Figma; re-audit every HR template 100% against Figma ("không bịa"), exact
alignment; mid-turn: read Figma as data (use_figma / get_metadata), no screenshots. Approved in chat: Table fixed widths;
"Sửa tất cả" component parity items, each verified in Figma data first (no invented variants).
- Flag (7063:63834): `src/components/Flag` + `scripts/build-flags.mjs` (`flags:build`/`flags:check`), Iconography ›
  Flags, guideline, harness `flag/unknown-name` + `flag/no-emoji-flag` (154 rules). Metric `variant="title-highlight"`.
- Templates: My Leaves by me (7378:38418); three agents rebuilt Home + Expense Overviews (12082:87511, 7373:43623), My
  Expenses + Leave Types + Public Holiday (7379:272568/36025/41817), All Tasks (Workbench 7394:105706…). Backups
  `backups/hr-tpl-{a,b}-*`, `zen-ds-before-table-fixed-width-*`, `…-dockicon-emoji-*`, `…-chartcard-parity-*`,
  `…-hrshell-sidebar-*`.
- Verified in Figma data and fixed: Table/Cell/Default FIXED 52 (clipsContent off) → media/actions take the slot
  height, Subtext cells spill evenly (`zen-allow-mixed-type`), px widths = header min-width, media labels nowrap;
  Dock-Icon Emoji Medium 28 / Large 36 in 48; Chart/Chart-Card main is Card Flat + Segmented FILL (instances override
  Shadow/HUG) → `theme`, `rangesFullWidth`; Stack-Bar legend centred; chart Tooltip Medium; HR sidebar child Theme=Neutral,
  Configurations chevron (`dropdown`), Space marks Accent/Purple circle + Section-Title plus.
- Own bug found by the Tasks agent: `onRowClick` fired for Menu picks (React portal bubbling) → ignore targets outside
  the row; test added (data.test 8/8); the agent's stopPropagation wrapper removed.
- Not changed (Figma has no real variant → Backlog): Metric-Trend Medium/24px (instance override on Total Expenses);
  ProgressBar Violet (Figma "Bar-Quota" is raw frames). Out of the approved list → proposal: collapsed Basic Sidebar
  panel 68 vs Figma 72 (main at 76 vs 80).
- Follow-up (user answers: Calendar/Gantt "Chờ thiết kế", Sidebar "Có"): collapsed Basic Sidebar hugs its logo (Figma
  4081:15233 panel HUG; HR rail 88/72, main at 80 — measured). Gate run 1 (19 pages): fixed Sidebar logo slot, AI Chat
  suggestion chips (min-width 0 inside `.zen-ai-block__suggestions`), My Expenses chip row wrap, Expense Overviews phone
  metric size. Gate run 2 (~50 pages incl. the earlier example pass): fixed Search results captions (readable
  hierarchy), Progress "Onboarding steps" (was a Stepper with a stale ProgressCircle snippet) → "Setup guide"
  (ProgressBar + Checkbox list), mobile playground project list Avatar → Dock Icon (folder). Research report copied to
  `docs/research/ui-patterns-and-rules-2026-09-30.md` (proposals, not implemented). Workflow review (Figma-data parity
  of 7 templates + UX review of ~48 pages, 2-lens verification) running.

## Input + Search Disabled back (session "Disable input và search từ Figma")
- User asked to bring Disabled back to inputs and Search from Figma (it was removed on 2026-09-26).
- Live Figma (use_figma, read as node data): State=Disabled exists on Input/Text-Field 421:4108, Select 421:7303,
  Date 421:8388, Number-Align-Left 421:10057, Number-Align-Center 450:7900, Text-Area 450:7027 and the primitives
  Field-Only 374:103464, Text-Area 421:9077, Input-Content 373:102481, Label 387:3651. None on Search/Default 846:37624,
  Search/Popover 1604:27401, Autocomplete 1241:5616 (View-Only), Heading 694:13062, Richtext 6385:17480.
- Field-Only Disabled vs Default: same Input/Background/Default fill, blur and Input/Shadow inner shadows; stroke
  Input/Border/Disabled; Input-Content text Content/Disabled; Leading/Trailing Active=No (label, chevron and icon
  Content/Disabled, Flag layer opacity 0.5). Label State=Disabled: all parts Content/Disabled. Help-Text unchanged.
  Search/Default = Field-Only instance + Leading-Trailing Icon=Yes, so Search Disabled is derived from it.
- Bugs found and fixed: `disabled` alone never reached FieldShell's data-state (only the native element was disabled;
  the border and label kept the Default look); FieldLabel never passed disabled to InputLabel; Leading/Trailing
  pickers and actions stayed clickable inside a disabled field (new FieldDisabledContext); plain slot icons kept
  Neutral/Light.
- Changes: Input.tsx (fieldStateFrom, FieldDisabledContext, SelectField/NumberField state), input.css (slot icon
  colour, Flag opacity, WebKit text fill), Search.tsx (`disabled` back; clear, shortcut hint and ⌘K handler off),
  harness `input/no-disabled` narrowed to AutocompleteField + RichTextField (fixtures updated), guidelines input/search,
  PlatformGuidelineVisuals caption, component-usage-rules §3, HANDOFF-details house rule, skills/zen-component-usage,
  Input + Search playground Disabled toggles. Backup: backups/zen-ds-before-input-disabled-20260930-135025.tar.gz.
- Breadcrumbs re-check (user: "update luôn breadcrumbs"): figma-kit hashes of 292:43787, 4031:20158, 4031:20161 all ✓
  against the lock; the page has no new sets; DOM measured equal to the contract (gaps 8/4/8, 20px icon and chevron,
  Body/Base/Regular, hover plate Sub −8/−4, Master −4/−8). No code change.

## Template rebuild (2026-09-30 pm → 10-01; user: "build lại hết template … chỉ dùng HR-Platform làm moodboard")

- Brief `docs/research/template-rebuild-brief-2026-09-30.md`; memory zen-templates-figma-exact rewritten (moodboard
  only). Backup `backups/zen-ds-before-template-rebuild-20260930-140224.tar.gz`.
- Workflow (foundation → build → review → verify → polish per template) hit the account session limit twice: the
  foundation (`hr/data.ts`, HrShell polish) and 4 builds finished (Detail, Expense overview, Leave types, Public
  holidays); 6 builders had rewritten their files before stopping (Admin list, Sign in, HR Home, My leaves, My
  expenses, All tasks — all type-check and pass usage-guard, reviewed on 1512/390 shots). The last 5 (Dashboard,
  Settings form, Empty & error, Mobile list, Mobile detail) went to 5 single agents.
- Fixes from gate 9: docs loose-list styling excluded from `.patpl-frame`/`.patpl-phone`; Admin list / Detail
  workspace mark moved from the 24px logo slot to `brand` (density); Family leave emoji 👪 → 🏡.
- 10-01 (cont.): all 15 templates rebuilt (Dashboard, Settings form, Mobile list/detail by single agents; Empty & error
  finished from a stopped agent, phone badges Small). New user rules applied and saved (memories
  zen-elevation-follows-sidebar, zen-widget-title-subheading): shadow cards with the default Sidebar, bordered cards on
  white (Sidebar alt/flat, new `divider` prop); AppShell sidebar z-index 21 (the half-height "divider" was its shadow
  under the sticky bar); widget titles Subheading (harness `table/title-heading-4` + `insideCard`, fixtures, selftest
  154 rules). App Shell examples/playground show four consistent combinations. Metric inline sizes top-align the icon
  (Figma 595:55188); metric rows in templates measured aligned at 1512. All Tasks phone filters → Bottom Sheets.

## Examples rebuilt from scratch (session "Disable input và search từ Figma", 2026-09-30 → 10-02)
- User asked to rebuild 100% of the examples with a brief like the templates'; approved a ~20-agent workflow, Đìzai
  Studio as the shared world, component + mobile pages first (app-layer after the template rebuild).
- Infra: `src/platform/examples/{types,registry,data}.ts`; registry globs `pages/*.tsx`; `Object.assign(examples,
  rebuiltExamples)` in PlatformShowcases; app-layer extras no longer appended to rebuilt pages; screen implies wide.
- Runs: rebuild (17 builders + 3 reviewers, several session-limit retries), polish (9 agents: reviewer fixes, spacing
  ladder, §3c, sizes, table without container, phone Top Navigation rules), final (4 component fixers + 9 final-check
  agents on the six criteria). Rules added mid-way by the user: spacing ladder, table without container, final check
  criteria; relayed from the template session: Top Navigation phone rules, Medium sizes, Chip default Medium.
- User decisions 2026-10-01: PlatformPhone `data-breakpoint="mobile"`; fix RichTextField nested form; fix approved P2
  component items and the Escape-in-modal P1; platform.css + data.ts consistency fixes.
- Gate fixes by hand: inline-message (a delayed focus move stole focus from another example's dialog; guarded),
  dialog (side-column label no longer an h3), RichTextField insert-link box is a div role=group.
- Backlog: the grouped shared-change list ("From the example polish pass + its gate") and builder findings.
