# Zen Studio — đổi lõi để làm việc như Figma (kế hoạch, 2026-10-10)

**Trạng thái: bản nháp, chờ user duyệt.** Chưa sửa code (scope lock). Mỗi mốc ở §5 cần user duyệt trước khi bắt đầu;
các câu hỏi ở §8 chốt trước mốc tương ứng.

Yêu cầu (user, 2026-10-10): "Studio vẫn không hoạt động như Figma được. Các nested của nested vẫn không thể đổi props và
variant … Có cần một đại phẫu thuật để xây lại không?" — rồi "cho tôi plan trước".

## 1. Tóm tắt

- Trang Studio đổi từ **code JSX được sửa tại chỗ** sang **tài liệu như Figma**: cây node có ID ổn định, instance mang
  props và override theo đường dẫn layer. Code là bản **xuất ra**.
- Thư viện có một **kênh override**: mọi instance Zen mà một component tự vẽ đọc override theo tên layer Figma. Đây là
  thứ duy nhất làm được "nested của nested" cho mọi trường hợp.
- Giữ toàn bộ giao diện Studio (canvas, Layers, Assets, Inspector, Prototype, Present) và bộ E2E. Trang example /
  template giữ cách sửa hiện nay, thêm "Mở thành bản thiết kế".
- Bắt đầu bằng **M0, spike 1,5–2 ngày** trên worktree riêng để chứng minh 3 ca khó, rồi mới làm lớn.

## 2. Vì sao phải đổi lõi

Studio ghi vào **chỗ JSX được viết ra** trong file. Ba nơi không có chỗ để ghi:

| Nơi | Ví dụ | Studio hiện nay |
| --- | --- | --- |
| Bên trong component thư viện | Button mà `Card.tsx` tự vẽ | Chỉ đọc, trừ prop mà cha chuyển thẳng xuống: 112 cặp cha→con (`inspector/partProps.generated.ts`), chỉ 12 prop kiểu variant/size/tone được chuyển |
| Một hàng của `.map` / dữ liệu | 17 avatar trên một dòng code | "edits apply to all 17", hoặc lần ra dữ liệu (`setDataField`) |
| Helper, const, file khác | Hàng do một hàm dựng | Mỗi kiểu một bộ dò riêng |

Thêm một gốc rễ: **danh tính của layer là vị trí trong code** (`<file>:<line>:<col>`). Mỗi lần sửa làm dòng dịch đi, nên
cần `select/remap.ts` (258 dòng) và hai lớp kiểm tra nữa để tìm lại selection, nguồn của lỗi "selection bị mất".

Trang Studio đã là một phương ngữ TSX hạn chế (`tools/studio/dialect.mjs` → cây trung tính), tức là gần một tài liệu
rồi. Nhưng sửa vẫn bằng cách sửa text và đi qua cùng bộ chọn / ghi của trang code, nên kế thừa mọi giới hạn trên.

Mỗi lần vá thêm một bộ dò cho một trường hợp. Hiện Studio khoảng 51.500 dòng client + 15.400 dòng server, 206 câu từ chối
khác nhau, 103 commit từ 2026-10-02, mà vẫn hụt so với Figma. Code là chương trình, không phải tài liệu, nên danh sách
trường hợp không có điểm dừng.

## 3. Tiêu chí xong (đo được)

Trên **trang Studio**:

1. Chọn được mọi instance lồng ở cấp 1–4 (Card › Actions › Button › Icon; Table › hàng 3 › Status › Badge) bằng
   double-click hoặc ⌘-click. Inspector hiện đủ property Figma của nó (variant, boolean, text, instance swap), sửa được,
   ⌘Z hoàn tác trong một bước.
2. Một click chọn layer dưới con trỏ. Selection không mất sau khi sửa, undo, redo, đổi tab.
3. Một hàng của danh sách sửa riêng được (như instance riêng trong Figma). "Áp cho mọi hàng" là lựa chọn rõ ràng.
4. Reset override từng property hoặc toàn bộ, ở mọi cấp.
5. Code xuất ra chạy được, qua `tsc` và `npm run usage:check`, và render giống canvas (`visual-diff` 0 panel lệch).
6. Kéo một frame Figma dùng thư viện Zen về thành trang Studio, override lồng giữ đúng.
7. Không còn câu nói bằng code (file:line, `{row.photo}`, "has no children") trên trang Studio.

Đo bằng nhóm E2E mới `doc` (DOC-xx) và chạy lại hai bài thử của `studio-usability-eval-2026-10-10.md` trên trang Studio:
avatar ≤ 2 bước, dashboard 19/19 không bị từ chối.

## 4. Kiến trúc mới

### 4.1 Hai loại trang

| | Trang Studio (thiết kế) | Trang code (example, template, playground) |
| --- | --- | --- |
| Nguồn | Tài liệu JSON | Code trong repo |
| Sửa | Như Figma, mọi cấp | Như hiện nay: props viết ra, text, ảnh, layout |
| Chuyển sang | Xuất TSX | "Mở thành bản thiết kế": chụp cây đang render thành một trang Studio (M8) |

Không tool nào sửa code viết tay như Figma 100% được (Framer, Plasmic, Builder.io đều chỉ sửa tự do trong tài liệu của họ),
nên trang code không được hứa ngang Figma.

### 4.2 Mô hình tài liệu

```ts
type DocNode =
  | { id: string; type: "frame"; name: string; layout: AutoLayout; style: FrameStyle; children: DocNode[] }      // Stack / Box / Grid
  | { id: string; type: "text"; name: string; text: string; textStyle: string; tone?: string }
  | { id: string; type: "instance"; name: string; component: string;                                              // "Card", "Table"
      props: Record<string, Value>;                                                                               // variant, boolean, text, icon, asset
      overrides: Record<NestedPath, Record<string, Value>>;                                                       // "Actions/Button": { level: "danger" }
      slots: Record<string, DocNode[]> }
  | { id: string; type: "list"; name: string; template: InstanceNode; rows: Array<{ id: string; props: Record<string, Value>; overrides: Record<NestedPath, Record<string, Value>> }> }
  | { id: string; type: "screen" | "overlay"; name: string; device: Device; proto: ProtoSpec; children: DocNode[] };
// Value: literal · token ("--zen-…") · icon name · asset ref (zen-media:…) · data binding { source, field } (tuỳ chọn)
```

