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
