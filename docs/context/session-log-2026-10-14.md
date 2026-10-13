# Session log 2026-10-14

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
