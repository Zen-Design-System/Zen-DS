# Session log 2026-10-23

## Session B · Example className round 2, PR 1 (tier S; user decisions 2026-10-23, spec examples-classnames-round2-spec-2026-10-23.md)

Branch zen/chore/examples-classnames-20261023. The coverage BACKLOG item (P3–P4) had been merged on 10-13; examples
added since brought 177 className back. PR 1: classes with a Figma-equivalent prop become props.
- Direct: calendar planner Card `maxWidth={420}`, schedule planner Stack `maxWidth={420}`, colour-picker panel
  `<Box width="fill" maxWidth={360}>` (was a div).
- Fill + min width, measured on an isolated server (natural width, line and siblings at 1512 / 768 / 390 / 320):
  list-item search `width="fill" minWidth={200}` (natural 220 would overflow a 320 phone; wrap point 299 instead of 319);
  toast title block `minWidth={160}` (= natural, same wrap point). Kept as CSS: the search page's toolbar (natural 445
  shrinks to 248 on a phone because its chips wrap inside: no min width keeps both) and the date picker's Form (Form has
  no size props).
- Visual diff 102 panels at 1512 / 390 / 320: identical. Gate PASS (5 pages; audit, dark, behaviour, contact sheets
  looked at).
- My slip: I stopped my isolated server with pattern kills (`pkill -f "tail -f /dev/null"`), which can hit another
  session's processes; memory updated (TaskStop or exact PIDs only).

## 320px debt left: the designer calls (tier L: docs chrome at 320; user: "xử hết", B1, "Gỡ khỏi mục này")

Branch claude/eloquent-mclean-8f4974 from main 4b96bbb8. BACKLOG P1 "320px debt left" → archived.
- Re-measured at 320 (audit on a private server, 6 pages): the 13 Chat findings were gone already (the 10-20 AppShell
  gate fixed ChatComposer and the narrow desktop ChatThread); 10 layout findings left: Voice 5, DatePicker 2, Pagination 1,
  Rating 1, Settings form 1, plus the templates "Show all" target false positive.
- The 9 in a card (Voice, DatePicker, Pagination, Rating) overflowed only because the docs chrome left an example 248px and
  its Card 208, against 248 inside a Card on a real 320 phone. `platform.css` under 375px: stage and playground preview
  span the card with an 8px inset (example 272). Measured with `--css` first: all 9 fit; 390/1512 untouched.
- Settings form template: the photo row wraps, FileUpload in `<Box width="fill" minWidth={136}>` (button 119 at
  Comfortable; 150 is left at 390), so only a 320 phone stacks it. 390/1512 widths measured unchanged.
- `audit.mjs` targets: a target scrolled out of a clipping frame is skipped (the "Show all" link at y 10683 sat under a
  frame ending at 8937 and was "crowded" by the next card's button).
- Text / widgets / sidebar style findings stay in the all-viewport baseline (user: accepted, not 320 debt).
- Seen, not changed: Settings form's save bar truncates "Discard" at 320 Comfortable — the user's 10-19 ActionBar rule
  (Primary keeps its label, the other gives way).
