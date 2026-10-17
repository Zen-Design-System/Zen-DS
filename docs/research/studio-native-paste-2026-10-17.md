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

## 8. Còn mở

Cách ghi slot ở cấp ngoài như Figma (nội dung "Contents" của List-Item, "Header-Text" của Header: bản dán ghi override vào
layer mặc định của slot; vẫn hiện đúng), chiều cao tối thiểu của hàng grid (plugin đo sau khi dựng), biến alias trong phần
giữ lại (Figma ghi biến đích: Strongest thay Button-Tertiary/Content/Default, cùng màu), gói định nghĩa 18,9 MB (gzip 0,9).
