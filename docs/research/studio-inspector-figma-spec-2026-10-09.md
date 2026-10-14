# Zen Studio inspector in Figma's language — spec (2026-10-09, approved; step 1 done)

**Request (user, 2026-10-09):** the Design tab reads like Figma's right panel (UI3): the same section names, controls
and field layout, so designers work in a language they know. Studio translates that language back into front-end code
(Zen props and tokens). Labels and inputs follow Figma's layout so elements align.

Not changed: what gets written (Zen props, tokens only, the harness rules), the Code tab, Slots, Content, Attributes.

## 1. Field grid (every section)

Figma UI3's panel is one grid: **two equal field columns + a 24px icon column**, 8px gaps, a section padding of 16px.

| Piece | Figma | Studio (Zen components, chrome modes "Studio") |
| --- | --- | --- |
| Section head | Title (Body/Small/Bold) + icon actions on the right | `InspectorSection` title + `actions` (IconButton flat xs) |
| Group label | Caption above its fields ("Resizing", "Alignment", "Gap", "Padding") | Caption/Regular, Neutral/Base, above the fields; no left label column |
| Field | 28px, a leading glyph inside ("W", "H", "X", "Y", a gap or padding icon), value, optional trailing mode ("Fill", ⌄) | `InputField` / `SelectField` size sm (28px in the Studio modes) with `leading`; dropdown fields are `SelectField` |
| Icon column | Section toggles beside a row (wrap, min/max, independent padding, constraints) | IconButton flat xs in the 24px column; empty when the row has none |
| Half / full width | A field takes one column, a wide control (Flow, Alignment box) spans both | `grid-column: span 1` / `1 / 3` |

The left label column ("Direction", "Align in parent", "Child size") goes away: a label sits above its fields, as in
Figma. Hover on a label (or the field's leading glyph) shows the code it writes (`Stack direction="row"`).

## 2. Sections, in Figma's order

| # | Figma section | Shown for | Controls (Figma name → code) |
| --- | --- | --- | --- |
| 1 | Instance header | a Zen component | name · Go to main (docs page) · Detach · Reset all overrides (exists) |
| 2 | **Component properties** (Figma's names, as now: Size, Level, State, Leading-Icon…) | a Zen component | variant selects, boolean toggles, instance swap (icons), text props |
| 3 | **Position** | every layer | Alignment (6 icons) · X / Y (read) · Constraints (absolute only) → `position`, `constraintX/Y`, `inset*` |
| 4 | **Auto layout** (a Stack / Grid) or **Layout** (anything else) | layout primitives / any child | see §3 |
| 5 | **Appearance** | Box, Card… | Opacity (none in Zen: hidden) · Corner radius (+ independent corners) → `radius`, `radiusTopLeft…` |
| 6 | **Fill** | Box | Surface → `surface` (Surface / Surface-alt / Subtle / Pale / none) |
| 7 | **Stroke** | Box | Border → `border` (none / Pale / Subtle) |
| 8 | **Effects** | Box, Card | Drop shadow → `effectStyle` (Zen effect styles) |
| 9 | **Typography** | Text, Heading | Text style (Zen text styles) · alignment |
| — | Slots · Content · Attributes | as now | unchanged, after Figma's sections |

## 3. Auto layout ↔ Zen layout props

| Figma control | Values | Writes |
| --- | --- | --- |
| **Flow** (4 icons) + wrap toggle in the icon column | Vertical · Horizontal · Wrap · Grid | Stack `direction="column"` / `"row"`, `wrap`; Grid → `Grid` (`columns`) |
| **Resizing** W / H (value + mode in one field) | Fixed (px) · Hug · Fill; min/max in the icon column | `width` / `height` (`number` · `"hug"` · `"fill"`), `minWidth`… |
| **Alignment** (3×3 box) | 9 positions; in a row the box reads horizontally | `justify` (main axis) + `align` (cross axis) |
| **Gap** (icon field + ⌄) | a number on Zen's ladder, or **Auto** | `gap` token; Auto → `justify="between"` |
| **Padding** H / V (two fields) + independent toggle | numbers on the ladder | `paddingX` / `paddingY` (or `padding` when equal) |
| **Clip content** (checkbox) | on / off | Box `clip` |
| Child: **Fill container / Hug** in its own W/H | — | `alignSelf="stretch"` / `fillChildren` on the parent (Figma's "Fill equally") |

**Numbers vs tokens.** Fields show pixels, as Figma does (`16`), and only offer Zen's ladder (0 · 2 · 4 · 8 · 12 · 16 ·
24 · 32 · 48 …, from the tokens of the current modes): the dropdown lists them with the token name as a caption
(`16 · md`). A typed number snaps to the nearest step (the field says so). Code keeps token names (`gap="md"`).

## 4. Delivery (each step: Studio E2E rows updated, `npm run qa`)

1. **Field grid + Section/Field primitives** (§1) and **Auto layout** (§3) — the screenshots' area. Biggest win.
2. **Position** and **Appearance / Fill / Stroke / Effects** on the same grid (Box, Card).
3. **Component properties** and **Typography** on the grid; order of §2; labels with code tooltips.
4. Clean-up: old rows, E2E selectors, docs (`tools/studio/README.md`, spec).

## 5. Decisions (user, 2026-10-09)

1. Only Zen's ladder; the code keeps the token. First answer: fields show px. Changed the same day (user, with the
   canvas spacing menu as the model): every token select reads token + value on one line — "md … 16px" in the list,
   "md 16" in the field (`SelectFieldOption.meta`, `ScaleTrail`).
2. Freeform: dropped (Zen has no free positioning outside `position="absolute"`).
3. Grid + Auto layout first (step 1), then the other sections.
4. A W / H field on Auto shows no number (mid-task).
5. One grid for the whole Design tab (user: "thụt ra thụt vào"): InspectorRow puts its label in the first field column
   and its control in the second, the icon column always reserved; Position's alignment row spans both field columns.

## 6. Step 1 as built

- `InspectorFields` and `InspectorSection fieldGrid` (Section.tsx), CSS in inspector.css; LayoutSection, SizingSection,
  ColumnsField and InstanceSizeGroup on the grid. Title "Auto layout" for Stack, Grid, FormFieldset; "Layout" otherwise.
- Wrap is the toggle in Flow's icon column (Figma); the cross axis (Position · Stretch · Text baseline) is the popover
  beside Gap (Figma's advanced layout settings). Padding is always H | V; Grid has one padding field.
- Not yet: the Grid icon in Flow (it would swap Stack ↔ Grid), typing a number that snaps to the ladder (the field is a
  list), Figma's independent-padding toggle (Zen has no per-side padding).
