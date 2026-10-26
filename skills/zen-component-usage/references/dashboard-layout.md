# Dashboard layout: one grid, sized by importance, balanced at every width

**These are principles, not rules**, like `design-principles.md` next to this file. They help you lay out a screen of
widgets (KPI cards, charts, lists, tables): a dashboard, an overview, an analytics or operations page. They hold in code,
in Zen Studio and in Figma. Nothing here is machine-checked, and the brief, a Zen template or the designer may choose
otherwise; say why in the report when you do.

The rules that do apply win over anything here: a widget grid is one section with `md` 16 between its cards and rows
(`docs/component-usage-rules.md` §13, user rule 2026-10-21), one hero MetricCard per row, a phone screen ends with an
open list (§19), the box themes of the Canvas, and the platform audit's `card-gap` (a card stretched by its row that
stops ≥ 12px above its foot).

Sources: Zen's decisions (dated below) and its own screens (`DashboardTemplate`, Figma ◆ Performance "Team
performance" 15478:20139); Material 3 canonical layouts and window size classes; Grafana's 24-column panel grid
(full, half, third and quarter widths); Apple WidgetKit's size families (a small widget shows the one critical figure, a
large one adds detail and complex graphs); Elastic EUI's dashboard guidance (a primary chart as the focal point, related
charts close together); practitioner guides on F-pattern scanning (key figures top left, detail lower) and bento grids
(size is hierarchy, one large cell, uniform gaps).

## 0. Plan the widgets before you place them

1. **Name the one question the dashboard answers** ("Is the team on track this week?"). The widget that answers it is
   the **hero**.
2. **Rank every widget** before giving it a size:
   - **Summary**: the KPI figures read first (MetricCards).
   - **Hero**: the one view that answers the question, usually a trend over time; at most one per view.
   - **Support**: what explains or splits the hero (a breakdown, a ranking, the list of items behind a figure).
   - **Detail**: what people drill into (a table, an activity log, a calendar).
3. **Note each widget's natural shape** (§2): wide, square, or as tall as its rows.
4. **Count.** The first screen (1512 × 982) should show the KPI row and the whole hero. More than about 9 widgets on one
   view usually means two jobs: split them with Tabs, a second page or a drill-down (progressive disclosure).

## 1. One grid, one gap; a new section only under a heading

