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
| Hands-on walk (Playwright on a private server :5186, a copy of the user's `quan-ly-task`, 1512×982, zoom 67% on the first Metric card) | passes, see the walk table below |
| `npm run studio:e2e -- --only=figma --rows=FW-255,FW-256,FW-257,FW-258 --no-retry` | 4 works, twice in a row (35 s, 37 s) |
| `--only=starters --rows=SP-14,SP-18,SP-19` · `--only=data --rows=DA-01,DA-02,DA-08,DA-09` · `--only=select --rows=SE-09,SE-31,SE-33` | 3 + 4 + 3 works, no retry needed |
| `--only=figma` (whole group, default retry) | pending |
| `npm run qa` | pending |

The walk, in "you do → what happens" form (after the merge with main 8c21a815):

| You do | What happens | Figma? |
| --- | --- | --- |
| Open the page | 100% at the overlays, the Screen off screen (x = −2201; §2.3, the first-view-insert session's) — ⇧1, a click on the cards' row, ⇧2 | — |
| Click "Tổng task" | Frame (the Grid), focus on the canvas | ✓ |
| Double-click | MetricCard | ✓ |
| Double-click | `Text · part of MetricCard`, Design tab: Text (Label "Tổng task", editable), Typography (Body/Extra/Medium + style details), Fill (#121212 token); focus stays on `.studio-viewport`; the canvas tag reads "Tổng task in MetricCard" | ✓ |
| Double-click | the words edit in place (`contenteditable`); type "Tổng việc", Enter → "Saved · ⌘Z to undo"; ⌘Z → "Undid MetricCard label → Tổng việc" | ✓ |
| Escape, Escape | Metric · part of MetricCard (Properties, Size) → MetricCard | ✓ |
| Enter, Enter (MetricCard selected) | Metric → Text (never a div) | ✓ |
| ⌘-click the title, ⌘A | "4 layers" (the Grid's four cards), `window.getSelection()` empty | ✓ |
| ⌘-click the title, ⌘D | "Duplicated MetricCard · ⌘Z to undo", 16 → 17 cards, the copy selected; ⌘Z → 16 | ✓ (Figma: nothing inside an instance) |
| ⌘-click the title, Delete | "Removed MetricCard · ⌘Z to undo", 15 cards, nothing selected; ⌘Z → 16 | ✓ (same) |
| Code tab with the text selected | Example code, Attributes, Text style, Layout, Size, Selection colors, Code (the CSS block, off the Design tab) | — |
| ⇧Enter, ⇧Enter | Metric → MetricCard | ✓ |

First run of the walk: ⌘D / Delete acted on the owner but the part selection outlived the removed card (the store still
held it); fixed by selecting the owner before the action (fe189785), which also selects the copy after ⌘D.

Two harness findings on the way (not the product):

- FW-256's first run: a ⌘-click on the Metric's words with the Metric selected kept the Metric (`partAt` kept the selected
  part when the cursor was on it, a plain click's rule); ⌘-click now goes to the deepest layer there too (fe189785's
  follow-up in `partAt`'s `deepSelect` flag).
- FW-258: the ⌘Z Playwright sends right after a ⌘D was lost on its way to the document — no keydown reached a
  capture listener on `window`, 3/3 on a page a previous row had used, 1/2 after a reload, and with a plain layer's ⌘D
  (a throwaway row) just the same — while a keydown dispatched from inside the page (`__e2e.keyPrevented`) undid the
  copy at once ("Undid Duplicate MetricCard"), so the product's ⌘Z handler is sound (FW-12, FW-18, FW-66 press it; the
  hands-on walk's ⌘Z after ⌘D worked). Cause not found (1 page, 1 frame, focus on the viewport, `document.hasFocus()`
  true, Shift and Meta presses a moment later did arrive). FW-258 undoes through the panel's Undo button (the same
  `undoEdit`); `undoTo` now names the first differing line, the undo stack and the status when it fails, and waits a
  frame between the focus and the key.

E2E rows changed with the behaviour (§7.1 approved): SP-18 (a double-click on a Metric card's icon reaches the icon
layer, Escape climbs to the Metric; before: the double-click gave the Metric) and DA-02 (the first double-click on a
.map row's text selects the text, the second edits the data item; before: one double-click edited).