- ID ổn định, không phụ thuộc vị trí. Selection, override, liên kết prototype và ID Figma đều trỏ vào ID.
- Giá trị không bao giờ là biểu thức code. Dữ liệu mẫu là một bảng riêng của trang; một prop có thể "lấy từ dữ liệu" như
  variable của Figma.
- Danh sách: mỗi hàng có props và override riêng, như mỗi hàng là một instance trong Figma. Khi xuất thành `.map` trên một
  mảng dữ liệu.
- Lưu `.zen.json` trong IndexedDB (`pageStore`) và mirror `.zen-studio/pages/`, kèm file `.tsx` sinh ra cạnh nó (đọc
  được, chạy được). Lịch sử phiên bản giữ nguyên cơ chế hiện có.
- Undo / redo là nhật ký thao tác trên tài liệu, trong trình duyệt: một thao tác là một bước, không đi qua server.

### 4.3 Kênh override trong thư viện

- `src/components/_shared/nested.tsx`: `NestedRoot` (instance gốc giữ bảng override) và
  `useNested(name, props, key?)` trả props đã trộn. Đường dẫn cộng dồn qua context: `Actions/Button`,
  `Row[alex]/Status/Badge` (key là `getRowId` khi có, nếu không thì chỉ số).
- Mỗi component cha gọi hook tại mỗi instance Zen nó tự vẽ, với **tên layer Figma** (đọc từ `docs/figma-contracts/`;
  `table-cells.json` đã có 55 instance kèm main component và props).
- Trong Studio (cờ context), hook gắn `data-zen-part="<đường dẫn>"` lên DOM gốc của part, nên click vào đâu cũng ra cặp
  (ID instance, đường dẫn). Ngoài Studio không có `NestedRoot`: hook trả props nguyên vẹn, không gắn gì vào DOM.
- Component cha có thêm prop công khai `overrides` (cách dùng ngoài Studio: Q2).
- Gate: kiểm tra mới `nested-paths` so tên trong code với contract Figma (Figma đổi tên, thêm hay bớt instance lồng thì gate
  đỏ); rule harness theo Q2; test Vitest cho hook và cho từng component cha (override ở cấp 2 và 3).
- Phạm vi: 73 component cha, 112 cặp. Đợt 1 (M1): khoảng 12 component hay dùng nhất. Đợt 2 (M7): phần còn lại.

### 4.4 Canvas, chọn, Inspector

- Render: tài liệu → React bằng thư viện thật, bọc trong `NestedRoot`; mỗi node có `data-zen-node=<id>`.
- Chọn: click lấy node dưới con trỏ (con trực tiếp của frame, như Figma), double-click đi vào sâu, ⌘-click lấy layer trong
  cùng, kể cả part bên trong component. Trang Studio không dùng `remap.ts` và bộ dò fiber → `data-zen-src` nữa.
- Layers: cây tài liệu cùng các part lồng của instance, như Figma liệt kê instance lồng.
- Inspector: tái dùng các control qua `FieldApi` (`inspector/fieldApi.ts`). Thêm `docFieldApi`: `setProp` / `removeProp` /
  `setProps` thành thao tác trên tài liệu, trên một part thì thành override. Property lồng hiện dưới instance cha như Figma.
- Prototype, Present, Play: đọc từ node screen / overlay (proto là một field, không còn là JSX).

### 4.5 Xuất code

- Bộ sinh: tài liệu → TSX đúng phương ngữ hiện có (`dialect.mjs`), import từ `@zen/design-system`; override là prop thật.
- Kiểm tra: `parse(generate(doc)) == doc` (selftest round-trip), `usage:check`, `tsc` trên code xuất, `visual-diff` giữa
  canvas và code chạy thật.
- Tab Code chỉ đọc. "Nhập TSX" cho file viết đúng phương ngữ (dùng `parsePage` có sẵn).

### 4.6 Đồng bộ với Figma

| Tầng | Sau khi đổi lõi |
| --- | --- |
| Token | Như hiện nay (`tokens:build`) |
| Style component theo variant | Như hiện nay: contract báo lệch; frame Main component sửa CSS, Save kiểm tra parity |
| Cấu trúc lồng của component | Mới: gate `nested-paths` |
| Kéo thiết kế Figma về (M6) | Đọc frame qua `use_figma` (chỉ đọc) thành tài liệu: INSTANCE → component + props qua bảng map có sẵn (`tools/studio/figma-props.map.mjs`, MCP `map_figma_component`), override lồng → `overrides`, auto layout → frame với token theo variable, TEXT → text + text style. ID Figma lưu trên node; lần sau có khác biệt thì hiện diff để chọn |
| Đẩy lên Figma | Q4 (cần quyền ghi) |
| Tự động hoá component | Q5 |

### 4.7 Giữ, thay, bỏ

| Giữ | Thay (chỉ cho trang Studio) | Trang code |
| --- | --- | --- |
| Canvas, zoom, chrome nổi, Layers UI, Assets, các control Inspector (PropField, Layout, Appearance, Sizing, ScaleField), Prototype UI, Player, Present, folders, mirrors, lịch sử phiên bản, figma props, E2E harness | Lưu TSX → JSON; `browser-engine` sửa text → thao tác trên tài liệu; picker + `remap.ts` → chọn theo ID; `nestedInstances`, `partForwarding`, `writePlan`, `callSite`, data tracing → override và props của hàng | Giữ nguyên engine hiện có; chỉ sửa lỗi, không mở rộng; thêm "Mở thành bản thiết kế" (M8) |

