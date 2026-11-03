# Session log 2026-11-04

## Assets click-insert keeps the Figma width (session Bug, tier S)

User: "áp dụng luôn cho bấm chèn từ Assets" (after #378, which did it for drops into a frame without auto layout).

- `edit/freeFit.ts` (new): `fillsLayer` (moved from builder/boardPaste.ts) and `fitFreeBox` (was assets.ts
  `fitFreeDrop` + `renderedAfter`), shared by the empty-canvas drop, the free-frame drop and the click, so clipboard.ts
  needs no import of boardPaste.ts or assets.ts (both import clipboard.ts). `fitFreeBox` returns the text after the width.
- `edit/clipboard.ts`: `insertCode(…, figmaWidth)` → `pasteAt` → `floatPaste`. A component with no width of its own
  (a chart) floats at its Figma width, else the widget width as before (ChartCard has none: B-51 stays 477); one that
  fills its Box gets `fit`, the Figma width estimate also decides beside-or-new-row (`freeInsertAt`). After the insert,
  `fitFreeBox` writes the Box's width and squashes it into the insert (one ⌘Z); `rememberInsert` is called again with
  the fitted text so the undo still selects what was selected before (`follow` now returns its selection).
- `edit/assets/assets.ts`: `insertItem` passes `item.figmaWidth`; `dropAsset` calls `fitFreeBox`.
- E2E B-62 (id from Giám sát): Empty page, click Line chart (297), Icon button (hugs, 40), Text field (312), each
  beside the last with the gap 16 from the margin 24; one ⌘Z takes the Text field and its width; Icon button selected.
- Met while checking drops: `npm run studio:dnd` crashed in `autolayout-matrix.mjs` at its seed since #369 (W-58's
  required-field Form reads `vars`, and `dnd-engine.mjs` items dropped the palette item's `vars`). Fixed at the owner:
  `items` carry `vars`, `grow(…, nth, vars)` declares them with the insert (op insertChild `vars`, as the Studio does).
  Now: dnd-matrix 25055 cases · 0 findings; autolayout-matrix 12654 cases · 0 findings.
- Opt-in drag-drop campaign (`--only=dnd`): DND-01…03 700 drops, DND-04, 06, 07 (260), 08 work; DND-05 fails on main too
  (since W-12, a drop on an empty Screen floats; the story expects the page flow): question in BACKLOG-user-and-later.md.
- QA: E2E B-62, B-61, B-50, B-51, B-52, B-58, FW-261, FW-262, FW-264 work; a probe showed FW-264's phone Text field
  also gets width 312 and still undoes in one ⌘Z. `npm run studio:selftest` ✓.
