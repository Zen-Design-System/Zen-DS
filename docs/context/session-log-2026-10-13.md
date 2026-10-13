# Session log 2026-10-13

## Progress re-read from the official Figma file (tier S, user: "Update lại Progress từ Figma")

- Read-only use_figma on `9nZv4uW2LT21yuHabMTCh1`: Progress-Bar 1536:260 (30 variants), Progress-Circle/Icon 6915:62964
  (14), Progress-Circle 1531:13954 (1), Table Progress-Cell 4081:19727 (nests Bar Neutral/Done/Inline). Properties
  unchanged since the 2026-10-12 capture (Text, Label, Theme, Progress, Layout).
- One change: Layout=Stacked Label is now **Body/Base/Bold** (Value stays Body/Base/Regular; Inline label Regular).
  `ProgressBar` picks the style by layout; JSDoc and CSS comment cite it; guidelines/props rebuilt.
- Re-checked and equal to code: track Neutral/Subtle 8px Rounded; fills Active/Neutral|Accent/Solid, Status
  Low 20% Negative · Medium 40% Warning · Good 80% / Done Positive, None hides the fill; Stacked V gap XSmall, Header
  baseline gap XSmall (Label FILL, Value HUG); Circle ring 2px Support/*/Subtle on Neutral/Subtle, 12px pie, Done 20px
  disc + 12px check On-Colors (Neutral: Support/Neutral/Deep + Inverse/Strongest).

## AI kit for Figma (tier S, user: "Thêm một chỗ tải bộ skill, harness, markdown… để Claude hoặc ChatGPT làm việc với file Zen trên Figma")

- New skill `skills/zen-figma-design` (SKILL.md, references screen-rules / figma-gotchas / audit-rules, agents/openai.yaml):
  the Figma-side rules from the usage rules §1–16 and the 2026-10-12 Pokeslide lessons (sidebar selection, control bar,
  tables, Solid avatars/dock icons, Side-Panel content, instance-swap colour loss, clone/slot gotchas, use_figma limits).
- Harness `skills/zen-figma-design/harness/zen-figma-audit.js` (read-only, run via use_figma). Calibrated on the live file:
  HR template page 7378:38418 → 0 errors after making it slot-aware (SLOT children are authored), measuring text by its
  ink (3px tolerance) and comparing an instance's re-bound colour with the main component's (skipping icon-swap slots);
  1 real warning left (Chip/Advanced chevron Neutral/Light vs Strongest). Studio export "Dashboard" 15279:3 → real
  findings: raw #ffffff root fill, unbound paddings, Button/Icon-Main icons bound to Neutral/Strongest instead of
  Button-Tertiary/Content/Default (the 2026-10-12 colour-loss bug). Wrapped-line count now uses the ink height (a fixed
  32×35 "$25K" label was a false crushed-text error).
- Kit builder `tools/ai-kit/kit.mjs` (isomorphic) + `build.mjs` (`npm run ai-kit:build` / `ai-kit:check`, 90 checks);
  generates figma-components.md (contract) and figma-tokens.md (variables resolved to px, repo-only Studio modes left
  out). Platform: `src/platform/PlatformAiKit.tsx` on Installation (lazy `aiKit.ts`). Browser zip == CLI zip (78 files).
- QA: `npm run qa -- --pages=installation --files=… --isolated` PASS (the page has no example cards, so no contact
  sheet: section shot at 1512/390 with Playwright and reviewed).

## Typography letter-spacing re-sync (tier XS, user: "Update tokens này vào platform và studio")

- `Typography Configuration.json` (mode Dashboard only, 78 tokens, no names added/removed): nine Letter-Spacing values
  tighter — Display-1 -1.52 → -1.58, Display-2 -1.21 → -1.2, Display-3 -0.98 → -1.08, Display-4 -0.76 → -0.96,
  Heading-1 -0.56 → -0.84, Heading-2 -0.5 → -0.75, Heading-3 -0.44 → -0.66, Heading-4 -0.4 → -0.6, Body-Small 0 → -0.12.
  Popular / Mobile unchanged; the repo-only Studio mode re-derived (Dashboard ratio × Studio size, 2 dp, as 2026-10-09).
- Text-style snapshots re-derived (`text-styles.json`, `styles.json`, `figma-styles.full.json`: 11 styles) and the
  Heading/1 · Heading/3 text nodes of the `dashboard-header` / `input-search` contracts. `platform.css`'s Zen-Platform
  block is a different Figma mode (not in this export): untouched. Consumers all read the `--zen-typography-letter-spacing-*`
  variables (Sidebar, Rating, Input rich text, Dialog, platform, Studio inspector/board): nothing hard-coded.
- `tokens:build` / `tokens:check` (2201/2201), `styles:build` / `styles:check` (36/36), `tokens:native:check` PASS.

## Figma descriptions + Content-Hierarchy (tier M, user: "vào Figma để viết description cho các component, variables và style… Bổ sung thêm nội dung của Content typography outline cho trang typography")

- User choices (AskUserQuestion): rewrite from the repo rules (keep specific ones), English, a new section.
- `tools/figma-docs/`: `component-descriptions.mjs` (hand-written per set from guidelines + usage rules),
  `variable-descriptions.mjs` / `style-descriptions.mjs` (rule functions sent as source), `build.mjs` (prints the
  use_figma code: `pages`, `batch <n>`, `sets "<a;b>"`, `variables`, `styles`, `preview`). Sets whose old text is
  specific (> 150 chars, not the generated "**Overview:** … Original Notes" set) are kept: the 2026-10-12 Chart sets.
- Written to `9nZv4uW2LT21yuHabMTCh1`: 168/168 public sets (descriptionMarkdown), 592 variables (Mode Colors 426,
  Spacing 22, Corner Radius 25, Breakpoint 11, Emphasis 6, Global Dimensions 33; entity fixes / fills elsewhere),
  36 text + 18 effect + 35 paint styles. `figma.saveVersionHistoryAsync` is not supported in use_figma, so each call
  first copied the replaced text as JSON into frame "Description backup 2026-10-13" on 🔒 ARCHIVED (15372:3796):
  delete it once reviewed. Read-back: 168 public sets, 0 empty, 0 generic.
- 🔤 Typography: section Content-Hierarchy (15381:943, frame 15381:592) cloned from Type-Configuration's look
  (.Ops header + table header), four tables (desktop, phone, every screen, overlays) and 10 outline rules, cells on
  Zen text styles and variables. Zen audit: 6 findings, all from the doc template; header radii bound to
  Corner-Radius/Base, the 56px frame corner and the BT Solisiert title kept like the page's other doc frames.
- The library still needs a Publish in Figma (the user's step) before consuming files see the descriptions.

## Table rows fixed at the token (tier S, user: "table row hiện tại fixed height theo tokens")

- Figma (read-only use_figma): Table/Cell/Default 1603:23604 FIXED height bound to `Table/Cell/Size`, Table/Cell/Header
  1604:12968 bound to `Table/Header/Size`; Text-Cell label one text node; Badge-Cell / Tag-Cell `Items` NO_WRAP.
- Measured before (Playwright, the platform's sign-in gate opens only for webdriver): every body row 53px (Compact) /
  57px (Comfortable) — the 1px bottom border sat inside the `<td>` box (12 + 28 + 12 + 1); long text wrapped (73px at
  390, a test row 117px). A `<td>` height is only a minimum.
- Fix: each body cell holds a `.zen-table__content` slot (Figma Content: flex, centred, height Table/Cell/Size − 2 ×
  Padding/Small, nowrap); the divider is an inset 1px hairline (`--zen-table-divider`, Figma stroke inside) on th and
  td; Text-Cell is an inline-grid `minmax(0, max-content)` track so a narrow column ends it in an ellipsis
  (right-aligned values stay whole); Items no longer wrap; the Subtext margin hack and slot heights on media/actions
  went (the slot centres overflow). A surface's last row clears `--zen-table-divider`.
- After: 0 rows off the token on table, templates, app-shell, chip, slider, dashboard-header (1512 and 390), 0 content
  outside its cell. Examples whose FIXED column was too narrow for its text now that it no longer grows: timesheet
  Person 150 → 176px, chip Project 220 → 240px.
- Docs reference tables (Props, API, Keyboard) keep growing rows through a `.platform-ref` override in platform.css
  (user chose the temporary docs exception; BACKLOG P3 until the sheet component exists).
- Guideline (Rows, Columns, avoid, don't) says rows are one line at the token; test `tests/interaction/table-row-height`
  (Compact + Comfortable + ellipsis) fails on the old code ([117, 53]) and passes now.

## Studio → Figma coverage P3: the Figma components the push drew as frames (session "Studio export", branch zen/feat/figma-map-p3, tier M)

- User: "làm luôn" (P3, then P4). Worktree `Zen-CodeBase/Zen-DS-p3` from main 6083159; plugin commits in
  `~/Documents/zen-ds-figma-plugin-main` (5121b91, 1247c22, 41483ca, b7a328d). Each item: push, pull, selftest
  (`figma-push.selftest.mjs` §15–25) and an import with the real importer in the Zen file (page "Studio exports").
- **Mapped:** TopNavigation ↔ Top-Navigation/Mobile (`tools/studio/figma-top-nav.mjs`), ColorSelector ↔ Color-Selector,
  Tabs with TabItem children, InputConditions ↔ Input-Conditions, UploaderFileItem ↔ File-Item, DatePickerSheet ↔
  Date-Picker/Mobile, ChatThread / ChatMessage ↔ Chat/Section/Conversation, Reaction, Read-List, FileIcon ↔
  icon-media-file, Flag ↔ Flag, Icon sizes (Element-Size/Popular), Metric / MetricCard pull. Table and screenshots
  per item: `docs/research/studio-figma-push-spec-2026-10-12.md` §8 "P3".
- **Plugin:** slot `within` (Top-Navigation's two Trailing-Slots), `nested.name` and finding renamed layers again by
  their component (a fix found live: the second renamed avatar fell short of its index), `fill` on an instance.
- **Bugs met and fixed:** Segmented selected item (value / first) and fullWidth on pull; a Tab-Item's Label variant
  read as its label ("True"); InputConditionItem's label never pushed; the pull reader's `firstText` read text inside
  hidden layers and a chat message's avatar initials as its text; Metric's label, value and trend lost on pull (and a
  MetricCard read as a Card around it); Metric's default icon hidden in Figma; every Icon pushed at 20px.
- **User (mid-turn): "các ava nhỏ chỉ nên dùng viết tắt 1 chữ".** XSmall / 2XSmall avatars show one letter: ChatMessage
  no longer bypasses Avatar's rule (the 2026-10-02 two-letter test now expects one), and the push writes small
  avatars' initials the same way (Avatar elements, table avatar cells, chat).
- Gate: `npm run qa -- --isolated --files=…` (Chat.tsx, the chat test, push / pull).

## Studio → Figma coverage P4: examples' classNames (same session and branch, tier M)

- Measured the 350 classNames in the examples by what their CSS does: ~110 sized a Card or ListBox (fill, a readable
  max width, centred), which had no sizing props. User chose to add them: Card and ListBox take width / minWidth /
  maxWidth / alignSelf (LayoutWidthProps, the Layout sizing rules extended to .zen-card and .zen-list-box); push writes
  the instance's min / max width, pull reads them; browser tests in layout-sizing.test.tsx.
- Converted by script (dry run, then write) and by hand: 90 classNames became props, their CSS went (file headers kept).
  40 example roots centred at a readable width now sit in a `<Stack>` (the docs stage is no Stack, so alignSelf alone
  did not centre them). Two `flex: 1` classes in wrapping rows stayed (fill shares the row instead of wrapping).
- Visual diff (tools/platform-audit/visual-diff.mjs on a worktree server, :5192): 31 pages, 430 panels; every panel
  identical except one whose lazy image had not loaded in the before capture.
- Left (BACKLOG, the user's call): 27 container-query layouts (a Grid API), docs-only details and mixed colour /
  display rules, which stay platform CSS. classNames now 260.


## Segmented check, Focus Positive/Negative tokens, Button / Input / Top Navigation focus sync (tier M)

- Segmented vs live Figma (1238:892, 1204:11690; LZ capture + runtime measure on :5173): geometry, padding, gap, radius,
  text styles, icon sizes, badge wrapper and every state colour match. Only drift found was global: Base Colors
  On-Brand-Default (Light/Dark) and Light/On-Brand-Hover are #000000DB in Figma (repo #FFFFFF) → synced; Brand-S1
  Primary selected text was white on #FF6BD5 (2.5:1). Segmented contract in segmented-toggle-badge-avatarstack.json
  left at its September capture (no suite reads it; BACKLOG P2).
- Tokens: Color/Focus/Positive|Negative/Solid|Subtle added to mode-colors-semantic.json (431 variables), note in
  figma.collections.json; tokens:build, tokens:check 0 failures. Platform token pages (catalog) and Studio
  (documentTokens reads tokens.css) pick them up with no code change.
- Figma scan of focus rings (Button, Input, Checkbox, Radio, Uploader, Toggle, Date Picker, Chip, Search, Slider, Table,
  Rating, Color Selector, Popover, AI-Chat, Voice, Stepper, Top-Navigations): Button Focused variants re-bound (129:
  Accent/Subtle → Accent/Solid; Danger → Negative/Solid; Positive → Positive/Solid; Overlay unchanged); Input Field-Only
  Inputted-Error/Blank-Error stroke → Focus/Negative/Solid; Nav-Action rings Accent/Solid (Danger/Positive on Main and
  Icon-Main, levels code does not expose); Stepper Error Focus-Ring still Border/Negative/Subtle in Figma (left as is).
- Code: button.css ring per level, input.css error border, top-navigation.css outline-offset 3px (Figma ring 3px clear).
  button-text.json / button-icon.json Focused variants patched (129); all six Button suites pass in 3 modes.
  studio binding-diff vs HEAD shows those 129 changes with 0 proposals until committed (told the Giám sát session).
- input-heading suite: its placeholder exception carried the old Heading letter-spacing (another session's 2026-10-13
  typography sync) → updated to -0.84/-0.75/-0.66px; 432/432.
- Harness: focus/visible-ring summary names Color/Focus/* (Negative/Positive on danger/positive actions); Button a11y
  guideline sentence updated; usage/style/MCP/AI-kit selftests and guidelines:check pass. No new rule: other rings
  (Input, AI-Chat, Stepper) bind Border/* in Figma, so a "rings use Color/Focus/*" rule would contradict Figma.
- Follow-up (user: "tôi đã update Input và Stepper"): Figma Field-Only Focused/Typing ring → 3px Focus/Neutral/Subtle
  (Text-Area 2px), Stepper Focused → Focus/Neutral/Subtle, Error → Focus/Negative/Subtle; AI/Chat-Field has no ring in
  Figma. Code: input.css (3 rings), ai-chat.css and the Chat composer (they take the Input ring), stepper.css. Text-Area
  error border still Border/Negative/Solid/Default in Figma (BACKLOG designer line updated; code keeps Focus/Negative).
- Harness: new rule focus/ring-token (outline or a ≥2px box-shadow ring on a focus state reads --zen-color-focus-*;
  1px rings are borders, :not(:focus…) is no focus state). bad.css 2 expects, good.css switched to Focus tokens plus
  two clean cases; usage:check 0 hits in 444 files; guidelines rebuilt (180 rules).