## 5. Lộ trình

Mỗi mốc: hàng E2E mới, `npm run qa` theo tier, CHANGELOG, session log, báo user, và user duyệt trước mốc sau. Ước lượng
thô, sẽ chỉnh sau M0.

| Mốc | Nội dung | Tier | Ước lượng | Xong khi |
| --- | --- | --- | --- | --- |
| **M0 Spike** | Worktree riêng. Tài liệu tối thiểu, `useNested` cho Card, Table, ListItem, Button, Badge, Avatar; chọn part; Inspector cho part; xuất JSX; kéo 1 frame Figma về | — | 1,5–2 ngày | Card › Button đổi variant; Table › hàng 3 › Badge đổi tone chỉ hàng đó; ListItem › Avatar đổi ảnh 1 hàng; ⌘Z một bước; JSX xuất ra chạy đúng; frame Figma về đúng. Báo cáo, user quyết đi tiếp hay dừng |
| M1 Kênh override, đợt 1 | Hook, ~12 component cha, chụp contract còn thiếu (`tools/figma-kit/`), gate `nested-paths`, rule harness, test | L | 2–3 ngày | `npm run qa -- --all` xanh, visual-diff 0 panel lệch trên mọi trang (thư viện không đổi hình) |
| M2 Lõi tài liệu | Schema, store, nhật ký undo/redo, renderer, chuyển `.zen.tsx` → `.zen.json`, mirrors | L | 3–4 ngày | Mọi trang Studio cũ mở được và giống từng pixel (visual-diff) |
| M3 Chọn, Layers, Inspector | Chọn theo ID, part lồng, `docFieldApi`, property lồng, reset override | L | 3–4 ngày | Tiêu chí 1, 2, 4 |
| M4 Thao tác thiết kế | Chèn từ Assets, ⇧A, ⌘D, kéo thả, resize, sửa text, thay ảnh, danh sách theo hàng, prototype | L | 4–6 ngày | Tiêu chí 3; bài dashboard 19/19. Bật engine mới làm mặc định cho trang Studio |
| M5 Xuất code, tab Code | Bộ sinh, round-trip, nhập TSX | M | 1–2 ngày | Tiêu chí 5 |
| M6 Kéo từ Figma | Đọc frame, map, diff khi cập nhật | M | 2–3 ngày | Tiêu chí 6 |
| M7 Kênh override, đợt 2 | ~61 component cha còn lại | L | 3–5 ngày | Gate `nested-paths` phủ mọi component cha có contract |
| M8 Mở thành bản thiết kế | Trang code → trang Studio | M | 2–3 ngày | Bài avatar 5/5 trang qua bản thiết kế |
| Tuỳ chọn | Đẩy lên Figma (Q4), tự động hoá component (Q5) | — | — | Theo spec riêng nếu được duyệt |

Tổng ước lượng thô M0–M8: khoảng 4–6 tuần làm việc.

## 6. Cách làm an toàn

- Làm trong git worktree riêng, gộp ở các điểm ổn định. Engine TSX của trang Studio chạy tiếp tới hết M4; engine mới
  thử qua `?engine=doc`, thành mặc định khi nhóm E2E `doc` và hai bài thử đạt. Gỡ engine TSX cho trang Studio sau một
  mốc dùng ổn định.
- Không đụng trang code trừ M8. Các hàng E2E của trang code giữ nguyên; các hàng của trang Studio (B, IN, LB, một phần SE,
  L, K) viết lại cho engine mới. Ma trận hiện có 221 hàng.
- Thư viện: hook không đổi hành vi khi không có override. M1 đụng `_shared` nên chạy `npm run qa -- --all` cộng
  visual-diff trước và sau.
- Agent song song chỉ cho M1 và M7 (một agent cho tối đa 3 component, một người review, theo AGENTS.md §C).
- Ngân sách bundle 140 KB gzip của engine (user, 2026-10-06) giữ nguyên, kiểm bằng `npm run studio:build-check`.

## 7. Rủi ro

- Tên layer Figma trùng hoặc hay đổi: đường dẫn dùng tên kèm chỉ số; gate bắt việc đổi tên.
- Component cha vẽ con theo điều kiện: part không có mặt thì override nằm chờ, Inspector báo "đang ẩn", như Figma.
- `overrides` cho phép app làm lệch thiết kế: xem Q2.
- Hai engine chạy song song một thời gian nên tốn bảo trì: gỡ engine TSX cho trang Studio sớm nhất có thể sau M4.
- Frame Figma dùng thứ ngoài thư viện (vector tự vẽ, ảnh): map thành frame hoặc ảnh, phần không map được liệt kê rõ.
- Ước lượng có thể sai: M0 tồn tại để đo lại trước khi cam kết.

## 8. Câu hỏi cho user

**User trả lời 2026-10-10:** Q2 có, Q3 OK, Q4 OK, Q5 OK, Q6 có, Q7 có (đều theo đề xuất). Q1 chưa chốt: user hỏi M0 để làm
gì và muốn một đường nhanh hơn trước khi bắt đầu ("Khoan làm … số lượng ngày triển khai lâu quá"), xem §9.

