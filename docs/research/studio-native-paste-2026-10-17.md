# Studio → Figma: ⌘V thẳng vào canvas, không qua plugin (2026-10-17)

User: "ý tôi là paste trực tiếp vào figma không qua plugin", rồi chọn "Biểu đồ trước, rồi dán thẳng". Phương án C của
`studio-copy-to-figma-2026-10-16.md` (§3 C): Studio tự viết clipboard theo định dạng của Figma. Tài liệu này ghi những
gì đã chứng minh bằng dán thật trong file Zen `9nZv4uW2LT21yuHabMTCh1` (trang "Studio exports — QA" 15872:3) và thiết kế
để làm.

## 1. Định dạng (đã kiểm)

- Clipboard của Figma là `text/html`: `<span data-metadata="<!--(figmeta)b64 JSON(/figmeta)-->">` +
  `<span data-buffer="<!--(figma)b64(/figma)-->">`. Buffer = `fig-kiwi` + uint32 phiên bản (106) + các chunk
  [uint32 độ dài + dữ liệu]: schema (deflate raw, 653 kiểu) rồi message. Message nén **deflate raw** cũng được nhận
  (Figma tự chép ra dùng zstd), nên trình duyệt viết được bằng `CompressionStream("deflate-raw")`.
- Message `NODE_CHANGES` cần `blobs: []`, `publishedAssetGuids: []`, `pasteAssetType: "UNKNOWN"`. Thiếu thì Figma bỏ
  qua bản dán, không báo gì.
- Node GUID = node id (`sessionID:localID`). Node mới dùng id riêng; Figma cấp id mới khi dán.

## 2. Đã chứng minh (dán thật, mọi node dựng từ đầu)

| Thử | Kết quả |
| --- | --- |
| Khung xương variant (id, cha, kiểu, tên, hiện/ẩn, kích thước, vị trí, symbolID lồng, refs) đọc bằng use_figma | Figma nhận, gắn instance vào component gốc trong file, không nhân bản set |
| Biến bằng `{guid}` = số trong `VariableID:a:b` | nền, padding, gap gắn đúng biến; không cần node VARIABLE |
| Text style bằng `{guid}` của node style | gắn đúng (Body/Base/Bold). Key/version không gắn được nếu không kèm node style |
| Gán thuộc tính bằng id mức set (`Text#1026:804`) hoặc id tự đặt | Figma bỏ qua: cần id **mức variant**, Plugin API không cho đọc |
| Override thẳng layer mà thuộc tính điều khiển, theo `guidPath` (textData, visible) | chạy; Figma quy ngược về thuộc tính (Text = "Save K23", Leading-Icon = true, Counter = true, chữ lồng "7") |
| Slot: FRAME `isSlotContent` trên Internal Only Canvas + gán `{defID mức variant, slotContentIdValue}` | Card hiện nội dung slot, có style |
| Auto layout, chữ | Figma tự tính lại kích thước khi dán (nút co theo chữ, Card co theo nội dung) |

Bản ghi các lần dán: scratchpad của session (`clip/build-k*.mjs`), các khung Clip I1…K26 trên trang QA.

## 3. Những gì phải lấy từ Figma (gói định nghĩa)

- Khung xương mỗi variant mà push có thể viết, kèm tên variant (Size=…, Level=…) để chọn variant theo thuộc tính.
  Lấy bằng use_figma (chỉ đọc).
- Id mức variant của thuộc tính SLOT, và guid của style (91 style: 36 text, 37 paint, 18 effect). Không đọc được bằng
  Plugin API, nên lấy bằng **capture tự động**:
  1. use_figma dựng khung probe trên trang QA (mỗi style một lần; mỗi variant có slot một instance).
  2. `open -a Figma "https://www.figma.com/design/<file>/x?node-id=<id>"` để desktop chọn khung đó.
  3. Edit › Copy qua System Events, rồi `the clipboard as «class HTML»`.
  4. Giải mã, lấy bảng.
  Đã chạy cho style (91/91). Cần quyền Accessibility cho app Claude (user đã bật).

## 4. Thiết kế

