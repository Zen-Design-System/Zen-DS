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

## Studio UX review §7 items 6–8: words and notes, grouped instance properties, Dark mode UI-only (tier S + M + S)

Branch `claude/studio-words-props-dark-20261027-b8fcaa` (the BACKLOG line names it `zen/fix/studio-words-props-dark-20261027`;
corrected there). Evidence: `docs/research/studio-ux-review-2026-10-27.md` §2.7–2.9, §6 (40 rows), screenshots 08, 09,
11, 14, 15. File area: `words.ts` + labels, panel notes and tooltips, the Inspector's instance property form, `store.ts`
chromeTheme and the frames' theme binding. Strings in `select/*` went to session studio-gestures, "Add screen" and the
Page section's layout to studio-panels-small (Giám sát's split, 2026-10-27).

### Spec card · item 7, instance properties grouped (written before building)

- **Groups, in order:** Content · Look · Behaviour · Advanced, inside the one Properties section. Content and Look open;
  Behaviour and Advanced folded, their header counting the props written in the source ("2 set"); a click opens one,
  remembered for the session per group. A group with no rows is not drawn. Figma's nested-layer groups (Top-Heading-Text…)
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
  Figma variants + look rows, Behavior and Advanced folded unless they hold a set value; a group opened or closed stays so
  for the session (module `openGroups`). Figma's nested-layer groups follow as before. `FLAT_GROUPS`: a component without
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
