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
