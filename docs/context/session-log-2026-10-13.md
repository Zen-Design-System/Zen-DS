# Session log 2026-10-13

## Studio → Figma coverage P3: the Figma components the push drew as frames (session "Studio export", branch zen/feat/figma-map-p3, tier M)

- User: "làm luôn" (P3, then P4). Worktree `Zen-CodeBase/Zen-DS-p3` from main 6083159; plugin commits in
  `~/Documents/zen-ds-figma-plugin-main` (5121b91, 1247c22, 41483ca, b7a328d). Each item: push, pull, selftest
  (`figma-push.selftest.mjs` §15–25) and an import with the real importer in the Zen file (page "Studio exports").
- **Mapped:** TopNavigation ↔ Top-Navigation/Mobile (`tools/studio/figma-top-nav.mjs`), ColorSelector ↔ Color-Selector,
  Tabs with TabItem children, InputConditions ↔ Input-Conditions, UploaderFileItem ↔ File-Item, DatePickerSheet ↔
  Date-Picker/Mobile, ChatThread / ChatMessage ↔ Chat/Section/Conversation, Reaction, Read-List, FileIcon ↔
  icon-media-file, Flag ↔ Flag, Icon sizes (Element-Size/Popular), Metric / MetricCard pull. Table and screenshots
  per item: `docs/research/studio-figma-push-spec-2026-10-12.md` §8 "P3".
