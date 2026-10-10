# Session log 2026-10-10

## Studio: components "không giống với gốc" — Sidebar rows on their own, slot props as switches, Page header / Screen header slots (user: "sao có 1 số component lỗi không giống với gốc?", "breadcrumb … hiện label chứ k phải component breadcrumb thật … nên là slot cho phép thêm item vào", "Header page cũng nên là slot") — tier M, session 604bd7

- Causes found on the user's page (.zen-studio/pages/untitled-page.zen.tsx): a SidebarMenuItem in the page's Stack drew
  without padding or icon gap (sidebar.css `.zen-sidebar__item` read --zen-sidebar-item-padding / -gap, defined only on
  `.zen-sidebar`, no fallback); every Menu item insert wrote `id="invoices"` (the Sidebar keys rows by id); PageHeader
  has no Figma groups, so its ReactNode props (breadcrumbs, meta, tabs) got the generic text field and "on" wrote a text
  label. A scratch scan of component CSS for parent-scoped variables read without a fallback found 196 reads, all a
  component's own inner parts except the Sidebar row (the only child component the palette lets you place alone).
- Fixed: sidebar.css fallbacks (Padding/Small, Gap/Small); palette Menu item / Menu section ids get a short suffix of
  the insert's uid; Breadcrumbs gets a builder version (a static trail: a builder page keeps no handlers); new "Tab bar"
  palette item (Tabs without panels or state).
