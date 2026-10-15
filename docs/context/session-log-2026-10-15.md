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

## Zen Studio as Figma UI3 floating panels (tier L, user: "đổi UI Zen Studio về giống như UI floating của UI3")

Decisions (user picked every recommendation): toolbar removed as in UI3; Inline-Field Type=Number in Figma first;
colour = swatch + token name (no free hex); SliderField only for number props with a known min–max; component size stays
the Studio mode; Emphasis Light.
- Figma (file 9nZv…, published by the user): Input/Inline-Field + 8 variants Type=Number (Text clones, Field Trailing on,
  swapped to `.Primitives/Input/Number/Trailing`, value 12, Disabled steppers State=Disabled), set 1448×616; description
  and doc frame text updated (repo source `tools/figma-docs/component-descriptions.mjs` same). Fixed on the way:
  Number/Trailing's − button bound Neutral/Strongest (old swap) → fresh instance, Button-Tertiary/Content like +.
- Shell: `studio.css` — canvas area `inset: 0`, panels absolute (Spacing/Padding/XSmall from the edges, Corner-Radius
  XLarge, the popover edge and shadow); both panels full height (a hugging Inspector left its option lists no room: B-15/B-16 found the Select list cut off above it). `--studio-inset-
  left/right` = what docked panels cover: the overlay portal, canvas tools and "?" sit in the rest; a document page's
  canvas area starts after the left panel. `PanelHeaders.tsx` replaces `Toolbar.tsx` (brand menu = mark + chevron, holds
  light/dark; Document | Studio fills the left header; role · undo/redo · drafts head the Inspector; `CollapsedLeftBar` /
  `CollapsedRightBar` when not docked). Drafts density `panel` (count + Save all). Zoom menu on the Inspector tab row.
- Canvas: `setCanvasInsets` (StudioApp measures the docked panels with a ResizeObserver) and `getSafeBox`; `viewportFor`,
  zoom centre, `ensureVisible`, `zoomToWidth/Read`, `viewportForWidth`, keep-in-view, FrameChrome's label/toolbar clamps
  and drag edge-pan use the visible part.
- Inspector: `InspectorRow` provides `useInlineLabel()`; TextControl, NumberControl, LinesControl, EnumControl's select,
  NumberEnumControl, Typography, Tone (ColorSwatch at the end, no chevron), Icon, Photo, ScaleField and StaticField draw
  `layout="inline"`; the row hides its label (`:has`) and the field spans both columns. Switches/Segmented keep the label,
  indented by the field inset. Playground selects (platform markup) get the same look by CSS only. `NumberSliderControl`
  (SliderField, write after a 400 ms pause / blur) for `numberRanges.ts`.
- Bug met: EnumControl's Segmented fit used 16px chrome; since #60 it is 24 (label padding 8) → "Stac…" cut. Now read
  from the Segmented tokens, measured against the control column so select ↔ Segmented never flips.
- E2E selectors: openStudioSpace (`.studio-space`), S-02 (zoom on the tab row), S-03, D-01 (drafts button name), G
  chromeText. Checks: tsc, studio:selftest, style:check, usage:check, screenshots 1512/1100/900/390, dark.
