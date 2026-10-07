# Pattern viết example cho Codebase Platform

Example là nơi đội sản phẩm học cách dùng component. Một example sai (nút nhỏ bị kéo giãn, filter làm bằng Button, "1 items") sẽ bị sao chép sang sản phẩm. Tài liệu này là checklist khi thêm hoặc sửa example. Đọc cùng guideline từng component (`docs/guidelines/<slug>.md`) và quy trình QA ([platform-audit](../qa/platform-audit.md)).

## 1. Ma trận phủ cho mỗi component

Mỗi trang component cần đủ các hàng dưới đây. Hàng nào không áp dụng được thì bỏ qua có lý do, không bỏ vì quên.

| Hàng | Câu hỏi | Ví dụ đã có |
| --- | --- | --- |
| Use case chính | Component này giải quyết việc gì trong một sản phẩm thật? | Chip "Filter bar", Card "Selectable project cards" |
| Trạng thái | Empty, error, loading, disabled / read-only, success | Chart "No data yet", AI Chat "Error and retry", Chat "Failed to send" |
| Kết hợp | Component đi cùng component DS nào? | Toast "Undo delete" (List + ListItem + Button), Side Panel "Filters" (Chip → SidePanel) |
| Edge case | Chữ dài, nhiều item, màn hẹp, 0 hoặc 1 item | Tooltip "Truncated text", Pagination (≤ 480px) |
| Mobile | Trong `PlatformPhone` 390px, thao tác bằng chạm | Button "Mobile footer CTA", Chip "Mobile filter row", Bottom Sheet "Long content" |
| Bàn phím / a11y | Tên, focus, phím tắt, thông báo trạng thái | List "Grouped sections" (heading + list có tên), Segmented "View switcher" (aria-label trên option) |

Trước khi thêm example mới, kiểm tra trùng lặp: hai example cùng dạy một điều thì giữ bản phong phú hơn. Ví dụ "Icon-only view switch" đã bị gộp vào "View switcher".

## 2. Pattern mobile

- **Khung máy**: dùng `PlatformPhone` với `header={<TopNavigation type="compact" …/>}` và `footer`.
  - Khung là màn hình thật 390×844 (iPhone 15) và thu nhỏ nguyên khối khi stage hẹp. `device` chọn máy khác; `maxHeight` giới hạn chiều cao; `height` đã deprecated.
  - Khung luôn ở mode của app điện thoại (`<ZenProvider typography="mobile" density="comfortable">`): Typography **Mobile** và Component size **Comfortable**, bất kể chip Typography / Component size của docs hay Modes của canvas Studio (từ 2026-10-06). Chỉ **Present** của Zen Studio đổi được hai mode này (panel Modes, riêng cho lần Present đó, canvas giữ nguyên). Không truyền `typography` / `density` để bù cho bố cục; bố cục phải vừa ở Comfortable.
  - Status bar, Dynamic Island và home indicator do "OS" vẽ phía trên app. Component phải pad theo `--zen-safe-area-top/-bottom`, không tự chừa khoảng trống.
  - `BottomSheet inline` neo vào khung máy. Nút Back dùng chevron `icon-chevron-left-line-medium`, không dùng mũi tên (harness `navigation/back-chevron`).
- **CTA ở footer**: nút `lg` full width, Primary ở trên, nhiều nhất một Tertiary bên dưới. Footer là `display:grid; gap:12px; padding:12px 20px 0`. Nút nhỏ (2xs–sm) không bao giờ full width.
- **Hàng filter**: chip nằm trên một hàng cuộn ngang (`flex-wrap: nowrap; overflow-x: auto`, ẩn scrollbar, padding 20px). Quick filter là Chip Normal có `aria-pressed`. Sort là Chip Advanced mở **Action Bottom Sheet** thay cho Popover. Số kết quả dùng `plural()`. Khi không có kết quả thì hiện EmptyState kèm "Clear filters".
- **Nội dung dài**: dùng `BottomSheet size="max"` với `actionsDirection="vertical"`. Phần thân cuộn, header và footer đứng yên.
- **Thread chat**: tin mới nhất nằm dưới cùng nhờ `margin-top:auto` ở phần tử đầu tiên, không dùng `justify-content:flex-end`. Gửi lỗi thì dùng `failed` + `onRetry` ("Not delivered · Retry" → "Sending…" → "Sent").
- **AI trả lời lỗi**: giữ lại câu hỏi và hiện InlineMessage Negative với hành động "Try again". Khi thử lại, câu trả lời stream như bình thường.
- **Chart chưa có dữ liệu**: ChartCard giữ tiêu đề, hiện `EmptyState illustration={false}` với hành động tạo ra dữ liệu. Không vẽ lưới trống.

