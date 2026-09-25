# Figma Design System Audit — ZEN Kaiz

- Nguồn: https://www.figma.com/design/yhWJCuQd9IqusQkUip7lYh/ZEN-Kaiz--Improving-
- File key: `yhWJCuQd9IqusQkUip7lYh`
- Ngày audit: 2026-09-08
- Phạm vi: chỉ đọc; không chỉnh sửa Figma, không tạo production code, không publish Code Connect.
- Repository đích: `alexduonguiux-hub/Zen-DS`

> Cập nhật 2026-09-21: JSON export đầy đủ chứa 2.356 variables trong 11 collections và được dùng làm source of truth cho codebase. Con số 2.342 bên dưới là snapshot tại thời điểm audit 2026-09-08; xem `docs/token-import-report.md` để biết chênh lệch.

> Xác minh layer 2026-09-22 trên file `9nZv4uW2LT21yuHabMTCh1` (ZEN Kaiz Official-Sep2026): Figma Design-to-Code MCP đã đọc trực tiếp các node `Button/Main` (`1026:8312`, representative `1026:8142`, `1026:8124`) và `Input/Text-Field` (`421:4108`, representative `421:4111`, `421:4143`, `421:4239`, `421:4205`). Các chi tiết triển khai quan trọng được chốt từ layer data: `Effect/Input` là background blur 20px + inner shadow 1px/3px; Button dùng `Shadow/Action/Basic` (0,1,1), focus ring accent subtle 3px với inset -6px; Input label là `Body/Small/Regular`, content là `Body/Base/Medium`, focus dùng neutral solid + active neutral subtle outer ring.

## Phương pháp và giới hạn

Audit sử dụng Figma MCP và Plugin API read-only để đọc pages, local component/component-set definitions, exposed properties, local variables và local styles.

API whole-file dành cho danh sách component đã publish qua Code Connect không khả dụng trên plan hiện tại: tài khoản có Full seat trên Professional plan, trong khi endpoint yêu cầu Organization hoặc Enterprise. Vì vậy:

- Inventory bên dưới phản ánh component definitions đang tồn tại trong file.
- Không thể xác nhận component nào thực sự đã publish vào library bằng endpoint Code Connect.
- Không thực hiện pixel-level visual regression; các nhận xét chuẩn hóa tập trung vào cấu trúc, naming, properties, tokens và khả năng mapping sang React.
- Iconography được tổng hợp theo quy mô thay vì liệt kê toàn bộ 1.597 icon độc lập trong tài liệu này.

## Executive summary

| Chỉ số | Kết quả |
|---|---:|
| Pages được quét | 69 pages không phải separator |
| Pages chứa component definitions | 49, tính cả Iconography |
| Tổng component owners | 1833 |
| Component sets | 193 |
| Standalone components | 1640 |
| UI/component owners ngoài Iconography | 233 |
| Iconography owners | 1600 |
| Variable collections | 11 |
| Variables | 2342 |
| Local text styles | 35 |
| Local paint styles | 35 |
| Local effect styles | 18 |
| Local grid styles | 0 |
| UI components thiếu description | 71/233 |
| Variables có code syntax | 0/2342 |

Kết luận chính:

1. Hệ thống có độ phủ component và token lớn, đủ nền tảng để xây code design system.
2. Token architecture đã có phân tầng primitive → project → semantic → component, đây là điểm mạnh.
3. Naming và state vocabulary chưa đồng nhất hoàn toàn, đặc biệt ở Button, Input, Sidebar, Table và mobile navigation.
4. Chưa có Web code syntax trên variables, nên hiện chưa có mapping ổn định sang CSS custom properties.
5. Nhiều component có variant matrix rất lớn; Button family riêng đã có từ 50 đến 240 variants mỗi set.
6. Button/Main là pilot phù hợp nhất, nhưng cần thống nhất API/state trước khi code.

## 1. Danh sách components và component sets

### Tổng quan theo page

| Page | Component sets | Standalone | Components |
|---|---:|---:|---|
| 🏃 Playground | 2 | 1 | `.Ops/Primitives/Popover/Item-List/Foundation`, `.logo-Zen`, `Component` |
| 🖼️ Aspect Ratio | 1 | 0 | `Aspect-Ratio` |
| ❖ Avatar | 3 | 0 | `.Primitives/Avatar/Status/XSmall/Disabled`, `Avatar/Single`, `Avatar/Stack` |
| ❖ AI-Chat | 2 | 1 | `AI/Chat-Bubble`, `AI/Chat-Field`, `AI/Chat-Block/Pale` |
| ❖ Accordion | 2 | 1 | `.Primitives/Accordion/Content`, `.Primitives/Accordion/Content/Text`, `Accordion/Text` |
| ❖ Alert Banner | 1 | 0 | `Alert-Banner` |
| ❖ Button | 6 | 0 | `Button/Icon-Flat`, `Button/Icon-Overlay`, `Button/Icon-Main`, `Button/Flat`, `Button/Overlay`, `Button/Main` |
| ❖ Badge | 2 | 0 | `Badge`, `Badge-Counter` |
| ❖ Breadcrumbs | 2 | 1 | `.Primitives/Breadcrumbs/Item`, `Primitives/Breadcrumbs/Item/Slot`, `Breadcrumbs` |
| ❖ Bottom Sheet (Mobile) | 4 | 2 | `.Primitives/Bottom-Sheet/Actions`, `.Primitives/Bottom-Sheet/Header/Basic`, `Primitives/Sheet-Actions/Item`, `.Primitives/Bottom-Sheet/Header-Bar`, `Bottom-Sheet`, `Bottom-Sheet/Modal` |
| ❖ Chat | 20 | 4 | `Chat/Mobile/Bubble/Overlay (Mobile)`, `Chat-Control`, `Chat/Section/Time`, `Chat/Section/Read-List`, `Chat/Section/Conversation`, `Chat/Reaction/Status/No`, `Chat/Reaction/Emoji/Interactive`, `Chat/Reaction/Emoji/Static`, `Chat/Reaction-Bar`, `Chat/Avatar-Group`, `Chat/Conversation-List/List-Item/Default`, `.Chat/Conversation-List/List-Item/Content`, `Chat/Conversation/Bubble`, `Chat/Bubble/Call`, `Chat/Bubble/Focused/Call`, `Chat/Bubble/File`, `Chat/Bubble/Focused/File`, `Chat/Bubble/Text-You`, `Chat/Bubble/Text-Others`, `Chat/Bubble/Focused/Text`, `Chat/Photo-Container`, `Chat/Photo/Grid-Slot`, `Chat/Bubble/Photo-You`, `Chat/Bubble/Photo-Others` |
| ❖ Card | 1 | 1 | `Card`, `.Demo-Card` |
| ❖ Chart | 0 | 3 | `Chart/Chart-Card`, `Chart/Line-Chart`, `Chart/Stack-Bar-Chart` |
| ❖ Chip/Pill | 4 | 0 | `.Chip/Trailing`, `Chip/Normal`, `Chip/Advanced`, `Chip/Number-Only` |
| ❖ Checkbox | 3 | 0 | `.Primitives/Checkbox/Content`, `Checkbox/Mark`, `Checkbox/Text` |
| ❖ Color Selector | 1 | 0 | `Color-Selector` |
| ❖ Divider | 1 | 0 | `Divider` |
| ❖ Dock Icon | 1 | 0 | `Dock-Icon` |
| ❖ Date Picker | 12 | 1 | `.Primitives/Date-Picker/Header`, `.Primitives/Date-Picker/Time-Picker`, `.Primitives/Date-Picker/Action`, `.Primitives/Date-Picker/Calendar`, `.Primitives/Date-Picker/Calendar-Table`, `.Primitives/Date-Picker/Item/Event-List`, `.Primitives/Date-Picker/Item`, `.Primitives/Mobile-Date-Picker/Item`, `.Primitives/Date-Picker`, `.Primitives/Date-Picker/Footer-Actions`, `Date-Picker/Dual-Calendar`, `Date-Picker/Mobile`, `Date-Picker/Single-Calendar` |
| ❖ Empty State | 0 | 3 | `Empty-State/Illustration/Placeholder`, `.Empty-State/CTAs`, `Empty-State` |
| ❖ Input | 18 | 3 | `.Primitives/Input/Help-Text`, `Primitives/Input/Input-Conditions/Condition-Item`, `Input-Conditions`, `.Primitives/Input/Input-Content/Default`, `.Primitives/Input/Cursor`, `.Primitives/Input/Leading-Trailing`, `.Primitives/Input/Field-Only`, `.Primitives/Input/Text-Area`, `Primitives/Input/Label`, `.Primitives/Input/Number/Trailing`, `.Primitives/Rich-Text/Editor-Bar`, `Control-Bar/Select-Item`, `Input/Date-Field`, `Input/Select-Field`, `Input/Heading`, `Input/Richtext`, `Input/Autocomplete-Field`, `Input/Number-Align-Center`, `Input/Number-Align-Left`, `Input/Text-Area`, `Input/Text-Field` |
| ❖ Inline Message | 1 | 0 | `Inline-Message` |
| ❖ List-Item | 2 | 2 | `.Primitives/List-Item/Mobile/Slot/Avatar`, `.Primitives/List-Item/Mobile/Slot-Actions`, `.Primitives/List-Item/Mobile/Slot/Info-Content`, `List-Item` |
| ❖ Modal & Dialog | 4 | 1 | `.Primitives/Modal/Actions`, `.Primitives/Modal/Header`, `Overlay`, `Modal/Forms`, `Modal/Dialog` |
| ❖ Metric Widget (Dashboard) | 4 | 1 | `.Primitives/Metrics/Metric-Visual/Placeholder`, `.Primitives/Metrics/Metric-Trend`, `Primitives/Metric/Metric-Inline/Icon-Highlight`, `Primitives/Metric/Metric-Inline/Title-Highlight`, `Metric-Card` |
| ❖ Popover | 3 | 5 | `.Primitives/Popover/Label`, `.Primitives/Popover/Search`, `.Primitives/Popover/Item/Content`, `Primitives/Popover/Item`, `Scroll-Bar`, `Popover/Default`, `Popover/Bunk-Action`, `Popover/Manual-Add-New` |
| ❖ Progress | 3 | 0 | `Progress-Bar`, `Progress-Circle/Icon`, `Progress-Circle` |
| ❖ Pagination | 2 | 0 | `.Primitives/Pagination/Item`, `Pagination` |
| ❖ Rating | 6 | 0 | `.Primitives/Rating/Emoji`, `.Primitives/Rating/Opinion item`, `Rating/Star`, `Rating-Display`, `Rating/Opinion-Scale`, `Rating/NPS-Scale` |
| ❖ Radio Button | 3 | 0 | `.Primitives/Radio-Button/Content`, `Radio-Button/Radio-Mark`, `Radio-Button/Radio-Button` |
| ❖ Search | 2 | 0 | `Search/Default`, `Search/Popover` |
| ❖ Slider | 2 | 0 | `.Primitives/Slider/Slide-Dot/Basic/Default`, `Slider/Horizontal` |
| ❖ Sidebar | 6 | 0 | `.Primitives/Sidebar/LOGO`, `Primitives/Sidebar/Menu-Item/Section-Title`, `Side-Bar/Master/Small-Density`, `Side-Bar/Master/Workspace`, `Side-Bar/Master/Basic`, `Primitives/Side-Bar/Menu-Item/Master` |
| ❖ Stepper | 5 | 0 | `.Primitives/Stepper/Item`, `.Primitives/Stepper/Step-Horizontal`, `.Primitives/Stepper/Step-Vertical`, `Stepper-Bar/Vertical`, `Stepper-Bar/Horizontal` |
| ❖ Skeleton | 3 | 0 | `Skeleton/Body-Text`, `Skeleton/Heading-Text`, `Skeleton/Shapes` |
| ❖ Segmented | 2 | 0 | `Primitives/Segmented/Item`, `Segmented` |
| ❖ Side Panel / Side Sheet | 1 | 0 | `Side-Panel` |
| ❖ Tab | 2 | 0 | `Primitives/Tab-Item`, `Tab-Bar` |
| ❖ Tag | 1 | 0 | `Tag` |
| ❖ Table | 13 | 4 | `Primitives/Table/Data-Row`, `Primitives/Table/Header`, `Table/Cell/Header`, `Primitives/Table/Cell/Avatar-Cell`, `Primitives/Table/Cell/Photo-Cell`, `Primitives/Table/Cell/Basic-Icon-Cell`, `Primitives/Table/Cell/Dock-Icon-Cell`, `Primitives/Table/Cell/Text-Cell`, `Primitives/Table/Cell/Progress-Cell`, `Primitives/Table/Cell/Badge-Cell`, `Primitives/Table/Cell/Tag-Cell`, `Primitives/Table/Cell/Trend-Cell`, `Primitives/Table/Cell/Control-Cell`, `Primitives/Table/Cell/Actions-Cell`, `Primitives/Table/Cell/Group-Avatar-Cell`, `Primitives/Table/Cell/Editabled-Cell`, `Table/Cell/Default` |
| ❖ Toggle | 3 | 0 | `Toggle`, `Toggle-Button`, `.Primitives/Toggle/Content` |
| ❖ Tooltip | 2 | 0 | `.Primitives/Tooltip/Content/Simple-Label`, `Tooltip` |
| ❖ Toast-Message (Snack) | 1 | 0 | `Toast-Message` |
| ❖ Uploader | 3 | 0 | `Primitives/Uploader/File-Item`, `Primitives/Uploader/DragDrop-Field`, `Uploader/File-Upload` |
| ❖ Top-Navigations (Mobile) | 14 | 0 | `Top-Navigation/Mobile`, `.Primitives/Heading-Text/Basic`, `Nav-Action/Icon-Flat`, `Nav-Action/Icon-Overlay`, `Nav-Action/Liquid-Glass`, `Nav-Action/Icon-Main`, `Nav-Action/Overlay`, `Nav-Action/Liquid-Glass`, `Nav-Action/Main`, `.Primitives/Top-Navigation/Mobile/Nav-Slot/Action`, `.Primitives/Top-Navigation/Mobile/Nav-Slot/Visual`, `Nav-Action/Flat`, `.Primitives/Mobile/Top-Navigation/Leading`, `.Primitives/Mobile/Top-Navigation/Trailling` |
| ❖ Bottom-Navigations (Mobile) | 4 | 3 | `.Primitives/Bottom-Navigation/Items/Default`, `.Primitives/Bottom-Navigation/Items/Floating`, `.Primitives/Bottom-Navigation/Items/Floating-Glass`, `.Primitives/Bottom-Navigation`, `Bottom-Navigation/Mobile/Default`, `Bottom-Navigation/Mobile/Floating`, `Bottom-Navigation/Mobile/Floating-Glass` |
| ◇ Master-Layout | 6 | 0 | `Primitives/Notification-Dot`, `Primitives/Dashboard/Header`, `Header/Dashboard`, `Patterns/Pages/Density-Medium`, `Patterns/Sidebar/Density-Medium`, `Primitives/Dashboard/Header/Action-Item` |
| ⚙️ Operation Components | 6 | 6 | `.Ops/Table/Header/No-border`, `.Ops/Header/Cell/Display/Color Preview`, `.Ops/Table/Cell/No-border`, `.Ops/Header-Old`, `System/Bottom-Indicator`, `.Ops/Notes`, `System/Top-Indicator`, `Status-bar/IOS/Mobile`, `Status-bar/IOS/Tablet`, `_Cover`, `Keyboard - iPhone`, `Keyboard - iPad` |
| 🍑 Iconography | 3 | 1597 | `icon-media-file`, `icon-social`, `Flag`; 1597 icon components độc lập, chủ yếu prefix `icon-` |

