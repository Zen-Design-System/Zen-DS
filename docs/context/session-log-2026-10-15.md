# Session log 2026-10-15

## Figma descriptions of the property-panel sets (tier XS, user: "cập nhật mô tả Figma cho 5 bộ mới")

- `tools/figma-docs/component-descriptions.mjs`: Input/Inline-Field, Input/Color-Field, Color-Picker,
  .Primitives/Input/Color-Swatch, Slider/Field, Chart/Curve-Preview, from the designer's Figma drafts and the
  guidelines (color-picker, slider-field, curve-preview); in FORCE (they replace the specific drafts); Color-Swatch in
  `build.mjs` EXTRA (a private set the contract leaves out).
- Written with `build.mjs sets "…"` (6 written); Color-Picker's four Format variants held a copy of the draft: cleared,
  the set holds the text. Old texts in "Description backup 2026-10-15" (15741:3) on 🔒 ARCHIVED: review, delete, publish.
- Read back: no "Draft", a Code line each, no `&amp;`.

## Segmented component-size tokens (tier XS, user: "update lại tokens component size của segmented", "update theo figma")

- Live read of Component Size `Segmented/*`: Size unchanged (Medium 36 / 44, Small 28 / 36). Changed since the
  2026-10-14 capture: Spacing Medium/Small Gap → 0 (was dm-4 / dm-2), Text-Wrapper-Padding → dm-8 (was dm-4);
  Spacing/XSmall/* gone from Figma → removed (no consumer). Studio mode = Compact.
- `component-size.json`, tokens:build (web + native), segmented.css fallbacks; contract of Primitives/Segmented/Item and
  Segmented re-captured (mcp-capture, 1 call): only padding 4 → 8, gap → 0 and widths; contracts.lock rebuilt.

## Accordion Size=Small (tier M, user: "làm Accordion size Small"; spec "Bậc giữa, thoáng hơn")

- Figma (9nZv4uW2LT21yuHabMTCh1): .Primitives/Accordion/Content +4 Small variants (cloned from Medium; SLOT and Title
  refs restored, Body/Base/Bold title, Body/Small/Regular content, Contents Gap/Small; Full: title hugs its lines,
  Chevron-Space 20 with no inset, row gap Gap/Small). Accordion/Text +8 Small variants in grid rows 12–15 (nested
  primitive Size=Small, padding Padding/Small, Container gap Gap/Small, Wrapper inset 0, Box Corner-Radius/Base).
  Collapsed 44, open 104. Descriptions: Accordion/Text via tools/figma-docs (FORCE), primitive by hand; backups in
  "Description backup 2026-10-15".
- Code: `size` small/sm (titleStyle, contentStyle per size; CSS Small block), guideline Size and Contents rows,
  component-properties Size options, Studio maps regenerated, example Layer settings (Small in a panel).
- Fixed (user: "sửa luôn"): the primitive's 8 Content Width=Full variants had no Title text-property reference → linked
  to Title#239:80 (16 nested instances, none customised, all read the property).
- Box border (user removed it in Figma, 2026-10-15): all 16 Box roots of Accordion/Text, Small included, have no stroke;
  Divider keeps its bottom Pale rule. Code draws none on Box, so nothing changes; BACKLOG P3 designer question closed,
  Accordion JSDoc: Divider rule Pale (was Subtle), Box no border.
