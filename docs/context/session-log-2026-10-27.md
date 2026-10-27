# Session log 2026-10-27

## Studio E2E FW-177 / FW-211 (Giám sát, tier S)

The user asked for this in the Giám sát session. The UX review found both rows broken on main 1ac8c89f with
`--only=figma` (the gate's matrix does not run the figma group).

- **FW-177, a product bug from #310 (responsive P1).** While a layer in a phone Screen is selected, the Screen shows the
  dashed "Add Top / Bottom Navigation" placeholder (`PartPlaceholder`, runtime.tsx; z-index 21, frame chrome) over its
  edge. The match page's accent Rectangle sits under the top one. Over frame chrome the selection layer's capture lets
  the pointer through (`setPassThrough`), so the right-click reached the placeholder button, which has no menu: "the
  layer menu: Timeout … (menus: none)". `elementFromPoint` at the click was `button.studio-builder-screen__placeholder`.
  - Fix in `select/SelectionLayer.tsx`: a capture-phase `contextmenu` listener on the world hands a right-click on
    `[data-studio-placeholder]` back to `onContextMenu`.
  - Its `pick(x, y, through)` skips the placeholder and finds the layer under it, as Figma's right-click always does.
  - The placeholder's click still adds the part (BP-04).
- **FW-211: not reproduced.** On main and on the fix branch it passed every time: 1 + 3 + 5 runs with `--rows`, plus
  the figma group. The UX review's failures (`selectDock` never reaching Box) look like that run's environment: its
  worktree had the pathkit-wasm symlink that also broke FW-122/123.
- **Proof.**
  - On 1ac8c89f, `--rows=FW-177` fails 1/1.
  - On the fix, `--rows=FW-177,FW-211 --no-retry` passes 8/8 for each row.
  - `--only=figma,breakpoints --no-retry` in one run: 205 works and 8 broken (FW-196, 27, 65, 90, 153, 125, 205,
    236), all timeouts. All 8 pass when run alone (43 s). A long single-tab run times out without retries; not this
    change (cf. BL-01's heap growth, #327).
  - `tsc` passes.

## Studio gestures reach layers, keyboard focus guard (UX review §7 items 1–2, tier L)

Branch `claude/studio-gestures-20261027-17240d` (worktree from main ccc0c7d9). The user approved the review's §7 list
in order; this session owns items 1 (P0, L) and 2 (P0, S). Evidence: review §2.1, §2.2, §4, screenshots 03/04/05/15.

### Spec (what Figma does → what the Studio does now)

| Gesture | Before (review) | Now | Where |
| --- | --- | --- | --- |
| Double-click an instance's words | `div · part of MetricCard`, a CSS inspector (Display flex, Padding 24px, className) | the text layer under the pointer, as ⌘-click finds it (`deepLayerAt`): `Text · part of MetricCard`; a nested instance (an Icon, a Badge) when the words are its own; an item's text its item, a section title its Section-Title | `select/SelectionLayer.tsx onDoubleClick` (`enter`) |
| Double-click again on the text | stayed, or went to another div | edits the words in place (`tryStartTextEdit`); words from data stay and the status says where they are edited | same |
| Double-click with a nested instance selected | `drillPart`: the next DOM node | the text or nested instance inside it under the pointer, or beside it; never a DOM part | same (`samePart`) |
| Double-click a Text / Heading / HTML text | edited | edited (`TEXT_LAYER` first) | same |
| Enter on a selected instance | `Card · part` → `div · part` → `div · part` | one level in to its first layer: a data item, a nested instance or a text (`firstLayerPart`), never a DOM part; a leaf (an icon) stays | `select/layerParts.ts`, `SelectionLayer.tsx` Enter |
| A click inside the owner of a selected part, ⌘-click on the selected instance | `deepPartAt`: nearest component or DOM node | the text / nested instance / item / section under the pointer; the owner's padding keeps the owner | `SelectionLayer.tsx partAt` |
| The Design tab of a part | Attributes, Text style, Layout (Display, Direction, Gap, Padding), Size, Selection colors | a text: Text (editable where the owner holds it, read-only from data), Typography (style + Figma's style details), Fill; a nested instance: its properties / overrides and Size; a bare DOM part: a note "Not a layer of its own — select X, or a text or nested instance in it". The CSS block is the Code tab's (`PartCodeDetails`) | `inspector/PartPanel.tsx`, `inspector/Inspector.tsx` |
| After a double-click into an instance | focus jumped to the Inspector's Text field (`zen-studio:focus-content`) | the canvas keeps the focus; textEdit's own fallback for uneditable words stays | `SelectionLayer.tsx` |
| ⌘A with a part selected | fell through to the browser: the whole UI's text turned blue | the items of its slot (a tab, a crumb; `itemSelection`), else its owner and the owner's siblings; `preventDefault` always | `edit/figmaKeys.ts selectAllParts` |
| ⌘A from a Layers row or an Inspector switch | the browser's select-all | Figma's Select all (as Delete already worked from there) | `figmaKeys.ts` |
| ⌘D / Delete with a text or nested instance selected | nothing | the owner duplicates / is removed (Figma lets no layer be added or removed inside an instance; the user's list says the keys work in every state); a data item or section as before; ⌘Z undoes | `StudioApp.tsx` |

Deliberate deviation from Figma, per the user's approved list: Figma's ⌘D / Delete on a layer inside an instance do
nothing; here they act on the instance the person went into (the status line names it, ⌘Z undoes).

Two strings in `select/` for the words-props-dark session (§7 item 6, split by Giám sát by file owner, no logic change):
the size pill reads "W × H" alone and its rule notes ("Height comes from the Table itself", a px-capped Chip, a refused
wrap) go to the new store `inspector/sizeNote.ts` (`publish` / `get` / `subscribe`, null on deselect), which that
session's Inspector shows under Resizing; the canvas note on a bound gap or padding is one line, "Card · Horizontal
padding is set in code — change it in the Code tab" (`propLabel`, no expression), the Playground line stays. SE-10 and
SE-25 read the pill but assert only its handles.

Not touched (other owners): `words.ts` strings and the part panel's remaining notes (words-props-dark), the Page section
and toolbar CSS (panels-small), the insert path (first-view-insert). The Layers panel already lists only texts and
nested instances for an instance (`namedParts`, 2026-10-13); its "show all" mode keeps the Parts folder on purpose.

### Evidence

| Check | Result |
| --- | --- |
| `npx tsc --noEmit -p .` | passes |
| Hands-on walk (Playwright on a private server :5186, the user's `quan-ly-task`) | pending the gate slot |
| `npm run studio:e2e -- --only=figma --rows=FW-255,FW-256,FW-257,FW-258` | pending |
| `--only=starters --rows=SP-14,SP-18,SP-19` · `--only=data --rows=DA-01,DA-02` · `--only=select --rows=SE-09` | pending |
| `--only=figma` (whole group, default retry) | pending |
| `npm run qa` | pending |

E2E rows changed with the behaviour (§7.1 approved): SP-18 (a double-click on a Metric card's icon reaches the icon
layer, Escape climbs to the Metric; before: the double-click gave the Metric) and DA-02 (the first double-click on a
.map row's text selects the text, the second edits the data item; before: one double-click edited).
