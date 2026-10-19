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
