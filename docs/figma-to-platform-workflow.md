# Quy trình Figma → Zen platform

Mục tiêu: mỗi lần sửa một component hoặc trang đều có bằng chứng đủ để map từ Figma sang token và code, rồi kiểm tra đúng phần đã thay đổi. Quy trình này dùng cùng [skill Zen Figma](../skills/zen-figma-component-audit/SKILL.md); [template lock](platform-template-lock.md) là hợp đồng riêng của shell.

## Vì sao các vòng trước chậm và dễ lệch

- Link đến canvas `14240:26923` không chỉ ra frame triển khai. Đọc canvas như một node có thể không trả về layer cần thiết; phải chốt frame/component ID cụ thể trước.
- Một ảnh hoặc đoạn React/Tailwind từ MCP cho thấy hình thức, nhưng không đủ chứng minh mode, variable, style, effect hay override của instance. Với component JSON v3.1, đọc một variant mà chưa áp dụng `$variantDelta`/`$patch` cũng có thể cho sai padding hoặc paint.
- Audit cũ trộn dữ liệu lịch sử với trạng thái hiện tại. Ví dụ `docs/platform-json-audit.md` từng ghi cover 500px và nút 56px, còn frame Overviews `14243:64878` được kiểm tra sau đó là cover 492px và nút 48px; README từng ghi density Comfortable trong khi platform hiện khởi tạo Compact. Dùng hợp đồng hiện hành và node cụ thể, không sao chép số từ tài liệu cũ.
- `npm run build` chỉ xác nhận code biên dịch. Nó không chứng minh màu icon, vị trí, stroke hay inner shadow. Cần đối chiếu giá trị computed và hình ở cùng viewport/mode.
- Skill cũ yêu cầu mọi lệnh check và nhiều state cho mỗi lần sửa, khiến một thay đổi nhỏ cũng tốn vòng kiểm tra. Mức kiểm tra nay theo phạm vi thay đổi.

## Nguồn dữ liệu và quyền ưu tiên

| Cần xác định | Nguồn ưu tiên | Dùng để đối chiếu |
| --- | --- | --- |
| Bố cục của một trang/instance | Đúng frame và layer con trong Figma | Screenshot tại cùng viewport; template lock |
| Variants và component properties | Component set hiện tại; JSON export đã giải mã variant delta | Props React và demo |
| Variable/style/effect đang dùng | Binding và paint/effect **visible** của đúng layer, đúng mode | JSON collection, generated token/text-style |
| Giá trị runtime | CSS token được generate và computed style trong browser | Figma resolved value |
| Hành vi | Annotation/property của component và chức năng được người dùng yêu cầu | Tương tác trên production component |

Nếu live Figma, export JSON và tài liệu cũ mâu thuẫn, ghi rõ node, mode, ngày đọc và điểm khác. Không chọn một số chỉ vì nó xuất hiện sẵn trong CSS.

## Một lượt triển khai

1. Chốt **một** frame/component và những state cần xử lý. Nếu link là page/canvas, dùng metadata tìm frame con rồi đọc `get_design_context` trên frame đó; với frame lớn, đọc thêm các layer con cần thiết. Giữ screenshot để so hình.
2. Lập manifest ba tầng trước khi sửa: (a) mọi component set/primitive của page, (b) mọi axis/value/slot của từng set, (c) owner thật và override của từng nested instance. Không được bắt đầu từ một representative node rồi coi đó là toàn bộ page.
3. Nếu có ZIP/JSON, liệt kê **toàn bộ file** và property axes, đối chiếu số variant với live Figma. Khôi phục variant delta trước khi kết luận kích thước, padding hay paint. Với layer liên quan, đọc auto-layout, hug/fill/fixed, padding từng cạnh, gap, stroke alignment, styles, bindings, effect và override.
4. Điền bảng đối chiếu bên dưới trong audit riêng của component/trang dưới `docs/` (ghi ngày và node ID). Chỉ bắt đầu sửa khi các hàng thiết yếu có nguồn Figma và đích code rõ ràng. Dùng token/style/component hiện có trước khi tạo quy tắc mới; tái sử dụng bảng đã xác minh nếu thiết kế chưa thay đổi.
5. Sửa ở đúng owner: primitive cho quy tắc dùng chung, platform CSS cho bố cục trang, shell chỉ khi template thay đổi. Mỗi lần sửa nên giải quyết một nhóm mismatch đã ghi trong bảng.
6. Chạy consumer substitution audit: tên/key của nested Figma instance phải map tới đúng component React và đúng variant override. Không thay owner chỉ vì hình trông tương tự; `.Chip/Trailing/Multiple` có thể compose `Badge-Counter`, nhưng page không được thay cả trailing bằng Badge tùy ý.
7. Build; chạy check cho pipeline bị ảnh hưởng; xem platform tại viewport và mode của frame. Đo DOM computed styles ở các hàng vừa sửa và so screenshot. Kiểm tra state liên quan. Ghi `Khớp`, `Còn lệch`, hoặc `Chưa xác minh` cùng giá trị đo.
8. Bàn giao ngắn: node nguồn, file đã sửa, kết quả build/visual, phần còn lệch. Không tuyên bố “đúng 100%” nếu còn hàng chưa xác minh.

