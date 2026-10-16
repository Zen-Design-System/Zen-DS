# Zen Studio → Figma: copy một frame, dán thẳng vào Figma, tự bind component / style / variable — nghiên cứu, 2026-10-16

**Trạng thái:** user duyệt 2026-10-16 ("Duyệt theo đề xuất, làm A từ P0"): phương án A, mọi câu hỏi §7 theo đề xuất.
P0–P3 đã làm (§9). Còn: thử ở file sản phẩm (cần file thử + thư viện đã publish), spike C chưa làm.
Nguồn: luồng đẩy hiện có (`studio-figma-push-spec-2026-10-12.md`, P0–P6b), plugin Zen
`~/Documents/zen-ds-figma-plugin-main` (5e87849), đọc chỉ-đọc file Zen `9nZv4uW2LT21yuHabMTCh1` (2026-10-16), tài liệu
Plugin API và diễn đàn Figma (nguồn ở §8).

## 1. Mục tiêu (đo được)

Designer chọn một frame trong Studio, bấm ⌘C, sang Figma bấm ⌘V. Frame hiện ra ở chỗ đang xem và được dựng bằng instance
thư viện Zen thật. Auto layout gắn variable Spacing, màu gắn variable, chữ theo text style. Việc này phải chạy ở **mọi
file dùng thư viện Zen**, không chỉ trong file Zen.

- **Số bước Studio → Figma:** hôm nay khoảng 8 (Export › Figma › Download, rồi plugin › Import › Import from Studio ›
  chọn file trong Downloads › xác nhận). Mục tiêu ≤ 3 (⌘C, bấm vào plugin, ⌘V).
- **Bind:** mọi instance, variable và text style mà gói ghi ra đều được bind, ở (a) file Zen và (b) một file sản phẩm
  có bật thư viện Zen. Chỗ nào không bind được thì plugin liệt kê theo tên, không bỏ qua im lặng.

## 2. Hiện trạng (đã kiểm)

| Mảnh | Đang có | Còn thiếu cho mục tiêu |
| --- | --- | --- |
| Gói | `figmaPackage` dựng gói ngay trong trình duyệt (`builder/export/figmaExport.ts`). Định dạng JSON `zen-studio-figma` v1, ảnh nhúng base64. Gói Dashboard ≈ 28–46 KB, chưa kể ảnh | Chỉ tải được thành file. Chỉ xuất được cả trang (`figmaFromPage` cần một Screen) |
| Plugin | Import from Studio (plan → place). Import lại thì cập nhật tại chỗ theo `key` lưu trong shared plugin data `zenstudio` | Chỉ nhận file. Frame luôn được đặt vào trang "Studio exports" |
| Bind component | Tìm set theo **id node** (`getNodeByIdAsync(set.id)`), nếu không thấy thì tìm theo tên trong file. Icon cũng tìm theo tên trong file | Ở file khác, id set không tồn tại. Tệ hơn, id có thể trùng một node khác. Kết quả: component bị bỏ, có ghi chú "no component … in this file (left out)" |
| Bind variable / style | Chỉ tìm bản local (`getLocalVariablesAsync`, `getLocalTextStylesAsync`) | Ở file khác không có bản local: gap/padding còn px trần (bind bị bỏ qua im lặng), màu ghi chú "no local colour variable", chữ không có style |
| Bind theo key | `code.js` đã có `importComponentSetByKeyAsync`, `importVariableByKeyAsync`, `importStyleByKeyAsync` (ở đường import component JSON) | Import from Studio chưa dùng |
| Clipboard của Studio | ⌘C trên một layer ghi JSX vào `text/plain` (`edit/clipboard.ts`) | Chưa có dạng dành cho Figma |
| Dán vào UI plugin | UI plugin đã nghe sự kiện `paste` (ô nhập mã licence, `src/ui/main.js:9873`) | — |

**Kết luận:** hôm nay Import from Studio chỉ dựng đúng **bên trong file Zen**. Muốn "tự bind" ở file sản phẩm thì phải
có thêm hai thứ: key của tài sản thư viện, và các tài sản đó phải đã được publish.

### File Zen (đọc chỉ-đọc 2026-10-16)

- **152 set trong contract:** 144 ở trạng thái `CHANGED` (đã publish nhưng còn sửa chưa publish), 8 ở trạng thái
  `UNPUBLISHED`. Tám set chưa publish là Component/List-Box, Description List, Input/Inline-Field, Input/Color-Field,
  Color-Picker, Slider/Field, Chart/Curve-Preview và .Primitives/Input/Help-Text.
- **Icon:** 2.008 component ở trang 🍑 Iconography. Trong 30 icon lấy mẫu, 28 cái `UNPUBLISHED`.
- **Variable và style:** 2.416 variable trong 12 collection (không collection nào ẩn khỏi publish), 36 text style,
  37 paint style, 18 effect style.

