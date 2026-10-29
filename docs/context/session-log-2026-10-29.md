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

## Prototype: buttons inside a component (walk W-35/36/41, tier M; user approved §4 items 1–3)

- W-35: `inspector/propGroups.ts` topLeading gets `pageCode` (`onClick: proto.back()`); `DataSlot.newItem` and
  `InsertItemOp` carry it, `tools/studio/items.mjs` writes it on a builder page instead of the toast code.
- W-36/W-41: an action object (`{ label, onClick }`: Dialog/ModalForm/BottomSheet primary/secondary, TopNavigation
  leading) is a trigger of its layer, `"<prop>.onClick"` (`protoModel.ts` actionTriggersOf, triggerValue,
  actionTriggerLabel "Primary button · Confirm"; `protoTriggers.ts` protoSubject). `protoEdit.ts` writes it with op
  setField; `linksIn` names the arrow by it (own, so its end drags); ⊕ on a layer without onClick takes its first button.
- Checks: protoModel selftest 48, items selftest 25 (pageCode), slots 1977, builder 76, tsc clean; E2E PT-32.
- W-14 went to session studio-wrap-floating; W-47 (Play band, #345) to the Bug session via Giám sát.

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

## Session "W-12/28/18" · Inserts land where they should in a Screen without auto layout (tier S; walk §4 item 4: W-12, W-28, W-18)
- W-12: `freeDropAt` (edit/assets) took only a Box, so a drop on an Empty page's Screen went into its flow (X 0 Y 50).
  It now takes any frame `freeBlock` says has no auto layout: the layer floats at the pointer, smart guides as before;
  a drop on a floating layer goes beside it in the frame (never into the Box that floats it); a chart gets the widget
  width, as a click gives it.
- W-28: `freeInsertAt` takes `top` (`topClearIn`: the bottom of the status bar, Top Navigation or "Add Top Navigation"
  in the block's px); the first layer of an empty phone Screen lands 20 below it. An empty frame's containing block is
  the Screen, not its static content box. Desktop stays at 24, 24.
- W-18: no Screen prop. With click, drop and paste all floating in a Screen without a layout root, no insert makes a
  page flow at its edge; old pages that already hold one keep it.
- E2E FW-263 (drop at the pointer, a second drop beside), FW-264 (bars end + 20, no flow); B-55/B-56 still work.

## Set as start + frame order (walk W-32/W-33, tier S; user approved §4 item 5)

- `builder/frameEdit.ts` orderFrame (moveTo on the Board, unplaced frames pinned first and squashed into one undo step
  via joinPin) and setStartScreen (before the first frame). Flow row flag `Set <title> as start`
  (`PrototypePanel.tsx`, `.studio-prototype__start` shown on hover like ▷), frame menu "Set as start" (`CanvasMenu.tsx`).
- `edit/layersFrameDrag.ts` (new): a frame row's drag in Layers → orderFrame; the list is front-most first
  (`data-order="front"`), so the Board's order is the list upside down. Layer rows keep `layersDrag.ts`.
- Checks: builder selftest 79 (moveTo of a Screen on the Board keeps every x), tsc, style:check; E2E PT-33, PT-34.
- §4 item 4 (W-12/W-28/W-18) went to session studio-wrap-floating.

## Session "W-44/45" · Play's toasts in the device; overlays keep its safe areas (tier S; walk §4 item 7)
- W-45: Play's ToastProvider stack portalled into the portal layer beside the device, `position: fixed` → the window's
  foot, outside the frame. Player now nests portals: the toasts get `.studio-device-toasts` inside the device (absolute,
  the page margin + `--zen-safe-area-bottom` from its foot, in the device's breakpoint so a phone keeps 20), everything
  else keeps the portal layer. In Present an example's toasts come from its card's own queue (ExampleCard's ZenProvider is
  a root one) into Present's portal root: on a simulated device that layer moves into a host beside the scrolling
  viewport, at its size (PT-40 found the first try, a ToastProvider of Present's, unused). No library CSS changed.
- W-44: Dialog / Bottom Sheet already pad by `--zen-safe-area-*`, but render in the device (its overlay root), beside the
  Screen that sets them: 0 there. The device (and Present's viewport for a builder Screen) now sets the bars' room.
- E2E PT-38 (toast in the device, 20 from its sides, over the home area), PT-39 (the Dialog panel and a sheet's last row
  above the home area); both fail on main's Player.tsx. PT-28, PT-30/31 still work. Present: PT-40 (follow-up PR).