- Slots: registry PageHeader breadcrumbs (Figma Header Type=Navigation › Leading-Slots holds a Breadcrumbs), meta,
  tabs; builder Screen header (Figma Header Type=Custom: one free slot). palette.selftest reads the builder runtime for
  Screen (ScreenProps, the conditional header mount, builder.css). DesignPanel: a node prop that is a content slot is a
  ToggleRow (GroupedProperties' Figma boolean, now exported); a slot that takes one component inserts it at once through
  paletteFor (the builder versions), else the picker opens.
- Export fix found on the way (peer's note): Export › HTML kept a Screen's app frame wrappers as
  studio-builder-screen__* with no rules in styles.css (only .zen- rules pass), so a page with a Sidebar or a Page header
  stacked. htmlExport.tsx renames them (.screen__side/__main/__header/__content/__top/__bottom) and styleRule keeps
  builder.css's app frame rules renamed (appFrameRule). E2E HO-08 (desktop Screen + Sidebar + PageHeader, 0.00% from the
  canvas; the canvas shot hides the side panels first: a 1440 px frame is wider than the canvas between them).
- Tests: palette selftest 1,532 (+ --deep 1,535); E2E B-27 and SP-08 updated (Menu item ids `invoices-…`, five
  PageHeader slots), B-28
  (Breadcrumbs on → real Breadcrumbs, Item-List 2 → 3; Screen › Header + Search; a Menu item outside a Sidebar keeps
  12px padding and gap).

## Liquid Glass + progressive blur (user: "chưa mô phỏng được liquid glass…", "Lưu ý cả progressive blur") — tier L

- Figma (read only): GLASS styles Liquid-Glass/Normal (frost 4, refraction 0.8, depth 20, dispersion 0.5, light −45° ·
  0.8), Liquid-Glass/Large (8 · 0.8 · 30 · 0.6), Glass-Floating (8 · 0.8 · 28 · 0.5). Used by: AI/Chat-Field Style=Liquid
  Glass, Nav-Action/Liquid-Glass (Top Navigation), Bottom-Navigation/Mobile/Floating-Glass (container + CTA:
  Glass-Floating, selected item: Normal's values). Progressive blurs: Top-Navigation Default-Bluring 10→0 / Alt-Bluring
  20→0 (top strong), Bottom-Navigation Floating(-Glass) 0→24 (bottom strong).
- build-style-manifest.mjs writes src/styles/generated/glass-styles.ts (the GLASS params per effect token).
  _shared/liquid-glass.ts: useLiquidGlass(style, enabled) → a ref (React 19 cleanup); in Chromium an SVG filter per
  element (frost feGaussianBlur edgeMode duplicate → 3 feDisplacementMap, blue bends most → channels recombined) as
  `backdrop-filter: url(#…)`, its displacement map drawn for the element's size and corner (convex bezel over the depth,
  inward), plus a light map (white rim, Figma's angle and intensity) as an inline background-image above the fill;
  ResizeObserver redraws; maps cached. Checked first that Chromium draws SVG backdrop filters (stripes bent).
- Progressive blur measured on stripes: the 5 equal layers stacked to σ·√(k/5) (most of the blur within the first
  fifth); _shared/progressive-blur has 6 layers σk = max·√(2k−1)/6 → σ(k/6) = max·k/6, Figma's linear ramp. Both navs
  use it (their 5-layer CSS removed).
- Studio Export HTML drops the live glass inline styles (the filter is not shipped; the CSS frost stays).
- Tests: tests/interaction/liquid-glass.test.tsx (5). Visual: a lab page over stripes / gradient (removed) and the docs
  examples (Bottom Navigation › Glass over photos: bevel rim and frost as in the Figma render of ◆ Logistic 12084:93091).

## Quick insert preview centred (user: "Lỗi UI dưới thanh search. Component preview nên hiện giữa của container") — tier S

- The pane top-aligned a 400px stage (transform-origin top): a right-justified Button row sat at the top right. Now
  ItemPreview measures what the stage paints (fills, borders, shadows, leaves, images, controls; not layout wrappers),
  scales that box into the pane (24px inset) and centres it (stage absolute, translate + scale from 0 0). The target
  line under the search: Padding/XSmall above and below, inset to the search icon. Table still previews empty (its cell
  functions are dropped by the parser; known). E2E LB-06 now checks the Button row is centred (≤ 4px).
- Follow-up (user: "Vẫn còn lỗi search"): measured the line at 21 of its 32px — the panel is a flex column with a max
  height and the line shrank, cut under the search: search and line `flex: 0 0 auto`. And the preview: a heading block
  is 400px wide, so it was scaled down and off-centre; the painted box now takes text runs' own extents (Range), and a
  MutationObserver re-places it when the item changes at the same height (Heading → Paragraph kept the old place, which
  could leave the pane empty). Walked six items: all within 1px of the centre. LB-06 also checks the line is not cut.

## Table cell content type (user: "chưa chọn được loại data cho cell table như trong figma") — tier M

- Figma (read only): Table/Cell/Default 1603:23604 has a Content slot; the primitives are Text, Avatar, Photo,
  Basic-Icon, Dock-Icon, Badge, Tag, Trend, Progress, Control (Checkbox · Radio · Toggle), Actions, Group-Avatar,
  Editabled (docs/figma-contracts/table-cells.json). A code column only had `cell` (a function): nothing for the Studio
  to switch, and a builder page could not hold it (stand-in text).
- Table: `TableColumn.cell` optional; `content` (text · avatar · photo · icon · dock-icon · badge · tag · trend ·
  progress · checkbox · toggle), `field`, `captionField`, `mediaField`, `bold`; cellOf() draws the Figma primitive
  (media XSmall on one line, Small over a Subtext). Actions, Group avatar, Radio and Editable stay `cell` / `edit`.
- Studio: compile API regenerated (Table no longer requires `cell`); the cell stand-ins are gone (renderPage, compile,
  standins: isColumnCell / showsAsText / cellStandIn) — the Table draws the field itself, the export writes no cell.
  Palette Table: columns of text (Bold + Subtext), avatar, badge, plain (no TableText; searchPalette "text" no longer
  lists it). Inspector checked on a page you made: Content / Field / Caption field / Media field / Bold per column.
- Tests: tests/interaction/table-cell-content.test.tsx (3); compile selftest updated (columns written without cells).

## Studio-saved layout edits on 3 example pages and 3 templates, committed (tier XS, session e4bf4af9)

- Found uncommitted since 2026-10-09 by the session watch (no running session owned them; they read as Studio saves):
  form (pickup Morning / Afternoon radios in a row, render + code), slider Budget alert (NumberField full width under the
  slider, centred), visually-hidden (leave name fills its row, Badge sm), Dashboard / Settings templates (Container
  full width, Settings fillChildren), Sign in (card body max 400, centred). User: keep them, then commit.
- Fixed with them: the Budget alert's code string and description followed the render (wrap + align="center"; "under
  it", not "beside it"). Gate (--files, pages templates · form · slider · visually-hidden): PASS; contact sheets checked.

## Studio: Figma-like operation check, boolean slots, Table rows and cells (user: "1. Các thao tác đã dễ như Figma chưa 2. … bolean … 3. … nested … 4. …", "Tôi vẫn chưa sửa được table cell từ template lẫn example", "phải chọn được loại dữ liệu của cell", "giống Figma 100%") — tier M, session c8528700

- Boolean audit (scratch audit/node-props.mjs, every ReactNode prop × how the Inspector offers it): AppShell's slots,
  TopNavigation `titleLeading`, Sidebar row trailing / section action got text fields. registry.ts: AppShell (Sidebar,
  Leading-/Center-/Trailing-Slots, Sections, Side-Panel, Floating-Item, Footer), TopNavigation title leading,
  SidebarMenuItem Trailing-Slot, SidebarMenuSection Action (palette selftest 1,661). GroupedProperties: a node prop that
  is a registered slot is a ToggleRow. SpacingLayer: a double-click passes through the padding band (text layers inside
  padded components were unreachable by double-click in the drill crawl).
- Table cells, data (data-source.mjs): a column `cell`'s row param → kind "cell": the Table that draws the column (inline,
  a const, a const made of another, conditional lists, `...(narrow ? [] : [...])`), its rows; the row by key (getRowId,
  default id/key), else by its written fields (factory ids computed from a default param), else by place in a list read
  as is; lists followed through sorts/filters/slice/spread/useMemo/useState(list | () => list)/local functions/
  Object.values/obj[key]/imports. Lookups `X[row.k].f` (also .map rows) and local consts `const team = teams[row.team]`.
  `{ ...factory(…), extra }` items follow into the call (a shared const spread stays refused). Typed text keeps a number
  or boolean's kind. A column without `cell`: op setDataField { field } on the Table; GET /element `tableRows`.
  Templates/examples: 54/57 Tables find their rows (3 start empty, said so); cell values editable 51 → 128 of 302 (the
  rest are formatters such as money(row.amount), conditions).
- Table cells, Studio (table/): Data-Row / Cell / Header / Header-Cell part names; double-click Table → Data-Row → Cell →
  content → text, Escape back, a click with a row/cell selected keeps the level, ⌘-click on a drawn cell selects its
  content in one click; Layers lists Table › Header, Data-Row › Cell › the column's layers. TableCellPanel: Figma
  Table/Cell/Default (Content, Align, Open-Button read-only: its click is code), the content's Bold and Subtext
  (captionField / `caption={row.x}`), media field, the row's values; Data-Row: the row's fields. Content on a `cell`
  column swaps the element (replaceElement; Badge-Cell, Avatar-Cell…), on a drawn column sets `content`.
- Found on the way: Table.tsx's Icon cell default `icon-file-06-line` does not exist (cast hid it) → Figma's
  Basic-Icon-Cell default `icon-face-smile-line`.
- Tests: data-source selftest 25 (+7 Table cases); E2E DA-08, DA-09, SE-31, SE-32 (fixture TableFixture, frame 10), twice
  4/4; probes on the table example (sorted Table, lookup into data.ts), HR My leaves (leaveKinds lookup) and Admin list
  (factory spread, filtered/paged rows).
- Follow-up (user via "Lỗi nested properties": "không chỉnh được props avatar hoặc các nested khác trong table cell"):
  the Inspector sent setDataField without the row for props bound to a cell's row (kind "cell"): DesignPanel and nested
  instances now pass the cell's row (table/tableCells cellDataTarget). Props a component of the file passes on
  (`function PersonAvatar({ person, size })`) are kind "param": inspector/callSite.ts writes them where the component is
  used (the use above the selected fiber): a literal there, or its data with setDataField `path` (`person` → `.theme`).
  Probes: Admin list An Mai's Avatar Theme → member(…, "red"); Badge Theme → statusTheme.Active; table example Em Pham's
  Avatar Size → `<PersonAvatar … size="md">`, Theme → people.em in data.ts. Drawn icon cells take the icon picker.
  data-source selftest 26; E2E SE-33 (fixture FixtureAvatar column).