### Iconography

- Tổng số owners: 1600.
- Component sets: 3.
- Standalone components: 1597.
- Phân bố prefix quan sát được: `icon` 1592, `ic` 7, `Flag` 1.
- Hai naming prefixes `icon-` và `ic-` đang cùng tồn tại.
- Mô hình mỗi icon là một standalone component có thể phù hợp cho instance swap, nhưng cần registry/code generation thay vì viết story thủ công cho từng icon.

## 2. Variants và exposed properties

Phần chi tiết đầy đủ cho 233 UI/component owners nằm ở Appendix A. Một số component family quan trọng:

### Button family

| Component set | Variants | Exposed variant axes |
|---|---:|---|
| `Button/Main` | 200 | Size × Level × State |
| `Button/Overlay` | 100 | Size × Level × State |
| `Button/Flat` | 50 | Size × Level × State |
| `Button/Icon-Main` | 240 | Size × Level × State |
| `Button/Icon-Overlay` | 120 | Size × Level × State |
| `Button/Icon-Flat` | 125 | Size × Level × State |

Button/Main properties quan sát được:

- `Text`: TEXT, mặc định “Button”.
- `Size`: XLarge, Large, Medium (Base), Small, XSmall.
- `Level`: Primary, Accent, Secondary, Tertiary, Danger, Danger Subtle, Positive, Positive Subtle.
- `State`: Default, Hover, Pressed, Focused, Disabled.
- `Leading-Icon` và `Trailing-Icon`: BOOLEAN.
- `Leading-Icon-Src` và `Trailing-Icon-Src`: INSTANCE_SWAP.

### State modeling cần lưu ý

Các visual states như Hover, Pressed và Focused không nên trở thành React props công khai. Chúng nên được điều khiển bằng CSS pseudo-classes, DOM interaction state và Storybook pseudo-state testing. Chỉ những trạng thái nghiệp vụ như `disabled`, `loading`, `selected`, `invalid` mới nên là props khi phù hợp.

## 3. Variables và foundations

### Variable collections

| Collection | Variables | Modes | Types | Hidden | Có code syntax |
|---|---:|---|---|---:|---:|
| Global Colors | 1152 | Zen | COLOR: 1152 | 1056 | 0 |
| Global Dimensions | 33 | Mode 1 | FLOAT: 33 | 0 | 0 |
| Base Colors (Project) | 322 | Zen, Chat, VT, Ananas | COLOR: 322 | 320 | 0 |
| Mode Colors (Semantic) | 402 | Light, Dark | COLOR: 401, BOOLEAN: 1 | 0 | 0 |
| Component Colors (Theme) | 108 | Neutral - S1, Brand - S1, Neutral - S2, Brand - S2 | COLOR: 108 | 96 | 0 |
| Component Size | 186 | Compact, Comfortable | FLOAT: 186 | 171 | 0 |
| Spacing | 22 | Standard | FLOAT: 22 | 0 | 0 |
| Corner Radius | 25 | Rounded, Smooth, Standard, Luxury | FLOAT: 25 | 14 | 0 |
| Emphasis Level | 5 | Medium, Strong | FLOAT: 5 | 4 | 0 |
| Breakpoint & Grids | 9 | Desktop, Tablet, Mobile | FLOAT: 9 | 0 | 0 |
| Typography Configuration | 78 | Dashboard, Popular, Mobile, Ananas | STRING: 5, FLOAT: 73 | 0 | 0 |

### Color

Color architecture có bốn lớp đáng chú ý:

1. `Global Colors`: 1.152 primitive colors, chia Light và Dark; 1.056 variables hidden.
2. `Base Colors (Project)`: 322 project palette variables, modes Zen/Chat/VT/Ananas; phần lớn alias về primitives.
3. `Mode Colors (Semantic)`: 402 semantic variables, modes Light/Dark; bao gồm Content, Background, Stroke và Effect.
4. `Component Colors (Theme)`: 108 component-specific colors cho Button, Checkbox, Radio, Input, Tag, Toggle, Table, Chart và Card.

Điểm tốt: semantic và component variables dùng scopes khá cụ thể.

Khoảng trống:

- `Global Colors` có 1.152 variables với scope rỗng.
- `Base Colors (Project)` có 320 variables scope rỗng và 2 variables dùng `ALL_SCOPES`.
- Toàn bộ 2.342 variables chưa có Web/Android/iOS code syntax.
- Cần xác nhận số lượng primitive color thực sự cần export; 1.152 là rất lớn cho public package.

### Spacing và dimensions

- `Global Dimensions`: 33 values, tên `dm-2`, `dm-4`, …; mode hiện vẫn là `Mode 1`.
- `Spacing`: 22 semantic gap variables, từ `3XSmall` đến `2XGiant`.
- `Component Size`: 186 variables, modes Compact/Comfortable; chứa width/height, padding và gap theo component.
- `Breakpoint & Grids`: 9 variables cho Desktop/Tablet/Mobile.

Khuyến nghị:

- Đổi `Mode 1` thành tên có ý nghĩa như `Default`.
- Chốt một naming scale cho code, ví dụ `space.3xs` … `space.2xl`.
- Không export trực tiếp mọi component-size token; chỉ export public semantic tokens và giữ implementation tokens nội bộ.

### Corner radius

- Collection `Corner Radius`: 25 FLOAT variables.
- Modes: Rounded, Smooth, Standard, Luxury.
- Scope: CORNER_RADIUS.
- Scale gồm `2XSmall` đến `XGiant`, cùng action-specific radii.
- Có thêm `Modal-Radius` trong Breakpoint & Grids; đây là dấu hiệu token ownership đang chồng lấn.

Khuyến nghị: chuyển `Modal-Radius` về component/semantic radius layer thay vì để trong breakpoint collection.

### Typography

- 78 typography variables.
- Modes: Dashboard, Popular, Mobile, Ananas.
- Variables bao phủ font family, font size, line height và letter spacing.
- 35 local text styles.
- Fonts quan sát được: Inter và JetBrains Mono.
- Emphasis Level chứa 4 font-weight variables và 1 border-weight variable.

#### Local text styles

| Style | Font | Size | Line height | Letter spacing |
|---|---|---:|---:|---:|
| `Display-Extra/1` | Inter Semi Bold | 78 | 88 pixels | -4.400000095367432 pixels |
| `Display-Extra/2` | Inter Semi Bold | 68 | 72 pixels | -4 pixels |
| `Display-Extra/3` | Inter Semi Bold | 60 | 68 pixels | -3.4000000953674316 pixels |
| `Display/1` | Inter Semi Bold | 52 | 60 pixels | -3 pixels |
| `Display/2` | Inter Semi Bold | 46 | 52 pixels | -2.0799999237060547 pixels |
| `Display/3` | Inter Semi Bold | 40 | 48 pixels | -1.840000033378601 pixels |
| `Display/4` | Inter Semi Bold | 36 | 44 pixels | -1.600000023841858 pixels |
| `Heading/1` | Inter Semi Bold | 32 | 40 pixels | -1.440000057220459 pixels |
| `Heading/2` | Inter Semi Bold | 28 | 36 pixels | -0.9599999785423279 pixels |
| `Heading/3` | Inter Semi Bold | 24 | 32 pixels | -0.8399999737739563 pixels |
| `Heading/4` | Inter Semi Bold | 20 | 28 pixels | -0.7200000286102295 pixels |
| `Heading/Subheading` | Inter Semi Bold | 18 | 24 pixels | -0.6000000238418579 pixels |
| `Body/Extra/Regular` | Inter Regular | 16 | 24 pixels | -0.36000001430511475 pixels |
| `Body/Base/Regular` | Inter Regular | 14 | 20 pixels | -0.3199999928474426 pixels |
| `Body/Base/Medium` | Inter Medium | 14 | 20 pixels | -0.3199999928474426 pixels |
| `Body/Base/Bold` | Inter Semi Bold | 14 | 20 pixels | -0.3199999928474426 pixels |
| `Body/Small/Regular` | Inter Regular | 12 | 16 pixels | -0.2800000011920929 pixels |
| `Body/Small/Medium` | Inter Medium | 12 | 16 pixels | -0.2800000011920929 pixels |
| `Body/Small/Bold` | Inter Semi Bold | 12 | 16 pixels | -0.2800000011920929 pixels |
| `Body/Code/Regular` | JetBrains Mono Regular | 12 | 16 pixels | 0 pixels |
| `Body/Code/Bold` | JetBrains Mono Regular | 12 | 16 pixels | 0 pixels |
| `Caption/Regular` | Inter Regular | 10 | 12 pixels | -0.11999999731779099 pixels |
| `Caption/Medium` | Inter Medium | 10 | 12 pixels | -0.11999999731779099 pixels |
| `Caption/Bold` | Inter Semi Bold | 10 | 12 pixels | -0.11999999731779099 pixels |
| `Label/Small/Medium` | Inter Medium | 8 | 12 pixels | 0 pixels |
| `Label/Small/Bold` | Inter Semi Bold | 8 | 12 pixels | 0 pixels |
| `Button-Label/XL` | Inter Semi Bold | 16 | 24 pixels | -0.4000000059604645 pixels |
| `Button-Label/L` | Inter Semi Bold | 14 | 20 pixels | -0.3199999928474426 pixels |
| `Button-Label/M` | Inter Semi Bold | 14 | 20 pixels | -0.3199999928474426 pixels |
| `Button-Label/S` | Inter Semi Bold | 14 | 20 pixels | -0.3199999928474426 pixels |
| `Button-Label/XS` | Inter Semi Bold | 12 | 12 pixels | -0.2800000011920929 pixels |
| `All-Caps/M` | Inter Regular | 14 | 16 pixels | 0 pixels |
| `All-Caps/S` | Inter Regular | 12 | 16 pixels | 0 pixels |
| `Body/Extra/Medium` | Inter Medium | 16 | 24 pixels | -0.36000001430511475 pixels |
| `Body/Extra/Bold` | Inter Semi Bold | 16 | 24 pixels | -0.36000001430511475 pixels |

Khoảng trống:

- Typography vừa tồn tại dưới dạng variables vừa tồn tại dưới dạng text styles; cần xác định rõ layer nào là source of truth.
- `Body/Code/Bold` sử dụng JetBrains Mono “Regular” với variation weight 600; cần kiểm tra khả năng render nhất quán trên web.
- Button labels L và M hiện cùng 14/20; nếu khác nhau chỉ ở component padding thì nên ghi rõ.
- Không có local grid styles dù đã có Breakpoint & Grids variables.

## 4. Các component/chỗ chưa chuẩn hóa

### P0 — cần xử lý trước khi Code Connect

1. **Generic component/property names trong Playground**
   - `.logo-Zen` dùng variant property `Property 1=Default`.
   - Component set `Component` có option `Component 2`.
   - Nên đổi thành tên semantic trước khi mapping code.

2. **Chưa có variable code syntax**
   - 0/2.342 variables có code syntax.
   - Không thể tạo mapping đáng tin cậy sang `var(--...)` nếu chưa chốt token naming trong repository.

3. **Button state không nên map 1:1 thành props**
   - Hover, Pressed, Focused là interaction states.
   - Nếu map toàn bộ Figma State thành React prop sẽ tạo API sai và khó đảm bảo accessibility.

### P1 — chuẩn hóa trong pilot

1. **Button size vocabulary không đồng nhất**
   - Text buttons: `Medium (Base)`.
   - Icon buttons: `Medium`.
   - Một số icon buttons có `2XSmall`, text buttons không có.

2. **Button level vocabulary không đồng nhất**
   - Button/Main: `Danger Subtle`, `Positive Subtle`.
   - Button/Icon-Main: `Danger Secondary`, `Positive Secondary`.
   - Cần chọn `subtle` hoặc `secondary` làm canonical terminology.

3. **Variant matrix quá lớn**
   - Button/Main 200 variants; Icon-Main 240.
   - Cần kiểm tra xem mọi tổ hợp có thực sự hợp lệ hay đang tạo Cartesian product dư thừa.

4. **Private/internal naming không nhất quán**
   - Cùng tồn tại các prefix `.Primitives/`, `Primitives/`, `.Chat/`, `.Ops/`, `.Demo-`.
   - Cần định nghĩa rõ prefix nào biểu thị private primitive và có được publish hay không.

5. **Thiếu descriptions**
   - 71/233 UI component owners ngoài Iconography chưa có description.
   - Danh sách xem ở Appendix B.

### P2 — cleanup naming/documentation

- `Side-Bar` và `Sidebar` cùng tồn tại.
- `Primitives/Table/Cell/Editabled-Cell` nên là `Editable-Cell`.
- `.Primitives/Mobile/Top-Navigation/Trailling` nên là `Trailing`.
- `Control-Expaned` trong Bottom Sheet nên là `Control-Expanded`.
- `No-border` không cùng casing với phần lớn Pascal/Title naming.
- Icon prefixes `icon-` và `ic-` cùng tồn tại.
- Một số state dùng `Focus`, nơi khác dùng `Focused`.
- Một số read-only states dùng `Read-Only`, nơi khác dùng `View-Only`.
- Một số options dùng khoảng trắng, một số dùng hyphen; cần một convention duy nhất.

## 5. Component pilot đề xuất

### Chọn `Button/Main`

Lý do:

- Là component nền tảng, xuất hiện trong nhiều flow và component khác.
- Có token coverage rõ cho color, size, spacing, radius và typography.
- Có description/use cases tương đối tốt.
- Đủ phức tạp để kiểm chứng pipeline Figma → token → React → Storybook → test → Code Connect.
- Các inconsistency của Button buộc team giải quyết contract sớm trước khi nhân rộng.

### Phạm vi pilot nên giới hạn

Iteration đầu chỉ nên hỗ trợ:

- Size: XLarge, Large, Medium, Small, XSmall.
- Variant: Primary, Accent, Secondary, Tertiary, Danger, Danger Subtle, Positive, Positive Subtle.
- disabled.
- startIcon/endIcon.
- children.
- Native hover/active/focus-visible.
- Loading chỉ thêm nếu product requirement xác nhận; Figma hiện chưa expose Loading.

