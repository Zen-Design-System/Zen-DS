# Chart family — spec card (2026-10-12)

The user's request (2026-10-12): build the chart components of the library, animation included, for Zen Studio, and
build them back into the official Zen Figma file (`9nZv4uW2LT21yuHabMTCh1`, page ❖ Chart 6143:31287, section Chart
7032:8969). Mood and style follow the user's moodboard (white cards, soft dashed grids, pill labels, hatched
projections, donut and ring gauges, an activity heatmap), with Zen tokens and components only. "Tất cả chart phải đồng
bộ style": every chart, the existing Line and Stack-bar included, shares one visual language and one motion language.

Tier L (new components). Code is the source of this family; Figma is built from it.

## 1. Family

| Component | What it shows | Moodboard card |
| --- | --- | --- |
| `LineChart` (extended) | One measure over time (unchanged default), or 2–4 series (`series`, `dashed`, `fill`) | Analytics 2, Analytics 3, Balance statistics |
| `BarChart` (new) | One measure per category or period; vertical or horizontal; projected (hatched) bars; a target track | Revenue 2, Revenue 3 |
| `StackBarChart` (restyled) | Part-to-whole per period | — |
| `DonutChart` (new) | Shares of one total, with % pills and a centre figure | Transfer history 2 |
| `RadialChart` (new) | 1–4 measures against a max, as concentric rings, with a centre figure | Transfer history 3 |
| `HeatmapChart` (new) | A value per row × column (day × hour) on a 5-step ramp | Activity by time |
| `ChartCard` (extended) | The card: leading `icon`, `description`, `value`, then ranges and the chart | every card |

## 2. One visual language

| Element | Tokens |
| --- | --- |
| Axis labels (Y values, X periods, heatmap rows/columns, horizontal categories) | Label/Small/Medium · Content/Neutral/Light |
| Active X label | 20px pill, Corner-Radius/Rounded, Background/Active/Neutral/Subtle · Content/Neutral/Strongest |
| Gridlines | 1px dashed Border/Neutral/Pale, baseline solid (`zen-allow-dashed-color`, a data guide) |
| Sector rule | 1px Border/Active/Accent/Subtle at 35% (line), Solid when active; Neutral/Subtle for bars |
| Tooltip | `TooltipSurface` default medium, in the plot's 36px top lane |
| Legend | 12px dot (Element-Size/Popular/2XSmall), Spacing/Gap/2XSmall to its label, Caption/Regular · Content/Neutral/Strongest; items gap 4/8; `legendPosition` bottom (default) or top |
| Categorical colours (series, slices, rings) | `chartPalette` in order: Chart/Sector/Primary, Chart/Sector/Secondary, Support Cyan, Violet, Yellow, Green, Orange (Solid) |
| Single measure | Line: Border/Accent/Solid + Accent area (unchanged). Bars: Chart/Sector/Primary, the active bar Chart/Sector/Secondary |
| Projected bar, target track | Hatch: 45° stripes of Border/Neutral/Subtle on transparent |
| Hatched area (`fill="hatch"`) | The series colour, 1px stripes every 6px at 32% |
| Heatmap ramp (5 levels, low → high) | Support/Brand Pale · Subtle · Soft · Solid · Deep |
| Bars, heatmap cells | Corner-Radius/Small on every corner (stack: the column, outer corners) |
| Ring and donut tracks | Dotted ring: Border/Neutral/Subtle, dash 0 × 6 round caps |
| Donut % pill | Surface/Default, Label/Small/Medium · Content/Neutral/Strongest, Corner-Radius/Rounded; shown when the slice ≥ 6% |
| Centre figure (Donut, Radial) | Heading/4 · Content/Neutral/Strongest, caption Caption/Regular · Content/Neutral/Light |
| Average line (`showAverage`: Line, Bar, Stack bar) | 2px Border/Neutral/Solid dots every 6px, each ringed in Surface/Default; tag Label/Small/Medium · Content/Inverse/Strongest on Background/Neutral/Solid, Corner-Radius/XSmall, 6px tip pointing along the rule; at the plot's start (vertical), on top (horizontal bars). Mean of the first series · closed bars · column totals |
| Card header | [Icon 20 Content/Neutral/Strongest] Heading/Subheading title … chevron IconButton (main tertiary 2xs); description Body/Small/Regular · Content/Neutral/Base; value Heading/3 (Metric medium) |

Geometry: plot lanes 36px top (Tooltip) / 28px bottom (X labels); bar column = 2px side padding, bar width ≤ 40px
(vertical); horizontal bars 24px thick, gap Spacing/Gap/Medium (16); heatmap cells gap Spacing/Gap/2XSmall (4), 24px
tall; donut ring = 22% of the diameter, 4px gaps between slices; radial rings 10px thick, Spacing/Gap/XSmall (8)
apart.

## 3. One motion language (`animate`, default true)

Every chart draws itself in on mount and again when its data changes; only transform, opacity, clip-path and stroke
dashes move. Durations and curves come from `--zen-motion-*`; `--zen-chart-reveal` = Slow × 2.5 (700ms).

| Chart | Enter | Reduced motion |
| --- | --- | --- |
| Bars (vertical / horizontal, stack columns) | Clip reveal from the baseline, Slow, Emphasized, staggered Xfast × 0.5 per bar | fade, Base |
| Line, area | Clip wipe left → right over `--zen-chart-reveal`, Standard; the active dot and Tooltip fade in after | fade |
| Donut | Every slice grows from its start angle (stroke dash) over `--zen-chart-reveal`, Emphasized; % pills fade after | fade |
| Radial | Each ring sweeps 0 → value, `--zen-chart-reveal`, Emphasized, staggered Xfast per ring | fade |
| Heatmap | Cells fade and scale up from 60% (× Motion/Movement), Base, staggered by row + column × Xfast/4 | fade |
| Hover / keyboard | Colours and opacity change in Fast; nothing moves | same |

