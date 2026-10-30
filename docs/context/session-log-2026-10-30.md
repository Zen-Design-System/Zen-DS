# Session log 2026-10-30

## Session "Studio: popover option" · Popover as a default option of a clickable layer (tier M; user 2026-10-28 via Bug)

- Ask (verbatim): "popover nên là 1 option mặc định trong các component có thể mở popover. user chọn rồi bật nó có hiện
  popover khi click không. Bật thì cho chọn loại data hiển thị bên trong là gì, bao nhiêu dòng hoặc từ data nào."
- Before: a popover took 5 steps (Add overlay offers Dialog / Sheet / Panel / Card only → drop a Popover in → Position
  Manual → On click › Open overlay → edit its rows in the overlay frame). Chip already had its own `popoverItems`.
- Asked (AskUserQuestion with an inline mock of 4 pictures: today vs proposed, content kinds, data sources, which tab).
  Answers, all the recommended picks: every layer that takes a click (a Chip uses its own popover) · Options only (not
  Menu, Text, Data rows) · Sample + the page's `export const mock` (not project-wide data) · both tabs.
- Built (`builder/proto/`):
  - `popoverModel.ts` (pure, selftest 24): which layers take it (`takesPopover`: an On click, not a frame; Chip by its
    own prop), the mock's lists of objects (`mockLists`: text fields, picture fields, whether rows have ids), Sample
    labels, the items code (Sample: `{ id: "option-1", label: "Option 1" }`; mock: every field a reference,
    `label: mock.people[0].name`, the dialect has no `.slice` / `.map` in props), reading it back (`popoverDataOf`), the
    Overlay code (`<Popover items={…} onSelect={proto.close()} />`), openers of an Overlay, a free `popover-N` id.
  - `popoverEdit.ts`: on = insert the Overlay last on the Board + set On click to `proto.open("popover-N")`, squashed
    into one undo step ("Add popover"); a Chip gets `popoverItems` (+ `dropdown` when unset). Off = remove the click and
    the Overlay when nothing else opens it (the later of the two in the code first, so the other's loc holds), one step;
    a Chip loses `popoverItems` and `onPopoverSelect`, keeps its chevron.
  - `PopoverRows.tsx`: Data (Sample, or `people (3)`), Rows (1–12; a mock list at most its length), each Sample row's
    words, or Label / Caption / Picture fields of a mock row. `PopoverSection` (Design tab, after the properties: a
    switch; "Replaces what a click does" when the click held another action) and the Prototype tab's TriggerRow (On
    click › **Open popover** next to Open overlay; the same rows under it; leaving it takes the Overlay away).
- Not done (not chosen): Menu / Text / Data-rows content, project-wide data, a "Popover" entry in Add overlay.
- Question for the user (QUESTIONS.md): Zen's Avatar takes no click, so it has no Popover option; give it `onClick`?
- E2E: PT-41 (Design switch on a Button, Rows, row words, Play by the trigger, a pick closes, off), PT-42 (Prototype
  Open popover replaces Navigate, rows from mock.people, caption, Design shows it on, Play lists the people, None
  removes it), PT-43 (Chip's own popoverItems + chevron, Play pick, off keeps the chevron).
- Runs: PT-41…43 first run 2 works, PT-42 broken in the test only (`pickOption` reads "role" as the option label
  "Role"; a page-data field reads as written) → `/^role$/`, then works; baselined. Gate (`npm run qa -- --isolated
  --files=…`: a plain run in this worktree said "Nothing to check") PASS, Studio E2E 424 works · 0 broken (B-50 on
  retry, a Chromium load cut). Merged main twice (#359 walk: prototype.mjs rows; #360 chart: DesignPanel Data before
  Popover, `studio:selftest`), keep-both only; tsc, studio:selftest after each.

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
  B-60 (Line comparison add / numbers / remove, Heatmap columns): all three work. B-59 first clicked
  `[aria-label="Series to edit"]`, which is SelectField's hidden native select (the button is named by the label and its
  value): it now clicks the button by name.
- Panel shots on a private server (Donut + Slice 5, Stacked bar with 2 and 3 series, Line + comparison, Bar forecast,
  Heatmap): on the grid, nothing cut off. The 15 chart contract suites match; gate PASS (Studio E2E 420 works, 0 broken).
- Met on the way, fixed here: the read-only palette dot was class `__swatch`, a word the usage rule
  `border/pale-actionable-box` reads as actionable (renamed `__colour`); a Bar chart's Look showed two rows called
  "Color" (Figma's Color is `palette`; the CSS `color` / `activeColor` now read "Bar color" / "Active bar color",
  `componentPropLabels` in propSchema.ts).
