# Studio Builder GĐ3b: trang mới từ example và template (spec, 2026-10-07)

**Trạng thái: user duyệt 2026-10-07** (Q1 cả hai nguồn · Q2 chụp thứ đang hiển thị · Q3 thẻ HTML đổi sang Layout ·
Q4 overlay thành Overlay frame). **M1 xong 2026-10-07** (SP-01…SP-03; build-check bước "New page from a template
frame"). GĐ3b của `docs/research/studio-builder-plan-2026-10-05.md` (GĐ3 "starters"; user chốt
2026-10-06 tách thành GĐ3b, xem `studio-builder-library-spec-2026-10-06.md` Q3). GĐ0–GĐ4 đã xong.

## 1. Mục tiêu và tiêu chí xong

Bắt đầu một trang builder từ thứ đã có thay vì trang trắng:
1. **"New page from this frame"**: chuột phải vào một frame example hoặc template trên canvas, Studio tạo một trang
   builder (lưu trong trình duyệt) trông giống frame đó và sửa được 100%, vì nó viết bằng dialect `*.zen.tsx`;
2. hộp thoại **New page** có thêm mục **Start from**: Blank, hoặc một trong các template.

Xong khi các dòng E2E nhóm `starters` (SP-xx) đều works trên dev server và `npm run studio:build-check` (bản deploy,
không có dev server).

## 2. Hiện trạng (rà code ngày 2026-10-07)

- **New page** chỉ tạo trang trắng: một Screen, một Stack, một tiêu đề (`builder/NewPageDialog.tsx`).
- **Template:** 8 file trong `src/templates` và 7 trang HR trong `src/templates/hr`.
  - Gần như chỉ dùng component Zen, không có thẻ HTML.
  - Nhưng mỗi file có 4–19 hook (`useState`…), dữ liệu import (`hr/data.ts`), helper (`HrShell`) và `.map`.
- **Example:** 55 file trang. 24 file chỉ dùng component Zen; 31 file có thẻ HTML (`div`, `span`…) với class
  `.platform-*`.
- **Dialect trang** cấm hook, `.map`, điều kiện, spread, `style` và thẻ HTML. Đổi thẳng từ mã nguồn vì vậy sẽ từ chối
  gần hết template và example.
- **Canvas** đã có menu chuột phải cho frame (`shell/CanvasMenu.tsx`: Zoom to frame, Present…).

## 3. Thiết kế

### 3a. Chụp lại thứ đang hiển thị (M1)

Không đổi mã nguồn mà **chụp cây component đang render** của frame (cây fiber của React), rồi viết ra dialect:

- **Nhận component Zen:** so hàm component với các export của thư viện, không cần `data-zen-src`. Nhờ vậy chạy được cả
  trên bản deploy.
- **Prop của mỗi instance Zen:**
  - giá trị chuỗi, số, boolean, mảng hay object gồm các giá trị đó → literal (`items={[…]}` của Tabs, Table…);
  - hàm (handler) → bỏ;
  - prop đang được điều khiển (`value`, `checked`, `open`) → prop mặc định tương ứng (`defaultValue`…) khi API có, để
    trang vẫn tương tác được;
  - ảnh `platformMedia` → `zen-media:<key>`, như Assets › Photos.
- **Prop chứa phần tử** (`children`, `leading`, `action`…): đổi tiếp từng phần tử.
  - Component Zen: đọc từ fiber đã render của nó; nếu không render (tab đang ẩn), đọc từ prop của nó.
  - Component riêng của trang (`HrShell`, helper): đi xuyên qua, lấy thứ nó render.
  - Text và số → text.
- **Kết quả:**
  - Kết quả qua `validateDialect`.
  - Chỗ nào không giữ được thì vào danh sách "approximations", hiện sau khi tạo trang (như Detach).
  - Thiết bị của Screen suy từ bề rộng frame: phone ≤ 480, tablet ≤ 1024, còn lại desktop.

Trạng thái (tab đang chọn, ô đã gõ, danh sách đã lọc) được giữ đúng như lúc chụp. Logic thì không giữ: trang là bản
vẽ, prototype thêm ở tab Prototype.

### 3b. Thẻ HTML của example (M2, câu hỏi Q3)

- `div`, `section`, `ul`… có layout (flex, grid) → `Stack`, `Grid` hoặc `Box`.
  - Hướng, gap, padding, bo góc và nền đọc từ CSS đang tính, làm tròn về token gần nhất.
  - Thẻ chỉ bọc mà không có layout thì bỏ, giữ nội dung.
