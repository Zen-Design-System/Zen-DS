# Studio Builder GĐ4: tuỳ chỉnh instance như Figma (spec, 2026-10-07)

**Trạng thái: user đã duyệt 2026-10-07** (Q2–Q4 theo đề xuất; Q1 xem §8, chốt trước M4). **M1 xong 2026-10-07**
(E2E IN-01…IN-06); **M2 xong 2026-10-07** (IN-07…IN-11; Q3 đổi theo dữ liệu Figma: preferred values là cả bộ icon,
user chọn "mặc định của Figma + icon đã dùng trong file"); **M3 xong 2026-10-07** (IN-12, IN-13). Chi tiết trong `docs/context/session-log-2026-10-07.md`. GĐ4 của
`docs/research/studio-builder-plan-2026-10-05.md`. GĐ0–GĐ3 đã xong; GĐ1 WP-E đã có Figma properties cho 54 component.
Spec này đo những gì còn thiếu so với panel instance của Figma (§2), chốt phạm vi, và nêu 4 câu hỏi cho user (§8).

## 1. Mục tiêu và tiêu chí xong

Chọn một instance Zen bất kỳ trên canvas, ở trang example lẫn trang tự tạo. Inspector cho chỉnh nó **như panel instance
của Figma**:
1. property theo thứ tự và **tên của Figma**, kể cả tên lựa chọn ("Medium (Base)", không phải "md");
2. boolean ẩn/hiện layer, text, **đổi icon có danh sách gợi ý** (preferred values), **đổi component** nằm trong một prop
   hoặc slot (Avatar ↔ DockIcon);
3. **property của instance lồng bên trong** (Button trong Card…) hiện ngay dưới instance cha, đủ mọi loại property, không
   chỉ boolean;
4. **Reset all overrides** đưa instance về mặc định trong **một bước undo**;
5. **Hug / Fill / Fixed** cho instance trong auto layout (câu hỏi Q1);
6. **Detach** chạy được trên trang tự tạo.

Xong khi các dòng E2E nhóm `instance` (IN-xx) đều works, cả trên dev server lẫn `npm run studio:build-check`.

## 2. Hiện trạng (rà code ngày 2026-10-07)

| Panel instance của Figma | Zen Studio | Chỗ trong code |
| --- | --- | --- |
| Variant theo thứ tự và tên Figma | Một phần: 55/151 component; lựa chọn hiện giá trị code | `inspector/propGroups.ts:168-180` |
| Boolean ẩn/hiện layer | Một phần: 30 công tắc, giá trị bật cố định | `GroupedProperties.tsx:52-91` |
| TEXT | Có (ô text) | `PropField.tsx:602-606` |
| Đổi icon | Có ô chọn tìm được; chưa có preferred values (bản đọc Figma bỏ qua) | `PropField.tsx:472-520`; `tools/studio/figma-props-read.js:12` |
| Đổi component trong prop hoặc slot | Chưa có (chỉ xoá rồi thêm, hoặc ⇧⌘R) | `PropField.tsx:668-674` |
| Property của instance lồng nhau | Một phần: chỉ boolean, một cấp | `nestedInstances.ts:91` |
| Nhóm có tên cho instance lồng | Chỉ TopNavigation | `propGroups.ts:131, 178` |
| Reset từng property | Có | `PropField.tsx:686-688` |
| Reset all overrides | Chưa có | — |
| Một bước undo | Một yêu cầu = một bước; cha và con là hai bước | `api.ts:512-521` |
| Hug / Fill / Fixed cho instance | Chưa có trong Inspector (chỉ khi kéo trên canvas, bọc Stack) | `SizingSection.tsx:49-52`; `select/resize.ts:6-11` |
| Detach | 9 loại; trang tự tạo bị từ chối | `api.ts:153` |

Dữ liệu Figma đã chụp (`docs/figma-contracts/component-properties.json`): 144 bộ, gồm VARIANT 269, BOOLEAN 144,
SLOT 59, INSTANCE_SWAP 36 (gần như toàn icon), TEXT 24. BACKLOG đang chờ: dòng 238, 302–311, 1153, 1179.