| # | Câu hỏi | Đề xuất | Chốt trước |
| --- | --- | --- | --- |
| Q1 | Duyệt M0 (spike)? | Có | Mọi việc |
| Q2 | Prop `overrides` ngoài Studio | Chỉ trong code Studio xuất ra (header `// @zen-page`); code viết tay dùng thì harness báo lỗi | M1 |
| Q3 | Trang code: "Mở thành bản thiết kế" thay cho sửa trực tiếp như Figma | Đồng ý | M8 |
| Q4 | Đẩy thiết kế lên Figma | Để sau M6; nếu làm thì qua plugin Zen (giữ luật `use_figma` chỉ đọc) | Sau M6 |
| Q5 | Tự động hoá component: (1) Figma đổi binding → đề xuất diff CSS; (2) Save Main component → đẩy lên Figma | (1) sau M7; (2) cùng Q4 | Sau M7 |
| Q6 | Danh sách: mỗi hàng là instance riêng, dữ liệu chỉ dùng khi xuất | Có | M2 |
| Q7 | Trang Studio cũ tự chuyển sang JSON khi mở (bản TSX giữ trong lịch sử phiên bản) | Có | M2 |

## 9. Đường nhanh (đề xuất 2026-10-10, chờ user chọn)

Phát hiện khi rà lại: Studio đã có deep select cho part bên trong component (`select/parts.ts`, `inspector/PartPanel.tsx`,
nhóm property Figma qua `componentGroupsOf`), chỉ là **chỉ đọc**. Thiếu đúng một thứ: chỗ để ghi. Kênh override (§4.3)
là chỗ đó, và chạy được ngay trên engine hiện tại: override là một prop thật (`overrides={{ "Actions/Button": { … } }}`),
engine đã ghi được object prop (`setField`).

| Phương án | Giải được | Chưa giải | Ước lượng |
| --- | --- | --- | --- |
| **A. Kênh override + part sửa được, trên engine hiện tại** | Nested của nested đổi variant / boolean / icon / text ở mọi cấp trên trang Studio, kể cả hàng do thư viện vẽ (Table › hàng 3 › Badge, theo key của hàng); reset từng property / toàn bộ; ⌘Z một bước | Hàng do `.map` của chính trang; selection theo file:line:col; kéo từ Figma; trang example | 3–4 ngày, khoảng 2 ngày nếu chạy agent song song cho phần thư viện |
| B. A + lõi tài liệu, chạy song song và cắt phạm vi | Thêm: selection ổn định, hàng riêng, xuất code, kéo từ Figma | "Mở thành bản thiết kế", đẩy lên Figma (làm sau) | Thêm 7–10 ngày sau A |
| C. Kế hoạch đầy đủ, tuần tự (§5) | Tất cả | — | 4–6 tuần |

A không bị bỏ đi khi làm B: kênh override, tên đường dẫn và test thư viện dùng nguyên; chỉ phần nối PartPanel → ghi
override làm lại cho tài liệu. Với A, M0 không còn là mốc riêng: ngày đầu của A (Card › Button, Table › hàng › Badge,
ListItem › Avatar) chính là phép thử; không đạt thì dừng.

Tên đường dẫn trong A: tên layer Figma khi contract đã có, nếu không thì tên component (`Button`, `Button[2]`). Gate
`nested-paths` thêm dần khi chụp contract (§4.3).

### Tiến độ phương án A (2026-10-10)

User chọn A, một máy một tài khoản, làm trên nhánh `zen/feat/nested-overrides` (worktree `Zen-CodeBase/Zen-DS-nested`).

- **Xong:** kênh override `src/components/_shared/nested.tsx` (`useNested` → `nest`, `nest.slot`, `nest.scope`, `nest.at`;
  bảng ngoài cùng thắng; slot bắt đầu phạm vi mới; không đổi DOM). 40 component có `overrides`: Card, Button, IconButton,
  Badge, BadgeCounter, AvatarStack, ListItem, ToggleListItem, Table, ActionBar, AlertBanner, Breadcrumbs,
  BottomNavigation, EmptyState, InlineMessage, PageHeader, Segmented, Tabs, Tag, Toast, Metric, MetricCard, ChartCard,
  Dialog, ModalForm, ModalActions, SidePanel, ChipGroup, Sidebar, SidebarMenuItem, AppShell, AppShellAction,
  AppShellAccount, Chip, Pagination, BottomSheet, Stepper, FileUpload, Popover, Menu.
- **Studio:** ⌘-click vào instance lồng ở mọi cấp, Inspector hiện property Figma của nó, ghi thành `overrides` của owner
  (một bước undo, Reset all overrides theo layer), chỉ trên trang tự tạo (Q2). Ô của Table có mục "this row".
- **Harness:** `api/overrides-studio-only`. **Kiểm tra:** Vitest 7 ca mới, E2E NO-01…03 (cấp 2, cấp 3, một hàng Table).
- **2026-10-11:** thêm Input (InputField, TextAreaField, SelectField, NumberField, DateField, RichTextField,
  AutocompleteField: Label, Help-Text, Leading, Trailing), DatePicker (+Sheet), Search, Form (FormField, FormFieldset),
  NpsScale, Chat (Message, File, Call, Voice, Composer, AvatarGroup, ConversationItem), AiChat (Field, Block), Voice —
  tổng 64 component. Image và Link không có instance lồng đáng đổi (chỉ icon trạng thái); TopNavigation giữ hành động
  sửa qua dữ liệu (user chốt). Còn: gate `nested-paths` khi chụp đủ contract.

### M2 — lõi tài liệu (2026-10-11, nhánh `zen/feat/studio-doc-engine`)

**Quyết định của user (2026-10-11):** cách 2 — file trang vẫn là `.zen.tsx` (giữ nguyên định dạng người viết), tài liệu
JSON có ID cố định chạy kèm trong trình duyệt (IndexedDB, `PageRecord.doc`). Bản in chuẩn hoá (JSON là file, TSX sinh ra)
đã thử và bị bỏ: nó viết lại định dạng mã và làm hỏng file thiết kế trong gói bàn giao (5 hàng E2E). Khi M6 cần nhớ ID
layer Figma qua nhiều máy: ghi nó vào TSX (thuộc tính) hoặc một file đi kèm — không cần đổi file sang JSON.

