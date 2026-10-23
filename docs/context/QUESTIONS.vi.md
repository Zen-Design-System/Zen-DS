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

- **Master List-Box (bạn đã quyết 08/10: giữ như code):** trong Figma các biến thể có chiều cao cố định và
  Header-Slot / Footer-Slot căn giữa; code tự co theo số hàng và căn trái chữ ở header, nút ở footer. Nhờ designer sửa
  master sang Hug và căn trái.

- **Side-Panel (P3, 2026-10-12):** Back-Container đang ẩn (1573:3127 và 3 variant còn lại) báo kích thước 32×32,
  trong khi padding 2XSmall + Wrapper 20px chỉ ra 28×28 (Close-Container của Modal bên cạnh là 28). Code vẽ 28 như nút
  close. 28 có đúng ý không? Ngoài ra: icon heading của Modal (Icon-Wrapper) đã bị bỏ; code giữ `icon` ở dạng
  deprecated cho đến khi được xác nhận.

- **Voice (P2, 2026-10-13, bản đánh giá `docs/research/voice-usability-review-2026-10-13.md`):** (a) AI Voice
  Conversation chưa có trạng thái Thinking giữa Done speaking và lời nói đầu tiên — thêm variant? (b) heading Responding
  "Here's what I found" không hợp khi trợ lý làm một việc hay nói chuyện phiếm — dùng câu trung tính? (c) Mute khi bật
  đang dùng dáng Pressed của nút tertiary; Meet/Zoom dùng màu negative — giữ Pressed hay Danger/Subtle? (d) Chat/Bubble/
  Voice Social không hiện độ dài (Business có) và không có dấu "chưa nghe"; (e) thêm hàng nghe lại khi Paused cho
  VoiceRecorder (nghe trước khi Finish)?

### Đợt hỏi designer 23/10/2026 (chuyển từ `BACKLOG.md`, nhóm G1; code giữ cách làm hiện tại đến khi có câu trả lời)

- **Calendar/Toolbar Mobile với typography Mobile (P2, 21/10):** Figma vẽ biến thể Mobile (16125:399) theo cỡ chữ
  desktop; với typography Mobile, Heading/3 là 26px nên "September 2026" (~200px) và nhãn chế độ xem thứ tư ("Agenda")
  không còn vừa 358px cạnh nút Today và hai mũi tên, ở mật độ Comfortable. Code: tiêu đề mặc định của toolbar trên điện
  thoại là dạng ngắn ("Sep 2026"), ví dụ điện thoại có ba chế độ xem. Giữ tiêu đề ngắn, hay đổi style / bố cục? Chỗ xem:
  `src/components/Calendar/CalendarToolbar.tsx`.
- **Metric Title-Highlight còn sót (P3, 17/10):** ở 7523:507049, khoảng cách 12 của Header chưa gắn biến (nên là
  Spacing/Gap/Small), và Metric-Number của cỡ Medium có paragraphSpacing gắn vào Font-Size/Heading-3 (session log
  17/10, "Metric-Inline/Title-Highlight"; padding của Custom-Slot đã sửa).
- **Navigation-Mobile/Top/Action-Icon-Gap là 20 (P3, 15/10):** spacing Component Size nay trỏ về Spacing/Gap|Padding,
  nhưng thang Gap không có 20 (16 Medium, 24 Large), nên riêng biến này vẫn ở `dm-20`. Giữ, hay chuyển về một bậc Gap
  (nhìn thấy khác ở các nút icon phẳng của Top Navigation)?
