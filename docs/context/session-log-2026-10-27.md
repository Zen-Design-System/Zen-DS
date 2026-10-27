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

## Studio UX review §7 items 6–8: words and notes, grouped instance properties, Dark mode UI-only (tier S + M + S)

Branch `claude/studio-words-props-dark-20261027-b8fcaa` (the BACKLOG line names it `zen/fix/studio-words-props-dark-20261027`;
corrected there). Evidence: `docs/research/studio-ux-review-2026-10-27.md` §2.7–2.9, §6 (40 rows), screenshots 08, 09,
11, 14, 15. File area: `words.ts` + labels, panel notes and tooltips, the Inspector's instance property form, `store.ts`
chromeTheme and the frames' theme binding. Strings in `select/*` went to session studio-gestures, "Add screen" and the
Page section's layout to studio-panels-small (Giám sát's split, 2026-10-27).

### Spec card · item 7, instance properties grouped (written before building)

- **Groups, in order:** Content · Look · Behaviour · Advanced, inside the one Properties section. Content and Look open;
  Behaviour and Advanced folded, their header counting the props written in the source ("2 set"); a click opens one,
  remembered for the session per group. (Built: a folded group stays folded even when it holds a set value — the count
  says so — after the first E2E run showed a template's `format` and a Table's `sort` opening them on every selection.) A group with no rows is not drawn. Figma's nested-layer groups (Top-Heading-Text…)
  stay after the four, as before. Code-only props (ids, links, handlers) stay on the Code tab for components with Figma
  groups; a component without them puts them in Advanced.
- **Where a prop lands** (`inspector/propCategories.ts`, pure, first rule that holds):
  1. a per-component override;
  2. a Figma variant or set (Type, Variant, Size, Appearance, Level, State) → Look; a Figma layer boolean (Trend, Counter,
     Hint, Label-Icon…) → Content, first in the group in Figma order, then the instance's Text, then the rest in API order;
  3. the name says Advanced: `aria-*`, `data-*`, id, idPrefix, name, as, href, target, rel, role, tabIndex, htmlFor, form,
     locale, currency, format, formatter, getRowId, headingLevel, seriesLabel (an accessible name), refs, functions;
  4. a boolean → Behaviour, unless it is a look word (fullWidth, bordered, striped, dense, compact, inverse, flat, rounded,
     elevated, inline, wrap, noWrap, truncate, block, fill, outlined) → Look, or show*/hide*/with* → Content;
  5. a string union → Look, unless sort*/edit*/mode/trigger → Behaviour;
  6. a number: value/count/total/amount/progress/percent/rating/score → Content; min/max/step/delay/duration/timeout/
     limit → Behaviour; columns/span/rowSpan/gap/lines/maxLines/width/height/opacity/thickness → Look; else Content;
  7. anything else (text, ReactNode, icon, picture, list, object) → Content.
- **Metric card:** Content — Trend, Counter, Metric-Color (switches), Value, Label, Sub action, Values, Goal, Comparison
  columns, Categories, Footer, Custom, Hint, Label icon, Icon · Look — Type, Variant, Size, Theme, Color, Surface, Spacing,
  Icon theme, Icon background, Icon size, Column span, Row span · Behaviour — Animate · Advanced — Values name (screen
  readers), Currency, Format, Heading level.
- **Button:** Content — Leading icon, Trailing icon, Text · Look — Appearance, Level, Size, State · Behaviour — Disabled
  (when written) · Advanced — none (type and ref are on the Code tab).
- **Table:** Content — Caption, Columns, Rows, Empty state · Look — none · Behaviour — Selectable, Selected rows, Selected
  rows at first, Editable, Bulk actions, Sort, Open row · Advanced — Name (screen readers), Row id field.
- **Empty rows:** an unset text or number field shows its default as the placeholder, else "Not set" in the placeholder
  tone (a slot: "None"). Every row stays the same PropField with the same `data-prop`; only its group changes, so values
  round-trip as before.

### Built