Không đưa `State` thành public React prop.

## 6. Mapping Figma properties → React props

| Figma component/property | React API | Mapping |
|---|---|---|
| `Button/Main` | `<Button>` | Pilot component |
| `Text` | `children: ReactNode` | “Button” → children |
| `Size=XLarge` | `size="xl"` | Canonical lowercase |
| `Size=Large` | `size="lg"` | Canonical lowercase |
| `Size=Medium (Base)` | `size="md"` | Bỏ presentation label “Base” khỏi API |
| `Size=Small` | `size="sm"` | Canonical lowercase |
| `Size=XSmall` | `size="xs"` | Canonical lowercase |
| `Level=Primary` | `variant="primary"` | Direct semantic mapping |
| `Level=Accent` | `variant="accent"` | Direct semantic mapping |
| `Level=Secondary` | `variant="secondary"` | Direct semantic mapping |
| `Level=Tertiary` | `variant="tertiary"` | Direct semantic mapping |
| `Level=Danger` | `variant="danger"` | Direct semantic mapping |
| `Level=Danger Subtle` | `variant="danger-subtle"` | Normalize spacing |
| `Level=Positive` | `variant="positive"` | Có thể đổi thành success nếu codebase convention yêu cầu |
| `Level=Positive Subtle` | `variant="positive-subtle"` | Normalize spacing |
| `State=Disabled` | `disabled: boolean` | Native button attribute |
| `State=Hover` | CSS `:hover` | Không expose prop |
| `State=Pressed` | CSS `:active` | Không expose prop |
| `State=Focused` | CSS `:focus-visible` | Không expose prop |
| `Leading-Icon=true` + source | `startIcon?: ReactNode` | Presence được suy ra từ prop |
| `Trailing-Icon=true` + source | `endIcon?: ReactNode` | Presence được suy ra từ prop |
| Chưa có trong Figma | `loading?: boolean` | Chỉ thêm sau khi xác nhận behavior |
| Không phải Figma prop | `type="button"` mặc định | Tránh submit form ngoài ý muốn |

React contract đề xuất:

```ts
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'accent'
    | 'secondary'
    | 'tertiary'
    | 'danger'
    | 'danger-subtle'
    | 'positive'
    | 'positive-subtle';
  size?: 'xl' | 'lg' | 'md' | 'sm' | 'xs';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}
```

## 7. Thứ tự công việc sau audit

1. Chốt canonical naming cho Button size/level/state.
2. Chọn public token subset và đặt CSS variable names.
3. Viết token contract trong repository.
4. Implement `Button/Main` bằng React/TypeScript.
5. Tạo Storybook stories cho variants, disabled, icons và pseudo states.
6. Thêm interaction/a11y/visual tests.
7. Sau khi API ổn định mới tạo Code Connect mapping.
8. Chạy CI và tạo PR; không push trực tiếp vào main.

## Appendix A — Component/property inventory chi tiết

### 🏃 Playground

#### .Ops/Primitives/Popover/Item-List/Foundation

- Node: `2286:10549`
- Loại: Standalone component
- Số variants: 0
- Description: Thiếu

Không có exposed component properties.

#### .logo-Zen

- Node: `4356:252`
- Loại: Component set
- Số variants: 1
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Property 1` | VARIANT | Default | `Default` |

#### Component

- Node: `6025:6923`
- Loại: Component set
- Số variants: 7
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Type` | VARIANT | Dark theme | `Component 2`, `Customize`, `Dark theme`, `Figma`, `Icon`, `Plugin`, `Token` |

### 🖼️ Aspect Ratio

#### Aspect-Ratio

- Node: `1429:17305`
- Loại: Component set
- Số variants: 15
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Aspect ratio` | VARIANT | 1:1 | `1:1`, `5:4`, `4:3`, `7:5`, `3:2`, `5:3`, `16:9`, `2:1` |
| `Portrait` | VARIANT | False | `False`, `True` |

### ❖ Avatar

#### .Primitives/Avatar/Status/XSmall/Disabled

- Node: `217:7418`
- Loại: Component set
- Số variants: 16
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Size` | VARIANT | XSmall | `XSmall`, `Small`, `Medium`, `Large` |
| `Status` | VARIANT | Disabled | `Active`, `Disabled`, `Pending`, `Inactive` |

#### Avatar/Single

- Node: `223:9050`
- Loại: Component set
- Số variants: 528
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Status` | BOOLEAN | false | — |
| `Focus` | BOOLEAN | false | — |
| `Shape` | VARIANT | Circle | `Circle`, `Square` |
| `Size` | VARIANT | 3XLarge | `3XLarge`, `2XLarge`, `XLarge`, `Large`, `Medium`, `Small`, `XSmall`, `2XSmall` |
| `Theme` | VARIANT | Photo | `Photo`, `Accent`, `Blue`, `Brown`, `Crimson`, `Cyan`, `Green`, `Indigo`, `Neutral`, `Orange`, `Pink`, `Plum`, `Purple`, `Red`, `Teal`, `Violet`, `Yellow` |
| `Background` | VARIANT | Subtle | `Solid`, `Subtle` |

#### Avatar/Stack

- Node: `364:92561`
- Loại: Component set
- Số variants: 20
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `More` | BOOLEAN | false | — |
| `Size` | VARIANT | Medium | `Medium`, `Small` |
| `Background` | VARIANT | Subtle | `Subtle`, `Solid` |
| `Number` | VARIANT | 5 | `5`, `4`, `3`, `2`, `1` |

### ❖ AI-Chat

#### AI/Chat-Bubble

- Node: `4218:1270`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Chat-Content` | SLOT | — | — |
| `Items` | SLOT | — | — |
| `Side` | VARIANT | You | `You`, `AI` |
| `State` | VARIANT | Default | `Default`, `Hover` |

#### AI/Chat-Field

- Node: `12074:16888`
- Loại: Component set
- Số variants: 12
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Model` | BOOLEAN | true | — |
| `State` | VARIANT | Default | `Default`, `Focused`, `Typing`, `Long-Typing` |
| `Style` | VARIANT | Default | `Default`, `Surface`, `Liquid Glass` |

#### AI/Chat-Block/Pale

- Node: `7140:115622`
- Loại: Standalone component
- Số variants: 0
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Suggestion-Chips` | BOOLEAN | true | — |
| `Suggestions` | SLOT | — | — |
| `AI-Say Hi` | SLOT | — | — |

### ❖ Accordion

#### .Primitives/Accordion/Content

- Node: `239:18764`
- Loại: Component set
- Số variants: 6
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Title` | TEXT | Where can I see a breakdown of my full seats and associated costs? | — |
| `Contents` | SLOT | — | — |
| `Size` | VARIANT | Medium | `XLarge`, `Large`, `Medium` |
| `Expanded` | VARIANT | No | `No`, `Yes` |

#### .Primitives/Accordion/Content/Text

- Node: `4035:15870`
- Loại: Standalone component
- Số variants: 0
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Text` | TEXT | You can manage your full seats from the Admin Dashboard (accessible to team admins from the Team Page). When you start the upgrade process, you'll be able to review your current full seats and downgrade people to viewer seats, so you only pay for the seats you want. | — |

#### Accordion/Text

- Node: `239:16847`
- Loại: Component set
- Số variants: 12
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Size` | VARIANT | XLarge | `XLarge`, `Large`, `Medium` |
| `Theme` | VARIANT | Divider | `Divider`, `Box` |
| `Expanded` | VARIANT | No | `No`, `Yes` |

### ❖ Alert Banner

#### Alert-Banner

- Node: `6828:9393`
- Loại: Component set
- Số variants: 10
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Leading` | BOOLEAN | true | — |
| `Action` | BOOLEAN | true | — |
| `Size` | VARIANT | Medium | `Medium`, `Small` |
| `Theme` | VARIANT | Default | `Default`, `Info`, `Positive`, `Warning`, `Negative` |

### ❖ Button

#### Button/Icon-Flat

- Node: `234:43906`
- Loại: Component set
- Số variants: 125
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Leading-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 3163 preferred instance values |
| `Size` | VARIANT | XLarge | `XLarge`, `Large`, `Medium`, `Small`, `XSmall` |
| `Level` | VARIANT | Primary | `Primary`, `Secondary`, `Accent`, `Danger`, `Positive` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Pressed`, `Focused`, `Disabled` |

#### Button/Icon-Overlay

- Node: `291:41855`
- Loại: Component set
- Số variants: 120
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Leading-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 3163 preferred instance values |
| `Size` | VARIANT | XLarge | `XLarge`, `Large`, `Medium`, `Small`, `XSmall`, `2XSmall` |
| `Level` | VARIANT | Inverse | `Inverse`, `White`, `White Overlay`, `Black Overlay` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Pressed`, `Focused`, `Disabled` |

#### Button/Icon-Main

- Node: `205:21062`
- Loại: Component set
- Số variants: 240
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Leading-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 3163 preferred instance values |
| `Size` | VARIANT | XLarge | `XLarge`, `Large`, `Medium`, `Small`, `XSmall`, `2XSmall` |
| `Level` | VARIANT | Primary | `Primary`, `Accent`, `Secondary`, `Tertiary`, `Danger`, `Danger Secondary`, `Positive`, `Positive Secondary` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Pressed`, `Focused`, `Disabled` |

#### Button/Flat

- Node: `1070:18754`
- Loại: Component set
- Số variants: 50
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Leading-Icon` | BOOLEAN | false | — |
| `Trailing-Icon` | BOOLEAN | false | — |
| `Text` | TEXT | Button | — |
| `Trailing-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 3163 preferred instance values |
| `Leading-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 3163 preferred instance values |
| `Size` | VARIANT | XLarge | `XLarge`, `Large`, `Medium (Base)`, `Small`, `XSmall` |
| `Level` | VARIANT | Primary | `Primary`, `Accent` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Pressed`, `Focused`, `Disabled` |

#### Button/Overlay

- Node: `1026:8747`
- Loại: Component set
- Số variants: 100
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Leading-Icon` | BOOLEAN | false | — |
| `Trailing-Icon` | BOOLEAN | false | — |
| `Text` | TEXT | Button | — |
| `Trailing-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 3163 preferred instance values |
| `Leading-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 3163 preferred instance values |
| `Size` | VARIANT | XLarge | `XLarge`, `Large`, `Medium (Base)`, `Small`, `XSmall` |
| `Level` | VARIANT | Inverse | `Inverse`, `White`, `White Overlay`, `Black Overlay` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Pressed`, `Focused`, `Disabled` |

#### Button/Main

- Node: `1026:8312`
- Loại: Component set
- Số variants: 200
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Leading-Icon` | BOOLEAN | false | — |
| `Trailing-Icon` | BOOLEAN | false | — |
| `Text` | TEXT | Button | — |
| `Leading-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 3163 preferred instance values |
| `Trailing-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 3163 preferred instance values |
| `Size` | VARIANT | XLarge | `XLarge`, `Large`, `Medium (Base)`, `Small`, `XSmall` |
| `Level` | VARIANT | Primary | `Primary`, `Accent`, `Secondary`, `Tertiary`, `Danger`, `Danger Subtle`, `Positive`, `Positive Subtle` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Pressed`, `Focused`, `Disabled` |

### ❖ Badge

#### Badge

- Node: `260:4825`
- Loại: Component set
- Số variants: 102
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Remove` | BOOLEAN | false | — |
| `Leading-Icon` | BOOLEAN | true | — |
| `Leading-Icon-Src` | INSTANCE_SWAP | 1486:1954 | 1569 preferred instance values |
| `Text` | TEXT | Badge | — |
| `Size` | VARIANT | Medium | `Medium`, `Small`, `XSmall` |
| `Theme` | VARIANT | Neutral | `Accent`, `Neutral`, `Yellow`, `Orange`, `Red`, `Crimson`, `Pink`, `Plum`, `Purple`, `Violet`, `Indigo`, `Blue`, `Cyan`, `Teal`, `Green`, `Brown`, `Inverse`, `On-Color` |
| `Background` | VARIANT | Solid | `Solid`, `Subtle` |

#### Badge-Counter

- Node: `9535:33812`
- Loại: Component set
- Số variants: 102
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Text` | TEXT | 12 | — |
| `Size` | VARIANT | Medium | `Medium`, `Small`, `XSmall` |
| `Theme` | VARIANT | Neutral | `Accent`, `Neutral`, `Yellow`, `Orange`, `Red`, `Crimson`, `Pink`, `Plum`, `Purple`, `Violet`, `Indigo`, `Blue`, `Cyan`, `Teal`, `Green`, `Brown`, `Inverse`, `On-Color` |
| `Background` | VARIANT | Solid | `Solid`, `Subtle` |

### ❖ Breadcrumbs

#### .Primitives/Breadcrumbs/Item

- Node: `292:43787`
- Loại: Component set
- Số variants: 8
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Level` | VARIANT | Sub | `Sub`, `Master` |
| `State` | VARIANT | Default | `Default`, `Hover` |
| `Emphasis` | VARIANT | Default | `Default`, `Medium` |

#### Primitives/Breadcrumbs/Item/Slot

- Node: `4031:20158`
- Loại: Standalone component
- Số variants: 0
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Dash` | BOOLEAN | false | — |

#### Breadcrumbs

- Node: `4031:20161`
- Loại: Component set
- Số variants: 1
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Item-List` | SLOT | — | — |
| `Size` | VARIANT | Small | `Small` |

### ❖ Bottom Sheet (Mobile)

#### .Primitives/Bottom-Sheet/Actions

- Node: `308:46376`
- Loại: Component set
- Số variants: 4
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Button` | VARIANT | Dual | `Dual`, `Single` |
| `Direction` | VARIANT | Horizontal | `Horizontal`, `Vertical` |

#### .Primitives/Bottom-Sheet/Header/Basic

- Node: `1573:2443`
- Loại: Standalone component
- Số variants: 0
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Back-Button` | BOOLEAN | false | — |
| `Close-Button` | BOOLEAN | true | — |
| `Icon` | BOOLEAN | false | — |
| `Caption` | BOOLEAN | false | — |

#### Primitives/Sheet-Actions/Item

- Node: `4059:17214`
- Loại: Component set
- Số variants: 3
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Trailing` | BOOLEAN | false | — |
| `Content` | SLOT | — | — |
| `Select-Control` | VARIANT | No | `No` |
| `State` | VARIANT | Default | `Default`, `Pressed`, `Single-Selected` |

#### .Primitives/Bottom-Sheet/Header-Bar

- Node: `12048:8666`
- Loại: Component set
- Số variants: 3
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Case` | VARIANT | Default | `Default`, `Control-Expaned`, `Control-Collapsed` |

#### Bottom-Sheet