- `tools/studio/figma-kiwi.mjs` (isomorphic): đọc schema, mã hoá message, đóng gói `fig-kiwi`, nén deflate
  (CompressionStream trong trình duyệt, zlib trong Node). Schema v106 lưu kèm (`docs/figma-contracts/figma-clipboard-schema.bin`,
  75 KB).
- `docs/figma-contracts/native-pack.json`: khung xương từng variant, id slot mức variant, bảng style. Builder
  `tools/studio/native-pack.mjs` (`code` cho use_figma, `write` từ câu trả lời và capture, `check` các set chưa có),
  giống `library-keys.mjs`.
- `tools/studio/figma-native.mjs`: gói export của Studio → `nodeChanges`. Cụ thể:
  - FRAME, TEXT, VECTOR, ELLIPSE dựng thẳng.
  - INSTANCE: chọn variant theo thuộc tính VARIANT. Thuộc tính TEXT, BOOLEAN, INSTANCE_SWAP thành override trên layer
    mà nó điều khiển (đọc từ refs của khung xương).
  - `nested` thành guidPath; `slots` thành khung slot content; `edits` (visible, characters, columns) thành override
    theo guidPath.
  - Biến gắn bằng id, style gắn bằng guid.
- `tools/studio/figma-clip.mjs`: ⌘C trong Studio thêm hai span của Figma vào cùng `text/html`. Dán vào canvas thì ra
  layer thật; dán vào cửa sổ plugin Zen vẫn import như hiện nay.

## 5. Giới hạn và thứ tự

1. File Zen trước, vì id khớp trực tiếp. File khác cần thư viện đã publish (instance trỏ symbol thư viện bằng
   `componentKey`), làm sau khi user publish.
2. Ảnh (blobs), chữ nhiều style trong một layer, và `minHeight` của hàng grid (importer đo sau khi dựng) làm sau phần
   chính. Mỗi phần đều so với bản import của plugin.
3. Kiểm thử: dán tự động vào trang QA (mở QA → Select None → Paste), đọc bằng use_figma, so cây layer với bản import
   plugin của cùng trang (Expenses), rồi chụp ảnh.

## 6. Đã làm (2026-10-17)

- `tools/studio/figma-kiwi.mjs`: bộ mã hoá kiwi, đóng gói `fig-kiwi`, html của Figma (đọc và viết; selftest 19).
- `tools/studio/native-pack.mjs` + `docs/figma-contracts/native-pack.json` (8 MB, gzip 0,57 MB): 7.205 symbol
  (4.344 variant của 172 set push viết, 1.597 icon, các component lồng), 224 set, 101 style (font của text style, màu
  của paint style), 1.200 biến, 561 nội dung slot do component đặt sẵn (đủ node, vector inline). Lấy bằng capture tự động:
  `probe-code` (use_figma dựng khung probe trên trang QA), `capture` (Figma desktop: mở node, Edit › Copy, đọc clipboard),
  `check`. Schema đi kèm: `figma-clipboard-schema.generated.mjs`.
- `tools/studio/figma-native.mjs`: export → message (selftest 29, gồm trang Expenses). Studio ⌘C
  (`builder/export/figmaClipboard.ts`) ghi html của Figma trước span của plugin, trong cùng một mục clipboard.
- Dán thật trang Expenses vào file Zen: 474 frame, 613 instance, 151 slot, 277 text, 190 vector, 14 ellipse, đúng như
  bản plugin import; 245/245 chữ; pill của Donut lệch 1–2 px (kích thước chữ là ước lượng, Figma tự dàn lại).

Những điều phải làm đúng như Figma (đã đo):
- Layer gắn thuộc tính (TEXT_DATA, VISIBLE, OVERRIDDEN_SYMBOL_ID) đổi bằng phép gán thuộc tính trên instance chủ của nó,
  không bằng override thẳng: Figma tự đổi như vậy khi plugin đặt chữ.
- Sửa một layer trong nội dung slot mà component đặt sẵn: Figma chép cả nội dung đó, gán bản chép cho slot bằng override
  trên instance lồng; override đó chỉ có phép gán slot (bản Figma copy, §7). Phép gán slot không có `value` là bản sót,
  Figma không hiện.
