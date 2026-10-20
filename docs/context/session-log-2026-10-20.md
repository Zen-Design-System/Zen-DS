# Session log — 2026-10-20

## Session B · React export: instance overrides become props (user, 2026-10-20: "làm cách 3")

Branch `zen/feat/studio-export-overrides-props-20261020` (from main 002b2194, after #151/#152).

- `compile.mjs` `overrideProps`: collects every instance's overrides of the main's own layers (`mainLayerPaths`). There
  is one prop per layer and kind:
  - the words: `text`;
  - the visibility: `showText`;
  - one of its props: `textTone`;
  - a nested instance's variant or value: `chipSize`.
- Names come from `propIdentifier`, numbered on a clash with the component's own properties.
- The function takes the props as optional. The layer reads `prop ?? <the main's own value>`; in a set, each variant
  has its own fallback.
- The instance passes its values. A bound layer still takes its property's value (unchanged).
- An override below a layer the main does not list (a library component's own layer, a nested instance's) stays the
  `/* Figma overrides … */` note.
- Found on the way: `{show ?? true && (…)}` is a syntax error. The condition is now in parentheses. The compile
  selftest's "the export parses" checks used the lenient `parseSource`, which let it through; they now use Babel with
  no error recovery.
- compile selftest 76.

## Session B · Figma pull of instance overrides and slot content (user, 2026-10-20: "làm mục 1 trước")

Branch `zen/feat/studio-pull-overrides-20261020` (from main 02dd4dca, then main 7db4c184 merged in).

- Reader (`figmaReadCode` `readLocalInstance`), for an instance of the page's own main or set:
  - words, visibility and colour from `instance.overrides`, as `layerOverrides` by child indices (figma-push's format);
  - the values of a nested page-own instance that differ from its counterpart in the main;
  - slot content that differs from the main's own.
- Converter: `settleOverrides` maps the child indices to the main's drawn layer, then to the Studio's layer path
  (`instance-paths.mjs`).
  - `<Use overrides>`: `children`, `hidden`, `tone`, `variant.X`, `props.X`.
  - `useElement`: `<Use slots>` by slot name.
- Live test in the Zen file. The trimmed real importer (41 KB minified, 12 unused paths stubbed) placed a QA page on
  "Studio exports — QA" with no notes. The reader then read it back, and the QA frame was removed after. The test found
  three bugs that mocks pass:
  - Figma lists no override for a nested instance switched to another variant (`overrides` held only the root's size
    fields). The reader now compares each nested page-own instance with its counterpart in the main.
  - `parent.children.indexOf(layer)` is -1 for a layer `findAll` gave inside an instance: they are different objects.
    `indexPath` now matches by id. Before this, slot content was always reported as different from the main's.
  - `doc.mjs printPage` imported `Component`, `ComponentSet` and `Use` from `@zen-ds/react`. The dev server's dialect
    check refuses that ("Component is not a Zen component"), so any pulled page with components failed. They now
    import from the builder.
- Fixture `tools/studio/fixtures/figma-overrides.json` (the live read).
- Selftests: pull 104, doc 144, push 329; studio:selftest passes; tsc is clean.

## Copy as PNG (⇧⌘C) / SVG (Session A, worktree `../Zen-DS-f9b`, branch `zen/feat/studio-copy-as-png-20261020`)

The user (through the progress session): layerPicture is on main (#151), build ⇧⌘C now. The rest of F3 (plan §5).
- `edit/copyAs.ts`: `copyAsPng` writes a ClipboardItem whose PNG is the drawing's promise, so the write starts inside the
  key press; scale = the layer's first export setting (ExportSection `exportSettingsOf`, one read-only export added to
  B's file) else 2x, as Figma copies. `copyAsSvg`: the Export section's SVG (HTML in a foreignObject) as text. A frame
  copies its body (`findFrame`). Status: "Copied Rectangle as PNG (2x)".
- ⇧⌘C in `figmaKeys.ts` for layers and frames, before the edit-rights check (copying reads the canvas). Layer menu's Copy
  as list, the frame menu and Quick actions; ShortcutsDialog row; "Copy as PNG" out of FIGMA_NOT_YET and the E2E list.
- E2E FW-125 (⇧⌘C → PNG at 2x the layer, page unchanged), FW-126 (Copy as SVG at the layer's size; the frame menu's Copy
  as PNG at 2x the Screen's width).

## Use as mask ⌃⌘M + Box `mask` (Session A, branch `zen/feat/studio-use-as-mask-20261020`)

The last F9 item (plan decision 6). B does not build Box `mask` and agreed that A writes it in its Layout (diff sent to B
before shipping; B's conventions: JSDoc cites Figma, tokens-only CSS, a guideline row, the pull read in its own function).
- Library: `Layout/mask.tsx` `useBoxMask` reads the first layer as drawn (a Shape's drawing path, else its box with its
  computed corners; its offset, CSS rotate and scale) into an inline `<clipPath>` the Box points at
  (`clip-path: var(--zen-box-mask)`); the mask layer is `visibility: hidden` (Figma's mask draws nothing). Re-measured
  after every render and on resize. Vitest `tests/interaction/box-mask.test.tsx` (3). Shape page example (a photo in a
  star). Guideline row, API docs, AI UI catalog regenerated.
- Studio: `maskSelection` (edit/groupLayers.ts): 2+ layers → `groupSelection(…, { mask: true })` (the bottom one, first in
  the code, is the mask); a mask group or its mask → removeProp mask. ⌃⌘M (Ctrl+Alt+M elsewhere, `shell/modKey.ts`
  isMaskKey) in figmaKeys; menu Use as mask (several) / Remove mask; Quick actions; shortcuts list (also the missing
  ⌘G / ⇧H / boolean / Flatten rows). Layers: "Mask group" (unnumbered, as Figma), the mask layer with the contrast icon.
- Figma: push marks the group frame `mask` (named Mask group); plugin 3f0cf52 sets isMask on its first layer (and takes
  it off a Zen frame without mask); pull `maskOf` reads isMask, `maskProps` gives the Box `mask` when the bottom layer
  is the mask, and notes a mask higher up. Selftests push 328, pull 103, layer-meta 15. E2E FW-127.
- B's review (OK to ship after two fixes, done in 805661b2): the mask box is `position: relative` (`:where`, an absolute box
  stays absolute) and the clip adds its border (clientLeft / Top); the ResizeObserver follows a new first layer after a
  reorder; pull notes a mask in an auto layout frame. Vitest box-mask 4, pull selftest 104.
- Live Zen file (B's item 4): the real importer placed "Mask group" (GROUP, the Star isMask, the Rectangle and Ellipse
  clipped to it, screenshot checked) and the reader brought it back as `<Box group mask>` with the same layers, no notes;
  the QA frame removed. Plugin 3f0cf52 is on studio-import.
- FW-122/123 broken in B's runs (2026-10-20): B's worktree node_modules (a copy from 2026-10-15) had no `pathkit-wasm`,
  so loadPathKit rejected before any status line and ⌥⇧S / ⌘E looked dead; main was fine. Fixed at the owner (778738d0):
  Union…/Flatten/Outline stroke say "… could not load the path engine: reload the page", and `withBooleans` keeps the
  edit and fits groups without PathKit (results stay as they are).
- Gate (A's slot, 05:30, taken after 75 idle minutes without an answer from Giám sát): `qa --isolated` PASS: Studio E2E
  336/0, Vitest 72, platform audit/dark/behaviour 0 new. figma rows alone FW-122/123/125/126/127 5/0. The 390 sheet showed the trip example's dates
  wrapping ("Oct 12" / "– 16"): price and dates on their own lines; shape-only gate PASS, sheets re-checked.

## Session B · Overrides inside nested instances, push and pull (user, 2026-10-20: "tiếp tục", item 2 after "làm mục 1 trước")

Branch `zen/feat/studio-deep-overrides-20261020`, stacked on `zen/feat/studio-pull-overrides-20261020`.

- `dialect.mjs` `layerChain`: resolves a layer path through the nested instances of the page's own components
  ("Chip/Text"), one step per instance.
  - It returns `{ main, layer }` per step.
  - A nested instance resolves in the variant its own values and the outer overrides pick, as the canvas draws it.
- Push: `figma-push.mjs` builds layerOverrides from the indices to the nested instance in its main, followed by the
  indices inside its own main.
  - Overrides are ordered so a nested variant switch comes before the layers inside it.
  - A Zen component's own layer (`Badge/Dot`) is still a note: it would need NESTED_LAYERS.
- Pull: `pathAt` follows the indices into a nested page-own instance and continues in its main, in the variant the
  overrides show.
  - The reader now also compares nested instances inside nested ones (only slot content is skipped).
- Panel: `localLayerAt` resolved a layer inside a nested instance in that instance's own variant, while the canvas
  drew the variant the outer override picked. It now uses the overridden variant.
- E2E FW-97 (new): ⌘-click through the Toolbar into its Tag's text, type Deep, check `"Tag small/Text"` is written for
  this Toolbar only. The seed's Toolbar main now also holds a `<Use of="tag-small" />`.
- Live Zen file test:
  - The real importer placed the Pill / Tag / Toolbar page (Pill switched to Bold with its Text, Tag's Text and hidden
    Icon, Pill's Text in Plain), with no notes; the screenshot matched.
  - The reader read the same indices back, and the converter gave the same overrides.
  - The QA frame was removed. Fixture `tools/studio/fixtures/figma-deep-overrides.json`.
- Selftests: push 334, pull 106; studio:selftest passes; tsc is clean.

## Session B · Overrides of Zen components in a main, push and pull (user, 2026-10-20: "làm mục 1 trước", item 1 of the two left)

Branch `zen/feat/studio-library-layer-overrides-20261020` (from main fe5dc9b9). Plugin `studio-import` 1352a72.

- The item the user picked was the push of a Zen component's own layer (`Badge/Dot`). An instance's override of the
  Zen component's own props in a main (`Button: { level }`) was not pushed either: the panel writes it, and the
  push only noted it. Both are in now.
- `dialect.mjs`:
  - `layerChain` returns `inner` for a path that goes on inside a Zen component.
  - `opensInside` lets a path go inside a Zen component even when the page puts content in it (`Card/Sub-Action`).
    Before, only leaf layers could be opened.
- Push (`figma-push.mjs`): a Zen component layer in a main (byCode, not a frame or text) becomes:
  - its fields → Figma properties (`figmaProps`, only the fields given);
  - `children` → `text`;
  - an inner path → a `nested` entry (owner chain through NESTED_LAYERS, as a placed component's own overrides);
  - one override entry per layer.
  - A prop with no Figma property is noted. `hidden` inside a Zen component is noted.
- Plugin: `applyNested` is shared by a placed instance's `nested` and `applyLayerOverrides`, which now also applies
  `text` and `nested` on an INSTANCE. A mock test is added; the full `npm test` passes.
- Pull reader (`readLocalInstance`):
  - The overrides loop skips layers inside a Zen component.
  - A new pass reads each Zen component in the instance: the props this instance changed (diffed against the main's
    layer), its label, and its nested instances. A nested instance's props are diffed against the same layer in the
    main's: Pagination's Next keeps its own size and icon, and only the instance's level comes back.
- Converter: `pathAt` returns `{ path, target }`. `libraryOverride` turns the props into code props against the main
  layer's own; `nested` uses `instanceProps`. An instance that is not Zen's (an icon) keeps only `hidden`.
- Live Zen file test:
  - The real importer, with the plugin change, placed CTA (Button + Badge) and Pager (Pagination), with no notes.
  - The screenshot matched: Buy in Secondary, a red Badge, Next in Secondary.
  - The read came back as the same `<Use overrides>`.
  - The QA frame was removed. Fixture `figma-library-layers.json`.
- Found and noted (BACKLOG P3): a Card's `subAction` is not pushed or pulled.
- Selftests: push 339, pull 112, dialect 48; studio:selftest passes; tsc is clean.

## Direct paste of the page's own components (Session C) — tier S, branch `zen/feat/studio-native-local-components-20261020`
BACKLOG item the user approved 2026-10-17 (second half of "Direct paste of Studio Shapes and page-local components").
- Figma's encoding read from its own copy of a probe (lone main with TEXT + BOOL properties, a 2-variant set with a
  BOOL property, three instances): figma-native writes sets, variants, lone mains and bound layers the same way.
- A live paste gave the set and its properties right but instances with no main. Figma's own copy pasted back (its
  mains deleted) did the same: a paste never links an instance to a main pasted with it. User choice (2026-10-20):
  "Main thật + Use thành frame": a `<Use>` is a frame copy of its variant with its values and overrides, one note.
- Live paste (QA page, removed): Chip set with Label / Show icon / Size and bound layers, the Note main, three frames
  with their values. Selftest figma-native 113. Slots and swap properties stay notes.
- B-20 again (Giám sát: B's full gate 03:31–03:56, 335/1, on a tree with #149; its report is gone, only "B-20
  regressed"). Two leads read from the code: BuilderBoard.tsx drops a frame selection whenever the board's tree lacks
  the frame, and under load the pin-row edit's older text can render after the preset frame's; the row waited 6 s for
  the selection where the app waits 10 s. Fix (`zen/fix/studio-new-frame-selection-20261020`, folded in here): a frame
  the Studio just added keeps its selection a few seconds (`arrivingFor`, board/frames.ts), then the check runs again;
  B-20 waits 12 s for it. B confirmed the failing step: "Timed out waiting for the new frame selected" (the 6 s until,
  after every earlier check passed; both tries of the row; alone 8 s and the builder group 45/45 pass): the selection, as
  both leads say.
- Gate (Giám sát's slot): the first full run (13:21–14:18) passed every static step but its Studio E2E hit the gate's
  cap under machine load (load ~10, macOS replayd at ~90% CPU: "no summary · 3377s"). Report
  `.qa/reports/2026-10-20T06-21-28-ee53b0aa.md`. In the next slot, Giám sát's plan: `studio:e2e --shard=1/2` then `2/2`
  then `--rows=B-20` on c5f4f362 (main b60bedb8): 168 + 168 works, 0 broken (B-20 ✓ inside shard 1), and B-20 alone
  1 works (`.qa/studio-e2e/2026-10-20T08-52-16.md`; the runner keeps only its last report, the shard summaries are
  from their run output).

## Session "Bug" · Appearance on one row (tier S; user: "Appearance 2 ô nhập lại nằm 2 hàng khác nhau, figma đang để cùng 1 hàng" + "nếu để 2 hàng thì phải cho chiều dài bằng nhau" + "nên có icon bên trong input cho corner radius")
- B's area (appearance/), told through the supervisor; no worktree had edits there. `AppearanceFields` replaces
  `CornerRadiusField`: one InspectorFields row (Opacity · Corner radius, labels above, ⛶ Independent corners in the icon
  column), the radius a ScaleField with `icon-maximize-02-line` inside (Figma's glyph is the same four corners), the four
  corners as two InspectorFields rows of ScaleFields (fallback = the uniform radius, in the placeholder tone). Each field
  keeps `data-prop` on a wrapper (AP-01 finds `radiusBottomRight`). One field (Image: radius only) stays half width.
  ShapeSections uses the same row (radius only on rectangles). Mixed corners read "Mixed" in the field.
- Probe on a private server (5189, own Vite cache, the E2E host fixture's box): fields 128 + 128 on one row, corners
  2×2 at the same widths; figma.mjs panelFits clean closed, open and at 3XLarge.
- Popover icon tiles (user: "icon trong popover bị lệch tâm"): popover.css put every Icon-tone leading at align-self
  flex-start (first line of a label), so a leading-only item (Studio icon picker Recent/Related) drew its icon 4px from
  the top of a 36px tile. The rule now needs `:has(> .zen-popover__item-content)`, as its own comment said. Measured on
  the private server: 10 / 10 px top and bottom, 9.7 / 9.6 px sides.

## Smart guides while resizing a layer (F2's last item; worktree `festive-chebyshev-fbfcb8`, started by local_3ff40721)

Plan §5 F2 "snapping and guides while resizing": ⌥ centre and ⇧ ratio were built (F2b), snapping only for frames (C's F4).
- Model `select/resizeSnap.ts` (pure, `resizeSnap.selftest.mjs` 22 checks, in `studio:selftest`): works on the dragged
  edges' deltas, so ResizeLayer's pin / inset logic (`floatAxis`) stays as it is. Per axis the moving edges (the dragged
  one; with ⌥ or a centred constraint both, the far one mirrored) snap to the nearest line (start, centre, end) of the
  frame and its other layers within 6 screen px; ⇧ on a corner picks the closest snap on either axis and the other
  follows the ratio (the same side·delta/size coupling as `keepRatio`); a snap below the least size gives way to the
  next one, and the result is clamped there so the guides sit where the edges really are.
- `ResizeLayer.tsx`: a floating layer in a free frame (`floatAxes(...).free`) measures the frame and its siblings at the
  press; `valuesAt` snaps the deltas unless ⌘ / Ctrl is held (tracked on pointer events and Meta / Control keys, as
  Shift and Alt); the guides go through `publishDragView` (DragLayer's red `.studio-drag__guide`) and are cleared at
  the end of the drag. Still one applyEdit per drag.
- `edit/drag.ts`: the sibling measuring of a free move and of a group move is now one `freeFrameBoxes`, and `guidesOn`
  (was private, duplicated by `freeGuides`) is exported; no behaviour change.
- E2E FW-128 (e: the Rectangle's right edge 138 → 140 on the Ellipse, a red guide at it mid-drag, gone after, one ⌘Z),
  FW-129 (⌘ mid-drag: 118 exact, no guide; ⌥: X 0 / width 120; ⇧ corner: 120 × 90). FW-129 first failed in the test
  itself: after a ⌘Z the Rectangle stays selected, so the next ⌘-click deep-selects its part (no handles); each part
  now starts with nothing selected.
- Gate (slot 15:57–16:26, after AppShell): `qa --isolated` static all ✓ (style, usage, studio selftests, guidelines,
  tsc); Studio E2E 335/336, the one broken B-20 (frame presets, the load flake C fixes in #163; alone on this branch ✓).
  figma rows FW-25/27/28/128/129 5/0. usage, guidelines, mcp, ai-ui checks ✓.
- Not covered (follow-up): a component in a free frame (its floating Box wrapper) still resizes without snapping, and
  frame resizing (FrameHandles) snaps but draws no guides.

## Arrows with one head (Session C) — tier S, branch `zen/fix/studio-arrow-one-head-20261020`
BACKLOG finding (2026-10-20): a Studio arrow got a head at both ends in Figma (plugin import and direct paste).
- Figma's ⇧L arrow is a VECTOR "Arrow N", two vertices, the cap on the end vertex only (read-only look at the user's
  UI Foundations file; Figma's copy of a probe built with setVectorNetworkAsync: styles 1 NONE / 2 ARROW_LINES in
  styleOverrideTable). A LINE's strokeCap caps both ends.
- figma-native writes that VECTOR (`arrowVector`); figma-pull reads a two-vertex VECTOR capped at its end as
  `<Shape type="arrow">` (`arrowLineOf` in the reader). Live paste: one head (screenshot); the reader's detection on the
  pasted node: Arrow yes, the rest no. Importer: Session B's plugin studio-import eed5057 (a LINE spec with an endCap
  becomes that VECTOR; checked live, mock test updated). Selftests: native 114, pull 111, push 335.
- Slip, fixed: a capture's clipboard restore failed and left the user's clipboard empty (it held a 0.5 MB picture: the
  saved base64 went inline into osascript). Put back at once from the saved copy (8/8 types); the scratch capture and
  paste scripts now save and restore through files.
- Gate (Giám sát's slot after the snap session, on c7d8613a with main b2f2e019): `qa --isolated` PASS — static ✓, Studio
  E2E 336 works · 0 broken (1951 s). Report `.qa/reports/2026-10-20T13-57-08-ee53b0aa.md`.
