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

## Studio: open at the first Screen + insert like Figma (§7.3–4 of the UX review, tier S + M)

Branch `claude/studio-first-view-insert-20261027-2f7881` (the app's name for `zen/fix/studio-first-view-insert-20261027`
in BACKLOG), worktree `.claude/worktrees/studio-first-view-insert-20261027-2f7881`, from main ccc0c7d9. Evidence:
`docs/research/studio-ux-review-2026-10-27.md` §2.3, §2.4, §4 (w1-01…03, w2-05…13), screenshots 01 and 02. The user's
decision for §2.4: **A**, an inserted component keeps its own size and lands beside the selection with the page gap.

### Spec card (written before building)

**§7.3 · A page opens at its first Screen.**
- When: a page you made (`local:<id>`) opens with no viewport saved for it in this browser. Docs pages keep their rule
  (the Playground's width, `FIRST_VISIT_MIN_ZOOM`).
- Wait for the board: the first-visit view is set once the page's first Screen frame is registered, placed (its
  `left`/`top` written by BuilderBoard's layout effect) and measured; a pan or zoom made before that wins. Deadline 8 s.
- One row of frames (the frames' union is no taller than 1.25 × the tallest frame): zoom to fit every frame, whole and
  centred, never above 100% (Figma's zoom to fit on a fresh file; ⇧1's rule).
- Else the first Screen (board order = source order; a Screen before any Overlay): whole and centred at ≤ 100% with a
  48 px margin; a Screen much taller than wide (the height-fit zoom under ¾ of the width-fit zoom) fits its width, its
  top 48 px under the canvas top, centred across (`presentFrame.ts`'s rule). A page without a Screen: its first frame.
- Remembered: the viewport (`{ x, y, zoom }`) is saved per page key as before (debounced 250 ms), and moves from
  sessionStorage to localStorage (`zen-studio:prefs` beside role / theme / panels), the newest 200 pages kept, so a
  page reopens where it was left after a reload, in a new tab and after a restart, as Figma reopens a file.
- Pure helper `canvas/firstView.ts` (+ selftest): `firstViewOf(frames)` → `{ kind: "fit" } | { kind: "frame", rect }`.

**§7.4 · Insert from Assets / Quick insert, decision A.**
| Element | Rule |
| --- | --- |
| Where it lands, in a layout | Unchanged: into the selected layout as its last layer, else right after the selected layer in its parent; the layout's own gap and sizing rule apply (a Stack column stretches cards as it does for every child). |
| Where it lands, in a frame without auto layout (a Screen with no layout root, a Box whose layers all float, an empty one) | The new layer floats (`position="absolute" insetLeft insetTop`, the server's `floatAt` / `floatingCode`): **beside the selection**, to its right, the page gap apart, tops aligned. When that spot would run past the frame's content width (estimated with the new layer's width when known, else the selection's), a **new row**: at the page margin, the page gap under the lowest layer. Nothing selected (or a frame selected): beside the frame's last layer; an empty frame takes the first layer at the page margin corner. |
| Size | Its own: a component floats in a Box of its own with no width or height (shrink-to-fit); Stack / Grid / Box / Shape float themselves. A component with no width of its own (the Charts group: a chart plot is `minmax(0, 1fr)` and collapses) gets its Box the widget width: a third of the content row, `(W − 2·margin − 2·gap) / 3` (477 on a 1512 Screen), at least 320; on a phone the full row. Never the Screen's width. |
| Page gap · margin | Gap `md` 16 (Spacing/Gap/Medium: the widget gap of component-usage-rules §13 and the dashboard rule); margin `margin-comfortable` 24 on desktop / tablet, 20 on a phone. Constants in `edit/insertPlace.ts` (pure, + selftest), read by the click insert only. |
| Selection after insert | The inserted component (inside its floating Box, as a wrapped component is selected inside its wrap Stack); the Box when the item is a Stack / Grid / Box / Shape. One undo step. |
| Not changed | Drag-and-drop of an asset (lands at the pointer, `freeDropAt`), Paste here / ⌘V (`spotInView`), the MCP / agent inserts (server ops), Top / Bottom Navigation (the Screen's bars), a Table cell's Content slot, an icon on a selected Icon (swap). |
| Status line | "Added Metric card" as now; the refusal texts unchanged. |

E2E: builder B-50…B-54 (insert), structural ST-30…ST-32 (first view, one row, viewport remembered), ids from Giám sát.
