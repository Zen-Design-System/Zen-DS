# Session log 2026-10-23

## Session B · Example className round 2, PR 1 (tier S; user decisions 2026-10-23, spec examples-classnames-round2-spec-2026-10-23.md)

Branch zen/chore/examples-classnames-20261023. The coverage BACKLOG item (P3–P4) had been merged on 10-13; examples
added since brought 177 className back. PR 1: classes with a Figma-equivalent prop become props.
- Direct: calendar planner Card `maxWidth={420}`, schedule planner Stack `maxWidth={420}`, colour-picker panel
  `<Box width="fill" maxWidth={360}>` (was a div).
- Fill + min width, measured on an isolated server (natural width, line and siblings at 1512 / 768 / 390 / 320):
  list-item search `width="fill" minWidth={200}` (natural 220 would overflow a 320 phone; wrap point 299 instead of 319);
  toast title block `minWidth={160}` (= natural, same wrap point). Kept as CSS: the search page's toolbar (natural 445
  shrinks to 248 on a phone because its chips wrap inside: no min width keeps both) and the date picker's Form (Form has
  no size props).
- Visual diff 102 panels at 1512 / 390 / 320: identical. Gate PASS (5 pages; audit, dark, behaviour, contact sheets
  looked at).
- My slip: I stopped my isolated server with pattern kills (`pkill -f "tail -f /dev/null"`), which can hit another
  session's processes; memory updated (TaskStop or exact PIDs only).

## Chart Color phase 2: `palette` in code + Studio (tier M; user: "xử hết backlog", then approved the Figma review and the name `palette`)

Branch claude/interesting-yonath-0da9e0 (worktree agitated-leakey-b2b41c). BACKLOG P1 "Chart Color = Primary | Secondary, phase 2".
- Figma review: the 10 sets read live, Primary vs Secondary side by side (12 pairs incl. Bar horizontal and Area
  stacked). Every pair swaps the Color Chart Sector styles cleanly (style tally per set: Primary ↔ Secondary counts mirror).
  A twin diff (55 pairs: clip, size, position, layout, radius, stroke, effects, text) found two drifts made after the
  10-17 build, both in Secondary: Bar Horizontal 4-Sectors had Plot clipping on (axis "0 h" / "3,000 h" cut) with Bars
  164 instead of 144; Grouped-Bar 4-Sectors was 434 tall instead of its Primary's 370. User: "Duyệt, sửa 2 chỗ" → both
  now match their Primary; re-diff 0 differences, no overlaps in the sets.
- Code: `palette?: "primary" | "secondary"` on the ten charts (type `ChartPaletteName`). chartCore `sectorAt` /
  `colourAt` / `fadeAt` swap palette slots 0 ↔ 1 (series 3–7 and an item's own `color` stay; a single or stacked area
  takes the Neutral fade pair); ChartBlock writes `data-palette`, and chart.css marks read `--zen-chart-lead` /
  `--zen-chart-second` (Bar's bars and active bar, Gauge value/target, Funnel stages/last, Bullet actual/target, Combo
  bars/line/dots). BarList keeps Sector/Primary (no Color in Figma). BarChart `color` / `activeColor` still win.
- Studio (`tools/studio/figma-charts.mjs`): push writes Color on the ten sets and swaps the drawn Stack-Bar segment and
  Donut slice styles; pull reads Color=Secondary back as `palette="secondary"`. CHART_SETS Gauge/Funnel/Bullet now hold
  their set ids (15968:130382 / :130460 / :130554; the old ids are the Color=Primary variants); library-keys.json has the
  three set keys (in place of the old component entries; read live, read-only). The native pack already had the sets
  (merged 10-21). A key imports in other files only once the library is published with these sets.
- Docs and checks: chart guideline (Color row, use line, do line, Figma ids), harness `chart/palette-by-hand` (warn: the
  sector colours set by hand on color/activeColor/series) with bad/good fixtures, a Do/Don't pair, platform example
  "Led by the neutral colour" (Bar, Gauge, Donut), a story; Figma descriptions of the ten sets gained a "Color:" line
  (decoded first; Stack-Bar's stacked `&amp;lt;` escape fixed). No chart contract suite exists (BACKLOG P3), and the
  component-properties contract still has no chart sets (BACKLOG P2 inspector item, Color added to it).