- Text trong `p`, `span`, `h3` → `<Text>` với text style gần nhất. `img` → `Image`, `a` → `Link`.
- Mỗi chỗ làm tròn hay bỏ đi được ghi vào approximations.

### 3c. Template trong New page (M3, câu hỏi Q1)

- Mục **Start from**: Blank, rồi 15 template (tên, mô tả, thiết bị).
- Chọn một template thì Studio render nó ẩn trong trình duyệt, chụp như 3a, rồi mở trang mới.
- Không cần dev server.

### 3d. Overlay (M3, câu hỏi Q4)

- Dialog, ModalForm, SidePanel hay BottomSheet trong frame → một Overlay frame của trang, dựng từ prop của nó (kể cả
  khi đang đóng).
- Nút mở overlay không đọc được từ code đang chạy, nên không tự nối. User nối ở tab Prototype (Open overlay).

## 4. Không làm ở GĐ3b

- Giữ logic: state, handler, dữ liệu tính toán. Trang mới là bản vẽ cộng prototype.
- Đồng bộ ngược: sửa trang mới không đổi example hay template.
- Lấy starter từ trang web bên ngoài.

## 5. Thứ tự giao (mỗi mốc chạy `npm run qa`, build-check, cập nhật HANDOFF/CHANGELOG, báo user)

| Mốc | Nội dung | Cỡ | Người dùng thấy |
| --- | --- | --- | --- |
| M1 | Chụp cây component → dialect, "New page from this frame" cho frame chỉ có Zen (24 example, template) | M | Trang mới từ một template trong một click |
| M2 | Thẻ HTML → Stack / Grid / Box / Text theo token; danh sách approximations | M | Mọi example thành trang được |
| M3 | Start from trong New page (15 template); overlay → Overlay frame | S/M | Chọn template ngay khi tạo trang |

## 6. File

- **Mới:**
  - `src/platform/studio/builder/starters/snapshot.ts`: fiber → cây trung gian;
  - `builder/starters/toDialect.ts`: cây → text trang. Phần thuần có selftest;
  - `builder/starters/hostLayout.ts`: thẻ HTML → Layout theo token (M2);
  - `builder/starters/StartFrom.tsx` (M3);
  - `tools/studio/e2e/scenarios/starters.mjs`.
- **Sửa:**
  - `shell/CanvasMenu.tsx` (menu frame);
  - `builder/NewPageDialog.tsx`;
  - `builder/library/media.ts` (URL → `zen-media:`);
  - `tools/studio/e2e/build-check.mjs`.

## 7. Kiểm chứng

- **Selftest:** đổi giá trị sang literal, prop điều khiển → prop mặc định, text, `zen-media:`.
- **E2E nhóm `starters`:**
  - template → trang mới qua `validateDialect`, render được, sửa được một prop;
  - một example có HTML → Stack / Grid;
  - Start from;
  - undo, reload.
- **Thống kê độ phủ:** chạy "New page from this frame" trên mọi frame example và template. Báo số frame chuyển được và
  số approximations mỗi frame, để thấy chỗ còn thiếu.
- **`npm run studio:build-check`:** New page từ một template trên bản build.

## 8. Câu hỏi cho user

1. **Starter lấy từ đâu:**
   - (a) cả hai: "New page from this frame" trên mọi example/template, và Start from trong New page cho template (đề
     xuất);
   - (b) chỉ Start from (template);
   - (c) chỉ menu frame.
2. **Cách chuyển:**
   - (a) chụp thứ đang hiển thị: chạy với mọi example, giữ đúng trạng thái lúc chụp, bỏ logic (đề xuất);
   - (b) đổi từ mã nguồn: giữ đúng code nhưng từ chối hầu hết, vì example dùng hook, dữ liệu và helper.
3. **Thẻ HTML trong example:**
   - (a) đổi sang Stack / Grid / Box / Text theo token, ghi approximations (đề xuất);
   - (b) bỏ thẻ, chỉ giữ component Zen (nhanh hơn, layout lệch nhiều hơn).
4. **Overlay (Dialog, SidePanel…):**
   - (a) thành Overlay frame, user tự nối nút mở ở tab Prototype (đề xuất);
   - (b) bỏ qua overlay.

### Trả lời của user (2026-10-07)

Q1 (a) cả hai nguồn · Q2 (a) chụp thứ đang hiển thị · Q3 (a) thẻ HTML → Stack / Grid / Box / Text theo token · Q4 (a)
overlay → Overlay frame, nối ở tab Prototype.
