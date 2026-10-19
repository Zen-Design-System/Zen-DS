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