- Node: `4059:14161`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Header` | BOOLEAN | true | — |
| `Contents` | SLOT | — | — |
| `Items` | SLOT | — | — |
| `Search` | BOOLEAN | false | — |
| `Actions` | BOOLEAN | true | — |
| `Type` | VARIANT | Action | `Modal`, `Action` |
| `Size` | VARIANT | Flex | `Flex`, `Max-Fixed` |

#### Bottom-Sheet/Modal

- Node: `6681:24915`
- Loại: Standalone component
- Số variants: 0
- Description: Có

Không có exposed component properties.

### ❖ Chat

#### Chat/Mobile/Bubble/Overlay (Mobile)

- Node: `6182:55583`
- Loại: Standalone component
- Số variants: 0
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Position` | SLOT | — | — |

#### Chat-Control

- Node: `6182:56819`
- Loại: Component set
- Số variants: 6
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Device` | VARIANT | Mobile | `Desktop`, `Mobile` |
| `State` | VARIANT | Default | `Default`, `Focused`, `Typing` |

#### Chat/Section/Time

- Node: `6101:61561`
- Loại: Standalone component
- Số variants: 0
- Description: Có

Không có exposed component properties.

#### Chat/Section/Read-List

- Node: `6101:61545`
- Loại: Component set
- Số variants: 6
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Seen by` | VARIANT | 1 | `1`, `2`, `3`, `4`, `5`, `5+` |

#### Chat/Section/Conversation

- Node: `6182:57707`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Conversations` | SLOT | — | — |
| `Side` | VARIANT | Others | `Others`, `You` |

#### Chat/Reaction/Status/No

- Node: `6263:67242`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Emoji-Items` | SLOT | — | — |
| `Counter` | VARIANT | No | `No`, `Yes` |

#### Chat/Reaction/Emoji/Interactive

- Node: `6101:61682`
- Loại: Component set
- Số variants: 18
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `State` | VARIANT | Default | `Default`, `Hover`, `Selected` |
| `Emoji` | VARIANT | Heart | `Angry`, `Heart`, `LOL`, `Like`, `Sad`, `Surprised` |

#### Chat/Reaction/Emoji/Static

- Node: `6263:67248`
- Loại: Component set
- Số variants: 6
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Emoji` | VARIANT | Heart | `Angry`, `Heart`, `LOL`, `Like`, `Sad`, `Surprised` |

#### Chat/Reaction-Bar

- Node: `6182:55704`
- Loại: Standalone component
- Số variants: 0
- Description: Có

Không có exposed component properties.

#### Chat/Avatar-Group

- Node: `6340:46191`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Size` | VARIANT | Medium | `Medium`, `Small` |

#### Chat/Conversation-List/List-Item/Default

- Node: `6331:35340`
- Loại: Standalone component
- Số variants: 0
- Description: Có

Không có exposed component properties.

#### .Chat/Conversation-List/List-Item/Content

- Node: `6331:34480`
- Loại: Component set
- Số variants: 9
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `State` | VARIANT | Text | `Text`, `Audio Missed Call`, `Audio Out-Call`, `Audio In-Call`, `Video Missed Call`, `Ongoing-Call` |
| `Unread` | VARIANT | Yes | `No`, `Yes` |

#### Chat/Conversation/Bubble

- Node: `6349:64085`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Name` | BOOLEAN | false | — |
| `Bubble-Others-Content` | INSTANCE_SWAP | 6328:4725 | 4 preferred instance values |
| `Bubble-You-Content` | INSTANCE_SWAP | 6328:4716 | 4 preferred instance values |
| `Avatar` | BOOLEAN | true | — |
| `Sent` | BOOLEAN | false | — |
| `Side` | VARIANT | Others | `Others`, `You` |
| `Reaction` | VARIANT | No | `No`, `Yes` |

#### Chat/Bubble/Call

- Node: `6349:59813`
- Loại: Component set
- Số variants: 16
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Others-Hover` | BOOLEAN | false | — |
| `You-Hover` | BOOLEAN | false | — |
| `Category` | VARIANT | Social | `Business`, `Social` |
| `Type` | VARIANT | Audio | `Audio`, `Video` |
| `State` | VARIANT | In-Call | `In-Call`, `In-Missed`, `Out-Call`, `Out-Missed` |

#### Chat/Bubble/Focused/Call

- Node: `6182:57953`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Side` | VARIANT | You | `You`, `Others` |

#### Chat/Bubble/File

- Node: `6182:57708`
- Loại: Component set
- Số variants: 8
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Others-Hover` | BOOLEAN | false | — |
| `You-Hover` | BOOLEAN | false | — |
| `Reaction` | BOOLEAN | false | — |
| `Category` | VARIANT | Social | `Social`, `Business` |
| `Type` | VARIANT | Doc | `Doc`, `PDF`, `Sheet`, `Others` |

#### Chat/Bubble/Focused/File

- Node: `6220:59108`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Side` | VARIANT | You | `You`, `Others` |

#### Chat/Bubble/Text-You

- Node: `6349:59476`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Hover` | BOOLEAN | false | — |
| `Reaction` | BOOLEAN | false | — |
| `Domain` | VARIANT | Social | `Social`, `Business` |
| `Device` | VARIANT | Desktop | `Desktop`, `Mobile` |

#### Chat/Bubble/Text-Others

- Node: `6323:1394`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Hover` | BOOLEAN | false | — |
| `Reaction` | BOOLEAN | false | — |
| `Domain` | VARIANT | Social | `Social`, `Business` |
| `Device` | VARIANT | Desktop | `Desktop`, `Mobile` |

#### Chat/Bubble/Focused/Text

- Node: `6182:56277`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Side` | VARIANT | You | `You`, `Others` |

#### Chat/Photo-Container

- Node: `6345:52849`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Count` | TEXT | +1 | — |
| `Has More` | VARIANT | No | `No`, `Yes` |

#### Chat/Photo/Grid-Slot

- Node: `6347:52935`
- Loại: Component set
- Số variants: 8
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Photo` | SLOT | — | — |
| `Device` | VARIANT | Mobile | `Desktop`, `Mobile` |
| `Number` | VARIANT | 2 | `1`, `2`, `3`, `4+` |

#### Chat/Bubble/Photo-You

- Node: `6349:62779`
- Loại: Component set
- Số variants: 8
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Reaction` | BOOLEAN | false | — |
| `Domain` | VARIANT | Social | `Business`, `Social` |
| `Device` | VARIANT | Mobile | `Mobile`, `Desktop` |
| `Hover` | VARIANT | No | `No`, `Yes` |

#### Chat/Bubble/Photo-Others

- Node: `6342:52347`
- Loại: Component set
- Số variants: 8
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Reaction` | BOOLEAN | false | — |
| `Domain` | VARIANT | Social | `Business`, `Social` |
| `Device` | VARIANT | Mobile | `Mobile`, `Desktop` |
| `Hover` | VARIANT | No | `No`, `Yes` |

### ❖ Card

#### Card

- Node: `6643:51021`
- Loại: Component set
- Số variants: 20
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Content` | SLOT | — | — |
| `Sub-Action` | BOOLEAN | true | — |
| `Theme` | VARIANT | Shadow | `Shadow`, `Flat`, `Pale`, `Border`, `Semi-Pale` |
| `Spacing` | VARIANT | Medium | `Medium`, `Small` |
| `Active` | VARIANT | No | `No`, `Yes` |

#### .Demo-Card

- Node: `12266:91556`
- Loại: Standalone component
- Số variants: 0
- Description: Thiếu

Không có exposed component properties.

### ❖ Chart

#### Chart/Chart-Card

- Node: `6643:63528`
- Loại: Standalone component
- Số variants: 0
- Description: Có

Không có exposed component properties.

#### Chart/Line-Chart

- Node: `6643:63324`
- Loại: Standalone component
- Số variants: 0
- Description: Có

Không có exposed component properties.

#### Chart/Stack-Bar-Chart

- Node: `6643:73471`
- Loại: Standalone component
- Số variants: 0
- Description: Có

Không có exposed component properties.

### ❖ Chip/Pill

#### .Chip/Trailing

- Node: `333:82245`
- Loại: Component set
- Số variants: 4
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Select Type` | VARIANT | Single | `Multiple`, `Single` |
| `Size` | VARIANT | Default | `Default`, `Small` |

#### Chip/Normal

- Node: `512:6843`
- Loại: Component set
- Số variants: 108
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Icon-Src` | INSTANCE_SWAP | 1487:4155 | 1577 preferred instance values |
| `Size` | VARIANT | Small | `Medium`, `Small`, `XSmall` |
| `Level` | VARIANT | Secondary | `Primary`, `Secondary` |
| `Theme` | VARIANT | Text-Only | `Text-Only`, `Leading-Icon`, `Leading-Photo` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focused` |
| `Select` | VARIANT | No | `No`, `Yes` |

#### Chip/Advanced

- Node: `512:7659`
- Loại: Component set
- Số variants: 48
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Counter` | BOOLEAN | false | — |
| `Size` | VARIANT | Small | `Medium`, `Small` |
| `Level` | VARIANT | Secondary | `Secondary` |
| `Theme` | VARIANT | Text-Only | `Text-Only`, `Leading-Icon`, `Leading-Photo` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Press`, `Focused`, `Placeholder` |
| `Select` | VARIANT | No | `No`, `Yes` |

#### Chip/Number-Only

- Node: `1536:26687`
- Loại: Component set
- Số variants: 24
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Size` | VARIANT | Small | `Medium`, `Small` |
| `Level` | VARIANT | Secondary | `Primary`, `Secondary` |
| `Theme` | VARIANT | Text-Only | `Text-Only` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focused` |
| `Select` | VARIANT | No | `No`, `Yes` |

### ❖ Checkbox

#### .Primitives/Checkbox/Content

- Node: `309:46789`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Bold` | VARIANT | No | `No`, `Yes` |

#### Checkbox/Mark

- Node: `311:47222`
- Loại: Component set
- Số variants: 12
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Type` | VARIANT | Default | `Default`, `Indeterminate` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focus`, `Disabled` |
| `Select` | VARIANT | No | `No`, `Yes` |

#### Checkbox/Text

- Node: `309:46871`
- Loại: Component set
- Số variants: 16
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Caption` | BOOLEAN | false | — |
| `Content` | SLOT | — | — |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focus`, `Disabled` |
| `Select` | VARIANT | No | `No`, `Yes` |
| `Check-Side` | VARIANT | Left | `Left`, `Right` |

### ❖ Color Selector

#### Color-Selector

- Node: `373:97252`
- Loại: Component set
- Số variants: 6
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Select` | VARIANT | No | `Yes`, `No` |
| `Status` | VARIANT | Default | `Default`, `Focused`, `Hover` |

### ❖ Divider

#### Divider

- Node: `460:38361`
- Loại: Component set
- Số variants: 3
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Color` | VARIANT | Default | `Default`, `Medium`, `High` |

### ❖ Dock Icon

#### Dock-Icon

- Node: `308:45902`
- Loại: Component set
- Số variants: 187
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Icon-Src` | INSTANCE_SWAP | 1460:906 | 3534 preferred instance values |
| `Size` | VARIANT | XLarge | `XLarge`, `Large`, `Medium`, `Small`, `XSmall` |
| `Theme` | VARIANT | Neutral | `Accent`, `Blue`, `Brown`, `Crimson`, `Cyan`, `Green`, `Indigo`, `Neutral`, `Orange`, `Pink`, `Plum`, `Purple`, `Red`, `Teal`, `Violet`, `Yellow`, `On-Color`, `Emoji`, `Golden`, `Inverse`, `Pale` |
| `Background` | VARIANT | Solid | `Solid`, `Subtle` |

### ❖ Date Picker

#### .Primitives/Date-Picker/Header

- Node: `458:34317`
- Loại: Component set
- Số variants: 5
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Next` | BOOLEAN | true | — |
| `Back` | BOOLEAN | true | — |
| `Type` | VARIANT | Interactive | `Interactive`, `Static`, `Display` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focused` |

#### .Primitives/Date-Picker/Time-Picker

- Node: `460:38628`
- Loại: Component set
- Số variants: 2
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Type` | VARIANT | Single | `Range`, `Single` |

#### .Primitives/Date-Picker/Action

- Node: `460:38871`
- Loại: Component set
- Số variants: 2
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Action` | VARIANT | Dual | `Dual`, `Single` |

#### .Primitives/Date-Picker/Calendar

- Node: `478:30561`
- Loại: Component set
- Số variants: 3
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Type` | VARIANT | Single | `Dual`, `Single`, `Select-Month-Year` |

#### .Primitives/Date-Picker/Calendar-Table

- Node: `460:34664`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Row` | VARIANT | 5 Rows | `5 Rows`, `4 Rows` |

#### .Primitives/Date-Picker/Item/Event-List

- Node: `510:36577`
- Loại: Component set
- Số variants: 4
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Number-Event` | VARIANT | 4 | `1`, `2`, `3`, `4` |

#### .Primitives/Date-Picker/Item

- Node: `455:33517`
- Loại: Component set
- Số variants: 32
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Day` | TEXT | 1 | — |
| `Event` | BOOLEAN | false | — |
| `Size` | VARIANT | Medium | `Medium`, `Small` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Single-Selected`, `Single-Selected-Hover`, `Range-Selected-Start`, `Range-Selected-Start-Hover`, `Range-Selected-End`, `Range-Selected-End-Hover`, `In-Range`, `In-Range-Hover`, `Today`, `Today-Hover`, `Blank`, `Weekend`, `Disabled`, `Weekend-Hover` |

#### .Primitives/Mobile-Date-Picker/Item

- Node: `9921:3283`
- Loại: Component set
- Số variants: 16
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Day` | TEXT | 1 | — |
| `Event` | BOOLEAN | false | — |
| `Size` | VARIANT | Medium | `Medium` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Single-Selected`, `Single-Selected-Hover`, `Range-Selected-Start`, `Range-Selected-Start-Hover`, `Range-Selected-End`, `Range-Selected-End-Hover`, `In-Range`, `In-Range-Hover`, `Today`, `Today-Hover`, `Blank`, `Weekend`, `Disabled`, `Weekend-Hover` |

#### .Primitives/Date-Picker

- Node: `9923:2323`
- Loại: Component set
- Số variants: 2
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Action` | BOOLEAN | true | — |
| `Option` | VARIANT | 1 | `1`, `2` |

#### .Primitives/Date-Picker/Footer-Actions

- Node: `9923:2791`
- Loại: Component set
- Số variants: 2
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `State` | VARIANT | Default | `Default`, `Selected Date` |

#### Date-Picker/Dual-Calendar

- Node: `465:41427`
- Loại: Standalone component
- Số variants: 0
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Time-Picker` | BOOLEAN | true | — |
| `Actions` | BOOLEAN | false | — |

#### Date-Picker/Mobile

- Node: `9923:3576`
- Loại: Component set
- Số variants: 3
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Variant` | VARIANT | Single | `Multiple-Selected`, `Single`, `Multiple-Default` |

