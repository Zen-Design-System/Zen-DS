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
