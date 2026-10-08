# Zen DS — các câu hỏi đang chờ (bản tiếng Việt)

Bản dịch của [`QUESTIONS.md`](QUESTIONS.md) (bản gốc tiếng Anh, các agent đọc bản đó; khi sửa, sửa cả hai). Đây là
những câu chỉ designer trả lời được (Figma) và những quyết định chỉ bạn đưa ra được. Trong lúc chờ, code giữ nguyên cách
làm hiện tại; khi có câu trả lời, việc cần làm sẽ vào `BACKLOG.md` (hoặc sửa ngay). Chuyển ra khỏi `BACKLOG.md` ngày
08/10/2026.

## Cho designer (Figma)

- **Các chỗ Figma tự mâu thuẫn**, đã ghi thành `figmaExceptions` trong `tools/figma-contract/suites/`: Button Surface có
  blur khi hover; viền vòng (ring) của Overlay ở trạng thái Disabled; shadow của Icon-Main; bán kính vòng của IconButton;
  Input/Heading H3 cao 44px.
- **Text style lưu giá trị cũ** (phát hiện 29/09/2026): Heading/2, Heading/3 và Caption/* vẫn giữ `paragraphSpacing`
  cũ (28 / 24 / 10), dù đã gắn với biến Font-Size (25 / 22 / 11). Code theo biến. Cần áp lại các style này trong Figma
  để chúng cập nhật.

### Cập nhật đối chiếu Figma (29/09/2026)

- **Toggle — chữ phụ (P2):** bộ 1526:5703 đổi Subtext thành Caption/Regular 11/16 ở cả 24 biến thể, nhưng primitive
  `.Primitives/Toggle/Content` 1526:5945 lại ghi Body/Small/Regular 12/16. Code theo bộ (giống Checkbox, Radio và các ô
  Table). Có sửa primitive không?
- **Segmented (P2):** Item Medium / Secondary / Selected (và Item-1 của bộ) gắn token Tag/Background/Default, còn Small
  gắn Segmented-Item-Secondary/Background/Seclected/Default. Ở chế độ sáng giống nhau, ở chế độ tối khác nhau. Code dùng
  token Segmented. Ngoài ra: code có trạng thái Disabled mà Figma không có; token `*/Seclected/Hover` và Secondary
  Border hiện không còn được gắn; phần mô tả của bộ liệt kê các prop không tồn tại; vòng focus có nên chồng lên shadow
  của mục đang chọn không?
- **Input / Search ở trạng thái Disabled (30/09/2026):** Search/Default và Search/Popover không có State=Disabled; code
  suy ra từ Field-Only mà chúng dựng lên (Field-Only State=Disabled + Leading-Trailing Active=No). Thêm biến thể, hay
  xác nhận cách này? Number-Align-Left/Center ở State=Disabled vẫn vẽ nút tăng giảm như Button State=Default (code cho
  chúng bị vô hiệu). Autocomplete (View-Only) và Rich-Text không có Disabled: có chủ ý không?
- **Search/Popover:** designer đã làm 30 biến thể đồng nhất ngày 29/09 (viền 1px INSIDE ở Container, không có vòng);
  code đã theo. Còn lại: phần mô tả của bộ liệt kê prop không tồn tại, và độ dày viền khi Hover của Field-Only và
  Search/Default không còn gắn với Emphasis/Border-Weight/Active/Primary (code vẫn giữ gắn). Bộ này nay nằm trong một
  frame có mode Component Theme riêng, nên bản xem trước hiển thị theo mode đó. Field-Only đang dùng là node 374:103464.
- **Checkbox / Radio:** Checkbox/Text căn ô đánh dấu vào giữa nhãn + chú thích (Radio căn trên; code căn trên cho cả
  hai); Checkbox/Text có prop Caption không dùng và một khoảng cách (gap) ở gốc dù chỉ có một phần tử con; cả hai bộ
  đều không nói chú thích ở trạng thái Disabled màu gì (code dùng Content/Disabled).
- **Bong bóng chat:** lớp làm mờ nền (40) của Text-You Social nằm trên nền đặc nên không có tác dụng; các biến thể Mobile
  có thanh hành động khi Hover, nhưng trên điện thoại người dùng nhấn giữ để thả cảm xúc.
- **Ô của Table:** các mục trong Badge-Cell và Tag-Cell không xuống dòng trong Figma (code có xuống dòng); ô hai dòng và
  ô hành động không vừa chiều cao Table/Cell/Size 52 (hàng trong code cao lên 63–64px); căn viền ở trạng thái Edit, lớp
  bọc của Control-Cell và một vài mô tả chưa thống nhất.
- **Breadcrumbs:** khoảng cách 3XSmall ở gốc chỉ có một phần tử con nên không bao giờ hiện; chưa có trạng thái "trang
  hiện tại" và chưa có mục thu gọn (…).
- **DatePicker (29/09/2026):** In-Range-Hover tô Container bằng Color/Background/Inverse/Solid/Default và bỏ không dùng
  `Date-Picker-Item/Background/Seclected-In-Range/Hover` (code theo component). Date-Container ở Header dùng
  Corner-Radius/Small khi nghỉ và Base khi Hover/Focused (lúc nghỉ không có nền nên chỉ thấy được Base).
- **Toggle:** biến của nó có lỗi chính tả `Seclected`; Toggle-Button gắn token của Segmented và có hiệu ứng trên một
  frame rỗng.
- **Typography (rà soát 29/09, quyết định số 6):** các giá trị Display/4 (32/36/40) lớn hơn tiêu đề trang Heading/1
  (28/32/36) ở mọi mode, nên một lưới thẻ số liệu nổi hơn cả tiêu đề. Giữ nguyên, hay chỉ cho Display/4 dùng một con số
  chính mỗi màn (trong lưới dùng Heading/2–3)? Liên quan: lời chào của AiChat (h2 kiểu Heading/1), con số lớn của
  MetricWidget (Heading/1) và tiêu đề ModalForm (Heading/2, 25px cạnh h1 của trang 28px) làm mờ quy tắc "Heading/1 = tiêu
  đề trang".
- **Chip S3:** chip Secondary đang chọn vẫn giữ viền Subtle với độ dày Secondary trên nền nhạt (độ tương phản khi chọn chỉ
  khoảng 1,15–1,3:1), khác với quy tắc "Đang chọn → Color/Border/Active/*". S3 có nên đổi không?

### App Shell (29/09/2026)

- **Độ rộng thanh rail:** rail của HR-Platform (Patterns/Density/Comfortable/Sidebar/No) rộng 80px, bề mặt 72px và chỉ
  lề trái 8px. Master Side-Bar/Master/Basic Expand=No rộng 84px, bề mặt 68px và lề 8px hai bên. Code theo master.
- **Mẫu Sidebar Shadow=No** (6040:67524): sidebar nền Surface/Default không có Shadow/Bottom/Level-1. Hiện chưa có giá trị
  `background` nào của Sidebar cho ra kiểu này.
- **Chưa có thiết kế cho màn hẹp:** Figma chỉ vẽ thanh trên cùng và ngăn kéo (drawer) cho desktop. Code đưa nội dung thanh
  trên xuống một hàng riêng khi rộng dưới 744px và thêm nút Đóng cạnh drawer (theo chuẩn hộp thoại modal của APG).
- **Floating-Actions** (6040:72809) dùng hiệu ứng tự đặt (0 12 28 và 0 4 8 −4, Neutral/Base), không phải Effect style.
- **Action-Item không có trạng thái đang mở:** khi nút Thông báo mở bảng của nó (`aria-expanded="true"`), nút trông y như
  cũ. Có nên có kiểu "đang chọn" hoặc "đang nhấn" không?

### Token, hiển thị và các điểm khác

- **Token mật độ chưa component nào dùng** (Badge 2xsmall nay là số đếm của AppShellAction; `global-control-bar` đặt nút
  Đóng của drawer):
  - Tag small
  - Segmented xsmall
  - `sidebar-small-width`
  - `dashboard-header` (80/88): thanh trên của HR-Platform đo được 72 (24 + 40 + 8). Hỏi designer dashboard header nên
    dùng giá trị nào.
  - `navigation-action-margin`
- **Khác biệt Figma và code còn để nguyên** (hỏi designer hoặc quyết định):
  - Slider: trong Figma, núm cỡ Medium vẫn giữ shadow khi hover (code đổi sang vòng focus), và núm Small không có shadow
    khi Disabled (code vẫn giữ).
  - Chart: các cột của biểu đồ cột chồng trong Figma bo Corner-Radius/Small ở cả 4 góc (code: XSmall, chỉ 2 góc trên).
  - Bottom Navigation: Figma gắn icon của nút hành động và nút FAB với Button/Icon-Size/Medium; code giữ cỡ cố định
    Bottom/Icon-Size, vì thanh điều hướng di động không thay đổi theo mật độ.
  - Thanh home của khung điện thoại: System/Bottom-Indicator (308:46297) trong Figma là thanh Background/Neutral/Subtle
    6%, còn code vẽ một thanh đặc như của hệ điều hành.
  - Giá trị thô trong Figma được giữ nguyên: khoảng cách 15px giữa các emoji của thanh cảm xúc chat (6182:55704), và
    shadow của bong bóng Business và thẻ là hiệu ứng tự đặt chứ không phải Effect style.
- **Thiếu trạng thái Focus:** Figma không có Focus cho Popover/Item và không có trạng thái Lỗi + Focus cho nhóm Input.
  Code vẽ vòng Focus/Accent 3px bên trong mục, và với ô nhập bị lỗi thì giữ cả viền lỗi lẫn vòng Focus. Cần designer xác
  nhận cả hai.
- **Control-Bar/Select-Item** (9021:27379) chỉ có Default / Hover / Selected. Code vẽ mục bị vô hiệu bằng Content/Disabled:
  toàn bộ thanh của RichTextField chỉ đọc, và từ 29/09 là nút Hoàn tác / Làm lại khi không còn gì để hoàn tác. Cần
  designer bổ sung trạng thái Disabled.
- **Dải cuộn ngang không báo còn nội dung:** từ 28/09, Segmented rộng hơn khung sẽ cuộn ngang giống Tabs và hàng chip
  lọc, nhưng không có thanh cuộn và không mờ dần ở mép.
  - Khi ranh giới một mục rơi đúng mép, không có gì cho thấy còn mục phía sau. Ví dụ: Templates › "Empty & error states"
    ở bề rộng 390, mật độ Comfortable.
  - Figma chưa có thiết kế mờ mép hay "ló" một phần mục kế. Hỏi designer; nếu đồng ý thì làm một lần cho Tabs, hàng chip
    và Segmented.
- **Dữ liệu trong Figma được giữ đúng như vẽ (P2):**
  - Badge Metric-Trend cỡ Medium, khoảng cách 24px và mũi tên đi xuống ở trạng thái Positive chỉ là chỉnh tay trên một
    instance (Total Expenses). Có nên thêm Size cho component?
  - "Bar-Quota" của Remaining Budget là các frame thô (tím trên nền Neutral Subtle, chấm chú giải màu Neutral). Có nên làm
    thành ProgressBar (cần thêm màu tím)?
  - Lỗi dữ liệu mẫu:
    - Bảng Leave Types có tiêu đề "Type" hai lần, và hàng 3 "Annual Leave" lại có 🥵 Unpaid.
    - Pending $229.00 trong khi các hàng là $112.50.
    - Chỗ ghi "$5.4k", chỗ ghi "$5.4K".
  - Mục "Configurations" của Expenses/Workbench vẽ ở dạng thu gọn nhưng không có mục con.
  - Lỗi chính tả "Hight".
  - Tên cờ trong Figma bị sai: "Uzbekista N", "andorra", "Marshall Island", "Sao Tome and Prince".
- **Độ tương phản ở chế độ sáng (designer quyết, P2):** các trường hợp dưới mức AA, mọi app dùng Zen đều thừa hưởng:
  - Content/Neutral/Tertiary #828282 trên nền trắng chỉ đạt 3,84:1 (chú thích của ListItem và Table, trục biểu đồ).
  - Tiêu đề Table: 3,78:1.
  - Button nguy hiểm kiểu tonal: 3,8:1.
  - Cùng câu hỏi này: nhãn Tabs không được chọn, các dòng tiêu đề nhỏ màu Light, tiêu đề Table (3,74–3,79:1) và chữ của
    nút Danger (3,74:1).

## Cho bạn (quyết định và việc cần làm)

- **Truy cập qua mạng LAN:** có bật `server.host: true` để mở trang docs từ máy khác trong cùng mạng không?
- **Xem code bằng ngôn ngữ khác** (Vue, Svelte, HTML, Swift, Flutter; hiện ghi "Coming Soon"): kế hoạch ở
  `docs/research/code-languages-plan-2026-10-03.md`. Đang chờ bạn quyết ở mục §8:
  - hướng đi cho web;
  - làm những ngôn ngữ nào, theo thứ tự nào;
  - menu chọn ngôn ngữ hiển thị thế nào trong lúc chờ.

  Theo yêu cầu của bạn ngày 03/10, các ví dụ cũng sẽ có đủ mọi ngôn ngữ. Chưa làm gì.
- **Ô chỉ đọc không có dấu hiệu focus** (ngoài con trỏ): gặp ở các trang dialog, inline-message, side-panel, tooltip,
  visually-hidden. Bạn chọn: thêm vòng focus như cách đã sửa cho trạng thái lỗi, hay giữ nguyên?
- **Nút "Download Figma" và "Feedback"** trên trang docs (trang tổng quan và chân sidebar) chưa dẫn đi đâu, nên vẫn còn 3
  cảnh báo "nút không có hành động". Cần bạn cho đường link.
- **Master List-Box trong Figma (P3, 06/10):** các biến thể có chiều cao cố định (instance ít hàng hơn vẫn để khoảng
  trống, trừ khi đặt Hug), và Header-Slot / Footer-Slot căn nội dung vào giữa. Còn code căn trái chữ ở header và nút ở
  footer. Có nên đổi master sang Hug và căn trái không?
- **Rà soát giao diện Studio (04/10, chỉ đọc; chi tiết và cách sửa ở `docs/research/studio-ux-audit-2026-10-04.md`).**
  Đề xuất chờ duyệt (P3) là các mục chỉnh sửa N1–N11:
  - danh sách 56 trang phẳng, chỉ có một icon;
  - tên trang lặp ba lần;
  - ghi chú quy tắc nằm trong nhãn kích thước;
  - prop đã gắn bị lặp;
  - Snippet bị import hai lần;
  - bố cục hộp thoại Phím tắt;
  - dòng phụ đề của Modes;
  - tên layer thô;
  - gợi ý phím ⌘/Ctrl;
  - nhãn điều hướng 11px;
  - hai bảng bên chiếm 592px.
