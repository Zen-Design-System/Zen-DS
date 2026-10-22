# Spec card · Fill gradient, corner smoothing, Pick color (I)

Session B, 2026-10-22. These are the three ❌ items of the parity score in B's area (Appearance and Fill). The user
asked through "Kiểm tra tiến độ" for scope nobody holds yet ("điều phối cho session nhận scope chưa ai nhận đi").

- E2E: FW-180…189.
- One PR per item (or per group), each with its own gate turn.
- Decisions (user, 2026-10-22, asked in session B):
  - gradient stops from the whole paint palette, on frames too;
  - Diamond drawn as four linear quadrants;
  - smoothing with CSS `corner-shape`;
  - Pick color takes the layer's own token, else the pixel (EyeDropper API) snapped to the nearest variable.
- Order: smoothing, gradient, Pick color (one PR each).

## Today (read 2026-10-22)

**Frames (Box / Stack / Grid)**
- The fill is the five-value `surface` enum (`Layout/appearance.ts:17`), drawn through `[data-surface]` in `layout.css`.
- There is no free colour fill.

**Shape**
- `fill` takes about 150 paint slugs (`Shape/paint.ts`). Each slug maps to a `Color/…` variable and is drawn as `var(--zen-…)`.

**Studio UI**
- The panel holds one fill (FillSection or the Shape's Fill row) and an optional image fill.
- `SwatchControl` shows the nearest three variables for a typed hex (redmean distance, `controls/colorMatch.ts`).

**Figma round trip**
- The push writes variable names only. The pull reads the first paint's bound colour.
- A gradient from Figma is dropped with no note today, on frames and on Shapes.
- Native paste and the plugin write one SOLID bound paint.

**Radius**
- `radius` plus four corners, as token steps (`_shared/corners.ts`).
- There is no `cornerSmoothing` anywhere.
- The 2026-10-03 radius spec left smoothing out: there is no token, and `corner-shape` is Chromium-only.

**I**
- I is listed in `FIGMA_NOT_YET` as "Pick color".
- On a builder page, I is still the Interact tool.
- The canvas maps a point to its layer through `elementsFromPoint` + `annotatedAt`.
- `partInfo.coloursOf(element)` gives an element's own colour tokens under its mode.

## 1. Fill gradient

Like Figma: linear, radial, angular and diamond, with stops that are colour variables only (Zen's rule).

**Code**
- A `gradient` prop on Box, Stack, Grid and Shape: `{ type, angle?, stops: [{ color, at }] }`.
  - `color` is a paint slug.
  - `at` is 0–100.
- It is one paint over the fill colour, and an image paints over it, as Figma stacks them. Built (2026-10-22): a
  Shape's colour becomes the gradient (Figma's paint type), a frame keeps its surface under it (Zen's shadow needs it).
- CSS:
  - linear-gradient for linear;
  - radial-gradient for radial;
  - conic-gradient for angular;
  - **Q diamond**, because CSS has none.
- No per-stop opacity: Figma ignores alpha on a bound stop. Transparency comes from variables that carry alpha.

**Studio**
- Figma's Fill row type picker (Solid · Linear · Radial · Angular · Diamond).
- A stop bar: add a stop, move it, pick its variable (SwatchControl), and the angle. Built as Figma's gradient editor:
  the bar with a handle per stop, then the selected stop's place and colour (one stop row per stop did not fit the
  panel grid: long variable names were cut).

**Figma**
- Push: `GRADIENT_*` paints with `gradientStops` bound to variables, and a `gradientTransform` from the angle.
- Pull: the reverse.
- Native paste and plugin write the same paint.

**Q**
- Which colours may a frame's gradient use: the whole paint palette (as a Shape's fill) or Background roles only?
- How is diamond drawn in code?

## 2. Corner smoothing

**Code**
- `cornerSmoothing` (0–100 %) on Box, Stack, Grid and rectangle Shapes. iOS is 60 %, as Figma's preset.

**Studio**
- A Corner smoothing slider under Radius, shown while a radius is set.

**Figma**
- `cornerSmoothing` 0–1 in push, pull, native paste and the plugin.

**Q: how code draws it**
- **(a)** CSS `corner-shape: superellipse(k)`. Chromium draws it; other browsers keep plain round corners.
- **(b)** clip-path with an SVG path. Exact everywhere, but it clips borders and shadows.
- **(c)** Store it and round-trip it only; the canvas stays round.

## 3. Pick color (I)

**Flow**
- On a page you made, I starts the picker, as in Figma.
- A click picks a colour for the selected layers' fill (or the fill or stroke row being edited). Esc cancels.
- I comes out of FIGMA_NOT_YET.
- On builder pages, Interact stays on I.
- Built (2026-10-22): edit/pickColor.ts; every colour list (SwatchControl) has Pick color for its own row; a picture's
  pixel comes from the browser's EyeDropper (Chromium), opened by the same click.

**Plan decision 1**
- A picked colour snaps to the nearest colour variable, and the row shows its pill.
- The snap is within the target's own palette: surfaces for a frame, the paint palette for a Shape, text tones for text.

**Q: where the colour comes from**
- **(a)** The layer under the pointer, its own token (exact), else the pixel (the EyeDropper API, Chromium) snapped to the nearest variable.
- **(b)** The pixel only.
- **(c)** The layer token only.

## Checks (each PR)

- Selftests: dialect, push, pull, native and compile.
- Component tests: gradient CSS, smoothing.
- Plugin `npm test`.
- A live Zen-file import and read.
- E2E FW-180…189.
- The gate scoped to the changed files.
