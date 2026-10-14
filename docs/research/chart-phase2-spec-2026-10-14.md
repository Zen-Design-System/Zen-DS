# Chart family phase 2 — spec card (2026-10-14)

The user (2026-10-14): "kiểm tra update lại các Chart mới từ Figma lên lại studio" → scope "Đủ cả": the seven charts
built in Figma in widget-themes phase 1 (2026-10-13) become code components, Zen Studio offers them, and Studio's
push / pull map every chart set (the five older ones that are not mapped yet included).

Tier L. Figma is the source (`9nZv4uW2LT21yuHabMTCh1`, page ❖ Chart 6143:31287, section Chart components 15576:3333).
The shared visual, motion and a11y language is `docs/research/chart-family-spec-2026-10-12.md` §2–§4: every new
chart follows it (axis labels, dashed grid, Tooltip lane, legend, `chartPalette`, Corner-Radius/Small bars, draw-in
under `--zen-chart-reveal`, reduced-motion fade, focusable plot with ←/→ Home/End and a polite live summary).

Figma's descriptions of the seven sets are older than the file (they still say Value Heading/3, Semi-Pale, Gradient,
"Gradients/Chart/Area"): read the nodes, not the descriptions. Since 2026-10-14 the charts are card-less content that
sits in Chart-Card's Content slot; areas are the series' solid style at layer opacity 0.16 (no gradient); the header
Value is Heading/2.

## 1. Page manifest (❖ Chart, read 2026-10-14)

| Figma set | Node | Variants / properties | Code |
| --- | --- | --- | --- |
| Chart/Chart-Card | 6643:63528 | Card around a chart (Content slot) | `ChartCard` |
| Chart/Line-Chart | 6643:63324 | header props, Show Average, Average | `LineChart` |
| Chart/Stack-Bar-Chart | 6643:73471 | header props, Show Average, Average | `StackBarChart` |
| Chart/Multi-Line-Chart | 15501:3054 | Sector = 4 · 6 · 7 · 12-Sectors; header props, Show Average | `LineChart compare` |
| Chart/Bar-Chart | 15321:84071 | Orientation = Vertical · Horizontal; header props, Show Average | `BarChart orientation` |
| Chart/Donut-Chart | 15324:80365 | Legend = Bottom · Start; Total = Centre · Start; Total Label, Total Value | `DonutChart` |
| Chart/Radial-Chart | 15325:1135 | Legend = Bottom · End | `RadialChart legendPosition` |
| Chart/Heatmap-Chart | 15326:1043 | — | `HeatmapChart` |
| **Chart/Area-Chart** | 15484:2663 | Type = Area · Stacked; Show Legend | **`AreaChart`** (new) |
| **Chart/Grouped-Bar-Chart** | 15485:2457 | Show Legend | **`GroupedBarChart`** (new) |
| **Chart/Combo-Chart** | 15485:2519 | Show Legend | **`ComboChart`** (new) |
| **Chart/Gauge-Chart** | 15486:2467 | Show Legend | **`GaugeChart`** (new) |
| **Chart/Funnel-Chart** | 15486:2497 | — | **`FunnelChart`** (new) |
| **Chart/Bar-List** | 15487:2473 | — | **`BarList`** (new) |
| **Chart/Bullet-Chart** | 15487:2516 | Show Legend | **`BulletChart`** (new) |
| .Chart/Legend-Item | 15321:79362 | Color = Primary … Septenary; Label | `ChartLegend` |
| .Chart/Hatch | 15321:475 | Color = Neutral | projected bars, target tracks |

Header properties on every chart set (Show Icon + Icon, Title, Show Description + Description, Show Value + Value,
Show Ranges, Show Open) belong to `ChartCard` in code (`icon`, `title`, `description`, `value`, `ranges`, `onOpen`);
the chart components draw the plot and legend only.

## 2. API contract (new components)

Shared, as the existing charts: `"aria-label"` (required: what, where, when), `format` (value labels, Tooltip, summary;
default `defaultFormat`), `className`, `animate` (default true), `height` where the chart has a plot, `initialIndex`
where an item can be active, `showLegend` / `legendPosition` (`ChartLegendPosition`) where Figma has Show Legend.
Data types come from `chartCore.tsx` (`ChartPoint`, `ChartSeries`, `ChartStack`); new item types are exported from the
component file. Built-in text comes from `useZenLabels()` (en + vi in `_shared/labels.ts`).