### Quy tắc audit banner và nested component

Trước khi sửa một page, phải tách audit thành hai lớp:

1. **Shell/banner:** đọc `Header/Dashboard` và `_Cover` của đúng frame, ghi lại chiều cao, inset, radius, background, divider, metadata, text style và các control nằm trong trailing slot. Không dùng banner của page khác làm giả định cho page hiện tại; nếu là frame cùng template thì ghi rõ phần nào được kế thừa.
2. **Nội dung/nested:** liệt kê mọi instance/component set trong frame, bao gồm cả những node nằm trong preview, header, footer và slot icon. Với mỗi node, đi qua ma trận sau trước khi viết JSX:

| Figma instance / node | Component tương ứng đã có | Quyết định | Bằng chứng cần giữ |
| --- | --- | --- | --- |
| Tên component + node ID | file/component export và prop hiện có | **Reuse/adapt** nếu cùng chức năng; **bổ sung primitive** nếu thiếu; chỉ **build mới** khi không có component tương đương | property axes, variant, token/style/effect và screenshot |

`Reuse/adapt` là mặc định. Không tạo bản sao theo page nếu component đã có chức năng tương ứng (ví dụ Search dùng Input, chip dropdown dùng Popover, page Button dùng Button/Main và Button/Icon). Nếu thiếu nested component, kiểm tra page/component set tương ứng trong Figma trước, rồi thêm primitive ở owner dùng chung; không vá riêng trong page CSS.

Với component có trạng thái Focus, tách rõ focus do bàn phím và tương tác chuột: ring runtime phải dùng `:focus-visible` để click không bị dính Focus; prop/state Focus trong playground chỉ là trạng thái ma trận có chủ đích để đối chiếu Figma.

Đây là quy tắc bắt buộc, không phải gợi ý: trước khi tạo JSX/CSS mới phải tìm component đã export trong `src/components` và component set tương ứng trong Figma. Nếu đã có cùng chức năng thì chỉ được mở rộng prop hoặc compose lại component đó. Nếu thật sự thiếu, ghi lý do “không có owner tương đương” và tạo primitive ở owner dùng chung; tuyệt đối không tạo bản sao chỉ vì một page có layout khác.

Font/style chỉ phục vụ Codebase Platform (ví dụ JetBrains Mono cho code view) phải nằm trong `src/platform` hoặc asset platform. Không đưa chúng vào collection/token contract của Zen khi JSON/Figma Zen không định nghĩa chúng.

Mỗi lượt phải lưu node ID và mapping trong audit hoặc PR note. Các nested layer chưa đọc đủ property, effect hoặc binding được đánh dấu `Chưa xác minh`, không được suy đoán từ tên hoặc screenshot.

### Variant completeness gate (bắt buộc)

Trước khi viết JSX/CSS, lập ma trận đầy đủ cho component set: số set và số variant từ Figma, toàn bộ property/value từ JSON, nested primitive, state, size/density, icon/no-icon, leading/trailing, selected/error và các slot banner/header/footer/popover. Mỗi hàng phải được đánh dấu `covered`, `deferred` (kèm lý do và owner dự kiến), hoặc `not applicable` (kèm bằng chứng). Không được kết luận “đã build đủ” nếu còn hàng chưa đánh dấu.

Sau khi build, chạy registry audit: mỗi set trong ma trận phải trỏ đến một export/primitive dùng chung hoặc một hàng deferred rõ ràng; page chỉ compose owner đó, không tạo bản sao theo page. Kiểm tra ít nhất một đại diện cho mọi nhánh làm đổi layout/paint và các state dễ sai (icon/no-icon, selected, focus, disabled, error). Ghi các hàng chưa xác minh vào audit để lượt sau tiếp tục, không đoán từ screenshot.

### Bảng đối chiếu để sao chép vào audit của từng task

| Layer / node / variant | Figma: property, variable/style, mode, resolved value | Code owner và token/prop dự kiến | Browser: computed / hành vi | Kết quả |
| --- | --- | --- | --- | --- |
| `node-id` + đường dẫn layer | Ví dụ: `Element Size/Popular/Base`, Compact, 20px | `<Icon size="base">` | 20×20px tại viewport của frame | Khớp / Còn lệch / Chưa xác minh |

