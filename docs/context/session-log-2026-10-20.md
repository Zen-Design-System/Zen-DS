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