- **Bề mặt của Bottom-Navigation (P2, 13/10; xem lại 23/10):** Patterns/Sidebar có Theme · Density · Shadow từ 21/10
  (#181), Top-Navigation/Mobile có Type=Transparent / Transparent-On-Color từ 17/10. Còn lại: Bottom-Navigation chưa có
  lựa chọn bề mặt, và main của nó mang một bóng đổ không dùng Effect style (chưa đọc lại từ 13/10). Trong lúc chờ, màn
  hình ghi đè bằng biến (screen-rules §1).
- **Side-Bar/Master/Small-Density bị đặt tên "Component" (P3, 23/10, khi đọc lại contract):** bộ 5974:20590 trên
  ❖ Sidebar (key 1cca393d…, Expand Yes/No) mất tên; không bộ nào khác bị vậy. Push vẫn nhập nó theo key
  (library-keys.json) nên vẫn đặt được, nhưng pull hoặc chụp lại component-properties so bộ theo tên
  (`tools/studio/figma-props.map.mjs`, Sidebar `Side-Bar/Master/Small-Density`). Đặt lại tên cũ, hay báo là đã bỏ?
- **Thư viện còn thiếu, phát hiện khi thử đẩy 438 trang Studio → Figma (P2, 18/10):** (a) Accordion/Text không có slot
  nội dung, nên nội dung của Accordion đang mở không vẽ được (push có ghi chú); (b) Dock-Icon chỉ có Theme=Emoji ở cỡ
  Medium và Large (template HR dùng XSmall trong ô bảng: hiện ra biến thể mặc định); (c) Chat/Section/Read-List Seen
  by=5+ có bốn Avatar sau "+N", còn Chat.tsx vẽ năm (push ghi bốn). Chỗ xem: session log 17/10 "Studio → Figma test
  run", `chatMessageNode` trong figma-push.mjs.
- **Thanh hệ thống Android (P2, bạn nêu 10/10):** các Screen Android của Studio vẽ thanh trạng thái Material 3 (24) và
  thanh cử chỉ (108 × 4, cách đáy 10) với icon giả (builder/proto/DeviceBars.tsx); trang ⚙️ Operation Components của file
  Zen chỉ có Status-bar/IOS/Mobile, /Tablet và System/Bottom-Indicator. Nhờ designer thêm Status-bar/Android/Mobile
  (+ Tablet) và thanh điều hướng Android ở đó; sau đó code theo các node ấy.
- **Layer chưa đặt tên (P3, 12/10):** bộ kiểm tra tên layer lồng nhau (`tools/figma-contract/nested-paths.mjs`, 44/44
  component kể từ nested-layers.json) đang cho phép những tên trong code mà Figma không có layer tương ứng: instance chưa
  đặt tên, mang tên component của nó (ba nút hành động của AiChatField, nút hành động của AlertBanner / InlineMessage /
  Toast / ChatCall, Previous / Next / chip số dòng của Pagination, nút đóng của SidePanel); icon đặt tên theo glyph
  (AlertBanner, Dialog, SidePanel, EmptyState, Tabs); và tên trong Figma khác tên của Zen, code giữ tên Zen (bạn quyết
  12/10): nút của Empty-State chưa đặt tên trong CTA (code `Primary` / `Secondary`), hàng nút của Modal/Forms
  `Footer › Buttons` (code `Actions`, như Dialog và Side-Panel), `CTA` của Bottom-Navigation Floating (code `Action`),
  `Icon-Wrapper › Icon` / slot Custom `Visual` của Inline-Message và `icon-Container › Icon` của Toast (code `Leading`),
  instance nút gửi `Main` ở cuối Chat-Control (code `Send`). Đặt theo tên của Zen thì bộ kiểm tra so được, và phần ghi đè
  của trang Studio vào Figma đúng theo tên. Chỗ xem: `ALLOWED` trong nested-paths.mjs.
- **Biểu đồ (P2, gộp từ bốn mục 13/10 … 18/10; chưa sửa Figma):** (a) đối chiếu: viên nhãn X đang chọn (hug 20px,
  Medium so với 16px Bold toàn sector), làm mờ 88% các cột không chọn, padding / giãn nhãn của Bar, điểm neo và làn của
  Tooltip, làn cột 38/26 so với 36/28, khoảng cách trục ngang / heatmap 8 so với 16, token mật độ của Heatmap, khoảng
  cách mô tả của Chart Card; Figma thiếu chấm đang chọn của Line / Multi-Line, trạng thái đang chọn của Area Stacked và
  Grouped / Combo, biến thể mặc định của Radial (`docs/research/chart-parity-audit-2026-10-17.md` §2–§4). (b) Sót từ đợt
  widget: `Average › Rule` 15335:2421 của Bar-Chart Vertical có strokeCap NONE (không ra chấm); `Item-List` của
  Segmented FIXED 114 ở Line, Stack-Bar, Multi-Line, Chart-Card và Heatmap (nhãn chồng nhau); nền Area gắn
  Background/Accent|Neutral trong khi đường dùng style Chart Sector; thẻ Solid theo màu: chuỗi trùng màu thẻ dùng Brand
  trong code (On-Color/Tertiary bị nhạt khi làm vùng); không có token Border/Inverse/Pale|Subtle; Metric-Card Hero giữ
  nền ghi đè Brand Pale trên Card Solid Brand (`docs/research/widget-patterns-spec-2026-10-14.md`,
  `chart-phase2-spec-2026-10-14.md` §4). (c) Bar, Donut, Radial, Heatmap và Multi-Line tự vẽ thẻ Surface/Default nên
  không nhận Card Theme / Color như các biểu đồ mới không có thẻ: có làm cho đồng bộ? (d) Đặt cạnh một thẻ LineChart cao
  hơn (Grid kéo giãn), 5 hàng của BarList cách nhau ~72px: dồn lên trên, hay giãn đều như bây giờ?
  (`docs/research/studio-vibe-agent-2026-10-18.md` §7)
- **AI UI, làm Figma trước (P2, gộp từ sáu mục 14–15/10; `docs/ai-ui/README.md`):** (1) dáng "tạm đoán" cho một form AI
  đoán ra (ShapeShift: form mờ đi, ô trống thành chip nét đứt "+ Add date"); Zen chưa có trạng thái hay token tạm đoán
  (Chip `state="placeholder"` chỉ đổi màu nhãn). (2) Gạch chân đoạn chữ đã nhận ra trong ô nhập prompt: `extractSlots`
  trả về `spans`, nhưng `AiChatField` là textarea thường (cần lớp phủ hoặc contenteditable, bậc M). (3) Token gradient
  "AI glow" cho quả cầu "AI đang làm" (CSS demo `.px-ai-ui-orb` trong `src/platform/examples/pages/ai-ui.css`, từ Support
  Pink / Violet / Cyan); `tokens.css` chưa có token gradient; nếu giữ quả cầu thì nó thành component (AiChatBubble
  `thinking="orb"`?). (4) Table 4 cột trong cột chat 600 / 390 px cần ~608 px và cuộn ngang trong khung riêng
  (`tests/ai-ui/narrow.test.tsx`): giữ, hay chế độ gọn gập bớt cột? (5) Prose chưa có khối code: `markdownToSpec` hiện
  code rào bằng `Text as="code"`; chưa có text style đơn cách hay component CodeBlock / Prose. (6) Keycap (Kbd) cho gợi ý
  phím tắt ("Tab to keep as booking"; demo đang dùng Tag).

## Cho bạn (quyết định và việc cần làm)

**Đã trả lời ngày 09/10/2026:**
- Chọn lớp trên canvas theo cách bấm của Figma: bấm chọn lớp ngoài cùng trong ngữ cảnh, bấm đúp đi vào một cấp, ⌘-bấm
  chọn lớp sâu nhất. Đã làm trong ngày (`select/clickTarget.ts`).

**Đã trả lời ngày 08/10/2026:**
- Không mở truy cập qua mạng LAN (`server.host` vẫn tắt).
- Xem code bằng ngôn ngữ khác: làm theo thứ tự HTML/CSS → Vue → Swift → Flutter → Svelte — tạm lưu trong BACKLOG, sẽ làm ở giai đoạn sau.
- Ô chỉ đọc: đã có vòng focus từ 06/10 (`input.css`), không cần làm thêm.
- List-Box: giữ như code, designer sửa master (xem mục trên).
- Chỉnh giao diện Studio N1–N11: để sau (đã ghi trong BACKLOG).

**Còn chờ:**
- **Nút "Download Figma" và "Feedback"** (bạn chọn để sau): trên trang docs, ở trang tổng quan và chân sidebar, hai nút này
  chưa dẫn đi đâu, nên vẫn còn 3 cảnh báo "nút không có hành động". Khi có link thì gửi mình.
