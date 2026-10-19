# Studio F5 · Right panel parity — spec card (Session B, 2026-10-19)

Plan: `studio-figma-design-parity-2026-10-18.md` §5 F5, decisions 1 and 2 (§4, approved by the user 2026-10-18). Tier L
(a Layout API addition + the Studio's right panel). Shipped in three PRs so the API lands early for the other sessions
(A's F2b rotation handle and flip keys, C's F8 image fills):

| PR | Scope |
| --- | --- |
| **F5a** | Decision 2: Stack and Grid take Box's appearance; Box, Stack and Grid take opacity, rotation, flip, stroke sides, dash and weight. Figma push / pull (+ the Zen plugin's importer). Inspector in Figma's order with Appearance · Fill · Stroke · Effects on every frame; Rotate 90° / Flip buttons in Position; ⇧A keeps one element. |
| **F5b** | Decision 1: typed values snap to tokens, the variable pill with Apply / Detach variable; W / H arithmetic ("120+24") and the ratio lock (taken over from F2, agreed with Session A). |
| **F5c** | Typography details (style picker + read-only style details, Paragraph, Case, Decoration), text colour in Fill, multi-selection common props + Selection colors, nothing selected (page background, Local variables, Local styles, Export), per-layer Export, Layout guide. |

## 1. Source

Figma's own frame (no library node): a FRAME's fills, strokes (weight, align, per-side weights, dash), corner radius
(+ independent corners), effects (applied effect style), opacity, rotation and flip (relativeTransform), as UI3's right
panel shows them. Zen's tokens are the only difference allowed: fills are the Background layers Box already takes,
strokes the Border/Neutral Pale | Subtle variables, corners Corner-Radius, effects the effect styles of `effects.ts`.

## 2. Anatomy (F5a, Box · Stack · Grid alike)

| Prop | Figma | Token / value | Renders |
| --- | --- | --- | --- |
| `surface` | Fill (one solid paint bound to a variable) | none · surface (Background/Surface/Default) · surface-alt · subtle (Neutral/Subtle) · pale (Neutral/Pale) · canvas | `data-surface` (layout.css, one rule for the three) |
| `border` | Stroke colour | none · pale (Border/Neutral/Pale/Default, static) · subtle (…/Subtle/Default, actionable) | `data-border`: 1px solid |
| `borderWeight` | Stroke weight | px, default 1 (decision 1: weight may be px) | `--zen-layout-border-weight` |
| `borderSides` | Stroke › sides | all (default) · top · bottom · left · right | `data-border-sides` |
| `borderStyle` | Stroke › Dash | solid (default) · dashed — dashed only on subtle (rule: dashed borders are Subtle) | `data-border-style` |
| `radius`, `radiusTopLeft…BottomLeft` | Corner radius, Independent corners | Corner-Radius steps | Box `--zen-box-radius`; Stack / Grid `data-radius` + `--zen-layout-radius` |
| `effectStyle` | Effects (an applied effect style) | `boxEffectStyles`: shadows only on surface, the blur only on subtle / pale | effects.css, generalised |
| `opacity` | Appearance › layer opacity | 0 … 100 % (Shape's unit), default 100 | `data-opacity` + `--zen-layout-opacity` |
| `rotation` | Position › Rotation | degrees, counter-clockwise positive (Shape's) | CSS `rotate` (individual transform: composes with any `transform`) |
| `flip` | Flip horizontal ⇧H / vertical ⇧V | horizontal · vertical · both | CSS `scale` (−1 on the axis); with rotation = Figma's relativeTransform R(θ)·S |

Rotation and flip are visual only: the layer's box in the layout stays (CSS individual transforms). Only set props
render attributes; unset props change nothing (the DOM of existing pages stays the same).

States: n.a. for a frame (no interaction). Modes: tokens follow light / dark, density and the radius modes. Keyboard /
APG: n.a. (library); Studio controls reuse PropField / ScrubNumberField / Menu (APG menu button).

## 3. Harness, docs, examples (definition of done §B for the Layout components)

- JSDoc on every new prop (citing Figma's property). `scripts/build-api.mjs` → props docs; guidelines source: the
  layout entry's api rows say (Box, Stack, Grid), new rows Opacity · Rotation / flip · Stroke sides / dash / weight;
  Do: "an auto layout frame with a fill is one Stack, not a Box around a Stack".
- Rules extended from Box to Stack and Grid (each with a bad / good fixture): `box/border-matches-action`,
  `box/effect-needs-surface`, `box/blur-needs-tint`, `box/shadow-no-border`, `radius/redundant-corners`,
  `radius/full-mixed`. New for the new props: `layout/opacity-percent` (0 < opacity < 1 is CSS's unit: Zen's is %)
  and `box/dashed-is-subtle` (borderStyle="dashed" draws only with border="subtle").
- Stories: Layout "Frame with fill" (Stack surface + border + radius + effect, rotation, flip). Platform: Layout page
  example "Auto layout frame with a fill".

## 4. Figma push / pull

- Push (`figma-push.mjs`): Box, Stack and Grid frames write `fill` (BOX_SURFACE), `stroke` (+ `strokeWeight`,
  `strokeAlign: INSIDE`, `strokeSides`, `dash`), `radius` / `radiusVar` or `radii` / `radiiVars` per corner,
  `effectStyle`, `opacity` (0–1), `rotation`, `flip`.
- Zen plugin importer (`~/Documents/zen-ds-figma-plugin-main/src/plugin/studio-import.js`, local git): applies them
  on a FRAME (strokeWith, per-side stroke weights, dashPattern, per-corner radius variables, effect style by name or
  library key, opacity, rotation and flip about the centre). Its `npm test` before any build.
- Pull (`figma-pull.mjs`): figmaReadCode reads a frame's stroke variable and weights, dash, corners and their
  variables, effect style name, opacity, rotation, mirror; `frameElement` writes them on the Stack / Grid itself (one
  element; a Box only for a scrolling Grid, which Grid cannot do). Round trip in `figma-push.selftest.mjs`.
- Not mine: `figma-native.mjs` / `native-pack.mjs` (Figma's clipboard): its owner is told the new frame fields.

## 5. Inspector (F5a)

Figma UI3 order for every selection kind: header (name, kind, Reset all changes, Swap, Detach, Delete) → component
(main / instance, Go to main) → Properties (instance properties, nested instances, slots) → Position (+ Rotate 90°,
Flip horizontal, Flip vertical) → Layout (auto layout, sizing, clip) → Appearance (opacity, corner radius,
independent corners) → Typography → Fill → Stroke → Effects → Content → Code properties.

- Fill: one fill row (swatch + variable name, "+" adds Surface as Figma adds its first fill, "−" removes), the list
  of the fills a frame takes with their variable names.
- Stroke: one stroke row ("+" adds Pale, or Subtle on an actionable frame; "−" removes), weight (px), sides menu
  (All · Top · Bottom · Left · Right), dash toggle, position Inside (read-only: a Zen border is inside).
- Effects: the existing effect-style row, for Stack and Grid too.
- ⇧A on a frame with a fill: one Stack carrying the fill (no Box > Stack); ⌥⇧A gives a Box with the same paints.
- Words: Figma's (§3a); no prop names on the Design tab.

## 6. Checks

Selftests (`studio:selftest`, `usage:selftest`, figma-push / pull selftests, effects / layout selftests), Figma walk
rows FW-50…59, the full Studio E2E, then `npm run qa -- --isolated --files=…` (+ CI's quick steps: usage:check,
guidelines:check, ai-ui:check, mcp:selftest, npm test, build).
