# Session log 2026-10-08

## Classic docs: code view + playground properties like Zen Studio (tier S)

- `PlatformCode.tsx`: the classic view renders the Studio's `code/CodeView` (language="tsx") inside the
  `section.platform-code` wrapper (keeps the panel's grid area, the audit's `.platform-code` skips and the arrow-key
  owner). The language SelectField ("Vue/Svelte/… — Coming Soon") and the local regex highlighter are gone.
  `studio/bridge.ts` comment notes the one exception to "docs import only the bridge".
- `platform.css`: dead `.platform-code__*` / `pre` / token-hue rules removed; `.platform-playground-controls` mirrors the
  Studio inspector section (title "Playground properties" Body/Small/Bold, Gap/XSmall, 32px rows with a
  `clamp(80px, 28%, 120px)` label column, Body/Small/Regular Neutral/Base labels that wrap, toggles start-aligned).
  Tablet two-column and phone one-column layouts kept.
- Verified with Playwright shots of `?ui=classic&page=button` at 1512 and 390 against the Studio inspector.

## Table `bulkActions` (tier M: a new prop on one component + its examples)

- User asked: selecting table rows should bring up bulk actions; chose "add to Table" (over playground-only).
- `Table.tsx`: `bulkActions?: ReactNode | ((selectedIds) => ReactNode)`. With `selectable`, the table renders in a
  `.zen-table-scope` wrapper (ref/className/rest stay on the scroll box) and, while `selectedIds` is non-empty, a
  `.zen-table__bulk-dock` (sticky bottom, centred, outside the scroll box so it can stick to the window) holding
  PopoverBulkAction: Clear selection (IconButton flat md, icon-x-medium-line) · "N selected" (role=status,
  Body/Base/Medium) · divider · the actions. Escape in the bar clears; when the bar unmounts with the focus in it
  (focus/blur flag + effect on the count), Select all rows takes the focus. Pop-in from Motion tokens.
- Labels `rowsSelected`, `selectedRowActions`, `clearSelection` (en + vi). Guideline source: api row, a Do, an a11y line
  (replaces "bulk actions above the table"). Story `BulkActions`. Tests: `tests/interaction/data.test.tsx`
  "Table bulkActions" (2 cases; file 10/10 pass).
- Platform: playground toggle "Bulk Actions" (on by default, shown while Selectable) with Export / Copy links / Archive;
  "Act on selected rows" now passes its four actions through `bulkActions` (dead `.px-table-bulk-*` CSS removed).
- Backlog: P3 Table bulkActions follow-ups (harness cap, AdminListTemplate ActionBar, 390px wrap).

## Flat hover backgrounds → step 2 (tier XS, token value)

- `mode-colors-semantic.json`: Accent/Flat/Hover {Brand-Alpha/3 → 2}, Neutral/Flat/Hover {Neutral-Alpha/3 → 2}, Light
  and Dark. Positive/Negative/Warning/Info/Inverse were already 2; Pressed stays 3. `tokens:build`, `tokens:check`,
  `tokens:native:check` pass. The user changed the live Figma file to match (noted in the figma.collections.json sync
  note + HANDOFF Tokens line).
