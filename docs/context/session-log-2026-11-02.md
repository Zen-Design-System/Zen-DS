# Session log 2026-11-02

## Figma widths for drops into a frame without auto layout (session Bug, tier S)

- User: "áp dụng luôn cho thả vào frame không có auto layout" (after #347: the empty canvas keeps Figma widths).
- `assets.ts` freeDropAt: a component with no width of its own (needsWidth: charts, Divider, Slider…) floats at its
  Figma width (FIGMA_WIDTHS) instead of the widget width; any other item with a Figma width is fitted after it renders
  (fitFreeDrop): if what its floating Box holds widens with the Box (boardPaste.ts fillsLayer, now exported), the Box
  takes the width in a second write squashed into the drop (one ⌘Z). Hugging items (Button, Icon button 40) keep no width.
- Click-insert from Assets (clipboard.ts floatPaste) is unchanged: it still uses the widget width for charts.
- E2E: B-61 (Line chart 297, Icon button hugs, Text field 312 + one ⌘Z); dnd campaign's free-Box place checks a written
  width is the Figma width and settles on the second write; DND-07 waits for it before ⇧A.
