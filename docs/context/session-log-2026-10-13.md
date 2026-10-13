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

## Examples' last classNames: Layout / Text props and docs frames (P5; branch zen/feat/examples-classnames, tier L)

- User: "Xử lý hết" (the 27 container-query layouts and the rest), then chose all four answers: Text wrap /
  tabularNumbers, Stack/Box scroll, Box surface="canvas", and "no more API, another way" for the rest (docs frames
  become platform components).
- Library: Grid `stackBelow` (useStackBelow measures the Grid's own width with a ResizeObserver; `data-stacked`), Stack /
  Box `scroll` (`data-scroll`, overscroll contained), Box `surface="canvas"` (zen-allow-canvas-layer), Text / Heading
  `wrap` and `tabularNumbers`, a focus ring for Text with tabIndex -1, Badge `flex-shrink: 0`. Tests:
  tests/interaction/layout-text-props.test.tsx.
- Studio ↔ Figma: Box surface ↔ Color/Background fill, scroll ↔ Overflow scrolling (+ clip), maxHeight ↔ Max height,
  wrap={false} → Auto width, tabularNumbers ← TNUM (one note on push: a plugin cannot set it), stackBelow → one column
  where the push knows the width; Box frames no longer get a md gap. Pull fixes met: a Figma grid's gap (gridColumnGap)
  read as none; a layout frame's maxWidth dropped. Plugin 6b823d2 (scroll, max height, auto width, a stale variable fill
  cleared). Live: Studio exports frame 15417:3, pushed and pulled back. Spec §8 "P5".
- Examples: 219 → 112 classes. Frames → src/platform/PlatformFrames.tsx (PreviewAppFrame, PreviewWindow, PreviewPage,
  PreviewShell / ShellMain, ShellPage, StudioLogo / StudioMark, PhoneToastHost) and ChatWindow / ChatWindowList /
  ChatWindowMain / ChatWindowSplit (PlatformChatDesktopShowcases.tsx; ThreadHeader takes a group avatar). Values in
  captions keep whole with no-break spaces instead of a nowrap span.
- Visual diff (worktree server :5195, 55 pages, 760 panels): identical except sub-pixel text shaping where NBSP replaced
  the nowrap spans (layout captions) and antialiasing noise (gone at tolerance 6). Mistakes caught by it and undone:
  `ch` widths turned into px (ch follows the typography mode: 12/14/16px), a dead `width: 112px` class whose removal
  narrowed a NumberField, a flex-basis that may shrink (date-picker) turned into minWidth. The gate's density audit
  caught `6.5rem` → 104px (2px overflow at Comfortable); min-heights on tokens that change by mode (Badge size, line
  heights, button size) went back to CSS too.
- Left (BACKLOG): page-margin and per-side padding, component internals, Skeleton / `ch` widths, media, bespoke
  responsive rules.
- Gate: `npm run qa -- --isolated --files=…`; browser tests 620 passed; studio, layout, usage, MCP selftests pass.


## Studio ↔ Figma round trip on every example (P6; branch zen/feat/figma-roundtrip, tier M)

- User: "tiếp vụ test và improve export import". Snapshot of 353 example frames → push → pull (matched by push key) to
  find losses, then real placements in the Zen file (stashed importer and reader on QA holder 15342:11) read back.
  Only real reads count; the harness only points.
- Fixed (push / pull / reader / plugin):
  - Checkbox / Toggle / Radio label and caption go through the nested Content (Figma dropped Checkbox's Caption
    property; map skips it, variantSets regenerated).
  - Emoji Dock-Icon text.
  - Field label / value / help read.
  - ListItem title / caption / leading / trailing read; ListBox header / footer slots; a column of ListItems → List.
  - Text tone from its Content variable; `Heading N` layer names ↔ Heading level.
  - Type=Main → PageHeader; DashboardHeader search placeholder; a `texts.find` crash.
  - Sidebar `logo` → Header-Content (Figma's sample LOGO and Collapse dropped both ways, noted on pull).
  - Breadcrumbs `master` / `emphasis` from the crumbs' Item.
  - DescriptionList term / description / emphasis.
  - Reader: swapped nested icons/avatars told from the owner's main component (Figma lists no override for a swap
    inside slot content).