File khác chỉ nhận được **bản đã publish**. Vì vậy ở đó sẽ thiếu 8 set nói trên và phần lớn icon, còn 144 set kia là
bản cũ hơn file Zen (variant hoặc property mới có thể chưa có). Điều này đúng với **mọi** phương án dưới đây.

## 3. Các phương án

### A. Dán vào cửa sổ plugin Zen (đề xuất)

- **Studio:** ⌘C trên một frame ghi hai dạng vào clipboard. `text/plain` vẫn là JSX như hôm nay, nên dán trong Studio
  hay trong editor không đổi gì. `text/html` mang gói `zen-studio-figma` (nén, dựng lười qua `ClipboardItem` vì ảnh
  phải tải async).
- **Figma:** cửa sổ plugin Zen đang mở ở tab Studio, có ô "⌘V để dán frame từ Studio". Người dùng bấm vào plugin rồi ⌘V.
  Plugin đọc sự kiện `paste`, chạy plan → place, đặt frame ở tâm viewport của trang hiện tại, chọn frame và zoom tới.
- **Bind:** dùng importer đã thử thật (P0–P6b), thêm cách tìm theo key (§4).
- **Ưu điểm:** chỉ dùng API công khai, tái dùng toàn bộ importer, không cần mạng.
- **Nhược điểm:** plugin phải đang mở (mở một lần, để cửa sổ nhỏ). ⌘V phải bấm trong cửa sổ plugin, không phải trên
  canvas.

### B. Kênh sống qua localhost (plugin kéo gói từ Studio)

- **Cách làm:** Studio có nút "Send to Figma", dev server giữ gói. Plugin đang mở poll hoặc mở WebSocket tới
  `http://localhost:5174` rồi đặt frame.
- **Cần thêm:** `localhost` trong `networkAccess` của plugin (plugin đã publish nên người dùng sẽ thấy một quyền mạng
  mới), và CORS trên dev server.
- **Giới hạn:** chỉ chạy trên đúng máy đang chạy Studio, và vẫn cần plugin mở.
- **Kết luận:** thêm hạ tầng mà không hơn A bao nhiêu. Không đề xuất lúc này.

### C. ⌘V thẳng vào canvas, không cần plugin (Studio tự viết clipboard theo định dạng của Figma)

- **Định dạng:** Figma copy/paste bằng HTML có hai span. Span `(figmeta)` chứa JSON (fileKey, pasteID…). Span `(figma)`
  chứa buffer Kiwi dạng base64, schema nằm ngay trong buffer.
- **Có làm được không:** được về mặt kỹ thuật. code.to.design bán API trả về clipboard dán vào Figma ra component set
  thật. Grida đọc được định dạng này (schema `fig.kiwi`, 12/2025).
- **Rủi ro 1 — không công khai:** Figma có thể đổi định dạng mà không báo trước.
- **Rủi ro 2 — mỗi layer cần GUID nội bộ:** instance thư viện trong buffer tham chiếu theo key và GUID nội bộ của từng
  layer (`symbolData.symbolID`, `symbolOverrides` theo GUIDPath, `overrideKey`). Variable tham chiếu qua
  `VariableID.assetRef.key`. Muốn có những thứ đó phải chụp buffer thật của từng set và variant (152 set, 2.008 icon).
- **Rủi ro 3 — chính Figma cũng làm rơi binding:** ngay cả khi copy/paste Figma → Figma giữa hai file, binding padding
  bị rơi (báo lỗi 08/2026), variable local cũng không đi theo.
- **Rủi ro 4 — vẫn phụ thuộc publish,** như phương án A.
- **Kết luận:** chỉ nên làm một spike 1 ngày, và chỉ khi user muốn bỏ hẳn plugin. Spike gồm: chụp buffer thật của
  1 Button và 1 frame có gap gắn variable, giải mã, tự dựng lại một buffer tối thiểu, dán vào file sản phẩm, đọc lại
  binding. Sau spike quyết định go / no-go. Không đề xuất làm đường chính.

### D. Figma "Code to Canvas" (`generate_figma_design`, `send_code_to_figma`)

- `generate_figma_design` chụp trang web thành các layer thô.
- `send_code_to_figma` tạo layer Figma Code và "không tạo shape Design".
- Cả hai đều không bind component hay variable, nên loại.

## 4. "Tự bind lại": bind được ở mọi file

### Thứ tự tìm cho mỗi tài sản

Áp dụng cho component set, icon, variable và text / paint / effect style:

1. **Local theo id** (trường hợp file Zen, như hôm nay). Kiểm thêm `type` và tên phải khớp, để ở file khác không lấy nhầm
   một node trùng id.
