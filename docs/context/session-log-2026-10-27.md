# Session log 2026-10-27

## Zen Studio UI/UX review (read-only research; branch zen/docs/studio-ux-review-20261027, worktree `.claude/worktrees/studio-ux-review`)

The user: "Làm đánh giá toàn diện lại UI và UX của Zen studio". Nothing in `src/` changed; the report is
`docs/research/studio-ux-review-2026-10-27.md` (+ 15 screenshots in `studio-ux-review-2026-10-27/`).

- **Method.** A private Studio server (`tools/studio/e2e/lib/server.mjs` startServer on :5198, pages dir
  `.qa/studio-e2e/.pages-5198` holding copies of `.zen-studio/pages`; removed after) and five Playwright walks from the
  scratchpad (`walk-lib.mjs`: each step → screenshot + status line + Inspector heading + console errors): first look and
  chrome on `quan-ly-task` (31 steps), blank page → dashboard + avatar photo + shapes + prototype (37), keys / click
  depth / panels / dark / 1280 / 1024 / 390 (5 walks), two probes at 100% zoom (⌘D, Delete, ⌘A, Enter, double-click,
  280px Inspector, text edit). axe-core 4.13 + contrast / text-size / focus / Tab-order script on the chrome, light and
  dark. A subagent audited every UI string (≈49,000 literals, 681 JSX text nodes, 14 surfaces) against `words.ts`.
  `npm run studio:e2e -- --only=figma` from the worktree (Giám sát's slot; result in the report §3).
- **Found (P0).** Double-click and Enter land on DOM parts (`div · part of MetricCard`, `span · part of Tabs`) whose
  Design-tab panel is a CSS inspector (Display flex, Padding 24px --zen-spacing-…, className); double-click never
  reaches an instance's text (⌘-click does). After a part selection ⌘A selects the Studio's own UI text and ⌘D /
  Delete go dead until a Layers click; ⌘A with an instance selected does not select its siblings (with the Screen it
  selects all frames, Figma-like).
- **Found (P1).** A page opens at 100% on its overlay frames with the Screen off-screen; Assets inserts stack every
  component full-width with gap 0 (five 1512px blocks for a dashboard); the Prototype Flow list clips its trailing
  column at 320 (17 text nodes); at 390 the tool rail (463px) overflows.
- **Found (P2/P3).** ~40 strings still speak code (file path on the canvas kicker and the Page section, Selected ids,
  Current row id, Accessible name, Action-Slots / Nav-Trailing-Block, harness, dev server, src/, const, useState…);
  multi-line panel notes (Avatar-in-Table ×3, Changes on Desktop, Typography › Vertical, Photos); flat 18-row instance
  forms; dark mode also switches the design's theme; canvas text through the panel gutters; two "Page" sections; Play
  title repeats the page name; a drawn Text shows X 0 / Y 0; fill names "Support / Neutral / Soft" vs "strongest".
- **Fine.** Context menu, ⌘K, shortcuts, zoom menu, shapes, text edit by Enter, ⌘D / Delete / ⌘Z, avatar photo in 2
  steps, dark chrome, 1280 / 1024, Inspector at 280 (no field juts out: BACKLOG P3 line closed), 0 unnamed controls,
  0 text < 11px, neutral focus rings. Open from 10-04: 12px tab labels 3.79:1 (library tone); new library finding: Tabs
  `aria-controls` points at an unrendered panel (axe critical).
- **Proposed (needs the user).** 1 gestures reach layers never parts (L) · 2 keyboard focus guard (S) · 3 open at the
  first Screen (S) · 4 insert like Figma, decision A/B (M) · 5 Flow list + phone rail (S) · 6 words and notes (S) ·
  7 grouped instance properties (M) · 8 dark mode decision · 9 small things · library Tabs aria + tab tone.
- **Figma walk (`--only=figma`, 1056 s): 192 works · 4 broken.** FW-122/123 were the worktree's `pathkit-wasm`
  symlink (a real copy → both pass; memory `worktree-node-modules-caches` updated). FW-177 (right-click › Select all
  with same › Fill: the layer menu never opens on the walk's match page) failed on both tries, in isolation (`--rows`)
  and at fbffa7ea = main before #330; reported to Giám sát for an owner, who found a product bug from #310 (the phone
  Screen's "Add Top / Bottom Navigation" placeholder swallowed the right-click of the layer under it) and fixed it in
  #331 (main ccc0c7d9). By hand the gesture had opened "Shape actions" on a page without a phone Screen, which fits.
  FW-211 (`selectDock` never reaches the Box) failed 3 / 3 here, twice with the real pathkit copy (12:16 on 1ac8c89f,
  12:20 at fbffa7ea), but passes 9 / 9 for its owner on main and on the #331 branch: this worktree's environment,
  cause unknown, not the product. Not fixed here (a docs PR, no E2E baseline touched). Reports `.qa/studio-e2e/
  2026-10-26T21-25-18.md`, `2026-10-27T05-15-39.md`, `2026-10-27T05-18-55.md`.
- Walk gotchas for the next reviewer: probe at a readable zoom (at 10% a double-click on a card's title hits the
  parent's resize handle and sets "height → hug"); the Layers rows of a folded frame are not in the DOM (expand first);
  `pointOfText("8")` finds the Tabs badge before the KPI value; the right `.studio-resizer` has no box until hovered
  (set `panels.right` on the store instead).
- **Approved (user, 2026-10-27, after PR #332 opened):** §7 in the proposed order; §2.4 A (inserts keep their own
  size); §2.9 Dark mode changes the UI only, as Figma. Split by file area into four worktree sessions from main
  (branches in BACKLOG.md Open items); the 12px tab tone went to BACKLOG-user-and-later as the one open question.
  Giám sát told.

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
  centred, never above 100% (Figma's zoom to fit on a fresh file; ⇧1's rule) — while that fit stays at 25% or more
  (`FIT_MIN_ZOOM`; a row of nine frames would open at 9%: thumbnails, not a page; then the first Screen, ⇧1 fits all).
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
| Selection after insert | The inserted component (inside its floating Box, as a wrapped component is selected inside its wrap Stack); the Box when the item is a Stack / Grid / Box / Shape. One undo step. The Box is the component's layer: Delete, ⌘D, a move and a paste beside take it along (`studioWrapOf` now returns a floating wrapper Box as it returns a wrap Stack; `floatWrapOf`, `isFloatWrapper` in slots/actions.ts). |
| Not changed | Drag-and-drop of an asset (lands at the pointer, `freeDropAt`), Paste here / ⌘V (`spotInView`), the MCP / agent inserts (server ops), Top / Bottom Navigation (the Screen's bars), a Table cell's Content slot, an icon on a selected Icon (swap). |
| Status line | "Added Metric card" as now; the refusal texts unchanged. |

E2E: builder B-50…B-54 (insert), structural ST-30…ST-32 (first view, one row, viewport remembered), ids from Giám sát.

### Found while building

- **§2.3's real cause is a focus-scroll, not the first-visit rule.** A Playwright probe on `quan-ly-task` (fresh
  context): at 1.2 s the first-visit view is set (x 328, 100%); at 1.85 s a `<HeadingField … autoFocus />` in the
  Overlay frame "Tạo task · Đang nhập" takes the focus (the page's own prop; #330 stopped the modal's own autofocus,
  not a field's); the Studio's focus guard hands it back to the viewport at once, but at 2.3 s the browser scrolls
  `.studio-viewport` 2793 px to that textarea, and StudioCanvas's scroll handler turns every scroll into a pan: world
  x −2465, the Screen under the Pages panel, exactly screenshot 01. The same pan ran on every reopen, so the saved
  viewport was overridden too. Fix at the owner (StudioCanvas.tsx `onScroll`): the scroll becomes a pan only while the
  focus is inside the world (Interact's Tab); otherwise it is reset and ignored.
- The first view is set once the frames are drawn (`canvas/firstVisit.ts`, polled per animation frame, 8 s deadline),
  because a page you made renders its frames only after its document is read: the key-change effect runs too early.
- `freeBlock` (moved to `edit/freeBlock.ts`, shared with the library target) counts an empty Screen and a Screen without
  an app frame as a frame without auto layout; before, only a Screen with chrome whose content layers all floated was
  one, so the Empty page's inserts, pastes and ⌘V with nothing selected all flowed as blocks.
- `rootSelection` (library target) returned the first floating Box found in a free Screen as the layout to insert into
  (a Box is a drop container): the second insert would have gone inside the first card's frame.

### Walks (private :5180 server, Playwright, 1512 × 982; scripts in the session's scratchpad)

- Empty page → Metric card ×3, Chart card, Table (before → after): five blocks `1512 × 156/288/140` at gap 0 →
  cards `178 × 156` at x 24 · 218 · 412 (y 24), the chart card at x 606 with `width={477}` (288 tall), the Table
  `752 × 140` on a new row at (24, 328) = 312 + 16; the new component selected each time; "Into Screen · <page>" in
  Quick insert; ⌘D duplicates the card with its Box, Delete removes both, four ⌘Z empty the Screen again.
- Empty phone Screen → Metric card at (20, 20) `192 × 156`, a Divider on a new row at the full width 350, a Button
  `142 × 48` on the row below it.
- `quan-ly-task` first open: 56%, the Screen `808 × 539` at (328, 222): it fills the visible canvas between the panels;
  ⇧0 then reload → 100% with the Screen at (12, 11) both times (the viewport remembered in localStorage).
  `hr-expense-overview-2`: its nine frames are one row 9154 px wide (a 9% fit), so its first Screen in board order
  (`screen-2`) fills the view; reload keeps 100%.

### Checks

- `node src/platform/studio/edit/insertPlace.selftest.mjs` 17 ✓, `node src/platform/studio/canvas/firstView.selftest.mjs`
  21 ✓ (both in `npm run studio:selftest`); `node tools/studio/e2e/selftest.mjs` 2127 ✓ (598 rows); `tsc` ✓.
- New E2E rows: builder B-50 (three cards at their size, gap 16, margin 24, the new one selected), B-51 (chart card
  477 wide beside; a Table on a new row), B-52 (nothing selected → the margin corner, then beside the last layer; ⌘Z one
  insert at a time), B-53 (in a Stack the insert goes after the selected Text, in flow), B-54 (⌘D and Delete take the
  Box along); shell ST-30 (three rows → the Screen fills the view), ST-31 (one row → fit), ST-32 (the viewport
  remembered after coming back and after a reload).