- Figma limit, checked live: a nested instance's size cannot be overridden ("cannot be overridden in an instance:
  size") → a ListItem's FileIcon xl shows at 20; push notes it, the plugin's nested-size code went.
- Contract drift: 14 sets differ from component-properties.json (2026-10-05); list sent to the session editing
  figma-props.map (they map List-Box Theme, ProgressBar Layout, SidePanel). Not changed here.
- Fixtures: figma-parts.json (+ swapped FileIcon row), figma-shell.json (breadcrumbs page, frame 15448:3). Push
  selftest 187, pull 52, studio:selftest all pass. Spec §8 "P6". P6b (key-based round trip) proposed; BACKLOG.
## ListItem value variant (session 9e5675b4, tier S)

- User asked for a second stacked-list variant like a banking "Transactions" list: an amount + its other currency on the
  right of each row. Chose (AskUserQuestion): props on ListItem, code only for now (Figma → BACKLOG P3), money in in
  Content/Positive/Light (first Accent, changed by the user mid-task).
- `ListItem.tsx`: `value` · `valueCaption` · `valueTone` (ContentTone, default strongest). Rendered inside the row body
  (`.zen-list-item__value`), so a clickable row's button/link reads the amount; `trailing` follows it.
- `list-item.css`: right-aligned column, Spacing/Gap/3XSmall, nowrap + `flex: 0 0 auto` (the title truncates first),
  tabular figures; value colour through `--zen-list-item-value-color` (set inline only for a non-default tone).
- Story `Value`; example "Transactions on a phone" (list-item page: Studio VND account, See all / Show fewer, + / −
  signs in the text, Hanoi Book Fair = INV-2026-0138 paid Sep 10 at 26,350 VND/USD).
- Guideline: api row "Value" + one Do line; guidelines:build / check pass. CHANGELOG 0.4.0 Added.

## Phone preview bezel smeared by a bar's blur (session c30087ec, tier S)
- User: the example preview blurs the mockup's edge (screenshot: Bottom Navigation › Floating, bottom-left corner).
- Cause: the bezel was the screen's own box-shadow, so the black sat in the rect corners outside the 55px curve, inside
  the progressive blur's backdrop; the blur pulled it into the corner (also in headless Chromium).
- Fix (`PlatformPhone.tsx`, `platform.css` › PlatformPhone): the bezel is its own `.platform-phone-fit__bezel` layer
  (same size and scale, under the screen); the screen rounds with `clip-path: inset(0 round …)`, which makes it the
  backdrop root (square background in the corners). `--platform-phone-radius` now comes from `platformDevices` on the
  fit wrapper (the per-device CSS values went). The bars' rounded blur layers stay.
- Checked at 2×/3×: Floating and Floating-Glass corners clean, no seam at the curve, top corners and layout unchanged.
- Contact sheet review: inside a ListBox in a padded Box the phone rows cut the payee after ~10 characters and wrapped
  "Received · Today"; the example became a full-bleed list (Box paddingX lg, as the reference) and the title the payee
  alone (arrow, caption and sign give the direction). Gate (`--isolated`): PASS; list-item re-run 0 warnings. The first
  run's templates [rhythm] and chat "Audio call" dead-click warnings are pre-existing and already in BACKLOG.
