# Session log 2026-10-14

## Studio: icon picker on nested icons (session "Studio toggles + click", branch zen/fix/studio-toggles-click, tier S)

- Asked to explain round-3 item 3 (icon suggestions), the picker was measured on a Dashboard-template page: the Revenue
  card's DockIcon showed "Default in Figma" (1) and "All icons" (200 of 1598) only. Cause: `TablePartPanel` rendered
  `PartPanel` without `InspectorFileContext`, so `useFileIcons` had no file. Fix: the part panel gets the owner's file
  (`parseSrc(selection.src).file`); the picker now shows "Used in this file" (12). Gate: `npm run qa -- --isolated
  --files=src/platform/studio/table/TableCellPanel.tsx`.
- User: "có" to ship → merged origin/main (#33 #36 #40; CHANGELOG and session-log conflicts were both-sides additions;
  figma-props, guidelines, api.generated in sync; tsc and studio:selftest pass) and `npm run ship` → PR #43.
- User: "OK với gợi ý của bạn. Làm ngay" → Recent + Related (`inspector/iconSuggestions.ts`):
  - Recent: the last picks of any icon picker, localStorage `zen-studio:recent-icons` (withRecent, 12 kept, 6 shown).
  - Related (relatedIcons): the icon's family (stems with its first word, coin/coins one family; ≤ 4), then the topics
    of the words beside it (`wordsNear`: the host's text or the nearest ancestor's within 4 levels; ≤ 2 topics), then
    the icon's own topics; ICON_TOPICS is a hand-written table of 14 topics (stems + label words); each topic gets a
    fair share of the tiles left ("Profit margin" + pie chart → money and chart); one icon per stem, same line/solid
    style; 12 shown.
  - Groups: Default in Figma, Recent, Related, Used in this file, All icons; an icon shows once, never the current one.
    Recent and Related are tiles (6 a row, 35×36, name as tooltip and accessible name).
  - TablePartPanel also provides InspectorHostContext (the part's element) so a nested icon gets its words.
  - Dashboard template: Revenue coins → coins family + wallet, bank note, bank, card, dollar, euro, receipt, piggy bank;
    pick wallet, next card's Recent leads with it.
  - Tests: iconSuggestions.selftest 17 checks; E2E IN-20 (two tile picks, Recent, no repeated icon), IN-07 finds
    groups by id.

## List-Box heading pushed in on the theme test frames (tier S, user: "component slot bị lỗi constrain làm thục chữ vào")

- Seen on ◆ Performance (Theme-01 … 08 mobile frames and the superseded review): "Members" started 28px in from the
  List-Box edge while the List-Items lined up at 0.
- Cause, in the library (`Component/List-Box` 14922:75297, all 100 variants): Header-Slot and Footer-Slot are vertical
  with counter-axis CENTER, and their default Heading / Footer texts were FIXED 263px (the slot width of a 311px box).
  A wider box (358 on a 390 phone) centres the 263px text in a 318px slot → +28. No other set in the file has a fixed
  text in a centred slot (scanned every page).
- Fix (user approved writing to the file): both slots counter-axis MIN, Heading / Footer `layoutSizingHorizontal` FILL
  (100 + 100), matching code (`.zen-list-box__header` / `__footer` are flex columns that stretch). The 30 authored slot
  texts on ◆ Performance set to FILL (slot content is the instance's own, so the library change does not reach them).
  Read back: 30 × Header-Slot MIN, text x0 w318 of 318; screenshots of Theme-01 Light and Theme-08 Dark checked.
- Harness (user approved): AI kit audit rule `text/shifted` (error) — authored left-aligned text with a fixed width in a
  vertical auto layout that centres or end-aligns, starting more than 1px in from the padding edge. Header comment,
  `checkShiftedText`, audit-rules.md row. Dry run of the same predicate on every page of the Zen file after the fix: 0
  findings (no false positives); the 30 texts read before the fix had exactly the shape it reports (FIXED, LEFT, x+28
  in a CENTER slot with 0 padding), but the rule itself was not run on them before they were fixed. `npm run ai-kit:check`
  102 ✓ (was 100).
- Repo contracts unaffected (component-properties.json lists only property names). Open for the user: publish the
  library; the Pokeslide file uses its own fork library, so its List-Boxes are not changed by this.
