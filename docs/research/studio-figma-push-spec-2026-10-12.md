# Zen Studio → Figma: đẩy thiết kế lên (Q4) và tự động hoá component (Q5) — spec, 2026-10-12

**Trạng thái:** duyệt. User duyệt Q4 và Q5 (2026-10-12: "Q4: ok, Q5 OK") và chốt §6 cùng ngày: kênh ghi là plugin Zen,
Import from Studio tự do / rebind theo licence, thư mục plugin vào git local trước khi sửa.
Nguồn: kế hoạch đổi lõi `studio-doc-engine-plan-2026-10-10.md` §4.6, §8 (Q4, Q5); khảo sát 2026-10-12 (plugin, contracts,
figma-pull).

## 1. Mục tiêu (đo được)

- **Q4 — đẩy trang lên Figma.** Một trang Studio (hoặc bản thiết kế mở từ trang code, M8) thành một frame trong file Figma
  Zen: instance thư viện thật (đúng variant, property, override lồng), auto layout gắn variable Spacing, chữ theo text
  style. Đẩy lại lần sau **cập nhật đúng frame đó** (theo ID đã lưu), không tạo bản thứ hai.
  - Đo: kéo frame vừa đẩy về (`figma-pull`) ra đúng trang ban đầu (so cấu trúc: `doc.mjs`), trên 5 trang mẫu (dashboard,
    bảng Figma, Overviews, một trang có override lồng, một trang có Actions column).
- **Q5(1) — Figma đổi binding → đề xuất diff CSS.** Khi một biến thể trong Figma đổi variable (padding, gap, height, bo
  góc, màu), Studio liệt kê thay đổi theo component › variant › layer › thuộc tính, mỗi dòng kèm khai báo CSS sẽ đổi
  (`var(--zen-old)` → `var(--zen-new)`); chọn rồi Apply ghi qua `css-edit` như Main component. Không tự ghi.
  - Đo: trên các component có suite (25 file suite), đổi giả lập một binding trong contract → đề xuất đúng khai báo; Apply
    xong, `check.mjs` của suite đó xanh.
- **Q5(2) — Save Main component → đẩy lên Figma.** Khi Save một sửa token trong frame Main component, Studio tạo gói
  "rebind" (set › variant › layer › field → variable) và plugin áp vào component master trong Figma.
  - Đo: sửa một token Button trong Studio, áp gói trong plugin, `figma-kit status` thấy đúng các variant đó đổi hash và
    `check.mjs` Button xanh trên contract chụp lại.

## 2. Những gì đã có

| Mảnh | Ở đâu |
| --- | --- |
| Đọc frame Figma → JSON → trang | `tools/studio/figma-pull.mjs` (`figmaReadCode`, `pageFromFigma`), `figma-diff.mjs`, Update from Figma |
| ID Figma trên node của trang | `figmaDocId`, header `figma {file,node}` |
| Map property Figma ↔ prop code | `figma-props.map.mjs`, `figmaProps.generated.ts`, `variantSets.generated.ts` |
| Ghi vào Figma (component master, variable) | Plugin Zen `~/Documents/zen-ds-figma-plugin-main` (`jsonToNode`, `import-components-json`, `import-variables-json`) |
| Binding theo layer trong contract | `docs/figma-contracts/*` (`bv`, paint `v`), `tools/figma-kit` (hash đổi khi đổi binding) |
| Tên variable ↔ biến CSS | `tools/figma-contract/check.mjs cssVar`, `scripts/build-tokens.mjs cssName` |
| Layer Figma ↔ phần tử DOM | map của các suite (`tools/figma-contract/suites/*`) |
| Sửa một khai báo CSS an toàn | `tools/studio/css-edit.mjs editDeclaration` |

## 3. Kiến trúc

### 3.1 Một định dạng cho hai chiều

Gói đẩy lên dùng **đúng JSON mà `figmaReadCode` trả** (FRAME / INSTANCE / TEXT / TABLE, layout, `nested`, `slots`), thêm
`id` Figma khi node đã có trong file. Mã mới `tools/studio/figma-push.mjs`:

- `figmaFromPage(text)` — nghịch đảo của `pageFromFigma`: element → INSTANCE (set id + property Figma qua bảng map ngược),
  `overrides` → `nested` theo đường dẫn layer, Stack → FRAME auto layout (gap / padding theo **tên variable**), Text →
  TEXT + text style, Table → TABLE (Data-Row), id tài liệu `f14243-64878` → id Figma.
- Selftest vòng tròn: `pageFromFigma(figmaFromPage(page))` ≡ `page` trên fixture Overviews, Table và các trang mẫu.

### 3.2 Kênh ghi: plugin Zen (đề xuất)