- User rule: section-head See all / Show all = underlined text ("text sẽ tiết kiệm được space hơn"), not a Main
  tertiary button. Transactions example and DashboardTemplate "Recent activity" → `<Text as="span"
  textStyle="Body/Base/Medium"><Link as="button" tone="inherit" aria-expanded>`; Link `use` + List Item do/don't lines.
  A `<button>` written in a `//` comment tripped interaction/action-without-handler (the scanner reads it as JSX):
  reworded. Gate PASS (only the BACKLOG'd templates [rhythm]); Playwright on :5173: Show all expands 7 → 10 rows.
  Left as they are: footer "Show all N files" (not a section head), Metric "Show all metrics" (restores hidden
  tiles: a command), Studio Assets "See all" (Flat Primary xs, allowed by the user's first message).

## Chart/Sector tokens equal in every Component Theme mode (tier XS)

- User: Chart Sector tokens in Component Theme the same in every mode, as Brand - S1; update Figma too.
- Repo: `component-theme.json` Primary → {Color/Background/Support/Brand/Solid}, Secondary → {…/Support/Neutral/Deep}
  in the 7 Neutral modes (14 values; Brand - S2 already matched); `tokens:build` changed only those lines (tokens.css, catalog, native).
- Figma `9nZv4uW2LT21yuHabMTCh1`: the same 14 values via `setValueForMode` (VariableID:9024:24167 / 24168); the "Color
  Chart Sector/Primary · Secondary" styles still bind them and now resolve pink / #121212 in Neutral - S1; Donut set
  screenshot checked. `figma-styles.full.json` resolved colours and Chart.tsx palette fallbacks swapped to match.

## Color Chart Sector/Septenary reference (session fa12e55e, tier XS)

- User: update the Septenary style's reference. Live Figma (`getLocalPaintStylesAsync`, read-only): Septenary binds
  Color/Background/Support/Green/Soft (VariableID:5196:29030, #ACDAAE); the repo still had Red/Soft.
- `figma-styles.full.json`: Septenary binding + colour, and the stale resolved colours of Tertiary (Cyan #12A2CE) and
  Senary (Orange #E37A02) from the same read; `build-style-manifest.mjs` changed only those 3 CSS lines + manifest.
- User approved aligning `chartPalette` (Chart.tsx) to the seven styles: 6th Orange/Solid (#E37A02), 7th Green/Soft
  (#ACDAAE); was Green/Solid, Orange/Solid. Only series 6–7 without their own `color` change.
- QA: the first full-scope run (41 pages, other sessions' token edits) failed only on pagination@390 local .webp
  ERR_CONNECTION_REFUSED (shared server restart); `--isolated` pagination + chart passed.

## Chat reply components built back into Figma (tier S)

- User: "Bổ sung ngược lại các component reply bubble chat vào lại Figma" — ChatReply had no Figma set.
- Measured the code first (Playwright on `?page=chat`, "Reply to a message"): caption Caption/Regular 16 high, inset 12;
  quote padding 8/12/20, radius 16, Neutral/Pale; bubble tucks 12 over it; composer bar 8/14/4/16, 47 high.
- Figma `9nZv4uW2LT21yuHabMTCh1`, page ❖ Chat, new frame "Chat Reply" (15465:1541, section widened to 14296):
  - `Chat/Reply/Quote` 15467:1661 — Side Others|You × Kind Text|Photo|File|Call|Voice|Deleted (6×2 grid). Preview
    Body/Small/Regular Neutral/Base, hugs up to 220 − padding − leading, 2 lines then ellipsis; glyphs 16 Neutral/Light;
    File = Dock-Icon XSmall Neutral Subtle (exposed); Photo = 40px Subtle-Disabled placeholder (the file's photo look).
  - `Chat/Conversation/Reply` 15468:1658 — Side; Avatar, Sent, Bubble-Others/You-Content (same preferred values as
    Chat/Conversation/Bubble); Quote and Bubble exposed. Quote → bubble spacing −12 is the one raw value (code constant
    `--zen-chat-reply-tuck`).
  - `Chat/Composer-Reply` 15469:1669 — Kind Text|Photo|File|Call|Voice, 390 wide, top hairline Border/Neutral/Pale;
    ✕ = Button/Icon-Flat Small Primary in a Navigation-Action-wide slot, so its centre is 30 from the edge (Chat-Control's last action).
- Checks: sizes match the code (File quote 184×52, Call 144 wide, bar 47); a temporary thread (Reply Others Kind=Photo,
  You Kind=Deleted + Sent, bar Kind=File over Chat-Control Mobile) screenshotted and removed; binding audit of 135 layers:
  only the −12. Descriptions from `tools/figma-docs` (3 entries + EXTRA in build.mjs). JSDoc/CSS cite the nodes.
- Not done: no text properties (shared TEXT props force one text on all variants, so texts are edited directly, as in
  Text-You/Others); Deleted stays Body/Small/Regular (no italic style in the file; code renders italic); no hover state
  for the quote; Studio push/pull and figma-contract suites don't know the new sets.

## Voice motion and usability review (tier S)

- User: "Improve animation của các Voice component cho giống với thực tế hơn", then "đánh giá luôn lại usability và tính
  thực tế … dựa trên các hành vi và component pattern tương tự". Review: `docs/research/voice-usability-review-2026-10-13.md`
  (Voice Memos, Google Recorder, WhatsApp/Telegram, ChatGPT Voice, Gemini Live, Meet/Zoom mute).
- Before: no Voice motion at all (static Figma bars); the examples' clock counted 0.1 s ticks.
- `Voice.tsx`: `useMotionAllowed` (useSyncExternalStore on prefers-reduced-motion); `Waveform` memoised, `loop` draws
  `SAMPLE_LOOP` (Figma's 56 + 104 seeded speech bars, ends quiet) twice on `.zen-voice-wave__track`; `data-fresh` when the
  take started from Ready in this mount. AI signal: `data-live="listening|responding"` without `levels` and not muted;
  bar height now `--zen-ai-voice-level` (same px). Muted + listening: bars 4px, `voiceMutedGuidance`; note
  `voiceMutedNote` whenever muted; Mute IconButton `state="pressed"` while on (it had no visible on state).
- `voice.css` (all motion in `prefers-reduced-motion: no-preference`): scroll `frames ÷ 7` s per copy; reveal mask
  `--zen-voice-reveal` at the same speed (initial 9999px, so a stopped animation shows the take); badge dot blink 1.6 s;
  AI `--zen-voice-energy` (circle) × `--zen-voice-band` (bar) × Figma height via `clip-path: inset(… round)` on a 72px
  box; halo `0 0 0` ring × `--zen-voice-moving` (1 only in keyframes) × Motion/Movement.
- `chat.css`: ChatVoice bar opacity transition (Duration/Base, linear). Examples: real-clock timer (47 ms), the
  conversation streams the answer and hands the turn back; muted stops the transcript. Playground: same clock.
- Checked with Playwright (`?page=voice`): track 35 px/s (= 7 × 5 px), reveal = scroll offset, Paused holds the offset,
  energy/clip/halo animate, muted rests + copy + Pressed; reduced motion = 56 bars, no clip, no halo; with
  `animation: none` (Studio HTML export) the take shows and the halo is 0.
- Open (BACKLOG P2 + QUESTIONS Voice): Thinking state, Discard confirm/Undo, `useVoiceLevels`, ChatVoice seek, copy of
  the Responding heading, Mute-on treatment, Social voice length.

## Chat reply synced back from Figma (tier S)

- User: "Update lại các component reply Chat từ Figma lên" after editing the sets built earlier today.
- Diff of the live sets against the build: Chat/Reply/Quote — every Kind except Text now has padding-left
  Spacing/Padding/XSmall 8 (Text keeps 12); Chat/Composer-Reply › File — Dock-Icon swapped XSmall → Small, still at 2/3
  (21.33px, bar 52.3 high). Nothing else changed (tokens, text styles, alignments, Conversation/Reply).
- Code: `chat-reply.css` `.zen-chat-reply__quote:not([data-kind="text"])` padding-inline-start XSmall; composer dock
  `scale(2/3)` with margin `--zen-dock-icon-size / -6`; `ChatReplyBody` `dock` size (xsmall quote, small composer).
- Measured (Playwright, ?page=chat): quotes File 180×52, Call 140, Photo 100 (Figma 101: text width), composer File bar
  52, dock 21.3 — as Figma. Guideline Reply row updated; `guidelines:build` also refreshed voice/provider docs that were stale.

## ◆ Performance template page in Figma (tier S, Figma only)

- User: analyse a "Team performance" dashboard screenshot (UI, UX, features) and rebuild it with Zen in Figma as a new
  page under TEMPLATES — "không copy, mà là refactor".
- Figma `9nZv4uW2LT21yuHabMTCh1`, new page "◆ Performance" (15478:20137, after ◆ Ecommerce), section Canvas-Default:
  - "Team performance" 15478:20139 — Patterns/Pages/Density-Medium (Floating-Actions off). Sidebar: Overview ·
    Performance (Select=Yes) · Tasks, footer Settings · Feedback. Header/Dashboard: breadcrumbs Workspace › Performance;
    Main row Heading + Subheading, Export (Tertiary) + Add member (the one Primary); Control-Bar row: period and team
    Chip/Advanced (Search and Actions off). Content: 4 Metric-Cards (Title-Highlight XLarge, Solid Dock-Icon, trend vs
    last week); Chart-Card › Multi-Line-Chart (7 weeks, this team vs company average) beside Chart/Bar-Chart Vertical
    (8 reps, real values: Column paddingTop + Bar Fill, highest first); Members table on the canvas (Avatar-Cell with
    email as subtext, Role, Team badges, Progress-Cell, Last active, Actions-Cell) + Pagination Inline.
  - "Team performance · Member actions open" 15481:87373 — first row Hover, ⋯ Pressed, Popover/Default menu.
- Refactor decisions: one period/team scope in the Control-Bar instead of per-card pickers; KPIs above charts; the
  hero time chart became a KPI + a trend with a legend; name and e-mail merged; one Primary (the source had two and an
  off-topic "Add new shipment"); invalid "7:34:67" → 7h 34m; mixed decimal marks unified.
- Audit (`skills/zen-figma-design/harness`): 0 errors, 2 warnings (the sidebar workspace chevron is Neutral/Light in
  the library's default slot content). Screenshots reviewed after each section.
- Library findings for the designer → BACKLOG (Control-Bar row without side padding, 7-sector Trend Y labels out of
  order, Bar-Chart's own surface, sidebar Collapse overflow, page pattern taller than 982).
- Follow-up (user answers): Control-Bar's 0 side padding is deliberate (each page pads it for what it holds); Bar-Chart
  standing alone is OK; search stays above the table; no AI button on this page. Library fixes the user asked for:
  `.Chart/Line-Chart/Trend` 6/7-Sectors Y-label layers reordered top → bottom (4395:7803, 4415:8966; switching 4 → 6/7/12
  on Line-Chart and Multi-Line-Chart now keeps $25K … $0); `Patterns/Pages/Density-Medium` Sidebar Fill height
  (6040:67698), checked on all 24 instances. The Collapse "overflow" is Zen's bleed (Button Small 32 in a 20px
  Element-Size/Popular/Base Wrapper, −6 each side, sidebar.css): my Hug change was reverted, and the audit harness now
  skips a centred instance spilling evenly from a non-clipping single-child wrapper (`isBleed`; audit-rules.md updated;
  ai-kit:check ✓). Audit 0 errors; a full clipping scan (inside instances too) found nothing cut.
- Shadow clipping (user: "vẫn đang bị cắt shadow card. Nên ghi vào skill để luôn kiểm tra cái này"): my `KPIs` and
  `Members` frames (createAutoLayout → Clip content on) cut the Metric-Cards' shadows (top 2, side 4, bottom 8) and the
  Search / page-size shadows; Clip content off on every frame I made, in both frames. My earlier "nothing clipped" scan
  was wrong: `absoluteRenderBounds` is already clipped. Harness: `checkShadowClips` measures each drop shadow from its
  effects against every clipping frame above it (inside instances too); `bounds/shadow-clipped` is now an error (screen
  frame), `bounds/shadow-clipped-in-component` a warning. Negative test (KPIs clip on) → 4 errors; restored → 0.
  SKILL.md hard rule, screen-rules §4/§5, figma-gotchas "Clipping", audit-rules rows; ai-kit:check 92 ✓.
- Theme pairing review (user: rules for harness + skill on Canvas → Surface pairing and one elevation per screen; "demo
  vài case … dark và light … để duyệt và chốt rule", on the Performance page, with mobile top/bottom navigation). Section
  "Theme pairing — review" (15513:10239): desktop A–H (A/B Canvas/Default shadow vs flat ✓, C mixed elevation ✗, D
  Surface/Alt boxes on Canvas/Default ✗, E Canvas/Flat + Surface/Flat Sidebar ✓, F Surface/Default Sidebar on Flat ✗, G
  Canvas/Alt with Surface/Alt + Pale-bordered boxes ✓, H borderless boxes + lone shadow ✗) and mobile MA–ME, each light and
  dark. Resolved colours: Canvas Default #f7f7f7/#121212, Alt #fff/#1c1c1c, Flat #fff/#121212; Surface Default
  #fff/#1c1c1c, Alt #f7f7f7/#121212, Flat #fff/#121212. Library gaps (demo overrides): Side-Bar/Master/Basic has no
  background variant (code Sidebar has default/alt/flat + divider), Top-Navigation/Mobile no Flat type, Bottom-Navigation
  no surface choice, Card/List-Box no Surface/Alt theme. Real screens: the standalone Bar-Chart now takes
  Shadow/Bottom/Level-1 like the Shadow cards. Bound paints on instances must copy the existing paint before
  setBoundVariableForPaint (a bare {0,0,0} paint rendered black / was dropped). Rules await the user's approval.
- Theme rules rebuilt from the user's sections Theme-01 … 08 on ◆ Performance (read from node paints, not screenshots):
  Canvas/Default → Flat/Shadow boxes, Sidebar on the canvas or a Surface/Default panel (shadow only all together);
  Canvas/Alt → Pale / Semi-Pale (hues) / Border on Surface/Default; Canvas/Flat → Pale / Semi-Pale / Border on
  Surface/Flat; headers and bars match the canvas (Default↔Surface/Alt, Alt↔Surface/Default, Flat↔Surface/Flat); no
  shadow on Alt/Flat. Mobile adaptation (light + dark) added to every Theme section (20 frames; top bar = header, bottom
  bar = Sidebar); Theme-02…05 mobiles sit under the desktop frames (sections no longer overlap). Audit 0/0.
- Library (user-approved: Surface property, expose nested Card, Blue + Purple, Figma first): Card +Surface
  Default|Alt|Flat (Flat/Alt, Border/Alt, Border/Flat) and Pale/Semi-Pale Blue + Purple (styles
  Gradients/Card/Semi-Pale/Blue|Purple) → 92 variants; List-Box +Color, +Surface, +Semi-Pale → 100 variants (3 slots
  restored per clone, List-Item content checked on all); Metric-Card (7 types) and Chart-Card expose their Card;
  descriptions rewritten. Theme frames switched to Color=Blue…/Surface=Flat/Theme=Semi-Pale instead of overrides.
- Harness: theme/box-on-canvas, theme/navigation-surface, theme/mixed-elevation (errors), theme/mixed-boxes (warning);
  screen-rules §1 table, SKILL.md hard rule, audit-rules rows; ai-kit:check 100 ✓. Live: 36/36 user theme frames clean,
  the old review board flags as expected; it caught the Team performance chart card left Flat beside Shadow cards
  (fixed). Old review section renamed "superseded".
- Widget recolour (2026-10-14, user: "Ngoại trừ 3 card widget này. Các widget còn lại nên học cách phối màu lại"): the
  Hero cards' recipe on every other coloured widget — marks in one neutral ramp, solid / 48% / 20%, never brand pink on a
  hue. Chart › Widget themes: Combo (Pale Brand) bars 48% + line solid; Bar-List solid; Gauge value solid, track 20%,
  target 48%; Funnel stages 48%, Signed (the headline) solid; Stacked area solid / 48% / 20%; Quarter goals (dark card)
  actual white, target white 48%, track white 10% — its target was #121212 on #1c1c1c (Chart/Sector/* have no dark
  value). Metric Widget: KPI/Sparkline/Spark-Bars badges On-Color Solid, Spark-Bars bars 48% + active solid.
  Root cause found: a bound colour's paint opacity always follows the variable's alpha, so the styles Color Chart
  Sector/On-Color/Secondary (48%) and /Tertiary (20%), bound to Content/Neutral/Strongest (alpha 1), draw at 100% on
  every node (also the Bullet-Chart main's Track). Widgets therefore use Chart Sector/Secondary (or On-Color/Primary on
  the dark card) + layer opacity; rebinding the two styles to alpha variables was refused by the permission check →
  BACKLOG. Shadow cuts fixed: Widget themes Grid and five Hero Metric-Body frames (button shadow, 2px) no longer clip.
- Correction (user, 2026-10-14: "Các card màu Neutral tối phải dùng solid neutral … không đổi sang dark mode. Không dùng
  nhiều mode khác nhau trong 1 component"): the user deleted the Chart page's widget board. Card Solid variants (10) and
  Metric-Card Hero's Card no longer set a colour mode; Solid/Neutral fills Background/Neutral/Solid/Default and its
  header icon takes Content/Inverse/Light (the Hero Neutral "⋮" was black 49% on #121212). Card description and the
  Metric board caption rewritten; skill: SKILL.md hard rule "One colour mode per screen" + screen-rules §1 bullet.
- Follow-up (user, 2026-10-14: "1. thử 2. OK 3. Thử rồi duyệt sau", then "bỏ hết gradient chỉ dùng màu pale … hoặc subtle
  nếu muốn nhấn mạnh"): styles On-Color/Secondary → Content/Neutral/Light, /Tertiary → Border/Neutral/Subtle/Pressed
  (they now draw 49% / 18%; awaiting review, BACKLOG). Chart page board "Widget themes" (15559:2870) rebuilt on
  Canvas/Alt: Border, Flat/Alt, Pale Brand, Subtle Cyan (Pale + Support/Cyan/Subtle fill), Pale Violet, Pale Orange,
  Solid Neutral (Inverse text, icon and marks: Background/Inverse/Solid, Content/Inverse/Light, Inverse/Subtle track),
  Pale Green; the Metric board's Gradient/Semi-Pale cards → Pale; both captions rewritten. Dark check (a temporary
  Dark frame, removed): Solid Neutral turns light with dark content, the Pale marks flip too. Harness: new
  `theme/mode-override` (error; a probe frame with a Dark child was caught), `theme/box-on-canvas` now flags Semi-Pale,
  Gradient and Solid colour boxes, Subtle and Solid Neutral are the highlights; audit-rules, screen-rules §1, Card
  description. ai-kit:check 104 ✓; the chart board audits clean (one mixed-boxes warning: a showcase).

## Widget themes phase 1: metric + chart widgets on neutral, colour and gradient surfaces (Figma, tier L)

- User: research metric and chart card widgets on neutral, coloured and gradient backgrounds (gradient styles from
  tokens), add chart types; Figma first, then code + Studio. Picked (AskUserQuestion): 8 charts, 6 metric types,
  Card Theme + Color, phase 1 Figma → review → phase 2 code + Studio.
- Research: Figma had Line, Multi-Line, Stack-Bar, Bar V/H, Donut, Radial, Heatmap; code only LineChart/StackBarChart/
  ChartCard; Studio pushes Line/Stack-Bar as sample pictures, pulls no chart, no chart/metric contract suite.
- Contrast (catalog, Light): white on Support Solid fails (2.5–3.5) except Violet 4.96; Light-mode content on Solid —
  Strongest ≥ 5.4 and Base ≥ 4.59 on Brand/Cyan/Yellow/Orange, Base 4.12 on Green, 3.21 on Violet. So Solid =
  Brand, Cyan, Yellow, Orange with the card in Light mode, Neutral = a dark card (Surface/Default in Dark mode).
- Styles (paint, token-bound): Gradients/Card/Semi-Pale/<6 hues> (Pale→Subtle), Gradients/Card/Gradient/<7 hues>
  (Pale→Soft, Semi-Pale's angle), Gradients/Chart/Area/Primary·Secondary·Tertiary·Quaternary·On-Color (series Solid →
  matching Pale; bound stops ignore stop alpha), Color Chart Sector/On-Color/Primary·Secondary 48%·Tertiary 20%
  (Content/Neutral/Strongest; opacity re-set after binding, which drops it).
- Card (6643:51021): `Color` variant prop (existing 24 → Color=Neutral), +48 variants (Pale/Semi-Pale × 6 hues, Gradient
  × 7, Solid × 5, Medium/Small, Active=No), grid 7 colour columns × 13 rows at the old 1448px width; description updated.
- Metric-Card (6643:64008): Level=Master → Type=KPI; +Sparkline, Spark-Bars, Goal-Progress, Comparison (560 wide),
  Category-Bar, Hero (Card Solid/Brand, On-Color sparkline, Badge Theme=On-Color, Button Primary); wrap layout.
- Charts (Chart page, y 6300–6900): Chart/Area-Chart set (Area, Stacked) and components Grouped-Bar-Chart, Combo-Chart,
  Gauge-Chart, Funnel-Chart, Bar-List, Bullet-Chart — card-less content (header cloned from Bar-Chart with Show Icon,
  Icon, Title, Description, Value, Show Ranges, Show Open, Show Legend props) because props cannot reach a nested
  Card's slot content. Descriptions written.
- Boards "Widget themes" on the Chart page (8 charts in Card themes) and the Metric Widget page (10 Metric-Cards).
  Audit (own layers + slot content): every fill/stroke/text/gap/padding/radius on a token or style; one stray default
  vector stroke (Hero area) removed. Scratch board deleted. Repo unchanged in this phase (BACKLOG P1 = phase 2).

## Shared-checkout gathering: LineChart compare colour, BottomNavigation test (session "Giám sát", tier S)

- PR #42 (the shared checkout's later work) made Chart/Sector/Primary brand pink, so LineChart's `compare` (sector-primary)
  read the same colour as its Accent line: legend and tooltip dots matched. Fix taken verbatim from the "Performance"
  session's branch zen/feat/chart-grid-lanes so both merge cleanly: compare is Border/Neutral/Solid at 40% (Figma
  Multi-Line Compare), COMPARE_COLOUR Background/Neutral/Solid; JSDoc, chart guideline note and CHANGELOG follow. The
  chart example's caption still says Chart/Sector/Primary; that branch rewrites it with the lane work.
- Gate flake (2 of 3 runs on this branch): "BottomNavigation idle labels" compared an idle item's colour with its label's,
  but the pointer can rest on that item from an earlier test, and a hovered idle item on the Default bar takes the
  label's colour. The test now unhovers the bar and measures an idle item the pointer is not on (a forced hover
  reproduces the old failure). Gate PASS (chart, bottom-navigation; full Vitest 57/57).
