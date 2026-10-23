# Session log 2026-10-24

## Backlog triage · "Backlog (plan before opening sessions)" (tier XS, docs only; started by the progress session)
- All 53 entries checked against main 545216b6: grep, the named files, git history, and two read-only Figma variable
  reads (Bubble-Chat-Others-Business is Surface/Default in all nine modes; Popover-Search is still NaN in S1–S6).
- 10 done, 2 stale, 3 duplicates of archived entries, 25 partly done (rewritten to what is left), 13 still open
  (5 kept as written, 8 merged into group entries). 48 originals archived with their verdict, text unchanged.
- Left: 35 entries under 7 owner groups (business, Studio, components, designer, platform, tooling, design check);
  4 P2: the LICENSE review, the registry's user steps, ModalForm `header={false}` without a name (a11y), and the
  contrast/targets baseline seeding. "## Open items" untouched; nothing P1-urgent found. No work started.
- User "Giao 35 mục theo đề xuất": the Designer entry moved to QUESTIONS.md / .vi.md as the 2026-10-24 designer batch.

## Menu and Chip on phones (C, tier L; branch `zen/feat/menu-chip-phone-sheet-20261024`)

- User decision 2026-10-24 (option A, automatic), handed from box-themes. `_shared/phone-sheet.tsx` holds SelectField's
  rule (`usePhoneSheet`: the nearest `data-breakpoint` above the control, else ZenProvider's) and `sheetLeading`;
  SelectField and DateField now use it too.
- Figma, read with use_figma: Primitives/Sheet-Actions/Item (4059:17214) holds `.Primitives/Popover/Item/Content`
  (829:20006), whose Subtext is Caption/Regular 11px, 2px under the label. So BottomSheet items got `caption`, and the
  Popover's own caption, Body/Small/Regular 12px since v0.2, was fixed to Caption/Regular at its owner.
- Menu on a phone: `<BottomSheet type="action">` holding the Menu's own rows (`SheetActionRow`, MenuContext `sheet`),
  so `children` composition, groups (a labelled `role=group` with its own list) and separators survive; shortcuts are
  dropped. Trigger `aria-haspopup="dialog"`; keyboard opening starts on the first / last item (`data-autofocus`). The
  sheet's modal owns Escape, Tab and focus return. The deliberate action-sheet-without-items is `zen-allow-sheet-items`.
- Chip on a phone: SelectField's sheet (List + ListItem, Selected + check, Search filtering by text unless the app
  filters, `done` label for `popoverMultiple`). `onPopoverCreate` chips keep their popover.
- Tests: `tests/interaction/menu-chip-sheet.test.tsx` (7). Two backlog-fixes tests that test the popovers at 390px are
  pinned to `breakpoint="desktop"`. Chip's "Filters on a phone" example now uses `popoverItems` instead of a hand-built
  sheet. Generated: guidelines/api docs, Studio compile-api and partProps.
