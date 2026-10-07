# Zen Studio — Figma-grade editing: gap analysis and plan (2026-10-03)

User request (2026-10-03, session "Figma-like editing functionality"): "Tôi muốn tool có chức năng chỉnh sửa hoàn
hảo như figma. Nghiên cứu plan và làm giúp tôi nhé. UX và Tính năng phải thật hoàn hảo." The tool is Zen Studio
(`src/platform/studio/**`, `tools/studio/**`, spec `zen-studio-spec-2026-10-02.md`). Rule from memory: Studio controls
behave like Figma UI3 first, then map to Zen tokens; edits stay token-only and go through drafts + undo.

## 1. What already works (inventory 2026-10-03, verified in code and with the Studio owner)

| Figma | Studio today |
| --- | --- |
| Select, hover outline, name tag, size pill | yes (SelectionLayer, ResizeLayer pill "Hug · 312 × 40") |
| ⌘-click deep select, double-click into instance | yes (parts read-only, nested instances editable) |
| Esc parent, Enter first child | yes |
| Resize handles: Hug / Fill / Fixed, min/max | yes (ResizeLayer, SizingSection) |
| Gap / padding on canvas | click → token menu (SpacingLayer) |
| Properties, variants, booleans, nested instance booleans | yes (DesignPanel, NestedProperties) |
| Text style, content text | inspector only |
| Detach instance ⌥⌘B | yes |
| Duplicate ⌘D, Delete ⌫, Move up/down (menu), insert into slot | yes, example + template files only (slots) |
| Undo / redo, drafts, Save ⌘S, Save per frame | yes |
| Zoom/pan/fit ⇧0 ⇧1 ⇧2, Hand, Present F, hide UI ⌘\ | yes |
| Layers tree with keyboard | yes |
| Multi-select, Wrap in Stack ⇧A / Frame selection ⌥⌘G | in progress — session "Chọn nhiều element vào container" |
| Board keeps frames still on content change | in progress — Studio owner |
| Layout phases 2–7 (ScaleField, Flow/Padding, Alignment v2, Grid columns, scrub, Appearance) | approved, owner session "Cloud migration feasibility" (not running) |
| Position / Effects / Corner radius UI | approved, owner session "Slot Component phân biệt" (not running) |

## 2. Gaps (Figma behaviour → nothing in Studio)

1. **Edit text on the canvas.** Figma: double-click a text layer (or Enter on it) edits it in place; the frame reflows
   as you type; Esc or a click outside keeps the change; one undo step. Studio: double-click only focuses the
   inspector's Content field, and text written as a component prop (`<ListItem title="…">`) has no canvas edit.
2. **Reorder in auto layout.** Figma: arrow keys move the selected child earlier/later; dragging shows a blue insertion
   line and drops it there; dragging into another auto-layout frame reparents it; ⌥-drag drops a copy. Studio: Move
   up/down only in the right-click menu, one step at a time.
3. **Clipboard.** Figma: ⌘C / ⌘X / ⌘V (into the selected frame, else after the selected layer), ⇧⌘R paste to
   replace, ⌥⌘C / ⌥⌘V copy and paste properties. Studio: none.
4. **Navigate and measure.** Figma: Tab / ⇧Tab next and previous sibling, ⇧Enter parent, ⌥ + hover red distance lines
   to any layer. Studio: none of these.
5. **Layers drag and drop.** Figma: drag rows to reorder or move into another frame. Studio: none.
6. **Assets.** Figma: an Assets tab; drag a component onto the canvas, an insertion line shows where it lands.
   Studio: insert only from a slot's "Add to …" picker.
7. **Quick actions (⌘/).** Figma: search any command by name and run it. Studio: none; the "?" sheet lists keys.
8. **Multi-layer editing.** Figma: delete/duplicate/move/copy several layers, "Mixed" values in the inspector,
   marquee select by dragging on empty canvas. Studio: after the multi-select session lands; marquee clashes with
   today's "drag empty canvas pans" (decision needed).

## 3. Plan (each phase: backup → build → selftests → Studio probe in `?ui=studio` → `npm run qa` → screenshots light/dark → HANDOFF/CHANGELOG)

New code goes in a folder of its own, `src/platform/studio/edit/**`, and server ops in `tools/studio/arrange.mjs`
(+ `arrange.selftest.mjs`). Files of other owners only get one-line hooks, agreed with the owner first
(SelectionLayer pointer/double-click, StudioApp mount + keys, jsx-source op dispatch, CanvasMenu items, LayersPanel).

### Phase 1 — Inline text editing (M)
- Double-click on text under the cursor, or Enter on a selected layer whose only content is text, opens an editor
  exactly over that text (same font, size, weight, line height, letter spacing, colour, alignment, wrap width;
  scaled with the zoom). Typing mirrors into the rendered text node so the layout reflows live, as in Figma.