2. **Local theo key:** bản đã được import vào file này từ trước.
3. **Import từ thư viện theo key:** `importComponentSetByKeyAsync`, `importComponentByKeyAsync` (cho icon),
   `importVariableByKeyAsync`, `importStyleByKeyAsync`. Dùng lại cách `code.js` đang làm.
4. **Không tìm thấy:** giữ giá trị thô (px, màu, font) để frame vẫn trông đúng, và gộp một ghi chú kiểu "chưa publish:
   List-Box ×3, icon-… ×12".

### Lấy key ở đâu

- Plugin API không liệt kê được component hay style của thư viện. Chỉ liệt kê được variable, qua `figma.teamLibrary`,
  và cần quyền `teamlibrary`.
- **Đề xuất:** một bảng key `docs/figma-contracts/library-keys.json` ghi tên → key cho set, icon, variable và style.
  Bảng đọc chỉ-đọc từ file Zen như các contract khác, và làm mới sau mỗi lần publish.
- Mỗi gói chỉ mang key của những gì nó dùng (vài KB).
- **Thư viện fork** (ví dụ "ZEN Kaiz - Pokeslide") có key khác, nên không bind tự động được. Sau khi dán, dùng "Swap
  library" của Figma. Variable thì có thể tìm theo tên qua teamLibrary (tuỳ chọn).

### Bind lại sau (Re-bind)

- Mỗi layer lưu "ý định bind" trong shared plugin data `zenstudio`, cạnh `key` đã có: key của set và variant, tên variable
  cho gap / padding / màu, tên text style.
- Lệnh mới của plugin, **Re-bind to Zen**, chạy trên vùng chọn: chạy lại bước 1–3 cho những layer còn thô.
- **Dùng khi nào:**
  - Frame được dán trước lúc thư viện được publish hoặc bật trong file.
  - Frame được copy bằng Figma từ file Zen sang file khác (Figma làm rơi binding).
- **Cần thử:** plugin data có đi theo khi copy/paste trong Figma hay không.

## 5. Lộ trình đề xuất (phương án A)

| Mốc | Nội dung | Xong khi |
| --- | --- | --- |
| P0 | Bảng key (script + một lượt đọc chỉ-đọc); `figmaPackage` ghi key cho set / icon / variable / style | Selftest: mọi set, variable, style trong gói Overviews và Dashboard đều có key |
| P1 | Plugin: tìm theo 4 bước (§4) cho Import from Studio; đặt frame ở trang và viewport hiện tại, không ép vào "Studio exports" | Thử thật: import Dashboard vào file Zen không đổi gì so với hôm nay (chữ ký layer 0 diff). Import vào file thử có thư viện Zen: instance remote; gap, padding, màu, chữ đều bound; ghi chú đúng các set chưa publish |
| P2 | Studio: ⌘C trên frame ghi thêm gói (`text/html`), thêm menu "Copy for Figma". Plugin: ô dán ⌘V ở tab Studio; dán lại frame đã có thì hỏi Cập nhật / Bản mới | E2E Studio (clipboard có gói), test plugin (mock paste), thử thật ⌘C → ⌘V trên Figma desktop và Figma trên trình duyệt |
| P3 | Lưu ý định bind trong plugin data; lệnh Re-bind to Zen | Frame dán khi thư viện đang tắt → bật thư viện → Re-bind → mọi thứ bound. Frame copy từ file Zen sang file khác → Re-bind cũng bound |
| Tuỳ chọn | Spike C (⌘V thẳng vào canvas) | Báo cáo go / no-go |

- **Ước lượng P0–P3:** 3–4 ngày.
- **Kiểm thử** theo luật thử trong Figma thật: import mới, import lại phải ra 0 diff, và dựng lại rồi sửa một frame hỏng.
  Thử bằng plugin thật, vì `use_figma` không áp `dynamic-page`.

## 6. Rủi ro và điều kiện

- **Publish:** chưa publish thì file khác không có 8 set và phần lớn icon, còn 144 set kia là bản cũ. Publish là việc của
  user (hiện đang chờ duyệt description, theo HANDOFF).
- **Clipboard:** gói có ảnh có thể nặng vài MB. Cần nén, và đặt giới hạn kèm thông báo.
- **Figma trên trình duyệt:** phím ⌘V bấm trong iframe của plugin là sự kiện tin cậy nên đọc được clipboard. Vẫn phải thử
  cả bản desktop lẫn bản web.
- **Một frame dán hai lần:** key bị trùng. P6b đã xử lý chuyện này (bản sau dùng id Figma), nên Update from Figma vẫn
  chạy đúng.

## 7. Câu hỏi cho user

