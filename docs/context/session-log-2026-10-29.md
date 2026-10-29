# Session log 2026-10-29

## Session "Bug" · A dropped component keeps its Figma width (tier S; user: "giữ đúng chiều rộng như Figma khi thả ra canvas")

- Since #346 a component dropped on the empty canvas floats in a new frame, in a Box at X 0 Y 0 that hugs (absolute,
  shrink-to-fit): a component that fills its container in code took its content's width (Top Navigation 258, a chart
  its axis). Figma's loose instance is as wide as its variant when the variant is FIXED or FILL; a HUG one hugs.
- Data: `tools/studio/figma-widths.mjs` runs each Assets item alone through the copy for Figma (figma-push →
  figma-native: the variant its props pick), `code` prints the use_figma read of those variants (width,
  layoutSizingHorizontal; file 9nZv…, read only) → `docs/figma-contracts/component-widths.json` (95 variants), the
  build writes `src/platform/studio/edit/assets/figmaWidths.generated.ts` (74 items; `--check`). Left out: items of
  several layers, text and frames, HUG variants, Card (its variants are 105, an empty slot's width), App shell.
- Drop (builder/boardPaste.ts dropOnBoard): once rendered, the layer is tried 40px wider; when what it holds widens
  (it fills) and the item has a Figma width, the layer is tried at that width for two frames (a chart lays out again),
  then one edit sets the frame's W/H and the Box's `width` (frameEdit.ts setFrameBoxes `layerWidth`), joined with the
  add (one ⌘Z). A Button, an Avatar or an icon button keeps hugging.
- E2E B-56 now drags a Top navigation (390) and a Line chart (297) and checks the Box, the frame and the drawn width.

## Session "Bug" · Play's system bars at the device's edges (tier XS; Giám sát, walk W-47)

- In Play / Present the status bar and home indicator ride 0-high sticky `__pin`s in the app's column
  (`.studio-builder-screen__main`, since 46b3ca95; not #345, which only added isolation and the overflow min-height).
  A side without a navigation keeps the safe area as the Screen's padding (deviceBars.css `data-inset`), which sat
  outside that column: the pinned status bar stood 50px down (a blank band above "9:41"), and at the end of a long
  page the home indicator stood the safe area above the foot.
- deviceBars.css: with pinned bars the Screen drops that padding, and the content takes it next to the pinned bar
  (`__pin[data-edge="top"] + __content`, `__content:has(+ __pin[data-edge="bottom"])`). The canvas is unchanged (no pins).
- E2E PT-31 (id from Giám sát): Bottom Navigation only → status bar at the device's top, content below it; Top
  Navigation only, long List → home indicator 8px from the foot at the end, last row clear of the home area.