- Override đổi variant mà component đặt trên instance lồng của nó quyết định layer nào đang hiện: thứ tự ưu tiên là bản
  dán, nội dung chép, rồi component ngoài cùng trước.
- Chromium viết html qua `navigator.clipboard.write` thì đổi `<!--` trong thuộc tính thành `&lt;!--`: canvas Figma bỏ qua.
  Ghi trong sự kiện `copy` (`setData`) thì giữ nguyên: ⌘C trên frame khi export đã đọc sẵn (Studio đọc trước khi chọn).

Còn mở: file khác ngoài file Zen (cần thư viện publish và định nghĩa đầy đủ: instance trỏ symbol thư viện bằng
`componentKey`), ảnh trong slot, menu Copy for Figma (đường ghi bất đồng bộ, chỉ plugin đọc được).

## 7. Đối chiếu với bản Figma tự copy (2026-10-17, user: "Copy paste vẫn lỗi mà", rồi "theo cách bạn đề xuất")

Thay cho tìm lỗi bằng mắt: `tools/studio/native-diff.mjs --pkg=<export> --oracle=<html>` so bản dán thẳng với bản Figma tự
copy của khung plugin đã import cùng export đó (plugin dựng bằng runtime của Figma nên là chuẩn), từng instance, từng
override, nhóm theo loại. Dashboard: 1.807 → 112 khác biệt (còn lại chủ yếu là cách ghi slot, §8). Những quy tắc đo được:

- Override chỉ ghi phép gán bản dán thay đổi. Ghi lại phép gán đổi icon của component làm Figma đổi lại từ đầu, mất màu.
  Không gán lại icon đang hiện (plugin cũng bỏ qua).
- Đổi component một layer (thuộc tính Icon-Src, icon, set khác): Figma giữ override của instance cũ (mục `self` có guidPath
  là symbol của nó: tên đã đặt, cỡ/biến cỡ, fill; và mục của các layer con, ghép theo tên), thành mục riêng có
  `overrideLevel` = độ sâu layer bị đổi. Đổi variant cùng set: chỉ giữ tên.
- Instance không mang `strokeWeight`/`strokeAlign` (đè giá trị của component). "Space between" là `SPACE_EVENLY`.
- Biến trong bản dán bằng `{guid}`; `{assetRef}` chỉ chạy khi clipboard có node VARIABLE (thiếu thì icon co 1px).
- Gói định nghĩa có bản sao biến từ thư viện publish (guid ≠ publishID, vd. 15052:45): đổi về biến gốc (chữ trắng).
- **Khi bản dán đổi icon, Figma tính phần giữ lại từ định nghĩa đi kèm clipboard**, không từ file. Chín lần dán (một
  lần dán nhiều dòng, mỗi dòng một biến thể/icon đầy đủ hoặc khung xương) cho thấy: instance lồng trong khung xương phải
  có override của component (`keep`) và mục `PROP_REF` trong `parameterConsumptionMap` (OVERRIDDEN_SYMBOL_ID → định nghĩa
  thuộc tính) cùng `overrideKey`; icon để khung xương vẫn được. `componentKey` và fill của hình trên khung xương không cần
  (bỏ đi cho gói nhỏ). Chữ vừa dán được Figma dàn lại muộn: ngay sau khi dán, render bounds (và ảnh chụp server) có thể
  ra bề rộng cũ của component (chữ FILL căn phải ở 232px); khi khung hiện trên màn hình Figma dàn lại đúng.
- Dán tự động (osascript) vào canvas ngừng nhận clipboard do script ghi; clipboard Figma tự ghi thì vẫn dán được. Kiểm
  bằng native-diff trước, nhờ user dán một lần cho nhiều trường hợp.

## 7b. AppShell = Master-Layout (2026-10-18, user: "app shell và master layout không khớp với nhau…")