| Component | Data and own props |
| --- | --- |
| `AreaChart` | `data: ChartStack[]`, `series: ChartSeries[]` (1 for `type="area"`, 2–4 for `"stacked"`), `type?: "area" \| "stacked"` (Figma Type, default `"area"`) |
| `GroupedBarChart` | `data: ChartStack[]`, `series: ChartSeries[]` (2–3) |
| `ComboChart` | `data: ChartComboDatum[]` (`{ label, bar, line }`), `barLabel`, `lineLabel`, `format` (bars, start axis), `lineFormat` (end axis), `lineMax?` |
| `GaugeChart` | `value: number`, `max?` (100), `target?`, `actualLabel?` (legend name of the value, as BulletChart), `targetLabel?` (default label "Target"), `caption?` (under the reading; default the target), `size?` |
| `FunnelChart` | `data: ChartPoint[]` (3–6 stages, first = 100%) |
| `BarList` | `data: ChartPoint[]` (3–8 items, ranked by the caller), `headers?: { label: ReactNode; value: ReactNode }` (column labels) |
| `BulletChart` | `data: ChartBullet[]` (`{ label, value, target, max? }`, 1–4), `actualLabel?` / `targetLabel?` (legend; default labels) |

## 3. Owners (who builds what)

| Agent | Components |
| --- | --- |
| charts-xy | AreaChart, GroupedBarChart, ComboChart |
| charts-meter | GaugeChart, FunnelChart |
| charts-list | BarList, BulletChart |
| studio | Studio palette entries; figma-push and figma-pull for all 15 chart sets |

## 4. As built

(Each owner adds its section: per component the Figma node, every layer's token / text style, the axis coverage of
§1 marked covered / deferred / n/a, nested owners, deviations.)

### 4.x charts-list: BarList, BulletChart (2026-10-14)