- Source mapping: a JSX text child (`<Button>Save</Button>`, `<Text>…</Text>`) → op `setText`; a string prop whose value
  is the text (`title="Invoices"`, `label="Save"`) → op `setProp`. Text from an expression (`{invoice.client}`,
  playground state) is not edited: the status says where it comes from and, in a playground, focuses the bound control.
- Keys: Enter commits (⇧Enter = new line only where the text already wraps across lines), Esc and a click outside
  commit (Figma), ⌘Z undoes in one step. Empty text is refused ("Delete the layer instead"). Viewers never edit.
- No server change (setText / setProp exist).

### Phase 2 — Reorder in auto layout: arrow keys + drag (M/L)
- Arrow keys on a selected child of a flow parent (Stack, Grid, flex/grid host): ←/↑ earlier, →/↓ later; held keys
  queue one move per answer. `.map` rows are refused ("reorder the data").
- Drag a layer more than 3 px: the layer dims, a ghost follows the pointer, a 2 px accent insertion line shows the
  slot between siblings (along the parent's direction; Grid by cell). Drop moves it; Esc cancels; ⌥ at drop copies.
- Into another container in the same example function (Figma reparent): allowed only when every name the element uses
  is in scope there; else the line turns into a "can't move here" label with the reason.
- Server: op `moveTo { parent, index, prop?, copy? }` in `arrange.mjs` (same file; re-indent; snippet follow; one undo).

### Phase 3 — Clipboard (M)
- ⌘C copies the layer's source (also as plain text, so it pastes into the editor); ⌘X = copy + remove; ⌘V pastes into
  the selected container as its last child, else right after the selected layer (Figma); ⇧⌘R pastes to replace.
- Pasting checks names: Zen components gain their import; a data name that the target does not have refuses the paste
  with the names ("Uses `invoice`, which this example does not have").
- ⌥⌘C / ⌥⌘V copy and paste properties: the literal props (strings, booleans, numbers, text style) the target component
  accepts, in one edit and one undo.
- Canvas menu: Copy, Cut, Paste, Paste to replace, Copy properties, Paste properties.
- Server: op `paste { code, mode: "inside" | "after" | "replace" }` in `arrange.mjs`.

### Phase 4 — Navigate and measure (S/M)
- Tab / ⇧Tab next and previous sibling, ⇧Enter parent (Esc stays), Enter first child (exists).
- ⌥ held: red distance lines from the selection to the hovered layer (or to the parent's edges), each labelled with px
  and the spacing token when it is one ("16 · md").

### Phase 5 — Layers drag and drop (M) — after the multi-select session releases LayersPanel
- Drag rows: insertion line between rows, a highlighted row for "inside"; drop uses `moveTo`. Hover on canvas follows.

### Phase 6 — Assets tab (M/L)
- Left panel tab "Assets": Zen components by group with search (reuses the slot palette); drag onto the canvas shows
  the Phase 2 insertion line; click inserts into the selected container or after the selection.

### Phase 7 — Quick actions ⌘/ and the shortcuts sheet (S)
- A command list (every Studio action valid for the selection, with its shortcut), searchable; the "?" sheet lists the
  new keys.

### Phase 8 — Multi-layer editing (M, after the multi-select session)
- Delete / duplicate / move / copy for several layers, "Mixed" values in the inspector, marquee select (needs the
  decision: drag on empty canvas = marquee like Figma, pan with Space / Hand / scroll).

## 3b. Status (2026-10-03, evening)
All 8 phases built and gated (`npm run qa -- --pages=checkbox` PASS after each; the gate cannot map Studio files to a
page, so each was also exercised in `?ui=studio` on checkbox.tsx with every test edit undone). Server tests:
`node tools/studio/arrange.selftest.mjs` (30 cases, part of `node tools/studio/selftest.mjs`). Decisions taken while
building: a click already deep-selects, so the first double-click on a layer's own text edits it (nested-instance and
part steps keep their order); Esc in the text editor keeps the text (Figma) and ⌘Z undoes it; drops stay inside the
layer's example (frame), so a per-frame Save never splits a move; a press on an unselected layout's background starts a
marquee (Figma frame behaviour), on the selected one it drags it. Follow-ups: BACKLOG "Figma-like editing functionality".

## 4. Not in this plan (other owners)
Multi-select + wrap (session "Chọn nhiều element vào container"); board layout and resize (Studio owner); Layout
phases 2–7 and Position/Effects/Corner radius UI (their sessions are not running: the user decides who picks them up).

## 5. Limits that stay (by design)
Playground specimens are never edited structurally (their props are bound to playground state); structural ops only in
example and template files; spacing, radius and colour stay token-only; one gesture = one draft edit = one undo step.
