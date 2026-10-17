# Customize a Zen component without detaching it

A detached Zen component stops following the library: token changes, fixes and new variants no longer reach it, and
Studio cannot read it back as code. Customize through what the component exposes, in this order, and stop at the first
step that does the job.

## 1. The ladder

| Step | What you change | Example |
| --- | --- | --- |
| 1. Variant and properties | Variant props (Size, State, Theme, Level), booleans (Label, Help-Text, Leading), TEXT props, INSTANCE_SWAP icons | Button Level=Tertiary; Toggle Select=Yes; Slider Icon off |
| 2. Nested instance properties | The props of a nested instance (select it, or expose it) | Field-Only's Leading → Label=Yes, Flag=No |
| 3. Slot content | What sits in a SLOT layer (Content, Contents, Elements, Item-List): it is authored content and follows every token rule | Card Content; Accordion Contents; the Leading slot's label text |
| 4. Allowed overrides | Text (characters, alignment), a layer's visibility, padding and alignment of a nested frame, layoutGrow | value text right-aligned; Slider `Base` hidden; Track padding-right as the value |
| 5. Wrap in a local component | A new component made of Zen instances, with its own variant set | Input/Inline-Field wraps `.Primitives/Input/Field-Only`; Color-Field reuses Text-Field's anatomy |
| 6. Ask for a library change | A new variant or property in the Zen set itself | Accordion size Small; Slider Track-Wrapper Fill |

Never: detach; paint a fill or stroke inside an instance with a token of your choice (the colour no longer follows the
variant); resize a layer inside an instance (it is silently ignored); set an INSTANCE_SWAP to the value it already has
(the icon loses the variant's colour).

## 2. Value layers are the exception

Some layers hold a value, not a style: their fill may be overridden on the instance, and only theirs.

- A colour value: ColorSwatch's own fill, a Color-Selector's root fill, a saved colour.
- The colour space: the picker's saturation area and the hue spectrum on the Slider's `Slide-Container`.
- A photo or an image fill.

Each one is named in the component's description ("its fill IS the value"), and the audit reports it as a deliberate
exception, not a fix to make.

## 3. How a value is set when there is no property

- Slider/Horizontal and Slider/Field: the thumb sits at the end of the track. Set the value with the padding-right of
  `Track-Wrapper` / `Track`: `(1 − value) × (width − thumb)`; the thumb centre runs from half a thumb to width − half.
  A spectrum or a gradient on such a track holds its end colours half a thumb wide, so 0 and 100 % sit under the thumb.
- Chart bars: the column padding plus a Fill child (padding overrides work inside instances; sizes do not).

## 4. Building a component from Zen parts

1. Read the primitives first (`.Primitives/…` on the component's page): sizes, tokens per state, slots. Reuse them
   (an instance) before copying them.
2. Wrap: put the Zen instance in your component and set its props per variant. Write into a nested instance's SLOT from
   the main component when you need your own text there (a TEXT property cannot point at slot content: people edit
   that text directly).
3. Or start from a sibling's anatomy: create an instance of the sibling's variant, `detachInstance()` once, then
   `createComponentFromNode()`. Its nested instances stay linked. Re-add the booleans (Label, Help-Text) on the new set
   and re-link `componentPropertyReferences`.
4. `variant.clone()` drops SLOTs and property references and lands on the page: append the clone to the set, then
   re-link every reference (for example `Saved` → `visible`).
5. Lay the variants out in a grid that fits the 1448 px doc frame (columns by Size, rows by State); a set wider than
   the frame is cut off.
6. File it like Zen's own: a 1512 doc frame (`Container` → `Body`, padding 32, gap 88: `_Cover` with "Group\nName",
   `Description-Text` in Display/3, the set) in the page's section; primitives in `.Primitives`; examples in an
   `Example · …` section. Mark drafts in the description ("Draft <date>, not yet in code").

## 5. Composition rules that keep it clean

- Group rows: each group of rows is its own list frame (gap `Spacing/Gap/XSmall` 8); a panel stacks the groups with
  gap 0, so a rule (Divider, Accordion Divider) always has the same 16 above and below.
- A title over a list sits one step farther than the rows sit from each other. Where a component owns that gap (the
  Accordion's Title → Contents 12), leave it to the component; never pad the rows to move them.
- Nested corners are concentric: inner radius = outer radius − the inset between them (a swatch 10 inside a 12
  field → 2; an area 12 inside a 16 popover → 4).
- A clipping frame with an INSIDE stroke clips its children 1 px inside the edge but keeps the outer radius: a child
  that fills it shows a hairline gap at each corner. Put the fill on the stroked layer itself, or draw the border as a
  top `Border` layer with the same radius (audit: `bounds/stroke-clip-gap`).
- A component's inner track or wrapper is Fill, never a fixed width: a fixed inner width caps every instance.
- Grids of rows (user 2026-10-17, Schedule/Resource-Grid): a row header column and its track rows share one fixed
  row height, and every frame that draws a grid rule sets `strokesIncludedInLayout = false` (`createAutoLayout`
  counts strokes in the layout, so a 1px rule makes a hug cell 1px taller and the lines drift down the grid; audit
  `layout/row-drift`). A column of rows hugs them: after `resize(w, h)` set `primaryAxisSizingMode = "AUTO"` again, or
  the column keeps the placeholder height and its rule stops short (audit `bounds/overflow`).
- Bars on a time scale keep their real dates: never squeeze one to the visible range (it shows a false start or end).
  Pick a range that holds it, or let it run past the far end of a scrolling track (`overflowDirection`); place
  absolute bars only after their column has its final width.

## 6. Check it

Run the audit (`harness/zen-figma-audit.js`) on the new sets and their examples, then look at a corner at 16× zoom and
at the example in Light and Dark. Report deliberate exceptions (value layers, the slider's padding value) by name.
