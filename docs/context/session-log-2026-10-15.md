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
