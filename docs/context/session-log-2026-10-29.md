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
- Checks: protoModel selftest 48, items selftest 25 (pageCode), slots 1977, builder 76, tsc clean; E2E PT-31.
- W-14 went to session studio-wrap-floating; W-47 (Play band, #345) to the Bug session via Giám sát.
