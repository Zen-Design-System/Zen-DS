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

## Table bulkActions: overflow into a More menu (user request, tier S)

- API now data, not JSX (unreleased, changed the same day): `bulkActions: TableBulkAction[] | (ids) => TableBulkAction[]`
  ({id, icon, label, onClick, disabled, group}); `TableBulkAction` exported. The Table draws icon-only flat md buttons,
  a divider between consecutive groups.
- `TableBulkBar`: renders every action on one line (bunk-list nowrap), measures in a layout effect (`fittingActions`:
  last visible right edge + gap + More width + padding ≤ dock width) and keeps what fits; the rest go, from the end, into
  `Menu` (align end, separators between groups, labels/icons from the actions) behind a More IconButton (`t.moreActions`).
  Re-measures on a dock width change (ResizeObserver) and on a new count. Escape inside the open menu only closes it.
- 390: invoices example keeps Send reminders + Mark as paid, Download PDFs / Copy links in More; 1512 shows all.
  Example label "Download N PDFs" (was "… as PDF", truncated in the menu). Test "Table bulkActions overflow" (11/11).
- Gate catches: (1) density audit — ResizeObserver on Clear selection must watch `border-box` (density changes the
  button's padding, not its icon content box); (2) the bunk-list centres its content, so an overflowing measuring render
  shifted every action left by half the overflow — the Table bar's list is `justify-content: flex-start`. Gate PASS
  (table, --isolated: audit 1512/390 + density, dark, behaviour, Vitest 30/30).

## SelectField → Bottom Sheet on mobile (user request, tier S: one component)

- `Input.tsx` SelectField: `asSheet` = nearest `[data-breakpoint]` (read in a layout effect on open/close and on the
  provider's breakpoint), else `useZen().breakpoint`, is `mobile`. Then a BottomSheet (title popoverLabel ?? label ??
  aria-label ?? placeholder; `popoverSearch` → Search slot filtering by label) holds a List of ListItems (picked =
  `selected` + trailing check, house pattern of bottom-sheet.md; disabled options are not clickable,
  `.zen-select__sheet-option--disabled`). Shared `pick()` for Popover and sheet. While the sheet is open the trigger's
  blur neither closes it nor reports onBlur, and the outside-pointerdown close is off (the sheet dismisses itself).
  `aria-haspopup` dialog / listbox, `aria-controls` only for the Popover.
- Test `tests/interaction/select-sheet.test.tsx` (mobile sheet pick + focus return, desktop listbox); input-popups pass.
- Not changed: AutocompleteField, DateField, Chip popovers (still Popovers on mobile).
- User: "the sheet must show inside the mobile screen". BottomSheet portalled to <body> unless `inline`. Fix at the
  owner: `Dialog.tsx` exports `useOverlayHost` (its device-frame host); BottomSheet uses it (`mounted && !inline`),
  sets `data-inline` when contained so the existing inline CSS positions it in the frame, and starts `useModal` once the
  host is known. Every non-inline sheet inside a PlatformPhone now opens in that phone (Form "Deliver to" verified).
  Test "BottomSheet in a device frame" in select-sheet.test.tsx.

## Layout "Main column and aside": one widget style (user: "layout weird", tier S)

- The Tasks table lay on the canvas next to two flat cards (Team, Details): mixed surfaces, titles Heading/4 vs
  Subheading, tops not aligned. Now Tasks is a flat Card too (Subheading title + Status chip + table), as usage rules §16
  and the table guideline (widget title = Subheading) say. Inside the card's padding a phone-width table left titles
  four lines tall, so a narrow card (< 560px) lists the tasks (ListItem titleLines 2 + status Badge trailing).
  `src/platform/examples/pages/layout.tsx` (example + code + description).

## Backlog clear-out (parallel agents; another session, merged from main)

User asks: clear the whole backlog before new features; fix a bug when you meet it (no deferring, now in AGENTS.md);
the phone top bar takes the canvas colour (Alt bars on Canvas/Default); push straight to `claude/zen-ds-0.4.0`.

**Done (all pushed):**
- Components: ListItem trailing slot passes taps to the row; docked SidePanel closes on Escape and returns focus;
  AiChatField draws only the actions it has handlers for; DateField parses a typed date and opens DatePickerSheet on
  phones (new, BottomSheet `footer` slot, `ok` label); DatePicker `calendar="stacked"`; MetricWidget Figma props;
  shared NotificationDot and SidebarShellContext; AiChatBlock `headingLevel`; Tooltip describes a focused control
  inside a wrapper; Layout column Fill / `fillChildren` use a 0% basis (no collapse to 0 without a parent height).
- Platform: 173 phone bars → Alt; HR Home has one visible h1; Design Tokens dark contrast; ~4,000 lines of never-shown
  appLayer examples, `shellScreens.tsx` and their CSS removed (examples live in `examples/pages/*`).
- Harness/QA: `copy/plural-count` Unicode/vi, icon-button rule on AppShellAction/Account, opaque() only for `${`
  outside braces, `tooltip/focusable-trigger` accepts a wrapper; audit false positives fixed (§16 selected cards,
  ListBox as card, corner scale, behaviour shared-ancestor focus ring, heavy-page budgets, text-style limit 8 on whole
  screens); MCP `get_component` brief/full; verify-package JSON parse; `zen-ds check` runs CSS rules.
- Three agents (examples, Studio canvas, Studio server) merged; a fourth (Studio leftovers) runs in a worktree.

**Verification:** tsc, usage selftest + check (8 warnings, all known), style-guard, guidelines:check, studio selftests,
Vitest (smoke + axe + interactions) green; visual diff of all 804 panels for the Layout change: only image/timing noise;
`npm run qa -- --all --isolated`: PASS, 0 errors (warnings fixed at their owner, see commits).

**Figma drift:** every contract hashes differently; normalised for extractor format changes, 26 of 53 checked sets
changed for real, 39 unchecked (too large for one `use_figma` call). Re-capture needs the desktop console → QUESTIONS.md.

**Moved:** designer questions and user decisions → `docs/context/QUESTIONS.md`.
