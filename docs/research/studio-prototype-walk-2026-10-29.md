# Zen Studio: kiểm thử tay một app có prototype, từ trang trắng đến Play (2026-10-29)

**Câu hỏi:** một designer quen Figma có dựng được một app nhiều màn và nối prototype chạy được trong Play chỉ bằng
giao diện Studio không? Không đọc code, không dùng MCP, không viết script.
**Thước đo:** cảm giác thao tác như Figma ([[studio-figma-usability-bar]]), tức là đếm số bước, số lần bị từ chối, và
những chỗ phải biết code mới làm tiếp được.
**Bản đang chạy:** main `f231a3bc` (sau PR #337–#346).
**Không báo lại** các lỗi đã có trong review 2026-10-27 (§2.1–2.10), trừ khi lỗi vẫn còn.

## 0. Tóm tắt

**Kết luận.** Studio đã dựng được một prototype phone 4 màn với các luồng sau, và tất cả chạy đúng trong Play:

- Splash tự chuyển sang Đăng nhập sau 1,5 s.
- Đăng nhập → Trang chủ.
- Danh sách bác sĩ → Chi tiết, hiệu ứng Push.
- Mở Dialog, rồi đóng.
- Nối riêng từng tab của thanh tab.
- Bottom sheet lọc theo ngày.
- Slide in sang màn đơn hàng.
- Mở ModalForm trên desktop.

Liên kết vẫn còn sau khi reload. Undo hoàn tác được cả sau reload. Nhân bản màn giữ nguyên các liên kết.

Phần dở nằm ở hai chỗ: **dựng bố cục** và **những hành động prototype nằm bên trong component**. Tổng cộng 50 mục khuyết
điểm (2 P0 · 19 P1 · 19 P2 · 10 P3; vài mục gộp 2–3 lỗi cùng gốc). Năm điểm làm người dùng Figma kẹt nhiều nhất:

1. **Không gom được layer đặt tự do thành auto layout.** ⇧A và ⌘G đều bị từ chối: "Select layers that share one
   parent" (W-14).
2. **Không chỉnh được hành động có sẵn bên trong component.**
   - Nút Back của TopNavigation được nối sẵn một toast "Back", không chọn được, nên không đổi được.
   - Hai nút trong Dialog/ModalForm không gán được hành động riêng.
   - Không có biến hay trạng thái: chọn một mục trong sheet không đổi được chip.
   (W-35, W-36, W-41, W-52)
3. **Play trên phone có lỗi hiển thị.**
   - Màn không có top navigation bị một dải trống 50 px phía trên thanh trạng thái (W-47). Đây là hồi quy do PR #345.
   - Toast nằm ngoài khung máy (W-45).
   - Nút cuối của Dialog và sheet nằm dưới home indicator (W-44).
4. **Template không phải điểm xuất phát tốt cho prototype.**
   - Màn "Mobile list · Orders" mất Search và thanh tab, large title thành tên template (W-48).
   - Overlay của template không được nối, Open overlay tự chọn overlay đầu tiên (W-50, W-57).
   - Không chèn được template thành một màn trong trang đang làm (W-49).
5. **Không đặt được màn bắt đầu (Start), không sắp lại thứ tự frame** (W-32, W-33).

## 1. Kịch bản và cách làm

| Pha | Đã làm (chỉ bằng giao diện Studio) | Kết quả |
| --- | --- | --- |
| A. Project | Tạo "Phòng khám An Tâm"; Primary #0E7C6B (có hiện ghi chú tương phản Lc), góc Smooth | Đạt, khoảng 6 thao tác |
| B. Trang + frame | Trang phone "Đặt lịch khám"; nhân bản và đổi tên 4 Screen | Đạt; vướng ⌘D trong Layers và chuyện đổi tên |
| C. Dựng UI | Text Display, Input ×2, Button, Stack (gap, padding lề), BottomNavigation 4 tab, List 3 bác sĩ, TopNavigation | Đạt sau nhiều cách xoay xở (W-12…W-22) |
| D. Prototype | After delay, Navigate (kéo ⊕ và chọn menu), Push, Slide in, Open/Close overlay, đích riêng từng tab, Close từ trong sheet | Đạt; Back, nút trong Dialog và trạng thái thì không làm được |
| E. Play | Đi hết luồng phone; Android; Present desktop; mở và đóng modal | Chạy được; lỗi hiển thị W-44, W-45, W-47 |
| F. UI phức tạp | Template Mobile list · Orders (43 layer), Mobile detail · Order (3 overlay), Admin list (Sidebar + Table + 8 overlay) | Vấp ở template (W-48…W-58) |
| G. Độ bền | Reload, undo/redo, xoá overlay đích, nhân bản màn có liên kết, copy/paste | Liên kết và undo giữ tốt; liên kết treo không được báo (W-59) |

**Bằng chứng** nằm trong thư mục [`studio-prototype-walk-2026-10-29/`](studio-prototype-walk-2026-10-29/), gồm 11 ảnh.
Code mỗi trang được đọc lại từ `.zen-studio/pages/*.zen.tsx` sau từng bước để đối chiếu.

**Giới hạn của phép đo:**
- Pane Browser bị ẩn suốt buổi. Ảnh chụp thường trễ một bước, có vùng không được vẽ lại, nên mọi kết luận đều kiểm lại
  bằng DOM hoặc file trang.
- Clipboard của pane bị từ chối quyền, nên chưa kết luận được việc paste sang trang khác (W-63).
- Thao tác kéo trong pane diễn ra tức thời, nên không đo được auto-pan khi kéo ⊕ ra mép canvas.

**Dữ liệu test:**
- Chạy trên server riêng :5281, trong worktree `.claude/worktrees/studio-prototype-walk-20261029`. AuthGate được tắt
  cục bộ bằng `VITE_ZEN_LOCAL_WALK`; thay đổi này không commit.
- Project "Phòng khám An Tâm" và 4 trang (Đặt lịch khám, Mobile list · Orders, Mobile detail · Order, Admin list · Team
  members) chỉ nằm trong `.zen-studio/` của worktree đó và IndexedDB của pane ở origin :5281.
- Không có gì trên :5173/:5174 của bạn.

## 2. Khuyết điểm, xếp theo mức

Mỗi dòng viết theo dạng: bạn làm → điều xảy ra → Figma làm gì. Chỗ đã đọc code thì ghi nguyên nhân.

### P0 · chặn luồng

- **W-14. Không gom được layer tự do.**
  - Bạn làm: trên một Screen chưa có auto layout, chọn 2 Input vừa chèn (cùng nằm trong Screen), rồi nhấn ⇧A hoặc ⌘G.
  - Điều xảy ra: Studio từ chối với thông báo "Select layers that share one parent"; "Frame selection" cũng bị khoá.
  - Nguyên nhân: mỗi layer tự do được bọc trong một `<Box position="absolute">` riêng, bị ẩn khỏi Layers.
    `select/wrapSelection.ts:70-73` so cha theo DOM, nên hai layer bị coi là khác cha.
  - Figma: tạo auto layout ngay. Đây là bước cơ bản nhất khi dựng form. Ảnh 01.
- **W-41/W-36. Không đổi được hành động có sẵn trong component.**
  - Hai nút của Dialog chỉ là "part"; Dialog chỉ có trigger "On open or close · Set in code".
  - Nút Back của TopNavigation không có trong Layers; ⌘-click hay double-click đều rơi vào TopNavigation, mà
    TopNavigation chỉ có trigger "On title click".
  - Hệ quả: không nối được "Xác nhận" sang màn thành công, không đổi được toast "Back" thành Back. Muốn sửa phải vào tab
    Code.

### P1 · sai, hoặc rất khó chịu

- **W-35. Back mặc định là toast.** Bật Top navigation › Top leading thì Studio thêm nút "Back" (chữ tiếng Anh) với
  `onClick: proto.toast({ title: "Back" })`. Trong Play, bấm Back chỉ hiện toast, không quay lại. Ảnh 06.
- **W-47. Dải trống trên thanh trạng thái trong Play.**
  - Ở màn phone không có top navigation (Trang chủ chỉ có thanh tab), Play chừa một dải trống 50 px phía trên "9:41"; cả
    màn bị đẩy xuống.
  - Nguyên nhân: Screen nhận `padding-top: var(--zen-safe-area-top)` (`deviceBars.css:95`). Từ PR #345, thanh trạng thái
    nằm trong `__main > __pin`, bên dưới phần đệm đó, thay vì nằm trên cùng.
  - Trên canvas không bị. Ảnh 07.
- **W-12. Thả component từ Assets không rơi đúng chỗ.** Kéo "Primary button" thả giữa Screen thì nút rơi về X0 Y50
  (đè thanh trạng thái), Inspector ghi "Placed by the page flow". Trong khi đó click để chèn "Text field" thì layer lại
  nằm tự do. Hai cách chèn cho hai kết quả khác nhau. Ảnh 02.
- **W-13. Kéo nút thì lại thêm thanh trên.** Kéo nút đó trên canvas thì lần nhấn chuột trúng placeholder "+ Add Top
  Navigation" bên dưới, nên Studio thêm một TopNavigation; nút không di chuyển.
- **W-17. Kéo Input tự do trong Layers báo lỗi khó hiểu.** Dòng đỏ "frame is already there." hiện lên và không có gì
  thay đổi.
- **W-18. Screen không có lề mặc định.** Layer trong flow của Screen dính sát mép trái, rộng 390, gap 0.
- **W-11. Không sửa được placeholder của InputField** ("e.g. Loyalty app"). Inspector không có thuộc tính này;
  double-click chỉ chọn field. Form nào cũng giữ chữ mẫu.
- **W-20. Chọn nhầm layer sau khi xoá.** Xoá một layer (trang đồng bộ lại), rồi double-click vào Button thì Layers và
  Inspector lại chọn một InputField. Tên tự đặt "Frame 2" cũng đổi thành "Frame 1".
- **W-23. ⌘D không nhân bản frame** khi frame được chọn từ Layers hoặc Flow list; từ nhãn trên canvas thì được. ⌘D trên
  một ListItem trong Layers vẫn chạy.
- **W-32. Không đặt được Start.** Flow list không có menu; menu chuột phải trên canvas không có "starting point". Start
  luôn là Screen đầu tiên trong file, nên Splash không làm màn mở đầu được.
- **W-34. Không biết ⊕ thuộc layer nào.** Click lần đầu vào nút Đăng nhập chọn Stack bao ngoài (đúng như Figma). Nhưng
  tab Prototype không cho biết đang chọn gì, nên kéo ⊕ đã nối cả form sang Trang chủ. Muốn chọn đúng Button phải ⌘-click
  (rơi vào Text) rồi ⇧Enter.
- **W-48. Template mất thanh điều hướng.** Trang tạo từ "Mobile list · Orders" có large title là tên template; mất
  Search và thanh tab Shop/Saved/Orders/Account. Nguyên nhân: Screen được thêm `topNavigation` riêng đè lên AppShell của
  template. Ảnh 08.
- **W-49. Không chèn được template thành một màn trong trang đang làm.** "Add Screen" chỉ tạo màn trống. Navigate cũng
  không trỏ sang trang khác được. Muốn có app nhiều màn đẹp thì phải tự dựng từng màn trong cùng một trang.
- **W-52. Không có trạng thái hay biến.** Chọn "Last 3 months" trong sheet thì dấu ✓ vẫn ở "Any time", chip vẫn là
  "Date". Figma có Change to (interactive component) và Set variable.
- **W-53. Danh sách trong BottomSheet không hiện trong Layers.** Layers ghi "Items · Empty" dù sheet có 5 dòng.
- **W-54. ⌘-click rơi vào phần DOM.** ⌘-click vào một dòng trong BottomSheet chọn "span · part of ListItem", kèm dòng
  "Finding span on the canvas…" treo mãi. Phải bấm "Select ListItem".
- **W-55. Chip lọc không hoạt động như một nhóm chọn một.** Chip trạng thái bật độc lập (All và Processing cùng bật),
  danh sách không lọc. "Filter table" chỉ dùng được với Table, không dùng được với List.
- **W-61. Mất nút chính khi xem Mobile.** View on Mobile trang Admin làm mất nút "Invite members", nút đang mang liên kết
  Open overlay, nên luồng prototype ở cỡ phone bị đứt. Ảnh 11.
- **W-06/W-05. Tên trang không cập nhật.** Đổi tên trang thì frame duy nhất cũng bị đổi tên theo. Tab trình duyệt, URL và
  tên file vẫn là "untitled-page"; sau reload, tab trình duyệt hiện slug thay vì tên.

### P2 · lệch Figma hoặc thiếu

- **W-02.** Ô chọn thiết bị (Screen: Desktop) nằm dưới 13 thẻ template. Hộp thoại không có ô đặt tên trang.
- **W-07/W-08. Chữ và màu không khớp project.**
  - Project gọi màu chính là "Primary", nhưng bộ chọn màu gọi là "Accent"; tìm "brand" hay "primary" đều ra "No color
    matches".
  - Ô màu trong picker và Inspector vẫn tô màu tím mặc định của Zen, trong khi canvas vẽ đúng màu xanh của project.
- **W-15.** "Primary button" trong Assets đến kèm sẵn một hành động `proto.toast("Changes saved")` và chữ "Save changes".
  Tab Prototype lúc ghi "Set in code", lúc ghi "Show toast".
- **W-21.** Sửa chữ trên Button cần 3 lần double-click cộng Enter; Figma cần 2.
- **W-22.** Width → Fill container trên InputField không đổi kích thước mà bọc ô vào một `<Stack direction="row"
  fillChildren>` bị ẩn.
- **W-24.** BottomNavigation không có công tắc "Show labels", nên tên tab gõ vào không bao giờ hiện.
- **W-26.** Đổi Icon của tab thì Selected icon vẫn là ngôi nhà. Mỗi tab phải chọn 2 icon riêng.
- **W-27.** Click vào chỗ trống trong Screen chọn "Screen · Local component" (panel Typography), không chọn frame.
- **W-28.** Chèn vào Screen trống thì layer rơi vào (20,20), dưới Dynamic Island.
- **W-33.** Kéo frame trong Layers không đổi thứ tự, và không báo gì.
- **W-39.** Add overlay › Dialog trên trang phone vẽ một khung desktop xám 720×640; bottom sheet bị cắt ở đáy khung. Ảnh 04.
- **W-44.** Trong Play, nút Cancel của Dialog và dòng "2025" của sheet nằm dưới home indicator (thiếu safe area). Ảnh 05, 09.
- **W-45.** Toast trong Play hiện ở đáy cửa sổ trình duyệt, ngoài khung máy, bị cắt một nửa. Ảnh 06.
- **W-50.** Template mang overlay đến nhưng không nối (status ghi "link their triggers in Prototype"), và nút "Send
  invites" bị bỏ trống hành động.
- **W-56.** "Add Screen" tạo màn có sẵn TopNavigation, thanh tab 4 icon nhà giống nhau, và dòng "Start building here…"
  là một layer thật, hiện cả trong Play.
- **W-57.** Có 8 overlay mà Open overlay tự chọn cái đầu tiên ("Filter"), không chọn "Invite members" trùng tên với nút.
- **W-58.** "Send invites" đóng modal ngay cả khi ô email bắt buộc còn trống, không báo gì; không gắn được "rồi hiện
  toast" hay "rồi chuyển màn".
- **W-59.** Xoá overlay đích thì liên kết treo `proto.open("overlay-1")` vẫn nằm lại, không có cảnh báo. Inspector hiện id
  thô "overlay-1 · Add an overlay first".
- **W-51.** Không có Smart animate và không chọn được easing; chỉ có Instant, Dissolve, Move in, Push, Slide in.

### P3 · nhỏ

- **W-01.** Tạo project mất khoảng 2 s mà không có phản hồi.
- **W-03.** Thanh "Can edit" đè lên góc hộp thoại New page.
- **W-04.** Danh sách thiết bị bị cắt chữ ("iPhone Duo, clo…").
- **W-09.** Enter trong ô tìm màu không áp dụng kết quả duy nhất.
- **W-16, W-25, W-40. Chữ code còn hiện trên giao diện:**
  - `layout`, `readOnly`, `Tooltip-Icon` khi chọn nhiều InputField;
  - `icon-user-circle-line` trong bộ chọn icon;
  - `--zen-color-content-on-accent-default +12` ở Fill của chữ trong Dialog.
- **W-19.** Thang Gap và thang Padding dùng cùng tên mà khác giá trị (Large = 24 so với 20).
- **W-30.** List hiện thành "Frame 4" trong Layers. Dòng status "ListItem cannot be wrapped…" cứ hiện lại mỗi khi chọn
  ListItem.
- **W-37/W-60.**
  - Double-click khi đang ở tab Prototype nhảy sang tab Design.
  - Esc trong popover Viewport của Play thoát luôn khỏi Play.
- **W-38.** Các chip slot của TopNavigation chồng lên nhau.
- **W-62.** Chip "Viewing Mobile" bị thanh công cụ nổi che.

### Chưa kết luận được

- **W-63.** ⌘C/⌘V một Screen sang trang khác, và cả copy/paste trong cùng trang, đều không làm gì. Pane báo
  `clipboard-read: denied`, nên có thể là do môi trường. Dù vậy, paste thất bại mà không có dòng báo nào thì vẫn là
  khuyết điểm.

## 3. Những gì chạy tốt

- **Tạo project:** có xem trước sống, ghi chú tương phản Lc, chọn kiểu góc.
- **Kéo ⊕ để nối:** tự thay hành động cũ, vẽ mũi tên trên canvas.
- **After delay:** tự chọn màn bên cạnh làm đích.
- **Đích riêng từng tab:** Inspector liệt kê theo từng tab.
- **Hiệu ứng:** Push và Slide in (có hướng).
- **Overlay:** Open overlay tự chọn khi chỉ có một overlay; Close overlay từ trong overlay.
- **Dialog trong Play:** tự chuyển sang kiểu phone.
- **Bottom sheet:** mở đúng, có nền mờ.
- **Nhân bản Screen:** giữ liên kết.
- **Reload:** giữ liên kết và lịch sử undo.
- **View on Mobile:** Table và Search co lại hợp lý.
- **Console:** không có lỗi nào.

## 4. Đề xuất (chờ bạn duyệt; tier theo AGENTS.md §C)

1. **W-47, tier S.** Hồi quy của PR #345: đặt thanh trạng thái phía trên phần đệm safe area trong Play (`DeviceBars` /
   `deviceBars.css`).
