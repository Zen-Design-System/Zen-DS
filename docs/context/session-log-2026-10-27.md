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

**§7.10 · Tabs `aria-controls` (`src/components/Tabs/Tabs.tsx`, own PR).** `aria-controls` is set only when `idPrefix`
is given (only then can a TabPanel pair with the tabs); a generated prefix pointed at a panel that never existed (axe
`aria-valid-attr-value`, critical, on every page with panel-less Tabs). Guideline + story note updated; the 12px tab
tone (3.79:1) stays the user's question.
