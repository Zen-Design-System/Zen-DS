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

## PR #12 CI: ModalForm focus after an async submit (zen/feat/nested-overrides a3f5389, merged here; tier S)

- CI failed "waits for an async handler before looking for errors" (Email never focused). Not `overrides`: Form and
  ModalForm looked for aria-invalid once, one animation frame after the handler; React renders its setErrors in a task
  of its own, which a frame can precede. `Form/focus.ts afterErrorsRender` looks again on the next frames (6 at most);
  both use it. New test (errors render 30 ms after the handler resolves) fails on the old code every time, passes now.