2. **W-14, tier M.** Coi các `Box` tự do trong cùng một Screen là anh em khi wrap hoặc group; Studio tự gỡ wrapper khi
   tạo Stack.
3. **W-35, W-36, W-41, tier M.**
   - Top leading mặc định là `proto.back()`, nhãn lấy từ `useZenLabels`.
   - Tab Prototype có trigger cho từng action-prop: TopNavigation leading, Dialog/ModalForm primary và secondary.
4. **W-12, W-28, W-18, tier S–M.** Thả từ Assets thì layer nằm đúng điểm thả. Chèn vào Screen thì tránh vùng safe area
   và nhận lề mặc định.
5. **W-32, W-33, tier S.** Thêm "Set as start" trong Flow list và menu chuột phải; cho kéo để sắp lại thứ tự frame.
6. **W-48, W-49, W-50, W-57, tier M.**
   - Template không bị Screen thêm `topNavigation` đè lên AppShell.
   - "Add Screen" cho chọn template.
   - Overlay của template được nối sẵn.
   - Open overlay ưu tiên overlay trùng tên với nút.
7. **W-44, W-45, tier S.** Toast nằm trong khung máy; Dialog và sheet tôn trọng safe area phía dưới.
8. **W-52, tier L, cần thiết kế.** Trạng thái/biến cho prototype (Change to / Set variable). Đây là tính năng mới, cần
   bạn duyệt phạm vi.
9. **Nhóm P2/P3 còn lại.** Một lượt tier S cho chữ, ghi chú và các phím tắt.
