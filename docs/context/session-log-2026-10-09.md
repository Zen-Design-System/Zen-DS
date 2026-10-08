# Session log 2026-10-09

## DockIcon re-sync from Figma (tier M)

- Live Dock-Icon 308:45902 (page ❖ Dock Icon 298:45468), read with use_figma (read-only). Axes: Size XSmall · Small ·
  Medium · Large · XLarge · 2XLarge; 25 themes; Solid/Subtle. Sizes: 24/12 · 32/16 · 40/20 · 48/28 (Image-Size/Large,
  Popular/Large) · 56/28 (Image-Size/XLarge) · 80/44 (Image-Size/2XLarge, Popular/2XLarge); radius Corner-Radius/Rounded.
  Paints: every fill/content binding matched the code except Accent/Solid content = Color/Content/On-Colors.
  Emoji: Medium 40 + Heading/1, Large 48 + Display/3 (unchanged).
- Code: `dockIconSizes` + `2xlarge`, CSS large 48 / xlarge 56 / 2xlarge 80, accent solid → content-on-colors. Metric's
  Figma instance is Dock-Icon Large 48 (MetricWidget JSDoc updated). Docs examples kept their size (lg→xl, xl→2xl).
- Figma-side issue (not edited, read-only): the set reports errors — 22 "Size=Large, …" variants are 80px duplicates
  (Subtle themes + On-Color/Surface Solid) that should be named Size=2XLarge (component property definitions throw).
- Re-check after the user's Figma update: the set is clean (no duplicate names, property definitions readable, 266
  variants = 44 per size + Emoji at Medium/Large). Sizes, radius, glyph bindings and all 46 Theme/Background paints match
  the code as re-synced above; nothing to change. Not adopted: Figma's default variant (Size=2XLarge, Icon-Src
  icon-home-03-solid) — the code keeps `size="md"` and `icon-star-93-solid` as API defaults. Backlog Figma item removed.