- **All the widgets of one view sit in one widget grid.** Its rows are as far apart as its columns (`md` 16, Figma
  `Spacing/Gap/Medium`; the phone's Breakpoint & Grids Gutter is `Spacing/Gap/Small` 12). Rows of one grid are never
  sections: a 32 gap between widget rows makes one dashboard read as four sections and leaves bands of empty canvas.
- **A new section starts only where a group has its own heading**: "Projects" with a toolbar and a table, "Team" with
  its people. The heading and its content are one section frame; sections are `xl` 32 apart on desktop and
  `Layout-Mobile/Section-Gap` on a phone.
- **A widget's own title is not a section title.** A ChartCard's or a ListBox's header lives inside its card.
- **One scope for the whole grid.** The period and team pickers sit in the DashboardHeader's Control-Bar above the grid,
  not one picker per card (◆ Performance refactor, 2026-10-13). A card keeps its own range switch only when its range
  differs from the page's.

## 2. Think in 12 parts, size each widget by its shape

Lay the grid out in **12 parts at every width**. A widget's **span** is how many parts it takes, and the spans of a row
add up to 12: 3 is a quarter, 4 a third, 6 a half, 8 two thirds, 12 the full row. At Zen's frames the parts are about
this wide (16 gaps, 12 on a phone):

| Frame | Content width | span 3 | span 4 | span 6 | span 8 | span 12 |
| --- | --- | --- | --- | --- | --- | --- |
| Desktop 1512, Sidebar open (240) | ~1224 | ~294 | ~397 | ~604 | ~811 | 1224 |
| Desktop 1280, Sidebar open | ~992 | ~236 | ~319 | ~488 | ~656 | 992 |
| Tablet portrait 744 (no Sidebar) | ~696 | ~162 | ~221 | ~340 | ~459 | 696 |
| Phone 390 | ~350 | ~80 | ~109 | ~169 | ~229 | 350 |

Each kind of widget has a natural shape and a width below which it suffers. The minimums below are the ones Zen's own
dashboard uses (Grid's default `minColumnWidth` 240 for KPIs, 360 for charts, 480 for a table beside a list) or follow
from the chart specs (32px BarList rows, 24px heatmap cells, ring sizes 120 · 168 · 240 · 320).

| Widget | Shape | Narrowest it reads well | Desktop span | Tablet portrait | Phone |
| --- | --- | --- | --- | --- | --- |
| KPI MetricCard (kpi, sparkline, comparison…) | short, about 130–170 tall | ~240 | 3 (4 in a row), 4 (3 in a row) | 6 (two up) | MetricCard `type="tile"`: medium two up (6), small three up (4) |
| Hero MetricCard (`type="hero"`) | taller, with its series | ~360 | 6 beside two KPIs (6 · 3 · 3) | 12 | 12 |
| Time series: Line, Area, vertical Bar, Stack, Grouped, Combo | landscape, 2:1 to 3:1 | ~360; ~560 for 12+ points or 2+ series | hero 8 or 12, support 6 | 12 | 12, plot ~200–220 tall |
| Round: Donut, Radial, Gauge | square | ~280 (a medium 168 ring with its legend under it) | 4 (3 for a small ring tile) | 6 | 12, or 6 with a small ring |
| Ranking: BarList, Funnel, Bullet, horizontal Bar | as tall as its rows | ~280 | 4–6 | 6 | 12 |
| Heatmap | wide: a 40px label column + a 24px cell per column | ~720 for 24 columns | 8–12 | 12, scrolling inside | 12, scrolling inside, or a BarList of the top cells |
| List widget (ListBox: tasks, alerts, activity) | elastic: 5–8 rows | ~300 | 4 beside the hero, or 6 | 6 or 12 | 12; at the end of the screen an open list (§19) |
| Table widget | wide | ~600 | 12, or 8 beside a list | 12 | ListItems with 2–3 key fields, or a scroll inside its region |
| Calendar month, Schedule, Timeline | wide | ~700 | 12, or 8 beside a 4 agenda | 12 | Calendar `device="mobile"` with the day's agenda |

**Too wide is empty too.** A widget should not span more than its content uses: a donut in a full row, a three-bar
chart across 1200px or a four-row BarList at span 12 float in empty space. Pair it with a neighbour instead of widening
it.

## 3. Size by importance: the hero takes the most room on the first screen

- **One hero per view**, right under the KPI row, at the leading edge of its row (the top-left of the content area is
  read first). It takes **span 8 beside a span-4 companion**, or **span 12** when it is wide by nature (many points,
  several series, a heatmap or a timeline) or has no natural companion.
- **A size ladder:** hero 8–12 › support 4–6 › KPI 3. The hero's area is about twice the next widget's. Two widgets of
  the same size read as peers: use 6 · 6 when the dashboard compares two things, not to avoid choosing a hero.
- **Its companion explains it:** the breakdown of the same measure (a Donut by team beside revenue over time), the
  ranking behind it (top products), or the items to act on (overdue tasks beside the completion trend).
- **Row heights follow rank:** the KPI row is short (about 130–170), the hero row the tallest (about 380–440, a 280–320
  plot), support rows a little lower, detail rows hug their content.
- **The hero carries the emphasis:** the figure it explains (the ChartCard's `value` and what that figure is), the
  legend, a range switch when its range differs. Support cards stay quieter.
- **Don't make a figure the hero by stretching it.** A big number on its own is a MetricCard `type="hero"` (Brand Pale)
  at span 4–6, beside the chart it sums up, never a KPI card across 12.

## 4. Rows that fill: the recipes

Every row's spans add up to 12. These rows balance on desktop:

| Row | Spans | Use it for |
| --- | --- | --- |
| KPI row | 3 · 3 · 3 · 3, or 4 · 4 · 4 | the summary; 4 KPIs is the usual count |
| Hero and companion | 8 · 4 | the default first content row |
| Hero alone | 12 | a hero that is wide by nature |
| Companion column | 8 · (4 holding two stacked cards) | a hero beside two short widgets whose heights add up to its own |
| Hero figure and KPIs | 6 · 3 · 3 | a MetricCard hero with two KPIs |
| Two peers | 6 · 6 | a comparison, or two supports of the same shape |
| Three supports | 4 · 4 · 4 | breakdowns of a similar height (rounds, rankings) |
| Detail | 12, or 8 · 4 | a table, or a table beside an activity list |

- **Avoid** a sliver beside a giant (9 · 3), uneven odd spans (5 · 7), three different spans in one row (8 · 2 · 2), and
  a widget alone in the last row of a group.
- **KPI counts:** 4 fills a row; 3 and 6 fill too (6 only from about 1600 of content, or as two rows of three). For 5,
  either give the row 5 equal columns where each stays ≥ 240, or fold the fifth figure into the widget it explains. More
  than 6 KPIs are usually not all summary: show the rest as the `value` of their charts, or in a Table.
- **No orphans when the columns change:** a row of N equal cards needs a column count that divides N at every width
  (4 → 4 · 2 · 2, 6 → 3 · 2 · 1, 2 → 2 · 2 · 1). When it doesn't divide, give the last card the rest of the row or move
  a card to another row.

## 5. Balance inside a row: equal heights, nothing hollow

- **Cards in a row end at the same foot.** Leave the Grid's `align` at its default (stretch); in Figma, give the cards
  Fill height. A stretched ChartCard gives the extra height to its plot and a ring beside its legend grows with it, so
  the charts of a row end together. `align="start"` on a widget row leaves a hollow band under the shorter card.
- **Pair widgets of a similar natural height.** Beside a ~400 hero: a Donut card, a 6-row list or a 6–8 row BarList.
  Not a single KPI (about 150 tall: ~250 of empty card); stack two or three short widgets in the companion column
  instead.
- **Fit elastic content to its neighbour.** A list shows the rows that fill its height (usually 5–8), then "See all";
  a BarList folds its tail into "Other"; a table in a widget shows 5–10 rows and pages. Never stretch a three-row list
  to 400px, and never cut the hero to match a short list.
- **No filler.** Don't plug a hole with a decorative card, an illustration or an empty Card: change the spans or move a
  widget. A widget with no data keeps its place and shows an EmptyState `size="sm"` inside its card.

## 6. Across widths: decide by the room, keep the reading order

- **The reading order is the order of the cards** in the code and in the layers panel: KPIs → hero → companion →
  supports → detail. Wide layouts place them side by side; narrow ones stack them in the same order. Write the hero
  first in its row.
- **Decide by the grid's own width, not by the device.** A docked SidePanel, a split window or a collapsed Sidebar change
  the room while the page runs (responsive-principles §2). A widget never gets narrower than its minimum (§2): its span
  grows instead.
- **Wide screens show more, not bigger.** Past about 1600 of content, add a KPI or a companion beside the hero rather
  than stretching a donut or a list.

| Content width | Usually | KPIs | Hero row | Supports | Detail |
| --- | --- | --- | --- | --- | --- |
| ≥ ~1100 | desktop 1512 | 4 in a row (3 each) | 8 · 4 | 4 · 4 · 4 or 6 · 6 | 12, or 8 · 4 |
| ~840–1100 | desktop 1280, a desktop with a docked SidePanel, tablet landscape | 4 in a row while each stays ≥ 240, else 2 · 2 | 8 · 4 while the companion keeps ~280, else 12 | 6 · 6 | 12 |
| ~600–840 | tablet portrait 744 | two up (6 each) | hero 12; its companion pairs with the next support (6 · 6) | 6 · 6 | 12 |
| < 600 | phone 390 | tiles two up or three up, or one hero figure | 12, plot ~200–220 | 12 each | an open list at the end; a table as rows |

- **When the hero goes full width, its companion moves down and pairs** with the next widget of the same shape (a donut
  with a ranking at 6 · 6), instead of filling a row alone.
- **On a phone:** one column; KPI figures as MetricCard tiles; charts full width with shorter plots and the range
  Segmented full width; the screen ends with an open list (§19). A widget made for width (a 24-column heatmap, a wide
  table) scrolls inside its own region or turns into its phone form (the top cells as a BarList, rows as ListItems):
  never just shrink it.

## 7. Build it

### Code and Zen Studio

Zen's Grid has no per-cell span yet: its cells are equal, or follow a track list (`"2fr 1fr"`). Build the widget grid as
one section Stack whose rows are Grids with the same gap:

```tsx
<Stack as="section" aria-label="Overview" gap="md">{/* one widget grid: rows 16 apart, like the columns */}
  <Grid columns={{ desktop: 4, tablet: 2 }} gap="md">{kpis}</Grid>{/* a breakpoint left out takes the next wider one's */}
  <Grid columns={{ desktop: "2fr 1fr", tablet: 1 }} gap="md">{/* hero 8 · companion 4; align stays stretch */}
    <ChartCard title="Revenue" …>…</ChartCard>
    <Stack gap="md" fillChildren>{/* the companion column: two short cards that share the hero's height */}
      <ChartCard title="By channel" …>…</ChartCard>
      <ListBox …>…</ListBox>
    </Stack>
  </Grid>
  <Grid columns={{ desktop: 2, mobile: 1 }} gap="md">{supports}</Grid>
</Stack>
<Stack as="section" gap="md">{/* its own section: it has a heading */}
  <Heading level={2} textStyle="Heading/4">Projects</Heading>
  <Table … />
</Stack>
```

- On a phone in an AppShell, put the sections straight in the AppShell body (it spaces them).
- Equal-column rows line up with each other exactly when their counts divide 12 (4, 3, 2 columns). A `"2fr 1fr"` row
  ends its first cell about a third of a gap (~5px) away from the line of a 3-column row: keep such rows apart, or
  accept the offset until Grid has spans.
- A Grid's `columns` per breakpoint (`{ desktop, tablet, mobile }`) is the reflow of §6; `stackBelow` stacks a row by the
  Grid's own width (inside a SidePanel or a narrow pane).

### Figma

- The AppShell Content slot holds the sections; the widget grid is one auto layout frame in it, Clip content off (the
  cards' shadows).
- **Studio-compatible build:** a vertical frame (gap `Spacing/Gap/Medium`) of row frames, each a Grid auto layout with
  Flex tracks in the row's ratio (2 : 1 for 8 · 4, 1 : 1 : 1 for 4 · 4 · 4, four equal for KPIs), gap
  `Spacing/Gap/Medium`, the cards Fill width and Fill height. This is the shape Studio pushes and pulls back.
- **One 12-column Grid with spans** (Figma's Grid auto layout, column span 3 / 4 / 6 / 8 / 12) is the model in its
  purest form, but Studio's import keeps only a span that every cell shares: mixed spans come back as equal columns. Use
  it only for frames that stay in Figma.
- Build the tablet (744) and phone (390) frames with the reflow of §6, each in its Breakpoint & Grids mode, then run the
  Zen audit (`spacing/section-gap`, `section/title-apart`).

## 8. Look at the screenshot

Questions, not checks:

- **Squint.** Is the hero the largest thing on the first screen, right after the KPIs?
- **Edges.** Does every row end at the same right edge, and every card of a row at the same foot?
- **Holes.** Any hollow band under a card, a lone card at the end of a row, a donut floating in a wide card?
- **One grid.** Are the widget rows 16 apart like the columns, and is every 32 gap above a heading?
- **Widths.** At 1512, 1280 with a SidePanel, 1024, 744 and 390, does each width pick a recipe that fills, in the same
  reading order?

## 9. Example: an HR overview, before and after

A Studio page built before these principles (`.zen-studio/pages/quan-ly-task.zen.tsx`, the HR overview Screen):

- **Before:** five widget rows in a `Stack gap="xl"` (the grid read as five sections); eight KPI cards in two rows
  above the hero, pushing it down; rows set to `align="start"`, so the Donut beside the trend and the Funnel, Grouped
  bars and task list of the next row each ended at a different foot; six departments × two series of grouped bars
  squeezed into a third of the row.
- **After:** one section with `gap="md"`: the four KPIs (3 · 3 · 3 · 3); the late-arrivals trend as the hero (8)
  beside the Donut by department (4); the grouped bars by department (8) beside the to-do list (4, showing the rows
  that fill its height); the Funnel with the four typed MetricCards stacked beside it (6 · 6, or fold them into the
  widgets they explain); then the department table as its own section under a Heading/4, straight on the canvas (§14).
