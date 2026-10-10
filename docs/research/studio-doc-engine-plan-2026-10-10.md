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
