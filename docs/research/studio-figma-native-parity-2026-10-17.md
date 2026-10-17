# Zen Studio → native Figma parity (research + plan, 2026-10-17)

User, 2026-10-17: "Tiếp tục improve tính năng để có thể chỉnh sửa tự do như Figma. Cho vẽ các shape như figma, bao gồm
vẽ hình ellipse và cho chỉnh arc của nó như Figma. Các hành vi chỉnh sửa vẽ canvas, frame, auto layout, tạo component y
hệt Figma" — then "Nghiên cứu lại tất cả hành vi của Studio. Đưa về sát native với Figma nhất … Vì chúng ta cần convert
người dùng từ Figma."

**The bar:** a Figma user works on muscle memory. Same key, same gesture, same default, same result. A behaviour that
exists but differs costs more than a missing one (they try the Figma way first and decide Studio is broken). Deviations
are allowed only where Zen's token rules force them (colours, gap, padding, radius are tokens), and then the Figma
gesture still works and snaps to the token.

Method: four code audits (canvas/selection, drawing/transform, frames/auto layout, components/inspector), each grading
every Figma UI3 behaviour ✅ same · 🟡 different · ❌ missing with the Studio file that owns it; then a hands-on walk of
the built work in a private Studio server.

## 1. Architecture facts that shape the plan

- A builder page is a limited TSX file (`tools/studio/dialect.mjs`): `<Board>` holds only `<Screen>` / `<Overlay>`
  (free x/y px since 2026-10-15); everything inside is Zen components. A JSON doc with stable ids sits beside it
  (`tools/studio/doc.mjs`); edits are ops (`setProp`, `insertChild`, `pasteCode`, `moveTo`, `wrap`, `unwrap`, `many` …,
  dispatch `tools/studio/jsx-source.mjs applyOps`), one request = one ⌘Z.
- Screen content is block flow (`builder.css .studio-builder-screen`); there is **no free x/y inside a frame**. Layers
  float only through Figma's "Ignore auto layout" (`src/components/Layout/position.ts`), whose insets are Spacing/Padding
  tokens (0 … 48 px), so a layer cannot sit at x = 200.
- Placement tools only click-to-place (`edit/place.ts`); only the Frame tool draws by drag (`builder/frameMove.ts`).
- The native Figma clipboard writer already emits ELLIPSE with arcData and VECTOR (`tools/studio/figma-native.mjs`,
  used by chart marks); the push package and pull ignore RECTANGLE / ELLIPSE / LINE / POLYGON / STAR / VECTOR.

## 2. Audit — components, instances, variants, assets, inspector (area D)

Instances are close to Figma (properties with Figma names and order, per-property reset, nested instances, overrides on
builder pages, Swap, Quick insert ⇧I, Assets drag with insertion line). What a Figma user misses:

| # | Figma | Studio today | Grade |
|---|---|---|---|
| D1 | ⌥⌘K Create component; Create multiple / Combine as variants | nothing; the dialect has no page-local component | ❌ |
| D2 | Assets › Local components; ⌥-drag a main = instance | Zen DS / Icons / Photos only; ⌥-drag copies | ❌ |
| D3 | Main ◇ and instance ❖ in purple; variant set dashed purple | selection is Info blue; set border grey | 🟡 |
| D4 | ⬨ create property from a layer; property definitions panel; add variant | none (library axes read-only) | ❌ |
| D5 | Swap keeps overrides by layer name; ⌥-drop swap from Assets | swap brings the default snippet; ⌥-drop photos only | 🟡 |
| D6 | Reset all changes resets text/content too | design props only | 🟡 |
| D7 | Detach ⌥⌘B on any instance → exact frame copy | 9 presentational types, approximate | 🟡 |
| D8 | X / Y editable, rotation field, align buttons align a selection | X/Y read-only, no rotation, align = constraints of a floating layer | ❌/🟡 |
| D9 | Appearance: opacity (and 0–9 keys), blend, fill/stroke paint lists | Box surface/border tokens only; no opacity | 🟡 |
| D10 | Number fields: scrub on every label, ↑↓ ±1 / ⇧ ±10, math (`100/3`, `+8`) | scrub on W/H only, ⇧ = 8, no math | 🟡 |
| D11 | Mixed values for any multi-selection | same-component props only | 🟡 |
| D12 | Export section per layer (PNG/SVG, scale) | page-level export | ❌ |

