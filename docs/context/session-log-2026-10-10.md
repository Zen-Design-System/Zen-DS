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

## Pages list: long names end in "…" (user: "Lẽ ra nên cho chữ dài thì có "..." thay vì hiển thị lỗi cắt") — tier XS

- The name already had text-overflow: ellipsis, but `.studio-pages__list` and `.studio-folder` are grids whose implicit
  track grew to the longest name (grid items' min-width: auto), so the panel cut it instead. Both get
  `grid-template-columns: minmax(0, 1fr)` (+ min-width 0 on the items). Checked with a 60-character name in the
  272px panel: it ends in "…" before the ⋯ button.

## Studio-saved layout edits on 3 example pages and 3 templates, committed (tier XS, session e4bf4af9)

- Found uncommitted since 2026-10-09 by the session watch (no running session owned them; they read as Studio saves):
  form (pickup Morning / Afternoon radios in a row, render + code), slider Budget alert (NumberField full width under the
  slider, centred), visually-hidden (leave name fills its row, Badge sm), Dashboard / Settings templates (Container
  full width, Settings fillChildren), Sign in (card body max 400, centred). User: keep them, then commit.
- Fixed with them: the Budget alert's code string and description followed the render (wrap + align="center"; "under
  it", not "beside it"). Gate (--files, pages templates · form · slider · visually-hidden): PASS; contact sheets checked.

## Studio: nested items editable (user: "Vẫn lỗi cũ. Không chỉnh được props của nested", "kiểm tra thêm … ở các chỗ khác", "Đừng quên table cell") — tier M, session "Lỗi nested properties"

- Reproduced on an isolated server (copy of .zen-studio/pages/admin-list-team-members.zen.tsx): the Breadcrumbs and
  AppShell's Nested instances rows all wrote; what failed was the item level. PartPanel skipped the owner's passed-on
  props for a data-slot item (a crumb's Emphasis read-only under Props), and dataItems.ts found an item only through a
  prop holding the item object (Breadcrumbs `item`, TopNavigation `action`), so a tab, segment, step, Description List
  item, Bottom Navigation item and Bottom Sheet action were plain read-only parts ("Edit via the owner's items").
- Fixed: dataItems.ts also matches the React key the owner's .map gives the item (DataSlot `itemKey`, default `id`;
  DescriptionList's keyOf), identity first; picker Fiber has `key`. PartPanel: a data item gets the passes after its
  fields in the same Properties section ("Written to Tabs: variant (every Tab follows)"); a pass named like an item
  field (Segmented `disabled`) stays the field; a pass whose part value is an object the owner prop does not hold is
  dropped (TopNavigation trailing actions no longer offer `leading`).
- Sweep (fixture builder page, ⌘-click each first item, write each row): Breadcrumbs, Tabs, Segmented, Stepper,
  DescriptionList, TopNavigation trailing, BottomNavigation, BottomSheet: all select as items and write. Table cells:
  still "part of Table · Read-only"; owned by session "Sửa Table cell" (c8528700: cell value per row, column Content /
  Bold / Subtext, ⌘-click on cell content), findings sent to it.
- Tests: E2E B-29 (crumb › Emphasis → Breadcrumbs, tab › Label → its item, tab › Variant → Tabs; baseline works);
  groups select · structural · data · instance · overlays · builder 104 works / 0 broken. A standalone E2E run I
  stopped mid-way left StudioSaveFixture.tsx dirty (the known leftover); the next run restored it.

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
- Pictures in drawn cells (peer's PhotoControl): data-source followAdding/withField add a missing last field to a row
  written in place (one-line or a line per field; never a factory's object); describe marks such a cell value editable.
  The page renderer resolves `zen-media:` in prop data (media.ts resolveMediaDeep; compile.mjs already did for export).
  localApi (pages you made) reports `tableRows` like GET /element, so drawn cells there edit too. Cell panel: Picture →
  PhotoControl (InspectorFileContext set), media field offers "photo (new)" / "icon (new)". E2E SE-34; selftest 27.

## Breadcrumbs per crumb + Avatar photo picker (user: "breadcrumb vẫn lỗi nested edit - thiếu props nested" → "Mỗi crumb riêng như Figma"; "Avatar không bỏ ảnh vào được") — tier M, session "Lỗi nested properties"

- Figma (contract breadcrumbs.json): Item-List › Primitives/Breadcrumbs/Item/Slot (Dash) › .Primitives/Breadcrumbs/Item
  (Level, State, Emphasis). The user chose per-crumb (API change) over owner-wide mapping.
- Breadcrumbs: BreadcrumbItemData `level` · `emphasis` · `state` · `dash` (+ type BreadcrumbLevel); BreadcrumbItem reads
  its item's when its props are unset; children's level / emphasis / state count. Unset = the old trail. Guideline API
  row "Per crumb"; docs regenerated; compile API (builder pages accept the fields); part props regenerated (the
  emphasis pass is now an item field). Example "Next level" (open folder Medium + dash, Menu one level down).
- Studio: DataSlot `itemDefaults` (Breadcrumbs: level by place and master, emphasis, state, dash after all but the
  last) → ObjectProperties shows unset item fields as drawn (selected crumb and the owner's Items list); a boolean is
  left out only when it equals that default (dash off is written).
- Avatar: propSchema PHOTO_PROPS (Avatar / AppShellAccount / Image `src`) → editor kind "photo" →
  inspector/controls/PhotoControl.tsx (uploads, people avatar-*, library; zen-media:/zen-asset: values; a text field
  outside pages you made). assets.ts: a photo click with an Avatar / account selected sets its src. Table cells' nested
  props (Avatar, Badge… in cells) and the drawn cell Picture (uses PhotoControl) are session "Sửa Table cell"'s.
- Tests: tests/interaction/breadcrumbs-per-crumb.test.tsx (3); smoke 163; checked on a copy of the user's page (crumb ›
  Level master / Emphasis medium / State hover / Dash off write that crumb; Avatar › Src › Ava; Assets click on Avatar).


## Table states in the Studio + a sweep of the nested-props fixes (user: "Datarow của table thiếu trạng thái select khi có checkbox, chưa cho phép chuyển cột nào/nguyên dòng thành editable", then "một đợt kiểm tra lại toàn diện về các vấn đề đã gặp phải … bất kì đâu, hay component hoặc nested nào") — tier M, session "Table states"

- Figma: Table/Cell/Default State = Default · Hover · Focused · Edit · Selected (1603:23604); Data-Row is a Columns slot
  (4035:10629). The library had Selected (data-selected, Table-Cell/Background/Selected) and Edit (column.edit) but
  both needed app state (selectedIds + onSelectionChange; edit.value + onCommit), so the Studio could not write them.
- Table: `defaultSelectedIds` (the Table keeps the selection when `selectedIds` is not given; onSelectionChange still
  reports it); `editable` (every value column in State=Edit by its content: text / number by the value, badge → select
  among the column's values, a list → tags; never cell / checkbox / toggle columns); `column.edit` also takes the type
  alone (`"text" | "number" | "select" | "tags" | true`): the Table reads and writes the row's field, keeps the edit in its
  own copy of the row (numbers stay numbers) or hands it to `onCellCommit(row, columnId, value)`. `tableEditorTypeFor`
  exported (the Studio writes the same type). Harness table/interaction-needs-handler now fires only for `selectable` +
  `selectedIds` without onSelectionChange (HR templates tint the open row with selectedIds alone: fine).
- Studio (table/TableCellPanel): Data-Row › Primitives/Table/Data-Row: State Default · Selected (writes the useState list
  behind `selectedIds` — jsx-source stateLiteral/setStateInit now take a list of strings — else `defaultSelectedIds`;
  Selected also writes `selectable`), Checkbox (`selectable`), Editable (`editable`). Cell › State Default · Edit ·
  Selected: Edit writes `edit: "<type>"` on the column (every row, as the code works; a `cell` column or a written
  editor object says so), Selected selects the row. writePlan narrows a list state (tsc note from session "Giám sát").
- Tests: tests/interaction/table-states.test.tsx (3); selftest: state list + setStateInit list (3 checks); E2E SE-35
  (fixture Table: State → Selected writes selectable + defaultSelectedIds and the canvas checks the row; Cell State →
  Edit writes edit: "text"; Editable writes editable). Docs regenerated (api/table.json, guidelines, compile API).
- Sweep (scratchpad script over the engine: describeElement + originsOf on every Zen element nested in another, 101
  annotated files, 6,415 elements, 4,981 nested, 7,078 expression props/children; 65 Tables with rows, 60 editable):
  no thrown errors; every "not editable" verdict is inherent (computed values, state lists, factories, tuples, hooks)
  except one misleading message, fixed: a tuple row (side-panel requests) said '"status" is not a row of the list' →
  now says the row is written as a list and built in the code. Full E2E matrix + `npm test` (597) + gate: see below.

## Sidebar nested rows, double-click into items, library components on pages you make, rename in place, rail divider (user: "chưa list chỉnh được props của nested. Ví dụ như sidebar … phải giống figma", "click nhiều lần còn chưa click vào được", "không remove được item trong sidebar mẫu … các component mẫu khác … phải sửa được", "double click sửa tên folder, project", "tăng spacing giữa divider với các item dưới") — tier L, session "Lỗi nested properties"

- Sidebar `sections[n].items`: DataSlot `nested` (Sidebar › Body-Content, item Menu-Item); the engine reads a list or object
  in an item one level further (jsx-source shapeOf `shape`), setField takes `path` ([{ key, index? }]), item ops take
  `nest` { index, key } (items.mjs: removing a group's last row leaves `[]`); client: dataItems flattens rendered/source
  items (`at` = group + place), actions.ts sends `nest` (a move stays in its group), DataItemSections edits the row through
  the list's own spec (ObjectProperties `within`), the owner's list shows "N Menu-Items in Body-Content" instead of ƒ, and
  Slots lists "Body-Content · sections" before the children rows (hidden when `sections` is not written).
- Double-click: on a selected component, a data-slot item under the pointer comes before its text (SelectionLayer, after
  the Table drill). Probe on a copy of the user's page: Breadcrumbs → crumb, Sidebar → Menu-Item on the 2nd double-click.
- Library sweep (scratch script, isolated server: insert each of the 81 palette items on a page you make, per slot select /
  edit the first row, Remove, ⌘Z): 9 items were refused on pages you make ("keeps state or code") → builder versions
  (Pagination, Image zen-media:site-cafe, Calendar, NPS scale, Colour selector, File upload, Bottom navigation, Chat
  thread, Chat composer with proto.toast); StackBarChart `values` (keyed object) and number lists now edit field by
  field; a JSX prop (Menu trigger, ActionBar summary) reads "<IconButton> · select it on the canvas". All 81 pass but
  ListBox / ChartCard, which refuse to remove their only content by design.
- Pages list: RenameField (builder/RenameField.tsx) on a double-click or ⋯ › Rename, for pages and folders (the Rename
  dialogs are gone; FolderDialog is New folder only). Enter / blur save, Escape keeps.
- Sidebar rail: the divider before a later group sits Gap/XSmall below as well as above (Figma 2px; user's call).
- Tests: studio selftest (setField path · shape one level down), items selftest (nest), E2E SP-09 (Admin list Sidebar row:
  double-click, Counter, Remove), B-31 (rename in place), B-08 updated (menu Rename is in place); baseline recorded.

- Verification: full E2E matrix 212 works + SE-35 new (B-08 broke once while another session was writing
  builder/RenameField.tsx; alone it passes) and SE-35 recorded in the baseline; `npm test` 51 files / 597 tests; gate
  `npm run qa -- --isolated --keep-going --files=…` (Bash edits are not recorded by the hook): style, usage, docs, tsc,
  platform audit 1512 + 390, dark, behaviour all clean, both table sheets opened (no visual change). The one static ✗ is
  another session's: slots.selftest "SLOT_OPS" expects 16 ops, slots.mjs now has "setItems" (reported to "Giám sát").

## Slots as free as Figma (user: "Figma không phân biệt content section hay content không … tôi không thể xoá hẳn content hoặc content section", "cho phép user add chúng vào từng stack riêng", "hành vi tự do này áp dụng cho mọi nơi", "Tất cả các element trong slot phải xoá và thêm được hết. kể cả các element trong section", "section title đang không xoá được") — tier L, session "Lỗi nested properties"

- One flat list (slots/sectionList.ts): a nested slot (Sidebar `sections`, SidebarSubMenu) or a grouped one (Menu `items`:
  item / separator / group, DataSlot `grouped`) is read as titles, rows (and separators) in order and written back whole by
  the new item op `setItems` { prop, code | null } (items.mjs, at the prop's indent; selftests items 23 / SLOT_OPS).
- Slots: SectionedSlotBlock = one Body-Content (Item-List) block: rows move anywhere, a title row renames on click (RenameField),
  its + adds a row at the end of its section, its trash merges its rows into the section above; + menu (row · Section title ·
  Separator for Menu), ⋯ Remove all. The content slot of the same name continues under it without its own header (SlotBlock
  `continued`). Inspector item moves cross titles too (actions.ts runDataItem → setItems).
- Section parts (DataSlot `groupParts`, dataItems dataGroupOfPart / groupTitlePartOf): a section, its Section-Title and its
  rows' container are selectable (⌘-click on a title lands on the Section-Title), DataGroupSections shows Label / + / remove,
  and Delete removes the section, the title (merge) or the rows (StudioApp, also from a part row in Layers; editDataGroup).
- ObjectProperties: a union item takes its own schema (objectSchemasOf / schemaFor by a single-literal tag), a one-value tag is
  hidden, and a list of objects in an item (a Menu group's `items`) edits as its own groups through setField `path`.
- Pages you make: engineOptions drops requiredChildren (a slot's last child and Clear go; required props stay).
- Tests: E2E SP-09 extended (⌘-click Admin → Section-Title → Delete), B-32 (Menu: + Separator, + Section title, + item in it,
  nested label, remove separator); palette selftest reads SidebarSubMenu from Sidebar.tsx; baseline recorded.

## Delete key everywhere (user: "xoá nên cho phép bấm phím xoá trên bàn phím") — tier S, session "Lỗi nested properties"

- The global Delete handler skips Slots rows (they own their keys): ItemRow (DataSlotBlock, used by SectionedSlotBlock) and
  LayerItem (SlotsSection) now remove their row on Delete / Backspace (not repeated, not while busy). Pages list: a page row
  → Trash (restorable), a folder row → the delete confirmation (an alertdialog). E2E B-31 (folder asks, page to Trash) and
  B-32 (a focused Separator row) cover it.

## Several items selected, ⇧A into a section (user: "Chưa chọn được nhiều item add stack được") — tier M, session "Lỗi nested properties"

- slots/itemSelection.ts: extra items of the selected item's slot (src · frame · instance · prop · places), cleared by any
  other selection change (a write that only moves the line keeps them). Layers: item rows carry `item` { prop, index };
  ⌘-click toggles, ⇧-click selects the range; rows highlight. Canvas: ⇧-click inside the item's owner toggles (wherever
  the layer pick lands, an AppShell included); extra items outline as `extra-item` (not "extra": single-layer actions read
  that), and an item's tag reads its Figma name (Menu-Item in Body-Content). Layers tooltip no longer says read-only.
- Inspector: DataItemsSections ("N Menu-Items selected", names, Group into a section (⇧A), Remove). actions.ts
  editDataItems: group (sectionList groupedPlaces: a Sidebar section without a title, a Menu group "Section", right after
  the group the first item was in) or remove (nested/grouped via setItems; a flat slot via itemsCode). StudioApp: Delete on
  several items, ⇧A on an item of a nested or grouped slot.
- Tests: E2E SP-10 (⌘ Projects, ⇧ Billing → 2 selected → ⇧A → new section; ⌘ Home, ⇧ Security → Delete); baseline.

## ⇧A and + everywhere (user: "Hành vi này phải làm được ở mọi nơi trong thiết kế") — tier M, session "Lỗi nested properties"

- Multi-select surfaces are the canvas and Layers (the Inspector shows the selected item, so Slots rows are not one).
  ⇧A on any list item now goes through editDataItems: nested / grouped lists → a new section; a list with groups
  (TopNavigation trailing) → the selected actions moved together and given one `group` (one pill); others refuse with why.
- Layers: ⇧A on Sidebar rows written as children (SidebarMenuItem layers) wraps them in `<SidebarMenuSection label="Section">`
  (wrapSelection; jsx-source WRAP_TAGS + types WrapOp; selftest refusals updated).
- Bug found on the way: "+ Add Action" on a page you make was refused ("useToast is not exported…"): items.mjs prepareItem
  turns `() => toast({ … })` into `proto.toast({ … })` there and adds `proto` to the runtime import (ITEM_HELPERS gains
  builderImportEdits / LOCAL_PAGE); items selftest 24.
- Tests: E2E B-33 (Sidebar rows ⇧A → section; + Action on a phone page; ⌘ New task, ⇧ Share → 2 selected → ⇧A → one group).

## Multi-item panel easier to see (user: "Chỗ này user khó thấy") — tier S, session "Lỗi nested properties"

- DataItemsSections now reads like the layers' SelectionActions: the header names the count ("3 Menu-Items"), a Selection
  section holds a primary "Group into a section" (or "Group" for pills) and a danger-subtle "Remove" (sm buttons, key
  shortcuts in title / aria-keyshortcuts, a ⇧A · ⌫ · ⌘Z line), then "Selected items" (a row selects that item alone).
  The primary item's own part details are hidden while several are selected. E2E SP-10 / B-33 read the header count.


## Sections easy to select on the canvas (user: "khó chọn section. chỉ chọn được item bên trong. Muốn chọn section lại phải bấm bên layer") — tier M, session "Lỗi nested properties"

- Double-click drill Sidebar → section → Menu-Item / Section-Title → text: `sectionPartAtPoint` / `rowPartAtPoint`
  (dataItems.ts, by geometry: the capture layer and `display: contents` hide what is under the pointer), `livePart` for
  parts the canvas drew anew. A section selected: a click on another section selects it. Escape: inside a row → the row
  → its section → the Sidebar.
- Root cause of the flaky row pick: TextControl's stale draft. Between a new source value and the effect that copies it
  into the draft, a selection change flushed the drafts (drafts.ts) with the old one: `sections[1].label → ""` then
  back, two real writes, and the title vanished for ~50 ms so the row under the pointer shifted. Text/Number/Lines
  controls now commit only user-typed drafts (`edited` ref).
- After a row or title is selected, the next double-click edits its text; nested `sections` text cannot be edited in
  place (textEdit `sourceOf` → null), so the fallback focus request (moved to inspector/focusContent.ts, out of
  DesignPanel to avoid a cycle) focuses the row's / title's Label field. The row's root `div` (same box) is skipped.
- E2E SP-11 (drill, sibling click, Escape, no writes) added to the baseline; SP-09/SP-10 still work. Checked on the
  user's page copy (AppShell Sidebar): Screen → Sidebar → Section → Menu-Item → button, Escape back, file unchanged.
