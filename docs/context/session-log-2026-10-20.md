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

## Direct paste of the page's own components (Session C) — tier S, branch `zen/feat/studio-native-local-components-20261020`
BACKLOG item the user approved 2026-10-17 (second half of "Direct paste of Studio Shapes and page-local components").
- Figma's encoding read from its own copy of a probe (lone main with TEXT + BOOL properties, a 2-variant set with a
  BOOL property, three instances): figma-native writes sets, variants, lone mains and bound layers the same way.
- A live paste gave the set and its properties right but instances with no main. Figma's own copy pasted back (its
  mains deleted) did the same: a paste never links an instance to a main pasted with it. User choice (2026-10-20):
  "Main thật + Use thành frame": a `<Use>` is a frame copy of its variant with its values and overrides, one note.
- Live paste (QA page, removed): Chip set with Label / Show icon / Size and bound layers, the Note main, three frames
  with their values. Selftest figma-native 113. Slots and swap properties stay notes.