Building blocks for page-local components: `.map` row templates already behave like main + instances (`setRowProp`,
"Row N / All rows"); the `overrides` prop keyed by layer path (`_shared/nested.tsx`); stable `data-zen-id`s; a new
builder export (as `Overlay`) in `BUILDER_NAMES`.

## 3. Audit — canvas, selection, moving, layers, clipboard, arrange (area A)

Works like Figma: Space/H/middle-button pan, wheel pan, ⌘-wheel and pinch zoom at the pointer, ⇧0, double-click into
layers and instances, ⌘-click deep select, Esc up a level, hover outlines, flow reorder with the insertion line, ⌥-drag
copy, Layers drag reorder, ⇧/⌘-click ranges, ⌘C/⌘X, ⇧⌘R, ⌥⌘C/⌥⌘V, ⌘/ quick actions, one gesture = one ⌘Z.

| # | Figma | Studio today | Grade |
|---|---|---|---|
| A1 | ⌘A selects all in the parent | not bound: the browser selects the page text | ❌ |
| A2 | ⌘R rename, ⌘[ ⌘] ⌥⌘[ ⌥⌘] layer order, ⌘G group | not bound: browser reload, Back/Forward, Find | ❌ |
| A3 | ⇧⌘G ungroup / remove frame | engine op `unwrap` exists, no key/menu | ❌ |
| A4 | Align ⌥A ⌥D ⌥W ⌥S ⌥H ⌥V, distribute, tidy up ⌃⌥T | none for a selection | ❌ |
| A5 | Arrows nudge 1 px / ⇧ 10 px any layer | layers: arrows reorder (floating ones too) | 🟡 |
| A6 | Free move with smart guides, equal-spacing guides, red px labels | flow reorder; floats snap to tokens; guides frame-to-frame only | 🟡 |
| A7 | Marquee several frames; ⌘-marquee over layers; ⇧-click frames | marquee picks layers in one frame; frames single-select | 🟡 |
| A8 | Enter selects all children; `\` parent; Tab on frames | first child only; `\` unbound; Tab layers only | 🟡 |
| A9 | ⌘V with a frame or nothing selected pastes (in place / centre of view) | needs a selected layer | 🟡 |
| A10 | Layers: rename (double-click), lock ⇧⌘L, ⌥L collapse all, type icons (AL direction, instance, shapes) | none of these; 4 icon kinds | ❌ |
| A11 | Frame label double-click renames | zooms to the frame; no Screen rename anywhere | 🟡 |
| A12 | Bare `+` / `-`, Z, N / ⇧N, zoom to 25 600 %, ⇧1 zooms in on small content, ⇧2 on the whole selection | ⌘± only, 2–400 %, ⇧1 ≤ 100 %, ⇧2 main layer | 🟡 |
| A13 | Delete selects nothing afterwards | selects the parent | 🟡 |
| A14 | Flip ⇧H ⇧V; Copy as PNG ⇧⌘C; ⇧⌘V paste over | none | ❌ |
| A15 | Rulers ⇧R, layout grids ⌃G, outline mode ⇧⌘O, shortcuts sheet ⌃⇧? | none; sheet on `?` | ❌ |
| A16 | Context menus (layer: group, order, lock, create component, rename; frame: copy/paste/duplicate/delete; canvas: paste here) | partial | 🟡 |

## 4. Audit — frames, free layout, auto layout (area C)

Works like Figma: frame draw with ⇧/⌥/snapping, frame move/⌥-copy/⌘D/nudge, ⇧A on loose layers (infers direction,
gap, align, wrap), Flow vertical/horizontal/wrap, alignment box, gap Auto, clip, baseline, hug/fill/fixed + min/max,
constraints for absolute children, double-click a handle = Hug, resizing a Fill child makes it Fixed.

| # | Figma | Studio today | Grade |
|---|---|---|---|
| C1 | F inside a frame draws a nested frame; a click = 100 × 100 | always a top-level Screen; a click = a device-size Screen | ❌ |
| C2 | A new frame has no auto layout: children at free x / y px, with constraints | everything flows; floats stop at 48 px (token insets) | ❌ |
| C3 | ⇧A on a frame adds auto layout to it (direction, gap, **padding** inferred) | always wraps in a new Stack; padding never inferred | 🟡 |
| C4 | ⌥⇧A remove auto layout (children keep their place) | none | ❌ |
| C5 | Drag gap and padding handles on the canvas (⌥ = opposite sides, ⇧ = steps) | click opens a token list; no drag | ❌ |
| C6 | Pink gap / padding areas on hover | blue, always tinted while selected | 🟡 |
| C7 | Frame fill / stroke / radius / effects on any frame, incl. auto layout | Box only (surface, border, radius, effect); Stack none; Screen canvas only | 🟡 |
| C8 | ⌥⌘G frame selection keeps positions | Box stacks the layers vertically | 🟡 |
| C9 | Resize a frame on any edge (writes its size); ⌘ ignores constraints; ⌥⇧⌘R resize to fit | Screen: right edge, view-only | 🟡 |
| C10 | Frame presets panel while F is active | none | ❌ |
| C11 | Separate row gap when wrapping; padding per side; canvas stacking; strokes in layout | one gap; H/V padding; fixed last-on-top | 🟡 |
| C12 | Layout grids | none | ❌ |

Spacing stays token-only by design (gap, padding, radius): the Figma gesture must work and snap to the ladder with the
token name shown live.

## 5. Audit — drawing tools, transform, shapes, appearance, text (area B)

Works like Figma: V, H, T; Frame drag with ⇧ / ⌥ / snapping and a W × H tag; Esc and one shape put the tool back to
Move; the new layer is selected; 8 resize handles; double-click a handle = Hug; text editing (Enter, double-click, Esc
selects the layer); text styles; visibility ⇧⌘H.

| # | Figma | Studio today | Grade |
|---|---|---|---|
| B1 | Rectangle R, Ellipse O, Line L, Arrow ⇧L, Polygon, Star | no tool, no component (the dialect refuses svg/HTML) | ❌ |
| B2 | Ellipse Arc: Start / Sweep / Ratio fields + on-canvas handles | none (only chart donuts export arcs) | ❌ |
| B3 | Click = 100 × 100; drag any layer to a size; parent = top-most frame under the pointer | placement is click-only with fixed code; refused on empty canvas | ❌ |
| B4 | A = Frame (alias of F); I = eyedropper; P = Pen; K = Scale | A = Stack tool, I = Interact, P = Play | 🟡 |
| B5 | Space held while drawing moves the shape | none | ❌ |
| B6 | Resize: ⇧ keeps the ratio, ⌥ from the centre, ⌘ ignores constraints | ⇧ snaps to 8 px; ⌥ ⌘ nothing | 🟡 |
| B7 | Rotation (hover outside a corner, ⇧ 15° steps; field), flip ⇧H ⇧V | none | ❌ |
| B8 | Opacity field and 0–9 keys; blend mode | none | ❌ |
| B9 | Stroke weight / align / dash; fill on any frame | Box border pale/subtle; no fill on Stack/Grid | 🟡 |
| B10 | Text tool: click and type at once; drag = fixed-size box; Auto width / Auto height / Fixed | inserts "Text", edit needs Enter | 🟡 |
| B11 | Drop or paste an image file on the canvas | Assets panel upload only | ❌ |
| B12 | Push / pull RECTANGLE, ELLIPSE (arcData), LINE, POLYGON, STAR | dropped with a note | ❌ |

## 5b. Audit — Variables (area E; user, same day: "quản lý variables … chỉnh sửa token trực tiếp bằng variables")

Studio has no Variables UI and cannot change a token's value. The only token editor (Main component › TokenField)
changes which existing token one declaration of a library component's CSS reads (`tools/studio/css-edit.mjs`), and the
dev server writes only under `src/`, so `tokens/source` is out of reach. The docs platform shows one collection at a
time, one mode at a time, read-only (`src/foundations/TokenTableView.tsx`).

| # | Figma | Studio today | Grade |
|---|---|---|---|
| E1 | Local variables (right panel with nothing selected, or Assets): collections, groups tree, a column per mode, search, type filter | none in Studio; docs page per collection, one mode | ❌ |
| E2 | Edit a value inline (colour picker with alpha, number, string, boolean), alias chip "→ variable" | none | ❌ |
| E3 | Create / rename ("/" groups) / duplicate / delete variables, groups, collections, modes | none (11 collections hard-coded in `scripts/build-tokens.mjs`) | ❌ |
| E4 | Description, scoping, code syntax, hide from publishing per variable | not in the source (name, type, valuesByMode only) | ❌ |
| E5 | Apply / detach / create variable on any field of the design panel | token ladders per prop enum (ScaleField, tone) | 🟡 |
| E6 | Change variable mode on a frame / section / page, for every collection | frame Theme Light/Dark, session only | 🟡 |
| E7 | Publish to the library; pull updates | rebind packages move bindings only; values come from Figma by the sync skill | 🟡 |

Data available: `tokens/source/figma/<slug>.json` per collection (`{ "<Collection>": { modes, tokens: [{ name, type,
valuesByMode }] } }`, aliases written `"{Figma/Name}"`), `tokens/source/figma.collections.json` (collection metadata),
`src/tokens/catalog.generated.json` (2,229 tokens flat, already loaded by `src/foundations/resolvedTokens.ts`), Figma
variable ids in `docs/figma-contracts/native-pack.json`. 11 collections: Global Colors (2 modes), Global Dimensions,
Base Colors, Mode Colors Light/Dark, Component Theme (9), Component Size (Compact / Comfortable / Studio), Spacing,
Corner Radius (5), Emphasis Level (3), Breakpoint & Grids (3), Typography Configuration (4).

Write path for a value edit: merge into the collection file (format kept) → dated line in `figma.collections.json` →
`npm run tokens:build` (tokens.css, generated.ts, catalog, native packages) → `npm run tokens:check` → scoped `npm run
qa`. Constraint: Figma is the token source today (zen-token-sync); a repo-only value is reverted by the next sync unless
Figma gets it too, so Studio's Variables must also push values to Figma (the Zen plugin already imports from Studio).

## 6. Decisions taken for parity (from the user's "sát native với Figma nhất")

1. **Free frames.** A Box or a Screen without auto layout is Figma's frame without auto layout: a layer drawn in it sits
   at Figma's X / Y in px (`position="absolute"` with px `insetLeft` / `insetTop`; `LayoutInset = ZenPadding | number`).
   Figma's X / Y are not spacing (Figma cannot bind them to variables either), so px is Figma-exact and the token rule
   still holds for gap, padding and radius. Floats inside auto layout keep their token insets.
2. **`Shape`** is a new primitive (src/components/Shape): Figma's RECTANGLE, ELLIPSE (+ arc), LINE, arrow, polygon,
   STAR, sized and placed like Box. Colours are tokens: `fill` from Color/Background, `stroke` from Color/Border (no
   hex). Figma's default grey #D9D9D9 → Background/Support/Neutral/Soft.
3. **Keys follow Figma** where Studio used a Figma key for something else: A = Frame (Stack keeps its toolbar button),
   R / O / L / ⇧L shapes; resize ⇧ = keep ratio, ⌥ = from the centre.

## 7. Plan (each phase: build → selftests → E2E rows → private-server walk with screenshots → `npm run qa` scoped)

**P1 · Draw like Figma (the user's explicit ask).** Shape component (library definition of done); toolbar shape menu
(Rectangle R, Line L, Arrow ⇧L, Ellipse O, Polygon, Star) and A = Frame; one draw engine for shapes and frames: click =
100 × 100, drag, ⇧, ⌥, Space-move, W × H tag, parent = top-most frame under the start point (free frame → px X / Y;
auto layout → into the flow at the pointer); Frame inside a frame = nested Box (Surface fill); free move / nudge / X Y
fields for px layers; Inspector Shape section (fill, stroke, weight, align, radius, Arc Start / Sweep / Ratio, Count,
Ratio, rotation, opacity); on-canvas Arc handles as Figma's (sweep, start, ratio, live labels, ⇧ steps); Figma push and
pull of the shape nodes (native ⌘V after the direct-paste session's fix lands).

**P2 · Auto layout like Figma.** ⇧A on a frame converts it in place (direction, gap, padding inferred, snapped to
tokens); ⌥⇧A removes it (children keep their place as px layers); drag gap / padding handles on the canvas (⌥ = both
sides, live token label); ⌥⌘G keeps positions (free Box); ⇧⌘G ungroup / remove frame.

**P3 · Keys and selection that Figma users hit first.** ⌘A, ⌘[ ⌘] ⌥⌘[ ⌥⌘] (order), ⌘G / ⇧⌘G, arrows nudge px layers
(⇧ 10), align ⌥A ⌥D ⌥W ⌥S ⌥H ⌥V, `\` parent, Enter = all children, bare + / −, 0–9 opacity on shapes, ⇧H ⇧V flip,
Delete selects nothing, ⌘V with nothing selected, Layers rename and lock, frame label double-click renames.

**P4 · Components like Figma.** ⌥⌘K on a selection: a page-local main component (a Board-level `Component` frame,
purple ◇), instances placed from Assets › Local components or ⌥-drag, overrides by layer, Go to main, Detach ⌥⌘B,
export as a React component. Needs its own spec (dialect + export) before code.

**P5 · Variables like Figma.** A Variables panel opened as Figma's (right panel with nothing selected › Local
variables, and from Assets): collections, groups tree, a column per mode, search, type filter; edit values inline
(colour picker on tokens of the same collection, numbers, alias "→ variable" chips), create / rename / delete; the
dev server writes `tokens/source/figma/*.json` as a draft (⌘S runs tokens:build + tokens:check) and builds a variables
package for the Zen plugin to apply in Figma; frames get "Change variable mode" for every collection, written in the
page. **Open question for the user:** may Studio become a second source of token values (Studio → repo → Figma), or
must every value edit go to Figma first and come back by the sync?

Later (named so nothing is lost): pen / vector editing, boolean operations, gradients and image fills, layout grids,
rulers and guides, per-layer export, Scale tool K, comments.

## 8. Status (2026-10-17, branch `zen/feat/studio-shapes-20261017`)

Built and checked (Studio E2E group `draw`, DR-01 … DR-11; selftests drawModel 24, numberMath 24, relayout 8,
figma-pull +7; Zen plugin `studio-import.test.js` shapes):

- **P1 done:** Shape (all six types, arc, tokens), toolbar shape menu and R / O / L / ⇧L / A, drawing gestures (click
  100 × 100, ⇧, ⌥, Space, guides, size tag, parent under the pointer), nested Frame, empty Screens take layers, arc
  handles, Inspector shape panel + X / Y px + Rotation + number fields with math / scrub / ⇧ 10, free moves with
  smart guides, nudge, ⇧ ratio on corner resize, Layers names and icons, Figma push / pull / plugin import.
- **P2 partly:** ⇧A on a free frame converts it in place (direction, order, gap, padding, alignment read from its
  layers; a painted Box keeps its fill and takes a Stack inside); ⌥⇧A turns a Stack into a Box with its layers at their
  X / Y. Open: gap / padding drag handles on the canvas, pink spacing areas, ⌥⌘G keeping positions, ⇧⌘G ungroup of a
  frame with several layers, frame presets panel.
- **P3 partly:** ⌘A, ⌘] ⌘[ ⌥⌘] ⌥⌘[, `\`, bare + / −, 0–9 opacity on shapes, ⌥A ⌥D ⌥W ⌥S ⌥H ⌥V on a free frame's
  layer, the shortcuts sheet. Open: ⌘G / ⇧⌘G, Enter = all children, Delete selects nothing, rename / lock in Layers,
  multi-frame marquee, flip ⇧H ⇧V, rotation handles on the canvas.
- **P4 (components) and P5 (variables)** wait: P4 needs its spec (a page-local main component in the dialect and the
  export), P5 needs the user's answer on where token values may be edited first.

## 9. P4 spec — components like Figma (draft, 2026-10-17)

Figma: ⌥⌘K turns the selected layer into a **main component in place** (purple frame, ◇ name); copies of it are
instances (purple ❖) that follow the main and keep their own overrides; Assets › Local components lists the mains;
the instance's Inspector shows its component, Reset all changes, Go to main component, Detach (⌥⌘B).

Zen Studio design (builder pages; the dialect grows two builder elements, like `Overlay`):

| Figma | Page code | Studio |
|---|---|---|
| Main component (anywhere: in a Screen, or on the canvas) | `<Component id="price-card" name="Price card">…layers…</Component>` | ⌥⌘K on a layer / several (Create component · Create multiple components); purple outline + ◇ label; editing it edits every instance |
| Instance | `<Use of="price-card" overrides={{ "<layer id>": { children: "Pro", hidden: true } }} />` | ⌥-drag a main, or Assets › Local components; ❖ outline; text and visibility overrides by layer (double-click into it, as library instances) |
| Reset all changes / Go to main / Detach | drop `overrides` · select the `Component` · replace `Use` by the main's layers with the overrides applied | instance header buttons, ⌥⌘B |
| Variants, component properties | later: `<Component variant={{ Size: "Small" }}>` sets, text / boolean / swap properties as `props` | phase 2 |

Export: each `Component` becomes a React function in the exported file (its overridden texts and visibilities become
props), each `Use` a call of it. Figma push: COMPONENT and INSTANCE nodes (the plugin creates the main once, then
instances with overrides); pull reads local components back. Engine: ops `createComponent { locs, name }`,
`detachUse`, `resetUse`; layer ids (`data-zen-id`) key the overrides so they survive edits of the main.

**P4 status (2026-10-17, branch `zen/feat/studio-components-20261017`):** built v1 as specified above — dialect
`Component` / `Use` (checks: one layer, unique ids, known `of`, no instance inside its own main), renderer (the main's
root layer marked as the main, an instance drawn from its main as one layer; the render cache keys on the mains'
signatures so an edit of a main redraws its instances), ⌥⌘K, ⌘D / ⌥-drag of a main → instance, ⌥⌘B detach, Delete of a
main (refused while instances use it), Inspector Component / Instance section (rename, Create instance, Select
instances, Swap, Go to main, Detach), Assets › Local components, violet outline / tag / ◇ icons, React export (one
function per main), Figma push (COMPONENT + INSTANCE, plugin commit ed9bec6). Not yet: overrides and component
properties (text / boolean / swap), variants, Figma pull of local components.
