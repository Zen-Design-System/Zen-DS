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
