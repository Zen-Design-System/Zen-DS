# Session log 2026-11-02

## AppShell collapse icon (session Bug, tier S)

- User: "một số example appshell bị lỗi size icon button thu gọn sidebar", then "hình như tất cả đều lỗi … có thể lỗi từ chính appshell".
- Figma (use_figma, 9nZv4uW2LT21yuHabMTCh1): every Header/AppShell variant's Collapse (16243:290464) is a Button/Icon-Flat
  Small 32 whose Leading-Icon is 20×20, bound to Element-Size/Popular/Base; the set's own Small variant has the 16px
  Button/Icon-Size/Small. Code drew `IconButton size="sm"`, so the toggle glyph was 16 in every AppShell (the Sidebar's own
  toggle, `.zen-sidebar__collapse`, was already 20).
- Fix: `app-shell.css` sets `--zen-button-icon-size: var(--zen-element-size-popular-base)` on the toggle's button (menu
  toggle too: same wrapper). Test: tests/interaction/app-shell.test.tsx checks 32×32 button, 20×20 glyph.
- The user's other ask, AppShell examples on a page of their own, went to session "Docs platform chrome → Figma B5".

## Figma widths for drops into a frame without auto layout (session Bug, tier S)

- User: "áp dụng luôn cho thả vào frame không có auto layout" (after #347: the empty canvas keeps Figma widths).
- `assets.ts` freeDropAt: a component with no width of its own (needsWidth: charts, Divider, Slider…) floats at its
  Figma width (FIGMA_WIDTHS) instead of the widget width; any other item with a Figma width is fitted after it renders
  (fitFreeDrop): if what its floating Box holds widens with the Box (boardPaste.ts fillsLayer, now exported), the Box
  takes the width in a second write squashed into the drop (one ⌘Z). Hugging items (Button, Icon button 40) keep no width.
- Click-insert from Assets (clipboard.ts floatPaste) is unchanged: it still uses the widget width for charts.
- E2E: B-61 (Line chart 297, Icon button hugs, Text field 312 + one ⌘Z); dnd campaign's free-Box place checks a written
  width is the Figma width and settles on the second write; DND-07 waits for it before ⇧A.