AppShell xuất thành instance `Patterns/Pages/Density-Medium` Level=Master (4122:41886) cho cả plugin và dán thẳng
(`figma-push.mjs` masterLayoutNode, `figma-pull.mjs` masterLayoutFrame đọc ngược lại). Gói có thêm 3 bộ (master,
Header/Dashboard, Patterns/Sidebar). Đo từ bản Figma tự copy của một master đã chỉnh tay:

- Master gắn cao/rộng vào Viewport (982/1512), Content FILL: trang dài bị cắt. Trang làm master giãn: Main-Container,
  Body, Content ôm nội dung (override `stackPrimarySizing` RESIZE + bỏ grow/stretch theo hướng của cha), Side-Bar
  `stackChildAlignSelf` STRETCH, `minSize` 982 trên instance. Hàng gói lưu `mode` của frame để biết trục.
- Padding riêng của instance (hàng Dashboard header) nằm ở override `self` (guidPath = symbol của nó) với giá trị +
  pcm alias; ghi lên node thì Figma bỏ qua (top bar không padding).
- Fill một trục mà component gắn biến (Viewport-Width): bỏ gắn trong `self` (mục WIDTH không variableData ở vcm + pcm),
  như Fill của Figma; giữ lại thì Figma kéo master về 1512 sau khi đã dàn 1440. Symbol trong gói lưu `bound`.
- Bỏ gắn padding của Body: override có giá trị 0 và mục STACK_PADDING_* không variableData ở cả hai map.
- Instance lồng "ôm" (Segmented của chart) phải bỏ cả stretch ở cha, không chỉ đổi sizing của nó.
- Đọc ngay sau khi dán (use_figma, ảnh chụp server) có thể còn vị trí cũ (hàng thứ hai ở y 0, Container chưa lùi 24px)
  trong khi màn hình của user đã đúng; chụp lại sau.

## 7c. Ảnh trong bản dán (2026-10-19, F8c, user chọn "Dán ảnh qua ⌘C→⌘V")

Paint IMAGE ghi ảnh bằng SHA-1 của byte (`image` và `imageThumbnail` cùng hash). **Byte phải nằm trong `blobs` của
message** (`Image.dataBlob` = chỉ số blob): Figma desktop nhận ảnh mới tinh gửi như vậy (PNG, JPEG, GIF; một PNG 275 KB).
`meta.imageHashes` (hash → URL, như bản Figma tự copy) chỉ chạy với ảnh server Figma đã có: data: URL và http cục bộ
không được tải (lần thử đầu tưởng data: URL chạy vì ảnh đó đã có sẵn theo hash). WebP không vào: Studio vẽ nó ra PNG
bằng canvas (`figmaClipboard.ts`). Crop = `STRETCH` với `transform` [[w,0,x],[0,h,y]] (phân số), Tile = `scale`. `src`
của Studio đi theo shared plugin data: Figma ghi nó là `pluginData` `{ pluginID: "", key: "zenstudio-image" }`.
Ảnh riêng của component (Avatar ảnh, ô Avatar / Photo của bảng; user duyệt 2026-10-19): gói định nghĩa ghi `img` (các
fill) cho mỗi layer có fill IMAGE (671 layer: Avatar/Single 656, Photo-Cell, Popover item Photo…); writer tìm layer đầu
tiên có ảnh như importer (`applyImage`), sau các override lồng (biến thể đang hiện), và ghi override `fillPaints` theo
guidPath, blob của ảnh trong override cũng được đánh chỉ số. `native-pack.mjs images-code` / `images` đọc lại các layer
này bằng use_figma khi thư viện đổi ảnh mà không cần chụp lại cả gói; một lần chụp đầy đủ (`packFrom`) cũng ghi chúng.

## 7d. Các Shape còn lại (2026-10-20, mục BACKLOG user duyệt 2026-10-17)

Đọc từ bản Figma tự copy một probe dựng bằng đúng các lệnh của importer: LINE (cao 0, stroke CENTER, mũi tên =
`strokeCap: ARROW_LINES` trên node, vẽ ở cả hai đầu), REGULAR_POLYGON `count`, STAR `count` + `starInnerScale`, VECTOR
(blob mạng điểm; Figma đổi Q thành C, đường even-odd là một region nhiều vòng với style 0), BOOLEAN_OPERATION
(`booleanOperation`, `vectorOperationVersion: 1`, hình con nằm trong nó; Exclude = XOR). Dán thật cả trang Shape từ
figma-push: đúng loại, kích thước, xoay/lật quanh tâm, biến màu. Mũi tên một đầu còn mở (BACKLOG).