#### Date-Picker/Single-Calendar

- Node: `895:31954`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Time-Picker` | BOOLEAN | false | — |
| `Actions` | BOOLEAN | false | — |
| `State` | VARIANT | Default | `Select-Month-Year`, `Default` |

### ❖ Empty State

#### Empty-State/Illustration/Placeholder

- Node: `6085:25816`
- Loại: Standalone component
- Số variants: 0
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Icon-Src` | INSTANCE_SWAP | 1480:1749 | 1587 preferred instance values |

#### .Empty-State/CTAs

- Node: `6085:26887`
- Loại: Standalone component
- Số variants: 0
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Primary` | BOOLEAN | true | — |
| `Secondary` | BOOLEAN | true | — |

#### Empty-State

- Node: `6085:25796`
- Loại: Standalone component
- Số variants: 0
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `CTA` | BOOLEAN | true | — |

### ❖ Input

#### .Primitives/Input/Help-Text

- Node: `373:97364`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Character-Limitation` | BOOLEAN | false | — |
| `Icon` | BOOLEAN | true | — |
| `Theme` | VARIANT | Neutral | `Neutral`, `Negative`, `Warning`, `Positive` |

#### Primitives/Input/Input-Conditions/Condition-Item

- Node: `373:97437`
- Loại: Component set
- Số variants: 3
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `State` | VARIANT | Default | `Default`, `Success`, `Wrong` |

#### Input-Conditions

- Node: `373:97663`
- Loại: Component set
- Số variants: 1
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Item-List` | SLOT | — | — |
| `State` | VARIANT | Default | `Default` |

#### .Primitives/Input/Input-Content/Default

- Node: `373:102481`
- Loại: Component set
- Số variants: 15
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Cursor` | BOOLEAN | true | — |
| `Text` | BOOLEAN | true | — |
| `Size` | VARIANT | Medium | `Medium`, `Small`, `Large` |
| `State` | VARIANT | Default | `Default`, `Focused`, `Typing`, `Inputted`, `Disabled` |

#### .Primitives/Input/Cursor

- Node: `373:102260`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Visible` | VARIANT | Yes | `No`, `Yes` |
| `Theme` | VARIANT | Default | `Default`, `Accent` |

#### .Primitives/Input/Leading-Trailing

- Node: `373:101815`
- Loại: Component set
- Số variants: 60
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Text` | TEXT | VN | — |
| `Icon-Src` | INSTANCE_SWAP | 1480:1749 | 1569 preferred instance values |
| `Elements` | SLOT | — | — |
| `Size` | VARIANT | Medium | `Medium`, `Small`, `Large` |
| `Active` | VARIANT | Yes | `Yes`, `No` |
| `Icon` | VARIANT | Yes | `Yes`, `No` |
| `Flag` | VARIANT | No | `No`, `Yes` |
| `Label` | VARIANT | Yes | `Yes`, `No` |
| `Dropdown` | VARIANT | Yes | `Yes`, `No` |

#### .Primitives/Input/Field-Only

- Node: `374:103464`
- Loại: Component set
- Số variants: 36
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Leading` | BOOLEAN | true | — |
| `Trailing` | BOOLEAN | true | — |
| `Clear` | BOOLEAN | false | — |
| `Size` | VARIANT | Medium | `XLarge`, `Large`, `Medium`, `Small` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focused`, `Typing`, `Inputted`, `Read-Only`, `Disabled`, `Inputted-Error`, `Blank-Error` |

#### .Primitives/Input/Text-Area

- Node: `421:9077`
- Loại: Component set
- Số variants: 27
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Leading` | BOOLEAN | true | — |
| `Trailing` | BOOLEAN | true | — |
| `Size` | VARIANT | Medium | `Large`, `Medium`, `Small` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focused`, `Typing`, `Inputted`, `Read-Only`, `Disabled`, `Inputted-Error`, `Blank-Error` |

#### Primitives/Input/Label

- Node: `387:3651`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Optional` | BOOLEAN | false | — |
| `Tooltip-Icon` | BOOLEAN | false | — |
| `Action` | BOOLEAN | false | — |
| `Label` | TEXT | Label | — |
| `State` | VARIANT | Default | `Disabled`, `Default` |

#### .Primitives/Input/Number/Trailing

- Node: `421:14521`
- Loại: Standalone component
- Số variants: 0
- Description: Có

Không có exposed component properties.

#### .Primitives/Rich-Text/Editor-Bar

- Node: `6385:36476`
- Loại: Standalone component
- Số variants: 0
- Description: Thiếu

Không có exposed component properties.

#### Control-Bar/Select-Item

- Node: `9021:27379`
- Loại: Component set
- Số variants: 9
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Icon-Src` | INSTANCE_SWAP | 1486:1945 | 1598 preferred instance values |
| `Theme` | VARIANT | Subtle | `Subtle`, `Solid`, `Inverse` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Selected` |

#### Input/Date-Field

- Node: `421:8388`
- Loại: Component set
- Số variants: 36
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Help-Text` | BOOLEAN | false | — |
| `Label` | BOOLEAN | true | — |
| `Size` | VARIANT | Medium (Base) | `Small`, `Medium (Base)`, `Large`, `XLarge` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focused`, `Typing`, `Inputted`, `Read-Only`, `Disabled`, `Inputted-Error`, `Blank-Error` |

#### Input/Select-Field

- Node: `421:7303`
- Loại: Component set
- Số variants: 36
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Help-Text` | BOOLEAN | false | — |
| `Label` | BOOLEAN | true | — |
| `Size` | VARIANT | Medium (Base) | `Small`, `Medium (Base)`, `Large`, `XLarge` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focused`, `Typing`, `Inputted`, `Read-Only`, `Disabled`, `Inputted-Error`, `Blank-Error` |

#### Input/Heading

- Node: `694:13062`
- Loại: Component set
- Số variants: 21
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Status` | VARIANT | Default | `Default`, `Hover`, `Focus`, `Typing`, `Inputted-Single-Line`, `Inputted-Multi-Line`, `Inputted-Hover` |
| `Size` | VARIANT | H3 | `H1`, `H2`, `H3` |

#### Input/Richtext

- Node: `6385:17480`
- Loại: Standalone component
- Số variants: 0
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Control-Bar` | BOOLEAN | true | — |

#### Input/Autocomplete-Field

- Node: `1241:5616`
- Loại: Component set
- Số variants: 7
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Help-Text` | BOOLEAN | false | — |
| `State` | VARIANT | Default | `Default`, `Focused`, `Inputted`, `Inputted-Focused`, `Inputted-Error`, `Blank-Error`, `View-Only` |

#### Input/Number-Align-Center

- Node: `450:7900`
- Loại: Component set
- Số variants: 36
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Help-Text` | BOOLEAN | false | — |
| `Label` | BOOLEAN | true | — |
| `Size` | VARIANT | Medium (Base) | `Small`, `Medium (Base)`, `Large`, `XLarge` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focused`, `Typing`, `Inputted`, `Read-Only`, `Disabled`, `Inputted-Error`, `Blank-Error` |

#### Input/Number-Align-Left

- Node: `421:10057`
- Loại: Component set
- Số variants: 36
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Help-Text` | BOOLEAN | false | — |
| `Label` | BOOLEAN | true | — |
| `Size` | VARIANT | Medium (Base) | `Small`, `Medium (Base)`, `Large`, `XLarge` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focused`, `Typing`, `Inputted`, `Read-Only`, `Disabled`, `Inputted-Error`, `Blank-Error` |

#### Input/Text-Area

- Node: `450:7027`
- Loại: Component set
- Số variants: 27
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Help-Text` | BOOLEAN | false | — |
| `Label` | BOOLEAN | true | — |
| `Size` | VARIANT | Medium (Base) | `Small`, `Medium (Base)`, `Large` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focused`, `Typing`, `Inputted`, `Read-Only`, `Disabled`, `Inputted-Error`, `Blank-Error` |

#### Input/Text-Field

- Node: `421:4108`
- Loại: Component set
- Số variants: 36
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Help-Text` | BOOLEAN | false | — |
| `Label` | BOOLEAN | true | — |
| `Size` | VARIANT | Medium (Base) | `Small`, `Medium (Base)`, `Large`, `XLarge` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focused`, `Typing`, `Inputted`, `Read-Only`, `Disabled`, `Inputted-Error`, `Blank-Error` |

### ❖ Inline Message

#### Inline-Message

- Node: `595:54857`
- Loại: Component set
- Số variants: 6
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Action` | BOOLEAN | false | — |
| `Close` | BOOLEAN | true | — |
| `Caption` | BOOLEAN | true | — |
| `Title` | BOOLEAN | true | — |
| `Visual` | SLOT | — | — |
| `Content` | SLOT | — | — |
| `Theme` | VARIANT | Neutral | `Neutral`, `Info`, `Positive`, `Warning`, `Negative`, `Custom` |

### ❖ List-Item

#### .Primitives/List-Item/Mobile/Slot/Avatar

- Node: `4080:11452`
- Loại: Standalone component
- Số variants: 0
- Description: Có

Không có exposed component properties.

#### .Primitives/List-Item/Mobile/Slot-Actions

- Node: `4080:11386`
- Loại: Component set
- Số variants: 1
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Actions` | SLOT | — | — |
| `Position` | VARIANT | Trailing | `Trailing` |

#### .Primitives/List-Item/Mobile/Slot/Info-Content

- Node: `4080:12971`
- Loại: Standalone component
- Số variants: 0
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Content` | SLOT | — | — |

#### List-Item

- Node: `4080:11700`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Trailing` | BOOLEAN | true | — |
| `Contents` | SLOT | — | — |
| `Leading` | BOOLEAN | true | — |
| `State` | VARIANT | Default | `Default`, `Hover`, `Pressed`, `Selected` |

### ❖ Modal & Dialog

#### .Primitives/Modal/Actions

- Node: `694:9383`
- Loại: Component set
- Số variants: 6
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Direction` | VARIANT | Horizontal | `Horizontal`, `Vertical` |
| `Button` | VARIANT | Dual | `Dual`, `Single`, `Triple` |

#### .Primitives/Modal/Header

- Node: `1573:1301`
- Loại: Standalone component
- Số variants: 0
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Close-Button` | BOOLEAN | true | — |
| `Caption` | BOOLEAN | true | — |
| `Icon` | BOOLEAN | false | — |
| `Contents` | SLOT | — | — |

#### Overlay

- Node: `1248:1393`
- Loại: Component set
- Số variants: 1
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Device` | VARIANT | Desktop | `Desktop` |

#### Modal/Forms

- Node: `841:17182`
- Loại: Component set
- Số variants: 5
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Main-Contents` | SLOT | — | — |
| `Side-Content` | SLOT | — | — |
| `Caption` | BOOLEAN | true | — |
| `Top-Custom-Slot` | SLOT | — | — |
| `Top-Customize` | BOOLEAN | false | — |
| `Close` | BOOLEAN | true | — |
| `Default-Header` | BOOLEAN | true | — |
| `Layout` | VARIANT | Basic | `Basic`, `1-3`, `Half-Half`, `3-4`, `Big` |

#### Modal/Dialog

- Node: `841:17177`
- Loại: Component set
- Số variants: 10
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Caption` | BOOLEAN | true | — |
| `Custom` | BOOLEAN | false | — |
| `Modal-Icon` | BOOLEAN | true | — |
| `Theme` | VARIANT | Default | `Default`, `Info`, `Positive`, `Warning`, `Negative` |
| `Device` | VARIANT | Desktop | `Desktop`, `Mobile` |

### ❖ Metric Widget (Dashboard)

#### .Primitives/Metrics/Metric-Visual/Placeholder

- Node: `595:55399`
- Loại: Standalone component
- Số variants: 0
- Description: Thiếu

Không có exposed component properties.

#### .Primitives/Metrics/Metric-Trend

- Node: `595:55134`
- Loại: Component set
- Số variants: 3
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Trend` | VARIANT | Normal | `Normal`, `Positive`, `Negative` |

#### Primitives/Metric/Metric-Inline/Icon-Highlight

- Node: `595:55188`
- Loại: Component set
- Số variants: 5
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Trend` | BOOLEAN | true | — |
| `Metric-Color` | BOOLEAN | false | — |
| `Metric-Title` | BOOLEAN | true | — |
| `Counter` | BOOLEAN | false | — |
| `Dock-Icon` | BOOLEAN | true | — |
| `Size` | VARIANT | XLarge | `XLarge`, `Large`, `Medium`, `Small`, `XSmall` |

#### Primitives/Metric/Metric-Inline/Title-Highlight

- Node: `7523:507049`
- Loại: Component set
- Số variants: 5
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Trend` | BOOLEAN | true | — |
| `Metric-Color` | BOOLEAN | false | — |
| `Metric-Title` | BOOLEAN | true | — |
| `Dock-Icon` | BOOLEAN | true | — |
| `Action` | BOOLEAN | false | — |
| `Hint` | BOOLEAN | false | — |
| `Label-Icon` | BOOLEAN | false | — |
| `Size` | VARIANT | XLarge | `XLarge`, `Large`, `Medium`, `Small`, `XSmall` |

#### Metric-Card

- Node: `6643:64008`
- Loại: Component set
- Số variants: 1
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Level` | VARIANT | Master | `Master` |

### ❖ Popover

#### .Primitives/Popover/Label

- Node: `846:36605`
- Loại: Standalone component
- Số variants: 0
- Description: Thiếu

Không có exposed component properties.

#### .Primitives/Popover/Search

- Node: `846:38183`
- Loại: Standalone component
- Số variants: 0
- Description: Thiếu

Không có exposed component properties.

#### .Primitives/Popover/Item/Content

- Node: `829:20006`
- Loại: Component set
- Số variants: 9
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Caption` | BOOLEAN | false | — |
| `Icon-Src` | INSTANCE_SWAP | 1486:1948 | 1569 preferred instance values |
| `Theme` | VARIANT | Icon | `--`, `Icon`, `Photo Small`, `Badge`, `Avatar Small`, `Avatar Big`, `Photo Big`, `Dock Icon` |
| `Function` | VARIANT | Default | `Default`, `Manual-Add-New` |

#### Primitives/Popover/Item

- Node: `4031:26009`
- Loại: Component set
- Số variants: 3
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Trailing` | BOOLEAN | false | — |
| `Content` | SLOT | — | — |
| `Select-Control` | VARIANT | No | `No` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Single-Selected` |

#### Scroll-Bar

- Node: `1070:17556`
- Loại: Standalone component
- Số variants: 0
- Description: Có

Không có exposed component properties.

#### Popover/Default

