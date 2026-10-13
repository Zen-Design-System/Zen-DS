# Session log 2026-10-13

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
