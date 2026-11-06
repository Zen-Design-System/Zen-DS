# Session log — 2026-11-06

## Project setup: Typography (tier S)

User: "trang khởi tạo project chỗ custom màu với các style UI thiếu phần typography". The theme page had only a
Typography Segmented inside "Size and type" and no preview of the type scale.

- `ProjectSetup.tsx`: own **Typography** section — a 3-tile radiogroup (TileGroup) with "Aa" drawn in each mode's
  Heading/3 (`data-typography` on the art); "Size and type" → **Size and emphasis**. A typography pick opens the
  preview's Typography tab (as a chart change opens Charts).
- `ThemePreview.tsx`: **Typography** gallery tab — headings card (Display/1, 3, Heading/1–4, Subheading), body card
  (Body Extra/Base/Small, Caption, Label, Code) with size / line height read from the sample, and an article card.
- `project.css`: `.studio-project-setup__type-art` (32px box, token sizes).

Then (user: "vẫn không cho đổi typo như trong plugin"): the plugin's Typeface + Type Scale on the page.
- `tools/studio/project-theme.mjs`: `theme.type = { fonts: { sans, heading, display, button }, scale: null | { base,
  ratio } }`; FONT_FAMILIES (Inter + 24 Google Fonts with 400–700), `projectTypeScale` = the plugin's
  TYPESCALE_PREVIEW_ROWS formula (curated values at 14/16 × 1.14), `projectFontsUrl`. theme.css: `@import` of the fonts
  first, then a `[data-brand][data-typography]` block of Typography Configuration values (Code keeps JetBrains Mono).
  Old projects normalise to Inter + no scale (nothing written). Selftest +2032 checks total.
- `projectStore.ts`: @import lines lifted to the top of the joined projects sheet.
- `ProjectSetup.tsx`: Typography = Body/Heading/Display/Button font selects + Type scale tiles (3 modes + Custom →
  Base size, Ratio NumberFields). Tiles' "Aa" use the Heading font.
- `ThemePreview.tsx`: heading rows full width; sizes read in an effect (a layout effect read the previous draft).
- Playwright on :5180 (GO from Giám sát): fonts load (Be Vietnam Pro), 14 × 1.25 → Display/1 130/150, no errors.
  The 390 run found no New project button on the phone layout (Studio's projects home), so no phone shot.
- Not in Figma: Copy to Figma carries no project theme at all (colours included). The user declined that work
  (2026-11-07: "không làm phần này"), so it is not in the backlog.
- BP-07 (Play, breakpoints) timed out once (waitForSelector 60 s) in a 1667 s shard; it worked on the re-run (gate PASS 458/458). Not caused by these files: none is on BP-07's path.