- Node: `4031:26126`
- Loại: Standalone component
- Số variants: 0
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Item-List` | SLOT | — | — |
| `Search` | BOOLEAN | false | — |
| `Label` | BOOLEAN | false | — |
| `Scroll-Bar` | BOOLEAN | false | — |

#### Popover/Bunk-Action

- Node: `9021:28726`
- Loại: Component set
- Số variants: 1
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Item-List` | SLOT | — | — |
| `Theme` | VARIANT | Default | `Default` |

#### Popover/Manual-Add-New

- Node: `4031:27929`
- Loại: Standalone component
- Số variants: 0
- Description: Có

Không có exposed component properties.

### ❖ Progress

#### Progress-Bar

- Node: `1536:260`
- Loại: Component set
- Số variants: 15
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Text` | TEXT | Label | — |
| `Label` | BOOLEAN | true | — |
| `Theme` | VARIANT | Neutral | `Accent`, `Neutral`, `Status` |
| `Progress` | VARIANT | Done | `None`, `Low`, `Medium`, `Good`, `Done` |

#### Progress-Circle/Icon

- Node: `6915:62964`
- Loại: Component set
- Số variants: 14
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Done` | VARIANT | No | `No`, `Yes` |
| `Theme` | VARIANT | Red | `Neutral`, `Accent`, `Red`, `Orange`, `Yellow`, `Green`, `Blue` |

#### Progress-Circle

- Node: `1531:13954`
- Loại: Component set
- Số variants: 1
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Label` | BOOLEAN | true | — |
| `Text` | TEXT | Label | — |
| `Size` | VARIANT | Medium | `Medium` |

### ❖ Pagination

#### .Primitives/Pagination/Item

- Node: `774:15999`
- Loại: Component set
- Số variants: 12
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Page Number` | TEXT | 1 | — |
| `Size` | VARIANT | XSmall | `XSmall`, `Small` |
| `Level` | VARIANT | Primary | `Primary`, `Secondary` |
| `Select` | VARIANT | No | `No`, `Yes` |
| `State` | VARIANT | Default | `Default`, `Hover` |

#### Pagination

- Node: `774:29083`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Theme` | VARIANT | Primary | `Primary`, `Secondary`, `Inline`, `Manually` |

### ❖ Rating

#### .Primitives/Rating/Emoji

- Node: `1536:25693`
- Loại: Component set
- Số variants: 5
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Type` | VARIANT | Emoji | `Emoji` |
| `Emotion` | VARIANT | Very Disappointed | `Very Disappointed`, `Disappointed`, `Neutral`, `Happy`, `Very Happy` |

#### .Primitives/Rating/Opinion item

- Node: `1536:25714`
- Loại: Component set
- Số variants: 3
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `State` | VARIANT | Default | `Default`, `Hover`, `Selected` |

#### Rating/Star

- Node: `1536:26008`
- Loại: Component set
- Số variants: 90
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Rating` | VARIANT | None | `None`, `1.0`, `2.0`, `3.0`, `4.0`, `5.0` |
| `Size` | VARIANT | XLarge | `XSmall`, `Small`, `Medium`, `Large`, `XLarge` |
| `Theme` | VARIANT | Default | `Default`, `Neutral`, `Accent` |

#### Rating-Display

- Node: `9818:5582`
- Loại: Component set
- Số variants: 15
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Size` | VARIANT | XLarge | `XLarge`, `Large`, `Medium`, `Small`, `XSmall` |
| `Theme` | VARIANT | Neutral | `Neutral`, `Default`, `Accent` |

#### Rating/Opinion-Scale

- Node: `1536:25762`
- Loại: Component set
- Số variants: 3
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Scale` | VARIANT | 2 | `2`, `3`, `5` |
| `Type` | VARIANT | Emoji | `Emoji` |

#### Rating/NPS-Scale

- Node: `1536:26034`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Top criteria` | TEXT | Very happy | — |
| `Bottom criteria` | TEXT | Very disappointed | — |
| `Scale` | VARIANT | 5 | `5`, `10` |

### ❖ Radio Button

#### .Primitives/Radio-Button/Content

- Node: `373:96322`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Caption` | BOOLEAN | false | — |
| `Bold` | VARIANT | No | `No`, `Yes` |

#### Radio-Button/Radio-Mark

- Node: `373:96225`
- Loại: Component set
- Số variants: 8
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `State` | VARIANT | Default | `Default`, `Hover`, `Focus`, `Disabled` |
| `Select` | VARIANT | No | `No`, `Yes` |

#### Radio-Button/Radio-Button

- Node: `373:96272`
- Loại: Component set
- Số variants: 16
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Content` | SLOT | — | — |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focus`, `Disabled` |
| `Select` | VARIANT | No | `No`, `Yes` |
| `Radio-Side` | VARIANT | Left | `Left`, `Right` |

### ❖ Search

#### Search/Default

- Node: `846:37624`
- Loại: Component set
- Số variants: 60
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Size` | VARIANT | Small | `Medium`, `Small` |
| `Theme` | VARIANT | Default | `Default`, `Filter-Icon`, `Filter-Dropdown` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focused`, `Typing`, `Inputted` |
| `Icon-Search` | VARIANT | Yes | `Yes`, `No` |

#### Search/Popover

- Node: `1604:27401`
- Loại: Component set
- Số variants: 30
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Theme` | VARIANT | Default | `Default`, `Filter-Icon`, `Filter-Dropdown` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focused`, `Typing`, `Inputted` |
| `Icon-Search` | VARIANT | Yes | `Yes`, `No` |

### ❖ Slider

#### .Primitives/Slider/Slide-Dot/Basic/Default

- Node: `6455:2135`
- Loại: Component set
- Số variants: 32
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Tooltip` | BOOLEAN | false | — |
| `Size` | VARIANT | Small | `Small`, `Medium`, `Large` |
| `Style` | VARIANT | Neutral | `Neutral`, `Accent`, `White` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Hold`, `Disabled` |

#### Slider/Horizontal

- Node: `4010:35946`
- Loại: Component set
- Số variants: 32
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Value` | BOOLEAN | false | — |
| `Range-Line` | BOOLEAN | false | — |
| `Leading-Dot` | BOOLEAN | false | — |
| `Icon` | BOOLEAN | true | — |
| `Icon-Src` | INSTANCE_SWAP | 1486:1944 | 1577 preferred instance values |
| `Theme` | VARIANT | Neutral | `Neutral`, `Accent`, `White` |
| `Size` | VARIANT | Small | `Small`, `Medium`, `Large` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Hold`, `Disabled` |

### ❖ Sidebar

#### .Primitives/Sidebar/LOGO

- Node: `4081:14937`
- Loại: Component set
- Số variants: 2
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `State` | VARIANT | Default | `Default`, `Minimize` |

#### Primitives/Sidebar/Menu-Item/Section-Title

- Node: `6044:81281`
- Loại: Component set
- Số variants: 4
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Action-Slot` | SLOT | — | — |
| `Actions` | BOOLEAN | false | — |
| `State` | VARIANT | Default | `Default`, `Hover` |
| `Density` | VARIANT | Medium | `Medium`, `Small` |

#### Side-Bar/Master/Small-Density

- Node: `5974:20590`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Header-Content` | SLOT | — | — |
| `Body-Content` | SLOT | — | — |
| `Footer-Content` | SLOT | — | — |
| `Sub-Item` | SLOT | — | — |
| `Sub-Menu` | BOOLEAN | false | — |
| `Expand` | VARIANT | Yes | `No`, `Yes` |

#### Side-Bar/Master/Workspace

- Node: `4218:9166`
- Loại: Component set
- Số variants: 3
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Child-Header-Content` | SLOT | — | — |
| `Child-Body-Content` | SLOT | — | — |
| `Child-Footer-Content` | SLOT | — | — |
| `Master-Body-Content` | SLOT | — | — |
| `Master-Header-Content` | SLOT | — | — |
| `Sub-Menu` | BOOLEAN | false | — |
| `Workspace-bar` | BOOLEAN | true | — |
| `Expanded` | VARIANT | Yes | `Yes` |
| `Master-Background` | VARIANT | Flat | `Flat`, `Default`, `Inverse` |

#### Side-Bar/Master/Basic

- Node: `4081:15234`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Header-Content` | SLOT | — | — |
| `Body-Content` | SLOT | — | — |
| `Footer-Content` | SLOT | — | — |
| `Sub-Item` | SLOT | — | — |
| `Sub-Menu` | BOOLEAN | false | — |
| `Expand` | VARIANT | Yes | `No`, `Yes` |

#### Primitives/Side-Bar/Menu-Item/Master

- Node: `1536:27473`
- Loại: Component set
- Số variants: 48
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Counter` | BOOLEAN | false | — |
| `Dropdown` | BOOLEAN | false | — |
| `Label` | BOOLEAN | true | — |
| `Icon` | BOOLEAN | true | — |
| `Icon-Src` | INSTANCE_SWAP | 1460:877 | 1586 preferred instance values |
| `Noti-Dot` | BOOLEAN | false | — |
| `Trailing-Action` | BOOLEAN | false | — |
| `Trailing-Slot` | SLOT | — | — |
| `Density` | VARIANT | Medium | `Medium`, `Small` |
| `Level` | VARIANT | Master | `Master`, `Child` |
| `Theme` | VARIANT | Neutral | `Neutral`, `Accent` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focus`, `Disabled` |
| `Select` | VARIANT | No | `No`, `Yes` |

### ❖ Stepper

#### .Primitives/Stepper/Item

- Node: `1625:4827`
- Loại: Component set
- Số variants: 8
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Icon-Src` | INSTANCE_SWAP | 1460:872 | 1577 preferred instance values |
| `State` | VARIANT | Default | `Default`, `Focused`, `Passed`, `Error` |
| `Style` | VARIANT | Text | `Text`, `Icon` |

#### .Primitives/Stepper/Step-Horizontal

- Node: `1625:8089`
- Loại: Component set
- Số variants: 12
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Caption` | BOOLEAN | true | — |
| `Contents` | SLOT | — | — |
| `Position` | VARIANT | First | `First`, `Middle`, `Last` |
| `State` | VARIANT | Default | `Default`, `Focused`, `Passed`, `Error` |

#### .Primitives/Stepper/Step-Vertical

- Node: `4034:11389`
- Loại: Component set
- Số variants: 12
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Caption` | BOOLEAN | true | — |
| `Contents` | SLOT | — | — |
| `Position` | VARIANT | First | `First`, `Middle`, `Last` |
| `State` | VARIANT | Default | `Default`, `Focused`, `Passed`, `Error` |

#### Stepper-Bar/Vertical

- Node: `1625:8656`
- Loại: Component set
- Số variants: 1
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Items` | SLOT | — | — |
| `Variant` | VARIANT | Default | `Default` |

#### Stepper-Bar/Horizontal

- Node: `1625:8328`
- Loại: Component set
- Số variants: 1
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Items` | SLOT | — | — |
| `Variant` | VARIANT | Default | `Default` |

### ❖ Skeleton

#### Skeleton/Body-Text

- Node: `1556:17566`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `No. of line` | VARIANT | 1 | `1`, `2`, `3`, `5` |

#### Skeleton/Heading-Text

- Node: `1556:17593`
- Loại: Component set
- Số variants: 3
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Size` | VARIANT | Large | `Large`, `Medium`, `Small` |

#### Skeleton/Shapes

- Node: `1556:17525`
- Loại: Component set
- Số variants: 20
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Shape` | VARIANT | Round | `Pill`, `Round`, `Square`, `Rectangle` |
| `Size` | VARIANT | Large - 48px | `Large - 48px`, `Medium - 40px`, `Small - 32px`, `XSmall`, `2XSmall` |

### ❖ Segmented

#### Primitives/Segmented/Item

- Node: `1204:11690`
- Loại: Component set
- Số variants: 16
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Icon` | BOOLEAN | true | — |
| `Label` | BOOLEAN | true | — |
| `Icon-Src` | INSTANCE_SWAP | 1487:4155 | 1569 preferred instance values |
| `Badge` | BOOLEAN | false | — |
| `Size` | VARIANT | Small | `Medium`, `Small` |
| `Level` | VARIANT | Primary | `Primary`, `Secondary` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focused` |
| `Select` | VARIANT | No | `No`, `Yes` |

#### Segmented

- Node: `1238:892`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Item-List` | SLOT | — | — |
| `Level` | VARIANT | Secondary | `Secondary`, `Primary` |

### ❖ Side Panel / Side Sheet

#### Side-Panel

- Node: `1573:3128`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Contents` | SLOT | — | — |
| `Type` | VARIANT | Standard | `Modal`, `Standard` |
| `Size` | VARIANT | Small | `Default`, `Small` |

### ❖ Tab

#### Primitives/Tab-Item

- Node: `1576:2090`
- Loại: Component set
- Số variants: 48
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Icon-Src` | INSTANCE_SWAP | 1460:906 | 1577 preferred instance values |
| `Text` | TEXT | Label | — |
| `Badge` | BOOLEAN | false | — |
| `Size` | VARIANT | Medium | `Medium`, `Small` |
| `Style` | VARIANT | Indicator | `Indicator`, `Subtle` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Disabled` |
| `Select` | VARIANT | No | `No`, `Yes` |
| `Label` | VARIANT | True | `True`, `False` |
| `Icon` | VARIANT | False | `True`, `False` |

#### Tab-Bar

- Node: `1577:5477`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Item-List` | SLOT | — | — |
| `Style` | VARIANT | Indicator | `Indicator`, `Subtle` |

### ❖ Tag

#### Tag

- Node: `288:32046`
- Loại: Component set
- Số variants: 30
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Icon-Src` | INSTANCE_SWAP | 1487:4155 | 1569 preferred instance values |
| `Label` | BOOLEAN | true | — |
| `Theme` | VARIANT | Text-Only | `Text-Only`, `Leading-Photo`, `Leading-Icon` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focused`, `Error`, `Disabled` |
| `Remove` | VARIANT | No | `No`, `Yes` |

### ❖ Table

#### Primitives/Table/Data-Row

- Node: `4035:10629`
- Loại: Standalone component
- Số variants: 0
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Columns` | SLOT | — | — |

#### Primitives/Table/Header

- Node: `4035:11561`
- Loại: Standalone component
- Số variants: 0
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Columns` | SLOT | — | — |

#### Table/Cell/Header

- Node: `1604:12968`
- Loại: Component set
- Số variants: 14
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `✏️ Label` | TEXT | Title | — |
| `Label` | BOOLEAN | true | — |
| `Slot` | SLOT | — | — |
| `Icon` | BOOLEAN | true | — |
| `State` | VARIANT | Default | `Default`, `Hover` |
| `Type` | VARIANT | None | `None`, `Sort`, `Checkbox`, `Custom` |
| `Align` | VARIANT | Left | `Left`, `Right` |

#### Primitives/Table/Cell/Avatar-Cell

- Node: `1603:2869`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Bold` | VARIANT | No | `No`, `Yes` |
| `Caption` | VARIANT | No | `No`, `Yes` |