## 3. Thiết kế

### 3a. Panel đúng như Figma (M1)

- **Tên lựa chọn của Figma:** `figma-props-build.mjs` giữ `options` (tên Figma → giá trị code), select hiện tên Figma.
  Giá trị code ghi vào file vẫn như cũ.
- **Phủ thêm component:** map thêm mọi component có bộ Figma mà chưa map (NumberField, TextAreaField, DatePicker,
  Breadcrumbs, Menu, EmptyState, Stepper, List, Table, Metric, Image, PageHeader…). Component không có bộ Figma giữ cách
  chia nhóm tự động hiện nay.
- **Reset all overrides:** một nút ở đầu Properties. Nó gỡ mọi prop thiết kế (variant, boolean, text, icon) về mặc
  định trong một yêu cầu, tức là một bước ⌘Z. Nội dung (children, text bắt buộc, handler, dữ liệu) được giữ lại.
- **Các mục BACKLOG 306–310 và 1179:**
  - ô icon cho prop dạng `boolean | IconName` (vừa tắt được, vừa chọn được icon);
  - thêm công tắc ẩn/hiện cho các boolean còn thiếu;
  - nhóm Label / Help text của Input.

### 3b. Đổi (swap) (M2)

- **Icon có gợi ý:** đọc lại 36 INSTANCE_SWAP từ file Figma `9nZv4uW2LT21yuHabMTCh1` kèm `preferredValues`
  (use_figma, chỉ đọc). Ô chọn icon hiện nhóm "Preferred" lên đầu (câu hỏi Q3).
- **Đổi component trong prop hoặc slot:** một prop đang giữ một phần tử, ví dụ `leading={<Avatar …/>}`, hiện tên
  component kèm danh sách component được phép theo `slots/registry.ts`. Chọn mục khác sẽ thay phần tử bằng đoạn code
  mặc định của component mới, trong một bước ⌘Z.
- **Swap instance cho cả layer** (câu hỏi Q2): menu chuột phải và nút trong header mở Quick insert ở chế độ "Thay
  thế". Enter sẽ thay layer đang chọn ngay tại chỗ, dựa trên thao tác paste-replace sẵn có.

### 3c. Instance lồng nhau (M3)

- Instance lồng bên trong hiện **mọi loại property** (variant, boolean, text, icon), không chỉ boolean. Mỗi instance là
  một nhóm mang tên của nó, lấy Figma properties của chính component đó, giống "exposed nested instances" của Figma.
- **Một bước undo cho cả cha và con:** thêm yêu cầu nhiều phần tử trong cùng một file. Thao tác `many` hiện có cho chọn
  nhiều layer, nên Reset all overrides gỡ được cả prop của instance lồng trong một bước.

### 3d. Hug / Fill / Fixed và Detach (M4)

- **Kích thước instance** (câu hỏi Q1): Inspector có hàng Width (và Height nếu cần) cho instance trong auto layout.
- **Detach trên trang tự tạo:** tải riêng phần recipe Detach (`tools/studio/detach.mjs`, khoảng 20 KB) chỉ khi bấm
  Detach. Chunk engine giữ nguyên 135 KB vì nằm trong ngân sách 140 KB đã chốt. `detach.mjs` tự đăng ký vào
  `jsx-source` khi được nạp.

## 4. Không làm ở GĐ4

- Tạo hay sửa **component chính** (main component) và đẩy thay đổi tới mọi instance: đó là sửa thư viện, thuộc quy trình
  build component (AGENTS.md §B).
- Biến (variables) và style của Figma gắn vào instance: Zen dùng token, panel Appearance đã có.
- Sửa prop của instance lồng hơn một cấp: chọn instance đó trên canvas như hiện nay.

## 5. Thứ tự giao (mỗi mốc chạy `npm run qa`, build-check khi đụng builder, cập nhật HANDOFF/CHANGELOG, báo user)

