# Widget patterns — spec card (2026-10-14)

The user (2026-10-14): "Build tiếp các widget pattern cho đa dạng" → "làm mỗi lần 20 cái. Commit, push, merge rồi tính
tiếp". Choices (AskUserQuestion): widget patterns live in a new **Widgets group of the Zen Studio palette** and a new
**Widgets page on the platform** (view + copy code); **batch 1 = metric + chart**: the seven Metric-Card types of the
Figma file and thirteen chart widgets.

A widget pattern = one complete dashboard widget composed of Zen components only (no page-local substitutes), with
realistic copy and data, its code shown on the Widgets page, insertable from Studio's Widgets group and carried by
Studio's Export › Figma / Import from Figma like any palette item.

Figma (source of truth): `9nZv4uW2LT21yuHabMTCh1`. Card `6643:51021` (page ❖ Card 6643:49849): Theme = Shadow · Flat ·
Pale · Border · On-Container · Solid; Color = Neutral · Brand · Cyan · Violet · Green · Yellow · Orange · Blue · Purple;
Surface = Default · Alt · Flat; Spacing; Active; Content slot; Sub-Action. Metric-Card `6643:64008` (page ❖ Metric Widget
595:54968): Type = KPI · Sparkline · Spark-Bars · Goal-Progress · Comparison · Category-Bar · Hero. Charts: page ❖ Chart
6143:31287 (see `docs/research/chart-phase2-spec-2026-10-14.md`).