#### Primitives/Table/Cell/Photo-Cell

- Node: `1603:4668`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Bold` | VARIANT | No | `No`, `Yes` |
| `Caption` | VARIANT | No | `No`, `Yes` |

#### Primitives/Table/Cell/Basic-Icon-Cell

- Node: `1603:4727`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Bold` | VARIANT | No | `No`, `Yes` |
| `Caption` | VARIANT | No | `No`, `Yes` |

#### Primitives/Table/Cell/Dock-Icon-Cell

- Node: `1603:5099`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Bold` | VARIANT | No | `No`, `Yes` |
| `Caption` | VARIANT | No | `No`, `Yes` |

#### Primitives/Table/Cell/Text-Cell

- Node: `1603:3247`
- Loại: Component set
- Số variants: 2
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Caption` | BOOLEAN | false | — |
| `Bold` | VARIANT | No | `Yes`, `No` |

#### Primitives/Table/Cell/Progress-Cell

- Node: `4081:19726`
- Loại: Component set
- Số variants: 1
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `State` | VARIANT | Default | `Default` |

#### Primitives/Table/Cell/Badge-Cell

- Node: `1603:6158`
- Loại: Component set
- Số variants: 1
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Items` | SLOT | — | — |
| `Variant` | VARIANT | Default | `Default` |

#### Primitives/Table/Cell/Tag-Cell

- Node: `1603:23304`
- Loại: Component set
- Số variants: 1
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Items` | SLOT | — | — |
| `Variant` | VARIANT | Default | `Default` |

#### Primitives/Table/Cell/Trend-Cell

- Node: `1603:14279`
- Loại: Component set
- Số variants: 3
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Trend` | VARIANT | Up | `Down`, `Up`, `Neutral` |

#### Primitives/Table/Cell/Control-Cell

- Node: `1603:14284`
- Loại: Component set
- Số variants: 3
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Type` | VARIANT | Toggle | `Checkbox`, `Radio-Button`, `Toggle` |

#### Primitives/Table/Cell/Actions-Cell

- Node: `1603:14291`
- Loại: Component set
- Số variants: 1
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Actions` | SLOT | — | — |
| `Type` | VARIANT | Icon Button | `Icon Button` |

#### Primitives/Table/Cell/Group-Avatar-Cell

- Node: `1603:14300`
- Loại: Standalone component
- Số variants: 0
- Description: Có

Không có exposed component properties.

#### Primitives/Table/Cell/Editabled-Cell

- Node: `1603:23274`
- Loại: Standalone component
- Số variants: 0
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Data` | BOOLEAN | false | — |

#### Table/Cell/Default

- Node: `1603:23604`
- Loại: Component set
- Số variants: 10
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Open-Button` | BOOLEAN | false | — |
| `Content` | SLOT | — | — |
| `State` | VARIANT | Default | `Default`, `Hover`, `Focused`, `Edit`, `Selected` |
| `Align` | VARIANT | Left | `Left`, `Right` |

### ❖ Toggle

#### Toggle

- Node: `1526:5703`
- Loại: Component set
- Số variants: 24
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Size` | VARIANT | Small | `Small`, `Medium`, `Large` |
| `State` | VARIANT | Default | `Default`, `Disabled` |
| `Select` | VARIANT | No | `No`, `Yes` |
| `Theme` | VARIANT | Text-First | `Text-First`, `Toggle-First` |

#### Toggle-Button

- Node: `1523:104`
- Loại: Component set
- Số variants: 12
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Size` | VARIANT | Medium | `Large`, `Medium`, `Small` |
| `State` | VARIANT | Default | `Default`, `Disabled` |
| `Select` | VARIANT | No | `Yes`, `No` |

#### .Primitives/Toggle/Content

- Node: `1526:5945`
- Loại: Component set
- Số variants: 4
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Caption` | BOOLEAN | true | — |
| `State` | VARIANT | Default | `Default`, `Disabled` |
| `Bold` | VARIANT | No | `No`, `Yes` |

### ❖ Tooltip

#### .Primitives/Tooltip/Content/Simple-Label

- Node: `2335:9623`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Contents` | SLOT | — | — |
| `Text` | TEXT | Tooltip placeholder | — |
| `Theme` | VARIANT | On-Black-Overlay | `On-Accent`, `On-Black-Overlay`, `On-White-Overlay`, `On-Neutral` |

#### Tooltip

- Node: `1595:2220`
- Loại: Component set
- Số variants: 8
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Slot` | SLOT | — | — |
| `Color` | VARIANT | Default | `Default`, `Accent`, `White Overlay`, `Black-Overlay` |
| `Size` | VARIANT | Small | `Medium`, `Small` |

### ❖ Toast-Message (Snack)

#### Toast-Message

- Node: `1579:13276`
- Loại: Component set
- Số variants: 6
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Actions` | BOOLEAN | true | — |
| `Title-Text` | TEXT | Title here | — |
| `Caption-Text` | TEXT | Description text is here | — |
| `Title` | BOOLEAN | true | — |
| `Caption` | BOOLEAN | true | — |
| `Close` | BOOLEAN | true | — |
| `Type` | VARIANT | Neutral | `Neutral`, `Subtle`, `Info`, `Positive`, `Warning`, `Negative` |

### ❖ Uploader

#### Primitives/Uploader/File-Item

- Node: `1581:22739`
- Loại: Component set
- Số variants: 24
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `✏️ Name` | TEXT | Name | — |
| `✏️ Size` | TEXT | 1,2MB | — |
| `✏️ Additional Caption` | TEXT | 7 seconds left | — |
| `Theme` | VARIANT | Default | `Default`, `Overlay` |
| `State` | VARIANT | Uploading | `Uploading`, `Uploaded`, `Replaceable`, `Alert` |
| `Thumbnail` | VARIANT | None | `None`, `File`, `Photo` |

#### Primitives/Uploader/DragDrop-Field

- Node: `1581:22873`
- Loại: Component set
- Số variants: 10
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Icon` | BOOLEAN | true | — |
| `Caption` | BOOLEAN | true | — |
| `✏️ Text` | TEXT | Drag & Drop or Choose file to upload | — |
| `✏️ Caption` | TEXT | JPG, GIF or PNG. Max size of 800K | — |
| `Extended` | VARIANT | No | `No`, `Yes` |
| `State` | VARIANT | Normal | `Normal`, `Hover`, `Dragover`, `Focus`, `Alert` |

#### Uploader/File-Upload

- Node: `1581:22708`
- Loại: Component set
- Số variants: 6
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `hasLabel` | BOOLEAN | true | — |
| `hasHelperText` | BOOLEAN | true | — |
| `Type` | VARIANT | Drag & Drop | `Drag & Drop`, `Browse Button` |
| `State` | VARIANT | Default | `Default`, `Uploaded` |
| `File List` | VARIANT | None | `None`, `Single File`, `Multiple Files` |

### ❖ Top-Navigations (Mobile)

#### Top-Navigation/Mobile

- Node: `12014:45167`
- Loại: Component set
- Số variants: 20
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Expand-Heading` | BOOLEAN | true | — |
| `Top-bar` | BOOLEAN | true | — |
| `Top-Trailing` | BOOLEAN | true | — |
| `Expand-Trailing` | BOOLEAN | true | — |
| `Control-Slot` | SLOT | — | — |
| `Control-Bar` | BOOLEAN | false | — |
| `Top-Heading-Text` | BOOLEAN | true | — |
| `Status-Bar` | BOOLEAN | true | — |
| `Device` | VARIANT | Mobile | `Mobile` |
| `Margin` | VARIANT | Comfortable | `Comfortable`, `Compact` |
| `Type` | VARIANT | Default | `Default`, `Alt`, `Default-Bluring`, `Alt-Bluring`, `Default-Overlay`, `Liquid Glass`, `Liquid-Overaly`, `Compact`, `Compact-Alt`, `Compact-Overlay` |

#### .Primitives/Heading-Text/Basic

- Node: `4060:17984`
- Loại: Component set
- Số variants: 4
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Subheading` | BOOLEAN | false | — |
| `Header` | BOOLEAN | true | — |
| `Dropdown` | BOOLEAN | false | — |
| `Capline` | BOOLEAN | false | — |
| `Badges` | BOOLEAN | false | — |
| `Leading` | BOOLEAN | false | — |
| `Leading-Swap` | INSTANCE_SWAP | 223:9030 | 3 preferred instance values |
| `Type` | VARIANT | H1 | `H1`, `H2`, `H3`, `Sub` |

#### Nav-Action/Icon-Flat

- Node: `6085:32944`
- Loại: Component set
- Số variants: 10
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Icon-Src` | INSTANCE_SWAP | 1460:1087 | 1569 preferred instance values |
| `Level` | VARIANT | Primary | `Primary`, `Accent` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Pressed`, `Focused`, `Disabled` |

#### Nav-Action/Icon-Overlay

- Node: `6085:33284`
- Loại: Component set
- Số variants: 25
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Leading-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 3163 preferred instance values |
| `Trailing-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 1594 preferred instance values |
| `Trailing-Icon` | BOOLEAN | false | — |
| `Level` | VARIANT | Inverse | `Inverse`, `White`, `White Overlay`, `Black Overlay`, `Flat Overlay` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Pressed`, `Focused`, `Disabled` |

#### Nav-Action/Liquid-Glass

- Node: `12015:46174`
- Loại: Component set
- Số variants: 20
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Leading-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 3163 preferred instance values |
| `Trailing-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 1594 preferred instance values |
| `Trailing-Icon` | BOOLEAN | false | — |
| `Level` | VARIANT | Secondary | `Secondary`, `Black Overlay`, `Primary`, `Accent` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Pressed`, `Focused`, `Disabled` |

#### Nav-Action/Icon-Main

- Node: `6085:33688`
- Loại: Component set
- Số variants: 25
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Leading-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 3163 preferred instance values |
| `Trailing-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 1594 preferred instance values |
| `Trailing-Icon` | BOOLEAN | false | — |
| `Level` | VARIANT | Primary | `Primary`, `Accent`, `Tertiary`, `Danger`, `Positive` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Pressed`, `Focused`, `Disabled` |

#### Nav-Action/Overlay

- Node: `6085:34806`
- Loại: Component set
- Số variants: 20
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Leading-Icon` | BOOLEAN | false | — |
| `Trailing-Icon` | BOOLEAN | false | — |
| `Text` | TEXT | Button | — |
| `Trailing-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 1569 preferred instance values |
| `Leading-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 1569 preferred instance values |
| `Level` | VARIANT | Inverse | `Inverse`, `White`, `White Overlay`, `Black Overlay` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Pressed`, `Focused`, `Disabled` |

#### Nav-Action/Liquid-Glass

- Node: `12015:46049`
- Loại: Component set
- Số variants: 20
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Leading-Icon` | BOOLEAN | false | — |
| `Trailing-Icon` | BOOLEAN | false | — |
| `Text` | TEXT | Button | — |
| `Trailing-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 1569 preferred instance values |
| `Leading-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 1569 preferred instance values |
| `Level` | VARIANT | Secondary | `Secondary`, `Black Overlay`, `Primary`, `Accent` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Pressed`, `Focused`, `Disabled` |

#### Nav-Action/Main

- Node: `6085:35446`
- Loại: Component set
- Số variants: 25
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Leading-Icon` | BOOLEAN | false | — |
| `Trailing-Icon` | BOOLEAN | false | — |
| `Text` | TEXT | Button | — |
| `Leading-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 1569 preferred instance values |
| `Trailing-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 1569 preferred instance values |
| `Level` | VARIANT | Primary | `Primary`, `Accent`, `Tertiary`, `Danger`, `Positive` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Pressed`, `Focused`, `Disabled` |

#### .Primitives/Top-Navigation/Mobile/Nav-Slot/Action

- Node: `6340:42675`
- Loại: Component set
- Số variants: 2
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Noti-Dot` | BOOLEAN | false | — |
| `Style` | VARIANT | Default | `Default`, `Flat` |

#### .Primitives/Top-Navigation/Mobile/Nav-Slot/Visual

- Node: `12012:39317`
- Loại: Component set
- Số variants: 2
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Noti-Dot` | BOOLEAN | false | — |
| `Size` | VARIANT | Large | `Large`, `Small` |

#### Nav-Action/Flat

- Node: `6085:34476`
- Loại: Component set
- Số variants: 5
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Leading-Icon` | BOOLEAN | false | — |
| `Trailing-Icon` | BOOLEAN | false | — |
| `Text` | TEXT | Button | — |
| `Trailing-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 1569 preferred instance values |
| `Leading-Icon-Src` | INSTANCE_SWAP | 1460:1087 | 1569 preferred instance values |
| `Level` | VARIANT | Primary | `Primary` |
| `State` | VARIANT | Default | `Default`, `Hover`, `Pressed`, `Focused`, `Disabled` |

#### .Primitives/Mobile/Top-Navigation/Leading

- Node: `12012:39316`
- Loại: Component set
- Số variants: 5
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Style` | VARIANT | Avatar Large | `Avatar Large`, `Avatar Small`, `Liquid Glass`, `Default`, `Flat` |
| `Type` | VARIANT | Visual | `Action`, `Visual` |

#### .Primitives/Mobile/Top-Navigation/Trailling

- Node: `12013:39571`
- Loại: Component set
- Số variants: 3
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Trailing-Slot` | SLOT | — | — |
| `Style` | VARIANT | Default | `Default`, `Flat`, `Liquid Glass` |

### ❖ Bottom-Navigations (Mobile)

#### .Primitives/Bottom-Navigation/Items/Default

- Node: `4060:26507`
- Loại: Component set
- Số variants: 6
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Label` | BOOLEAN | false | — |
| `Label-Text` | TEXT | Label | — |
| `Icon-Src` | INSTANCE_SWAP | 1460:896 | 1580 preferred instance values |
| `Noti` | BOOLEAN | false | — |
| `Type` | VARIANT | Default | `Default`, `Action` |
| `Select` | VARIANT | No | `No`, `Yes` |
| `Theme` | VARIANT | Neutral | `Neutral`, `Accent` |

#### .Primitives/Bottom-Navigation/Items/Floating

- Node: `9017:25813`
- Loại: Component set
- Số variants: 12
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Label` | BOOLEAN | false | — |
| `Label-Text` | TEXT | Label | — |
| `Icon-Src` | INSTANCE_SWAP | 1460:896 | 1580 preferred instance values |
| `Noti` | BOOLEAN | false | — |
| `Type` | VARIANT | Default | `Default` |
| `Select` | VARIANT | No | `No`, `Yes` |
| `Theme` | VARIANT | Neutral | `Neutral`, `Accent`, `Neutral-Surface`, `Accent-Surface`, `Neutral-Solid`, `Accent-Solid` |

