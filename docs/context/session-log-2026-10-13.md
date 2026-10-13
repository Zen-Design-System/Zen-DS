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