Với shadow/effect, ghi riêng loại (`INNER_SHADOW` hay `DROP_SHADOW`), offset, blur, spread, màu/opacity và layer mang effect. Với icon, ghi glyph Figma và tên SVG trong repo; tên gần giống không đủ xác nhận hình. Với text, ghi text style, weight, line-height và letter-spacing. Với spacing, ghi từng cạnh và quy tắc thay đổi khi có/không có icon.

## Mức kiểm tra

- **Sửa nhỏ một token, icon hoặc text style:** vài hàng evidence; build và một phép đo hoặc quan sát trực tiếp tại state bị ảnh hưởng.
- **Sửa component/variant:** đầy đủ property axes; kiểm tra các state liên quan và edge case gây sai trước đây như icon/no-icon, selected/focus/error; không nhân toàn bộ tổ hợp khi không cần.
- **Sửa layout trang:** so mốc hình học của header, sidebar, content, các block chính ở viewport Figma; kiểm tra thêm một viewport hẹp chỉ nếu hành vi màn hình hẹp nằm trong phạm vi yêu cầu.
- **Audit banner/template:** kiểm tra một page overview và ít nhất một page foundation/component; xác nhận topbar controls, breadcrumb, cover, metadata và intro đều dùng đúng owner/token. Nếu các frame khác nhau, ghi rõ ngoại lệ (ví dụ overview cover 492px so với cover 400px).

`npm run build` bao gồm build token/style/icon, TypeScript và Vite. Chạy `tokens:check`, `styles:check`, `icons:check` khi sửa nguồn tương ứng. Storybook hiện không phải bề mặt nghiệm thu của platform; dùng app Vite và component thật.

### Checklist bắt buộc sau mỗi lượt

- [ ] Node/mode Figma và evidence table đã được ghi hoặc tái sử dụng từ lần đọc còn hiệu lực.
- [ ] Đã search registry/component set; không tạo component trùng chức năng.
- [ ] Đã tách shell/banner khỏi nested component và kiểm tra token, layout, radius, shadow, typography riêng.
- [ ] Playground dùng component production, có Chip/Popover để chọn axis, và chỉ render một preview đang chọn.
- [ ] Playaround không biến primitive owner thành preview row; trạng thái tương tác được kiểm tra bằng hover/click/typing/Tab trên component production thay vì một State-chip tĩnh. Disabled là ngoại lệ duy nhất: dùng một toggle Disabled vì không thể đạt được bằng tương tác bình thường; không cho chọn các state runtime khác.
- [ ] Với Chip filter: single-choice giữ chevron như header chip; multi-choice dùng X khi có 1 lựa chọn, Counter khi có nhiều lựa chọn và đổi sang X khi hover/focus trailing; click thân mở Popover, click trailing chỉ clear.
- [ ] Header chỉ có control đúng theo frame (component pages có Chip settings; foundation/overview chỉ có Segmented).
- [ ] Build/check/browser measurement đã chạy theo phạm vi thay đổi; mọi gap chưa xác minh được ghi lại.
- [ ] Popover Label mô tả nhóm lựa chọn (không lặp selected value); Code view mở sẵn với React và các ngôn ngữ khác được đánh dấu Coming Soon.
- [ ] Nếu token/variable đã thay đổi, đã rà toàn bộ consumer và cập nhật preview production; các component mới không trùng owner cũ.
- [ ] Main-Component-View phải được đọc lại theo node hiện hành trước khi sửa CSS: outer 2XLarge/24px, Component Container và Code Surface Small/8px, preview `min-height:152px` nhưng auto-grow. Right rail phải có heading `Select Property & Variant`, Select-Field cho property string và Toggle-Button cho boolean; không thay bằng Chip trang trí.
- [ ] Khi audit nested component, section title Sidebar phải reuse Menu-Item/Master không icon (32px, Body/Small/Regular), Input Leading-Trailing phải giữ nesting `outer gap → Elements gap → dropdown slot`, và Chip multiple trailing chỉ có số mặc định, X line khi hover/focus.
- [ ] Nếu có Styles JSON, đã đưa vào `styles/source/figma/styles.json`, build manifest cho color/text/effect/grid và chạy `npm run styles:check`; effect/shadow mới đã được nối vào consumer thay vì chỉ lưu dữ liệu.
- [ ] Quyết định mới, số đo browser và evidence gap đã được lưu vào audit/skill để lần chạy sau tái sử dụng.

## Nâng cấp sau khi props ổn định

Ưu tiên Code Connect cho các component dùng nhiều như Button, Chip, Input, Search và Sidebar sau khi API React đã chốt. Khi đó Figma MCP có thể trả về chính component và prop mapping trong codebase, giảm bước suy đoán ở mỗi trang mới. Đây là bước cải thiện tiếp theo, không phải điều kiện để dùng quy trình hiện tại.

Tham khảo hướng dẫn chính thức của Figma: [vai trò của từng MCP tool](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/), [cách tổ chức file để sinh code tốt hơn](https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/), và [Code Connect trong MCP](https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/).