- **Xong:** `tools/studio/doc.mjs` — `docFromText` (cây của dialect + `id` cho mỗi element), `printPage` (in tài liệu ra
  TSX, có hoặc không có `data-zen-id`), `locsOf` (vị trí ↔ ID trong bất kỳ text nào của trang), `editDoc` (mỗi lệnh chạy
  hai lần bằng engine cũ: trên text như trước — text và câu trả lời y hệt —, và trên bản in có ID để giữ ID qua di chuyển,
  bọc, nhân bản; bản sao và element mới nhận ID mới). `localApi` sửa qua `editDoc`; undo/redo trả tài liệu của text đó;
  mở trang gắn tài liệu mà không ghi lại text (`setPageDoc`).
- **Kiểm tra:** `doc.selftest.mjs` (85: in ↔ đọc lại, mọi lệnh khớp engine, ID giữ), E2E 225/225 + NO-05 (ID qua ⌘D, ⌘Z).
- **build-check:** đã sửa cho khớp main (New page, ⌘-click, Assets, Trash; trang component tải engine cho frame Main
  component) và lỗi Chromium 1243 với thư mục OPFS: 22 ok · 1 bỏ qua · 1 đỏ là ngân sách engine (140 KB; main 151,3 KB
  trước M2, 153,5 KB sau). User chọn nâng lên 160 KB (2026-10-11), không tách engine.
- **Chưa:** ID mất khi trang sang trình duyệt khác (ghi chú ở trên); chọn layer theo ID là M3.

### M3 — chọn, Layers, Inspector (2026-10-11, cùng nhánh)

- **Chọn theo ID (tiêu chí 2):** mỗi lần sửa, undo, redo trên trang Studio trả `locs` — mỗi element của text cũ nằm ở đâu
  trong text mới, theo ID (`doc.mjs` `editDoc` / `locMap`). `select/remap.ts mapSrc` dùng nó trước khi đoán bằng diff text,
  nên selection theo đúng element khi có element chèn/bỏ phía trên, khi di chuyển, và khi undo/redo của chúng. Trang Studio
  vẽ lại ngay lúc lưu (trước khi câu trả lời về): `api.ts writeInFlight` giữ selection cho tới khi lần ghi được báo, thay
  vì bỏ nó vì "chỗ đó giờ là element khác".
- **Double-click vào instance lồng (tiêu chí 1):** từ component, double-click lấy instance lồng ngoài cùng dưới con trỏ
  (Card › Sub-Action), lần sau vào tiếp (› Leading-Icon), như Figma; ô Table: Cell › Badge-Cell › Badge (hàng đó) rồi mới
  sửa chữ (`parts.ts outerNestedAt` / `drillNested`, `table/tableSelect.ts`).
- **Layers:** part là instance lồng hiện tên layer Figma bên cạnh ("IconButton · Sub-Action"); bấm row chọn nó và Inspector
  sửa nó như override của chủ.
- **Reset (tiêu chí 4):** Reset từng property và Reset all overrides ở mọi cấp (đã có từ đường nhanh A); E2E NO-07.
- **`docFieldApi` không cần** với cách 2: Inspector vẫn gửi EditOp như trước, `editDoc` chạy nó trên tài liệu.
- **Kiểm tra:** `doc.selftest.mjs` 112 (thêm: `locs` đưa mỗi element tới đúng thẻ của nó, `locMap` đưa về chỗ cũ khi undo,
  cho 9 lệnh); E2E NO-06 (Table vẫn được chọn qua ⌘D/⌘Z/⌘⇧Z của Card phía trên, Card di chuyển ↓ qua ⌘Z/⌘⇧Z, đổi tab),
  NO-07 (cấp 3, Reset all, ⌘Z), NO-08 (double-click tới cấp 4–5), NO-09 (Layers). B-22 (⇧A chọn Stack mới) giữ xanh:
  `wrapSelection` đọc lần ghi kèm `locs` như remap.

### M4 — thao tác thiết kế (2026-10-11, nhánh `zen/feat/studio-doc-m4`)

- **Một hàng sửa riêng (tiêu chí 3):** chọn một instance do `.map` vẽ trên trang Studio, Inspector hiện "Changes go to:
  Row N · All N rows". Mặc định là hàng đó, như sửa một instance trong Figma: lệnh mới `setRowProp`
  (`data-source.mjs rowPropEdit`) biến giá trị cố định thành field của từng hàng — các hàng khác giữ giá trị cũ, hàng
  được chọn nhận giá trị mới — và layer đọc field đó (`theme={person.theme}`), một lần sửa, một bước undo. "All rows" là
  lựa chọn rõ ràng: ghi giá trị lên layer (kể cả thay binding). Ảnh thả/chọn cho Avatar của một hàng cũng chỉ vào hàng
  đó (`edit/assets/picture.ts`). Lựa chọn ở `inspector/rowScope.ts`, về "Row" khi chọn layer khác.
- **Các thao tác còn lại** (chèn từ Assets, ⇧A, ⌘D, kéo thả, resize, sửa text, prototype) đã có hàng E2E trên trang
  Studio; bước "kéo một card qua card khác" mà bài dashboard chưa kiểm được giờ là NO-12 (Card giữ được chọn theo ID,
  ⌘Z). Engine tài liệu đã là mặc định của trang Studio từ M2. Bài dashboard thủ công chưa chạy lại.
- **Kiểm tra:** data-source selftest 37 (+3 `setRowProp`), doc selftest 116 (`editDoc` chạy `setRowProp`, ID giữ); E2E
  NO-10 (Row 2 › Red chỉ hàng đó; All rows › Green mọi hàng; ⌘Z), NO-11 (ảnh cho một Avatar trong list), NO-12.

### M5 — xuất code (2026-10-11, nhánh `zen/feat/studio-doc-m5`)