## 7e. Component riêng của trang (2026-10-20, user chọn "Main thật + Use thành frame")

Bản Figma tự copy một probe (main có property, set 2 variant, instance) cho cách ghi: set = FRAME `isStateGroup` +
`stateGroupPropertyValueOrders` + `componentPropDefs` (BOOL/TEXT có initialValue + varValue, VARIANT varValue STRING
""); variant = SYMBOL có def riêng `parentPropDefId` + `variantPropSpecs`; layer gắn = `componentPropRefs` + PROP_REF;
instance gán theo def riêng của variant. **Figma không nối instance với main được dán cùng lúc**: dán lại chính bản
Figma copy (main gốc đã xoá) thì mọi instance mất main (bản dán cùng file luôn trỏ main theo id gốc). Vì vậy `<Use>`
thành frame sao y biến thể với giá trị của nó (property, override `at`); một ghi chú gộp; slot / swap property còn là
ghi chú.

## 8. Còn mở

Không còn mục mở. Dán vào file khác ngoài Zen: xong 2026-10-25 (§9).

Đã đóng 2026-10-23 (session C):
- Menu "Copy for Figma" đọc trước khung khi menu mở và ghi trong copy event như ⌘C (trước đó ghi bất đồng bộ, Chromium
  đổi `<!--` thành `&lt;!--`, chỉ plugin đọc được). E2E HO-12 đọc html không qua sanitize, kiểm hai span của Figma.
- Chiều cao tối thiểu của thẻ trong hàng grid: thử trong Figma (trang QA, 2026-10-23), hàng Hug với bốn Metric-Card
  kéo giãn không có min lấy thẻ thấp nhất (208) và ép Sparkline từ 236 xuống 208. Bản dán không đo được trong Figma nên
  lấy chiều cao của thẻ trên canvas Studio (figmaClipboard.ts `withCanvasHeights`, theo id phần tử) làm `minSize`, như
  plugin đo (settleGridRows). Thẻ canvas không vẽ đúng một lần (ngoài trang, vẽ bằng map) thì không có min.
- Gói định nghĩa 23,3 → 7,7 MB (gzip 0,76): mỗi nhánh lặp lại (chủ yếu `keep`/`pcm` của instance lồng) ghi một lần
  trong `shared`, chỗ dùng ghi `{$: n}` (native-pack.mjs `compactPack`); figma-native.mjs `expandPack` mở lại khi nạp
  (78 ms). Bản dán của 59 trang (58 trang Studio + Expenses) giống từng byte với gói cũ.
- Giữ theo thiết kế: slot ghi override vào layer mặc định của slot thay vì nội dung ở cấp ngoài như Figma (hiện như
  nhau, sửa trong Figma như nhau); phần giữ lại ghi biến alias của component (Button-Tertiary/Content/Default) thay vì
  biến đích Figma tự ghi (Strongest): cùng màu, và theo đúng ngữ nghĩa component ở mọi mode.

## 9. Dán vào file khác (2026-10-25, user publish thư viện; nhánh zen/feat/paste-other-files-20261025)

Đo bằng dán thật vào file thử ngoài Zen ("Zen paste test …", team Đìzai Studio Official) và bản Figma tự copy:

| Thử | Kết quả |
| --- | --- |
| Figma tự copy instance thư viện trong một file dùng thư viện | SYMBOL mang `componentKey`, `sourceLibraryKey` (thư viện "ZEN Kaiz (Official-Sep2026)", `lk-3fd76b…`), `publishID` = id trong file Zen, `sharedSymbolVersion`; biến/style theo `assetRef {key, version}` kèm node VARIABLE / VARIABLE_SET / style |
| Bản Figma tự copy **trong file Zen** | cùng dạng đó (guid = id file Zen, `publishID` = chính nó); dán sang file khác: 54/54 instance thư viện, 529 liên kết biến, 18/18 chữ có style |
| Chỉ variant đang dùng (không cả set) | đủ |
| Khung xương có `componentKey` (có hay không `sharedSymbolVersion`, cả "1:1") | Figma dựng component từ bản dán, **không tải theo key**: icon trống, nút không màu |
| Biến chỉ có key, không node; hoặc node VARIABLE không có giá trị | không gắn / màu trắng |
| Text style chỉ có key | không gắn |

Vậy bản dán vào file khác phải mang định nghĩa đầy đủ như Figma. Làm:

- `native-pack.mjs defsFrom` → `docs/figma-contracts/native-defs.json.gz`: từ chính các bản chụp của gói (probe → Figma
  desktop copy), mọi component (vỏ set, variant, layer), nội dung slot component đặt sẵn, biến, bộ biến, style, như
  Figma copy; bỏ pluginData, mô tả, dữ liệu dẫn xuất (`derived*`). 45.854 node: JSON thô ~100 MB, nén trùng lặp
  (`compactPack`) 41 MB, gzip 3,4 MB. `capture` / `write` ghi cả gói lẫn định nghĩa; `--merge` đè node cùng id.
- `figma-native.mjs`: có định nghĩa thì `definitions()` thay khung xương bằng định nghĩa đầy đủ (theo dấu symbol lồng,
  swap, mặc định của thuộc tính swap, nội dung slot), `libraryForm()` đổi tham chiếu biến/style sang `assetRef` (trừ
  liên kết biến trong override, Figma ghi theo id) và thêm node của mọi biến (kể cả alias), bộ biến, style. Thiếu định
  nghĩa thì dùng khung xương và ghi chú. `indexDefs` chỉ mở các node bản dán dùng (đọc gói 0,2 s, một trang 0,1 s).
- Studio (`figmaClipboard.ts`): ⌘C nạp `native-defs.json.gz` một lần (fetch + `DecompressionStream`); không nạp được
  thì vẫn dán được vào file Zen như cũ.

Hai lỗi chỉ lộ ra khi dán thật (component trong file Zen là của chính nó nên định nghĩa không dùng tới):

- Nội dung slot component đặt sẵn (Metric-Card, List-Box, biểu đồ, Side-Bar, hàng bảng) là frame `isSlotContent` trên
  Internal Only Canvas: phải đi kèm, không thì slot trống ở file khác.
- Figma ghi "không giới hạn" bằng `Infinity` (`maxSize`) và `NaN` (`stackCounterSpacing`); JSON biến thành `null`, ghi
  lại thành 0: slot `Value` của cột Stack-Bar bị ép cao 0. Gói giờ giữ chúng dạng chuỗi (`"Infinity"`), `figma-kiwi`
  ghi lại thành số.

Kết quả (Expenses, fixture `figma-expenses.json`, dán vào file mới "Zen paste test (target 3)"): 484 frame, 615 instance
(615/615 instance thư viện), 151 slot, 277 chữ (277/277 style thư viện), 191 vector, 225 biến thư viện, 6.357 liên kết
biến, 0 không gắn; cây layer trùng bản dán trong file Zen 728/728 (0 khác về loại, tên, kích thước, vị trí, ẩn hiện);
1.741/1.741 node định nghĩa giống bản Figma tự copy. Trong file Zen: 615 instance của chính file, biến/style của chính
file (không tạo bản sao thư viện). So với bản plugin import trong file Zen: cùng số layer; khác có sẵn từ trước (không do
dạng thư viện): thẻ Metric trong grid 236 (chiều cao trên canvas Studio, 2026-10-23) và đoạn "Other" của cột chồng mà
plugin không vẽ.

Lưu ý: định nghĩa là của file Zen lúc chụp. Sửa component trong file Zen chưa publish thì bản dán mang bản sửa với
version cũ; chụp lại gói sau mỗi lần publish (`native-pack.mjs probe-code` … `capture`). File đã có component cùng key
(từ lần dán trước) giữ bản của nó, như Figma.
