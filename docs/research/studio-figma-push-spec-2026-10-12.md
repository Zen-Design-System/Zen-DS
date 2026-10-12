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
  [`Header` (Padding/Small · Margin-Comfortable) › Dashboard Header Type=Navigation: Leading = nút thu gọn + `header`,
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