- **Plugin:** slot `within` (Top-Navigation's two Trailing-Slots), `nested.name` and finding renamed layers again by
  their component (a fix found live: the second renamed avatar fell short of its index), `fill` on an instance.
- **Bugs met and fixed:** Segmented selected item (value / first) and fullWidth on pull; a Tab-Item's Label variant
  read as its label ("True"); InputConditionItem's label never pushed; the pull reader's `firstText` read text inside
  hidden layers and a chat message's avatar initials as its text; Metric's label, value and trend lost on pull (and a
  MetricCard read as a Card around it); Metric's default icon hidden in Figma; every Icon pushed at 20px.
- **User (mid-turn): "các ava nhỏ chỉ nên dùng viết tắt 1 chữ".** XSmall / 2XSmall avatars show one letter: ChatMessage
  no longer bypasses Avatar's rule (the 2026-10-02 two-letter test now expects one), and the push writes small
  avatars' initials the same way (Avatar elements, table avatar cells, chat).
- Gate: `npm run qa -- --isolated --files=…` (Chat.tsx, the chat test, push / pull).

## Studio → Figma coverage P4: examples' classNames (same session and branch, tier M)

- Measured the 350 classNames in the examples by what their CSS does: ~110 sized a Card or ListBox (fill, a readable
  max width, centred), which had no sizing props. User chose to add them: Card and ListBox take width / minWidth /
  maxWidth / alignSelf (LayoutWidthProps, the Layout sizing rules extended to .zen-card and .zen-list-box); push writes
  the instance's min / max width, pull reads them; browser tests in layout-sizing.test.tsx.
- Converted by script (dry run, then write) and by hand: 90 classNames became props, their CSS went (file headers kept).
  40 example roots centred at a readable width now sit in a `<Stack>` (the docs stage is no Stack, so alignSelf alone
  did not centre them). Two `flex: 1` classes in wrapping rows stayed (fill shares the row instead of wrapping).
- Visual diff (tools/platform-audit/visual-diff.mjs on a worktree server, :5192): 31 pages, 430 panels; every panel
  identical except one whose lazy image had not loaded in the before capture.
- Left (BACKLOG, the user's call): 27 container-query layouts (a Grid API), docs-only details and mixed colour /
  display rules, which stay platform CSS. classNames now 260.


## Studio: booleans and clicks on template pages (session "Studio toggles + click", branch zen/fix/studio-toggles-click, worktree Zen-DS-click)

User: (1) clicking the element you want is harder than Figma, (2) on a page made from a template, booleans of an
overridden component do nothing, "especially booleans with a slot such as Metric card", (3) "still far from Figma".
Tier M (Studio, several modules; one library line in Badge). Private Studio server on :5197 from the worktree.
- Repro (2): Counter on a Title-Highlight MetricCard wrote `counter="3"`, nothing drawn (Counter is Icon-Highlight's in
  Figma); Custom flipped and fell back. Causes: no content slot for Metric/MetricCard `custom` nor DashboardHeader's
  5 slot booleans (toggle → openSlotPicker for an unknown slot), and SlotLayer loaded the source element only for
  slots active with *no props* (`activeSlotsOf(name)`), so a slot whose default state is inactive never got its picker.
- Fixes: figma-props-build gives a toggle `when` = the sets that have it (+ map conditions: Metric Hint/Label-Icon at
  XL–MD, DashboardHeader per Type); `oneOf` conditions take a default; a toggle's value row shows while it is on;
  registry: metricCustom, metricCardCustom, dashboardSearch/Controls/Actions/Center/Trailing (palette selftest 1838 ✓);
  SlotLayer: slotsOf for the source read, host props for insertable slots; slot switches hidden while the slot is
  inactive (Metric Action below Medium).
- Sweep (every Inspector switch on one instance per component, Dashboard / HR Home / Detail pages, text + canvas both
  must change): found Chip Dropdown off = removal, which an Advanced chip renders as on → `inspector/computedDefaults.ts`
  (write `false`, show the computed default); Badge Leading-Icon off did nothing with a `leading` icon → Badge hides it
  (Figma's boolean); LineChart Show legend (needs compare), AppShellAction Dot (under a count), Sidebar Workspace-bar
  (Workspace only) → a note under the switch. Left as they are: Search Clearable / filter, Chip popover options, Icon
  Decorative (no visual by nature).
- (1) Measured click depth (double-clicks after the first click to reach each non-layout layer, 6 templates, 263
  layers): 5.58 avg, max 11; the first click always selected AppShell. Figma Overviews 14243:64878 for comparison:
  4.6 avg counting slot levels. clickTarget.ts: layout wrappers with one layer, a component's one layout child, List's
  `<ul>` and a Box as large as its child are passed through; AppShell and the page body extend the frame root →
  2.54 avg, max 8 (Dashboard KPI card 7 → 3). Canvas menu: "Select layer ›" lists the layers under the pointer.
- UI notes from the user mid-session: the insert picker's long "Not offered here…" sentence → "N not available here"
  (reasons in the tooltip, rewritten in design words); the card Effects row (label, two-line "From … theme", floating
  Edit theme, a white swatch that read as a checkbox) → one style row whose menu picks the theme, grey swatch tile.
- E2E: SP-13 (Custom → picker → slot), SP-14 (first click, double-clicks, Select layer), SP-15 (Chip Dropdown false);
  AP-06 rewritten for the new Effects row.

### Round 2 (same session; user: "Xử hết" the four gaps + a Figma task walk)
- Layers (`select/LayersPanel.tsx simplify`) folds what `clickTarget.ts` passes through: single-layer Stack / Grid /
  Container / div / section, a Box as large as its child, a Zen component's one layout child (an example's own
  component keeps its root Stack: E2E SE-08), List's `<ul>`; no Parts row under Stack / Grid / Box / Container; the
  Studio sizing Stack is recognised first (IN-16); aliases resolve in chains.
- ⌘-click (`parts.ts deepLayerAt`, SelectionLayer pointer + hover): into the instance to the innermost text or nested
  instance; a one-text instance (Button, Badge, Chip, Avatar) stays the layer (NO-10), a text inside a one-text nested
  instance gives that instance, data rows stay the row (SP-10); Table cells: the text, or its Badge (`tableDeep`). The
  part named by its own component (MetricCard's Metric was "MetricCard"). Text layers: PartPanel "Text" section writes
  the owner's prop or text child; Enter edits in place (`startTextEditOnPart`, live part after a re-render); in-place
  edits write a field of an object written in place (`shapeFieldOf`: Sidebar sections › items › label, a trend label)
  and a ReactNode `value` (MetricCard). E2E helpers climb back with ⇧Enter (`ownerOfLayer`).
- Overrides: a nested boolean off removes the override it added (`OverrideProperties toggleOverride`), `false` only
  when the owner passes the prop itself.
- Speed (Dashboard page, headless dev): switch → canvas 160–260 ms → 45–120 ms. CPU profile: `usePageTree` parsed in an
  effect (two renders, a turn between) → parsed in render; `parseSource` / `sha1` LRU caches (Inspector re-parsed the
  page ~4× per edit); `propSpecs` memoised; ResizeLayer probes (growsVisibly, crossFits, gridCell) after paint in idle
  time, last result held; Layers rebuild as a transition; `renderPage` element cache by node signature (in-place value
  edits re-render only the edited path; a new attribute line shifts later locs, so those re-render).
- Figma walk (scripts: walk.mjs / walk3.mjs in the session scratchpad; Dashboard 10 + Admin list 4 tasks): first run 7/10
  and 1/4; fixed on the way: Trend boolean (map), Action-Slots insert into the row Stack (registry insertTargetFor +
  actions.ts read the frame for prop slots: was refused), Enter on a text layer, table cell text, Sidebar label in place.
  Now 14/14 at Figma's step count (icon swap +1 for typing a search).
- E2E: SP-16…SP-20 new; O-04, SE-30 updated; full run before the last fixes: 7 regressions, all fixed and rerun.
