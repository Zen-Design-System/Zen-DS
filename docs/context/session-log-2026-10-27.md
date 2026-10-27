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