## 3. Pattern desktop

- **Một mood chung: Canvas/Default + Surface/Default phẳng** (user, 2026-10-06). Stage của example là Canvas/Default
  (cả card `screen`); khối trên đó là Surface/Default **không border, không shadow**: Card `theme="flat"`, MetricCard
  `theme="flat"`, ChartCard (mặc định flat), ListBox, `Box surface="surface"` không `border`. Thứ không phải khối
  (Segmented + caption, form, Table §14) nằm thẳng trên canvas. Mẫu tham chiếu: Card › Workspace plan.
  - Chỉ đổi khi có điều kiện: màn có Sidebar → elevation theo Sidebar; trang trắng (Canvas/Alt) hoặc màn điện thoại →
    border Pale (Subtle nếu actionable) hoặc `surface="alt"` (§11); Surface nằm trong Surface (card trong card,
    ListBox, Dialog, SidePanel) → border Pale; card bấm được → `theme="border"` (viền Subtle + hover là affordance);
    card đang chọn → `selected`. Chi tiết: `docs/component-usage-rules.md` §16.
- **Bảng giá**: Card Flat trong lưới `auto-fit, minmax(220px, 1fr)`.
  - `active` đánh dấu gói hiện tại; Badge Accent Subtle đánh dấu gói được đề xuất.
  - Mỗi card có một CTA `md` ghim ở đáy. Nhãn nói rõ việc sẽ xảy ra: "Upgrade to Pro" / "Switch to Starter" / "Manage plan".
  - Chu kỳ thanh toán chọn bằng Segmented Secondary.
- **Danh sách chia nhóm**: mỗi nhóm là một `<section aria-labelledby>`, có header nhóm và một `List` riêng được đặt tên. Header nhóm là heading thấp hơn heading gần nhất phía trên một cấp (`h2` trên màn có `h1` là tiêu đề), Body/Small/Bold, tone **Light**: đây là nhãn kicker, không phải tiêu đề Strongest. Nhãn nhóm bên trong Menu, Popover, Select và Listbox là label, không phải heading.
- **Thẻ số liệu**: MetricCard dùng nhiều theme DockIcon, và giá trị luôn được định dạng sẵn ("$1,680.68", "2.1%").
- **Filter trên desktop**: Chip Advanced + Popover. Khi có nhiều filter, dùng "All filters" (Chip Advanced, `aria-haspopup="dialog"`) mở SidePanel. Không dùng Button.

