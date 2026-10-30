# Session log 2026-10-30

## Session "Studio: chart data editor" · a chart's sectors in the Inspector (tier S; user 2026-10-28 via session Bug)

- User, verbatim: "Chart cũng tương tự. cho phép thêm bớt sector, nhập số cho từng sector để xem chart". Before: a
  chart's `data` showed as ObjectProperties groups ("Data · 1" … with Id / Label / Value / Color rows each); "Add item"
  copied the last item (a duplicate id), and a series chart could not add a series (its rows' `values` never got the key).
- AskUserQuestion with a mockup (as is · single-value rows · series grid), both answered with the recommendation: every
  chart with data (Gauge keeps its Value / Target fields); a sector's label and number, colours from the palette in
  order (read-only swatch; `chart/palette-by-hand` stays the rule).
- Model `inspector/chartDataModel.ts` (pure; selftest 377 checks in `studio:selftest`, read by the real parser and every
  edit applied by the real engine on each Assets chart, then `chartFigma` pushes the result): rows = slices, periods,
  stages, goals, heatmap rows; columns = value, target, forecast flag (Bar), series, compare, bar / line (Combo),
  heatmap columns. A label or a number is op setField on the item (layout kept); adding / removing a row, a series or a
  column rewrites the props it touches as one literal each (op setProp, in the list's own layout: one line, or one item
  per line at the written indent), in one apply = one undo step. New rows copy the last row's numbers under the next
  label (months, weekdays, quarters, a trailing number, else "Slice 5"); slices get a fresh id, series a bare key
  (`series3`). Data in a same-file const edits numbers and labels there, rows never; `mock.*` data stays as before.
- UI `inspector/ChartDataSection.tsx` after Properties (DesignPanel filters the chart's data props out of the Properties
  rows): Series / Columns / Lines list (name, −, +) and Data (label · numbers · −, + after the last). Up to two numbers
  share the second field column; three or more are picked one at a time (a select above the rows), so every field is on
  the panel's grid and no number is cut off. E2E `panelFits` lets the first of two shared numbers end inside the column.
- Notes past what a chart or Figma draws warn, never block: 13 periods (Figma's Sector is 4 · 6 · 7 · 12), 8 slices
  (7 palette colours), a funnel's 3–6 stages, a bar list's 3–8, a bullet chart's 1–4, Area / Grouped series counts.
- E2E B-58 (Donut: type, add, rename, remove, ⌘Z), B-59 (Stacked bar: series add / rename / picker / remove, a period),
  B-60 (Line comparison add / numbers / remove, Heatmap columns).
