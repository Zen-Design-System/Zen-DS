# F7b spec card · overrides inside a page's own instances, Push changes / Reset, nested instances

Session B, plan `docs/research/studio-figma-design-parity-2026-10-18.md` §5 F7 (the part F7a left, see
`studio-f7-components-spec-2026-10-19.md` §2). Tier L. Branch `zen/feat/studio-f7b-overrides-20261019` (stacked on F7a).

## 1. What Figma does

- ⌘-click (or double-click) into an instance selects a layer inside it. Editing that layer (its text, its visibility, a
  nested instance's properties, a fill) is an **override** kept by that instance only. The main stays as it is.
- The instance's panel lists **Reset all changes**. A layer's own panel offers to reset that layer.
- **Push changes to main component** writes the instance's overrides into the main (every other instance follows) and
  clears them from the instance.
- A **nested instance** inside a main shows its own properties when you select it inside an outer instance. Its
  variant, text, boolean and swap values are overrides of the outer instance.
- What an instance puts in a main's **slot** is content of that instance (Figma slots).

## 2. Code (dialect)

| Thing | Written as |
| --- | --- |
| Overrides | `<Use of="chip" overrides={{ Text: { children: "Done", tone: "accent" }, Icon: { hidden: true } }} />`: the same table library components take (`src/components/_shared/nested.tsx`), literals only |
| Layer path | `tools/studio/instance-paths.mjs`. One segment per layer below the main's root, which is the instance itself and has no path. A segment is the layer's given name (`data-name`), a nested instance's component name, or else its tag, with `[i]` (from 0) on every sibling that shares it (`Row/Text[1]`). Below a layer the main does not list (a component's own layers, a nested instance's), the path goes on into it (`Chip/Text`, `Badge/Dot`). |
| A nested instance's values | Flattened as literals: `{ Chip: { "variant.Size": "Large", "props.Label": "New" } }` |
| Slot content | `<Use of="panel" slots={{ Content: <>…</> }} />`: elements, so not inside `overrides` |

The dialect checks that every override path names a layer of the main (else: "<Use> overrides no layer Stack/Text[3]
of Chip") and that values are literals.

## 3. Studio

- **Canvas** (`renderPage.tsx`): an instance draws its main's layers inside `NestedContext` scopes named by their paths
  (`layer: true`), and applies the instance's `overrides` (props; `children` replaces a Text's words; `hidden` hides).
  The existing deep select (`select/parts.ts`, read only by this phase) then reaches a layer inside an instance as a
  part of the `<Use>`.
- **Inspector**:
  - A part of a page's own instance shows the layer's fields:
    - words (Text);
    - visibility (the eye);
    - for a nested Zen component, its Figma properties (the existing `OverrideProperties`);
    - for a nested page instance, its variant and properties.
  - Every edit writes the `<Use>`'s `overrides` in one change.
  - The instance's Reset all changes also clears `overrides`; a part has Reset changes.
  - Push changes to main component (instance panel, and the canvas menu on an instance) writes each overridden layer's
    props into the main's layers, then clears the instance's overrides: one edit, one ⌘Z.
- **Slots**:
  - An instance of a main with a slot property shows the slot's content as layers of the instance.
  - Dropping a layer into it, or Assets › click with the slot selected, writes `slots`.
  - This depends on drag-and-drop targets (Session A / C areas). It ships as F7c if they cannot take a target in this
    window; `slots` is rendered and pushed here.
  - **F7c, built 2026-10-21:** renderPage marks a main's slot layer drawn in a page's own instance (`data-zen-slot`,
    `data-zen-slot-of`); `edit/drag.ts` dropTargetAt takes it as a container for a layer drag and an Assets drag (a
    violet outline with the slot's name); ops moveTo / pasteCode with `slot` (`tools/studio/slot-fill.mjs`) write the
    instance's `slots`, the main's own slot layers kept on a first drop. Out of a slot: a move as from any frame.
    Several layers at once into a slot are refused (one at a time). E2E FW-160…164, `studio:dnd` slot rows.
- **Assets › Local** (`edit/assets/**`, Session C's area): the page's sets and lone mains as tiles, with their
  description as the tile's tooltip; a click adds an instance. Asked of C.

## 4. Files

| Area | File | Owner |
| --- | --- | --- |
| Dialect, checks | `tools/studio/dialect.mjs` (+ selftest) | B |
| Canvas | `builder/render/renderPage.tsx` | B (F7a's instance code) |
| Panel | `inspector/ComponentSection.tsx`, `inspector/PartPanel.tsx` (local-instance branch), new `inspector/LocalOverrides.tsx` | B |
| Edits | `edit/localComponents.ts` (overrides, push changes, reset) | B |
| Export | `tools/studio/compile.mjs` (overrides → props of the function call? see §5) | B |
| Figma | `figma-push.mjs` (INSTANCE `overrides` by layer path), plugin importer (find the layer by path in the instance, set characters / visible / properties) | B |

## 5. Open points

- The React export of an instance with overrides. The main's function has no prop for an arbitrary layer, so:
  - an override of a bound layer becomes that property's value;
  - any other override is written as a comment: "`{/* Chip: Stack/Text tone=accent (instance override) */}`".
  - The user decides whether an export should inline such an instance instead. This goes to BACKLOG as a question.

## 6. Checks

- Dialect selftest: paths, refusals.
- Render selftest: an override reaches its layer, `children`, `hidden`.
- localComponents unit tests through the doc selftest: Push changes and Reset.
- Push round trip.
- Plugin mock test.
- E2E FW-77…79 and FW-95…99:
  - ⌘-click into an instance, change its words;
  - hide a layer;
  - Reset all changes;
  - Push changes to main;
  - a nested instance's variant inside an instance;
  - Assets › Local.
- Full Studio E2E, gate.