- **Item 6, words and notes.** `words.ts`: phrases for the engine's refusals and the status line (rows 2, 9, 10, 11, 12,
  13, 16, 17: "This needs a newer Studio — ask whoever runs it to restart it", "checks passed", "— ${message}" for a line
  number, "This is part of the docs page, not of the example", "Select the layer again", "The page's code has an error —
  see the Code tab"), seven new code words the selftest guards, and `layerLabel(name)` — a Figma layer or slot name as
  words ("Action-Slots" → "Actions", "Nav-Trailing-Block" → "Trailing", "Leading-Icon-Src" → "Leading icon"); the name
  stays the key (slots, groups, Figma push), labels, aria-labels, canvas slot tags and undo lines read through it (row
  23; E2E B-27, SP-19 click "Add to Actions"). The owning components got rows 1, 3–8, 14, 15, 18–22, 24–27, 29–40 as
  the table's rewrite column says (gate.ts, localApi, frameMove "Can edit", ignoreAutoLayout, detach "not an instance",
  boardPaste, assets "a page you made", TableCellPanel "Row" / "Cell" / "Open button", cellInstance, dataItems "shared
  data", picture, SelectionActions (the halves in the buttons' tooltips), BreakpointSection, breakpointBehaviours "App
  shell: phone layout", propSchema labels "Name (screen readers)" / "Selected rows" / "Open row" / "Empty state" /
  "Values" / "Column span" and the AppShell / Header / PageHeader slot words, PropField "Follows the … switch", palette,
  frames "Properties · X", BuilderBoard and PagePanel without a path ("A page you made · saved in this browser and on
  this computer"), MyPages without `.zen.tsx`, DraftsControls, Agent "Zen Agent is offline", NewPageDialog "App shell",
  share / OpenOnPhone / DetachAction / api.ts "Studio server", US spelling in sample content). Not done here, by
  Giám sát's split: `select/SpacingLayer.tsx` (row 28) and the badge side of row 1 with studio-gestures, "Add Screen" with
  studio-panels-small (messages sent; the hand-over note is in the side-session notes folder). Row 22's
  `appearance/VariableModes.tsx` "Component Theme" stays: those are Figma's collection names (E2E VA-xx reads them).
  - Notes to one line: `SectionNote({ text, more })` in `Section.tsx` — the line, then an XSmall info IconButton whose
    tooltip (and aria-label) holds the rest; `.studio-inspector__note-line` keeps the text to one line. Used by the
    Avatar-in-Table panel (×3), "Changes on Desktop", the Breakpoint copy note, Photos; Typography › Vertical reads
    "Needs a taller box: Height Fixed or Fill" (one line as a hint).
  - The size badge's rule notes: `inspector/sizeNote.ts` (a store the canvas publishes to) and a Caption note under the
    Inspector's Size group (`[data-size-note]`); the canvas side (ResizeLayer no longer folding the reason into the pill,
    publishing it instead) is studio-gestures' change.
  - One term each: Screen (capital, the layer kind; a drawn frame stays "Frame N"), Can edit (frameMove), Present (the
    mode; "Preview modes" is the modes panel, "Interact" the tool — three things, unchanged), Studio server (every raw
    "dev server" string and the words rule), "a page you made" (assets, palette, the kicker). "Snippet not updated" →
    "Example code not updated" (one line with Inspector.tsx).