| Mốc | Nội dung | Cỡ | Người dùng thấy |
| --- | --- | --- | --- |
| M1 | Tên Figma cho lựa chọn, phủ thêm component, Reset all overrides, BACKLOG 306–310 | M | Panel giống Figma hơn; về mặc định một lần |
| M2 | Gợi ý icon từ Figma, đổi component trong prop/slot, Swap instance | M | Đổi icon và component như Figma |
| M3 | Property đủ loại của instance lồng, một bước undo cha + con | M/L | Chỉnh Button trong Card ngay từ Card |
| M4 | Hug / Fill / Fixed cho instance (theo Q1), Detach trên trang tự tạo | M | Fill container; Detach mọi nơi |

## 6. File

- **Mới:** `inspector/{InstanceSwap.tsx, resetAll.ts}`, `tools/studio/e2e/scenarios/instance.mjs` (IN-01…).
- **Sửa:**
  - `tools/studio/{figma-props-read.js, figma-props-build.mjs, figma-props.map.mjs}`;
  - `inspector/{propGroups.ts, GroupedProperties.tsx, PropField.tsx, NestedProperties.tsx, nestedInstances.ts,
    SizingSection.tsx, DesignPanel.tsx}`;
  - `builder/library/QuickInsert.tsx` (chế độ thay thế);
  - `builder/localApi.ts` (Detach);
  - `api.ts` (yêu cầu nhiều phần tử).

## 7. Kiểm chứng

- **Selftest:**
  - `figma-props-build --check` (tên lựa chọn, preferred values);
  - `propGroups.selftest` (thứ tự và nhãn);
  - mô hình Reset all (prop nào bị gỡ, prop nào giữ).
- **E2E nhóm `instance`:**
  - select hiện tên Figma, ghi giá trị code;
  - Reset all overrides là một bước ⌘Z;
  - icon "Preferred" đứng đầu;
  - đổi Avatar → DockIcon trong ListItem `leading`;
  - Swap instance bằng Quick insert;
  - đổi variant của Button nằm trong Card từ panel của Card;
  - Fill container;
  - Detach trên trang tự tạo.
- **`npm run studio:build-check`:** thêm bước Detach trên bản build; chunk engine vẫn ≤ 140 KB.

## 8. Câu hỏi cho user

1. **Hug / Fill / Fixed cho instance** (Button, Card…):
   - (a) dùng cách canvas đang làm khi kéo giãn: bọc instance trong một Stack có width; không đổi thư viện (đề xuất cho
     GĐ4);
   - (b) thêm prop kích thước chuẩn (`width`, `alignSelf`) cho mọi component Zen: gọn hơn về lâu dài nhưng đổi API của
     cả thư viện (cỡ L, cần QA mọi trang);
   - (c) chưa làm ở GĐ4.
2. **Swap instance cho cả layer:**
   - (a) có, qua Quick insert ở chế độ thay thế (đề xuất);
   - (b) chỉ đổi trong prop hoặc slot.
3. **Gợi ý icon (preferred values):**
   - (a) đọc từ file Figma (chỉ đọc), đúng như Figma (đề xuất);
   - (b) viết tay danh sách ngắn cho từng prop;
   - (c) không cần gợi ý.
4. **Reset all overrides** giữ lại những gì:
   - (a) giữ nội dung: children, text bắt buộc, handler, dữ liệu; chỉ gỡ prop thiết kế (đề xuất);
   - (b) gỡ mọi prop không bắt buộc, như một instance mới chèn.

### Trả lời của user (2026-10-07)

- **Q2:** (a) Swap instance qua Quick insert, chế độ thay thế.
- **Q3:** (a) gợi ý icon đọc từ file Figma.
- **Q4:** (a) giữ nội dung, chỉ gỡ prop thiết kế.
- **Q1:** user hỏi cách nào thân thiện hơn. Trả lời: (b) gọn hơn trong Layers và code, nhưng là việc thư viện cỡ L. Đề
  xuất **(a) kèm 3 chỉnh sửa** để trong Studio không thấy khác biệt:
  1. Layers gộp Stack bọc vào dòng của instance (như đang gộp div thừa);
  2. chọn Hug thì gỡ Stack (`unwrap` sẵn có);
  3. xoá, kéo, nhân bản instance thì Stack bọc đi theo.

  Chỉ còn code xuất ra có thêm lớp Stack. Chờ user chốt trước M4.
