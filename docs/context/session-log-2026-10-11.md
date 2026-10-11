# Session log 2026-10-11

## Studio states show at once on pages you made (session "Studio nested props", branch zen/feat/nested-overrides, tier S)

- User: committed + pushed 14a9925 (fast path A); TopNavigation keeps its data-item actions; "các state của component
  (ví dụ như row trong table) đổi xong phải refresh trang mới thấy được".
- Reproduced on a builder page (E2E NO-04): Data-Row State → Selected wrote `defaultSelectedIds={["binh"]}` but the
  canvas kept no row selected until a reload. Cause: a builder page renders its parsed tree (no Fast Refresh remount),
  and a component reads `defaultX` into its state once. Example pages were fine (SE-35: their module re-runs).
- Fix: `builder/render/renderPage.tsx` keys an element by its initial-state props (`defaultX`, `initialX`, and those in
  `overrides`), so an edit of one remounts that component only, at once. NO-04 works (selected at once, ⌘Z clears).

## Overrides, the rest of fast path A (same branch, tier L)

- Input family through FieldShell (Label · Help-Text · Leading · Trailing; fields hand `overrides` to the shell, never
  to the native element), AutocompleteField, DatePicker (Header[i]/Previous·Next, Time, Actions/Cancel·Apply),
  DatePickerSheet (Apply), Search (Leading · Filter · Trailing), FormField / FormFieldset (Label · Help-Text), NpsScale
  (Chip[n]), Chat (Message Avatar, File/Call Icon + Call Action, Voice Play, Composer Action[label] + Send, AvatarGroup,
  ConversationItem), AiChatField (Submit · Attach · Dictate), AiChatBlock (Suggestion[label]), Voice (Status,
  Transcript) → 64 components; harness list updated. Skipped with reasons: Image, Link (state icons only), AiChatBubble
  actions (a Tooltip clones its child button; a scope between them would drop its handlers).
- Tests: nested-overrides 9 (Input family, DatePicker footer, Chat avatar added); full Vitest 610 (608 at fcc1c37 + 2);
  Studio self-tests pass; generated docs, keywords and part props rebuilt.

## Core rebuild M2: page document beside the text (branch zen/feat/studio-doc-engine, tier L)

- User chose the plan's core rebuild, then (after a canonical-print attempt broke 5 E2E rows: handoff design file not
  byte-equal, import order, Sidebar item edits, detach) option 2: the page file stays TSX as written, a JSON document
  with stable element ids travels beside it in IndexedDB. M6 can keep Figma layer ids in the TSX or a sidecar.
- `tools/studio/doc.mjs` (+ `doc.selftest.mjs`, 85 checks; in `studio:selftest`): docFromText / printPage / locsOf /
  editDoc (dual run: the engine on the shown text gives the text and answer as before; on the id print it keeps ids;
  mismatch → new ids, `ids: false`). `builder/localApi.ts` edits through it, undo/redo restore the text's document,
  `ensurePageDoc` (StudioApp, on open) attaches one with `pageStore.setPageDoc` (no text write, no new edited time).
