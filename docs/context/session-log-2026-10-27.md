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

## Studio UX review §7.5, §7.9, §7.10 — Flow list, phone tool rail, the small things, Tabs `aria-controls` (session panels-small, tier S each)

Worktree `.claude/worktrees/studio-panels-small-20261027-531d1e`, branch `claude/studio-panels-small-20261027-531d1e`
(Studio) and `zen/fix/tabs-aria-controls-20261027` (library). Evidence: `docs/research/studio-ux-review-2026-10-27.md`
§2.5, §2.6, §2.10, §5 (PR #332).

**§7.5 · Flow list at 320 / 280 (`builder/proto/PrototypePanel.tsx` rows).** Cause: `.studio-inspector__items` (the
Flow `ul`) is a grid item with `min-width: auto`, so the section's auto track took the list's min-content width (the
nowrap names), and the row's button (`width: calc(100% + 8px)`) shared the `li` with the 24px ▷. Fix: `min-width: 0`
on the list (inspector.css) and `.studio-prototype__frame > .studio-inspector__item { width: auto; flex: 1 1 auto }`
(builder.css, as slots.css already did): the name ellipsizes, "Start" / "Overlay" stay whole. E2E PT-29 (long names,
320 then the 280 minimum through the resize handle's keys, back to 320).

**§7.5 · The phone tool rail (`canvas/CanvasTools.tsx`).** Under 600px (`PHONE_QUERY`, `useMedia` now exported from
`shell/layout.ts`) the rail is Move · Hand | Frame | Shape | Text | More, and More is a Menu with Scale, Pen, Pencil,
Image, Comment (Stack and Interact on an example page), Assets and Zen Agent, each with its key; the button is pressed
while one of them is the tool. The full rail (`FullTools`) is unchanged; `ToolButton` is shared.

**§7.9 · §2.10, one line each.**
- Gutters: `--studio-canvas-color` on `.studio-canvas-area` (`:has()` of the viewport's `data-canvas-background`),
  and `::before` / `::after` strips in that colour under each docked panel's column (z 21, studio.css); not on a
  document page, hidden under the App Shell full screen.
- One Page section (`inspector/PagePanel.tsx`): the header block + "Page" section became one `InspectorSection`
  "Page" (Name, Mobile OS, Background, Project; the "A page you made, saved…" line as its note; Export… in its title
  row); a docs page keeps the header block alone. E2E I-32.
- Local styles (`inspector/LocalStyles.tsx`): the note "Edit styles in Figma" is now a title-row button "Edit in
  Figma" ↗ (the Zen file, the same URL as the docs' Download Figma).
- Preview modes (`PagePanel.tsx`): seven label · value rows (`InspectorRow compact`), not one sentence.
- Play's bar (`builder/proto/Player.tsx`): a Screen named after the page ("Quản lý task · Danh sách") is read once.
- Text X / Y (`position/PositionSection.tsx`): a layer floating in a Box around it (a drawn Text) shows the Box's X / Y
  (`geometry.box`, the Box's written `insetLeft` / `insetTop` when there are any) and typing moves the Box (`applyEdit`
  on the Box with its hash; `useFloatBox` re-reads it on each source update).
- Fill names (`inspector/palettes.ts`): a text's tone reads as its variable in Figma's words, "Neutral / Strongest",
  "Support / Blue / Light", as a shape's "Support / Neutral / Soft".

- "Add screen" → "Add Screen" (PrototypePanel.tsx, the undo label in addFrame.ts, the E2E locators in builder.mjs,
  prototype.mjs and build-check.mjs): one spelling with "Make a separate Screen" (asked by session words-props-dark,
  §6; Giám sát handed it to this branch).
- The Page section's title is the panel's h2 with nothing selected (`InspectorSection level={2}`, new prop, default
  3), so the Inspector keeps an h2 → h3 hierarchy in every state. E2E helpers `newPage` (builder.mjs) and the build
  check waited for `#studio-right h2` to read the page's name: they wait for the page's row in the Pages list instead
  (the committed title; the Name field shows the draft while typing).
- The Inspector's tabs not shown and a document page's Layers tab keep an empty hidden `TabPanel`, so every tab's
  `aria-controls` names an element (`Inspector.tsx`, `StudioApp.tsx`; axe 0 dangling, was 2 + 2).

**Measured** (Playwright on a private E2E-style server, port 5198, a copy of `quan-ly-task`; the browser pane stops at
the Google sign-in): Flow list text nodes outside the panel 0 / 33 at 320 (4 names ellipsized) and 0 / 33 at 280 (7
ellipsized); tool rail at 390×844 278px wide (was 463), `scrollWidth` 390, More lists 7 tools and reads pressed while
Pen is the tool; with a Screen dragged across the left window edge, hiding the board changed 0 pixels in each 8px gutter
and 187,690 in the visible canvas; one "Page" heading, 0 header blocks, 7 mode rows, "Edit in Figma" present; Play's
bar "Quản lý task · Danh sách"; a Text drawn in a free Screen reads X 150 / Y 120, X typed 300 moves its Box to 300px
("Saved · ⌘Z to undo"), ⌘Z back to 150 ("Undid “Text X → 300”"); its Fill "Neutral / Strongest"; axe
`aria-valid-attr-value` 0 on the Studio page (12 tabs). Scripts: the session's scratchpad (`measure.mjs`, `walk.mjs`).

**Gate** (`npm run qa -- --isolated --files=<19 files>`): static gates, Studio self-tests, guidelines, TypeScript ✓.
Run 1: Studio E2E 385 works · 3 broken — NO-02 / NO-07 / NO-08 picked the Icon's tone by its old label "accent-base"
(now "Accent / Base"): locator changed, the three rerun 3 works; PT-29 and I-32 recorded with `--update-baseline`.
Run 2 (final code): shards 1 and 3 259 works · 0 broken, but shard 2/3 was stopped at its 42-min limit with no report
(its first row LB-15, the six-chart insert that timed out in the 2026-10-25 gate too; the machine was under load) →
the gate's verdict was FAIL. Shard 2 rerun alone on the same code: 129 works · 0 broken in 554 s. Every row of the
matrix passed on the final code (388), across run 2's shards 1 + 3 and the shard 2 rerun, not in one gate run; a
single green run is left to the slot's owner (reported to Giám sát).

**§7.10 · Tabs `aria-controls` (`src/components/Tabs/Tabs.tsx`, own PR).** `aria-controls` is set only when `idPrefix`
is given (only then can a TabPanel pair with the tabs); a generated prefix pointed at a panel that never existed (axe
`aria-valid-attr-value`, critical, on every page with panel-less Tabs). Guideline + story note updated; the 12px tab
tone (3.79:1) stays the user's question.

## Tabs `aria-controls` only with an idPrefix (session panels-small, library half of UX review §7.10, tier S)

Branch `zen/fix/tabs-aria-controls-20261027` from main. `Tabs` set `aria-controls="<prefix>-panel-<id>"` on every tab,
a generated prefix included, so Tabs without TabPanels (the review's `quan-ly-task` page, apps alike) pointed at an id
that does not exist: axe `aria-valid-attr-value`, critical, 2 per page (§5). Now the attribute is set only when
`idPrefix` is given — only then can a TabPanel pair with the tabs; JSDoc, the guideline's Panels row and a11y line and
the story note say so (`npm run guidelines:build`). Measured on the Studio page (12 tabs): 0 violations, 0 tabs whose
`aria-controls` names nothing (was 2). The smoke fixture renders its panels, so the axe baseline is unchanged. The
12px tab tone (3.79:1) stays the user's question. Gate: `npm test -- tests/smoke` 448 passed · 11 skipped;
`npm run qa -- --isolated --pages=tabs --files=Tabs.tsx,Tabs.stories.tsx,guidelines.source.mjs` PASS (static gates,
guidelines + AI UI catalog in sync after `npm run ai-ui:build`, TypeScript, Vitest 94/94, platform audit 1512 + 390 +
320 0 errors, dark 0, behaviour 0; two contact sheets looked at: no visual change, as expected of an ARIA-only fix).