Luật hiện hành: `use_figma` chỉ đọc (HANDOFF, skills). Kế hoạch đã chọn đẩy qua plugin Zen (Q4: "nếu làm thì qua plugin
Zen"). Plugin thêm:

- Lệnh **Import from Studio** (tab Components): chọn file `.figma.json` mà Studio xuất ra (Studio: Export › For Figma).
  Không cần mạng: plugin hôm nay chỉ nhận file, không gọi được localhost.
- Message `place-studio-frame` trong `code.js`: dựng / cập nhật frame từ JSON — `importComponentByKeyAsync` hoặc tìm master
  theo set id và tên variant, `setProperties`, override lồng theo đường dẫn layer, `setBoundVariable` cho gap / padding,
  text style theo tên. Node đã có (id trong JSON) thì cập nhật tại chỗ; node mới thì tạo; node không còn trong JSON thì
  xoá (hỏi trước trong UI plugin). Trả về bảng id mới → Studio ghi vào trang (lần đẩy sau cập nhật đúng chỗ).
- Message `rebind-variants` cho Q5(2): `{ set, variants[], layer path, field, variable name }[]` → `setBoundVariable` trên
  master. Dùng lại phần rebind sẵn có trong importer, tách thành hàm riêng.

Kết quả của plugin (id mới, chỗ không map được) quay về Studio qua file `.figma-result.json` (Import trong Studio) hoặc
dán vào hộp "Paste result" (một bước, không cần mạng).

### 3.3 Q5(1): binding đổi → đề xuất CSS

`tools/studio/binding-diff.mjs` (Node):

1. `figma-kit status` → biến thể đổi hash; `code fetch` → contract mới (đã có).
2. So `bv` và paint `v` cũ / mới theo layer → danh sách `{set, variant, layer, field, from, to}`.
3. Layer → selector qua map của suite; field → thuộc tính CSS (`itemSpacing` → `gap`, `padding*`, `height`, `*Radius` →
   `border-radius`, fill → `background-color` / `color`); variant → scope (`[data-size="xlarge"]` qua `VARIANT_SETS`).
4. Tìm khai báo trong `src/components/<Name>/<name>.css` (postcss + so scope; bản Node của `cssResolve`).
5. Đề xuất `{file, selector, prop, from: var(--zen-a), to: var(--zen-b)}`; tên variable → biến CSS qua `cssName`.

Studio: hộp "Figma changed N bindings" trong frame Main component (danh sách tick, Apply = một sửa đổi, ⌘Z), cùng nơi
với ParityDialog. CLI: `node tools/studio/binding-diff.mjs --apply` cho phiên không giao diện.

Phạm vi: component có suite. Component chưa có suite báo "chưa có map layer" (cùng danh sách với gate `nested-paths`).

### 3.4 Q5(2): Save Main component → gói rebind

Lúc Save (đã có: harness, parity), Studio ghi thêm `rebind` cho mỗi khai báo đổi token: scope CSS → variant (ngược
`VARIANT_SETS`), selector → layer (ngược map của suite), biến CSS → tên variable Figma (bảng tra dựng từ
`tokens/source`, không đoán từ kebab-case). Gói hiện trong ParityDialog thành nút "Export for Figma"; plugin áp bằng
`rebind-variants`. Khai báo không map được thì ghi BACKLOG như hôm nay.

## 4. Lộ trình

| Mốc | Nội dung | Xong khi |
| --- | --- | --- |
| P0 | `figma-push.mjs figmaFromPage` + selftest vòng tròn (repo, không đụng Figma) | 5 trang mẫu đi vòng tròn đúng |
| P1 | Plugin: sao lưu, đưa vào git (§6 C), `place-studio-frame` + Import from Studio; Studio: Export › For Figma, Paste result | Đẩy trang Overviews vào file nháp (trang "Studio exports"), kéo về khớp; đẩy lại cập nhật tại chỗ |
| P2 | Override lồng, Table, Actions column, slot, ảnh | 5/5 trang mẫu đẩy lên rồi kéo về khớp |
| P3 | Q5(1) `binding-diff.mjs` + hộp trong Main component | Binding giả lập đổi → đề xuất đúng → Apply → suite xanh |
| P4 | Q5(2) gói rebind + `rebind-variants` trong plugin | Sửa token Button → áp trong plugin → `figma-kit status` + `check.mjs` khớp |

Mỗi mốc: selftest + E2E (nhóm mới `push`, PU-xx), `npm run qa`, CHANGELOG, session log, báo user.

## 5. An toàn

- Plugin chỉ ghi khi người dùng bấm trong plugin; frame đẩy lên nằm ở trang riêng "Studio exports" cho tới khi người dùng
  kéo nó đi. Component master chỉ đổi qua `rebind-variants`, sau khi xem trước danh sách.
- Plugin không có git: trước mỗi lần sửa, tarball vào `backups/` (thói quen hiện có) và commit (§6 C).
- `use_figma` vẫn chỉ đọc trong repo; kiểm tra tự động (E2E, selftest) không ghi vào Figma. Một lần thử thật mỗi mốc,
  trên file nháp hoặc trang "Studio exports", do user bấm trong plugin.

## 6. Câu hỏi cho user

| # | Câu hỏi | Đề xuất |
| --- | --- | --- |
| A | Kênh ghi: plugin Zen (designer tự làm, cần sửa plugin) hay `use_figma` (nhanh, chỉ chạy qua Claude, bỏ luật chỉ đọc) | Plugin Zen |
| B | Lệnh mới trong plugin có cần licence (như cập nhật component) không | Không cần licence cho Import from Studio; rebind theo licence như cập nhật component |
| C | Đưa thư mục plugin vào git (repo local, không push) trước khi sửa | Có |

**User chốt 2026-10-12:** A plugin Zen · B Import from Studio tự do, rebind theo licence · C git local.

## 7. Tiến độ

### P0 (2026-10-12, nhánh `zen/feat/figma-push`)

- `tools/studio/figma-push.mjs` `figmaFromPage` (isomorphic): Stack / Grid → FRAME auto layout (gap, padding theo tên
  variable `Spacing/Gap/…`, `Spacing/Padding/…`; căn, justify, wrap, Fill), Text → TEXT + text style, component → INSTANCE
  (set theo `appearance` khi có nhiều set, mọi property map được theo tên Figma: variant, boolean, text, icon swap kèm
  toggle; nhãn; con vào slot đầu của set; tên layer = aria-label), `overrides` → `nested` (component của từng layer:
  `inspector/nestedLayers.generated.ts`, sinh bởi `tools/studio/nested-layers-build.mjs` từ các lời gọi `nest()`), Icon →
  instance của icon. ID tài liệu `f…` → ID Figma (`figmaIdOf`). Phần P2 (data slot, node slot, Table, layer tuyệt đối)
  được ghi chú, không bỏ im lặng.
- `tools/studio/figma-steps.mjs`: bước Spacing và `sameValue` dùng chung hai chiều; `figmaMapping` giữ id, tên và slot
  của set.
- CLI `tools/studio/figma-push-cli.mjs <page.zen.tsx> --out=<page.figma.json>` (gói `{ format: "zen-studio-figma",
  version: 1, frame }`).
- Kiểm tra: `figma-push.selftest.mjs` 18 (vòng tròn Team kéo → đẩy → kéo giống hệt chữ; trang tự viết giống cấu trúc;
  set, property, variable, nested, Grid, slot, id). Trang Overviews thật: đẩy được, ghi chú Sidebar sections/brand/footer,
  DashboardHeader slots và 2 layer tuyệt đối (P2).

### P1 (2026-10-12, nhánh `zen/feat/figma-push`; plugin: git local `~/Documents/zen-ds-figma-plugin-main` 53d42d2)

- **Plugin Zen:** `src/plugin/studio-import.js` (`createStudioImporter(figma).plan / .place`, bundle.js ghép trước
  code.js), message `studio-import-plan` / `studio-import-place` (không licence), Import › Import from Studio (chọn
  `.figma.json`; xoá layer thì hỏi trước). Đặt frame trên trang "Studio exports": auto layout gắn variable Spacing, text
  style theo tên, instance theo set id (icon swap tìm component theo tên), override lồng theo đường dẫn layer
  (`layerKey`), nhãn (property Label/Text/Title/Content hoặc layer chữ đầu), nội dung slot. Mỗi layer giữ `key` (id
  tài liệu Studio) trong shared plugin data `zenstudio`, frame giữ id trang: import lại cập nhật đúng chỗ, không cần
  dán kết quả về Studio. Test `tests/studio-import.test.js` (mock Plugin API: đặt mới, cập nhật tại chỗ, xoá 1, ghi chú
  component thiếu); `npm test` của plugin xanh; `npm run build` (dist sao lưu trước).
- **Studio:** Export › tab **Figma** (`builder/export/figmaExport.ts`: mapping dựng trong trình duyệt, in tài liệu của
  trang kèm id nên key không đổi giữa các lần tải) → `<id>.figma.json`. `figma-map.mjs` (mapping, isomorphic) tách khỏi
  figma-pull; `figmaPackage`; CLI đánh key theo thứ tự khi trang không có id. E2E HO-09.
- **Đối chiếu chỉ đọc với file thật** (`use_figma`): gói Overviews — 6/6 set, mọi tên property, 11/11 variable Spacing,
  4/4 text style, icon là component local ở trang "🍑 Iconography". Bắt được và sửa: component nhiều set (Sidebar) ghi
  property của set khác → giờ chỉ ghi property set đó có (selftest 21).
- **Còn cho P1 "xong khi":** user chạy plugin trong Figma: Studio › Export › Figma › Download; plugin › Import › Import
  from Studio; kéo frame về (`figma-pull`) khớp; import lại sau khi sửa trang → cập nhật tại chỗ.

### P2 (2026-10-12, cùng nhánh; plugin 3b984fc)

- `figma-push`: data slot thành instance item (Sidebar sections → frame Section-Title + Menu-Item, Select = Yes cho mục
  đang chọn; Breadcrumbs Item/Slot; Segmented Item), node slot (Sidebar brand / footer, các hàng của Dashboard header),
  SidebarMenuItem và AppShellAction (Action-Item: hoán glyph, số đếm), chữ của Dashboard header (Heading Text, Child,
  SubHeading / Subheading) và Search, **Table như Figma vẽ** (frame các Data-Row: ô Header có nhãn, Sort, Align; ô
  Default giữ ô nội dung theo cột — Text, Dock-Icon, Avatar, Photo, Icon, Badge, Tag, Trend, Progress, Control, Actions;
  rộng cố định hoặc Fill; override theo hàng), layer tuyệt đối (constraint, inset), ảnh (gói `images`, Studio đọc
  upload / URL, CLI đọc file repo). Toggle bật khi prop có giá trị. Mọi layer push tự vẽ đều có key (key cha + vị trí).
- Plugin: `textList` / `texts` (cả trong override lồng: nhãn của ô có hình nằm trong Text-Cell lồng), `swapIcon`,
  `image` (`base64Decode` + `createImage`), `fixedWidth`, `absolute`; slot thay toàn bộ nội dung mẫu.
- Đối chiếu chỉ đọc với file thật: mọi set, property, slot và layer chữ mà gói Overviews / Table dùng đều có.
- Selftest figma-push 36; trang Overviews và Table thật đẩy lên không còn ghi chú.

### P3 — Q5(1) Figma đổi binding → CSS (2026-10-12)

- `tools/studio/binding-diff.mjs` (+ selftest 8): so contract hiện tại với commit cuối theo layer (`bv`, biến của
  paint); với mỗi đổi binding, đề xuất khai báo CSS đang đọc biến cũ (tên CSS; thuộc tính field điều khiển hoặc biến
  của component; giá trị variant trong selector khi nhiều chỗ cùng đọc, cỡ dài/ngắn) đọc biến mới — ready + tick khi
  chắc, manual khi giá trị ghép, token-missing khi biến mới chưa có token. CLI `--json`, `--apply`.
- Studio: `GET /binding-diff`, nút "Check Figma bindings" trong panel Main component, hộp **Figma bindings** (tên
  variable Figma, layer, số variant), Apply ghi bản nháp qua css-edit. E2E MC-08.

### P4 — Q5(2) Save Main component → rebind lên Figma (2026-10-12; plugin 173e97f)

- `tools/studio/rebind.mjs` (+ selftest 5): CSS trước / sau một lần Save → khai báo đổi token → các layer field trong
  contract của component đang gắn biến cũ ở các variant selector phủ → gói `zen-studio-rebind` (tên Figma của token mới
  từ tokens/source). Lấy ngay trong job Figma check của lần Save.
- Studio: ParityDialog có **Download for Figma** (cả khi bản lưu vẽ đúng như Figma nhưng Figma còn gắn biến cũ).
- Plugin: Import from Studio nhận re-binding (licence, hỏi trước): `setBoundVariable`, hoặc `setBoundVariableForPaint`
  cho fill / stroke; thiếu set / variant / layer / biến thì ghi chú.
- **Còn lại: user thử một lần trong Figma** (Q4: export trang → import, import lại; Q5: Check Figma bindings sau một lần
  chụp lại contract; Save một sửa token trong Main component → Download for Figma → import).

## 8. Độ phủ: example, template, AppShell so với Figma (2026-10-12)

**Vì sao hỏi:** user xuất trang Dashboard và Admin list từ Studio rồi import vào Figma: ra một frame trống. File
`.figma.json` đã rỗng (`children: []`): `figmaFromPage` gặp component không có set Figma thì bỏ cả nhánh, mà `AppShell`
(không có set) bọc cả trang.

**Audit tĩnh** (57 example `src/platform/examples/pages`, 16 file `src/templates`, `AppShell.tsx`; script trong scratchpad
của phiên "Studio export/import Figma frame"):

| Phần | Phần tử là component có set Figma / push tự vẽ | Component có set nằm trong wrapper code-only (mất khi push trước P1) |
| --- | --- | --- |
| Examples | 71% | 1.259 / 3.338 (38%) |
| Templates | 76% | 465 / 803 (58%); 12/15 template nằm trong AppShell → frame rỗng |
| AppShell.tsx | 23% (27 thẻ HTML thô, 28 className) | — |

Wrapper kéo theo nhiều nhất: List 481, Container 422, Form 351, AppShell 260, TabPanel 47, PageHeader 26.

Ba nhóm lệch:
1. **Figma có, map chưa nối:** TopNavigation 114 lần dùng ↔ Top-Navigation/Mobile `12014:45167` (+ 8 set Nav-Action;
   cố ý không có trong `figma-props.map.mjs`), PageHeader 74 ↔ Dashboard Header Type=Main, ô bảng viết JSX (TableText
   152, TableMedia 49, TableBadges, TableActions, TableTags; push chỉ hiểu `columns.content`), AppShellAccount ↔
   Avatar/Single, ColorSelector ↔ `373:97252`, TabItem ↔ `1576:2090`, InputConditions, UploaderFileItem,
   DatePickerSheet, các phần Chat. 59/147 set contract đọc được chưa có component Zen nào map vào.
2. **Figma có, contract chưa đọc:** trang ❖ Chart ra 0 set (Chart/Line-Chart `6643:63324`, Stack-Bar-Chart, Chart-Card),
   Metric (`595:55188`), ◇ Master-Layout (Patterns/Pages/Density-Medium `4122:41885`, Header/Dashboard).
3. **Figma không có component (vẽ thành frame / text):** Heading 295, List 265, Form* 158, ActionBar 45, Container 43,
   Menu 28, Image/Thumbnail 28, TabPanel 22, Link 20.

Ngoài ra: 119 thẻ HTML thô, 368 className (examples 340, templates 0).

**Lộ trình (user duyệt 2026-10-12, theo thứ tự):** P1 push không bỏ nhánh · P2 dựng lại AppShell bằng component Zen
khớp Master-Layout (thanh trên = DashboardHeader type="navigation", tài khoản = Avatar), push/pull hai chiều · P3 nối map
nhóm 1, đọc lại nhóm 2 · P4 dọn HTML thô / className trong examples. Ước lượng 7–10 ngày (phiên "Kiểm tra tiến độ plan").
Tên frame theo Zen (List, Form, AppShell…), không đổi tên layer Zen theo Figma (user, 2026-10-12).

### P1 (2026-10-12)

- `figma-push.mjs`: component không có set → frame các layer của nó (props node rồi children, bố cục theo CSS:
  `WRAPPER_LAYOUT` List Gap/3XSmall, FormField/Fieldset Gap/XSmall, FormActions hàng Gap/Small về phải, PageHeader
  Gap/XSmall; Container lề Margin-Comfortable), chỉ có chữ → TEXT, không có gì → bỏ kèm ghi chú; một ghi chú gộp mỗi
  component. Heading → TEXT theo text style của level. Menu → trigger. AppShellAccount → Avatar/Single (ảnh hoặc chữ
  tắt như Avatar). PageHeader → Dashboard Header Type=Main (title, Child, SubHeading, Action-Slots, Trailing-Slots;
  breadcrumbs / eyebrow / meta / tabs là layer quanh nó). AppShell → frame `AppShell`: Sidebar (fill cao) + `Column`
  [`Header` (padding như hàng Navigation của Figma) › Dashboard Header Type=Navigation: Leading = nút thu gọn + `header`,
  Center = `headerCenter`, Trailing = `headerActions`; `Sections` (Gap/Large); `Main`; footer; floating action ghim góc
  dưới phải] + aside; banner phía trên. Screen chrome (`screen-chrome.mjs`): desktop Sidebar + `Main` [`Header`
  (Padding/XLarge), `Content`], mobile Top / Bottom navigation quanh `Content`. Mọi layer của Screen (không chỉ layer
  đầu) và đều fill ngang.
- Sửa lỗi gặp khi làm: toggle của Dashboard Header (`Nav-Trailing-Block`, `Actions`…) bị ghi false khi slot có nội dung
  (slot ẩn trong Figma); con của Sidebar vào `Header-Content` thay vì `Body-Content`, mục `selectedId` không Select=Yes;
  key của frame gốc trùng key layer con; Overlay bị ghi chú thành "only the first Screen"; ghi chú trùng gộp (×n).
  Export › Figma báo lỗi khi trang không có gì đặt được, thay vì tải frame rỗng.
- Kiểm tra: selftest figma-push 52 (thêm AppShell, Screen chrome, PageHeader, wrapper, Heading, Menu, trang rỗng); E2E
  HO-10 (Export › Figma của trang AppShell); importer của plugin chạy trên gói Dashboard bằng mock trong test của plugin:
  dựng frame không lỗi (plugin không cần sửa). Trang Dashboard thật: 1 → 125 layer; Admin list: 1 → 158.
- Còn lại cho P3: ChartCard / LineChart / StackBarChart vẫn bị bỏ (chưa có set trong contract), MetricCard `trend` /
  `action`, ListItem `leading`, ListBox `header` chưa có slot Figma.

### P2 (2026-10-12, nhánh `zen/feat/appshell-figma`, xếp trên nhánh P1)

- **Code:** thanh trên cùng của AppShell giờ là `DashboardHeader type="navigation"` (Figma Primitives/Dashboard/Header
  Type=Navigation 4122:33400): nút thu gọn + `header` ở Leading-Slots, `headerCenter` ở Center-Slots, `headerActions`
  ở Trailing-Slots; `<header>` của AppShell chỉ còn là vỏ sticky (padding, nền Canvas). API không đổi. Khi không có
  Center-Slots, phần leading lấy chỗ còn lại như trước (Figma vẽ hai nửa FILL; nội dung vừa nửa thì trông như nhau), nên
  Breadcrumbs dài vẫn trên một hàng; cách xếp chồng (stacked) và đo đạc giữ nguyên, khoảng cách hàng đọc từ bar.
  Slot của Studio (`slots/registry.ts`) theo DOM mới.
- **So ảnh** (`visual-diff`, 7 trang dùng AppShell, 1512 + 390): 93/94 khung giống hệt; khung còn lại là sửa lỗi —
  ở 390 ô Search giữa thanh (headerCenter) trước đây chạy dưới nút chuông, giờ dừng trước nó (Trailing-Slots không co
  dưới nội dung).
- **Pull:** `figma-pull.mjs appShellElement` đọc một frame ngang [Sidebar (instance, hoặc composition bọc nó), cột có
  hàng đầu là Dashboard Header Type=Navigation, SidePanel?] thành `AppShell`: Leading-Slots (bỏ nút thu gọn AppShell
  tự vẽ; không có nút → `sidebarToggle={false}`) → `header`, Center-Slots → `headerCenter`, Trailing-Slots →
  `headerActions` (Avatar có tên người ở cuối → `AppShellAccount`), các hàng khác của Header/Dashboard hoặc frame
  `Sections` → `sections`, frame trang (Body giữ padding trong một Stack; `Main` của push thì lấy thẳng layer) →
  children, layer ngoài auto layout → `floatingAction`, layer sau trang → `footer`. Trang Overviews thật của Figma giờ
  kéo về thành AppShell (Sidebar, Breadcrumbs, Segmented, hàng custom, IconButton nổi). `screenChrome`: frame `Screen`
  của push → `sidebar` / `header` của Screen (Dashboard Header Main → PageHeader). Hàng Main không có Header-Text đọc
  `text` / `texts` (JSON của push).
- **Sửa lỗi gặp khi làm:** AppShell trên một Screen của Studio cao bằng cửa sổ trình duyệt (100dvh của app cuộn trang)
  nên Sidebar ngắn hơn trang (E2E NO-19 bắt được khi Overviews kéo về thành AppShell; trang Dashboard của user cũng
  vậy): `builder.css` cho AppShell phủ Screen, Sidebar và aside kéo hết chiều cao trang. HO-10 vào baseline E2E.
- **Kiểm tra:** selftest pull 47, push 57 (thêm vòng tròn AppShell và Screen chrome), Studio self-tests xanh, Vitest
  smoke + AppShell 177.
- **Chiều cao thanh trên cùng (user chốt 2026-10-12: "Theo figma"):** 72px như hàng Navigation của Master-Layout —
  Margin-Comfortable trên và hai bên, Spacing/Padding/XSmall dưới (đảo lại lần đổi 64px ngày 2026-10-09; padding
  `sm` của template giữ nguyên: PageHeader nằm 8 + 12 = 20px dưới hàng nút, như hàng Main của Header/Dashboard). Push
  vẽ frame `Header` cùng padding đó.

### Clip content (2026-10-12, user: "nên thêm bật tắt clipping trong studio … giống figma")

- Figma cắt bóng vì plugin không đặt clipsContent (createFrame mặc định cắt). Plugin (phiên "Lỗi UI"): frame theo
  `spec.clip`, frame gốc vẫn cắt; push ghi `clip` cho mọi frame có `clip`.
- Stack và Grid có `clip` như Box; Studio hiện Clip content (dưới Padding) cho Stack, Grid, Box; pull đọc clipsContent
  thành `clip` (trừ frame trang). E2E L-12.


### P3 — các khoảng trống map (2026-10-13, nhánh `zen/feat/figma-map-p3`; plugin 5121b91 … b7a328d)

Mỗi mục: push (Studio → Figma), pull (Figma → Studio), selftest (`figma-push.selftest.mjs` §15–25) và import thật vào
file Zen (trang "Studio exports", frame thử của phiên này: 15342:11, 15351:17949, 15354:3, 15356:3, 15357:3, 15361:3,
15366:3, 15380:492, 15385:3).

| Code | Figma | Ghi chú |
| --- | --- | --- |
| TopNavigation | Top-Navigation/Mobile (12014:45167) + Nav-Slot/Action, Nav-Action/* | `figma-top-nav.mjs`: Type → Type, Status-bar tắt (Screen của Studio không có), Top-bar tắt khi large title gập bar, tiêu đề vào Heading-Text, action vào Trailing-Slot của từng hàng (`within`), Button theo Type; Control-Bar có lề như CSS. Pull: `readTopNav` trong bộ đọc. |
| ColorSelector | Color-Selector (373:97252) | Hàng swatch, fill = biến màu của token (plugin: `fill` trên instance). |
| Tabs › TabItem | Primitives/Tab-Item | TabItem con thành item; số badge vào Badge-Counter. Pull: nhãn không còn đọc nhầm "True". |
| InputConditions | Input-Conditions (373:97663) | Map trong figma-props.map; nhãn Condition-Item là text của instance. |
| UploaderFileItem | Primitives/Uploader/File-Item | State, Name, Size, caption; lỗi vào Help-Text; tiến độ = bậc Progress-Bar; ẩn Remove/Retry khi không có handler. |
| DatePickerSheet | Date-Picker/Mobile (9923:3576) | Single / Multiple-Default / Multiple-Selected, tiêu đề; sheet đóng thì không đẩy. Nút OK giữ tên Zen "Apply" (Figma: Button/Main không tên). |
| Metric, MetricCard | Metric-Inline (trong Card) | Pull trước đây ra MetricCard rỗng / Card bọc MetricCard: nay ra Metric và MetricCard đủ nhãn, số, trend (đọc ở Badge), icon. Push hiện icon mặc định như code (trước bị ẩn). Fixture `figma-metric.json`. |
| Icon (size), FileIcon, Flag | icon-*, icon-media-file (5727:22537), Flag (7063:63834) | Cỡ icon = biến Element-Size/Popular (trước luôn 20px); FileIcon theo Format; Flag theo Name, cỡ Image-Size. Plugin: `size` / `sizeVar`. |
| ChatThread, ChatMessage | Chat/Section/Conversation, Chat/Reaction/Status + Emoji/Static, Chat/Section/Read-List | Thread = các run theo phía; tác giả (Avatar mang tên người), reactions, danh sách đã xem. Pull đọc lại đủ từ bản đọc thật (fixture `figma-chat.json`). |

- Plugin: slot theo `within` (hai Trailing-Slot), `nested.name` (đặt tên lớp lồng) và tìm lại lớp đã đổi tên theo
  component, `fill` trên instance.
- User (2026-10-13): "các ava nhỏ chỉ nên dùng viết tắt 1 chữ" → avatar XSmall/2XSmall 1 chữ ở cả code (ChatMessage hết
  lách quy tắc của Avatar) lẫn push.
- Bộ đọc của pull: `firstText` bỏ text trong lớp ẩn; slot của instance lồng (`innerSlots`); Avatar đổi tên được đọc.
- Còn lại (không làm trong P3): primitive con mà component cha tự vẽ (Popover/Item, Sheet-Actions/Item trong overlay chưa
  đẩy; Checkbox/Radio Mark; Empty-State Illustration; Progress-Circle/Icon); Metric-Card (6643:64008) — push vẽ MetricCard
  bằng Card + Metric-Inline như trước.

### P4 — className trong ví dụ (2026-10-13, cùng nhánh)

- Đo 350 className theo CSS của chúng: ~110 chỉ để chỉnh độ rộng Card/ListBox. User chọn thêm prop: Card và ListBox nhận
  width / minWidth / maxWidth / alignSelf như Stack (Figma Fill container, Min/Max width). Push ghi min/max width của
  instance; các con cùng alignSelf đặt căn của frame cha; pull đọc lại (`Stack align="center"` + `width="fill"`).
- 90 className thành prop, CSS của chúng bị xoá; 40 gốc ví dụ căn giữa nằm trong `<Stack>`. Visual diff 430 panel: giống
  hệt (một panel khác vì ảnh lazy). Còn 260 className: container query (cần API Grid, chờ user), chi tiết chỉ cho docs,
  màu / display.


### P5 — className còn lại (2026-10-13, nhánh `zen/feat/examples-classnames`; plugin 6b823d2)

User ("Xử lý hết") chọn cả bốn: Text `wrap` / `tabularNumbers`, Stack / Box `scroll`, Box `surface="canvas"`, và "không
thêm, dùng cách khác" cho phần còn lại (khung docs thành component của platform). Thêm `Grid stackBelow` cho 27 chỗ
container query.

| Code | Figma (push) | Pull |
| --- | --- | --- |
| Box `surface` (cả 5, gồm canvas) | fill frame gắn biến Color/Background/… (`BOX_SURFACE`, figma-steps.mjs); Box không còn gap md | fill gắn một trong 5 biến → `Box surface`; frame có gap/căn → Box bọc Stack |
| Stack / Box `scroll` | Overflow scrolling (VERTICAL / HORIZONTAL) + Clip content | overflowDirection → `scroll` (BOTH → "y" + ghi chú); Grid cuộn → Box bọc |
| `maxHeight` (px) của Stack / Grid / Box | Max height | maxHeight → `maxHeight` (maxWidth của frame cũng được đọc lại — trước đây bị rơi) |
| Text / Heading `wrap={false}` | Auto width (`textAutoResize` WIDTH_AND_HEIGHT, không Fill) | không đọc (giữ nhờ so 3 chiều) |
| Text `tabularNumbers` | plugin API không đặt được Numbers: Tabular → một ghi chú cho cả trang | `openTypeFeatures.TNUM` → `tabularNumbers` |
| Grid `stackBelow` | 1 cột khi push biết bề rộng Grid nhỏ hơn ngưỡng | không đọc (giữ nhờ so 3 chiều) |

- Lỗi gặp và sửa: Grid kéo từ Figma thật ra `gap="none"` (reader chỉ đọc itemSpacing; Grid lưu ở gridColumnGap).
- Thử thật trong file Zen, trang "Studio exports": frame 15417:3 (phone, Box canvas, Grid stackBelow → 1 cột, hàng chip cuộn
  ngang, danh sách cuộn dọc dừng ở 120px, tiêu đề một dòng). Đẩy rồi kéo về ra đúng Box surface / scroll / maxHeight.
- Ví dụ: 219 class → 112. Khung docs thành `src/platform/PlatformFrames.tsx` (PreviewAppFrame, PreviewWindow,
  PreviewPage, PreviewShell / ShellMain, ShellPage, StudioLogo / StudioMark, PhoneToastHost) và ChatWindow… trong
  PlatformChatDesktopShowcases.tsx. Thư viện: Badge không co trong hàng (4 ví dụ phải vá bằng class), Text tabIndex -1 có
  vòng focus riêng (14 class focus-target).
- Còn lại (không có prop, chờ user): lề theo token Margin/Comfortable và padding từng cạnh, phần bên trong component
  (Table min-width, nhãn ProgressBar, độ rộng Toggle, nội dung Card cao hết thẻ, chiều cao SidePanel khi docked), độ rộng
  Skeleton, độ rộng theo `ch` / rem và min-height theo token đổi theo chế độ, ảnh / video / nút ảnh, bố cục đáp ứng riêng (ẩn nhóm zoom, đổi viền khi xếp chồng).

### P6 — thử khứ hồi trên mọi frame ví dụ (2026-10-13, nhánh `zen/feat/figma-roundtrip`; plugin sau 6b823d2)

Cách thử: chụp Studio của 353 frame ví dụ → push → pull (so theo `key` của push), rồi đặt thật trong file Zen bằng
importer của plugin và đọc lại bằng bộ đọc của pull. Chỉ tin kết quả đọc thật: harness chỉ để khoanh vùng.

| Phần | Lỗi gặp | Sửa |
| --- | --- | --- |
| Checkbox / Toggle / Radio | Figma bỏ thuộc tính Caption của Checkbox/Text; nhãn và chú thích nằm trong `.Primitives/Checkbox/Content` (Label, Subtext) | push ghi Label + Subtext (bật Subtext trước khi ghi) vào Content; pull đọc lại; map bỏ Caption |
| DockIcon emoji | emoji không được ghi | push ghi emoji vào lớp chữ của Theme=Emoji; pull ra `emoji` |
| InputField / Select… | pull mất nhãn, giá trị, help | pull đọc Label lồng, Text (Inputted → defaultValue, không thì placeholder), Message → helpText / errorMessage |
| ListItem / ListBox / List | pull mất title, caption, leading, trailing | pull đọc Info-Content (Title / Subtitle), leading lồng (Avatar, Dock-Icon, FileIcon, Thumbnail, Flag), Actions → trailing; cột ListItem → `<List>`; Header-Slot / Footer-Slot của List-Box |
| Text tone, Heading | màu chữ và cấp heading mất | bộ đọc lấy biến Color/Content của fill → `tone`; push đặt tên lớp `Heading N`, pull ra `<Heading level>` (bỏ textStyle mặc định của cấp) |
| PageHeader, DashboardHeader | Type=Main ra DashboardHeader; ô Search mất placeholder; lỗi `texts.find` | Type=Main → PageHeader (Subheading → description); placeholder đọc từ text lồng |
| Sidebar | logo không được đẩy (Figma giữ logo mẫu "Kaiz"); pull biến nút Collapse thành `brand` | push: `logo` vào Header-Content (thay LOGO mẫu và Collapse; nút Collapse chỉ khi có `onCollapsedChange`); pull bỏ LOGO mẫu và Collapse (có ghi chú) |
| Breadcrumbs | `master={false}` mất | pull: crumb đầu không phải Master → `master={false}`; mọi crumb Medium → `emphasis` |
| DescriptionList | pull ra `{ label }` thay cho term / description | pull đọc Term / Value / Emphasis của từng Item |
| Swap lồng (leading FileIcon) | Figma không liệt kê override cho swap trong nội dung slot → bộ đọc bỏ sót | bộ đọc so lớp với lớp gốc trong main component (`swappedIn`, chỉ cho icon / Dock-Icon / Avatar / Thumbnail / Flag, bỏ qua swap theo thuộc tính) |

- Giới hạn của Figma (đã kiểm): instance lồng trong instance không đổi được cỡ ("This property cannot be overridden in an
  instance: size") → FileIcon `size="xl"` làm leading của ListItem hiện ở cỡ 20 của component; push ghi chú, plugin bỏ
  phần đặt cỡ lồng.
- Contract `component-properties.json` (đọc 2026-10-05) lệch file live ở 14 set (Avatar / Badge / Dock-Icon thêm theme,
  Card Semi-Pale / On-Container, List-Box Theme, Progress-Bar Layout, Side-Panel, Inline-Message, Tooltip…): đã báo
  session đang sửa map đó; List-Box Theme sẽ đi theo map của họ.
- Còn lại: Container / Box / Form về thành Stack; ListItem `titleLines`; dữ liệu chỉ có trong code (Chip popoverItems,
  tooltip, aria); Image trong logo Sidebar chưa có set Figma. Đề xuất P6b (chờ user): khứ hồi theo `key` — bộ đọc lấy
  key của push, pull dùng key làm id phần tử, Studio giữ bản gốc lúc export, nên "Update from Figma" chỉ đổi đúng chỗ
  designer sửa và giữ mọi chi tiết chỉ có trong code.
- Frame thử (trang "Studio exports"): 15448:3 (breadcrumbs), 15440:3323 (toast), 15440:3809 (dashboard-header), cùng các
  frame P6 trước: 15438:3, 15440:3, 15440:2284, 15440:2468.