Theme rules (the user's, 2026-10-13/14): Canvas/Default → Surface/Default boxes (Flat); Canvas/Alt → Pale (any hue) or
Border; colour on a box is Pale; one widget per row may stand out with Theme=Solid (or a Support/<Hue>/Subtle fill). A dark
widget = Theme=Solid, Color=Neutral: fill Background/Neutral/Solid, content Content/Inverse/*, Border/Inverse,
Background/Inverse/* tracks, Button Level=Inverse — never a mode override inside a component (one page = one mode). Hue
Hero cards use Support/<Hue>/Subtle fills with neutral marks and a neutral Primary button. No gradients.

## Batch 1 (20)

| # | Pattern | Built from |
| --- | --- | --- |
| 1 | KPI | MetricCard `type="kpi"` |
| 2 | KPI with sparkline | MetricCard `type="sparkline"` |
| 3 | KPI with spark bars | MetricCard `type="spark-bars"` |
| 4 | Goal progress | MetricCard `type="goal-progress"` |
| 5 | Period comparison | MetricCard `type="comparison"` |
| 6 | Category split | MetricCard `type="category-bar"` |
| 7 | Hero metric | MetricCard `type="hero"` (Card Solid) |
| 8 | Revenue trend | ChartCard + AreaChart |
| 9 | Hours by team | ChartCard + AreaChart `type="stacked"` |
| 10 | This year vs last | ChartCard + GroupedBarChart |
| 11 | Revenue and margin | ChartCard + ComboChart |
| 12 | Utilisation | ChartCard + GaugeChart |
| 13 | Sales funnel | ChartCard + FunnelChart |
| 14 | Top clients | ChartCard + BarList |
| 15 | Quarter goals | ChartCard + BulletChart |
| 16 | Revenue by client | ChartCard + DonutChart |
| 17 | Busiest hours | ChartCard + HeatmapChart |
| 18 | Budget rings | ChartCard + RadialChart |
| 19 | Forecast | ChartCard + BarChart (projected bars, average) |
| 20 | Invoiced vs collected | ChartCard + LineChart `compare` |

## Owners

| Agent | Scope |
| --- | --- |
| card-color | `Card` `theme="solid"` + `color` (every Theme × Color the Figma set has), Card page examples, docs, harness, Studio Card mapping |
| metric-types | `MetricCard` `type` (the six new Figma types), Metric page examples, docs, harness, Studio Metric-Card mapping |
| widgets | the Widgets platform page + the Studio Widgets palette group: the 20 patterns above |

## As built

(Each owner appends its section.)

### As built (widgets)

**Where the page lives.** `widgets` is an app-layer page (`appLayer/types.ts` `appLayerPageIds`, meta in
`src/platform/appLayer/widgets.tsx`, registered in `PlatformAppLayer.tsx`), the home the platform already gives a page of
compositions that is no component (Templates): the nav lists it under Components, A–Z, as "Widgets" (eyebrow
"Patterns / Widgets"). Its playground and examples live in `src/platform/examples/pages/widgets.tsx` (+ `widgets.css`),
picked up by `examples/registry.ts` like every example page.

**One source.** Each pattern is a Zen Studio palette entry (`src/platform/studio/slots/palette.ts`, group `Widgets`, after
Charts; helper `widget()`). The page's code panel shows `widgetCode(id)`: the entry's import line and the JSX the Studio
inserts (`WIDGET_PAGE_CONTEXT`: card title h3, ChartCard's default). The page renders the same JSX through one component per
pattern (`pattern("<id>", Component, description)`); `palette.selftest.mjs` §4b parses the page and fails when a widget's
JSX and its entry differ (elements, props, values; layout whitespace and comments aside) or a pattern is missing. The page
title of each pattern is the entry's label. On a page you make (builder) the entry is its `builder` code: the `format`
callbacks left out (no functions in the dialect; the charts' own format reads the numbers) and the Hero's toast as
`proto.toast(…)`.

| # | Entry (`widget-…`) | Page title | Built from |
| --- | --- | --- | --- |
| 1 | `kpi` | KPI card | MetricCard (type kpi, the default) theme flat, icon + iconTheme, trend |
| 2 | `kpi-sparkline` | KPI with sparkline | MetricCard `type="sparkline"`, 12-month `series`, format |
| 3 | `kpi-spark-bars` | KPI with spark bars | MetricCard `type="spark-bars"`, 12-week `series` (an offsite week and the National Day week run low: 640–1,284 h) |
| 4 | `goal-progress` | Goal progress | MetricCard `type="goal-progress"`, `goal` (Q3 collected vs the $290K plan) |
| 5 | `period-comparison` | Period comparison | MetricCard `type="comparison"`, three columns (cash flow · September) |
| 6 | `category-split` | Category split | MetricCard `type="category-bar"`, `categories` (September hours by team) |
| 7 | `hero` | Hero metric | MetricCard `type="hero"` `theme="solid" color="neutral"` + Button sm Overlay Inverse (`footer`) |
| 8 | `revenue-trend` | Revenue trend | ChartCard + AreaChart (Oct 2025 – Sep 2026) |
| 9 | `hours-by-team` | Hours by team | ChartCard + AreaChart `type="stacked"` (four teams) |
| 10 | `year-over-year` | This year vs last | ChartCard + GroupedBarChart (Apr – Sep, 2025 and 2026: six periods, as Figma's Grouped-Bar) |
| 11 | `revenue-margin` | Revenue and margin | ChartCard + ComboChart (lineFormat %) |
| 12 | `utilisation` | Utilisation | ChartCard + GaugeChart (5,900 of 7,564 h, 85% target) |
| 13 | `sales-funnel` | Sales funnel | ChartCard + FunnelChart (five stages) |
| 14 | `top-clients` | Top clients | ChartCard + BarList (Q3 clients, full amounts) |
| 15 | `quarter-goals` | Quarter goals | ChartCard + BulletChart (three goals, per-row format) |
| 16 | `revenue-by-client` | Revenue by client | ChartCard + DonutChart (legend start) |
| 17 | `busiest-hours` | Busiest hours | ChartCard + HeatmapChart (weekday × hour) |
| 18 | `budget-rings` | Budget rings | ChartCard + RadialChart (three projects, legend below: at the end it wrapped the long names in a half-width card) |
| 19 | `forecast` | Forecast | ChartCard + BarChart (Oct – Dec `projected`, `showAverage`) |
| 20 | `invoiced-collected` | Invoiced vs collected | ChartCard + LineChart `compare` |

Page groups (the playground's Group picker shows one group as a dashboard row; the examples follow the same order):
Metrics (1–7) · Trends (8, 9, 20, 19) · Comparisons (10, 11, 17) · Goals (12, 15, 18) · Shares and rankings (13, 14, 16).
Two more examples cover the matrix: "Widgets on a phone" (PlatformPhone, Canvas/Default: Utilisation and Top clients
flat under an h2 kicker) and "Before there is data" (the Hours by team card with an EmptyState → Skeleton → the widget,
Toast with Undo). Every widget is flat on the Canvas/Default stage; the Hero is the one Solid stand-out of the Metrics row.

**Data.** `examples/data.ts`: `studioMonths` (invoiced and collected, Oct 2025 – Sep 2026), `studioTeamHours`, the Q3
client split and projects' budgets the Chart page uses, the Metric page's September/Q3 figures (5,900 h · +4%;
$105,700 · +9%; collected $275,800 · +8% vs Q2; 2026 so far $798,300 · +12% vs 2025, the Studio overview's Year). New, kept
coherent with those: 2025 by month (Apr – Sep $74,600 · $81,900 · $80,300 · $84,200 · $86,900 · $90,400 = $498,300, Q2
$236,800 and Q3 $261,500, so Apr – Sep 2026's $559,300 and Jan – Sep 2026 are both +12% on 2025), the weekly hours
(also the Metric page's spark bars) and the
Q3 collected plan ($290K, the Chart page's "Collected in Q3"). Charts abbreviate (`$105.7K`), card figures never do.

**Studio.** Group `Widgets` in `PaletteGroup` / `PALETTE_GROUPS` (after Charts), icon `icon-chart-breakout-square-line`
(`library/catalog.ts` GROUP_ICON), search terms in en and vi (`library/synonyms.ts`: widget, tiện ích, thẻ biểu đồ,
doanh thu, dự báo, cùng kỳ, lợi nhuận, hiệu suất, phễu bán hàng, khách hàng, ngân sách, giờ cao điểm, dòng tiền, so sánh,
cơ cấu, nổi bật…). The KPI entry is labelled "KPI card" so "kpi" still finds Metric first. Every widget is a card: in a
card it is offered with "A card never goes inside a card". `keywords.generated.ts` is per component and needed no rebuild.

**Export › Figma / Import from Figma.** `tools/studio/figma-widgets.selftest.mjs` (in `studio:selftest`) writes a builder
page of all 20 entries as a page you make inserts them, checks it is valid dialect, pushes it and pulls it back: the 13
chart widgets go up as a Card around their ❖ Chart set with the header (Title, Icon, Description, Value) and come back
with the same components and props (data from the samples, as `figma-push.selftest.mjs` §29), twice. The seven metric
widgets do too since metric-types mapped MetricCard `type` (and its data) to Figma's Metric-Card Type and card-color mapped
Card `theme="solid"` + `color`: the selftest's PENDING list (widgets whose mapping another owner was still building,
reported, not failed) is empty now and fails if a widget stops round-tripping.

Deferred: nothing of the 20.

### As built (card-color)

**API.** `Card` `theme` gains `"solid"`; new `color?: CardColor` (`cardColors`: neutral (default) · brand · cyan · violet ·
green · yellow · orange · blue · purple; `cardSolidColors`: neutral · brand · cyan · yellow · orange). Card.tsx sets
`data-color` on Pale and Solid only (a Solid hue Figma lacks renders as `data-color="neutral"`); Shadow, Flat, Border and
On-Container ignore it. `MetricCard` and `ChartCard` take `color` and pass it to their Card. `HTMLAttributes.color` is
omitted from CardProps.

**Combinations** (Figma Card 6643:51021, 58 variants, read 2026-10-14 and re-read after the user's widget update: unchanged).

| Theme × Color | Figma | Code | Fill | Content | Sub-Action icon |
| --- | --- | --- | --- | --- | --- |
| Pale × all nine (Medium + Small) | 6643:51022, 15480:87358–87562, 15530:526–556 | covered | Support/<Color>/Pale + Effect/Overlay | Content/Neutral/* | Neutral/Light |
| Pale × Neutral, Active=Yes | 6643:65027/65029 | covered (existing Active look) | Surface/Default + Card/Border/Active | Neutral | Neutral/Light |
| Pale × hue, Active=Yes | — | n/a: `selected` draws the Active look (no hue); push writes Color=Neutral | | | |
| Solid × Neutral (M + S) | 15480:87472, 87616 | covered | Background/Neutral/Solid/Default | Content/Inverse/* (re-pointed) | Inverse/Light |
| Solid × Brand · Cyan · Yellow · Orange (M + S) | 15480:87478–87496, 87622–87640 | covered | Support/<Color>/Solid | Content/Neutral/* (Light → Base; dark mode → Inverse) | Neutral/Light → Base |
| Solid × Violet · Green · Blue · Purple | — (not in Figma) | deferred: renders Solid Neutral, harness `card/solid-color` (error) | | | |
| Solid × Active=Yes | — | n/a: `selected` draws the Active look with page tokens; push writes Active=No + note | | | |
| Shadow / Flat / Border / On-Container × hue | — | n/a: color ignored, harness `card/color-ignored` (warn) | | | |
| Border/Flat × Surface=Alt, Border × Surface=Flat | 15530:454–520 | not this batch (Studio Surface left unmapped, see below) | | | |

**What a Solid card's children read (the descendant-token decision).** No mode switch: no `data-theme` on the card, the
page mode and every Surface stay. The card re-points, on its `.zen-card__content` and `.zen-card__sub-action` wrappers
(not on itself, so its own fill still reads the page tokens), the neutral tokens that content drawn straight on its fill
reads, to what Figma binds there (Metric-Card Hero · Solid Neutral 15487:89034: texts Content/Inverse/Strongest, line
Border/Inverse, area Background/Inverse/Solid → Inverse/Subtle at .16, Sub-Action Content/Inverse/Light):
Content/Neutral/Strongest·Base·Light → Content/Inverse/*, Content/Disabled → Inverse/Disabled, Border/Neutral/Solid and
Border/Active/Neutral/Solid → Border/Inverse, Background/Neutral/Solid/Default and Background/Active/Neutral/Solid →
Background/Inverse/Solid, and the neutral alpha fills/hairlines/tracks → the Background/Inverse step of the same alpha
(Neutral/Subtle*, Support/Neutral/Subtle, Active/Neutral/Subtle → Inverse/Subtle*; Neutral/Pale, Support/Neutral/Pale,
Neutral/Flat hover/pressed → Inverse/Flat hover/pressed; Border/Neutral/Pale → Inverse/Subtle; Border/Neutral/Subtle and
Border/Active/Neutral/Subtle → Inverse/Subtle/Pressed — Figma has no Border/Inverse/Pale|Subtle). Applies to Solid Neutral
in both modes and to a hue Solid in dark mode (a bright fill in both modes, where Figma's Content/Neutral turns light);
on a hue Solid, Content/Neutral/Light reads Base. Controls keep their own fills: Button / Segmented levels read component
tokens set on the page, so the author picks `Button appearance="overlay" level="inverse"` and `Badge theme="on-color"`
as Figma does; controls whose label reads Content/Neutral on an Inverse/White/Surface fill (Overlay buttons, Inverse
Badge, Inverse/Surface Dock Icon, White tooltip, chart pill) get the page's neutral content back, and those with a
Neutral/Solid fill under a Content/Inverse label (Tooltip, Badge, Avatar, Dock Icon, chart average tag) keep the page's
Neutral/Solid (`--zen-card-page-*`, captured on the card). Fields and other Surface controls stay off Solid cards
(guideline). Selected Solid cards take the Active look and the page tokens.

**Contrast** (tokens.css, composited; Strongest / Base / Light). Solid Neutral: light 18.42 / 12.79 / 7.10, dark (near-white
fill) 18.42 / 8.13 / 3.78. Solid Brand 7.42 / 5.10 / 5.10 (Light reads Base) · Cyan 6.32 / 4.60 / 4.60 · Yellow 10.96 / 6.36 /
6.36 · Orange 6.29 / 4.59 / 4.59, the same in dark mode through the Inverse re-point (Figma's binding there: 2.48 / 2.91 /
1.68 / 2.93 Strongest — fails). Figma's Neutral/Light on Cyan/Orange Solid: 2.88 / 2.87 (< 3:1), hence Light → Base. Pale ×
nine on Surface: light ≥ 17.49 / 7.95 / 3.74, dark ≥ 14.95 / 10.74 / 6.34 (Light as on Surface, 3.79). Violet/Green/Blue/
Purple Solid would give Strongest 3.78 / 5.39 / 4.39 / 3.34 (neutral) — why they stay out. axe `color-contrast`: 0
violations for every Pale and Solid colour in light and dark (`tests/interaction/card-color.test.tsx`).

**Harness.** `card/color-ignored` (warn; Card, MetricCard, ChartCard: color on a theme without Color, default themes
included) · `card/solid-color` (error: Solid violet/green/blue/purple); allow `zen-allow-card-color`. One Solid per row is
not statically checkable (guideline + Do/Don't visual).

**Platform.** Card page: "One widget stands out" (wide; Solid Neutral with LineChart, on-colour Badge, Overlay Inverse
button → Dialog, beside two Flat widgets), "Colour by project" (phone, Canvas/Alt, Pale per project hue), "Stand out in a
hue" (Solid Yellow payroll + Primary button, toast with Undo), "Dark chart card" (ChartCard Solid Neutral with ranges and
open → Dialog); Do/Don't pair "one Solid per row" vs "a row of Solids". Stories PaleColors / SolidColors; smoke fixture
Card = Solid Neutral with ⋮.

**Studio.** `component-properties.json` Card set re-read (Theme without Semi-Pale, + Solid; Color; Surface). Map: Theme ↔
theme (Solid ↔ "solid"), Color ↔ color, Active ↔ `selected` (was the deprecated `active`, so `selected` never pushed),
Surface skipped (Figma has Alt only on Flat/Border and Flat only on Border; code `surface` also restyles Shadow).
figma-push `cardVariant()` writes only variants Figma has (Color Neutral off Pale/Solid; a Solid hue Figma lacks →
Neutral + note; selected coloured card → Neutral; selected Solid → Active No + note); `cardAround` passes MetricCard /
ChartCard `color`; figma-pull gives `color` back on Card, the KPI MetricCard and ChartCard. Selftests: push §card colour
(variants, note, round trip), pull §card colour. Generated: figmaProps, variantSets, partProps, compile-api.

**Figma contract.** No Card suite in `tools/figma-contract/suites`: n/a.

**Open.** (1) Figma binds Content/Neutral/* on hue Solid cards, which fails in dark mode and gives Light 2.9:1 on
Cyan/Orange: the code re-points (above); the designer may want Inverse/Base bindings in Figma. (2) Figma has no
Border/Inverse/Pale|Subtle: the alpha-mirror Background/Inverse steps stand in. (3) Card Surface (Alt/Flat per theme) is
not mapped in Studio.

### As built (metric-types)

`MetricCard type` (src/components/MetricWidget/MetricWidget.tsx; the marks in `MetricMarks.tsx`, internal; CSS in
`metric-widget.css`). Figma read live 2026-10-14, after the user's update ("update lại chart, widget từ Figma"): set
Metric-Card `6643:64008`, each Type a Card (Shadow, Spacing Medium, ⋮ Sub-Action) whose Content slot holds Metric-Body (a
column, Spacing/Gap/Medium, which grows with the card and keeps its content at the top) = a Title-Highlight Metric-Inline
+ the type's own layers. `type="kpi"` (default) is today's card unchanged (the Metric straight in the Card).

| Type | Node | Metric | Own layers and tokens | Data props |
| --- | --- | --- | --- | --- |
| KPI | 6643:64007 | Icon-Highlight XLarge | — | — |
| Sparkline | 15480:89548 | Title-Highlight Large, no Dock-Icon | 64px frame: 2px Border/Accent/Solid line (round caps/joins) 4px in from top and bottom; area from the line to the frame's bottom, vertical gradient Accent/Solid → Accent/Subtle (each at its own alpha), layer opacity 16% | `series` |
| Spark-Bars | 15480:89594 | Title-Highlight Large | 48px row, bars Spacing/Gap/2XSmall apart, bottom-aligned, Corner-Radius/XSmall, Color Chart Sector/Primary; the last (current) Sector/Secondary; heights = value / max | `series` |
| Goal-Progress | 15481:1803 | Title-Highlight Large | `ProgressBar` theme accent, layout stacked (Figma Progress-Bar Theme=Accent, Layout=Stacked): "of {target} goal" + the share | `goal {value, target, label?, valueLabel?}` |
| Comparison | 15481:1848 (560 wide) | the card's `label` as a Heading/Subheading title (Neutral/Strongest); per column a Title-Highlight Small Metric (Caption label, Heading/4 number, trend), no Dock-Icon | columns Spacing/Gap/Medium apart, equal content width, each after the first Spacing/Padding/Medium + 1px Border/Neutral/Subtle at its start | `comparison [{id, label, value, trend?}]` (`value` not drawn) |
| Category-Bar | 15481:1957 | Title-Highlight Large, no trend | 12px bar of segments (Spacing/Gap/2XSmall, Corner-Radius/XSmall) in the chart palette, lengths = shares; rows Spacing/Gap/XSmall apart: legend item (12px dot Element-Size/Popular/2XSmall, Spacing/Gap/2XSmall, Caption/Regular · Neutral/Strongest) · amount (Body/Small/Medium · Neutral/Strongest) · share (Body/Small/Regular · Neutral/Base, end-aligned) | `categories [{id, label, value, color?}]` (ChartSlice shape) |
| Hero | 15481:2047 | Title-Highlight XLarge; trend Badge Theme=On-Color, Background=Solid | 64px line as Sparkline in neutral: Border/Neutral/Solid line, Neutral/Solid → Neutral/Subtle area at 16%; `footer` (Figma Button/Main Small Primary "View report") | `series`, `footer` |

Shared props: `format` (summary, goal label, category amounts; default chartCore `defaultFormat`), `seriesLabel`,
`animate` (default true), `footer` (any type). `value` is optional on MetricCard (comparison). Exports added:
`metricCardTypes`, `MetricCardType`, `MetricGoal`, `MetricComparisonItem`, `MetricCategory`; `MetricCardProps` is now a
type alias (`Omit<MetricProps, "value"> & {…}`) so the API docs keep its inherited props. Label keys (en, vi):
`metricSeries`, `metricGoalOf`.

**Hero card.** Figma's Type=Hero is Card Theme=Solid, Color=Brand with its fill overridden to Support/Brand/Pale, which
is code's Card `theme="pale" color="brand"` — the Hero's default. `theme="solid"` (color neutral) is the dark Hero
(Figma instance 15487:89034): the Card re-points content, border and Subtle tokens to Inverse (card-color), the fade runs
Content/Inverse/Strongest → Content/Inverse/Disabled (metric-widget.css, as that instance), the footer takes Button
`appearance="overlay" level="inverse"`.

**A11y.** The card says every number as text (title, value, trend; comparison columns; category rows with amount and
share). Sparkline, spark bars and the hero line are one `role="img"` each, named by `seriesLabel` or "Trend over 12
periods: from … to …, low …, high …"; the category bar is `aria-hidden` (its rows say it all); goal-progress is the
ProgressBar's named progressbar. Nothing in the marks is focusable (no keyboard of its own).

**Motion.** The chart family's (chart-family spec §3): the line wipes in left → right over Slow × 2.5 (Standard), bars
rise from the baseline, segments grow from the start (Slow, Emphasized, staggered Xfast × 0.5); only clip-path moves;
reduced motion fades. Re-keyed on new data, so it draws in again.

**Deviations (on purpose).**
- Sparkline: the first Figma read (before the user's update) floated the area 4px above the line and clipped an 8px end
  dot; the lead asked for the area to start at the line and the fade of Chart/Line-Chart. The updated Figma now has
  exactly that (area top = line, gradient Solid → Subtle, no dot), and code follows the live node.
- Spark-Bars: a bar is never wider than one of Figma's twelve (fewer values keep that width, the current bar at the end);
  Figma's bars always fill the row.
- Category-Bar shares are whole numbers that add up to 100 (largest remainder), so rows never read 99% or 101%.
- Comparison stacks its columns (a rule above each) when the card is narrower than 440px (container query); Figma draws
  the 560-wide row only. Where the card hugs its content, it is 32rem (Figma's 512 content width).
- A card stretched by its grid row keeps the Metric at its hugged height (numbers line up under the titles), the space
  under the type's content, as Figma's growing Metric-Body.

**Harness.** `metric/type-data` (error: a type without its data, or data for another type) and
`metric/category-count` (warn: 2–7 categories), with bad/good fixtures. Guideline: Metric entry (use / avoid / do /
api / a11y rows). Do/Don't pair (category bar, largest first vs. seven unordered parts) in PlatformGuidelineVisuals.
Tests: `tests/interaction/metric-card-types.test.tsx` (each type, geometry, a11y names, axe light/dark with only the
Metric's known Caption-label contrast entry), smoke fixture for MetricCard (KPI).

**Studio.** `tools/studio/figma-metric.mjs`: a typed MetricCard pushes as one Metric-Card instance (its Type; Label and
Metric-Number; the Metric-Inline's Trend toggle and its Trend badge option + words; the Card's Theme / Color /
Sub-Action, written only when not the variant's own; Comparison's title (by its layer name) and three columns; the
Hero's button words); Figma draws its own marks (a note). The pull (a Figma-side `readMetricCard` in figma-pull's reader,
checked read-only on the live variants) gives back the type, texts, trend, theme/color and columns, and takes `series`,
`goal`, `categories` and the Hero's `footer` from the Studio palette's widget of that type (as the charts do). A fresh
Figma Hero (Solid Brand) is the code's default Hero. A KPI MetricCard keeps its Card + Metric-Inline push.
`component-properties.json`: Metric-Card's Type re-read (it still said Level=Master). Not mapped: the Inspector's Figma
panel for MetricCard (figma-props.map) still lists Metric-Inline's properties (Type is a code prop there), category
labels / amounts and the goal's texts (Figma's sample), comparison columns past three.

**Examples (Metric page).** Metric types in a row (sparkline, spark bars, goal) · Cash flow at a glance (comparison +
category bar) · One hero metric (Brand / Dark switch, button → toast) · Metric types on a phone · First weeks of a
project (no data, one bar, a goal passed: 112%).

### As built (card-color), follow-up: Figma re-check, Surface, marks on Solid, Studio

**All 58 variants re-read** (fill, stroke, effect, padding, radius, gap per Theme × Color × Surface × Spacing × Active):
padding Card-padding-medium/small, radius Corner-Radius/2XLarge / Large, Border 1px INSIDE Border/Neutral/Pale, Active 2px
INSIDE Card/Border/Active on the Surface fill of its Surface (Pale/Default Active → Surface/Default, Border/Flat Active →
Surface/Flat), Shadow Shadow/Bottom/Level-1, Pale Effect/Overlay, Solid no stroke/effect: card.css matched — no drift.
The frame's raw 10 gap is between Content and the absolute Sub-Action (no flow effect).

**Surface.** `CardSurface` gains `"flat"` (Figma Border × Surface=Flat 15530:502–520: Surface/Flat — the Canvas/Flat colour
in both modes, distinct from Surface/Default in dark — inside the Pale frame). `cardSurfaces` (exported) per theme:
Shadow default · alt (code extra: renders as Flat on Surface/Alt), Flat default · alt, Border default · alt · flat, Pale /
On-Container / Solid default. Card.tsx drops `flat` off Border; harness `card/surface-ignored` (warn, Card + ChartCard,
allow `zen-allow-card-surface`). ChartCard already passed `surface` (now documented); MetricCard has none.
Docs: component-usage-rules §8 (surface-flat for a Border card on canvas-flat) and the Card guideline. Card page:
"Settings section" now sits on a Canvas/Flat page with `theme="border" surface="flat"` cards (no new example).

**Marks on a Solid card** (metric-types' and chart-sync's findings). Solid Neutral (and a hue in dark mode): Chart
Sector/Secondary (Support/Neutral/Deep) → Background/Inverse/Solid, Border/Neutral/Subtle/Pressed → Inverse/Subtle/
Pressed, the heatmap's deepest step (Support/Brand/Deep, near-white in dark) → Inverse/Solid; Neutral/Solid → Inverse/
Solid already flips the neutral area fade and its Subtle stop the Neutral/Subtle → Inverse/Subtle one. Hue Solid, scoped
to marks (charts, metric spark/bars/categories, progress bar/ring) per Figma's Color Chart Sector/On-Color styles:
primary series (Sector/Primary, the Accent line/dots/fade, the Accent progress fill) → On-Color/Primary Content/On-Colors;
the near-black series → On-Color/Secondary Content/Neutral/Light (read as Base); Brand's heatmap ramp → the Neutral ramp;
the palette series in the card's own hue (Cyan, Yellow, Orange) → Support/Brand/Solid → Subtle (the hue the white primary
frees): Figma's On-Color/Tertiary (Border/Neutral/Subtle/Pressed) measured ΔE 12 as a line but 3.5 / 2.5 as an area at
30%, so it washed out. `tests/interaction/card-solid-marks.test.tsx`: every chart kind in a ChartCard and every typed
MetricCard on each Solid colour, light and dark — each mark ΔE ≥ 8 from the fill, each area's top stop at its opacity
ΔE ≥ 5, legend series pairwise ΔE ≥ 8. Lowest ΔE light / dark: Neutral 17.9 / 13.2 · Brand 11.0 / 11.0 · Cyan 6.9 / 6.9
(the .16 sparkline area) · Yellow 9.7 / 9.7 · Orange 11.5 / 11.5. White primary on Yellow is 1.7:1 luminance (ΔE high).

**Studio.** Map Surface ↔ `surface`; `cardVariant()` writes only variants Figma has (Shadow on Alt → Flat/Alt, a Surface
the theme does not take → Default, each with a note); ChartCard pushes and pulls `surface`. MetricCard now maps to Figma
Metric-Card (Type ↔ `type`, its exposed Card as the nested "Card" group: Theme ↔ theme, Color ↔ color); Metric keeps the
Metric-Inline sets, and figma-push draws a KPI MetricCard / a Metric through Metric's entry (SLOT_OF_PROP, framed slots,
drawn parts and metricParts take Metric too). Inspector: Card shows Theme (with Solid), Color, Surface, Spacing, Active;
MetricCard Type + Card (Theme, Color); ChartCard has no Figma entry, its theme/color/surface rows come from the API types
(solid, nine colours, flat). Selftests: push §card surface (variants, notes, round trip, KPI MetricCard), pull §Border/Flat.