- **Item 7, grouped instance properties.** `inspector/propCategories.ts` (pure; selftest in `studio:selftest`): the spec
  card's rules, with `BEHAVIOUR_NAMES` (selected / current / open … ids and keys), `LOOK_NAMES` (a type alias such as
  DockIconTheme) and per-component overrides (Button State → Look, Table bulkActions / sort → Behavior, Metric format →
  Advanced). `GroupedProperties.tsx`: `PropertyGroup` (a disclosure header with the name and "n set" while folded;
  `data-property-group`, `data-open`, `data-props`), Content = Figma booleans + the instance Text + content rows, Look =
  Figma variants + look rows, Behavior and Advanced folded (the header counts what is set); a group opened or closed stays
  so for the session (module `openGroups`). Figma's nested-layer groups follow as before. `FLAT_GROUPS`: a component without
  Figma groups (Table) goes through the same groups, its code-only props (aria-label, as, id…) in Advanced, its object and
  array props edited in their group (the old flat branch of DesignPanel and the one section per object prop are gone).
  PropField: an unset text without a default reads "Not set" (a slot "None"). The label is "Behavior" (US spelling, the
  words selftest's rule), the spec card's "Behaviour" being the review's word.
- **Item 8, Dark mode UI only.** `shell/modes.ts`: `setStudioTheme` writes `chromeTheme` alone; `setPreviewTheme` (new)
  is the frames' Mode, which Present's Modes panel calls (`ModesMenu.tsx`); `store.ts` no longer copies `chromeTheme`
  into `preview.theme` on load (one block, so first-view-insert's viewport block merges beside it).
- **E2E (new rows, baseline `works`):** I-35 Metric card groups (order, Trend / Type / Size placed, Behavior and
  Advanced folded, Animate and Heading level on opening, Currency placeholder "Not set", opened groups remembered),
  I-36 Button groups + Size → `sm` and Disabled on / off through the folded group, I-37 Table (flat) groups + no
  "Selected ids" / "Accessible name", "Name (screen readers)", Selectable on / off, I-38 the kicker and the Page section
  without a path, S-08 Dark mode darkens `.studio-app` and leaves `.studio-world`'s data-theme, S-09 the Changes on
  Desktop note and the Photos hint one line with an info button. Rows I-02, I-03, I-04, K-02 open the folded group
  first (`openPropertyGroup` in lib/studio.mjs).
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
| `--only=figma` (whole group, default retry; on the merge with main 8c21a815) | **200 works · 0 broken** (984 s); 8 passed on their retry (FW-193, 201, 25, 64, 113, 56, 142, 205: timeouts under load), all 8 pass alone with `--no-retry` (42 s) |
| After the merge with main f20fb85c (#334 … #336): `--rows=FW-255,FW-256,FW-257,FW-258 --no-retry` · `--only=starters --rows=SP-18` · `--only=data --rows=DA-02` | 4 + 1 + 1 works |
| `npm run qa -- --files=<the 10 edited Studio files>` (`npm run qa` alone says "Nothing to check": the hook records no edits made through scripts) | first run: static gates pass but the words self-test flagged "what it renders" on the Code tab's part note (reworded); second run: static gates pass, the Studio E2E matrix 387 works · 1 broken (NO-08: the double-click on a Card's Sub-Action icon reached the Icon at once, as the approved gesture does, where the row expected IconButton first) — the row follows the gesture now (Icon, Escape → IconButton, Enter → Icon; `--only=nested --rows=NO-08,NO-09,NO-04 --no-retry` 3 works); third run **Build-QA PASS**: static gates ✓, Studio E2E matrix 388 works · 0 broken (2018 s, 4 shards; B-49 passed on its retry, HO-21 a new row of another session) |

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

E2E rows changed with the behaviour (§7.1 approved): NO-08 (a Card's Sub-Action icon: the double-click reaches the
Icon in one step, Escape climbs to the IconButton, Enter goes back in; before: IconButton, then Icon), SP-18 (a double-click on a Metric card's icon reaches the icon
layer, Escape climbs to the Metric; before: the double-click gave the Metric) and DA-02 (the first double-click on a
.map row's text selects the text, the second edits the data item; before: one double-click edited).

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

### Proof (after merging main f20fb85c)

- `npm run studio:e2e -- --rows=<new + changed rows> --no-retry`: the first run found four locators my words had moved
  ("Page with AppShell" in `newPage`, "Add to Footer-Content", "Body-Content" tags, "Label-Icon" switches) and the
  templates' `format` / `sort` opening Behavior and Advanced on every selection; fixed (folded groups stay folded, the
  header counts), the rerun of the 13 rows passed 12/13 and I-37 after its Columns check read the block's header.
- `npm run studio:e2e -- --only=inspector,instance,shell,keyboard`: 73 works · 0 broken (215 s), I-35…I-38, S-08, S-09
  among them.
- `npm run qa -- --isolated --files=<the 66 edited files>`: the first gate found five more rows reading the old words
  (B-35 / B-06 the refusal "keeps state or code" → "needs interactions", B-28 "Add Item to Item-List", BP-06 "Mobile
  version of", SP-15 a Chip's Dropdown folded into Behavior — booleans that draw a layer are Content now) and the
  usage guard's `icon-button/needs-action` on the note's info IconButton (a plain button with Zen's icon tooltip now, as
  the Pages panel's storage info). Second gate: static gates green, Studio E2E 394 works · 0 broken (4 shards, 1610 s),
  `.qa/reports/2026-10-27T15-56-29-b49d74ab.md`. I-37 passed on retry in both gates: I-36 before it opens Behavior and
  `openGroups` is the session's, so I-37 asserts the groups' order, not their open state (I-35 checks folding on a
  fresh page). HO-21 (main's new row) recorded as works.
- Merged main 82a2491b (#337: the badge publishes to `sizeNote`, SpacingLayer's note in design words): `sizeNote.ts`
  keeps the shared shape plus `useSizeNote`; `tsc`, `style:check` and `studio:selftest` after the merge.
- `npx tsc --noEmit -p .`, `words`, `propGroups`, `propCategories` and the E2E fixture selftests, `npm run style:check`:
  green.