| # | Câu hỏi | Đề xuất |
| --- | --- | --- |
| A | Kênh nào | A (dán vào plugin). Spike C để sau, nếu muốn bỏ plugin |
| B | Phím tắt ở Studio | ⌘C trên frame mang luôn gói cho Figma, kèm menu "Copy for Figma" |
| C | Dán lại một frame đã có trong file | Hỏi Cập nhật frame cũ hay tạo Bản mới (mặc định Bản mới, giống Figma) |
| D | Publish và file thử | User publish thư viện Zen (sau khi duyệt description), và cho một file thử có bật thư viện Zen chính thức (Pokeslide dùng fork, key khác) |
| E | Phạm vi copy | Cả frame trước; layer lẻ (một Card…) để sau |

## 8. Nguồn

- Figma clipboard: [Grida — copy paste Figma](https://grida.co/docs/editor/features/copy-paste-figma),
  [Grida — fig.kiwi](https://canary.grida.co/docs/wg/feat-fig/glossary/fig.kiwi),
  [code.to.design — generate Figma components from HTML](https://divriots.com/blog/generate-figma-components-from-html).
- Binding rơi khi copy giữa hai file:
  [padding mất binding](https://forum.figma.com/report-a-problem-6/auto-layout-with-variable-padding-loses-its-binding-on-copy-paste-between-files-while-other-bound-properties-fill-corner-radius-text-survive-intact-56900),
  [giữ variable khi copy](https://forum.figma.com/ask-the-community-7/how-to-copy-components-between-files-while-keeping-variable-links-intact-49781).
- Plugin API: [figma.teamLibrary](https://developers.figma.com/docs/plugins/api/figma-teamlibrary),
  [không liệt kê được component / style của thư viện](https://forum.figma.com/suggest-a-feature-11/full-library-discovery-api-55933),
  [clipboard trong plugin](https://forum.figma.com/ask-the-community-7/read-clipboard-data-on-button-click-25904).

## 9. Tiến độ (2026-10-16, nhánh `zen/feat/studio-copy-figma-20261016`; plugin 6e0e220 … 6c24e7a)

| Mốc | Đã làm | Kiểm |
| --- | --- | --- |
| P0 | `tools/studio/library-keys.mjs` (đọc chỉ-đọc theo phần có mã băm FNV-1a, `write`, `check`) → `docs/figma-contracts/library-keys.json`: 172 set (173 id push dùng, 1 là frame), 1.597 icon + 3 icon set, 12 collection, 91 style. `figmaPackage(…, { libraryKeys })` ghi `library` (set/icon `{ key, type }`, style, collection). | selftest 41 (phần chép sai bị bắt, gói thật Overviews/Table/Shell/Chat/Metric/Parts đủ key, mọi variable có trong token). Studio thiếu `icon-compass-solid` trong Figma. |
| P1 | Plugin: tìm id cục bộ (đúng key) → import theo key; variable theo tên qua `figma.teamLibrary` (quyền `teamlibrary`), fork cùng tên collection; ghi chú gộp; frame mới ở trang + viewport hiện tại, tìm frame cũ cả trong Section. Push: component có cỡ riêng không FILL theo stretch; Stack không nền chứa chữ xuống dòng thì FILL. Màu bound ghi giá trị giải ra. | Test plugin; thật trong file Zen (trang QA): nhập mới 50 layer 0 ghi chú, nhập lại 0 khác biệt, ảnh đúng (trước sửa: Dock-Icon 520px, tagline 175px, nền đen do môi trường thử). |
| P2 | Studio: ⌘C frame (và layer Screen), menu Copy for Figma → clipboard `text/plain` mã + `text/html` gói (`tools/studio/figma-clip.mjs`, base64 trong `data-zen-studio-figma`), một frame (`page.frame`). Plugin: ⌘V trong cửa sổ, hộp Bản mới (mặc định) / Cập nhật / Cancel, Import › Paste from Studio (⌘V). | selftest figma-clip 9, E2E HO-12 (vào baseline), nhóm handoff + builder 54/54; test UI plugin. ⌘V trong Figma thật: user thử. |
| P3 | Plugin ghi ý định bind lên layer (`zenstudio/bind`), key thư viện lên frame (`library`), khung giữ chỗ cho component chưa có (`spec`); Import › Re-bind to Zen. | Test plugin; thật trong file Zen: nhân bản giữ plugin data, phá 5 binding + màu + style → Re-bind trả đủ, chạy lại 0. |

Còn lại: (1) thử ở một file sản phẩm có bật thư viện Zen chính thức (Pokeslide dùng fork, key khác) sau khi user publish
(144/152 set CHANGED, 8 UNPUBLISHED, icon phần lớn chưa publish); (2) user thử ⌘C Studio → ⌘V plugin trong Figma
desktop; (3) làm mới bảng key sau mỗi lần publish có set/icon mới (`node tools/studio/library-keys.mjs check` báo).

