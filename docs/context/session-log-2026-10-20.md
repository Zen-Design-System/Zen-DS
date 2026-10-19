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
