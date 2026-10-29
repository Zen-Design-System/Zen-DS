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

## Studio prototype walk (docs only)

- User: "plan testing lớn, tự tạo project, màn UI, tự nối prototype từng bước trên studio … rút ra khuyết điểm", then
  "test với nhiều case phức tạp và ui phức tạp hơn".
- Walked by hand in the Browser pane on a private server (:5281, worktree `studio-prototype-walk-20261029`, AuthGate
  off locally via `VITE_ZEN_LOCAL_WALK`, not committed): project "Phòng khám An Tâm", a 4-Screen phone page + Dialog,
  templates Mobile list · Orders, Mobile detail · Order, Admin list (desktop, 8 overlays).
- Report: `docs/research/studio-prototype-walk-2026-10-29.md` (+ 11 screenshots). ~50 findings; fixes in §4 wait for the
  user (BACKLOG-user-and-later). Test data lives only in that worktree's `.zen-studio/` and the pane's :5281 storage.
- Method limits: pane hidden (stale screenshots, checked by DOM/page file), clipboard-read denied (paste untested).

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

## Session "W-14" · Wrap and group layers placed freely (tier S; user approved walk §4 item 2)
- Root cause: a layer clicked in from Assets floats in its own `<Box position="absolute">`, which Layers hides. The
  parent check in `wrapCheck` compared those Boxes, so ⇧A, ⌘G and Frame selection were refused ("share one parent").
- ⇧A on free layers (`addAutoLayoutToFloating`): group them at their bounding box, then relayout that Box to a Stack
  (`addPlan`: screen order, guessed gap, each float Box unwrapped unless it sizes the field). Two writes, one undo step.
- ⌘G / Frame selection already had a floating path; the menu now offers them. A mix of free and auto layout layers
  says so in design words (`mixedPlacement`); the server's wrap of two float Boxes too (jsx-source).
- W-17, same cause: a Layers drop beside a free layer now targets its float Box, and a drop where it is does nothing.
  Inferred from code, not walked: the pane stops at Google sign-in.
- E2E FW-261 (the walk's Assets flow) and FW-262 (menu, ⌘G, ⇧A on seeded fields); selftest check for the server message.