#### .Primitives/Bottom-Navigation/Items/Floating-Glass

- Node: `9018:43881`
- Loại: Component set
- Số variants: 12
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Label` | BOOLEAN | false | — |
| `Label-Text` | TEXT | Label | — |
| `Icon-Src` | INSTANCE_SWAP | 1460:896 | 1580 preferred instance values |
| `Noti` | BOOLEAN | false | — |
| `Type` | VARIANT | Default | `Default` |
| `Select` | VARIANT | No | `No`, `Yes` |
| `Theme` | VARIANT | Neutral | `Neutral`, `Accent`, `Neutral-Surface`, `Accent-Surface`, `Neutral-Solid`, `Accent-Solid` |

#### .Primitives/Bottom-Navigation

- Node: `9017:26221`
- Loại: Component set
- Số variants: 6
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Icon-Src` | INSTANCE_SWAP | 1460:1087 | 1600 preferred instance values |
| `Theme` | VARIANT | Default | `Default`, `Primary`, `Accent`, `Glass`, `Glass-Primary`, `Glass-Accent` |

#### Bottom-Navigation/Mobile/Default

- Node: `4060:26671`
- Loại: Standalone component
- Số variants: 0
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Nav-Items` | SLOT | — | — |

#### Bottom-Navigation/Mobile/Floating

- Node: `9017:26239`
- Loại: Standalone component
- Số variants: 0
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `CTA` | BOOLEAN | true | — |
| `Nav-Item` | SLOT | — | — |

#### Bottom-Navigation/Mobile/Floating-Glass

- Node: `9017:42257`
- Loại: Standalone component
- Số variants: 0
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `CTA` | BOOLEAN | true | — |
| `Nav-Item` | SLOT | — | — |

### ◇ Master-Layout

#### Primitives/Notification-Dot

- Node: `4116:21789`
- Loại: Component set
- Số variants: 6
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Text` | TEXT | 1 | — |
| `Style` | VARIANT | Dot | `Dot`, `Number` |
| `Theme` | VARIANT | Default | `Accent`, `Active`, `Default` |

#### Primitives/Dashboard/Header

- Node: `4122:33402`
- Loại: Component set
- Số variants: 4
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Actions` | BOOLEAN | true | — |
| `Nav-Trailing-Block` | BOOLEAN | true | — |
| `Controls` | BOOLEAN | true | — |
| `Control-Slots` | SLOT | — | — |
| `Action-Slots` | SLOT | — | — |
| `Trailing-Slots` | SLOT | — | — |
| `Search` | BOOLEAN | true | — |
| `Subheading` | BOOLEAN | false | — |
| `Leading-Slots` | SLOT | — | — |
| `Center-Slots` | SLOT | — | — |
| `Nav-Center-Block` | BOOLEAN | false | — |
| `Custome-Elements` | SLOT | — | — |
| `Child-Heading` | BOOLEAN | false | — |
| `Header-Text` | SLOT | — | — |
| `Type` | VARIANT | Control-Bar | `Navigation`, `Main`, `Control-Bar`, `Custom` |

#### Header/Dashboard

- Node: `4122:34662`
- Loại: Component set
- Số variants: 1
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Sections` | SLOT | — | — |
| `Main` | BOOLEAN | true | — |
| `Level` | VARIANT | Master | `Master` |

#### Patterns/Pages/Density-Medium

- Node: `4122:41886`
- Loại: Component set
- Số variants: 1
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Content` | SLOT | — | — |
| `Floating-Actions` | BOOLEAN | true | — |
| `Floating-Item` | SLOT | — | — |
| `Side-Panel` | BOOLEAN | false | — |
| `Sidebar` | BOOLEAN | true | — |
| `Level` | VARIANT | Master | `Master` |

#### Patterns/Sidebar/Density-Medium

- Node: `6040:67524`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Expand` | VARIANT | Yes | `No`, `Yes` |
| `Shadow` | VARIANT | Yes | `Yes`, `No` |

#### Primitives/Dashboard/Header/Action-Item

- Node: `12280:19532`
- Loại: Component set
- Số variants: 4
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Notification` | BOOLEAN | true | — |
| `Theme` | VARIANT | Tertiary | `Tertiary`, `Flat` |
| `Noti-type` | VARIANT | Dot | `Dot`, `Number` |

### ⚙️ Operation Components

#### .Ops/Table/Header/No-border

- Node: `1:337`
- Loại: Standalone component
- Số variants: 0
- Description: Có

Không có exposed component properties.

#### .Ops/Header/Cell/Display/Color Preview

- Node: `1:314`
- Loại: Standalone component
- Số variants: 0
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Show Border` | BOOLEAN | false | — |
| `Show Label` | BOOLEAN | false | — |

#### .Ops/Table/Cell/No-border

- Node: `1:313`
- Loại: Component set
- Số variants: 4
- Description: Có

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Secondary` | BOOLEAN | true | — |
| `Thumb` | BOOLEAN | true | — |
| `Variant` | VARIANT | Display | `Display`, `Value`, `Semantic-Token`, `Parent` |

#### .Ops/Header-Old

- Node: `1:336`
- Loại: Component set
- Số variants: 3
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Subtitle` | BOOLEAN | true | — |
| `CTA` | BOOLEAN | false | — |
| `Capline` | BOOLEAN | false | — |
| `Variant` | VARIANT | H3 | `H1`, `H2`, `H3` |

#### System/Bottom-Indicator

- Node: `308:46297`
- Loại: Standalone component
- Số variants: 0
- Description: Có

Không có exposed component properties.

#### .Ops/Notes

- Node: `477:12720`
- Loại: Component set
- Số variants: 4
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Type` | VARIANT | Top | `Left`, `Top`, `Bot`, `Right` |

#### System/Top-Indicator

- Node: `836:8399`
- Loại: Standalone component
- Số variants: 0
- Description: Có

Không có exposed component properties.

#### Status-bar/IOS/Mobile

- Node: `12013:39833`
- Loại: Standalone component
- Số variants: 0
- Description: Thiếu

Không có exposed component properties.

#### Status-bar/IOS/Tablet

- Node: `12013:39942`
- Loại: Standalone component
- Số variants: 0
- Description: Thiếu

Không có exposed component properties.

#### _Cover

- Node: `6004:45200`
- Loại: Component set
- Số variants: 2
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Title` | TEXT | Table of Contents | — |
| `Type` | VARIANT | 1 | `1`, `2` |

#### Keyboard - iPhone

- Node: `12013:40650`
- Loại: Component set
- Số variants: 7
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Show Replace` | BOOLEAN | true | — |
| `Email 1` | TEXT | name@email.com | — |
| `Email 2` | TEXT | Hide My Email | — |
| `Show Accessory Bar` | BOOLEAN | true | — |
| `Type` | VARIANT | Default | `Default`, `Numbers and Punctuation`, `Emoji`, `Find and Replace`, `Email`, `URL`, `Toolbar` |

#### Keyboard - iPad

- Node: `12013:40888`
- Loại: Component set
- Số variants: 6
- Description: Thiếu

| Figma property | Type | Default | Options / notes |
|---|---|---|---|
| `Show Bar` | BOOLEAN | true | — |
| `Email 1` | TEXT | name@email.com | — |
| `Email 2` | TEXT | name@email.com | — |
| `Show Replace` | BOOLEAN | true | — |
| `Type` | VARIANT | Default | `Default`, `Shift`, `Emoji`, `Numbers and Special Characters`, `Email`, `Find and Replace` |

## Appendix B — Components thiếu description

Không tính 1.597 standalone icon components.

- `🏃 Playground / .Ops/Primitives/Popover/Item-List/Foundation`
- `🏃 Playground / .logo-Zen`
- `🏃 Playground / Component`
- `❖ AI-Chat / AI/Chat-Field`
- `❖ AI-Chat / AI/Chat-Block/Pale`
- `❖ Breadcrumbs / .Primitives/Breadcrumbs/Item`
- `❖ Breadcrumbs / Primitives/Breadcrumbs/Item/Slot`
- `❖ Bottom Sheet (Mobile) / .Primitives/Bottom-Sheet/Actions`
- `❖ Bottom Sheet (Mobile) / .Primitives/Bottom-Sheet/Header/Basic`
- `❖ Bottom Sheet (Mobile) / Primitives/Sheet-Actions/Item`
- `❖ Bottom Sheet (Mobile) / .Primitives/Bottom-Sheet/Header-Bar`
- `❖ Chat / .Chat/Conversation-List/List-Item/Content`
- `❖ Card / .Demo-Card`
- `❖ Chip/Pill / .Chip/Trailing`
- `❖ Date Picker / .Primitives/Date-Picker/Header`
- `❖ Date Picker / .Primitives/Date-Picker/Time-Picker`
- `❖ Date Picker / .Primitives/Date-Picker/Action`
- `❖ Date Picker / .Primitives/Date-Picker/Calendar`
- `❖ Date Picker / .Primitives/Date-Picker/Item/Event-List`
- `❖ Date Picker / .Primitives/Date-Picker/Item`
- `❖ Date Picker / .Primitives/Mobile-Date-Picker/Item`
- `❖ Date Picker / .Primitives/Date-Picker`
- `❖ Date Picker / .Primitives/Date-Picker/Footer-Actions`
- `❖ Empty State / .Empty-State/CTAs`
- `❖ Input / .Primitives/Rich-Text/Editor-Bar`
- `❖ Input / Control-Bar/Select-Item`
- `❖ List-Item / .Primitives/List-Item/Mobile/Slot-Actions`
- `❖ List-Item / .Primitives/List-Item/Mobile/Slot/Info-Content`
- `❖ Metric Widget (Dashboard) / .Primitives/Metrics/Metric-Visual/Placeholder`
- `❖ Metric Widget (Dashboard) / .Primitives/Metrics/Metric-Trend`
- `❖ Metric Widget (Dashboard) / Primitives/Metric/Metric-Inline/Icon-Highlight`
- `❖ Metric Widget (Dashboard) / Primitives/Metric/Metric-Inline/Title-Highlight`
- `❖ Popover / .Primitives/Popover/Label`
- `❖ Popover / .Primitives/Popover/Search`
- `❖ Popover / .Primitives/Popover/Item/Content`
- `❖ Popover / Primitives/Popover/Item`
- `❖ Pagination / .Primitives/Pagination/Item`
- `❖ Rating / .Primitives/Rating/Emoji`
- `❖ Rating / .Primitives/Rating/Opinion item`
- `❖ Slider / .Primitives/Slider/Slide-Dot/Basic/Default`
- `❖ Sidebar / .Primitives/Sidebar/LOGO`
- `❖ Sidebar / Primitives/Sidebar/Menu-Item/Section-Title`
- `❖ Sidebar / Primitives/Side-Bar/Menu-Item/Master`
- `❖ Stepper / .Primitives/Stepper/Item`
- `❖ Stepper / .Primitives/Stepper/Step-Horizontal`
- `❖ Stepper / .Primitives/Stepper/Step-Vertical`
- `❖ Segmented / Primitives/Segmented/Item`
- `❖ Toggle / .Primitives/Toggle/Content`
- `❖ Uploader / Primitives/Uploader/File-Item`
- `❖ Uploader / Primitives/Uploader/DragDrop-Field`
- `❖ Top-Navigations (Mobile) / Top-Navigation/Mobile`
- `❖ Top-Navigations (Mobile) / .Primitives/Heading-Text/Basic`
- `❖ Top-Navigations (Mobile) / .Primitives/Top-Navigation/Mobile/Nav-Slot/Action`
- `❖ Top-Navigations (Mobile) / .Primitives/Top-Navigation/Mobile/Nav-Slot/Visual`
- `❖ Top-Navigations (Mobile) / .Primitives/Mobile/Top-Navigation/Leading`
- `❖ Top-Navigations (Mobile) / .Primitives/Mobile/Top-Navigation/Trailling`
- `❖ Bottom-Navigations (Mobile) / .Primitives/Bottom-Navigation/Items/Default`
- `❖ Bottom-Navigations (Mobile) / .Primitives/Bottom-Navigation/Items/Floating`
- `❖ Bottom-Navigations (Mobile) / .Primitives/Bottom-Navigation/Items/Floating-Glass`
- `❖ Bottom-Navigations (Mobile) / .Primitives/Bottom-Navigation`
- `◇ Master-Layout / Primitives/Notification-Dot`
- `◇ Master-Layout / Primitives/Dashboard/Header`
- `◇ Master-Layout / Primitives/Dashboard/Header/Action-Item`
- `⚙️ Operation Components / .Ops/Header/Cell/Display/Color Preview`
- `⚙️ Operation Components / .Ops/Header-Old`
- `⚙️ Operation Components / .Ops/Notes`
- `⚙️ Operation Components / Status-bar/IOS/Mobile`
- `⚙️ Operation Components / Status-bar/IOS/Tablet`
- `⚙️ Operation Components / _Cover`
- `⚙️ Operation Components / Keyboard - iPhone`
- `⚙️ Operation Components / Keyboard - iPad`

## Appendix C — Local style inventory

### Paint styles (35)

- `Color Chart Sector/Primary`
- `Color Chart Sector/Secondary`
- `Color Chart Sector/Tertiary`
- `Color Chart Sector/Quaternary`
- `Color Chart Sector/Quinary`
- `Color Chart Sector/Senary`
- `Color Chart Sector/Septenary`
- `Gradients/Border/Glass White Overlay`
- `Gradients/Border/Glass Black Overlay`
- `Avatars/1`
- `Avatars/2`
- `Avatars/3`
- `Avatars/4`
- `Avatars/5`
- `Avatars/6`
- `Avatars/7`
- `Avatars/8`
- `Avatars/9`
- `Avatars/10`
- `Avatars/11`
- `Avatars/12`
- `Avatars/13`
- `Avatars/14`
- `Avatars/15`
- `Avatars/16`
- `Avatars/17`
- `Avatars/18`
- `Avatars/19`
- `Avatars/20`
- `Avatars/21`
- `Tool/Canvas`
- `Semi-Pale`
- `.VT-Canvas`
- `.Chat-Canvas`
- `Background/Canvas-Liquid-Glass`

### Effect styles (18)

- `Effect/Container`
- `Effect/Popover`
- `Shadow/Action/Basic`
- `Effect/Overlay`
- `Effect/Input`
- `Shadow/Action/Tertiary`
- `Shadow/Neo-Brutalism`
- `Shadow/Bottom/Level-1`
- `Shadow/Bottom/Level-2`
- `Shadow/Bottom/Level-3`
- `Shadow/Bottom/Level-4`
- `Shadow/Top/Level-1`
- `Shadow/Top/Level-2`
- `Shadow/Top/Level-3`
- `Shadow/Top/Level-4`
- `Liquid-Glass/Normal`
- `Liquid-Glass/Large`
- `Glass-Floating`
