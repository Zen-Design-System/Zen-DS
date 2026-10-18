# Session log 2026-10-19

## Session B · Studio parity F5a: one Figma frame is one element, the right panel in Figma's order

Plan `docs/research/studio-figma-design-parity-2026-10-18.md` F5 (decisions 1–2, approved 2026-10-18); spec card
`docs/research/studio-f5-right-panel-spec-2026-10-19.md` (F5 split in three PRs: F5a API + panel order, F5b typed values
and variable pills, F5c typography, multi-selection, nothing selected, Export, Layout guide). Branch
`zen/feat/studio-f5-right-panel-20261019`. Tier L.

- **Library (Layout):** `appearance.ts` (new): `FrameAppearanceProps` (surface, border, borderWeight, borderSides,
  borderStyle, radius + corners, opacity) and `FrameTransformProps` (rotation, flip) on Box, Stack and Grid;
  `FrameEffectProps` (effectStyle) split from `BoxEffectProps` so Stack / Grid's props docs list it. CSS: one rule set for
  the three frames (layout.css, effects.css); Stack / Grid corners through `data-corners` + `--zen-layout-radius`
  (`data-radius` is the radius *mode* attribute in tokens.css — not reusable); rotation / flip as CSS individual
  transforms (`rotate`, `scale`) so they compose with position.css and leave the layout box alone; dashed only on
  Subtle. Unset props render nothing (existing pages' DOM unchanged).
- **Harness:** box/border-matches-action, effect-needs-surface, blur-needs-tint, shadow-no-border, radius/redundant-corners,
  radius/full-mixed cover Stack and Grid; new `layout/opacity-percent` (error: 0 < opacity < 1) and `box/dashed-is-subtle`;
  a dashed frame skips border-matches-action. Fixtures bad/good; selftest 215 rules.
- **Docs:** guidelines source (layout: api rows, use, do), regenerated; story `FrameAppearance`; Layout page's "Layers
  over photos" sheet is one Stack with surface, corners and shadow.
- **Figma:** push `frameLook` (fill on every frame, stroke Border/Neutral/*, weight, one side, dash 2/2 = the Input's,
  radius or per-corner radii + vars, effect style, opacity, rotation, flip); pull reads them in figmaReadCode (per-side
  weights, corners + bound vars, `effectStyleId` → name, opacity, mirror from `relativeTransform`) and `frameLookProps`
  writes them on the Stack / Grid itself (a painted frame that lays nothing out stays a Box; a scrolling Grid keeps a
  Box). Selftests: push 297 (round trip of every look), pull 81 (read format, notes for values without a token).
  `library-keys` packages now carry effect and paint style keys. Zen plugin (`~/Documents/zen-ds-figma-plugin-main`,
  commit f6969ca, dist rebuilt, backup in backups/): `applyFrameLook` + `turnAboutCentre`; test on the mock.
- **Studio:** DesignPanel in Figma UI3's order (instance properties under the header; Position → Layout → Appearance →
  Typography → Fill → Stroke → Effects; a frame's code-only properties and layers at the end). AppearanceSection: opacity
  + corners + the header eye (Show / Hide ⇧⌘H); FillSection, StrokeSection (weight, Sides, Dash) for Box / Stack / Grid;
  palettes `surfacePalette` / `borderPalette`; Position: Rotate 90° right, Flip horizontal / vertical (positionModel
  `flipTurn` / `turnOps`, for A's ⇧H / ⇧V). ⇧A on a filled Box → one Stack keeping the paint (autoLayoutPlan; matrix
  12,569 cases, 0 findings). E2E Figma walk FW-50…56.
- Left: BACKLOG P2 — figma-native.mjs / native-pack (⌘C → ⌘V) do not map a frame's look (no owner session).

## Session B · Studio parity F5b: typed values and variables (decision 1)

Branch `zen/feat/studio-f5b-typed-values-20261019` (worktree `../Zen-DS-f5b`, stacked on F5a). Spec card §1 of
`docs/research/studio-f5-right-panel-spec-2026-10-19.md`.

- **Token fields** (ScaleField: gap, padding, radius, corners): a digit or operator starts typing; Enter evaluates
  (controls/numberMath) on the shown value and snaps to the nearest step (`scale.ts nearestStep`, a tie the smaller);
  the status names the snap. A written step reads as Figma's variable pill (`data-variable`, pale capsule) with the
  variable's path as its tooltip.
- **W / H**: `parseSizingInput(text, axis, evaluate)` takes Figma's arithmetic; Constrain proportions (session state per
  layer, Figma keeps it in the file) writes the other axis at the shown ratio in the same change (`sizingModel withRatio`).
- **Offsets in a free frame** (Box without auto layout, where Zen takes px): Detach variable → the step's px, Apply
  variable → the nearest step.
- **Colours**: a hex typed into a colour list's search lists the three nearest variables (`controls/colorMatch.ts`,
  rendered colours read through a 1-px canvas) and Create variable… (opens Local variables).
- Selftests: sizingModel 105, scale 18, colorMatch 8 (new, in studio:selftest). E2E FW-57…59, FW-90 (F5 also takes
  FW-90…99, told A and C).