- Bộ sinh đã có từ GĐ5 (`tools/studio/compile.mjs`, Export as React); với cách 2 (file vẫn là TSX) không cần bộ sinh mới.
  M5 kiểm nó trên những gì M1–M4 viết ra và sửa hai chỗ hỏng:
  1. Code xuất có `overrides` bị harness báo lỗi `api/overrides-studio-only` trong app (trái Q2: overrides là code
     Studio viết). Giờ file bắt đầu bằng `// Generated by Zen Studio from …` cũng được miễn như `// @zen-page`.
  2. Giá trị riêng của một hàng (`theme={person.theme}`, M4) không qua `tsc`: kiểu mock ghi `theme: string`. Giờ field
     đọc vào prop chỉ nhận chuỗi cố định có kiểu của prop (`NonNullable<ComponentProps<typeof Badge>["theme"]>`; danh sách
     prop đó sinh từ docs/api: `compile-api-build.mjs LITERAL_PROPS`).
- **Kiểm tra (tiêu chí 5):** `compile.selftest.mjs` thêm trang Crew (overrides lồng + giá trị riêng của hàng): harness
  (chế độ app) và `tsc` sạch; test Vitest `studio-export-parity` vẽ trang xuất cạnh canvas và so từng layer Zen (thứ tự,
  class, variant: Badge đỏ của hàng 2, Sub-Action danger) — bằng nhau. Round-trip tài liệu ↔ TSX ở `doc.selftest.mjs`;
  nhập TSX và tab Code có sẵn. So ảnh pixel (visual-diff) thay bằng so cấu trúc layer: cùng thư viện và token thì cùng
  layer, cùng variant là cùng hình.

### M6 — kéo từ Figma (2026-10-11, nhánh `zen/feat/studio-doc-m6`, phần chuyển đổi)

- `tools/studio/figma-pull.mjs`: `figmaReadCode(nodeId)` là đoạn code chạy trong `use_figma` (chỉ đọc) trả frame thành
  JSON — frame auto layout (gap, padding kèm tên variable, căn hàng), text (chữ, tên text style), mỗi instance Zen (bộ
  component, property theo tên Figma, chữ đầu tiên, các instance lồng bị override theo đường dẫn layer). `pageFromFigma`
  biến JSON đó thành trang Studio (in bằng `doc.mjs printPage`): instance → component với các prop khác mặc định của
  code (tên và lựa chọn qua `figmaProps.generated.ts`; mặc định từ docs/api, không có thì mặc định của Figma), instance
  lồng bị override → `overrides` theo đường dẫn (`"Sub-Action": { level: "danger" }`), frame auto layout → Stack (gap /
  padding theo tên variable hoặc px gần nhất), text → Text. Cái không có trong Zen bị bỏ ra và ghi trong `notes`; một
  layer Figma hiện bằng boolean mà code chỉ vẽ khi có prop (Sub-Action của Card) cũng được ghi.
  CLI: `node tools/studio/figma-pull.mjs code <nodeId>` (in code cho use_figma), `… page frame.json --out=x.zen.tsx`
  (rồi Import trong Studio).
- **Kiểm tra:** `figma-pull.selftest.mjs` 14 (frame mẫu đúng dữ liệu contract: trang hợp lệ, override lồng, Badge đỏ,
  gap/padding theo variable, ghi chú); E2E NO-13 (trang đó mở trong Studio và vẽ đúng).
- **Chưa (lúc đó):** đoạn code `use_figma` chưa chạy trên file thật; nội dung slot chưa đọc.

### M6 — đọc thật trên file Figma (2026-10-11, nhánh `zen/feat/studio-figma-pull-live`)

- Đọc frame Overviews 14243:64878 của file `9nZv4uW2LT21yuHabMTCh1` qua `use_figma` (chỉ đọc). Câu trả lời giới hạn
  20 KB và bị cắt khi có nhiều ký tự ngoài ASCII, nên JSON được thoát `\uXXXX` và chia phần (`PART i/n`, 12 000 ký tự);
  `joinParts` ghép lại. Bản đọc lưu ở `tools/studio/fixtures/figma-overviews.json`.
- Sửa theo những gì frame thật cho thấy:
  - Slot của instance: lớp trong slot thành nội dung (Card › Content), dữ liệu (`DATA_SLOTS`: Sidebar `sections` theo
    từng frame với Section-Title làm nhãn, Breadcrumbs `items`, Segmented `options`; Select = Yes → `selectedId` /
    `defaultValue`), hoặc prop dạng node (Sidebar Header-Content → `brand`, Footer-Content → `footer` với
    `<SidebarMenuItem>`).
  - Instance không có component Zen nhưng có slot (Dashboard/Header): giữ nội dung slot trong Stack theo bố cục của
    frame chứa chúng (BACKLOG: hỏi designer nên map sang gì). Instance là icon (icon-zen) → `<Icon>`. Hình vẽ (vector,
    shape) bỏ ra, gộp một ghi chú.
  - Bố cục:
    - Fill container → `width` / `height="fill"`; hàng có mọi lớp Fill theo chiều cao → `align="stretch"` (Stack hàng
      mặc định căn giữa); Figma MIN trong hàng → `align="start"`.
    - Frame không gap → `gap="none"` (Stack mặc định md); padding theo X/Y.
    - Grid 8 cột với thẻ span 2 → Grid 2 cột, lớp xếp theo vị trí Figma đặt (hàng rồi cột), không theo thứ tự panel Layers.
  - Chữ: căn chữ (`align`); line break mềm U+2028 thành khoảng trắng.
  - Lớp Ignore auto layout → `position="absolute"` với constraint và inset theo bước Spacing/Padding (Text được bọc
    trong Stack).
  - IconButton không tên → `aria-label` theo tên layer, không có thì theo icon (harness `icon-button/needs-name`).
  - Breadcrumbs (chỉ có slot) tìm được qua `DATA_SLOTS`.