- Chat theo thiết bị. Example mobile đặt trong `PlatformPhone`, dùng `ChatThread`/`ChatComposer` mặc định (mobile), header `PlatformChatHeader` (TopNavigation) và nhấn giữ để react. Example desktop đặt trong cửa sổ `.pe-chat-desktop`, truyền `device="desktop"` cho cả thread lẫn composer, header dùng `ThreadHeader` (Button/Icon-Flat). Trên desktop không có lớp nhấn giữ: thanh Hover đảm nhận, và chuột phải hoặc Shift+F10 mở menu More. Playground chuyển Device thì phải đổi cả khung. Dòng Conversation-List (Figma 375px) là của mobile: đặt trong điện thoại, hoặc ở cột trái của messenger desktop. Audit `device` sẽ bắt lỗi này.
- **Màn hình desktop có nút Full screen.** Example nào là cả một màn hình desktop thì khai báo `screen: true` trong định nghĩa example; header của card sẽ có thêm nút "Full screen".
  - Thuộc loại này: app shell có Sidebar, cửa sổ chat desktop, trang có PageHeader, template desktop, SidePanel docked.
  - **Tràn khung, không bỏ vào container** (user, 2026-09-30): card `screen` không inset và frame không có viền/bo góc
    riêng; trang chạy sát mép card (góc card cắt nó) trên nền Canvas/Default của stage (2026-10-06), một đường Pale tách
    với header card, cả khi Full screen. Trang không có shell riêng (vd. Layout) tự giữ lề trang Margin-Comfortable (`.pal-page`). Frame mới thì
    thêm vào selector `.pe-card[data-screen="true"] :is(…)` trong platform.css.
  - Khi mở toàn màn hình (**như web thật**, user 2026-09-30): chỉ còn trang — header card (tiêu đề, mô tả), nút Code và
    code panel ẩn; trang phủ kín viewport không inset/khung; một nút nổi "Exit full screen" ở giữa phía trên (Esc cũng
    thoát). Playground App Shell cũng có Full screen (`<Panel screen>` trong `appLayer/shared.tsx`), giữ nguyên các
    property đang chọn. Hook và nút dùng chung: `src/platform/PlatformFullScreen.tsx`.
    - Card phủ kín viewport và nền phía sau bị `inert`.
    - Portal của platform vẫn hoạt động, nên Popover, flyout và dialog của example vẫn mở được.
    - Esc thoát, trừ khi đang có overlay mở hoặc focus đang ở trong ô nhập. Focus và vị trí scroll trở về như cũ.
  - Frame có cuộn bên trong (`.pe-shell--tall`, `.pe-chat-desktop`, `.patpl-frame`, `.pash-frame`, `.pe-panel-shell`) bỏ chiều cao demo và giãn theo khoảng trống còn lại. Frame mới cùng loại thì thêm vào selector `.pe-card[data-fullscreen="true"] :is(…)` trong platform.css.
  - Example mobile (trong `PlatformPhone`) và các thành phần lẻ thì không khai báo `screen`.

- **Spacing theo quan hệ, một thang cho mọi nơi** (user, 2026-10-01): chọn `gap` theo quan hệ giữa các phần tử, cùng
  quan hệ thì cùng bậc: `2xs` trong một item inline · `xs` một thứ và nhãn/mô tả của nó, hàng control của toolbar ·
  `sm` nhóm nút hoặc lựa chọn · `md` các khối trong một bề mặt, field xếp chồng, toolbar → bảng, lưới card · `lg` cột
  và nhóm trong một bề mặt · `xl` section của trang. Không đè padding/gap bên trong component. Chi tiết:
  `docs/component-usage-rules.md` §13.
- **Table không phải widget thì không bọc container** (user, 2026-10-01): bảng là nội dung trang hoặc một section nằm
  thẳng trên nền trang, không Card/Box, không nền Surface. Chỉ bảng dạng widget dashboard mới vào Card (§14).

## 3b. Tương tác không bị khoá

Mọi tương tác mà component hỗ trợ phải chạy được trong **mọi** example của nó. Không để handler rỗng (`() => undefined`), không để control trông như bấm được nhưng không làm gì.

- Prop controlled luôn đi kèm handler của nó, giữ giá trị trong state: `month` + `onMonthChange`, `value` + `onValueChange`, `open` + `onOpenChange`, `pageSize` + `onPageSizeChange`. `month={new Date(1995, 5, 1)}` không có handler thì Previous/Next không làm gì.
- Nút đóng hoặc huỷ (Cancel, Dismiss, Undo) phải làm đúng việc của nó. Trong example inline, nó ẩn nội dung và để lại một nút mở lại (ví dụ "Show message again"); focus chuyển sang nút đó, không rơi về `body`.
- Harness:
  - `interaction/no-noop-handler` cảnh báo handler rỗng trên mọi component Zen, kể cả `onClick: () => {}` trong object action. Code mẫu trong template string được bỏ qua.
  - `interaction/controlled-needs-handler` cảnh báo prop controlled thiếu handler, kiểm tra cả code mẫu vì người đọc sẽ copy. Boolean trơn (preview cố định) và dạng ghim `x ? true : undefined` không bị tính.
  - `interaction/action-without-handler` cảnh báo action không có handler nào: Button hay `<button>` thiếu `onClick` / `href` / `type="submit"`, object action (`leading`, `trailing`, `action`, `primaryAction`, `secondaryAction`, `subAction`, `actions`, `suggestions`) thiếu `onClick`, và danh sách `items` bấm được mà thiếu `onSelect` / `onNavigate` / `onItemClick` / `onValueChange`. IconButton thuộc `icon-button/needs-action`. Hành vi mặc định có tài liệu được bỏ qua: action của Dialog, ModalForm, SidePanel, BottomSheet không có `onClick` thì đóng overlay; Button làm `trigger` của Menu. Rule chỉ chạy trong repo (example, playground, template), không chạy cho app.
  - Cả ba bỏ qua file stories.