## 4. Interaction and a11y (every chart)

The plot is a focusable group (`aria-roledescription="chart"`, named by `aria-label`) with a polite live summary of the
active item. ← / → (↑ / ↓ for horizontal bars) and Home / End move the active item; the heatmap moves in 2D (← → ↑ ↓,
Home / End in the row). Pointer hover sets the active item. Colour is never the only key: series charts keep their
legend, slices and rings name themselves in the legend and the summary.

## 5. Figma (❖ Chart, section 7032:8969)

Components built from Zen variables, text styles and components only (Card, Tooltip, Segmented, Button/Icon-Main,
Icon): `Chart/Bar-Chart` (Orientation=Vertical | Horizontal), `Chart/Donut-Chart`, `Chart/Radial-Chart`,
`Chart/Heatmap-Chart`, `Chart/Multi-Line-Chart` (Fill=None | Hatch), primitives `.Chart/Legend-Item` and the shared
header (icon, description, value as boolean properties on each chart card), plus one cover card per chart in the style
of the three existing covers. The existing Line, Stack-Bar and Chart-Card take the shared language (bar radius, card
header properties).

### 5.1 As built (2026-10-12)

| Figma | Node | Variants | Code |
| --- | --- | --- | --- |
| Chart/Bar-Chart | 15321:84071 | Orientation=Vertical 15321:80574 · Horizontal 15321:82941 | `BarChart` `orientation` |
| Chart/Multi-Line-Chart | 15323:80980 | Fill=Hatch 15322:962 · None 15323:80892 | `LineChart` `series` (`fill`, `dashed`) |
| Chart/Donut-Chart | 15324:80365 | Legend=Bottom 15324:984 · Start 15324:1057 | `DonutChart` `legendPosition` |
| Chart/Radial-Chart | 15325:1135 | Legend=Bottom 15325:1029 · End 15325:1086 | `RadialChart` `legendPosition` |
| Chart/Heatmap-Chart | 15326:1043 | — | `HeatmapChart` |
| .Chart/Hatch | 15321:475 | Color=Neutral 15321:283 | projected bars, target tracks |
| .Chart/Legend-Item | 15321:79362 | Color=Primary … Orange, TEXT Label | `ChartLegend` |
| Chart/Line-Chart, Chart/Stack-Bar-Chart (existing) | 6643:63324, 6643:73471 | — | took the header properties (hidden by default; their 10 + 8 instances unchanged) |

Header properties on every chart card ↔ `ChartCard`: Show Icon + Icon (INSTANCE_SWAP) ↔ `icon`, Title ↔ `title`,
Show Description + Description ↔ `description`, Show Value + Value ↔ `value`, Show Ranges ↔ `ranges`, Show Open ↔
`onOpen`. Covers: BAR 15329:1054, MULTI-LINE 15330:1889, DONUT 15330:2075, RADIAL 15330:2222, HEATMAP 15330:2317.

Deviations (Figma limits, not design choices): the new charts are the card itself with Card Flat/Medium's bindings (a
Card's content is a slot, and slot content cannot carry the outer component's properties); text properties are one per
set, so the main Horizontal bar variant reads "Revenue" (its cover instance overrides it); the hatched area is a clipped
stripe vector bound to Chart/Sector/Primary at 32% (masks don't clip frames through the API); the Radial ring is 184px
in Figma so its End legend fits a 400px card (code default 200); the multi-line Tooltip reads "$105.7K · $88.3K" where
the code puts a series dot before each value. Raw geometry kept as numbers: stroke weights, dash patterns, plot height
240, donut inner radius 0.56 and its 4px gaps, the hatch master 400×400.

The chevron of the three existing chart cards was bound to Color/Content/Neutral/Strongest (an old swap override);
re-swapped from the Button's default so it takes Button-Tertiary/Content/Default like a fresh Button/Icon-Main
(Stack-Bar's button re-created as 15332:81887, its Show Open reference kept).

`Show Average` (BOOLEAN, default false) + `Average` (TEXT) ↔ `showAverage`: Bar-Chart `Show Average#15335:0` /
`Average#15335:3` ("Avg $88.7K"), Multi-Line `#15336:0` / `#15336:3` ("Avg $93.2K"), Line-Chart `#15336:6` / `#15336:7`
("Avg $14.8K"), Stack-Bar `#15336:8` / `#15336:9` ("Avg $20.8K"). Layer `Average` = `Rule-Ring` (4px Surface/Default) +
`Rule` (2px Border/Neutral/Solid), both round caps, dash 0.01/6, and `Average-Tag` (Body + Tip). Horizontal bars: the tag
over a `Rules` frame and a conditional `Average-Lane` (Spacing/Padding/Medium) on top. On for the cover instances of
BAR (15329:1087) and MULTI-LINE (15330:1922).

Fixes met on the way (2026-10-12): re-creating Stack-Bar's open button dropped the hidden-chevron override of the two
"Billable hours by team" instances (15279:1512, 15276:3107 and their nested copies); they now say `Show Open = false`.
Chart/Line-Chart's Y labels read "$20K" and "5K" at the bottom (overrides of the Trend primitive's 1 and 0): now "$5K"
and "$0".