Figma read 2026-10-14 (read-only `use_figma`, every layer's bound variable, text style and paint style).

**`BarList`** — Figma Chart/Bar-List 15487:2473 (one component, 352 wide; body = `Rows` 15487:2486). Code
`src/components/Chart/BarList.tsx`, CSS block "BarList" in `chart.css`.

| Element (Figma layer) | Figma | Code |
| --- | --- | --- |
| Rows (15487:2486) | V, gap Spacing/Gap/XSmall (8) | `.zen-chart__list` grid row-gap `--zen-spacing-gap-xsmall` |
| Columns (15487:2487) | H space-between; Client / Revenue Caption/Medium · Content/Neutral/Light | `headers` → `.zen-chart__list-head` Caption/Medium, `--zen-color-content-neutral-light`; value label end-aligned |
| Row (15487:2490 …) | H, gap Spacing/Gap/Small (12), 32 tall | subgrid row: track `minmax(0,1fr)` + value `auto`, column gap `--zen-spacing-gap-small`; track 32px |
| Bar › Fill | Corner-Radius/Small; style Color Chart Sector/Primary; layer opacity 0.24, the first row 0.48 | `--zen-chart-sector-primary`, `--zen-corner-radius-small`, opacity .24, the active row .48 (default active = 0, the leader) |
| Bar › name text | Body/Small/Medium · Content/Neutral/Strongest, x 12 | `.zen-chart__list-name` Body/Small/Medium, `--zen-color-content-neutral-strongest`, padding-inline `--zen-spacing-padding-small`; ellipsis when longer than the track |
| Value text | Body/Small/Medium · Content/Neutral/Strongest, end-aligned, 64 fixed | `.zen-chart__list-value` same style, end-aligned, tabular figures; the column hugs the widest value (all rows share it) |

Axes: no variant properties. Header props (Show Icon, Icon, Title, Show Description, Description, Show Value, Value,
Show Ranges, Show Open) → `ChartCard` (n/a here). Nested owners: none (no instances in the body).

**`BulletChart`** — Figma Chart/Bullet-Chart 15487:2516 (one component, 352 wide; body = `Rows` 15487:2529 + `Legend`
15487:2554). Code `src/components/Chart/BulletChart.tsx`, CSS block "BulletChart" in `chart.css`.

| Element (Figma layer) | Figma | Code |
| --- | --- | --- |
| Rows (15487:2529) | V, gap Spacing/Gap/Medium (16) | `.zen-chart__bullet-rows` gap `--zen-spacing-gap-medium` |
| Goal (15487:2530 …) | V, gap Spacing/Gap/XSmall (8) | `.zen-chart__bullet` gap `--zen-spacing-gap-xsmall` |
| Label row | H space-between: name Body/Small/Medium · Content/Neutral/Strongest; "actual of target" Body/Small/Regular · Content/Neutral/Base | `.zen-chart__bullet-name` / `-reading` same styles; the reading is `chartOfTarget(format(value), format(target))`; the active row's reading turns Strongest |
| Bullet › Track | 16 tall, Corner-Radius/Rounded, style Color Chart Sector/On-Color/Tertiary (= Border/Neutral/Subtle/Pressed, 18% light / 23% dark), layer opacity 0.5 | `::before` with `--zen-color-border-neutral-subtle-pressed`, opacity .5, `--zen-corner-radius-rounded` |
| Bullet › Actual | 8 tall at x 4, y 4, Corner-Radius/Rounded, style Color Chart Sector/Primary | inset `--zen-spacing-padding-2-xsmall` (4) top/bottom/start, width = inner length × value/max, `--zen-chart-sector-primary`, rounded |
| Bullet › Target | 3 × 24 at y −4, no radius, style Color Chart Sector/Secondary | `.zen-chart__bullet-target` 3px, 4px past the track each side, centred on the target, `--zen-chart-sector-secondary` |
| Legend (15487:2554) | H start, gap Spacing/Gap/Small (12), wrap gap Spacing/Gap/XSmall (8); .Chart/Legend-Item Primary "Actual", Secondary "Target" | `ChartLegend gap="small" align="start"` (dots `chartPalette[0]` / `[1]`), start-aligned, gap 8 / 12; names `actualLabel` / `targetLabel` (labels `chartActual` / `chartTarget`) |

Axes: `Show Legend` (BOOLEAN, default true) → `showLegend` (covered; plus `legendPosition` top / bottom from the shared
contract, Figma has bottom only). Header props → `ChartCard` (n/a here). Nested owners: `.Chart/Legend-Item` 15321:79362
→ `ChartLegend` (chartCore, unchanged).

Behaviour (both): focusable group (`aria-roledescription="chart"`, named by `aria-label`), polite live summary,
↑/↓ and Home/End move the active row, hover picks it. BarList keeps an active row (default the leader); BulletChart
starts with none (summary lists every goal), a picked row dims the other rows' marks to .32 and resets on blur / pointer
leave, as Radial. Motion: bars grow from the start with `zen-chart-grow` (clip, Slow, Emphasized, staggered
`--zen-chart-stagger`), target ticks fade in after Slow; reduced motion fades; opacity and colour follow in Fast.

Deviations:
- BarList leader length: Figma draws the leader at 78% of the track (216 of 276) with the others in proportion; code
  follows the contract ("share of the leader"): the leader fills the track. Everything else scales the same way.
- BarList value column: Figma 64 fixed; code hugs the widest value (and the header), so long values never clip.
- BulletChart scale: Figma places each row by hand (≈ 1,000 · 30 · 100 for 900 · 24 · 85); code's default
  `max` = `niceScale(max(value, target) × 1.1).top`, which gives exactly those (1,000 · 30 · 100); `max` overrides.
- BulletChart `format` takes `(value, row)` so each goal keeps its own unit (Figma mixes $, count and %), still
  assignable from a plain `(value) => string`.
- Active states have no Figma frame: BarList moves the 48% emphasis to the active row; BulletChart dims the others.

Label keys added (en / vi): `chartActual` "Actual" / "Thực tế", `chartTarget` "Target" / "Mục tiêu" (GaugeChart's
`targetLabel` default can reuse `chartTarget`). Harness: `chart/needs-name` extended to both; new `chart/bar-list-rows`
(> 8 literal items), `chart/bar-list-ranked` (literal values not largest first, an "Other…" row exempt),
`chart/bullet-rows` (> 4 literal goals). Smoke: both in `tests/smoke/fixtures.tsx`; BarList baselines `color-contrast`
(its column labels are Content/Neutral/Light, as every chart's axis labels).

### 4.x charts-meter: GaugeChart, FunnelChart (2026-10-14)

**GaugeChart** — Figma Chart/Gauge-Chart 15486:2467 (a COMPONENT, not a set; read 2026-10-14). Code `src/components/Chart/GaugeChart.tsx`, CSS block "GaugeChart" in `chart.css`.

| Figma layer | Figma | Code |
| --- | --- | --- |
| Gauge 15486:2480 | 352 × 140 frame, ring 240 centred | `.zen-chart__gauge`, width min(100%, `size`), default 240 |
| Track 15486:2481 | Ellipse arc π → 2π, innerRadius 0.8, fill Color/Background/Neutral/Subtle/Default | filled half-annulus path, `--zen-color-background-neutral-subtle-default`; ring = a tenth of the width |
| Value 15486:2482 | same arc to the value, fill style Color Chart Sector/Primary, flat ends | stroke on the band's centre line, `--zen-chart-sector-primary` (`chartPalette[0]`), butt caps, stroke-dash sweep |
| Target 15486:2483 | 28.5 × 14.5 line, 3px, round caps, stroke style Color Chart Sector/Secondary, r 92 → 124 (4px past both edges) | `<line>` at the target angle, 3px × size/240, r inner − 4px → outer + 4px, `--zen-chart-sector-secondary` |
| Readout 15486:2484 | 64 × 48, centred, foot 4px under the base line | `.zen-chart__gauge-readout`, bottom −Spacing/Gap/2XSmall |
| 82% 15486:2485 | Heading/2 · Content/Neutral/Strongest | `format(value)`, Heading/2 · Strongest |
| Target 85% 15486:2486 | Body/Small/Regular · Content/Neutral/Base | `caption` (default "<targetLabel> <format(target)>"), same style |
| 0% / 100% 15486:2487, 2488 | Label/Small/Medium · Content/Neutral/Light, centred under the band, 6px under the ring | `format(0)` / `format(max)`, same style, centred at 5% / 95%, margin-top 2XSmall + 3XSmall (no 6px token) |
| Legend 15486:2489 | HORIZONTAL wrap, gap Spacing/Gap/Small, lines Spacing/Gap/XSmall; Legend-Item Primary "Billable", Secondary "Target" | `ChartLegend` (value: `label` ?? "Actual", target: `targetLabel` ?? "Target"), `ChartLegend gap="small"` (gap XSmall / Small) |
| Component gap | Spacing/Gap/Medium | `ChartBlock` gap 16 |

Axes: Show Legend → `showLegend` (covered; default on when there is a target), `legendPosition` (bottom default; top / start / end as the round charts). Header properties (Show Icon, Icon, Title, Show Description, Description, Show Value, Value, Show Ranges, Show Open) → `ChartCard` (nested owner). Variants: n/a (one component).
A11y: `role="meter"` (aria-valuemin 0, aria-valuemax `max`, aria-valuenow clamped to 0…max, aria-valuetext "Billable 78%, Target 85%") named by `aria-label`; no tab stop, nothing is pickable — a meter is announced with its value in browse mode, which a focusable empty group would not add to. Motion: value sweeps (stroke-dash, `--zen-chart-reveal`, Emphasized), tick fades in after; reduced motion fades.
Deviations: the description's "24px" ring holds at the 240 default; the code keeps the node's innerRadius 0.8 at any `size` (the tick's 3px and 4px overshoot are px at `size` and scale with the box like the ring). The Gauge frame is 140 tall in Figma; code is 138 (ring 120 + 6 + 12 label), the 2px are Figma slack. Axe baseline: `GaugeChart: color-contrast` — the end labels are Content/Neutral/Light (3.79:1 on Surface), the same Figma axis-label style the other charts carry in the baseline (BarChart, LineChart, HeatmapChart, StackBarChart, BarList).

**FunnelChart** — Figma Chart/Funnel-Chart 15486:2497 (a COMPONENT). Code `src/components/Chart/FunnelChart.tsx`, CSS block "FunnelChart" in `chart.css`.

| Figma layer | Figma | Code |
| --- | --- | --- |
| Stages 15486:2510 | VERTICAL, gap Spacing/Gap/XSmall | `.zen-chart__stages` grid, row gap XSmall |
| Stage 15486:2511 … 2539 | HORIZONTAL, gap Spacing/Gap/Small, 32 tall | `.zen-chart__stage` (subgrid), column gap Small, rows 32 |
| Label 15486:2512 | FIXED 84 wide: name Body/Small/Medium · Content/Neutral/Strongest over count Caption/Regular · Content/Neutral/Base | `minmax(84px, max-content)` column (a longer name widens it for every row), same styles, `format(value)` |
| Track / Bar 15486:2515 / 2516 | FILL track; 32px bar centred, width = share of the first stage, Corner-Radius/Small, fill style Color Chart Sector/Primary; the last stage (15486:2544) Sector/Secondary | `.zen-chart__stage-bar`, same tokens, min 2px when the value > 0, `--zen-chart-sector-primary` / `-secondary` |
| 100% 15486:2517 | FIXED 40, Body/Small/Medium · Strongest, right-aligned | `minmax(40px, max-content)` column, same style, whole percent of the first stage |

Axes: none in Figma besides the header (→ `ChartCard`). Interaction (contract, not in Figma): stages pickable like horizontal bars — ↑/↓, Home/End, hover; the picked stage keeps its bar, the others dim to .32 (the round charts' pick); `initialIndex` (default none); summary "Qualified: 312, 65% of Leads (2 of 5)", overview "Leads 480 (100%), …". Motion: bars open from their centre (clip-path, Slow, Emphasized, staggered); reduced motion fades.
Deviations: none from the nodes; the stale description ("Heading/3", "Semi-Pale, Gradient") ignored.

Label keys: reused `chartActual` / `chartTarget` (added by charts-list); new `chartShareOf(share, of)` ("65% of Leads" / "65% của Leads"). Harness: `chart/gauge-in-range` (warn: literal value or target past the literal max, 100 by default), `chart/funnel-stages` (warn: literal data with < 3 or > 6 stages, or a stage larger than the one before); `chart/needs-name` lists both. Examples (page `chart`): "Utilisation against a target", "Hours this week on a phone", "Proposal funnel", "Six stages with the keyboard". Do/Don't: gauge with / without `max`; funnel in order / out of order.

### 4.x charts-xy: AreaChart, GroupedBarChart, ComboChart (2026-10-14)

Figma read 2026-10-14 (read-only `use_figma`: every layer's bound variable, text style and paint style). The three are
card-less content (Heading · hidden Segmented · Chart 352 × 220 · Legend, gap 16); the Heading belongs to `ChartCard`.
All three share one plot frame, read from the nodes and built on `PlotFrame` (`kind="bar"`, so the frame, keyboard,
sector columns, X pill, live summary and top-lane Tooltip are the family's own):

| Element (Figma layer) | Figma | Code |
| --- | --- | --- |
| Y-Axis (15484:2566 …) | 36 wide, padding-end Spacing/Padding/XSmall, bottom Spacing/Padding/Large, labels end-aligned, Label/Small/Medium · Content/Neutral/Light | PlotFrame Y column (28 min + `--zen-spacing-gap-xsmall`), right-aligned, same style |
| Grid lines | 1px Border/Neutral/Pale/Default, dash 4 / 4 | PlotFrame grid (CSS `dashed`, the family's) |
| Baseline | 1px solid Border/Active/Neutral/Subtle | `.zen-chart--area/--grouped/--combo` baseline `--zen-color-border-active-neutral-subtle` (the older charts keep Pale) |
| X-Axis ticks | equal columns, centred, Label/Small/Medium · Content/Neutral/Light | PlotFrame sectors; the active label is the family's pill (Figma shows no active label) |
| Legend (15484:2653, 15485:2511, 15485:2581) | wrap, centred, gap Spacing/Gap/Small, rows Spacing/Gap/XSmall; `.Chart/Legend-Item` Primary · Secondary · Tertiary | `ChartLegend gap="small"` (gap XSmall / Small) |

**`AreaChart`** — Figma Chart/Area-Chart 15484:2663 (Type=Area 15484:2552, Type=Stacked 15484:2605). Code
`src/components/Chart/AreaChart.tsx`.

| Element (Figma layer) | Figma | Code |
| --- | --- | --- |
| Area (15484:2594) | vector from the first column's centre to the last, fill style Color Chart Sector/Primary, layer opacity 0.16, no gradient | `.zen-chart__area-band` fill = `colourAt(series)`, `fill-opacity: .16` |
| Line (15484:2595) | 2px, round caps, straight segments, stroke style Color Chart Sector/Primary | `.zen-chart__area-line` 2px, round caps/joins, `M … L` segments, non-scaling stroke |
| Stacked bands (15484:2647/2649/2651) | each band between the previous top and its own, styles Primary · Secondary · Tertiary, layer opacity 0.24; a line on each band's top | bands from the running totals, `fill-opacity: .24` (`[data-type="stacked"]`); lines in Figma's order (band, line per series, bottom first) |
| Dot (15484:2597) | 12 × 12, Surface/Default, 2px inside stroke Color Chart Sector/Primary | `.zen-chart__area-dot` `--zen-element-size-popular-2-xsmall`, `--zen-color-background-surface-default`, 2px ring in the series colour; one per line when stacked |
| Rule (15484:2596) | 1px Border/Active/Neutral/Subtle from the point to the baseline | `.zen-chart__area-rule` (PlotFrame's full-height sector rule is off for the area) |
| Tooltip (15484:2598) | Tooltip Default · Medium beside the dot (6px gap), centred on the point | `TooltipSurface` default medium in `.zen-chart__point-tip`: a dot's width (12) from the point, before it on the end half, after it on the start half, clamped inside the plot; reads the value, or the stack's total |
| Grid top | grid starts 6px down (half the top label) | top lane `calc(--zen-typography-line-height-label-small / 2)` |

Axes: Type = Area · Stacked → `type` (covered); Show Legend → `showLegend` (covered; default off for one area — the
Area variant has no Legend frame — on when stacked), `legendPosition` top / bottom (contract; Figma bottom only). Header
props → `ChartCard` (n/a). Nested owners: Tooltip 1595:2377 → `TooltipSurface`; `.Chart/Legend-Item` → `ChartLegend`.

**`GroupedBarChart`** — Figma Chart/Grouped-Bar-Chart 15485:2457. Code `src/components/Chart/GroupedBarChart.tsx`.

| Element (Figma layer) | Figma | Code |
| --- | --- | --- |
| Invoiced / Collected (15485:2499 …) | 12 wide, 4 apart, centred in each column; fill styles Color Chart Sector/Primary · Secondary; Corner-Radius/XSmall top corners | `.zen-chart__group` (flex, gap `--zen-spacing-gap-2-xsmall`, 2px side padding) › `.zen-chart__group-bar` `flex: 0 1 12px` (narrower when the column can't hold it), `colourAt(series)`, `--zen-corner-radius-xsmall` top corners |

Axes: Show Legend → `showLegend` (covered, default on), `legendPosition` (contract). Header props → `ChartCard` (n/a).
Nested owners: `.Chart/Legend-Item` → `ChartLegend`.

**`ComboChart`** — Figma Chart/Combo-Chart 15485:2519. Code `src/components/Chart/ComboChart.tsx`.

| Element (Figma layer) | Figma | Code |
| --- | --- | --- |
| Revenue bars (15485:2568 …) | 20 wide, centred, fill style Color Chart Sector/Primary, Corner-Radius/XSmall top corners | `.zen-chart__combo-bar` `min(100%, 20px)`, `--zen-chart-sector-primary`, `--zen-corner-radius-xsmall` top corners |
| Margin line (15485:2574) | 2px, round caps, straight, stroke style Color Chart Sector/Secondary | `.zen-chart__combo-line` `--zen-chart-sector-secondary` |
| Dot × 6 (15485:2575 …) | 8 × 8, Surface/Default, 2px inside stroke Color Chart Sector/Secondary | `.zen-chart__combo-dot` 8px; 12px when active |
| Y-Axis-End (15485:2541) | 36 wide, padding-start Spacing/Padding/XSmall, labels start-aligned, same text style; 0 – 50% on the start axis' gridlines | `.zen-chart__y.zen-chart__y-end` beside the frame in `.zen-chart-combo`, `--zen-spacing-padding-xsmall`; ticks = the start axis' step count, each a 1 · 2 · 2.5 · 5 step over the line (Figma's 50% for 41%), or `lineMax` / count |

Axes: Show Legend → `showLegend` (covered, default on), `legendPosition` (contract). Header props → `ChartCard` (n/a).
Nested owners: `.Chart/Legend-Item` → `ChartLegend` (bars Primary, line Secondary).

Behaviour (all three): focusable group (`aria-roledescription="chart"`), polite live summary (area: "Sep: 5,900 h
(6 of 6)"; stacked: "Sep: total 5,900 h; Design 2,650 h, … (6 of 6)"; grouped: "Aug: Invoiced $97K, Collected $95.8K
(5 of 6)"; combo: "Jun: Revenue $88.4K, Margin 29% (3 of 6)"), ←/→ and Home/End, hover picks the period. Motion: areas
and the combo line with its dots wipe in from the left (`.zen-chart__marks`, as LineChart); grouped and combo bars rise
under their top corners (`zen-chart-rise-top`, Slow, Emphasized, staggered `--zen-chart-stagger`); the area's Tooltip
fades in Fast; opacity follows in Fast; reduced motion fades.

Deviations:
- Active states have no Figma frame for Grouped and Combo (Area shows one): grouped and combo use the family's top-lane
  Tooltip (`SeriesValues`) and X pill; the bars of the other periods ease to 88% (as stacked columns). The combo hides the
  sector rule (it would cut through the active bar); the active dot grows to 12px. The area keeps Figma's own active
  state (dot, rule to the baseline, Tooltip beside the dot) plus the family's X pill.
- Bar corners: Corner-Radius/XSmall on the top corners only (the nodes), not the older bars' Corner-Radius/Small on every
  corner; the draw-in clip follows them (`zen-chart-rise-top`).
- Baseline: Border/Active/Neutral/Subtle (the nodes) on these three only; Line / Bar / Stack keep Pale.
- `data` is typed `ChartDatum[]` (the same shape as the contract's `ChartStack`, which is a deprecated alias of it).
- `legendPosition` is `"top" | "bottom"` (as LineChart and StackBarChart); start / end stay with the round charts.
- `height` default 280 (the family's Line / Bar default), not Figma's 220 Chart frame; the area's top lane is half a Y
  label (Figma), grouped and combo keep the bar charts' 36px Tooltip lane and 28px X lane.
- One `format` per axis as in the family: Figma's area mixes "2.5K" axis labels with a "2,210 h" Tooltip.

Label keys: none new (reuses `chartPoint`, `chartTotal`, `noData`). Harness: `chart/needs-name` extended to the three;
new `chart/series-need-legend` (error: a stacked area, grouped bars or a combo with `showLegend={false}`),
`chart/area-series-count` (warn: stacked with < 2 or > 4 literal series, or one area given several),
`chart/grouped-series-count` (warn: 1 or > 3 literal series), `chart/combo-needs-labels` (error: `barLabel` /
`lineLabel` missing or empty). Smoke: the three in `tests/smoke/fixtures.tsx`; each baselines `color-contrast` (the
axis labels are Content/Neutral/Light, as every chart's). Examples (`chart` page): "Hours over time", "Stacked by team"
(keyboard + summary), "Invoiced vs. collected", "Grouped bars on a phone" (PlatformPhone), "Revenue and margin",
"A share on a fixed axis" (`lineMax={100}`); one Do/Don't pair each in `PlatformGuidelineVisuals.tsx`.

### 4.x studio: palette, Export › Figma (push) and Import from Figma (pull) (2026-10-14)

`tools/studio/figma-charts.mjs` (new, isomorphic) holds the 15 sets by id + name (the plugin finds a set by id, then by
name; no keys needed) and both directions; `figma-push.mjs` (`chartNode`, `chartCardNode`) and `figma-pull.mjs`
(`readChart` in the read code, `chartElement`, `chartCardElement`) call it.

| Code | Figma set | Variant / boolean / text properties |
| --- | --- | --- |
| `LineChart` (no `compare`) | Chart/Line-Chart 6643:63324 | `showAverage` ↔ Show Average (+ Average "Avg " + mean) |
| `LineChart compare` | Chart/Multi-Line-Chart 15501:3054 | Sector ← `data.length` (4 · 6 · 7 · 12; else the nearest + note); Show Average; legend is on top (note otherwise) |
| `StackBarChart` | Chart/Stack-Bar-Chart 6643:73471 | Show Average (mean of the stacks' totals) |
| `BarChart` | Chart/Bar-Chart 15321:84071 | `orientation` ↔ Orientation; Show Average (mean of the closed bars) |
| `DonutChart` | Chart/Donut-Chart 15324:80365 | `legendPosition` bottom · start ↔ Legend (top → Bottom, end → Start, note); `totalPosition="start"` ↔ Legend=Start, Total=Start; `label` ↔ Total Label ("Total" without); `value` ↔ Total Value (only when written; Figma's sample total is left to the code on pull) |
| `RadialChart` | Chart/Radial-Chart 15325:1135 | `legendPosition` bottom · end ↔ Legend (top → Bottom, start → End, note) |
| `HeatmapChart` | Chart/Heatmap-Chart 15326:1043 | — |
| `AreaChart` | Chart/Area-Chart 15484:2663 | `type` ↔ Type; `showLegend` ↔ Show Legend (default: on only when stacked) |
| `GroupedBarChart` · `ComboChart` · `BulletChart` | 15485:2457 · 15485:2519 · 15487:2516 | `showLegend` ↔ Show Legend |
| `GaugeChart` | Chart/Gauge-Chart 15486:2467 | `showLegend` ↔ Show Legend (default: on with a target) |
| `FunnelChart` · `BarList` | 15486:2497 · 15487:2473 | — |
| `ChartCard` | Card (its `theme`; Chart/Chart-Card 6643:63528 is read as its Card) holding the chart | `icon` ↔ Show Icon + Icon; `title` ↔ Title; `description` ↔ Show Description + Description; `value` ↔ Show Value + Value; `ranges`/`range` ↔ Show Ranges + the Segmented's Item-List items (Select); `onOpen` ↔ Show Open (pull: `proto.toast`) |

A chart outside a ChartCard: every Show* off and its `Heading` layer hidden (Title has no toggle); the pull reads a
chart whose Heading shows outside a Card as the chart and notes that its header was left out. What does not travel:
the data (Figma draws its own sample; the pull takes the Studio palette sample of that kind, the Multi-Line sample
stretched to its Sector's months so a round trip keeps the Sector), `format`/`lineFormat`, `height`, `size`,
`initialIndex`, `curve`/`fill`, `headingLevel`, ChartCard `surface` (note), legend positions Figma has no option for
(note), and on pull a Show Legend that is off on a stacked area, grouped bars or a combo (the harness needs it; note).

Palette (`slots/palette.ts`): Area chart, Stacked area chart, Grouped bar chart, Combo chart, Gauge, Funnel, Bar list,
Bullet chart in Charts, with synonyms (EN + VI) in `builder/library/synonyms.ts`. Generated: `compile-api.generated.mjs`,
`keywords.generated.ts`, `partProps.generated.ts` (chart-only diffs).

Live check in the Zen file (2026-10-14): the plugin importer (`studio-import.js`, minified, component lookup on the
icon page) placed a 17-card + 1 bare chart page on Studio exports: every set, theme, variant and header property as
pushed (no notes); figma-pull read it back to the same 35 cards/charts props. A Chart/Chart-Card instance pulled as a
ChartCard. Everything made was removed. Found on the way: a re-import of a page with a multi-row Grid turns the Grid
into a vertical stack (plugin `applyLayout`: `layoutMode = "GRID"` on a grid with occupied rows throws "Cannot delete
occupied row/column", caught as VERTICAL); `defaultFormat` writes "Avg 306.6666666666667" for a fractional mean below
1,000 (StackBarChart tag).

### 4.x Review (2026-10-14)

- Legend spacing, Figma read: every phase-2 legend (Area 15484:2653, Grouped-Bar 15485:2511, Combo 15485:2581, Gauge
  15486:2489, Bullet 15487:2554) is a wrapping row of `.Chart/Legend-Item` with items Spacing/Gap/Small (12) and rows
  Spacing/Gap/XSmall (8), centred (Bullet: start); the older ones (Multi-Line 15426:2587, Donut 15324:1041, Radial
  15325:1076) keep XSmall (8) / 2XSmall (4), their column legends XSmall. One shared prop replaces the three per-kind CSS
  overrides: `ChartLegend gap="small"` (`.zen-chart__legend[data-gap="small"]`) and `align="start"` (Bullet); the older
  charts keep the default.
- `useChartSelection`: until an item is picked the active one follows `initialIndex` (default), so data that arrives
  after mount (an empty first render) shows its default item instead of "No data" — every chart in the family.
- GaugeChart: a non-number value reads 0 and a non-number target is no target (aria-valuenow stays a number).