- Mỗi action phải cho thấy kết quả: mở sheet, dialog hay chi tiết, chọn, xác nhận tại chỗ, hoặc điều hướng trong demo. Back trên điện thoại về màn cha (`usePhoneScreen()` trong `PlatformPhone.tsx` đưa focus sang màn mới); Share, Invite, New … mở `DemoFieldDialog` (`PlatformDemoActions.tsx`); việc ra ngoài demo (Export, Duplicate) xác nhận bằng toast. Trong playground, action ghi lại handler đã chạy ngay dưới preview. Specimen của playground Button là chính component đang cấu hình nên được `zen-allow`.

Riêng Chat, các example dùng `useChatDemo()` (`src/platform/chatDemo.tsx`) để có đủ tương tác:

- `act(id, side, { kind, text, author, reply })` rải lên từng `ChatMessage`:
  - hold (mobile) và hover (desktop) mở đúng bộ action Figma theo loại tin (`chatHoldActionsFor`), kèm Reaction-Bar;
  - Reply điền thanh "Replying to" của composer (`composerReply`), gửi đi thì gắn trích dẫn (`takeReply`);
  - Delete xoá tin thật (`isDeleted`), Copy ghi vào clipboard, Call back gọi lại.
- `openFile`, `openPhotos`, `callBack` cho các card; `composerActions` và `onEmoji` cho composer; `headerAction` cho nút trên Top Navigation.
- `<ChatDemoNote note={note} />` hiện kết quả của thao tác gần nhất (live region).

Harness `chat/no-locked-interaction` cảnh báo handler rỗng, và `ChatMessage` không có hold/hover hay reaction. Code mẫu nằm trong template string được bỏ qua.

## 4. Nội dung (copy)

- Số lượng phải khớp với danh từ: `plural(n, "item")` hoặc `plural(n, "address", "addresses")`, không viết `{list.length} items` (harness `copy/plural-count`).
- Nhãn nút nói kết quả, bắt đầu bằng động từ. Không dùng "OK", "Submit" hay "Click here".
- Dữ liệu thật và tiền tệ đã định dạng, không lorem ipsum.
- Avatar trộn cả hai trường hợp: ảnh thật (`src/assets/media/avatar-*.webp`) và chữ viết tắt trên màu theme. Không dùng hình bóng người placeholder. `avatarOf(person)` (`PlatformMobileData.ts`) trả về đúng props cho `Avatar`. Có thể dùng tên tiếng Việt có dấu (kiểm tra được font).
- Mô tả example (description) nói người đọc học được gì trong 1–2 câu và phải đúng với hành vi thực tế. Khi sửa hành vi thì sửa mô tả theo.

## 5. Kết hợp component (không tự dựng markup)

| Cần | Dùng |
| --- | --- |
| Hàng có leading, tiêu đề, caption, trailing | `List` + `ListItem` (không dựng `div.pe-row` + Text + Badge) |
| Không có dữ liệu / không có kết quả | `EmptyState` (thêm `illustration={false}` khi đặt trong card) |
| Icon file | `FileIcon format={fileIconFormatOf(name)}` |
| Filter, sort, scope, owner | `Chip variant="advanced"` |
| Số đếm | `BadgeCounter`; Badge dành cho chữ và trạng thái |
| Màu swatch | `var(--zen-color-background-support-<hue>-solid)` (harness `color-selector/token-values`) |
| Tiến độ dùng quota | `ProgressBar theme="status" scale="quota"` |

Quy tắc layout:
- Trong grid, dùng `justifySelf: "start"` để một nút nhỏ giữ kích thước theo nhãn.
- Trong flex column, dùng `alignSelf: "flex-start"`.
- Icon luôn dùng size token (`2xs…3xl`) hoặc số px (harness `icon/size-token`).

