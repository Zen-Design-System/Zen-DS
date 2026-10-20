# Spec card · Layer blend mode (Appearance, F5's last piece)

Session B, 2026-10-20. The user: "Giao Blend mode (Appearance) cho phiên B, rồi đo lại 14 tác vụ Figma" (confirmed in
session B). Plan `docs/research/studio-figma-design-parity-2026-10-18.md` §5 F5 lists Appearance as "opacity, radius,
independent corners, blend, visibility"; blend is the one not built. Tier M (an additive prop on Box, Stack, Grid and
Shape, the Studio's Appearance, push, pull and the Zen plugin).

## 1. What Figma does

- Every layer has a **layer blend** (`blendMode`). Figma UI3 puts it in the Appearance section's header: a ◐ button next to
  the eye opens the list; the chosen one is checked, and the button reads as on while it is not the default.
- The list, in Figma's groups: **Pass through** (frames, groups and components only; their default) · **Normal** (the
  default of every other layer) | Darken · Multiply · Plus darker · Color burn | Lighten · Screen · Plus lighter · Color
  dodge | Overlay · Soft light · Hard light | Difference · Exclusion | Hue · Saturation · Color · Luminosity.
- Pass through lets a frame's layers blend with what is under the frame; Normal on a frame keeps their blending inside it.
- Plugin API enum: PASS_THROUGH, NORMAL, DARKEN, MULTIPLY, LINEAR_BURN, COLOR_BURN, LIGHTEN, SCREEN, LINEAR_DODGE,
  COLOR_DODGE, OVERLAY, SOFT_LIGHT, HARD_LIGHT, DIFFERENCE, EXCLUSION, HUE, SATURATION, COLOR, LUMINOSITY.

## 2. Code

| Thing | Written as |
| --- | --- |
| Prop | `blendMode` on Box, Stack, Grid (`FrameAppearanceProps`) and Shape. Values: `pass-through` (frames only) · `normal` · `darken` · `multiply` · `plus-darker` · `color-burn` · `lighten` · `screen` · `plus-lighter` · `color-dodge` · `overlay` · `soft-light` · `hard-light` · `difference` · `exclusion` · `hue` · `saturation` · `color` · `luminosity`. Unset = Figma's default (pass-through for a frame, normal for a shape). Type `ZenBlendMode` in `Layout/appearance.ts` |
| CSS | `mix-blend-mode` with the same keyword (`data-blend` + `--zen-layout-blend` on frames; Shape's inline style). A frame's `normal` adds `isolation: isolate` (Figma's Normal keeps its layers' blending inside it). `plus-darker` falls back to normal where the browser has no such mode |
| Not in scope | Text and Image (no Appearance section yet), component instances, fill-level blend (a paint's blend) |

No new harness rule (the user's scope rule). Guideline: one api row for Layout, one for Shape.

## 3. Studio

- Appearance header (frames, `AppearanceSection`; shapes, `ShapeSections`): a ◐ `icon-contrast-02-line` IconButton
  before the eye, `aria-label="Blend mode"`, `aria-haspopup`, level secondary while not the default. It opens a Popover of
  PopoverItems in Figma's groups (Dividers between), the current one `selected`.
- Picking the default removes the prop; any other sets it. One change, one ⌘Z, the label "Blend mode → Multiply".
- `blendMode` joins FRAME_LOOK and `shapePropNames` (the props the Appearance owns).

## 4. Figma

- Push (`figma-push.mjs` frameLook, shapeNode): `blendMode: "MULTIPLY"` (the enum), only when not the default.
- Plugin (`studio-import.js`): every frame, component, set, group and shape takes `spec.blendMode`, else its default
  (a frame imported again with its blend removed goes back to Pass through).
- Pull (`figma-pull.mjs` reader + converter): a frame's or shape's `blendMode` (`"blendMode" in node`) when not its
  default, back to the prop.
- Native ⌘C→⌘V (`figma-native.mjs`, Session C's): the node change carries `blendMode` (asked of C).

## 5. Checks

- Layout / Shape: the prop reaches `mix-blend-mode`; frame normal isolates.
- Push selftest: frame and shape blends in the spec, defaults left out; round trip back to the same props.
- Plugin mock test: blend set, default restored.
- Live Zen file: import a frame Multiply and a shape Screen, read back, screenshot, remove.
- E2E FW-98: a frame's Appearance ◐ → Multiply writes `blendMode="multiply"` and the canvas layer computes
  `mix-blend-mode: multiply`; Pass through removes it; the panel fits.
- Gate scoped to the changed files; the figma group.