- **Kiểm tra:** `figma-pull.selftest.mjs` 38 (thêm 20 trên bản đọc thật, kể cả harness không lỗi trên trang đã
  compile); E2E NO-19 (trang mở trong Studio: Sidebar đủ chiều cao với mục đang chọn, Breadcrumbs, Segmented, 5 thẻ
  2 × 3 đúng thứ tự Figma).
- **Chưa (lúc đó):** diff khi kéo lại; bảng Table của Figma chưa map sang Table.

### M6 — kéo lại cùng frame: diff để chọn (2026-10-11, nhánh `zen/feat/studio-figma-pull-diff`)

- ID Figma lưu trên node: mỗi element của trang kéo về có id tài liệu lấy từ layer Figma (`figmaDocId`: "14243:64878" →
  "f14243-64878"; element do figma-pull thêm có hậu tố: `.screen`, `.place`), header ghi frame
  (`figma: { file, node }`). Bản in có `data-zen-id` là thứ Studio nhập; chữ của trang không có id, tài liệu thì giữ.
- Import pages… với một trang kéo về: frame mới → trang mới, tài liệu giữ id, lần kéo này lưu làm base (PageRecord
  `figma.base`, trong trình duyệt này). Frame đã có trang → hộp **Update from Figma** thay vì trang thứ hai.
- So ba chiều (`tools/studio/figma-diff.mjs`): base → bản kéo mới là cái Figma đổi (prop, chữ, thêm, bỏ, đổi thứ tự,
  chuyển cha); chỗ mà Studio cũng đã sửa (trang hiện tại ≠ base) là xung đột, để trống không tick. Không có base
  (trình duyệt khác): so hai chiều, liệt kê mọi khác biệt, không tick sẵn. Element Studio tự thêm (id không từ Figma)
  không bao giờ bị đụng.
- Apply là **một** sửa đổi: tài liệu gộp, Board thay bằng bản gộp (`replaceElement`), một ⌘Z hoàn tác. Engine
  (`doc.mjs editDoc`): code một op mang `data-zen-id` thì id vào tài liệu, chữ của trang không có (luật chung, có test).
- **Kiểm tra:** `figma-diff.selftest.mjs` 19 (trên bản đọc thật: Figma đổi tên một heading, đổi theme một Card, đổi size
  Button, bỏ một thẻ, thêm một thẻ, đổi chỗ hai thẻ; Studio sửa cùng Card và chỗ khác); `doc.selftest.mjs` thêm luật
  id; E2E NO-20 (nhập trang kéo về, sửa trong Studio, nhập lần kéo sau → hộp liệt kê 6 thay đổi, xung đột không tick,
  Apply 5 trong một sửa đổi, sửa của Studio còn nguyên, một ⌘Z quay lại). Bản đọc fixture có id từng layer (đọc lại
  2026-10-11).
- **Chưa (lúc đó):** bảng Table của Figma chưa map sang Table.

### M6 — bảng Table của Figma thành Table (2026-10-11, nhánh `zen/feat/studio-figma-pull-table`)

- Figma không có component Table: bảng là một frame gồm các instance `Primitives/Table/Data-Row`, mỗi hàng có slot
  Columns chứa ô. Hàng ô `Table/Cell/Header` là header; các hàng khác là `Table/Cell/Default`, mỗi ô giữ một primitive
  (Text-Cell, Dock-Icon-Cell, Badge-Cell, Actions-Cell…). Đọc thật frame Table-Example 14730:78776 (trang Demo).
- Đoạn code đọc nhận ra frame toàn Data-Row và trả gọn một `TABLE`: ô header (nhãn, Sort, Align, icon, rộng / Fill),
  ô dữ liệu (primitive, chữ, rộng / Fill, Align, các instance Zen trong ô với chữ của từng cái) — thay vì đọc từng ô
  như instance thường (nhỏ hơn nhiều lần).
- Chuyển đổi: `<Table columns rows>` — mỗi ô header một cột (`header`, `sortable`, `align`, `width` khi FIXED, không
  có khi Fill; `content` theo primitive của hàng đầu: dock-icon, badge, tag, trend, progress, checkbox, toggle…;
  `bold`, `captionField` theo Bold / Subtext). Các hàng viết ngay trong Table (như bản sao thiết kế viết): kéo lại
  frame thì `figma-diff` so chúng như một prop của Table ("rows: changed") và Apply thay được — để trong mock thì lần
  kéo sau bỏ sót (mock nằm ngoài Board). Instance trong ô khác với cái Table tự vẽ (Badge vàng có chấm, Dock-Icon
  emoji cỡ Medium) thành `overrides` theo hàng: `"Row[row-1]/status/Badge": { theme: "yellow", leadingIcon: true }`.
  Chữ của hình (emoji) không vào nhãn.
- Cột không có content trong code (Actions-Cell: nút cần `cell` mà trang chưa viết được; Radio) bỏ ra kèm ghi chú.
  Thêm: field (Search) lấy chữ của nó làm `placeholder`.
- **Kiểm tra:** `figma-pull.selftest.mjs` 46 (thêm 8 trên fixture `figma-table.json`: cột, 9 hàng, override Badge /
  Dock-Icon, ghi chú Actions, harness không lỗi); `figma-diff.selftest.mjs` 22 (thêm: Figma đổi trạng thái một hàng
  → đổi `rows` và override Badge của hàng đó, gộp đúng); E2E NO-21 (trang mở trong Studio: 5 cột đúng header, 9 hàng,
  Badge Pending vàng / Approved xanh / Rejected đỏ, emoji 🏝️ ở Dock-Icon).
- **Chưa:** cột Actions (cần cách viết `cell` cho trang).

### M7 — kênh override, đợt 2 = gate `nested-paths` (2026-10-11, nhánh `zen/feat/studio-doc-m7`)