- E2E 225/225, NO-05 new (document on open with the text unchanged; ⌘D keeps the Card's id, the copy a new one; ⌘Z).
- `studio:build-check` had hung 9 h (killed). Not M2: it was out of date with main and Chromium. Fixed in
  `tools/studio/e2e/build-check.mjs`: New page names the page in the Inspector and sets the Screen to Phone (the dialog
  has no fields since 10-09); ⌘-click (`selectAt`) for deep select; Assets opens a library first (`openAssetLibrary`); Move
  to Trash finds the row in the Studio space; a component page now loads the engine on purpose (Main component frame,
  10-09), so that step checks that index.html names no engine chunk and the engine is asked for once. Chromium 1243
  (Playwright 1.63, headless shell and full) dies reading an OPFS folder handle back from IndexedDB, so after Link folder
  any page load killed the browser: the template/export steps run in a second context and the "reconnects after a reload"
  step runs last, reported as skipped when the browser dies. Result: 22 ok · 1 skipped · 1 failed — the engine budget
  (140 KB set by the user; 151.3 KB on main before M2, 153.5 with it): raise it or split the engine, asked via Giám sát.
- Committed c670fc5 (M2 files only, staged from the M3 tree by reversing the M3 edits), pushed, Giám sát told.

## Core rebuild M3: selection by id, double-click into nested instances (same branch, tier L)

- `doc.mjs`: `editDoc` returns `locs` (old loc → new loc by id, null when gone), `locMap(before, text, after, text)` for
  undo/redo; `localApi` answers edit and write with them; `api.ts` puts them on the StudioWrite; `remap.ts mapSrc` uses
  them before the text diff. Probe on :5185: ⌘⇧Z of a ⌘D above the selected Table dropped the selection — a builder page
  re-renders as it saves (pageStore notify) before the write is emitted, so SelectionLayer saw a Card at the Table's old
  loc and dropped it. Fix: `api.ts inFlight`/`writeInFlight` around sendEdit and undo/redo; `awaitingWriteRender` honours it.
- Full E2E then 227/228: B-22 (⇧A on one Text) lost the new Stack — `wrapSelection` rebuilt the write without `locs`, so
  its check disagreed with the remap. Fixed (passes `response.locs`).
- Double-click: from a component the outermost nested instance under the pointer (`parts.ts outerNestedAt`), from a part
  the next nested instance (`drillNested`); a Table's drawn cell content goes to its nested instance before text edit.
  Layers: a nested-instance part row shows its Figma layer name as caption.
- Rows: NO-06 (selection follows by id), NO-07 (level-3 Reset all), NO-08 (double-click to row 3's Badge and to the
  Sub-Action's Icon), NO-09 (Layers › Parts › IconButton · Sub-Action). doc selftest 112.
- Layers logged a React duplicate key (`…/part:0.1:TabItem`) after B-29's tab label edit: a part listed twice while the
  canvas redraws. `flatten` emits each row id once. Gate PASS (E2E 230/230).
- Engine budget: the user chose 160 KB gzip (via Giám sát) over splitting the engine; `build-check.mjs` ENGINE_BUDGET_KB.

## Core rebuild M4: one row of a list edits on its own (branch zen/feat/studio-doc-m4 off 76c7683, tier L)

- Giám sát opened PR #13 (studio-doc-engine at 76c7683) and asked that nothing more land there; M4 is on its own branch.
- `data-source.mjs rowPropEdit` (op `setRowProp`, dispatched from `dataFieldEdit`; `doc.mjs editDoc` runs it like
  setDataField): a fixed prop of a `.map` element becomes a row field (other rows keep the old value, none when unset;
  the field is the prop's name unless a row already uses it: `size2`) and the element reads `{person.field}`; refuses
  data-bound props, elements outside a list, rows not written as objects in the same file.
- `DesignPanel`: "Changes go to · Row N · All N rows" (Segmented) on a page you made when the layer is a .map row;
  setProp sends setRowProp for a fixed value on "Row", and on "All rows" writes a bound prop as a literal. The scope is
  `inspector/rowScope.ts` (shared with `edit/assets/picture.ts`, whose photo drop/pick goes to that row only), reset
  when another layer is selected (`sameSelectedElement`, so a remapped selection keeps it).
- Rows NO-10, NO-11, NO-12 (drag a card past the Table; the first try pressed the Card's padding, which starts no drag).

## Core rebuild M5: code export of what M1–M4 write (branch zen/feat/studio-doc-m5 off 8b2c304, tier M)

- compile.selftest page "Crew" (Card overrides at two levels, Badges reading `theme` from their row) failed twice:
  usage-guard `api/overrides-studio-only` on the export, and tsc (`theme: string` not a Badge theme). Fixes:
  `check-usage.mjs STUDIO_PAGE` also matches `// Generated by Zen Studio from ` (fixture `studio-export.tsx`, selftest);
  `compile-api-build.mjs` emits `LITERAL_PROPS` (119 components; alias unions followed one level), `standins.mjs
  literalProp`, `compile.mjs` records data paths read into such props (`dataPath`, the rows stack) and types them
  `NonNullable<ComponentProps<typeof X>["prop"]>` (import type ComponentProps only then). compile selftest 36.
- `tests/interaction/studio-export-parity.test.tsx`: compiles the page in the browser, writes it with vitest's
  writeFile (resolved from the root; `@zen/design-system` pointed at src/index), imports it, renders it beside
  renderPage's canvas render and compares every Zen layer (tag, classes, variant data-attributes): equal.

## Core rebuild M6, converter half: Figma frame JSON → Studio page (branch zen/feat/studio-doc-m6 off 6c8e4bb, tier M)

- No Figma MCP in this session (only zen-ds map_figma_component): asked the user via Giám sát which flow (agent with
  use_figma, enable it here, or other). Built what every flow needs: `tools/studio/figma-pull.mjs` (read code for
  use_figma, read-only; converter on FIGMA_PROPS + component-properties.json + docs/api defaults, printed by printPage;
  CLI). Defaults compare with the code default (docs/api JSON text), scale spellings normalised ("medium" = "md").
- Card's Sub-Action is `skip` in figma-props.map (needs an object), so an override on it is named in the notes.
- `figma-pull.selftest.mjs` (14, in studio:selftest; Node 24 imports figmaProps.generated.ts by type stripping); E2E
  NO-13 (`openNestedPage` takes the Badge count to wait for).

## Core rebuild M7: nested-paths gate (branch zen/feat/studio-doc-m7 off dcb4792, tier M)

- `tools/figma-contract/nested-paths.mjs` (+ `--check`): per component (Babel parse; nest()/nest.at() names in its
  function and same-file helpers it renders) vs its contract sets' layers; a contract with no nested instance (Popover)
  is not judged. First run 5/17; after `layerKey` (figma-pull.mjs, also used by its read code) 14/15; DatePicker
  renamed Apply → Submit, Time → Time-Picker (JSDoc example, docs regenerated, nested-overrides test) → 15/15.
- `ALLOWED` with reasons; stale entries fail the check. Gate step in `tools/qa/run.mjs`. BACKLOG: designer questions
  (Chip Counter / Multi-Count, Date field Leading-Icon), Input re-capture; archived "This row / All rows" (done in M4)
  and the old nested-paths item.

## Core rebuild M8: the avatar test through the design copy (branch zen/feat/studio-doc-m8 off 33387e3, tier M)

- Rows NO-14…18 (one per eval page): first frame with an Avatar → New page from this frame → ⇧2 on the Screen → the
  first Avatar shown and on top → ⌘-click until "Avatar" → Assets › Photos; the photo key appears once more. My own row
  slips on the way: `until` treats index 0 as not yet; `.studio-viewport`'s box is not the canvas; elementFromPoint
  hits the selection overlay.
- Real ones, fixed at the owner: AvatarStack spread its rest props on every Avatar (Studio's data-zen-src made each
  Avatar look like the stack; probe on :5185 showed "AvatarStack · part of AvatarStack"); SidePanel modal ignored
  `[data-zen-overlay-root]` (its scrim covered the Screen frame of the copy, screenshot); a nested Avatar part (an
  AvatarStack's) on a local page takes a photo as the owner's `overrides` (`picture.ts nestedPicture`, `assets.ts
  selectedImage`); a Table column drawn by `cell` with a library photo becomes an avatar column in the copy.
- 5/5, starters SP-01…11 green; `tests/interaction/frames-and-stacks.test.tsx` (3).

## PR #12 CI: ModalForm focus after an async submit (zen/feat/nested-overrides a3f5389, merged here; tier S)

- CI failed "waits for an async handler before looking for errors" (Email never focused). Not `overrides`: Form and
  ModalForm looked for aria-invalid once, one animation frame after the handler; React renders its setErrors in a task
  of its own, which a frame can precede. `Form/focus.ts afterErrorsRender` looks again on the next frames (6 at most);
  both use it. New test (errors render 30 ms after the handler resolves) fails on the old code every time, passes now.

## Core rebuild M6, live read: Overviews 14243:64878 through use_figma (branch zen/feat/studio-figma-pull-live off 9ca1073, tier M)

- Figma connector on (user); read-only `use_figma` on `9nZv4uW2LT21yuHabMTCh1`. Answers cap at 20 KB and were cut short
  with non-ASCII text: the read code escapes to ASCII and pages (`PART i/n`, 12 000 chars); `joinParts` joins them.
- What the real frame showed, fixed in `figma-pull.mjs`:
  - slots read (layout, Fill) and converted by owner: children, DATA_SLOTS data (Sidebar sections with section titles,
    Breadcrumbs, Segmented; Select → selectedId / defaultValue), or a node prop (Sidebar brand, footer of SidebarMenuItem);
  - Breadcrumbs found through its data slot's set (no FIGMA_PROPS entry);
  - unmapped instance with slots (Dashboard/Header) → its slots in Stacks, laid out as their frame; icon instance → Icon;
    drawings left out with one note; ids scoped per component;
  - row Stacks centre by default and Stack's gap defaults to md: Fill rows → `align="stretch"`, Figma MIN → `start`, no
    gap → `none`; Fill container → width/height fill; padding X/Y;
  - 8-column grid of span-2 cards → `columns={2}`, cards in Figma's placement order (the layers panel had them swapped);
  - text alignment, U+2028 → space; Ignore auto layout → position absolute + constraints + insets (Text wrapped);
  - IconButton aria-label from its layer name or icon (harness errors were icon-button/needs-name).
- Checks: selftest 38 (20 on the live fixture `tools/studio/fixtures/figma-overviews.json`, incl. usage harness 0 errors
  on the compiled page); E2E NO-19 new (Sidebar full height, current item, Breadcrumbs, Segmented, Cards 2×3 in order),
  NO-13 still green, baseline updated for NO-19. The E2E probe found Sidebar/Breadcrumbs/Segmented keep data-zen-* off
  their DOM (the picker uses fibers): the row finds them by class.
- BACKLOG P2 (designer): what Primitives/Dashboard/Header maps to. Open: diff on re-pull, Figma Table → Table.

## Core rebuild M6, re-pull: Update from Figma (branch zen/feat/studio-figma-pull-diff off 87b230a, tier M)

- Figma ids on nodes: the read code returns each layer's id (and the file key); `pageFromFigma` gives every element a
  document id from its layer (`figmaDocId`) and the header `figma: { file, node }`; the CLI prints with `data-zen-id`.
  Fixture re-read live with ids (read-only; identical to the previous read apart from the ids).
- `tools/studio/figma-diff.mjs` (pure): three-way changes base → incoming (prop, text, add, remove, order, move), a
  conflict where the Studio changed the same spot, two-way when no base; `mergeFigma` applies the chosen ones and never
  touches the Studio's own elements. Selftest 19 on the live fixture.
- Engine: an op's code with `data-zen-id` sets those ids in the document and the page text never shows them
  (`doc.mjs editDoc`, doc selftest +2); `elementText` export.
- Studio: PageRecord `figma.base`; Import pages… → a pulled page keeps its ids and base; a frame already pulled opens
  `UpdateFromFigmaDialog` (checkboxes, conflicts unticked, "Changed in the Studio too"); Apply = one `replaceElement` on
  the Board ("Update from Figma", one ⌘Z), then the pull becomes the base.
- Checks: E2E NO-20 new (6 changes listed, conflict unticked, 5 applied in one edit, Studio's theme/align kept, cards in
  Figma's order, ⌘Z back), NO-19 green; build-check 23 ok, engine 154.2 KB gzip (budget 160); tsc clean.
- Open (M6): Figma Table → Table (Header / Data-Row primitives with cells in Columns slots), next branch.

## Core rebuild M6, Figma Table → Table (branch zen/feat/studio-figma-pull-table off 44576b0, tier M)

- Read-only research: Figma has no Table component; tables are frames of `Primitives/Table/Data-Row` instances (a row of
  `Table/Cell/Header`, then rows of `Table/Cell/Default` each holding a cell primitive). Demo › Table-Example
  14730:78776 read live; fixture `tools/studio/fixtures/figma-table.json`.
- Read code: a frame of Data-Rows comes back as one compact `TABLE` (header cells: label, Sort, Align, icon, width /
  Fill; data cells: primitive, texts, width / Fill, Align, the Zen instances inside with their text).
- Converter `tableElement`: columns (header, sortable, align, fixed width, content from the first row's primitive, bold,
  captionField), rows inline in the Table (first in mock — a re-pull then missed row changes because mock sits outside
  the Board; fixed in this change, as design copies write rows), per-row `overrides` where Figma's Badge / Dock-Icon
  differ from what the Table draws (theme + dot; emoji, Medium, solid). Actions-Cell column left out with a note. A
  Search takes its text as `placeholder` (harness search/needs-name).
- Checks: figma-pull selftest 46 (+8), figma-diff selftest 22 (+3: a row's status changed → rows + its Badge override),
  E2E NO-21 new (5 headers, 9 rows, badges yellow/green/red, emoji), NO-19/20 green.
- Open: a Table's Actions column (a page cannot write `cell`).

## DashboardHeader + the designer questions (branch zen/feat/dashboard-header off 0298c03, tier L)

The user's answers via Giám sát: Chip "Dùng counter (Không phải advanced chip)", Date field rename in Figma, and
Primitives/Dashboard/Header "Thì build ngay".
- Chip (read-only): Figma has no "Counter" layer — Chip/Normal none; Chip/Advanced's Counter boolean shows a hidden layer
  named "Badge"; the multi-select count is .Chip/Trailing Multiple's "Badge-Counter". Asked Giám sát (options A: rename in
  Figma, B: code follows Figma's names); code and ALLOWED unchanged until the answer. Date field: BACKLOG line → waiting
  on the Figma rename; ALLOWED reason updated.
- DashboardHeader: manifest (page, set, nested owners) in `docs/platform-json-audit.md`; contract captured through
  `mcp-capture` by a helper agent (1 chunk) → `docs/figma-contracts/dashboard-header.json`; suite
  `suites/dashboard-header.mjs` 68/68 (4 types × 2 modes). Type=Main renders PageHeader (`childTitle` added, Child-Heading
  Light); Main's SubHeading stays Neutral/Base in PageHeader (Light is 3.8:1 on Canvas, recorded as a decision).
- Definition of done: component files + export; platform app-layer page (playground with Type and each boolean, 5
  examples: control bar over a table, navigation bar, rows in an AppShell, custom row, narrow column); Do/Don't visuals;
  guideline entry + `tagsFor`; harness rules `dashboard-header/props-of-type`, `one-primary`, `main-needs-title`,
  `filters-are-chips` with fixtures (usage selftest 177); props docs generated; Studio palette item, synonyms, Figma props
  map (component-properties.json gains ◇ Master-Layout), generated Studio tables refreshed.
- figma-pull: DashboardHeader slots → leading/center/trailing/controls/actions; Main Header-Text → title/childTitle/
  subheading; a non-standard Header-Text (Overviews' cover) → type custom with all slots as children; Control-Bar Search
  and Subheading text; Action-Item → AppShellAction; the row padding → a Stack around it. Selftest 47.
- Found: `palette.selftest.mjs` runs in no gate and already fails on main (SidebarMenuItem missing from docs/api) →
  BACKLOG P3.
- Gate: actions overflowed at 390 Comfortable (their min-width was max-content) → base size auto, min-width 0, so the
  row wraps them and a line too narrow wraps the buttons; on a phone the Primary comes first (as PageHeader) and the
  navigation example trades the trail for Back. Segmented/Tabs axe "fixed violation" was load flake (3/3 reruns pass).
