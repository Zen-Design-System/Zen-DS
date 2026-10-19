# Zen Studio F9 · Vectors — spec card (2026-10-19)

Plan: `docs/research/studio-figma-design-parity-2026-10-18.md` decision 6 and F9 (tier L, last phase of Session A).
Figma words: Pen (P), Pencil (⇧P), Enter edits the vector (vertex edit), Union / Subtract / Intersect / Exclude
(boolean groups), Flatten ⌘E, Outline stroke ⌥⌘O, Use as mask ⌃⌘M.

## What exists (map, 2026-10-19)

- `Shape` (src/components/Shape): rectangle, ellipse (arcs), line, arrow, polygon, star; token fill / stroke
  (`paint.ts`), stroke align by clipPath / mask, rotation about the centre, opacity, px insets in free frames. An unknown
  `type` falls back to rectangle (Shape.tsx, figma-push, the plugin, layerNames).
- Studio: `draw/` (drawModel pure, drawTool canvas: ghost, smart guides, `pasteCode` write), `ArcHandles` (live `d`
  while dragging, one write on release — the pattern a vertex editor follows), `ShapeSections`.
- Figma: push `shapeNode` (5 node types, no VECTOR for Shape); pull drops VECTOR / BOOLEAN_OPERATION; figma-native has
  `parsePath` (absolute M / L / C / Z), `pathBounds`, `vectorNetwork`; chart marks already push VECTOR `{ d, box }` and the
  plugin builds them (`vectorPaths`).
- No path-ops library; `package.json` has no `dependencies`. The library (`src/components`) must stay dependency-free;
  the Studio (platform build) and `tools/studio` may use a devDependency.

## API (library, tier L)

`<Shape type="vector" d="M0 0 C… Z" viewBox="0 0 120 80" width={240} height={80} fill… stroke… />`

- `d`: SVG path data, **absolute M / L / C / Q / Z only** (what Figma's `vectorPaths` and figma-native's `parsePath` take;
  the Studio writes it normalised). Several sub-paths allowed; `fillRule` `"nonzero" | "evenodd"` (default nonzero).
- `viewBox`: the box `d` is drawn in (`"minX minY width height"`). The SVG scales it to the layer's size
  (`preserveAspectRatio="none"`), so a resize writes `width` / `height` only, as Figma scales a vector network. Vertex
  edits write `d` (and `viewBox` when the bounds change).
- Everything else as today (fill / stroke tokens, strokeWeight / strokeAlign, rotation, opacity, label). A vector
  without `d` renders nothing; `type="vector"` stops falling back to rectangle everywhere it does today.
- Harness: `shape/vector-path` (error: `d` outside M / L / C / Q / Z or relative commands; `viewBox` missing).
- Guideline entry, docs/api, platform examples (≥ 4, e.g. a logo mark, a wave divider, a hand-drawn underline, an
  icon-like badge), one Do / Don't pair ("a drawn vector, not a raster image"; "not for an icon: use Icon").

## Studio

**F9a — vectors (one PR)**
- Pen (P): click adds a corner, drag adds a smooth point (mirrored handles, ⌥ breaks the mirror), click the first point
  closes, Enter / Esc ends an open path; ⇧ 45° steps; smart guides as drawTool. Writes one `pasteCode` of a vector
  floating in the frame under the first click.
- Pencil (⇧P): freehand, simplified to cubic curves on release (a small fit, no library), one write.
- Enter on a vector (or double-click): vertex edit, the ArcHandles pattern — points and handles drawn over the shape,
  drag moves them live (`d` on the DOM), one write on release; Delete removes a point; Esc / Enter leaves.
- Layers: "Vector N", icon `icon-pen-tool-01-line`; Inspector: Fill / Stroke / Appearance as other shapes, no Arc /
  Count sections; Copy / Paste properties as other shapes.
- Figma push: `VECTOR` with `vectorPaths` (`d` mapped from `viewBox` to the node's size), fills / strokes by variable
  as shapes; plugin `studio-import.js` builds it (the chart VECTOR builder, with Shape paints). Pull: VECTOR with
  `vectorPaths` (and fills / strokes by bound variable) → `Shape type="vector"`; native clipboard: a vector network.
- Keys: P and ⇧P leave `figmaNotYet`; E2E `figma` FW-113… (Pen draws a closed path, vertex drag, Pencil, push / pull
  round trip in the selftests).

**F9b — path operations (second PR)**
- A vetted path-ops library, loaded only when an operation runs (devDependency, Studio only). Recommended:
  `pathkit-wasm` 1.0.0 (Skia PathOps, BSD-3, ~380 KB WASM): boolean ops on curves, stroke → path, simplify.
  Alternative: `paper` 0.12 + `paperjs-offset` (MIT, larger, JS only).
- Union / Subtract / Intersect / Exclude, Flatten ⌘E, Outline stroke ⌥⌘O on vectors and every other Shape type (each
  turned into its path first). Boolean groups are live (decision 2).
- Use as mask ⌃⌘M: `Box mask` (the first layer clips the rest; Session B owns Layout — its prop, one PR with B).
- Figma push / pull of BOOLEAN_OPERATION (live groups) or VECTOR (results).

## Decisions (the user, 2026-10-19)

1. Path-ops library for F9b: **`pathkit-wasm`** (asked: pathkit-wasm or `paper` + `paperjs-offset`).
2. Boolean groups are **live, as Figma's**: a group element keeps its shapes (each still selectable, movable, editable)
   and the Studio recomputes the result `d` the library renders whenever one of them changes; Figma push / pull
   BOOLEAN_OPERATION. (Asked: live group or one result vector.)