- 64 component cha đã có `overrides` từ đường nhanh A; M7 còn lại là gate. `tools/figma-contract/nested-paths.mjs` đọc
  tên layer mỗi component đưa cho `nest()` (hàm của nó và helper cùng file nó vẽ) và so với instance lồng trong bộ Figma
  của nó (`docs/figma-contracts`, tìm qua `figmaProps.generated.ts`). Instance chưa đổi tên mang tên component có "/"
  ("Avatar/Single", ".Primitives/Date-Picker/Time-Picker"): đường dẫn không chứa "/" được, nên dùng `layerKey` (primitive
  → phần cuối bỏ "-N", component thư viện → phần đầu); `figma-pull` đọc đường dẫn bằng cùng hàm.
- Sửa theo Figma: DatePicker `Apply` → `Submit`, `Time` → `Time-Picker` (đường dẫn `overrides` đổi; chưa phát hành).
  Cho phép có lý do (`ALLOWED`): layer nằm trong primitive chưa chụp (Item của Segmented, Sidebar), layer ẩn chưa chụp
  (Leading/Trailing của Input), Filter của Search (hai biến thể Figma, một layer code); câu hỏi cho designer vào BACKLOG
  (Counter / Multi-Count của Chip, Leading-Icon của Date field). Mục ALLOWED không còn đúng làm gate đỏ.
- **Kết quả:** 15/15 component có contract khớp Figma; gate `npm run qa` có bước "Nested layer names (code ↔ Figma)"
  khi có file component, contract hay bảng Figma trong phạm vi. 29 component chưa có contract (Card, Dialog, Tabs…)
  nằm ngoài tầm kiểm tra tới khi chụp contract.

### M8 — mở thành bản thiết kế (2026-10-11, nhánh `zen/feat/studio-doc-m8`)

- "New page from this frame" (GĐ3b) đã là "mở thành bản thiết kế": chụp cây đang render thành trang Studio. M8 đo bài
  avatar qua bản sao đó trên 5 trang (avatar, card, app-shell, table, sidebar): chọn frame có Avatar → New page from
  this frame → ⌘-click một Avatar → Assets › Photos. Lần đầu 2/5; sửa ở chủ:
  1. `AvatarStack` đưa thuộc tính của chính nó (data-*, aria-*, className…) xuống từng avatar — chú thích của Studio
     theo đó nên ⌘-click không tới được Avatar lồng (và `data-testid` lặp trên từng avatar trong app). Giờ chúng ở root.
  2. `SidePanel` modal portal ra trang kể cả trong frame (`[data-zen-overlay-root]`): màn che phủ cả frame Screen bên
     cạnh. Giờ mở trong frame như Dialog (`useOverlayHost`, `data-contained`).
  3. Ảnh cho một Avatar lồng (Avatar của AvatarStack) trên trang Studio: ghi override `src` của layer đó
     (`picture.ts nestedPicture`), như Figma override ảnh của một instance lồng.
  4. Bản sao của Table có cột vẽ ô bằng `cell` (avatar người) bỏ mất ảnh: giờ giữ thành cột `content: "avatar"` (hàng
     có `<id>Photo`, `<id>Caption`) nên đổi ảnh được (`snapshot.ts cellsAsText`).
- **Kết quả:** 5/5 trang (E2E NO-14…18); starters SP-* vẫn xanh; Vitest `frames-and-stacks` cho hai sửa thư viện.

### Phần còn lại (2026-10-12, nhánh `zen/feat/studio-design-words`)

- **Bài dashboard (điều kiện xong của M4):** chạy lại script 2026-10-10 trên server E2E: 27/27 bước, không bị từ chối.
  Hai bước "?" lần trước là lỗi của script (tiêu đề chọn nhiều giờ là "3 layers"; ba thẻ cùng nhãn nên không thấy thứ tự
  đổi); với nhãn khác nhau, kéo thả và phím → đều đổi thứ tự.
- **Tiêu chí 7 (không còn câu nói bằng code trên trang Studio):** `src/platform/studio/words.ts` (bảng thuật ngữ:
  layer, layers inside, property, list, From data: person › photo, set in code…) và `useWords.ts` (chỉ bật trên trang
  Studio). Thanh trạng thái, nhãn trên canvas, đầu Inspector ("Show code"), ghi chú, tooltip không còn file:line,
  `{…}`, `<Tag>`, prop, children; tab Code giữ số dòng. Trang example / template giữ cách nói cho dev. Kiểm tra:
  `words.selftest.mjs` (487 câu trong source), E2E B-35.
- **Cột Actions của bảng Figma (M6):** Table có `content: "actions"` + `actions` (Actions-Cell: IconButton flat, layer
  `Button` từng hàng); figma-pull đưa Actions-Cell thành cột đó, icon riêng của một hàng thành override của hàng đó;
  Studio cho chọn Content = Actions. NO-21: 6 cột, 9 nút "Open, row N".
- **AiChatBubble:** có `overrides`; các nút hành động là layer `Button[i]`, tooltip vẫn chạy (Vitest).
- Sau đó (2026-10-12), đã xong:
  - Q4 / Q5 được duyệt và làm xong (PR #24): đẩy trang Studio sang Figma qua plugin Zen › Import from Studio, Figma
    đổi binding thì stylesheet đi theo, lưu token xong thì gắn lại variable.
  - Contract Input có layer ẩn và 29 component chưa có contract (PR #25): gate `nested-paths` phủ 44 component.
  - Tên lớp trong Figma đổi theo nguyên tắc của Zen: 186 lớp, ghi lại ở `docs/figma-contracts/layer-renames-2026-10-12.json`.
- Còn lại:
  - User thử Studio → Figma một lần trên bản sao file.
  - Publish library Figma.
  - Phần mở rộng export (P1 → P4, `docs/research/studio-figma-push-spec-2026-10-12.md` §8) do session "Studio
    export/import Figma frame" làm.