## 6. Accessibility

- Mọi control chỉ có icon đều có tên. Với Segmented, đặt `"aria-label"` trên option và để icon `decorative`.
- Id tạo bằng `useId()`, không hard-code, vì example có thể render hai lần (preview và code).
- Chip dạng toggle có `aria-pressed`. Trigger mở panel có `aria-haspopup="dialog"`.
- Kết quả bất đồng bộ (lỗi gửi, đã lưu) dùng `role="status"` hoặc Toast. Không dùng màu làm tín hiệu duy nhất.
- Trên mobile, hit area tối thiểu 24×24. Control nhỏ thêm `::after` vô hình, như Tag, Badge remove, Alert close.

## 7. CSS của platform

- Class của example dùng tiền tố `pe-`. **Grep `src/platform/platform.css` trước khi đặt tên**, vì class trùng sẽ thừa hưởng style lạ. Ví dụ `.pe-summary` đã có sẵn nên bảng tổng tiền chuyển sang `.pe-order-summary`.
- Chỉ dùng token `--zen-*`; giá trị thô chỉ làm fallback trong `var()`.
- Tiêu đề dùng màu Strongest (harness `content/title-is-strongest`). Ngoại lệ: header nhóm của list (Body/Small/Bold, kicker) dùng Light (quyết định 2026-10-03, chuẩn 3:1 cho chữ đậm của Apple). Meta Body/Small dùng Base; Caption luôn dùng Light.
- Typography của example luôn là typography của preview (Dashboard mặc định, theo chip Typography), **kể cả overlay**. Dialog, Side Panel, Toast, Tooltip và Popover đi qua `ZenPortal` vào `.official-portal-root`. Vùng này mang `data-typography` của preview, nên không bị font Zen-Platform (TASA Explorer) của khung platform lọt vào. Không `createPortal` ra ngoài vùng preview hay portal root, và không tự đặt font-family hay letter-spacing trong example. Audit `typography` sẽ bắt lỗi này.

- Phân cấp nội dung theo Typography › Content hierarchy. Mỗi trang hoặc màn hình có đúng một `h1` luôn hiện diện, gọi tên trang và khớp `document.title`. Trang Master/Child (desktop) dùng `PageHeader` với `h1` Heading/1. Section dùng `h2` Heading/4. Tiêu đề card thấp hơn heading gần nhất phía trên một cấp (`h3` dưới section, `h2` ngay dưới tiêu đề trang) và luôn là Heading/Subheading. Màn Master trên phone dùng `largeTitle` làm `h1` (Heading/1). Ở màn Child, tiêu đề compact trên thanh `TopNavigation` chính là `h1` và giữ style của thanh (Body/Extra/Bold), nên nội dung bắt đầu từ `h2`. Con số không phải heading. Nhấn mạnh bằng độ đậm, làm dịu bằng tone, không đổi cỡ chữ. Cấp heading chọn theo outline, không theo kích thước: đi xuống từng cấp một, đi lên được nhảy (`h4` → `h2`). Audit `outline` sẽ bắt lỗi.

## 8. Code sample

- File `src/platform/examples/pages/<page>.tsx` export `examples` qua `keepOnHotUpdate(import.meta.hot, "examples", [ … ])` (`src/platform/hotData.ts`). Nhờ vậy một lần sửa (kể cả của Zen Studio) chỉ hot update trang đó, và các example giữ state đang có (thread đang mở, tab đang chọn). Nếu export mảng trần, mỗi lần sửa sẽ chạy lại mọi example từ đầu.
- Code sample phản ánh đúng phần render: cùng props và cùng component, không có thuộc tính lặp lại (từng có `scale="quota" scale="quota"`).
- Ghi chú wrapper layout bằng comment trong JSX, ví dụ `{/* display: grid; gap: 12px */}`, thay vì bỏ qua wrapper.

## 9. Kiểm tra trước khi xong

```bash
npx tsc --noEmit -p .
npm run usage:check
node tools/platform-audit/audit.mjs --pages=<trang> --viewports=1512,390 --smoke
npm run platform:shoot -- <trang>                 # rồi mở ảnh và xem từng card
npm run platform:shoot -- <trang> --width=390
```
